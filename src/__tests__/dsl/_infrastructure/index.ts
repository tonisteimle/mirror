/**
 * DSL Test Infrastructure
 *
 * Export all infrastructure utilities for DSL testing.
 */

export {
  runSyntaxTests,
  propertyTest,
  shorthandTest,
  equivalentForms,
  type SyntaxTest,
  type TestExpectations,
  type ParseExpectations,
  type RenderExpectations,
} from './test-runner'

export {
  normalizeASTNode,
  parseToSnapshot,
  elementToSnapshot,
  renderToSnapshot,
  stylesMatch,
  styleDiff,
  type ElementSnapshot,
} from './snapshot-utils'

export {
  DSL_PROPERTIES,
  DSL_EVENTS,
  DSL_ACTIONS,
  DSL_PRIMITIVES,
  markPropertyTested,
  markEventTested,
  markActionTested,
  markPrimitiveTested,
  resetCoverage,
  getCoverageReport,
  printCoverageReport,
} from './coverage-tracker'
