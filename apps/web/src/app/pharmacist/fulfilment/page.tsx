'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';

interface FulfilmentOrderRow {
  orderId: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone?: string | null;
  placedAt: string;
  itemCount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  storeId: string;
  reservationExpiresAt?: string | null;
  routingMethod?: string | null;
  distanceKm?: number | null;
}

export default function PharmacistFulfilmentQueuePage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<FulfilmentOrderRow[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  const fetchQueue = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        selectedStatus === 'ALL'
          ? '/pharmacist/fulfilment?limit=50'
          : `/pharmacist/fulfilment?status=${selectedStatus}&limit=50`;
      const res = await apiFetch<any>(url);
      setOrders(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load store fulfilment orders.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  React.useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.customerPhone && o.customerPhone.includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'STOCK_RESERVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Stock Reserved
          </span>
        );
      case 'PICKING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]">
            Picking in Progress
          </span>
        );
      case 'PACKED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Packed
          </span>
        );
      case 'READY_FOR_HANDOVER':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Ready for Handover
          </span>
        );
      case 'HANDED_OVER':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Handed Over
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getNextAction = (order: FulfilmentOrderRow) => {
    switch (order.status) {
      case 'STOCK_RESERVED':
      case 'PICKING':
        return { label: 'Pick Medicines', href: `/pharmacist/fulfilment/${order.orderId}/pick` };
      case 'PACKED':
      case 'READY_FOR_HANDOVER':
        return {
          label: 'Handover / Dispense',
          href: `/pharmacist/fulfilment/${order.orderId}/handover`,
        };
      case 'HANDED_OVER':
      default:
        return { label: 'View Details', href: `/pharmacist/fulfilment/${order.orderId}` };
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#EBECEF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">
            Store Fulfilment Queue
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Pick, pack, invoice, and hand over approved orders routed to your store.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-[#EBECEF] text-xs font-semibold overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'STOCK_RESERVED', label: 'Stock Reserved' },
            { id: 'PICKING', label: 'Picking' },
            { id: 'PACKED', label: 'Packed' },
            { id: 'READY_FOR_HANDOVER', label: 'Ready for Handover' },
            { id: 'HANDED_OVER', label: 'Handed Over' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-[#0D5C5A] text-white shadow-xs'
                  : 'text-[#78879A] hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Search order #, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-[#EBECEF] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            Loading assigned fulfilment orders...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50">
            <span className="font-bold text-xs uppercase block mb-1">Notice</span>
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            No orders found in this fulfilment stage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items / Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Routing / Distance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF] text-[#14161A]">
                {filteredOrders.map((row) => {
                  const action = getNextAction(row);
                  return (
                    <tr key={row.orderId} className="hover:bg-[#F8F9FB]/50">
                      <td className="py-3 px-4 font-mono font-bold text-[#0D5C5A]">
                        <Link
                          href={`/pharmacist/fulfilment/${row.orderId}`}
                          className="hover:underline"
                        >
                          {row.orderNumber}
                        </Link>
                        <div className="text-[10px] text-[#78879A] font-normal">
                          {new Date(row.placedAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#14161A]">
                        {row.customerName}
                        {row.customerPhone && (
                          <span className="block text-[10px] text-[#78879A] font-normal">
                            +91 {row.customerPhone}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#14161A]">
                          ₹{row.totalAmount.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-[#78879A] font-medium">
                          {row.itemCount} item(s)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block text-[#14161A]">
                          {row.paymentMethod}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            row.paymentStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#78879A]">
                        <span className="font-mono text-[10px] block text-[#14161A]">
                          {row.routingMethod || 'AUTOMATIC'}
                        </span>
                        {row.distanceKm !== null && row.distanceKm !== undefined ? (
                          <span className="text-[10px] text-[#0D5C5A] font-bold">
                            {row.distanceKm} km
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#78879A] italic">No coords</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(row.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={action.href}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#0A4846] transition-colors"
                        >
                          {action.label} &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
