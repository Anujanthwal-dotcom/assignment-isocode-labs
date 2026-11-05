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
      render: (row) => <span className="font-semibold text-[#24332E]">{row.id}</span>,
    },
    {
      key: 'store',
      header: 'Store Hub',
      render: (row) => (
        <span className="flex items-center gap-1.5 text-[#24332E]">
          <Store className="h-3.5 w-3.5 text-[#7D8A81]" />
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
        <span className="rounded-[4px] bg-[#F0F3F1] px-2 py-0.5 text-[12px] text-[#43534A] font-medium">
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
      render: (row) => <span className="text-[#64736C] text-[12px]">{row.timestamp}</span>,
    },
  ];

  return (
    <div className="space-y-[32px]">
      {/* Sample Data Disclaimer */}
      <div className="flex items-center justify-between rounded-[8px] border border-[#B9DEC9] bg-[#E8F4ED] px-4 py-2 text-[12px] text-[#23845D]">
        <span className="font-semibold uppercase tracking-wider">Preview Environment</span>
        <span>Deterministic Sample Data &bull; Persona: Admin Operations Overview</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-[28px] leading-[36px] font-semibold text-[#24332E]">
          Operations Overview
        </h1>
        <p className="text-[14px] leading-[20px] text-[#64736C] mt-1">
          High-level operational throughput, regional store compliance, and prescription verification velocity.
        </p>
      </div>

      {/* 4 Sample KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {SAMPLE_ADMIN.kpis.map((kpi, idx) => (
          <Card key={idx} className="bg-white p-5 border-[#E5EAE6]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#64736C]">{kpi.title}</span>
              <StatusBadge status={kpi.status} label="Active" />
            </div>
            <div className="mt-3">
              <span className="text-[32px] leading-[38px] font-semibold text-[#24332E]">
                {kpi.value}
              </span>
              <p className="text-[12px] text-[#7D8A81] mt-1">{kpi.subtext}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Two Column Layout: Orders-by-store Chart Placeholder & Verification Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
        {/* Orders-by-Store Chart Placeholder */}
        <Card className="lg:col-span-7 bg-white p-5 border-[#E5EAE6]">
          <CardHeader className="pb-3 border-b border-[#E5EAE6]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[18px]">Orders by Store Hub</CardTitle>
                <p className="text-[12px] text-[#64736C] mt-0.5">
                  Today&apos;s prescription distribution across top 4 hubs
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-[#176B52]" />
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Visual Bar representation without external chart dependencies */}
            {[
              { store: 'Salt Lake Hub', count: 74, pct: '85%' },
              { store: 'New Town Central', count: 52, pct: '60%' },
              { store: 'Ballygunge Branch', count: 38, pct: '44%' },
              { store: 'Park Street Annex', count: 18, pct: '22%' },
            ].map((bar, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[#24332E]">{bar.store}</span>
                  <span className="text-[#64736C] font-semibold">{bar.count} orders</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#F0F3F1] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#176B52]"
                    style={{ width: bar.pct }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-[#A4B0A8] pt-2 text-right italic">
              [Illustrative chart placeholder &bull; No external chart runtime needed]
            </p>
          </CardContent>
        </Card>

        {/* Verification Performance Placeholder */}
        <Card className="lg:col-span-5 bg-white p-5 border-[#E5EAE6] flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-[#E5EAE6]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[18px]">Verification Performance</CardTitle>
                <p className="text-[12px] text-[#64736C] mt-0.5">
                  Pharmacist SLA &amp; regulatory intake rate
                </p>
              </div>
              <Activity className="h-5 w-5 text-[#23845D]" />
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4 flex-1">
            <div className="rounded-[8px] bg-[#F7F9F7] p-3 border border-[#E5EAE6] space-y-1">
              <span className="text-[12px] text-[#64736C] block">Average Turnaround</span>
              <span className="text-[20px] font-semibold text-[#176B52]">18.4 minutes</span>
              <span className="text-[11px] text-[#23845D] block">3.2 mins faster than SLA threshold</span>
            </div>

            <div className="rounded-[8px] bg-[#F7F9F7] p-3 border border-[#E5EAE6] space-y-1">
              <span className="text-[12px] text-[#64736C] block">Audit Log Completeness</span>
              <span className="text-[20px] font-semibold text-[#24332E]">100%</span>
              <span className="text-[11px] text-[#64736C] block">Dual pharmacist sign-off verified</span>
            </div>

            <p className="text-[11px] text-[#A4B0A8] pt-2 text-right italic">
              [Verification performance placeholder]
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] leading-[26px] font-semibold text-[#24332E]">
            Recent Multi-Store Orders
          </h2>
          <span className="text-[12px] text-[#64736C]">Live Intake Stream</span>
        </div>
        <DataTable
          columns={columns}
          data={SAMPLE_ADMIN.recentOrdersTable as unknown as OrderRow[]}
        />
      </div>
    </div>
  );
};
