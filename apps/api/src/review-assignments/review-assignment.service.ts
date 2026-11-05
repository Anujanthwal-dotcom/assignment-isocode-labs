import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrderStatus, StoreStatus } from '@prisma/client';
import { AssignOrderReviewDto } from './review-assignment.dto';

@Injectable()
export class ReviewAssignmentService {
  private readonly logger = new Logger(ReviewAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves orders requiring pharmacist verification that are not yet assigned to any store.
   */
  async getUnassignedOrders(query?: { page?: number; limit?: number }) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(50, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where = {
      status: {
        in: [
          OrderStatus.PENDING_VERIFICATION,
          OrderStatus.UNDER_REVIEW,
          OrderStatus.AWAITING_CUSTOMER_ACTION,
        ],
      },
      reviewAssignments: {
        none: {
          unassignedAt: null,
        },
      },
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { placedAt: 'asc' },
        include: {
          customerUser: {
            include: { customerProfile: true },
          },
          familyMember: true,
          prescription: true,
          items: {
            include: { medicine: true },
          },
        },
      }),
    ]);

    return {
      data: orders.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        placedAt: o.placedAt,
        status: o.status,
        customerName: o.familyMember?.fullName || o.customerUser.customerProfile?.fullName || 'Customer',
        prescriptionId: o.prescriptionId,
        prescriptionFileName: o.prescription.originalFileName,
        itemCount: o.items.length,
        medicineNames: o.items.map((i) => i.medicineNameSnapshot),
        totalAmount: Number(o.totalAmount),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Assigns or reassigns an order to a physical store for pharmacist review.
   */
  async assignOrder(orderId: string, dto: AssignOrderReviewDto, adminUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        reviewAssignments: {
          where: { unassignedAt: null },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found.`);
    }

    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });

    if (!store || store.status !== StoreStatus.ACTIVE) {
      throw new BadRequestException('Target review store not found or is inactive.');
    }

    const activeAssignment = order.reviewAssignments[0];
    const isReassignment = !!activeAssignment;

    const assignment = await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      if (activeAssignment) {
        // Deactivate previous active assignment
        await tx.orderReviewAssignment.update({
          where: { id: activeAssignment.id },
          data: { unassignedAt: now },
        });
      }

      // Create new active assignment
      return tx.orderReviewAssignment.create({
        data: {
          orderId,
          storeId: dto.storeId,
          assignedByUserId: adminUserId,
          assignedAt: now,
          reason: dto.reason || (isReassignment ? 'Store reassignment by Admin' : 'Initial review assignment by Admin'),
        },
        include: {
          store: { select: { id: true, name: true, code: true } },
          assignedByUser: { select: { id: true, email: true } },
        },
      });
    });

    await this.auditService.record({
      actorUserId: adminUserId,
      action: isReassignment ? 'ORDER_REVIEW_REASSIGNED' : 'ORDER_REVIEW_ASSIGNED',
      resourceType: 'OrderReviewAssignment',
      resourceId: assignment.id,
      metadata: {
        orderId,
        storeId: dto.storeId,
        storeCode: assignment.store.code,
        previousStoreId: activeAssignment?.storeId,
        reason: dto.reason,
      },
    });

    this.logger.log(`Order ${order.orderNumber} assigned to store ${assignment.store.code} (${dto.storeId})`);
    return assignment;
  }

  /**
   * Unassigns an active store assignment, returning the order to the unassigned queue.
   */
  async unassignOrder(orderId: string, adminUserId: string) {
    const activeAssignment = await this.prisma.orderReviewAssignment.findFirst({
      where: { orderId, unassignedAt: null },
      include: { store: true },
    });

    if (!activeAssignment) {
      throw new NotFoundException(`No active review assignment found for order '${orderId}'.`);
    }

    const now = new Date();
    await this.prisma.orderReviewAssignment.update({
      where: { id: activeAssignment.id },
      data: { unassignedAt: now, reason: 'Unassigned by Admin' },
    });

    await this.auditService.record({
      actorUserId: adminUserId,
      action: 'ORDER_REVIEW_UNASSIGNED',
      resourceType: 'OrderReviewAssignment',
      resourceId: activeAssignment.id,
      metadata: {
        orderId,
        previousStoreId: activeAssignment.storeId,
        previousStoreCode: activeAssignment.store.code,
      },
    });

    return { message: 'Order review assignment successfully removed.' };
  }

  /**
   * Retrieves summary of active review assignments.
   */
  async getAssignmentsOverview(query?: { storeId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(50, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { unassignedAt: null };
    if (query?.storeId) {
      where.storeId = query.storeId;
    }

    const [total, assignments] = await Promise.all([
      this.prisma.orderReviewAssignment.count({ where }),
      this.prisma.orderReviewAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { assignedAt: 'desc' },
        include: {
          store: true,
          order: {
            include: {
              customerUser: { include: { customerProfile: true } },
              prescription: true,
              items: true,
            },
          },
          assignedByUser: { select: { id: true, email: true } },
        },
      }),
    ]);

    return {
      data: assignments.map((a) => ({
        assignmentId: a.id,
        orderId: a.orderId,
        orderNumber: a.order.orderNumber,
        placedAt: a.order.placedAt,
        orderStatus: a.order.status,
        customerName: a.order.customerUser.customerProfile?.fullName || 'Customer',
        storeId: a.storeId,
        storeName: a.store.name,
        storeCode: a.store.code,
        assignedAt: a.assignedAt,
        assignedByEmail: a.assignedByUser.email,
        itemCount: a.order.items.length,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
