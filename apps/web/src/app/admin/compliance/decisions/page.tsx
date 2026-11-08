'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/api/client';
import { BackButton } from '@/components/shared/BackButton';

export default function AdminComplianceDecisionsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [decisions, setDecisions] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const fetchDecisions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>('/compliance/decisions?limit=50');
      setDecisions(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load compliance decision audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const filteredDecisions = decisions.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.orderNumber?.toLowerCase().includes(q) ||
      d.medicineName?.toLowerCase().includes(q) ||
      d.schedule?.toLowerCase().includes(q) ||
      d.decision?.toLowerCase().includes(q) ||
      d.pharmacistEmail?.toLowerCase().includes(q)
    );
  });

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'ALLOWED_FOR_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ Allowed for Review
          </span>
        );
      case 'REQUIRES_PRESCRIPTION':
      case 'REQUIRES_PHARMACIST_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            Pharmacist Approval Required
          </span>
        );
      case 'REQUIRES_H1_REGISTER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]">
            Requires H1 Register
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            ✕ Hard Blocked
          </span>
        );
      case 'UNKNOWN_CLASSIFICATION':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
            ! Fail Closed
          </span>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <div className="flex flex-col items-start gap-3">
            <BackButton href="/admin/compliance" label="Compliance Overview" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
              Compliance Decision Audit Log
            </h1>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search by order #, medicine, schedule or decision..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#EBECEF] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            Loading compliance decision history...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50">
            <div className="font-bold mb-1">[!] Error</div>
            {error}
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#78879A]">
            No compliance decisions logged yet. Decisions are snapshot deterministically during
            pharmacist item verification.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Evaluation Timestamp</th>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Medicine</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4">Deterministic Decision</th>
                  <th className="py-3.5 px-4">Rule Reasons</th>
                  <th className="py-3.5 px-4">Item Status</th>
                  <th className="py-3.5 px-4">Pharmacist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF] text-[#14161A]">
                {filteredDecisions.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8F9FB]/50">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#78879A]">
                      {new Date(row.evaluatedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0D5C5A]">
                      {row.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#14161A] block">{row.medicineName}</span>
                      <span className="text-[10px] text-[#78879A] font-mono">{row.sku}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {row.schedule}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getDecisionBadge(row.decision)}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {row.reasons && row.reasons.length > 0 ? (
                        <ul className="list-disc list-inside text-[11px] text-[#78879A] space-y-0.5">
                          {row.reasons.map((r: string, idx: number) => (
                            <li key={idx} className="truncate" title={r}>
                              {r}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[#78879A] italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[11px]">{row.status}</td>
                    <td className="py-3.5 px-4 text-[#78879A] text-[11px]">
                      {row.pharmacistEmail || '—'}
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
