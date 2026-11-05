import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockPaymentService } from './mock-payment.service';
import { BadRequestException } from '@nestjs/common';
import { OrderPaymentMethod, OrderPaymentStatus, OrderStatus } from '@prisma/client';

describe('MockPaymentService', () => {
  let service: MockPaymentService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      orderPayment: {
        update: vi.fn(),
      },
      cart: {
        findUnique: vi.fn(),
      },
      cartItem: {
        deleteMany: vi.fn(),
      },
      orderStatusHistory: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    mockAudit = {
      record: vi.fn(),
    };

    service = new MockPaymentService(mockPrisma, mockAudit);
  });

  it('rejects simulation for COD orders', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      paymentMethod: OrderPaymentMethod.COD,
      payment: { status: OrderPaymentStatus.NOT_REQUIRED },
    });

    await expect(
      service.processMockPayment('user-1', 'order-1', { result: 'SUCCESS' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('handles idempotent call when payment was already SUCCESS', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PH-20261105-000001',
      paymentMethod: OrderPaymentMethod.UPI,
      status: OrderStatus.PENDING_VERIFICATION,
      payment: {
        status: OrderPaymentStatus.SUCCESS,
        transactionReference: 'TXN-UPI-123456',
      },
    });

    const res = await service.processMockPayment('user-1', 'order-1', { result: 'SUCCESS' });
    expect(res.paymentStatus).toBe(OrderPaymentStatus.SUCCESS);
    expect(res.transactionReference).toBe('TXN-UPI-123456');
    expect(mockPrisma.orderPayment.update).not.toHaveBeenCalled();
  });

  it('successfully completes UPI payment, preserves PENDING_VERIFICATION, clears cart', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PH-20261105-000001',
      paymentMethod: OrderPaymentMethod.UPI,
      status: OrderStatus.PENDING_VERIFICATION,
      totalAmount: '120.00',
      payment: {
        status: OrderPaymentStatus.PENDING,
      },
    });
    mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });

    const res = await service.processMockPayment('user-1', 'order-1', { result: 'SUCCESS' });

    expect(res.paymentStatus).toBe(OrderPaymentStatus.SUCCESS);
    expect(res.orderStatus).toBe(OrderStatus.PENDING_VERIFICATION);
    expect(res.transactionReference).toMatch(/^TXN-UPI-/);
    expect(mockPrisma.orderPayment.update).toHaveBeenCalled();
    expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalled();
  });

  it('handles simulated UPI failure: transitions to CANCELLED and preserves cart', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PH-20261105-000001',
      paymentMethod: OrderPaymentMethod.UPI,
      status: OrderStatus.PENDING_VERIFICATION,
      totalAmount: '120.00',
      payment: {
        status: OrderPaymentStatus.PENDING,
      },
    });

    const res = await service.processMockPayment('user-1', 'order-1', { result: 'FAILURE' });

    expect(res.paymentStatus).toBe(OrderPaymentStatus.FAILED);
    expect(res.orderStatus).toBe(OrderStatus.CANCELLED);
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: OrderStatus.CANCELLED,
          paymentStatus: OrderPaymentStatus.FAILED,
        }),
      }),
    );
    expect(mockPrisma.cartItem.deleteMany).not.toHaveBeenCalled();
  });
});
