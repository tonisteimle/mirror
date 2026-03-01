/**
 * Deep Comparison Utilities
 *
 * Recursively compares style trees and reports differences.
 */

import { normalizeStyles, calculateStyleSimilarity } from './style-normalizer'
import type { ExtractedStyles } from './style-extractor'

/**
 * Style difference details
 */
export interface StyleDifference {
  property: string
  previewValue: string
  exportValue: string
  severity: 'critical' | 'minor' | 'cosmetic'
}

/**
 * Comparison result for a single element
 */
export interface ElementComparison {
  element: string
  similarity: number
  differences: StyleDifference[]
  childComparisons: ElementComparison[]
}

/**
 * Overall comparison result
 */
export interface ComparisonResult {
  overallSimilarity: number
  totalElements: number
  elementsWithDifferences: number
  criticalDifferences: number
  comparisons: ElementComparison[]
  summary: string
}

/**
 * Properties that critically affect visual appearance
 */
const CRITICAL_PROPERTIES = new Set([
  'display',
  'visibility',
  'opacity',
  'width',
  'height',
  'background-color',
  'color',
  'flex-direction',
  'justify-content',
  'align-items'
])

/**
 * Properties that have minor visual impact
 */
const MINOR_PROPERTIES = new Set([
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'gap',
  'border-radius',
  'font-size',
  'font-weight'
])

/**
 * Determine severity of a property difference
 */
function getSeverity(property: string): 'critical' | 'minor' | 'cosmetic' {
  if (CRITICAL_PROPERTIES.has(property)) return 'critical'
  if (MINOR_PROPERTIES.has(property)) return 'minor'
  return 'cosmetic'
}

/**
 * Compare two style objects and return differences
 */
export function compareStyles(
  previewStyles: Record<string, string>,
  exportStyles: Record<string, string>
): StyleDifference[] {
  const differences: StyleDifference[] = []

  const normalized1 = normalizeStyles(previewStyles)
  const normalized2 = normalizeStyles(exportStyles)

  const allProps = new Set([...Object.keys(normalized1), ...Object.keys(normalized2)])

  for (const prop of allProps) {
    const val1 = normalized1[prop] || ''
    const val2 = normalized2[prop] || ''

    // Skip if both are empty or auto/normal
    if (!val1 && !val2) continue
    if (val1 === 'auto' && val2 === 'auto') continue
    if (val1 === 'normal' && val2 === 'normal') continue

    if (val1 !== val2) {
      differences.push({
        property: prop,
        previewValue: val1 || '(not set)',
        exportValue: val2 || '(not set)',
        severity: getSeverity(prop)
      })
    }
  }

  return differences
}

/**
 * Compare two element style trees
 */
export function compareStyleTrees(
  previewTree: ExtractedStyles,
  exportTree: ExtractedStyles
): ElementComparison {
  const differences = compareStyles(previewTree.styles, exportTree.styles)
  const similarity = calculateStyleSimilarity(previewTree.styles, exportTree.styles)

  const childComparisons: ElementComparison[] = []

  // Compare children by index (simple matching)
  const maxChildren = Math.max(previewTree.children.length, exportTree.children.length)
  for (let i = 0; i < maxChildren; i++) {
    const previewChild = previewTree.children[i]
    const exportChild = exportTree.children[i]

    if (previewChild && exportChild) {
      childComparisons.push(compareStyleTrees(previewChild, exportChild))
    } else if (previewChild) {
      // Child only in preview
      childComparisons.push({
        element: previewChild.element,
        similarity: 0,
        differences: [{ property: 'existence', previewValue: 'present', exportValue: 'missing', severity: 'critical' }],
        childComparisons: []
      })
    } else if (exportChild) {
      // Child only in export
      childComparisons.push({
        element: exportChild.element,
        similarity: 0,
        differences: [{ property: 'existence', previewValue: 'missing', exportValue: 'present', severity: 'critical' }],
        childComparisons: []
      })
    }
  }

  return {
    element: previewTree.element,
    similarity,
    differences,
    childComparisons
  }
}

/**
 * Generate overall comparison result
 */
export function generateComparisonResult(comparison: ElementComparison): ComparisonResult {
  let totalElements = 0
  let elementsWithDifferences = 0
  let criticalDifferences = 0
  let totalSimilarity = 0

  function traverse(comp: ElementComparison): void {
    totalElements++
    totalSimilarity += comp.similarity

    if (comp.differences.length > 0) {
      elementsWithDifferences++
      criticalDifferences += comp.differences.filter(d => d.severity === 'critical').length
    }

    for (const child of comp.childComparisons) {
      traverse(child)
    }
  }

  traverse(comparison)

  const overallSimilarity = totalElements > 0 ? totalSimilarity / totalElements : 1

  let summary = ''
  if (overallSimilarity >= 0.95) {
    summary = 'Excellent match - preview and export are nearly identical'
  } else if (overallSimilarity >= 0.85) {
    summary = 'Good match - minor style differences detected'
  } else if (overallSimilarity >= 0.70) {
    summary = 'Moderate match - some significant differences'
  } else {
    summary = 'Poor match - substantial visual differences'
  }

  if (criticalDifferences > 0) {
    summary += ` (${criticalDifferences} critical difference${criticalDifferences > 1 ? 's' : ''})`
  }

  return {
    overallSimilarity,
    totalElements,
    elementsWithDifferences,
    criticalDifferences,
    comparisons: [comparison],
    summary
  }
}

/**
 * Format comparison result as string for display
 */
export function formatComparisonResult(result: ComparisonResult): string {
  let output = `
╔══════════════════════════════════════════════════════════════╗
║                 Visual Comparison Report                      ║
╠══════════════════════════════════════════════════════════════╣
║ Overall Similarity: ${(result.overallSimilarity * 100).toFixed(1).padStart(5)}%                                 ║
║ Total Elements: ${result.totalElements.toString().padStart(4)}                                        ║
║ Elements with Differences: ${result.elementsWithDifferences.toString().padStart(4)}                            ║
║ Critical Differences: ${result.criticalDifferences.toString().padStart(4)}                                 ║
╠══════════════════════════════════════════════════════════════╣
║ ${result.summary.padEnd(61)}║
╚══════════════════════════════════════════════════════════════╝
`

  // Add difference details
  function formatElement(comp: ElementComparison, indent = ''): string {
    let text = ''

    if (comp.differences.length > 0) {
      text += `\n${indent}📦 ${comp.element} (${(comp.similarity * 100).toFixed(0)}% similar)\n`

      for (const diff of comp.differences) {
        const icon = diff.severity === 'critical' ? '❌' : diff.severity === 'minor' ? '⚠️' : 'ℹ️'
        text += `${indent}  ${icon} ${diff.property}: "${diff.previewValue}" vs "${diff.exportValue}"\n`
      }
    }

    for (const child of comp.childComparisons) {
      text += formatElement(child, indent + '  ')
    }

    return text
  }

  for (const comp of result.comparisons) {
    output += formatElement(comp)
  }

  return output
}

/**
 * Check if comparison passes threshold
 */
export function passesThreshold(result: ComparisonResult, threshold = 0.95): boolean {
  return result.overallSimilarity >= threshold && result.criticalDifferences === 0
}

/**
 * Get failed properties summary
 */
export function getFailedPropertiesSummary(result: ComparisonResult): string[] {
  const failed: string[] = []

  function collect(comp: ElementComparison): void {
    for (const diff of comp.differences) {
      if (diff.severity === 'critical') {
        failed.push(`${comp.element}: ${diff.property}`)
      }
    }
    for (const child of comp.childComparisons) {
      collect(child)
    }
  }

  for (const comp of result.comparisons) {
    collect(comp)
  }

  return failed
}
