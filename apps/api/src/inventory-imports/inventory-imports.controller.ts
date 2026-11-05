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
} from '@nestjs/common';
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

  @Post()
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import daily inventory CSV for a store or warehouse (Admin only)' })
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

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'List CSV import history batches' })
  @ApiResponse({ status: 200, description: 'Paginated import batches' })
  async listImports(@Query() query: ListInventoryImportsQueryDto) {
    return this.importsService.listImports(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Get details and row-level outcomes of an import batch' })
  @ApiResponse({ status: 200, description: 'Import batch details' })
  @ApiResponse({ status: 404, description: 'Import not found' })
  async getImportDetails(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.importsService.getImportDetails(id);
  }
}
