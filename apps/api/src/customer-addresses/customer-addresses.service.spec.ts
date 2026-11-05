import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerAddressesService } from './customer-addresses.service';
import { BadRequestException } from '@nestjs/common';

describe('CustomerAddressesService', () => {
  let service: CustomerAddressesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      customerAddress: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    service = new CustomerAddressesService(mockPrisma);
  });

  it('rejects invalid 6-digit Indian PIN code', async () => {
    await expect(
      service.createAddress('user-1', {
        label: 'Home',
        recipientName: 'Debasish',
        phone: '9876543210',
        addressLine1: 'Plot 10',
        city: 'Kolkata',
        state: 'WB',
        postalCode: '12345', // Only 5 digits
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createAddress('user-1', {
        label: 'Home',
        recipientName: 'Debasish',
        phone: '9876543210',
        addressLine1: 'Plot 10',
        city: 'Kolkata',
        state: 'WB',
        postalCode: '012345', // Starts with 0
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid Indian mobile number', async () => {
    await expect(
      service.createAddress('user-1', {
        label: 'Home',
        recipientName: 'Debasish',
        phone: '1234567890', // Does not start with 6-9
        addressLine1: 'Plot 10',
        city: 'Kolkata',
        state: 'WB',
        postalCode: '700001',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates address with normalized phone and postal code', async () => {
    mockPrisma.customerAddress.count.mockResolvedValue(0);
    mockPrisma.customerAddress.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'addr-1', ...args.data }),
    );

    const result = await service.createAddress('user-1', {
      label: 'Home',
      recipientName: 'Debasish',
      phone: '+91 98765 43210',
      addressLine1: 'Plot 10',
      city: 'Kolkata',
      state: 'WB',
      postalCode: '700 001',
    });

    expect(result.phone).toBe('9876543210');
    expect(result.postalCode).toBe('700001');
    expect(result.isDefault).toBe(true); // First address defaults to true
  });
});
