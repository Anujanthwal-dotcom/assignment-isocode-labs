'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import { SAMPLE_PHARMACIST } from '@/lib/sample-data';
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Building2,
  Calendar,
  User,
  Clock,
  Layers,
} from 'lucide-react';

export const PharmacistWorkspacePreview: React.FC = () => {
  const rx = SAMPLE_PHARMACIST.pendingPrescription;

  return (
    <div className="space-y-[24px]">
      {/* Sample Data Disclaimer */}
      <div className="flex items-center justify-between rounded-[8px] border border-[#B9DEC9] bg-[#E8F4ED] px-4 py-2 text-[12px] text-[#23845D]">
        <span className="font-semibold uppercase tracking-wider">Preview Environment</span>
        <span>Deterministic Sample Data &bull; Persona: Pharmacist Verification Queue</span>
      </div>

      {/* Page Title & Context */}
      <div>
        <h1 className="text-[28px] leading-[36px] font-semibold text-[#24332E]">
          Verification Queue
        </h1>
        <p className="text-[14px] leading-[20px] text-[#64736C] mt-1">
          Review digital intake, doctor signatures, and regulatory schedule compliance before store dispatch.
        </p>
      </div>

      {/* Queue Summary with 3 Sample Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
        <Card className="p-4 bg-white">
          <span className="text-[12px] font-medium text-[#64736C]">Pending Verification</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-semibold text-[#24332E]">
              {SAMPLE_PHARMACIST.queueSummary.pendingVerification}
            </span>
            <StatusBadge status="warning" label="Immediate SLA" />
          </div>
          <span className="text-[11px] text-[#7D8A81] mt-1 block">Standard turnaround &lt; 20m</span>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[12px] font-medium text-[#64736C]">Escalated Compliance</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-semibold text-[#A66B16]">
              {SAMPLE_PHARMACIST.queueSummary.escalatedCompliance}
            </span>
            <StatusBadge status="danger" label="Schedule H1 / X" />
          </div>
          <span className="text-[11px] text-[#7D8A81] mt-1 block">Requires manual MD sign-off check</span>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[12px] font-medium text-[#64736C]">Ready for Dispatch</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-semibold text-[#176B52]">
              {SAMPLE_PHARMACIST.queueSummary.readyForDispatch}
            </span>
            <StatusBadge status="success" label="Passed Verification" />
          </div>
          <span className="text-[11px] text-[#7D8A81] mt-1 block">Packing at Salt Lake store</span>
        </Card>
      </div>

      {/* Active Prescription Case Card Header */}
      <Card className="p-4 bg-white border-[#E5EAE6]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#E9F3EE] text-[#176B52]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-semibold text-[#24332E]">
                  Prescription #{rx.reference}
                </span>
                <StatusBadge status="warning" label="Awaiting Pharmacist Sign-Off" />
              </div>
              <p className="text-[12px] text-[#64736C] flex items-center gap-2 mt-0.5">
                <User className="h-3.5 w-3.5" /> Patient: {rx.forPatient} &bull; Uploaded by {rx.customerName} ({rx.uploadedAt})
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
      {/* Equal column widths at 1280px+, stacked below 1024px, 24px gap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-[24px]">
        {/* Left Column: Prescription Image Placeholder */}
        <Card className="flex flex-col p-5 bg-white border-[#E5EAE6] min-h-[380px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAE6]">
            <h3 className="text-[14px] font-semibold uppercase tracking-wider text-[#64736C]">
              Scanned Prescription Document
            </h3>
            <span className="text-[12px] text-[#7D8A81]">Source: High-Res Upload</span>
          </div>

          {/* Document Canvas Placeholder */}
          <div className="mt-4 flex-1 rounded-[8px] border-2 border-dashed border-[#D3DBD5] bg-[#F7F9F7] p-6 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-white border border-[#E5EAE6] flex items-center justify-center text-[#176B52] shadow-xs">
              <FileText className="h-8 w-8" />
            </div>
            <p className="text-[14px] font-semibold text-[#24332E] mt-3">
              Hospital Prescription Slip
            </p>
            <p className="text-[12px] text-[#64736C] max-w-sm mt-1">
              {rx.hospital} &bull; {rx.doctorName}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-[6px] bg-white border border-[#E5EAE6] px-3 py-1 text-[11px] text-[#43534A]">
              <span>Diagnosis: {rx.diagnosis}</span>
            </div>
            <p className="text-[11px] text-[#A4B0A8] mt-4 italic">
              [Simulated scan preview &bull; 300 DPI compliance archival format]
            </p>
          </div>
        </Card>

        {/* Right Column: Extracted Medicine Details & Regulatory Guards */}
        <div className="space-y-[16px]">
          <Card className="p-5 bg-white border-[#E5EAE6]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAE6]">
              <h3 className="text-[14px] font-semibold uppercase tracking-wider text-[#64736C]">
                Extracted Prescription Lines (2 items)
              </h3>
              <span className="text-[12px] text-[#176B52] font-medium">OCR Confidence: 98%</span>
            </div>

            <div className="mt-4 space-y-3">
              {rx.medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="rounded-[8px] border border-[#E5EAE6] bg-[#F7F9F7] p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-[#24332E]">{med.name}</p>
                      <p className="text-[12px] text-[#64736C]">
                        {med.frequency} &bull; {med.duration} (Qty: {med.quantity})
                      </p>
                    </div>
                    <StatusBadge status="information" label={med.schedule} />
                  </div>

                  <div className="flex items-center justify-between text-[12px] pt-1 border-t border-[#E5EAE6]/70">
                    <span className="text-[#64736C] flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-[#7D8A81]" />
                      Store Stock: {med.availableStock} units available
                    </span>
                    <span className="font-medium text-[#23845D]">In Stock (Salt Lake)</span>
                  </div>

                  {'warning' in med && med.warning && (
                    <div className="rounded-[6px] bg-[#FFF5E5] border border-[#F0D7A8] p-2 text-[12px] text-[#A66B16] flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{med.warning}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Semantic Status Demonstrations: Warning & Blocked Examples */}
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
