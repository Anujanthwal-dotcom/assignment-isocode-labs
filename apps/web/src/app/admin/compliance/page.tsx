'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

export default function ComplianceOverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [overview, setOverview] = React.useState<any | null>(null);

  const fetchOverview = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>('/compliance/overview');
      setOverview(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load compliance overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBECEF]">
        <div>
          <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">
            Compliance Policy Administration
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Deterministic pharmacy regulatory rules, Schedule H1 registers, and audit verification
            history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]">
            Role: {user?.role}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <span className="font-bold">[!]</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#0D5C5A] border-t-transparent" />
          <p className="text-xs text-[#78879A] mt-3">Loading compliance overview...</p>
        </div>
      ) : overview ? (
        <div className="space-y-6">
          {/* Quick Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[#EBECEF] p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-[#78879A]">Active Policy Version</span>
              <div className="text-lg font-bold text-[#0F172A]">
                {overview.activeRuleSet ? `v${overview.activeRuleSet.version}` : 'None'}
              </div>
              <span className="text-[11px] text-[#6C757D] block truncate">
                {overview.activeRuleSet?.name || 'No active policy'}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-[#EBECEF] p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-[#78879A]">Total Rule Versions</span>
              <div className="text-lg font-bold text-[#14161A]">{overview.totalRuleSets}</div>
              <span className="text-[11px] text-[#6C757D]">Stored in PostgreSQL</span>
            </div>

            <div className="bg-white rounded-xl border border-[#EBECEF] p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-[#78879A]">Blocked Item Reviews</span>
              <div className="text-lg font-bold text-rose-600">
                {overview.blockedItemReviewsCount}
              </div>
              <span className="text-[11px] text-[#6C757D]">Hard compliance blocks</span>
            </div>

            <div className="bg-white rounded-xl border border-[#EBECEF] p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-[#78879A]">H1 Register Entries</span>
              <div className="text-lg font-bold text-[#0D5C5A]">{overview.h1RegisterCount}</div>
              <span className="text-[11px] text-[#6C757D]">Schedule H1 logged</span>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/compliance/rules"
              className="bg-white rounded-xl border border-[#EBECEF] p-5 shadow-2xs hover:border-[#0D5C5A] transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#0D5C5A]">[Policy]</span>
                <span className="text-[#78879A] group-hover:text-[#0D5C5A] group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#14161A]">Policy Rule Sets</h3>
              <p className="text-xs text-[#78879A] mt-1">
                View version history, create draft policies, and activate versioned rules.
              </p>
            </Link>

            <Link
              href="/admin/compliance/decisions"
              className="bg-white rounded-xl border border-[#EBECEF] p-5 shadow-2xs hover:border-[#0D5C5A] transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#0D5C5A]">[Audit]</span>
                <span className="text-[#78879A] group-hover:text-[#0D5C5A] group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#14161A]">Compliance Decisions Audit</h3>
              <p className="text-xs text-[#78879A] mt-1">
                Inspect immutable snapshots of deterministic evaluations made on reviewed orders.
              </p>
            </Link>

            <Link
              href="/admin/compliance/h1-register"
              className="bg-white rounded-xl border border-[#EBECEF] p-5 shadow-2xs hover:border-[#0D5C5A] transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#0D5C5A]">[H1 Log]</span>
                <span className="text-[#78879A] group-hover:text-[#0D5C5A] group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#14161A]">Schedule H1 Register</h3>
              <p className="text-xs text-[#78879A] mt-1">
                Statutory patient and prescriber doctor entries recorded across all stores.
              </p>
            </Link>
          </div>

          {/* Recent Blocked Items Report */}
          {overview.recentBlockedItems?.length > 0 && (
            <div className="bg-white rounded-xl border border-[#EBECEF] p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#14161A]">Recent Hard-Blocked Items</h3>
              <div className="divide-y divide-[#EBECEF] text-xs">
                {overview.recentBlockedItems.map((item: any) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div>
                      <strong className="text-[#14161A]">{item.medicineName}</strong>
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {item.schedule}
                      </span>
                      <span className="ml-2 text-[#78879A]">Order: {item.orderNumber}</span>
                    </div>
                    <span className="text-[#78879A] text-[11px] truncate max-w-xs">
                      {item.decisionReason || 'Blocked by compliance policy'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
