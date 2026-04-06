/**
 * HTML utilities for Property Panel
 */

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * Display labels for properties
 */
const DISPLAY_LABELS: Record<string, string> = {
  // Layout
  horizontal: 'Horizontal',
  hor: 'Horizontal',
  vertical: 'Vertical',
  ver: 'Vertical',
  center: 'Center',
  cen: 'Center',
  gap: 'Gap',
  g: 'Gap',
  spread: 'Spread',
  wrap: 'Wrap',
  stacked: 'Stacked',
  grid: 'Grid',

  // Alignment
  left: 'Left',
  right: 'Right',
  'hor-center': 'H-Center',
  top: 'Top',
  bottom: 'Bottom',
  'ver-center': 'V-Center',

  // Size
  width: 'Width',
  w: 'Width',
  height: 'Height',
  h: 'Height',
  size: 'Size',
  'min-width': 'Min W',
  minw: 'Min W',
  'max-width': 'Max W',
  maxw: 'Max W',
  'min-height': 'Min H',
  minh: 'Min H',
  'max-height': 'Max H',
  maxh: 'Max H',

  // Spacing
  padding: 'Padding',
  pad: 'Padding',
  p: 'Padding',
  margin: 'Margin',
  m: 'Margin',

  // Colors
  color: 'Color',
  col: 'Color',
  c: 'Color',
  background: 'Background',
  bg: 'Background',
  'border-color': 'Border Color',
  boc: 'Border Color',

  // Border
  border: 'Border',
  bor: 'Border',
  radius: 'Radius',
  rad: 'Radius',

  // Typography
  'font-size': 'Font Size',
  fs: 'Font Size',
  weight: 'Weight',
  line: 'Line Height',
  font: 'Font',
  'text-align': 'Text Align',
  italic: 'Italic',
  underline: 'Underline',
  truncate: 'Truncate',
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',

  // Icon
  'icon-size': 'Icon Size',
  is: 'Icon Size',
  'icon-weight': 'Icon Weight',
  iw: 'Icon Weight',
  'icon-color': 'Icon Color',
  ic: 'Icon Color',
  fill: 'Fill',

  // Visual
  opacity: 'Opacity',
  o: 'Opacity',
  shadow: 'Shadow',
  cursor: 'Cursor',
  z: 'Z-Index',
  hidden: 'Hidden',
  visible: 'Visible',
  disabled: 'Disabled',
  rotate: 'Rotate',
  rot: 'Rotate',
  translate: 'Translate',

  // Scroll
  scroll: 'Scroll',
  'scroll-ver': 'Scroll Y',
  'scroll-hor': 'Scroll X',
  'scroll-both': 'Scroll Both',
  clip: 'Clip',

  // Hover
  'hover-background': 'Hover BG',
  'hover-bg': 'Hover BG',
  'hover-color': 'Hover Color',
  'hover-col': 'Hover Color',
  'hover-opacity': 'Hover Opacity',
  'hover-opa': 'Hover Opacity',
  'hover-scale': 'Hover Scale',
  'hover-border': 'Hover Border',
  'hover-bor': 'Hover Border',
  'hover-border-color': 'Hover Border Color',
  'hover-boc': 'Hover Border Color',
  'hover-radius': 'Hover Radius',
  'hover-rad': 'Hover Radius',

  // Content
  content: 'Content',
  placeholder: 'Placeholder',
  src: 'Source',
  href: 'Link',
  value: 'Value',
}

/**
 * Get display label for property
 */
export function getDisplayLabel(name: string): string {
  return DISPLAY_LABELS[name] || name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
}

/**
 * Get select options for a property
 */
export function getSelectOptions(name: string): string[] {
  const options: Record<string, string[]> = {
    cursor: ['default', 'pointer', 'text', 'move', 'not-allowed', 'grab', 'grabbing'],
    shadow: ['none', 'sm', 'md', 'lg'],
    'text-align': ['left', 'center', 'right', 'justify'],
  }
  return options[name] || []
}
