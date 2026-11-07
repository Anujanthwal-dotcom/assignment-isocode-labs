'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ShoppingCart,
  User,
  ChevronDown,
  Users,
  MapPin,
  FileText,
  Package,
  Repeat,
  LogOut,
  HeartPulse,
} from 'lucide-react';
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
          <Link href="/customer" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#6240E8] text-white shadow-xs group-hover:bg-[#5233D0] transition-colors">
              <HeartPulse className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold tracking-tight text-[#351F65] leading-tight">
                Pharmacy Care
              </span>
              <span className="text-[10px] font-medium text-[#78879A] hidden sm:block">
                Kolkata &amp; Howrah
              </span>
            </div>
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
            className="relative flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#EAE8F0] bg-white text-[#351F65] hover:bg-[#F7F5FD] hover:text-[#6240E8] transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#6240E8]" />
          </Link>

          {/* Cart */}
          <Link
            href="/customer/cart"
            className="relative flex h-9 items-center justify-center px-3 rounded-[8px] border border-[#EAE8F0] bg-white text-xs font-semibold text-[#351F65] hover:bg-[#F7F5FD] hover:text-[#6240E8] transition-colors gap-1.5"
            title="Shopping Cart"
            aria-label="View shopping cart"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6240E8] px-1 text-[10px] font-bold text-white shadow-xs">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#EAE8F0] bg-[#F8F9FB] px-2.5 h-9 text-[13px] font-medium text-[#351F65] hover:bg-[#F7F5FD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6240E8] cursor-pointer">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EAE6FD] text-[#6240E8]">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate font-semibold">
                {user?.profile?.fullName || 'Account'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
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
              <DropdownMenuItem onClick={() => router.push('/customer/family')} className="cursor-pointer">
                <Users className="h-4 w-4 mr-2 text-slate-500" />
                <span>Family Profiles</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/customer/addresses')} className="cursor-pointer">
                <MapPin className="h-4 w-4 mr-2 text-slate-500" />
                <span>Delivery Addresses</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/customer/prescriptions')} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2 text-slate-500" />
                <span>My Prescriptions</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/customer/orders')} className="cursor-pointer">
                <Package className="h-4 w-4 mr-2 text-slate-500" />
                <span>Order History</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/customer/refills')} className="cursor-pointer">
                <Repeat className="h-4 w-4 mr-2 text-slate-500" />
                <span>Medicine Refills</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2 text-rose-600" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
