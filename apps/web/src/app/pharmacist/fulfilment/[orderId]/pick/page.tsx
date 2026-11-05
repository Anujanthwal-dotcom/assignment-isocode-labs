'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Package,
} from 'lucide-react';

export default function PickingWorkspacePage() {
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
      await apiFetch(
        `/pharmacist/fulfilment/${orderId}/picking/items/${orderItemId}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({ quantityPicked: quantityRequired }),
        },
      );
      await fetchChecklist();
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm item picked.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportException = async () => {
    if (!exceptionItem || !exceptionReason.trim()) return;
    setActionLoading(`exc-${exceptionItem.orderItemId}`);
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
      alert(err?.message || 'Failed to report item exception.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAE8F0]">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/pharmacist/fulfilment"
              className="p-1 rounded-lg text-[#78879A] hover:bg-[#F8F9FB] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-[#14161A] tracking-tight flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[#6240E8]" />
              Picking Checklist: Order {checklist?.orderNumber || ''}
            </h1>
          </div>
          <p className="text-xs text-[#78879A] mt-1">
            Carefully verify each physical medicine, dosage, batch, and quantity against approved prescription specifications.
          </p>
        </div>

        {checklist?.allPicked && !checklist?.hasException && (
          <button
            onClick={() => router.push(`/pharmacist/fulfilment/${orderId}/pack`)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Proceed to Packing</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">
          Loading picking checklist...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {checklist?.hasException && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Picking Exception Reported</strong>
                Fulfilment is halted because an item was flagged as damaged, missing, or unsuitable. Contact the compliance admin or re-route.
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#EAE8F0] shadow-xs overflow-hidden">
            <div className="p-4 bg-[#F8F9FB] border-b border-[#EAE8F0] flex items-center justify-between text-xs">
              <span className="font-bold text-[#351F65]">
                Approved Prescription Medicines ({checklist?.items?.length || 0})
              </span>
              <span className="text-[11px] text-[#78879A]">
                Status:{' '}
                <strong className="text-[#6240E8]">
                  {checklist?.allPicked ? 'ALL ITEMS PICKED' : 'PICKING IN PROGRESS'}
                </strong>
              </span>
            </div>

            <div className="divide-y divide-[#EAE8F0]">
              {checklist?.items?.map((item: any) => {
                const isPicked = item.picking?.status === 'PICKED';
                const isException = item.picking?.status === 'EXCEPTION';

                return (
                  <div key={item.orderItemId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#14161A]">{item.medicineName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.schedule}
                        </span>
                        {isPicked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Picked ({item.picking.quantityPicked}/{item.quantityRequired})
                          </span>
                        )}
                        {isException && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            Exception
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#78879A] font-mono">
                        SKU: {item.sku} &bull; {item.strength} &bull; {item.dosageForm}
                      </div>
                      {isException && item.picking?.exceptionReason && (
                        <p className="text-[11px] text-rose-600 italic">
                          Reason: &quot;{item.picking.exceptionReason}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="font-extrabold text-sm text-[#351F65] mr-2">
                        Qty: {item.quantityRequired}
                      </span>
                      {!isPicked && (
                        <>
                          <button
                            onClick={() => handleConfirmPick(item.orderItemId, item.quantityRequired)}
                            disabled={actionLoading === `pick-${item.orderItemId}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Pick</span>
                          </button>
                          <button
                            onClick={() => {
                              setExceptionItem(item);
                              setExceptionReason('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50"
                          >
                            Report Issue
                          </button>
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
          <div className="bg-white rounded-xl border border-[#EAE8F0] max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-[#14161A] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Report Picking Exception
            </h3>
            <p className="text-[#78879A]">
              Report an issue with <strong>{exceptionItem.medicineName}</strong> (e.g. damaged blister, broken seal, expired batch, or physical stock shortage).
            </p>
            <textarea
              rows={3}
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full p-2.5 rounded-lg border border-[#EAE8F0] text-xs focus:ring-2 focus:ring-[#6240E8]/20 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE8F0]">
              <button
                type="button"
                onClick={() => setExceptionItem(null)}
                className="px-3 py-1.5 text-[#6C757D] hover:bg-slate-50 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportException}
                disabled={actionLoading === `exc-${exceptionItem.orderItemId}` || !exceptionReason.trim()}
                className="px-4 py-1.5 rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Log Exception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
