import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrderStatusService } from '../orders/order-status.service';
import { StoreEligibilityService } from './store-eligibility.service';
import { StockReservationService } from './stock-reservation.service';
import { StockAvailabilityService } from './stock-availability.service';
import { StoreDistanceService, Coordinates } from './store-distance.service';
import {
  OrderStatus,
  OrderRoutingMethod,
  OrderRoutingStatus,
  OrderItemReviewStatus,
  StoreStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class OrderRoutingService {
  private readonly logger = new Logger(OrderRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly orderStatusService: OrderStatusService,
    private readonly storeEligibilityService: StoreEligibilityService,
    private readonly stockReservationService: StockReservationService,
    private readonly stockAvailabilityService: StockAvailabilityService,
    private readonly storeDistanceService: StoreDistanceService,
  ) {}

  /**
   * Main order routing engine:
   * 1. Validates order fulfilment eligibility (only approved items, no hard blocks, valid payment state).
   * 2. Checks active stores with complete stock.
   * 3. Sorts by distance ascending using Haversine formula (or stable tie-breaker).
   * 4. Attempts atomic concurrency-safe reservation at nearest candidate.
   * 5. If concurrency causes failure, proceeds to next candidate.
   * 6. If no store qualifies, marks order as STOCK_UNAVAILABLE without partial holds.
   */
  async routeOrder(
    orderId: string,
    options?: {
      triggeredByUserId?: string;
      isManual?: boolean;
      targetStoreId?: string;
      manualReason?: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        items: {
          include: {
            reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        payment: true,
        prescriptionReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found.`);
    }

    // 1. Fulfilment Eligibility Checks
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
      throw new BadRequestException(`Cannot route order with status '${order.status}'.`);
    }

    if (
      order.status !== OrderStatus.APPROVED &&
      order.status !== OrderStatus.PARTIALLY_APPROVED &&
      order.status !== OrderStatus.ROUTING_PENDING &&
      order.status !== OrderStatus.STOCK_UNAVAILABLE
    ) {
      throw new BadRequestException(
        `Order must be in APPROVED, PARTIALLY_APPROVED, ROUTING_PENDING, or STOCK_UNAVAILABLE to route. Current: '${order.status}'.`,
      );
    }

    // Verify payment state
    if (order.payment?.status === 'FAILED') {
      throw new UnprocessableEntityException('Cannot route order with failed payment.');
    }

    // Extract ONLY approved, non-rejected, non-blocked items for fulfilment
    const eligibleItems = order.items.filter((item) => {
      const latestReview = item.reviews[0];
      return (
        latestReview &&
        latestReview.status === OrderItemReviewStatus.APPROVED &&
        item.status !== 'REJECTED' &&
        item.status !== 'REMOVED'
      );
    });

    if (eligibleItems.length === 0) {
      throw new UnprocessableEntityException(
        'Order has no approved items eligible for fulfilment.',
      );
    }

    const itemsToCheck = eligibleItems.map((i) => ({
      orderItemId: i.id,
      medicineId: i.medicineId,
      quantity: i.quantity,
      quantityRequired: i.quantity,
    }));

    // Transition state to ROUTING_PENDING if not already
    if (order.status !== OrderStatus.ROUTING_PENDING) {
      this.orderStatusService.validateTransition(order.status, OrderStatus.ROUTING_PENDING);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.ROUTING_PENDING },
      });
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: OrderStatus.ROUTING_PENDING,
          changedByUserId: options?.triggeredByUserId || null,
          note: options?.isManual ? 'Manual routing initiated' : 'Automatic routing initiated',
        },
      });
    }

    // If manual routing requested:
    if (options?.isManual && options?.targetStoreId) {
      return this.handleManualStoreAssignment(
        order,
        options.targetStoreId,
        itemsToCheck,
        options.manualReason || 'Admin manual routing',
        options.triggeredByUserId,
      );
    }

    // Customer Coordinates
    let customerCoords: Coordinates | null = null;
    if (order.address?.latitude && order.address?.longitude) {
      const lat = Number(order.address.latitude);
      const lon = Number(order.address.longitude);
      if (this.storeDistanceService.isValidCoordinates({ latitude: lat, longitude: lon })) {
        customerCoords = { latitude: lat, longitude: lon };
      }
    }

    // 2. Find eligible stores sorted by distance
    const { eligibleStores, storesConsideredCount } =
      await this.storeEligibilityService.findEligibleStores(itemsToCheck, customerCoords);

    const candidateStoreIds = eligibleStores.map((s) => s.storeId);

    if (eligibleStores.length === 0) {
      // No store has complete stock
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.STOCK_UNAVAILABLE },
      });

      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: OrderStatus.ROUTING_PENDING,
          newStatus: OrderStatus.STOCK_UNAVAILABLE,
          changedByUserId: options?.triggeredByUserId || null,
          note: `Stock unavailable across all ${storesConsideredCount} active stores. No partial orders allowed.`,
        },
      });

      const decision = await this.prisma.orderRoutingDecision.create({
        data: {
          orderId: order.id,
          routingMethod: OrderRoutingMethod.AUTOMATIC,
          status: OrderRoutingStatus.NO_ELIGIBLE_STORE,
          candidateStoreIds: candidateStoreIds.length > 0 ? candidateStoreIds : Prisma.JsonNull,
          failureReason:
            'No single active store had complete available stock for all approved items.',
        },
      });

      await this.auditService.record({
        actorUserId: options?.triggeredByUserId || null,
        action: 'ORDER_ROUTING_NO_STORE',
        resourceType: 'Order',
        resourceId: order.id,
        metadata: { storesConsideredCount },
      });

      return {
        success: false,
        status: OrderStatus.STOCK_UNAVAILABLE,
        routingDecisionId: decision.id,
        message: 'No store has complete stock for this order.',
      };
    }

    // 3. Try to reserve stock at candidates in order of distance
    for (const candidate of eligibleStores) {
      const reservationResult = await this.stockReservationService.reserveStockForOrder(
        order.id,
        candidate.storeId,
        itemsToCheck,
        options?.triggeredByUserId,
      );

      if (reservationResult.success) {
        // Success: Update order to STOCK_RESERVED and set fulfilmentStoreId
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.STOCK_RESERVED,
            fulfilmentStoreId: candidate.storeId,
          },
        });

        await this.prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: OrderStatus.ROUTING_PENDING,
            newStatus: OrderStatus.STOCK_RESERVED,
            changedByUserId: options?.triggeredByUserId || null,
            note: `Routed to nearest store ${candidate.storeName} (${candidate.storeCode})${
              candidate.distanceKm !== null ? ` — ${candidate.distanceKm} km` : ''
            }. Stock reserved.`,
          },
        });

        const decision = await this.prisma.orderRoutingDecision.create({
          data: {
            orderId: order.id,
            storeId: candidate.storeId,
            routingMethod: OrderRoutingMethod.AUTOMATIC,
            status: OrderRoutingStatus.SUCCESS,
            distanceKm: candidate.distanceKm !== null ? candidate.distanceKm : null,
            candidateStoreIds: candidateStoreIds,
          },
        });

        await this.auditService.record({
          actorUserId: options?.triggeredByUserId || null,
          action: 'ORDER_ROUTING_SUCCESS',
          resourceType: 'Order',
          resourceId: order.id,
          metadata: {
            storeId: candidate.storeId,
            storeCode: candidate.storeCode,
            distanceKm: candidate.distanceKm,
            reservationsCount: reservationResult.reservations.length,
          },
        });

        return {
          success: true,
          status: OrderStatus.STOCK_RESERVED,
          storeId: candidate.storeId,
          storeCode: candidate.storeCode,
          storeName: candidate.storeName,
          distanceKm: candidate.distanceKm,
          routingDecisionId: decision.id,
        };
      }
    }

    // If all candidates failed reservations (e.g. concurrent race conditions)
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.STOCK_UNAVAILABLE },
    });

    const failureDecision = await this.prisma.orderRoutingDecision.create({
      data: {
        orderId: order.id,
        routingMethod: OrderRoutingMethod.AUTOMATIC,
        status: OrderRoutingStatus.FAILED,
        candidateStoreIds: candidateStoreIds,
        failureReason:
          'Stock reservation failed on all candidate stores due to concurrent availability changes.',
      },
    });

    return {
      success: false,
      status: OrderStatus.STOCK_UNAVAILABLE,
      routingDecisionId: failureDecision.id,
      message: 'Failed to reserve stock on candidate stores.',
    };
  }

  /**
   * Manual store assignment by ADMIN.
   * Safety invariant: Manual assignment MUST still validate sufficient stock and reserve atomically.
   * It NEVER bypasses insufficient stock.
   */
  async handleManualStoreAssignment(
    order: any,
    targetStoreId: string,
    itemsToCheck: any[],
    reason: string,
    adminUserId?: string,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: targetStoreId },
    });

    if (!store) {
      throw new NotFoundException(`Target store with id '${targetStoreId}' not found.`);
    }

    if (store.status !== StoreStatus.ACTIVE) {
      throw new BadRequestException('Cannot route order to an inactive store.');
    }

    // Verify stock availability
    const avail = await this.stockAvailabilityService.checkStoreAvailability(
      store.id,
      itemsToCheck,
    );

    if (!avail.hasCompleteStock) {
      throw new UnprocessableEntityException(
        `Selected store '${store.name}' does not have complete stock for all items. Missing/insufficient: ${avail.unavailableItems.length} item(s).`,
      );
    }

    // Atomic reservation
    const reservationResult = await this.stockReservationService.reserveStockForOrder(
      order.id,
      store.id,
      itemsToCheck,
      adminUserId,
    );

    if (!reservationResult.success) {
      throw new UnprocessableEntityException(
        `Failed to reserve stock at '${store.name}': ${reservationResult.failureReason}`,
      );
    }

    // Success
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.STOCK_RESERVED,
        fulfilmentStoreId: store.id,
      },
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: OrderStatus.ROUTING_PENDING,
        newStatus: OrderStatus.STOCK_RESERVED,
        changedByUserId: adminUserId || null,
        note: `Manually routed to store ${store.name} (${store.code}). Reason: "${reason}". Stock reserved.`,
      },
    });

    const decision = await this.prisma.orderRoutingDecision.create({
      data: {
        orderId: order.id,
        storeId: store.id,
        routingMethod: OrderRoutingMethod.MANUAL,
        status: OrderRoutingStatus.SUCCESS,
        failureReason: reason,
        routedByUserId: adminUserId || null,
      },
    });

    await this.auditService.record({
      actorUserId: adminUserId || null,
      action: 'ORDER_ROUTING_MANUAL_SUCCESS',
      resourceType: 'Order',
      resourceId: order.id,
      metadata: { storeId: store.id, reason },
    });

    return {
      success: true,
      status: OrderStatus.STOCK_RESERVED,
      storeId: store.id,
      storeCode: store.code,
      storeName: store.name,
      routingDecisionId: decision.id,
    };
  }
}
