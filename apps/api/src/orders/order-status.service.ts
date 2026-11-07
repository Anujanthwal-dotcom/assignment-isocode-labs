import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderStatusService {
  /**
   * Defines permissible transitions.
   * Customer can cancel from PENDING_VERIFICATION.
   * Stock reservations can be cancelled with FULFILMENT_CANCELLED.
   */
  canCustomerCancel(currentStatus: OrderStatus): boolean {
    return (
      currentStatus === OrderStatus.PENDING_VERIFICATION ||
      currentStatus === OrderStatus.STOCK_UNAVAILABLE
    );
  }

  validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    if (currentStatus === newStatus) {
      return;
    }

    // Customer cancellation
    if (
      (currentStatus === OrderStatus.PENDING_VERIFICATION ||
        currentStatus === OrderStatus.STOCK_UNAVAILABLE) &&
      newStatus === OrderStatus.CANCELLED
    ) {
      return;
    }

    // Pharmacist Verification Transitions
    if (
      (currentStatus === OrderStatus.PENDING_VERIFICATION ||
        currentStatus === OrderStatus.UNDER_REVIEW ||
        currentStatus === OrderStatus.AWAITING_CUSTOMER_ACTION) &&
      (newStatus === OrderStatus.APPROVED ||
        newStatus === OrderStatus.PARTIALLY_APPROVED ||
        newStatus === OrderStatus.REJECTED ||
        newStatus === OrderStatus.AWAITING_CUSTOMER_ACTION ||
        newStatus === OrderStatus.UNDER_REVIEW)
    ) {
      return;
    }

    // Fulfilment Lifecycle Transitions
    // APPROVED / PARTIALLY_APPROVED -> ROUTING_PENDING
    if (
      (currentStatus === OrderStatus.APPROVED ||
        currentStatus === OrderStatus.PARTIALLY_APPROVED) &&
      newStatus === OrderStatus.ROUTING_PENDING
    ) {
      return;
    }

    // ROUTING_PENDING -> STOCK_RESERVED or STOCK_UNAVAILABLE
    if (
      currentStatus === OrderStatus.ROUTING_PENDING &&
      (newStatus === OrderStatus.STOCK_RESERVED || newStatus === OrderStatus.STOCK_UNAVAILABLE)
    ) {
      return;
    }

    // Retry from STOCK_UNAVAILABLE -> ROUTING_PENDING
    if (
      currentStatus === OrderStatus.STOCK_UNAVAILABLE &&
      newStatus === OrderStatus.ROUTING_PENDING
    ) {
      return;
    }

    // Picking lifecycle
    if (
      currentStatus === OrderStatus.STOCK_RESERVED &&
      (newStatus === OrderStatus.PICKING || newStatus === OrderStatus.FULFILMENT_CANCELLED)
    ) {
      return;
    }

    if (
      currentStatus === OrderStatus.PICKING &&
      (newStatus === OrderStatus.PACKED || newStatus === OrderStatus.FULFILMENT_CANCELLED)
    ) {
      return;
    }

    // Packing -> Ready for Handover
    if (currentStatus === OrderStatus.PACKED && newStatus === OrderStatus.READY_FOR_HANDOVER) {
      return;
    }

    // Ready for Handover -> Handed Over
    if (currentStatus === OrderStatus.READY_FOR_HANDOVER && newStatus === OrderStatus.HANDED_OVER) {
      return;
    }

    // Legacy transitions support (PROCESSING, READY_FOR_DISPATCH, DISPATCHED, DELIVERED)
    if (
      (currentStatus === OrderStatus.APPROVED ||
        currentStatus === OrderStatus.STOCK_RESERVED ||
        currentStatus === OrderStatus.PACKED ||
        currentStatus === OrderStatus.READY_FOR_DISPATCH ||
        currentStatus === OrderStatus.DISPATCHED) &&
      (newStatus === OrderStatus.PROCESSING ||
        newStatus === OrderStatus.READY_FOR_DISPATCH ||
        newStatus === OrderStatus.DISPATCHED ||
        newStatus === OrderStatus.DELIVERED)
    ) {
      return;
    }

    throw new BadRequestException({
      code: 'INVALID_STATUS_TRANSITION',
      message: `Cannot transition order status from '${currentStatus}' to '${newStatus}'.`,
    });
  }
}
