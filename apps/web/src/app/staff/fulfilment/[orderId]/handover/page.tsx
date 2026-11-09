'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { StaffShell } from '@/components/staff/StaffShell';
import { BackButton } from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, CheckCircle2, DollarSign, FileText, ArrowRight, User } from 'lucide-react';

export default function StaffHandoverPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orderDetail, setOrderDetail] = React.useState<any>(null);

  // Handover form state
  const [handoverType, setHandoverType] = React.useState<'DELIVERY_PARTNER' | 'CUSTOMER_PICKUP'>(
    'DELIVERY_PARTNER',
  );
  const [recipientName, setRecipientName] = React.useState('');
  const [recipientPhone, setRecipientPhone] = React.useState('');
  const [deliveryPartnerName, setDeliveryPartnerName] = React.useState('Shadowfax');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [handoverBusy, setHandoverBusy] = React.useState(false);

  // COD collection state
  const [codAmount, setCodAmount] = React.useState<number>(0);
  const [codRef, setCodRef] = React.useState('');
  const [codBusy, setCodBusy] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(`/pharmacist/fulfilment/${orderId}`);
      setOrderDetail(res);
      setRecipientName(res.customer?.name || '');
      setRecipientPhone(res.customer?.phone || '');
      setCodAmount(res.totalAmount || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load order details for handover.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRecordHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      alert('Recipient or rider name is required.');
      return;
    }

    setHandoverBusy(true);
    try {
      await apiFetch(`/pharmacist/fulfilment/${orderId}/handover`, {
        method: 'POST',
        body: JSON.stringify({
          handoverType,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim() || undefined,
          deliveryPartnerName:
            handoverType === 'DELIVERY_PARTNER' ? deliveryPartnerName.trim() : undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      await fetchDetail();
    } catch (err: any) {
      alert(err?.message || 'Failed to record handover.');
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleRecordCod = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodBusy(true);
    try {
      await apiFetch(`/pharmacist/fulfilment/${orderId}/cod-collection`, {
        method: 'POST',
        body: JSON.stringify({
          amount: codAmount,
          paymentReference: codRef.trim() || undefined,
        }),
      });
      await fetchDetail();
    } catch (err: any) {
      alert(err?.message || 'Failed to record COD collection.');
    } finally {
      setCodBusy(false);
    }
  };

  const isHandedOver = orderDetail?.status === 'HANDED_OVER';
  const isCod = orderDetail?.paymentMethod === 'COD';

  return (
    <StaffShell pageContext="Delivery Handover">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBECEF]">
          <div>
            <div className="flex flex-col items-start gap-2">
              <BackButton href={`/staff/fulfilment/${orderId}`} label="Order Details" />
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Handover to Delivery: {orderDetail?.orderNumber || ''}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Step 4 of 4
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {orderDetail?.hasInvoice && (
              <Link
                href={`/staff/fulfilment/${orderId}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#EBECEF] text-[#0D5C5A] hover:bg-[#F0FDFA] inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Invoice: {orderDetail.invoiceNumber}</span>
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading handover workspace...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
            {error}
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Handed Over Success Banner */}
            {isHandedOver && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Order Successfully Handed Over &amp; Dispatched!</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Physical stock has been atomically decremented, stock reservations marked consumed,
                  and statutory H1 register entry completed.
                </p>
                <div className="pt-2 border-t border-emerald-200 flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => router.push('/staff/fulfilment')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                  >
                    Return to Store Queue &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* Handover Details Form Card */}
            {!isHandedOver && (
              <div className="bg-white rounded-2xl border border-[#EBECEF] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Record Courier Partner / Rider Handover
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Verify rider identity and dispatch order from store.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRecordHandover} className="space-y-4">
                  {/* Handover Type Tabs */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      Handover Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setHandoverType('DELIVERY_PARTNER');
                          setRecipientName('');
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          handoverType === 'DELIVERY_PARTNER'
                            ? 'bg-[#0D5C5A] text-white border-[#0D5C5A] shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Delivery Partner / Courier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHandoverType('CUSTOMER_PICKUP');
                          setRecipientName(orderDetail?.customer?.name || '');
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          handoverType === 'CUSTOMER_PICKUP'
                            ? 'bg-[#0D5C5A] text-white border-[#0D5C5A] shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Counter / Customer Pickup
                      </button>
                    </div>
                  </div>

                  {/* Courier Partner Selection */}
                  {handoverType === 'DELIVERY_PARTNER' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                        Delivery Partner Name
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        {['Shadowfax', 'Dunzo', 'Porter', 'Internal Store Rider'].map((p) => (
                          <button
                            type="button"
                            key={p}
                            onClick={() => setDeliveryPartnerName(p)}
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all ${
                              deliveryPartnerName === p
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <Input
                        type="text"
                        value={deliveryPartnerName}
                        onChange={(e) => setDeliveryPartnerName(e.target.value)}
                        placeholder="e.g. Shadowfax, Dunzo, Bluedart"
                        className="h-9 text-xs"
                      />
                    </div>
                  )}

                  {/* Rider Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {handoverType === 'DELIVERY_PARTNER' ? 'Rider Full Name *' : 'Recipient Name *'}
                      </label>
                      <Input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g. Raju Rider / Debasish Ghosh"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Contact Phone # (Optional)
                      </label>
                      <Input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Reference / AWB */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      AWB / Courier Tracking # (Optional)
                    </label>
                    <Input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. AWB-SFX-101010, OTP-4455"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Handover Notes (Optional)
                    </label>
                    <Input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Inspected package seal, cold chain gel packs verified"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={handoverBusy || !recipientName.trim()}
                      className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <span>
                        {handoverBusy ? 'Dispensing Stock...' : 'Confirm Handover & Dispense Stock'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* COD Payment Collection Form if COD */}
            {isCod && (
              <div className="bg-white rounded-2xl border border-[#EBECEF] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Cash on Delivery (COD) Payment Collection
                    </h2>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      orderDetail?.paymentStatus === 'SUCCESS'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {orderDetail?.paymentStatus === 'SUCCESS' ? 'COLLECTED' : 'PENDING COLLECTION'}
                  </span>
                </div>

                {orderDetail?.paymentStatus === 'SUCCESS' ? (
                  <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800">
                    Payment of <strong>₹{orderDetail.totalAmount.toFixed(2)}</strong> has been collected and recorded.
                  </div>
                ) : (
                  <form onSubmit={handleRecordCod} className="space-y-4">
                    <p className="text-slate-600 text-xs">
                      Under company store policy, the exact order amount due (
                      <strong>₹{orderDetail?.totalAmount.toFixed(2)}</strong>) must be recorded upon physical dispatch.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Amount to Collect (₹) *
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          required
                          value={codAmount}
                          onChange={(e) => setCodAmount(parseFloat(e.target.value))}
                          className="h-9 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Receipt / Reference # (Optional)
                        </label>
                        <Input
                          type="text"
                          value={codRef}
                          onChange={(e) => setCodRef(e.target.value)}
                          placeholder="e.g. CASH-REC-001"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={codBusy}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                      >
                        {codBusy ? 'Recording...' : 'Record COD Payment Collection'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </StaffShell>
  );
}
