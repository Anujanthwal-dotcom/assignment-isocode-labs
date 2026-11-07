'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SAMPLE_ADMIN } from '@/lib/sample-data';

interface OrderRow {
  id: string;
  store: string;
  customer: string;
  schedule: string;
  itemsCount: number;
  status: 'pending' | 'blocked' | 'completed' | 'processing';
  timestamp: string;
  [key: string]: unknown;
}

export const AdminOverviewPreview: React.FC = () => {
  const columns: Column<OrderRow>[] = [
    {
      key: 'id',
      header: 'Order Ref',
      render: (row) => <span className="font-display font-bold text-[#0D5C5A]">{row.id}</span>,
    },
    {
      key: 'store',
      header: 'Store Hub',
      render: (row) => <span className="text-[#0F172A] font-medium">{row.store}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
    },
    {
      key: 'schedule',
      header: 'Regulatory Class',
      render: (row) => (
        <span className="rounded-full bg-[#F0FDFA] border border-[#99F6E4] px-2.5 py-0.5 text-[11px] text-[#0D5C5A] font-semibold">
          {row.schedule}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Verification Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'timestamp',
      header: 'Time',
      className: 'text-right',
      render: (row) => <span className="text-[#64748B] text-[12px]">{row.timestamp}</span>,
    },
  ];

  return (
    <div className="space-y-[32px]">
      {/* Clinical Clarity & Care Disclaimer */}
      <div className="flex items-center justify-between rounded-[8px] border border-[#99F6E4] bg-[#F0FDFA] px-4 py-2 text-[12px] text-[#0D5C5A]">
        <span className="font-semibold uppercase tracking-wider font-display">Clinical Clarity &amp; Care</span>
        <span>Deterministic Preview &bull; Persona: Admin Operations Overview</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="font-display text-[28px] leading-[36px] font-bold text-[#0F172A]">
          Operations Overview
        </h1>
        <p className="text-[14px] leading-[20px] text-[#64748B] mt-1">
          High-level operational throughput, regional store compliance, and prescription
          verification velocity.
        </p>
      </div>

      {/* 4 Sample KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {SAMPLE_ADMIN.kpis.map((kpi, idx) => (
          <Card key={idx} className="bg-white p-5 border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#64748B]">{kpi.title}</span>
              <StatusBadge status={kpi.status} label="Active" />
            </div>
            <div className="mt-3">
              <span className="tabular-nums font-display text-[32px] leading-[38px] font-bold text-[#0F172A]">
                {kpi.value}
              </span>
              <p className="text-[12px] text-[#64748B] mt-1">{kpi.subtext}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Two Column Layout: Orders-by-store Chart & Verification Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
        {/* Orders-by-Store Chart Placeholder */}
        <Card className="lg:col-span-7 bg-white p-5 border-[#E2E8F0]">
          <CardHeader className="pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[18px] text-[#0F172A]">Orders by Store Hub</CardTitle>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Today&apos;s prescription distribution across top 4 hubs
                </p>
              </div>
              <span className="text-xs font-semibold text-[#0D5C5A]">[Hub Metrics]</span>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {[
              { store: 'Salt Lake Hub', count: 74, pct: '85%', color: 'bg-[#0D5C5A]' },
              { store: 'New Town Central', count: 52, pct: '60%', color: 'bg-[#14B8A6]' },
              { store: 'Ballygunge Branch', count: 38, pct: '44%', color: 'bg-[#0284C7]' },
              { store: 'Park Street Annex', count: 18, pct: '22%', color: 'bg-[#004341]' },
            ].map((bar, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#0F172A]">{bar.store}</span>
                  <span className="text-[#64748B] font-semibold">{bar.count} orders</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#EFF4FF] overflow-hidden">
                  <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.pct }} />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-[#94A3B8] pt-2 text-right italic">
              [Clinical Clarity &bull; Multi-Store Operational Distribution]
            </p>
          </CardContent>
        </Card>

        {/* Verification Performance Placeholder */}
        <Card className="lg:col-span-5 bg-white p-5 border-[#E2E8F0] flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[18px] text-[#0F172A]">Verification Velocity</CardTitle>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Pharmacist SLA &amp; intake throughput
                </p>
              </div>
              <span className="text-xs font-semibold text-[#14B8A6]">[SLA Status]</span>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4 flex-1">
            <div className="rounded-[12px] bg-[#F8FAFC] p-4 border border-[#E2E8F0] space-y-1">
              <span className="text-[12px] text-[#64748B] block">Average Turnaround</span>
              <span className="tabular-nums font-display text-[22px] font-bold text-[#0D5C5A]">18.4 minutes</span>
              <span className="text-[11px] text-[#059669] font-medium block">
                3.2 mins faster than SLA threshold
              </span>
            </div>

            <div className="rounded-[12px] bg-[#F8FAFC] p-4 border border-[#E2E8F0] space-y-1">
              <span className="text-[12px] text-[#64748B] block">Audit Log Completeness</span>
              <span className="tabular-nums font-display text-[22px] font-bold text-[#0F172A]">100%</span>
              <span className="text-[11px] text-[#64748B] block">
                Dual clinical sign-off verified
              </span>
            </div>

            <p className="text-[11px] text-[#94A3B8] pt-2 text-right italic">
              [Clinical Clarity &bull; Regulatory SLA Monitor]
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] leading-[26px] font-bold text-[#0F172A]">
            Recent Multi-Store Orders
          </h2>
          <span className="text-[12px] text-[#64748B]">Live Intake Stream</span>
        </div>
        <DataTable
          columns={columns}
          data={SAMPLE_ADMIN.recentOrdersTable as unknown as OrderRow[]}
        />
      </div>
    </div>
  );
};
