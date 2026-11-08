'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { BackButton } from '@/components/shared/BackButton';

export default function ComplianceRuleSetDetailPage() {
  const params = useParams();
  const ruleSetId = params?.ruleSetId as string;
  const { user } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [ruleSet, setRuleSet] = React.useState<any | null>(null);

  // Activate Modal state
  const [activateModalOpen, setActivateModalOpen] = React.useState(false);
  const [activationReason, setActivationReason] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchRuleSet = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(`/compliance/rule-sets/${ruleSetId}`);
      setRuleSet(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load rule set details.');
    } finally {
      setLoading(false);
    }
  }, [ruleSetId]);

  React.useEffect(() => {
    if (ruleSetId) {
      fetchRuleSet();
    }
  }, [ruleSetId, fetchRuleSet]);

  const isDraft = ruleSet?.status === 'DRAFT';

  const handleActivate = async () => {
    if (!activationReason.trim()) return;

    try {
      setActionLoading(true);
      setError(null);
      await apiFetch(`/compliance/rule-sets/${ruleSetId}/activate`, {
        method: 'POST',
        body: JSON.stringify({ reason: activationReason.trim() }),
      });

      setActivateModalOpen(false);
      setActivationReason('');
      setSuccessMessage('Compliance rule set activated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchRuleSet();
    } catch (err: any) {
      setError(err?.message || 'Failed to activate rule set.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <div className="flex flex-col items-start gap-3">
            <BackButton href="/admin/compliance/rules" label="Rule Sets" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px] flex items-center gap-2">
              {ruleSet?.name || 'Rule Set Detail'}
              {ruleSet && (
                <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]">
                  v{ruleSet.version}
                </span>
              )}
            </h1>
          </div>
        </div>

        {isDraft && (
          <button
            onClick={() => setActivateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
          >
            <span>Activate Version</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <span className="font-bold">[!]</span>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <span className="font-bold">✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {!isDraft && (
        <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
          <span className="font-bold">[Locked]</span>
          <span>
            This version is <strong>{ruleSet?.status}</strong>. In compliance mode, active and
            superseded rule sets cannot be modified in place. To change policies, create a new draft
            version.
          </span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#0D5C5A] border-t-transparent" />
          <p className="text-xs text-[#78879A] mt-3">Loading rule set details...</p>
        </div>
      ) : ruleSet ? (
        <div className="space-y-8">
          {/* Rules Table */}
          <div className="bg-white rounded-xl border border-[#EBECEF] shadow-2xs overflow-hidden">
            <div className="p-4 bg-[#F8F9FB] border-b border-[#EBECEF]">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Medicine Schedule Compliance Rules ({ruleSet.rules?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EBECEF] bg-[#F8F9FB] text-[#78879A] font-semibold">
                    <th className="py-3.5 px-4">Schedule</th>
                    <th className="py-3.5 px-4">Policy Action</th>
                    <th className="py-3.5 px-4">Requires Rx</th>
                    <th className="py-3.5 px-4">Pharmacist Review</th>
                    <th className="py-3.5 px-4">Requires H1 Register</th>
                    <th className="py-3.5 px-4">Hard Blocked</th>
                    <th className="py-3.5 px-4">Policy Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBECEF]">
                  {ruleSet.rules?.map((rule: any) => (
                    <tr key={rule.id} className="hover:bg-[#F0FDFA]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#14161A]">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rule.medicineSchedule === 'OTC'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : rule.medicineSchedule === 'SCHEDULE_H'
                                ? 'bg-[#F0FDFA] text-[#0D5C5A] border border-[#EBECEF]'
                                : rule.medicineSchedule === 'SCHEDULE_H1'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {rule.medicineSchedule}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-[#0F172A]">
                        {rule.policyAction}
                      </td>
                      <td className="py-3.5 px-4">
                        {rule.requiresPrescription ? (
                          <span className="text-[#0D5C5A] font-semibold">Yes</span>
                        ) : (
                          <span className="text-[#78879A]">No</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {rule.requiresPharmacistApproval ? (
                          <span className="text-emerald-700 font-semibold">Mandatory</span>
                        ) : (
                          <span className="text-[#78879A]">No</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {rule.requiresH1Register ? (
                          <span className="text-amber-700 font-semibold">Mandatory</span>
                        ) : (
                          <span className="text-[#78879A]">No</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {rule.hardBlocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                            HARD BLOCKED
                          </span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#6C757D] max-w-sm">
                        {rule.description || 'Standard deterministic rule'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Activate Modal */}
      {activateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#EBECEF] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#14161A]">
              Activate Version {ruleSet?.version}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">
                  Mandatory Activation Reason *
                </label>
                <textarea
                  rows={3}
                  value={activationReason}
                  onChange={(e) => setActivationReason(e.target.value)}
                  placeholder="e.g. Approved regulatory update for Schedule H1 register compliance..."
                  className="w-full p-2.5 rounded-lg border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#0D5C5A]/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setActivateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={actionLoading || !activationReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Confirm &amp; Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
