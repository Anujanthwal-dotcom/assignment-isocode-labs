'use client';

import React from 'react';
import { PhoneCall, UploadCloud, FileQuestion, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MissingPrescriptionIllustrationProps {
  fileName?: string;
  mimeType?: string;
  compact?: boolean;
  onReupload?: () => void;
}

export const MissingPrescriptionIllustration: React.FC<MissingPrescriptionIllustrationProps> = ({
  fileName,
  mimeType,
  compact = false,
  onReupload,
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center select-none ${
        compact ? 'p-4 max-w-sm' : 'p-6 sm:p-8 max-w-lg'
      } mx-auto`}
    >
      {/* Bespoke Apologetic Medical Prescription Vector Graphic */}
      <div className={`relative ${compact ? 'w-28 h-28 mb-3' : 'w-40 h-40 mb-5'} flex items-center justify-center`}>
        {/* Soft therapeutic gradient backdrop glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#CCFBF1]/60 via-[#F0FDFA] to-amber-50/70 blur-md" />

        <svg
          viewBox="0 0 200 200"
          className="w-full h-full relative z-10 drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle concentric decorative circles */}
          <circle cx="100" cy="100" r="88" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="74" fill="#F8FAFC" />

          {/* Clipboard Backplate */}
          <rect x="52" y="38" width="96" height="126" rx="10" fill="#E2E8F0" />
          <rect x="56" y="44" width="88" height="116" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* Clipboard Clip */}
          <rect x="76" y="30" width="48" height="16" rx="4" fill="#0D5C5A" />
          <rect x="86" y="26" width="28" height="8" rx="3" fill="#14B8A6" />
          <circle cx="100" cy="38" r="3" fill="#FFFFFF" />

          {/* Rx Symbol Header on Paper */}
          <text
            x="68"
            y="68"
            fontFamily="serif"
            fontSize="18"
            fontWeight="bold"
            fontStyle="italic"
            fill="#0D5C5A"
          >
            ℞
          </text>

          {/* Dashed Missing Content Lines */}
          <line x1="88" y1="64" x2="130" y2="64" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="68" y1="80" x2="132" y2="80" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
          <line x1="68" y1="94" x2="124" y2="94" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
          <line x1="68" y1="108" x2="116" y2="108" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />

          {/* Soft Searching Magnifier Lens with Apologetic Heart / Spark */}
          <g transform="translate(102, 94)">
            {/* Magnifier Glass Glow */}
            <circle cx="34" cy="34" r="28" fill="#F0FDFA" stroke="#0D5C5A" strokeWidth="3" />
            <circle cx="34" cy="34" r="22" fill="#CCFBF1" fillOpacity="0.5" />

            {/* Missing indicator inside lens */}
            <path
              d="M26 34C26 30 30 27 34 27C38 27 42 30 42 34C42 37 38 41 34 43C30 41 26 37 26 34Z"
              fill="#F59E0B"
              fillOpacity="0.85"
            />
            <circle cx="34" cy="34" r="2" fill="#FFFFFF" />

            {/* Magnifier Handle */}
            <line x1="54" y1="54" x2="72" y2="72" stroke="#0D5C5A" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="58" y1="58" x2="70" y2="70" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Gentle Floating Medical Crosses */}
          <g opacity="0.75">
            <path d="M42 98H48M45 95V101" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" />
            <path d="M152 50H158M155 47V53" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>

        {/* Small empathetic status badge */}
        <div className="absolute -bottom-1 right-2 sm:right-6 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-xs">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          <span>File Not Found</span>
        </div>
      </div>

      {/* Short Apologetic Header */}
      <h3
        className={`font-bold text-[#0F172A] ${
          compact ? 'text-sm' : 'text-base sm:text-lg'
        } tracking-tight mb-3`}
      >
        Sorry, file not found
      </h3>

      {/* Target File Metadata Badge */}
      {fileName && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono mb-5 max-w-full truncate">
          <FileQuestion className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate" title={fileName}>
            {fileName}
          </span>
          {mimeType && (
            <span className="text-[10px] text-slate-400 uppercase font-sans shrink-0">
              ({mimeType.split('/')[1]?.toUpperCase() || mimeType})
            </span>
          )}
        </div>
      )}

      {/* Action Buttons: Re-upload & Support Helpline */}
      <div
        className={`flex ${
          compact ? 'flex-col' : 'flex-col sm:flex-row'
        } items-center justify-center gap-2.5 w-full`}
      >
        {onReupload && (
          <Button
            type="button"
            size="sm"
            onClick={onReupload}
            className="w-full sm:w-auto bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs h-9 font-semibold px-4 shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            Upload Fresh Copy
          </Button>
        )}

        <a
          href="tel:18002004567"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold h-9 px-4 transition-colors shadow-xs"
        >
          <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-[#0D5C5A]" />
          Help: 1800 200 4567
        </a>
      </div>
    </div>
  );
};
