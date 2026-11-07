'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiFetch } from '@/lib/api/client';
import { OrderDTO } from '@pharmacy/shared-types';

export default function CustomerHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [recentOrders, setRecentOrders] = React.useState<OrderDTO[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const fetchRecentOrders = async () => {
      try {
        const res = await apiFetch<{ data: OrderDTO[] }>('/customer/orders?limit=3');
        if (isMounted && res?.data) {
          setRecentOrders(res.data);
        }
      } catch {
        // Silently handle
      } finally {
        if (isMounted) setLoadingOrders(false);
      }
    };

    fetchRecentOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/customer/medicines?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/customer/medicines');
    }
  };

  const getStatusColor = (
    status: string,
  ): 'warning' | 'purple' | 'success' | 'danger' | 'information' => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return 'warning';
      case 'UNDER_REVIEW':
        return 'purple';
      case 'APPROVED':
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
      case 'VERIFICATION_FAILED':
        return 'danger';
      default:
        return 'information';
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">
            Welcome back, {user?.profile?.fullName || 'Customer'}
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Order genuine medicines and manage prescriptions for your family across Kolkata &amp;
            Howrah.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/customer/prescriptions')}
            className="text-xs text-[#6240E8] border-[#6240E8]/30 hover:bg-[#F7F5FD]"
          >
            Upload Rx
          </Button>
          <Button
            size="sm"
            onClick={() => router.push('/customer/medicines')}
            className="text-xs bg-[#6240E8] text-white hover:bg-[#5233D0]"
          >
            Order Medicines
          </Button>
        </div>
      </div>

      {/* Primary Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative flex items-center">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine by brand name, generic name, or SKU..."
            className="h-12 px-4 pr-24 rounded-xl border-[#EAE8F0] bg-white text-base shadow-xs focus:ring-2 focus:ring-[#6240E8]"
          />
          <Button
            type="submit"
            className="absolute right-1.5 h-9 rounded-lg bg-[#6240E8] px-4 text-xs font-semibold text-white hover:bg-[#5233D0]"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/customer/medicines"
          className="p-4 rounded-xl border border-[#EAE8F0] bg-white hover:border-[#6240E8] hover:shadow-xs transition-all group"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6240E8] block mb-1">
            Catalogue
          </span>
          <span className="block font-semibold text-base text-[#351F65]">Medicines</span>
          <span className="text-xs text-[#78879A] mt-1 block">Browse active medicines</span>
        </Link>

        <Link
          href="/customer/prescriptions"
          className="p-4 rounded-xl border border-[#EAE8F0] bg-white hover:border-[#6240E8] hover:shadow-xs transition-all group"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6240E8] block mb-1">
            Records
          </span>
          <span className="block font-semibold text-base text-[#351F65]">Prescriptions</span>
          <span className="text-xs text-[#78879A] mt-1 block">Upload &amp; manage Rx</span>
        </Link>

        <Link
          href="/customer/family"
          className="p-4 rounded-xl border border-[#EAE8F0] bg-white hover:border-[#6240E8] hover:shadow-xs transition-all group"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6240E8] block mb-1">
            Members
          </span>
          <span className="block font-semibold text-base text-[#351F65]">Family Profiles</span>
          <span className="text-xs text-[#78879A] mt-1 block">Manage family care</span>
        </Link>

        <Link
          href="/customer/addresses"
          className="p-4 rounded-xl border border-[#EAE8F0] bg-white hover:border-[#6240E8] hover:shadow-xs transition-all group"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6240E8] block mb-1">
            Locations
          </span>
          <span className="block font-semibold text-base text-[#351F65]">Addresses</span>
          <span className="text-xs text-[#78879A] mt-1 block">Saved delivery locations</span>
        </Link>
      </div>

      {/* Safety & Compliance Notice */}
      <div className="rounded-xl border border-[#D6D1F7] bg-[#F7F5FD] p-4 flex items-start gap-3">
        <span className="font-bold text-xs uppercase px-1.5 py-0.5 rounded bg-[#6240E8]/10 text-[#6240E8]">
          NOTICE
        </span>
        <div className="text-xs text-[#351F65] leading-relaxed">
          <span className="font-semibold block text-[#6240E8] mb-0.5">
            Registered Pharmacist Review
          </span>
          All customer orders and uploaded prescriptions undergo mandatory verification by licensed
          pharmacists at our Kolkata &amp; Howrah fulfillment centers prior to packing.
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#351F65]">Recent Orders</h2>
          <Link
            href="/customer/orders"
            className="text-xs font-semibold text-[#6240E8] hover:underline"
          >
            View All &rarr;
          </Link>
        </div>

        {loadingOrders ? (
          <div className="p-8 text-center text-xs text-[#78879A] bg-white rounded-xl border border-[#EAE8F0]">
            Loading recent orders...
          </div>
        ) : recentOrders.length === 0 ? (
          <Card className="border-[#EAE8F0] bg-white p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">No Previous Orders Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Search medicines or browse our catalogue to place your first pharmacy order with
                  prescription upload.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => router.push('/customer/medicines')}
                className="mt-2 bg-[#6240E8] text-white hover:bg-[#5233D0]"
              >
                Browse Medicines
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Card
                key={order.id}
                onClick={() => router.push(`/customer/orders/${order.id}`)}
                className="p-4 bg-white border-[#EAE8F0] hover:border-[#6240E8] cursor-pointer transition-all hover:shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#351F65]">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-[#78879A]">
                        &bull;{' '}
                        {new Date(order.placedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {order.items?.length || 0} item(s) &bull; Payment:{' '}
                      <span className="font-medium">{order.paymentMethod}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <StatusBadge
                      status={getStatusColor(order.status)}
                      label={order.status.replace(/_/g, ' ')}
                    />
                    <span className="font-bold text-sm text-[#351F65]">
                      ₹{order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
