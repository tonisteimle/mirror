/**
 * Auto-Layout Module
 * Feature 8: Auto-Layout Suggestions
 *
 * Detects layout patterns and suggests auto-layout conversions.
 */

export {
  type LayoutRect,
  type LayoutPattern,
  type LayoutSuggestion,
  type PatternDetectorConfig,
  detectLayoutPattern,
  getLayoutRectsFromDOM,
} from './pattern-detector'

export {
  type SuggestionTooltipConfig,
  SuggestionTooltip,
  createSuggestionTooltip,
} from './suggestion-tooltip'
