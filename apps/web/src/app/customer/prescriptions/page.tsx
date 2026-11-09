'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Trash2, AlertCircle, Search, X } from 'lucide-react';
import { PrescriptionDTO, FamilyMemberDTO } from '@pharmacy/shared-types';
import { MissingPrescriptionIllustration } from '@/components/customer/MissingPrescriptionIllustration';

export default function CustomerPrescriptionsPage() {
  const searchParams = useSearchParams();
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionDTO[]>([]);
  const [familyMembers, setFamilyMembers] = React.useState<FamilyMemberDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>(
    searchParams.get('search') || '',
  );

  React.useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  // Upload Form State
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [familyMemberId, setFamilyMemberId] = React.useState<string>('');
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);

  // Preview Dialog State
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = React.useState('');
  const [previewMime, setPreviewMime] = React.useState('');
  const [previewImageError, setPreviewImageError] = React.useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; fileName: string } | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rxRes, famRes] = await Promise.all([
        apiFetch<{ data: PrescriptionDTO[] }>('/customer/prescriptions'),
        apiFetch<FamilyMemberDTO[]>('/customer/family-members'),
      ]);
      setPrescriptions(rxRes?.data || []);
      setFamilyMembers(famRes || []);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Please select a JPEG, PNG image or PDF document.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size exceeds the 10 MB limit.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(30);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (familyMemberId) {
      formData.append('familyMemberId', familyMemberId);
    }

    try {
      setUploadProgress(70);
      const newRx = await apiFetch<PrescriptionDTO>('/customer/prescriptions', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(100);
      setIsUploadOpen(false);
      setSelectedFile(null);
      setFamilyMemberId('');
      setPrescriptions((prev) => [newRx, ...prev]);
    } catch (err: unknown) {
      setUploadError((err as Error).message || 'Failed to upload prescription.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePreview = async (id: string, fileName: string, mime: string) => {
    setPreviewFileName(fileName);
    setPreviewMime(mime);
    setPreviewLoading(true);
    setPreviewImageError(false);
    setPreviewUrl(null);
    setPreviewOpen(true);
    try {
      const res = await apiFetch<{ url?: string; viewUrl?: string; exists?: boolean }>(
        `/customer/prescriptions/${id}/preview-url`,
      );
      if (res.exists === false) {
        setPreviewUrl(null);
        setPreviewImageError(true);
      } else {
        setPreviewUrl(res.url || res.viewUrl || null);
      }
    } catch {
      setPreviewUrl(null);
      setPreviewImageError(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await apiFetch(`/customer/prescriptions/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setPrescriptions((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError((err as Error).message || 'Failed to delete prescription.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredPrescriptions = React.useMemo(() => {
    if (!searchQuery.trim()) return prescriptions;
    const q = searchQuery.toLowerCase().trim();
    return prescriptions.filter((rx) => {
      const matchFile = rx.originalFileName?.toLowerCase().includes(q);
      const matchId = rx.id.toLowerCase().includes(q);
      const matchStatus = rx.status.toLowerCase().includes(q);
      const matchFam = familyMembers
        .find((f) => f.id === rx.familyMemberId)
        ?.fullName.toLowerCase()
        .includes(q);
      return matchFile || matchId || matchStatus || matchFam;
    });
  }, [prescriptions, searchQuery, familyMembers]);

  return (
    <div className="max-w-[950px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EBECEF]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Prescriptions</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by file, patient, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-[#EBECEF] bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            onClick={() => {
              setSelectedFile(null);
              setUploadError(null);
              setIsUploadOpen(true);
            }}
            className="text-xs bg-[#0D5C5A] text-white hover:bg-[#0A4846] shrink-0"
          >
            Upload Prescription
          </Button>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="rounded-xl border border-[#EBECEF] bg-[#F0FDFA] p-4 flex items-start gap-3">
        <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-[#0D5C5A]/10 text-[#0D5C5A]">
          INFO
        </span>
        <div className="text-xs text-[#0F172A] leading-relaxed">
          <span className="font-semibold block text-[#0D5C5A] mb-0.5">
            Prescription Verification &amp; Ordering Process
          </span>
          Upload your prescription to begin. Our registered pharmacists verify your prescription, match medicines with our catalogue, and calculate an itemized cost quotation. Once quoted, you can review and pay directly.
        </div>
      </div>

      {/* Prescription List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading prescriptions...</div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <span className="text-xs uppercase font-bold text-red-600 block mb-1">Notice</span>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      ) : filteredPrescriptions.length === 0 ? (
        <Card className="p-12 border-[#EBECEF] bg-white text-center">
          <h3 className="text-base font-semibold text-slate-800">
            {searchQuery ? 'No Matching Prescriptions Found' : 'No Prescriptions Uploaded'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No prescriptions matched "${searchQuery}". Clear your search or upload a new prescription.`
              : `Upload your doctor's prescription (JPEG, PNG, or PDF up to 10 MB) to conveniently order Schedule H or chronic refills.`}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {searchQuery && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="text-xs"
              >
                Clear Search
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="text-xs bg-[#0D5C5A] text-white"
            >
              Upload Prescription
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrescriptions.map((rx) => (
            <Card
              key={rx.id}
              className="border-[#EBECEF] bg-white hover:border-[#0D5C5A]/40 transition-all p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3
                      className="font-bold text-sm text-[#0F172A] truncate max-w-[200px]"
                      title={rx.originalFileName}
                    >
                      {rx.originalFileName}
                    </h3>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {(rx.fileSizeBytes / 1024).toFixed(0)} KB &bull;{' '}
                      {rx.mimeType.split('/')[1]?.toUpperCase()}
                    </span>
                  </div>

                  {rx.quoteStatus === 'ACCEPTED' || rx.orderId ? (
                    <Badge variant="success" className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border-emerald-300">
                      Order Placed
                    </Badge>
                  ) : rx.quoteStatus === 'QUOTED' ? (
                    <Badge variant="success" className="shrink-0 whitespace-nowrap text-[10px] font-semibold bg-[#CCFBF1] text-[#0D5C5A] border-[#99F6E4]">
                      Quote Ready
                    </Badge>
                  ) : rx.status === 'REJECTED' ? (
                    <Badge variant="danger" className="text-[10px] font-semibold">
                      Rejected
                    </Badge>
                  ) : rx.status === 'REUPLOAD_REQUIRED' ? (
                    <Badge variant="warning" className="text-[10px] font-semibold">
                      Reupload Required
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px] font-semibold">
                      Under Review
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Patient:</span>
                    <span className="font-semibold text-slate-800">
                      {rx.familyMember
                        ? `${rx.familyMember.fullName} (${rx.familyMember.relationship})`
                        : 'Self (Account Owner)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Uploaded On:</span>
                    <span className="font-medium text-slate-700">
                      {new Date(rx.uploadedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {rx.totalAmount !== null && rx.totalAmount !== undefined && (
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-400">Quote Amount:</span>
                      <span className="font-bold text-[#0D5C5A]">
                        ₹{Number(rx.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 mt-4">
                <Link href={`/customer/prescriptions/${rx.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2.5 text-[#0D5C5A] bg-[#F0FDFA] border-[#EBECEF] hover:bg-[#CCFBF1] font-semibold"
                  >
                    {rx.quoteStatus === 'QUOTED'
                      ? 'View Quote & Order'
                      : rx.quoteStatus === 'ACCEPTED' || rx.orderId
                      ? 'View Order & Rx'
                      : 'View Details'}
                  </Button>
                </Link>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(rx.id, rx.originalFileName, rx.mimeType)}
                    className="text-xs h-8 px-2.5 text-[#0D5C5A] border-[#0D5C5A]/30 hover:bg-[#F0FDFA]"
                  >
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeleteTarget({ id: rx.id, fileName: rx.originalFileName });
                      setDeleteError(null);
                    }}
                    className="text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0F172A]">
              Upload Doctor&apos;s Prescription
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {uploadError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <span className="font-bold uppercase text-[10px] px-1 py-0.5 bg-red-200 rounded">
                  Error
                </span>
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Whose prescription is this? *
              </label>
              <select
                value={familyMemberId}
                onChange={(e) => setFamilyMemberId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]"
              >
                <option value="">Self (Account Owner)</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.relationship})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Prescription File (JPEG, PNG, PDF up to 10 MB) *
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#0D5C5A] transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="prescriptionFileInput"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="prescriptionFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <span className="text-xs font-semibold text-[#0D5C5A]">
                    {selectedFile ? selectedFile.name : 'Click to select prescription file'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedFile
                      ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB selected`
                      : 'JPEG, PNG or PDF (max 10 pages, 10 MB)'}
                  </span>
                </label>
              </div>
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Uploading securely to MinIO...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#0D5C5A] h-1.5 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full bg-[#0D5C5A] text-white hover:bg-[#0A4846] text-xs h-10 font-semibold"
              >
                {uploading ? 'Securing & Uploading...' : 'Upload Prescription'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Secure Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F172A] truncate">
              Preview: {previewFileName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-2 bg-slate-900/5 rounded-lg flex items-center justify-center min-h-[400px]">
            {previewLoading ? (
              <div className="text-xs text-slate-500">
                Generating secure 5-minute pre-signed link...
              </div>
            ) : previewUrl && !previewImageError ? (
              previewMime.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  title="Prescription PDF"
                  className="w-full h-[550px] rounded border border-slate-200"
                  onError={() => setPreviewImageError(true)}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Prescription Preview"
                  onError={() => setPreviewImageError(true)}
                  className="max-h-[550px] max-w-full object-contain rounded"
                />
              )
            ) : (
              <MissingPrescriptionIllustration
                fileName={previewFileName}
                mimeType={previewMime}
                onReupload={() => {
                  setPreviewOpen(false);
                  setSelectedFile(null);
                  setUploadError(null);
                  setIsUploadOpen(true);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Design-Consistent Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <div className="flex items-start gap-3.5 pt-1">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <DialogTitle className="text-base font-bold text-[#0F172A]">
                Delete Prescription
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="text-slate-900 font-semibold">{deleteTarget?.fileName}</strong>?
                This document will be permanently removed from your account.
              </DialogDescription>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Unable to Delete</span>
                <span>{deleteError}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteLoading}
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              className="text-xs h-9 px-3.5 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              className="text-xs h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Prescription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
