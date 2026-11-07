'use client';

import * as React from 'react';

import { apiFetch, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import type { InventoryImportDTO, InventoryImportRowDTO } from '@pharmacy/shared-types';

interface StoreOption {
  id: string;
  code: string;
  name: string;
  city: string;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  city: string;
}

export default function StockImportsPage() {
  const [imports, setImports] = React.useState<InventoryImportDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Locations for Import Form
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseOption[]>([]);

  // Upload Form State
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadLocation, setUploadLocation] = React.useState<string>(''); // 'STORE:id' | 'WAREHOUSE:id'
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = React.useState<string | null>(null);

  // Import Details Modal
  const [detailsImportId, setDetailsImportId] = React.useState<string | null>(null);
  const [importDetails, setImportDetails] = React.useState<
    (InventoryImportDTO & { rows?: InventoryImportRowDTO[] }) | null
  >(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);

  // Pagination
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  // Load Locations
  React.useEffect(() => {
    async function loadLocations() {
      try {
        const [storesData, warehousesData] = await Promise.all([
          apiFetch<StoreOption[]>('/stores').catch(() => []),
          apiFetch<WarehouseOption[]>('/warehouses').catch(() => []),
        ]);
        setStores(storesData);
        setWarehouses(warehousesData);
        if (storesData.length > 0) {
          setUploadLocation(`STORE:${storesData[0].id}`);
        } else if (warehousesData.length > 0) {
          setUploadLocation(`WAREHOUSE:${warehousesData[0].id}`);
        }
      } catch {
        // Ignored
      }
    }
    loadLocations();
  }, []);

  // Fetch Imports History
  const fetchImports = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        data: InventoryImportDTO[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/inventory/imports?page=${page}&limit=10`);
      setImports(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch import batches.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  // Open Details Modal
  const handleOpenDetails = async (id: string) => {
    setDetailsImportId(id);
    setLoadingDetails(true);
    try {
      const data = await apiFetch<InventoryImportDTO & { rows?: InventoryImportRowDTO[] }>(
        `/inventory/imports/${id}`,
      );
      setImportDetails(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load import details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const sampleContent =
      'sku,quantity,reorderLevel\nMED-MET-500-001,120,20\nMED-TEL-40-001,75,15\nMED-LEV-50-001,42,10\nMED-PAR-500-001,200,30\nMED-ORS-001,50,10\nMED-AMX-500-001,25,10';
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample-stock-import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit CSV Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadLocation) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Only valid .csv files are supported.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5 MB limit.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const [locType, locId] = uploadLocation.split(':');
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('locationType', locType);
    formData.append('locationId', locId);

    try {
      const res = await apiFetch<InventoryImportDTO>('/inventory/imports', {
        method: 'POST',
        body: formData,
      });

      setUploadSuccess(
        `Import batch completed successfully! Applied ${res.appliedRows} stock rows.`,
      );
      setSelectedFile(null);
      setTimeout(() => {
        setIsUploadOpen(false);
        fetchImports();
      }, 1200);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Import failed.';
      setUploadError(msg);
      fetchImports(); // Refresh list to show failed batch if recorded
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#351F65]">Stock Imports</h1>
          <p className="text-[14px] text-[#78879A]">
            Import daily stock data snapshots using all-or-nothing deterministic CSV processing and
            private MinIO storage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-2 text-[13px] border-[#CED4DA] hover:bg-[#F8F9FB]"
          >
            <span>Sample CSV</span>
          </Button>
          <Button
            onClick={() => {
              setUploadError(null);
              setUploadSuccess(null);
              setIsUploadOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-[#6240E8] hover:bg-[#542F9B] text-white"
          >
            <span>Upload CSV</span>
          </Button>
        </div>
      </div>

      {error && <SemanticAlert type="error" title="Import Service Error" description={error} />}

      {/* CSV Policy Information Card */}
      <div className="rounded-[12px] border border-[#B4EDFB] bg-[#EBF9FD] p-4 text-[13px] text-[#0088AA] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-[#0088AA] flex items-center gap-1.5">
            Daily Stock Snapshot Format &amp; Rules
          </p>
          <p className="text-[12px] text-[#0088AA]/90">
            Headers must be exact:{' '}
            <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded font-bold">
              sku,quantity,reorderLevel
            </code>
            . Max size: 5 MB (10,000 rows). All-or-nothing validation ensures that if any row is
            invalid, zero stock changes occur.
          </p>
        </div>
      </div>

      {/* Import History Table */}
      <div className="rounded-[12px] border border-[#EAE8F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#EAE8F0] bg-[#F8F9FB] text-[#78879A] font-semibold">
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Target Location</th>
                <th className="py-3 px-4">Imported By</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Total Rows</th>
                <th className="py-3 px-4 text-right">Applied</th>
                <th className="py-3 px-4 text-right">Rejected</th>
                <th className="py-3 px-4">Imported At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE8F0]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#78879A]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#6240E8] border-t-transparent rounded-full animate-spin" />
                      <span>Loading import batch history...</span>
                    </div>
                  </td>
                </tr>
              ) : imports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#78879A]">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="font-semibold text-[#351F65]">No stock imports recorded</p>
                      <p className="text-[12px]">
                        Click &apos;Upload CSV&apos; above to submit the daily stock snapshot for a
                        store or warehouse.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                imports.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8F9FB]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#14161A]">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[200px]" title={item.fileName}>
                          {item.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#14161A]">
                        <span>{item.locationName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#6C757D]">{item.importedByEmail}</td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F8EC] text-[#0FAC26] border border-[#B0E6BC]">
                          Completed
                        </span>
                      )}
                      {item.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FDF2F2] text-[#DC3545] border border-[#F9CACA]">
                          Failed
                        </span>
                      )}
                      {item.status === 'PROCESSING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF8EC] text-[#A66B16] border border-[#F6DCB0]">
                          Processing
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#14161A]">
                      {item.totalRows}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#0FAC26]">
                      {item.appliedRows}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#DC3545]">
                      {item.rejectedRows}
                    </td>
                    <td className="py-3 px-4 text-[#78879A] text-[12px]">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetails(item.id)}
                        className="h-8 text-[12px] inline-flex items-center gap-1 text-[#351F65]"
                      >
                        <span>Details</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[#EAE8F0] px-4 py-3 text-[13px] text-[#78879A]">
          <div>
            Showing <span className="font-semibold text-[#14161A]">{imports.length}</span> of{' '}
            <span className="font-semibold text-[#14161A]">{total}</span> import batches
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-[12px]"
            >
              Previous
            </Button>
            <span className="px-2 font-medium text-[#351F65]">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-[12px]"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Upload CSV Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[#351F65] text-[18px]">Upload Daily Stock CSV</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {uploadError && (
              <SemanticAlert type="error" title="Import Rejected" description={uploadError} />
            )}

            {uploadSuccess && (
              <SemanticAlert type="success" title="Import Completed" description={uploadSuccess} />
            )}

            <div>
              <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                Target Location <span className="text-[#DC3545]">*</span>
              </label>
              <select
                required
                value={uploadLocation}
                onChange={(e) => setUploadLocation(e.target.value)}
                className="h-[44px] w-full rounded-[8px] border border-[#CED4DA] bg-white px-3 text-[14px] text-[#14161A] focus:outline-none focus:border-[#6240E8]"
              >
                <optgroup label="Central Warehouse">
                  {warehouses.map((w) => (
                    <option key={w.id} value={`WAREHOUSE:${w.id}`}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Pharmacy Stores">
                  {stores.map((s) => (
                    <option key={s.id} value={`STORE:${s.id}`}>
                      {s.name} ({s.code}) - {s.city}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                Select CSV File <span className="text-[#DC3545]">*</span>
              </label>
              <div className="border-2 border-dashed border-[#CED4DA] rounded-[8px] p-4 text-center hover:bg-[#F8F9FB] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      setUploadError(null);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="font-bold text-[#6240E8] text-sm mb-2">[CSV]</div>
                {selectedFile ? (
                  <div>
                    <p className="font-semibold text-[#351F65] text-[13px]">{selectedFile.name}</p>
                    <p className="text-[11px] text-[#78879A]">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-[#351F65] text-[13px]">
                      Click to choose CSV file
                    </p>
                    <p className="text-[11px] text-[#78879A]">or drag & drop here (max 5 MB)</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || !selectedFile}
                className="bg-[#6240E8] hover:bg-[#542F9B] text-white"
              >
                {uploading && (
                  <span className="mr-2 inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Process Stock Import
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Details Dialog */}
      <Dialog
        open={Boolean(detailsImportId)}
        onOpenChange={(open) => !open && setDetailsImportId(null)}
      >
        <DialogContent className="max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="text-[#351F65] text-[18px]">Import Batch Outcome</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-12 text-center text-[#78879A]">
              <div className="w-5 h-5 border-2 border-[#6240E8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading batch records...
            </div>
          ) : importDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[12px] bg-[#F8F9FB] p-3 rounded-[8px] border border-[#EAE8F0]">
                <div>
                  <span className="text-[#78879A]">File:</span>{' '}
                  <span className="font-semibold text-[#14161A] font-mono">
                    {importDetails.fileName}
                  </span>
                </div>
                <div>
                  <span className="text-[#78879A]">Target Location:</span>{' '}
                  <span className="font-semibold text-[#14161A]">{importDetails.locationName}</span>
                </div>
                <div>
                  <span className="text-[#78879A]">Status:</span>{' '}
                  <span
                    className={`font-bold ${
                      importDetails.status === 'COMPLETED' ? 'text-[#0FAC26]' : 'text-[#DC3545]'
                    }`}
                  >
                    {importDetails.status}
                  </span>
                </div>
                <div>
                  <span className="text-[#78879A]">Counts:</span>{' '}
                  <span>
                    Total: <b className="text-[#14161A]">{importDetails.totalRows}</b> | Applied:{' '}
                    <b className="text-[#0FAC26]">{importDetails.appliedRows}</b> | Rejected:{' '}
                    <b className="text-[#DC3545]">{importDetails.rejectedRows}</b>
                  </span>
                </div>
              </div>

              {/* Omitted medicines policy notice */}
              {importDetails.status === 'COMPLETED' && (
                <div className="p-2.5 rounded-[6px] bg-[#E8F8EC] border border-[#B0E6BC] text-[12px] text-[#0FAC26]">
                  Stock snapshot applied successfully. Medicines omitted from this CSV remained
                  untouched.
                </div>
              )}

              {/* Row Outcomes List */}
              {importDetails.rows && importDetails.rows.length > 0 ? (
                <div>
                  <h4 className="text-[12px] font-bold text-[#351F65] mb-2">
                    Row-by-Row Validation Details:
                  </h4>
                  <div className="max-h-[280px] overflow-y-auto border border-[#EAE8F0] rounded-[6px]">
                    <table className="w-full text-left text-[12px] border-collapse">
                      <thead>
                        <tr className="bg-[#F8F9FB] border-b border-[#EAE8F0] text-[#78879A]">
                          <th className="p-2">Row #</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-center">Status</th>
                          <th className="p-2">Message / Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAE8F0]">
                        {importDetails.rows.map((r) => (
                          <tr key={r.id}>
                            <td className="p-2 font-mono text-[#78879A]">{r.rowNumber}</td>
                            <td className="p-2 font-mono font-medium text-[#14161A]">{r.sku}</td>
                            <td className="p-2 text-right">{r.quantity ?? '—'}</td>
                            <td className="p-2 text-center">
                              {r.status === 'APPLIED' ? (
                                <span className="text-[#0FAC26] font-semibold text-[11px]">
                                  Applied
                                </span>
                              ) : (
                                <span className="text-[#DC3545] font-semibold text-[11px]">
                                  Rejected
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-[#DC3545] text-[11px]">
                              {r.errorMessage || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsImportId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
