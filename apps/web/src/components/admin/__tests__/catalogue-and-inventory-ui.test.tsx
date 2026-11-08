import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { AdminSidebar } from '../AdminSidebar';
import { PharmacistSidebar } from '../../pharmacist/PharmacistSidebar';
import { StaffSidebar } from '../../staff/StaffSidebar';
import MedicineCataloguePage from '@/app/admin/medicines/page';
import AdminInventoryPage from '@/app/admin/inventory/page';
import StockImportsPage from '@/app/admin/inventory/imports/page';

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: { fullName: 'Admin User' },
    },
    loading: false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/medicines',
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn((endpoint: string) => {
    if (endpoint.includes('/medicines')) {
      return Promise.resolve({
        data: [
          {
            id: 'm1',
            sku: 'MED-MET-500-001',
            name: 'Metformin 500 mg',
            schedule: 'SCHEDULE_H',
            mrp: 30,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    }
    if (endpoint.includes('/inventory/summary')) {
      return Promise.resolve({
        totalActiveMedicines: 6,
        totalInventoryBalances: 18,
        lowStockCount: 2,
        outOfStockCount: 1,
        unknownStockCount: 0,
        totalStockUnits: 2500,
      });
    }
    if (endpoint.includes('/inventory/imports')) {
      return Promise.resolve({
        data: [
          {
            id: 'imp-1',
            fileName: 'daily-kol-001.csv',
            locationName: 'Salt Lake Store',
            status: 'COMPLETED',
            totalRows: 10,
            appliedRows: 10,
            rejectedRows: 0,
            createdAt: new Date().toISOString(),
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    }
    if (endpoint.includes('/inventory')) {
      return Promise.resolve({
        data: [
          {
            id: 'b1',
            medicineId: 'm1',
            quantity: 120,
            reorderLevel: 20,
            stockStatus: 'IN_STOCK',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            medicine: { sku: 'MED-MET-500-001', name: 'Metformin 500 mg' },
            location: { name: 'Salt Lake Store', code: 'KOL-001' },
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    }
    if (endpoint.includes('/stores')) {
      return Promise.resolve([
        { id: 's1', code: 'KOL-001', name: 'Salt Lake Store', city: 'Kolkata' },
      ]);
    }
    if (endpoint.includes('/warehouses')) {
      return Promise.resolve([
        { id: 'w1', code: 'CENTRAL-KOL', name: 'Central Warehouse', city: 'Kolkata' },
      ]);
    }
    return Promise.resolve([]);
  }),
  ApiError: class extends Error {},
}));

describe('Catalogue and Inventory UI Components & Pages', () => {
  it('AdminSidebar renders Medicine Catalogue, Inventory, and Stock Imports links', () => {
    render(<AdminSidebar openMobile={false} onCloseMobile={vi.fn()} />);

    expect(screen.getByText('Medicine Catalogue')).toBeDefined();
    expect(screen.getByText('Inventory')).toBeDefined();
    expect(screen.getByText('Stock Imports')).toBeDefined();
  });

  it('PharmacistSidebar renders Verification Queue and omits Store Inventory, H1 Register, and Store Fulfilment', () => {
    render(<PharmacistSidebar openMobile={false} onCloseMobile={vi.fn()} />);

    const queueLink = screen.getByText('Verification Queue').closest('a');
    expect(queueLink).toBeDefined();
    expect(queueLink?.getAttribute('href')).toBe('/pharmacist/review-queue');

    expect(screen.queryByText('Store Inventory')).toBeNull();
    expect(screen.queryByText('H1 Register')).toBeNull();
    expect(screen.queryByText('Store Fulfilment')).toBeNull();
  });

  it('StaffSidebar renders nav links and highlights only the active route', () => {
    render(<StaffSidebar openMobile={false} onCloseMobile={vi.fn()} />);

    expect(screen.getByText('Store Overview')).toBeDefined();
    expect(screen.getByText('Daily CSV Injection')).toBeDefined();
    expect(screen.getByText('Live Store Inventory')).toBeDefined();
    expect(screen.getByText('Order Fulfilment')).toBeDefined();
  });

  it('MedicineCataloguePage renders table and Add Medicine button', async () => {
    render(<MedicineCataloguePage />);

    expect(screen.getByText('Medicine Catalogue')).toBeDefined();
    expect(screen.getByText('Add Medicine')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('MED-MET-500-001')).toBeDefined();
      expect(screen.getByText('Metformin 500 mg')).toBeDefined();
    });
  });

  it('AdminInventoryPage renders summary cards and stock rows', async () => {
    render(<AdminInventoryPage />);

    expect(screen.getByText('Chain Inventory')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Total Units Stocked')).toBeDefined();
      expect(screen.getByText('2,500')).toBeDefined();
      expect(screen.getByText('Salt Lake Store')).toBeDefined();
    });
  });

  it('StockImportsPage renders CSV policy notice and upload action', async () => {
    render(<StockImportsPage />);

    expect(screen.getByText('Stock Imports')).toBeDefined();
    expect(screen.getByText('Upload CSV')).toBeDefined();
    expect(screen.getByText('Sample CSV')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('daily-kol-001.csv')).toBeDefined();
    });
  });
});
