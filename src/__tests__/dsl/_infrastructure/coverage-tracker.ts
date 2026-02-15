/**
 * Coverage Tracker
 *
 * Tracks which DSL syntax features have been tested.
 * Use this to ensure comprehensive test coverage.
 */

// ============================================
// Syntax Categories
// ============================================

/**
 * All DSL properties that should be tested.
 */
export const DSL_PROPERTIES = {
  // Spacing
  spacing: ['pad', 'padding', 'mar', 'margin', 'gap', 'gap-x', 'gap-y'],

  // Sizing
  sizing: ['w', 'width', 'h', 'height', 'minw', 'min-width', 'maxw', 'max-width', 'minh', 'min-height', 'maxh', 'max-height', 'full'],

  // Colors
  colors: ['bg', 'background', 'col', 'color', 'boc', 'border-color'],

  // Border
  border: ['bor', 'border', 'rad', 'radius'],

  // Layout Direction
  layout: ['hor', 'horizontal', 'ver', 'vertical', 'between', 'wrap', 'grow', 'fill', 'shrink', 'stacked'],

  // Alignment
  alignment: ['hor-l', 'horizontal-left', 'hor-cen', 'horizontal-center', 'hor-r', 'horizontal-right', 'ver-t', 'vertical-top', 'ver-cen', 'vertical-center', 'ver-b', 'vertical-bottom', 'cen', 'center'],

  // Typography
  typography: ['size', 'weight', 'line', 'font', 'align', 'italic', 'underline', 'uppercase', 'lowercase', 'truncate'],

  // Visual
  visual: ['opacity', 'opa', 'shadow', 'cursor', 'z', 'hidden', 'visible', 'disabled'],

  // Scroll
  scroll: ['scroll', 'scroll-ver', 'scroll-hor', 'scroll-both', 'snap', 'clip'],

  // Grid
  grid: ['grid'],

  // Hover
  hover: ['hover-color', 'hover-background', 'hover-border-color', 'hover-border', 'hover-radius', 'hover-opacity', 'hover-scale'],
} as const

/**
 * All DSL events that should be tested.
 */
export const DSL_EVENTS = [
  'onclick',
  'onclick-outside',
  'onhover',
  'onchange',
  'oninput',
  'onfocus',
  'onblur',
  'onkeydown',
  'onkeyup',
  'onload',
] as const

/**
 * All DSL actions that should be tested.
 */
export const DSL_ACTIONS = [
  'toggle',
  'open',
  'close',
  'show',
  'hide',
  'change',
  'page',
  'assign',
  'highlight',
  'select',
  'deselect',
  'clear-selection',
  'filter',
  'focus',
  'activate',
  'deactivate',
  'deactivate-siblings',
  'toggle-state',
  'validate',
  'reset',
] as const

/**
 * Primitive components that should be tested.
 */
export const DSL_PRIMITIVES = [
  'Input',
  'Textarea',
  'Image',
  'Link',
  'Button',
  'Icon',
] as const

// ============================================
// Coverage State
// ============================================

interface CoverageState {
  properties: Map<string, Set<string>>  // category -> tested properties
  events: Set<string>
  actions: Set<string>
  primitives: Set<string>
}

let coverageState: CoverageState = {
  properties: new Map(),
  events: new Set(),
  actions: new Set(),
  primitives: new Set(),
}

/**
 * Mark a property as tested.
 */
export function markPropertyTested(category: keyof typeof DSL_PROPERTIES, property: string): void {
  if (!coverageState.properties.has(category)) {
    coverageState.properties.set(category, new Set())
  }
  coverageState.properties.get(category)!.add(property)
}

/**
 * Mark an event as tested.
 */
export function markEventTested(event: string): void {
  coverageState.events.add(event)
}

/**
 * Mark an action as tested.
 */
export function markActionTested(action: string): void {
  coverageState.actions.add(action)
}

/**
 * Mark a primitive as tested.
 */
export function markPrimitiveTested(primitive: string): void {
  coverageState.primitives.add(primitive)
}

/**
 * Reset coverage state (for testing the tracker itself).
 */
export function resetCoverage(): void {
  coverageState = {
    properties: new Map(),
    events: new Set(),
    actions: new Set(),
    primitives: new Set(),
  }
}

// ============================================
// Coverage Reports
// ============================================

interface CoverageReport {
  properties: {
    [category: string]: {
      total: number
      tested: number
      coverage: number
      missing: string[]
    }
  }
  events: {
    total: number
    tested: number
    coverage: number
    missing: string[]
  }
  actions: {
    total: number
    tested: number
    coverage: number
    missing: string[]
  }
  primitives: {
    total: number
    tested: number
    coverage: number
    missing: string[]
  }
  overall: number
}

/**
 * Generate coverage report.
 */
export function getCoverageReport(): CoverageReport {
  const report: CoverageReport = {
    properties: {},
    events: {
      total: DSL_EVENTS.length,
      tested: coverageState.events.size,
      coverage: (coverageState.events.size / DSL_EVENTS.length) * 100,
      missing: DSL_EVENTS.filter(e => !coverageState.events.has(e)),
    },
    actions: {
      total: DSL_ACTIONS.length,
      tested: coverageState.actions.size,
      coverage: (coverageState.actions.size / DSL_ACTIONS.length) * 100,
      missing: DSL_ACTIONS.filter(a => !coverageState.actions.has(a)),
    },
    primitives: {
      total: DSL_PRIMITIVES.length,
      tested: coverageState.primitives.size,
      coverage: (coverageState.primitives.size / DSL_PRIMITIVES.length) * 100,
      missing: DSL_PRIMITIVES.filter(p => !coverageState.primitives.has(p)),
    },
    overall: 0,
  }

  // Calculate property coverage by category
  let totalProperties = 0
  let testedProperties = 0

  for (const [category, properties] of Object.entries(DSL_PROPERTIES)) {
    const tested = coverageState.properties.get(category) || new Set()
    const missing = properties.filter(p => !tested.has(p))

    report.properties[category] = {
      total: properties.length,
      tested: tested.size,
      coverage: (tested.size / properties.length) * 100,
      missing,
    }

    totalProperties += properties.length
    testedProperties += tested.size
  }

  // Calculate overall coverage
  const totalItems = totalProperties + DSL_EVENTS.length + DSL_ACTIONS.length + DSL_PRIMITIVES.length
  const testedItems = testedProperties + coverageState.events.size + coverageState.actions.size + coverageState.primitives.size
  report.overall = (testedItems / totalItems) * 100

  return report
}

/**
 * Print coverage report to console.
 */
export function printCoverageReport(): void {
  const report = getCoverageReport()

  console.log('\n=== DSL Test Coverage Report ===\n')

  console.log('Properties:')
  for (const [category, data] of Object.entries(report.properties)) {
    const status = data.coverage === 100 ? '✅' : data.coverage > 50 ? '🔶' : '❌'
    console.log(`  ${status} ${category}: ${data.tested}/${data.total} (${data.coverage.toFixed(1)}%)`)
    if (data.missing.length > 0) {
      console.log(`      Missing: ${data.missing.join(', ')}`)
    }
  }

  console.log('\nEvents:')
  const evtStatus = report.events.coverage === 100 ? '✅' : report.events.coverage > 50 ? '🔶' : '❌'
  console.log(`  ${evtStatus} ${report.events.tested}/${report.events.total} (${report.events.coverage.toFixed(1)}%)`)
  if (report.events.missing.length > 0) {
    console.log(`      Missing: ${report.events.missing.join(', ')}`)
  }

  console.log('\nActions:')
  const actStatus = report.actions.coverage === 100 ? '✅' : report.actions.coverage > 50 ? '🔶' : '❌'
  console.log(`  ${actStatus} ${report.actions.tested}/${report.actions.total} (${report.actions.coverage.toFixed(1)}%)`)
  if (report.actions.missing.length > 0) {
    console.log(`      Missing: ${report.actions.missing.join(', ')}`)
  }

  console.log('\nPrimitives:')
  const primStatus = report.primitives.coverage === 100 ? '✅' : report.primitives.coverage > 50 ? '🔶' : '❌'
  console.log(`  ${primStatus} ${report.primitives.tested}/${report.primitives.total} (${report.primitives.coverage.toFixed(1)}%)`)
  if (report.primitives.missing.length > 0) {
    console.log(`      Missing: ${report.primitives.missing.join(', ')}`)
  }

  console.log('\n---')
  const overallStatus = report.overall === 100 ? '✅' : report.overall > 50 ? '🔶' : '❌'
  console.log(`${overallStatus} Overall Coverage: ${report.overall.toFixed(1)}%`)
  console.log('')
}
