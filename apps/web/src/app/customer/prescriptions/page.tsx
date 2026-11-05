'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/client';
import {
  FileText,
  Upload,
  Eye,
  Trash2,
  AlertCircle,
  Clock,
  User,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { PrescriptionDTO, FamilyMemberDTO } from '@pharmacy/shared-types';

export default function CustomerPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionDTO[]>([]);
  const [familyMembers, setFamilyMembers] = React.useState<FamilyMemberDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
      setUploadError(null);
      setSelectedFile(file);
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
      await apiFetch('/customer/prescriptions', {
        method: 'POST',
        body: formData,
      });
      setUploadProgress(100);
      setIsUploadOpen(false);
      setSelectedFile(null);
      setFamilyMemberId('');
      await loadData();
    } catch (err: unknown) {
      setUploadError((err as Error).message || 'Failed to upload prescription.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePreview = async (rxId: string, fileName: string, mime: string) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewFileName(fileName);
    setPreviewMime(mime);
    setPreviewUrl(null);

    try {
      const res = await apiFetch<{ viewUrl: string }>(`/customer/prescriptions/${rxId}/file`);
      setPreviewUrl(res.viewUrl);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to generate secure preview URL.');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prescription?')) return;
    try {
      await apiFetch(`/customer/prescriptions/${id}`, {
        method: 'DELETE',
      });
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Prescriptions linked to placed orders cannot be deleted.');
    }
  };

  return (
    <div className="max-w-[950px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">
            Prescriptions
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Securely uploaded medical prescriptions stored privately for you and your family.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedFile(null);
            setUploadError(null);
            setIsUploadOpen(true);
          }}
          className="flex items-center gap-1.5 text-xs bg-[#6240E8] text-white hover:bg-[#5233D0]"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Prescription</span>
        </Button>
      </div>

      {/* Compliance Notice */}
      <div className="rounded-xl border border-[#D6D1F7] bg-[#F7F5FD] p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-[#6240E8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#351F65] leading-relaxed">
          <span className="font-semibold block text-[#6240E8] mb-0.5">
            Prescription Verification Process
          </span>
          Uploaded prescriptions remain in status <strong className="text-amber-700">Uploaded — awaiting pharmacist review</strong> until attached to an order and reviewed by a registered pharmacist at our Kolkata/Howrah fulfillment hubs.
        </div>
      </div>

      {/* Prescription List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading prescriptions...
        </div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      ) : prescriptions.length === 0 ? (
        <Card className="p-12 border-[#EAE8F0] bg-white text-center">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Prescriptions Uploaded</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload your doctor&apos;s prescription (JPEG, PNG, or PDF up to 10 MB) to conveniently order Schedule H or chronic refills.
          </p>
          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="mt-4 text-xs bg-[#6240E8] text-white"
          >
            Upload Prescription
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => (
            <Card
              key={rx.id}
              className="border-[#EAE8F0] bg-white hover:border-[#6240E8]/40 transition-all p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-lg bg-[#F7F5FD] flex items-center justify-center text-[#6240E8] shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#351F65] truncate max-w-[200px]" title={rx.originalFileName}>
                        {rx.originalFileName}
                      </h3>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        {(rx.fileSizeBytes / 1024).toFixed(0)} KB &bull; {rx.mimeType.split('/')[1]?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <Badge variant="warning" className="text-[10px] font-semibold">
                    Awaiting Review
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Patient:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <User className="h-3 w-3 text-[#6240E8]" />
                      {rx.familyMember ? `${rx.familyMember.fullName} (${rx.familyMember.relationship})` : 'Self (Account Owner)'}
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
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 mt-4">
                <Link href={`/customer/prescriptions/${rx.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2.5 text-purple-700 bg-purple-50/70 border-purple-200 hover:bg-purple-100"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-600" />
                    AI Draft
                  </Button>
                </Link>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(rx.id, rx.originalFileName, rx.mimeType)}
                    className="text-xs h-8 px-2.5 text-[#6240E8] border-[#6240E8]/30 hover:bg-[#F7F5FD]"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(rx.id)}
                    className="text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
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
            <DialogTitle className="text-lg font-bold text-[#351F65]">
              Upload Doctor&apos;s Prescription
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {uploadError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Whose prescription is this? *</label>
              <select
                value={familyMemberId}
                onChange={(e) => setFamilyMemberId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6240E8]"
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
              <label className="text-xs font-semibold text-slate-700">Prescription File (JPEG, PNG, PDF up to 10 MB) *</label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#6240E8] transition-colors bg-slate-50/50">
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
                  <Upload className="h-8 w-8 text-[#6240E8]" />
                  <span className="text-xs font-semibold text-[#6240E8]">
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
                    className="bg-[#6240E8] h-1.5 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full bg-[#6240E8] text-white hover:bg-[#5233D0] text-xs h-10 font-semibold"
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
            <DialogTitle className="text-base font-bold text-[#351F65] truncate">
              Preview: {previewFileName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-2 bg-slate-900/5 rounded-lg flex items-center justify-center min-h-[400px]">
            {previewLoading ? (
              <div className="text-xs text-slate-500">Generating secure 5-minute pre-signed link...</div>
            ) : previewUrl ? (
              previewMime.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  title="Prescription PDF"
                  className="w-full h-[550px] rounded border border-slate-200"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Prescription Preview"
                  className="max-h-[550px] max-w-full object-contain rounded"
                />
              )
            ) : (
              <div className="text-xs text-red-500">Failed to render prescription preview.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
