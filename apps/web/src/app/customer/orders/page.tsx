'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiFetch } from '@/lib/api/client';
import {
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';
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

  const getStatusColor = (status: OrderStatus): 'warning' | 'purple' | 'success' | 'danger' | 'information' => {
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
    <div className="max-w-[950px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">
            My Orders
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Track and view previous pharmacy orders. Total {totalCount} order(s).
          </p>
        </div>
        <Button
          onClick={() => router.push('/customer/medicines')}
          size="sm"
          className="text-xs bg-[#6240E8] text-white hover:bg-[#5233D0]"
        >
          Order Medicines
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 h-4 w-4 text-[#78879A] top-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number (e.g. PH-202611...)"
            className="h-10 pl-10 text-xs rounded-lg border-slate-300"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6240E8]"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading your orders...
        </div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-12 border-[#EAE8F0] bg-white text-center">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Orders Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {debouncedSearch || statusFilter
              ? 'No orders match your search criteria. Try resetting the filters.'
              : 'You have not placed any orders yet. Browse our medicine catalogue to get started.'}
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
              className="p-5 border-[#EAE8F0] bg-white hover:border-[#6240E8] cursor-pointer transition-all hover:shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#F7F5FD] flex items-center justify-center text-[#6240E8] shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#351F65] block">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-[#78879A] flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
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
                  <span className="font-bold text-base text-[#351F65]">
                    ₹{order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-1">
                <span>
                  {order.items?.length || 0} item(s) &bull; Payment:{' '}
                  <strong className="text-slate-800">{order.paymentMethod}</strong> (
                  <span className={order.paymentStatus === 'SUCCESS' ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                    {order.paymentStatus}
                  </span>
                  )
                </span>
                <span className="text-[#6240E8] font-semibold hover:underline">
                  View Full Details &rarr;
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#EAE8F0]">
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
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="text-xs h-8 px-3"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
