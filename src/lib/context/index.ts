/**
 * Context Module
 *
 * Enhanced context provision for LLM generation.
 * Part of Enhanced Context Provider (Phase 2).
 */

export {
  summarizeContext,
  formatSummaryAsText,
  formatSummaryForLLM,
  createContextHint,
  type SummaryLevel,
  type SummaryConfig,
  type ContextSummary,
  type SummarySection,
} from './context-summarizer'

export {
  detectPatterns,
  findMatchingPatterns,
  getPatternContext,
  suggestPatternForComponent,
  type DetectedPattern,
  type PatternType,
  type PatternAnalysis,
  type PatternRecommendation,
} from './pattern-matcher'

export {
  analyzeModification,
  formatModificationContext,
  needsValidation,
  type ModificationType,
  type ModificationContext,
  type ModificationLocation,
  type ModificationConstraint,
  type ModificationRequest,
} from './modification-context'

export {
  ContextProvider,
  createContextProvider,
  getFormattedContext,
  getGenerationContext,
  getModificationContext,
  type ContextRequestOptions,
  type ContextResult,
} from './context-provider'
