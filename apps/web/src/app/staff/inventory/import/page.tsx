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
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface SchemaValidationError {
  rowNumber: number;
  sku: string;
  message: string;
}

interface SchemaValidationRow {
  rowNumber: number;
  sku: string;
  quantity?: string;
  reorderLevel?: string;
  status: 'VALID' | 'INVALID';
  message?: string;
}

interface SchemaCheckState {
  checked: boolean;
  valid: boolean;
  totalRows: number;
  validCount: number;
  errorCount: number;
  errors: SchemaValidationError[];
  rows: SchemaValidationRow[];
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
  const [totalRowsCount, setTotalRowsCount] = React.useState<number>(0);
  const [checkingSchema, setCheckingSchema] = React.useState(false);
  const [schemaState, setSchemaState] = React.useState<SchemaCheckState | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<UploadOutcome | null>(null);

  const store = user?.store;
  const storeId = store?.id;

  const checkCsvSchema = React.useCallback(
    async (selectedFile: File) => {
      if (!storeId) {
        setError('Store profile not identified. Contact administrator.');
        return;
      }

      try {
        setCheckingSchema(true);
        setSchemaState(null);
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('locationType', 'STORE');
        formData.append('locationId', storeId);

        const res = await apiFetch<SchemaCheckState>('/inventory/imports/validate', {
          method: 'POST',
          body: formData,
        });

        setSchemaState({
          checked: true,
          valid: res.valid,
          totalRows: res.totalRows,
          validCount: res.validCount,
          errorCount: res.errorCount,
          errors: res.errors || [],
          rows: res.rows || [],
        });
        setTotalRowsCount(res.totalRows);
      } catch (err: any) {
        setSchemaState({
          checked: true,
          valid: false,
          totalRows: 0,
          validCount: 0,
          errorCount: 1,
          errors: [
            {
              rowNumber: 1,
              sku: 'SCHEMA',
              message: err?.message || 'Failed to check CSV schema. Ensure valid 3-column header: sku,quantity,reorderLevel',
            },
          ],
          rows: [],
        });
      } finally {
        setCheckingSchema(false);
      }
    },
    [storeId],
  );

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
    checkCsvSchema(selected);
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
    if (!schemaState || !schemaState.valid) {
      setError('CSV schema must be checked and pass validation before processing.');
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
      setSchemaState(null);
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
              Upload daily physical store stock counts. The system checks CSV schema first, then processes inventory.
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
                Daily Inventory Processed &amp; Applied Successfully!
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

        {/* General Error Alert */}
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
                <span>Step 1: Select CSV File to Validate Schema</span>
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
                      {(file.size / 1024).toFixed(1)} KB &bull; {totalRowsCount > 0 ? `${totalRowsCount} rows` : 'Reading file...'}
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
                      Expected 3-column schema: <code className="font-mono text-amber-800 font-semibold">sku,quantity,reorderLevel</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Schema Checking Indicator */}
              {checkingSchema && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-900">
                  <RefreshCw className="w-4 h-4 text-amber-700 animate-spin shrink-0" />
                  <div>
                    <span className="font-bold block">Validating CSV Schema...</span>
                    <span className="text-amber-800 text-[11px]">
                      Checking column headers, integer formats, duplicates, and catalogue SKU existence before processing.
                    </span>
                  </div>
                </div>
              )}

              {/* Schema Validation Outcome Card */}
              {schemaState && !checkingSchema && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-3 ${
                    schemaState.valid
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                      : 'border-rose-300 bg-rose-50 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      {schemaState.valid ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>CSV Schema Check Passed ({schemaState.totalRows} valid rows)</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                          <span>CSV Schema Check Failed ({schemaState.errorCount} error(s) found)</span>
                        </>
                      )}
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        schemaState.valid
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {schemaState.valid ? 'Ready to Process' : 'Processing Blocked'}
                    </span>
                  </div>

                  {schemaState.valid ? (
                    <p className="text-[11px] text-emerald-800">
                      ✓ Headers match <code className="font-mono">sku,quantity,reorderLevel</code>. All row values are valid non-negative integers, no duplicates were detected, and all SKUs belong to active catalogue medicines.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-rose-800 font-medium">
                        The CSV schema is invalid. No database changes were made. Please correct the following row errors and re-upload:
                      </p>
                      <div className="max-h-44 overflow-y-auto border border-rose-200 rounded-lg bg-white p-2 divide-y divide-rose-100">
                        {schemaState.errors.map((err, idx) => (
                          <div
                            key={idx}
                            className="py-1.5 px-2 text-rose-900 font-mono text-[11px] flex items-center justify-between"
                          >
                            <span>
                              <strong>Row {err.rowNumber}:</strong> {err.message}
                            </span>
                            <span className="text-slate-400 font-sans text-[10px]">
                              SKU: {err.sku}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rows Preview Table */}
              {schemaState && schemaState.rows.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Validated File Preview ({schemaState.totalRows} total rows)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Showing first {schemaState.rows.length} rows
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Catalogue SKU</th>
                          <th className="py-2 px-3">Quantity</th>
                          <th className="py-2 px-3">Reorder Level</th>
                          <th className="py-2 px-3">Schema Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {schemaState.rows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={row.status === 'VALID' ? 'hover:bg-slate-50' : 'bg-rose-50/50'}
                          >
                            <td className="py-1.5 px-3 text-slate-400 font-sans">{row.rowNumber}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">{row.sku}</td>
                            <td className="py-1.5 px-3 text-emerald-700 font-bold">{row.quantity}</td>
                            <td className="py-1.5 px-3 text-slate-600">{row.reorderLevel}</td>
                            <td className="py-1.5 px-3 font-sans">
                              {row.status === 'VALID' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  VALID
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800"
                                  title={row.message}
                                >
                                  INVALID
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 2: Submit Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-[11px] text-slate-500">
                  {schemaState?.valid ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Schema check passed. Ready to process into inventory.
                    </span>
                  ) : file ? (
                    <span className="text-amber-800 font-medium">
                      CSV schema must pass validation before processing.
                    </span>
                  ) : (
                    <span>Please select a CSV file to check schema.</span>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!file || !schemaState?.valid || checkingSchema || uploading}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold h-10 px-6 text-xs gap-2 shadow-xs cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Inventory...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Process &amp; Inject into {store?.name || 'Store'}</span>
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
