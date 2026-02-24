/**
 * Analysis Module
 *
 * Provides comprehensive code analysis for Mirror DSL.
 * Used for context extraction before LLM generation.
 */

export {
  extractTokens,
  categorizeTokens,
  findTokenByValue,
  hasTokenForValue,
  getUniqueValues,
  type ExtractedToken,
  type CategorizedTokens,
} from './token-extractor'

export {
  extractComponents,
  findComponentUsages,
  getDefinitions,
  getInstances,
  findUnusedDefinitions,
  findUndefinedComponents,
  getInheritanceChain,
  type ExtractedComponent,
} from './component-extractor'

export {
  analyzeLayout,
  detectLayoutPattern,
  calculateDepth,
  getNodesAtDepth,
  findNodeByName,
  getPathToNode,
  type LayoutNode,
  type LayoutAnalysis,
} from './layout-analyzer'

export {
  detectNamingConventions,
  suggestName,
  followsConventions,
  findNamingViolations,
  type NamingConventions,
} from './naming-detector'

export {
  findConnectionPoints,
  scoreConnectionPoint,
  findBestConnectionPoint,
  getConnectionPointsForParent,
  formatConnectionPointForLLM,
  type ConnectionPoint,
} from './connection-finder'

export {
  analyzeContext,
  hasFeature,
  getMinimalContext,
  formatContextForLLM,
  type CodeContext,
  type AnalyzeContextOptions,
} from './context-analyzer'
