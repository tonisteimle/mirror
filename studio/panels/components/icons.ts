/**
 * Component Panel Icons - SVG icons for component items
 */

import type { ComponentIcon } from './types'

/**
 * SVG icons for layout presets and components
 * Each icon is a 16x16 SVG string
 */
export const COMPONENT_ICONS: Record<ComponentIcon, string> = {
  // Layout icons
  vertical: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="2" width="10" height="3" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="3" y="6.5" width="10" height="3" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="3" y="11" width="10" height="3" rx="1" fill="currentColor" opacity="0.6"/>
  </svg>`,

  horizontal: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="4" height="8" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="6" y="4" width="4" height="8" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="11" y="4" width="4" height="8" rx="1" fill="currentColor" opacity="0.6"/>
  </svg>`,

  grid: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
  </svg>`,

  stack: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
    <rect x="4" y="1" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.4"/>
    <rect x="4" y="13" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.4"/>
  </svg>`,

  // Component icons
  text: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4V3H13V4H8.5V13H7.5V4H3Z" fill="currentColor" opacity="0.7"/>
  </svg>`,

  button: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="14" height="8" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
    <rect x="4" y="7" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
  </svg>`,

  input: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="14" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
    <line x1="3" y1="7" x2="3" y2="9" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  </svg>`,

  image: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="14" height="12" rx="1" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
    <circle cx="5" cy="6" r="1.5" fill="currentColor" opacity="0.5"/>
    <path d="M1 11L5 8L8 10L11 7L15 11" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  </svg>`,

  icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
    <path d="M8 5V11M5 8H11" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  </svg>`,

  box: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
  </svg>`,

  card: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
    <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" stroke-width="1" opacity="0.4"/>
  </svg>`,

  list: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="3" cy="4" r="1" fill="currentColor" opacity="0.6"/>
    <circle cx="3" cy="8" r="1" fill="currentColor" opacity="0.6"/>
    <circle cx="3" cy="12" r="1" fill="currentColor" opacity="0.6"/>
    <rect x="6" y="3" width="9" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
    <rect x="6" y="7" width="9" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
    <rect x="6" y="11" width="9" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
  </svg>`,

  custom: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" fill="none" opacity="0.6"/>
    <path d="M8 5V11M5 8H11" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
  </svg>`,
}

/**
 * Get the SVG icon for a component type
 */
export function getComponentIcon(type: ComponentIcon): string {
  return COMPONENT_ICONS[type] || COMPONENT_ICONS.custom
}
