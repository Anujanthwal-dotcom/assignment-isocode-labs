'use client';

import * as React from 'react';
import Link from 'next/link';
import { Home, Package, Users, User } from 'lucide-react';

export const CustomerBottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[64px] border-t border-[#EAE8F0] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(53,31,101,0.04)]">
      <div className="grid h-full grid-cols-4 items-center">
        <Link
          href="/customer"
          className="flex flex-col items-center justify-center gap-1 text-[#6240E8]"
        >
          <Home className="h-5 w-5" />
          <span className="text-[11px] font-semibold leading-none">Home</span>
        </Link>
        <Link
          href="/customer"
          className="flex flex-col items-center justify-center gap-1 text-[#78879A] hover:text-[#351F65]"
        >
          <Package className="h-5 w-5" />
          <span className="text-[11px] font-medium leading-none">Orders</span>
        </Link>
        <Link
          href="/customer"
          className="flex flex-col items-center justify-center gap-1 text-[#78879A] hover:text-[#351F65]"
        >
          <Users className="h-5 w-5" />
          <span className="text-[11px] font-medium leading-none">Family</span>
        </Link>
        <Link
          href="/customer"
          className="flex flex-col items-center justify-center gap-1 text-[#78879A] hover:text-[#351F65]"
        >
          <User className="h-5 w-5" />
          <span className="text-[11px] font-medium leading-none">Account</span>
        </Link>
      </div>
    </nav>
  );
};
