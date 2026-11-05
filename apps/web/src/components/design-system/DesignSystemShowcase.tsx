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
    { key: 'code', header: 'Item Code', render: (r) => <span className="font-mono text-[13px]">{r.code}</span> },
    { key: 'name', header: 'Medicine Description', render: (r) => <span className="font-medium text-[#24332E]">{r.name}</span> },
    { key: 'category', header: 'Classification' },
    { key: 'stock', header: 'Stock Units', render: (r) => <span>{r.stock} units</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9F7] text-[#24332E] py-12 px-4 sm:px-8 lg:px-12 max-w-6xl mx-auto space-y-16">
      {/* Title Header */}
      <div className="border-b border-[#E5EAE6] pb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#E9F3EE] text-[#176B52] text-[12px] font-semibold tracking-wider uppercase">
          Design Identity: Quiet Confidence
        </div>
        <h1 className="text-[36px] leading-[44px] font-semibold text-[#24332E]">
          Pharmacy Platform Design System
        </h1>
        <p className="text-[16px] leading-[24px] text-[#64736C]">
          Deterministic reference guide and component showcase for Customer, Pharmacist, and Admin portals.
        </p>
      </div>

      {/* 1. Brand Colors */}
      <section id="brand-colors" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            1. Brand Colors
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Forest green brand palette. Primary actions use brand-600 (#176B52) with hover brand-700 (#125840).
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(BRAND_TOKENS).map(([token, hex]) => (
            <div key={token} className="rounded-[8px] border border-[#E5EAE6] bg-white p-3 space-y-2">
              <div
                className="h-16 w-full rounded-[6px] border border-black/5"
                style={{ backgroundColor: hex }}
              />
              <div>
                <p className="text-[14px] font-semibold text-[#24332E]">brand-{token}</p>
                <p className="text-[12px] font-mono text-[#64736C]">{hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Neutral Colors */}
      <section id="neutral-colors" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            2. Neutral Colors
          </h2>
          <p className="text-[14px] text-[#64736C]">
            White (#FFFFFF) and off-white (#F7F9F7) surfaces with neutral slate accents.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(NEUTRAL_TOKENS).map(([token, hex]) => (
            <div key={token} className="rounded-[8px] border border-[#E5EAE6] bg-white p-3 space-y-2">
              <div
                className="h-14 w-full rounded-[6px] border border-black/10"
                style={{ backgroundColor: hex }}
              />
              <div>
                <p className="text-[13px] font-semibold text-[#24332E]">neutral-{token}</p>
                <p className="text-[12px] font-mono text-[#64736C]">{hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Semantic Colors */}
      <section id="semantic-colors" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            3. Semantic Colors
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Deterministic Success, Warning, Danger, and Information tokens.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(SEMANTIC_TOKENS).map(([name, val]) => (
            <div key={name} className="rounded-[8px] border border-[#E5EAE6] bg-white p-4 space-y-3">
              <div
                className="h-16 w-full rounded-[6px] border flex items-center justify-center font-semibold capitalize text-[14px]"
                style={{
                  backgroundColor: val.background,
                  color: val.foreground,
                  borderColor: val.border,
                }}
              >
                {name} Preview
              </div>
              <div className="space-y-1 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#64736C]">Foreground:</span>
                  <span className="font-mono text-[#24332E]">{val.foreground}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64736C]">Background:</span>
                  <span className="font-mono text-[#24332E]">{val.background}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64736C]">Border:</span>
                  <span className="font-mono text-[#24332E]">{val.border}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Typography Scale */}
      <section id="typography-scale" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            4. Typography Scale
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Inter font stack with Noto Sans Bengali/Devanagari and Arial fallbacks.
          </p>
        </div>
        <div className="divide-y divide-[#E5EAE6] rounded-[12px] border border-[#E5EAE6] bg-white p-6 space-y-6">
          <div className="pt-2">
            <span className="text-[12px] text-[#64736C] font-mono block">display (36px / 44px / 600)</span>
            <p className="typography-display text-[#24332E]">Clinical Pharmacy Network</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64736C] font-mono block">page-title (28px / 36px / 600)</span>
            <p className="typography-page-title text-[#24332E]">Prescription Verification Queue</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64736C] font-mono block">section-title (22px / 30px / 600)</span>
            <p className="typography-section-title text-[#24332E]">Schedule H Regulatory Guardrails</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64736C] font-mono block">card-title (18px / 26px / 600)</span>
            <p className="typography-card-title text-[#24332E]">Patient Verification Profile</p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64736C] font-mono block">body (16px / 24px / 400)</span>
            <p className="typography-body text-[#24332E]">
              Regular body text for clinical notes, instructions, and customer explanations.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64736C] font-mono block">body-medium (16px / 24px / 500)</span>
            <p className="typography-body-medium text-[#24332E]">
              Medium weight body text for highlighted dosage and medical precautions.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64736C] font-mono block">secondary (14px / 20px / 400)</span>
            <p className="typography-secondary text-[#64736C]">
              Supporting text for helper hints, secondary labels, and column headers.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64736C] font-mono block">caption (12px / 16px / 400)</span>
            <p className="typography-caption text-[#7D8A81]">
              Metadata, timestamps, license IDs, and fine regulatory details.
            </p>
          </div>
          <div className="pt-6">
            <span className="text-[12px] text-[#64736C] font-mono block">button (14px / 20px / 600)</span>
            <p className="typography-button text-[#176B52]">Button Action Label</p>
          </div>
        </div>
      </section>

      {/* 5. Spacing Scale */}
      <section id="spacing-scale" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            5. Spacing Scale
          </h2>
          <p className="text-[14px] text-[#64736C]">
            4px base scale: 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px).
          </p>
        </div>
        <div className="rounded-[12px] border border-[#E5EAE6] bg-white p-6 space-y-3">
          {Object.entries(SPACING_SCALE).map(([step, px]) => (
            <div key={step} className="flex items-center gap-4 text-[13px]">
              <span className="w-16 font-mono text-[#64736C]">Space {step}</span>
              <span className="w-14 font-mono font-semibold text-[#24332E]">{px}px</span>
              <div
                className="h-5 rounded-[4px] bg-[#176B52]"
                style={{ width: `${px * 4}px`, maxWidth: '100%' }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 6. Border Radius Examples */}
      <section id="border-radius-examples" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            6. Border Radius Examples
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Controls &amp; Badges (6px), Buttons &amp; Inputs (8px), Cards &amp; Panels (12px).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[6px] border border-[#E5EAE6] bg-white p-5 text-center">
            <span className="text-[14px] font-semibold text-[#24332E] block">6px Radius</span>
            <span className="text-[12px] text-[#64736C]">Small controls, Badges</span>
          </div>
          <div className="rounded-[8px] border border-[#E5EAE6] bg-white p-5 text-center">
            <span className="text-[14px] font-semibold text-[#24332E] block">8px Radius</span>
            <span className="text-[12px] text-[#64736C]">Buttons, Inputs, Dropdowns</span>
          </div>
          <div className="rounded-[12px] border border-[#E5EAE6] bg-white p-5 text-center">
            <span className="text-[14px] font-semibold text-[#24332E] block">12px Radius</span>
            <span className="text-[12px] text-[#64736C]">Cards, Dialogs, App Panels</span>
          </div>
        </div>
      </section>

      {/* 7. Button Variants and Sizes */}
      <section id="button-variants-and-sizes" className="space-y-6">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            7. Button Variants and Sizes
          </h2>
          <p className="text-[14px] text-[#64736C]">
            5 variants: Primary, Secondary, Outline, Ghost, Destructive across Small (32px), Medium (40px), Large (48px), and Icon (40x40).
          </p>
        </div>

        {/* Variants */}
        <div className="rounded-[12px] border border-[#E5EAE6] bg-white p-6 space-y-4">
          <h3 className="text-[14px] font-semibold uppercase tracking-wider text-[#64736C]">
            Variants (Medium Size - 40px)
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive Button</Button>
          </div>
        </div>

        {/* Sizes & States */}
        <div className="rounded-[12px] border border-[#E5EAE6] bg-white p-6 space-y-4">
          <h3 className="text-[14px] font-semibold uppercase tracking-wider text-[#64736C]">
            Sizes &amp; Interaction States
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small (32px)</Button>
            <Button size="md">Medium (40px)</Button>
            <Button size="lg">Large (48px)</Button>
            <Button size="icon" variant="outline" aria-label="Add item">
              <Plus className="h-4 w-4" />
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
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            8. Input Variants and States
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Standard height 44px, radius 8px. Supports Default, Focus, Disabled, Error, and Read-only states.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-[12px] border border-[#E5EAE6] bg-white p-6">
          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#24332E]">Standard Text Input (Default)</label>
            <Input placeholder="Enter patient name..." />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#24332E]">Search Input</label>
            <SearchInput placeholder="Search medicines by salt or brand..." />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#24332E]">Password Input (with Toggle)</label>
            <PasswordInput defaultValue="secret-license-key" />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#24332E]">Error State</label>
            <Input
              defaultValue="invalid-order-id"
              error="Valid prescription order reference required (e.g. RX-50214)"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#24332E]">Disabled State</label>
            <Input disabled value="System locked field" />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#24332E]">Read-Only State</label>
            <Input readOnly value="Salt Lake Store Hub #WB-KOL-014" />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[14px] font-medium text-[#24332E]">OTP Input (4-6 digits)</label>
            <OtpInput value={otpVal} onChange={setOtpVal} length={6} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[14px] font-medium text-[#24332E]">Textarea (min-height 100px)</label>
            <Textarea placeholder="Enter clinical pharmacist verification remarks..." />
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#24332E]">Select Component</label>
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
            <label className="text-[14px] font-medium text-[#24332E] block">Checkbox, Switch &amp; Radio</label>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-[14px]">
                <Checkbox defaultChecked />
                <span>Verify Doctor Sign-Off</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[14px]">
                <Switch defaultChecked />
                <span>Auto-Dispatch</span>
              </label>

              <RadioGroup defaultValue="schedule-h" className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="schedule-h" id="r1" />
                  <label htmlFor="r1" className="text-[14px] cursor-pointer">Schedule H</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="schedule-x" id="r2" />
                  <label htmlFor="r2" className="text-[14px] cursor-pointer">Schedule X</label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[14px] font-medium text-[#24332E]">File Upload Dropzone</label>
            <FileUpload />
          </div>
        </div>
      </section>

      {/* 9. Cards */}
      <section id="cards" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            9. Cards
          </h2>
          <p className="text-[14px] text-[#64736C]">
            White background, 1px solid #E5EAE6 border, 12px radius, 20px padding. No default drop shadow.
          </p>
        </div>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Upcoming Medication Refill</CardTitle>
            <CardDescription>Telmisartan 40 mg &bull; Prescribed by Dr. S. Mukherjee</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[14px] text-[#24332E]">
              Patient refill is scheduled for dispatch in 5 days. Ensure cold-chain compliance if applicable.
            </p>
          </CardContent>
          <CardFooter className="justify-between border-t border-[#E5EAE6]">
            <span className="text-[12px] text-[#64736C]">Prescription ref: RX-50214</span>
            <Button size="sm" variant="primary">Approve Refill</Button>
          </CardFooter>
        </Card>
      </section>

      {/* 10. Status Badges */}
      <section id="status-badges" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            10. Status Badges
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Height 24px, padding 8px, font 12px weight 500, radius 6px. Readable text label mandatory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#E5EAE6] bg-white p-6">
          <Badge variant="success">Verified (Success)</Badge>
          <Badge variant="warning">Pending Review (Warning)</Badge>
          <Badge variant="danger">Blocked (Danger)</Badge>
          <Badge variant="information">Schedule H (Information)</Badge>
          <Badge variant="neutral">Draft (Neutral)</Badge>
        </div>
      </section>

      {/* 11. Alerts */}
      <section id="alerts" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            11. Alerts
          </h2>
          <p className="text-[14px] text-[#64736C]">
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
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            12. Dialog Example
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Max width 480px, padding 24px, radius 12px, elevation shadow 0 12px 32px rgba(36, 51, 46, 0.12).
          </p>
        </div>
        <div className="rounded-[12px] border border-[#E5EAE6] bg-white p-6">
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
              <div className="py-2 text-[14px] text-[#24332E] space-y-2">
                <p><strong>Patient:</strong> Mother (Protima Ghosh, 68y)</p>
                <p><strong>Registered Store:</strong> Salt Lake Hub</p>
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
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            13. Dropdown Example
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Min width 180px, radius 8px, item height 36px, shadow 0 4px 16px rgba(36, 51, 46, 0.08).
          </p>
        </div>
        <div className="rounded-[12px] border border-[#E5EAE6] bg-white p-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions Menu <ChevronDown className="ml-2 h-4 w-4" />
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
        <div className="border-b border-[#E5EAE6] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
              14. Data Table Example
            </h2>
            <p className="text-[14px] text-[#64736C]">
              Header 44px, Body row 52px, Cell px 16px, border #E5EAE6, hover #F7F9F7.
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white p-1 rounded-[8px] border border-[#E5EAE6]">
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
          error={tableState === 'error' ? 'Failed to fetch inventory rows from database.' : null}
          onRetry={() => setTableState('normal')}
        />
      </section>

      {/* 15. Responsive Layout Examples */}
      <section id="responsive-layout-examples" className="space-y-4">
        <div className="border-b border-[#E5EAE6] pb-2">
          <h2 className="text-[22px] leading-[30px] font-semibold text-[#24332E]">
            15. Responsive Layout Examples
          </h2>
          <p className="text-[14px] text-[#64736C]">
            Interactive links to the three core portal implementations matching exact specifications.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/customer" className="group">
            <Card className="h-full bg-white hover:border-[#176B52] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[16px] text-[#24332E]">Customer Portal</span>
                <Smartphone className="h-5 w-5 text-[#176B52]" />
              </div>
              <p className="text-[13px] text-[#64736C]">
                Route: <code className="text-[#176B52]">/customer</code> &bull; Mobile-first bottom nav, 1200px max container, refill card, recent orders.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#176B52] group-hover:underline">
                Explore Customer Home <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </div>
            </Card>
          </Link>

          <Link href="/pharmacist" className="group">
            <Card className="h-full bg-white hover:border-[#176B52] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[16px] text-[#24332E]">Pharmacist Portal</span>
                <Tablet className="h-5 w-5 text-[#176B52]" />
              </div>
              <p className="text-[13px] text-[#64736C]">
                Route: <code className="text-[#176B52]">/pharmacist</code> &bull; 240px sidebar, 64px header, drawer on tablet/mobile, 2-column prescription review.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#176B52] group-hover:underline">
                Explore Verification Queue <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </div>
            </Card>
          </Link>

          <Link href="/admin" className="group">
            <Card className="h-full bg-white hover:border-[#176B52] transition-colors p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[16px] text-[#24332E]">Admin Portal</span>
                <Monitor className="h-5 w-5 text-[#176B52]" />
              </div>
              <p className="text-[13px] text-[#64736C]">
                Route: <code className="text-[#176B52]">/admin</code> &bull; 1440px wide panel, 4 KPI cards, orders-by-store chart placeholder, recent orders table.
              </p>
              <div className="flex items-center text-[12px] font-semibold text-[#176B52] group-hover:underline">
                Explore Operations Overview <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
};
