/**
 * Combined Approach: Hybrid + Orchestrator
 *
 * 1. LLM analysiert Bild → semantische Struktur
 * 2. Pixel-Analyzer → präzise Werte
 * 3. Merger kombiniert beide
 * 4. LLM orchestriert Regelableitung
 * 5. Output: Mirror Code + abgeleitete Tokens
 */

import type {
  SemanticAnalysis,
  SemanticElement,
  Alignment,
  Position,
  ComponentType,
} from '../schema'
import type { MergedElement, MergedAnalysis } from '../schema'
import {
  detectTablePattern,
  generateTableCode,
  shouldApplyTableDetection,
  type TableStructure,
} from '../table-detector'
import {
  applyComponentPattern,
  getPrimitiveForType,
  generateFallbackCode,
  inferComponentType,
  getStylingForRole,
  findBestMatch,
  getAllDescendants,
  extractComponentDefinitions,
  generateComponentDefinitionCode,
  detectHierarchy,
  markNestedCards,
  detectComponentVariants,
  generateVariantCode,
  type ComponentDefinition,
  type HierarchyLevel,
  type ComponentVariant,
} from '../component-patterns'

// =============================================================================
// Types
// =============================================================================

export interface DerivedRule {
  type: 'gap' | 'radius' | 'color' | 'padding' | 'fontSize' | 'spacing'
  name: string
  value: string | number
  confidence: 'high' | 'medium' | 'low'
  usageCount: number
}

export interface SpacingSystem {
  baseUnit: number // e.g., 4 or 8
  confidence: number
  matchingValues: number[]
}

export interface CombinedResult {
  // From Hybrid
  mirrorCode: string
  structure: MergedElement

  // From Orchestrator
  derivedRules: DerivedRule[]
  insights: string[]

  // Final output with tokens
  optimizedCode: string
  tokensCode: string

  // Table detection (if applicable)
  tableStructure?: TableStructure

  // Fallback indicators
  usedFallbacks: FallbackUsage[]

  // Component definitions (extracted reusable patterns)
  componentDefinitions: ComponentDefinition[]
  componentDefinitionsCode: string

  // Hierarchy detection
  hierarchy?: HierarchyLevel

  // Component variants (e.g., PrimaryButton, SecondaryButton)
  componentVariants: ComponentVariant[]
  variantsCode: string
}

export interface FallbackUsage {
  type:
    | 'component-pattern'
    | 'role-styling'
    | 'structure-mismatch'
    | 'missing-children'
    | 'font-normalized'
    | 'structure-flattened'
  element: string
  details: string
}

// =============================================================================
// Font Size Normalization
// =============================================================================

/**
 * Normalize unrealistic font sizes detected by pixel analyzer
 * Common issues: 64px, 90px, 104px when actual is 14-24px
 */
const FONT_SIZE_CONSTRAINTS = {
  min: 8,
  max: 48,
  defaultBody: 14,
  defaultHeading: 18,
  defaultCaption: 12,
}

function normalizeFontSize(pixelFontSize: number | undefined, role?: string): number | undefined {
  if (!pixelFontSize) return undefined

  // If within reasonable range, keep it
  if (pixelFontSize >= FONT_SIZE_CONSTRAINTS.min && pixelFontSize <= FONT_SIZE_CONSTRAINTS.max) {
    return pixelFontSize
  }

  // Unrealistic value - use role-based defaults
  switch (role) {
    case 'heading':
      return 24
    case 'subheading':
    case 'title':
      return 18
    case 'body':
    case 'description':
    case 'message':
      return 14
    case 'label':
    case 'caption':
    case 'timestamp':
      return 12
    case 'value':
    case 'metric':
      return 28
    default:
      // Try to infer from the unrealistic value
      // Very large values often mean heading-level text
      if (pixelFontSize > 80) return 24
      if (pixelFontSize > 60) return 18
      return FONT_SIZE_CONSTRAINTS.defaultBody
  }
}

/**
 * Recursively normalize ALL font sizes in the entire structure tree
 * This is a global pass that catches unrealistic values even without semantic matches
 */
function normalizeAllFontSizes(element: MergedElement, ctx?: PipelineContext): void {
  // Normalize this element's font size
  if (element.fontSize) {
    const originalFs = element.fontSize
    const normalizedFs = normalizeFontSize(element.fontSize, element.role)
    if (normalizedFs && normalizedFs !== originalFs) {
      element.fontSize = normalizedFs
      if (ctx) {
        ctx.fallbacks.push({
          type: 'font-normalized',
          element: element.text || element.type || 'Element',
          details: `${originalFs}px → ${normalizedFs}px`,
        })
      }
    }
  }

  // Recursively normalize children
  if (element.children) {
    for (const child of element.children) {
      normalizeAllFontSizes(child, ctx)
    }
  }
}

// =============================================================================
// Structure Simplification
// =============================================================================

/**
 * Simplify structure by removing unnecessary wrapper frames
 * Common issues from pixel analyzer:
 * - Single-child frames that just add nesting
 * - Empty frames with no visual properties
 * - Frames where only bg color differs slightly from parent
 */
function simplifyStructure(element: MergedElement, ctx?: PipelineContext, parentBg?: string): void {
  if (!element.children) return

  // Process children first (bottom-up)
  for (const child of element.children) {
    simplifyStructure(child, ctx, element.backgroundColor)
  }

  // Flatten single-child wrapper frames
  const newChildren: MergedElement[] = []
  for (const child of element.children) {
    if (shouldFlatten(child, parentBg)) {
      // Lift grandchildren up
      if (child.children) {
        newChildren.push(...child.children)
        if (ctx) {
          ctx.fallbacks.push({
            type: 'structure-flattened',
            element: child.type || 'Frame',
            details: `Wrapper mit ${child.children.length} Kindern vereinfacht`,
          })
        }
      }
    } else {
      newChildren.push(child)
    }
  }

  element.children = newChildren
}

/**
 * Check if a frame should be flattened (removed as unnecessary wrapper)
 */
function shouldFlatten(element: MergedElement, parentBg?: string): boolean {
  // Must have exactly one child to be a potential wrapper
  if (!element.children || element.children.length !== 1) {
    return false
  }

  // Don't flatten if it has meaningful visual properties
  if (element.borderRadius && element.borderRadius > 0) return false
  if (element.borderWidth && element.borderWidth > 0) return false
  if (element.padding) return false
  if (element.gap) return false

  // Don't flatten if it has semantic meaning
  if (element.type && element.type !== 'Container') return false
  if (element.text) return false
  if (element.role) return false

  // Check if background color is different enough from parent
  if (element.backgroundColor && parentBg) {
    const colorDiff = getColorDifference(element.backgroundColor, parentBg)
    // Only flatten if colors are very similar (< 10 difference)
    if (colorDiff > 10) return false
  }

  // Don't flatten if background is a distinct color
  if (element.backgroundColor && !parentBg) {
    return false
  }

  return true
}

/**
 * Calculate simple color difference between two hex colors
 */
function getColorDifference(color1: string, color2: string): number {
  const parse = (hex: string) => {
    const clean = hex.replace('#', '')
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    }
  }

  try {
    const c1 = parse(color1)
    const c2 = parse(color2)
    return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b)
  } catch {
    return 255 // If parsing fails, assume different
  }
}

// =============================================================================
// Rule Derivation (Orchestrator part)
// =============================================================================

/**
 * Track color usage with semantic context
 */
export interface ColorUsage {
  color: string
  context: 'background' | 'surface' | 'card' | 'button' | 'text' | 'border' | 'accent' | 'muted'
  role?: string
  count: number
}

/**
 * Determine semantic context of a color based on element properties
 */
function getColorContext(element: MergedElement): ColorUsage['context'] {
  // Check if it's a card (has padding, radius, children)
  if (element.borderRadius && element.padding && element.children?.length) {
    return 'card'
  }

  // Check if it's a button
  if (element.type === 'Button' || element.role === 'button' || element.role === 'cta') {
    return 'button'
  }

  // Check if it's an accent/interactive element
  if (element.role === 'action' || element.role === 'link') {
    return 'accent'
  }

  // Check if it's a surface (large area, no padding)
  if (element.type === 'Frame' && !element.borderRadius && element.children?.length) {
    return 'surface'
  }

  // Check if it's muted/secondary
  if (element.role === 'secondary' || element.role === 'caption' || element.role === 'timestamp') {
    return 'muted'
  }

  return 'background'
}

/**
 * Derive semantic token name from color usage
 */
function getSemanticColorName(usage: ColorUsage, index: number): string {
  const { context, color } = usage

  // Check if it's a known accent color
  if (isAccentColor(color)) {
    if (context === 'button') return 'button.primary.bg'
    return 'accent.bg'
  }

  // Check if it's a gray/neutral
  const rgb = parseHexColor(color)
  if (rgb) {
    const { r, g, b } = rgb
    const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20

    if (isGray) {
      const lightness = (r + g + b) / 3
      if (lightness < 30) return 'surface.dark.bg'
      if (lightness < 60) return 'surface.bg'
      if (lightness < 100) return 'card.bg'
      if (lightness < 150) return 'muted.bg'
      return 'surface.light.bg'
    }
  }

  // Context-based naming
  switch (context) {
    case 'card':
      return index === 0 ? 'card.bg' : `card.${index + 1}.bg`
    case 'button':
      return index === 0 ? 'button.bg' : `button.${index + 1}.bg`
    case 'surface':
      return index === 0 ? 'surface.bg' : `surface.${index + 1}.bg`
    case 'muted':
      return 'muted.bg'
    default:
      return `color.${index + 1}.bg`
  }
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) return null
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}

export function deriveRules(
  element: MergedElement,
  depth = 0
): {
  gaps: number[]
  radii: number[]
  colors: string[]
  paddings: number[]
  fontSizes: number[]
} {
  const result = {
    gaps: [] as number[],
    radii: [] as number[],
    colors: [] as string[],
    paddings: [] as number[],
    fontSizes: [] as number[],
  }

  // Collect from current element
  if (element.gap) result.gaps.push(element.gap)
  if (element.borderRadius) result.radii.push(element.borderRadius)
  if (element.backgroundColor) result.colors.push(element.backgroundColor.toLowerCase())
  if (element.padding) {
    const { top, right, bottom, left } = element.padding
    if (top > 0) result.paddings.push(top)
    if (right > 0 && right !== top) result.paddings.push(right)
  }
  if (element.fontSize) result.fontSizes.push(element.fontSize)

  // Recursively collect from children
  if (element.children) {
    for (const child of element.children) {
      const childResult = deriveRules(child, depth + 1)
      result.gaps.push(...childResult.gaps)
      result.radii.push(...childResult.radii)
      result.colors.push(...childResult.colors)
      result.paddings.push(...childResult.paddings)
      result.fontSizes.push(...childResult.fontSizes)
    }
  }

  return result
}

/**
 * Derive rules with semantic color context
 */
export function deriveRulesWithContext(
  element: MergedElement,
  depth = 0
): {
  gaps: number[]
  radii: number[]
  colors: string[]
  colorUsages: ColorUsage[]
  paddings: number[]
  fontSizes: number[]
  textColors: string[]
} {
  const result = {
    gaps: [] as number[],
    radii: [] as number[],
    colors: [] as string[],
    colorUsages: [] as ColorUsage[],
    paddings: [] as number[],
    fontSizes: [] as number[],
    textColors: [] as string[],
  }

  // Collect from current element
  if (element.gap) result.gaps.push(element.gap)
  if (element.borderRadius) result.radii.push(element.borderRadius)
  if (element.backgroundColor) {
    const color = element.backgroundColor.toLowerCase()
    result.colors.push(color)
    result.colorUsages.push({
      color,
      context: getColorContext(element),
      role: element.role,
      count: 1,
    })
  }
  if (element.textColor) {
    result.textColors.push(element.textColor.toLowerCase())
  }
  if (element.padding) {
    const { top, right } = element.padding
    if (top > 0) result.paddings.push(top)
    if (right > 0 && right !== top) result.paddings.push(right)
  }
  if (element.fontSize) result.fontSizes.push(element.fontSize)

  // Recursively collect from children
  if (element.children) {
    for (const child of element.children) {
      const childResult = deriveRulesWithContext(child, depth + 1)
      result.gaps.push(...childResult.gaps)
      result.radii.push(...childResult.radii)
      result.colors.push(...childResult.colors)
      result.colorUsages.push(...childResult.colorUsages)
      result.paddings.push(...childResult.paddings)
      result.fontSizes.push(...childResult.fontSizes)
      result.textColors.push(...childResult.textColors)
    }
  }

  return result
}

/**
 * Aggregate color usages by color value
 */
function aggregateColorUsages(usages: ColorUsage[]): ColorUsage[] {
  const colorMap = new Map<string, ColorUsage>()

  for (const usage of usages) {
    const existing = colorMap.get(usage.color)
    if (existing) {
      existing.count++
      // Prefer more specific contexts
      if (usage.context === 'button' || usage.context === 'card') {
        existing.context = usage.context
      }
    } else {
      colorMap.set(usage.color, { ...usage })
    }
  }

  return [...colorMap.values()].sort((a, b) => b.count - a.count)
}

export function analyzeAndCreateRules(measurements: ReturnType<typeof deriveRules>): {
  rules: DerivedRule[]
  insights: string[]
} {
  const rules: DerivedRule[] = []
  const insights: string[] = []

  // Analyze gaps
  const uniqueGaps = [...new Set(measurements.gaps)].sort((a, b) => a - b)
  if (uniqueGaps.length === 1 && measurements.gaps.length > 1) {
    rules.push({
      type: 'gap',
      name: 'space.gap',
      value: uniqueGaps[0],
      confidence: 'high',
      usageCount: measurements.gaps.length,
    })
    insights.push(`Konsistenter Gap: ${uniqueGaps[0]}px (${measurements.gaps.length}x verwendet)`)
  } else if (uniqueGaps.length === 2) {
    rules.push({
      type: 'gap',
      name: 'space.sm',
      value: uniqueGaps[0],
      confidence: 'medium',
      usageCount: measurements.gaps.filter(g => g === uniqueGaps[0]).length,
    })
    rules.push({
      type: 'gap',
      name: 'space.md',
      value: uniqueGaps[1],
      confidence: 'medium',
      usageCount: measurements.gaps.filter(g => g === uniqueGaps[1]).length,
    })
    insights.push(`Gap-System: ${uniqueGaps[0]}px (small), ${uniqueGaps[1]}px (medium)`)
  }

  // Analyze radii
  const uniqueRadii = [...new Set(measurements.radii)].filter(r => r > 0).sort((a, b) => a - b)
  if (uniqueRadii.length === 1) {
    // Even a single radius is useful as a token
    rules.push({
      type: 'radius',
      name: 'radius.default',
      value: uniqueRadii[0],
      confidence: measurements.radii.length > 1 ? 'high' : 'medium',
      usageCount: measurements.radii.length,
    })
    insights.push(`Radius: ${uniqueRadii[0]}px`)
  } else if (uniqueRadii.length === 2) {
    rules.push({
      type: 'radius',
      name: 'radius.sm',
      value: uniqueRadii[0],
      confidence: 'medium',
      usageCount: measurements.radii.filter(r => r === uniqueRadii[0]).length,
    })
    rules.push({
      type: 'radius',
      name: 'radius.lg',
      value: uniqueRadii[1],
      confidence: 'medium',
      usageCount: measurements.radii.filter(r => r === uniqueRadii[1]).length,
    })
    insights.push(`Radius-System: ${uniqueRadii[0]}px (small), ${uniqueRadii[1]}px (large)`)
  } else if (uniqueRadii.length >= 3) {
    // 3-level radius system: sm, md, lg
    const radiusNames = ['sm', 'md', 'lg', 'xl']
    uniqueRadii.slice(0, 4).forEach((rad, i) => {
      const name = radiusNames[i] || `r${i}`
      const count = measurements.radii.filter(r => r === rad).length
      rules.push({
        type: 'radius',
        name: `radius.${name}`,
        value: rad,
        confidence: count > 1 ? 'high' : 'medium',
        usageCount: count,
      })
    })
    insights.push(
      `Radius-System: ${uniqueRadii
        .slice(0, 4)
        .map((r, i) => `${r}px (${radiusNames[i]})`)
        .join(', ')}`
    )
  }

  // Analyze colors
  const colorCounts = new Map<string, number>()
  for (const color of measurements.colors) {
    colorCounts.set(color, (colorCounts.get(color) || 0) + 1)
  }

  // Filter out common background colors
  const significantColors = [...colorCounts.entries()]
    .filter(([color]) => !['#ffffff', '#f0f0f0', '#fafafa', '#000000'].includes(color))
    .sort((a, b) => b[1] - a[1])

  if (significantColors.length > 0) {
    const [primaryColor, primaryCount] = significantColors[0]
    rules.push({
      type: 'color',
      name: 'color.primary.bg',
      value: primaryColor,
      confidence: primaryCount > 1 ? 'high' : 'medium',
      usageCount: primaryCount,
    })

    if (significantColors.length > 1) {
      const [secondaryColor, secondaryCount] = significantColors[1]
      rules.push({
        type: 'color',
        name: 'color.secondary.bg',
        value: secondaryColor,
        confidence: secondaryCount > 1 ? 'high' : 'medium',
        usageCount: secondaryCount,
      })
    }

    insights.push(`Farbpalette: ${significantColors.map(([c]) => c).join(', ')}`)
  }

  // Analyze paddings
  const uniquePaddings = [...new Set(measurements.paddings)]
    .filter(p => p > 0)
    .sort((a, b) => a - b)
  if (uniquePaddings.length === 1 && measurements.paddings.length > 1) {
    rules.push({
      type: 'padding',
      name: 'space.pad',
      value: uniquePaddings[0],
      confidence: 'high',
      usageCount: measurements.paddings.length,
    })
    insights.push(`Konsistentes Padding: ${uniquePaddings[0]}px`)
  }

  // Analyze font sizes - detect typography hierarchy
  const uniqueFontSizes = [...new Set(measurements.fontSizes)]
    .filter(fs => fs > 0)
    .sort((a, b) => b - a)
  if (uniqueFontSizes.length >= 2) {
    // Map to semantic names based on relative sizes
    const fontSizeNames = ['h1', 'h2', 'body', 'caption', 'small']
    uniqueFontSizes.slice(0, 5).forEach((size, i) => {
      const name = fontSizeNames[i] || `fs${i}`
      const count = measurements.fontSizes.filter(fs => fs === size).length
      rules.push({
        type: 'fontSize',
        name: `type.${name}.fs`,
        value: size,
        confidence: count > 1 ? 'high' : 'medium',
        usageCount: count,
      })
    })
    insights.push(`Typografie-System: ${uniqueFontSizes.slice(0, 3).join('px, ')}px`)
  } else if (uniqueFontSizes.length === 1) {
    rules.push({
      type: 'fontSize',
      name: 'type.body.fs',
      value: uniqueFontSizes[0],
      confidence: 'medium',
      usageCount: measurements.fontSizes.length,
    })
  }

  // Detect spacing system (4px or 8px grid)
  const allSpacingValues = [
    ...measurements.gaps,
    ...measurements.paddings,
    ...measurements.radii,
  ].filter(v => v > 0)

  if (allSpacingValues.length >= 3) {
    const spacingSystem = detectSpacingSystem(allSpacingValues)
    if (spacingSystem && spacingSystem.confidence >= 0.7) {
      rules.push({
        type: 'spacing',
        name: 'space.base',
        value: spacingSystem.baseUnit,
        confidence: spacingSystem.confidence >= 0.9 ? 'high' : 'medium',
        usageCount: spacingSystem.matchingValues.length,
      })
      insights.push(
        `Spacing-System: ${spacingSystem.baseUnit}px Grid (${Math.round(spacingSystem.confidence * 100)}% Übereinstimmung)`
      )
    }
  }

  // Detect accent colors (bright colors that stand out)
  const accentColors = detectAccentColors(measurements.colors)
  if (accentColors.length > 0) {
    const [accent, count] = accentColors[0]
    // Only add if not already added as primary
    const existingPrimary = rules.find(r => r.name === 'color.primary.bg')
    if (!existingPrimary || existingPrimary.value !== accent) {
      rules.push({
        type: 'color',
        name: 'color.accent.bg',
        value: accent,
        confidence: count > 1 ? 'high' : 'medium',
        usageCount: count,
      })
      insights.push(`Akzentfarbe: ${accent}`)
    }
  }

  return { rules, insights }
}

/**
 * Enhanced rule analysis with semantic color names
 */
export function analyzeAndCreateRulesWithContext(
  measurements: ReturnType<typeof deriveRulesWithContext>
): {
  rules: DerivedRule[]
  insights: string[]
} {
  // Start with basic analysis
  const { rules, insights } = analyzeAndCreateRules(measurements)

  // Replace generic color names with semantic ones
  const aggregatedColors = aggregateColorUsages(measurements.colorUsages)

  // Remove old color rules
  const nonColorRules = rules.filter(r => r.type !== 'color')

  // Add semantic color rules
  const semanticColorRules: DerivedRule[] = []
  const usedNames = new Set<string>()

  // First pass: accent colors
  for (const usage of aggregatedColors) {
    if (isAccentColor(usage.color)) {
      let name = usage.context === 'button' ? 'button.primary.bg' : 'accent.bg'
      if (usedNames.has(name)) {
        name = `accent.${usedNames.size + 1}.bg`
      }
      usedNames.add(name)
      semanticColorRules.push({
        type: 'color',
        name,
        value: usage.color,
        confidence: usage.count > 1 ? 'high' : 'medium',
        usageCount: usage.count,
      })
    }
  }

  // Second pass: surface/card colors
  for (const usage of aggregatedColors) {
    if (isAccentColor(usage.color)) continue // Already handled

    const rgb = parseHexColor(usage.color)
    if (!rgb) continue

    const { r, g, b } = rgb
    const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20
    const lightness = (r + g + b) / 3

    let name: string
    if (isGray) {
      if (lightness < 20) name = 'surface.dark.bg'
      else if (lightness < 40) name = 'surface.bg'
      else if (lightness < 80) name = 'card.bg'
      else if (lightness < 150) name = 'muted.bg'
      else name = 'surface.light.bg'
    } else {
      // Non-gray, non-accent color
      name =
        usage.context === 'card' ? 'card.accent.bg' : `color.${semanticColorRules.length + 1}.bg`
    }

    // Avoid duplicates
    if (usedNames.has(name)) {
      const baseCount = [...usedNames].filter(n => n.startsWith(name.split('.')[0])).length
      name = `${name.split('.')[0]}.${baseCount + 1}.bg`
    }
    usedNames.add(name)

    semanticColorRules.push({
      type: 'color',
      name,
      value: usage.color,
      confidence: usage.count > 1 ? 'high' : 'medium',
      usageCount: usage.count,
    })
  }

  // Add text color tokens
  const textColorCounts = new Map<string, number>()
  for (const color of measurements.textColors) {
    textColorCounts.set(color, (textColorCounts.get(color) || 0) + 1)
  }

  const sortedTextColors = [...textColorCounts.entries()]
    .filter(([color]) => !['#ffffff', '#000000'].includes(color))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  for (let i = 0; i < sortedTextColors.length; i++) {
    const [color, count] = sortedTextColors[i]
    const rgb = parseHexColor(color)
    if (!rgb) continue

    const lightness = (rgb.r + rgb.g + rgb.b) / 3
    let name: string

    if (lightness > 200) name = 'text.primary.col'
    else if (lightness > 120) name = 'text.secondary.col'
    else name = 'text.muted.col'

    if (!usedNames.has(name)) {
      usedNames.add(name)
      semanticColorRules.push({
        type: 'color',
        name,
        value: color,
        confidence: count > 1 ? 'high' : 'medium',
        usageCount: count,
      })
    }
  }

  // Combine rules
  const finalRules = [...nonColorRules, ...semanticColorRules]

  // Update insights
  const colorInsight = insights.find(i => i.startsWith('Farbpalette:'))
  if (colorInsight) {
    const semanticNames = semanticColorRules
      .slice(0, 5)
      .map(r => r.name.replace('.bg', '').replace('.col', ''))
    insights.push(`Semantische Token: ${semanticNames.join(', ')}`)
  }

  return { rules: finalRules, insights }
}

/**
 * Detect if spacing values follow a consistent grid system (4px or 8px)
 */
function detectSpacingSystem(values: number[]): SpacingSystem | null {
  const candidates = [4, 8]
  const TOLERANCE = 2 // Allow values within 2px of grid

  for (const base of candidates) {
    // Count values that are close to a grid multiple (with tolerance)
    const matching = values.filter(v => {
      const remainder = v % base
      return remainder <= TOLERANCE || base - remainder <= TOLERANCE
    })
    const confidence = matching.length / values.length

    if (confidence >= 0.6) {
      return {
        baseUnit: base,
        confidence,
        matchingValues: matching,
      }
    }
  }

  return null
}

/**
 * Normalize a spacing value to the nearest grid value
 * E.g., 18 → 16 (4px grid) or 18 → 16 (8px grid)
 */
function normalizeToGrid(value: number, base: number): number {
  const lower = Math.floor(value / base) * base
  const upper = Math.ceil(value / base) * base
  return value - lower <= upper - value ? lower : upper
}

/**
 * Detect accent colors (saturated, bright colors that typically indicate interactive elements)
 */
function detectAccentColors(colors: string[]): [string, number][] {
  const colorCounts = new Map<string, number>()
  for (const color of colors) {
    colorCounts.set(color, (colorCounts.get(color) || 0) + 1)
  }

  // Filter for accent-like colors (saturated, not grayscale)
  const accentColors: [string, number][] = []

  for (const [color, count] of colorCounts.entries()) {
    if (isAccentColor(color)) {
      accentColors.push([color, count])
    }
  }

  return accentColors.sort((a, b) => b[1] - a[1])
}

/**
 * Check if a color is an accent color (saturated, not gray)
 */
function isAccentColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // Calculate saturation (simple approach)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  // Skip grayscale colors
  if (delta < 30) return false

  // Skip very dark or very light colors
  const lightness = (max + min) / 2
  if (lightness < 40 || lightness > 230) return false

  // Check for common accent color ranges
  // Blues (#2271C1, #2563eb, etc.)
  if (b > r && b > g && b > 150) return true
  // Greens (#10b981, #22c55e, etc.)
  if (g > r && g > b && g > 150) return true
  // Reds/Oranges (#ef4444, #f59e0b, etc.)
  if (r > g && r > b && r > 180) return true
  // Purples (#7c3aed, #8b5cf6, etc.)
  if (r > 100 && b > 150 && g < 100) return true

  return false
}

// =============================================================================
// Code Optimization (apply derived tokens)
// =============================================================================

export function generateTokensCode(rules: DerivedRule[]): string {
  const lines: string[] = ['// Abgeleitete Tokens', '']

  // Group by type for better organization
  const groups = {
    spacing: rules.filter(r => r.type === 'spacing' || r.type === 'gap' || r.type === 'padding'),
    radius: rules.filter(r => r.type === 'radius'),
    color: rules.filter(r => r.type === 'color'),
    fontSize: rules.filter(r => r.type === 'fontSize'),
  }

  for (const [groupName, groupRules] of Object.entries(groups)) {
    const validRules = groupRules.filter(r => r.confidence === 'high' || r.usageCount > 1)
    if (validRules.length > 0) {
      lines.push(`// ${groupName}`)
      for (const rule of validRules) {
        lines.push(`${rule.name}: ${rule.value}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function optimizeCodeWithTokens(code: string, rules: DerivedRule[]): string {
  let optimized = code

  // Replace values with token references
  for (const rule of rules) {
    if (rule.confidence !== 'high' && rule.usageCount <= 1) continue

    const tokenRef = `$${rule.name.split('.')[0]}`

    switch (rule.type) {
      case 'gap':
        // Replace gap N with gap $token
        optimized = optimized.replace(new RegExp(`gap ${rule.value}\\b`, 'g'), `gap ${tokenRef}`)
        break
      case 'radius':
        optimized = optimized.replace(new RegExp(`rad ${rule.value}\\b`, 'g'), `rad ${tokenRef}`)
        break
      case 'color':
        optimized = optimized.replace(new RegExp(`bg ${rule.value}`, 'gi'), `bg ${tokenRef}`)
        break
      case 'padding':
        // Only replace simple padding (all sides equal)
        optimized = optimized.replace(new RegExp(`pad ${rule.value}\\b`, 'g'), `pad ${tokenRef}`)
        break
      case 'fontSize':
        // Replace fs N with fs $token
        optimized = optimized.replace(new RegExp(`fs ${rule.value}\\b`, 'g'), `fs ${tokenRef}`)
        break
      // spacing is informational, not directly replaced
    }
  }

  return optimized
}

// =============================================================================
// Main Pipeline
// =============================================================================

export interface PipelineInput {
  semanticAnalysis: SemanticAnalysis
  pixelCode: string // Output from NestedRectangleAnalyzer
}

// Context for tracking fallback usage during pipeline execution
interface PipelineContext {
  fallbacks: FallbackUsage[]
}

export function runCombinedPipeline(input: PipelineInput): CombinedResult {
  // Initialize context
  const ctx: PipelineContext = { fallbacks: [] }

  // Step 1: Parse pixel analysis to structure with semantic enhancement
  const structure = parsePixelCodeToStructure(input.pixelCode, input.semanticAnalysis, ctx)

  // Step 1.5: Global font size normalization pass
  // This catches ALL unrealistic font sizes, even those without semantic matches
  normalizeAllFontSizes(structure, ctx)

  // Step 1.6: Structure simplification - remove unnecessary wrapper frames
  simplifyStructure(structure, ctx)

  // Step 2: Detect table pattern if semantic analysis suggests it
  let tableStructure: TableStructure | undefined
  let mirrorCode: string

  if (shouldApplyTableDetection(input.semanticAnalysis.componentType)) {
    tableStructure = detectTablePattern(structure) || undefined

    if (tableStructure?.isTable) {
      // Generate optimized table code
      mirrorCode = generateTableCode(tableStructure, structure)
    } else {
      // Fall back to regular code generation
      mirrorCode = generateMirrorCode(structure)
    }
  } else {
    mirrorCode = generateMirrorCode(structure)
  }

  // Step 3: Derive rules (Orchestrator) - now with semantic context
  const measurements = deriveRulesWithContext(structure)
  const { rules, insights: baseInsights } = analyzeAndCreateRulesWithContext(measurements)

  // Add table-specific insights
  const insights = [...baseInsights]
  if (tableStructure?.isTable) {
    insights.unshift(
      `Tabelle erkannt: ${tableStructure.rows.length} Zeilen, ${tableStructure.columns.length} Spalten (${Math.round(tableStructure.confidence * 100)}% Konfidenz)`
    )
    if (tableStructure.headerRow !== undefined && tableStructure.headerRow >= 0) {
      insights.push('Header-Zeile erkannt')
    }
  }

  // Add fallback insights
  if (ctx.fallbacks.length > 0) {
    const patternFallbacks = ctx.fallbacks.filter(f => f.type === 'component-pattern').length
    const roleFallbacks = ctx.fallbacks.filter(f => f.type === 'role-styling').length
    const missingFallbacks = ctx.fallbacks.filter(f => f.type === 'missing-children').length
    const fontNormalized = ctx.fallbacks.filter(f => f.type === 'font-normalized').length
    const structureFlattened = ctx.fallbacks.filter(f => f.type === 'structure-flattened').length

    if (fontNormalized > 0) {
      insights.push(
        `${fontNormalized} Font-Größen normalisiert (unrealistische Pixel-Werte korrigiert)`
      )
    }
    if (patternFallbacks > 0) {
      insights.push(`${patternFallbacks} Elemente mit Component-Pattern-Defaults`)
    }
    if (roleFallbacks > 0) {
      insights.push(`${roleFallbacks} Elemente mit Role-based Styling`)
    }
    if (missingFallbacks > 0) {
      insights.push(`${missingFallbacks} fehlende Kinder aus Semantic ergänzt`)
    }
    if (structureFlattened > 0) {
      insights.push(`${structureFlattened} verschachtelte Strukturen vereinfacht`)
    }
  }

  // Step 4: Generate optimized code with tokens
  const tokensCode = generateTokensCode(rules)
  const optimizedCode = optimizeCodeWithTokens(mirrorCode, rules)

  // Step 5: Extract reusable component definitions
  const componentDefinitions = extractComponentDefinitions(structure)
  const componentDefinitionsCode = generateComponentDefinitionCode(componentDefinitions)

  // Add component definitions insight
  if (componentDefinitions.length > 0) {
    insights.push(
      `${componentDefinitions.length} wiederverwendbare Komponenten-Definitionen extrahiert`
    )
  }

  // Step 6: Detect hierarchy (Card-in-Card, Section containers, Lists)
  markNestedCards(structure)
  const hierarchy = detectHierarchy(structure)

  // Count hierarchy levels for insight
  const hierarchyStats = countHierarchyLevels(hierarchy)
  if (hierarchyStats.cards > 0 || hierarchyStats.sections > 0 || hierarchyStats.lists > 0) {
    const parts: string[] = []
    if (hierarchyStats.cards > 0) parts.push(`${hierarchyStats.cards} Cards`)
    if (hierarchyStats.nestedCards > 0) parts.push(`${hierarchyStats.nestedCards} verschachtelt`)
    if (hierarchyStats.sections > 0) parts.push(`${hierarchyStats.sections} Sections`)
    if (hierarchyStats.lists > 0) parts.push(`${hierarchyStats.lists} Listen`)
    insights.push(`Hierarchie: ${parts.join(', ')}`)
  }

  // Step 7: Detect component variants (e.g., PrimaryButton, SecondaryButton)
  const componentVariants = detectComponentVariants(componentDefinitions)
  let variantsCode = ''
  if (componentVariants.length > 0) {
    variantsCode = componentVariants.map(v => generateVariantCode(v)).join('\n\n')
    insights.push(`${componentVariants.length} Komponenten-Varianten erkannt`)
  }

  return {
    mirrorCode,
    structure,
    derivedRules: rules,
    insights,
    optimizedCode,
    tokensCode,
    tableStructure,
    usedFallbacks: ctx.fallbacks,
    componentDefinitions,
    componentDefinitionsCode,
    hierarchy,
    componentVariants,
    variantsCode,
  }
}

/**
 * Count hierarchy levels for insights
 */
function countHierarchyLevels(hierarchy: HierarchyLevel): {
  cards: number
  nestedCards: number
  sections: number
  lists: number
  groups: number
} {
  let cards = 0
  let nestedCards = 0
  let sections = 0
  let lists = 0
  let groups = 0

  function traverse(level: HierarchyLevel, insideCard = false): void {
    switch (level.type) {
      case 'card':
        cards++
        if (insideCard) nestedCards++
        break
      case 'section':
        sections++
        break
      case 'list':
        lists++
        break
      case 'group':
        groups++
        break
    }

    for (const child of level.children) {
      traverse(child, level.type === 'card' || insideCard)
    }
  }

  traverse(hierarchy)
  return { cards, nestedCards, sections, lists, groups }
}

// =============================================================================
// Helpers
// =============================================================================

function parsePixelCodeToStructure(
  pixelCode: string,
  semantic: SemanticAnalysis,
  ctx?: PipelineContext
): MergedElement {
  const lines = pixelCode.split('\n').filter(l => l.trim())

  // Simple parser - assumes first line is root
  // Get grow from semantic root (check if defined in a "root" element pattern)
  const rootGrow = (semantic as any).grow

  const root: MergedElement = {
    type: semantic.componentType || 'Container',
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    children: [],
    // Apply semantic layout hints from LLM
    alignment: semantic.alignment,
    layout: semantic.layout,
    grow: rootGrow,
  }

  let currentParent = root
  let currentIndent = -1
  const stack: { element: MergedElement; indent: number }[] = []

  for (const line of lines) {
    const indent = line.search(/\S/)
    const trimmed = line.trim()

    // Parse properties
    const element: MergedElement = {
      type: 'Container',
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    }

    // Determine type
    if (trimmed.startsWith('Text')) {
      element.type = 'Text'
      const textMatch = trimmed.match(/Text\s+"([^"]+)"/)
      if (textMatch) element.text = textMatch[1]
    } else if (trimmed.startsWith('Button')) {
      element.type = 'Button'
      const textMatch = trimmed.match(/Button\s+"([^"]+)"/)
      if (textMatch) element.text = textMatch[1]
    } else if (trimmed.startsWith('Icon')) {
      element.type = 'Icon'
      const iconMatch = trimmed.match(/Icon\s+"([^"]+)"/)
      if (iconMatch) element.iconName = iconMatch[1]
    }

    // Parse common properties
    const wMatch = trimmed.match(/w\s+(\d+)/)
    const hMatch = trimmed.match(/h\s+(\d+)/)
    if (wMatch) element.bounds.width = parseInt(wMatch[1])
    if (hMatch) element.bounds.height = parseInt(hMatch[1])

    const bgMatch = trimmed.match(/bg\s+(#[a-fA-F0-9]+)/)
    if (bgMatch) element.backgroundColor = bgMatch[1]

    const colMatch = trimmed.match(/col\s+(#[a-fA-F0-9]+|white)/)
    if (colMatch) element.color = colMatch[1] === 'white' ? '#ffffff' : colMatch[1]

    const radMatch = trimmed.match(/rad\s+(\d+)/)
    if (radMatch) element.borderRadius = parseInt(radMatch[1])

    const gapMatch = trimmed.match(/gap\s+(\d+)/)
    if (gapMatch) element.gap = parseInt(gapMatch[1])

    if (trimmed.includes(' hor')) element.layout = 'horizontal'

    const padMatch = trimmed.match(/pad\s+(\d+)(?:\s+(\d+))?/)
    if (padMatch) {
      const v = parseInt(padMatch[1])
      const h = padMatch[2] ? parseInt(padMatch[2]) : v
      element.padding = { top: v, right: h, bottom: v, left: h }
    }

    const borMatch = trimmed.match(/bor\s+(\d+)/)
    const bocMatch = trimmed.match(/boc\s+(#[a-fA-F0-9]+)/)
    if (borMatch) element.borderWidth = parseInt(borMatch[1])
    if (bocMatch) element.borderColor = bocMatch[1]

    const fsMatch = trimmed.match(/fs\s+(\d+)/)
    if (fsMatch) element.fontSize = parseInt(fsMatch[1])

    // Build tree
    if (indent === 0) {
      // Root element - copy properties to root
      Object.assign(root, element)
      root.type = semantic.componentType || element.type
      currentParent = root
      currentIndent = 0
      stack.length = 0
      stack.push({ element: root, indent: 0 })
    } else {
      // Find parent
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop()
      }

      if (stack.length > 0) {
        const parent = stack[stack.length - 1].element
        if (!parent.children) parent.children = []
        parent.children.push(element)
      }

      stack.push({ element, indent })
    }
  }

  // Apply semantic types and layout hints to children if available
  if (semantic.children && root.children) {
    applySemanticToChildren(semantic.children, root.children, ctx)
  }

  return root
}

/**
 * Recursively apply semantic properties to pixel-detected children
 * Uses smart matching to handle structure mismatches
 */
function applySemanticToChildren(
  semanticChildren: SemanticElement[],
  pixelChildren: MergedElement[],
  ctx?: PipelineContext
): void {
  // If count matches, do 1:1 mapping
  if (semanticChildren.length === pixelChildren.length) {
    for (let i = 0; i < semanticChildren.length; i++) {
      applySemanticToElement(semanticChildren[i], pixelChildren[i], ctx)
    }
    return
  }

  // If pixel has fewer children, there might be a wrapper
  // E.g., semantic has 3 children but pixel has 1 wrapper with 3 children
  if (pixelChildren.length === 1 && pixelChildren[0].children) {
    const wrapper = pixelChildren[0]
    if (wrapper.children.length === semanticChildren.length) {
      // Apply to wrapper's children instead
      for (let i = 0; i < semanticChildren.length; i++) {
        applySemanticToElement(semanticChildren[i], wrapper.children[i], ctx)
      }
      return
    }
  }

  // Track structure mismatch
  if (ctx && semanticChildren.length !== pixelChildren.length) {
    ctx.fallbacks.push({
      type: 'structure-mismatch',
      element: `children`,
      details: `Semantic: ${semanticChildren.length}, Pixel: ${pixelChildren.length}`,
    })
  }

  // Fall back to matching what we can
  for (let i = 0; i < Math.min(semanticChildren.length, pixelChildren.length); i++) {
    applySemanticToElement(semanticChildren[i], pixelChildren[i], ctx)
  }
}

/**
 * Apply semantic properties to a single element
 */
function applySemanticToElement(
  semChild: SemanticElement,
  pixChild: MergedElement,
  ctx?: PipelineContext
): void {
  // Apply type and content
  if (semChild.type) pixChild.type = semChild.type
  if (semChild.text && !pixChild.text) pixChild.text = semChild.text
  if (semChild.role) pixChild.role = semChild.role
  if (semChild.placeholder) pixChild.placeholder = semChild.placeholder
  if (semChild.iconName) pixChild.iconName = semChild.iconName
  if (semChild.inputType) pixChild.inputType = semChild.inputType
  if (semChild.state) pixChild.state = semChild.state

  // Apply semantic layout hints (these CANNOT be detected from pixels)
  if (semChild.layout) pixChild.layout = semChild.layout
  if (semChild.alignment) pixChild.alignment = semChild.alignment
  if (semChild.grow) pixChild.grow = semChild.grow
  if (semChild.shrink) pixChild.shrink = semChild.shrink
  if (semChild.position) pixChild.position = semChild.position

  // ==========================================================================
  // Font Size Normalization - fix unrealistic pixel values
  // ==========================================================================
  if (pixChild.fontSize) {
    const originalFs = pixChild.fontSize
    const normalizedFs = normalizeFontSize(pixChild.fontSize, semChild.role)
    if (normalizedFs && normalizedFs !== originalFs) {
      pixChild.fontSize = normalizedFs
      if (ctx) {
        ctx.fallbacks.push({
          type: 'font-normalized',
          element: semChild.text || semChild.type || 'Element',
          details: `${originalFs}px → ${normalizedFs}px (Role: ${semChild.role || 'default'})`,
        })
      }
    }
  }

  // ==========================================================================
  // Normalize font sizes in children recursively (before pattern application)
  // ==========================================================================
  if (pixChild.children) {
    normalizeChildrenFontSizes(pixChild.children, ctx)
  }

  // Apply component pattern defaults for missing values
  const beforePattern = { ...pixChild }
  const enhanced = applyComponentPattern(pixChild, semChild.type)
  Object.assign(pixChild, enhanced)

  // Track if pattern defaults were applied
  if (ctx) {
    const patternApplied =
      (!beforePattern.borderRadius && pixChild.borderRadius) ||
      (!beforePattern.padding && pixChild.padding) ||
      (!beforePattern.gap && pixChild.gap)
    if (patternApplied) {
      ctx.fallbacks.push({
        type: 'component-pattern',
        element: semChild.type || 'Element',
        details: `Defaults für ${semChild.type} angewendet`,
      })
    }
  }

  // Apply role-based styling hints if pixel values are missing
  if (semChild.role) {
    const roleStyling = getStylingForRole(semChild.role)
    let roleApplied = false

    if (roleStyling.suggestedColor && !pixChild.color) {
      pixChild.color = roleStyling.suggestedColor
      roleApplied = true
    }
    if (roleStyling.suggestedBackground && !pixChild.backgroundColor) {
      pixChild.backgroundColor = roleStyling.suggestedBackground
      roleApplied = true
    }
    if (roleStyling.suggestedFontSize && !pixChild.fontSize) {
      pixChild.fontSize = roleStyling.suggestedFontSize
      roleApplied = true
    }
    if (roleStyling.suggestedFontWeight && !pixChild.fontWeight) {
      pixChild.fontWeight = roleStyling.suggestedFontWeight
      roleApplied = true
    }

    if (ctx && roleApplied) {
      ctx.fallbacks.push({
        type: 'role-styling',
        element: semChild.text || semChild.type || 'Element',
        details: `Role "${semChild.role}" Styling angewendet`,
      })
    }
  }

  // Recursively apply to nested children
  if (semChild.children && pixChild.children) {
    applySemanticToChildren(semChild.children, pixChild.children, ctx)
  }
}

/**
 * Recursively normalize font sizes in all children
 * This catches unrealistic font sizes even when semantic info is missing
 */
function normalizeChildrenFontSizes(children: MergedElement[], ctx?: PipelineContext): void {
  for (const child of children) {
    if (child.fontSize) {
      const originalFs = child.fontSize
      const normalizedFs = normalizeFontSize(child.fontSize, child.role)
      if (normalizedFs && normalizedFs !== originalFs) {
        child.fontSize = normalizedFs
        if (ctx) {
          ctx.fallbacks.push({
            type: 'font-normalized',
            element: child.text || child.type || 'Element',
            details: `${originalFs}px → ${normalizedFs}px`,
          })
        }
      }
    }
    // Recurse
    if (child.children) {
      normalizeChildrenFontSizes(child.children, ctx)
    }
  }
}

function generateMirrorCode(element: MergedElement, indent = 0): string {
  const prefix = '  '.repeat(indent)
  const props: string[] = []

  // Determine primitive using component patterns
  const primitive = getPrimitiveForType(element.type as ComponentType)

  // Add content based on primitive type
  switch (element.type) {
    case 'Text':
      if (element.text) props.push(`"${element.text}"`)
      break
    case 'Button':
      if (element.text) props.push(`"${element.text}"`)
      break
    case 'Input':
      if (element.placeholder) props.push(`placeholder "${element.placeholder}"`)
      break
    case 'Icon':
      if (element.iconName) props.push(`"${element.iconName}"`)
      break
    case 'Checkbox':
      if (element.text) props.push(`"${element.text}"`)
      if (element.state === 'checked') props.push('checked')
      break
    case 'Switch':
      if (element.text) props.push(`"${element.text}"`)
      if (element.state === 'checked') props.push('checked')
      break
  }

  // Layout direction
  if (element.layout === 'horizontal') props.push('hor')
  if (element.layout === 'stacked') props.push('stacked')
  if (element.layout === 'grid') props.push('grid')
  if (element.gap) props.push(`gap ${element.gap}`)

  // Semantic alignment (from LLM - can't be detected from pixels)
  if (element.alignment) {
    const alignments = Array.isArray(element.alignment) ? element.alignment : [element.alignment]
    for (const align of alignments) {
      switch (align) {
        case 'spread':
          props.push('spread')
          break
        case 'center':
          props.push('center')
          break
        case 'hor-center':
          props.push('hor-center')
          break
        case 'ver-center':
          props.push('ver-center')
          break
        case 'left':
          props.push('left')
          break
        case 'right':
          props.push('right')
          break
        case 'top':
          props.push('top')
          break
        case 'bottom':
          props.push('bottom')
          break
      }
    }
  }

  // Semantic sizing (from LLM)
  if (element.grow) props.push('grow')
  if (element.shrink) props.push('shrink')

  // Background
  if (element.backgroundColor) {
    props.push(`bg ${element.backgroundColor}`)
  }

  // Color
  if (element.color) {
    props.push(element.color === '#ffffff' ? 'col white' : `col ${element.color}`)
  }

  // Border
  if (element.borderWidth) {
    props.push(`bor ${element.borderWidth}`)
    if (element.borderColor) props.push(`boc ${element.borderColor}`)
  }

  // Radius
  if (element.borderRadius) props.push(`rad ${element.borderRadius}`)

  // Padding
  if (element.padding) {
    const { top, right } = element.padding
    if (top === right) {
      props.push(`pad ${top}`)
    } else {
      props.push(`pad ${top} ${right}`)
    }
  }

  // Font
  if (element.fontSize && element.type === 'Text') {
    props.push(`fs ${element.fontSize}`)
  }
  if (element.fontWeight && element.type === 'Text') {
    props.push(`weight ${element.fontWeight}`)
  }

  // Build line
  const line =
    props.length > 0 ? `${prefix}${primitive} ${props.join(', ')}` : `${prefix}${primitive}`

  const lines = [line]

  // Children
  if (element.children) {
    for (const child of element.children) {
      lines.push(generateMirrorCode(child, indent + 1))
    }
  }

  return lines.join('\n')
}
