import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import CustomerHomePage from '@/app/customer/page';

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
  usePathname: () => '/customer',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn((endpoint: string) => {
    if (endpoint.includes('/customer/orders')) {
      return Promise.resolve({ data: [] });
    }

    if (endpoint.includes('/customer/family-members')) {
      return Promise.resolve([
        {
          id: 'fam-maya-1',
          customerUserId: 'cust-1',
          fullName: 'Maya Ghosh',
          relationship: 'MOTHER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }

    if (endpoint.includes('/customer/prescriptions')) {
      return Promise.resolve({
        data: [
          {
            id: 'rx-maya-1',
            customerUserId: 'cust-1',
            familyMemberId: 'fam-maya-1',
            status: 'APPROVED',
            originalFileName: 'rx-maya.jpg',
            mimeType: 'image/jpeg',
            fileSizeBytes: 2048,
            uploadedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'rx-self-1',
            customerUserId: 'cust-1',
            familyMemberId: null,
            status: 'UNDER_REVIEW',
            originalFileName: 'rx-debasish.jpg',
            mimeType: 'image/jpeg',
            fileSizeBytes: 1024,
            uploadedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });
    }

    return Promise.resolve([]);
  }),
}));

describe('CustomerHomePage - Family Health Circle Dynamic Rx Count', () => {
  it('renders dynamic active Rx count for Maya Ghosh and account owner', async () => {
    render(<CustomerHomePage />);

    // Wait for dynamic family data to resolve
    await waitFor(() => {
      expect(screen.getByText('Maya Ghosh')).toBeDefined();
    });

    // Primary account owner
    expect(screen.getAllByText(/Debasish Ghosh/).length).toBeGreaterThanOrEqual(1);

    // Check relationship subtitle
    expect(screen.getByText('Mother (Senior Care)')).toBeDefined();

    // Both Maya Ghosh (1 approved Rx) and Debasish Ghosh (1 under-review Rx) display "1 Active Rx"
    const activeBadges = screen.getAllByText('1 Active Rx');
    expect(activeBadges).toHaveLength(2);
  });
});
