import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAddressesService } from './customer-addresses.service';
import { CreateCustomerAddressDto, UpdateCustomerAddressDto } from './customer-addresses.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Customer Addresses')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('customer/addresses')
export class CustomerAddressesController {
  constructor(private readonly customerAddressesService: CustomerAddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List delivery addresses for authenticated customer' })
  @ApiResponse({ status: 200, description: 'Saved delivery addresses' })
  async list(@CurrentUser('id') customerUserId: string) {
    return this.customerAddressesService.listAddresses(customerUserId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new delivery address' })
  @ApiResponse({ status: 201, description: 'Address created' })
  @ApiResponse({ status: 400, description: 'Invalid PIN code or phone number' })
  async create(
    @CurrentUser('id') customerUserId: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customerAddressesService.createAddress(customerUserId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address details by ID' })
  @ApiResponse({ status: 200, description: 'Address details' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findOne(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.customerAddressesService.getAddress(customerUserId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async update(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.customerAddressesService.updateAddress(customerUserId, id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, description: 'Default address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async setDefault(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.customerAddressesService.setDefaultAddress(customerUserId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete delivery address' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async delete(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
  ) {
    return this.customerAddressesService.deleteAddress(customerUserId, id);
  }
}
