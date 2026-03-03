/**
 * Unified Token Parser
 *
 * Centralized token parsing for all picker components.
 * Replaces the duplicate implementations in ColorPicker, FontPicker, and TokenPicker.
 *
 * Features:
 * - Section-aware parsing (// Farben, // Fonts, etc.)
 * - Type inference from name patterns and values
 * - Token reference resolution
 * - Filtering by type
 */

import type { TokenValueType, TypedToken, TokenPropertyBinding, TokenSubProperty, BoundToken } from '../types/token-types'

// Re-export types for convenience
export type { TokenValueType, TypedToken, TokenPropertyBinding, TokenSubProperty, BoundToken }

/**
 * Extended token interface with optional preview (for fonts)
 */
export interface ParsedToken extends TypedToken {
  /** Original raw value before reference resolution */
  rawValue?: string
  /** Preview text (e.g., font family for font tokens) */
  preview?: string
}

// CSS color keywords
const CSS_COLOR_KEYWORDS = new Set([
  'transparent', 'currentcolor', 'inherit',
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'lime', 'navy',
  'teal', 'aqua', 'maroon', 'olive', 'silver', 'fuchsia'
])

// Section comment patterns → token type
const SECTION_HINTS: Record<string, TokenValueType> = {
  'farben': 'color',
  'color': 'color',
  'colors': 'color',
  'farbe': 'color',
  'spacing': 'spacing',
  'abstand': 'spacing',
  'abstände': 'spacing',
  'padding': 'spacing',
  'margin': 'spacing',
  'font': 'font',
  'schrift': 'font',
  'schriften': 'font',
  'typography': 'font',
  'typografie': 'font',
  'shadow': 'shadow',
  'schatten': 'shadow',
  'radius': 'radius',
  'radien': 'radius',
  'ecken': 'radius',
  'border': 'border',
  'rahmen': 'border',
  'opacity': 'opacity',
  'transparenz': 'opacity',
  'weight': 'weight',
  'gewicht': 'weight',
  'size': 'size',
  'grösse': 'size',
  'größe': 'size',
  'grössen': 'size',
  'größen': 'size',
}

// Token name suffix patterns → token type
// These match the property suffix (part after last dot) to determine type
// e.g., "$primary.bg" → suffix is "bg" → type is "color"
const NAME_SUFFIX_HINTS: Array<{ suffix: string; type: TokenValueType }> = [
  { suffix: 'col', type: 'color' },
  { suffix: 'bg', type: 'color' },
  { suffix: 'boc', type: 'color' },
  { suffix: 'pad', type: 'spacing' },
  { suffix: 'mar', type: 'spacing' },
  { suffix: 'gap', type: 'spacing' },
  { suffix: 'font', type: 'font' },
  { suffix: 'fam', type: 'font' },
  { suffix: 'fow', type: 'weight' },
  { suffix: 'weight', type: 'weight' },
  { suffix: 'sha', type: 'shadow' },
  { suffix: 'shadow', type: 'shadow' },
  { suffix: 'rad', type: 'radius' },
  { suffix: 'radius', type: 'radius' },
  { suffix: 'opa', type: 'opacity' },
  { suffix: 'opacity', type: 'opacity' },
  { suffix: 'bor', type: 'border' },
  { suffix: 'border', type: 'border' },
  { suffix: 'size', type: 'size' },
  { suffix: 'fos', type: 'size' },
  { suffix: 'is', type: 'size' },
]

/**
 * Infer type from token name by checking the property suffix.
 * For "$primary.bg", checks if "bg" matches a known suffix.
 * For "$primary", returns null (no suffix to match).
 */
function inferTypeFromName(name: string): TokenValueType | null {
  // Get the last part after the final dot (the property suffix)
  const lastDotIndex = name.lastIndexOf('.')
  if (lastDotIndex === -1) {
    // No dot in name - no property suffix to match
    return null
  }

  const suffix = name.slice(lastDotIndex + 1).toLowerCase()

  for (const { suffix: hint, type } of NAME_SUFFIX_HINTS) {
    if (suffix === hint) {
      return type
    }
  }
  return null
}

/**
 * Infer type from token value
 */
function inferTypeFromValue(value: string): TokenValueType | null {
  const trimmed = value.trim()

  // Color: #xxx, rgb(), hsl(), or color keywords
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return 'color'
  if (/^(rgb|rgba|hsl|hsla)\s*\(/i.test(trimmed)) return 'color'
  if (CSS_COLOR_KEYWORDS.has(trimmed.toLowerCase())) return 'color'

  // Font weight (100-900)
  if (/^[1-9]00$/.test(trimmed)) return 'weight'

  // Pure number → spacing
  if (/^-?[0-9]+$/.test(trimmed)) return 'spacing'

  // Opacity (0-1 decimal)
  if (/^0?\.[0-9]+$/.test(trimmed)) return 'opacity'

  // Shadow keywords
  if (/^(sm|md|lg|xl|2xl|none)$/i.test(trimmed)) return 'shadow'

  // Quoted string → font
  if (/^["'].*["']/.test(trimmed)) return 'font'

  return null
}

/**
 * Resolve token references in a value string.
 * e.g., "l-r $base-pad" with tokenMap { "base-pad": "16" } → "l-r 16"
 *
 * Handles recursive resolution up to a depth limit to prevent infinite loops.
 * This is the shared utility used by both token-parser and token-type-inference.
 */
export function resolveTokenReferences(
  value: string,
  tokenMap: Map<string, string>,
  maxDepth = 5
): string {
  if (maxDepth <= 0) return value

  return value.replace(/\$([a-zA-Z][\w.-]*)/g, (match, name) => {
    const resolved = tokenMap.get(name)
    if (resolved === undefined) return match

    if (resolved.includes('$')) {
      return resolveTokenReferences(resolved, tokenMap, maxDepth - 1)
    }
    return resolved
  })
}

/**
 * Parse options for the unified parser
 */
export interface ParseTokensOptions {
  /** Filter to specific types */
  filterTypes?: TokenValueType[]
  /** Include tokens with unknown type */
  includeUnknown?: boolean
  /** Resolve token references to show actual values */
  resolveReferences?: boolean
}

/**
 * Parse tokens from code with type inference.
 * This is the main entry point for token parsing.
 */
export function parseTokens(
  code: string,
  options: ParseTokensOptions = {}
): ParsedToken[] {
  const {
    filterTypes,
    includeUnknown = true,
    resolveReferences = true
  } = options

  const lines = code.split('\n')

  // First pass: collect all raw token values for reference resolution
  const rawTokenMap = new Map<string, string>()
  for (const line of lines) {
    const tokenMatch = line.match(/^\s*\$([a-zA-Z][\w.-]*)\s*:\s*(.+)$/)
    if (tokenMatch) {
      rawTokenMap.set(tokenMatch[1], tokenMatch[2].trim())
    }
  }

  // Second pass: parse tokens with type inference
  const tokens: ParsedToken[] = []
  let currentSection: TokenValueType | null = null

  for (const line of lines) {
    // Check for section comment
    const sectionMatch = line.match(/^\/\/\s*(.+)/)
    if (sectionMatch) {
      const sectionName = sectionMatch[1].toLowerCase().trim()
      currentSection = null
      for (const [keyword, type] of Object.entries(SECTION_HINTS)) {
        if (sectionName.includes(keyword)) {
          currentSection = type
          break
        }
      }
      continue
    }

    // Parse token definition
    const tokenMatch = line.match(/^\s*\$([a-zA-Z][\w.-]*)\s*:\s*(.+)$/)
    if (tokenMatch) {
      const name = tokenMatch[1]
      const rawValue = tokenMatch[2].trim()

      // Resolve token references if enabled
      const resolvedValue = resolveReferences
        ? resolveTokenReferences(rawValue, rawTokenMap)
        : rawValue

      // Determine type with priority: section > name > value
      let type: TokenValueType = 'unknown'

      if (currentSection) {
        type = currentSection
      } else {
        const nameType = inferTypeFromName(name)
        if (nameType) {
          type = nameType
        } else {
          const valueType = inferTypeFromValue(resolvedValue)
          if (valueType) {
            type = valueType
          }
        }
      }

      // Apply filters
      if (filterTypes && !filterTypes.includes(type)) {
        continue
      }
      if (!includeUnknown && type === 'unknown') {
        continue
      }

      tokens.push({
        name,
        value: resolvedValue,
        type,
        rawValue: rawValue !== resolvedValue ? rawValue : undefined,
        preview: type === 'font' ? resolvedValue : undefined
      })
    }
  }

  return tokens
}

/**
 * Parse only color tokens from code.
 * Convenience function for ColorPicker.
 */
export function parseColorTokens(code: string): ParsedToken[] {
  return parseTokens(code, { filterTypes: ['color'] })
}

/**
 * Parse global color tokens (not inside any theme block).
 */
function parseGlobalColorTokens(code: string): ParsedToken[] {
  const lines = code.split('\n')
  const tokens: ParsedToken[] = []
  const rawTokenMap = new Map<string, string>()
  let inThemeBlock = false

  // First pass: collect raw values for reference resolution (only global tokens)
  for (const line of lines) {
    // Check if entering a theme block
    if (/^\s*theme\s+\w+\s*:/.test(line)) {
      inThemeBlock = true
      continue
    }

    // Check if exiting theme block (non-indented, non-empty line)
    if (inThemeBlock && line.match(/^\S/) && line.trim() !== '') {
      inThemeBlock = false
    }

    // Only collect tokens outside of theme blocks
    if (!inThemeBlock) {
      const tokenMatch = line.match(/^\s*\$([a-zA-Z][\w.-]*)\s*:\s*(.+)$/)
      if (tokenMatch) {
        rawTokenMap.set(tokenMatch[1], tokenMatch[2].trim())
      }
    }
  }

  // Second pass: parse tokens with type inference
  inThemeBlock = false
  for (const line of lines) {
    if (/^\s*theme\s+\w+\s*:/.test(line)) {
      inThemeBlock = true
      continue
    }

    if (inThemeBlock && line.match(/^\S/) && line.trim() !== '') {
      inThemeBlock = false
    }

    if (!inThemeBlock) {
      const tokenMatch = line.match(/^\s*\$([a-zA-Z][\w.-]*)\s*:\s*(.+)$/)
      if (tokenMatch) {
        const name = tokenMatch[1]
        const rawValue = tokenMatch[2].trim()
        const resolvedValue = resolveTokenReferences(rawValue, rawTokenMap)

        // Check if this is a color
        const type = inferTypeFromValue(resolvedValue)
        if (type === 'color') {
          tokens.push({
            name,
            value: resolvedValue,
            type: 'color',
            rawValue: rawValue !== resolvedValue ? rawValue : undefined,
          })
        }
      }
    }
  }

  return tokens
}

/**
 * Parse only color tokens from the active theme AND global tokens.
 * Returns both theme-specific and global color tokens combined.
 * If no theme is active, returns only global color tokens.
 */
export function parseActiveThemeColorTokens(code: string): ParsedToken[] {
  // Always get global tokens first
  const globalTokens = parseGlobalColorTokens(code)

  // Find active theme: "use theme X"
  const useThemeMatch = code.match(/\buse\s+theme\s+(\w+)/i)
  if (!useThemeMatch) {
    // No active theme - return only global color tokens
    return globalTokens
  }

  const activeThemeName = useThemeMatch[1]

  // Find the theme definition block: "theme X:" followed by indented lines
  const themeRegex = new RegExp(
    `^\\s*theme\\s+${activeThemeName}\\s*:\\s*$`,
    'im'
  )

  const lines = code.split('\n')
  let inTheme = false
  let themeIndent = -1
  const themeTokens: ParsedToken[] = []
  const rawTokenMap = new Map<string, string>()

  // First pass: collect raw values for reference resolution
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (themeRegex.test(line)) {
      inTheme = true
      themeIndent = -1 // Will be set on first token line
      continue
    }

    if (inTheme) {
      // Check for token definition
      const tokenMatch = line.match(/^(\s+)\$([a-zA-Z][\w.-]*)\s*:\s*(.+)$/)
      if (tokenMatch) {
        const currentIndent = tokenMatch[1].length
        if (themeIndent === -1) {
          themeIndent = currentIndent
        }
        if (currentIndent >= themeIndent) {
          rawTokenMap.set(tokenMatch[2], tokenMatch[3].trim())
        } else {
          inTheme = false
        }
      } else if (line.trim() === '' || line.match(/^\s*\/\//)) {
        // Empty line or comment - continue
        continue
      } else if (line.match(/^\S/)) {
        // Non-indented non-empty line - end of theme block
        inTheme = false
      }
    }
  }

  // Second pass: parse tokens with type inference
  inTheme = false
  themeIndent = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (themeRegex.test(line)) {
      inTheme = true
      themeIndent = -1
      continue
    }

    if (inTheme) {
      const tokenMatch = line.match(/^(\s+)\$([a-zA-Z][\w.-]*)\s*:\s*(.+)$/)
      if (tokenMatch) {
        const currentIndent = tokenMatch[1].length
        if (themeIndent === -1) {
          themeIndent = currentIndent
        }

        if (currentIndent >= themeIndent) {
          const name = tokenMatch[2]
          const rawValue = tokenMatch[3].trim()
          const resolvedValue = resolveTokenReferences(rawValue, rawTokenMap)

          // Check if this is a color
          const type = inferTypeFromValue(resolvedValue)
          if (type === 'color') {
            themeTokens.push({
              name,
              value: resolvedValue,
              type: 'color',
              rawValue: rawValue !== resolvedValue ? rawValue : undefined,
            })
          }
        } else {
          inTheme = false
        }
      } else if (line.trim() === '' || line.match(/^\s*\/\//)) {
        continue
      } else if (line.match(/^\S/)) {
        inTheme = false
      }
    }
  }

  // Combine theme tokens with global tokens
  // Theme tokens first, then global tokens
  return [...themeTokens, ...globalTokens]
}

/**
 * Parse only font tokens from code.
 * Convenience function for FontPicker.
 */
export function parseFontTokens(code: string): ParsedToken[] {
  return parseTokens(code, { filterTypes: ['font'] })
}

/**
 * Check if a token type is valid for a given property context.
 */
export function isTokenTypeValidForProperty(
  property: string,
  tokenType: TokenValueType
): boolean {
  const propertyLower = property.toLowerCase()

  // Color properties
  if (/col|bg|boc|color|background/.test(propertyLower)) {
    return tokenType === 'color' || tokenType === 'unknown'
  }

  // Spacing properties
  if (/pad|mar|gap/.test(propertyLower)) {
    return tokenType === 'spacing' || tokenType === 'unknown'
  }

  // Font properties
  if (/font|fam/.test(propertyLower)) {
    return tokenType === 'font' || tokenType === 'unknown'
  }

  // Size properties (font-size and icon-size)
  if (/size|fos|^is$/.test(propertyLower)) {
    return tokenType === 'size' || tokenType === 'spacing' || tokenType === 'unknown'
  }

  // Weight properties
  if (/weight|fow/.test(propertyLower)) {
    return tokenType === 'weight' || tokenType === 'unknown'
  }

  // Radius properties
  if (/rad/.test(propertyLower)) {
    return tokenType === 'radius' || tokenType === 'spacing' || tokenType === 'unknown'
  }

  // Shadow properties
  if (/shadow|sha/.test(propertyLower)) {
    return tokenType === 'shadow' || tokenType === 'unknown'
  }

  // Border properties
  if (/bor|border/.test(propertyLower)) {
    return tokenType === 'border' || tokenType === 'spacing' || tokenType === 'unknown'
  }

  // Opacity properties
  if (/opa/.test(propertyLower)) {
    return tokenType === 'opacity' || tokenType === 'unknown'
  }

  // Unknown property - show all tokens
  return true
}

/**
 * Filter tokens by search query.
 * Searches in name, value, and preview.
 */
export function filterTokensByQuery(
  tokens: ParsedToken[],
  query: string
): ParsedToken[] {
  if (!query.trim()) return tokens

  const lowerQuery = query.toLowerCase()
  return tokens.filter(token =>
    token.name.toLowerCase().includes(lowerQuery) ||
    token.value.toLowerCase().includes(lowerQuery) ||
    (token.preview && token.preview.toLowerCase().includes(lowerQuery))
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BOUND TOKEN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
//
// Token format: $name.property[.component]
//
// Examples:
//   $default.bg           → background color
//   $default.bg.button    → background color for buttons
//   $default.col.icon     → foreground color for icons
//   $primary.col          → primary text color
//
// Resolution: When using $default for `bg` on `Button`:
//   1. Try $default.bg.button (most specific)
//   2. Try $default.bg (property-specific)
//   3. Try $default (generic, if it's a color)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Known property bindings for tokens.
 * Maps property names to their token type category.
 */
const PROPERTY_BINDINGS: Record<TokenPropertyBinding, TokenValueType> = {
  'bg': 'color',
  'col': 'color',
  'boc': 'color',
  'pad': 'spacing',
  'mar': 'spacing',
  'gap': 'spacing',
  'rad': 'radius',
  'bor': 'border',
  'border': 'border',  // compound property
  'size': 'size',
  'is': 'size',        // icon-size
  'weight': 'weight',
  'opa': 'opacity',
  'shadow': 'shadow',
  'font': 'font',      // compound property
}

/**
 * All known property binding names
 */
const PROPERTY_BINDING_NAMES = new Set(Object.keys(PROPERTY_BINDINGS))

/**
 * Known sub-properties for compound properties.
 * Maps property -> set of valid sub-properties with their resolved types.
 */
const SUB_PROPERTIES: Record<string, Record<TokenSubProperty, TokenValueType>> = {
  'border': {
    'color': 'color',
    'width': 'border',
    'style': 'border',
    'radius': 'radius',
    'size': 'border',
    'weight': 'border',
    'family': 'border',  // not used but needed for type
  },
  'font': {
    'color': 'color',
    'family': 'font',
    'size': 'size',
    'weight': 'weight',
    'style': 'font',
    'width': 'font',    // not used but needed for type
    'radius': 'font',   // not used but needed for type
  },
}

/**
 * All known sub-property names for quick lookup
 */
const SUB_PROPERTY_NAMES = new Set<string>(['color', 'width', 'style', 'radius', 'family', 'size', 'weight'])

/**
 * Parse a token name into its components.
 *
 * Formats supported:
 * - $name                           → baseName only
 * - $name.property                  → baseName + property (e.g., $default.bg)
 * - $name.property.component        → baseName + property + component (e.g., $default.bg.button)
 * - $name.property.subproperty      → baseName + property + subproperty (e.g., $default.border.color)
 * - $name.property.subproperty.comp → all four (e.g., $default.border.color.button)
 *
 * @param tokenName Full token name (e.g., "default.border.color.button")
 * @returns Parsed components { baseName, property, subProperty, component }
 */
export function parseTokenPath(tokenName: string): {
  baseName: string
  boundProperty?: TokenPropertyBinding
  boundSubProperty?: TokenSubProperty
  boundComponent?: string
} {
  const parts = tokenName.split('.')

  if (parts.length === 1) {
    // Simple token: $primary
    return { baseName: parts[0] }
  }

  if (parts.length === 2) {
    // Could be $name.property or $name.component
    // Check if second part is a known property
    if (PROPERTY_BINDING_NAMES.has(parts[1])) {
      return {
        baseName: parts[0],
        boundProperty: parts[1] as TokenPropertyBinding
      }
    }
    // Otherwise it's $name.component (unusual but allowed)
    return {
      baseName: parts[0],
      boundComponent: parts[1]
    }
  }

  if (parts.length === 3) {
    // Could be:
    // - $name.property.component (e.g., $default.bg.button)
    // - $name.property.subproperty (e.g., $default.border.color)
    const property = parts[1]
    const third = parts[2]

    if (PROPERTY_BINDING_NAMES.has(property)) {
      // Check if third part is a sub-property of this property
      const subProps = SUB_PROPERTIES[property]
      if (subProps && SUB_PROPERTY_NAMES.has(third)) {
        return {
          baseName: parts[0],
          boundProperty: property as TokenPropertyBinding,
          boundSubProperty: third as TokenSubProperty
        }
      }
      // Otherwise it's a component
      return {
        baseName: parts[0],
        boundProperty: property as TokenPropertyBinding,
        boundComponent: third
      }
    }

    // Property not recognized, treat as $name.unknown.component
    return {
      baseName: parts[0],
      boundComponent: third
    }
  }

  if (parts.length >= 4) {
    // $name.property.subproperty.component (e.g., $default.border.color.button)
    const property = parts[1]
    const third = parts[2]
    const fourth = parts[3]

    if (PROPERTY_BINDING_NAMES.has(property)) {
      const subProps = SUB_PROPERTIES[property]
      if (subProps && SUB_PROPERTY_NAMES.has(third)) {
        return {
          baseName: parts[0],
          boundProperty: property as TokenPropertyBinding,
          boundSubProperty: third as TokenSubProperty,
          boundComponent: fourth
        }
      }
      // third is component, fourth is ignored or appended
      return {
        baseName: parts[0],
        boundProperty: property as TokenPropertyBinding,
        boundComponent: parts.slice(2).join('.')
      }
    }

    return {
      baseName: parts[0],
      boundComponent: parts.slice(2).join('.')
    }
  }

  return { baseName: tokenName }
}

/**
 * Parse all tokens from code and extract bound token information.
 *
 * @param code Token definitions code
 * @returns Array of bound tokens with property/component info
 */
export function parseBoundTokens(code: string): BoundToken[] {
  const tokens: BoundToken[] = []
  const lines = code.split('\n')

  // First pass: collect raw values for reference resolution
  const rawTokenMap = new Map<string, string>()
  for (const line of lines) {
    const tokenMatch = line.match(/^\s*\$([a-zA-Z][\w.-]*)\s*:\s*(.+)$/)
    if (tokenMatch) {
      rawTokenMap.set(tokenMatch[1], tokenMatch[2].trim())
    }
  }

  // Second pass: parse tokens with bound info
  for (const line of lines) {
    const tokenMatch = line.match(/^\s*\$([a-zA-Z][\w.-]*)\s*:\s*(.+)$/)
    if (tokenMatch) {
      const fullPath = tokenMatch[1]
      const rawValue = tokenMatch[2].trim()
      const resolvedValue = resolveTokenReferences(rawValue, rawTokenMap)

      const { baseName, boundProperty, boundSubProperty, boundComponent } = parseTokenPath(fullPath)

      // Determine type from sub-property, property, or value
      let type: TokenValueType = 'unknown'
      if (boundSubProperty && boundProperty) {
        // Use sub-property type if available
        const subProps = SUB_PROPERTIES[boundProperty]
        if (subProps && subProps[boundSubProperty]) {
          type = subProps[boundSubProperty]
        }
      } else if (boundProperty && PROPERTY_BINDINGS[boundProperty]) {
        type = PROPERTY_BINDINGS[boundProperty]
      } else {
        const valueType = inferTypeFromValue(resolvedValue)
        if (valueType) type = valueType
      }

      tokens.push({
        name: fullPath,
        baseName,
        value: resolvedValue,
        type,
        boundProperty,
        boundSubProperty,
        boundComponent,
        fullPath,
        rawValue: rawValue !== resolvedValue ? rawValue : undefined,
      })
    }
  }

  return tokens
}

/**
 * Resolve a token reference in a given context.
 *
 * @param tokenRef The token reference (e.g., "default" from $default)
 * @param property The current property context (e.g., "bg", "col")
 * @param component The current component context (e.g., "Icon", "Button")
 * @param allTokens All available bound tokens
 * @returns The resolved token or undefined
 */
export function resolveTokenInContext(
  tokenRef: string,
  property: TokenPropertyBinding | string,
  component: string | undefined,
  allTokens: BoundToken[]
): BoundToken | undefined {
  const normalizedComponent = component?.toLowerCase()
  const normalizedProperty = property.toLowerCase()

  // Build lookup paths in order of specificity
  const lookupPaths: string[] = []

  // 1. Most specific: $name.property.component
  if (normalizedComponent) {
    lookupPaths.push(`${tokenRef}.${normalizedProperty}.${normalizedComponent}`)
  }

  // 2. Property-specific: $name.property
  lookupPaths.push(`${tokenRef}.${normalizedProperty}`)

  // 3. Generic: $name (only if it matches the property type)
  lookupPaths.push(tokenRef)

  // Find first matching token
  for (const path of lookupPaths) {
    const match = allTokens.find(t => t.name.toLowerCase() === path.toLowerCase())
    if (match) {
      return match
    }
  }

  return undefined
}

/**
 * Check if a token type is compatible with a property.
 * Used for flexible matching where spacing tokens can be used for radius, etc.
 */
function isTypeCompatibleWithProperty(
  tokenType: TokenValueType,
  property: string
): boolean {
  const expectedType = PROPERTY_BINDINGS[property as TokenPropertyBinding]

  // Exact type match
  if (tokenType === expectedType) return true

  // Spacing tokens are compatible with radius and border properties
  // NOT with size/is - those need explicit size tokens
  if (tokenType === 'spacing') {
    if (['rad', 'radius', 'bor', 'border'].includes(property)) {
      return true
    }
  }

  // Size tokens are compatible with icon-size
  if (tokenType === 'size') {
    if (['is', 'size'].includes(property)) {
      return true
    }
  }

  return false
}

/**
 * Get all tokens that are valid for a given property context.
 * Used by pickers to show relevant options.
 *
 * @param property The property being edited (e.g., "bg", "col")
 * @param component Optional component context for prioritization
 * @param allTokens All available bound tokens
 * @returns Filtered and sorted tokens (component-specific first)
 */
export function getTokensForProperty(
  property: TokenPropertyBinding | string,
  component: string | undefined,
  allTokens: BoundToken[]
): BoundToken[] {
  const normalizedProperty = property.toLowerCase()
  const normalizedComponent = component?.toLowerCase()

  // Filter tokens that match this property
  const matchingTokens = allTokens.filter(token => {
    // Exact property match
    if (token.boundProperty === normalizedProperty) {
      return true
    }

    // Generic tokens (no bound property) with compatible type
    if (!token.boundProperty) {
      return isTypeCompatibleWithProperty(token.type, normalizedProperty)
    }

    return false
  })

  // Sort: component-specific first, then property-specific, then generic
  return matchingTokens.sort((a, b) => {
    const aScore = getSpecificityScore(a, normalizedProperty, normalizedComponent)
    const bScore = getSpecificityScore(b, normalizedProperty, normalizedComponent)
    return bScore - aScore // Higher score = more specific = first
  })
}

/**
 * Calculate specificity score for sorting tokens.
 */
function getSpecificityScore(
  token: BoundToken,
  property: string,
  component: string | undefined
): number {
  let score = 0

  // Bonus for matching component
  if (component && token.boundComponent?.toLowerCase() === component) {
    score += 100
  }

  // Bonus for having bound property
  if (token.boundProperty === property) {
    score += 10
  }

  // Small bonus for having any bound property (vs generic)
  if (token.boundProperty) {
    score += 1
  }

  return score
}
