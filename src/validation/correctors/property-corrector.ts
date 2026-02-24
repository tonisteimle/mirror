/**
 * Property correction with fuzzy matching
 */

import { KNOWN_PROPERTIES } from '../types'
import type { Correction, TabType } from '../types'
import { findClosestMatch } from '../../utils/fuzzy-search'
import { propertyConfidence } from '../utils/confidence'

// Common CSS to DSL mappings (only unambiguous mappings)
// NOTE: Both short and long forms are valid in Mirror DSL!
// We only map CSS-specific syntax to DSL equivalents
const CSS_TO_DSL: Record<string, string> = {
  // Layout (removed ambiguous: flex-direction, justify-content, align-items can have many values)
  'flex-wrap': 'wrap',
  'flexwrap': 'wrap',
  'flex-grow': 'grow',
  'flexgrow': 'grow',

  // Sizing - CSS camelCase variants
  'minwidth': 'min-width',
  'maxwidth': 'max-width',
  'minheight': 'min-height',
  'maxheight': 'max-height',

  // Colors - CSS syntax to DSL
  // IMPORTANT: background and color are DIFFERENT properties!
  // background/bg = background color, color/col = text color
  'background-color': 'background',  // CSS → DSL long form
  'backgroundcolor': 'background',
  'bordercolor': 'border-color',

  // Border - CSS syntax to DSL
  'border-radius': 'radius',
  'borderradius': 'radius',

  // Typography - CSS syntax to DSL
  'font-size': 'size',
  'fontsize': 'size',
  'font-weight': 'weight',
  'fontweight': 'weight',
  'font-family': 'font',
  'fontfamily': 'font',

  // Direction keywords (unambiguous)
  'row': 'horizontal',
  'column': 'vertical',
  'space-between': 'between',
  'spacebetween': 'between',
}

// Common typos and alternatives (only typos, not CSS names which are in CSS_TO_DSL)
// NOTE: We do NOT convert between valid forms (bg ↔ background, col ↔ color)
// Both short and long forms are valid in Mirror DSL!
const COMMON_TYPOS: Record<string, string> = {
  // Layout typos
  'horizonal': 'horizontal',
  'horiz': 'horizontal',
  'hori': 'horizontal',
  'verticle': 'vertical',
  'vert': 'vertical',
  'centre': 'center',
  'centered': 'center',
  'centr': 'center',
  // Spacing typos
  'padd': 'padding',
  'paddng': 'padding',
  'marg': 'margin',
  'margn': 'margin',
  // Background typos (NOT color!)
  'backgrnd': 'background',
  'backgr': 'background',
  'bckgrnd': 'background',
  'bgcolor': 'background',  // Common CSS-ism
  // Text color typos (NOT background!)
  'colour': 'color',
  'clr': 'color',
  'colr': 'color',
  'txt': 'color',  // text-color → color
  'textcolor': 'color',
  'text-color': 'color',
  // Border typos
  'radi': 'radius',
  'round': 'radius',
  'rounded': 'radius',
  'bord': 'border',
  'brdr': 'border',
  'borderw': 'border',
  'bordercol': 'border-color',
  // Typography typos
  'sz': 'size',
  'wgt': 'weight',
  'bold': 'weight',
  // Sizing typos
  'widt': 'width',
  'heigh': 'height',
  'hgt': 'height',
  // Other typos
  'gp': 'gap',
  'spacing': 'gap',
  'grw': 'grow',
  'expand': 'grow',
  'wrp': 'wrap',
  'btween': 'between',
  'btwn': 'between',
  'opac': 'opacity',
  'opacty': 'opacity',
}

export interface PropertyCorrectionResult {
  original: string
  corrected: string | null
  confidence: number
  method: 'exact' | 'css' | 'typo' | 'fuzzy' | 'none'
}

/**
 * Try to correct an unknown property
 */
export function correctProperty(property: string): PropertyCorrectionResult {
  const lower = property.toLowerCase()

  // Already valid
  if (KNOWN_PROPERTIES.has(property)) {
    return { original: property, corrected: property, confidence: 1, method: 'exact' }
  }

  // Check CSS mappings
  if (CSS_TO_DSL[lower]) {
    return {
      original: property,
      corrected: CSS_TO_DSL[lower],
      confidence: 0.95,
      method: 'css'
    }
  }

  // Check common typos
  if (COMMON_TYPOS[lower]) {
    return {
      original: property,
      corrected: COMMON_TYPOS[lower],
      confidence: 0.9,
      method: 'typo'
    }
  }

  // Fuzzy matching
  const { match, distance } = findClosestMatch(property, KNOWN_PROPERTIES)
  if (match && distance <= 2) {
    return {
      original: property,
      corrected: match,
      confidence: propertyConfidence(property, match),
      method: 'fuzzy'
    }
  }

  return { original: property, corrected: null, confidence: 0, method: 'none' }
}

/**
 * Correct all properties in a line
 */
export function correctLineProperties(
  line: string,
  lineNumber: number,
  tab: TabType
): { correctedLine: string; corrections: Correction[] } {
  const corrections: Correction[] = []

  // Preserve leading whitespace (indentation)
  const leadingWhitespace = line.match(/^(\s*)/)?.[1] || ''
  const content = line.slice(leadingWhitespace.length)

  // Tokenize content to find properties
  // This is a simplified version - the actual lexer handles this more robustly
  const parts = content.split(/\s+/)
  const correctedParts: string[] = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    // Skip empty parts
    if (!part) {
      continue
    }

    // Skip component names (start with uppercase), strings, numbers, colors
    if (
      /^[A-Z]/.test(part) ||
      /^"/.test(part) ||
      /^#[0-9A-Fa-f]/.test(part) ||
      /^\d+$/.test(part) ||
      part === ':' ||
      part === 'from' ||
      /^[lrud]$/.test(part)
    ) {
      correctedParts.push(part)
      continue
    }

    // Try to correct property
    const result = correctProperty(part)

    if (result.corrected && result.corrected !== part) {
      corrections.push({
        tab,
        line: lineNumber,
        original: part,
        corrected: result.corrected,
        reason: `Property "${part}" corrected to "${result.corrected}" (${result.method})`,
        confidence: result.confidence
      })
      correctedParts.push(result.corrected)
    } else {
      correctedParts.push(part)
    }
  }

  return {
    correctedLine: leadingWhitespace + correctedParts.join(' '),
    corrections
  }
}
