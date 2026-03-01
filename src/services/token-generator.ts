/**
 * @module services/token-generator
 * @description Generates design tokens from Mirror code without tokens
 *
 * Two-phase approach:
 * 1. Deterministic: Extract values, group by type, detect patterns
 * 2. LLM: Suggest semantic names based on context
 */

// =============================================================================
// Types
// =============================================================================

export interface ColorUsage {
  value: string           // "#3B82F6"
  property: string        // "background", "color", "border-color"
  component?: string      // "Button", "Card"
  state?: string          // "hover", "selected"
  line: number
}

export interface SpacingUsage {
  value: number
  property: string        // "padding", "gap", "margin", "radius"
  component?: string
  line: number
}

export interface ExtractedValues {
  colors: ColorUsage[]
  spacing: SpacingUsage[]
}

export interface ColorCluster {
  representative: string  // Main color value
  variants: string[]      // Similar colors (hover states etc.)
  usages: ColorUsage[]
  suggestedPalette?: string  // "$blue-500"
  suggestedSemantic?: string // "$primary.bg"
}

export interface TokenSuggestion {
  palette: Record<string, string>      // { "$grey-900": "#27272A" }
  semantic: Record<string, string>     // { "#27272A": "$surface.bg" }
  refactoredCode: string
}

// =============================================================================
// Phase 1: Deterministic Extraction
// =============================================================================

// Match hex colors including alpha (3, 4, 6, or 8 chars)
const COLOR_REGEX = /#[A-Fa-f0-9]{3,8}\b/g
const SPACING_PROPERTIES = ['padding', 'pad', 'p', 'margin', 'm', 'gap', 'g', 'radius', 'rad']
const COLOR_PROPERTIES = ['background', 'bg', 'color', 'col', 'c', 'border-color', 'boc', 'hover-background', 'hover-bg', 'hover-color', 'hover-col']

/**
 * Extract all hardcoded values from Mirror code
 */
export function extractValues(code: string): ExtractedValues {
  const lines = code.split('\n')
  const colors: ColorUsage[] = []
  const spacing: SpacingUsage[] = []

  let currentComponent: string | undefined
  let currentState: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Track current component (lines ending with : at root or near-root level)
    const componentMatch = trimmed.match(/^([A-Z][A-Za-z0-9]*):?\s*$/)
    if (componentMatch && !line.startsWith('    ')) {
      currentComponent = componentMatch[1]
      currentState = undefined
      continue
    }

    // Track state blocks
    const stateMatch = trimmed.match(/^(hover|state\s+\w+|focus|active|disabled)\s*$/)
    if (stateMatch) {
      currentState = stateMatch[1]
      continue
    }

    // Reset state when back to component level
    if (trimmed && !trimmed.startsWith(' ') && currentState) {
      currentState = undefined
    }

    // Extract colors
    const colorMatches = line.matchAll(COLOR_REGEX)
    for (const match of colorMatches) {
      const colorValue = match[0].toUpperCase()

      // Determine which property this color belongs to
      let property = 'unknown'
      for (const prop of COLOR_PROPERTIES) {
        if (line.includes(prop)) {
          property = prop
          break
        }
      }

      colors.push({
        value: colorValue,
        property: normalizeProperty(property),
        component: currentComponent,
        state: currentState,
        line: i + 1
      })
    }

    // Extract spacing values
    for (const prop of SPACING_PROPERTIES) {
      const spacingRegex = new RegExp(`\\b${prop}\\s+(\\d+)`, 'i')
      const spacingMatch = line.match(spacingRegex)
      if (spacingMatch) {
        spacing.push({
          value: parseInt(spacingMatch[1]),
          property: normalizeProperty(prop),
          component: currentComponent,
          line: i + 1
        })
      }
    }
  }

  return { colors, spacing }
}

function normalizeProperty(prop: string): string {
  const map: Record<string, string> = {
    'bg': 'background',
    'col': 'color',
    'c': 'color',
    'boc': 'border-color',
    'pad': 'padding',
    'p': 'padding',
    'm': 'margin',
    'g': 'gap',
    'rad': 'radius',
    'hover-bg': 'hover-background',
    'hover-col': 'hover-color',
  }
  return map[prop] || prop
}

// =============================================================================
// Color Analysis
// =============================================================================

/**
 * Group similar colors into clusters
 */
export function clusterColors(colors: ColorUsage[]): ColorCluster[] {
  const uniqueColors = new Map<string, ColorUsage[]>()

  // Group by exact value first
  for (const usage of colors) {
    const existing = uniqueColors.get(usage.value) || []
    existing.push(usage)
    uniqueColors.set(usage.value, existing)
  }

  // Convert to clusters
  const clusters: ColorCluster[] = []
  for (const [value, usages] of uniqueColors) {
    clusters.push({
      representative: value,
      variants: [],
      usages
    })
  }

  // Find hover variants (similar colors used in hover states)
  for (const cluster of clusters) {
    for (const other of clusters) {
      if (cluster === other) continue

      // Check if other is a hover variant of cluster
      const clusterHasBase = cluster.usages.some(u => !u.state)
      const otherIsHover = other.usages.every(u => u.state?.includes('hover'))

      if (clusterHasBase && otherIsHover && colorsSimilar(cluster.representative, other.representative)) {
        cluster.variants.push(other.representative)
      }
    }
  }

  return clusters
}

/**
 * Check if two colors are similar (for hover state detection)
 */
function colorsSimilar(a: string, b: string): boolean {
  const rgbA = hexToRgb(a)
  const rgbB = hexToRgb(b)
  if (!rgbA || !rgbB) return false

  // Simple delta - colors within 30 units on each channel
  const delta = Math.abs(rgbA.r - rgbB.r) + Math.abs(rgbA.g - rgbB.g) + Math.abs(rgbA.b - rgbB.b)
  return delta < 90
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Analyze color to determine likely category
 */
export function analyzeColor(hex: string): 'grey' | 'blue' | 'green' | 'red' | 'yellow' | 'other' {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'other'

  const { r, g, b } = rgb

  // Grey detection (r ≈ g ≈ b)
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))
  if (maxDiff < 20) return 'grey'

  // Dominant channel detection
  if (b > r && b > g) return 'blue'
  if (g > r && g > b) return 'green'
  if (r > g && r > b) {
    if (g > 100) return 'yellow' // Orange/Yellow territory
    return 'red'
  }

  return 'other'
}

/**
 * Determine brightness (for dark/light detection)
 */
export function colorBrightness(hex: string): 'dark' | 'light' {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'light'

  // Relative luminance formula
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b)
  return luminance < 128 ? 'dark' : 'light'
}

// =============================================================================
// Spacing Analysis
// =============================================================================

/**
 * Map spacing value to scale token
 */
export function spacingToScale(value: number): string {
  if (value <= 4) return '$xs'
  if (value <= 8) return '$sm'
  if (value <= 14) return '$md'
  if (value <= 20) return '$lg'
  if (value <= 32) return '$xl'
  return '$2xl'
}

/**
 * Detect spacing scale from values
 */
export function detectSpacingScale(spacing: SpacingUsage[]): number[] {
  const values = [...new Set(spacing.map(s => s.value))].sort((a, b) => a - b)
  return values
}

// =============================================================================
// Phase 2: LLM Semantic Naming
// =============================================================================

export interface LLMTokenInput {
  colors: Array<{
    value: string
    category: 'grey' | 'blue' | 'green' | 'red' | 'yellow' | 'other'
    brightness: 'dark' | 'light'
    usedIn: string[]         // ["background", "color"]
    hasHoverVariant: boolean
    contexts: string[]       // ["Button", "Card"]
  }>
  spacing: {
    values: number[]
    usageCount: Record<number, number>
  }
}

/**
 * Prepare data for LLM
 */
export function prepareForLLM(extracted: ExtractedValues): LLMTokenInput {
  const clusters = clusterColors(extracted.colors)

  const colors = clusters.map(cluster => ({
    value: cluster.representative,
    category: analyzeColor(cluster.representative),
    brightness: colorBrightness(cluster.representative),
    usedIn: [...new Set(cluster.usages.map(u => u.property))],
    hasHoverVariant: cluster.variants.length > 0,
    contexts: [...new Set(cluster.usages.map(u => u.component).filter(Boolean))] as string[]
  }))

  const spacingValues = detectSpacingScale(extracted.spacing)
  const usageCount: Record<number, number> = {}
  for (const s of extracted.spacing) {
    usageCount[s.value] = (usageCount[s.value] || 0) + 1
  }

  return {
    colors,
    spacing: { values: spacingValues, usageCount }
  }
}

// =============================================================================
// LLM Prompt
// =============================================================================

export const TOKEN_GENERATOR_PROMPT = `Du bist ein Design-Token-Generator für Mirror DSL.

## Aufgabe
Erstelle aus den analysierten Werten sinnvolle Token-Namen.

## Token-Namenskonvention
- Palette: \`$farbe-stufe\` (z.B. \`$grey-500\`, \`$blue-600\`)
- Semantisch: \`$name.property\` (z.B. \`$primary.bg\`, \`$muted.col\`)

## Kategorien

### Für Farben:
| Verwendung | Semantischer Name |
|------------|-------------------|
| Dunkle Farbe in background | \`$surface.bg\` oder \`$app.bg\` |
| Helle Farbe in color (auf dunkel) | \`$default.col\` oder \`$heading.col\` |
| Graue Farbe in color | \`$muted.col\` |
| Bunte Farbe mit hover-Variante | \`$primary.bg\` + \`$primary.hover.bg\` |
| Rote Farbe | \`$danger.bg\` oder \`$danger.col\` |
| Grüne Farbe | \`$success.bg\` |
| Farbe in border-color | \`$border.col\` |

### Für Spacing:
| Wert | Token |
|------|-------|
| 2-4 | \`$xs\` |
| 6-8 | \`$sm\` |
| 10-14 | \`$md\` |
| 15-20 | \`$lg\` |
| 22-32 | \`$xl\` |

## Output Format (JSON)
\`\`\`json
{
  "palette": {
    "$grey-900": "#27272A",
    "$blue-500": "#3B82F6"
  },
  "semantic": {
    "#27272A": "$surface.bg",
    "#3B82F6": "$primary.bg"
  },
  "spacing": {
    "16": "$lg",
    "8": "$sm"
  }
}
\`\`\`

## Regeln
1. Jede Farbe braucht EINEN semantischen Namen (den häufigsten Verwendungszweck)
2. Palette-Namen nach Farbfamilie + Helligkeit (100-900)
3. Spacing nur tokenisieren wenn es zur Skala passt
4. Keine Komponenten-spezifischen Token-Namen
`

// =============================================================================
// Code Refactoring
// =============================================================================

/**
 * Replace hardcoded values with tokens in code
 */
export function refactorCode(
  code: string,
  colorMapping: Record<string, string>,  // { "#27272A": "$surface.bg" }
  spacingMapping: Record<string, string> // { "16": "$lg" }
): string {
  let result = code

  // Sort colors by length (longest first) to avoid partial replacements
  // e.g., #3B82F620 should be replaced before #3B82F6
  const sortedColors = Object.entries(colorMapping)
    .sort(([a], [b]) => b.length - a.length)

  // Replace colors (case-insensitive, word boundary to avoid partial matches)
  for (const [hex, token] of sortedColors) {
    // Escape special regex chars and use word boundary
    const escapedHex = hex.replace('#', '#?')
    const regex = new RegExp(`${escapedHex}(?![A-Fa-f0-9])`, 'gi')
    result = result.replace(regex, token)
  }

  // Replace spacing in specific properties only
  for (const [value, token] of Object.entries(spacingMapping)) {
    for (const prop of SPACING_PROPERTIES) {
      const regex = new RegExp(`(${prop}\\s+)${value}\\b`, 'gi')
      result = result.replace(regex, `$1${token}`)
    }
  }

  return result
}

// =============================================================================
// Main Generator Function
// =============================================================================

export interface GenerateTokensResult {
  extracted: ExtractedValues
  llmInput: LLMTokenInput
  prompt: string
}

/**
 * Phase 1: Extract and analyze (deterministic)
 * Returns data ready for LLM
 */
export function analyzeForTokens(code: string): GenerateTokensResult {
  const extracted = extractValues(code)
  const llmInput = prepareForLLM(extracted)

  const userPrompt = `Analysiere diese Werte und erstelle Token-Vorschläge:

${JSON.stringify(llmInput, null, 2)}

Antworte NUR mit dem JSON-Objekt.`

  return {
    extracted,
    llmInput,
    prompt: userPrompt
  }
}

/**
 * Apply LLM suggestions to code
 */
export function applyTokenSuggestions(
  code: string,
  llmResponse: { palette: Record<string, string>; semantic: Record<string, string>; spacing: Record<string, string> }
): TokenSuggestion {
  const refactoredCode = refactorCode(code, llmResponse.semantic, llmResponse.spacing)

  return {
    palette: llmResponse.palette,
    semantic: llmResponse.semantic,
    refactoredCode
  }
}

export default analyzeForTokens
