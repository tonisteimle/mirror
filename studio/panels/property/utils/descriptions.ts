/**
 * Property Descriptions for Tooltips
 *
 * Provides contextual help for property labels in the Property Panel.
 */

export const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  // Layout
  'hor': 'Horizontal layout - children arranged left to right',
  'ver': 'Vertical layout - children arranged top to bottom',
  'horizontal': 'Horizontal layout - children arranged left to right',
  'vertical': 'Vertical layout - children arranged top to bottom',
  'gap': 'Space between child elements (in pixels)',
  'wrap': 'Allow children to wrap to next line',
  'grid': 'Grid layout with specified number of columns',
  'stacked': 'Stack children on top of each other',

  // Alignment
  'center': 'Center content on both axes',
  'spread': 'Distribute children with space between',
  'hor-center': 'Center content horizontally',
  'ver-center': 'Center content vertically',
  'tl': 'Align to top-left corner',
  'tc': 'Align to top-center',
  'tr': 'Align to top-right corner',
  'cl': 'Align to center-left',
  'cr': 'Align to center-right',
  'bl': 'Align to bottom-left corner',
  'bc': 'Align to bottom-center',
  'br': 'Align to bottom-right corner',

  // Sizing
  'w': 'Width - number (px), "full", or "hug"',
  'h': 'Height - number (px), "full", or "hug"',
  'width': 'Width - number (px), "full", or "hug"',
  'height': 'Height - number (px), "full", or "hug"',
  'minw': 'Minimum width in pixels',
  'maxw': 'Maximum width in pixels',
  'minh': 'Minimum height in pixels',
  'maxh': 'Maximum height in pixels',
  'aspect': 'Aspect ratio - "square", "video", or number',

  // Spacing
  'pad': 'Padding - inner space (1-4 values)',
  'padding': 'Padding - inner space (1-4 values)',
  'margin': 'Margin - outer space (1-4 values)',
  'm': 'Margin - outer space (1-4 values)',

  // Colors
  'bg': 'Background color - hex (#fff) or token ($primary)',
  'background': 'Background color - hex (#fff) or token ($primary)',
  'col': 'Text color - hex or token',
  'color': 'Text color - hex or token',

  // Border
  'bor': 'Border width in pixels',
  'border': 'Border width in pixels',
  'boc': 'Border color - hex or token',
  'rad': 'Border radius - corner rounding in pixels',
  'radius': 'Border radius - corner rounding in pixels',

  // Typography
  'fs': 'Font size in pixels',
  'font-size': 'Font size in pixels',
  'weight': 'Font weight - thin to black, or number',
  'font': 'Font family - sans, serif, or mono',
  'line': 'Line height - multiplier or pixels',
  'italic': 'Italic text style',
  'underline': 'Underlined text',
  'uppercase': 'Transform text to uppercase',
  'lowercase': 'Transform text to lowercase',
  'truncate': 'Truncate text with ellipsis',
  'text-align': 'Text alignment - left, center, right, justify',

  // Visual
  'opacity': 'Transparency - 0 (invisible) to 1 (opaque)',
  'shadow': 'Box shadow - sm, md, or lg',
  'blur': 'Blur effect on element content',
  'blur-bg': 'Backdrop blur for glass effects',
  'cursor': 'Mouse cursor style',
  'hidden': 'Hide the element',
  'visible': 'Show the element',
  'clip': 'Clip content that overflows',
  'scroll': 'Enable vertical scrolling',
  'scroll-hor': 'Enable horizontal scrolling',

  // Position
  'x': 'Horizontal offset in pixels',
  'y': 'Vertical offset in pixels',
  'z': 'Stack order (z-index)',
  'absolute': 'Position element absolutely',
  'fixed': 'Position element fixed to viewport',
  'relative': 'Position element relative to normal flow',

  // Transform
  'rotate': 'Rotation in degrees',
  'scale': 'Scale factor (1 = 100%)',
  'translate': 'Move element by pixels',

  // Icon
  'is': 'Icon size in pixels',
  'ic': 'Icon color - hex or token',
  'iw': 'Icon stroke weight',
  'fill': 'Fill icon instead of stroke',

  // Interactions
  'toggle': 'Toggle between states on click',
  'exclusive': 'Only one sibling can be active',
  'select': 'Select behavior'
}

/**
 * Get description for a property
 */
export function getPropertyDescription(propName: string): string | undefined {
  return PROPERTY_DESCRIPTIONS[propName.toLowerCase()]
}

/**
 * Format property name with description as title attribute
 */
export function formatLabelWithTooltip(propName: string, displayName: string): string {
  const description = getPropertyDescription(propName)
  if (description) {
    return `<span title="${description}">${displayName}</span>`
  }
  return displayName
}
