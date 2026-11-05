import { Controller, Post, Get, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MedicinesService } from './medicines.service';
import {
  CreateMedicineDto,
  UpdateMedicineDto,
  UpdateMedicineStatusDto,
  ListMedicinesQueryDto,
} from './medicines.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Medicines')
@ApiBearerAuth()
@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new medicine in catalogue (Admin only)' })
  @ApiResponse({ status: 201, description: 'Medicine successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid payload or MRP' })
  @ApiResponse({ status: 409, description: 'Duplicate SKU' })
  async createMedicine(
    @Body() dto: CreateMedicineDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.medicinesService.create(dto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'List and search medicines catalogue' })
  @ApiResponse({ status: 200, description: 'Paginated catalogue listing' })
  async listMedicines(@Query() query: ListMedicinesQueryDto) {
    return this.medicinesService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Get medicine details with authorized inventory balances' })
  @ApiResponse({ status: 200, description: 'Medicine details with balances' })
  @ApiResponse({ status: 404, description: 'Medicine not found' })
  async getMedicine(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.medicinesService.findById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update medicine catalogue details (Admin only)' })
  @ApiResponse({ status: 200, description: 'Medicine successfully updated' })
  @ApiResponse({ status: 404, description: 'Medicine not found' })
  async updateMedicine(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMedicineDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.medicinesService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate medicine (Admin only)' })
  @ApiResponse({ status: 200, description: 'Medicine status successfully updated' })
  @ApiResponse({ status: 404, description: 'Medicine not found' })
  async updateMedicineStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMedicineStatusDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.medicinesService.updateStatus(id, dto.status, user.id);
  }
}
