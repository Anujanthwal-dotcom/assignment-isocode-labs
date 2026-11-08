'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  IndianRupee,
  LogOut,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  UserCog,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/lib/auth/auth-context';
import { apiFetch } from '@/lib/api/client';

interface OverviewDto {
  totalRevenue?: number;
  totalOrders?: number;
  fulfilmentOrders?: number;
  activeStoresCount?: number;
  customersCount?: number;
  pharmacistsCount?: number;
  staffCount?: number;
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [storeCount, setStoreCount] = React.useState<number | null>(null);
  const [overview, setOverview] = React.useState<OverviewDto | null>(null);
  const [loadingOverview, setLoadingOverview] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    apiFetch<any[]>('/stores')
      .then((stores) => {
        if (isMounted && Array.isArray(stores)) {
          setStoreCount(stores.length);
        }
      })
      .catch(() => {});

    apiFetch<OverviewDto>('/admin/analytics/overview?period=30D')
      .then((res) => {
        if (isMounted && res) {
          setOverview(res);
          if (typeof res.activeStoresCount === 'number') {
            setStoreCount(res.activeStoresCount);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setLoadingOverview(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  const adminName = user?.profile?.fullName || 'System Administrator';
  const roleName = user?.role || 'ADMIN';

  const metrics = overview
    ? [
        {
          label: 'Total Sales (GMV)',
          value: `₹${Number(overview.totalRevenue ?? 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0,
          })}`,
          hint: 'Recorded orders',
          icon: IndianRupee,
          chip: 'bg-[#F0FDFA] text-[#0D5C5A]',
          valueClass: 'text-[#0F172A]',
        },
        {
          label: 'Total Orders',
          value: String(overview.totalOrders ?? 0),
          hint: `${overview.fulfilmentOrders ?? 0} in progress`,
          icon: ShoppingBag,
          chip: 'bg-blue-50 text-blue-600',
          valueClass: 'text-blue-600',
        },
        {
          label: 'Active Stores',
          value: String(overview.activeStoresCount ?? 0),
          hint: 'Retail pharmacy hubs',
          icon: Store,
          chip: 'bg-[#F0FDFA] text-[#0D5C5A]',
          valueClass: 'text-[#0D5C5A]',
        },
        {
          label: 'Customers',
          value: String(overview.customersCount ?? 0),
          hint: 'Registered accounts',
          icon: Users,
          chip: 'bg-purple-50 text-purple-600',
          valueClass: 'text-purple-600',
        },
        {
          label: 'Pharmacists',
          value: String(overview.pharmacistsCount ?? 0),
          hint: 'Licensed verifiers',
          icon: Pill,
          chip: 'bg-emerald-50 text-emerald-600',
          valueClass: 'text-emerald-600',
        },
        {
          label: 'Store Staff',
          value: String(overview.staffCount ?? 0),
          hint: 'Dispensing staff',
          icon: UserCog,
          chip: 'bg-amber-50 text-amber-600',
          valueClass: 'text-slate-800',
        },
      ]
    : [];

  const identityItems = [
    {
      label: 'Administrator Name',
      icon: UserCog,
      content: <span className="text-[15px] font-semibold text-[#0F172A]">{adminName}</span>,
    },
    {
      label: 'Assigned Role',
      icon: ShieldCheck,
      content: <StatusBadge status="information" label={roleName} />,
    },
    {
      label: 'Account Status',
      icon: CheckCircle2,
      content: <StatusBadge status="success" label={user?.status || 'ACTIVE'} />,
    },
    {
      label: 'Access Scope',
      icon: Building2,
      content: (
        <span className="text-[13px] font-medium leading-[20px] text-[#0F172A]">
          {storeCount !== null
            ? `Full Chain Operations (${storeCount} Active ${
                storeCount === 1 ? 'Store' : 'Stores'
              }) & Regulatory Compliance`
            : 'Full Chain Operations & Regulatory Compliance'}
        </span>
      ),
    },
  ];

  const quickLinks = [
    {
      href: '/admin/orders',
      title: 'Sales & Orders',
      icon: IndianRupee,
    },
    {
      href: '/admin/stores',
      title: 'Store Directory',
      icon: Boxes,
    },
    {
      href: '/admin/compliance',
      title: 'Compliance Setup',
      icon: ShieldCheck,
    },
    {
      href: '/admin/fulfilment',
      title: 'Fulfilment Operations',
      icon: Truck,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
            Operations &amp; Compliance Administration
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full shrink-0 gap-2 sm:w-auto"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Administrator Identity & Authorization */}
      <Card className="border-[#E2E8F0] p-6 sm:p-7">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-5">
          <h2 className="font-display text-[18px] font-bold tracking-tight text-[#0F172A]">
            Administrator Identity &amp; Authorization Level
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {identityItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0D5C5A] border border-slate-200">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    {item.label}
                  </span>
                  {item.content}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Live Operational Metrics Summary */}
      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-display text-[18px] font-bold tracking-tight text-[#0F172A]">
              Live Chain Operations &amp; Sales
            </h2>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0D5C5A] hover:underline"
          >
            View Sales &amp; Orders
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loadingOverview ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-[132px] animate-pulse rounded-[16px] border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : overview ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card
                  key={metric.label}
                  className="border-[#E2E8F0] p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-[#64748B]">
                      {metric.label}
                    </span>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${metric.chip}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <div
                      className={`font-display text-[26px] font-bold leading-[32px] tabular-nums ${metric.valueClass}`}
                    >
                      {metric.value}
                    </div>
                    <p className="mt-1 text-[12px] text-[#64748B]">{metric.hint}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-[13px] text-[#64748B]">
            Live metrics are currently unavailable. Please refresh to try again.
          </div>
        )}
      </section>

      {/* Quick Navigation Panels */}
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="font-display text-[18px] font-bold tracking-tight text-[#0F172A]">
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start gap-4 rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-xs transition-all duration-200 hover:border-[#0D5C5A] hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0D5C5A]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-[#0F172A]">{link.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0D5C5A]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
