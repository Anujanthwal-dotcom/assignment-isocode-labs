'use client';

/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch, ApiError } from '@/lib/api/client';
import Link from 'next/link';
import {
  PrescriptionDTO,
  PrescriptionAIExtractionDTO,
  CustomerAddressDTO,
} from '@pharmacy/shared-types';
import { MissingPrescriptionIllustration } from '@/components/customer/MissingPrescriptionIllustration';
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  MapPin,
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
  items: PrescriptionQuoteItem[];
}

export default function PrescriptionDetailPage() {
  const params = useParams();
  const prescriptionId = params.id as string;
  const router = useRouter();

  const [prescription, setPrescription] = React.useState<PrescriptionDTO | null>(null);
  const [viewUrl, setViewUrl] = React.useState<string | null>(null);
  const [previewImageError, setPreviewImageError] = React.useState(false);
  const [extraction, setExtraction] = React.useState<PrescriptionAIExtractionDTO | null>(null);

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
  const [requesting, setRequesting] = React.useState(false);
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

  // Load latest AI extraction
  const loadLatestExtraction = React.useCallback(async () => {
    try {
      const res = await apiFetch<PrescriptionAIExtractionDTO>(
        `/prescriptions/${prescriptionId}/extractions/latest`,
      );
      setExtraction(res);
    } catch (err: unknown) {
      if ((err as ApiError).status === 404) {
        setExtraction(null);
      }
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
      await Promise.all([loadPrescription(), loadLatestExtraction(), loadQuote(), loadAddresses()]);
      setLoading(false);
    };
    init();
  }, [loadPrescription, loadLatestExtraction, loadQuote, loadAddresses]);

  // Polling for extraction completion if in QUEUED or PROCESSING
  React.useEffect(() => {
    if (!extraction) return;
    if (extraction.status !== 'QUEUED' && extraction.status !== 'PROCESSING') return;

    const interval = setInterval(async () => {
      await loadLatestExtraction();
    }, 2500);

    return () => clearInterval(interval);
  }, [extraction, loadLatestExtraction]);

  // Trigger manual extraction
  const handleStartExtraction = async () => {
    setRequesting(true);
    setError(null);
    try {
      const res = await apiFetch<PrescriptionAIExtractionDTO>(
        `/prescriptions/${prescriptionId}/extractions`,
        {
          method: 'POST',
        },
      );
      setExtraction(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to start AI extraction.');
    } finally {
      setRequesting(false);
    }
  };

  // Retry extraction
  const handleRetryExtraction = async () => {
    if (!extraction) return;
    setRequesting(true);
    setError(null);
    try {
      const res = await apiFetch<PrescriptionAIExtractionDTO>(
        `/prescriptions/${prescriptionId}/extractions/${extraction.id}/retry`,
        {
          method: 'POST',
        },
      );
      setExtraction(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to retry AI extraction.');
    } finally {
      setRequesting(false);
    }
  };

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
          <Link href="/customer/prescriptions" className="inline-block mt-4">
            <Button variant="outline" size="sm">
              &larr; Back to Prescriptions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const availableQuoteItems = quote?.items.filter((i) => i.isAvailable) || [];
  const unavailableQuoteItems = quote?.items.filter((i) => !i.isAvailable) || [];

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EBECEF]">
        <Link
          href="/customer/prescriptions"
          className="inline-flex items-center text-sm font-semibold text-[#0D5C5A] hover:underline"
        >
          &larr; Back to Prescriptions
        </Link>
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
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Prescription Verified — Quotation Ready
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    A registered pharmacist has verified your prescription, matched medications to our catalogue, and prepared this cost quotation.
                  </p>
                </div>
                <Badge className="bg-[#CCFBF1] text-[#0D5C5A] border-[#99F6E4] font-semibold text-xs">
                  Quote Ready
                </Badge>
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
                    Prescription Quotation Accepted &amp; Order Placed!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {createdOrder
                      ? `Your order #${createdOrder.orderNumber} has been successfully created.`
                      : 'Your prescription has been verified and your order is now in fulfilment.'}
                  </p>
                </div>
              </div>

              {(quote.orderId || createdOrder?.id) && (
                <div className="pt-2">
                  <Link href={`/customer/orders/${quote.orderId || createdOrder?.id}`}>
                    <Button className="bg-[#0D5C5A] hover:bg-[#093e3d] text-white text-xs h-9">
                      View Order Details &amp; Tracking &rarr;
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          )}

          {/* STAGE C: AI EXTRACTION READINGS (If no quote yet, or as reference below quote) */}
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {error}
              </div>
            )}
            {/* Legal Notice */}
            <div className="p-3.5 bg-[#F0FDFA] border border-[#EBECEF] rounded-xl text-[#0F172A] text-xs flex items-start gap-3">
              <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-[#99F6E4] text-[#0F172A]">
                LEGAL NOTICE
              </span>
              <div>
                <p className="font-bold text-[#0F172A]">Prescription Verification Process</p>
                <p className="text-[#0D5C5A] mt-0.5 leading-relaxed">
                  Every uploaded prescription is reviewed by a registered pharmacist. Our AI assistant reads the doctor handwriting,
                  compares it with catalogue inventory, and provides an itemized cost quotation for your approval.
                </p>
              </div>
            </div>

            {/* AI Extraction Status Card (if no quote yet) */}
            {!quote && (
              <>
                {!extraction && (
                  <Card className="p-8 text-center space-y-4 border-slate-200 bg-white">
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-base font-bold text-slate-800">
                        Prescription Under Review
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Your prescription is queued for pharmacist verification. You can also run our AI reading assistant to immediately view detected medicines.
                      </p>
                    </div>
                    <Button
                      onClick={handleStartExtraction}
                      disabled={requesting}
                      className="bg-[#0D5C5A] hover:bg-[#093e3d] text-white text-xs h-9 px-5 shadow-xs"
                    >
                      {requesting ? 'Reading...' : 'Run AI Reading Assistant'}
                    </Button>
                  </Card>
                )}

                {extraction && (extraction.status === 'QUEUED' || extraction.status === 'PROCESSING') && (
                  <Card className="p-8 text-center space-y-4 border-slate-200 bg-white">
                    <div className="max-w-md mx-auto space-y-1.5">
                      <h3 className="text-base font-bold text-slate-800">Reading your prescription...</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Our AI assistant is analyzing handwriting and comparing medications against our inventory catalogue.
                      </p>
                      <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden mt-3">
                        <div className="h-full bg-[#0D5C5A] rounded-full animate-pulse w-3/4"></div>
                      </div>
                    </div>
                  </Card>
                )}

                {extraction && extraction.status === 'FAILED' && (
                  <Card className="p-6 border-red-200 bg-red-50/40 text-center space-y-3">
                    <p className="text-xs text-red-700">{extraction.errorMessage || 'Reading failed.'}</p>
                    <Button size="sm" onClick={handleRetryExtraction} disabled={requesting} className="text-xs">
                      {requesting ? 'Retrying...' : 'Retry AI Reading'}
                    </Button>
                  </Card>
                )}

                {/* AI Extracted Draft Results */}
                {extraction && extraction.status === 'COMPLETED' && (
                  <div className="space-y-4">
                    <Card className="p-4 border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-bold text-xs text-slate-800">
                          AI Detected Medications ({extraction.extractionResult?.items.length || 0})
                        </span>
                        <Badge className="bg-[#CCFBF1] text-[#0D5C5A] border-none text-[10px]">
                          {Math.round((extraction.overallConfidence || 0) * 100)}% Match Confidence
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {extraction.extractionResult?.items.map((item, idx) => {
                          const match = extraction.matchingResult?.find((m: any) => m.extractedItemIndex === idx);
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs space-y-1"
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-800 text-sm">
                                  {item.rawMedicineName || item.normalizedMedicineName}
                                </span>
                                <Badge variant="neutral" className="text-[10px]">
                                  {item.strength || 'Standard'}
                                </Badge>
                              </div>
                              <p className="text-slate-500 text-[11px]">
                                {item.dosageInstructions || item.frequency || 'As prescribed'}
                              </p>
                              {match?.comparisonNotes && (
                                <p className="text-[#0D5C5A] text-[11px] font-medium pt-1">
                                  &bull; {match.comparisonNotes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-[#F0FDFA] rounded-lg text-[11px] text-[#0D5C5A] text-center font-medium">
                        Our registered pharmacist is currently preparing the verified price quotation for dispensing.
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
