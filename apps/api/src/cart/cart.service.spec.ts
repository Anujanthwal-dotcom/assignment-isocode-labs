import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartService } from './cart.service';
import { BadRequestException } from '@nestjs/common';
import { MedicineStatus } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      cart: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      cartItem: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      medicine: {
        findUnique: vi.fn(),
      },
    };

    service = new CartService(mockPrisma);
  });

  it('rejects adding inactive medicine to cart', async () => {
    mockPrisma.medicine.findUnique.mockResolvedValue({
      id: 'med-1',
      name: 'Banned Drug',
      status: MedicineStatus.INACTIVE,
    });

    await expect(
      service.addItem('user-1', { medicineId: 'med-1', quantity: 1 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects quantity outside allowed range 1-100', async () => {
    await expect(
      service.addItem('user-1', { medicineId: 'med-1', quantity: 0 }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.addItem('user-1', { medicineId: 'med-1', quantity: 101 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calculates subtotal and line totals using database MRP', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', customerUserId: 'user-1' });
    mockPrisma.cartItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        quantity: 2,
        medicine: {
          id: 'med-1',
          name: 'Metformin 500 mg',
          sku: 'MED-MET-500',
          mrp: '30.00',
          status: MedicineStatus.ACTIVE,
        },
      },
      {
        id: 'item-2',
        quantity: 1,
        medicine: {
          id: 'med-2',
          name: 'Telmisartan 40 mg',
          sku: 'MED-TEL-40',
          mrp: '95.50',
          status: MedicineStatus.ACTIVE,
        },
      },
    ]);

    const result = await service.getCart('user-1');

    expect(result.itemCount).toBe(3);
    expect(result.subtotal).toBe(155.5); // 2 * 30 + 1 * 95.5 = 155.5
    expect(result.items[0].lineTotal).toBe(60);
    expect(result.items[1].lineTotal).toBe(95.5);
    expect(result.hasInactiveItems).toBe(false);
  });
});
