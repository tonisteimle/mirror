/**
 * Icon SVGs for Property Panel Components
 *
 * All icons are 14x14 with stroke-width 1.5
 */

export const ICONS = {
  // Layout icons
  horizontal: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="1" y="4" width="4" height="6" rx="0.5"/>
    <rect x="6" y="4" width="4" height="6" rx="0.5"/>
    <line x1="12" y1="4" x2="12" y2="10"/>
  </svg>`,

  vertical: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="4" y="1" width="6" height="4" rx="0.5"/>
    <rect x="4" y="6" width="6" height="4" rx="0.5"/>
    <line x1="4" y1="12" x2="10" y2="12"/>
  </svg>`,

  wrap: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="1" y="1" width="3" height="3" rx="0.5"/>
    <rect x="5.5" y="1" width="3" height="3" rx="0.5"/>
    <rect x="10" y="1" width="3" height="3" rx="0.5"/>
    <rect x="1" y="5.5" width="3" height="3" rx="0.5"/>
    <rect x="5.5" y="5.5" width="3" height="3" rx="0.5"/>
  </svg>`,

  stacked: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="2" y="2" width="10" height="10" rx="1"/>
    <rect x="3" y="3" width="8" height="8" rx="0.5"/>
    <rect x="4" y="4" width="6" height="6" rx="0.5"/>
  </svg>`,

  grid: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="1" y="1" width="5" height="5" rx="0.5"/>
    <rect x="8" y="1" width="5" height="5" rx="0.5"/>
    <rect x="1" y="8" width="5" height="5" rx="0.5"/>
    <rect x="8" y="8" width="5" height="5" rx="0.5"/>
  </svg>`,

  // Alignment icons
  alignLeft: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <line x1="2" y1="2" x2="2" y2="12"/>
    <rect x="4" y="3" width="8" height="3" rx="0.5"/>
    <rect x="4" y="8" width="5" height="3" rx="0.5"/>
  </svg>`,

  alignCenter: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <line x1="7" y1="2" x2="7" y2="12"/>
    <rect x="2" y="3" width="10" height="3" rx="0.5"/>
    <rect x="3.5" y="8" width="7" height="3" rx="0.5"/>
  </svg>`,

  alignRight: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <line x1="12" y1="2" x2="12" y2="12"/>
    <rect x="2" y="3" width="8" height="3" rx="0.5"/>
    <rect x="5" y="8" width="5" height="3" rx="0.5"/>
  </svg>`,

  alignTop: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <line x1="2" y1="2" x2="12" y2="2"/>
    <rect x="3" y="4" width="3" height="8" rx="0.5"/>
    <rect x="8" y="4" width="3" height="5" rx="0.5"/>
  </svg>`,

  alignMiddle: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <line x1="2" y1="7" x2="12" y2="7"/>
    <rect x="3" y="2" width="3" height="10" rx="0.5"/>
    <rect x="8" y="3.5" width="3" height="7" rx="0.5"/>
  </svg>`,

  alignBottom: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <line x1="2" y1="12" x2="12" y2="12"/>
    <rect x="3" y="2" width="3" height="8" rx="0.5"/>
    <rect x="8" y="5" width="3" height="5" rx="0.5"/>
  </svg>`,

  spread: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="1" y="4" width="3" height="6" rx="0.5"/>
    <rect x="5.5" y="4" width="3" height="6" rx="0.5"/>
    <rect x="10" y="4" width="3" height="6" rx="0.5"/>
    <line x1="2.5" y1="2" x2="11.5" y2="2"/>
    <line x1="1" y1="2" x2="1" y2="3"/>
    <line x1="13" y1="2" x2="13" y2="3"/>
  </svg>`,

  // Size icons
  sizeHug: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M4 7H1M10 7H13M7 4V1M7 10V13"/>
    <rect x="4" y="4" width="6" height="6" rx="1"/>
  </svg>`,

  sizeFull: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="1" y="1" width="12" height="12" rx="1"/>
    <path d="M4 4L1 1M10 4L13 1M4 10L1 13M10 10L13 13"/>
  </svg>`,

  sizeFixed: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="3" y="3" width="8" height="8" rx="1"/>
  </svg>`,

  // UI icons
  chevronDown: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 5L7 9L11 5"/>
  </svg>`,

  chevronUp: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9L7 5L11 9"/>
  </svg>`,

  chevronRight: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 3L9 7L5 11"/>
  </svg>`,

  plus: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M7 2V12M2 7H12"/>
  </svg>`,

  minus: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M2 7H12"/>
  </svg>`,

  close: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M3 3L11 11M11 3L3 11"/>
  </svg>`,

  colorPicker: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 4L6 8L4 10L3 11L2 12L2 11L3 10L4 8L8 4L10 4Z"/>
    <circle cx="10.5" cy="3.5" r="1.5"/>
  </svg>`,

  link: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M7 4V10"/>
    <circle cx="7" cy="3" r="1"/>
    <circle cx="7" cy="11" r="1"/>
  </svg>`,

  unlink: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <circle cx="7" cy="3" r="1"/>
    <circle cx="7" cy="11" r="1"/>
  </svg>`,

  // Category icons for sections
  layout: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="1" y="1" width="5" height="12" rx="1"/>
    <rect x="8" y="1" width="5" height="5" rx="1"/>
    <rect x="8" y="8" width="5" height="5" rx="1"/>
  </svg>`,

  size: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="2" y="2" width="10" height="10" rx="1"/>
    <path d="M5 7H9M7 5V9"/>
  </svg>`,

  spacing: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="4" y="4" width="6" height="6" rx="0.5"/>
    <path d="M1 4V10M13 4V10M4 1H10M4 13H10"/>
  </svg>`,

  color: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <circle cx="7" cy="7" r="5"/>
    <circle cx="7" cy="7" r="2"/>
  </svg>`,

  typography: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M2 4H12M7 4V12M4 12H10"/>
  </svg>`,

  border: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="2" y="2" width="10" height="10" rx="2"/>
  </svg>`,

  effects: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <circle cx="7" cy="7" r="3"/>
    <path d="M7 1V3M7 11V13M1 7H3M11 7H13M3 3L4.5 4.5M9.5 9.5L11 11M11 3L9.5 4.5M4.5 9.5L3 11"/>
  </svg>`,

  position: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M7 2V12M2 7H12"/>
    <circle cx="7" cy="7" r="2"/>
  </svg>`,
} as const

export type IconName = keyof typeof ICONS

/**
 * Get icon SVG by name
 */
export function getIcon(name: IconName): string {
  return ICONS[name] || ''
}

/**
 * Create icon element
 */
export function createIconElement(name: IconName, className?: string): HTMLElement {
  const span = document.createElement('span')
  span.className = className ? `pp-icon ${className}` : 'pp-icon'
  span.innerHTML = ICONS[name] || ''
  return span
}
