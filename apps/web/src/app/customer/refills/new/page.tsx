'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewRefillSubscriptionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const estimateId = searchParams.get('estimateId');

  const [leadDays, setLeadDays] = React.useState<number>(5);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimateId) {
      setError('Missing refill estimate reference.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiFetch('/customer/refills/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          refillEstimateId: estimateId,
          reminderDaysBefore: leadDays,
          preferredNotificationChannel: 'IN_APP',
        }),
      });
      router.push('/customer/refills');
    } catch (err: any) {
      setError(err.message || 'Failed to create subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <Link
        href="/customer/refills"
        className="inline-flex items-center text-xs font-semibold text-[#0D5C5A] hover:underline"
      >
        &larr; Back to Refills
      </Link>

      <Card className="border-[#EBECEF] shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#0F172A]">
            Opt In to Medicine Refill Reminders
          </CardTitle>
          <p className="text-xs text-[#78879A] mt-1">
            Receive automated alerts before your medicine runs out so you never miss a dose.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs text-[#78879A] uppercase font-bold block mb-2">
                When would you like to be reminded?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setLeadDays(days)}
                    className={`py-3 px-2 rounded-xl text-center border transition-all ${
                      leadDays === days
                        ? 'border-[#0D5C5A] bg-[#F0FDFA] text-[#0D5C5A] font-bold shadow-xs'
                        : 'border-[#EBECEF] bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium'
                    }`}
                  >
                    <div className="text-sm">{days} Days</div>
                    <div className="text-[10px] text-[#78879A] mt-0.5">before run-out</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#EBECEF] text-xs text-[#55476D] space-y-2">
              <div className="flex items-center gap-2 font-medium text-[#0F172A]">
                <span className="font-bold text-[10px] uppercase px-1 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  GUARANTEE
                </span>
                <span>Explicit Consent &amp; Privacy Guarantee</span>
              </div>
              <p>
                We will only notify you in-app. Reminders do not place orders automatically or
                charge your account. You can pause or cancel at any time.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/customer/refills">
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#0D5C5A] hover:bg-[#5233D1] text-white"
              >
                {submitting ? 'Enabling...' : 'Confirm & Enable Reminders'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
