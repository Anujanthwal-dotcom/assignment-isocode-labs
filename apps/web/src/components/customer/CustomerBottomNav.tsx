'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, ShoppingBag, Package, RefreshCw } from 'lucide-react';
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
    { href: '/customer', label: 'Home', icon: Home, exact: true },
    { href: '/customer/medicines', label: 'Medicines', icon: Pill },
    { href: '/customer/refills', label: 'Refills', icon: RefreshCw },
    { href: '/customer/cart', label: 'Cart', icon: ShoppingBag, badge: cartCount },
    { href: '/customer/orders', label: 'Orders', icon: Package },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[64px] border-t border-[#EAE8F0] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(53,31,101,0.04)]">
      <div className="grid h-full grid-cols-5 items-center">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-[#6240E8]' : 'text-[#78879A] hover:text-[#351F65]'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#6240E8] px-1 text-[9px] font-bold text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
