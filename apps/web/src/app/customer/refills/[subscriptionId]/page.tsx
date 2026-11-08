'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { RefillSubscriptionDto, RefillReminderDto } from '@pharmacy/shared-types';
import { BackButton } from '@/components/shared/BackButton';

export default function CustomerRefillSubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.subscriptionId as string;

  const [sub, setSub] = React.useState<RefillSubscriptionDto | null>(null);
  const [reminders, setReminders] = React.useState<RefillReminderDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [leadDays, setLeadDays] = React.useState<number>(5);
  const [updating, setUpdating] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const subs = await apiFetch<RefillSubscriptionDto[]>('/customer/refills/subscriptions');
      const found = subs.find((s) => s.id === subscriptionId) || null;
      setSub(found);
      if (found) {
        setLeadDays(found.reminderDaysBefore);
        const rems = await apiFetch<RefillReminderDto[]>(
          `/customer/refills/subscriptions/${subscriptionId}/reminders`,
        );
        setReminders(rems || []);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePauseResume = async () => {
    if (!sub) return;
    const action = sub.status === 'ACTIVE' ? 'pause' : 'resume';
    try {
      setUpdating(true);
      await apiFetch(`/customer/refills/subscriptions/${subscriptionId}/${action}`, {
        method: 'POST',
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} reminders.`);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to stop all reminders for this medicine?')) return;
    try {
      setUpdating(true);
      await apiFetch(`/customer/refills/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });
      router.push('/customer/refills');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLeadTimeChange = async (newDays: number) => {
    try {
      setUpdating(true);
      setLeadDays(newDays);
      await apiFetch(`/customer/refills/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ reminderDaysBefore: newDays }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder preferences.');
    } finally {
      setUpdating(false);
    }
  };

  const handleReorder = async () => {
    try {
      setUpdating(true);
      const res = await apiFetch<{ success: boolean; cartId: string }>(
        `/customer/refills/subscriptions/${subscriptionId}/reorder`,
        { method: 'POST' },
      );
      if (res && res.cartId) {
        router.push('/customer/cart');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize refill order.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-[#78879A] text-xs">
        Loading subscription schedule...
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <span className="font-bold uppercase text-xs text-red-600 block mb-1">Notice</span>
        <h2 className="text-xl font-bold text-[#0F172A]">Subscription Not Found</h2>
        <BackButton href="/customer/refills" label="Refills Dashboard" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div>
        <BackButton href="/customer/refills" label="Medicine Refills" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBECEF]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">{sub.medicineName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              sub.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }
          >
            Status: {sub.status}
          </Badge>
          <Button
            onClick={handleReorder}
            disabled={updating}
            className="bg-[#0D5C5A] hover:bg-[#5233D1] text-white"
          >
            One-Tap Reorder
          </Button>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 bg-[#F0FDFA] border border-[#0D5C5A]/20 rounded-xl flex items-start gap-3">
        <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-[#0D5C5A]/10 text-[#0D5C5A]">
          NOTICE
        </span>
        <div className="text-xs text-[#55476D] leading-relaxed">
          Refill reminders are informational schedules based on your last dispensed quantity. You
          will always confirm your cart and checkout requirements explicitly prior to order
          placement.
        </div>
      </div>

      <Card className="border-[#EBECEF] shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0F172A]">
            Reminder Schedule Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div>
            <label className="text-xs text-[#78879A] uppercase font-bold block mb-2">
              Send Reminder Before Run-Out
            </label>
            <div className="flex items-center gap-3">
              {[3, 5, 7].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleLeadTimeChange(days)}
                  disabled={updating || sub.status !== 'ACTIVE'}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    leadDays === days
                      ? 'bg-[#0D5C5A] text-white border-[#0D5C5A]'
                      : 'bg-white text-slate-700 border-[#EBECEF] hover:bg-slate-50'
                  }`}
                >
                  {days} Days Before
                </button>
              ))}
            </div>
            <p className="text-xs text-[#78879A] mt-2">
              Estimated Run-Out Date:{' '}
              <strong>
                {sub.estimatedRunOutAt
                  ? new Date(sub.estimatedRunOutAt).toLocaleDateString()
                  : 'N/A'}
              </strong>
              {sub.daysRemaining !== null ? ` (${sub.daysRemaining} days remaining)` : ''}
            </p>
          </div>

          <div className="pt-4 border-t border-[#EBECEF] flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePauseResume}
              disabled={updating}
              className="border-slate-300"
            >
              {sub.status === 'ACTIVE' ? 'Pause Reminders' : 'Resume Reminders'}
            </Button>

            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={updating}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reminder History Table */}
      <Card className="border-[#EBECEF] shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0F172A]">
            Reminder Delivery History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-xs text-[#78879A] py-4 text-center">
              No reminders scheduled or sent yet.
            </p>
          ) : (
            <div className="divide-y divide-[#EBECEF] text-xs">
              {reminders.map((rem) => (
                <div key={rem.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-800">
                      Scheduled for {new Date(rem.scheduledFor).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="neutral" className="text-[10px]">
                    {rem.status}{' '}
                    {rem.sentAt ? `(Sent ${new Date(rem.sentAt).toLocaleTimeString()})` : ''}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
