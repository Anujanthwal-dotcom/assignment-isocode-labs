'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/auth-context';
import { apiFetch } from '@/lib/api/client';

export const CustomerNavbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [cartCount, setCartCount] = React.useState<number>(0);

  React.useEffect(() => {
    let isMounted = true;
    const fetchCart = async () => {
      try {
        const res = await apiFetch<{ itemCount: number }>('/customer/cart');
        if (isMounted && res) {
          setCartCount(res.itemCount || 0);
        }
      } catch {
        // Unauthenticated or network error ignored in navbar
      }
    };

    fetchCart();
    const interval = setInterval(fetchCart, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace('/customer/login');
  };

  const navLinks = [
    { href: '/customer', label: 'Home' },
    { href: '/customer/medicines', label: 'Medicines' },
    { href: '/customer/prescriptions', label: 'Prescriptions' },
    { href: '/customer/family', label: 'Family' },
    { href: '/customer/refills', label: 'Refills' },
    { href: '/customer/orders', label: 'Orders' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EAE8F0] bg-white shadow-xs">
      <div className="mx-auto flex h-[56px] sm:h-[64px] max-w-[1200px] items-center justify-between px-4 lg:px-8">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/customer" className="flex flex-col group">
            <span className="text-[17px] font-bold tracking-tight text-[#351F65]">
              Pharmacy Care
            </span>
            <span className="text-[10px] font-medium text-[#78879A] hidden sm:block">
              Kolkata &amp; Howrah
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/customer'
                  ? pathname === '/customer'
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-[6px] px-3 py-1.5 text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'font-semibold text-[#6240E8] bg-[#F7F5FD]'
                      : 'text-[#6C757D] hover:text-[#351F65] hover:bg-[#F7F5FD]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Notifications, Cart & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <Link
            href="/customer/notifications"
            className="flex h-9 items-center justify-center px-3 rounded-[8px] border border-[#EAE8F0] bg-white text-xs font-medium text-[#351F65] hover:bg-[#F7F5FD] hover:text-[#6240E8] transition-colors"
          >
            Alerts
          </Link>

          {/* Cart */}
          <Link
            href="/customer/cart"
            className="flex h-9 items-center justify-center px-3 rounded-[8px] border border-[#EAE8F0] bg-white text-xs font-semibold text-[#351F65] hover:bg-[#F7F5FD] hover:text-[#6240E8] transition-colors gap-1.5"
          >
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6240E8] px-1 text-[10px] font-bold text-white shadow-xs">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-[8px] border border-[#EAE8F0] bg-[#F8F9FB] px-3 h-9 text-[13px] font-medium text-[#351F65] hover:bg-[#F7F5FD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6240E8]">
              <span className="max-w-[120px] truncate">{user?.profile?.fullName || 'Account'}</span>
              <span className="text-[10px] text-slate-400">▼</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 truncate">
                    {user?.profile?.fullName || 'Customer'}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    Verified Customer Account
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/customer/family')}>
                <span>Family Profiles</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/customer/addresses')}>
                <span>Delivery Addresses</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/customer/prescriptions')}>
                <span>My Prescriptions</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/customer/orders')}>
                <span>Order History</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/customer/refills')}>
                <span>Medicine Refills</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
