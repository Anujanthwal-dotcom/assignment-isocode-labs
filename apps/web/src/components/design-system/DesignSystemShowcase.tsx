'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BRAND_TOKENS,
  NEUTRAL_TOKENS,
  SEMANTIC_TOKENS,
  SPACING_SCALE,
} from '@/design-system/tokens';
import { Button } from '@/components/ui/button';
import { Input, SearchInput, PasswordInput } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OtpInput } from '@/components/ui/otp-input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DataTable, type Column } from '@/components/shared/DataTable';
import {
  ChevronDown,
  ExternalLink,
  Plus,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';

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
  const [otpVal, setOtpVal] = React.useState('5021');
  const [tableState, setTableState] = React.useState<'normal' | 'loading' | 'empty' | 'error'>('normal');

  const sampleRows: SampleRow[] = [
    { code: 'MED-001', name: 'Telmisartan 40 mg', category: 'Antihypertensive', stock: 240, status: 'completed' },
    { code: 'MED-002', name: 'Metformin 500 mg', category: 'Antidiabetic', stock: 180, status: 'pending' },
    { code: 'MED-003', name: 'Alprazolam 0.5 mg', category: 'Schedule H1 / Psychotropic', stock: 45, status: 'blocked' },
  ];

  const columns: Column<SampleRow>[] = [
    { key: 'code', header: 'Item Code', render: (r) => <span className="font-mono text-[13px] text-[#6240E8]">{r.code}</span> },
    { key: 'name', header: 'Medicine Description', render: (r) => <span className="font-semibold text-[#351F65]">{r.name}</span> },
    { key: 'category', header: 'Classification' },
    { key: 'stock', header: 'Stock Units', render: (r) => <span>{r.stock} units</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#14161A] py-12 px-4 sm:px-8 lg:px-12 max-w-6xl mx-auto space-y-16">
      {/* Title Header */}
      <div className="border-b border-[#EAE8F0] pb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#F7F5FD] border border-[#D6D1F7] text-[#6240E8] text-[12px] font-semibold tracking-wider uppercase">
          Design Identity: Teladoc Health UI
        </div>
        <h1 className="text-[36px] leading-[44px] font-semibold text-[#351F65]">
          Teladoc Health Design System
        </h1>
        <p className="text-[16px] leading-[24px] text-[#6C757D]">
          Modern, patient-first, human-centric visual language for Customer, Pharmacist, and Admin portals.
        </p>
      </div>

      {/* 1. Brand Colors */}
      <section id="brand-colors" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            1. Brand Colors
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Teladoc Electric Purple (#6240E8), Midnight Purple (#351F65), and Cyan (#00B5E2) accents.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(BRAND_TOKENS).map(([token, hex]) => (
            <div key={token} className="rounded-[8px] border border-[#EAE8F0] bg-white p-3 space-y-2 shadow-xs">
              <div
                className="h-16 w-full rounded-[6px] border border-black/5"
                style={{ backgroundColor: hex }}
              />
              <div>
                <p className="text-[14px] font-semibold text-[#351F65]">brand-{token}</p>
                <p className="text-[12px] font-mono text-[#78879A]">{hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Neutral Colors */}
      <section id="neutral-colors" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            2. Neutral Colors
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Crisp white (#FFFFFF), modern telehealth surface (#F8F9FB), and clean neutral dividers.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(NEUTRAL_TOKENS).map(([token, hex]) => (
            <div key={token} className="rounded-[8px] border border-[#EAE8F0] bg-white p-3 space-y-2 shadow-xs">
              <div
                className="h-14 w-full rounded-[6px] border border-black/10"
                style={{ backgroundColor: hex }}
              />
              <div>
                <p className="text-[13px] font-semibold text-[#351F65]">neutral-{token}</p>
                <p className="text-[12px] font-mono text-[#78879A]">{hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Semantic Colors */}
      <section id="semantic-colors" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            3. Semantic Colors
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Clinical Health Green (#0FAC26), Warm Warning (#A66B16), Danger (#DC3545), and Telehealth Cyan (#0088AA).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(SEMANTIC_TOKENS).map(([name, val]) => (
            <div key={name} className="rounded-[8px] border border-[#EAE8F0] bg-white p-4 space-y-3 shadow-xs">
              <div
                className="h-16 w-full rounded-[6px] border flex items-center justify-center font-semibold capitalize text-[14px]"
                style={{
                  backgroundColor: val.background,
                  color: val.foreground,
                  borderColor: val.border,
                }}
              >
                {name} Status
              </div>
              <div className="space-y-1 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#78879A]">Foreground:</span>
                  <span className="font-mono text-[#351F65] font-semibold">{val.foreground}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78879A]">Background:</span>
                  <span className="font-mono text-[#14161A]">{val.background}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78879A]">Border:</span>
                  <span className="font-mono text-[#14161A]">{val.border}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Typography Scale */}
      <section id="typography-scale" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            4. Typography Scale (Lexend + Inter)
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Teladoc&apos;s signature Lexend geometric sans-serif for clinical readability and patient trust.
          </p>
        </div>
        <div className="divide-y divide-[#EAE8F0] rounded-[12px] border border-[#EAE8F0] bg-white p-6 space-y-6 shadow-xs">
          <div className="pt-2">
            <span className="text-[12px] text-[#78879A] font-mono block">display (36px / 44px / 600)</span>
            <p className="typography-display text-[#351F65]">Teladoc Health Virtual Pharmacy</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#78879A] font-mono block">page-title (28px / 36px / 600)</span>
            <p className="typography-page-title text-[#351F65]">Clinical Prescription Verification</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#78879A] font-mono block">section-title (22px / 30px / 600)</span>
            <p className="typography-section-title text-[#351F65]">Schedule H Regulatory Compliance Guard</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#78879A] font-mono block">card-title (18px / 26px / 600)</span>
            <p className="typography-card-title text-[#351F65]">Patient Medication Profile</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#78879A] font-mono block">body (16px / 24px / 400)</span>
            <p className="typography-body text-[#14161A]">
              Regular body text for telehealth care directions, pharmacist notes, and customer instructions.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#78879A] font-mono block">body-medium (16px / 24px / 500)</span>
            <p className="typography-body-medium text-[#351F65]">
              Medium weight body text for highlighted dosage instructions and doctor precautions.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#78879A] font-mono block">secondary (14px / 20px / 400)</span>
            <p className="typography-secondary text-[#78879A]">
              Supporting text for helper hints, secondary labels, and column headers.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#78879A] font-mono block">caption (12px / 16px / 400)</span>
            <p className="typography-caption text-[#ADB5BD]">
              Clinical metadata, timestamps, license IDs, and fine regulatory details.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#78879A] font-mono block">button (14px / 20px / 600)</span>
            <p className="typography-button text-[#6240E8]">Primary Action Label</p>
          </div>
        </div>
      </section>

      {/* 5. Spacing Scale */}
      <section id="spacing-scale" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            5. Spacing Scale
          </h2>
          <p className="text-[14px] text-[#78879A]">
            4px base scale: 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px).
          </p>
        </div>
        <div className="rounded-[12px] border border-[#EAE8F0] bg-white p-6 space-y-3 shadow-xs">
          {Object.entries(SPACING_SCALE).map(([step, px]) => (
            <div key={step} className="flex items-center gap-4 text-[13px]">
              <span className="w-16 font-mono text-[#78879A]">Space {step}</span>
              <span className="w-14 font-mono font-semibold text-[#351F65]">{px}px</span>
              <div
                className="h-5 rounded-[4px] bg-[#6240E8]"
                style={{ width: `${px * 4}px`, maxWidth: '100%' }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 6. Border Radius Examples */}
      <section id="border-radius-examples" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            6. Border Radius Examples
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Controls &amp; Badges (6px), Buttons &amp; Inputs (8px), Cards &amp; Panels (12px).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[6px] border border-[#EAE8F0] bg-white p-5 text-center shadow-xs">
            <span className="text-[14px] font-semibold text-[#351F65] block">6px Radius</span>
            <span className="text-[12px] text-[#78879A]">Controls, Badges</span>
          </div>
          <div className="rounded-[8px] border border-[#EAE8F0] bg-white p-5 text-center shadow-xs">
            <span className="text-[14px] font-semibold text-[#351F65] block">8px Radius</span>
            <span className="text-[12px] text-[#78879A]">Buttons, Inputs, Dropdowns</span>
          </div>
          <div className="rounded-[12px] border border-[#EAE8F0] bg-white p-5 text-center shadow-xs">
            <span className="text-[14px] font-semibold text-[#351F65] block">12px Radius</span>
            <span className="text-[12px] text-[#78879A]">Cards, Dialogs, Panels</span>
          </div>
        </div>
      </section>

      {/* 7. Button Variants and Sizes */}
      <section id="button-variants-and-sizes" className="space-y-6">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            7. Button Variants and Sizes
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Primary Electric Purple (#6240E8), Secondary Lilac (#F7F5FD), Teal (#00B5E2), Outline, Ghost, and Destructive.
          </p>
        </div>

        {/* Variants */}
        <div className="rounded-[12px] border border-[#EAE8F0] bg-white p-6 space-y-4 shadow-xs">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#78879A]">
            Variants (Medium Size - 40px)
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary (Electric Purple)</Button>
            <Button variant="secondary">Secondary (Lilac)</Button>
            <Button variant="teal">Teal Highlight</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </div>

        {/* Sizes & States */}
        <div className="rounded-[12px] border border-[#EAE8F0] bg-white p-6 space-y-4 shadow-xs">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#78879A]">
            Sizes &amp; Interaction States
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small (32px)</Button>
            <Button size="md">Medium (40px)</Button>
            <Button size="lg">Large (48px)</Button>
            <Button size="icon" variant="outline" aria-label="Add item">
              <Plus className="h-4 w-4 text-[#6240E8]" />
            </Button>
            <Button
              variant="primary"
              loading={btnLoading}
              onClick={() => {
                setBtnLoading(true);
                setTimeout(() => setBtnLoading(false), 1500);
              }}
            >
              Click for Loading State
            </Button>
            <Button variant="primary" disabled>
              Disabled (50% Opacity)
            </Button>
          </div>
        </div>
      </section>

      {/* 8. Input Variants and States */}
      <section id="input-variants-and-states" className="space-y-6">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            8. Input Variants and States
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Standard height 44px, radius 8px, purple focus glow, and high-contrast labels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-[12px] border border-[#EAE8F0] bg-white p-6 shadow-xs">
          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#351F65]">Standard Text Input (Default)</label>
            <Input placeholder="Enter patient name..." />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#351F65]">Search Input</label>
            <SearchInput placeholder="Search medicines by salt or brand..." />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#351F65]">Password Input (with Toggle)</label>
            <PasswordInput defaultValue="secret-license-key" />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#351F65]">Error State</label>
            <Input
              defaultValue="invalid-order-id"
              error="Valid prescription order reference required (e.g. RX-50214)"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#351F65]">Disabled State</label>
            <Input disabled value="System locked field" />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#351F65]">Read-Only State</label>
            <Input readOnly value="Salt Lake Store Hub #WB-KOL-014" />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[14px] font-medium text-[#351F65]">OTP Input (4-6 digits)</label>
            <OtpInput value={otpVal} onChange={setOtpVal} length={6} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[14px] font-medium text-[#351F65]">Textarea (min-height 100px)</label>
            <Textarea placeholder="Enter clinical pharmacist verification remarks..." />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#351F65]">Select Component</label>
            <Select defaultValue="salt-lake">
              <SelectTrigger>
                <SelectValue placeholder="Select store hub" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salt-lake">Salt Lake Hub</SelectItem>
                <SelectItem value="new-town">New Town Central</SelectItem>
                <SelectItem value="ballygunge">Ballygunge Branch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-[14px] font-medium text-[#351F65] block">Checkbox, Switch &amp; Radio</label>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-[14px] text-[#14161A]">
                <Checkbox defaultChecked />
                <span>Verify Doctor Sign-Off</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[14px] text-[#14161A]">
                <Switch defaultChecked />
                <span>Auto-Dispatch</span>
              </label>

              <RadioGroup defaultValue="schedule-h" className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="schedule-h" id="r1" />
                  <label htmlFor="r1" className="text-[14px] cursor-pointer text-[#14161A]">Schedule H</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="schedule-x" id="r2" />
                  <label htmlFor="r2" className="text-[14px] cursor-pointer text-[#14161A]">Schedule X</label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[14px] font-medium text-[#351F65]">File Upload Dropzone</label>
            <FileUpload />
          </div>
        </div>
      </section>

      {/* 9. Cards */}
      <section id="cards" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            9. Cards
          </h2>
          <p className="text-[14px] text-[#78879A]">
            White background, 1px solid #EAE8F0 border, 12px radius, 20px padding with soft modern shadow.
          </p>
        </div>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Upcoming Medication Refill</CardTitle>
            <CardDescription>Telmisartan 40 mg &bull; Prescribed by Dr. S. Mukherjee</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[14px] text-[#14161A]">
              Patient refill is scheduled for dispatch in 5 days. Ensure cold-chain compliance if applicable.
            </p>
          </CardContent>
          <CardFooter className="justify-between border-t border-[#EAE8F0]">
            <span className="text-[12px] text-[#78879A]">Prescription ref: RX-50214</span>
            <Button size="sm" variant="primary">Approve Refill</Button>
          </CardFooter>
        </Card>
      </section>

      {/* 10. Status Badges */}
      <section id="status-badges" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            10. Status Badges
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Height 24px, padding 8px, font 12px weight 500, radius 6px with distinct readable labels.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#EAE8F0] bg-white p-6 shadow-xs">
          <Badge variant="purple">Clinical Care (Purple)</Badge>
          <Badge variant="success">Verified (Success)</Badge>
          <Badge variant="warning">Pending Review (Warning)</Badge>
          <Badge variant="danger">Blocked (Danger)</Badge>
          <Badge variant="information">Schedule H (Info / Cyan)</Badge>
          <Badge variant="neutral">Draft (Neutral)</Badge>
        </div>
      </section>

      {/* 11. Alerts */}
      <section id="alerts" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            11. Alerts
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Semantic alerts with appropriate Lucide icons, title, description, and optional action.
          </p>
        </div>
        <div className="space-y-3">
          <SemanticAlert
            type="success"
            title="Prescription Sign-Off Verified"
            description="All clinical schedule validations passed successfully. Order ready for store dispatch."
          />
          <SemanticAlert
            type="warning"
            title="Schedule H Verification Warning"
            description="Prescription upload date is nearing 6 months validity limit. Re-confirmation advised."
          />
          <SemanticAlert
            type="error"
            title="Schedule X Compliance Block"
            description="Dispensing restricted narcotics requires physical doctor stamp verification."
            action={<Button size="sm" variant="destructive">View Audit Detail</Button>}
          />
          <SemanticAlert
            type="information"
            title="Store Transfer Intake"
            description="Order routed to Salt Lake store hub for local cold-chain delivery."
          />
        </div>
      </section>

      {/* 12. Dialog Example */}
      <section id="dialog-example" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            12. Dialog Example
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Max width 480px, padding 24px, radius 12px, elevation shadow 0 16px 36px rgba(53, 31, 101, 0.16).
          </p>
        </div>
        <div className="rounded-[12px] border border-[#EAE8F0] bg-white p-6 shadow-xs">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="primary">Open Verification Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Pharmacist Sign-Off</DialogTitle>
                <DialogDescription>
                  You are approving prescription RX-50214 for Telmisartan 40 mg under Schedule H guidelines.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 text-[14px] text-[#14161A] space-y-2">
                <p><strong className="text-[#351F65]">Patient:</strong> Mother (Protima Ghosh, 68y)</p>
                <p><strong className="text-[#351F65]">Registered Hub:</strong> Salt Lake Hub</p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="primary">Confirm &amp; Sign</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* 13. Dropdown Example */}
      <section id="dropdown-example" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            13. Dropdown Example
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Min width 180px, radius 8px, item height 36px, shadow 0 4px 18px rgba(53, 31, 101, 0.10).
          </p>
        </div>
        <div className="rounded-[12px] border border-[#EAE8F0] bg-white p-6 shadow-xs">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions Menu <ChevronDown className="ml-2 h-4 w-4 text-[#6240E8]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Prescription Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View High-Res Scan</DropdownMenuItem>
              <DropdownMenuItem>Verify Doctor Stamp</DropdownMenuItem>
              <DropdownMenuItem>Reassign Store Hub</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>Reject Order</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {/* 14. Data Table Example */}
      <section id="data-table-example" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
              14. Data Table Example
            </h2>
            <p className="text-[14px] text-[#78879A]">
              Header 44px, Body row 52px, Cell px 16px, border #EAE8F0, hover #F7F5FD.
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white p-1 rounded-[8px] border border-[#EAE8F0] shadow-xs">
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
          error={tableState === 'error' ? 'Failed to fetch inventory rows from clinical database.' : null}
          onRetry={() => setTableState('normal')}
        />
      </section>

      {/* 15. Responsive Layout Examples */}
      <section id="responsive-layout-examples" className="space-y-4">
        <div className="border-b border-[#EAE8F0] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#351F65]">
            15. Responsive Layout Examples
          </h2>
          <p className="text-[14px] text-[#78879A]">
            Portal previews showcasing the Teladoc Health visual language.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/customer" className="group">
            <Card className="h-full bg-white hover:border-[#6240E8] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[16px] text-[#351F65]">Customer Care Portal</span>
                <Smartphone className="h-5 w-5 text-[#6240E8]" />
              </div>
              <p className="text-[13px] text-[#78879A]">
                Route: <code className="text-[#6240E8]">/customer</code> &bull; Mobile-first bottom nav, 1200px max container, refill card, recent orders.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#6240E8] group-hover:underline">
                Explore Customer Home <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </div>
            </Card>
          </Link>

          <Link href="/pharmacist" className="group">
            <Card className="h-full bg-white hover:border-[#6240E8] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[16px] text-[#351F65]">Pharmacist Portal</span>
                <Tablet className="h-5 w-5 text-[#6240E8]" />
              </div>
              <p className="text-[13px] text-[#78879A]">
                Route: <code className="text-[#6240E8]">/pharmacist</code> &bull; 240px sidebar, 64px header, drawer on tablet/mobile, 2-column prescription review.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#6240E8] group-hover:underline">
                Explore Verification Queue <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </div>
            </Card>
          </Link>

          <Link href="/admin" className="group">
            <Card className="h-full bg-white hover:border-[#6240E8] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[16px] text-[#351F65]">Admin Portal</span>
                <Monitor className="h-5 w-5 text-[#6240E8]" />
              </div>
              <p className="text-[13px] text-[#78879A]">
                Route: <code className="text-[#6240E8]">/admin</code> &bull; 1440px wide panel, 4 KPI cards, orders-by-store chart placeholder, recent orders table.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#6240E8] group-hover:underline">
                Explore Operations Overview <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
};
