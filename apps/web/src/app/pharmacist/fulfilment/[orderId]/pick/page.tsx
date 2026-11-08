'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { BackButton } from '@/components/shared/BackButton';

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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EBECEF]">
        <div>
          <div className="flex items-center gap-3">
            <BackButton href="/pharmacist/fulfilment" label="Fulfilment Queue" />
            <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">
              Picking Checklist: Order {checklist?.orderNumber || ''}
            </h1>
          </div>
          <p className="text-xs text-[#78879A] mt-1">
            Carefully verify each physical medicine, dosage, batch, and quantity against approved
            prescription specifications.
          </p>
        </div>

        {checklist?.allPicked && !checklist?.hasException && (
          <button
            onClick={() => router.push(`/pharmacist/fulfilment/${orderId}/pack`)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs self-start sm:self-auto"
          >
            Proceed to Packing &rarr;
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">Loading picking checklist...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <span className="font-bold text-xs uppercase block mb-1">Notice</span>
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {checklist?.hasException && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <span className="font-bold text-[10px] uppercase px-1 py-0.5 rounded bg-rose-200 text-rose-900">
                EXCEPTION
              </span>
              <div>
                <strong className="block font-bold">Picking Exception Reported</strong>
                Fulfilment is halted because an item was flagged as damaged, missing, or unsuitable.
                Contact the compliance admin or re-route.
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#EBECEF] shadow-xs overflow-hidden">
            <div className="p-4 bg-[#F8F9FB] border-b border-[#EBECEF] flex items-center justify-between text-xs">
              <span className="font-bold text-[#0F172A]">
                Approved Prescription Medicines ({checklist?.items?.length || 0})
              </span>
              <span className="text-[11px] text-[#78879A]">
                Status:{' '}
                <strong className="text-[#0D5C5A]">
                  {checklist?.allPicked ? 'ALL ITEMS PICKED' : 'PICKING IN PROGRESS'}
                </strong>
              </span>
            </div>

            <div className="divide-y divide-[#EBECEF]">
              {checklist?.items?.map((item: any) => {
                const isPicked = item.picking?.status === 'PICKED';
                const isException = item.picking?.status === 'EXCEPTION';

                return (
                  <div
                    key={item.orderItemId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#14161A]">
                          {item.medicineName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.schedule}
                        </span>
                        {isPicked && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Picked ({item.picking.quantityPicked}/{item.quantityRequired})
                          </span>
                        )}
                        {isException && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
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
                      <span className="font-extrabold text-sm text-[#0F172A] mr-2">
                        Qty: {item.quantityRequired}
                      </span>
                      {!isPicked && (
                        <>
                          <button
                            onClick={() =>
                              handleConfirmPick(item.orderItemId, item.quantityRequired)
                            }
                            disabled={actionLoading === `pick-${item.orderItemId}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Confirm Pick
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
          <div className="bg-white rounded-xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-[#14161A]">Report Picking Exception</h3>
            <p className="text-[#78879A]">
              Describe the issue encountered for <strong>{exceptionItem.medicineName}</strong> (e.g.
              damaged packaging, batch expired, out of physical stock).
            </p>
            <textarea
              rows={3}
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder="Provide reason for halting fulfilment of this item..."
              className="w-full p-2.5 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setExceptionItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#78879A] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportException}
                disabled={!exceptionReason.trim() || actionLoading !== null}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Report Exception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
