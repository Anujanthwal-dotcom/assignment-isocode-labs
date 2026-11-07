'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import { SAMPLE_PHARMACIST } from '@/lib/sample-data';

export const PharmacistWorkspacePreview: React.FC = () => {
  const rx = SAMPLE_PHARMACIST.pendingPrescription;

  return (
    <div className="space-y-[24px]">
      {/* Clinical Clarity & Care Banner */}
      <div className="flex items-center justify-between rounded-[8px] border border-[#99F6E4] bg-[#F0FDFA] px-4 py-2 text-[12px] text-[#0D5C5A]">
        <span className="font-semibold uppercase tracking-wider font-display">Clinical Clarity &amp; Care</span>
        <span>Deterministic Preview &bull; Persona: Clinical Pharmacist Verification</span>
      </div>

      {/* Page Title & Context */}
      <div>
        <h1 className="font-display text-[28px] leading-[36px] font-bold text-[#0F172A]">
          Verification Queue
        </h1>
        <p className="text-[14px] leading-[20px] text-[#64748B] mt-1">
          Review digital intake, doctor signatures, and regulatory schedule compliance before store
          dispatch.
        </p>
      </div>

      {/* Queue Summary with 3 Sample Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
        <Card className="p-5 bg-white border-[#E2E8F0]">
          <span className="text-[12px] font-semibold text-[#64748B]">Pending Verification</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="tabular-nums font-display text-[32px] font-bold text-[#0D5C5A]">
              {SAMPLE_PHARMACIST.queueSummary.pendingVerification}
            </span>
            <StatusBadge status="warning" label="Immediate SLA" />
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Clinical turnaround &lt; 20m
          </span>
        </Card>

        <Card className="p-5 bg-white border-[#E2E8F0]">
          <span className="text-[12px] font-semibold text-[#64748B]">Escalated Compliance</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="tabular-nums font-display text-[32px] font-bold text-[#D97706]">
              {SAMPLE_PHARMACIST.queueSummary.escalatedCompliance}
            </span>
            <StatusBadge status="danger" label="Schedule H1 / X" />
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Requires manual MD sign-off check
          </span>
        </Card>

        <Card className="p-5 bg-white border-[#E2E8F0]">
          <span className="text-[12px] font-semibold text-[#64748B]">Ready for Dispatch</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="tabular-nums font-display text-[32px] font-bold text-[#059669]">
              {SAMPLE_PHARMACIST.queueSummary.readyForDispatch}
            </span>
            <StatusBadge status="success" label="Passed Verification" />
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">Packing at Salt Lake hub</span>
        </Card>
      </div>

      {/* Active Prescription Case Card Header */}
      <Card className="p-5 bg-white border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-[18px] font-bold text-[#0F172A]">
                  Prescription #{rx.reference}
                </span>
                <StatusBadge status="warning" label="Awaiting Sign-Off" />
              </div>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Patient: {rx.forPatient} &bull; Uploaded by {rx.customerName} ({rx.uploadedAt})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Escalate to Doctor
            </Button>
            <Button variant="primary" size="sm">
              Approve &amp; Sign
            </Button>
          </div>
        </div>
      </Card>

      {/* Two-Column Prescription Review Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-[24px]">
        {/* Left Column: Prescription Image Placeholder */}
        <Card className="flex flex-col p-5 bg-white border-[#E2E8F0] min-h-[380px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <h3 className="font-display text-[13px] font-bold uppercase tracking-wider text-[#0F172A]">
              Scanned Prescription Document
            </h3>
            <span className="text-[12px] text-[#64748B]">Source: Telehealth Intake</span>
          </div>

          {/* Document Canvas Placeholder */}
          <div className="mt-4 flex-1 rounded-[12px] border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#CCFBF1] text-[#047857]">
              DOCUMENT ARCHIVE
            </span>
            <p className="font-display text-[15px] font-bold text-[#0F172A] mt-3">
              Hospital Clinical Rx Slip
            </p>
            <p className="text-[12px] text-[#64748B] max-w-sm mt-1">
              {rx.doctorName} &bull; {rx.hospital}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E2E8F0] px-3.5 py-1 text-[11px] font-semibold text-[#0F172A]">
              <span>Diagnosis: {rx.diagnosis}</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-4 italic">
              [Clinical Clarity &bull; 300 DPI OCR compliance archive]
            </p>
          </div>
        </Card>

        {/* Right Column: Extracted Medicine Details & Regulatory Guards */}
        <div className="space-y-[16px]">
          <Card className="p-5 bg-white border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="font-display text-[13px] font-bold uppercase tracking-wider text-[#0F172A]">
                Extracted Prescription Lines (2 items)
              </h3>
              <span className="text-[12px] text-[#059669] font-bold">OCR Confidence: 98%</span>
            </div>

            <div className="mt-4 space-y-3">
              {rx.medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-[14px] font-bold text-[#0F172A]">{med.name}</p>
                      <p className="text-[12px] text-[#64748B]">
                        {med.frequency} &bull; {med.duration} (Qty: {med.quantity})
                      </p>
                    </div>
                    <StatusBadge status="information" label={med.schedule} />
                  </div>

                  <div className="flex items-center justify-between text-[12px] pt-1.5 border-t border-[#E2E8F0]">
                    <span className="text-[#64748B]">
                      Store Stock: {med.availableStock} units available
                    </span>
                    <span className="font-bold text-[#059669]">In Stock (Salt Lake)</span>
                  </div>

                  {'warning' in med && med.warning && (
                    <div className="rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] p-2.5 text-[12px] text-[#92400E]">
                      <span>{med.warning}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Semantic Alerts */}
          <SemanticAlert
            type="warning"
            title="Schedule H Regulatory Notice"
            description="Dispensing Telmisartan requires patient verification record stored in the compliance register."
          />

          <SemanticAlert
            type="error"
            title="Simulated Blocked Status: Schedule X Guard"
            description="If prescription contains habit-forming narcotics without dual sign-off, system automatically prevents dispatch."
          />
        </div>
      </div>
    </div>
  );
};
