/**
 * Quality Analyzer Types
 */

// =============================================================================
// Static Analysis Results
// =============================================================================

export interface ColorUsage {
  value: string
  count: number
  lines: number[]
  isToken: boolean
  suggestedToken?: string
}

export interface SpacingUsage {
  value: number
  property: string // pad, gap, mar
  count: number
  lines: number[]
  isToken: boolean
  suggestedToken?: string
}

export interface FontUsage {
  size?: number
  weight?: string | number
  family?: string
  count: number
  lines: number[]
}

export interface ComponentPattern {
  /** Unique hash of the pattern */
  hash: string
  /** Lines where this pattern appears */
  lines: number[]
  /** Sample code of the pattern */
  sample: string
  /** Number of occurrences */
  count: number
  /** Suggested component name */
  suggestedName?: string
}

export interface PropertyInLayout {
  line: number
  component: string
  properties: string[]
  /** Is this inside a component definition or inline in layout? */
  isInline: boolean
}

export interface DefinedToken {
  name: string
  value: string
  line: number
  /** How often is it used? */
  usageCount: number
}

export interface DefinedComponent {
  name: string
  line: number
  /** How often is it used? */
  usageCount: number
  /** Base primitive if any */
  basePrimitive?: string
}

/** Primitive used directly when a component wrapper exists */
export interface UnwrappedPrimitive {
  primitive: string // e.g., "Select"
  line: number
  suggestedComponent: string // e.g., "FormSelect"
}

export interface StaticAnalysis {
  // Raw data
  colors: ColorUsage[]
  spacings: SpacingUsage[]
  fonts: FontUsage[]
  patterns: ComponentPattern[]
  propertiesInLayout: PropertyInLayout[]

  // Consistency issues
  unwrappedPrimitives: UnwrappedPrimitive[]

  // Definitions
  definedTokens: DefinedToken[]
  definedComponents: DefinedComponent[]

  // Metrics
  totalLines: number
  totalElements: number
  uniqueColors: number
  uniqueSpacings: number
  uniqueFonts: number
}

// =============================================================================
// Quality Issues
// =============================================================================

export type IssueSeverity = 'error' | 'warning' | 'info'

export type IssueCategory =
  | 'token-coverage'
  | 'component-abstraction'
  | 'consistency'
  | 'design-variance'
  | 'layout-cleanliness'

export interface QualityIssue {
  category: IssueCategory
  severity: IssueSeverity
  message: string
  lines: number[]
  /** Current code */
  current?: string
  /** Suggested fix */
  suggestion?: string
  /** Explanation why this is an issue */
  reason?: string
}

// =============================================================================
// Quality Report
// =============================================================================

export interface CategoryScore {
  score: number // 0-100
  issues: QualityIssue[]
}

export interface QualityReport {
  /** Overall score 0-100 */
  overallScore: number

  /** Score per category */
  categories: {
    tokenCoverage: CategoryScore
    componentAbstraction: CategoryScore
    consistency: CategoryScore
    designVariance: CategoryScore
    layoutCleanliness: CategoryScore
  }

  /** All issues sorted by severity */
  issues: QualityIssue[]

  /** Summary for quick overview */
  summary: string

  /** Static analysis data (for reference) */
  analysis: StaticAnalysis
}

// =============================================================================
// Analyzer Config
// =============================================================================

export interface QualityConfig {
  /** Max unique colors before warning */
  maxColors?: number
  /** Max unique spacings before warning */
  maxSpacings?: number
  /** Max unique fonts before warning */
  maxFonts?: number
  /** Min occurrences before suggesting component */
  minPatternOccurrences?: number
  /** Ignore these token names */
  ignoreTokens?: string[]
}

export const DEFAULT_CONFIG: QualityConfig = {
  maxColors: 12,
  maxSpacings: 8,
  maxFonts: 3,
  minPatternOccurrences: 2,
  ignoreTokens: [],
}
