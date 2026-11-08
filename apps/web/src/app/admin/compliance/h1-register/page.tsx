'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/api/client';
import { BackButton } from '@/components/shared/BackButton';

interface StoreDTO {
  id: string;
  name: string;
  code: string;
}

export default function AdminH1RegisterPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<StoreDTO[]>([]);
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState('');

  const fetchStores = React.useCallback(async () => {
    try {
      const res = await apiFetch<StoreDTO[]>('/stores');
      setStores(res || []);
    } catch {
      // Non-critical if stores endpoint fails
    }
  }, []);

  const fetchH1Register = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedStoreId) {
        params.append('storeId', selectedStoreId);
      }
      params.append('limit', '50');

      const url = `/compliance/h1-register?${params.toString()}`;
      const res = await apiFetch<any>(url);
      setEntries(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Schedule H1 platform register entries.');
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  React.useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  React.useEffect(() => {
    fetchH1Register();
  }, [fetchH1Register]);

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.patientName?.toLowerCase().includes(q) ||
      e.prescriberName?.toLowerCase().includes(q) ||
      e.medicineName?.toLowerCase().includes(q) ||
      e.storeName?.toLowerCase().includes(q) ||
      e.storeCode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <div className="flex flex-col items-start gap-3">
            <BackButton href="/admin/compliance" label="Compliance Overview" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
              Platform Schedule H1 Drug Register
            </h1>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by patient, prescriber, medicine or store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
          />
        </div>
        {stores.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#78879A] font-semibold">Store:</span>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="px-3 py-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
            >
              <option value="">All Fulfillment Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#EBECEF] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            Loading Schedule H1 statutory records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50">
            <div className="font-bold mb-1">[!] Error</div>
            {error}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            No Schedule H1 register entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4">Store</th>
                  <th className="py-3.5 px-4">Patient Name</th>
                  <th className="py-3.5 px-4">Prescriber / Clinic</th>
                  <th className="py-3.5 px-4">Medicine Name</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Verifying Pharmacist</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF] text-[#14161A]">
                {filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8F9FB]/50">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#78879A]">
                      {new Date(row.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#14161A] block">{row.storeName}</span>
                      <span className="text-[10px] text-[#78879A] font-mono">{row.storeCode}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#14161A]">{row.patientName}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#14161A]">{row.prescriberName}</div>
                      {row.prescriberDetails && (
                        <div className="text-[10px] text-[#78879A] truncate max-w-[200px]">
                          {row.prescriberDetails}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0D5C5A]">{row.medicineName}</td>
                    <td className="py-3.5 px-4 font-bold">{row.quantity} units</td>
                    <td className="py-3.5 px-4 text-[#78879A]">{row.pharmacistEmail}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
