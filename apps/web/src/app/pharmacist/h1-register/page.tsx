'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

export default function PharmacistH1RegisterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<any[]>([]);

  const fetchH1Register = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Backend /compliance/h1-register supports storeId query
      const storeId = user?.store?.id;
      const url = storeId
        ? `/compliance/h1-register?storeId=${storeId}`
        : '/compliance/h1-register';

      const res = await apiFetch<any>(url);
      setEntries(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load store Schedule H1 register entries.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchH1Register();
  }, [fetchH1Register]);

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
      <div className="pb-2 border-b border-[#EBECEF]">
        <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">
          Schedule H1 Drug Register
        </h1>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#0D5C5A] border-t-transparent" />
          <p className="text-xs text-[#78879A] mt-3">Loading H1 register entries...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <span className="font-bold uppercase text-[10px] px-1 py-0.5 bg-rose-200 rounded">
            Error
          </span>
          <span>{error}</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs space-y-3">
          <h3 className="text-sm font-semibold text-[#14161A]">No H1 Entries Yet</h3>
          <p className="text-xs text-[#78879A] max-w-sm mx-auto">
            Schedule H1 entries will appear here automatically when pharmacists verify and approve
            Schedule H1 items.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EBECEF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EBECEF] bg-[#F8F9FB] text-[#78879A] font-semibold">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Prescribing Doctor</th>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Pharmacist</th>
                  <th className="py-3 px-4">Register Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#F0FDFA]/50 transition-colors">
                    <td className="py-3 px-4 text-[#78879A]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#14161A]">{entry.patientName}</td>
                    <td className="py-3 px-4 text-[#0F172A]">
                      <div>{entry.prescriberName}</div>
                      {entry.prescriberDetails && (
                        <div className="text-[10px] text-[#78879A]">{entry.prescriberDetails}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#14161A]">{entry.medicineName}</td>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{entry.quantity}</td>
                    <td className="py-3 px-4 text-[#78879A]">
                      {entry.pharmacistEmail || 'Registered Pharmacist'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
