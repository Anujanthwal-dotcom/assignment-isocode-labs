import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomerMedicinesService } from './customer-medicines.service';
import { CustomerListMedicinesDto } from './customer-medicines.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Customer Medicines')
@Controller('customer/medicines')
export class CustomerMedicinesController {
  constructor(private readonly customerMedicinesService: CustomerMedicinesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active medicines for customers' })
  @ApiResponse({ status: 200, description: 'Active medicine list with safe catalogue fields' })
  async list(@Query() dto: CustomerListMedicinesDto) {
    return this.customerMedicinesService.listMedicines(dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get active medicine details for customer' })
  @ApiResponse({ status: 200, description: 'Safe medicine details' })
  @ApiResponse({ status: 404, description: 'Medicine not found or inactive' })
  async findOne(@Param('id') id: string) {
    return this.customerMedicinesService.getMedicineDetails(id);
  }
}
