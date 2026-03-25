/**
 * Component Token Schema
 *
 * Defines theme tokens that Zag components use.
 * User-defined tokens are mapped to these CSS custom properties.
 */

// ============================================================================
// Types
// ============================================================================

export interface ThemeTokenDefinition {
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

export interface UserTokenMapping {
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
  // Colors - Primary/Accent
  // ---------------------------------------------------------------------------
  'primary': {
    cssVar: 'm-primary',
    description: 'Primary accent color',
    defaultValue: '#3b82f6',
    category: 'color',
  },
  'primary-hover': {
    cssVar: 'm-primary-hover',
    description: 'Primary color on hover',
    defaultValue: '#2563eb',
    category: 'color',
    derivedFrom: { token: 'primary', transform: 'darken', amount: 10 },
  },
  'primary-active': {
    cssVar: 'm-primary-active',
    description: 'Primary color when active/pressed',
    defaultValue: '#1d4ed8',
    category: 'color',
    derivedFrom: { token: 'primary', transform: 'darken', amount: 15 },
  },

  // ---------------------------------------------------------------------------
  // Colors - Surface (backgrounds)
  // ---------------------------------------------------------------------------
  'surface': {
    cssVar: 'm-surface',
    description: 'Default surface/background color',
    defaultValue: '#1a1a1a',
    category: 'color',
  },
  'surface-hover': {
    cssVar: 'm-surface-hover',
    description: 'Surface color on hover',
    defaultValue: '#252525',
    category: 'color',
    derivedFrom: { token: 'surface', transform: 'lighten', amount: 5 },
  },
  'surface-active': {
    cssVar: 'm-surface-active',
    description: 'Surface color when active',
    defaultValue: '#2a2a2a',
    category: 'color',
    derivedFrom: { token: 'surface', transform: 'lighten', amount: 8 },
  },
  'surface-selected': {
    cssVar: 'm-surface-selected',
    description: 'Surface color when selected',
    defaultValue: '#333333',
    category: 'color',
    derivedFrom: { token: 'surface', transform: 'lighten', amount: 12 },
  },

  // ---------------------------------------------------------------------------
  // Colors - Text
  // ---------------------------------------------------------------------------
  'text': {
    cssVar: 'm-text',
    description: 'Default text color',
    defaultValue: '#e0e0e0',
    category: 'color',
  },
  'text-muted': {
    cssVar: 'm-text-muted',
    description: 'Muted/secondary text',
    defaultValue: '#888888',
    category: 'color',
    derivedFrom: { token: 'text', transform: 'darken', amount: 35 },
  },
  'text-placeholder': {
    cssVar: 'm-text-placeholder',
    description: 'Placeholder text',
    defaultValue: '#555555',
    category: 'color',
    derivedFrom: { token: 'text', transform: 'darken', amount: 55 },
  },

  // ---------------------------------------------------------------------------
  // Colors - Semantic
  // ---------------------------------------------------------------------------
  'error': {
    cssVar: 'm-error',
    description: 'Error color',
    defaultValue: '#ef4444',
    category: 'color',
  },
  'success': {
    cssVar: 'm-success',
    description: 'Success color',
    defaultValue: '#22c55e',
    category: 'color',
  },
  'warning': {
    cssVar: 'm-warning',
    description: 'Warning color',
    defaultValue: '#f59e0b',
    category: 'color',
  },

  // ---------------------------------------------------------------------------
  // Spacing
  // ---------------------------------------------------------------------------
  'spacing': {
    cssVar: 'm-spacing',
    description: 'Base spacing unit',
    defaultValue: 4,
    category: 'spacing',
  },
  'gap': {
    cssVar: 'm-gap',
    description: 'Default gap between elements',
    defaultValue: 8,
    category: 'spacing',
  },
  'pad': {
    cssVar: 'm-pad',
    description: 'Default padding',
    defaultValue: 8,
    category: 'spacing',
  },
  'pad-x': {
    cssVar: 'm-pad-x',
    description: 'Horizontal padding for controls',
    defaultValue: 12,
    category: 'spacing',
  },
  'pad-y': {
    cssVar: 'm-pad-y',
    description: 'Vertical padding for controls',
    defaultValue: 8,
    category: 'spacing',
  },

  // ---------------------------------------------------------------------------
  // Sizing
  // ---------------------------------------------------------------------------
  'control-height': {
    cssVar: 'm-control-h',
    description: 'Height of controls (buttons, inputs, selects)',
    defaultValue: 36,
    category: 'sizing',
  },
  'item-height': {
    cssVar: 'm-item-h',
    description: 'Height of list/dropdown items',
    defaultValue: 32,
    category: 'sizing',
  },
  'icon-size': {
    cssVar: 'm-icon',
    description: 'Size of icons',
    defaultValue: 16,
    category: 'sizing',
  },

  // ---------------------------------------------------------------------------
  // Border
  // ---------------------------------------------------------------------------
  'radius': {
    cssVar: 'm-radius',
    description: 'Border radius',
    defaultValue: 6,
    category: 'border',
  },
  'radius-sm': {
    cssVar: 'm-radius-sm',
    description: 'Small border radius',
    defaultValue: 4,
    category: 'border',
    derivedFrom: { token: 'radius', transform: 'multiply', amount: 0.66 },
  },
  'radius-lg': {
    cssVar: 'm-radius-lg',
    description: 'Large border radius',
    defaultValue: 8,
    category: 'border',
    derivedFrom: { token: 'radius', transform: 'multiply', amount: 1.33 },
  },
  'border-width': {
    cssVar: 'm-border',
    description: 'Border width',
    defaultValue: 1,
    category: 'border',
  },

  // ---------------------------------------------------------------------------
  // Typography
  // ---------------------------------------------------------------------------
  'font': {
    cssVar: 'm-font',
    description: 'Font family',
    defaultValue: 'system-ui, -apple-system, sans-serif',
    category: 'typography',
  },
  'font-size': {
    cssVar: 'm-font-size',
    description: 'Base font size',
    defaultValue: 14,
    category: 'typography',
  },
  'font-size-sm': {
    cssVar: 'm-font-size-sm',
    description: 'Small font size',
    defaultValue: 12,
    category: 'typography',
    derivedFrom: { token: 'font-size', transform: 'multiply', amount: 0.85 },
  },
  'line-height': {
    cssVar: 'm-line-height',
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
 * When user defines "primary: #ff0000", it generates:
 * - --m-primary: #ff0000
 * - --m-primary-hover: (auto-darkened)
 * - --m-primary-active: (auto-darkened more)
 */
export const USER_TOKEN_MAPPINGS: UserTokenMapping[] = [
  {
    userToken: 'primary',
    generates: ['primary', 'primary-hover', 'primary-active'],
  },
  {
    userToken: 'surface',
    generates: ['surface', 'surface-hover', 'surface-active', 'surface-selected'],
  },
  {
    userToken: 'text',
    generates: ['text', 'text-muted', 'text-placeholder'],
  },
  {
    userToken: 'error',
    generates: ['error'],
  },
  {
    userToken: 'success',
    generates: ['success'],
  },
  {
    userToken: 'warning',
    generates: ['warning'],
  },
  {
    userToken: 'radius',
    generates: ['radius', 'radius-sm', 'radius-lg'],
  },
  {
    userToken: 'font-size',
    generates: ['font-size', 'font-size-sm'],
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all theme tokens with their default values
 */
export function getDefaultThemeTokens(): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  for (const [key, def] of Object.entries(THEME_TOKENS)) {
    result[key] = def.defaultValue
  }
  return result
}

/**
 * Get CSS variable declarations for all theme tokens
 */
export function getThemeTokenCSS(tokens: Record<string, string | number> = {}): string {
  const merged = { ...getDefaultThemeTokens(), ...tokens }
  const lines: string[] = [':root {']

  for (const [key, def] of Object.entries(THEME_TOKENS)) {
    const value = merged[key] ?? def.defaultValue
    const cssValue = typeof value === 'number' && def.category !== 'typography'
      ? `${value}px`
      : value
    lines.push(`  --${def.cssVar}: ${cssValue};`)
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * Find which theme tokens a user token generates
 */
export function getGeneratedTokens(userToken: string): string[] {
  const mapping = USER_TOKEN_MAPPINGS.find(m => m.userToken === userToken)
  return mapping?.generates ?? [userToken]
}
