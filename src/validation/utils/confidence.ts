/**
 * Calculate confidence score for corrections
 */

import { levenshteinDistance as levenshtein } from '../../utils/fuzzy-search'

/**
 * Calculate confidence for a property correction
 * Returns 0-1 where 1 is highest confidence
 */
export function propertyConfidence(original: string, corrected: string): number {
  const distance = levenshtein(original.toLowerCase(), corrected.toLowerCase())
  const maxLen = Math.max(original.length, corrected.length)

  if (distance === 0) return 1
  if (distance === 1) return 0.95
  if (distance === 2) return 0.8
  if (distance === 3) return 0.6

  // For larger distances, calculate based on relative difference
  return Math.max(0, 1 - (distance / maxLen))
}

/**
 * Calculate confidence for a color correction
 */
export function colorConfidence(original: string, corrected: string): number {
  // If only case difference
  if (original.toLowerCase() === corrected.toLowerCase()) return 1

  // If just adding/removing #
  if (original.replace('#', '') === corrected.replace('#', '')) return 0.95

  // If shorthand expansion (e.g., #FFF -> #FFFFFF)
  const shortOriginal = original.replace('#', '')
  const shortCorrected = corrected.replace('#', '')
  if (shortOriginal.length === 3 && shortCorrected.length === 6) {
    const expanded = shortOriginal.split('').map(c => c + c).join('')
    if (expanded.toLowerCase() === shortCorrected.toLowerCase()) return 0.98
  }

  return 0.5 // Default low confidence for other color changes
}

/**
 * Calculate confidence for structural corrections
 */
export function structureConfidence(
  correctionType: 'remove_property' | 'add_definition' | 'fix_indent' | 'remove_line'
): number {
  switch (correctionType) {
    case 'remove_property':
      return 0.9 // High confidence - properties in layout should be removed
    case 'add_definition':
      return 0.7 // Medium - might not know exact properties
    case 'fix_indent':
      return 0.85 // High - indentation rules are clear
    case 'remove_line':
      return 0.6 // Lower - might be removing valid content
    default:
      return 0.5
  }
}

/**
 * Determine if a correction should be auto-applied based on confidence
 */
export function shouldAutoApply(confidence: number): boolean {
  return confidence >= 0.75
}

/**
 * Determine if a correction needs user review
 */
export function needsReview(confidence: number): boolean {
  return confidence >= 0.5 && confidence < 0.75
}
