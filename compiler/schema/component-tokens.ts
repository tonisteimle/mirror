/**
 * Component Token Schema
 *
 * Defines theme tokens that Zag components use.
 * User-defined tokens are mapped to these CSS custom properties.
 */

// ============================================================================
// Types
// ============================================================================

interface ThemeTokenDefinition {
  /** CSS custom property name (without --) */
  cssVar: string
  /** Description for documentation */
  description: string
  /** Default value if not defined by user */
  defaultValue: string | number
  /** Token category */
  category: 'color' | 'spacing' | 'sizing' | 'border' | 'typography'
  /** Can be auto-generated from a base token */
  derivedFrom?: {
    token: string
    transform: 'lighten' | 'darken' | 'multiply' | 'none'
    amount?: number
  }
}

interface UserTokenMapping {
  /** User token name (e.g., "primary", "surface") */
  userToken: string
  /** Which theme tokens it generates */
  generates: string[]
}

// ============================================================================
// Theme Token Definitions
// ============================================================================

export const THEME_TOKENS: Record<string, ThemeTokenDefinition> = {
  // ---------------------------------------------------------------------------
  // Colors - Accent (Primary action color)
  // ---------------------------------------------------------------------------
  'accent.bg': {
    cssVar: 'accent-bg',
    description: 'Primary accent background',
    defaultValue: '#5BA8F5',
    category: 'color',
  },
  'accent-hover.bg': {
    cssVar: 'accent-hover-bg',
    description: 'Accent color on hover',
    defaultValue: '#2271C1',
    category: 'color',
    derivedFrom: { token: 'accent.bg', transform: 'darken', amount: 10 },
  },
  'accent-active.bg': {
    cssVar: 'accent-active-bg',
    description: 'Accent color when active/pressed',
    defaultValue: '#1d4ed8',
    category: 'color',
    derivedFrom: { token: 'accent.bg', transform: 'darken', amount: 15 },
  },
  'accent.col': {
    cssVar: 'accent-col',
    description: 'Text on accent background',
    defaultValue: '#ffffff',
    category: 'color',
  },

  // ---------------------------------------------------------------------------
  // Colors - Surface (cards, panels)
  // ---------------------------------------------------------------------------
  'surface.bg': {
    cssVar: 'surface-bg',
    description: 'Surface/card background',
    defaultValue: '#27272a',
    category: 'color',
  },
  'surface-hover.bg': {
    cssVar: 'surface-hover-bg',
    description: 'Surface color on hover',
    defaultValue: '#323238',
    category: 'color',
    derivedFrom: { token: 'surface.bg', transform: 'lighten', amount: 5 },
  },
  'surface-active.bg': {
    cssVar: 'surface-active-bg',
    description: 'Surface color when active',
    defaultValue: '#3a3a42',
    category: 'color',
    derivedFrom: { token: 'surface.bg', transform: 'lighten', amount: 8 },
  },
  'surface-selected.bg': {
    cssVar: 'surface-selected-bg',
    description: 'Surface color when selected',
    defaultValue: '#42424a',
    category: 'color',
    derivedFrom: { token: 'surface.bg', transform: 'lighten', amount: 12 },
  },

  // ---------------------------------------------------------------------------
  // Colors - Canvas (page background)
  // ---------------------------------------------------------------------------
  'canvas.bg': {
    cssVar: 'canvas-bg',
    description: 'Page/app background',
    defaultValue: '#18181b',
    category: 'color',
  },

  // ---------------------------------------------------------------------------
  // Colors - Elevated (dropdowns, modals)
  // ---------------------------------------------------------------------------
  'elevated.bg': {
    cssVar: 'elevated-bg',
    description: 'Elevated surface (dropdowns, modals)',
    defaultValue: '#2a2a2e',
    category: 'color',
  },
  'elevated-hover.bg': {
    cssVar: 'elevated-hover-bg',
    description: 'Elevated surface on hover',
    defaultValue: '#353539',
    category: 'color',
    derivedFrom: { token: 'elevated.bg', transform: 'lighten', amount: 5 },
  },

  // ---------------------------------------------------------------------------
  // Colors - Input
  // ---------------------------------------------------------------------------
  'input.bg': {
    cssVar: 'input-bg',
    description: 'Input field background',
    defaultValue: '#1f1f23',
    category: 'color',
  },
  'input-hover.bg': {
    cssVar: 'input-hover-bg',
    description: 'Input field on hover',
    defaultValue: '#28282e',
    category: 'color',
    derivedFrom: { token: 'input.bg', transform: 'lighten', amount: 5 },
  },

  // ---------------------------------------------------------------------------
  // Colors - Overlay
  // ---------------------------------------------------------------------------
  'overlay.bg': {
    cssVar: 'overlay-bg',
    description: 'Modal backdrop overlay',
    defaultValue: 'rgba(0, 0, 0, 0.5)',
    category: 'color',
  },

  // ---------------------------------------------------------------------------
  // Colors - Text
  // ---------------------------------------------------------------------------
  'text.col': {
    cssVar: 'text-col',
    description: 'Primary text color',
    defaultValue: '#ffffff',
    category: 'color',
  },
  'muted.col': {
    cssVar: 'muted-col',
    description: 'Muted/secondary text',
    defaultValue: '#a1a1aa',
    category: 'color',
  },
  'subtle.col': {
    cssVar: 'subtle-col',
    description: 'Subtle text (placeholders)',
    defaultValue: '#71717a',
    category: 'color',
  },

  // ---------------------------------------------------------------------------
  // Colors - Border
  // ---------------------------------------------------------------------------
  'border.boc': {
    cssVar: 'border-boc',
    description: 'Default border color',
    defaultValue: '#3f3f46',
    category: 'color',
  },
  'border-hover.boc': {
    cssVar: 'border-hover-boc',
    description: 'Border color on hover',
    defaultValue: '#52525b',
    category: 'color',
    derivedFrom: { token: 'border.boc', transform: 'lighten', amount: 10 },
  },
  'focus.boc': {
    cssVar: 'focus-boc',
    description: 'Focus ring/border color',
    defaultValue: '#5BA8F5',
    category: 'color',
  },

  // ---------------------------------------------------------------------------
  // Colors - Semantic
  // ---------------------------------------------------------------------------
  'error.bg': {
    cssVar: 'error-bg',
    description: 'Error background',
    defaultValue: '#ef4444',
    category: 'color',
  },
  'error.col': {
    cssVar: 'error-col',
    description: 'Error text',
    defaultValue: '#fca5a5',
    category: 'color',
  },
  'success.bg': {
    cssVar: 'success-bg',
    description: 'Success background',
    defaultValue: '#22c55e',
    category: 'color',
  },
  'success.col': {
    cssVar: 'success-col',
    description: 'Success text',
    defaultValue: '#86efac',
    category: 'color',
  },
  'warning.bg': {
    cssVar: 'warning-bg',
    description: 'Warning background',
    defaultValue: '#f59e0b',
    category: 'color',
  },
  'warning.col': {
    cssVar: 'warning-col',
    description: 'Warning text',
    defaultValue: '#fcd34d',
    category: 'color',
  },

  // ---------------------------------------------------------------------------
  // Spacing - Padding
  // ---------------------------------------------------------------------------
  's.pad': {
    cssVar: 's-pad',
    description: 'Small padding (4px)',
    defaultValue: 4,
    category: 'spacing',
  },
  'm.pad': {
    cssVar: 'm-pad',
    description: 'Medium padding (8px)',
    defaultValue: 8,
    category: 'spacing',
  },
  'l.pad': {
    cssVar: 'l-pad',
    description: 'Large padding (16px)',
    defaultValue: 16,
    category: 'spacing',
  },

  // ---------------------------------------------------------------------------
  // Spacing - Gap
  // ---------------------------------------------------------------------------
  's.gap': {
    cssVar: 's-gap',
    description: 'Small gap (4px)',
    defaultValue: 4,
    category: 'spacing',
  },
  'm.gap': {
    cssVar: 'm-gap',
    description: 'Medium gap (8px)',
    defaultValue: 8,
    category: 'spacing',
  },
  'l.gap': {
    cssVar: 'l-gap',
    description: 'Large gap (16px)',
    defaultValue: 16,
    category: 'spacing',
  },

  // ---------------------------------------------------------------------------
  // Border - Radius
  // ---------------------------------------------------------------------------
  's.rad': {
    cssVar: 's-rad',
    description: 'Small radius (4px)',
    defaultValue: 4,
    category: 'border',
  },
  'm.rad': {
    cssVar: 'm-rad',
    description: 'Medium radius (8px)',
    defaultValue: 8,
    category: 'border',
  },
  'l.rad': {
    cssVar: 'l-rad',
    description: 'Large radius (12px)',
    defaultValue: 12,
    category: 'border',
  },

  // ---------------------------------------------------------------------------
  // Typography
  // ---------------------------------------------------------------------------
  font: {
    cssVar: 'font',
    description: 'Font family',
    defaultValue: 'Inter, system-ui, -apple-system, sans-serif',
    category: 'typography',
  },
  's.fs': {
    cssVar: 's-fs',
    description: 'Small font size (12px)',
    defaultValue: 12,
    category: 'typography',
  },
  'm.fs': {
    cssVar: 'm-fs',
    description: 'Medium font size (14px)',
    defaultValue: 14,
    category: 'typography',
  },
  'l.fs': {
    cssVar: 'l-fs',
    description: 'Large font size (18px)',
    defaultValue: 18,
    category: 'typography',
  },
  'xl.fs': {
    cssVar: 'xl-fs',
    description: 'Extra large font size (24px)',
    defaultValue: 24,
    category: 'typography',
  },
  'line-height': {
    cssVar: 'line-height',
    description: 'Line height',
    defaultValue: 1.5,
    category: 'typography',
  },
}

// ============================================================================
// User Token Mappings
// ============================================================================

/**
 * Maps user-defined tokens to theme tokens.
 * When user defines "$accent.bg: #ff0000", it generates:
 * - --accent-bg: #ff0000
 * - --accent-hover-bg: (auto-darkened)
 * - --accent-active-bg: (auto-darkened more)
 */
export const USER_TOKEN_MAPPINGS: UserTokenMapping[] = [
  // Accent colors
  {
    userToken: 'accent.bg',
    generates: ['accent.bg', 'accent-hover.bg', 'accent-active.bg'],
  },
  // Surface colors
  {
    userToken: 'surface.bg',
    generates: ['surface.bg', 'surface-hover.bg', 'surface-active.bg', 'surface-selected.bg'],
  },
  // Elevated colors
  {
    userToken: 'elevated.bg',
    generates: ['elevated.bg', 'elevated-hover.bg'],
  },
  // Input colors
  {
    userToken: 'input.bg',
    generates: ['input.bg', 'input-hover.bg'],
  },
  // Text colors
  {
    userToken: 'text.col',
    generates: ['text.col', 'muted.col', 'subtle.col'],
  },
  // Border colors
  {
    userToken: 'border.boc',
    generates: ['border.boc', 'border-hover.boc'],
  },
  // Semantic colors
  {
    userToken: 'error.bg',
    generates: ['error.bg'],
  },
  {
    userToken: 'success.bg',
    generates: ['success.bg'],
  },
  {
    userToken: 'warning.bg',
    generates: ['warning.bg'],
  },
]

// (helper functions getDefaultThemeTokens / getThemeTokenCSS / getGeneratedTokens
//  removed — unused; theme generation lives in theme-generator.ts)
