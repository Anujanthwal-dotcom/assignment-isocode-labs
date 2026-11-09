import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { CustomerLayout } from '../CustomerLayout';
import { PharmacistLayout } from '../PharmacistLayout';
import { AdminLayout } from '../AdminLayout';

import { CurrentUser } from '@pharmacy/shared-types';

let mockUser: CurrentUser | null = null;
let mockLoading = false;
let mockPathname = '/customer';
const mockReplace = vi.fn();

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => mockPathname,
}));

describe('Portal Route Protection & Role Redirection', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  describe('CustomerLayout', () => {
    it('redirects unauthenticated user to /customer/login', async () => {
      mockUser = null;
      mockLoading = false;
      mockPathname = '/customer';

      render(
        <CustomerLayout>
          <div>Customer Content</div>
        </CustomerLayout>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/customer/login');
      });
    });

    it('redirects pharmacist user to /pharmacist', async () => {
      mockUser = {
        id: 'u1',
        role: 'PHARMACIST',
        status: 'ACTIVE',
        profile: { fullName: 'Pharmacist' },
      };
      mockLoading = false;
      mockPathname = '/customer';

      render(
        <CustomerLayout>
          <div>Customer Content</div>
        </CustomerLayout>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/pharmacist');
      });
    });

    it('redirects store staff user to /staff', async () => {
      mockUser = {
        id: 'u1',
        role: 'STORE_STAFF',
        status: 'ACTIVE',
        profile: { fullName: 'Staff' },
      };
      mockLoading = false;
      mockPathname = '/customer';

      render(
        <CustomerLayout>
          <div>Customer Content</div>
        </CustomerLayout>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/staff');
      });
    });

    it('allows CUSTOMER on /customer without redirect', async () => {
      mockUser = {
        id: 'u1',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        profile: { fullName: 'Customer' },
      };
      mockLoading = false;
      mockPathname = '/customer';

      const { getByText } = render(
        <CustomerLayout>
          <div>Customer Content</div>
        </CustomerLayout>,
      );

      expect(getByText('Customer Content')).toBeDefined();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('PharmacistLayout', () => {
    it('redirects unauthenticated user to /pharmacist/login', async () => {
      mockUser = null;
      mockLoading = false;
      mockPathname = '/pharmacist';

      render(
        <PharmacistLayout>
          <div>Pharmacist Content</div>
        </PharmacistLayout>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/pharmacist/login');
      });
    });

    it('redirects customer visiting /pharmacist to /customer', async () => {
      mockUser = {
        id: 'u1',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        profile: { fullName: 'Customer' },
      };
      mockLoading = false;
      mockPathname = '/pharmacist';

      render(
        <PharmacistLayout>
          <div>Pharmacist Content</div>
        </PharmacistLayout>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/customer');
      });
    });

    it('redirects store staff visiting /pharmacist to /staff', async () => {
      mockUser = {
        id: 'u1',
        role: 'STORE_STAFF',
        status: 'ACTIVE',
        profile: { fullName: 'Staff' },
      };
      mockLoading = false;
      mockPathname = '/pharmacist';

      render(
        <PharmacistLayout>
          <div>Pharmacist Content</div>
        </PharmacistLayout>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/staff');
      });
    });
  });

  describe('AdminLayout', () => {
    it('redirects pharmacist visiting /admin to /pharmacist', async () => {
      mockUser = {
        id: 'u1',
        role: 'PHARMACIST',
        status: 'ACTIVE',
        profile: { fullName: 'Pharmacist' },
      };
      mockLoading = false;
      mockPathname = '/admin';

      render(
        <AdminLayout>
          <div>Admin Content</div>
        </AdminLayout>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/pharmacist');
      });
    });

    it('redirects store staff visiting /admin to /staff', async () => {
      mockUser = {
        id: 'u1',
        role: 'STORE_STAFF',
        status: 'ACTIVE',
        profile: { fullName: 'Staff' },
      };
      mockLoading = false;
      mockPathname = '/admin';

      render(
        <AdminLayout>
          <div>Admin Content</div>
        </AdminLayout>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/staff');
      });
    });

    it('allows ADMIN to access /admin', async () => {
      mockUser = {
        id: 'u1',
        role: 'ADMIN',
        status: 'ACTIVE',
        profile: { fullName: 'Admin' },
      };
      mockLoading = false;
      mockPathname = '/admin';

      const { getByText } = render(
        <AdminLayout>
          <div>Admin Content</div>
        </AdminLayout>,
      );

      expect(getByText('Admin Content')).toBeDefined();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
