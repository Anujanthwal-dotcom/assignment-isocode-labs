'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  Users,
  Clock,
  ArrowRight,
  FileText,
  Repeat,
  Calendar,
  CheckCircle2,
  Package,
  Truck,
  RotateCw,
  Pill,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiFetch } from '@/lib/api/client';
import { OrderDTO, FamilyMemberDTO, PrescriptionDTO } from '@pharmacy/shared-types';

const AVATAR_COLORS = [
  'bg-[#E0F2FE] text-[#0284C7]',
  'bg-[#FEF3C7] text-[#D97706]',
  'bg-[#F3E8FF] text-[#7E22CE]',
  'bg-[#FCE7F3] text-[#DB2777]',
  'bg-[#DCFCE7] text-[#16A34A]',
];

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelationship(rel?: string | null): string {
  if (!rel) return 'Family';
  switch (rel) {
    case 'MOTHER':
      return 'Mother (Senior Care)';
    case 'FATHER':
      return 'Father (Senior Care)';
    case 'SPOUSE':
      return 'Spouse / Partner';
    case 'CHILD':
      return 'Child / Dependent';
    case 'SIBLING':
      return 'Sibling';
    case 'SELF':
      return 'Self (Primary Account)';
    default:
      return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
  }
}

export default function CustomerHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rxNumber, setRxNumber] = React.useState('');
  const [recentOrders, setRecentOrders] = React.useState<OrderDTO[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);
  const [familyMembers, setFamilyMembers] = React.useState<FamilyMemberDTO[]>([]);
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionDTO[]>([]);
  const [loadingCircle, setLoadingCircle] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const [ordersRes, familyRes, rxRes] = await Promise.allSettled([
          apiFetch<{ data: OrderDTO[] }>('/customer/orders?limit=3'),
          apiFetch<FamilyMemberDTO[]>('/customer/family-members'),
          apiFetch<{ data: PrescriptionDTO[] }>('/customer/prescriptions'),
        ]);

        if (isMounted) {
          if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
            setRecentOrders(ordersRes.value.data);
          }
          if (familyRes.status === 'fulfilled' && Array.isArray(familyRes.value)) {
            setFamilyMembers(familyRes.value);
          }
          if (rxRes.status === 'fulfilled' && rxRes.value?.data) {
            setPrescriptions(rxRes.value.data);
          }
        }
      } catch {
        // Silently handle
      } finally {
        if (isMounted) {
          setLoadingOrders(false);
          setLoadingCircle(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const getActiveRxCount = (memberId?: string | null) => {
    return prescriptions.filter((rx) => {
      const isMemberMatch = memberId
        ? rx.familyMemberId === memberId || rx.familyMember?.id === memberId
        : !rx.familyMemberId && !rx.familyMember?.id;
      const isActive = rx.status !== 'REJECTED' && rx.status !== 'REUPLOAD_REQUIRED';
      return isMemberMatch && isActive;
    }).length;
  };

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
        <div className="relative z-10 w-full space-y-4">
          {/* Greeting & Headline */}
          <div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {userName}
            </h1>
          </div>

          {/* Responsive Action Row: Sleek, Full-Width, Compact Vertical Height (Horizontal on Desktop, Vertical on Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full items-center pt-1">
            {/* Left: Upload Doctor's Prescription Action Bar */}
            <button
              type="button"
              onClick={() => router.push('/customer/prescriptions')}
              className="w-full h-12 sm:h-13 flex items-center justify-between px-3.5 sm:px-4 rounded-full bg-white text-[#0D5C5A] hover:bg-[#F0FDFA] transition-all shadow-xs border border-white/90 group cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#F0FDFA] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors shrink-0">
                  <UploadCloud className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-display font-bold text-xs sm:text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors block truncate">
                    Upload Doctor&apos;s Prescription (Rx)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 pl-2">
                <span className="text-[11px] font-medium text-[#64748B] hidden xl:inline">Photo or PDF</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0FDFA] text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* Right: Integrated Prescription Number Lookup / Reorder Bar */}
            <form onSubmit={handleRxLookupSubmit} className="w-full">
              <div className="relative flex items-center h-12 sm:h-13 rounded-full overflow-hidden bg-white shadow-xs border border-white/90 transition-all focus-within:ring-2 focus-within:ring-[#5EEAD4]">
                <FileText className="absolute left-3.5 sm:left-4 h-4.5 w-4.5 text-[#0D5C5A] shrink-0 pointer-events-none" />
                <Input
                  value={rxNumber}
                  onChange={(e) => setRxNumber(e.target.value)}
                  placeholder="Enter Prescription # (e.g. RX-2026-...) to reorder"
                  className="h-full pl-10 sm:pl-11 pr-28 sm:pr-32 border-0 bg-transparent text-[#0F172A] placeholder:text-slate-400 text-xs sm:text-sm focus-visible:ring-0 shadow-none rounded-full"
                />
                <Button
                  type="submit"
                  className="absolute right-1.5 h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-full bg-[#004341] hover:bg-[#002D2C] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs shrink-0"
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
              className="p-4 sm:p-5 rounded-[16px] border border-[#EBECEF] bg-white hover:border-[#14B8A6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all group block shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-[10px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] group-hover:bg-[#0D5C5A] group-hover:text-white transition-colors">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D5C5A] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-display font-bold text-sm text-[#0F172A] group-hover:text-[#0D5C5A] transition-colors">
                Send Prescription
              </h2>
            </Link>

            <Link
              href="/customer/medicines"
              className="p-4 sm:p-5 rounded-[16px] border border-[#EBECEF] bg-white hover:border-[#14B8A6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all group block shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
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
            </Link>

            <Link
              href="/customer/refills"
              className="p-4 sm:p-5 rounded-[16px] border border-[#EBECEF] bg-white hover:border-[#14B8A6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all group block shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
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
            <div className="space-y-2 pt-1">
              {loadingCircle ? (
                <div className="py-4 text-center text-xs text-[#64748B] space-y-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0D5C5A] border-t-transparent mx-auto" />
                  <p>Loading family circle...</p>
                </div>
              ) : (
                <>
                  {/* Primary Account Owner (Self) */}
                  <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#F8F9FA] border border-[#EBECEF]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-[#CCFBF1] text-[#047857] font-bold text-xs flex items-center justify-center">
                        {getInitials(userName)}
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-[#0F172A] block">{userName}</span>
                        <span className="text-[10px] text-[#64748B]">Self (Primary Account)</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        getActiveRxCount(null) > 0
                          ? 'text-[#0D5C5A] bg-[#F0FDFA] border border-[#99F6E4]'
                          : 'text-[#047857] bg-[#CCFBF1]'
                      }`}
                    >
                      {getActiveRxCount(null) > 0
                        ? `${getActiveRxCount(null)} Active Rx`
                        : 'Active'}
                    </span>
                  </div>

                  {/* Registered Family Members */}
                  {familyMembers
                    .filter((m) => m.relationship !== 'SELF')
                    .map((member, idx) => {
                      const count = getActiveRxCount(member.id);
                      const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-[12px] bg-[#F8F9FA] border border-[#EBECEF]"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-7 w-7 rounded-full ${colorClass} font-bold text-xs flex items-center justify-center`}
                            >
                              {getInitials(member.fullName)}
                            </div>
                            <div>
                              <span className="font-semibold text-xs text-[#0F172A] block">
                                {member.fullName}
                              </span>
                              <span className="text-[10px] text-[#64748B]">
                                {formatRelationship(member.relationship)}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                              count > 0
                                ? 'text-[#0D5C5A] bg-[#F0FDFA] border border-[#99F6E4]'
                                : 'text-slate-500 bg-slate-100'
                            }`}
                          >
                            {count > 0 ? `${count} Active Rx` : 'No Active Rx'}
                          </span>
                        </div>
                      );
                    })}
                </>
              )}
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
