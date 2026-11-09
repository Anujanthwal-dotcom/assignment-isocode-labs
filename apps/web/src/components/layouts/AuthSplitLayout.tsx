'use client';

import * as React from 'react';
import { BackButton } from '@/components/shared/BackButton';

interface AuthSplitLayoutProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  title,
  subtitle,
  backHref,
  backLabel = 'Back to Portals',
  children,
}) => {
  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-100 font-sans">
      {/* =========================================================================
          LEFT 60% COLUMN: Kolkata Pharmacy Visual with Vertically Centered Tag Line
          ========================================================================= */}
      <section className="relative lg:w-[60%] flex flex-col justify-center p-8 sm:p-12 lg:p-16 overflow-hidden min-h-[380px] lg:min-h-screen">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-100 transition-transform duration-1000 ease-out"
          style={{ backgroundImage: "url('/images/kolkata-pharmacy.jpg')" }}
        />
        {/* Solid Ambient Scrim for Center Tagline Readability */}
        <div className="absolute inset-0 bg-slate-950/75 z-0" />

        {/* Main Tag Line (Vertically Centered) */}
        <div className="relative z-10 max-w-xl space-y-3">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
            Clinical Precision. Instant Dispensing. Zero Non-Compliance.
          </h2>
          <p className="text-base sm:text-lg text-slate-300 font-normal drop-shadow-sm">
            Enterprise Pharmacy &amp; Multi-Store Management System &bull; Kolkata &amp; Howrah
          </p>
        </div>
      </section>

      {/* =========================================================================
          RIGHT 40% COLUMN: Clean White Auth Panel
          ========================================================================= */}
      <section className="lg:w-[40%] bg-white text-[#0F172A] flex flex-col justify-center p-6 sm:p-10 lg:p-14 border-l border-[#CBD5E1] min-h-screen">
        <div className="w-full max-w-md mx-auto space-y-6">
          {backHref && (
            <div>
              <BackButton href={backHref} label={backLabel} variant="subtle" />
            </div>
          )}

          <div className="pb-5 border-b border-[#E2E8F0]">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A]">{title}</h1>
            {subtitle && <p className="text-xs text-[#64748B] mt-1">{subtitle}</p>}
          </div>

          {children}
        </div>
      </section>
    </main>
  );
};
