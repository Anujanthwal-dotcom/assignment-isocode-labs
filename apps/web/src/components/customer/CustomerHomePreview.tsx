'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SAMPLE_CUSTOMER } from '@/lib/sample-data';

export const CustomerHomePreview: React.FC = () => {
  const [activeProfile, setActiveProfile] = React.useState<string>(SAMPLE_CUSTOMER.activeProfile);
  const [reordering, setReordering] = React.useState<boolean>(false);

  const handleReorder = () => {
    setReordering(true);
    setTimeout(() => setReordering(false), 1200);
  };

  return (
    <div className="space-y-[32px]">
      {/* Clinical Clarity & Care Preview Disclaimer Banner */}
      <div className="flex items-center justify-between rounded-[8px] border border-[#99F6E4] bg-[#F0FDFA] px-4 py-2 text-[12px] text-[#0D5C5A]">
        <span className="font-semibold uppercase tracking-wider font-display">Clinical Clarity &amp; Care</span>
        <span>Deterministic Preview &bull; Persona: Customer Patient Care</span>
      </div>

      {/* Greeting & Family Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            Good morning, {SAMPLE_CUSTOMER.name}
          </h1>
          <p className="text-[14px] leading-[20px] text-[#64748B] mt-1">
            Managing pharmacy refill schedule and verified prescriptions for your family.
          </p>
        </div>

        {/* Profile pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-[#CBD5E1] self-start sm:self-auto shadow-xs">
          {SAMPLE_CUSTOMER.familyMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setActiveProfile(member.relation)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
                activeProfile === member.relation
                  ? 'bg-[#0D5C5A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0D5C5A] hover:bg-[#F0FDFA]'
              }`}
            >
              {member.relation}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: 1 col on mobile, 2 cols at 1024px+ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
        {/* Left Column: Refill & Primary Action */}
        <div className="lg:col-span-7 space-y-[24px]">
          {/* Upcoming Refill Card */}
          <Card className="border-[#E2E8F0] bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#D97706]">
                  Upcoming Refill Alert
                </span>
                <CardTitle className="text-[18px] leading-[26px] mt-1 text-[#0F172A]">
                  {SAMPLE_CUSTOMER.upcomingRefill.medicineName}
                </CardTitle>
              </div>
              <StatusBadge status="warning" label="5 Doses Remaining" />
            </CardHeader>

            <CardContent className="space-y-[16px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px] text-[#475569] bg-[#F8FAFC] p-3.5 rounded-[12px] border border-[#E2E8F0]">
                <div>
                  <span className="block text-[12px] font-medium text-[#64748B]">Schedule</span>
                  <span className="text-[#0F172A] font-semibold">
                    {SAMPLE_CUSTOMER.upcomingRefill.scheduleType} (Rx Required)
                  </span>
                </div>
                <div>
                  <span className="block text-[12px] font-medium text-[#64748B]">
                    Refill Due Date
                  </span>
                  <span className="text-[#0F172A] font-semibold">
                    {SAMPLE_CUSTOMER.upcomingRefill.dueDate}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-[12px] font-medium text-[#64748B]">
                    Dosage &amp; Doctor
                  </span>
                  <span className="text-[#0F172A]">
                    {SAMPLE_CUSTOMER.upcomingRefill.dosage} &bull;{' '}
                    {SAMPLE_CUSTOMER.upcomingRefill.prescribedBy}
                  </span>
                </div>
              </div>

              {/* Primary Reorder Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  size="lg"
                  variant="primary"
                  loading={reordering}
                  onClick={handleReorder}
                  className="w-full sm:w-auto"
                >
                  Quick Reorder Refill
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  View Original Prescription
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Schedule H Compliance Notice */}
          <div className="rounded-[12px] border border-[#99F6E4] bg-[#F0FDFA] p-4 text-[14px] text-[#0D5C5A] flex items-start gap-3">
            <span className="font-bold text-xs uppercase px-2 py-0.5 rounded-full bg-[#0D5C5A]/10 text-[#0D5C5A]">
              NOTICE
            </span>
            <div>
              <p className="font-bold text-[#0D5C5A]">Clinical Compliance Note</p>
              <p className="text-[12px] mt-0.5 text-[#0D5C5A]/90">
                Refills for blood pressure management must be verified by a registered pharmacist at
                your assigned hub ({SAMPLE_CUSTOMER.recentOrders[0].store} Store).
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Orders List */}
        <div className="lg:col-span-5 space-y-[16px]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[18px] leading-[26px] font-bold text-[#0F172A]">
              Recent Orders
            </h2>
            <span className="text-[12px] text-[#64748B]">Last 30 Days</span>
          </div>

          <div className="space-y-[12px]">
            {SAMPLE_CUSTOMER.recentOrders.map((order) => (
              <Card
                key={order.id}
                className="p-4 bg-white hover:border-[#0D5C5A] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-[#0F172A] font-display">{order.id}</span>
                      <span className="text-[12px] text-[#64748B]">&bull; {order.date}</span>
                    </div>
                    <p className="text-[14px] text-[#0F172A] mt-1 font-medium">{order.items}</p>
                    <p className="text-[12px] text-[#64748B] mt-1">
                      Fulfilled by {order.store} Store
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <StatusBadge status={order.status} label={order.statusLabel} />
                    <span className="tabular-nums text-[14px] font-extrabold text-[#0F172A]">{order.total}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
