'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SAMPLE_CUSTOMER } from '@/lib/sample-data';
import { RefreshCw, AlertCircle, FileText, Calendar, Building2 } from 'lucide-react';

export const CustomerHomePreview: React.FC = () => {
  const [activeProfile, setActiveProfile] = React.useState<string>(SAMPLE_CUSTOMER.activeProfile);
  const [reordering, setReordering] = React.useState<boolean>(false);

  const handleReorder = () => {
    setReordering(true);
    setTimeout(() => setReordering(false), 1200);
  };

  return (
    <div className="space-y-[32px]">
      {/* Teladoc Health Preview Disclaimer Banner */}
      <div className="flex items-center justify-between rounded-[8px] border border-[#D6D1F7] bg-[#F7F5FD] px-4 py-2 text-[12px] text-[#6240E8]">
        <span className="font-semibold uppercase tracking-wider">Teladoc Health Portal</span>
        <span>Deterministic Preview &bull; Persona: Customer Patient Care</span>
      </div>

      {/* Greeting & Family Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            Good morning, {SAMPLE_CUSTOMER.name}
          </h1>
          <p className="text-[14px] leading-[20px] text-[#78879A] mt-1">
            Managing pharmacy refill schedule and verified prescriptions for your family.
          </p>
        </div>

        {/* Profile pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-[8px] border border-[#EAE8F0] self-start sm:self-auto shadow-xs">
          {SAMPLE_CUSTOMER.familyMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setActiveProfile(member.relation)}
              className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                activeProfile === member.relation
                  ? 'bg-[#6240E8] text-white shadow-xs'
                  : 'text-[#6C757D] hover:text-[#351F65] hover:bg-[#F7F5FD]'
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
          <Card className="border-[#EAE8F0] bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6240E8]">
                  Upcoming Refill Alert
                </span>
                <CardTitle className="text-[18px] leading-[26px] mt-1 text-[#351F65]">
                  {SAMPLE_CUSTOMER.upcomingRefill.medicineName}
                </CardTitle>
              </div>
              <StatusBadge status="warning" label="5 Doses Remaining" />
            </CardHeader>

            <CardContent className="space-y-[16px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px] text-[#6C757D] bg-[#F8F9FB] p-3.5 rounded-[8px] border border-[#EAE8F0]">
                <div>
                  <span className="block text-[12px] font-medium text-[#78879A]">Schedule</span>
                  <span className="text-[#351F65] font-semibold">
                    {SAMPLE_CUSTOMER.upcomingRefill.scheduleType} (Rx Required)
                  </span>
                </div>
                <div>
                  <span className="block text-[12px] font-medium text-[#78879A]">
                    Refill Due Date
                  </span>
                  <span className="text-[#351F65] font-semibold flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#6240E8]" />
                    {SAMPLE_CUSTOMER.upcomingRefill.dueDate}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-[12px] font-medium text-[#78879A]">
                    Dosage &amp; Doctor
                  </span>
                  <span className="text-[#14161A]">
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
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Quick Reorder Refill
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <FileText className="mr-2 h-4 w-4 text-[#6240E8]" />
                  View Original Prescription
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Schedule H Compliance Notice (Teal Accent) */}
          <div className="rounded-[8px] border border-[#B4EDFB] bg-[#EBF9FD] p-4 text-[14px] text-[#0088AA] flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-[#0088AA]" />
            <div>
              <p className="font-semibold text-[#0088AA]">Teladoc Health Compliance Note</p>
              <p className="text-[12px] mt-0.5 text-[#0088AA]/90">
                Refills for blood pressure management must be verified by a registered pharmacist at
                your assigned hub ({SAMPLE_CUSTOMER.recentOrders[0].store} Store).
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Orders List */}
        <div className="lg:col-span-5 space-y-[16px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] leading-[26px] font-semibold text-[#351F65]">
              Recent Orders
            </h2>
            <span className="text-[12px] text-[#78879A]">Last 30 Days</span>
          </div>

          <div className="space-y-[12px]">
            {SAMPLE_CUSTOMER.recentOrders.map((order) => (
              <Card
                key={order.id}
                className="p-4 bg-white hover:border-[#6240E8] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[14px] text-[#351F65]">{order.id}</span>
                      <span className="text-[12px] text-[#78879A]">&bull; {order.date}</span>
                    </div>
                    <p className="text-[14px] text-[#14161A] mt-1 font-medium">{order.items}</p>
                    <p className="text-[12px] text-[#78879A] flex items-center gap-1 mt-1">
                      <Building2 className="h-3.5 w-3.5 text-[#6240E8]" />
                      Fulfilled by {order.store} Store
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <StatusBadge status={order.status} label={order.statusLabel} />
                    <span className="text-[14px] font-semibold text-[#351F65]">{order.total}</span>
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
