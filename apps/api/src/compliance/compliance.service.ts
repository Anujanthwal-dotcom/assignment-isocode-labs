import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComplianceRuleService } from './compliance-rule.service';
import { OrderItemReviewStatus } from '@prisma/client';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleService: ComplianceRuleService,
  ) {}

  async getOverview() {
    const activeRuleSet = await this.ruleService.getActiveRuleSet();
    const totalRuleSets = await this.prisma.complianceRuleSet.count();

    const blockedItemReviewsCount = await this.prisma.orderItemReview.count({
      where: { status: OrderItemReviewStatus.BLOCKED },
    });

    const h1RegisterCount = await this.prisma.h1RegisterEntry.count();

    const recentBlockedItems = await this.prisma.orderItemReview.findMany({
      where: { status: OrderItemReviewStatus.BLOCKED },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        medicine: true,
        orderItem: {
          include: {
            order: { select: { id: true, orderNumber: true, placedAt: true } },
          },
        },
      },
    });

    return {
      activeRuleSet: activeRuleSet
        ? {
            id: activeRuleSet.id,
            version: activeRuleSet.version,
            name: activeRuleSet.name,
            effectiveFrom: activeRuleSet.effectiveFrom,
            rulesCount: activeRuleSet.rules.length,
          }
        : null,
      totalRuleSets,
      blockedItemReviewsCount,
      h1RegisterCount,
      recentBlockedItems: recentBlockedItems.map((item) => ({
        id: item.id,
        orderId: item.orderItem.order.id,
        orderNumber: item.orderItem.order.orderNumber,
        medicineName: item.medicine.name,
        schedule: item.medicine.schedule,
        decisionReason: item.decisionReason,
        createdAt: item.createdAt,
      })),
    };
  }

  async getDecisionsHistory(query?: { page?: number; limit?: number }) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(50, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.orderItemReview.count({
        where: { complianceEvaluation: { not: null as any } },
      }),
      this.prisma.orderItemReview.findMany({
        where: { complianceEvaluation: { not: null as any } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medicine: { select: { name: true, sku: true, schedule: true } },
          orderItem: {
            include: {
              order: { select: { id: true, orderNumber: true } },
            },
          },
          pharmacist: { select: { id: true, email: true } },
        },
      }),
    ]);

    return {
      data: items.map((i) => {
        const evalJson = (i.complianceEvaluation as any) || {};
        return {
          id: i.id,
          orderItemId: i.orderItemId,
          orderId: i.orderItem.order.id,
          orderNumber: i.orderItem.order.orderNumber,
          medicineName: i.reviewedMedicineName || i.medicine.name,
          sku: i.medicine.sku,
          schedule: i.medicine.schedule,
          status: i.status,
          decision: evalJson.decision,
          canApprove: evalJson.canApprove,
          reasons: evalJson.reasons || [],
          ruleVersionId: i.complianceRuleSetId || evalJson.ruleVersionId,
          evaluatedAt: evalJson.evaluatedAt || i.createdAt,
          pharmacistEmail: i.pharmacist?.email,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getH1Register(query?: { storeId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(50, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where = query?.storeId ? { storeId: query.storeId } : {};

    const [total, entries] = await Promise.all([
      this.prisma.h1RegisterEntry.count({ where }),
      this.prisma.h1RegisterEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, name: true, code: true } },
          pharmacist: { select: { id: true, email: true } },
          prescription: { select: { id: true, originalFileName: true } },
        },
      }),
    ]);

    return {
      data: entries.map((e) => ({
        id: e.id,
        orderItemId: e.orderItemId,
        prescriptionId: e.prescriptionId,
        storeId: e.storeId,
        storeName: e.store.name,
        storeCode: e.store.code,
        patientName: e.patientName,
        prescriberName: e.prescriberName,
        prescriberDetails: e.prescriberDetails,
        medicineName: e.medicineName,
        quantity: e.quantity,
        pharmacistId: e.pharmacistId,
        pharmacistEmail: e.pharmacist.email,
        status: e.status,
        createdAt: e.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
