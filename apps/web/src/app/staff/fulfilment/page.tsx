'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { StaffShell } from '@/components/staff/StaffShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api/client';
import {
  Package,
  Search,
  RefreshCw,
  Boxes,
  Truck,
  Split,
  Building2,
  FileText,
  Clock,
  Archive,
} from 'lucide-react';

interface SiblingStore {
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  itemCount: number;
  status: string;
}

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
  storeName?: string;
  storeCode?: string;
  stagingLocation?: string | null;
  stagingNotes?: string | null;
  isSplitOrder?: boolean;
  splitPartIndex?: number;
  totalSplitParts?: number;
  siblingStores?: SiblingStore[];
}

export default function StaffFulfilmentPage() {
  const { user } = useAuth();
  const [orders, setOrders] = React.useState<FulfilmentOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [selectedTab, setSelectedTab] = React.useState<string>('ALL');

  // Quick Action Modal states
  const [stagingOrder, setStagingOrder] = React.useState<FulfilmentOrderRow | null>(null);
  const [stagingBin, setStagingBin] = React.useState('Shelf A-01');
  const [stagingNotes, setStagingNotes] = React.useState('');
  const [stagingBusy, setStagingBusy] = React.useState(false);

  const [actionBusyId, setActionBusyId] = React.useState<string | null>(null);

  const store = user?.store;

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>('/pharmacist/fulfilment?limit=50');
      setOrders(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load store orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Tab counts
  const countToPick = orders.filter(
    (o) => o.status === 'STOCK_RESERVED' || o.status === 'APPROVED',
  ).length;
  const countPicking = orders.filter((o) => o.status === 'PICKING').length;
  const countPackedStaged = orders.filter(
    (o) => o.status === 'PACKED' || o.status === 'READY_FOR_HANDOVER',
  ).length;
  const countHandedOver = orders.filter((o) => o.status === 'HANDED_OVER').length;

  const filtered = orders.filter((o) => {
    // Tab filter
    if (selectedTab === 'TO_PICK' && o.status !== 'STOCK_RESERVED' && o.status !== 'APPROVED') {
      return false;
    }
    if (selectedTab === 'PICKING' && o.status !== 'PICKING') {
      return false;
    }
    if (
      selectedTab === 'PACKED_STAGED' &&
      o.status !== 'PACKED' &&
      o.status !== 'READY_FOR_HANDOVER'
    ) {
      return false;
    }
    if (selectedTab === 'HANDED_OVER' && o.status !== 'HANDED_OVER') {
      return false;
    }

    // Search filter
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.customerPhone && o.customerPhone.includes(q))
    );
  });

  // Fast 1-click pick all
  const handleQuickPickAll = async (orderId: string) => {
    setActionBusyId(`pick-${orderId}`);
    try {
      await apiFetch(`/pharmacist/fulfilment/${orderId}/picking/confirm-all`, {
        method: 'POST',
      });
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm picking.');
    } finally {
      setActionBusyId(null);
    }
  };

  // Fast 1-click complete pack
  const handleQuickPack = async (orderId: string) => {
    setActionBusyId(`pack-${orderId}`);
    try {
      await apiFetch(`/pharmacist/fulfilment/${orderId}/packing/complete`, {
        method: 'POST',
        body: JSON.stringify({ checklistConfirmed: true }),
      });
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to complete packing.');
    } finally {
      setActionBusyId(null);
    }
  };

  // Submit Store Staging
  const handleConfirmStaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stagingOrder || !stagingBin.trim()) return;
    setStagingBusy(true);
    try {
      await apiFetch(`/pharmacist/fulfilment/${stagingOrder.orderId}/store-staging`, {
        method: 'POST',
        body: JSON.stringify({
          storageBin: stagingBin.trim(),
          stagingNotes: stagingNotes.trim() || undefined,
        }),
      });
      setStagingOrder(null);
      setStagingBin('Shelf A-01');
      setStagingNotes('');
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to record store staging.');
    } finally {
      setStagingBusy(false);
    }
  };

  return (
    <StaffShell pageContext="Store Order Fulfilment">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBECEF]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Store Order Fulfilment
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F0FDFA] text-[#0D5C5A] font-semibold border border-[#99F6E4]">
                {store?.name || 'Retail Store'} ({store?.code || 'STORE'})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Store staff terminal: mark orders through <strong>Pick</strong>, <strong>Pack</strong>, <strong>Store (Staging)</strong>, and <strong>Handover to Delivery</strong>.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="border-slate-300 text-slate-700 h-9 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </Button>
        </div>

        {/* Operational Lifecycle Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div
            onClick={() => setSelectedTab('TO_PICK')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedTab === 'TO_PICK'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                : 'bg-white border-[#EBECEF] hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold text-[11px] uppercase tracking-wider">1. To Pick</span>
              <Boxes className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{countToPick}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting shelf picking</p>
          </div>

          <div
            onClick={() => setSelectedTab('PICKING')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedTab === 'PICKING'
                ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-200'
                : 'bg-white border-[#EBECEF] hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold text-[11px] uppercase tracking-wider">2. Picking</span>
              <Clock className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{countPicking}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">In pick progress</p>
          </div>

          <div
            onClick={() => setSelectedTab('PACKED_STAGED')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedTab === 'PACKED_STAGED'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                : 'bg-white border-[#EBECEF] hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold text-[11px] uppercase tracking-wider">3. Staged</span>
              <Archive className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{countPackedStaged}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Stored in holding shelf</p>
          </div>

          <div
            onClick={() => setSelectedTab('HANDED_OVER')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedTab === 'HANDED_OVER'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                : 'bg-white border-[#EBECEF] hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold text-[11px] uppercase tracking-wider">4. Dispatched</span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{countHandedOver}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Handed to delivery partner</p>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-[#EBECEF] text-xs font-semibold overflow-x-auto">
            {[
              { id: 'ALL', label: `All Orders (${orders.length})` },
              { id: 'TO_PICK', label: `To Pick (${countToPick})` },
              { id: 'PICKING', label: `Picking (${countPicking})` },
              { id: 'PACKED_STAGED', label: `Packed & Staged (${countPackedStaged})` },
              { id: 'HANDED_OVER', label: `Handed Over (${countHandedOver})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTab === tab.id
                    ? 'bg-[#0D5C5A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Search by order # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Orders Queue Table */}
        <Card className="border-[#EBECEF] bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading store shipments...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No orders found in this stage.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Order &amp; Type</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4 text-right">Items / Total</th>
                      <th className="py-3 px-4">Fulfilment Stage</th>
                      <th className="py-3 px-4">Staging Bin / Shelf</th>
                      <th className="py-3 px-4 text-right">Stage Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((o) => {
                      const isToPick = o.status === 'STOCK_RESERVED' || o.status === 'APPROVED';
                      const isPicking = o.status === 'PICKING';
                      const isPacked = o.status === 'PACKED';
                      const isReadyForHandover = o.status === 'READY_FOR_HANDOVER';
                      const isHandedOver = o.status === 'HANDED_OVER';

                      return (
                        <tr key={o.orderId} className="hover:bg-[#F0FDFA]/40 transition-colors">
                          {/* Order Number & Split Fulfilment Indicator */}
                          <td className="py-3 px-4">
                            <Link
                              href={`/staff/fulfilment/${o.orderId}`}
                              className="font-mono font-bold text-[#0D5C5A] hover:underline block"
                            >
                              {o.orderNumber}
                            </Link>
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(o.placedAt).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>

                            {/* Split Fulfilment Badge */}
                            {o.isSplitOrder ? (
                              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                <Split className="w-3 h-3 text-purple-600" />
                                <span>
                                  Split Fulfilment (Part {o.splitPartIndex} of {o.totalSplitParts})
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span>Single Store Order</span>
                              </div>
                            )}

                            {/* Sibling Store details if split */}
                            {o.isSplitOrder && o.siblingStores && o.siblingStores.length > 0 && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Other item(s) routed to:{' '}
                                {o.siblingStores.map((s) => (
                                  <span key={s.orderId} className="font-semibold text-slate-700">
                                    {s.storeCode} ({s.status})
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">{o.customerName}</span>
                            {o.customerPhone && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                +91 {o.customerPhone}
                              </span>
                            )}
                          </td>

                          {/* Items / Total */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              ₹{Number(o.totalAmount).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {o.itemCount} allocated item{o.itemCount === 1 ? '' : 's'}
                            </span>
                          </td>

                          {/* Fulfilment Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                isHandedOver
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isReadyForHandover
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : isPacked
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : isPicking
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              <span>
                                {isHandedOver
                                  ? 'Handed Over'
                                  : isReadyForHandover
                                  ? 'Stored & Staged'
                                  : isPacked
                                  ? 'Packed & Invoiced'
                                  : isPicking
                                  ? 'Picking'
                                  : 'To Pick'}
                              </span>
                            </span>
                          </td>

                          {/* Staging Bin / Shelf */}
                          <td className="py-3 px-4">
                            {o.stagingLocation ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                <Archive className="w-3 h-3 text-[#0D5C5A]" />
                                <span>{o.stagingLocation}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Not staged yet</span>
                            )}
                          </td>

                          {/* Stage Marking Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* 1. Pick stage */}
                              {isToPick && (
                                <>
                                  <Link
                                    href={`/staff/fulfilment/${o.orderId}/pick`}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#094745] transition-colors"
                                  >
                                    Pick Items &rarr;
                                  </Link>
                                  <button
                                    onClick={() => handleQuickPickAll(o.orderId)}
                                    disabled={actionBusyId === `pick-${o.orderId}`}
                                    className="px-2 py-1.5 rounded-lg text-xs font-semibold border border-teal-200 text-teal-800 bg-teal-50 hover:bg-teal-100 disabled:opacity-50"
                                    title="Quick 1-Click Pick Confirmation"
                                  >
                                    {actionBusyId === `pick-${o.orderId}` ? 'Picking...' : 'Quick Pick'}
                                  </button>
                                </>
                              )}

                              {/* 2. Picking in progress -> Pack */}
                              {isPicking && (
                                <>
                                  <Link
                                    href={`/staff/fulfilment/${o.orderId}/pack`}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                                  >
                                    Pack Order &rarr;
                                  </Link>
                                  <button
                                    onClick={() => handleQuickPack(o.orderId)}
                                    disabled={actionBusyId === `pack-${o.orderId}`}
                                    className="px-2 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                                    title="Quick Complete Packing"
                                  >
                                    {actionBusyId === `pack-${o.orderId}` ? 'Packing...' : 'Quick Pack'}
                                  </button>
                                </>
                              )}

                              {/* 3. Packed -> Store in shelf / bin */}
                              {isPacked && (
                                <button
                                  onClick={() => setStagingOrder(o)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span>Store in Shelf &rarr;</span>
                                </button>
                              )}

                              {/* 4. Stored -> Handover to Delivery Partner */}
                              {isReadyForHandover && (
                                <>
                                  <Link
                                    href={`/staff/fulfilment/${o.orderId}/handover`}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Handover &rarr;</span>
                                  </Link>
                                  <button
                                    onClick={() => setStagingOrder(o)}
                                    className="px-2 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                                    title="Change Staging Shelf"
                                  >
                                    Update Bin
                                  </button>
                                </>
                              )}

                              {/* 5. Handed over -> View Invoice */}
                              {isHandedOver && (
                                <Link
                                  href={`/staff/fulfilment/${o.orderId}`}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View Invoice</span>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Store Staging (Assign Shelf / Bin) */}
        {stagingOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Store in Holding Shelf / Bin
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Order: {stagingOrder.orderNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStagingOrder(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmStaging} className="space-y-4">
                <p className="text-slate-600 text-[11px]">
                  Assign the packed package to a physical store staging bin, holding shelf, or cold storage rack awaiting courier rider pickup.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Staging Shelf / Bin Identifier *
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {['Shelf A-01', 'Shelf B-02', 'Cold Rack C-01'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setStagingBin(preset)}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all ${
                          stagingBin === preset
                            ? 'bg-[#0D5C5A] text-white border-[#0D5C5A]'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <Input
                    type="text"
                    required
                    value={stagingBin}
                    onChange={(e) => setStagingBin(e.target.value)}
                    placeholder="e.g. Shelf A-04, Bin 12, Cold Rack"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Staging Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    value={stagingNotes}
                    onChange={(e) => setStagingNotes(e.target.value)}
                    placeholder="e.g. Placed with 2 gel ice packs, sealed bag #445"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStagingOrder(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={stagingBusy || !stagingBin.trim()}
                    className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs gap-1.5"
                  >
                    <span>{stagingBusy ? 'Storing...' : 'Confirm Stored & Ready for Delivery'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </StaffShell>
  );
}
