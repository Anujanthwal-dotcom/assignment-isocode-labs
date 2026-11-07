'use client';

import * as React from 'react';
import { ShieldCheck, Truck, CheckCircle2, PhoneCall, FileText } from 'lucide-react';

export const CustomerFooter: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#EBECEF] bg-white text-[#0F172A] mt-12">
      {/* 1. Clinical Pharmacy Assurance & Compliance Notes */}
      <div className="border-b border-[#EBECEF] bg-[#F8F9FA] py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#0D5C5A]">
              <ShieldCheck className="h-5 w-5 text-[#059669]" />
              <h3 className="font-display text-sm font-bold tracking-tight text-[#0F172A] uppercase">
                Clinical Pharmacy Assurance &amp; Statutory Notes
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-[#047857] bg-[#CCFBF1] px-2.5 py-0.5 rounded-full self-start sm:self-auto">
              Drugs &amp; Cosmetics Act Certified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-[#475569]">
            {/* Note 1 */}
            <div className="p-4 rounded-[14px] bg-white border border-[#EBECEF] space-y-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 text-[#0D5C5A] font-bold text-[13px]">
                <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
                <span>Schedule H &amp; H1 Regulatory Sign-off</span>
              </div>
              <p className="leading-relaxed text-[#64748B]">
                Prescriptions for scheduled antibiotics and psychotropic drugs undergo mandatory validation and sign-off by registered pharmacists before dispensing.
              </p>
            </div>

            {/* Note 2 */}
            <div className="p-4 rounded-[14px] bg-white border border-[#EBECEF] space-y-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 text-[#0D5C5A] font-bold text-[13px]">
                <Truck className="h-4 w-4 text-[#059669] shrink-0" />
                <span>100% Tamper-Evident Cold-Chain Packaging</span>
              </div>
              <p className="leading-relaxed text-[#64748B]">
                All insulins, biologics, and refrigerated formulations are maintained in validated thermal cold boxes (2°C - 8°C) until doorstep delivery.
              </p>
            </div>

            {/* Note 3 */}
            <div className="p-4 rounded-[14px] bg-white border border-[#EBECEF] space-y-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 text-[#0D5C5A] font-bold text-[13px]">
                <FileText className="h-4 w-4 text-[#059669] shrink-0" />
                <span>Zero Counterfeit &bull; Batch Traceability</span>
              </div>
              <p className="leading-relaxed text-[#64748B]">
                Medicines are received directly from authorized pharmaceutical manufacturers with unique batch numbers and digital audit trail verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Store Licensing, Helpline & Legal Footer */}
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-semibold text-[#0F172A]">
              Kolkata &amp; Howrah Digital Pharmacy Network
            </p>
            <p className="text-[11px]">
              Assigned Fulfilment Hub: Salt Lake Sector 1 (DL No: KOL-001/PH/2024) &bull; Howrah Hub (DL No: HOW-001/PH/2024)
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#475569]">
            <div className="flex items-center gap-1.5 bg-[#F0FDFA] border border-[#99F6E4] px-3 py-1.5 rounded-full text-[#0D5C5A] font-bold">
              <PhoneCall className="h-3.5 w-3.5 text-[#059669]" />
              <span>Pharmacist Helpline: 1800-240-PHARM</span>
            </div>
            <span>&copy; 2026 Clinical Clarity &amp; Care</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
