/**
 * Pairwise Test Generator
 *
 * Implements a simple pairwise (all-pairs) testing algorithm.
 * Ensures every pair of parameter values is tested at least once.
 *
 * This dramatically reduces test count while maintaining good coverage:
 * - Full combinatorial: 6*11*4*4*4*3 = 12,672 tests
 * - Pairwise: ~150-200 tests (covers all pairs)
 */

import {
  LAYOUT_DIMENSIONS,
  type LayoutCombination,
  buildMirrorCode,
  isValidCombination,
} from './layout-matrix-definition'

// =============================================================================
// TYPES
// =============================================================================

type DimensionName = keyof typeof LAYOUT_DIMENSIONS
type DimensionValues<K extends DimensionName> = (typeof LAYOUT_DIMENSIONS)[K][number]

interface Pair {
  dim1: DimensionName
  value1: string
  dim2: DimensionName
  value2: string
}

// =============================================================================
// PAIRWISE GENERATION
// =============================================================================

/**
 * Generate all pairs that need to be covered.
 */
function generateAllPairs(): Pair[] {
  const pairs: Pair[] = []
  const dimensions = Object.keys(LAYOUT_DIMENSIONS) as DimensionName[]

  for (let i = 0; i < dimensions.length; i++) {
    for (let j = i + 1; j < dimensions.length; j++) {
      const dim1 = dimensions[i]
      const dim2 = dimensions[j]
      const values1 = LAYOUT_DIMENSIONS[dim1] as readonly string[]
      const values2 = LAYOUT_DIMENSIONS[dim2] as readonly string[]

      for (const v1 of values1) {
        for (const v2 of values2) {
          pairs.push({ dim1, value1: v1, dim2, value2: v2 })
        }
      }
    }
  }

  return pairs
}

/**
 * Check if a test case covers a pair.
 */
function coversPair(testCase: Record<DimensionName, string>, pair: Pair): boolean {
  return testCase[pair.dim1] === pair.value1 && testCase[pair.dim2] === pair.value2
}

/**
 * Count how many uncovered pairs a test case would cover.
 */
function countNewCoverage(
  testCase: Record<DimensionName, string>,
  uncoveredPairs: Pair[]
): number {
  return uncoveredPairs.filter(p => coversPair(testCase, p)).length
}

/**
 * Generate pairwise test combinations using a greedy algorithm.
 */
export function generatePairwiseCombinations(): LayoutCombination[] {
  const dimensions = Object.keys(LAYOUT_DIMENSIONS) as DimensionName[]
  const allPairs = generateAllPairs()
  const uncoveredPairs = new Set(allPairs)
  const testCases: LayoutCombination[] = []

  // Helper to get array from uncovered set
  const getUncoveredArray = () => Array.from(uncoveredPairs)

  // Keep generating test cases until all pairs are covered
  let iterations = 0
  const maxIterations = 1000 // Safety limit

  while (uncoveredPairs.size > 0 && iterations < maxIterations) {
    iterations++

    // Build a test case greedily
    const testCase: Record<string, string> = {}

    // For each dimension, pick the value that covers the most uncovered pairs
    for (const dim of dimensions) {
      const values = LAYOUT_DIMENSIONS[dim] as readonly string[]
      let bestValue = values[0]
      let bestCoverage = -1

      for (const value of values) {
        // Create temporary test case with this value
        const tempCase = { ...testCase, [dim]: value } as Record<DimensionName, string>

        // Fill remaining dimensions with first values for counting
        for (const d of dimensions) {
          if (!(d in tempCase)) {
            tempCase[d] = (LAYOUT_DIMENSIONS[d] as readonly string[])[0]
          }
        }

        const coverage = countNewCoverage(tempCase, getUncoveredArray())
        if (coverage > bestCoverage) {
          bestCoverage = coverage
          bestValue = value
        }
      }

      testCase[dim] = bestValue
    }

    // Check if this combination is valid
    const combo = testCase as unknown as LayoutCombination
    if (isValidCombination(combo)) {
      testCases.push(combo)

      // Remove covered pairs
      for (const pair of getUncoveredArray()) {
        if (coversPair(testCase as Record<DimensionName, string>, pair)) {
          uncoveredPairs.delete(pair)
        }
      }
    } else {
      // If invalid, try to find any valid combination that covers at least one pair
      const uncoveredArray = getUncoveredArray()
      let found = false

      for (const pair of uncoveredArray) {
        // Build a minimal combo for this pair
        const minimalCombo: Partial<LayoutCombination> = {
          layoutMode: 'default',
          alignment: 'none',
          widthType: 'none',
          heightType: 'none',
          spacing: 'none',
          flexBehavior: 'none',
          [pair.dim1]: pair.value1,
          [pair.dim2]: pair.value2,
        }

        if (isValidCombination(minimalCombo as LayoutCombination)) {
          testCases.push(minimalCombo as LayoutCombination)
          uncoveredPairs.delete(pair)
          found = true
          break
        }
      }

      if (!found && uncoveredPairs.size > 0) {
        // Just remove an invalid pair from consideration
        const firstUncovered = uncoveredArray[0]
        uncoveredPairs.delete(firstUncovered)
      }
    }
  }

  return testCases
}

/**
 * Generate a simpler set of strategic combinations.
 * This is more controlled than full pairwise.
 */
export function generateStrategicCombinations(): LayoutCombination[] {
  const combinations: LayoutCombination[] = []

  // Base cases: each layout mode
  for (const layoutMode of LAYOUT_DIMENSIONS.layoutMode) {
    combinations.push({
      layoutMode,
      alignment: 'none',
      widthType: 'none',
      heightType: 'none',
      spacing: 'none',
      flexBehavior: 'none',
    })
  }

  // Each alignment with flex
  // Skip hor + 9-zone combinations as they are conceptually incompatible
  // (9-zone always implies column direction)
  const nineZoneAlignments = ['tl', 'tc', 'tr', 'cl', 'cr', 'bl', 'bc', 'br']

  for (const alignment of LAYOUT_DIMENSIONS.alignment) {
    if (alignment !== 'none') {
      combinations.push({
        layoutMode: 'default',
        alignment,
        widthType: 'none',
        heightType: 'none',
        spacing: 'none',
        flexBehavior: 'none',
      })
      // Only add hor for center and spread, not for 9-zone
      if (!nineZoneAlignments.includes(alignment)) {
        combinations.push({
          layoutMode: 'hor',
          alignment,
          widthType: 'none',
          heightType: 'none',
          spacing: 'none',
          flexBehavior: 'none',
        })
      }
    }
  }

  // Each sizing option
  for (const widthType of LAYOUT_DIMENSIONS.widthType) {
    if (widthType !== 'none') {
      combinations.push({
        layoutMode: 'default',
        alignment: 'none',
        widthType,
        heightType: 'none',
        spacing: 'none',
        flexBehavior: 'none',
      })
    }
  }
  for (const heightType of LAYOUT_DIMENSIONS.heightType) {
    if (heightType !== 'none') {
      combinations.push({
        layoutMode: 'default',
        alignment: 'none',
        widthType: 'none',
        heightType,
        spacing: 'none',
        flexBehavior: 'none',
      })
    }
  }

  // Spacing options
  for (const spacing of LAYOUT_DIMENSIONS.spacing) {
    if (spacing !== 'none') {
      combinations.push({
        layoutMode: 'default',
        alignment: 'none',
        widthType: 'none',
        heightType: 'none',
        spacing,
        flexBehavior: 'none',
      })
      // Also with hor
      combinations.push({
        layoutMode: 'hor',
        alignment: 'none',
        widthType: 'none',
        heightType: 'none',
        spacing,
        flexBehavior: 'none',
      })
    }
  }

  // Flex behaviors
  for (const flexBehavior of LAYOUT_DIMENSIONS.flexBehavior) {
    if (flexBehavior !== 'none') {
      combinations.push({
        layoutMode: 'default',
        alignment: 'none',
        widthType: 'none',
        heightType: 'none',
        spacing: 'none',
        flexBehavior,
      })
      combinations.push({
        layoutMode: 'hor',
        alignment: 'none',
        widthType: 'none',
        heightType: 'none',
        spacing: 'none',
        flexBehavior,
      })
    }
  }

  // Key combinations
  const keyCombos: Array<Partial<LayoutCombination>> = [
    // hor + center
    { layoutMode: 'hor', alignment: 'center' },
    // hor + spread
    { layoutMode: 'hor', alignment: 'spread' },
    // ver + spread
    { layoutMode: 'ver', alignment: 'spread' },
    // center + gap
    { layoutMode: 'default', alignment: 'center', spacing: 'gap 12' },
    // hor + center + gap
    { layoutMode: 'hor', alignment: 'center', spacing: 'gap 12' },
    // hor + spread + gap
    { layoutMode: 'hor', alignment: 'spread', spacing: 'gap 12' },
    // grid + gap
    { layoutMode: 'grid 12', spacing: 'gap 12, pad 16' },
    // grid 3 + spacing
    { layoutMode: 'grid 3', spacing: 'gap 12' },
    // stacked + sizing
    { layoutMode: 'stacked', widthType: 'w 100', heightType: 'h 100' },
    // wrap + hor
    { layoutMode: 'hor', flexBehavior: 'wrap' },
    // Multiple sizing
    { layoutMode: 'default', widthType: 'w 100', heightType: 'h 100' },
    { layoutMode: 'hor', widthType: 'w 100', heightType: 'h 100' },
    // hug sizing
    { layoutMode: 'default', widthType: 'w hug', heightType: 'h hug' },
    // full sizing
    { layoutMode: 'default', widthType: 'w full' },
    { layoutMode: 'hor', widthType: 'w full' },
  ]

  for (const combo of keyCombos) {
    const full: LayoutCombination = {
      layoutMode: combo.layoutMode || 'default',
      alignment: combo.alignment || 'none',
      widthType: combo.widthType || 'none',
      heightType: combo.heightType || 'none',
      spacing: combo.spacing || 'none',
      flexBehavior: combo.flexBehavior || 'none',
    }
    if (isValidCombination(full)) {
      combinations.push(full)
    }
  }

  // Filter to valid and unique combinations
  const seen = new Set<string>()
  return combinations.filter(combo => {
    const code = buildMirrorCode(combo)
    if (seen.has(code)) return false
    seen.add(code)
    return isValidCombination(combo)
  })
}

/**
 * Get statistics about coverage.
 */
export function getCoverageStats(combinations: LayoutCombination[]): {
  totalPairs: number
  coveredPairs: number
  coverage: number
  testCount: number
} {
  const allPairs = generateAllPairs()
  const coveredPairs = new Set<string>()

  for (const combo of combinations) {
    const testCase = combo as unknown as Record<DimensionName, string>
    for (const pair of allPairs) {
      if (coversPair(testCase, pair)) {
        coveredPairs.add(`${pair.dim1}:${pair.value1}-${pair.dim2}:${pair.value2}`)
      }
    }
  }

  return {
    totalPairs: allPairs.length,
    coveredPairs: coveredPairs.size,
    coverage: coveredPairs.size / allPairs.length,
    testCount: combinations.length,
  }
}

// =============================================================================
// EXPORTS FOR TESTS
// =============================================================================

/**
 * Generate all test combinations (strategic + pairwise).
 */
export function generateAllTestCombinations(): LayoutCombination[] {
  // Use strategic combinations as the base
  const strategic = generateStrategicCombinations()

  // Add pairwise to fill gaps
  const pairwise = generatePairwiseCombinations()

  // Merge and deduplicate
  const seen = new Set<string>()
  const result: LayoutCombination[] = []

  for (const combo of [...strategic, ...pairwise]) {
    const code = buildMirrorCode(combo)
    if (!seen.has(code)) {
      seen.add(code)
      result.push(combo)
    }
  }

  return result
}

/**
 * Generate test data for parent-child combinations.
 * These test how child properties behave in different parent contexts.
 */
export function generateParentChildCombinations(): Array<{
  parent: LayoutCombination
  child: LayoutCombination
  description: string
}> {
  const combinations: Array<{
    parent: LayoutCombination
    child: LayoutCombination
    description: string
  }> = []

  const baseChild: LayoutCombination = {
    layoutMode: 'default',
    alignment: 'none',
    widthType: 'none',
    heightType: 'none',
    spacing: 'none',
    flexBehavior: 'none',
  }

  // Test w full in different parents
  const parents = ['default', 'hor', 'ver', 'grid 12', 'stacked'] as const
  for (const parentLayout of parents) {
    // w full child
    combinations.push({
      parent: { ...baseChild, layoutMode: parentLayout, widthType: 'w 400' },
      child: { ...baseChild, widthType: 'w full' },
      description: `w full child in ${parentLayout} parent`,
    })

    // h full child
    combinations.push({
      parent: { ...baseChild, layoutMode: parentLayout, heightType: 'h 400' },
      child: { ...baseChild, heightType: 'h full' },
      description: `h full child in ${parentLayout} parent`,
    })

    // Fixed width child
    combinations.push({
      parent: { ...baseChild, layoutMode: parentLayout },
      child: { ...baseChild, widthType: 'w 100' },
      description: `Fixed width child in ${parentLayout} parent`,
    })
  }

  return combinations
}
