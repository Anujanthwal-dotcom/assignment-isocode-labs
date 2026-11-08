import { Controller, Get, Post, Body, Query, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateStoreDto, RegisterStaffDto, RegisterPharmacistDto } from './stores.dto';

@ApiTags('Stores & Admin Directory')
@ApiBearerAuth()
@Controller()
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  // --- STORES ---
  @Get(['stores', 'admin/stores'])
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.STORE_STAFF)
  @ApiOperation({ summary: 'List pharmacy stores' })
  @ApiResponse({ status: 200, description: 'List of pharmacy stores' })
  async listStores(@Query('detailed') detailed?: string) {
    if (detailed === 'true') {
      return this.storesService.listAllStoresWithCounts();
    }
    return this.storesService.listActiveStores();
  }

  @Post(['stores', 'admin/stores'])
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new store' })
  async createStore(@Body() dto: CreateStoreDto) {
    return this.storesService.createStore(dto);
  }

  @Delete('admin/stores/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a store if it has no associated staff or pharmacists' })
  async deleteStore(@Param('id') id: string) {
    await this.storesService.deleteStore(id);
    return { success: true, message: 'Store removed successfully.' };
  }

  // --- STORE STAFF (Staff belongs to a store) ---
  @Get('admin/staff')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all store staff members with assigned store' })
  async listStaff(@Query('storeId') storeId?: string) {
    return this.storesService.listStaff(storeId);
  }

  @Post('admin/staff')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new store staff member (assigned to a store)' })
  async registerStaff(@Body() dto: RegisterStaffDto) {
    return this.storesService.registerStaff(dto);
  }

  // --- PHARMACISTS (Independent Clinical Verification Officers) ---
  @Get('admin/pharmacists')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all registered pharmacists (platform-independent)' })
  async listPharmacists() {
    return this.storesService.listPharmacists();
  }

  @Post('admin/pharmacists')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new licensed pharmacist' })
  async registerPharmacist(@Body() dto: RegisterPharmacistDto) {
    return this.storesService.registerPharmacist(dto);
  }

  // --- CUSTOMERS ---
  @Get('admin/customers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all registered customer accounts' })
  async listCustomers() {
    return this.storesService.listCustomers();
  }
}
