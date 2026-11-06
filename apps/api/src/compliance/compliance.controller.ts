import { Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ComplianceRuleService } from './compliance-rule.service';
import { ComplianceService } from './compliance.service';
import {
  CreateComplianceRuleSetDto,
  UpdateComplianceRuleDto,
  ActivateComplianceRuleSetDto,
} from './compliance.dto';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly ruleService: ComplianceRuleService,
    private readonly complianceService: ComplianceService,
  ) {}

  @Get('overview')
  @Roles(UserRole.COMPLIANCE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Compliance policy dashboard metrics and blocked items summary' })
  async getOverview() {
    return this.complianceService.getOverview();
  }

  @Get('rule-sets/active')
  @Roles(UserRole.COMPLIANCE_ADMIN, UserRole.ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get currently active compliance rule set' })
  async getActiveRuleSet() {
    return this.ruleService.getActiveRuleSet();
  }

  @Get('rule-sets')
  @Roles(UserRole.COMPLIANCE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all versioned compliance rule sets' })
  async getAllRuleSets() {
    return this.ruleService.getAllRuleSets();
  }

  @Get('rule-sets/:id')
  @Roles(UserRole.COMPLIANCE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get compliance rule set by ID' })
  async getRuleSetById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ruleService.getRuleSetById(id);
  }

  @Post('rule-sets')
  @Roles(UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Create new draft compliance rule set version' })
  async createRuleSet(@Body() dto: CreateComplianceRuleSetDto, @CurrentUser('id') userId: string) {
    return this.ruleService.createRuleSet(dto, userId);
  }

  @Patch('rule-sets/:ruleSetId/rules/:ruleId')
  @Roles(UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Update rule in a DRAFT compliance rule set' })
  async updateDraftRule(
    @Param('ruleSetId', ParseUUIDPipe) ruleSetId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateComplianceRuleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ruleService.updateDraftRule(ruleSetId, ruleId, dto, userId);
  }

  @Post('rule-sets/:ruleSetId/activate')
  @Roles(UserRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Activate compliance rule set version with mandatory reason' })
  async activateRuleSet(
    @Param('ruleSetId', ParseUUIDPipe) ruleSetId: string,
    @Body() dto: ActivateComplianceRuleSetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ruleService.activateRuleSet(ruleSetId, userId, dto);
  }

  @Get('decisions')
  @Roles(UserRole.COMPLIANCE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Audit log of compliance decisions made on reviewed items' })
  async getDecisions(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.complianceService.getDecisionsHistory({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('h1-register')
  @Roles(UserRole.COMPLIANCE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Platform-wide Schedule H1 register entries' })
  async getH1Register(
    @Query('storeId') storeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.complianceService.getH1Register({
      storeId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
