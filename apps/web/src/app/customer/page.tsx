'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  Users,
  Clock,
  ShieldCheck,
  ArrowRight,
  FileText,
  Repeat,
  Calendar,
  CheckCircle2,
  Package,
  Truck,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiFetch } from '@/lib/api/client';
import { OrderDTO } from '@pharmacy/shared-types';

export default function CustomerHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rxNumber, setRxNumber] = React.useState('');
  const [recentOrders, setRecentOrders] = React.useState<OrderDTO[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const fetchRecentOrders = async () => {
      try {
        const res = await apiFetch<{ data: OrderDTO[] }>('/customer/orders?limit=3');
        if (isMounted && res?.data) {
          setRecentOrders(res.data);
        }
      } catch {
        // Silently handle
      } finally {
        if (isMounted) setLoadingOrders(false);
      }
    };

    fetchRecentOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRxLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rxNumber.trim()) {
      router.push(`/customer/prescriptions?search=${encodeURIComponent(rxNumber.trim())}`);
    } else {
      router.push('/customer/prescriptions');
    }
  };

  const getStatusColor = (
    status: string,
  ): 'warning' | 'success' | 'danger' | 'information' => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return 'warning';
      case 'UNDER_REVIEW':
        return 'information';
      case 'APPROVED':
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
      case 'VERIFICATION_FAILED':
        return 'danger';
      default:
        return 'information';
    }
  };

  const getFulfillmentStep = (status: string): number => {
    switch (status) {
      case 'PENDING_VERIFICATION':
      case 'UNDER_REVIEW':
        return 1;
      case 'APPROVED':
      case 'PACKED':
      case 'DISPATCHED':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 1;
    }
  };

  const userName = user?.profile?.fullName || 'Customer';

  return (
    <div className="space-y-6">
      {/* =========================================================================
          HERO HUB: Clinical Command Center Banner (Solid Therapeutic Teal)
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-[16px] bg-[#0D5C5A] p-6 sm:p-8 lg:p-10 text-white shadow-xs">
        <div className="relative z-10 max-w-3xl space-y-4">
          {/* Status Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#004341] px-3.5 py-1 text-xs font-semibold text-white/95 border border-[#14B8A6]/40">
            <ShieldCheck className="h-4 w-4 text-[#5EEAD4] shrink-0" />
            <span>Salt Lake Store (KOL-001) Connected &bull; Prescription-Led Dispensing</span>
          </div>

          {/* Greeting & Headline */}
          <div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {userName}
            </h1>
            <p className="text-sm sm:text-base text-teal-100 mt-1.5 max-w-2xl font-normal leading-relaxed">
              Send your doctor&apos;s prescription for certified registered pharmacist verification, batch-verified dispensing, and recurring chronic care refills.
            </p>
          </div>

          {/* Primary High-Impact Upload Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push('/customer/prescriptions')}
              className="w-full flex items-center justify-between p-4 sm:p-5 rounded-[14px] bg-white text-[#0D5C5A] hover:bg-[#F0FDFA] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-white/90 group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-[12px] bg-[#F0FDFA] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors shrink-0">
                  <UploadCloud className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="text-left">
                  <span className="font-display font-bold text-base sm:text-lg text-[#0F172A] block group-hover:text-[#0D5C5A] transition-colors leading-snug">
                    Upload Doctor&apos;s Prescription (Rx)
                  </span>
                  <span className="text-xs sm:text-sm text-[#64748B] block mt-0.5 font-normal leading-tight">
                    Upload camera photo or PDF &bull; 100% pharmacist verified &amp; dispatched
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-[#F0FDFA] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors shrink-0">
                <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>

          {/* Integrated Prescription Number Lookup / Reorder Field */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-teal-100 block">
              Have an existing Prescription or Refill #?
            </span>
            <form onSubmit={handleRxLookupSubmit}>
              <div className="relative flex items-center rounded-full overflow-hidden bg-white shadow-xs border border-white/80 transition-all focus-within:ring-2 focus-within:ring-[#5EEAD4]">
                <FileText className="absolute left-4 sm:left-5 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  value={rxNumber}
                  onChange={(e) => setRxNumber(e.target.value)}
                  placeholder="Enter Prescription # (e.g. RX-2026-...) to reorder or track..."
                  className="h-12 pl-12 sm:pl-13 pr-32 border-0 bg-transparent text-[#0F172A] placeholder:text-slate-400 text-xs sm:text-sm focus-visible:ring-0 shadow-none rounded-full"
                />
                <Button
                  type="submit"
                  className="absolute right-1.5 h-9 px-4 sm:px-5 rounded-full bg-[#004341] hover:bg-[#002D2C] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
                >
                  Find &amp; Reorder
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ASYMMETRIC 2-COLUMN COMMAND CENTER (Left: 8 cols / Right: 4 cols)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =====================================================================
            LEFT STREAM: Core Services & Recent Orders Tracking (8 cols)
            ===================================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* Three Tactile Core Service Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Link
              href="/customer/prescriptions"
              className="p-5 sm:p-6 rounded-[16px] border border-[#EBECEF] bg-white hover:border-[#14B8A6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all group block shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className="h-11 w-11 rounded-[12px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D5C5A] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-display font-bold text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors">
                Send Prescription
              </h2>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed line-clamp-2">
                Upload new prescription slip or photo for immediate pharmacist evaluation &amp; order quote.
              </p>
            </Link>

            <Link
              href="/customer/prescriptions"
              className="p-5 sm:p-6 rounded-[16px] border border-[#EBECEF] bg-white hover:border-[#14B8A6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all group block shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className="h-11 w-11 rounded-[12px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D5C5A] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-display font-bold text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors">
                Prescription Vault
              </h2>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed line-clamp-2">
                Digital repository of doctor advice, validated medicine drafts, and dosage history.
              </p>
            </Link>

            <Link
              href="/customer/refills"
              className="p-5 sm:p-6 rounded-[16px] border border-[#EBECEF] bg-white hover:border-[#14B8A6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all group block shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className="h-11 w-11 rounded-[12px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
                  <Repeat className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D5C5A] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-display font-bold text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors">
                Auto-Ship Refills
              </h2>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed line-clamp-2">
                Scheduled 30/60-day recurring deliveries for continuous diabetes &amp; BP management.
              </p>
            </Link>
          </div>

          {/* Recent Orders & Fulfillment Tracking Section */}
          <div className="rounded-[16px] border border-[#EBECEF] bg-white p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F3F5]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[8px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A]">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm text-[#0F172A]">Recent Orders &amp; Live Tracking</h2>
                  <p className="text-[11px] text-[#64748B]">Real-time dispensing status across stores</p>
                </div>
              </div>
              <Link
                href="/customer/orders"
                className="text-xs font-semibold text-[#0D5C5A] hover:text-[#0A4846] flex items-center gap-1 transition-colors"
              >
                <span>View All Orders</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loadingOrders ? (
              <div className="py-10 text-center text-xs text-[#64748B] space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0D5C5A] border-t-transparent mx-auto" />
                <p>Retrieving your pharmacy orders...</p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-[12px] bg-[#F8FAFC] border border-dashed border-[#CBD5E1]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0D5C5A] shadow-xs mb-3">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-[#0F172A] text-sm">No Active Orders</h3>
                <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto leading-relaxed">
                  Upload your doctor&apos;s prescription to request medicines or set up recurring chronic care refills.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push('/customer/prescriptions')}
                    className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs font-semibold rounded-[8px]"
                  >
                    Upload Prescription (Rx)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentOrders.map((order) => {
                  const step = getFulfillmentStep(order.status);

                  return (
                    <div
                      key={order.id}
                      onClick={() => router.push(`/customer/orders/${order.id}`)}
                      className="p-4 sm:p-5 rounded-[14px] border border-[#EBECEF] hover:border-[#14B8A6] bg-white transition-all cursor-pointer shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-3 group"
                    >
                      {/* Top Header of Order */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors">
                            {order.orderNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.placedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-semibold text-[#0284C7]">
                            KOL-001
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge
                            status={getStatusColor(order.status)}
                            label={order.status.replace(/_/g, ' ')}
                          />
                          <span className="tabular-nums font-extrabold text-sm text-[#0F172A]">
                            ₹{order.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Visual 3-Stage Fulfillment Progress Bar */}
                      <div className="pt-1">
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-medium">
                          <div
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-full ${
                              step >= 1 ? 'bg-[#CCFBF1] text-[#047857] font-semibold' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>1. Pharmacist Verified</span>
                          </div>
                          <div
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-full ${
                              step >= 2 ? 'bg-[#CCFBF1] text-[#047857] font-semibold' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Package className="h-3 w-3" />
                            <span>2. Packed &amp; Sealed</span>
                          </div>
                          <div
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-full ${
                              step >= 3 ? 'bg-[#DCFCE7] text-[#059669] font-bold' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Truck className="h-3 w-3" />
                            <span>3. Delivered</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Meta & Track CTA */}
                      <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#F1F3F5]">
                        <span>
                          {order.items?.length || 0} item(s) &bull; Payment:{' '}
                          <span className="font-semibold text-[#0F172A]">{order.paymentMethod}</span>
                        </span>
                        <span className="inline-flex items-center text-xs font-semibold text-[#0D5C5A] group-hover:translate-x-0.5 transition-transform">
                          Track Order <ArrowRight className="h-3 w-3 ml-1" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            RIGHT SIDEBAR: Household Care & Auto-Refills (4 cols)
            ===================================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* Widget 1: Family Health Circle */}
          <div className="rounded-[16px] border border-[#EBECEF] bg-white p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[10px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A]">
                  <Users className="h-4 w-4" />
                </div>
                <h2 className="font-display font-bold text-sm text-[#0F172A]">Family Health Circle</h2>
              </div>
              <Link
                href="/customer/family"
                className="text-[11px] font-semibold text-[#0D5C5A] hover:underline"
              >
                + Add
              </Link>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Prescriptions and dosage records managed for family members:
            </p>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#F8F9FA] border border-[#EBECEF]">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-[#CCFBF1] text-[#047857] font-bold text-xs flex items-center justify-center">
                    DG
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-[#0F172A] block">Debasish Ghosh</span>
                    <span className="text-[10px] text-[#64748B]">Self (Primary Account)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#047857] bg-[#CCFBF1] px-2.5 py-0.5 rounded-full">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#F8F9FA] border border-[#EBECEF]">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-[#E0F2FE] text-[#0284C7] font-bold text-xs flex items-center justify-center">
                    MG
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-[#0F172A] block">Maya Ghosh</span>
                    <span className="text-[10px] text-[#64748B]">Mother (Senior Care)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#0D5C5A] bg-[#F0FDFA] border border-[#99F6E4] px-2.5 py-0.5 rounded-full">
                  2 Active Rx
                </span>
              </div>
            </div>
          </div>

          {/* Widget 2: Auto-Ship Cycle Watch */}
          <div className="rounded-[16px] border border-[#EBECEF] bg-white p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[10px] bg-[#FFFBEB] flex items-center justify-center text-[#D97706]">
                  <RotateCw className="h-4 w-4" />
                </div>
                <h2 className="font-display font-bold text-sm text-[#0F172A]">Refill Subscription Watch</h2>
              </div>
              <Link
                href="/customer/refills"
                className="text-[11px] font-semibold text-[#0D5C5A] hover:underline"
              >
                Manage
              </Link>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Continuous care subscriptions scheduled for recurring monthly dispatch:
            </p>
            <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] border border-[#EBECEF] space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-display font-bold text-xs text-[#0F172A] block">
                    Telmisartan 40mg (30-day pack)
                  </span>
                  <span className="text-[11px] text-[#64748B]">For: Maya Ghosh &bull; Daily (Morning)</span>
                </div>
                <span className="text-[10px] font-bold text-[#D97706] bg-[#FFFBEB] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                  5 Doses Left
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 text-[#64748B]">
                <span>Auto-renews: 12 Nov</span>
                <span className="font-bold text-[#0D5C5A]">KOL-001 Store</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
