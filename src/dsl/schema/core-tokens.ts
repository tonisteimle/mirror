/**
 * @module dsl/schema/core-tokens
 * @description Design tokens for core components
 */

export interface CoreTokenDefinition {
  value: string
  description: string
}

// =============================================================================
// NAVIGATION TOKENS
// =============================================================================

export const NAVIGATION_TOKENS: Record<string, CoreTokenDefinition> = {
  '$nav.bg': { value: '#18181B', description: 'Navigation Hintergrund' },
  '$nav.hover': { value: '#27272A', description: 'Navigation Hover-Hintergrund' },
  '$nav.active': { value: '#3F3F46', description: 'Navigation Aktiv-Hintergrund' },
  '$nav.text': { value: '#D4D4D8', description: 'Navigation Text' },
  '$nav.muted': { value: '#71717A', description: 'Navigation gedämpfter Text/Icons' },
  '$nav.badge': { value: '#3F3F46', description: 'Navigation Badge-Hintergrund' },
}

// =============================================================================
// FORM TOKENS
// =============================================================================

export const FORM_TOKENS: Record<string, CoreTokenDefinition> = {
  '$form.bg': { value: '#18181B', description: 'Form Hintergrund' },
  '$form.input': { value: '#27272A', description: 'Input Hintergrund' },
  '$form.border': { value: '#3F3F46', description: 'Input Border' },
  '$form.focus': { value: '#3B82F6', description: 'Focus-Ring Farbe' },
  '$form.error': { value: '#EF4444', description: 'Fehler-Farbe' },
  '$form.success': { value: '#22C55E', description: 'Erfolgs-Farbe' },
  '$form.text': { value: '#D4D4D8', description: 'Form Text' },
  '$form.muted': { value: '#71717A', description: 'Form Placeholder/Helper' },
  '$form.label': { value: '#A1A1AA', description: 'Form Label Text' },
  '$form.placeholder': { value: '#52525B', description: 'Input Placeholder Text' },
}

// =============================================================================
// BUTTON TOKENS
// =============================================================================

export const BUTTON_TOKENS: Record<string, CoreTokenDefinition> = {
  '$primary.bg': { value: '#3B82F6', description: 'Primary Button Hintergrund' },
  '$primary.hover': { value: '#2563EB', description: 'Primary Button Hover' },
  '$primary.text': { value: '#FFFFFF', description: 'Primary Button Text' },
  '$secondary.bg': { value: '#27272A', description: 'Secondary Button Hintergrund' },
  '$secondary.hover': { value: '#3F3F46', description: 'Secondary Button Hover' },
  '$danger.bg': { value: '#EF4444', description: 'Danger Button Hintergrund' },
  '$danger.hover': { value: '#DC2626', description: 'Danger Button Hover' },
}

// =============================================================================
// COMBINED EXPORT
// =============================================================================

export const CORE_TOKENS: Record<string, CoreTokenDefinition> = {
  ...NAVIGATION_TOKENS,
  ...FORM_TOKENS,
  ...BUTTON_TOKENS,
}
