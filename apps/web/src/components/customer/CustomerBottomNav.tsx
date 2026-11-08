'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Repeat, Package } from 'lucide-react';

export const CustomerBottomNav: React.FC = () => {
  const pathname = usePathname();

  const items = [
    { href: '/customer', label: 'Home', icon: Home, exact: true },
    { href: '/customer/prescriptions', label: 'Prescriptions', icon: FileText },
    { href: '/customer/refills', label: 'Refills', icon: Repeat },
    { href: '/customer/orders', label: 'Orders', icon: Package },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px] border-t border-[#E2E8F0] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(15,23,42,0.04)]">
      <div className="grid h-full grid-cols-4 items-center">
        {items.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-[#0D5C5A]' : 'text-[#64748B] hover:text-[#0D5C5A]'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-[#0D5C5A]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
