'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SAMPLE_ADMIN } from '@/lib/sample-data';
import {
  Store,
  BarChart3,
  Activity,
} from 'lucide-react';

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
      render: (row) => <span className="font-semibold text-[#351F65]">{row.id}</span>,
    },
    {
      key: 'store',
      header: 'Store Hub',
      render: (row) => (
        <span className="flex items-center gap-1.5 text-[#14161A]">
          <Store className="h-3.5 w-3.5 text-[#6240E8]" />
          {row.store}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
    },
    {
      key: 'schedule',
      header: 'Regulatory Class',
      render: (row) => (
        <span className="rounded-[4px] bg-[#F7F5FD] border border-[#EAE8F0] px-2 py-0.5 text-[12px] text-[#6240E8] font-semibold">
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
      render: (row) => <span className="text-[#78879A] text-[12px]">{row.timestamp}</span>,
    },
  ];

  return (
    <div className="space-y-[32px]">
      {/* Teladoc Health Disclaimer */}
      <div className="flex items-center justify-between rounded-[8px] border border-[#D6D1F7] bg-[#F7F5FD] px-4 py-2 text-[12px] text-[#6240E8]">
        <span className="font-semibold uppercase tracking-wider">Teladoc Operations</span>
        <span>Deterministic Preview &bull; Persona: Admin Operations Overview</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-[28px] leading-[36px] font-semibold text-[#351F65]">
          Operations Overview
        </h1>
        <p className="text-[14px] leading-[20px] text-[#78879A] mt-1">
          High-level operational throughput, regional store compliance, and prescription verification velocity.
        </p>
      </div>

      {/* 4 Sample KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {SAMPLE_ADMIN.kpis.map((kpi, idx) => (
          <Card key={idx} className="bg-white p-5 border-[#EAE8F0]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#78879A]">{kpi.title}</span>
              <StatusBadge status={kpi.status} label="Active" />
            </div>
            <div className="mt-3">
              <span className="text-[32px] leading-[38px] font-semibold text-[#351F65]">
                {kpi.value}
              </span>
              <p className="text-[12px] text-[#78879A] mt-1">{kpi.subtext}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Two Column Layout: Orders-by-store Chart & Verification Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
        {/* Orders-by-Store Chart Placeholder */}
        <Card className="lg:col-span-7 bg-white p-5 border-[#EAE8F0]">
          <CardHeader className="pb-3 border-b border-[#EAE8F0]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[18px] text-[#351F65]">Orders by Store Hub</CardTitle>
                <p className="text-[12px] text-[#78879A] mt-0.5">
                  Today&apos;s prescription distribution across top 4 hubs
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-[#6240E8]" />
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {[
              { store: 'Salt Lake Hub', count: 74, pct: '85%', color: 'bg-[#6240E8]' },
              { store: 'New Town Central', count: 52, pct: '60%', color: 'bg-[#00B5E2]' },
              { store: 'Ballygunge Branch', count: 38, pct: '44%', color: 'bg-[#8C72F2]' },
              { store: 'Park Street Annex', count: 18, pct: '22%', color: 'bg-[#542F9B]' },
            ].map((bar, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#351F65]">{bar.store}</span>
                  <span className="text-[#78879A] font-semibold">{bar.count} orders</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#EFF2F7] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bar.color}`}
                    style={{ width: bar.pct }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-[#ADB5BD] pt-2 text-right italic">
              [Teladoc Health Operational Distribution Chart]
            </p>
          </CardContent>
        </Card>

        {/* Verification Performance Placeholder */}
        <Card className="lg:col-span-5 bg-white p-5 border-[#EAE8F0] flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-[#EAE8F0]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[18px] text-[#351F65]">Verification Velocity</CardTitle>
                <p className="text-[12px] text-[#78879A] mt-0.5">
                  Pharmacist SLA &amp; intake throughput
                </p>
              </div>
              <Activity className="h-5 w-5 text-[#00B5E2]" />
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4 flex-1">
            <div className="rounded-[8px] bg-[#F7F5FD] p-3.5 border border-[#EAE8F0] space-y-1">
              <span className="text-[12px] text-[#78879A] block">Average Turnaround</span>
              <span className="text-[20px] font-semibold text-[#6240E8]">18.4 minutes</span>
              <span className="text-[11px] text-[#0FAC26] font-medium block">3.2 mins faster than SLA threshold</span>
            </div>

            <div className="rounded-[8px] bg-[#F7F5FD] p-3.5 border border-[#EAE8F0] space-y-1">
              <span className="text-[12px] text-[#78879A] block">Audit Log Completeness</span>
              <span className="text-[20px] font-semibold text-[#351F65]">100%</span>
              <span className="text-[11px] text-[#78879A] block">Dual clinical sign-off verified</span>
            </div>

            <p className="text-[11px] text-[#ADB5BD] pt-2 text-right italic">
              [Teladoc Health Performance Monitor]
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] leading-[26px] font-semibold text-[#351F65]">
            Recent Multi-Store Orders
          </h2>
          <span className="text-[12px] text-[#78879A]">Live Intake Stream</span>
        </div>
        <DataTable
          columns={columns}
          data={SAMPLE_ADMIN.recentOrdersTable as unknown as OrderRow[]}
        />
      </div>
    </div>
  );
};
