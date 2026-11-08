'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { BackButton } from '@/components/shared/BackButton';

export default function PackingWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orderDetail, setOrderDetail] = React.useState<any>(null);
  const [checklistConfirmed, setChecklistConfirmed] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [packingBusy, setPackingBusy] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(`/pharmacist/fulfilment/${orderId}`);
      setOrderDetail(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load order details for packing.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCompletePacking = async () => {
    if (!checklistConfirmed) {
      alert('Please verify all packing checklist items before completing packing.');
      return;
    }

    setPackingBusy(true);
    try {
      await apiFetch<any>(`/pharmacist/fulfilment/${orderId}/packing/complete`, {
        method: 'POST',
        body: JSON.stringify({ checklistConfirmed: true, notes: notes || undefined }),
      });
      router.push(`/pharmacist/fulfilment/${orderId}/handover`);
    } catch (err: any) {
      alert(err?.message || 'Failed to complete packing.');
    } finally {
      setPackingBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EBECEF]">
        <div>
          <div className="flex flex-col items-start gap-3">
            <BackButton href={`/pharmacist/fulfilment/${orderId}/pick`} label="Picking Checklist" />
            <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">
              Packing &amp; Verification: {orderDetail?.orderNumber || ''}
            </h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">Loading order details...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <div className="font-bold mb-1">[!] Error</div>
          {error}
        </div>
      ) : (
        <div className="space-y-6 text-xs">
          {/* Order Summary Card */}
          <div className="bg-white rounded-2xl border border-[#EBECEF] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBECEF] pb-3">
              <div>
                <span className="font-bold text-sm text-[#14161A]">Customer &amp; Delivery</span>
                <p className="text-[#78879A] text-[11px]">
                  {orderDetail?.customer?.name} &bull; +91 {orderDetail?.customer?.phone}
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm text-[#0D5C5A]">
                  ₹{orderDetail?.totalAmount.toFixed(2)}
                </span>
                <span className="block text-[10px] text-[#78879A] uppercase font-semibold">
                  Payment: {orderDetail?.paymentMethod} ({orderDetail?.paymentStatus})
                </span>
              </div>
            </div>

            {/* Medicines List */}
            <div className="space-y-2">
              <span className="font-bold text-[#0F172A] block">Picked Medicines to Pack:</span>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {orderDetail?.items?.map((item: any) => (
                  <div
                    key={item.orderItemId}
                    className="p-3 flex items-center justify-between bg-[#F8F9FB]/50"
                  >
                    <div>
                      <span className="font-bold text-[#14161A] block">{item.medicineName}</span>
                      <span className="text-[10px] text-[#78879A] font-mono">
                        {item.sku} &bull; {item.strength}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#14161A]">Qty: {item.quantity}</span>
                      <span className="block text-[10px] text-emerald-600 font-semibold">
                        ✓ Picked
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="bg-[#F0FDFA] rounded-2xl border border-[#EBECEF] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A]">
              Pharmacist Pre-Packing Verification Checklist
            </h3>
            <ul className="space-y-2.5 text-xs text-[#0F172A]">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                <span>
                  All picked medicine brands, active ingredients, and strengths match approved
                  prescription.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                <span>
                  Expiries verified: all units have valid shelf-life (&gt; 6 months). Packaging
                  seals intact.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                <span>
                  Schedule H / H1 statutory compliance requirements satisfied and recorded.
                </span>
              </li>
            </ul>

            <div className="pt-2 border-t border-[#EBECEF]">
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-[#14161A]">
                <input
                  type="checkbox"
                  checked={checklistConfirmed}
                  onChange={(e) => setChecklistConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0D5C5A] focus:ring-[#0D5C5A]"
                />
                <span>
                  I confirm that all medicines have been verified, sealed, and packed according to
                  Good Pharmacy Practice standards.
                </span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#78879A] mb-1">
                Packing Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tamper-evident seal #7788 applied, bubble-wrapped fragile bottle..."
                className="w-full p-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => router.push(`/pharmacist/fulfilment/${orderId}/pick`)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Back to Picking
            </button>
            <button
              onClick={handleCompletePacking}
              disabled={packingBusy || !checklistConfirmed}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#0A4846] disabled:opacity-50 shadow-xs inline-flex items-center gap-1.5"
            >
              <span>
                {packingBusy ? 'Generating Invoice...' : 'Complete Packing & Issue Invoice'} &rarr;
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
