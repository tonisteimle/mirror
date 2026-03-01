/**
 * @module parser/preprocessor/sugar-expander
 * @description Expands implicit/sugar syntax to explicit properties
 *
 * Handles:
 * - Dimension sugar: Box 300 400 → Box width 300, height 400
 * - Color sugar: Box #333 → Box background #333
 * - String sugar: Image "url" → Image src "url"
 * - Token suffix: $card-bg → background $card-bg
 */

import type { Token } from './tokenizer'

// =============================================================================
// COMPONENT TYPE MAPPINGS
// =============================================================================

/** Components where first string becomes 'src' */
const SRC_COMPONENTS = new Set(['Image', 'Img', 'Video', 'Audio'])

/** Components where first string becomes 'placeholder' */
const PLACEHOLDER_COMPONENTS = new Set(['Input', 'Textarea', 'TextInput', 'Search'])

/** Components where first string becomes 'href' */
// Note: Link is NOT included - Link strings become text content (like Button)
// href must be set explicitly: Link href "/url" "Click me"
const HREF_COMPONENTS = new Set(['A', 'Anchor'])

/** Components where first string becomes 'icon' (icon name) */
const ICON_COMPONENTS = new Set(['Icon'])

/** Components where bare color becomes 'color' (text color) instead of 'background' */
const TEXT_COMPONENTS = new Set(['Text', 'Label', 'Title', 'Heading', 'Paragraph', 'P', 'H1', 'H2', 'H3', 'H4', 'Span'])

// =============================================================================
// TOKEN SUFFIX MAPPINGS
// =============================================================================

/**
 * Infer property from token suffix
 * $primary-bg → bg
 * $card-padding → pad
 * $primary-color → bg (NOT col!)
 *
 * These mappings are based on the most common usage patterns:
 * - -color suffix typically means background color (not text color)
 * - -size suffix typically means text/font size
 * - -border suffix typically means border width
 *
 * NOTE: Uses SHORT FORMS to match how the parser stores properties.
 */
const TOKEN_SUFFIX_MAP: Record<string, string> = {
  // Background (most common for color-related tokens)
  'bg': 'bg',
  'background': 'bg',
  'color': 'bg', // -color suffix → bg (common pattern: $primary-color)

  // Text color (explicit col suffix only)
  'col': 'col',

  // Border
  'boc': 'boc',
  'border-color': 'boc',
  'border': 'bor', // -border suffix → border width

  // Spacing
  'pad': 'pad',
  'padding': 'pad',
  'spacing': 'pad', // -spacing suffix → padding
  'mar': 'mar',
  'margin': 'mar',
  'gap': 'gap',

  // Sizing
  'rad': 'rad',
  'radius': 'rad',
  'size': 'fs', // -size suffix → fs (font-size)
  'font-size': 'fs',
  'text-size': 'fs',
  'width': 'width',
  'height': 'height',

  // Typography
  'weight': 'weight',
  'font': 'font',
  'line': 'line',
}

// =============================================================================
// MAIN EXPANDER
// =============================================================================

/**
 * Expand implicit properties to explicit form
 */
export function expandImplicitProperties(tokens: Token[]): Token[] {
  const result: Token[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    // Handle component with potential sugar
    if (token.type === 'COMPONENT' || token.type === 'COMPONENT_DEF') {
      result.push(token)
      i++

      const componentName = token.type === 'COMPONENT_DEF'
        ? token.value.slice(0, -1)
        : token.value

      // Process tokens after component until newline/comma/property
      const expanded = expandComponentSugar(tokens, i, componentName)
      result.push(...expanded.tokens)
      i = expanded.nextIndex
      continue
    }

    // Handle standalone token reference with suffix
    // Only expand suffix if not after a property (e.g., bg $hover-color → don't expand)
    if (token.type === 'TOKEN_REF' && !isAfterProperty(result)) {
      const expanded = expandTokenSuffix(token)
      result.push(...expanded)
      i++
      continue
    }

    result.push(token)
    i++
  }

  return result
}

/**
 * Expand sugar after a component
 */
function expandComponentSugar(
  tokens: Token[],
  startIndex: number,
  componentName: string
): { tokens: Token[]; nextIndex: number } {
  const result: Token[] = []
  let i = startIndex
  let dimensionCount = 0
  let hasExplicitWidth = false
  let hasExplicitHeight = false
  let hasExplicitBackground = false
  let hasExplicitContent = false

  // First pass: check what's explicit
  let checkIdx = startIndex
  while (checkIdx < tokens.length &&
         tokens[checkIdx].type !== 'NEWLINE' &&
         tokens[checkIdx].type !== 'COMPONENT' &&
         tokens[checkIdx].type !== 'COMPONENT_DEF') {
    const t = tokens[checkIdx]
    if (t.type === 'PROPERTY') {
      const prop = t.value.toLowerCase()
      if (prop === 'width' || prop === 'w') hasExplicitWidth = true
      if (prop === 'height' || prop === 'h') hasExplicitHeight = true
      if (prop === 'background' || prop === 'bg') hasExplicitBackground = true
      if (prop === 'src' || prop === 'placeholder' || prop === 'href') hasExplicitContent = true
    }
    checkIdx++
  }

  // Process tokens
  while (i < tokens.length) {
    const token = tokens[i]

    // Stop at newline, new component, or indent change
    if (token.type === 'NEWLINE' || token.type === 'COMPONENT' || token.type === 'COMPONENT_DEF') {
      break
    }

    // Skip commas
    if (token.type === 'COMMA') {
      result.push(token)
      i++
      continue
    }

    // Handle standalone numbers (dimension sugar)
    if (token.type === 'NUMBER' && !isAfterProperty(result)) {
      dimensionCount++

      if (dimensionCount === 1 && !hasExplicitWidth) {
        // First number → width
        result.push(createPropertyToken('width', token))
        result.push(token)
      } else if (dimensionCount === 2 && !hasExplicitHeight) {
        // Second number → height
        result.push(createPropertyToken('height', token))
        result.push(token)
      } else {
        // More than 2 numbers, just pass through
        result.push(token)
      }
      i++
      continue
    }

    // Handle standalone color (color sugar)
    // But NOT if we're within a color-accepting property like border
    if (token.type === 'COLOR' && !isAfterProperty(result) && !hasExplicitBackground && !isWithinColorAcceptingProperty(result)) {
      // Determine property based on component type
      // Text components: color → col (text color)
      // Other components: color → background
      const colorProperty = getColorProperty(componentName)
      result.push(createPropertyToken(colorProperty, token))
      result.push(token)
      i++
      continue
    }

    // Handle standalone string (content sugar)
    if (token.type === 'STRING' && !isAfterProperty(result) && !hasExplicitContent) {
      const property = getStringProperty(componentName)
      if (property) {
        result.push(createPropertyToken(property, token))
      }
      result.push(token)
      i++
      continue
    }

    // Handle token reference with suffix
    if (token.type === 'TOKEN_REF' && !isAfterProperty(result)) {
      const expanded = expandTokenSuffix(token)
      result.push(...expanded)
      i++
      continue
    }

    // Pass through other tokens
    result.push(token)
    i++
  }

  return { tokens: result, nextIndex: i }
}

/**
 * Expand a token reference based on its suffix or prefix
 * $primary-bg → PROPERTY(background) + TOKEN_REF($primary-bg)
 * $bg-color → PROPERTY(background) + TOKEN_REF($bg-color) (prefix takes priority)
 */
function expandTokenSuffix(token: Token): Token[] {
  const name = token.value.slice(1) // Remove $

  // Check for PREFIX pattern first (takes priority)
  // This handles cases like $bg-color where prefix (bg) indicates the property
  for (const [prefix, property] of Object.entries(TOKEN_SUFFIX_MAP)) {
    if (name.startsWith(prefix + '-') || name.startsWith(prefix + '.')) {
      return [
        createPropertyToken(property, token),
        token,
      ]
    }
  }

  // Check for SUFFIX pattern
  for (const [suffix, property] of Object.entries(TOKEN_SUFFIX_MAP)) {
    if (name.endsWith('-' + suffix) || name.endsWith('.' + suffix)) {
      return [
        createPropertyToken(property, token),
        token,
      ]
    }
  }

  // No recognized pattern, return as-is
  return [token]
}

/**
 * Get the property name for a string value based on component type
 */
function getStringProperty(componentName: string): string | null {
  if (SRC_COMPONENTS.has(componentName)) {
    return 'src'
  }
  if (PLACEHOLDER_COMPONENTS.has(componentName)) {
    return 'placeholder'
  }
  if (HREF_COMPONENTS.has(componentName)) {
    return 'href'
  }
  if (ICON_COMPONENTS.has(componentName)) {
    return null // Icon names don't need a property prefix
  }
  // Default: strings are content, no property needed
  return null
}

/**
 * Get the property name for a bare color value based on component type
 * Text components: color → col (text color)
 * Other components: color → bg (background)
 *
 * NOTE: Uses SHORT FORMS to match how the parser stores properties.
 */
function getColorProperty(componentName: string): string {
  if (TEXT_COMPONENTS.has(componentName)) {
    return 'col'
  }
  // Default: bare colors become bg
  return 'bg'
}

/** Keywords that accept numeric values (should not trigger dimension sugar) */
const NUMERIC_VALUE_KEYWORDS = new Set(['debounce', 'delay'])

/** Animation type keywords - next number is duration, not dimension */
const ANIMATION_KEYWORDS = new Set(['spin', 'pulse', 'bounce'])

/** Properties that can accept multiple numeric values (e.g., grid 20% 80%, size 100 200) */
const MULTI_VALUE_PROPERTIES = new Set(['grid', 'size'])

/**
 * Check if the last token in result is a property (value follows)
 * Also returns true for TOKEN_VAR_DEF (token definitions should not be sugar-expanded)
 */
function isAfterProperty(tokens: Token[]): boolean {
  if (tokens.length === 0) return false

  // Look backwards for the last meaningful token
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]
    if (t.type === 'COMMA' || t.type === 'NEWLINE') {
      return false
    }
    if (t.type === 'PROPERTY') {
      return true
    }
    // Token definitions: $name: value - don't expand the value
    // Preprocessor uses TOKEN_DEF for token definitions ($name:)
    if (t.type === 'TOKEN_DEF') {
      return true
    }
    if (t.type === 'DIRECTION' || t.type === 'CORNER') {
      // Direction/corner follows property
      return true
    }
    // Keywords like 'debounce' and 'delay' take numeric values
    if (t.type === 'KEYWORD' && NUMERIC_VALUE_KEYWORDS.has(t.value)) {
      return true
    }
    // Animation keywords (spin, pulse, bounce) - next number is duration
    if (t.type === 'KEYWORD' && ANIMATION_KEYWORDS.has(t.value)) {
      return true
    }
    // After operators (>, <, ==, etc.), numbers are comparison values, not dimensions
    if (t.type === 'OPERATOR') {
      return true
    }
    if (t.type === 'NUMBER' || t.type === 'STRING' || t.type === 'COLOR' || t.type === 'TOKEN_REF') {
      // For multi-value properties like grid, check if there's a preceding PROPERTY token
      // that accepts multiple values (e.g., grid 20% 80%)
      if (isAfterMultiValueProperty(tokens, i)) {
        return true
      }
      // A value, so we're not directly after a property
      return false
    }
  }

  return false
}

/**
 * Check if we're after a multi-value property like grid
 * e.g., "grid 20%" - the 80% that follows should still be part of grid
 */
function isAfterMultiValueProperty(tokens: Token[], currentIndex: number): boolean {
  // Look backwards for a PROPERTY token that accepts multiple values
  for (let i = currentIndex - 1; i >= 0; i--) {
    const t = tokens[i]
    if (t.type === 'COMMA' || t.type === 'NEWLINE') {
      return false
    }
    if (t.type === 'PROPERTY' && MULTI_VALUE_PROPERTIES.has(t.value)) {
      return true
    }
  }
  return false
}

/**
 * Properties that can accept color as a value (compound properties)
 */
const COLOR_ACCEPTING_PROPERTIES = new Set([
  'border', 'bor', 'outline', 'shadow'
])

/**
 * Check if we're within a compound property that accepts colors
 * e.g., "border 2 #333" - the color is part of border, not standalone background
 */
function isWithinColorAcceptingProperty(tokens: Token[]): boolean {
  if (tokens.length === 0) return false

  // Look backwards for a property that accepts colors
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]
    if (t.type === 'COMMA' || t.type === 'NEWLINE') {
      return false
    }
    if (t.type === 'PROPERTY' && COLOR_ACCEPTING_PROPERTIES.has(t.value)) {
      return true
    }
  }

  return false
}

/**
 * Create a property token
 */
function createPropertyToken(property: string, reference: Token): Token {
  return {
    type: 'PROPERTY',
    value: property,
    line: reference.line,
    column: reference.column,
    indent: reference.indent,
  }
}
