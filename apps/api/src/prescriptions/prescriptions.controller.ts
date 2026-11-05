import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { UploadPrescriptionDto, ListPrescriptionsQueryDto } from './prescriptions.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Customer Prescriptions')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('customer/prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a prescription document (JPEG, PNG, PDF up to 10MB)' })
  @ApiResponse({ status: 201, description: 'Prescription uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format, size, or invalid family member' })
  async upload(
    @CurrentUser('id') customerUserId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadPrescriptionDto,
  ) {
    return this.prescriptionsService.uploadPrescription(customerUserId, file, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List prescriptions owned by customer' })
  @ApiResponse({ status: 200, description: 'Prescription list' })
  async list(
    @CurrentUser('id') customerUserId: string,
    @Query() query: ListPrescriptionsQueryDto,
  ) {
    return this.prescriptionsService.listPrescriptions(customerUserId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prescription metadata and order associations' })
  @ApiResponse({ status: 200, description: 'Prescription details' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async findOne(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.prescriptionsService.getPrescription(customerUserId, id);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Get a temporary signed viewing URL (valid for 5 minutes)' })
  @ApiResponse({ status: 200, description: 'Pre-signed URL with 5-minute expiry' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async getFile(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.prescriptionsService.getPrescriptionFileUrl(customerUserId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete prescription if not linked to an order' })
  @ApiResponse({ status: 200, description: 'Prescription deleted' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  @ApiResponse({ status: 409, description: 'Prescription is linked to an existing order' })
  async delete(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.prescriptionsService.deletePrescription(customerUserId, id);
  }
}
