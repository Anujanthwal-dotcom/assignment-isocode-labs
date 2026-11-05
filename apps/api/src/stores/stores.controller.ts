import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Stores')
@ApiBearerAuth()
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'List all active stores' })
  @ApiResponse({ status: 200, description: 'List of active pharmacy stores' })
  async listStores() {
    return this.storesService.listActiveStores();
  }
}
