'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { BackButton } from '@/components/shared/BackButton';

export default function PharmacistOrderReviewPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const [reviewData, setReviewData] = React.useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(100);

  // Modals state
  const [rejectItemModal, setRejectItemModal] = React.useState<{ itemId: string } | null>(null);
  const [rejectItemReason, setRejectItemReason] = React.useState('');

  const [h1Modal, setH1Modal] = React.useState<{ itemId: string } | null>(null);
  const [h1PatientName, setH1PatientName] = React.useState('');
  const [h1PrescriberName, setH1PrescriberName] = React.useState('');
  const [h1PrescriberDetails, setH1PrescriberDetails] = React.useState('');

  const [alternativeModal, setAlternativeModal] = React.useState<{ itemId: string } | null>(null);
  const [altProposedMedicineId, setAltProposedMedicineId] = React.useState('');
  const [altReason, setAltReason] = React.useState('');
  const [catalogueMedicines, setCatalogueMedicines] = React.useState<any[]>([]);

  const [rejectPrescriptionModal, setRejectPrescriptionModal] = React.useState(false);
  const [rejectPrescriptionReason, setRejectPrescriptionReason] = React.useState('');

  const [reuploadModal, setReuploadModal] = React.useState(false);
  const [reuploadReason, setReuploadReason] = React.useState('');

  // Corrections state
  const [fieldCorrections, setFieldCorrections] = React.useState<{
    [orderItemId: string]: {
      reviewedDosageInstructions?: string;
      reviewedDuration?: string;
    };
  }>({});

  const fetchReviewDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(`/pharmacist/orders/${orderId}/review-details`);
      setReviewData(res);
      if (res.order?.customerUser?.fullName) {
        setH1PatientName(res.order.customerUser.fullName);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load order review details.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const fetchCatalogue = React.useCallback(async () => {
    try {
      const res = await apiFetch<any>('/customer/medicines?limit=50&activeOnly=true');
      setCatalogueMedicines(res.data || []);
    } catch {
      // Non-critical background catalogue fetch
    }
  }, []);

  React.useEffect(() => {
    fetchReviewDetails();
    fetchCatalogue();
  }, [fetchReviewDetails, fetchCatalogue]);

  const handleFieldChange = (orderItemId: string, field: string, value: string) => {
    setFieldCorrections((prev) => ({
      ...prev,
      [orderItemId]: {
        ...prev[orderItemId],
        [field]: value,
      },
    }));
  };

  const handleSaveFields = async (orderItemId: string) => {
    const corrections = fieldCorrections[orderItemId];
    if (!corrections) return;

    try {
      setActionLoading(true);
      setError(null);
      await apiFetch(`/pharmacist/orders/${orderId}/items/${orderItemId}/update-draft`, {
        method: 'PATCH',
        body: JSON.stringify(corrections),
      });
      setSuccessMessage('Dosage & duration corrections saved.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchReviewDetails();
    } catch (err: any) {
      setError(err?.message || 'Failed to save item corrections.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveItem = async (orderItemId: string, schedule: string) => {
    if (schedule === 'SCHEDULE_H1') {
      setH1Modal({ itemId: orderItemId });
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const corrections = fieldCorrections[orderItemId] || {};
      await apiFetch(`/pharmacist/orders/${orderId}/items/${orderItemId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'APPROVED',
          dosageInstructions: corrections.reviewedDosageInstructions,
          duration: corrections.reviewedDuration,
        }),
      });
      await fetchReviewDetails();
      setSuccessMessage('Item approved.');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to approve item.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitH1Approval = async () => {
    if (!h1Modal) return;
    if (!h1PatientName.trim() || !h1PrescriberName.trim()) {
      setError('Patient and Prescriber name are required for Schedule H1 compliance.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const corrections = fieldCorrections[h1Modal.itemId] || {};
      await apiFetch(`/pharmacist/orders/${orderId}/items/${h1Modal.itemId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'APPROVED',
          dosageInstructions: corrections.reviewedDosageInstructions,
          duration: corrections.reviewedDuration,
          h1PatientName: h1PatientName.trim(),
          h1PrescriberName: h1PrescriberName.trim(),
          h1PrescriberDetails: h1PrescriberDetails.trim() || undefined,
        }),
      });
      setH1Modal(null);
      await fetchReviewDetails();
      setSuccessMessage('Schedule H1 item approved & entry recorded.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to approve Schedule H1 item.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectItem = async () => {
    if (!rejectItemModal) return;
    if (!rejectItemReason.trim()) {
      setError('Please provide a reason for rejecting this item.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await apiFetch(`/pharmacist/orders/${orderId}/items/${rejectItemModal.itemId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'REJECTED',
          reason: rejectItemReason.trim(),
        }),
      });
      setRejectItemModal(null);
      setRejectItemReason('');
      await fetchReviewDetails();
      setSuccessMessage('Item rejected.');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to reject item.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposeAlternative = async () => {
    if (!alternativeModal) return;
    if (!altProposedMedicineId || !altReason.trim()) {
      setError('Please select an alternative medicine and provide a pharmacist reason.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await apiFetch(`/pharmacist/orders/${orderId}/alternatives`, {
        method: 'POST',
        body: JSON.stringify({
          orderItemId: alternativeModal.itemId,
          proposedMedicineId: altProposedMedicineId,
          reason: altReason.trim(),
        }),
      });
      setAlternativeModal(null);
      setAltProposedMedicineId('');
      setAltReason('');
      await fetchReviewDetails();
      setSuccessMessage('Alternative proposed to customer.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to propose alternative.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePrescription = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await apiFetch(`/pharmacist/orders/${orderId}/review-decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'APPROVED',
        }),
      });
      router.push('/pharmacist/review-queue');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete prescription approval.');
      setActionLoading(false);
    }
  };

  const handleRejectPrescription = async () => {
    if (!rejectPrescriptionReason.trim()) {
      setError('Please provide a reason for rejecting the prescription.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await apiFetch(`/pharmacist/orders/${orderId}/review-decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'REJECTED',
          notes: rejectPrescriptionReason.trim(),
        }),
      });
      setRejectPrescriptionModal(false);
      router.push('/pharmacist/review-queue');
    } catch (err: any) {
      setError(err?.message || 'Failed to reject prescription.');
      setActionLoading(false);
    }
  };

  const handleRequestReupload = async () => {
    if (!reuploadReason.trim()) {
      setError('Please provide a reason explaining why a new prescription photo is needed.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await apiFetch(`/pharmacist/orders/${orderId}/review-decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'REUPLOAD_REQUESTED',
          notes: reuploadReason.trim(),
        }),
      });
      setReuploadModal(false);
      router.push('/pharmacist/review-queue');
    } catch (err: any) {
      setError(err?.message || 'Failed to request prescription re-upload.');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-12 flex flex-col items-center justify-center space-y-3">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#0D5C5A] border-t-transparent" />
        <p className="text-xs text-[#78879A]">Loading clinical verification workspace...</p>
      </div>
    );
  }

  if (error && !reviewData) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-white border border-[#EBECEF] p-6 rounded-xl max-w-md w-full text-center space-y-4 shadow-sm">
          <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
            RESTRICTED
          </span>
          <h2 className="text-base font-semibold text-[#14161A]">Access Restricted</h2>
          <p className="text-xs text-[#6C757D]">{error}</p>
          <div className="pt-2">
            <BackButton href="/pharmacist/review-queue" label="Return to Queue" />
          </div>
        </div>
      </div>
    );
  }

  const { order, prescription, aiExtraction, items } = reviewData;

  const canCompletePrescriptionApproval =
    items.length > 0 &&
    items.every(
      (it: any) =>
        it.review?.status === 'APPROVED' ||
        it.review?.status === 'REJECTED' ||
        it.review?.status === 'BLOCKED' ||
        it.orderItemStatus === 'REMOVED',
    );

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Sticky Bar */}
      <div className="sticky top-[64px] z-30 bg-white border-b border-[#EBECEF] px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-col items-start gap-3">
          <BackButton href="/pharmacist/review-queue" label="Review Queue" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#14161A]">Order {order.orderNumber}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]">
                {order.status}
              </span>
            </div>
            <span className="text-[11px] text-[#78879A]">
              Customer: {order.customerUser.fullName} &bull; Placed{' '}
              {new Date(order.placedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReuploadModal(true)}
            disabled={actionLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            Request Re-upload
          </button>
          <button
            onClick={() => setRejectPrescriptionModal(true)}
            disabled={actionLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            Reject Prescription
          </button>
          <button
            onClick={handleApprovePrescription}
            disabled={actionLoading || !canCompletePrescriptionApproval}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5 ${
              canCompletePrescriptionApproval
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
          >
            Approve Prescription
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <span className="font-bold uppercase text-[10px] px-1 py-0.5 bg-rose-200 rounded">
            Error
          </span>
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <span className="font-bold uppercase text-[10px] px-1 py-0.5 bg-emerald-200 rounded">
            Success
          </span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Side-by-side workspace: Desktop 2-column layout */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Original Prescription Viewer (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#EBECEF] shadow-2xs overflow-hidden flex flex-col sticky top-[130px] max-h-[calc(100vh-160px)]">
          <div className="p-3 bg-[#F8F9FB] border-b border-[#EBECEF] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F172A]">
              Original Prescription Document
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
                className="px-2 py-0.5 rounded bg-white border border-[#EBECEF] text-xs font-bold text-[#78879A] hover:bg-slate-50"
                title="Zoom Out"
              >
                -
              </button>
              <span className="text-[10px] text-[#78879A] px-1">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 20))}
                className="px-2 py-0.5 rounded bg-white border border-[#EBECEF] text-xs font-bold text-[#78879A] hover:bg-slate-50"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="px-2 py-0.5 rounded bg-white border border-[#EBECEF] text-[10px] font-semibold text-[#78879A] hover:bg-slate-50"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Document display area */}
          <div className="flex-1 overflow-auto p-4 bg-slate-900/5 min-h-[420px] flex items-center justify-center">
            {prescription.viewUrl ? (
              prescription.mimeType === 'application/pdf' ? (
                <iframe
                  src={prescription.viewUrl}
                  className="w-full h-[520px] rounded border border-slate-200"
                  title="Prescription PDF"
                />
              ) : (
                <div
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  className="transition-transform duration-150"
                >
                  <Image
                    src={prescription.viewUrl}
                    alt="Uploaded Prescription"
                    width={800}
                    height={1000}
                    unoptimized
                    className="max-w-full rounded shadow-md object-contain"
                  />
                </div>
              )
            ) : (
              <div className="text-center p-6 text-[#78879A] text-xs">
                Prescription preview unavailable. Short-lived signed URL expired.
              </div>
            )}
          </div>

          {/* Document details footer */}
          <div className="p-3 bg-white border-t border-[#EBECEF] text-[11px] text-[#78879A] space-y-1">
            <div>
              Filename: <strong className="text-[#14161A]">{prescription.originalFileName}</strong>
            </div>
            <div>Uploaded at: {new Date(prescription.uploadedAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Right Column: AI Extraction & Item Verification (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* AI Warning Banner */}
          <div className="rounded-xl bg-[#F0FDFA] border border-[#0D5C5A]/30 p-4 shadow-2xs">
            <span className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#0D5C5A] text-white inline-block mb-1">
              AI ASSISTIVE DRAFT
            </span>
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">
                AI-generated draft — pharmacist verification required.
              </h4>
              <p className="text-[11px] text-[#78879A] mt-1 leading-relaxed">
                AI extraction and catalogue matches are assistive drafts. AI output never authorizes
                dispensing. Only your explicit verified decision as a registered pharmacist can
                approve medicine items.
              </p>
              {aiExtraction && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-[#6C757D]">
                  <span>
                    Model: <strong>{aiExtraction.model}</strong>
                  </span>
                  {aiExtraction.overallConfidence !== null && (
                    <span>
                      Confidence:{' '}
                      <strong>{(aiExtraction.overallConfidence * 100).toFixed(0)}%</strong>{' '}
                      (Informational only)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Extracted medicines list */}
          <div className="space-y-4">
            {items.map((item: any, idx: number) => {
              const draft = item.extractedDraft;
              const reviewRecord = item.review;
              const evalRes = item.complianceEvaluation;
              const isBlocked = evalRes?.decision === 'BLOCKED';
              const isApproved = reviewRecord?.status === 'APPROVED';
              const isRejected = reviewRecord?.status === 'REJECTED';
              const isAlternativePending = reviewRecord?.status === 'ALTERNATIVE_PENDING_CUSTOMER';

              return (
                <div
                  key={item.orderItemId}
                  className={`bg-white rounded-xl border p-5 shadow-2xs space-y-4 transition-all ${
                    isApproved
                      ? 'border-emerald-300 ring-1 ring-emerald-300/40 bg-emerald-50/10'
                      : isRejected
                        ? 'border-rose-300 bg-rose-50/10'
                        : isBlocked
                          ? 'border-rose-400 bg-rose-50/20'
                          : 'border-[#EBECEF]'
                  }`}
                >
                  {/* Item Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <h3 className="text-sm font-bold text-[#14161A]">{item.medicineName}</h3>
                      </div>
                      <span className="text-xs text-[#78879A]">
                        SKU: {item.sku} &bull; Qty: {item.quantity} &bull; Line Total: ₹
                        {item.lineTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Status / Compliance Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          item.schedule === 'OTC'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : item.schedule === 'SCHEDULE_H'
                              ? 'bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]'
                              : item.schedule === 'SCHEDULE_H1'
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {item.schedule}
                      </span>

                      {isApproved && (
                        <span className="text-[11px] font-semibold text-emerald-600">Approved</span>
                      )}
                      {isRejected && (
                        <span className="text-[11px] font-semibold text-rose-600">Rejected</span>
                      )}
                      {isAlternativePending && (
                        <span className="text-[11px] font-semibold text-amber-600">
                          Alternative Pending Consent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Deterministic Compliance Decision Banner */}
                  <div
                    className={`p-3 rounded-lg text-xs ${
                      isBlocked
                        ? 'bg-rose-50 border border-rose-300 text-rose-800'
                        : evalRes?.decision === 'REQUIRES_H1_REGISTER'
                          ? 'bg-amber-50 border border-amber-300 text-amber-800'
                          : evalRes?.decision === 'REQUIRES_PRESCRIPTION'
                            ? 'bg-[#F0FDFA] border border-[#EBECEF] text-[#0D5C5A]'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <strong className="font-semibold block">
                      Policy Evaluation: {evalRes?.decision || 'ALLOWED_FOR_REVIEW'}
                    </strong>
                    <ul className="list-disc list-inside mt-0.5 text-[11px] space-y-0.5 opacity-90">
                      {evalRes?.reasons?.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* AI Extracted draft info */}
                  {draft && (
                    <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#EBECEF] space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#78879A]">
                        <span className="font-medium text-[#0F172A]">AI Draft Extraction</span>
                        <span>
                          Confidence: <strong>{(draft.confidence * 100).toFixed(0)}%</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          Raw Text:{' '}
                          <strong className="text-[#14161A]">{draft.rawMedicineName}</strong>
                        </div>
                        <div>
                          Dosage:{' '}
                          <strong className="text-[#14161A]">
                            {draft.dosageInstructions || 'As directed'}
                          </strong>
                        </div>
                        <div>
                          Strength:{' '}
                          <strong className="text-[#14161A]">{draft.strength || 'N/A'}</strong>
                        </div>
                        <div>
                          Duration:{' '}
                          <strong className="text-[#14161A]">{draft.duration || 'N/A'}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Editable Pharmacist Verification Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-[#78879A] mb-1">
                        Dosage Instructions
                      </label>
                      <input
                        type="text"
                        defaultValue={
                          reviewRecord?.reviewedDosageInstructions ||
                          draft?.dosageInstructions ||
                          ''
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            item.orderItemId,
                            'reviewedDosageInstructions',
                            e.target.value,
                          )
                        }
                        placeholder="e.g. 1 tablet twice daily"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBECEF] text-xs focus:outline-none focus:ring-1 focus:ring-[#0D5C5A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#78879A] mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        defaultValue={reviewRecord?.reviewedDuration || draft?.duration || ''}
                        onChange={(e) =>
                          handleFieldChange(item.orderItemId, 'reviewedDuration', e.target.value)
                        }
                        placeholder="e.g. 7 days"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBECEF] text-xs focus:outline-none focus:ring-1 focus:ring-[#0D5C5A]"
                      />
                    </div>
                  </div>

                  {/* Pending Alternative Alert if proposed */}
                  {item.activeAlternativeProposal && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
                      <strong className="block font-semibold">
                        Proposed Generic Alternative:{' '}
                        {item.activeAlternativeProposal.proposedMedicine.name}
                      </strong>
                      <p className="text-[11px]">
                        Awaiting customer acceptance. Price diff: ₹
                        {Number(item.activeAlternativeProposal.priceDifference).toFixed(2)}. Reason:{' '}
                        {item.activeAlternativeProposal.reason}
                      </p>
                    </div>
                  )}

                  {/* Item Decision Buttons */}
                  <div className="pt-2 border-t border-[#EBECEF] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSaveFields(item.orderItemId)}
                        className="px-2.5 py-1 rounded text-[11px] font-medium text-[#0D5C5A] hover:bg-[#F0FDFA] border border-[#EBECEF]"
                      >
                        Save Corrections
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlternativeModal({ itemId: item.orderItemId })}
                        disabled={isBlocked || isApproved}
                        className="px-2.5 py-1 rounded text-[11px] font-medium text-[#0F172A] hover:bg-[#F8F9FB] border border-[#EBECEF] disabled:opacity-50"
                      >
                        Propose Generic
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectItemModal({ itemId: item.orderItemId })}
                        disabled={isApproved || actionLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                      >
                        Reject Item
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveItem(item.orderItemId, item.schedule)}
                        disabled={isBlocked || isApproved || actionLoading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-2xs transition-colors flex items-center gap-1 ${
                          isBlocked
                            ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <span>
                          {item.schedule === 'SCHEDULE_H1' ? 'Enter H1 & Approve' : 'Approve Item'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL: Schedule H1 Details */}
      {h1Modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#14161A]">Schedule H1 Register Details</h3>
            <p className="text-xs text-[#78879A]">
              Under regulatory requirements, Schedule H1 substances require recorded patient and
              prescriber doctor details before dispensing.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  value={h1PatientName}
                  onChange={(e) => setH1PatientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
                  placeholder="e.g. Debasish Ghosh"
                />
              </div>
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">
                  Prescribing Doctor *
                </label>
                <input
                  type="text"
                  value={h1PrescriberName}
                  onChange={(e) => setH1PrescriberName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
                  placeholder="e.g. Dr. A. K. Mukherjee, MD"
                />
              </div>
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">
                  Clinic / Hospital / Reg No
                </label>
                <input
                  type="text"
                  value={h1PrescriberDetails}
                  onChange={(e) => setH1PrescriberDetails(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
                  placeholder="e.g. Apollo Gleneagles Hospital (Reg #12345)"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setH1Modal(null)}
                className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitH1Approval}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Confirm H1 & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Item Reason */}
      {rejectItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#14161A]">Reject Medicine Item</h3>
            <p className="text-xs text-[#78879A]">
              Provide a clear reason for rejecting this item. The customer will see this explanation
              in their portal.
            </p>
            <textarea
              rows={3}
              value={rejectItemReason}
              onChange={(e) => setRejectItemReason(e.target.value)}
              placeholder="e.g. Strength prescribed does not match patient age, or unreadable dosage..."
              className="w-full p-2.5 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setRejectItemModal(null)}
                className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectItem}
                disabled={actionLoading || !rejectItemReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Propose Generic Alternative */}
      {alternativeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#14161A]">Propose Generic Alternative</h3>
            <p className="text-xs text-[#78879A]">
              Propose an active-ingredient equivalent catalogue medicine. Customer must explicitly
              accept or decline.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">
                  Select Catalogue Alternative
                </label>
                <select
                  value={altProposedMedicineId}
                  onChange={(e) => setAltProposedMedicineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
                >
                  <option value="">-- Choose Catalogue Medicine --</option>
                  {catalogueMedicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.genericName || 'No generic'} - ₹{Number(m.mrp).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">Pharmacist Reason</label>
                <textarea
                  rows={2}
                  value={altReason}
                  onChange={(e) => setAltReason(e.target.value)}
                  placeholder="e.g. Economical alternative with identical active ingredient..."
                  className="w-full p-2.5 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setAlternativeModal(null)}
                className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProposeAlternative}
                disabled={actionLoading || !altProposedMedicineId || !altReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0D5C5A] text-white hover:bg-[#0A4846] disabled:opacity-50"
              >
                Send Proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Entire Prescription */}
      {rejectPrescriptionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#14161A]">Reject Entire Prescription</h3>
            <p className="text-xs text-[#78879A]">
              Rejecting this prescription marks the order as REJECTED. Please provide an explicit
              regulatory or clinical reason.
            </p>
            <textarea
              rows={3}
              value={rejectPrescriptionReason}
              onChange={(e) => setRejectPrescriptionReason(e.target.value)}
              placeholder="e.g. Prescription expired, prescriber signature invalid, or illegible document..."
              className="w-full p-2.5 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setRejectPrescriptionModal(false)}
                className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectPrescription}
                disabled={actionLoading || !rejectPrescriptionReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Prescription Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Request Re-upload */}
      {reuploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#14161A]">Request Prescription Re-upload</h3>
            <p className="text-xs text-[#78879A]">
              The customer will be notified in the customer app to upload a clearer replacement
              prescription.
            </p>
            <textarea
              rows={3}
              value={reuploadReason}
              onChange={(e) => setReuploadReason(e.target.value)}
              placeholder="e.g. Image blurry, corners cut off, doctor stamp not visible..."
              className="w-full p-2.5 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setReuploadModal(false)}
                className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestReupload}
                disabled={actionLoading || !reuploadReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Request Re-upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
