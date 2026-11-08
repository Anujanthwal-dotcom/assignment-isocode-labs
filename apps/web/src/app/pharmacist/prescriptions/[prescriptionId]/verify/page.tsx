'use client';

/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/client';
import { MissingPrescriptionIllustration } from '@/components/customer/MissingPrescriptionIllustration';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Send,
  ArrowLeft,
} from 'lucide-react';

interface MedicineCandidate {
  id: string;
  sku: string;
  name: string;
  brandName?: string | null;
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  mrp: number;
  schedule: string;
}

interface QuotationItemState {
  id: string;
  medicineId: string;
  detectedMedicineName: string;
  medicineNameSnapshot: string;
  strengthSnapshot: string;
  dosageFormSnapshot: string;
  dosageInstructions: string;
  unitPrice: number;
  quantity: number;
  isAvailable: boolean;
  unavailableReason: string;
  comparisonNotes?: string;
  matchStatus?: 'MATCHED' | 'AMBIGUOUS' | 'NOT_FOUND';
}

export default function PharmacistPrescriptionVerifyPage() {
  const params = useParams();
  const prescriptionId = params.prescriptionId as string;
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Review bundle data
  const [detail, setDetail] = React.useState<any | null>(null);
  const [items, setItems] = React.useState<QuotationItemState[]>([]);
  const [pharmacistNotes, setPharmacistNotes] = React.useState('');

  // Image zoom and rotation
  const [zoomLevel, setZoomLevel] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);
  const [previewError, setPreviewError] = React.useState(false);

  // Re-upload and Reject modals
  const [reuploadOpen, setReuploadOpen] = React.useState(false);
  const [reuploadReason, setReuploadReason] = React.useState('');
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  // Catalogue search state for active line
  const [activeSearchLineId, setActiveSearchLineId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<MedicineCandidate[]>([]);
  const [searching, setSearching] = React.useState(false);

  // Load prescription verification detail
  const loadDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(
        `/pharmacist/prescriptions/${prescriptionId}/review-details`,
      );
      setDetail(res);

      // If an existing quote is present, initialize with its items
      if (res.activeQuote && res.activeQuote.items?.length > 0) {
        setItems(
          res.activeQuote.items.map((i: any) => ({
            id: i.id || String(Math.random()),
            medicineId: i.medicineId || '',
            detectedMedicineName: i.detectedMedicineName || '',
            medicineNameSnapshot: i.medicineNameSnapshot || '',
            strengthSnapshot: i.strengthSnapshot || '',
            dosageFormSnapshot: i.dosageFormSnapshot || '',
            dosageInstructions: i.dosageInstructions || '',
            unitPrice: Number(i.unitPrice) || 0,
            quantity: Number(i.quantity) || 1,
            isAvailable: i.isAvailable !== false,
            unavailableReason: i.unavailableReason || '',
          })),
        );
        if (res.activeQuote.pharmacistNotes) {
          setPharmacistNotes(res.activeQuote.pharmacistNotes);
        }
      } else if (res.aiExtraction?.extractionResult?.items?.length > 0) {
        // Pre-fill from AI Extraction + Catalogue Matching Results
        const aiItems = res.aiExtraction.extractionResult.items;
        const matchingList = Array.isArray(res.aiExtraction.matchingResult)
          ? res.aiExtraction.matchingResult
          : Array.isArray(res.aiExtraction.matchingResult?.matches)
            ? res.aiExtraction.matchingResult.matches
            : [];

        const initialItems: QuotationItemState[] = aiItems.map((item: any, idx: number) => {
          const match = matchingList.find((m: any) =>
            m.extractedItemIndex === idx || m.sku === item.sku || m.medicineId === item.medicineId,
          );
          const matchedMed =
            match?.matchedMedicine ||
            (match?.medicineId
              ? {
                  id: match.medicineId,
                  sku: match.sku,
                  name: item.normalizedMedicineName || item.rawMedicineName,
                  strength: item.strength || '',
                  dosageForm: item.dosageForm || 'Tablet',
                  mrp: match.mrp || 25,
                }
              : undefined);

          return {
            id: `line-${idx}-${Date.now()}`,
            medicineId: matchedMed?.id || '',
            detectedMedicineName: item.rawMedicineName || item.normalizedMedicineName || '',
            medicineNameSnapshot:
              matchedMed?.name || item.normalizedMedicineName || item.rawMedicineName || '',
            strengthSnapshot: matchedMed?.strength || item.strength || '',
            dosageFormSnapshot: matchedMed?.dosageForm || item.dosageForm || 'Tablet',
            dosageInstructions: item.dosageInstructions || `${item.frequency || '1 daily'}`,
            unitPrice: matchedMed ? Number(matchedMed.mrp) : 0,
            quantity: Number(item.quantity) || 10,
            isAvailable: true,
            unavailableReason: '',
            comparisonNotes: match?.comparisonNotes || '',
            matchStatus: match?.matchStatus || (matchedMed ? 'MATCHED' : 'NOT_FOUND'),
          };
        });

        setItems(initialItems);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load prescription verification details.');
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  React.useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Live Catalogue Search Debounce
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await apiFetch<{ data: MedicineCandidate[] }>(
          `/medicines?search=${encodeURIComponent(searchQuery.trim())}&limit=12`,
        );
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update Line Item Values
  const handleUpdateItem = (id: string, updates: Partial<QuotationItemState>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  // Select Catalogue Medicine
  const handleSelectCatalogueMedicine = (lineId: string, med: MedicineCandidate) => {
    handleUpdateItem(lineId, {
      medicineId: med.id,
      medicineNameSnapshot: med.name,
      strengthSnapshot: med.strength || '',
      dosageFormSnapshot: med.dosageForm || '',
      unitPrice: Number(med.mrp),
      comparisonNotes: `Pharmacist verified match: ${med.name} (SKU: ${med.sku})`,
      matchStatus: 'MATCHED',
    });
    setActiveSearchLineId(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Add Empty Medicine Row
  const handleAddMedicineRow = () => {
    const newItem: QuotationItemState = {
      id: `line-${Date.now()}`,
      medicineId: '',
      detectedMedicineName: 'Doctor handwriting manual addition',
      medicineNameSnapshot: '',
      strengthSnapshot: '',
      dosageFormSnapshot: 'Tablet',
      dosageInstructions: 'As directed by physician',
      unitPrice: 0,
      quantity: 1,
      isAvailable: true,
      unavailableReason: '',
      comparisonNotes: 'Manually added by pharmacist from prescription review',
      matchStatus: 'NOT_FOUND',
    };
    setItems((prev) => [...prev, newItem]);
    setActiveSearchLineId(newItem.id);
  };

  // Remove Row
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Financial Calculations
  const subtotal = React.useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item.isAvailable) return sum;
      return sum + Number((item.unitPrice * item.quantity).toFixed(2));
    }, 0);
  }, [items]);

  const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 50;
  const totalAmount = Number((subtotal + deliveryFee).toFixed(2));

  // Submit Quotation
  const handleSubmitQuote = async () => {
    if (items.length === 0) {
      setError('Please include at least one medicine item in the quotation.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        items: items.map((i) => ({
          medicineId: i.medicineId || undefined,
          detectedMedicineName: i.detectedMedicineName || undefined,
          medicineNameSnapshot: i.medicineNameSnapshot,
          strengthSnapshot: i.strengthSnapshot || undefined,
          dosageFormSnapshot: i.dosageFormSnapshot || undefined,
          dosageInstructions: i.dosageInstructions || undefined,
          unitPrice: Number(i.unitPrice),
          quantity: Number(i.quantity),
          isAvailable: i.isAvailable,
          unavailableReason: i.isAvailable ? undefined : i.unavailableReason || 'Unavailable',
        })),
        pharmacistNotes: pharmacistNotes.trim() || undefined,
      };

      await apiFetch(`/pharmacist/prescriptions/${prescriptionId}/quote`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMsg('Prescription verified and quotation sent to customer successfully!');
      setTimeout(() => {
        router.push('/pharmacist/review-queue');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit prescription quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Re-upload Handler
  const handleRequestReupload = async () => {
    if (!reuploadReason.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await apiFetch(`/pharmacist/prescriptions/${prescriptionId}/request-reupload`, {
        method: 'POST',
        body: JSON.stringify({ reason: reuploadReason.trim() }),
      });
      setReuploadOpen(false);
      router.push('/pharmacist/review-queue');
    } catch (err: any) {
      setError(err?.message || 'Failed to request prescription re-upload.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reject Handler
  const handleRejectPrescription = async () => {
    if (!rejectReason.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await apiFetch(`/pharmacist/prescriptions/${prescriptionId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setRejectOpen(false);
      router.push('/pharmacist/review-queue');
    } catch (err: any) {
      setError(err?.message || 'Failed to reject prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#0D5C5A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 mt-3 font-medium">
          Loading prescription verification workspace...
        </p>
      </div>
    );
  }

  if (!detail || !detail.prescription) {
    return (
      <div className="flex-1 max-w-4xl mx-auto p-6">
        <Card className="p-6 bg-red-50 border-red-200 text-red-700">
          <h2 className="font-bold text-base">Prescription Not Found</h2>
          <p className="text-xs mt-1">This prescription does not exist or has been removed.</p>
          <Link href="/pharmacist/review-queue" className="mt-4 inline-block">
            <Button size="sm" variant="outline">
              &larr; Back to Review Queue
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { prescription, customer, patient, aiExtraction } = detail;

  return (
    <div className="flex-1 p-6 max-w-[1500px] w-full mx-auto space-y-5">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBECEF]">
        <div className="flex items-center gap-3">
          <Link
            href="/pharmacist/review-queue"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C5A] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Queue
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
            Prescription Verification &amp; Cost Quotation
          </h1>
          <Badge variant="neutral" className="text-[10px] font-mono">
            {prescription.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            Patient: <strong className="text-slate-800">{patient.name}</strong> ({patient.relationship})
          </span>
          <span>&bull;</span>
          <span>Customer: <strong className="text-slate-800">{customer.fullName}</strong></span>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 text-xs font-bold">
            &times;
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Side-by-Side Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5/12): Authentic Prescription Document Viewer */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 border-slate-200 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Prescription Document
                </h3>
                <p className="text-xs font-medium text-slate-800 truncate max-w-[240px]" title={prescription.originalFileName}>
                  {prescription.originalFileName}
                </p>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  title="Zoom In"
                  onClick={() => setZoomLevel((z) => Math.min(220, z + 20))}
                  className="p-1 rounded hover:bg-white text-slate-700 text-xs"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 20))}
                  className="p-1 rounded hover:bg-white text-slate-700 text-xs"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Rotate"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 rounded hover:bg-white text-slate-700 text-xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-500 px-1">{zoomLevel}%</span>
              </div>
            </div>

            {/* Document Image Canvas */}
            <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-900/5 h-[520px] flex items-center justify-center">
              {prescription.viewUrl && !previewError ? (
                prescription.mimeType === 'application/pdf' ? (
                  <div className="text-center p-6 space-y-3">
                    <p className="text-xs text-slate-600 font-medium">PDF Prescription Document</p>
                    <a
                      href={prescription.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-[#0D5C5A] font-bold underline"
                    >
                      Open PDF in New Window &rarr;
                    </a>
                  </div>
                ) : (
                  <div className="overflow-auto max-h-full max-w-full p-2 flex items-center justify-center">
                    <img
                      src={prescription.viewUrl}
                      alt="Prescription"
                      onError={() => setPreviewError(true)}
                      style={{
                        transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                        transition: 'transform 0.15s ease',
                      }}
                      className="max-h-[500px] object-contain shadow-xs rounded"
                    />
                  </div>
                )
              ) : (
                <div className="p-4 w-full">
                  <MissingPrescriptionIllustration
                    compact
                    fileName={prescription.originalFileName}
                    mimeType={prescription.mimeType}
                  />
                </div>
              )}
            </div>

            {/* Document Meta Summary */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block">Uploaded Date:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(prescription.uploadedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Patient Account:</span>
                <span className="font-semibold text-slate-800">{customer.fullName} ({customer.phone || customer.email})</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (7/12): AI Extraction, Catalogue Matching & Cost Quotation */}
        <div className="lg:col-span-7 space-y-4">
          {/* AI Comparison Notice Banner */}
          <div className="p-3 bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl text-xs flex items-start gap-3">
            <span className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#99F6E4] text-[#0D5C5A]">
              AI VERIFICATION ASSIST
            </span>
            <div className="flex-1">
              <p className="font-bold text-[#0F172A]">AI Reading &amp; Catalogue Match Results</p>
              <p className="text-[#0D5C5A] mt-0.5 leading-relaxed">
                Review the AI-detected medications below. Medicines have been automatically cross-referenced against
                our 45+ medicine catalogue. Correct quantities, adjust strengths, or mark unavailable before finalizing the quote.
              </p>
            </div>
            {aiExtraction?.overallConfidence && (
              <Badge className="bg-[#0D5C5A] text-white border-none text-[10px] font-mono">
                {Math.round(aiExtraction.overallConfidence * 100)}% Confidence
              </Badge>
            )}
          </div>

          {/* Medicines Line Items Card */}
          <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Verified Medicines &amp; Quotation Items ({items.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Confirm prices, mapped SKUs, and specify availability for customer purchase.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMedicineRow}
                className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Medicine
              </Button>
            </div>

            {/* Medicines List */}
            <div className="space-y-4">
              {items.map((item, index) => {
                const lineTotal = item.isAvailable ? Number((item.unitPrice * item.quantity).toFixed(2)) : 0;
                const isSearchingThis = activeSearchLineId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      !item.isAvailable
                        ? 'border-amber-300 bg-amber-50/50'
                        : item.matchStatus === 'MATCHED'
                        ? 'border-slate-200 bg-white hover:border-[#0D5C5A]/40'
                        : 'border-orange-200 bg-orange-50/30'
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between gap-3 pb-2.5 mb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-slate-800">
                            {item.medicineNameSnapshot || 'Unmapped Medicine'}
                          </span>
                          {item.detectedMedicineName && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Detected: {item.detectedMedicineName}
                            </span>
                          )}

                          {detail?.networkInventory?.[item.medicineId] && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                              <span
                                className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                                  detail.networkInventory[item.medicineId].totalAvailable > 0
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {detail.networkInventory[item.medicineId].totalAvailable > 0
                                  ? `✓ Network Stock: ${detail.networkInventory[item.medicineId].totalAvailable} units available`
                                  : '⚠ Out of Stock Across Network'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({detail.networkInventory[item.medicineId].stores
                                  .map((s: any) => `${s.storeName}: ${s.available}`)
                                  .join(' | ')})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Availability Toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItem(item.id, {
                              isAvailable: !item.isAvailable,
                              unavailableReason: item.isAvailable ? 'Temporarily unavailable / Out of stock' : '',
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-amber-50 hover:text-amber-700'
                              : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          {item.isAvailable ? '✓ Available' : '⚠ Marked Unavailable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* AI Comparison & Matching Callout */}
                    {item.comparisonNotes && (
                      <div className="mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] flex items-center gap-2">
                        {item.matchStatus === 'MATCHED' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : item.matchStatus === 'AMBIGUOUS' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="text-slate-600 font-medium">{item.comparisonNotes}</span>
                      </div>
                    )}

                    {/* Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                      {/* Medicine Selector / Live Search */}
                      <div className="sm:col-span-6 relative">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Catalogue Medicine Match
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={isSearchingThis ? searchQuery : item.medicineNameSnapshot}
                            onFocus={() => {
                              setActiveSearchLineId(item.id);
                              setSearchQuery(item.medicineNameSnapshot);
                            }}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Type brand or generic to search..."
                            className="w-full text-xs h-8 pl-7 pr-3 rounded border border-slate-300 bg-white focus:outline-hidden focus:border-[#0D5C5A]"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                        </div>

                        {/* Search Autocomplete Dropdown */}
                        {isSearchingThis && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg p-1 space-y-1">
                            {searching && (
                              <p className="p-2 text-[11px] text-slate-400 text-center">
                                Searching catalogue...
                              </p>
                            )}
                            {!searching && searchResults.length === 0 && (
                              <p className="p-2 text-[11px] text-slate-400 text-center">
                                No catalogue medicines found.
                              </p>
                            )}
                            {searchResults.map((cand) => (
                              <button
                                key={cand.id}
                                type="button"
                                onClick={() => handleSelectCatalogueMedicine(item.id, cand)}
                                className="w-full text-left p-2 rounded hover:bg-[#F0FDFA] flex items-center justify-between text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-slate-800 block">{cand.name}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {cand.genericName} &bull; {cand.strength} &bull; {cand.dosageForm}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-[#0D5C5A]">₹{cand.mrp}</span>
                                  <span className="text-[9px] block text-slate-400 font-mono">
                                    {cand.schedule}
                                  </span>
                                </div>
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setActiveSearchLineId(null)}
                              className="w-full py-1 text-[10px] text-slate-500 hover:text-slate-700 text-center border-t border-slate-100"
                            >
                              Close search
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dosage Instructions */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Dosage / Frequency
                        </label>
                        <input
                          type="text"
                          value={item.dosageInstructions}
                          onChange={(e) => handleUpdateItem(item.id, { dosageInstructions: e.target.value })}
                          placeholder="e.g. 1 tab BD pc"
                          className="w-full text-xs h-8 px-2 rounded border border-slate-300 bg-white focus:outline-hidden focus:border-[#0D5C5A]"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full text-xs h-8 px-2 rounded border border-slate-300 bg-white font-bold text-center focus:outline-hidden focus:border-[#0D5C5A]"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          MRP (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              unitPrice: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-full text-xs h-8 px-2 rounded border border-slate-300 bg-white font-mono text-center focus:outline-hidden focus:border-[#0D5C5A]"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="sm:col-span-1 text-right">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Total
                        </label>
                        <span className={`text-xs font-bold leading-8 block font-mono ${item.isAvailable ? 'text-[#0D5C5A]' : 'text-slate-400 line-through'}`}>
                          ₹{lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Unavailable Reason Input */}
                    {!item.isAvailable && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-amber-900 shrink-0">
                          Reason for unavailability:
                        </span>
                        <input
                          type="text"
                          value={item.unavailableReason}
                          onChange={(e) => handleUpdateItem(item.id, { unavailableReason: e.target.value })}
                          placeholder="e.g. Out of stock, special hospital supply only, or requires doctor clarification"
                          className="flex-1 text-xs h-7 px-2 rounded border border-amber-300 bg-white focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pharmacist Notes for Customer */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pharmacist Advice &amp; Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={pharmacistNotes}
                onChange={(e) => setPharmacistNotes(e.target.value)}
                placeholder="e.g. Take Omeprazole 30 mins before morning breakfast. Follow antibiotic course completely."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-[#0D5C5A]"
              />
            </div>
          </Card>

          {/* Quotation Cost Breakdown Summary Box */}
          <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quotation Cost Summary
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Verified Medicines Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Standard Delivery Fee:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {deliveryFee === 0 ? <span className="text-emerald-700">FREE</span> : `₹${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm font-bold text-[#0F172A]">
                <span>Total Payable Amount:</span>
                <span className="text-base text-[#0D5C5A] font-mono">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReuploadOpen(true)}
                  disabled={submitting}
                  className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  Request Re-upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectOpen(true)}
                  disabled={submitting}
                  className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  Reject Prescription
                </Button>
              </div>

              <Button
                type="button"
                onClick={handleSubmitQuote}
                disabled={submitting || items.length === 0}
                className="bg-[#0D5C5A] hover:bg-[#093e3d] text-white text-xs h-9 px-6 font-semibold shadow-xs"
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                {submitting ? 'Generating Quote...' : 'Send Quotation to Customer'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialog for Re-upload Request */}
      <Dialog open={reuploadOpen} onOpenChange={setReuploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-900">
              Request Prescription Re-upload
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Explain clearly why the prescription document requires re-upload (e.g. blurry image, missing doctor signature).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              rows={3}
              value={reuploadReason}
              onChange={(e) => setReuploadReason(e.target.value)}
              placeholder="Provide reason for customer..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-amber-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReuploadOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRequestReupload}
              disabled={submitting || !reuploadReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Prescription Rejection */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-900">
              Reject Prescription
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Specify the clinical or regulatory ground for rejecting this prescription document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Prescription expired, forged document, or banned formulation."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-rose-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRejectPrescription}
              disabled={submitting || !rejectReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
