'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { StaffShell } from '@/components/staff/StaffShell';
import { BackButton } from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Archive, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function StaffStagingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orderDetail, setOrderDetail] = React.useState<any>(null);

  const [storageBin, setStorageBin] = React.useState('Shelf A-01');
  const [stagingNotes, setStagingNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(`/pharmacist/fulfilment/${orderId}`);
      setOrderDetail(res);
      if (res.stagingLocation) {
        setStorageBin(res.stagingLocation);
      }
      if (res.stagingNotes) {
        setStagingNotes(res.stagingNotes);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load order details for staging.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRecordStaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storageBin.trim()) {
      alert('Please enter or select a staging shelf/bin identifier.');
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/pharmacist/fulfilment/${orderId}/store-staging`, {
        method: 'POST',
        body: JSON.stringify({
          storageBin: storageBin.trim(),
          stagingNotes: stagingNotes.trim() || undefined,
        }),
      });
      setSuccess(true);
      await fetchDetail();
    } catch (err: any) {
      alert(err?.message || 'Failed to record store staging.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StaffShell pageContext="Store Holding & Staging">
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBECEF]">
          <div>
            <div className="flex flex-col items-start gap-2">
              <BackButton href={`/staff/fulfilment/${orderId}`} label="Order Details" />
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Store Dispatch Shelf / Bin: {orderDetail?.orderNumber || ''}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  Step 3 of 4
                </span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading staging workspace...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
            {error}
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Success Notice */}
            {success && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    Order successfully staged in <strong>{storageBin}</strong>! Status updated to Ready for Handover.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => router.push(`/staff/fulfilment/${orderId}/handover`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <span>Proceed to Handover</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Store Staging Form Card */}
            <div className="bg-white rounded-2xl border border-[#EBECEF] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Assign to Dispatch Holding Shelf
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Keep packed and sealed packages safely staged while awaiting delivery rider pickup.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRecordStaging} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Select Quick Store Bin / Shelf Preset:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {['Shelf A-01', 'Shelf A-02', 'Shelf B-01', 'Cold Rack C-01'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setStorageBin(preset)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          storageBin === preset
                            ? 'bg-[#0D5C5A] text-white border-[#0D5C5A] shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Or Enter Custom Bin / Location *
                  </label>
                  <Input
                    type="text"
                    required
                    value={storageBin}
                    onChange={(e) => setStorageBin(e.target.value)}
                    placeholder="e.g. Shelf A-04, Bin 12, Counter Drawer 3"
                    className="h-10 text-xs font-semibold"
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
                    placeholder="e.g. Refrigerated bag, tagged with customer phone"
                    className="h-10 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/staff/fulfilment/${orderId}`)}
                    className="text-xs"
                  >
                    Back to Order
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !storageBin.trim()}
                    className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs font-semibold gap-1.5 shadow-xs"
                  >
                    <span>{busy ? 'Saving...' : 'Mark Stored in Shelf & Ready'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
