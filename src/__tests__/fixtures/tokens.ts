/**
 * Shared Token Definitions for Tests
 *
 * Centralized token/design system definitions used across test files.
 */

// =============================================================================
// DESIGN SYSTEM TOKENS
// =============================================================================

export const TOKENS = {
  // Colors
  colors: `$bg-app: #0A0A0F
$bg-sidebar: #0F0F14
$bg-card: #1A1A23
$bg-hover: #252530
$primary: #3B82F6
$success: #10B981
$warning: #F59E0B
$danger: #EF4444
$text: #F4F4F5
$text-muted: #71717A
$border: #27272A`,

  // Spacing
  spacing: `$space-xs: 4
$space-sm: 8
$space-md: 16
$space-lg: 24
$space-xl: 32`,

  // Radius
  radius: `$radius-sm: 4
$radius-md: 8
$radius-lg: 12`,

  // Complete design system
  full: `$bg-app: #0A0A0F
$bg-sidebar: #0F0F14
$bg-card: #1A1A23
$bg-hover: #252530
$primary: #3B82F6
$success: #10B981
$warning: #F59E0B
$danger: #EF4444
$text: #F4F4F5
$text-muted: #71717A
$border: #27272A
$space-xs: 4
$space-sm: 8
$space-md: 16
$space-lg: 24
$space-xl: 32
$radius-sm: 4
$radius-md: 8
$radius-lg: 12`,
}

// =============================================================================
// TOKEN PARSING EXAMPLES
// =============================================================================

export const TOKEN_EXAMPLES = {
  // Simple token usage
  simple: `$primary: #3B82F6

Button col $primary "Click"`,

  // Multiple tokens
  multiple: `$primary: #3B82F6
$spacing: 16
$radius: 8

Button pad $spacing col $primary rad $radius "Click"`,

  // Directional tokens
  directional: `$default-pad: l-r 4

Box pad $default-pad`,

  // Multi-directional tokens
  multiDirectional: `$card-pad: l-r 8 u-d 4

Card pad $card-pad`,

  // Nested token references
  nested: `$base: 8
$lg-pad: l-r $base

Box pad $lg-pad`,

  // Token referencing another token
  reference: `$base: 16
$size: $base

Box w $size`,

  // Complex design system
  complex: `$primary: #3B82F6
$spacing-sm: 4
$spacing-md: 8
$card-pad: l-r $spacing-md u-d $spacing-sm

Card pad $card-pad col $primary`,
}

// =============================================================================
// EXPECTED TOKEN VALUES
// =============================================================================

export const EXPECTED_TOKENS = {
  colors: {
    'bg-app': '#0A0A0F',
    'bg-sidebar': '#0F0F14',
    'bg-card': '#1A1A23',
    'bg-hover': '#252530',
    'primary': '#3B82F6',
    'success': '#10B981',
    'warning': '#F59E0B',
    'danger': '#EF4444',
    'text': '#F4F4F5',
    'text-muted': '#71717A',
    'border': '#27272A',
  },
  spacing: {
    'space-xs': 4,
    'space-sm': 8,
    'space-md': 16,
    'space-lg': 24,
    'space-xl': 32,
  },
  radius: {
    'radius-sm': 4,
    'radius-md': 8,
    'radius-lg': 12,
  },
}
