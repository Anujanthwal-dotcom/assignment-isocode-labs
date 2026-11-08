'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiFetch } from '@/lib/api/client';
import { OrderDTO, OrderStatus } from '@pharmacy/shared-types';

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = React.useState<OrderDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });
        if (debouncedSearch.trim()) {
          queryParams.set('search', debouncedSearch.trim());
        }
        if (statusFilter) {
          queryParams.set('status', statusFilter);
        }

        const res = await apiFetch<{
          data: OrderDTO[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>(`/customer/orders?${queryParams.toString()}`);

        if (isMounted && res) {
          setOrders(res.data);
          setTotalPages(res.meta.totalPages);
          setTotalCount(res.meta.total);
        }
      } catch (err: unknown) {
        if (isMounted) setError((err as Error).message || 'Failed to load order history.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, statusFilter, page]);

  const getStatusColor = (
    status: OrderStatus,
  ): 'warning' | 'success' | 'danger' | 'information' => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return 'warning';
      case 'UNDER_REVIEW':
        return 'information';
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
    <div className="max-w-[950px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EBECEF]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">My Orders</h1>
          <p className="text-xs text-[#78879A] mt-1">
            Confirmed and fulfilled pharmacy orders (Total {totalCount}). Prescriptions awaiting pharmacist verification appear under{' '}
            <Link href="/customer/prescriptions" className="text-[#0D5C5A] font-semibold hover:underline">
              My Prescriptions
            </Link>
            .
          </p>
        </div>
        <Button
          onClick={() => router.push('/customer/medicines')}
          size="sm"
          className="text-xs bg-[#0D5C5A] text-white hover:bg-[#0A4846]"
        >
          Order Medicines
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number (e.g. PH-202611...)"
            className="h-10 px-3 text-xs rounded-lg border-slate-300"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-lg border border-[#EBECEF] bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]"
        >
          <option value="">All Orders</option>
          <option value="APPROVED">In Fulfilment (Approved)</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading your orders...</div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <span className="text-xs uppercase font-bold text-red-600 block mb-1">Notice</span>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-12 border-[#EBECEF] bg-white text-center">
          <h3 className="text-base font-semibold text-slate-800">No Orders Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {debouncedSearch || statusFilter
              ? 'No orders match your search criteria. Try resetting the filters.'
              : 'You have no active orders. Once your prescription is verified by our pharmacist and quotation paid, your orders appear here for live fulfilment tracking.'}
          </p>
          {(debouncedSearch || statusFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              className="mt-4 text-xs"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              onClick={() => router.push(`/customer/orders/${order.id}`)}
              className="p-5 border-[#EBECEF] bg-white hover:border-[#0D5C5A] cursor-pointer transition-all hover:shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-bold text-sm text-[#0F172A] block">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-[#78879A] mt-0.5 block">
                      Placed:{' '}
                      {new Date(order.placedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <StatusBadge
                    status={getStatusColor(order.status)}
                    label={order.status.replace(/_/g, ' ')}
                  />
                  <span className="font-bold text-base text-[#0F172A]">
                    ₹{order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-1">
                <span>
                  {order.items?.length || 0} item(s) &bull; Payment:{' '}
                  <strong className="text-slate-800">{order.paymentMethod}</strong> (
                  <span
                    className={
                      order.paymentStatus === 'SUCCESS'
                        ? 'text-emerald-600 font-medium'
                        : 'text-slate-600'
                    }
                  >
                    {order.paymentStatus}
                  </span>
                  )
                </span>
                <span className="text-[#0D5C5A] font-semibold hover:underline">
                  View Full Details &rarr;
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#EBECEF]">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="text-xs h-8 px-3"
            >
              &larr; Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="text-xs h-8 px-3"
            >
              Next &rarr;
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
