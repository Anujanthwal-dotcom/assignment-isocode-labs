/**
 * Pharmacy Platform Design System: "Teladoc Health UI"
 * Modern, human-centric, patient-first telehealth tokens.
 */

export const BRAND_TOKENS = {
  50: '#F7F5FD',
  100: '#EAE8F0',
  200: '#D6D1F7',
  300: '#B3A7F4',
  400: '#8C72F2',
  500: '#6240E8', // Teladoc Electric Purple (Primary Action)
  600: '#542F9B', // Hover Violet
  700: '#351F65', // Teladoc Midnight Purple (Headings & Brand Mark)
  800: '#251448',
  cyan: '#00B5E2', // Teladoc Cyan Accent
  cyanDark: '#0088AA',
} as const;

export const NEUTRAL_TOKENS = {
  0: '#FFFFFF',
  50: '#F8F9FB',
  100: '#EFF2F7',
  200: '#DFE0DF',
  300: '#CED4DA',
  400: '#ADB5BD',
  500: '#78879A',
  600: '#6C757D',
  700: '#495057',
  800: '#351F65',
  900: '#14161A',
} as const;

export const SEMANTIC_TOKENS = {
  success: {
    foreground: '#0FAC26',
    background: '#E8F8EC',
    border: '#B0E6BC',
  },
  warning: {
    foreground: '#A66B16',
    background: '#FFF8EC',
    border: '#F6DCB0',
  },
  danger: {
    foreground: '#DC3545',
    background: '#FDF2F2',
    border: '#F9CACA',
  },
  information: {
    foreground: '#0088AA',
    background: '#EBF9FD',
    border: '#B4EDFB',
  },
} as const;

export const GLOBAL_SEMANTIC_MAPPING = {
  background: '#F8F9FB',
  foreground: '#14161A',
  card: '#FFFFFF',
  cardForeground: '#351F65',
  primary: '#6240E8',
  primaryForeground: '#FFFFFF',
  secondary: '#F7F5FD',
  secondaryForeground: '#6240E8',
  muted: '#EFF2F7',
  mutedForeground: '#6C757D',
  border: '#EAE8F0',
  input: '#CED4DA',
  ring: '#6240E8',
  destructive: '#DC3545',
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
  card: '0 4px 20px rgba(53, 31, 101, 0.05)',
  dropdown: '0 4px 18px rgba(53, 31, 101, 0.10)',
  dialog: '0 16px 36px rgba(53, 31, 101, 0.16)',
} as const;

export const BORDER_COLORS = {
  standard: '#EAE8F0',
  focus: '#6240E8',
  error: '#DC3545',
} as const;

export const BREAKPOINTS = {
  mobile: { min: 0, max: 639 },
  tablet: { min: 640, max: 1023 },
  desktop: { min: 1024, max: 1279 },
  wideDesktop: { min: 1280, max: Infinity },
} as const;
