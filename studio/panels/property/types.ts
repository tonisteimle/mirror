/**
 * Property Panel Types
 *
 * Shared interfaces and types for the modular property panel architecture.
 */

import type { ExtractedProperty, PropertyCategory, ExtractedInteraction, ExtractedEvent, ExtractedAction } from '../../../compiler/studio/property-extractor'

// Re-export types from property-extractor for convenience
export type { ExtractedProperty, PropertyCategory, ExtractedInteraction, ExtractedEvent, ExtractedAction }

/**
 * Token information extracted from source
 */
export interface SpacingToken {
  name: string      // e.g., "sm", "md", "lg"
  fullName: string  // e.g., "sm.pad", "md.rad"
  value: string     // e.g., "4", "8"
}

/**
 * Color token information
 */
export interface ColorToken {
  name: string
  value: string
}

/**
 * Data passed to a section for rendering
 */
export interface SectionData {
  /** The property category for this section */
  category?: PropertyCategory
  /** Additional categories (e.g., alignment for layout) */
  relatedCategories?: Map<string, PropertyCategory>
  /** All properties for context */
  allProperties?: ExtractedProperty[]
  /** Current element node ID */
  nodeId?: string
  /** Whether element is in positioned container */
  isInPositionedContainer?: boolean
  /** Available spacing tokens */
  spacingTokens?: SpacingToken[]
  /** Available color tokens */
  colorTokens?: ColorToken[]
  /** Interactions for behavior section */
  interactions?: ExtractedInteraction[]
  /** Events for events section */
  events?: ExtractedEvent[]
  /** Actions for actions section */
  actions?: ExtractedAction[]
}

/**
 * Event handler function type
 */
export type EventHandler = (e: Event, target: HTMLElement) => void

/**
 * Map of selector -> event -> handler
 */
export interface EventHandlerMap {
  [selector: string]: {
    [eventType: string]: EventHandler
  }
}

/**
 * Section rendering result
 */
export interface SectionRenderResult {
  html: string
  handlers: EventHandlerMap
}

/**
 * Property change callback
 */
export type PropertyChangeCallback = (property: string, value: string, source?: 'input' | 'token' | 'toggle') => void

/**
 * Section configuration
 */
export interface SectionConfig {
  /** Section label */
  label: string
  /** Whether section is collapsible */
  collapsible?: boolean
  /** Whether section starts collapsed */
  defaultCollapsed?: boolean
  /** CSS class for the section */
  className?: string
}

/**
 * Validation rule for property inputs
 */
export interface ValidationRule {
  pattern: RegExp
  allowEmpty: boolean
  message: string
}

/**
 * Validation rules by type
 */
export const VALIDATION_RULES: Record<string, ValidationRule> = {
  numeric: {
    pattern: /^(\$[\w.-]+|\d+(\.\d+)?|)$/,
    allowEmpty: true,
    message: 'Nur Zahlen oder $token erlaubt'
  },
  size: {
    pattern: /^(\$[\w.-]+|\d+(\.\d+)?|full|hug|auto|)$/i,
    allowEmpty: true,
    message: 'Nur Zahlen, full, hug oder $token erlaubt'
  },
  color: {
    pattern: /^(\$[\w.-]+|#[0-9A-Fa-f]{3,8}|transparent|)$/,
    allowEmpty: true,
    message: 'Nur #hex oder $token erlaubt'
  },
  opacity: {
    pattern: /^(\$[\w.-]+|\d+(\.\d+)?|)$/,
    allowEmpty: true,
    message: 'Nur 0-1 oder 0-100 erlaubt'
  }
}

/**
 * Map property names to validation types
 */
export const PROPERTY_VALIDATION_TYPE: Record<string, string> = {
  // Numeric
  gap: 'numeric', g: 'numeric',
  x: 'numeric', y: 'numeric', z: 'numeric',
  rotate: 'numeric', rot: 'numeric',
  scale: 'numeric',
  'font-size': 'numeric', fs: 'numeric',
  line: 'numeric',
  blur: 'numeric',
  'backdrop-blur': 'numeric', 'blur-bg': 'numeric',
  // Size
  width: 'numeric', w: 'numeric',
  height: 'numeric', h: 'numeric',
  'min-width': 'numeric', minw: 'numeric',
  'max-width': 'numeric', maxw: 'numeric',
  'min-height': 'numeric', minh: 'numeric',
  'max-height': 'numeric', maxh: 'numeric',
  // Padding/margin
  padding: 'numeric', pad: 'numeric', p: 'numeric',
  margin: 'numeric', m: 'numeric',
  // Border/radius
  radius: 'numeric', rad: 'numeric',
  border: 'numeric', bor: 'numeric',
  // Colors
  background: 'color', bg: 'color',
  color: 'color', col: 'color', c: 'color',
  'border-color': 'color', boc: 'color',
  // Opacity
  opacity: 'opacity', o: 'opacity', opa: 'opacity'
}

/**
 * Layout modes
 */
export const LAYOUT_MODES = ['horizontal', 'vertical', 'grid', 'stacked'] as const
export type LayoutMode = typeof LAYOUT_MODES[number]

/**
 * Alignment positions
 */
export const ALIGN_POSITIONS = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right'
] as const
export type AlignPosition = typeof ALIGN_POSITIONS[number]

/**
 * Size modes
 */
export const SIZE_MODES = ['fixed', 'hug', 'full'] as const
export type SizeMode = typeof SIZE_MODES[number]
