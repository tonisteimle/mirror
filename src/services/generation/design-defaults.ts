/**
 * Design Defaults
 *
 * Hardcoded values for semantic roles.
 * Used when no token system is available.
 */

export const DESIGN_DEFAULTS = {
  background: {
    app: '#09090B',         // $grey-950 - deepest background
    surface: '#18181B',     // $grey-900 - standard surfaces
    elevated: '#27272A',    // $grey-800 - elevated surfaces
    hover: '#3F3F46',       // $grey-700 - hover state
    active: '#3F3F46',      // $grey-700 - active/selected state
    primary: '#3B82F6',     // $blue-500 - primary action
    danger: '#EF4444',      // $red-500 - dangerous action
    transparent: 'transparent'
  },

  foreground: {
    default: '#D4D4D8',     // $grey-300 - standard text
    muted: '#71717A',       // $grey-500 - secondary text
    heading: '#FAFAFA',     // $grey-50 - headings, emphasized
    primary: '#3B82F6',     // $blue-500 - primary color
    danger: '#EF4444',      // $red-500 - error/warning
    onPrimary: '#FFFFFF'    // white - text on primary
  },

  spacing: {
    xs: 4,
    sm: 8,
    smd: 12,  // between sm and md - for icon-text gaps
    md: 16,
    lg: 24,
    xl: 32
  },

  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999
  },

  border: {
    none: null,
    subtle: '#27272A',      // $grey-800
    default: '#3F3F46',     // $grey-700
    strong: '#52525B'       // $grey-600
  },

  iconSize: {
    sm: 16,
    md: 20,
    lg: 24
  }
} as const;

// Type for role resolution
export type BackgroundRole = keyof typeof DESIGN_DEFAULTS.background;
export type ForegroundRole = keyof typeof DESIGN_DEFAULTS.foreground;
export type SpacingRole = keyof typeof DESIGN_DEFAULTS.spacing;
export type RadiusRole = keyof typeof DESIGN_DEFAULTS.radius;
export type BorderRole = keyof typeof DESIGN_DEFAULTS.border;

/**
 * Resolve a semantic role to a concrete value
 */
export function resolveBackground(role: BackgroundRole): string {
  return DESIGN_DEFAULTS.background[role];
}

export function resolveForeground(role: ForegroundRole): string {
  return DESIGN_DEFAULTS.foreground[role];
}

export function resolveSpacing(role: SpacingRole): number {
  return DESIGN_DEFAULTS.spacing[role];
}

export function resolveRadius(role: RadiusRole): number {
  return DESIGN_DEFAULTS.radius[role];
}
