'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { StaffShell } from '@/components/staff/StaffShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Store,
  RefreshCw,
  FileCheck,
  ArrowRight,
} from 'lucide-react';

interface PreviewRow {
  sku: string;
  quantity: string;
  reorderLevel: string;
}

interface UploadOutcome {
  id: string;
  status: string;
  totalRows: number;
  appliedRows: number;
  rejectedRows: number;
  locationName: string;
}

export default function DailyCsvInjectionPage() {
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [previewRows, setPreviewRows] = React.useState<PreviewRow[]>([]);
  const [totalRowsCount, setTotalRowsCount] = React.useState<number>(0);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<UploadOutcome | null>(null);

  const store = user?.store;
  const storeId = store?.id;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setOutcome(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid CSV file (.csv).');
      return;
    }

    setFile(selected);

    // Client-side quick parse for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setError('CSV file appears empty or missing data rows.');
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
      const expected = ['sku', 'quantity', 'reorderlevel'];
      const matches =
        headers.length >= 3 &&
        headers[0] === expected[0] &&
        headers[1] === expected[1] &&
        headers[2] === expected[2];

      if (!matches) {
        setError(
          `Invalid CSV headers. Expected: 'sku,quantity,reorderLevel'. Found: '${lines[0]}'`,
        );
        return;
      }

      const parsed: PreviewRow[] = [];
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          parsed.push({
            sku: parts[0],
            quantity: parts[1],
            reorderLevel: parts[2],
          });
        }
      }

      setTotalRowsCount(lines.length - 1);
      setPreviewRows(parsed);
    };

    reader.readAsText(selected);
  };

  const handleDownloadTemplate = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const token = localStorage.getItem('access_token');

      const url = `${apiUrl}/inventory/imports/template/catalogue-csv${
        storeId ? `?storeId=${storeId}` : ''
      }`;

      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to generate template CSV');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `inventory-${store?.code || 'store'}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setError(err?.message || 'Could not download template CSV.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to inject.');
      return;
    }
    if (!storeId) {
      setError('Store profile not identified. Contact administrator.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setOutcome(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('locationType', 'STORE');
      formData.append('locationId', storeId);

      const res = await apiFetch<UploadOutcome>('/inventory/imports', {
        method: 'POST',
        body: formData,
      });

      setOutcome(res);
      setFile(null);
      setPreviewRows([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to inject inventory CSV.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <StaffShell pageContext="Daily CSV Inventory Injection">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200/60">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Daily CSV Inventory Injection
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Upload daily physical store stock counts to keep the automated fulfillment router synchronized.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="border-amber-300 text-amber-900 hover:bg-amber-50 h-9 text-xs font-semibold gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>Download Store Template (.csv)</span>
          </Button>
        </div>

        {/* Store Boundary Guard Notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs flex items-start gap-3 shadow-2xs">
          <Store className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-950 block">
              Target Store Locked: {store?.name || 'Retail Store'} ({store?.code || 'STORE'})
            </span>
            <p className="text-amber-800 leading-relaxed">
              Store staff access is strictly scoped. All inventory batches and quantities injected here will update
              on-hand balances exclusively for <strong>{store?.name}</strong>.
            </p>
          </div>
        </div>

        {/* Success Confirmation Banner */}
        {outcome && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2 className="text-sm font-bold text-emerald-950">
                Daily Inventory Injected Successfully!
              </h2>
            </div>
            <div className="text-xs text-emerald-900 space-y-1 pl-7.5">
              <p>
                Target Hub: <strong>{outcome.locationName}</strong> &bull; Total Rows:{' '}
                <strong>{outcome.totalRows}</strong> &bull; Applied:{' '}
                <strong className="text-emerald-700">{outcome.appliedRows}</strong>
              </p>
              <p className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                ✓ Live stock balances have been updated. The nearest-location auto-routing engine will immediately use
                these counts for customer prescription fulfillments.
              </p>
            </div>
            <div className="pl-7.5 pt-2 flex items-center gap-3">
              <Link
                href="/staff/inventory"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline"
              >
                <span>View Updated Store Balances</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-700" />
                <span>Select or Drag Store CSV File</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Dropzone Container */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  file
                    ? 'border-amber-400 bg-amber-50/40'
                    : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileCheck className="w-10 h-10 text-amber-600" />
                    <p className="text-sm font-bold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {(file.size / 1024).toFixed(1)} KB &bull; {totalRowsCount} rows identified
                    </p>
                    <span className="text-[11px] text-amber-700 font-semibold underline mt-1">
                      Click to choose another file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-2">
                      Drop today&apos;s store CSV here, or click to browse
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Expected columns: <code className="font-mono text-amber-800 font-semibold">sku,quantity,reorderLevel</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Client-Side Preview Table (First 10 Rows) */}
              {previewRows.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      File Preview ({totalRowsCount} total rows)
                    </span>
                    <span className="text-[11px] text-slate-500">Showing first {previewRows.length} rows</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Catalogue SKU</th>
                          <th className="py-2 px-3">Quantity on Hand</th>
                          <th className="py-2 px-3">Reorder Threshold</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-slate-400 font-sans">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">{row.sku}</td>
                            <td className="py-1.5 px-3 text-emerald-700 font-bold">{row.quantity}</td>
                            <td className="py-1.5 px-3 text-slate-600">{row.reorderLevel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!file || uploading}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-6 text-xs gap-2 shadow-xs cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Injecting Inventory...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Inject CSV into {store?.name || 'Store'}</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </StaffShell>
  );
}
