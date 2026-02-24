/**
 * @module converter/react-pivot/validation/llm-error-patterns
 * @description LLM-specific error pattern recognition and handling
 *
 * Different LLMs make different types of mistakes. This module:
 * - Identifies patterns characteristic of specific models
 * - Suggests model-specific corrections
 * - Tracks error patterns for learning
 */

import type { ValidationIssue, ValidationIssueType } from '../types'

// =============================================================================
// Types
// =============================================================================

export type LLMModel =
  | 'claude-sonnet'
  | 'claude-opus'
  | 'claude-haiku'
  | 'gpt-4'
  | 'gpt-3.5'
  | 'unknown'

export interface ErrorPattern {
  /** Pattern name for debugging */
  name: string

  /** Description of the pattern */
  description: string

  /** Issue types that characterize this pattern */
  issueTypes: ValidationIssueType[]

  /** Regex patterns to detect in the code */
  codePatterns: RegExp[]

  /** LLM models that commonly make this mistake */
  commonModels: LLMModel[]

  /** Priority for correction (higher = fix first) */
  priority: number

  /** Specific correction hints */
  correctionHints: string[]
}

export interface PatternMatchResult {
  pattern: ErrorPattern
  confidence: number
  matches: string[]
}

export interface LLMErrorAnalysis {
  /** Detected error patterns */
  patterns: PatternMatchResult[]

  /** Likely model based on error patterns */
  likelyModel: LLMModel

  /** Prioritized correction hints */
  hints: string[]

  /** Suggested prompt modifications */
  promptModifications: string[]
}

// =============================================================================
// Known Error Patterns
// =============================================================================

export const ERROR_PATTERNS: ErrorPattern[] = [
  // Pattern 1: Tailwind Color Habit
  {
    name: 'tailwind-colors',
    description: 'Using Tailwind-style color classes instead of tokens',
    issueTypes: ['HARDCODED_COLOR', 'CLASSNAME_USED'],
    codePatterns: [
      /bg-(\w+)-(\d+)/,           // bg-blue-500
      /text-(\w+)-(\d+)/,         // text-gray-400
      /border-(\w+)-(\d+)/,       // border-red-500
      /className\s*=.*bg-/,
    ],
    commonModels: ['gpt-4', 'gpt-3.5'],
    priority: 10,
    correctionHints: [
      'DO NOT use Tailwind classes. This is NOT a Tailwind project.',
      'Replace bg-blue-500 with style={{ background: "$primary.bg" }}',
      'Replace text-gray-400 with style={{ color: "$muted.col" }}',
    ],
  },

  // Pattern 2: React State Habit
  {
    name: 'react-state-hooks',
    description: 'Using React state management instead of Mirror actions',
    issueTypes: ['CUSTOM_HOOK'],
    codePatterns: [
      /useState\s*\(/,
      /useEffect\s*\(/,
      /useCallback\s*\(/,
      /useMemo\s*\(/,
      /setIs\w+\(/,              // setIsOpen, setIsActive
      /const\s*\[\w+,\s*set\w+\]/,
    ],
    commonModels: ['claude-sonnet', 'gpt-4'],
    priority: 9,
    correctionHints: [
      'NO React hooks! Use Mirror state system instead.',
      'Replace useState with states: { on: {...}, off: {...} }',
      'Replace setIsOpen(true) with onClick={{ action: "show", target: "Modal" }}',
    ],
  },

  // Pattern 3: Semantic HTML Habit
  {
    name: 'semantic-html',
    description: 'Using semantic HTML elements instead of allowed components',
    issueTypes: ['INVALID_COMPONENT'],
    codePatterns: [
      /<div[\s>]/,
      /<span[\s>]/,
      /<section[\s>]/,
      /<article[\s>]/,
      /<header[\s>]/,
      /<footer[\s>]/,
    ],
    commonModels: ['claude-haiku', 'gpt-3.5'],
    priority: 8,
    correctionHints: [
      'NO HTML elements! Use allowed components only.',
      'Replace <div> with <Box>',
      'Replace <span> with <Text>',
      'Replace <section> with <Section> or <Card>',
    ],
  },

  // Pattern 4: CSS-in-JS Color Habit
  {
    name: 'css-colors',
    description: 'Using CSS color values instead of tokens',
    issueTypes: ['HARDCODED_COLOR'],
    codePatterns: [
      /#[0-9A-Fa-f]{3,8}\b/,       // Hex colors
      /rgba?\s*\([^)]+\)/,         // rgb/rgba
      /hsla?\s*\([^)]+\)/,         // hsl/hsla
      /:\s*['"]?(white|black|red|blue|green|gray|grey)['"]?/i,
    ],
    commonModels: ['claude-sonnet', 'claude-opus', 'gpt-4'],
    priority: 10,
    correctionHints: [
      'ALL colors MUST be $tokens. NO exceptions!',
      'Replace #3B82F6 with $primary.bg',
      'Replace white with $heading.col or $on-primary.col',
      'Replace rgba(...) with $surface.bg + opacity property',
    ],
  },

  // Pattern 5: TypeScript Type Annotations
  {
    name: 'typescript-types',
    description: 'Including TypeScript type annotations in output',
    issueTypes: ['SYNTAX_ERROR'],
    codePatterns: [
      /:\s*(string|number|boolean|React\.\w+)/,
      /<[A-Z]\w+>/,               // Generic type params
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
    ],
    commonModels: ['claude-opus', 'gpt-4'],
    priority: 5,
    correctionHints: [
      'Output pure JSX only. NO TypeScript types.',
      'Remove all type annotations like : string, : number',
      'Remove interface and type declarations',
    ],
  },

  // Pattern 6: Template Literal Habit
  {
    name: 'template-literals',
    description: 'Using template literals for dynamic content',
    issueTypes: ['TEMPLATE_LITERAL'],
    codePatterns: [
      /`[^`]*\$\{[^}]+\}[^`]*`/,
      /`.*\$\{.*\}.*`/,
    ],
    commonModels: ['claude-sonnet', 'gpt-4'],
    priority: 6,
    correctionHints: [
      'Template literals are not supported.',
      'Use {"{$variable}"} for dynamic text',
      'Use string concatenation if needed',
    ],
  },

  // Pattern 7: Spread Props Habit
  {
    name: 'spread-props',
    description: 'Using spread operators for props',
    issueTypes: ['SPREAD_OPERATOR'],
    codePatterns: [
      /\{\s*\.\.\.\w+\s*\}/,
      /\{\s*\.\.\.props\s*\}/,
      /\{\s*\.\.\.rest\s*\}/,
    ],
    commonModels: ['claude-sonnet', 'claude-opus'],
    priority: 7,
    correctionHints: [
      'NO spread operators. Write all props explicitly.',
      'Remove {...props} and list each prop',
    ],
  },
]

// =============================================================================
// Pattern Detection
// =============================================================================

/**
 * Detect error patterns in the generated code
 */
export function detectErrorPatterns(
  code: string,
  issues: ValidationIssue[]
): PatternMatchResult[] {
  const results: PatternMatchResult[] = []

  for (const pattern of ERROR_PATTERNS) {
    const matches: string[] = []
    let confidence = 0

    // Check issue types
    const matchingIssues = issues.filter(i => pattern.issueTypes.includes(i.type))
    if (matchingIssues.length > 0) {
      confidence += 0.3 * Math.min(matchingIssues.length, 3)
    }

    // Check code patterns
    for (const regex of pattern.codePatterns) {
      const codeMatch = code.match(regex)
      if (codeMatch) {
        matches.push(codeMatch[0])
        confidence += 0.2
      }
    }

    // Only include if confidence is meaningful
    if (confidence >= 0.3) {
      results.push({
        pattern,
        confidence: Math.min(confidence, 1),
        matches,
      })
    }
  }

  // Sort by priority and confidence
  return results.sort((a, b) => {
    if (a.pattern.priority !== b.pattern.priority) {
      return b.pattern.priority - a.pattern.priority
    }
    return b.confidence - a.confidence
  })
}

/**
 * Infer likely LLM model based on error patterns
 */
export function inferLLMModel(patterns: PatternMatchResult[]): LLMModel {
  const modelScores = new Map<LLMModel, number>()

  for (const result of patterns) {
    for (const model of result.pattern.commonModels) {
      const current = modelScores.get(model) ?? 0
      modelScores.set(model, current + result.confidence)
    }
  }

  let bestModel: LLMModel = 'unknown'
  let bestScore = 0

  for (const [model, score] of modelScores) {
    if (score > bestScore) {
      bestScore = score
      bestModel = model
    }
  }

  return bestModel
}

// =============================================================================
// Analysis & Recommendations
// =============================================================================

/**
 * Analyze errors and provide LLM-specific recommendations
 */
export function analyzeLLMErrors(
  code: string,
  issues: ValidationIssue[]
): LLMErrorAnalysis {
  const patterns = detectErrorPatterns(code, issues)
  const likelyModel = inferLLMModel(patterns)

  // Collect unique hints in priority order
  const allHints = patterns.flatMap(p => p.pattern.correctionHints)
  const hints = [...new Set(allHints)]

  // Generate prompt modifications based on patterns
  const promptModifications = generatePromptModifications(patterns, likelyModel)

  return {
    patterns,
    likelyModel,
    hints,
    promptModifications,
  }
}

function generatePromptModifications(
  patterns: PatternMatchResult[],
  model: LLMModel
): string[] {
  const mods: string[] = []

  // Model-specific prefix
  if (model === 'gpt-4' || model === 'gpt-3.5') {
    mods.push(
      'IMPORTANT: This is NOT a standard React project. ' +
      'Do NOT use Tailwind, className, or CSS-in-JS patterns.'
    )
  }

  if (model.startsWith('claude')) {
    mods.push(
      'REMEMBER: No React hooks. Use the Mirror state/action system instead of useState/useEffect.'
    )
  }

  // Pattern-specific additions
  for (const result of patterns) {
    if (result.pattern.name === 'tailwind-colors' && result.confidence > 0.5) {
      mods.push('ZERO TOLERANCE for className or Tailwind classes. Use style={{}} ONLY.')
    }

    if (result.pattern.name === 'css-colors' && result.confidence > 0.5) {
      mods.push(
        'EVERY color must be a $token. Check your code for ANY hex (#), rgb(), or color name.'
      )
    }

    if (result.pattern.name === 'react-state-hooks' && result.confidence > 0.5) {
      mods.push(
        'DELETE all useState/useEffect. Use: states: { hover: {...} }, onClick={{ action: "toggle" }}'
      )
    }
  }

  return mods
}

// =============================================================================
// Export
// =============================================================================

export default analyzeLLMErrors
