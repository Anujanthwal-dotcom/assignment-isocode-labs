'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, SearchInput, PasswordInput } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { FileUpload } from '@/components/ui/file-upload';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import { DataTable, type Column } from '@/components/shared/DataTable';

interface SampleRow {
  code: string;
  name: string;
  category: string;
  stock: number;
  status: 'completed' | 'pending' | 'blocked';
  [key: string]: unknown;
}

export const DesignSystemShowcase: React.FC = () => {
  const [btnLoading, setBtnLoading] = React.useState(false);
  const [tableState, setTableState] = React.useState<'normal' | 'loading' | 'empty' | 'error'>(
    'normal',
  );

  const sampleRows: SampleRow[] = [
    {
      code: 'MED-001',
      name: 'Telmisartan 40 mg',
      category: 'Antihypertensive',
      stock: 240,
      status: 'completed',
    },
    {
      code: 'MED-002',
      name: 'Metformin 500 mg',
      category: 'Antidiabetic',
      stock: 180,
      status: 'pending',
    },
    {
      code: 'MED-003',
      name: 'Alprazolam 0.5 mg',
      category: 'Schedule H1 / Psychotropic',
      stock: 45,
      status: 'blocked',
    },
  ];

  const columns: Column<SampleRow>[] = [
    {
      key: 'code',
      header: 'Item Code',
      render: (r) => <span className="tabular-nums font-mono text-[13px] text-[#0D5C5A] font-semibold">{r.code}</span>,
    },
    {
      key: 'name',
      header: 'Medicine Description',
      render: (r) => <span className="font-semibold text-[#0F172A] font-display">{r.name}</span>,
    },
    { key: 'category', header: 'Classification' },
    { key: 'stock', header: 'Stock Units', render: (r) => <span className="tabular-nums">{r.stock} units</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-12 px-4 sm:px-8 lg:px-12 max-w-6xl mx-auto space-y-16">
      {/* Title Header */}
      <div className="border-b border-[#E2E8F0] pb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0FDFA] border border-[#99F6E4] text-[#0D5C5A] text-[12px] font-bold tracking-wider uppercase">
          Design Identity: Clinical Clarity &amp; Care
        </div>
        <h1 className="font-display text-[36px] sm:text-[40px] leading-[44px] font-bold text-[#0F172A] tracking-tight">
          Clinical Clarity &amp; Care Design System
        </h1>
        <p className="text-[16px] leading-[26px] text-[#475569] max-w-3xl">
          Authoritative, empathetic, meticulously organized, and serenely calm healthcare design tokens
          for Customer, Pharmacist, and Admin operations.
        </p>
      </div>

      {/* 1. Core Palette */}
      <section id="brand-colors" className="space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2">
          <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            1. Core Clinical Palette
          </h2>
          <p className="text-[14px] text-[#64748B]">
            Primary Therapeutic Teal (#0D5C5A), Secondary Eucalyptus (#14B8A6), and Tertiary Trust Blue (#0284C7).
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-16 w-full rounded-[8px] bg-[#0D5C5A]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Primary Teal</p>
              <p className="text-[12px] font-mono text-[#64748B]">#0D5C5A</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-16 w-full rounded-[8px] bg-[#0A4846]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Teal Hover</p>
              <p className="text-[12px] font-mono text-[#64748B]">#0A4846</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-16 w-full rounded-[8px] bg-[#14B8A6]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Eucalyptus</p>
              <p className="text-[12px] font-mono text-[#64748B]">#14B8A6</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-16 w-full rounded-[8px] bg-[#CCFBF1] border border-[#99F6E4]" />
            <div>
              <p className="text-[13px] font-bold text-[#047857]">Mint Container</p>
              <p className="text-[12px] font-mono text-[#64748B]">#CCFBF1</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-16 w-full rounded-[8px] bg-[#0284C7]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Trust Blue</p>
              <p className="text-[12px] font-mono text-[#64748B]">#0284C7</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-16 w-full rounded-[8px] bg-[#D97706]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Refill Amber</p>
              <p className="text-[12px] font-mono text-[#64748B]">#D97706</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Layered Surface Canvas */}
      <section id="neutral-colors" className="space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2">
          <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            2. Layered Surface Canvas
          </h2>
          <p className="text-[14px] text-[#64748B]">
            Pristine clinical white (#FFFFFF), resting slate canvas (#F8FAFC), and calming mint wash (#F0FDFA).
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-14 w-full rounded-[8px] border border-[#E2E8F0] bg-white" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Clinical White</p>
              <p className="text-[12px] font-mono text-[#64748B]">#FFFFFF</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-14 w-full rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Base Canvas</p>
              <p className="text-[12px] font-mono text-[#64748B]">#F8FAFC</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-14 w-full rounded-[8px] border border-[#99F6E4] bg-[#F0FDFA]" />
            <div>
              <p className="text-[13px] font-bold text-[#047857]">Mint Wash</p>
              <p className="text-[12px] font-mono text-[#64748B]">#F0FDFA</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-14 w-full rounded-[8px] border border-[#CBD5E1] bg-[#E2E8F0]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Border Slate</p>
              <p className="text-[12px] font-mono text-[#64748B]">#E2E8F0</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-14 w-full rounded-[8px] bg-[#0F172A]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Headings Slate</p>
              <p className="text-[12px] font-mono text-[#64748B]">#0F172A</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-xs">
            <div className="h-14 w-full rounded-[8px] bg-[#475569]" />
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Body Slate</p>
              <p className="text-[12px] font-mono text-[#64748B]">#475569</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Semantic Accents */}
      <section id="semantic-colors" className="space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2">
          <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            3. Semantic Safety Accents
          </h2>
          <p className="text-[14px] text-[#64748B]">
            Clinical Green (#059669), Adherence Marigold Amber (#D97706), Contraindication Red (#DC2626), and Trust Blue (#0284C7).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[12px] border border-[#99F6E4] bg-white p-4 space-y-3 shadow-xs">
            <div className="h-16 w-full rounded-[8px] border border-[#99F6E4] bg-[#CCFBF1] text-[#047857] flex items-center justify-center font-bold text-[14px]">
              Verified &amp; Safe
            </div>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Foreground:</span>
                <span className="font-mono text-[#047857] font-bold">#059669</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Base Wash:</span>
                <span className="font-mono text-[#0F172A]">#CCFBF1</span>
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#FDE68A] bg-white p-4 space-y-3 shadow-xs">
            <div className="h-16 w-full rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] text-[#D97706] flex items-center justify-center font-bold text-[14px]">
              Refill Notice
            </div>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Foreground:</span>
                <span className="font-mono text-[#D97706] font-bold">#D97706</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Base Wash:</span>
                <span className="font-mono text-[#0F172A]">#FFFBEB</span>
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#FECACA] bg-white p-4 space-y-3 shadow-xs">
            <div className="h-16 w-full rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center font-bold text-[14px]">
              Warning / Alert
            </div>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Foreground:</span>
                <span className="font-mono text-[#DC2626] font-bold">#DC2626</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Base Wash:</span>
                <span className="font-mono text-[#0F172A]">#FEF2F2</span>
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#BAE6FD] bg-white p-4 space-y-3 shadow-xs">
            <div className="h-16 w-full rounded-[8px] border border-[#BAE6FD] bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold text-[14px]">
              Clinical Info
            </div>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Foreground:</span>
                <span className="font-mono text-[#0284C7] font-bold">#0284C7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Base Wash:</span>
                <span className="font-mono text-[#0F172A]">#E0F2FE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Typography Scale */}
      <section id="typography-scale" className="space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2">
          <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            4. Typography Scale (Plus Jakarta Sans + Inter + Tabular Nums)
          </h2>
          <p className="text-[14px] text-[#64748B]">
            Display &amp; Headings in Plus Jakarta Sans. Clinical body and dosage figures in Inter with tabular digits.
          </p>
        </div>
        <div className="divide-y divide-[#E2E8F0] rounded-[16px] border border-[#E2E8F0] bg-white p-6 space-y-6 shadow-xs">
          <div className="pt-2">
            <span className="text-[12px] text-[#64748B] font-mono block">
              headline-xl (Plus Jakarta Sans &bull; 40px / 52px / 700)
            </span>
            <p className="typography-headline-xl text-[#0F172A]">Certified Clinical Pharmacy Care</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64748B] font-mono block">
              headline-lg (Plus Jakarta Sans &bull; 32px / 40px / 600)
            </span>
            <p className="typography-headline-lg text-[#0F172A]">
              Prescription Verification &amp; Dispensing Protocol
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64748B] font-mono block">
              headline-md (Plus Jakarta Sans &bull; 22px / 28px / 600)
            </span>
            <p className="typography-headline-md text-[#0D5C5A]">
              Schedule H1 Regulatory Sign-Off
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64748B] font-mono block">
              body-lg (Inter &bull; 17px / 26px / 400)
            </span>
            <p className="typography-body-lg text-[#475569]">
              Patient medication directions, drug-drug interaction warnings, and intake summaries.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64748B] font-mono block">
              dosage &amp; pricing tabular numbers (tnum &bull; tabular-nums)
            </span>
            <p className="tabular-nums font-mono text-[18px] font-bold text-[#0D5C5A]">
              ₹1,450.00 &bull; 500mg BID &bull; Qty: 60 tabs &bull; Refills: 3 remaining
            </p>
          </div>
        </div>
      </section>

      {/* 5. Buttons */}
      <section id="button-variants-and-sizes" className="space-y-6">
        <div className="border-b border-[#E2E8F0] pb-2">
          <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            5. Button Hierarchy &amp; Touch Affordances
          </h2>
          <p className="text-[14px] text-[#64748B]">
            Primary Therapeutic Teal (#0D5C5A), Secondary White/Teal (#F0FDFA), Refill Amber (#D97706), and Outline.
          </p>
        </div>

        <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-xs">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#64748B]">
            Variants (44px min-height / 8px radius)
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary (Therapeutic Teal)</Button>
            <Button variant="secondary">Secondary (Mint Wash)</Button>
            <Button variant="refill">Refill Action (Amber)</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-xs">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#64748B]">
            Sizes &amp; Interaction States
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small (34px)</Button>
            <Button size="md">Medium (44px)</Button>
            <Button size="lg">Large (48px)</Button>
            <Button
              variant="primary"
              loading={btnLoading}
              onClick={() => {
                setBtnLoading(true);
                setTimeout(() => setBtnLoading(false), 1200);
              }}
            >
              {btnLoading ? 'Verifying...' : 'Interactive Async State'}
            </Button>
          </div>
        </div>
      </section>

      {/* 6. Form Controls */}
      <section id="form-controls" className="space-y-6">
        <div className="border-b border-[#E2E8F0] pb-2">
          <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            6. Form Controls &amp; Input Indicators
          </h2>
          <p className="text-[14px] text-[#64748B]">
            Clean white fields, #CBD5E1 borders, and soft #14B8A6 focus ring halos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-[16px] border border-[#E2E8F0] bg-white p-6 shadow-xs">
            <Input placeholder="Patient Full Name (e.g. Debasish Ghosh)" />
            <PasswordInput placeholder="Argon2id password" />
            <SearchInput placeholder="Search active medicine ingredients..." />
            <Input error="Prescription required for Schedule H item" placeholder="Dosage specification" />
          </div>

          <div className="space-y-5 rounded-[16px] border border-[#E2E8F0] bg-white p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <Checkbox id="demo-check" defaultChecked />
              <label htmlFor="demo-check" className="text-sm font-semibold text-[#0F172A] cursor-pointer">
                Schedule H1 compliance signed by registered pharmacist
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Switch id="demo-switch" defaultChecked />
              <label htmlFor="demo-switch" className="text-sm font-semibold text-[#0F172A] cursor-pointer">
                Cold-chain storage packaging required (2°C - 8°C)
              </label>
            </div>

            <FileUpload label="Upload Scanned Prescription (Rx)" helperText="PDF, PNG, JPG up to 10MB" />
          </div>
        </div>
      </section>

      {/* 7. Alert Banners with Left Indicators */}
      <section id="alert-banners" className="space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2">
          <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            7. Alert Banners with 4px Dual-Tone Left Indicators
          </h2>
          <p className="text-[14px] text-[#64748B]">
            Explicit regulatory feedback indicators with dual-tone left borders.
          </p>
        </div>

        <div className="space-y-3">
          <SemanticAlert
            type="success"
            title="Prescription Verified Safe"
            description="All 3 medication items cross-checked against batch records and signed off by licensed pharmacist."
          />
          <SemanticAlert
            type="warning"
            title="Auto-Ship Refill Deadline"
            description="5 doses remaining in current cycle. Next shipment will dispatch from Salt Lake store in 48 hours."
          />
          <SemanticAlert
            type="error"
            title="Critical Schedule X Contraindication Guard"
            description="Duplicate prescription detected across stores. Verification halted pending chief pharmacist review."
          />
        </div>
      </section>

      {/* 8. Data Table Example */}
      <section id="data-table-example" className="space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
              8. Clinical Inventory Table
            </h2>
            <p className="text-[14px] text-[#64748B]">
              Standard data grid with tabular numerical figures and responsive state toggles.
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white p-1 rounded-[8px] border border-[#CBD5E1] shadow-xs">
            <Button
              size="sm"
              variant={tableState === 'normal' ? 'primary' : 'ghost'}
              onClick={() => setTableState('normal')}
            >
              Data
            </Button>
            <Button
              size="sm"
              variant={tableState === 'loading' ? 'primary' : 'ghost'}
              onClick={() => setTableState('loading')}
            >
              Loading
            </Button>
            <Button
              size="sm"
              variant={tableState === 'empty' ? 'primary' : 'ghost'}
              onClick={() => setTableState('empty')}
            >
              Empty
            </Button>
            <Button
              size="sm"
              variant={tableState === 'error' ? 'primary' : 'ghost'}
              onClick={() => setTableState('error')}
            >
              Error
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={tableState === 'empty' ? [] : sampleRows}
          loading={tableState === 'loading'}
          error={
            tableState === 'error' ? 'Failed to fetch inventory rows from clinical database.' : null
          }
          onRetry={() => setTableState('normal')}
        />
      </section>

      {/* 9. Responsive Portals Navigation */}
      <section id="portals-navigation" className="space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2">
          <h2 className="font-display text-[22px] leading-[30px] font-bold text-[#0F172A]">
            9. Portals in Clinical Clarity &amp; Care
          </h2>
          <p className="text-[14px] text-[#64748B]">
            All three core portals styled with unified therapeutic teal and eucalyptus aesthetics.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/customer" className="group">
            <Card className="h-full bg-white hover:border-[#0D5C5A] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[16px] text-[#0F172A]">
                  Customer Care Portal
                </span>
                <span className="text-xs font-bold text-[#0D5C5A]">[Mobile / Web]</span>
              </div>
              <p className="text-[13px] text-[#64748B]">
                Route: <code className="text-[#0D5C5A]">/customer</code> &bull; Atmospheric teal hero hub, prescriptions, auto-ship refills.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#0D5C5A] group-hover:underline">
                Explore Customer Home &rarr;
              </div>
            </Card>
          </Link>

          <Link href="/pharmacist" className="group">
            <Card className="h-full bg-white hover:border-[#0D5C5A] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[16px] text-[#0F172A]">Pharmacist Portal</span>
                <span className="text-xs font-bold text-[#047857]">[Tablet / Terminal]</span>
              </div>
              <p className="text-[13px] text-[#64748B]">
                Route: <code className="text-[#0D5C5A]">/pharmacist</code> &bull; 240px clinical sidebar, verification queue, H1 regulatory register.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#0D5C5A] group-hover:underline">
                Explore Verification Queue &rarr;
              </div>
            </Card>
          </Link>

          <Link href="/admin" className="group">
            <Card className="h-full bg-white hover:border-[#0D5C5A] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[16px] text-[#0F172A]">Admin Portal</span>
                <span className="text-xs font-bold text-[#0284C7]">[Desktop Command]</span>
              </div>
              <p className="text-[13px] text-[#64748B]">
                Route: <code className="text-[#0D5C5A]">/admin</code> &bull; Multi-store distribution, KPI metrics, centralized compliance rules.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#0D5C5A] group-hover:underline">
                Explore Operations Overview &rarr;
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
};
