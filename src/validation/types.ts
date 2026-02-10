// Validation Types

import type { ValidationTabType } from '../types/common'

// Re-export for backwards compatibility
export type TabType = ValidationTabType

export interface ValidationError {
  type: ErrorType
  tab: TabType
  line: number
  column?: number
  message: string
  source: string
}

export interface ValidationWarning {
  type: WarningType
  tab: TabType
  line: number
  message: string
  suggestion?: string
}

export interface Correction {
  tab: TabType
  line: number
  original: string
  corrected: string
  reason: string
  confidence: number // 0-1
}

export interface ValidationResult {
  isValid: boolean
  components: string
  layout: string
  errors: ValidationError[]
  warnings: ValidationWarning[]
  corrections: Correction[]
}

export interface ParsedLine {
  lineNumber: number
  indent: number
  raw: string
  trimmed: string
  isEmpty: boolean
  isComment: boolean
  isDefinition: boolean // has ':'
  componentName: string | null
  hasFrom: boolean
  fromTarget: string | null
  properties: PropertyToken[]
  content: string | null
  inlineSlots: InlineSlot[]
}

export interface PropertyToken {
  name: string
  value: string | number | boolean | null
  startColumn: number
}

export interface InlineSlot {
  name: string
  content: string
}

export interface ComponentInfo {
  name: string
  definedAt: { tab: TabType; line: number }
  properties: Set<string>
  children: string[]
  extendsFrom: string | null
}

export type ErrorType =
  | 'INVALID_SYNTAX'
  | 'UNKNOWN_PROPERTY'
  | 'INVALID_VALUE'
  | 'MISSING_COMPONENT'
  | 'INVALID_REFERENCE'
  | 'PROPERTY_IN_LAYOUT'
  | 'DEFINITION_IN_LAYOUT'
  | 'INVALID_INDENTATION'
  | 'CIRCULAR_REFERENCE'
  | 'DUPLICATE_DEFINITION'
  | 'INVALID_COLOR'
  | 'MISSING_VALUE'
  | 'CONFLICTING_PROPERTIES'

export type WarningType =
  | 'UNUSED_COMPONENT'
  | 'SIMILAR_PROPERTY'
  | 'POSSIBLE_TYPO'
  | 'LOW_CONFIDENCE_CORRECTION'
  | 'REDUNDANT_PROPERTY'
  | 'MISSING_CHILD_DEFINITION'

// Re-export DSL properties from central source
export {
  PROPERTIES as KNOWN_PROPERTIES,
  DIRECTIONS,
  BOOLEAN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
  isDirectionOrCombo,
  splitDirectionCombo
} from '../dsl/properties'

export const PROPERTIES_WITH_VALUES = new Set([
  'gap', 'w', 'h', 'minw', 'maxw', 'minh', 'maxh',
  'pad', 'mar', 'col', 'boc', 'rad', 'border', 'bor',
  'size', 'weight', 'font', 'icon'
])
