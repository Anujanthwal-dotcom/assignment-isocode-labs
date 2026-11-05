# Quiet Confidence — Design System

The Quiet Confidence design system provides a unified visual and interactive language for the Pharmacy Platform across three core portals:
1. **Customer portal** (`/customer`)
2. **Pharmacist portal** (`/pharmacist`)
3. **Admin and operations portal** (`/admin`)

## Core Principles
- **Light theme only**
- **White and off-white surfaces**: Dominant backgrounds are `#FFFFFF` and `#F7F9F7`.
- **Forest green brand identity**: `#176B52` (brand-600) for primary actions, `#125840` (brand-700) on hover.
- **Strictly minimal aesthetic**: No arbitrary gradients, neon colors, glassmorphism, decorative background illustrations, or arbitrary drop shadows.
- **Iconography**: Exclusively Lucide icons (`lucide-react`).

## Token Reference

### Brand Palette
- `brand-50`: `#E9F3EE`
- `brand-100`: `#D4E8DC`
- `brand-200`: `#B2D6C3`
- `brand-500`: `#23845D`
- `brand-600`: `#176B52` (Primary action)
- `brand-700`: `#125840` (Primary hover)
- `brand-800`: `#104735`

### Neutral Palette
- `neutral-0`: `#FFFFFF`
- `neutral-50`: `#F7F9F7`
- `neutral-100`: `#F0F3F1`
- `neutral-200`: `#E5EAE6` (Standard border)
- `neutral-300`: `#D3DBD5` (Input border)
- `neutral-400`: `#A4B0A8`
- `neutral-500`: `#7D8A81`
- `neutral-600`: `#64736C`
- `neutral-700`: `#43534A`
- `neutral-800`: `#24332E` (Primary text)
- `neutral-900`: `#18251F`

### Semantic Palette
- **Success**: Text `#23845D` | Background `#E8F4ED` | Border `#B9DEC9`
- **Warning**: Text `#A66B16` | Background `#FFF5E5` | Border `#F0D7A8`
- **Danger**: Text `#C44747` | Background `#FCECEC` | Border `#F0C2C2`
- **Information**: Text `#3477A5` | Background `#EAF3FA` | Border `#C5DDEC`

### Typography Tokens
- `display`: 36px / 44px / 600
- `page-title`: 28px / 36px / 600
- `section-title`: 22px / 30px / 600
- `card-title`: 18px / 26px / 600
- `body`: 16px / 24px / 400
- `body-medium`: 16px / 24px / 500
- `secondary`: 14px / 20px / 400
- `caption`: 12px / 16px / 400
- `button`: 14px / 20px / 600

### Spacing Scale (4px base)
`1` (4px), `2` (8px), `3` (12px), `4` (16px), `5` (20px), `6` (24px), `8` (32px), `10` (40px), `12` (48px), `16` (64px).

### Border Radii & Elevation
- Controls & Badges: 6px
- Buttons & Inputs & Dropdowns: 8px
- Cards, Dialogs & Panels: 12px
- Card shadow: None
- Dropdown shadow: `0 4px 16px rgba(36, 51, 46, 0.08)`
- Dialog shadow: `0 12px 32px rgba(36, 51, 46, 0.12)`
