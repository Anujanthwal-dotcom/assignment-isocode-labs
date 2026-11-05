'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Calendar, Clock, ShoppingCart, PauseCircle, PlayCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { RefillSubscriptionDto, RefillReminderDto } from '@pharmacy/shared-types';

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
        const rems = await apiFetch<RefillReminderDto[]>(`/customer/refills/subscriptions/${subscriptionId}/reminders`);
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
      await apiFetch(`/customer/refills/subscriptions/${subscriptionId}/${action}`, { method: 'POST' });
      await loadData();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} reminders.`);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel refill reminders for this medicine?')) return;
    try {
      setUpdating(true);
      await apiFetch(`/customer/refills/subscriptions/${subscriptionId}/cancel`, { method: 'POST' });
      router.push('/customer/refills');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel reminders.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLeadTimeChange = async (days: number) => {
    try {
      setUpdating(true);
      setLeadDays(days);
      await apiFetch(`/customer/refills/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ reminderDaysBefore: days }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder lead time.');
    } finally {
      setUpdating(false);
    }
  };

  const handleReorder = async () => {
    try {
      setUpdating(true);
      const res = await apiFetch<{ success: boolean; cartId: string }>(`/customer/refills/subscriptions/${subscriptionId}/reorder`, {
        method: 'POST',
      });
      if (res.success) {
        router.push('/customer/cart');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate refill order.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-[#78879A]">Loading subscription settings...</div>;
  }

  if (!sub) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#351F65]">Subscription Not Found</h2>
        <Link href="/customer/refills">
          <Button variant="outline">Back to Refills</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <Link href="/customer/refills" className="inline-flex items-center text-xs font-semibold text-[#6240E8] hover:underline">
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Medicine Refills
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">
            {sub.medicineName}
          </h1>
          <p className="text-xs text-[#78879A] mt-1">
            {sub.familyMemberName ? `Patient: ${sub.familyMemberName} • ` : ''}Refill Reminder Settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={sub.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
            Status: {sub.status}
          </Badge>
          <Button
            onClick={handleReorder}
            disabled={updating}
            className="bg-[#6240E8] hover:bg-[#5233D1] text-white flex items-center gap-1.5"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>One-Tap Reorder</span>
          </Button>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 bg-[#F7F5FD] border border-[#6240E8]/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[#6240E8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#55476D] leading-relaxed">
          Refill reminders are informational schedules based on your last dispensed quantity. You will always confirm your cart and checkout requirements explicitly prior to order placement.
        </div>
      </div>

      <Card className="border-[#EAE8F0] shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#351F65]">
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
                      ? 'bg-[#6240E8] text-white border-[#6240E8]'
                      : 'bg-white text-slate-700 border-[#EAE8F0] hover:bg-slate-50'
                  }`}
                >
                  {days} Days Before
                </button>
              ))}
            </div>
            <p className="text-xs text-[#78879A] mt-2">
              Estimated Run-Out Date: <strong>{sub.estimatedRunOutAt ? new Date(sub.estimatedRunOutAt).toLocaleDateString() : 'N/A'}</strong>
              {sub.daysRemaining !== null ? ` (${sub.daysRemaining} days remaining)` : ''}
            </p>
          </div>

          <div className="pt-4 border-t border-[#EAE8F0] flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePauseResume}
              disabled={updating}
              className="flex items-center gap-2 border-slate-300"
            >
              {sub.status === 'ACTIVE' ? (
                <>
                  <PauseCircle className="h-4 w-4 text-amber-600" />
                  <span>Pause Reminders</span>
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 text-emerald-600" />
                  <span>Resume Reminders</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={updating}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancel Subscription</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reminder History Table */}
      <Card className="border-[#EAE8F0] shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#351F65]">
            Reminder Delivery History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-xs text-[#78879A] py-4 text-center">No reminders scheduled or sent yet.</p>
          ) : (
            <div className="divide-y divide-[#EAE8F0] text-xs">
              {reminders.map((rem) => (
                <div key={rem.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#6240E8]" />
                    <span className="font-medium text-slate-800">
                      Scheduled for {new Date(rem.scheduledFor).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="neutral" className="text-[10px]">
                    {rem.status} {rem.sentAt ? `(Sent ${new Date(rem.sentAt).toLocaleTimeString()})` : ''}
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
