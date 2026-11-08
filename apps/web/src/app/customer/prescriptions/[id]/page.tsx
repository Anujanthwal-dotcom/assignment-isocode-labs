'use client';

/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api/client';
import Link from 'next/link';
import {
  PrescriptionDTO,
  CustomerAddressDTO,
} from '@pharmacy/shared-types';
import { MissingPrescriptionIllustration } from '@/components/customer/MissingPrescriptionIllustration';
import { BackButton } from '@/components/shared/BackButton';
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  MapPin,
  Store,
  Package,
  Clock,
} from 'lucide-react';

interface PrescriptionQuoteItem {
  id: string;
  quoteId: string;
  medicineId: string | null;
  detectedMedicineName?: string | null;
  medicineNameSnapshot: string;
  strengthSnapshot?: string | null;
  dosageFormSnapshot?: string | null;
  dosageInstructions?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isAvailable: boolean;
  unavailableReason?: string | null;
}

interface PrescriptionQuote {
  id: string;
  prescriptionId: string;
  pharmacistId: string;
  storeId: string;
  status: 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  pharmacistNotes?: string | null;
  quotedAt: string;
  validUntil?: string | null;
  orderId?: string | null;
  orders?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    fulfilmentStore?: { id: string; code: string; name: string; city: string } | null;
    items: Array<{ id: string; medicineNameSnapshot: string; quantity: number; lineTotal: number }>;
  }>;
  items: PrescriptionQuoteItem[];
}

export default function PrescriptionDetailPage() {
  const params = useParams();
  const prescriptionId = params.id as string;
  const router = useRouter();

  const [prescription, setPrescription] = React.useState<PrescriptionDTO | null>(null);
  const [viewUrl, setViewUrl] = React.useState<string | null>(null);
  const [previewImageError, setPreviewImageError] = React.useState(false);
  // Quote & Ordering state
  const [quote, setQuote] = React.useState<PrescriptionQuote | null>(null);
  const [addresses, setAddresses] = React.useState<CustomerAddressDTO[]>([]);
  const [selectedAddressId, setSelectedAddressId] = React.useState<string>('');
  const [paymentMethod, setPaymentMethod] = React.useState<'UPI' | 'COD'>('UPI');
  const [customerNote, setCustomerNote] = React.useState('');
  const [ordering, setOrdering] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = React.useState<any | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load prescription metadata and preview URL
  const loadPrescription = React.useCallback(async () => {
    try {
      const rx = await apiFetch<PrescriptionDTO>(`/customer/prescriptions/${prescriptionId}`);
      setPrescription(rx);

      try {
        const fileRes = await apiFetch<{ viewUrl?: string; url?: string; exists?: boolean }>(
          `/customer/prescriptions/${prescriptionId}/preview-url`,
        );
        if (fileRes.exists === false) {
          setViewUrl(null);
          setPreviewImageError(true);
        } else {
          setViewUrl(fileRes.viewUrl || fileRes.url || null);
          setPreviewImageError(false);
        }
      } catch {
        setViewUrl(null);
        setPreviewImageError(true);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load prescription.');
    }
  }, [prescriptionId]);

  // Load active verified quotation (if pharmacist has verified)
  const loadQuote = React.useCallback(async () => {
    try {
      const res = await apiFetch<PrescriptionQuote | null>(
        `/customer/prescriptions/${prescriptionId}/quote`,
      );
      setQuote(res);
    } catch {
      setQuote(null);
    }
  }, [prescriptionId]);

  // Load customer addresses
  const loadAddresses = React.useCallback(async () => {
    try {
      const res = await apiFetch<CustomerAddressDTO[]>('/customer/addresses');
      setAddresses(res || []);
      const defaultAddr = res?.find((a) => a.isDefault) || res?.[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    } catch {
      setAddresses([]);
    }
  }, []);

  React.useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadPrescription(), loadQuote(), loadAddresses()]);
      setLoading(false);
    };
    init();
  }, [loadPrescription, loadQuote, loadAddresses]);

  // Accept Quotation and Place Order
  const handleAcceptQuoteAndPay = async () => {
    if (!quote) return;
    if (!selectedAddressId) {
      setOrderError('Please select a delivery address for this order.');
      return;
    }

    try {
      setOrdering(true);
      setOrderError(null);

      const order = await apiFetch<any>(
        `/customer/prescriptions/${prescriptionId}/accept-and-pay`,
        {
          method: 'POST',
          body: JSON.stringify({
            quoteId: quote.id,
            addressId: selectedAddressId,
            paymentMethod,
            customerNote: customerNote.trim() || undefined,
          }),
        },
      );

      setCreatedOrder(order);
      // Refresh quote state
      await loadQuote();

      // If mock online payment, redirect or notify
      if (paymentMethod === 'UPI') {
        setTimeout(() => {
          router.push(`/customer/orders/${order.id}`);
        }, 1200);
      }
    } catch (err: any) {
      setOrderError(err?.message || 'Failed to place order from quotation.');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#0D5C5A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">Loading prescription details...</p>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="max-w-[1000px] mx-auto py-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <span className="font-bold uppercase text-xs block mb-1">Notice</span>
          <h2 className="font-bold">Prescription Not Found</h2>
          <p className="text-sm mt-1">
            This prescription does not exist or you do not have permission to view it.
          </p>
          <div className="mt-4">
            <BackButton href="/customer/prescriptions" label="My Prescriptions" />
          </div>
        </div>
      </div>
    );
  }

  const quoteItems = Array.isArray(quote?.items) ? quote.items : [];
  const availableQuoteItems = quoteItems.filter((i) => i.isAvailable);
  const unavailableQuoteItems = quoteItems.filter((i) => !i.isAvailable);

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EBECEF]">
        <BackButton href="/customer/prescriptions" label="My Prescriptions" />
        <span className="text-xs text-slate-400 font-mono">ID: {prescription.id}</span>
      </div>

      {/* Main Grid: Document Viewer on Left (4 cols), Workflow & Quotation on Right (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5/12): Prescription Document Details & Scan Preview */}
        <Card className="p-5 lg:col-span-5 space-y-4 border-slate-200 shadow-xs bg-white">
          <div className="flex items-start justify-between">
            <div className="overflow-hidden">
              <h2
                className="font-bold text-sm text-[#0F172A] truncate"
                title={prescription.originalFileName}
              >
                {prescription.originalFileName}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {(prescription.fileSizeBytes / 1024).toFixed(0)} KB &bull; {prescription.mimeType}
              </p>
            </div>
            <Badge variant="neutral" className="text-[10px] font-medium border-slate-300">
              {prescription.status}
            </Badge>
          </div>

          <div className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Patient:</span>
              <span className="font-semibold text-slate-800">
                {prescription.familyMember
                  ? `${prescription.familyMember.fullName} (${prescription.familyMember.relationship})`
                  : 'Self (Account Owner)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Uploaded On:</span>
              <span className="font-medium text-slate-700">
                {new Date(prescription.uploadedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Secure Document Preview */}
          <div className="pt-2">
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Prescription Document Preview
            </label>
            {viewUrl && !previewImageError ? (
              prescription.mimeType === 'application/pdf' ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden h-[340px] bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs text-slate-600 font-medium">PDF Document Ready</p>
                  <a
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center text-xs text-[#0D5C5A] font-semibold hover:underline"
                  >
                    Open PDF in New Window &rarr;
                  </a>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden h-[340px] bg-slate-50 flex items-center justify-center">
                  <img
                    src={viewUrl}
                    alt="Prescription Scan"
                    onError={() => setPreviewImageError(true)}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )
            ) : (
              <div className="border border-slate-200 rounded-lg bg-slate-50/70 p-2">
                <MissingPrescriptionIllustration
                  compact
                  fileName={prescription?.originalFileName}
                  mimeType={prescription?.mimeType}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Right Column (7/12): Verified Quotation & Ordering OR AI Extraction Reading */}
        <div className="lg:col-span-7 space-y-5">
          {/* STAGE A: PHARMACIST HAS ISSUED A VERIFIED QUOTATION */}
          {quote && quote.status === 'QUOTED' && (
            <Card className="p-6 border-[#0D5C5A]/30 bg-white shadow-sm space-y-5">
              {/* Quotation Header */}
              <div className="pb-3 border-b border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <h2 className="text-base font-bold text-[#0F172A] truncate">
                      Prescription Verified — Quotation Ready
                    </h2>
                  </div>
                  <Badge className="shrink-0 whitespace-nowrap h-7 px-3 rounded-[8px] bg-[#CCFBF1] text-[#0D5C5A] border-[#99F6E4] font-semibold text-xs inline-flex items-center justify-center leading-none">
                    Quote Ready
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  A registered pharmacist has verified your prescription, matched medications to our catalogue, and prepared this cost quotation.
                </p>
              </div>

              {/* Pharmacist Advice / Notes */}
              {quote.pharmacistNotes && (
                <div className="p-3 bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl text-xs space-y-1">
                  <span className="font-bold text-[#0D5C5A] uppercase tracking-wider text-[10px] block">
                    Pharmacist Advice
                  </span>
                  <p className="text-slate-800 leading-relaxed">{quote.pharmacistNotes}</p>
                </div>
              )}

              {/* Verified Medicines Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Verified Medicines ({availableQuoteItems.length} Available)
                </h3>

                <div className="space-y-2">
                  {availableQuoteItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 block text-sm">
                          {item.medicineNameSnapshot}
                        </span>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          {item.strengthSnapshot && <span>{item.strengthSnapshot}</span>}
                          {item.dosageFormSnapshot && <span>&bull; {item.dosageFormSnapshot}</span>}
                          {item.dosageInstructions && (
                            <span className="text-[#0D5C5A] font-medium">
                              &bull; {item.dosageInstructions}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-[#0D5C5A] font-mono block">
                          ₹{Number(item.lineTotal).toFixed(2)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Qty: {item.quantity} &times; ₹{Number(item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unavailable Items Notice (if any) */}
                {unavailableQuoteItems.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs space-y-2 mt-3">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>{unavailableQuoteItems.length} Item(s) Marked Unavailable</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      The following item(s) could not be fulfilled from our current stock and will not be charged:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-amber-900">
                      {unavailableQuoteItems.map((uItem, uIdx) => (
                        <li key={uIdx}>
                          <strong>{uItem.medicineNameSnapshot}</strong> — Reason: {uItem.unavailableReason || 'Unavailable at pharmacy'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Delivery Address Selector */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0D5C5A]" />
                  <span>Select Delivery Address</span>
                </label>

                {addresses.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    No saved delivery addresses found. Please{' '}
                    <Link href="/customer/addresses" className="underline font-bold">
                      add a delivery address
                    </Link>{' '}
                    to proceed.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-[#0D5C5A] bg-[#F0FDFA]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="address"
                            value={addr.id}
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-0.5 text-[#0D5C5A]"
                          />
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">
                              {addr.label} {addr.isDefault && '(Default)'}
                            </span>
                            <p className="text-slate-500 line-clamp-2">
                              {addr.addressLine1}, {addr.city} {addr.postalCode}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                      paymentMethod === 'UPI'
                        ? 'border-[#0D5C5A] bg-[#F0FDFA]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="UPI"
                      checked={paymentMethod === 'UPI'}
                      onChange={() => setPaymentMethod('UPI')}
                      className="text-[#0D5C5A]"
                    />
                    <div>
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#0D5C5A]" /> UPI / Online
                      </span>
                      <span className="text-[10px] text-slate-400 block">Mock Gateway Simulation</span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                      paymentMethod === 'COD'
                        ? 'border-[#0D5C5A] bg-[#F0FDFA]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="text-[#0D5C5A]"
                    />
                    <div>
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-[#0D5C5A]" /> Cash on Delivery
                      </span>
                      <span className="text-[10px] text-slate-400 block">Pay upon doorstep receipt</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Optional Delivery Instructions */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="e.g. Ring bell, leave with security guard, or call upon arrival"
                  className="w-full text-xs h-8 px-2.5 rounded border border-slate-300 focus:outline-hidden focus:border-[#0D5C5A]"
                />
              </div>

              {/* Price Calculation Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Medicines Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ₹{Number(quote.subtotal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Delivery Charges:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {Number(quote.deliveryFee) === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      `₹${Number(quote.deliveryFee).toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-bold text-[#0F172A]">
                  <span>Total Amount Payable:</span>
                  <span className="text-lg text-[#0D5C5A] font-mono">
                    ₹{Number(quote.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {orderError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {orderError}
                </div>
              )}

              {/* Order Placement Action */}
              <Button
                type="button"
                onClick={handleAcceptQuoteAndPay}
                disabled={ordering || !selectedAddressId || availableQuoteItems.length === 0}
                className="w-full bg-[#0D5C5A] hover:bg-[#093e3d] text-white font-bold h-11 text-sm shadow-sm"
              >
                {ordering ? (
                  'Processing Order...'
                ) : (
                  <>
                    Pay ₹{Number(quote.totalAmount).toFixed(2)} &amp; Place Order &rarr;
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* STAGE B: ORDER HAS BEEN PLACED FROM QUOTE */}
          {quote && quote.status === 'ACCEPTED' && (
            <Card className="p-6 border-emerald-300 bg-emerald-50/40 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-emerald-950">
                    Prescription Quotation Accepted &amp; Order Confirmed!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your prescription bundle payment is complete. The system has automatically assigned fulfillment to our nearest pharmacies based on live stock.
                  </p>
                </div>
              </div>

              {/* Display child shipments (supports single and multi-store split orders) */}
              {quote.orders && quote.orders.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0D5C5A]" />
                    <span>
                      {quote.orders.length > 1
                        ? `Multi-Store Split Fulfilment (${quote.orders.length} Shipments):`
                        : 'Fulfilment Dispatch:'}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {quote.orders.map((ord, idx) => (
                      <div
                        key={ord.id}
                        className="p-3.5 bg-white border border-emerald-200 rounded-xl space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0F172A]">
                            Shipment #{idx + 1}: {ord.orderNumber}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                            {ord.status}
                          </span>
                        </div>

                        {ord.fulfilmentStore && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Store className="w-3.5 h-3.5 text-[#0D5C5A] shrink-0" />
                            <span>
                              {ord.fulfilmentStore.name} ({ord.fulfilmentStore.code})
                            </span>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500 font-medium">
                          {ord.items.length} item(s) &bull; ₹{ord.totalAmount.toFixed(2)}
                        </div>

                        {/* List items fulfilled by this specific store */}
                        {ord.items && ord.items.length > 0 && (
                          <div className="space-y-1 py-1.5 border-t border-emerald-100/60 text-[11px] text-slate-700">
                            {ord.items.map((it) => (
                              <div key={it.id} className="flex justify-between items-center">
                                <span className="truncate max-w-[190px] font-medium text-slate-800">
                                  &bull; {it.medicineNameSnapshot} &times; {it.quantity}
                                </span>
                                <span className="text-slate-500 font-mono">₹{it.lineTotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-1">
                          <Link href={`/customer/orders/${ord.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs h-7 border-[#0D5C5A]/40 text-[#0D5C5A] hover:bg-[#F0FDFA]"
                            >
                              Track Shipment &rarr;
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (quote.orderId || createdOrder?.id) ? (
                <div className="pt-2">
                  <Link href={`/customer/orders/${quote.orderId || createdOrder?.id}`}>
                    <Button className="bg-[#0D5C5A] hover:bg-[#093e3d] text-white text-xs h-9">
                      View Order Details &amp; Tracking &rarr;
                    </Button>
                  </Link>
                </div>
              ) : null}
            </Card>
          )}

          {/* Under Review / Rejected / Awaiting Verification States (Only when not quoted and not yet ordered) */}
          {(!quote || (quote.status !== 'QUOTED' && quote.status !== 'ACCEPTED')) && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {error}
                </div>
              )}

              {prescription?.status === 'REJECTED' ? (
                <Card className="p-6 border-red-200 bg-red-50/40 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-red-950">Prescription Cannot Be Fulfilled</h3>
                      <p className="text-xs text-red-800 leading-relaxed">
                        Our pharmacist could not approve this prescription for dispensing. Please upload a valid prescription from a licensed practitioner to proceed.
                      </p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <BackButton href="/customer/prescriptions" label="Return to Prescriptions" />
                  </div>
                </Card>
              ) : prescription?.status === 'REUPLOAD_REQUIRED' ? (
                <Card className="p-6 border-amber-200 bg-amber-50/40 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-amber-950">Prescription Re-upload Requested</h3>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        The pharmacist requested a clearer document or image of your prescription (e.g. illegible doctor handwriting or blurred camera scan). Please upload a clearer copy.
                      </p>
                    </div>
                  </div>
                  <Link href="/customer/prescriptions">
                    <Button size="sm" className="text-xs bg-[#0D5C5A] hover:bg-[#093e3d] text-white">
                      Upload New Scan
                    </Button>
                  </Link>
                </Card>
              ) : (
                <Card className="p-6 border-slate-200 bg-white shadow-xs space-y-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <h3 className="font-bold text-sm text-[#0F172A]">
                          Prescription Under Pharmacist Review
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        A registered pharmacist is currently verifying your prescription and checking live medicine inventory across our pharmacy stores. As soon as verification is complete, your itemized cost quotation will appear here for payment and ordering.
                      </p>
                    </div>
                  </div>

                  {/* Visual 4-Step Fulfilment Tracker */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Prescription Fulfilment Steps
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center gap-2.5 text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">1. Prescription Uploaded Successfully</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#0D5C5A]">
                        <span className="w-4 h-4 rounded-full border-2 border-[#0D5C5A] border-t-transparent animate-spin shrink-0" />
                        <span className="font-bold">2. Pharmacist Clinical Review &amp; Quotation (In Progress)</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-400">
                        <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        <span>3. Quotation Approval &amp; Order Payment</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-400">
                        <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        <span>4. Multi-Store Split Fulfilment &amp; Delivery Tracking</span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Store Split Fulfilment Note */}
                  <div className="p-3.5 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1] text-xs text-[#0D5C5A] flex items-start gap-2.5">
                    <Store className="w-4 h-4 shrink-0 mt-0.5 text-[#0D5C5A]" />
                    <p className="leading-relaxed text-[11px]">
                      <strong>Multi-Store Order Fulfilment:</strong> If no single pharmacy store has all of your prescribed medicines in stock, our platform automatically splits the fulfilment across our nearest stores so you receive your full treatment course on time.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
