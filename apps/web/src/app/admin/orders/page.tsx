'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ShoppingBag, DollarSign, CheckCircle2, FileText, Eye } from 'lucide-react';

interface OrderItemDTO {
  id: string;
  medicineName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: string;
}

interface AdminOrderDTO {
  orderId: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  assignedStore?: {
    id: string;
    code: string;
    name: string;
  } | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  itemCount: number;
  items?: OrderItemDTO[];
  paymentMethod: string;
  paymentStatus: string;
  placedAt: string;
  routingMethod?: string | null;
}

export default function AdminSalesAndOrdersPage() {
  const [orders, setOrders] = React.useState<AdminOrderDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Analytics Overview Data for Financial KPIs
  const [analytics, setAnalytics] = React.useState<any | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [period, setPeriod] = React.useState<string>('30D');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = React.useState<AdminOrderDTO | null>(null);

  const fetchSalesData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch financial aggregates
      const analyticsRes = await apiFetch<any>(`/admin/analytics/overview?period=${period}`).catch(() => null);
      if (analyticsRes) setAnalytics(analyticsRes);

      // Fetch orders list
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await apiFetch<{
        data: AdminOrderDTO[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/fulfilment/orders?${params.toString()}`);

      setOrders(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load sales and orders details.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, period]);

  React.useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Client-side quick filter on search
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.customerPhone && o.customerPhone.includes(q)) ||
      (o.assignedStore && o.assignedStore.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
            Sales &amp; Orders Monitor
          </h1>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {[
            { label: 'Today', value: 'TODAY' },
            { label: '7 Days', value: '7D' },
            { label: '30 Days', value: '30D' },
            { label: '90 Days', value: '90D' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setPeriod(item.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === item.value
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Financial & Sales KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="p-5 bg-white rounded-xl border border-[#EBECEF] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78879A] font-medium">
            <span>Total Sales (GMV)</span>
            <span className="font-bold text-[#0D5C5A]">₹</span>
          </div>
          <div className="text-[26px] leading-[32px] font-extrabold text-[#14161A]">
            ₹{(analytics?.totalRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">Recorded orders in period</span>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBECEF] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78879A] font-medium">
            <span>Delivered Revenue</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-[26px] leading-[32px] font-extrabold text-emerald-600">
            ₹{(analytics?.deliveredRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-700">Fulfilled &amp; collected</span>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBECEF] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78879A] font-medium">
            <span>Total Orders Placed</span>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-[26px] leading-[32px] font-extrabold text-blue-600">
            {analytics?.totalOrders ?? totalCount}
          </div>
          <span className="text-[11px] text-slate-500">
            {analytics?.fulfilmentOrders ?? 0} in active fulfilment
          </span>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBECEF] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78879A] font-medium">
            <span>Avg Order Value (AOV)</span>
            <DollarSign className="h-4 w-4 text-[#0D5C5A]" />
          </div>
          <div className="text-[26px] leading-[32px] font-extrabold text-[#0D5C5A]">
            ₹{(analytics?.averageOrderValue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">Per order average</span>
        </div>
      </div>

      {/* Status Filter Tabs & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-[#EBECEF] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'HANDED_OVER', label: 'Handed Over' },
            { id: 'PICKING', label: 'Picking & Packed' },
            { id: 'STOCK_RESERVED', label: 'Stock Reserved' },
            { id: 'PENDING_VERIFICATION', label: 'Pending Review' },
            { id: 'STOCK_UNAVAILABLE', label: 'Stockout' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setStatusFilter(st.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === st.id
                  ? 'bg-[#0D5C5A] text-white shadow-xs'
                  : 'text-[#78879A] hover:bg-slate-100 hover:text-[#14161A]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <Input
            placeholder="Search order #, customer, store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">
          Loading sales and orders records...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
          {error}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-xs space-y-2">
          <ShoppingBag className="h-8 w-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Orders Found</h3>
          <p className="text-xs text-slate-500">
            No orders match the selected filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#EBECEF] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] font-semibold">
                    <th className="py-3.5 px-4">Order Number</th>
                    <th className="py-3.5 px-4">Customer Details</th>
                    <th className="py-3.5 px-4">Store Hub</th>
                    <th className="py-3.5 px-4">Order Items</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Order Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBECEF]">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-[#F0FDFA]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#0D5C5A] block">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ord.placedAt).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#14161A] block">
                          {ord.customerName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {ord.customerPhone || '—'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {ord.assignedStore ? (
                          <span className="font-medium text-slate-800">
                            {ord.assignedStore.name} ({ord.assignedStore.code})
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold italic text-[11px]">
                            Awaiting Routing
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-[200px]">
                          <span className="font-semibold text-slate-800 block truncate">
                            {ord.items && ord.items.length > 0
                              ? ord.items.map((i) => `${i.quantity}x ${i.medicineName}`).join(', ')
                              : `${ord.itemCount} items`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {ord.itemCount} medicine line{ord.itemCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-extrabold text-[#14161A] text-sm block">
                          ₹{ord.totalAmount.toFixed(2)}
                        </span>
                        {ord.deliveryFee > 0 && (
                          <span className="text-[10px] text-slate-400 block">
                            (incl. ₹{ord.deliveryFee} del.)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[11px] text-slate-700 block">
                            {ord.paymentMethod}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              ord.paymentStatus === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={
                            ord.status === 'DELIVERED' || ord.status === 'HANDED_OVER'
                              ? 'completed'
                              : ord.status === 'STOCK_UNAVAILABLE' || ord.status === 'REJECTED'
                              ? 'blocked'
                              : ord.status === 'PENDING_VERIFICATION'
                              ? 'pending'
                              : 'processing'
                          }
                          label={ord.status}
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(ord)}
                          className="h-7 text-[11px] px-2.5 gap-1 border-slate-300 text-slate-700"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Details</span>
                        </Button>

                        <Link href={`/admin/fulfilment/invoices/${ord.orderId}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] px-2 text-[#0D5C5A] hover:bg-[#F0FDFA]"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            <span>Invoice</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between p-3 border-t border-[#EBECEF] text-xs text-slate-500 bg-[#F8F9FB]">
              <div>
                Showing <span className="font-bold text-slate-900">{filteredOrders.length}</span> of{' '}
                <span className="font-bold text-slate-900">{totalCount}</span> orders
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <span className="font-medium text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#14161A] flex items-center justify-between">
              <span>Order Details: {selectedOrder?.orderNumber}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {selectedOrder?.status}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Customer</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedOrder.customerName}</span>
                  <span className="text-slate-500 font-mono block">{selectedOrder.customerPhone || 'No phone'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Assigned Store Hub</span>
                  <span className="font-bold text-[#0D5C5A] text-sm">
                    {selectedOrder.assignedStore?.name || 'Unassigned / Pending'}
                  </span>
                  <span className="text-slate-500 block">
                    {selectedOrder.assignedStore?.code || 'None'}
                  </span>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Prescribed &amp; Dispensed Medicines</h4>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F9FB] border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Medicine</th>
                          <th className="py-2 px-3 text-right">Price</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.items.map((it) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-900 block">{it.medicineName}</span>
                              <span className="text-[10px] font-mono text-slate-400">{it.sku}</span>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">₹{it.unitPrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center font-bold text-slate-800">{it.quantity}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">₹{it.lineTotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No detailed items recorded.</p>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee:</span>
                    <span>₹{selectedOrder.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{selectedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Total Amount Paid / Due:</span>
                  <span className="text-[#0D5C5A]">₹{selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Link href={`/admin/fulfilment/invoices/${selectedOrder.orderId}`}>
                  <Button size="sm" variant="outline" className="gap-1 text-[#0D5C5A]">
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Statutory Tax Invoice</span>
                  </Button>
                </Link>
                <Button size="sm" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
