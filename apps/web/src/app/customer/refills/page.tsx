'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bell, Calendar, Clock, AlertCircle, CheckCircle2, ChevronRight, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RefillEstimateDto, RefillEligibilityStatus } from '@pharmacy/shared-types';

export default function CustomerRefillsPage() {
  const router = useRouter();
  const [estimates, setEstimates] = React.useState<RefillEstimateDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reorderingId, setReorderingId] = React.useState<string | null>(null);

  const loadEstimates = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<RefillEstimateDto[]>('/customer/refills');
      setEstimates(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load medicine refill estimates.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  const handleReorder = async (subscriptionId: string) => {
    try {
      setReorderingId(subscriptionId);
      const res = await apiFetch<{ success: boolean; cartId: string }>('/customer/refills/subscriptions/' + subscriptionId + '/reorder', {
        method: 'POST',
      });
      if (res.success) {
        router.push('/customer/cart');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate refill order.');
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#351F65] flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-[#6240E8]" />
            Medicine Refills &amp; Supply Estimates
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Calculated from your verified dosage and dispensed quantities.
          </p>
        </div>
        <Link href="/customer/notifications">
          <Button variant="outline" className="flex items-center gap-2 border-[#EAE8F0] text-[#351F65]">
            <Bell className="h-4 w-4 text-[#6240E8]" />
            <span>Reminder Alerts</span>
          </Button>
        </Link>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 bg-[#F7F5FD] border border-[#6240E8]/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[#6240E8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#55476D] leading-relaxed">
          <strong className="text-[#351F65]">Important Notice:</strong> Refill dates are estimates based on the last quantity dispensed and pharmacist-confirmed dosage. Actual usage may vary. Please follow your prescription and consult your pharmacist if your dosage changes.
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#78879A]">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-[#6240E8]" />
          Loading your medicine refill estimates...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      ) : estimates.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-[#EAE8F0]">
          <RefreshCw className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-semibold text-[#351F65]">No Refill Estimates Yet</h3>
          <p className="text-sm text-[#78879A] max-w-md mx-auto">
            Once you receive your delivered order with pharmacist-verified dosage instructions, automatic supply estimates and reminder options will appear here.
          </p>
          <Link href="/customer/orders">
            <Button variant="outline" className="border-[#6240E8] text-[#6240E8] mt-2">
              View Your Orders
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {estimates.map((est) => {
            const isEligible = est.eligibilityStatus === RefillEligibilityStatus.ELIGIBLE;
            const sub = est.activeSubscription;

            return (
              <Card key={est.id} className="border-[#EAE8F0] shadow-xs flex flex-col justify-between hover:border-[#6240E8]/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-[#351F65]">
                        {est.medicineName}
                      </CardTitle>
                      {est.familyMemberName && (
                        <span className="text-xs text-[#78879A] font-medium block mt-0.5">
                          For: {est.familyMemberName}
                        </span>
                      )}
                    </div>
                    {isEligible ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        {est.daysRemaining !== null ? `${est.daysRemaining} Days Left` : 'Estimated'}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        Calculation Unavailable
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-[#55476D] flex-1">
                  {isEligible ? (
                    <div className="grid grid-cols-2 gap-2 bg-[#F8F9FB] p-3 rounded-lg border border-[#EAE8F0]">
                      <div>
                        <span className="text-[10px] text-[#78879A] uppercase font-bold block">Dispensed</span>
                        <span className="font-semibold text-slate-800 text-xs">{est.dispensedQuantity} units</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#78879A] uppercase font-bold block">Daily Usage</span>
                        <span className="font-semibold text-slate-800 text-xs">{est.dailyConsumption} / day</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#78879A] uppercase font-bold block">Est. Supply</span>
                        <span className="font-semibold text-slate-800 text-xs">{est.estimatedSupplyDays} days</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#78879A] uppercase font-bold block">Run-out Date</span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {est.estimatedRunOutAt ? new Date(est.estimatedRunOutAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg text-amber-800 text-xs">
                      {est.ineligibilityReason || 'Dosage instructions require pharmacist clarification.'}
                    </div>
                  )}

                  {/* Subscription Controls */}
                  <div className="pt-2 border-t border-[#EAE8F0] flex items-center justify-between">
                    {sub ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-medium text-slate-700">
                          {sub.status === 'ACTIVE' ? `Reminding ${sub.reminderDaysBefore} days before` : 'Reminders paused'}
                        </span>
                      </div>
                    ) : isEligible ? (
                      <span className="text-xs text-[#78879A]">Reminders not active</span>
                    ) : null}

                    {sub ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReorder(sub.id)}
                          disabled={reorderingId === sub.id}
                          className="h-8 border-[#6240E8] text-[#6240E8] hover:bg-[#F7F5FD] flex items-center gap-1.5"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Reorder</span>
                        </Button>
                        <Link href={`/customer/refills/${sub.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 text-[#6240E8] px-2">
                            Manage
                          </Button>
                        </Link>
                      </div>
                    ) : isEligible ? (
                      <Link href={`/customer/refills/new?estimateId=${est.id}`}>
                        <Button size="sm" className="h-8 bg-[#6240E8] hover:bg-[#5233D1] text-white">
                          Enable Reminders
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
