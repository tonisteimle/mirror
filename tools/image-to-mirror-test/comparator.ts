/**
 * Mirror Code Comparator
 *
 * Compares original Mirror code with generated code.
 * Uses structural comparison rather than string comparison.
 */

import type { ComparisonResult, ComparisonDetails, Mismatch } from './types'

// =============================================================================
// Comparator Class
// =============================================================================

export class MirrorComparator {
  private passThreshold: number

  constructor(passThreshold = 0.8) {
    this.passThreshold = passThreshold
  }

  /**
   * Compare original and generated Mirror code
   */
  async compare(original: string, generated: string): Promise<ComparisonResult> {
    // Parse both codes to AST
    const { parse } = await import('../../compiler/parser')

    let originalAST, generatedAST

    try {
      originalAST = parse(original)
    } catch (e) {
      return this.createErrorResult('Failed to parse original code', String(e))
    }

    try {
      generatedAST = parse(generated)
    } catch (e) {
      return this.createErrorResult('Failed to parse generated code', String(e))
    }

    // Compare AST structures
    const details = this.compareASTs(originalAST, generatedAST)

    // Calculate overall score
    const score = this.calculateOverallScore(details)
    const passed = score >= this.passThreshold

    return {
      score,
      passed,
      details,
      summary: this.generateSummary(score, details),
    }
  }

  /**
   * Compare two ASTs
   */
  private compareASTs(original: any, generated: any): ComparisonDetails {
    const mismatches: Mismatch[] = []

    // Compare structure (node hierarchy)
    const structureScore = this.compareStructure(original.nodes, generated.nodes, '', mismatches)

    // Compare element types
    const elementTypeScore = this.compareElementTypes(original.nodes, generated.nodes, mismatches)

    // Compare properties
    const propertyScore = this.compareProperties(original.nodes, generated.nodes, mismatches)

    // Compare layout
    const layoutScore = this.compareLayout(original.nodes, generated.nodes, mismatches)

    // Compare colors
    const colorScore = this.compareColors(original.nodes, generated.nodes, mismatches)

    return {
      structureScore,
      elementTypeScore,
      propertyScore,
      layoutScore,
      colorScore,
      mismatches,
    }
  }

  /**
   * Compare node structure (hierarchy)
   */
  private compareStructure(
    original: any[],
    generated: any[],
    path: string,
    mismatches: Mismatch[]
  ): number {
    if (!original && !generated) return 1
    if (!original || !generated) {
      mismatches.push({
        type: original ? 'missing' : 'extra',
        path: path || 'root',
        expected: original ? `${original.length} nodes` : 'none',
        actual: generated ? `${generated.length} nodes` : 'none',
        severity: 'high',
      })
      return 0
    }

    const originalCount = original.length
    const generatedCount = generated.length

    if (originalCount === 0 && generatedCount === 0) return 1

    // Check count match
    if (originalCount !== generatedCount) {
      mismatches.push({
        type: 'different',
        path: path || 'root',
        expected: `${originalCount} nodes`,
        actual: `${generatedCount} nodes`,
        severity: 'medium',
      })
    }

    // Compare children recursively
    let matchScore = 0
    const maxCount = Math.max(originalCount, generatedCount)

    for (let i = 0; i < maxCount; i++) {
      const origNode = original[i]
      const genNode = generated[i]
      const nodePath = `${path}[${i}]`

      if (!origNode) {
        mismatches.push({
          type: 'extra',
          path: nodePath,
          actual: genNode?.type || 'unknown',
          severity: 'medium',
        })
        continue
      }

      if (!genNode) {
        mismatches.push({
          type: 'missing',
          path: nodePath,
          expected: origNode.type || 'unknown',
          severity: 'medium',
        })
        continue
      }

      // Compare children
      const childScore = this.compareStructure(
        origNode.children || [],
        genNode.children || [],
        `${nodePath}.children`,
        mismatches
      )

      matchScore += childScore
    }

    return maxCount > 0 ? matchScore / maxCount : 1
  }

  /**
   * Compare element types (Frame, Text, Button, etc.)
   */
  private compareElementTypes(original: any[], generated: any[], mismatches: Mismatch[]): number {
    const origTypes = this.flattenTypes(original)
    const genTypes = this.flattenTypes(generated)

    if (origTypes.length === 0 && genTypes.length === 0) return 1

    let matches = 0
    const maxLen = Math.max(origTypes.length, genTypes.length)

    for (let i = 0; i < maxLen; i++) {
      if (origTypes[i] === genTypes[i]) {
        matches++
      } else if (origTypes[i] && genTypes[i]) {
        mismatches.push({
          type: 'different',
          path: `element[${i}].type`,
          expected: origTypes[i],
          actual: genTypes[i],
          severity: 'high',
        })
      }
    }

    return maxLen > 0 ? matches / maxLen : 1
  }

  /**
   * Compare properties
   */
  private compareProperties(original: any[], generated: any[], mismatches: Mismatch[]): number {
    const origProps = this.flattenProperties(original)
    const genProps = this.flattenProperties(generated)

    if (origProps.size === 0 && genProps.size === 0) return 1

    let matches = 0
    const allKeys = new Set([...origProps.keys(), ...genProps.keys()])

    for (const key of allKeys) {
      const origVal = origProps.get(key)
      const genVal = genProps.get(key)

      if (origVal === genVal) {
        matches++
      } else if (this.valuesAreEquivalent(origVal, genVal)) {
        matches += 0.8 // Partial match
      } else {
        mismatches.push({
          type: origVal && genVal ? 'different' : origVal ? 'missing' : 'extra',
          path: key,
          expected: origVal,
          actual: genVal,
          severity: 'low',
        })
      }
    }

    return allKeys.size > 0 ? matches / allKeys.size : 1
  }

  /**
   * Compare layout properties
   */
  private compareLayout(original: any[], generated: any[], mismatches: Mismatch[]): number {
    const layoutProps = ['hor', 'ver', 'gap', 'pad', 'center', 'spread', 'wrap', 'grid', 'stacked']
    const origLayout = this.extractLayoutProps(original, layoutProps)
    const genLayout = this.extractLayoutProps(generated, layoutProps)

    if (origLayout.size === 0 && genLayout.size === 0) return 1

    let matches = 0
    const allKeys = new Set([...origLayout.keys(), ...genLayout.keys()])

    for (const key of allKeys) {
      if (origLayout.get(key) === genLayout.get(key)) {
        matches++
      } else {
        mismatches.push({
          type: 'different',
          path: `layout.${key}`,
          expected: origLayout.get(key),
          actual: genLayout.get(key),
          severity: 'medium',
        })
      }
    }

    return allKeys.size > 0 ? matches / allKeys.size : 1
  }

  /**
   * Compare color properties
   */
  private compareColors(original: any[], generated: any[], mismatches: Mismatch[]): number {
    const colorProps = ['bg', 'col', 'boc', 'ic']
    const origColors = this.extractColorProps(original, colorProps)
    const genColors = this.extractColorProps(generated, colorProps)

    if (origColors.size === 0 && genColors.size === 0) return 1

    let matches = 0
    const allKeys = new Set([...origColors.keys(), ...genColors.keys()])

    for (const key of allKeys) {
      const origColor = origColors.get(key)
      const genColor = genColors.get(key)

      if (this.colorsMatch(origColor, genColor)) {
        matches++
      } else {
        mismatches.push({
          type: 'different',
          path: `color.${key}`,
          expected: origColor,
          actual: genColor,
          severity: 'medium',
        })
      }
    }

    return allKeys.size > 0 ? matches / allKeys.size : 1
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private flattenTypes(nodes: any[], result: string[] = []): string[] {
    if (!nodes) return result
    for (const node of nodes) {
      result.push(node.type || 'unknown')
      if (node.children) {
        this.flattenTypes(node.children, result)
      }
    }
    return result
  }

  private flattenProperties(
    nodes: any[],
    path = '',
    result = new Map<string, string>()
  ): Map<string, string> {
    if (!nodes) return result
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const nodePath = `${path}[${i}]`

      if (node.properties) {
        for (const prop of node.properties) {
          result.set(`${nodePath}.${prop.name}`, String(prop.value))
        }
      }

      if (node.children) {
        this.flattenProperties(node.children, `${nodePath}.children`, result)
      }
    }
    return result
  }

  private extractLayoutProps(nodes: any[], propNames: string[]): Map<string, string> {
    const result = new Map<string, string>()
    this.walkNodes(nodes, (node, path) => {
      if (!node.properties) return
      for (const prop of node.properties) {
        if (propNames.includes(prop.name)) {
          result.set(`${path}.${prop.name}`, String(prop.value))
        }
      }
    })
    return result
  }

  private extractColorProps(nodes: any[], propNames: string[]): Map<string, string> {
    const result = new Map<string, string>()
    this.walkNodes(nodes, (node, path) => {
      if (!node.properties) return
      for (const prop of node.properties) {
        if (propNames.includes(prop.name)) {
          result.set(`${path}.${prop.name}`, String(prop.value))
        }
      }
    })
    return result
  }

  private walkNodes(nodes: any[], callback: (node: any, path: string) => void, path = ''): void {
    if (!nodes) return
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const nodePath = `${path}[${i}]`
      callback(node, nodePath)
      if (node.children) {
        this.walkNodes(node.children, callback, `${nodePath}.children`)
      }
    }
  }

  private valuesAreEquivalent(a: string | undefined, b: string | undefined): boolean {
    if (a === b) return true
    if (!a || !b) return false

    // Numeric equivalence (e.g., "16" vs "16px")
    const numA = parseFloat(a)
    const numB = parseFloat(b)
    if (!isNaN(numA) && !isNaN(numB) && numA === numB) return true

    return false
  }

  private colorsMatch(a: string | undefined, b: string | undefined): boolean {
    if (a === b) return true
    if (!a || !b) return false

    // Normalize colors to lowercase
    const normA = a.toLowerCase()
    const normB = b.toLowerCase()
    if (normA === normB) return true

    // TODO: Add color distance calculation for near-matches
    return false
  }

  private calculateOverallScore(details: ComparisonDetails): number {
    // Weighted average
    const weights = {
      structure: 0.3,
      elementType: 0.25,
      property: 0.2,
      layout: 0.15,
      color: 0.1,
    }

    return (
      details.structureScore * weights.structure +
      details.elementTypeScore * weights.elementType +
      details.propertyScore * weights.property +
      details.layoutScore * weights.layout +
      details.colorScore * weights.color
    )
  }

  private generateSummary(score: number, details: ComparisonDetails): string {
    const percentage = Math.round(score * 100)
    const lines = [
      `Overall Score: ${percentage}%`,
      `  Structure: ${Math.round(details.structureScore * 100)}%`,
      `  Element Types: ${Math.round(details.elementTypeScore * 100)}%`,
      `  Properties: ${Math.round(details.propertyScore * 100)}%`,
      `  Layout: ${Math.round(details.layoutScore * 100)}%`,
      `  Colors: ${Math.round(details.colorScore * 100)}%`,
    ]

    if (details.mismatches.length > 0) {
      lines.push(`  Mismatches: ${details.mismatches.length}`)
      const highSeverity = details.mismatches.filter(m => m.severity === 'high')
      if (highSeverity.length > 0) {
        lines.push(`    High Severity: ${highSeverity.length}`)
      }
    }

    return lines.join('\n')
  }

  private createErrorResult(message: string, error: string): ComparisonResult {
    return {
      score: 0,
      passed: false,
      details: {
        structureScore: 0,
        elementTypeScore: 0,
        propertyScore: 0,
        layoutScore: 0,
        colorScore: 0,
        mismatches: [
          {
            type: 'different',
            path: 'parse',
            expected: 'valid code',
            actual: error,
            severity: 'high',
          },
        ],
      },
      summary: `${message}: ${error}`,
    }
  }
}
