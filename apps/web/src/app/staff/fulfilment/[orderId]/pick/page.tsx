'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { StaffShell } from '@/components/staff/StaffShell';
import { BackButton } from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Boxes, Check, ArrowRight, X } from 'lucide-react';

export default function StaffPickingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checklist, setChecklist] = React.useState<any>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Exception modal state
  const [exceptionItem, setExceptionItem] = React.useState<any | null>(null);
  const [exceptionReason, setExceptionReason] = React.useState('');

  const fetchChecklist = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Auto-start picking if not started
      await apiFetch(`/pharmacist/fulfilment/${orderId}/picking/start`, { method: 'POST' }).catch(
        () => null,
      );
      const res = await apiFetch<any>(`/pharmacist/fulfilment/${orderId}/picking`);
      setChecklist(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load picking checklist.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const handleConfirmPick = async (orderItemId: string, quantityRequired: number) => {
    setActionLoading(`pick-${orderItemId}`);
    try {
      await apiFetch(`/pharmacist/fulfilment/${orderId}/picking/items/${orderItemId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ quantityPicked: quantityRequired }),
      });
      await fetchChecklist();
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm pick.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAll = async () => {
    setActionLoading('pick-all');
    try {
      await apiFetch(`/pharmacist/fulfilment/${orderId}/picking/confirm-all`, {
        method: 'POST',
      });
      await fetchChecklist();
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm all items.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportException = async () => {
    if (!exceptionItem || !exceptionReason.trim()) return;
    setActionLoading(`exception-${exceptionItem.orderItemId}`);
    try {
      await apiFetch(
        `/pharmacist/fulfilment/${orderId}/picking/items/${exceptionItem.orderItemId}/exception`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: exceptionReason.trim() }),
        },
      );
      setExceptionItem(null);
      setExceptionReason('');
      await fetchChecklist();
    } catch (err: any) {
      alert(err?.message || 'Failed to report exception.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <StaffShell pageContext="Picking Checklist">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBECEF]">
          <div>
            <div className="flex flex-col items-start gap-2">
              <BackButton href={`/staff/fulfilment/${orderId}`} label="Order Details" />
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Picking Checklist: {checklist?.orderNumber || ''}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                  Step 1 of 4
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!checklist?.allPicked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleConfirmAll}
                disabled={actionLoading !== null}
                className="text-xs font-semibold border-teal-300 text-teal-800 bg-teal-50 hover:bg-teal-100"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm All Picked</span>
              </Button>
            )}

            {checklist?.allPicked && !checklist?.hasException && (
              <Button
                type="button"
                onClick={() => router.push(`/staff/fulfilment/${orderId}/pack`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <span>Proceed to Packing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading picking checklist...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {checklist?.hasException && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Picking Exception Reported</strong>
                  Fulfilment is halted for this item because it was flagged as damaged, missing, or unsuitable. Contact store inventory manager.
                </div>
              </div>
            )}

            {/* Checklist Box */}
            <div className="bg-white rounded-2xl border border-[#EBECEF] shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800">Medicines on Shelves</span>
                  <p className="text-[11px] text-slate-500">
                    Locate each item in physical pharmacy racks and confirm quantity.
                  </p>
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {checklist?.items?.filter((i: any) => i.picking?.status === 'PICKED').length} /{' '}
                    {checklist?.items?.length} Picked
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {checklist?.items?.map((item: any) => {
                  const isPicked = item.picking?.status === 'PICKED';
                  const isException = item.picking?.status === 'EXCEPTION';

                  return (
                    <div
                      key={item.orderItemId}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {item.medicineName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                            {item.schedule || 'OTC'}
                          </span>
                          {isPicked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>
                                Picked ({item.picking.quantityPicked}/{item.quantityRequired})
                              </span>
                            </span>
                          )}
                          {isException && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Exception Flagged
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono">
                          SKU: {item.sku} &bull; {item.strength} &bull; {item.dosageForm}
                        </div>

                        {isException && item.picking?.exceptionReason && (
                          <p className="text-[11px] text-rose-600 italic">
                            Reason: &quot;{item.picking.exceptionReason}&quot;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="font-mono font-extrabold text-sm text-slate-900 mr-2">
                          Qty: {item.quantityRequired}
                        </span>
                        {!isPicked && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                handleConfirmPick(item.orderItemId, item.quantityRequired)
                              }
                              disabled={actionLoading === `pick-${item.orderItemId}`}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8"
                            >
                              Confirm Pick
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExceptionItem(item);
                                setExceptionReason('');
                              }}
                              className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold h-8"
                            >
                              Report Issue
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Exception Modal */}
        {exceptionItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Report Picking Exception</h3>
                <button
                  type="button"
                  onClick={() => setExceptionItem(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-600">
                Describe the issue encountered for <strong>{exceptionItem.medicineName}</strong> (e.g. damaged box, batch expired, out of physical shelf stock).
              </p>

              <textarea
                rows={3}
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="Provide reason for halting fulfilment of this item..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExceptionItem(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleReportException}
                  disabled={!exceptionReason.trim() || actionLoading !== null}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Report Exception
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffShell>
  );
}
