'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { BackButton } from '@/components/shared/BackButton';

export default function HandoverWorkspacePage() {
  const params = useParams();
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
      alert('Recipient name is required.');
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EBECEF]">
        <div>
          <div className="flex items-center gap-3">
            <BackButton href="/pharmacist/fulfilment" label="Fulfilment Queue" />
            <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">
              Order Handover: {orderDetail?.orderNumber || ''}
            </h1>
          </div>
          <p className="text-xs text-[#78879A] mt-1">
            Record physical parcel transfer to logistics delivery partner or direct customer counter
            pickup.
          </p>
        </div>

        {orderDetail?.hasInvoice && (
          <Link
            href={`/pharmacist/fulfilment/${orderId}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#EBECEF] text-[#0D5C5A] hover:bg-[#F0FDFA] inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Invoice: {orderDetail.invoiceNumber}</span>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">Loading handover workspace...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <div className="font-bold mb-1">[!] Error</div>
          {error}
        </div>
      ) : (
        <div className="space-y-6 text-xs">
          {/* Status Banner */}
          {isHandedOver ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>✓ Order Handed Over Successfully</span>
              </div>
              <p className="text-xs text-emerald-700">
                Physical stock has been decremented, reservations consumed, and Schedule H1
                statutory entries marked COMPLETED.
              </p>
              {orderDetail?.handoverDetails && (
                <div className="mt-2 p-3 bg-white/70 rounded-xl border border-emerald-200 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[#78879A] block">Type</span>
                    <strong className="text-[#14161A]">
                      {orderDetail.handoverDetails.handoverType}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#78879A] block">Recipient</span>
                    <strong className="text-[#14161A]">
                      {orderDetail.handoverDetails.recipientName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#78879A] block">Courier / Ref</span>
                    <strong className="text-[#14161A]">
                      {orderDetail.handoverDetails.deliveryPartnerName || 'Counter'} &bull;{' '}
                      {orderDetail.handoverDetails.referenceNumber || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#78879A] block">Handed Over At</span>
                    <strong className="text-[#14161A]">
                      {new Date(orderDetail.handoverDetails.handedOverAt).toLocaleTimeString()}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#EBECEF] p-6 shadow-xs space-y-5">
              <h2 className="text-sm font-bold text-[#14161A] border-b border-[#EBECEF] pb-3">
                Record Handover Event
              </h2>

              <form onSubmit={handleRecordHandover} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                      Handover Mode
                    </label>
                    <select
                      value={handoverType}
                      onChange={(e) => setHandoverType(e.target.value as any)}
                      className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
                    >
                      <option value="DELIVERY_PARTNER">Delivery Partner (Courier Driver)</option>
                      <option value="CUSTOMER_PICKUP">Customer Pickup (Counter Collection)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                      Recipient / Agent Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Raju Kumar (Shadowfax)"
                      className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                      Recipient Phone (Optional)
                    </label>
                    <input
                      type="text"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
                    />
                  </div>

                  {handoverType === 'DELIVERY_PARTNER' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                          Delivery Partner Fleet Name
                        </label>
                        <input
                          type="text"
                          value={deliveryPartnerName}
                          onChange={(e) => setDeliveryPartnerName(e.target.value)}
                          placeholder="e.g. Shadowfax, Dunzo, Bluedart"
                          className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                          Airway Bill / Tracking Ref
                        </label>
                        <input
                          type="text"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="AWB-883749"
                          className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Handed over with cold chain gel pack..."
                    className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={handoverBusy}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#0A4846] disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                  >
                    <span>
                      {handoverBusy ? 'Dispensing Stock...' : 'Confirm Handover & Dispense Stock'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* COD Payment Collection (For COD Orders) */}
          {isCod && (
            <div className="bg-white rounded-2xl border border-[#EBECEF] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EBECEF] pb-3">
                <h2 className="text-sm font-bold text-[#14161A]">
                  Cash on Delivery (COD) Payment Collection
                </h2>
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
                  Payment of <strong>₹{orderDetail.totalAmount.toFixed(2)}</strong> has been
                  collected and recorded.
                </div>
              ) : (
                <form onSubmit={handleRecordCod} className="space-y-4">
                  <p className="text-[#78879A] text-xs">
                    Under operational safety policy, the exact order amount due (
                    <strong>₹{orderDetail?.totalAmount.toFixed(2)}</strong>) must be confirmed as
                    collected.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                        Amount to Collect (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={codAmount}
                        onChange={(e) => setCodAmount(parseFloat(e.target.value))}
                        className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A] font-bold text-[#14161A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                        Receipt / Reference # (Optional)
                      </label>
                      <input
                        type="text"
                        value={codRef}
                        onChange={(e) => setCodRef(e.target.value)}
                        placeholder="e.g. CASH-REC-001"
                        className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={codBusy}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                    >
                      {codBusy ? 'Recording...' : 'Record COD Payment Collection'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
