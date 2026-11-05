import { describe, it, expect } from 'vitest';
import { OrderStatusService } from './order-status.service';
import { OrderStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('OrderStatusService', () => {
  const service = new OrderStatusService();

  it('permits customer cancellation only from PENDING_VERIFICATION', () => {
    expect(service.canCustomerCancel(OrderStatus.PENDING_VERIFICATION)).toBe(true);
    expect(service.canCustomerCancel(OrderStatus.UNDER_REVIEW)).toBe(false);
    expect(service.canCustomerCancel(OrderStatus.APPROVED)).toBe(false);
    expect(service.canCustomerCancel(OrderStatus.PROCESSING)).toBe(false);
    expect(service.canCustomerCancel(OrderStatus.CANCELLED)).toBe(false);
  });

  it('validates permitted transition from PENDING_VERIFICATION to CANCELLED', () => {
    expect(() =>
      service.validateTransition(OrderStatus.PENDING_VERIFICATION, OrderStatus.CANCELLED),
    ).not.toThrow();
  });

  it('rejects unpermitted transition from UNDER_REVIEW to CANCELLED by customer', () => {
    expect(() =>
      service.validateTransition(OrderStatus.UNDER_REVIEW, OrderStatus.CANCELLED),
    ).toThrow(BadRequestException);
  });
});
