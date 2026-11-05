/**
 * Pharmacy Platform Design System: "Quiet Confidence"
 * Deterministic tokens matching Phase 0.5 specifications exactly.
 */

export const BRAND_TOKENS = {
  50: '#E9F3EE',
  100: '#D4E8DC',
  200: '#B2D6C3',
  500: '#23845D',
  600: '#176B52', // Primary buttons
  700: '#125840', // Primary button hover
  800: '#104735',
} as const;

export const NEUTRAL_TOKENS = {
  0: '#FFFFFF',
  50: '#F7F9F7',
  100: '#F0F3F1',
  200: '#E5EAE6',
  300: '#D3DBD5',
  400: '#A4B0A8',
  500: '#7D8A81',
  600: '#64736C',
  700: '#43534A',
  800: '#24332E',
  900: '#18251F',
} as const;

export const SEMANTIC_TOKENS = {
  success: {
    foreground: '#23845D',
    background: '#E8F4ED',
    border: '#B9DEC9',
  },
  warning: {
    foreground: '#A66B16',
    background: '#FFF5E5',
    border: '#F0D7A8',
  },
  danger: {
    foreground: '#C44747',
    background: '#FCECEC',
    border: '#F0C2C2',
  },
  information: {
    foreground: '#3477A5',
    background: '#EAF3FA',
    border: '#C5DDEC',
  },
} as const;

export const GLOBAL_SEMANTIC_MAPPING = {
  background: '#F7F9F7',
  foreground: '#24332E',
  card: '#FFFFFF',
  cardForeground: '#24332E',
  primary: '#176B52',
  primaryForeground: '#FFFFFF',
  secondary: '#E9F3EE',
  secondaryForeground: '#176B52',
  muted: '#F0F3F1',
  mutedForeground: '#64736C',
  border: '#E5EAE6',
  input: '#D3DBD5',
  ring: '#23845D',
  destructive: '#C44747',
} as const;

export const TYPOGRAPHY_SCALE = {
  display: { fontSize: 36, lineHeight: 44, fontWeight: 600 },
  pageTitle: { fontSize: 28, lineHeight: 36, fontWeight: 600 },
  sectionTitle: { fontSize: 22, lineHeight: 30, fontWeight: 600 },
  cardTitle: { fontSize: 18, lineHeight: 26, fontWeight: 600 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: 500 },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 400 },
  button: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
} as const;

export const SPACING_SCALE = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const BORDER_RADII = {
  smallControls: '6px',
  buttons: '8px',
  inputs: '8px',
  cards: '12px',
  dialogs: '12px',
  dropdowns: '8px',
  badges: '6px',
  mainPanels: '12px',
} as const;

export const ELEVATION_SHADOWS = {
  card: 'none',
  dropdown: '0 4px 16px rgba(36, 51, 46, 0.08)',
  dialog: '0 12px 32px rgba(36, 51, 46, 0.12)',
} as const;

export const BORDER_COLORS = {
  standard: '#E5EAE6',
  focus: '#23845D',
  error: '#C44747',
} as const;

export const BREAKPOINTS = {
  mobile: { min: 0, max: 639 },
  tablet: { min: 640, max: 1023 },
  desktop: { min: 1024, max: 1279 },
  wideDesktop: { min: 1280, max: Infinity },
} as const;
