'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import {
  ShieldCheck,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Archive,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export default function ComplianceRuleSetsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ruleSets, setRuleSets] = React.useState<any[]>([]);

  // Create Version Modal
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [newVersion, setNewVersion] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const [newDescription, setNewDescription] = React.useState('');
  const [createLoading, setCreateLoading] = React.useState(false);

  const fetchRuleSets = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any[]>('/compliance/rule-sets');
      setRuleSets(res || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load compliance rule sets.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRuleSets();
  }, [fetchRuleSets]);

  const handleCreate = async () => {
    if (!newVersion.trim() || !newName.trim()) return;

    try {
      setCreateLoading(true);
      setError(null);
      await apiFetch('/compliance/rule-sets', {
        method: 'POST',
        body: JSON.stringify({
          version: newVersion.trim(),
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      });

      setCreateModalOpen(false);
      setNewVersion('');
      setNewName('');
      setNewDescription('');
      await fetchRuleSets();
    } catch (err: any) {
      setError(err?.message || 'Failed to create compliance rule set.');
    } finally {
      setCreateLoading(false);
    }
  };

  const isComplianceAdmin = user?.role === 'COMPLIANCE_ADMIN';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> DRAFT
          </span>
        );
      case 'SUPERSEDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Archive className="w-3 h-3" /> SUPERSEDED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/compliance"
              className="p-1 rounded-lg text-[#78879A] hover:bg-[#F8F9FB] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-[#14161A] tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#6240E8]" />
              Versioned Compliance Rule Sets
            </h1>
          </div>
          <p className="text-sm text-[#78879A] mt-1">
            PostgreSQL versioned policy definitions for deterministic medicine schedule
            verification.
          </p>
        </div>

        {isComplianceAdmin ? (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#6240E8] text-white hover:bg-[#5230D8] transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Version</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-[#78879A]">
            <Lock className="w-3.5 h-3.5" /> Read-Only (Admin)
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#EAE8F0] p-12 text-center shadow-2xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#6240E8] border-t-transparent" />
          <p className="text-xs text-[#78879A] mt-3">Loading compliance policy versions...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EAE8F0] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EAE8F0] bg-[#F8F9FB] text-[#78879A] font-semibold">
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Policy Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE8F0]">
                {ruleSets.map((rs) => (
                  <tr key={rs.id} className="hover:bg-[#F7F5FD]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#351F65]">v{rs.version}</td>
                    <td className="py-3 px-4 font-medium text-[#14161A]">
                      <div>{rs.name}</div>
                      {rs.description && (
                        <div className="text-[11px] text-[#78879A] truncate max-w-sm">
                          {rs.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(rs.status)}</td>
                    <td className="py-3 px-4 text-[#78879A]">
                      {rs.effectiveFrom ? new Date(rs.effectiveFrom).toLocaleDateString() : 'Draft'}
                    </td>
                    <td className="py-3 px-4 text-[#78879A]">
                      {rs.createdByUser?.email || 'Compliance Admin'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/compliance/rules/${rs.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F7F5FD] text-[#6240E8] hover:bg-[#6240E8] hover:text-white transition-colors"
                      >
                        <span>View Rules</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Version Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EAE8F0] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#14161A] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#6240E8]" />
              Create Compliance Policy Draft
            </h3>
            <p className="text-xs text-[#78879A]">
              New versions are created in DRAFT state. You can customize schedule rules before
              activating.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#351F65] mb-1">SemVer Version *</label>
                <input
                  type="text"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="e.g. 1.1.0"
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE8F0] text-xs focus:ring-2 focus:ring-[#6240E8]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#351F65] mb-1">Policy Set Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Updated Monsoon Schedule Policy"
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE8F0] text-xs focus:ring-2 focus:ring-[#6240E8]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#351F65] mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Revised Schedule H1 retention requirements..."
                  className="w-full p-2.5 rounded-lg border border-[#EAE8F0] text-xs focus:ring-2 focus:ring-[#6240E8]/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE8F0]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading || !newVersion.trim() || !newName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#6240E8] text-white hover:bg-[#5230D8] disabled:opacity-50"
              >
                <span>Create Draft Version</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
