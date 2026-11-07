# Clinical Clarity & Care — Pharmacy Platform Design System

The **Clinical Clarity & Care** design system embodies the standard of certified digital healthcare: authoritative, empathetic, meticulously organized, and serenely calm. Designed for patients managing complex prescriptions, caregivers monitoring loved ones, and clinicians reviewing regimens, the interface balances clinical rigor with warm human reassurance.

## Core Visual Identity

- **Primary Deep Therapeutic Teal (`#0D5C5A` / `#004341`)**: Anchors primary actions, core branding, and prominent clinical titles.
- **Secondary Invigorating Eucalyptus (`#14B8A6`)**: Interactive highlights, active state pills, and sub-navigation elements.
- **Tertiary Trust Blue (`#0284C7`)**: Reserved for informational callouts, consultation triggers, and digital health records.
- **Layered Surfaces**: Pristine clinical white (`#FFFFFF`) layered with pale porcelain slate (`#F8FAFC`) and restorative mint-tinted surfaces (`#F0FDFA`).
- **Low-Friction Structural Borders (`#E2E8F0` / `#CBD5E1`)**: Clean separation with minimal cognitive strain.
- **Typography Scale**: Display & Headings in **Plus Jakarta Sans** (friendly geometric warmth and medical authority), functional labels and body in **Inter**, and **tabular figures (`tnum` / `tabular-nums`)** for prescription amounts, pill counts, schedules, and pricing grids.

---

## Token Reference

### Brand Palette

- `primary`: `#0D5C5A` (Deep therapeutic teal)
- `primary-hover`: `#0A4846`
- `primary-active`: `#004341`
- `primary-focus-ring`: `#2DD4BF` / `#14B8A6`
- `secondary`: `#14B8A6` (Soft eucalyptus)
- `secondary-container`: `#CCFBF1`
- `on-secondary-container`: `#047857`
- `tertiary`: `#0284C7` (Trust blue)
- `tertiary-container`: `#E0F2FE`

### Surface Levels

- `Surface Level 0`: `#F8FAFC` slate canvas or `#FFFFFF`
- `Surface Level 1` (Cards): `#FFFFFF` enclosed with `#E2E8F0` border and ambient diffusion shadow `0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03)`
- `Surface Level 2` (Floating / Popovers): Elevated depth `0 4px 6px -1px rgba(13, 92, 90, 0.04), 0 10px 24px -3px rgba(15, 23, 42, 0.08)`
- `Surface Level 3` (Dialogs / Modals): Frosted veil `rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(4px)` and container shadow `0 20px 32px -4px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(13, 92, 90, 0.06)`

### Semantic Accents

- **Verified Safe & Clinical Sign-Off**: Text `#047857` | Background `#CCFBF1` | Border `#99F6E4`
- **Refill Alerts & Adherence Notices**: Text `#D97706` | Background `#FFFBEB` | Wash `#FEF3C7` | Border `#FDE68A`
- **Critical Contraindications & Warnings**: Text `#DC2626` | Background `#FEF2F2` | Wash `#FEE2E2` | Border `#FECACA`
- **Clinical Records & Info**: Text `#0284C7` | Background `#E0F2FE` | Border `#BAE6FD`

---

## Shape & Radius Scale

- `sm`: `0.25rem` (4px)
- `micro`: `0.375rem` (6px - tags, checkboxes, micro-badges)
- `default`: `0.5rem` (8px - inputs, buttons, dropdowns)
- `md`: `0.75rem` (12px - alert banner cards, panels)
- `lg`: `1rem` (16px - prescription cards, modal containers)
- `full`: `9999px` (Filter pills, status chips, avatar badges)
