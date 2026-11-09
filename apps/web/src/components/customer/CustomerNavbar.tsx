'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  User,
  ChevronDown,
  Users,
  MapPin,
  FileText,
  Package,
  Repeat,
  LogOut,
  Phone,
  ShoppingCart,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CustomerLocationSelector } from '@/components/customer/CustomerLocationSelector';
import { useAuth } from '@/lib/auth/auth-context';

export const CustomerNavbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

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
    <header className="sticky top-0 z-40 w-full border-b border-[#EBECEF] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex h-[58px] sm:h-[64px] max-w-[1200px] items-center justify-between px-3 sm:px-4 lg:px-8 gap-2 sm:gap-4">
        {/* Left: Location Selection Dropdown (No Branding) */}
        <div className="flex items-center gap-3 lg:gap-6">
          <CustomerLocationSelector />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/customer'
                  ? pathname === '/customer'
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-[8px] px-3 py-1.5 text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'font-semibold text-[#0D5C5A] bg-[#F0FDFA]'
                      : 'text-[#475569] hover:text-[#0D5C5A] hover:bg-[#F0FDFA]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Helpline, Notifications, Cart & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pharmacy Helpline / Care Desk Number */}
          <a
            href="tel:18002004567"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-[#F0FDFA] border border-[#99F6E4] shadow-xs hover:bg-[#CCFBF1]/50 transition-colors group select-none text-left"
            title="Helpline: 1800 200 4567"
          >
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-[6px] bg-[#CCFBF1] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors shrink-0">
              <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-[#047857] uppercase tracking-wider leading-none hidden sm:block">
                Help &amp; Support
              </span>
              <span className="tabular-nums font-mono text-[11px] sm:text-[12px] font-bold text-[#0D5C5A] leading-tight">
                1800 200 4567
              </span>
            </div>
          </a>

          {/* Notifications */}
          <Link
            href="/customer/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#EBECEF] bg-white text-[#0F172A] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
          </Link>

          {/* Cart */}
          <Link
            href="/customer/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#EBECEF] bg-white text-[#0F172A] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] transition-colors"
            title="Cart"
            aria-label="View cart"
          >
            <ShoppingCart className="h-4 w-4" />
          </Link>


          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-[10px] border border-[#EBECEF] bg-[#F8FAFC] px-2.5 h-9 text-[13px] font-medium text-[#0F172A] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14B8A6] cursor-pointer">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CCFBF1] text-[#047857]">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden md:inline max-w-[110px] truncate font-semibold">
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
