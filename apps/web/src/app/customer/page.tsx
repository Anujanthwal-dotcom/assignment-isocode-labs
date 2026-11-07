'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  UploadCloud,
  Pill,
  Users,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  FileText,
  Repeat,
  Calendar,
  Sparkles,
  CheckCircle2,
  Package,
  Truck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiFetch } from '@/lib/api/client';
import { OrderDTO } from '@pharmacy/shared-types';

const POPULAR_MEDICINES = [
  'Metformin 500mg',
  'Atorvastatin 10mg',
  'Paracetamol 650mg',
  'Pantoprazole 40mg',
  'Amoxicillin 500mg',
];

export default function CustomerHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/customer/medicines?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/customer/medicines');
    }
  };

  const handleQuickChipClick = (medName: string) => {
    const clean = medName.split(' ')[0];
    router.push(`/customer/medicines?search=${encodeURIComponent(clean)}`);
  };

  const getStatusColor = (
    status: string,
  ): 'warning' | 'purple' | 'success' | 'danger' | 'information' => {
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
          HERO HUB: Clinical Command Center Banner (Deep Therapeutic Teal Atmosphere)
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-[#00201F] via-[#004341] to-[#0D5C5A] p-6 sm:p-8 lg:p-10 text-white shadow-md">
        {/* Ambient Radial Highlights */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#14B8A6]/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[#0284C7]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          {/* Status Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/95 backdrop-blur-xs border border-white/15">
            <ShieldCheck className="h-4 w-4 text-[#5EEAD4] shrink-0" />
            <span>Salt Lake Fulfilment Store (KOL-001) Connected</span>
          </div>

          {/* Greeting & Headline */}
          <div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {userName}
            </h1>
            <p className="text-sm sm:text-base text-teal-100/85 mt-1.5 max-w-2xl font-normal leading-relaxed">
              Order 100% genuine verified medicines and manage clinical prescription refills for your household.
            </p>
          </div>

          {/* Integrated Search Command Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="relative flex items-center shadow-lg rounded-[12px] overflow-hidden bg-white">
              <Search className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by brand name, generic formulation, or active ingredient..."
                className="h-13 pl-11 pr-28 border-0 bg-transparent text-[#0F172A] placeholder:text-slate-400 text-sm sm:text-base focus-visible:ring-0 shadow-none"
              />
              <Button
                type="submit"
                className="absolute right-1.5 h-10 px-4 rounded-[8px] bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Quick-Tap Medicine Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-teal-100">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-teal-200/80 mr-1">
              <Sparkles className="h-3 w-3 text-[#5EEAD4]" />
              Popular:
            </span>
            {POPULAR_MEDICINES.map((med) => (
              <button
                key={med}
                type="button"
                onClick={() => handleQuickChipClick(med)}
                className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 text-xs font-medium text-white/95 transition-colors cursor-pointer"
              >
                {med}
              </button>
            ))}
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => router.push('/customer/prescriptions')}
              className="bg-white text-[#0D5C5A] hover:bg-[#F0FDFA] text-xs sm:text-sm font-bold h-10 px-5 rounded-[8px] shadow-xs cursor-pointer flex items-center"
            >
              <UploadCloud className="h-4 w-4 mr-1.5 text-[#0D5C5A]" />
              Upload Prescription (Rx)
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/customer/medicines')}
              className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm font-semibold h-10 px-5 rounded-[8px] cursor-pointer flex items-center"
            >
              <Pill className="h-4 w-4 mr-1.5 text-teal-200" />
              Browse Catalogue
            </Button>
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
              href="/customer/medicines"
              className="p-5 rounded-[16px] border border-[#E2E8F0] bg-white hover:border-[#0D5C5A]/50 hover:shadow-sm transition-all group block shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-[10px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
                  <Pill className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D5C5A] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-display font-bold text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors">
                Browse Medicines
              </h2>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed line-clamp-2">
                100% genuine batch-verified inventory with live stock in Salt Lake &amp; Howrah.
              </p>
            </Link>

            <Link
              href="/customer/prescriptions"
              className="p-5 rounded-[16px] border border-[#E2E8F0] bg-white hover:border-[#0D5C5A]/50 hover:shadow-sm transition-all group block shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-[10px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D5C5A] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-display font-bold text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors">
                Prescription Vault
              </h2>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed line-clamp-2">
                Upload doctor&apos;s prescription for AI draft extraction and pharmacist review.
              </p>
            </Link>

            <Link
              href="/customer/refills"
              className="p-5 rounded-[16px] border border-[#E2E8F0] bg-white hover:border-[#0D5C5A]/50 hover:shadow-sm transition-all group block shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-[10px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
                  <Repeat className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D5C5A] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-display font-bold text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors">
                Auto-Ship Refills
              </h2>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed line-clamp-2">
                Scheduled 30/60-day cycle deliveries for continuous diabetes &amp; BP management.
              </p>
            </Link>
          </div>

          {/* Recent Orders & Fulfillment Tracking Section */}
          <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0]">
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
              <div className="py-8 px-4 text-center rounded-[12px] bg-slate-50 border border-dashed border-[#CBD5E1]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0D5C5A] shadow-xs mb-3">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-[#0F172A] text-sm">No Active Orders</h3>
                <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto leading-relaxed">
                  Browse our catalogue or upload your doctor&apos;s prescription to place your first genuine medicine order.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push('/customer/medicines')}
                    className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs font-semibold"
                  >
                    Browse Medicines
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/customer/prescriptions')}
                    className="border-[#CBD5E1] text-[#0F172A] text-xs font-semibold"
                  >
                    Upload Rx
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
                      className="p-4 sm:p-5 rounded-[12px] border border-[#E2E8F0] hover:border-[#0D5C5A] bg-white transition-all cursor-pointer hover:shadow-xs space-y-3 group"
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
                      <div className="flex items-center justify-between text-xs text-[#64748B] pt-1.5 border-t border-[#E2E8F0]">
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
            RIGHT SIDEBAR: Household Care, Trust Seal & Delivery Hub (4 cols)
            ===================================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* Widget 1: Family Health Circle */}
          <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[8px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A]">
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
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-slate-50 border border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-[#CCFBF1] text-[#047857] font-bold text-xs flex items-center justify-center">
                    DG
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-[#0F172A] block">Debasish Ghosh</span>
                    <span className="text-[10px] text-[#64748B]">Self (Primary Account)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#047857] bg-[#CCFBF1] px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[10px] bg-slate-50 border border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-[#E0F2FE] text-[#0284C7] font-bold text-xs flex items-center justify-center">
                    MG
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-[#0F172A] block">Maya Ghosh</span>
                    <span className="text-[10px] text-[#64748B]">Mother (Senior Care)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#0D5C5A] bg-[#F0FDFA] border border-[#99F6E4] px-2 py-0.5 rounded-full">
                  2 Active Rx
                </span>
              </div>
            </div>
          </div>

          {/* Widget 2: Registered Pharmacist Compliance Assurance */}
          <div className="rounded-[16px] border border-[#99F6E4] bg-gradient-to-br from-[#F0FDFA] to-[#ECFDF5] p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex items-center gap-2 text-[#047857]">
              <ShieldCheck className="h-5 w-5 text-[#059669] shrink-0" />
              <h2 className="font-display font-bold text-sm text-[#065F46]">Clinical Pharmacy Assurance</h2>
            </div>
            <p className="text-xs text-[#065F46]/85 leading-relaxed">
              Every scheduled medicine and prescription undergoes strict review by certified pharmacists prior to dispatch.
            </p>
            <ul className="text-xs text-[#065F46]/85 space-y-1.5 pt-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                <span>Schedule H &amp; H1 Regulatory Sign-off</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                <span>100% Tamper-Evident Cold-Chain Packing</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                <span>Zero Counterfeit &bull; Genuine Batch Traceability</span>
              </li>
            </ul>
          </div>

          {/* Widget 3: Default Delivery Hub */}
          <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[8px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A]">
                  <MapPin className="h-4 w-4" />
                </div>
                <h2 className="font-display font-bold text-sm text-[#0F172A]">Delivery Location</h2>
              </div>
              <Link
                href="/customer/addresses"
                className="text-[11px] font-semibold text-[#0D5C5A] hover:underline"
              >
                Change
              </Link>
            </div>
            <div className="rounded-[10px] bg-slate-50 p-3.5 border border-[#E2E8F0] text-xs text-[#475569] space-y-1">
              <span className="font-bold text-[#0F172A] block">Home (Salt Lake)</span>
              <p className="text-[#64748B] text-[11px]">
                Block CD, Sector 1, Salt Lake City, Kolkata 700064
              </p>
              <div className="pt-1 flex items-center gap-1 text-[10px] text-[#059669] font-semibold">
                <Clock className="h-3 w-3" />
                <span>Dispatched from KOL-001 Store Hub</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
