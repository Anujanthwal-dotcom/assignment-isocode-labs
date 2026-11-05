import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import CustomerMedicinesPage from '@/app/customer/medicines/page';
import CustomerCartPage from '@/app/customer/cart/page';
import CustomerFamilyPage from '@/app/customer/family/page';
import CustomerAddressesPage from '@/app/customer/addresses/page';
import CustomerPrescriptionsPage from '@/app/customer/prescriptions/page';
import CustomerMockPaymentPage from '@/app/customer/payment/mock/[orderId]/page';
import CustomerOrdersPage from '@/app/customer/orders/page';

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'cust-1',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      profile: { fullName: 'Debasish Ghosh' },
      phone: '9876543210',
    },
    loading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/customer/medicines',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'order-1', orderId: 'order-1' }),
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn((endpoint: string) => {
    if (endpoint.includes('/customer/medicines')) {
      return Promise.resolve({
        data: [
          {
            id: 'med-1',
            sku: 'MED-MET-500-001',
            name: 'Metformin 500 mg',
            brandName: 'Glyciphage',
            genericName: 'Metformin Hydrochloride',
            dosageForm: 'Tablet',
            packSize: '15 tablets',
            schedule: 'SCHEDULE_H',
            mrp: 30.0,
          },
        ],
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      });
    }

    if (endpoint.includes('/customer/cart')) {
      return Promise.resolve({
        items: [
          {
            id: 'cart-item-1',
            medicine: {
              id: 'med-1',
              name: 'Metformin 500 mg',
              sku: 'MED-MET-500-001',
              mrp: 30.0,
              status: 'ACTIVE',
            },
            quantity: 2,
            unitPrice: 30.0,
            lineTotal: 60.0,
          },
        ],
        subtotal: 60.0,
        itemCount: 2,
        hasInactiveItems: false,
      });
    }

    if (endpoint.includes('/customer/family-members')) {
      return Promise.resolve([
        {
          id: 'fam-1',
          customerUserId: 'cust-1',
          fullName: 'Maya Ghosh',
          relationship: 'MOTHER',
          dateOfBirth: '1965-04-12',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }

    if (endpoint.includes('/customer/addresses')) {
      return Promise.resolve([
        {
          id: 'addr-1',
          customerUserId: 'cust-1',
          label: 'Home',
          recipientName: 'Debasish Ghosh',
          phone: '9876543210',
          addressLine1: 'Plot 12, Sector V',
          city: 'Kolkata',
          state: 'West Bengal',
          postalCode: '700091',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }

    if (endpoint.includes('/customer/prescriptions')) {
      return Promise.resolve({
        data: [
          {
            id: 'rx-1',
            customerUserId: 'cust-1',
            originalFileName: 'dr-prescription.jpg',
            mimeType: 'image/jpeg',
            fileSizeBytes: 1048576,
            status: 'UPLOADED',
            uploadedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            familyMember: {
              id: 'fam-1',
              fullName: 'Maya Ghosh',
              relationship: 'MOTHER',
            },
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    }

    if (endpoint.includes('/customer/orders/order-1/history')) {
      return Promise.resolve([
        {
          id: 'hist-1',
          newStatus: 'PENDING_VERIFICATION',
          note: 'Order submitted by customer',
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    if (endpoint.includes('/customer/orders/order-1')) {
      return Promise.resolve({
        id: 'order-1',
        orderNumber: 'PH-20261105-000001',
        customerUserId: 'cust-1',
        status: 'PENDING_VERIFICATION',
        paymentMethod: 'UPI',
        paymentStatus: 'PENDING',
        subtotal: 60.0,
        deliveryFee: 0.0,
        discount: 0.0,
        totalAmount: 60.0,
        addressSnapshot: {
          recipientName: 'Debasish Ghosh',
          phone: '9876543210',
          addressLine1: 'Plot 12, Sector V',
          city: 'Kolkata',
          state: 'West Bengal',
          postalCode: '700091',
        },
        items: [
          {
            id: 'oi-1',
            medicineId: 'med-1',
            medicineNameSnapshot: 'Metformin 500 mg',
            skuSnapshot: 'MED-MET-500-001',
            unitPrice: 30.0,
            quantity: 2,
            lineTotal: 60.0,
            status: 'PENDING_VERIFICATION',
          },
        ],
        placedAt: new Date().toISOString(),
      });
    }

    if (endpoint.includes('/customer/orders')) {
      return Promise.resolve({
        data: [
          {
            id: 'order-1',
            orderNumber: 'PH-20261105-000001',
            customerUserId: 'cust-1',
            status: 'PENDING_VERIFICATION',
            paymentMethod: 'UPI',
            paymentStatus: 'PENDING',
            subtotal: 60.0,
            deliveryFee: 0.0,
            discount: 0.0,
            totalAmount: 60.0,
            placedAt: new Date().toISOString(),
            items: [{ id: 'oi-1' }, { id: 'oi-2' }],
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    }

    return Promise.resolve({});
  }),
}));

describe('Phase 3 Customer Ordering UI Tests', () => {
  it('1. Renders customer catalogue with medicines and MRP', async () => {
    render(<CustomerMedicinesPage />);

    expect(screen.getByText('Medicine Catalogue')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Metformin 500 mg')).toBeDefined();
      expect(screen.getByText('₹30.00')).toBeDefined();
      expect(screen.getByText('Schedule H (Rx)')).toBeDefined();
    });
  });

  it('2. Renders customer shopping cart with items and subtotal', async () => {
    render(<CustomerCartPage />);

    expect(screen.getByText('Shopping Cart')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Metformin 500 mg')).toBeDefined();
      expect(screen.getAllByText('₹60.00').length).toBeGreaterThan(0);
      expect(screen.getByText('Proceed to Checkout')).toBeDefined();
    });
  });

  it('3. Renders customer family profiles management', async () => {
    render(<CustomerFamilyPage />);

    expect(screen.getByText('Family Profiles')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Maya Ghosh')).toBeDefined();
      expect(screen.getByText('MOTHER')).toBeDefined();
      expect(screen.getByText('Add Family Member')).toBeDefined();
    });
  });

  it('4. Renders customer saved delivery addresses with default badge', async () => {
    render(<CustomerAddressesPage />);

    expect(screen.getByText('Saved Delivery Addresses')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeDefined();
      expect(screen.getByText('Default')).toBeDefined();
      expect(screen.getByText('PIN: 700091')).toBeDefined();
    });
  });

  it('5. Renders customer prescriptions with awaiting review badge', async () => {
    render(<CustomerPrescriptionsPage />);

    expect(screen.getByText('Prescriptions')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('dr-prescription.jpg')).toBeDefined();
      expect(screen.getByText('Awaiting Review')).toBeDefined();
      expect(screen.getByText('Upload Prescription')).toBeDefined();
    });
  });

  it('6. Renders mock payment simulation page with test warning', async () => {
    render(<CustomerMockPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText(/TEST ENVIRONMENT/i)).toBeDefined();
      expect(screen.getByText('PH-20261105-000001')).toBeDefined();
      expect(screen.getByText('Simulate SUCCESS')).toBeDefined();
      expect(screen.getByText('Simulate FAILURE')).toBeDefined();
    });
  });

  it('7. Renders customer order history list', async () => {
    render(<CustomerOrdersPage />);

    expect(screen.getByText('My Orders')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('PH-20261105-000001')).toBeDefined();
      expect(screen.getByText('PENDING VERIFICATION')).toBeDefined();
    });
  });
});
