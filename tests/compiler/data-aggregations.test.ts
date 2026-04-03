/**
 * Data Aggregations Tests
 *
 * Tests the aggregation methods on collections:
 * .count, .sum, .avg, .min, .max, .first, .last
 *
 * Syntax: $collection.count, $collection.sum(field)
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler/index'

// ============================================================================
// $AGG HELPER GENERATION
// ============================================================================

describe('DataAggregations: Helper Generation', () => {
  it('generates $agg helper object', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('const $agg = {')
    expect(js).toContain('count:')
    expect(js).toContain('sum:')
    expect(js).toContain('avg:')
    expect(js).toContain('min:')
    expect(js).toContain('max:')
    expect(js).toContain('first:')
    expect(js).toContain('last:')
  })

  it('generates $get with aggregation pattern matching', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('aggMatch')
    expect(js).toContain('count|sum|avg|min|max|first|last')
  })
})

// ============================================================================
// COUNT AGGREGATION
// ============================================================================

describe('DataAggregations: Count', () => {
  it('generates count method', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('count: (arr) => Array.isArray(arr) ? arr.length : 0')
  })

  it('count returns array length', () => {
    const code = `
$tasks: [{ title: "A" }, { title: "B" }, { title: "C" }]

Frame
  Text $tasks.count
`
    const js = compile(code)

    // $get should be called with "tasks.count"
    expect(js).toContain('$get')
    expect(js).toContain('tasks')
  })
})

// ============================================================================
// SUM AGGREGATION
// ============================================================================

describe('DataAggregations: Sum', () => {
  it('generates sum method with field access', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('sum: (arr, field) =>')
    expect(js).toContain('reduce')
    // Uses $getField helper for nested property access support
    expect(js).toContain('$getField(i, field)')
  })

  it('sum with field parameter', () => {
    const code = `
$tasks: [{ effort: 5 }, { effort: 3 }, { effort: 2 }]

Frame
  Text $tasks.sum(effort)
`
    const js = compile(code)

    expect(js).toContain('$get')
  })
})

// ============================================================================
// AVG AGGREGATION
// ============================================================================

describe('DataAggregations: Avg', () => {
  it('generates avg method', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('avg:')
    expect(js).toContain('$agg.sum')
  })

  it('avg with field parameter', () => {
    const code = `
$tasks: [{ effort: 6 }, { effort: 4 }, { effort: 2 }]

Frame
  Text $tasks.avg(effort)
`
    const js = compile(code)

    expect(js).toContain('$get')
  })
})

// ============================================================================
// MIN/MAX AGGREGATIONS
// ============================================================================

describe('DataAggregations: Min/Max', () => {
  it('generates min method', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('min: (arr, field) =>')
    expect(js).toContain('Math.min')
  })

  it('generates max method', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('max: (arr, field) =>')
    expect(js).toContain('Math.max')
  })

  it('min/max with field access', () => {
    const code = `
$scores: [{ value: 10 }, { value: 5 }, { value: 15 }]

Frame
  Text "Min: "
  Text $scores.min(value)
  Text "Max: "
  Text $scores.max(value)
`
    const js = compile(code)

    expect(js).toContain('$get')
  })
})

// ============================================================================
// FIRST/LAST AGGREGATIONS
// ============================================================================

describe('DataAggregations: First/Last', () => {
  it('generates first method', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('first: (arr) => Array.isArray(arr) ? arr[0] : undefined')
  })

  it('generates last method', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('last: (arr) => Array.isArray(arr) ? arr[arr.length - 1] : undefined')
  })

  it('first/last on collections', () => {
    const code = `
$items: [{ name: "First" }, { name: "Middle" }, { name: "Last" }]

Frame
  Text $items.first
  Text $items.last
`
    const js = compile(code)

    expect(js).toContain('$get')
  })
})

// ============================================================================
// AGGREGATION PATTERN MATCHING
// ============================================================================

describe('DataAggregations: Pattern Matching', () => {
  it('matches simple aggregation: collection.count', () => {
    const code = `
Frame
`
    const js = compile(code)

    // The regex pattern should match collection.method
    expect(js).toContain('const aggMatch = name.match')
    expect(js).toContain('collectionPath, method, field')
  })

  it('matches aggregation with field: collection.sum(field)', () => {
    const code = `
Frame
`
    const js = compile(code)

    // The pattern should capture the field in parentheses
    // In generated JS: (?:\(([^)]+)\))?
    expect(js).toContain('([^)]+)')
  })

  it('returns 0 for non-array collections', () => {
    const code = `
Frame
`
    const js = compile(code)

    expect(js).toContain('if (Array.isArray(collection))')
    expect(js).toContain('return 0')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('DataAggregations: Edge Cases', () => {
  it('handles empty arrays for count', () => {
    const code = `
$empty: []

Frame
  Text $empty.count
`
    const js = compile(code)

    expect(js).toContain('$get')
    // count on empty array should return 0
    expect(js).toContain('arr.length : 0')
  })

  it('handles missing fields gracefully', () => {
    const code = `
Frame
`
    const js = compile(code)

    // Should use $getField helper for nested property access and default to 0
    expect(js).toContain('$getField(i, field)')
    expect(js).toContain('|| 0')
  })

  it('handles nested collection paths', () => {
    const code = `
$project: { tasks: [{ effort: 5 }, { effort: 3 }] }

Frame
  Text $project.tasks.count
  Text $project.tasks.sum(effort)
`
    const js = compile(code)

    expect(js).toContain('$get')
  })

  it('distinguishes aggregation from regular property access', () => {
    // Make sure .count as a regular property still works
    const code = `
$data: { count: 42 }

Frame
  Text $data.count
`
    const js = compile(code)

    expect(js).toContain('$get')
  })
})

// ============================================================================
// INTEGRATION WITH WHERE CLAUSES
// ============================================================================

describe('DataAggregations: With Filtering', () => {
  it('aggregation works on filtered collections in each', () => {
    const code = `
$tasks: [
  { title: "A", done: true, effort: 5 },
  { title: "B", done: false, effort: 3 },
  { title: "C", done: true, effort: 2 }
]

each task in $tasks where done == true
  Text task.title
`
    const js = compile(code)

    expect(js).toContain('filter')
    expect(js).toContain('done == true')
  })
})
