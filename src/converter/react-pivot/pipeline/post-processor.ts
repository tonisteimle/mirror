/**
 * @module converter/react-pivot/pipeline/post-processor
 * @description Post-processing corrections for generated Mirror code
 *
 * This module applies guaranteed corrections to Mirror code after transformation.
 * It catches common LLM mistakes that slip through the transformer.
 *
 * Corrections applied:
 * 1. Hex colors → Token references
 * 2. Remove className artifacts
 * 3. Fix common property mistakes
 * 4. Standardize token names
 */

// =============================================================================
// Types
// =============================================================================

export interface PostProcessResult {
  /** Corrected Mirror code */
  code: string

  /** List of corrections applied */
  corrections: PostProcessCorrection[]

  /** Whether any corrections were made */
  modified: boolean
}

export interface PostProcessCorrection {
  type: 'hex-to-token' | 'remove-classname' | 'fix-property' | 'standardize-token'
  original: string
  replacement: string
  line?: number
}

// =============================================================================
// Color Mapping
// =============================================================================

/**
 * Map common hex colors to semantic tokens.
 * These are the most likely colors the LLM might accidentally use.
 */
const HEX_TO_TOKEN_MAP: Record<string, string> = {
  // Whites
  '#fff': '$on-primary.col',
  '#ffffff': '$on-primary.col',
  '#fafafa': '$surface.bg',

  // Blacks
  '#000': '$heading.col',
  '#000000': '$heading.col',

  // Greys (common Tailwind palette)
  '#f4f4f5': '$surface.bg',
  '#e4e4e7': '$muted.col',
  '#d4d4d8': '$muted.col',
  '#a1a1aa': '$muted.col',
  '#71717a': '$muted.col',
  '#52525b': '$default.col',
  '#3f3f46': '$elevated.bg',
  '#27272a': '$surface.bg',
  '#18181b': '$app.bg',
  '#09090b': '$app.bg',

  // Primary Blue (Tailwind blue)
  '#3b82f6': '$primary.bg',
  '#2563eb': '$primary.hover.bg',
  '#1d4ed8': '$primary.hover.bg',
  '#60a5fa': '$primary.col',
  '#93c5fd': '$primary.col',
  '#dbeafe': '$primary.bg',

  // Success Green (Tailwind green)
  '#22c55e': '$success.bg',
  '#16a34a': '$success.bg',
  '#4ade80': '$success.col',
  '#86efac': '$success.col',
  '#dcfce7': '$success.bg',

  // Danger Red (Tailwind red)
  '#ef4444': '$danger.bg',
  '#dc2626': '$danger.bg',
  '#f87171': '$danger.col',
  '#fca5a5': '$danger.col',
  '#fee2e2': '$danger.bg',

  // Warning Yellow/Orange (Tailwind)
  '#f59e0b': '$warning.bg',
  '#d97706': '$warning.bg',
  '#fbbf24': '$warning.col',
  '#fcd34d': '$warning.col',
  '#fef3c7': '$warning.bg',
}

/**
 * Color name to token mapping (for color words the LLM might use)
 */
const COLOR_NAME_TO_TOKEN: Record<string, string> = {
  'white': '$on-primary.col',
  'black': '$heading.col',
  'transparent': 'transparent',
  'blue': '$primary.bg',
  'red': '$danger.bg',
  'green': '$success.bg',
  'yellow': '$warning.bg',
  'gray': '$muted.col',
  'grey': '$muted.col',
}

// =============================================================================
// Post-Processing Functions
// =============================================================================

/**
 * Main post-processing function.
 * Applies all corrections to the Mirror code.
 */
export function postProcessMirrorCode(mirrorCode: string): PostProcessResult {
  const corrections: PostProcessCorrection[] = []
  let code = mirrorCode

  // 1. Convert hex colors to tokens
  code = convertHexToTokens(code, corrections)

  // 2. Convert color names to tokens
  code = convertColorNamesToTokens(code, corrections)

  // 3. Remove className artifacts
  code = removeClassNameArtifacts(code, corrections)

  // 4. Fix common property mistakes
  code = fixPropertyMistakes(code, corrections)

  // 5. Standardize token names
  code = standardizeTokenNames(code, corrections)

  return {
    code,
    corrections,
    modified: corrections.length > 0,
  }
}

/**
 * Convert hex colors to semantic tokens.
 */
function convertHexToTokens(code: string, corrections: PostProcessCorrection[]): string {
  // Match hex colors in various formats
  // Patterns: #fff, #ffffff, #FFF, #FFFFFF
  const hexPattern = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g

  return code.replace(hexPattern, (match) => {
    const lowerMatch = match.toLowerCase()
    const token = HEX_TO_TOKEN_MAP[lowerMatch]

    if (token) {
      corrections.push({
        type: 'hex-to-token',
        original: match,
        replacement: token,
      })
      return token
    }

    // If no exact match, try to infer based on luminance
    const inferredToken = inferTokenFromHex(lowerMatch)
    if (inferredToken) {
      corrections.push({
        type: 'hex-to-token',
        original: match,
        replacement: inferredToken,
      })
      return inferredToken
    }

    return match // Keep original if no mapping found
  })
}

/**
 * Infer a token based on hex color luminance.
 */
function inferTokenFromHex(hex: string): string | null {
  // Expand 3-char hex to 6-char
  let fullHex = hex.slice(1)
  if (fullHex.length === 3) {
    fullHex = fullHex[0] + fullHex[0] + fullHex[1] + fullHex[1] + fullHex[2] + fullHex[2]
  }

  const r = parseInt(fullHex.slice(0, 2), 16)
  const g = parseInt(fullHex.slice(2, 4), 16)
  const b = parseInt(fullHex.slice(4, 6), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Infer based on luminance
  if (luminance > 0.9) {
    return '$on-primary.col' // Very light → text on dark
  } else if (luminance > 0.7) {
    return '$surface.bg' // Light → surface
  } else if (luminance > 0.4) {
    return '$muted.col' // Medium → muted
  } else if (luminance > 0.2) {
    return '$default.col' // Dark-ish → default text
  } else {
    return '$heading.col' // Very dark → heading
  }
}

/**
 * Convert color names (white, black, etc.) to tokens.
 */
function convertColorNamesToTokens(code: string, corrections: PostProcessCorrection[]): string {
  // Only convert color names when they appear as property values
  // Pattern: property colorname (not inside strings or other contexts)
  for (const [colorName, token] of Object.entries(COLOR_NAME_TO_TOKEN)) {
    // Match: "col white", "bg black", etc. but not inside strings
    const pattern = new RegExp(`\\b(col|bg|boc|color|background)\\s+${colorName}\\b`, 'gi')

    code = code.replace(pattern, (match, prop) => {
      corrections.push({
        type: 'hex-to-token',
        original: colorName,
        replacement: token,
      })
      return `${prop} ${token}`
    })
  }

  return code
}

/**
 * Remove className artifacts that may have slipped through.
 */
function removeClassNameArtifacts(code: string, corrections: PostProcessCorrection[]): string {
  // Pattern: className "..." or className '...'
  const classNamePattern = /,?\s*className\s*["'][^"']*["']/g

  const matches = code.match(classNamePattern)
  if (matches) {
    for (const match of matches) {
      corrections.push({
        type: 'remove-classname',
        original: match.trim(),
        replacement: '',
      })
    }
  }

  return code.replace(classNamePattern, '')
}

/**
 * Fix common property mistakes in Mirror syntax.
 */
function fixPropertyMistakes(code: string, corrections: PostProcessCorrection[]): string {
  const replacements: [RegExp, string, string][] = [
    // flexDirection → direction shorthand handled by transformer
    // But if it slipped through:
    [/\bflexDirection\s+row\b/gi, 'hor', 'flexDirection row'],
    [/\bflexDirection\s+column\b/gi, 'ver', 'flexDirection column'],

    // display: flex → already implied, remove
    [/,?\s*display\s+flex\b/gi, '', 'display flex'],

    // alignItems: flex-start → start
    [/\balignItems\s+flex-start\b/gi, 'top', 'alignItems flex-start'],
    [/\balignItems\s+flex-end\b/gi, 'bottom', 'alignItems flex-end'],

    // justifyContent: flex-start → left
    [/\bjustifyContent\s+flex-start\b/gi, 'left', 'justifyContent flex-start'],
    [/\bjustifyContent\s+flex-end\b/gi, 'right', 'justifyContent flex-end'],
    [/\bjustifyContent\s+space-between\b/gi, 'spread', 'justifyContent space-between'],

    // boxShadow → shadow (simple)
    [/\bboxShadow\s+[^,\n]+/gi, 'shadow md', 'boxShadow'],

    // fontWeight: bold → weight bold
    [/\bfontWeight\s+bold\b/gi, 'weight bold', 'fontWeight bold'],
    [/\bfontWeight\s+(\d+)\b/gi, 'weight $1', 'fontWeight'],

    // fontSize: Npx → font-size N
    [/\bfontSize\s+(\d+)px\b/gi, 'font-size $1', 'fontSize with px'],

    // borderRadius → rad
    [/\bborderRadius\s+/gi, 'rad ', 'borderRadius'],

    // backgroundColor → bg
    [/\bbackgroundColor\s+/gi, 'bg ', 'backgroundColor'],
  ]

  for (const [pattern, replacement, description] of replacements) {
    const matches = code.match(pattern)
    if (matches) {
      for (const match of matches) {
        corrections.push({
          type: 'fix-property',
          original: match.trim(),
          replacement: replacement || '(removed)',
        })
      }
      code = code.replace(pattern, replacement)
    }
  }

  return code
}

/**
 * Standardize token names to the canonical format.
 */
function standardizeTokenNames(code: string, corrections: PostProcessCorrection[]): string {
  // Convert various token formats to the canonical format
  // IMPORTANT: Use (?![.-]) to avoid matching compound tokens like $primary-hover
  const tokenStandardizations: [RegExp, string][] = [
    // $primary → $primary.bg (when used as bg value)
    // (?![.-]) ensures we don't match $primary-hover or $primary.bg
    [/\bbg\s+\$primary(?![.-])/g, 'bg $primary.bg'],
    [/\bcol\s+\$primary(?![.-])/g, 'col $primary.col'],

    // $surface → $surface.bg
    [/\bbg\s+\$surface(?![.-])/g, 'bg $surface.bg'],

    // $default → $default.col
    [/\bcol\s+\$default(?![.-])/g, 'col $default.col'],

    // $muted → $muted.col
    [/\bcol\s+\$muted(?![.-])/g, 'col $muted.col'],

    // Spacing: $sm/$md/$lg without suffix
    [/\bpad\s+\$sm(?![.-])/g, 'pad $sm.pad'],
    [/\bpad\s+\$md(?![.-])/g, 'pad $md.pad'],
    [/\bpad\s+\$lg(?![.-])/g, 'pad $lg.pad'],
    [/\bgap\s+\$sm(?![.-])/g, 'gap $sm.gap'],
    [/\bgap\s+\$md(?![.-])/g, 'gap $md.gap'],
    [/\bgap\s+\$lg(?![.-])/g, 'gap $lg.gap'],

    // Radius
    [/\brad\s+\$sm(?![.-])/g, 'rad $sm.rad'],
    [/\brad\s+\$md(?![.-])/g, 'rad $md.rad'],
    [/\brad\s+\$lg(?![.-])/g, 'rad $lg.rad'],
  ]

  for (const [pattern, replacement] of tokenStandardizations) {
    const matches = code.match(pattern)
    if (matches) {
      for (const match of matches) {
        if (match !== replacement) {
          corrections.push({
            type: 'standardize-token',
            original: match,
            replacement,
          })
        }
      }
      code = code.replace(pattern, replacement)
    }
  }

  return code
}

// =============================================================================
// Export
// =============================================================================

export default postProcessMirrorCode
