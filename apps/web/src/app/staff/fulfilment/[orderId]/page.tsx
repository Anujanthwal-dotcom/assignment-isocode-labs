'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { StaffShell } from '@/components/staff/StaffShell';
import { BackButton } from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import {
  Boxes,
  Package,
  Truck,
  Archive,
  Split,
  Building2,
  CheckCircle2,
  Clock,
  Printer,
  MapPin,
  Phone,
  User,
  AlertTriangle,
} from 'lucide-react';

export default function StaffOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<any>(null);

  const fetchDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(`/pharmacist/fulfilment/${orderId}`);
      setOrder(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load order fulfilment details.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handlePrint = () => {
    window.print();
  };

  const status = order?.status;
  const isToPick = status === 'STOCK_RESERVED' || status === 'APPROVED';
  const isPicking = status === 'PICKING';
  const isPacked = status === 'PACKED';
  const isReadyForHandover = status === 'READY_FOR_HANDOVER';
  const isHandedOver = status === 'HANDED_OVER';

  // Stepper calculations
  const step1Done = isPicking || isPacked || isReadyForHandover || isHandedOver;
  const step2Done = isPacked || isReadyForHandover || isHandedOver;
  const step3Done = isReadyForHandover || isHandedOver;
  const step4Done = isHandedOver;

  return (
    <StaffShell pageContext="Order Fulfilment Terminal">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBECEF] print:hidden">
          <div className="flex flex-col items-start gap-2">
            <BackButton href="/staff/fulfilment" label="Fulfilment Queue" />
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Order {order?.orderNumber || ''}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F0FDFA] text-[#0D5C5A] font-bold border border-[#99F6E4]">
                {order?.storeCode || 'STORE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order?.hasInvoice && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-xs font-semibold gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </Button>
            )}

            {/* Quick Next Stage CTA */}
            {isToPick && (
              <Link
                href={`/staff/fulfilment/${orderId}/pick`}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#094745] shadow-xs"
              >
                Start Picking &rarr;
              </Link>
            )}
            {isPicking && (
              <Link
                href={`/staff/fulfilment/${orderId}/pack`}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
              >
                Pack Medicines &rarr;
              </Link>
            )}
            {isPacked && (
              <Link
                href={`/staff/fulfilment/${orderId}/store`}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              >
                Store in Shelf / Bin &rarr;
              </Link>
            )}
            {isReadyForHandover && (
              <Link
                href={`/staff/fulfilment/${orderId}/handover`}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              >
                Handover to Delivery &rarr;
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading order workspace...</div>
        ) : error ? (
          <div className="p-6 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Multi-Store Split Fulfilment Notice Banner */}
            {order.isSplitOrder ? (
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Split className="w-4 h-4 text-purple-700" />
                  <span>
                    Multi-Store Split Order — Part {order.splitPartIndex} of {order.totalSplitParts}
                  </span>
                </div>
                <p className="text-[11px] text-purple-800">
                  Customer prescribed medicines were split across stores due to stock availability.
                  Your store ({order.storeName || order.storeCode}) is fulfilling{' '}
                  <strong>{order.items?.length || 0} line item(s)</strong>.
                </p>
                {order.siblingStores && order.siblingStores.length > 0 && (
                  <div className="pt-2 border-t border-purple-200 flex flex-wrap gap-2 text-[11px]">
                    <span className="font-semibold text-purple-900">Sibling Shipments:</span>
                    {order.siblingStores.map((s: any) => (
                      <span
                        key={s.orderId}
                        className="px-2 py-0.5 rounded bg-white border border-purple-300 font-mono text-purple-800 font-medium"
                      >
                        {s.storeName} ({s.storeCode}): {s.itemCount} items &bull;{' '}
                        <strong>{s.status}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>
                  <strong>Single Store Fulfilment:</strong> 100% of the customer&apos;s order is
                  fulfilled exclusively from this store location.
                </span>
              </div>
            )}

            {/* 4-Stage Operational Progress Stepper */}
            <div className="bg-white rounded-2xl border border-[#EBECEF] p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Store Fulfilment Lifecycle
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                {/* Step 1: Pick */}
                <div
                  className={`p-3 rounded-xl border ${
                    step1Done
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">1. Pick</span>
                    {step1Done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Boxes className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600">
                    {step1Done ? 'Medicines picked from shelves' : 'Awaiting item picking'}
                  </p>
                  {!step1Done && (
                    <Link
                      href={`/staff/fulfilment/${orderId}/pick`}
                      className="mt-2 inline-block text-[11px] font-bold text-[#0D5C5A] hover:underline"
                    >
                      Pick Items &rarr;
                    </Link>
                  )}
                </div>

                {/* Step 2: Pack */}
                <div
                  className={`p-3 rounded-xl border ${
                    step2Done
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : isPicking
                      ? 'bg-teal-50 border-teal-300 text-teal-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">2. Pack</span>
                    {step2Done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Package className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600">
                    {step2Done ? 'Packed & invoice created' : 'Tamper-evident verification'}
                  </p>
                  {isPicking && (
                    <Link
                      href={`/staff/fulfilment/${orderId}/pack`}
                      className="mt-2 inline-block text-[11px] font-bold text-indigo-700 hover:underline"
                    >
                      Pack Order &rarr;
                    </Link>
                  )}
                </div>

                {/* Step 3: Store */}
                <div
                  className={`p-3 rounded-xl border ${
                    step3Done
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : isPacked
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">3. Store</span>
                    {step3Done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Archive className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600">
                    {order.stagingLocation ? `Bin: ${order.stagingLocation}` : 'Staging holding shelf'}
                  </p>
                  {isPacked && (
                    <Link
                      href={`/staff/fulfilment/${orderId}/store`}
                      className="mt-2 inline-block text-[11px] font-bold text-blue-700 hover:underline"
                    >
                      Store in Shelf &rarr;
                    </Link>
                  )}
                </div>

                {/* Step 4: Handover */}
                <div
                  className={`p-3 rounded-xl border ${
                    step4Done
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : isReadyForHandover
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">4. Handover</span>
                    {step4Done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Truck className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600">
                    {step4Done ? 'Delivered to courier partner' : 'Dispatch to rider'}
                  </p>
                  {isReadyForHandover && (
                    <Link
                      href={`/staff/fulfilment/${orderId}/handover`}
                      className="mt-2 inline-block text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      Handover &rarr;
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-white rounded-2xl border border-[#EBECEF] p-5 shadow-xs space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Customer Information</span>
                </span>
                <p className="font-bold text-slate-800 text-sm">{order.customer?.name}</p>
                {order.customer?.phone && (
                  <p className="text-slate-600 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>+91 {order.customer.phone}</span>
                  </p>
                )}
                {order.customer?.email && (
                  <p className="text-slate-500 text-[11px]">{order.customer.email}</p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#EBECEF] p-5 shadow-xs space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>Delivery Destination</span>
                </span>
                <p className="font-semibold text-slate-800">
                  {order.deliveryAddress?.recipientName}
                </p>
                <p className="text-slate-600 text-[11px]">
                  {order.deliveryAddress?.addressLine1}
                  {order.deliveryAddress?.addressLine2 ? `, ${order.deliveryAddress.addressLine2}` : ''}
                  , {order.deliveryAddress?.city} - {order.deliveryAddress?.postalCode}
                </p>
                {order.distanceKm !== null && order.distanceKm !== undefined && (
                  <p className="text-[11px] font-bold text-[#0D5C5A]">
                    Distance to customer: {order.distanceKm} km
                  </p>
                )}
              </div>
            </div>

            {/* Medicines List to Fulfil */}
            <div className="bg-white rounded-2xl border border-[#EBECEF] shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">
                    Allocated Medicines for this Store ({order.items?.length || 0})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Physical stock is reserved at this store location.
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    ₹{order.totalAmount?.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    Payment: {order.paymentMethod} ({order.paymentStatus})
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-100">
                      <th className="py-2.5 px-4">Medicine</th>
                      <th className="py-2.5 px-4 font-mono">SKU</th>
                      <th className="py-2.5 px-4 text-right">Required Qty</th>
                      <th className="py-2.5 px-4 text-right">Picked Qty</th>
                      <th className="py-2.5 px-4">Picking Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item: any) => (
                      <tr key={item.orderItemId}>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 block">{item.medicineName}</span>
                          <span className="text-[10px] text-slate-400">
                            {item.strength} &bull; {item.dosageForm}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{item.sku}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {item.quantityPicked}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.pickingStatus === 'PICKED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.pickingStatus === 'EXCEPTION'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {item.pickingStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Handover Details if handed over */}
            {order.hasHandover && order.handoverDetails && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-xs text-emerald-900 space-y-2">
                <span className="font-bold block text-sm">Delivery Partner Handover Recorded</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
                  <div>
                    <span className="text-emerald-700 block">Recipient / Rider</span>
                    <strong>{order.handoverDetails.recipientName}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block">Delivery Partner</span>
                    <strong>{order.handoverDetails.deliveryPartnerName || 'Counter Pickup'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block">Reference / AWB #</span>
                    <strong className="font-mono">
                      {order.handoverDetails.referenceNumber || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block">Handover Time</span>
                    <strong>{new Date(order.handoverDetails.handedOverAt).toLocaleTimeString()}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StaffShell>
  );
}
