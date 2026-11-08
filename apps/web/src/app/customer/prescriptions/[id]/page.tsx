'use client';

/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch, ApiError } from '@/lib/api/client';
import Link from 'next/link';
import { PrescriptionDTO, PrescriptionAIExtractionDTO } from '@pharmacy/shared-types';
import { MissingPrescriptionIllustration } from '@/components/customer/MissingPrescriptionIllustration';

export default function PrescriptionDetailPage() {
  const params = useParams();
  const prescriptionId = params.id as string;

  const [prescription, setPrescription] = React.useState<PrescriptionDTO | null>(null);
  const [viewUrl, setViewUrl] = React.useState<string | null>(null);
  const [previewImageError, setPreviewImageError] = React.useState(false);
  const [extraction, setExtraction] = React.useState<PrescriptionAIExtractionDTO | null>(null);
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
        // No extraction created yet
        setExtraction(null);
      } else {
        // Ignore background polling error
      }
    }
  }, [prescriptionId]);

  React.useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadPrescription(), loadLatestExtraction()]);
      setLoading(false);
    };
    init();
  }, [loadPrescription, loadLatestExtraction]);

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

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto py-12 flex flex-col items-center justify-center space-y-3">
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

  return (
    <div className="max-w-[1050px] mx-auto space-y-6 pb-12">
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

      {/* Prescription Document Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-1 space-y-4 border-slate-200 shadow-sm bg-white">
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

        {/* AI Assisted Reading Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Prominent Legal Disclaimer Banner */}
          <div className="p-3.5 bg-[#F0FDFA] border border-[#EBECEF] rounded-xl text-[#0F172A] text-xs flex items-start gap-3">
            <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-[#99F6E4] text-[#0F172A]">
              LEGAL NOTICE
            </span>
            <div>
              <p className="font-bold text-[#0F172A]">Preliminary AI Reading Notice</p>
              <p className="text-[#0D5C5A] mt-0.5 leading-relaxed">
                AI extraction is a preliminary reading only. A registered pharmacist must review and
                verify the prescription before any medicine can be dispensed. This draft does not
                authorize dispensing or approve your order.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <span className="font-bold uppercase text-[10px] px-1 py-0.5 bg-red-200 rounded">
                Error
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* STATE 1: NOT STARTED / UPLOADED */}
          {!extraction && (
            <Card className="p-8 text-center space-y-4 border-slate-200 bg-white">
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  Assisted Prescription Reading
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Start our AI reading assistant to automatically read doctor handwriting, dosage
                  instructions, and suggest matching medicines from our catalogue for pharmacist
                  verification.
                </p>
              </div>
              <Button
                onClick={handleStartExtraction}
                disabled={requesting}
                className="bg-[#0D5C5A] hover:bg-[#5233D2] text-white text-xs h-9 px-5 shadow-sm"
              >
                {requesting ? 'Starting...' : 'Start AI Reading'}
              </Button>
            </Card>
          )}

          {/* STATE 2: QUEUED / PROCESSING */}
          {extraction && (extraction.status === 'QUEUED' || extraction.status === 'PROCESSING') && (
            <Card className="p-8 text-center space-y-4 border-slate-200 bg-white">
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-slate-800">Reading your prescription...</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Our AI assistant is analyzing the handwriting, medicine names, strengths, and
                  dosage instructions. This usually takes just a few seconds.
                </p>
                <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden mt-3">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400 block">
                Status: {extraction.status} &bull; Attempt #{extraction.attemptNumber}
              </span>
            </Card>
          )}

          {/* STATE 3: NEEDS_REUPLOAD */}
          {extraction && extraction.status === 'NEEDS_REUPLOAD' && (
            <Card className="p-6 border-amber-200 bg-amber-50/40 space-y-4">
              <div className="space-y-1">
                <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 inline-block mb-1">
                  RE-UPLOAD NEEDED
                </span>
                <h3 className="text-sm font-bold text-amber-950">
                  Prescription Document Requires Re-upload
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  The document could not be read clearly enough for safe extraction. This usually
                  happens if the photo is blurry, handwriting is obscured, or lighting is too dark.
                </p>
              </div>

              {extraction.extractionResult?.unreadableSections &&
                extraction.extractionResult.unreadableSections.length > 0 && (
                  <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 text-xs space-y-1">
                    <span className="font-semibold text-amber-950 block">Issues Identified:</span>
                    <ul className="list-disc list-inside text-amber-900 space-y-0.5">
                      {extraction.extractionResult.unreadableSections.map((sec, idx) => (
                        <li key={idx}>{sec}</li>
                      ))}
                    </ul>
                  </div>
                )}

              <div className="flex items-center gap-2 pt-2">
                <Link href="/customer/prescriptions">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                  >
                    Upload Clearer Document &rarr;
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryExtraction}
                  disabled={requesting}
                  className="text-xs h-8 border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  {requesting ? 'Retrying...' : 'Retry Reading'}
                </Button>
              </div>
            </Card>
          )}

          {/* STATE 4: FAILED */}
          {extraction && extraction.status === 'FAILED' && (
            <Card className="p-6 border-red-200 bg-red-50/40 space-y-4">
              <div className="space-y-1">
                <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-red-200 text-red-950 inline-block mb-1">
                  FAILED
                </span>
                <h3 className="text-sm font-bold text-red-950">Extraction Unsuccessful</h3>
                <p className="text-xs text-red-900 leading-relaxed">
                  {extraction.errorMessage ||
                    'An unexpected error occurred while reading the prescription. Please retry or contact support.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleRetryExtraction}
                  disabled={requesting}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                >
                  {requesting ? 'Retrying...' : 'Retry Extraction'}
                </Button>
                <Link href="/customer/prescriptions">
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    &larr; Back to Prescriptions
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* STATE 5: COMPLETED */}
          {extraction && extraction.status === 'COMPLETED' && (
            <div className="space-y-4">
              {/* Extraction Header Summary */}
              <Card className="p-4 border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">
                      AI Reading Draft Completed
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      Draft Ready
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Confidence:</span>
                    <Badge className="bg-[#CCFBF1] text-[#0D5C5A] border-[#EBECEF] text-xs font-semibold">
                      {Math.round((extraction.overallConfidence || 0) * 100)}% Match
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Patient Name:</span>
                    <span className="font-semibold text-slate-800">
                      {extraction.extractionResult?.patientName || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Prescriber / Doctor:</span>
                    <span className="font-semibold text-slate-800">
                      {extraction.extractionResult?.prescriberName || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Prescription Date:</span>
                    <span className="font-semibold text-slate-800">
                      {extraction.extractionResult?.prescriptionDate || 'Not specified'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Extracted Medicines & Catalogue Matches */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    Extracted Medicines ({extraction.extractionResult?.items.length || 0})
                  </span>
                  <span className="text-xs font-normal text-slate-500">
                    Catalogue Matching Suggestions
                  </span>
                </h3>

                {(!extraction.extractionResult?.items ||
                  extraction.extractionResult.items.length === 0) && (
                  <Card className="p-6 text-center text-xs text-slate-500 border-dashed">
                    No clear medicines could be extracted from this document.
                  </Card>
                )}

                {extraction.extractionResult?.items.map((item, idx) => {
                  const match = extraction.matchingResult?.find(
                    (m) => m.extractedItemIndex === idx,
                  );

                  return (
                    <Card key={idx} className="p-4 border-slate-200 bg-white space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#0F172A]">
                              {item.rawMedicineName}
                            </h4>
                            {item.normalizedMedicineName &&
                              item.normalizedMedicineName !== item.rawMedicineName && (
                                <span className="text-xs text-slate-500">
                                  ({item.normalizedMedicineName})
                                </span>
                              )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                            {item.strength && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {item.strength}
                              </span>
                            )}
                            {item.dosageForm && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {item.dosageForm}
                              </span>
                            )}
                            {item.quantity && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                Qty: {item.quantity}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Match Status Badge */}
                        <div>
                          {match?.matchStatus === 'MATCHED' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-semibold">
                              ✓ Matched in Catalogue
                            </Badge>
                          )}
                          {match?.matchStatus === 'AMBIGUOUS' && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px] font-semibold">
                              Ambiguous Match
                            </Badge>
                          )}
                          {match?.matchStatus === 'NOT_FOUND' && (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-semibold">
                              Catalogue Match Not Found
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Dosage Instructions & Frequency */}
                      {(item.dosageInstructions || item.frequency || item.duration) && (
                        <div className="p-2.5 rounded-lg bg-slate-50 text-xs text-slate-700 space-y-1">
                          {item.dosageInstructions && (
                            <p>
                              <span className="font-semibold text-slate-500">Directions:</span>{' '}
                              {item.dosageInstructions}
                            </p>
                          )}
                          <div className="flex gap-4 text-slate-600">
                            {item.frequency && (
                              <span>
                                <span className="font-semibold text-slate-500">Frequency:</span>{' '}
                                {item.frequency}
                              </span>
                            )}
                            {item.duration && (
                              <span>
                                <span className="font-semibold text-slate-500">Duration:</span>{' '}
                                {item.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Catalogue Match Details / Candidate Reasons */}
                      {match && match.candidates.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                          <span className="text-slate-400 block font-medium">
                            Match Details ({match.candidates.length} candidate
                            {match.candidates.length > 1 ? 's' : ''}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {match.candidates[0].matchReasons.map((r, rIdx) => (
                              <span
                                key={rIdx}
                                className="text-[10px] px-2 py-0.5 rounded bg-[#F0FDFA] text-[#0D5C5A] font-mono"
                              >
                                {r.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Generic Alternatives Suggestions */}
                      {match?.genericAlternatives && match.genericAlternatives.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 text-xs">
                          <span className="text-slate-500 font-semibold block mb-1">
                            Available Generic Alternatives (For Pharmacist Review):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {match.genericAlternatives.map((alt) => (
                              <div
                                key={alt.medicineId}
                                className="p-2 rounded border border-slate-200 bg-slate-50 text-slate-700"
                              >
                                <span className="font-bold block text-slate-900">{alt.name}</span>
                                <span className="text-[11px] text-slate-500">
                                  {alt.genericName} &bull; ₹{alt.mrp}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.warnings && item.warnings.length > 0 && (
                        <div className="p-2 rounded bg-amber-50 border border-amber-200/60 text-amber-800 text-xs">
                          {item.warnings.join('; ')}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* General Warnings & Unreadable Sections */}
              {((extraction.extractionResult?.unreadableSections &&
                extraction.extractionResult.unreadableSections.length > 0) ||
                (extraction.extractionResult?.generalWarnings &&
                  extraction.extractionResult.generalWarnings.length > 0)) && (
                <Card className="p-4 border-amber-200 bg-amber-50/30 text-xs space-y-2">
                  <span className="font-bold text-amber-950 block">
                    Doctor Handwriting &amp; Extraction Notes
                  </span>
                  {extraction.extractionResult.unreadableSections.map((sec, idx) => (
                    <p key={idx} className="text-amber-900">
                      &bull; {sec}
                    </p>
                  ))}
                  {extraction.extractionResult.generalWarnings.map((warn, idx) => (
                    <p key={idx} className="text-amber-900">
                      &bull; {warn}
                    </p>
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
