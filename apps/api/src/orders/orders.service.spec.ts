import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrdersService } from './orders.service';
import { BadRequestException } from '@nestjs/common';
import {
  OrderPaymentMethod,
  MedicineStatus,
  OrderStatus,
  OrderItemStatus,
  OrderItemReviewStatus,
  AlternativeProposalStatus,
} from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: any;
  let mockOrderNumberService: any;
  let mockOrderStatusService: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      cart: {
        findUnique: vi.fn(),
      },
      prescription: {
        findFirst: vi.fn(),
      },
      familyMember: {
        findFirst: vi.fn(),
      },
      customerAddress: {
        findFirst: vi.fn(),
      },
      order: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      orderItem: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      orderItemReview: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      orderItemAlternativeProposal: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      orderStatusHistory: {
        create: vi.fn(),
      },
      cartItem: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    mockOrderNumberService = {
      generateOrderNumber: vi.fn().mockResolvedValue('PH-20261105-000001'),
    };

    mockOrderStatusService = {
      canCustomerCancel: vi.fn().mockReturnValue(true),
      validateTransition: vi.fn(),
    };

    mockAudit = {
      record: vi.fn(),
    };

    const mockCompliance = {
      evaluate: vi.fn(),
    };

    service = new OrdersService(
      mockPrisma,
      mockOrderNumberService,
      mockOrderStatusService,
      mockAudit,
      mockCompliance as any,
    );
  });

  it('rejects checkout when cart is empty', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({ items: [] });

    await expect(
      service.createOrder('user-1', {
        prescriptionId: 'rx-1',
        addressId: 'addr-1',
        paymentMethod: OrderPaymentMethod.COD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects checkout if prescription does not match specified family member', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 1,
          medicine: {
            id: 'med-1',
            name: 'Metformin',
            sku: 'MED-1',
            mrp: '30.00',
            status: MedicineStatus.ACTIVE,
          },
        },
      ],
    });

    // Prescription is for SELF (familyMemberId: null), but order requested for family-1
    mockPrisma.prescription.findFirst.mockResolvedValue({
      id: 'rx-1',
      customerUserId: 'user-1',
      familyMemberId: null,
    });
    mockPrisma.familyMember.findFirst.mockResolvedValue({
      id: 'family-1',
      customerUserId: 'user-1',
    });

    await expect(
      service.createOrder('user-1', {
        familyMemberId: 'family-1',
        prescriptionId: 'rx-1',
        addressId: 'addr-1',
        paymentMethod: OrderPaymentMethod.COD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('recalculates order totals server-side and captures immutable address snapshot', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          quantity: 2,
          medicine: {
            id: 'med-1',
            name: 'Metformin 500 mg',
            sku: 'MED-MET-500',
            mrp: '30.00',
            status: MedicineStatus.ACTIVE,
          },
        },
      ],
    });

    mockPrisma.prescription.findFirst.mockResolvedValue({
      id: 'rx-1',
      customerUserId: 'user-1',
      familyMemberId: null,
    });

    mockPrisma.customerAddress.findFirst.mockResolvedValue({
      id: 'addr-1',
      customerUserId: 'user-1',
      label: 'Home',
      recipientName: 'Debasish Ghosh',
      phone: '9876543210',
      addressLine1: 'Plot 10',
      addressLine2: null,
      landmark: null,
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700001',
    });

    mockPrisma.order.create.mockImplementation((args: any) =>
      Promise.resolve({
        id: 'order-1',
        ...args.data,
        items: args.data.items.create,
        payment: { amount: args.data.totalAmount, status: 'NOT_REQUIRED' },
        statusHistory: [],
      }),
    );

    const order = await service.createOrder('user-1', {
      prescriptionId: 'rx-1',
      addressId: 'addr-1',
      paymentMethod: OrderPaymentMethod.COD,
      customerNote: 'Ring the doorbell',
    });

    expect(order.orderNumber).toBe('PH-20261105-000001');
    expect(order.subtotal).toBe(60);
    expect(order.totalAmount).toBe(60);
    expect(order.deliveryFee).toBe(0);
    expect(order.addressSnapshot).toEqual({
      label: 'Home',
      recipientName: 'Debasish Ghosh',
      phone: '9876543210',
      addressLine1: 'Plot 10',
      addressLine2: null,
      landmark: null,
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700001',
    });
    expect(order.items[0].medicineNameSnapshot).toBe('Metformin 500 mg');
    expect(order.items[0].skuSnapshot).toBe('MED-MET-500');
    expect(order.items[0].unitPrice).toBe(30);
    // For COD, cart is cleared immediately
    expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalled();
  });

  it('customer removing item updates order totals transactionally', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'ord-1',
      customerUserId: 'user-1',
      status: OrderStatus.PARTIALLY_APPROVED,
      subtotal: 100,
      deliveryFee: 50,
      discount: 0,
      totalAmount: 150,
      items: [
        { id: 'item-1', unitPrice: 60, lineTotal: 60, status: OrderItemStatus.APPROVED },
        { id: 'item-2', unitPrice: 40, lineTotal: 40, status: OrderItemStatus.REJECTED },
      ],
    });

    mockPrisma.orderItem.findUnique.mockResolvedValue({
      id: 'item-2',
      orderId: 'ord-1',
      status: OrderItemStatus.REJECTED,
      medicineNameSnapshot: 'Rejected Med',
      reviews: [{ id: 'rev-2', status: OrderItemReviewStatus.REJECTED }],
    });

    mockPrisma.orderItem.findMany.mockResolvedValue([
      { id: 'item-1', lineTotal: 60, reviews: [{ status: OrderItemReviewStatus.APPROVED }] },
    ]);

    mockPrisma.order.update.mockResolvedValue({
      id: 'ord-1',
      status: OrderStatus.APPROVED,
      subtotal: 60,
      deliveryFee: 50,
      totalAmount: 110,
    });

    const res = await service.removeItemFromOrder('user-1', 'ord-1', 'item-2');

    expect(res.message).toContain('successfully removed');
    expect(res.order.status).toBe(OrderStatus.APPROVED);
    expect(res.order.totalAmount).toBe(110);
  });

  it('customer accepting generic alternative swaps medicine and recalculates totals', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'ord-1',
      customerUserId: 'user-1',
      status: OrderStatus.AWAITING_CUSTOMER_ACTION,
      discount: 0,
      subtotal: 40,
      deliveryFee: 50,
      totalAmount: 90,
      items: [{ id: 'item-1', unitPrice: 20, lineTotal: 40 }],
    });

    mockPrisma.orderItemAlternativeProposal.findUnique.mockResolvedValue({
      id: 'prop-1',
      orderItemId: 'item-1',
      orderItemReviewId: 'item-rev-1',
      status: AlternativeProposalStatus.PENDING,
      orderItem: { id: 'item-1', orderId: 'ord-1', quantity: 2 },
      proposedMedicine: {
        id: 'med-alt-1',
        name: 'Paracetamol Generic 500 mg',
        sku: 'MED-PAR-GEN',
        mrp: 15.0,
        dosageForm: 'Tablet',
        strength: '500 mg',
      },
      originalMedicine: { id: 'med-orig-1', name: 'Crocin 500 mg' },
    });

    mockPrisma.orderItem.findMany.mockResolvedValue([{ id: 'item-1', lineTotal: 30 }]);

    mockPrisma.orderItemAlternativeProposal.update.mockResolvedValue({
      id: 'prop-1',
      status: AlternativeProposalStatus.ACCEPTED,
    });

    const res = await service.respondToAlternativeProposal(
      'user-1',
      'ord-1',
      'prop-1',
      'ACCEPT',
      'Sounds good',
    );

    expect(res.message).toContain('accepted');
    expect(mockPrisma.orderItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          medicineId: 'med-alt-1',
          medicineNameSnapshot: 'Paracetamol Generic 500 mg',
        }),
      }),
    );
  });
});
