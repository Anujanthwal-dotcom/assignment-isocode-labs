import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { InventoryImportsService } from './inventory-imports.service';
import { CreateInventoryImportDto, ListInventoryImportsQueryDto } from './inventory-imports.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Inventory Imports')
@ApiBearerAuth()
@Controller('inventory/imports')
export class InventoryImportsController {
  constructor(private readonly importsService: InventoryImportsService) {}

  @Post('validate')
  @Roles(UserRole.ADMIN, UserRole.STORE_STAFF, UserRole.PHARMACIST)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Validate CSV schema, headers, and rows before processing' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'locationType', 'locationId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        locationType: { type: 'string', enum: ['STORE', 'WAREHOUSE'] },
        locationId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'CSV schema check outcome' })
  async validateImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateInventoryImportDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.importsService.validateCsvSchema(file, dto, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STORE_STAFF, UserRole.PHARMACIST)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import daily inventory CSV for a store or warehouse' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'locationType', 'locationId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        locationType: { type: 'string', enum: ['STORE', 'WAREHOUSE'] },
        locationId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Import successfully processed and applied' })
  @ApiResponse({ status: 400, description: 'Validation errors in CSV rows (all-or-nothing)' })
  async uploadImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateInventoryImportDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.importsService.processImport(file, dto, user);
  }

  @Get('template/catalogue-csv')
  @Roles(UserRole.ADMIN, UserRole.STORE_STAFF, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Download pre-filled CSV template with active catalogue SKUs' })
  async downloadCatalogueCsvTemplate(
    @Query('storeId') storeId: string | undefined,
    @Res() res: Response,
  ) {
    const csvContent = await this.importsService.generateCatalogueCsvTemplate(storeId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="daily-inventory-template.csv"');
    return res.send(csvContent);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STORE_STAFF, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'List CSV import history batches' })
  @ApiResponse({ status: 200, description: 'Paginated import batches' })
  async listImports(@Query() query: ListInventoryImportsQueryDto) {
    return this.importsService.listImports(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STORE_STAFF, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get details and row-level outcomes of an import batch' })
  @ApiResponse({ status: 200, description: 'Import batch details' })
  @ApiResponse({ status: 404, description: 'Import not found' })
  async getImportDetails(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.importsService.getImportDetails(id);
  }
}
