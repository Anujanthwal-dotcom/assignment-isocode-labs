/**
 * Pharmacy Platform Design System: "Clinical Clarity & Care"
 * Authoritative, empathetic, meticulously organized, and serenely calm healthcare design tokens.
 * Derived from Design.md specifications.
 */

export const BRAND_TOKENS = {
  // Primary: Deep therapeutic teal anchoring primary actions, core branding, and clinical titles
  primary: '#0D5C5A',
  primaryHover: '#0A4846',
  primaryActive: '#004341',
  primaryContainer: '#004341',
  onPrimaryContainer: '#8FD2CF',
  primaryFocusRing: '#2DD4BF',
  primaryFixed: '#ABFEFEB',
  primaryFixedDim: '#8FD2CF',

  // Secondary: Invigorating soft eucalyptus for interactive highlights, active state pills, sub-nav
  secondary: '#14B8A6',
  secondaryDark: '#006B5F',
  secondaryContainer: '#CCFBF1',
  onSecondaryContainer: '#047857',
  secondaryFixed: '#71F8E4',
  secondaryFixedDim: '#4FDBC8',

  // Tertiary: Trust blue reserved for informational callouts, consultation triggers, digital health records
  tertiary: '#0284C7',
  tertiaryDark: '#003F62',
  tertiaryContainer: '#005785',
  onTertiaryContainer: '#92CCFF',
  tertiaryFixed: '#CCE5FF',
  tertiaryFixedDim: '#93CCFF',
} as const;

export const NEUTRAL_TOKENS = {
  // Surface levels and neutrals
  surface: '#F8F9FF',
  surfaceDim: '#CCDBF3',
  surfaceBright: '#F8F9FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EFF4FF',
  surfaceContainer: '#E6EEFF',
  surfaceContainerHigh: '#DCE9FF',
  surfaceContainerHighest: '#D5E3FC',

  // High contrast text hierarchy
  onSurface: '#0D1C2E', // Deep slate charcoal for primary headings
  onSurfaceVariant: '#3F4948', // Balanced slate for sustained reading body
  inverseSurface: '#233144',
  inverseOnSurface: '#EAF1FF',

  // Low-friction structural borders
  outline: '#6F7978',
  outlineVariant: '#BEC9C7',
  borderStandard: '#E2E8F0',
  borderInteractive: '#CBD5E1',

  // Canvas
  baseCanvas: '#F8FAFC',
  clinicalWhite: '#FFFFFF',
  mintWash: '#F0FDFA',
} as const;

export const SEMANTIC_TOKENS = {
  // Verification & Safety: Clinical green with pale mint base
  success: {
    foreground: '#059669',
    background: '#CCFBF1',
    border: '#99F6E4',
  },
  // Refill Alerts & Adherence: Warm amber with light marigold wash
  warning: {
    foreground: '#D97706',
    background: '#FFFBEB',
    wash: '#FEF3C7',
    border: '#FDE68A',
  },
  // Critical Contraindications & Warnings: Deep vermilion with soft rose wash
  danger: {
    foreground: '#DC2626',
    background: '#FEF2F2',
    wash: '#FEE2E2',
    border: '#FECACA',
  },
  // Trust Information & Records: Trust blue
  information: {
    foreground: '#0284C7',
    background: '#E0F2FE',
    border: '#BAE6FD',
  },
} as const;

export const GLOBAL_SEMANTIC_MAPPING = {
  background: '#F8FAFC',
  foreground: '#0F172A',
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  primary: '#0D5C5A',
  primaryForeground: '#FFFFFF',
  secondary: '#F0FDFA',
  secondaryForeground: '#0D5C5A',
  muted: '#EFF4FF',
  mutedForeground: '#475569',
  border: '#E2E8F0',
  input: '#CBD5E1',
  ring: '#14B8A6',
  destructive: '#DC2626',
} as const;

export const TYPOGRAPHY_SCALE = {
  headlineXl: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 40,
    lineHeight: 52,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  headlineLg: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 600,
    letterSpacing: '-0.015em',
  },
  headlineMd: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
  headlineSm: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
  bodyLg: {
    fontFamily: 'Inter',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: 400,
  },
  bodyMd: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: 400,
  },
  bodySm: {
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: 400,
  },
  labelLg: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
  labelMd: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  labelSm: {
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 500,
    letterSpacing: '0.03em',
  },
} as const;

export const SPACING_SCALE = {
  spaceXs: '0.25rem', // 4px
  spaceSm: '0.5rem', // 8px
  spaceMd: '1rem', // 16px
  spaceLg: '1.5rem', // 24px
  spaceXl: '2.5rem', // 40px
  gutter: '1.5rem',
  gutterSm: '1rem',
  margin: '2rem',
  marginSm: '1rem',
} as const;

export const BORDER_RADII = {
  sm: '0.25rem', // 4px
  micro: '0.375rem', // 6px (micro badges, tags)
  default: '0.5rem', // 8px (buttons, inputs, dropdowns)
  md: '0.75rem', // 12px (alert banners, panels)
  lg: '1rem', // 16px (prescription cards, dialogs)
  xl: '1.5rem', // 24px
  full: '9999px', // Filter pills, status chips, avatar badges
} as const;

export const ELEVATION_SHADOWS = {
  // Surface Level 1 (Resting Cards & Containers)
  card: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03)',
  // Surface Level 2 (Interactive Floating Cards, Flyouts, Popovers)
  dropdown: '0 4px 6px -1px rgba(13, 92, 90, 0.04), 0 10px 24px -3px rgba(15, 23, 42, 0.08)',
  // Surface Level 3 (Dialogs, Prescription Verification Modals)
  dialog: '0 20px 32px -4px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(13, 92, 90, 0.06)',
} as const;

export const BORDER_COLORS = {
  standard: '#E2E8F0',
  interactive: '#CBD5E1',
  focus: '#0D5C5A',
  error: '#DC2626',
} as const;

export const BREAKPOINTS = {
  mobile: { min: 0, max: 767 },
  tablet: { min: 768, max: 1023 },
  desktop: { min: 1024, max: 1279 },
  wideDesktop: { min: 1280, max: Infinity },
} as const;
