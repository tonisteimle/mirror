/**
 * Stage 3: Constraints (Deterministic)
 *
 * Applies deterministic fixes and constraints to the JSON:
 * - Horizontal layout: children need width or grow
 * - Token suffix normalization
 * - Property name normalization
 * - CSS unit stripping
 *
 * This stage is completely deterministic - no LLM calls.
 */

import type { PropertiesJSON, FullComponent, MirrorProperty } from './types'
import { PROPERTY_LONG_FORMS } from '../../dsl/properties'

// =============================================================================
// Main Constraint Application
// =============================================================================

/**
 * Apply all deterministic constraints to the JSON.
 * Returns a new JSON object with all fixes applied.
 */
export function applyConstraints(json: PropertiesJSON): PropertiesJSON {
  // Deep clone to avoid mutating original
  const result: PropertiesJSON = JSON.parse(JSON.stringify(json))

  // Apply constraints to each component
  result.components = result.components.map(comp => applyComponentConstraints(comp))

  // Normalize tokens
  if (result.tokens) {
    result.tokens = normalizeTokenValues(result.tokens)
  }

  // Auto-define missing tokens with sensible defaults
  result.tokens = autoDefineTokens(result)

  return result
}

// =============================================================================
// Component Constraints
// =============================================================================

function applyComponentConstraints(comp: FullComponent): FullComponent {
  const result = { ...comp }

  // Normalize properties (filter out nulls from invalid properties)
  if (result.properties) {
    result.properties = result.properties
      .map(normalizeProperty)
      .filter((p): p is MirrorProperty => p !== null)
  }

  // Apply horizontal layout constraint
  if (isHorizontalLayout(result) && result.children) {
    result.children = result.children.map(child => ensureWidthOrGrow(child))
  }

  // Normalize state properties (filter out nulls)
  if (result.states) {
    result.states = result.states.map(state => ({
      ...state,
      properties: state.properties
        .map(normalizeProperty)
        .filter((p): p is MirrorProperty => p !== null),
    }))
  }

  // Normalize event actions
  if (result.events) {
    result.events = result.events.map(event => ({
      ...event,
      actions: event.actions.map(fixActionSyntax),
    }))
  }

  // Recursively apply to children
  if (result.children) {
    result.children = result.children.map(applyComponentConstraints)
  }

  return result
}

// =============================================================================
// Horizontal Layout Constraint
// =============================================================================

/**
 * Check if a component has horizontal layout
 */
function isHorizontalLayout(comp: FullComponent): boolean {
  if (!comp.properties) return false

  return comp.properties.some(
    prop => prop.name === 'horizontal' || prop.name === 'hor'
  )
}

/**
 * Ensure a child in horizontal layout has width or grow
 */
function ensureWidthOrGrow(child: FullComponent): FullComponent {
  // Icons should not get grow - they have fixed size
  // Same for Image components
  const fixedSizeComponents = ['Icon', 'Image']
  if (fixedSizeComponents.includes(child.type)) {
    return child
  }

  // Check if child already has width, grow, or flex-related properties
  const hasWidthOrGrow = child.properties?.some(
    prop =>
      prop.name === 'width' ||
      prop.name === 'w' ||
      prop.name === 'grow' ||
      prop.name === 'full' ||
      prop.name === 'fill' ||
      prop.name === 'icon-size' ||
      prop.name === 'is' ||
      prop.name === 'flex' ||       // LLM might add these
      prop.name === 'flex-grow' ||
      prop.name === 'flex-shrink' ||
      prop.name === 'flex-basis'
  )

  if (hasWidthOrGrow) {
    return child
  }

  // Add grow property for flexibility
  return {
    ...child,
    properties: [...(child.properties || []), { name: 'grow', value: true }],
  }
}

// =============================================================================
// Property Normalization
// =============================================================================

/**
 * Normalize a single property
 */
function normalizeProperty(prop: MirrorProperty): MirrorProperty | null {
  const result = { ...prop }

  // Filter out invalid properties that the LLM might generate
  const invalidProperties = ['flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'display', 'transition']
  if (invalidProperties.includes(result.name)) {
    return null // Will be filtered out
  }

  // Normalize property name to long form
  result.name = normalizePropertyName(result.name)

  // Fix invalid property values
  const normalizedValue = normalizePropertyValue(result.name, result.value)

  // If value becomes null, filter out the property
  if (normalizedValue === null) {
    return null
  }
  result.value = normalizedValue

  // Normalize token suffix
  if (result.isToken && typeof result.value === 'string') {
    result.value = normalizeTokenSuffix(result.name, result.value)
  }

  // Strip CSS units from numeric values
  if (typeof result.value === 'string') {
    result.value = stripCssUnits(result.value)
  }

  return result
}

/**
 * Normalize property values - fix common LLM mistakes
 */
function normalizePropertyValue(
  propertyName: string,
  value: string | number | boolean
): string | number | boolean | null {
  // Handle "none" values
  if (value === 'none') {
    // For border, convert to 0
    if (propertyName === 'border') {
      return 0
    }
    // For shadow, this is actually valid
    if (propertyName === 'shadow') {
      return value
    }
    // For most other properties, remove the property
    return null
  }

  // Handle boolean string values
  if (value === 'true') return true
  if (value === 'false') return false

  return value
}

/**
 * Normalize property name to long form
 */
function normalizePropertyName(name: string): string {
  // Check if it's a short form
  if (PROPERTY_LONG_FORMS[name]) {
    return PROPERTY_LONG_FORMS[name]
  }

  // Handle common LLM mistakes
  const corrections: Record<string, string> = {
    'font-weight': 'weight',
    'border-radius': 'radius',
    'font-family': 'font',
    'line-height': 'line',
    'text-color': 'color',
    'bg-color': 'background',
    'bgcolor': 'background',
    'col': 'color',
    'bg': 'background',
    'pad': 'padding',
    'mar': 'margin',
    'rad': 'radius',
    'bor': 'border',
  }

  return corrections[name] || name
}

// =============================================================================
// Token Suffix Normalization
// =============================================================================

/**
 * Remove redundant suffixes from token names
 * e.g., "$md.gap" with property "gap" → "$md"
 */
function normalizeTokenSuffix(propertyName: string, tokenValue: string): string {
  // Remove $ prefix for processing
  const tokenName = tokenValue.replace(/^\$/, '')

  // Property-suffix mappings
  const suffixMappings: Record<string, string[]> = {
    gap: ['.gap'],
    padding: ['.pad', '.padding'],
    margin: ['.mar', '.margin'],
    background: ['.bg', '.background'],
    color: ['.col', '.color'],
    radius: ['.rad', '.radius'],
    border: ['.bor', '.border'],
    'border-color': ['.boc', '.border-color'],
    'icon-size': ['.is', '.icon-size'],
    'font-size': ['.font.size', '.fs'],
    opacity: ['.opa', '.opacity'],
  }

  // Also handle short form property names
  const shortToLong: Record<string, string> = {
    pad: 'padding',
    mar: 'margin',
    bg: 'background',
    col: 'color',
    rad: 'radius',
    bor: 'border',
    boc: 'border-color',
    is: 'icon-size',
    fs: 'font-size',
    opa: 'opacity',
  }

  const normalizedProp = shortToLong[propertyName] || propertyName
  const suffixes = suffixMappings[normalizedProp] || []

  // Remove matching suffix
  for (const suffix of suffixes) {
    if (tokenName.endsWith(suffix)) {
      return tokenName.slice(0, -suffix.length)
    }
  }

  // Handle hover variants: $primary.hover.bg → $primary.hover
  if (propertyName.startsWith('hover-')) {
    const baseProp = propertyName.replace('hover-', '')
    const hoverSuffixes = suffixMappings[baseProp] || []
    for (const suffix of hoverSuffixes) {
      const hoverSuffix = `.hover${suffix}`
      if (tokenName.endsWith(hoverSuffix)) {
        return tokenName.slice(0, -suffix.length)
      }
    }
  }

  return tokenName
}

// =============================================================================
// CSS Unit Stripping
// =============================================================================

/**
 * Strip CSS units from a single value (px, rem, em, vh, vw, %)
 */
function stripSingleCssUnit(value: string): string | number {
  const unitMatch = value.match(/^(\d+(?:\.\d+)?)(px|rem|em|vh|vw|%)$/)
  if (unitMatch) {
    const num = parseFloat(unitMatch[1])
    const unit = unitMatch[2]

    // px -> just the number
    if (unit === 'px') {
      return num
    }

    // % -> full/hug keywords for certain cases
    if (unit === '%' && num === 100) {
      return 'full'
    }

    // vh/vw -> keep as numbers (approximate)
    if (unit === 'vh' || unit === 'vw') {
      return num
    }

    // For other units, just return the number
    return num
  }

  return value
}

/**
 * Strip CSS units from values (px, rem, em, vh, vw, %)
 * Handles both single values ("12px") and multi-value strings ("12px 24px")
 */
function stripCssUnits(value: string): string | number {
  // Handle quoted strings first - remove quotes for processing
  const unquoted = value.replace(/^["']|["']$/g, '')

  // Handle multiple space-separated values (e.g., "12px 24px", "8px 16px 8px 16px")
  if (unquoted.includes(' ')) {
    const parts = unquoted.split(/\s+/)
    const stripped = parts.map(part => {
      const result = stripSingleCssUnit(part)
      return typeof result === 'number' ? String(result) : result
    })
    return stripped.join(' ')
  }

  // Single value - use helper function
  return stripSingleCssUnit(unquoted)
}

// =============================================================================
// Token Value Normalization
// =============================================================================

/**
 * Normalize token values (if any)
 */
function normalizeTokenValues(
  tokens: Record<string, string | number>
): Record<string, string | number> {
  const result: Record<string, string | number> = {}

  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === 'string') {
      // Strip CSS units from token values
      const stripped = stripCssUnits(value)
      result[key] = typeof stripped === 'number' ? stripped : value
    } else {
      result[key] = value
    }
  }

  return result
}

// =============================================================================
// Additional Constraint Functions
// =============================================================================

/**
 * Ensure Text components have color if parent has dark background
 */
export function ensureTextContrast(comp: FullComponent): FullComponent {
  // This is a more advanced constraint - skip for now
  return comp
}

/**
 * Ensure icons have size if not specified
 */
export function ensureIconSize(comp: FullComponent): FullComponent {
  if (comp.type !== 'Icon') return comp

  const hasSize = comp.properties?.some(
    prop => prop.name === 'icon-size' || prop.name === 'is' || prop.name === 'size'
  )

  if (!hasSize) {
    return {
      ...comp,
      properties: [...(comp.properties || []), { name: 'icon-size', value: 20 }],
    }
  }

  return comp
}

/**
 * Fix common action syntax issues
 */
export function fixActionSyntax(action: string): string {
  return action
    // deselect siblings → deselect-siblings
    .replace(/\bdeselect siblings\b/g, 'deselect-siblings')
    .replace(/\bdeactivate siblings\b/g, 'deactivate-siblings')
    .replace(/\bclear selection\b/g, 'clear-selection')
    .replace(/\btoggle state\b/g, 'toggle-state')
    // Capitalize common action targets (menu → Menu, dropdown → Dropdown, etc.)
    .replace(/\b(toggle|open|close|show|hide)\s+(menu|dropdown|modal|dialog|panel|sidebar|drawer|popover|tooltip)\b/gi,
      (_match, verb, target) => `${verb} ${target.charAt(0).toUpperCase()}${target.slice(1)}`)
}

// =============================================================================
// Auto-Define Missing Tokens
// =============================================================================

/**
 * Extract all token references and auto-define missing ones
 */
function autoDefineTokens(json: PropertiesJSON): Record<string, string | number> {
  const existingTokens = json.tokens || {}
  const usedTokens = new Set<string>()

  // Extract all token references from components
  for (const comp of json.components) {
    extractTokensFromComponent(comp, usedTokens)
  }

  // Define missing tokens with sensible defaults
  const result: Record<string, string | number> = { ...existingTokens }

  for (const tokenName of usedTokens) {
    // Skip if already defined
    const normalizedName = tokenName.replace(/^\$/, '')
    if (existingTokens[normalizedName] || existingTokens[`$${normalizedName}`]) {
      continue
    }

    // Get default value
    const defaultValue = getDefaultTokenValue(normalizedName)
    if (defaultValue !== null) {
      result[normalizedName] = defaultValue
    }
  }

  return result
}

/**
 * Recursively extract token references from a component
 */
function extractTokensFromComponent(comp: FullComponent, tokens: Set<string>): void {
  // Extract from properties
  if (comp.properties) {
    for (const prop of comp.properties) {
      if (prop.isToken && typeof prop.value === 'string') {
        tokens.add(prop.value.replace(/^\$/, ''))
      }
    }
  }

  // Extract from states
  if (comp.states) {
    for (const state of comp.states) {
      for (const prop of state.properties) {
        if (prop.isToken && typeof prop.value === 'string') {
          tokens.add(prop.value.replace(/^\$/, ''))
        }
      }
    }
  }

  // Recurse into children
  if (comp.children) {
    for (const child of comp.children) {
      extractTokensFromComponent(child, tokens)
    }
  }
}

/**
 * Get reasonable default values for common semantic token names.
 */
function getDefaultTokenValue(token: string): string | number | null {
  const defaults: Record<string, string | number> = {
    // Backgrounds
    'surface': '#1E1E2E',
    'elevated': '#27272A',
    'background': '#18181B',
    'card': '#27272A',
    'card-bg': '#27272A',
    'sidebar-bg': '#1E1E2E',
    'input-bg': '#27272A',
    'hover-bg': '#3F3F46',
    'nav-hover': '#3F3F46',
    'nav-selected': '#3B82F6',
    'item-hover': '#3F3F46',
    'item-active': '#3B82F6',
    // Text colors
    'text': '#E4E4E7',
    'muted': '#71717A',
    'heading': '#FAFAFA',
    'on-primary': '#FFFFFF',
    'on-surface': '#E4E4E7',
    // Status colors
    'danger': '#EF4444',
    'success': '#22C55E',
    'warning': '#F59E0B',
    'error': '#EF4444',
    // Borders
    'border': '#3F3F46',
    'input-border': '#3F3F46',
    'border-focus': '#60A5FA',
    'input-focus': '#60A5FA',
    // Primary
    'primary': '#3B82F6',
    'primary-hover': '#2563EB',
    'accent': '#3B82F6',
    'accent-hover': '#2563EB',
    // Selected/Active
    'selected': '#3B82F6',
    'active': '#3B82F6',
    'hover': '#3F3F46',
    // Spacing (numeric defaults)
    'spacing-sm': 8,
    'spacing-md': 12,
    'spacing-lg': 16,
    'spacing-xl': 24,
    'sm': 8,
    'md': 12,
    'lg': 16,
    'xl': 24,
    // Radius
    'radius-sm': 4,
    'radius-md': 8,
    'radius-lg': 12,
    // Icon
    'icon-size': 20,
    'icon-color': '#E4E4E7',
  }

  // Try exact match first
  if (defaults[token] !== undefined) return defaults[token]

  // Try partial match (e.g., "surface.bg" -> surface)
  const base = token.split('.')[0]
  if (defaults[base] !== undefined) return defaults[base]

  // Try suffix match (e.g., "nav-item-hover" -> hover-bg)
  const suffixes = ['hover', 'active', 'selected', 'focus', 'bg', 'color', 'border']
  for (const suffix of suffixes) {
    if (token.endsWith(suffix) || token.endsWith(`-${suffix}`)) {
      const suffixDefaults: Record<string, string> = {
        'hover': '#3F3F46',
        'active': '#3B82F6',
        'selected': '#3B82F6',
        'focus': '#60A5FA',
        'bg': '#27272A',
        'color': '#E4E4E7',
        'border': '#3F3F46',
      }
      return suffixDefaults[suffix] || null
    }
  }

  return null
}
