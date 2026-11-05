import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { CsvParserService } from './csv-parser.service';
import { CsvValidationService } from './csv-validation.service';
import { CreateInventoryImportDto, ListInventoryImportsQueryDto } from './inventory-imports.dto';
import {
  InventoryImportStatus,
  InventoryImportRowStatus,
  InventoryMovementType,
  StoreStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class InventoryImportsService {
  private readonly logger = new Logger(InventoryImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly csvParser: CsvParserService,
    private readonly csvValidation: CsvValidationService,
  ) {}

  async processImport(
    file: Express.Multer.File,
    dto: CreateInventoryImportDto,
    user: { id: string },
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'FILE_REQUIRED',
        message: 'CSV file is required for stock import.',
      });
    }

    // 1. Verify target location
    let storeId: string | null = null;
    let warehouseId: string | null = null;
    let locationDisplayName: string;

    if (dto.locationType === 'STORE') {
      const store = await this.prisma.store.findUnique({
        where: { id: dto.locationId },
      });
      if (!store) {
        throw new NotFoundException({
          code: 'LOCATION_NOT_FOUND',
          message: `Store with ID '${dto.locationId}' not found.`,
        });
      }
      if (store.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException({
          code: 'INACTIVE_LOCATION',
          message: 'Cannot import inventory for an inactive store.',
        });
      }
      storeId = store.id;
      locationDisplayName = `${store.name} (${store.code})`;
    } else {
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: dto.locationId },
      });
      if (!warehouse) {
        throw new NotFoundException({
          code: 'LOCATION_NOT_FOUND',
          message: `Warehouse with ID '${dto.locationId}' not found.`,
        });
      }
      if (warehouse.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException({
          code: 'INACTIVE_LOCATION',
          message: 'Cannot import inventory for an inactive warehouse.',
        });
      }
      warehouseId = warehouse.id;
      locationDisplayName = `${warehouse.name} (${warehouse.code})`;
    }

    // 2. Parse CSV rows
    const rawRows = this.csvParser.parseBuffer(file.buffer);

    // 3. Upload to MinIO (Private Bucket)
    let fileObjectKey: string;
    try {
      fileObjectKey = await this.storageService.uploadInventoryImportCsv(
        file.buffer,
        file.originalname || 'stock-import.csv',
      );
    } catch (err: any) {
      this.logger.error(`MinIO upload failed: ${err.message}`);
      throw new InternalServerErrorException(
        'Failed to securely archive CSV file in storage. Import aborted.',
      );
    }

    // 4. Create Initial InventoryImport Record
    const importRecord = await this.prisma.inventoryImport.create({
      data: {
        fileName: file.originalname || 'stock-import.csv',
        fileObjectKey,
        locationType: dto.locationType,
        storeId,
        warehouseId,
        status: InventoryImportStatus.PROCESSING,
        totalRows: rawRows.length,
        appliedRows: 0,
        rejectedRows: 0,
        importedByUserId: user.id,
      },
    });

    // 5. Validate Rows All-or-Nothing
    const validationResult = await this.csvValidation.validateRows(rawRows);

    if (!validationResult.isValid) {
      // Create rejected and pending row records
      const rowInserts: Prisma.InventoryImportRowCreateManyInput[] = [];

      for (const rej of validationResult.rejectedRows) {
        rowInserts.push({
          importId: importRecord.id,
          rowNumber: rej.rowNumber,
          sku: rej.sku,
          medicineId: rej.medicineId || null,
          quantity: rej.quantity !== undefined ? rej.quantity : null,
          status: InventoryImportRowStatus.REJECTED,
          errorMessage: rej.errorMessage,
        });
      }

      // Also record valid rows as rejected/unapplied because batch failed
      for (const val of validationResult.validRows) {
        rowInserts.push({
          importId: importRecord.id,
          rowNumber: val.rowNumber,
          sku: val.sku,
          medicineId: val.medicineId,
          quantity: val.quantity,
          status: InventoryImportRowStatus.REJECTED,
          errorMessage: 'Batch validation failed due to errors in other rows.',
        });
      }

      await this.prisma.inventoryImportRow.createMany({
        data: rowInserts,
      });

      await this.prisma.inventoryImport.update({
        where: { id: importRecord.id },
        data: {
          status: InventoryImportStatus.FAILED,
          rejectedRows: validationResult.rejectedRows.length,
          completedAt: new Date(),
          errorSummary: {
            message: 'All-or-nothing import validation failed. No stock balances were modified.',
            rejectedCount: validationResult.rejectedRows.length,
          },
        },
      });

      await this.auditService.record({
        actorUserId: user.id,
        action: 'INVENTORY_IMPORT_FAILED',
        resourceType: 'InventoryImport',
        resourceId: importRecord.id,
        metadata: {
          totalRows: rawRows.length,
          rejectedRows: validationResult.rejectedRows.length,
          location: locationDisplayName,
        },
      });

      throw new BadRequestException({
        statusCode: 400,
        code: 'CSV_IMPORT_VALIDATION_FAILED',
        message: `CSV import validation failed for ${validationResult.rejectedRows.length} row(s). No inventory balances were modified.`,
        details: {
          importId: importRecord.id,
          status: 'FAILED',
          totalRows: rawRows.length,
          rejectedCount: validationResult.rejectedRows.length,
          errors: validationResult.rejectedRows.slice(0, 50),
        },
      });
    }

    // 6. Apply Valid Import in Single Database Transaction
    try {
      await this.prisma.$transaction(
        async (tx) => {
          for (const row of validationResult.validRows) {
            // Find current balance if exists
            let currentQuantity = 0;
            if (storeId) {
              const existing = await tx.inventoryBalance.findUnique({
                where: {
                  medicineId_storeId: { medicineId: row.medicineId, storeId },
                },
              });
              if (existing) currentQuantity = existing.quantity;
            } else if (warehouseId) {
              const existing = await tx.inventoryBalance.findUnique({
                where: {
                  medicineId_warehouseId: { medicineId: row.medicineId, warehouseId },
                },
              });
              if (existing) currentQuantity = existing.quantity;
            }

            const quantityChange = row.quantity - currentQuantity;

            // Upsert snapshot balance
            if (storeId) {
              await tx.inventoryBalance.upsert({
                where: {
                  medicineId_storeId: { medicineId: row.medicineId, storeId },
                },
                update: {
                  quantity: row.quantity,
                  reorderLevel: row.reorderLevel,
                },
                create: {
                  medicineId: row.medicineId,
                  storeId,
                  quantity: row.quantity,
                  reorderLevel: row.reorderLevel,
                },
              });
            } else if (warehouseId) {
              await tx.inventoryBalance.upsert({
                where: {
                  medicineId_warehouseId: { medicineId: row.medicineId, warehouseId },
                },
                update: {
                  quantity: row.quantity,
                  reorderLevel: row.reorderLevel,
                },
                create: {
                  medicineId: row.medicineId,
                  warehouseId,
                  quantity: row.quantity,
                  reorderLevel: row.reorderLevel,
                },
              });
            }

            // Create movement
            await tx.inventoryMovement.create({
              data: {
                medicineId: row.medicineId,
                storeId,
                warehouseId,
                movementType: InventoryMovementType.STOCK_IMPORT,
                quantityBefore: currentQuantity,
                quantityChange,
                quantityAfter: row.quantity,
                referenceId: importRecord.id,
                reason: `Daily stock CSV snapshot import`,
                performedByUserId: user.id,
              },
            });

            // Phase 6 Invariant: Reconcile active stock reservations against imported physical on-hand stock
            if (storeId) {
              const activeReservedAgg = await tx.stockReservation.aggregate({
                where: {
                  storeId,
                  medicineId: row.medicineId,
                  status: 'ACTIVE',
                  expiresAt: { gt: new Date() },
                },
                _sum: { quantity: true },
              });
              const activeReserved = activeReservedAgg._sum.quantity || 0;

              // If imported physical stock is lower than active reserved quantity, flag discrepancy
              if (row.quantity < activeReserved) {
                await tx.inventoryMovement.create({
                  data: {
                    medicineId: row.medicineId,
                    storeId,
                    movementType: InventoryMovementType.STOCK_DISCREPANCY,
                    quantityBefore: row.quantity,
                    quantityChange: 0,
                    quantityAfter: row.quantity,
                    reason: `STOCK_DISCREPANCY: Imported on-hand (${row.quantity}) is lower than active reserved stock (${activeReserved}). Requires admin reconciliation.`,
                    referenceId: importRecord.id,
                    performedByUserId: user.id,
                  },
                });
              }
            }

            // Record row as APPLIED
            await tx.inventoryImportRow.create({
              data: {
                importId: importRecord.id,
                rowNumber: row.rowNumber,
                sku: row.sku,
                medicineId: row.medicineId,
                quantity: row.quantity,
                status: InventoryImportRowStatus.APPLIED,
              },
            });
          }

          // Mark import COMPLETED
          await tx.inventoryImport.update({
            where: { id: importRecord.id },
            data: {
              status: InventoryImportStatus.COMPLETED,
              appliedRows: validationResult.validRows.length,
              rejectedRows: 0,
              completedAt: new Date(),
              errorSummary: {
                message: 'Import applied successfully.',
                omittedMedicinesNote: 'Medicines omitted from this CSV remained unchanged.',
              },
            },
          });
        },
        { timeout: 60000 },
      );

      await this.auditService.record({
        actorUserId: user.id,
        action: 'INVENTORY_IMPORT_COMPLETED',
        resourceType: 'InventoryImport',
        resourceId: importRecord.id,
        metadata: {
          totalRows: rawRows.length,
          appliedRows: validationResult.validRows.length,
          location: locationDisplayName,
        },
      });

      return {
        id: importRecord.id,
        fileName: importRecord.fileName,
        status: InventoryImportStatus.COMPLETED,
        totalRows: rawRows.length,
        appliedRows: validationResult.validRows.length,
        rejectedRows: 0,
        completedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error(`Technical failure during import transaction: ${err.message}`, err.stack);

      // Outside failed transaction, record import failure
      await this.prisma.inventoryImport.update({
        where: { id: importRecord.id },
        data: {
          status: InventoryImportStatus.FAILED,
          completedAt: new Date(),
          errorSummary: {
            message: `Database transaction error: ${err.message}`,
          },
        },
      });

      throw new InternalServerErrorException(
        'Technical error occurred while applying stock updates. Changes have been rolled back.',
      );
    }
  }

  async listImports(query: ListInventoryImportsQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryImportWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }

    const [total, imports] = await Promise.all([
      this.prisma.inventoryImport.count({ where }),
      this.prisma.inventoryImport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, name: true, code: true, city: true } },
          warehouse: { select: { id: true, name: true, code: true, city: true } },
          importedByUser: { select: { id: true, email: true, phone: true } },
        },
      }),
    ]);

    const formatted = imports.map((imp) => ({
      id: imp.id,
      fileName: imp.fileName,
      fileObjectKey: imp.fileObjectKey,
      locationType: imp.locationType,
      locationId: imp.storeId || imp.warehouseId,
      locationName: imp.store?.name || imp.warehouse?.name || 'Unknown',
      locationCode: imp.store?.code || imp.warehouse?.code || '',
      status: imp.status,
      totalRows: imp.totalRows,
      appliedRows: imp.appliedRows,
      rejectedRows: imp.rejectedRows,
      importedByEmail: imp.importedByUser?.email || imp.importedByUser?.phone || 'Unknown',
      createdAt: imp.createdAt.toISOString(),
      completedAt: imp.completedAt?.toISOString() || null,
    }));

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getImportDetails(id: string) {
    const importRecord = await this.prisma.inventoryImport.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true, code: true, city: true } },
        warehouse: { select: { id: true, name: true, code: true, city: true } },
        importedByUser: { select: { id: true, email: true, phone: true } },
        rows: {
          orderBy: { rowNumber: 'asc' },
          take: 500, // Return up to 500 row outcomes
        },
      },
    });

    if (!importRecord) {
      throw new NotFoundException({
        code: 'IMPORT_NOT_FOUND',
        message: `Inventory import with ID '${id}' not found.`,
      });
    }

    return {
      id: importRecord.id,
      fileName: importRecord.fileName,
      fileObjectKey: importRecord.fileObjectKey,
      locationType: importRecord.locationType,
      locationId: importRecord.storeId || importRecord.warehouseId,
      locationName: importRecord.store?.name || importRecord.warehouse?.name,
      locationCode: importRecord.store?.code || importRecord.warehouse?.code,
      status: importRecord.status,
      totalRows: importRecord.totalRows,
      appliedRows: importRecord.appliedRows,
      rejectedRows: importRecord.rejectedRows,
      errorSummary: importRecord.errorSummary,
      importedByEmail: importRecord.importedByUser?.email || importRecord.importedByUser?.phone,
      createdAt: importRecord.createdAt.toISOString(),
      completedAt: importRecord.completedAt?.toISOString() || null,
      rows: importRecord.rows.map((r) => ({
        id: r.id,
        rowNumber: r.rowNumber,
        sku: r.sku,
        quantity: r.quantity,
        status: r.status,
        errorMessage: r.errorMessage,
      })),
    };
  }
}
