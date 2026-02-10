/**
 * Property correction with fuzzy matching
 */

import { KNOWN_PROPERTIES } from '../types'
import type { Correction, TabType } from '../types'
import { findClosestMatch } from '../../utils/fuzzy-search'
import { propertyConfidence } from '../utils/confidence'

// Common CSS to DSL mappings (only unambiguous mappings)
const CSS_TO_DSL: Record<string, string> = {
  // Layout (removed ambiguous: flex-direction, justify-content, align-items can have many values)
  'flex-wrap': 'wrap',
  'flexwrap': 'wrap',
  'flex-grow': 'grow',
  'flexgrow': 'grow',

  // Sizing
  'width': 'w',
  'height': 'h',
  'min-width': 'minw',
  'minwidth': 'minw',
  'max-width': 'maxw',
  'maxwidth': 'maxw',
  'min-height': 'minh',
  'minheight': 'minh',
  'max-height': 'maxh',
  'maxheight': 'maxh',

  // Spacing
  'padding': 'pad',
  'margin': 'mar',

  // Colors (unified: background → col)
  'background': 'col',
  'background-color': 'col',
  'backgroundcolor': 'col',
  'border-color': 'boc',
  'bordercolor': 'boc',

  // Border
  'border-radius': 'rad',
  'borderradius': 'rad',
  'radius': 'rad',

  // Typography
  'font-size': 'size',
  'fontsize': 'size',
  'font-weight': 'weight',
  'fontweight': 'weight',
  'font-family': 'font',
  'fontfamily': 'font',

  // Direction keywords (unambiguous)
  'row': 'hor',
  'column': 'ver',
  'horizontal': 'hor',
  'vertical': 'ver',
  'space-between': 'between',
  'spacebetween': 'between',
}

// Common typos and alternatives (only typos, not CSS names which are in CSS_TO_DSL)
const COMMON_TYPOS: Record<string, string> = {
  // Layout typos
  'horizonal': 'hor',
  'horiz': 'hor',
  'hori': 'hor',
  'verticle': 'ver',
  'vert': 'ver',
  'centre': 'cen',
  'centered': 'cen',
  'centr': 'cen',
  // Spacing typos
  'padd': 'pad',
  'marg': 'mar',
  'margn': 'mar',
  // Color typos (unified: bg → col)
  'bg': 'col',
  'bg-color': 'col',
  'bgcolor': 'col',
  'backgrnd': 'col',
  'backgr': 'col',
  'colour': 'col',
  'color': 'col',
  'clr': 'col',
  'txt': 'col',
  // Border typos
  'radi': 'rad',
  'round': 'rad',
  'rounded': 'rad',
  'bord': 'bor',
  'brdr': 'bor',
  'borderw': 'bor',
  // Typography typos
  'sz': 'size',
  'wgt': 'weight',
  'bold': 'weight',
  // Sizing typos
  'widt': 'w',
  'heigh': 'h',
  'hgt': 'h',
  // Other typos
  'ic': 'icon',
  'ico': 'icon',
  'gp': 'gap',
  'spacing': 'gap',
  'grw': 'grow',
  'expand': 'grow',
  'wrp': 'wrap',
  'btween': 'between',
  'btwn': 'between',
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
