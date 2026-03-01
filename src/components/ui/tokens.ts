/**
 * UI Design Tokens for Panel Components
 *
 * Consolidated from duplicated COLORS constants across:
 * - InlineLayoutPanel
 * - InlineBorderPanel
 * - InlineTypographyPanel
 * - InlineIconPanel
 */

/**
 * Panel color palette - canonical values for all inline panel components
 */
export const PANEL_COLORS = {
  // Backgrounds
  bg: '#1a1a1a',
  buttonBg: '#181818',
  buttonBgSelected: '#252525',
  buttonBgHover: '#2a2a2a',

  // Text
  text: '#555',
  textLight: '#ccc',
  label: '#666',

  // Borders
  border: '#333',

  // Icons (for border/radius pickers)
  iconDark: '#333',
  iconLight: '#666',
  iconActive: '#ccc',
} as const

/**
 * Standard sizes for panel UI elements
 */
export const PANEL_SIZES = {
  // Heights
  buttonHeight: 24,
  buttonHeightSmall: 22,
  inputHeight: 24,

  // Font sizes
  fontSize: 11,
  fontSizeSmall: 10,

  // Border radius
  borderRadius: 4,
  borderRadiusSmall: 3,

  // Icon button dimensions
  iconButtonSize: 24,
} as const

// Type exports for TypeScript consumers
export type PanelColors = typeof PANEL_COLORS
export type PanelSizes = typeof PANEL_SIZES
