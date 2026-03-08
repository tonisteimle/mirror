/**
 * Property Panel Icons
 *
 * !! DO NOT MODIFY WITHOUT EXPLICIT USER REQUEST !!
 *
 * These icons are carefully designed with a consistent visual language.
 * Any changes must be explicitly requested by the user.
 *
 * Design principles:
 * - ViewBox: 14x14 (rendered at 14x14px)
 * - Small rectangles represent "elements" (children)
 * - Container outline shows parent context where relevant
 * - Consistent rounded corners (rx="0.5")
 * - Uses currentColor for theming
 */

export const PROPERTY_ICON_PATHS: Record<string, string> = {
  // Layout Direction - shows how children are arranged
  horizontal: `
    <rect x="2" y="6" width="2" height="3" rx="0.5" fill="currentColor"/>
    <rect x="6" y="6" width="2" height="3" rx="0.5" fill="currentColor"/>
    <rect x="10" y="6" width="2" height="3" rx="0.5" fill="currentColor"/>
  `,
  vertical: `
    <rect x="6" y="2" width="3" height="2" rx="0.5" fill="currentColor"/>
    <rect x="6" y="6" width="3" height="2" rx="0.5" fill="currentColor"/>
    <rect x="6" y="10" width="3" height="2" rx="0.5" fill="currentColor"/>
  `,

  // Center - elements centered both ways
  center: `
    <rect x="5" y="5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
    <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
  `,

  // Spread - elements pushed to edges
  spread: `
    <rect x="2" y="5" width="2" height="4" rx="0.5" fill="currentColor"/>
    <rect x="10" y="5" width="2" height="4" rx="0.5" fill="currentColor"/>
    <path d="M5 7h4" stroke="currentColor" stroke-width="0.75" stroke-dasharray="1 1"/>
  `,

  // Wrap - elements that wrap to next line
  wrap: `
    <rect x="2" y="3" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="5.5" y="3" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="9" y="3" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="2" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="5.5" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
    <path d="M12 4 L12 7 L3 7" stroke="currentColor" stroke-width="0.75" fill="none" stroke-linecap="round"/>
  `,

  // Stacked - elements on top of each other (z-axis) - LARGER
  stacked: `
    <rect x="1" y="1" width="10" height="6" rx="0.5" fill="currentColor" opacity="0.35"/>
    <rect x="3" y="5" width="10" height="6" rx="0.5" fill="currentColor"/>
  `,

  // Grid - elements in a grid layout
  grid: `
    <rect x="2" y="2" width="3" height="3" rx="0.5" fill="currentColor"/>
    <rect x="8" y="2" width="3" height="3" rx="0.5" fill="currentColor"/>
    <rect x="2" y="8" width="3" height="3" rx="0.5" fill="currentColor"/>
    <rect x="8" y="8" width="3" height="3" rx="0.5" fill="currentColor"/>
  `,

  // Size constraints - min/max indicators
  'min-width': `
    <path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/>
    <path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/>
    <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1"/>
  `,
  'max-width': `
    <path d="M5 7 L2 4.5 L2 9.5 Z" fill="currentColor"/>
    <path d="M9 7 L12 4.5 L12 9.5 Z" fill="currentColor"/>
    <line x1="2" y1="7" x2="5" y2="7" stroke="currentColor" stroke-width="1"/>
    <line x1="9" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1"/>
  `,
  'min-height': `
    <path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/>
    <path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/>
    <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1"/>
  `,
  'max-height': `
    <path d="M7 5 L4.5 2 L9.5 2 Z" fill="currentColor"/>
    <path d="M7 9 L4.5 12 L9.5 12 Z" fill="currentColor"/>
    <line x1="7" y1="2" x2="7" y2="5" stroke="currentColor" stroke-width="1"/>
    <line x1="7" y1="9" x2="7" y2="12" stroke="currentColor" stroke-width="1"/>
  `,

  // Layout section icon - crossed arrows
  'layout': `
    <path d="M7 2 L5 4 L6.25 4 L6.25 6.25 L4 6.25 L4 5 L2 7 L4 9 L4 7.75 L6.25 7.75 L6.25 10 L5 10 L7 12 L9 10 L7.75 10 L7.75 7.75 L10 7.75 L10 9 L12 7 L10 5 L10 6.25 L7.75 6.25 L7.75 4 L9 4 L7 2 Z" fill="currentColor"/>
  `,

  // Padding direction icons - arrows
  // V/H: double-headed arrows (compact view)
  'pad-v': `
    <path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/>
    <path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/>
    <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1.5"/>
  `,
  'pad-h': `
    <path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/>
    <path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/>
    <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5"/>
  `,
  // T/R/B/L: single-headed arrows (expanded view)
  'pad-t': `
    <path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/>
    <line x1="7" y1="5" x2="7" y2="12" stroke="currentColor" stroke-width="1.5"/>
  `,
  'pad-r': `
    <path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/>
    <line x1="2" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5"/>
  `,
  'pad-b': `
    <path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/>
    <line x1="7" y1="2" x2="7" y2="9" stroke="currentColor" stroke-width="1.5"/>
  `,
  'pad-l': `
    <path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/>
    <line x1="5" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5"/>
  `,

  // Border - rectangle icons for compact/expanded views
  'border': `
    <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
  `,
  'border-t': `
    <line x1="2" y1="2" x2="12" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M2 2 L2 12 L12 12 L12 2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'border-r': `
    <line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 2 L2 2 L2 12 L12 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'border-b': `
    <line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M2 12 L2 2 L12 2 L12 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'border-l': `
    <line x1="2" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M2 2 L12 2 L12 12 L2 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,

  // Border styles
  'border-solid': `
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5"/>
  `,
  'border-dashed': `
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/>
  `,
  'border-dotted': `
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1 1.5" stroke-linecap="round"/>
  `,
  'radius': `
    <path d="M2 10 L2 5 Q2 2 5 2 L10 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  `,

  // Typography - Text alignment
  'text-left': `
    <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="11" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  'text-center': `
    <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2.5" y1="11" x2="11.5" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  'text-right': `
    <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="5" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  'text-justify': `
    <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,

  // Typography - Text styles
  'italic': `
    <text x="4" y="11" font-size="10" font-style="italic" font-family="serif" fill="currentColor">I</text>
  `,
  'underline': `
    <text x="4" y="10" font-size="9" font-family="sans-serif" fill="currentColor">U</text>
    <line x1="3" y1="12" x2="11" y2="12" stroke="currentColor" stroke-width="1"/>
  `,
  'truncate': `
    <text x="2" y="9" font-size="8" font-family="sans-serif" fill="currentColor">Ab</text>
    <text x="9" y="9" font-size="8" font-family="sans-serif" fill="currentColor">…</text>
  `,
  'uppercase': `
    <text x="2" y="10" font-size="8" font-weight="bold" font-family="sans-serif" fill="currentColor">AA</text>
  `,
  'lowercase': `
    <text x="2" y="10" font-size="8" font-family="sans-serif" fill="currentColor">aa</text>
  `,

  // Visual - Shadow levels
  'shadow-none': `
    <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
  `,
  'shadow-sm': `
    <rect x="4" y="4" width="7" height="7" rx="0.5" fill="currentColor" opacity="0.2"/>
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
  `,
  'shadow-md': `
    <rect x="5" y="5" width="7" height="7" rx="0.5" fill="currentColor" opacity="0.25"/>
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
  `,
  'shadow-lg': `
    <rect x="5" y="5" width="8" height="8" rx="0.5" fill="currentColor" opacity="0.3"/>
    <rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
  `,

  // Visual - Visibility
  'hidden': `
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  'visible': `
    <ellipse cx="7" cy="7" rx="5" ry="3.5" stroke="currentColor" stroke-width="1" fill="none"/>
    <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
  `,
  'disabled': `
    <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1" fill="none"/>
    <line x1="3.5" y1="10.5" x2="10.5" y2="3.5" stroke="currentColor" stroke-width="1"/>
  `,
}
