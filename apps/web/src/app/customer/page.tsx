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
        return 'purple';
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
          HERO HUB: Clinical Command Center Banner (Deep Plum Atmosphere)
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2D1658] via-[#351F65] to-[#452482] p-6 sm:p-8 lg:p-10 text-white shadow-md">
        {/* Ambient Radial Highlights */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#6240E8]/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[#0088AA]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          {/* Status Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-xs border border-white/10">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
            <span>Salt Lake Fulfilment Store (KOL-001) Connected</span>
          </div>

          {/* Greeting & Headline */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {userName}
            </h1>
            <p className="text-sm sm:text-base text-purple-100/80 mt-1 max-w-2xl font-normal">
              Order 100% genuine verified medicines and manage prescription refills for your household.
            </p>
          </div>

          {/* Integrated Search Command Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="relative flex items-center shadow-lg rounded-xl overflow-hidden bg-white">
              <Search className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by brand name, generic formulation, or active ingredient..."
                className="h-13 pl-11 pr-28 border-0 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus-visible:ring-0 shadow-none"
              />
              <Button
                type="submit"
                className="absolute right-1.5 h-10 px-4 rounded-lg bg-[#6240E8] hover:bg-[#5233D0] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Quick-Tap Medicine Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-purple-200">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-purple-200/70 mr-1">
              <Sparkles className="h-3 w-3 text-purple-300" />
              Popular:
            </span>
            {POPULAR_MEDICINES.map((med) => (
              <button
                key={med}
                type="button"
                onClick={() => handleQuickChipClick(med)}
                className="rounded-full bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1 text-xs text-white/90 transition-colors cursor-pointer"
              >
                {med}
              </button>
            ))}
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => router.push('/customer/prescriptions')}
              className="bg-white text-[#351F65] hover:bg-purple-50 text-xs sm:text-sm font-semibold h-9 px-4 rounded-lg shadow-xs cursor-pointer flex items-center"
            >
              <UploadCloud className="h-4 w-4 mr-1.5 text-[#6240E8]" />
              Upload Prescription (Rx)
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/customer/medicines')}
              className="border-white/25 text-white hover:bg-white/10 text-xs sm:text-sm font-semibold h-9 px-4 rounded-lg cursor-pointer flex items-center"
            >
              <Pill className="h-4 w-4 mr-1.5 text-purple-200" />
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
              className="p-4.5 rounded-xl border border-slate-200/80 bg-white hover:border-[#6240E8]/60 hover:shadow-sm transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-[#F7F5FD] flex items-center justify-center text-[#6240E8] group-hover:bg-[#6240E8] group-hover:text-white transition-colors">
                  <Pill className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#6240E8] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-bold text-sm text-[#351F65] group-hover:text-[#6240E8] transition-colors">
                Browse Medicines
              </h2>
              <p className="text-xs text-[#78879A] mt-1 line-clamp-2">
                100% genuine batch-verified inventory with live stock in Salt Lake &amp; Howrah.
              </p>
            </Link>

            <Link
              href="/customer/prescriptions"
              className="p-4.5 rounded-xl border border-slate-200/80 bg-white hover:border-[#6240E8]/60 hover:shadow-sm transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-[#F7F5FD] flex items-center justify-center text-[#6240E8] group-hover:bg-[#6240E8] group-hover:text-white transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#6240E8] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-bold text-sm text-[#351F65] group-hover:text-[#6240E8] transition-colors">
                Prescription Vault
              </h2>
              <p className="text-xs text-[#78879A] mt-1 line-clamp-2">
                Upload doctor&apos;s prescription for AI draft extraction and pharmacist review.
              </p>
            </Link>

            <Link
              href="/customer/refills"
              className="p-4.5 rounded-xl border border-slate-200/80 bg-white hover:border-[#6240E8]/60 hover:shadow-sm transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-[#F7F5FD] flex items-center justify-center text-[#6240E8] group-hover:bg-[#6240E8] group-hover:text-white transition-colors">
                  <Repeat className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#6240E8] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-bold text-sm text-[#351F65] group-hover:text-[#6240E8] transition-colors">
                Auto-Ship Refills
              </h2>
              <p className="text-xs text-[#78879A] mt-1 line-clamp-2">
                Scheduled 30/60-day cycle deliveries for continuous diabetes &amp; BP management.
              </p>
            </Link>
          </div>

          {/* Recent Orders & Fulfillment Tracking Section */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-[#F7F5FD] flex items-center justify-center text-[#6240E8]">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[#351F65]">Recent Orders &amp; Live Tracking</h2>
                  <p className="text-[11px] text-[#78879A]">Real-time dispensing status across stores</p>
                </div>
              </div>
              <Link
                href="/customer/orders"
                className="text-xs font-semibold text-[#6240E8] hover:text-[#5233D0] flex items-center gap-1 transition-colors"
              >
                <span>View All Orders</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loadingOrders ? (
              <div className="py-10 text-center text-xs text-[#78879A] space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6240E8] border-t-transparent mx-auto" />
                <p>Retrieving your pharmacy orders...</p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#6240E8] shadow-xs mb-3">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">No Active Orders</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Browse our catalogue or upload your doctor&apos;s prescription to place your first genuine medicine order.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push('/customer/medicines')}
                    className="bg-[#6240E8] hover:bg-[#5233D0] text-white text-xs font-semibold"
                  >
                    Browse Medicines
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/customer/prescriptions')}
                    className="border-slate-300 text-slate-700 text-xs font-semibold"
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
                      className="p-4 rounded-xl border border-slate-200/90 hover:border-[#6240E8] bg-white transition-all cursor-pointer hover:shadow-xs space-y-3 group"
                    >
                      {/* Top Header of Order */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#351F65] group-hover:text-[#6240E8] transition-colors">
                            {order.orderNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#78879A]">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.placedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            KOL-001
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge
                            status={getStatusColor(order.status)}
                            label={order.status.replace(/_/g, ' ')}
                          />
                          <span className="font-extrabold text-sm text-[#351F65]">
                            ₹{order.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Visual 3-Stage Fulfillment Progress Bar */}
                      <div className="pt-1">
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-medium">
                          <div
                            className={`flex items-center justify-center gap-1 py-1 rounded-md ${
                              step >= 1 ? 'bg-purple-50 text-[#6240E8] font-semibold' : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>1. Pharmacist Verified</span>
                          </div>
                          <div
                            className={`flex items-center justify-center gap-1 py-1 rounded-md ${
                              step >= 2 ? 'bg-purple-50 text-[#6240E8] font-semibold' : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            <Package className="h-3 w-3" />
                            <span>2. Packed &amp; Sealed</span>
                          </div>
                          <div
                            className={`flex items-center justify-center gap-1 py-1 rounded-md ${
                              step >= 3 ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            <Truck className="h-3 w-3" />
                            <span>3. Delivered</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Meta & Track CTA */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <span>
                          {order.items?.length || 0} item(s) &bull; Payment:{' '}
                          <span className="font-semibold text-slate-700">{order.paymentMethod}</span>
                        </span>
                        <span className="inline-flex items-center text-xs font-semibold text-[#6240E8] group-hover:translate-x-0.5 transition-transform">
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
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-[#F7F5FD] flex items-center justify-center text-[#6240E8]">
                  <Users className="h-4 w-4" />
                </div>
                <h2 className="font-bold text-sm text-[#351F65]">Family Health Circle</h2>
              </div>
              <Link
                href="/customer/family"
                className="text-[11px] font-semibold text-[#6240E8] hover:underline"
              >
                + Add
              </Link>
            </div>
            <p className="text-xs text-[#78879A]">
              Prescriptions and dosage records managed for family members:
            </p>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-[#EAE6FD] text-[#6240E8] font-bold text-xs flex items-center justify-center">
                    DG
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">Debasish Ghosh</span>
                    <span className="text-[10px] text-slate-500">Self (Primary Account)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                    MG
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">Maya Ghosh</span>
                    <span className="text-[10px] text-slate-500">Mother (Senior Care)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#6240E8] bg-[#F7F5FD] px-2 py-0.5 rounded-full">
                  2 Active Rx
                </span>
              </div>
            </div>
          </div>

          {/* Widget 2: Registered Pharmacist Compliance Assurance */}
          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <h2 className="font-bold text-sm text-emerald-950">Clinical Pharmacy Assurance</h2>
            </div>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              Every scheduled medicine and prescription undergoes strict review by certified pharmacists prior to dispatch.
            </p>
            <ul className="text-xs text-emerald-900/80 space-y-1.5 pt-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Schedule H &amp; H1 Regulatory Sign-off</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>100% Tamper-Evident Cold-Chain Packing</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Zero Counterfeit &bull; Genuine Batch Traceability</span>
              </li>
            </ul>
          </div>

          {/* Widget 3: Default Delivery Hub */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-[#F7F5FD] flex items-center justify-center text-[#6240E8]">
                  <MapPin className="h-4 w-4" />
                </div>
                <h2 className="font-bold text-sm text-[#351F65]">Delivery Location</h2>
              </div>
              <Link
                href="/customer/addresses"
                className="text-[11px] font-semibold text-[#6240E8] hover:underline"
              >
                Change
              </Link>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">Home (Salt Lake)</span>
              <p className="text-slate-600 text-[11px]">
                Block CD, Sector 1, Salt Lake City, Kolkata 700064
              </p>
              <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
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
