import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FamilyMembersService } from './family-members.service';
import { CreateFamilyMemberDto, UpdateFamilyMemberDto } from './family-members.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Customer Family Members')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('customer/family-members')
export class FamilyMembersController {
  constructor(private readonly familyMembersService: FamilyMembersService) {}

  @Get()
  @ApiOperation({ summary: 'List family members for authenticated customer' })
  @ApiResponse({ status: 200, description: 'Family members list' })
  async list(@CurrentUser('id') customerUserId: string) {
    return this.familyMembersService.listFamilyMembers(customerUserId);
  }

  @Post()
  @ApiOperation({ summary: 'Create family member profile' })
  @ApiResponse({ status: 201, description: 'Created family member profile' })
  @ApiResponse({ status: 400, description: 'Invalid input or date of birth' })
  @ApiResponse({ status: 409, description: 'Duplicate SELF profile' })
  async create(@CurrentUser('id') customerUserId: string, @Body() dto: CreateFamilyMemberDto) {
    return this.familyMembersService.createFamilyMember(customerUserId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get family member profile by ID' })
  @ApiResponse({ status: 200, description: 'Family member profile' })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async findOne(@CurrentUser('id') customerUserId: string, @Param('id') id: string) {
    return this.familyMembersService.getFamilyMember(customerUserId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update family member profile' })
  @ApiResponse({ status: 200, description: 'Updated family member profile' })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  @ApiResponse({ status: 409, description: 'Duplicate SELF profile' })
  async update(
    @CurrentUser('id') customerUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyMemberDto,
  ) {
    return this.familyMembersService.updateFamilyMember(customerUserId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete family member profile if not referenced' })
  @ApiResponse({ status: 200, description: 'Family member deleted' })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  @ApiResponse({ status: 409, description: 'Profile in use by prescriptions or orders' })
  async delete(@CurrentUser('id') customerUserId: string, @Param('id') id: string) {
    return this.familyMembersService.deleteFamilyMember(customerUserId, id);
  }
}
