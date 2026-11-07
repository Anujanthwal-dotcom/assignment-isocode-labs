---
name: Clinical Clarity & Care
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#3f4948'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#6f7978'
  outline-variant: '#bec9c7'
  surface-tint: '#216866'
  primary: '#004341'
  on-primary: '#ffffff'
  primary-container: '#0d5c5a'
  on-primary-container: '#8fd2cf'
  inverse-primary: '#8fd2cf'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#003f62'
  on-tertiary: '#ffffff'
  tertiary-container: '#005785'
  on-tertiary-container: '#92ccff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#abefeb'
  primary-fixed-dim: '#8fd2cf'
  on-primary-fixed: '#00201f'
  on-primary-fixed-variant: '#00504e'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies the standard of certified digital healthcare: authoritative, empathetic, meticulously organized, and serenely calm. Designed for patients managing complex prescriptions, caregivers monitoring loved ones, and clinicians reviewing regimens, the interface balances clinical rigor with warm human reassurance.

The visual direction blends **Corporate / Modern** healthcare precision with **Soft Tactility**:
- **Tone:** Methodical, compassionate, vigilant, and tranquil.
- **Atmosphere:** Clean room sterility translated into digital warmth—abundant breathing room, pristine surfaces, and unambiguous feedback states that alleviate patient anxiety.
- **Affordance & Trust:** Prominent safety certifications, unmissable dosage cues, distinct verification stamps, and clear status signals create an unshakeable sense of accuracy and HIPAA-compliant security.

## Colors

The palette leverages restorative botanical teals and clinical cool neutrals to signal medical expertise, calm, and precision.

- **Primary (`#0D5C5A`):** Deep therapeutic teal anchoring primary actions, core branding, and prominent clinical titles.
- **Secondary (`#14B8A6`):** Invigorating soft eucalyptus used for interactive highlights, active state pills, and sub-navigation elements.
- **Tertiary (`#0284C7`):** Trust blue reserved for informational callouts, consultation triggers, and digital health records.
- **Neutral Palette:**
  - Base Background: Pristine clinical white (`#FFFFFF`) layered with pale porcelain slate (`#F8FAFC`) and restorative mint-tinted surfaces (`#F0FDFA`).
  - Structural Borders: Clean, low-friction borders (`#E2E8F0`).
  - Text Hierarchy: Primary headings in high-contrast deep slate charcoal (`#0F172A`), sustained reading body in balanced slate (`#475569`), and supporting hints/metadata in muted helper gray (`#64748B`).
- **Semantic Accents:**
  - Verification & Safety: Clinical green (`#059669`) with pale mint base (`#CCFBF1`).
  - Refill Alerts & Adherence Notices: Warm amber (`#D97706`) with light marigold wash (`#FEF3C7`).
  - Critical Contraindications & Warnings: Deep vermilion (`#DC2626`) with soft rose wash (`#FEE2E2`).

## Typography

Typography prioritizes effortless legibility and cognitive ease under stress. 

- **Display & Headings (Plus Jakarta Sans):** Selected for its friendly, rounded geometry and structural stability. Conveys warmth and accessibility without compromising medical authority.
- **Body & Functional Labels (Inter):** Systematically neutral with tall x-heights and open apertures, optimized for reading drug dosages, clinical instructions, and insurance documentation.
- **Dosage Data & Numerical Values:** Ensure tabular figures (`tnum`) are activated for prescription amounts, pill counts, schedules, and pricing grids to prevent visual misalignment.

## Layout & Spacing

A structured, fluid 12-column grid system anchors the interface, paired with an explicit 4px baseline rhythm (multiples of `0.25rem`).

- **Grid Architecture:**
  - **Desktop (≥1024px):** 12 columns, `margin: 2rem`, `gutter: 1.5rem`, capped at an ergonomic max width of 1280px for standard dashboards and 768px for dense intake workflows.
  - **Tablet (768px–1023px):** 8 columns, `margin: 1.5rem`, `gutter: 1rem`.
  - **Mobile (<768px):** 4 columns, `margin-sm: 1rem`, `gutter-sm: 1rem`. Clinical data tables reflow into discrete card units.
- **Rhythm Rules:** Medical details demand high breathing room to prevent misreads. Keep related dosage specs grouped with `space-sm`, component inner paddings balanced at `space-md` or `space-lg`, and major clinical sections separated by `space-xl`.

## Elevation & Depth

Visual hierarchy uses **tonal layering combined with ultra-soft ambient shadows** to suggest safety and cleanliness, avoiding deep, oppressive drop shadows.

- **Surface Level 0 (Base Canvas):** Pristine `#F8FAFC` slate canvas or `#FFFFFF` clinical white.
- **Surface Level 1 (Resting Cards & Containers):** Pure `#FFFFFF` resting on `#F8FAFC`, enclosed with a fine `#E2E8F0` border and an ambient diffusion shadow: `0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03)`.
- **Surface Level 2 (Interactive Floating Cards, Flyouts, Popovers):** Elevated with a subtle teal-tinted depth: `0 4px 6px -1px rgba(13, 92, 90, 0.04), 0 10px 24px -3px rgba(15, 23, 42, 0.08)`. Border shifts slightly lighter to `#CBD5E1`.
- **Surface Level 3 (Dialogs, Prescription Verification Modals):** Backdrop utilizes a serene frosted veil (`rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(4px)`). Container elevation: `0 20px 32px -4px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(13, 92, 90, 0.06)`.

## Shapes

The interface adopts a disciplined **Rounded (`2`)** shape scale, delivering a welcoming, human feel while maintaining architectural composure.

- **Micro Elements (Tags, Checkboxes, Micro-Badges):** `0.375rem` (6px) to maintain geometric integrity at small scales.
- **Inputs, Buttons, Dropdowns:** `0.5rem` (8px) for comfortable touch/click affordances.
- **Prescription Cards, Modal Containers, Dosage Summaries:** `1rem` (16px) via `rounded-lg` to create a soft, protective frame around sensitive health data.
- **Filter Pills, Status Chips, Avatar Badges:** Full pill-shaped (`9999px`) to distinguish categorical selectors from actionable structural cards.

## Components

### Buttons
- **Primary:** Deep medical teal (`#0D5C5A`) fill with white text (`#FFFFFF`), `rounded: 0.5rem`, min-height `48px` (mobile touch safe), bold label. Hover: `#0A4846`. Focus: 3px ring of `#2DD4BF` with `2px` offset.
- **Secondary:** Pristine white fill with `#0D5C5A` border and text. Hover: `#F0FDFA` mint tint.
- **Refill / Urgent Action:** High-contrast warm amber (`#D97706`) button, used sparingly for immediate prescription replenishment deadlines.

### Input Fields & Selectors
- **Structure:** Clean white background, `1px` border of `#CBD5E1`, `0.5rem` radius, `44px` height (`48px` on mobile). Text set to `#0F172A`.
- **States:** Hover reveals `#94A3B8`. Active focus triggers an `#0D5C5A` border with a 3px soft mint ring (`rgba(20, 184, 166, 0.2)`).
- **Helper & Error Messaging:** Prescriptions require explicit guidance; error states combine `#DC2626` text, `#FEE2E2` field background wash, and clear textual descriptions alongside a alert icon.

### Chips & Verification Badges
- **Verified Safe Badge:** Pill shape, `#CCFBF1` mint background, `#047857` forest text, accompanied by a verified check icon.
- **Status Filter Chips:** Pill shape, resting state in `#F1F5F9` with `#475569` text. Active state triggers `#0D5C5A` background with crisp `#FFFFFF` text.

### Cards & Medical Dosage Containers
- **Prescription Card:** `#FFFFFF` background, `1px` border of `#E2E8F0`, `1rem` corner radius, Level 1 elevation. Includes explicit header separating medication trade name from generic designation, dosage badge, and remaining refills counter.
- **Alert Banner Card:** Rounded `0.75rem`, dual-tone left indicator border (`4px` solid): Amber (`#D97706`) on `#FFFBEB` for refills; Emerald (`#059669`) on `#ECFDF5` for insurance approval.

### Lists & Medication Schedules
- **Timeline/Schedule Rows:** Separated by soft `#F1F5F9` horizontal lines. Columns align medication, time-of-day iconography (morning, noon, evening icons), instructions ("Take with food"), and a prominent check/mark-as-taken tap target.

### Checkboxes & Radio Controls
- **Form Controls:** Generous `20px x 20px` touch frame. Unchecked: `#CBD5E1` border on white. Checked: `#0D5C5A` teal fill containing a sharp white checkmark. Focus highlights with an accessible `#99F6E4` halo.