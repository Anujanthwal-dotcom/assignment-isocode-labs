'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { StaffShell } from '@/components/staff/StaffShell';
import { BackButton } from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Package, ShieldCheck, ArrowRight, Boxes } from 'lucide-react';

export default function StaffPackingPage() {
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
      alert('Please confirm the verification checklist before completing packing.');
      return;
    }

    setPackingBusy(true);
    try {
      await apiFetch<any>(`/pharmacist/fulfilment/${orderId}/packing/complete`, {
        method: 'POST',
        body: JSON.stringify({ checklistConfirmed: true, notes: notes || undefined }),
      });
      // Move to next stage: Store in holding shelf
      router.push(`/staff/fulfilment/${orderId}/store`);
    } catch (err: any) {
      alert(err?.message || 'Failed to complete packing.');
    } finally {
      setPackingBusy(false);
    }
  };

  return (
    <StaffShell pageContext="Packing & Verification">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBECEF]">
          <div>
            <div className="flex flex-col items-start gap-2">
              <BackButton href={`/staff/fulfilment/${orderId}/pick`} label="Picking Checklist" />
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Packing &amp; Invoice Verification: {orderDetail?.orderNumber || ''}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  Step 2 of 4
                </span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading order details...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
            {error}
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Picked Items Summary Card */}
            <div className="bg-white rounded-2xl border border-[#EBECEF] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="font-bold text-sm text-slate-900">
                    Customer: {orderDetail?.customer?.name}
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Delivery: {orderDetail?.deliveryAddress?.recipientName} &bull; +91{' '}
                    {orderDetail?.customer?.phone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    ₹{orderDetail?.totalAmount.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                    {orderDetail?.paymentMethod} ({orderDetail?.paymentStatus})
                  </span>
                </div>
              </div>

              {/* Medicines List */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block">Picked Medicines to Pack:</span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {orderDetail?.items?.map((item: any) => (
                    <div
                      key={item.orderItemId}
                      className="p-3 flex items-center justify-between bg-slate-50/50"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{item.medicineName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.sku} &bull; {item.strength}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">Qty: {item.quantity}</span>
                        <span className="block text-[10px] text-emerald-600 font-semibold">
                          ✓ Picked
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Verification Checklist Card */}
            <div className="bg-[#F0FDFA] rounded-2xl border border-[#99F6E4] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0D5C5A]" />
                <h3 className="text-sm font-bold text-[#0D5C5A]">
                  Store Staff Pre-Packing Statutory Checklist
                </h3>
              </div>

              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>
                    All picked medicine brands, active ingredients, and strengths match the order.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>
                    Expiries verified: all units have valid shelf-life (&gt; 6 months). Sealed in tamper-evident pouch.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>
                    Schedule H / H1 statutory compliance requirements verified.
                  </span>
                </li>
              </ul>

              <div className="pt-3 border-t border-[#99F6E4]/60">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={checklistConfirmed}
                    onChange={(e) => setChecklistConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0D5C5A] focus:ring-[#0D5C5A]"
                  />
                  <span>
                    I confirm that all medicines have been verified, sealed, and packed according to standard Good Pharmacy Practice.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Packing Notes (Optional)
                </label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Tamper-evident seal #8812 applied, cold chain ice pack enclosed"
                  className="bg-white h-9 text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/staff/fulfilment/${orderId}/pick`)}
                className="text-xs"
              >
                Back to Picking
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCompletePacking}
                disabled={packingBusy || !checklistConfirmed}
                className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <span>
                  {packingBusy ? 'Generating Invoice...' : 'Complete Packing & Generate Invoice'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </StaffShell>
  );
}
