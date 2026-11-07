'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';

export const CustomerBottomNav: React.FC = () => {
  const pathname = usePathname();
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
        // Ignore
      }
    };

    fetchCart();
    const interval = setInterval(fetchCart, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const items = [
    { href: '/customer', label: 'Home', exact: true },
    { href: '/customer/medicines', label: 'Medicines' },
    { href: '/customer/refills', label: 'Refills' },
    { href: '/customer/cart', label: 'Cart', badge: cartCount },
    { href: '/customer/orders', label: 'Orders' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[56px] border-t border-[#EAE8F0] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(53,31,101,0.04)]">
      <div className="grid h-full grid-cols-5 items-center">
        {items.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-[#6240E8]' : 'text-[#78879A] hover:text-[#351F65]'
              }`}
            >
              <span
                className={`text-[12px] uppercase tracking-wide leading-none ${isActive ? 'font-bold' : 'font-medium'}`}
              >
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="mt-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6240E8] px-1 text-[10px] font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-[#6240E8]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
