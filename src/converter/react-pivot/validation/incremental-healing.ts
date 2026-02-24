/**
 * @module converter/react-pivot/validation/incremental-healing
 * @description 6-Phase Incremental Healing Pipeline
 *
 * Progressive healing approach for maximum success rate:
 * Phase 1: Auto-fix (pattern-based quick fixes)
 * Phase 2: Validate (check remaining issues)
 * Phase 3: Targeted fixes (focus on specific issue types)
 * Phase 4: Validate (check progress)
 * Phase 5: Semantic repair (structural corrections)
 * Phase 6: LLM escalation (regenerate problematic sections)
 */

import type { ValidationIssue, ValidationIssueType } from '../types'
import { validateReactCode } from './react-linter'
import { healReactCode } from './healing'

// =============================================================================
// Types
// =============================================================================

export type HealingPhase =
  | 'auto-fix'
  | 'validation-1'
  | 'targeted-fix'
  | 'validation-2'
  | 'semantic-repair'
  | 'llm-escalation'

export interface PhaseResult {
  phase: HealingPhase
  code: string
  issuesBefore: number
  issuesAfter: number
  fixesApplied: number
  duration: number
  success: boolean
}

export interface IncrementalHealingResult {
  success: boolean
  originalCode: string
  healedCode: string
  phases: PhaseResult[]
  totalDuration: number
  totalFixesApplied: number
  remainingIssues: ValidationIssue[]
  escalatedToLLM: boolean
}

export interface IncrementalHealingOptions {
  /** Maximum attempts per phase */
  maxAttemptsPerPhase?: number
  /** Timeout per phase in ms */
  phaseTimeout?: number
  /** Enable LLM escalation as last resort */
  enableLLMEscalation?: boolean
  /** Callback for LLM regeneration (must be provided if enableLLMEscalation is true) */
  llmRegenerator?: (code: string, issues: ValidationIssue[]) => Promise<string>
  /** Debug logging */
  debug?: boolean
}

const DEFAULT_OPTIONS: Required<Omit<IncrementalHealingOptions, 'llmRegenerator'>> = {
  maxAttemptsPerPhase: 3,
  phaseTimeout: 2000,
  enableLLMEscalation: false,
  debug: false,
}

// =============================================================================
// Pattern-Based Auto-Fixes (Phase 1)
// =============================================================================

interface PatternFix {
  name: string
  pattern: RegExp
  replacement: string | ((match: string, ...groups: string[]) => string)
  issueTypes: ValidationIssueType[]
}

const PATTERN_FIXES: PatternFix[] = [
  // Fix className to style conversion
  {
    name: 'remove-className',
    pattern: /className\s*=\s*["'][^"']*["']/g,
    replacement: '',
    issueTypes: ['CLASSNAME_USED'],
  },

  // Fix common color hex patterns
  {
    name: 'fix-white-color',
    pattern: /:\s*["']?#fff(?:fff)?["']?/gi,
    replacement: ': "$heading.col"',
    issueTypes: ['HARDCODED_COLOR'],
  },
  {
    name: 'fix-black-color',
    pattern: /:\s*["']?#000(?:000)?["']?/gi,
    replacement: ': "$default.bg"',
    issueTypes: ['HARDCODED_COLOR'],
  },
  {
    name: 'fix-blue-primary',
    pattern: /:\s*["']?#3[Bb]82[Ff]6["']?/g,
    replacement: ': "$primary.bg"',
    issueTypes: ['HARDCODED_COLOR'],
  },
  {
    name: 'fix-red-danger',
    pattern: /:\s*["']?#[Ee][Ff]4444["']?/g,
    replacement: ': "$danger.bg"',
    issueTypes: ['HARDCODED_COLOR'],
  },
  {
    name: 'fix-green-success',
    pattern: /:\s*["']?#22[Cc]55[Ee]["']?/g,
    replacement: ': "$success.bg"',
    issueTypes: ['HARDCODED_COLOR'],
  },

  // Fix named colors
  {
    name: 'fix-named-white',
    pattern: /:\s*["']white["']/gi,
    replacement: ': "$heading.col"',
    issueTypes: ['HARDCODED_COLOR'],
  },
  {
    name: 'fix-named-black',
    pattern: /:\s*["']black["']/gi,
    replacement: ': "$default.bg"',
    issueTypes: ['HARDCODED_COLOR'],
  },
  {
    name: 'fix-named-transparent',
    pattern: /:\s*["']transparent["']/gi,
    replacement: ': "transparent"', // transparent is allowed
    issueTypes: [],
  },

  // Fix HTML elements
  {
    name: 'fix-div-to-Box',
    pattern: /<div(\s|>)/g,
    replacement: '<Box$1',
    issueTypes: ['INVALID_COMPONENT'],
  },
  {
    name: 'fix-div-close',
    pattern: /<\/div>/g,
    replacement: '</Box>',
    issueTypes: ['INVALID_COMPONENT'],
  },
  {
    name: 'fix-span-to-Text',
    pattern: /<span(\s|>)/g,
    replacement: '<Text$1',
    issueTypes: ['INVALID_COMPONENT'],
  },
  {
    name: 'fix-span-close',
    pattern: /<\/span>/g,
    replacement: '</Text>',
    issueTypes: ['INVALID_COMPONENT'],
  },

  // Fix React hooks
  {
    name: 'remove-useState-import',
    pattern: /import\s*\{[^}]*useState[^}]*\}\s*from\s*['"]react['"];?\n?/g,
    replacement: '',
    issueTypes: ['CUSTOM_HOOK'],
  },
  {
    name: 'remove-useEffect-import',
    pattern: /import\s*\{[^}]*useEffect[^}]*\}\s*from\s*['"]react['"];?\n?/g,
    replacement: '',
    issueTypes: ['CUSTOM_HOOK'],
  },

  // Fix spread operators
  {
    name: 'remove-spread-props',
    pattern: /\{\s*\.\.\.props\s*\}/g,
    replacement: '',
    issueTypes: ['SPREAD_OPERATOR'],
  },
  {
    name: 'remove-spread-rest',
    pattern: /\{\s*\.\.\.rest\s*\}/g,
    replacement: '',
    issueTypes: ['SPREAD_OPERATOR'],
  },

  // Fix token format
  {
    name: 'fix-token-format-dash',
    pattern: /\$([a-z]+)-([a-z]+)/g,
    replacement: (_, name, prop) => `$${name}.${prop}`,
    issueTypes: ['INVALID_TOKEN'],
  },
]

function applyPatternFixes(code: string, targetIssueTypes?: ValidationIssueType[]): {
  code: string
  fixesApplied: number
} {
  let result = code
  let fixesApplied = 0

  for (const fix of PATTERN_FIXES) {
    // Skip if targeting specific issue types and this fix doesn't match
    if (targetIssueTypes && targetIssueTypes.length > 0) {
      const hasMatchingType = fix.issueTypes.some(t => targetIssueTypes.includes(t))
      if (!hasMatchingType && fix.issueTypes.length > 0) {
        continue
      }
    }

    const before = result
    if (typeof fix.replacement === 'string') {
      result = result.replace(fix.pattern, fix.replacement)
    } else {
      result = result.replace(fix.pattern, fix.replacement)
    }

    if (result !== before) {
      fixesApplied++
    }
  }

  return { code: result, fixesApplied }
}

// =============================================================================
// Targeted Fixes (Phase 3)
// =============================================================================

interface TargetedFixStrategy {
  issueType: ValidationIssueType
  fix: (code: string, issues: ValidationIssue[]) => string
}

const TARGETED_STRATEGIES: TargetedFixStrategy[] = [
  // Fix hardcoded colors by context
  {
    issueType: 'HARDCODED_COLOR',
    fix: (code, issues) => {
      let result = code

      for (const issue of issues.filter(i => i.type === 'HARDCODED_COLOR')) {
        if (!issue.code) continue

        // Determine token based on property context
        const token = inferTokenFromContext(issue.code, code)
        if (token) {
          // Replace the specific occurrence
          result = result.replace(issue.code, token)
        }
      }

      return result
    },
  },

  // Fix invalid components
  {
    issueType: 'INVALID_COMPONENT',
    fix: (code, issues) => {
      let result = code

      const componentMap: Record<string, string> = {
        'div': 'Box',
        'span': 'Text',
        'p': 'Text',
        'h1': 'Title',
        'h2': 'Title',
        'h3': 'Title',
        'section': 'Section',
        'article': 'Card',
        'header': 'Header',
        'footer': 'Footer',
        'nav': 'Nav',
        'main': 'Box',
        'aside': 'Box',
        'form': 'Box',
        'label': 'Label',
        'a': 'Link',
        'img': 'Image',
        'ul': 'List',
        'ol': 'List',
        'li': 'Item',
      }

      for (const [html, mirror] of Object.entries(componentMap)) {
        const openPattern = new RegExp(`<${html}(\\s|>)`, 'gi')
        const closePattern = new RegExp(`</${html}>`, 'gi')
        result = result.replace(openPattern, `<${mirror}$1`)
        result = result.replace(closePattern, `</${mirror}>`)
      }

      return result
    },
  },

  // Fix unsupported props
  {
    issueType: 'UNSUPPORTED_PROP',
    fix: (code, issues) => {
      let result = code

      const propMap: Record<string, string> = {
        'backgroundColor': 'background',
        'fontSize': 'fontSize',
        'fontWeight': 'fontWeight',
        'borderRadius': 'borderRadius',
        'boxShadow': 'shadow',
        'textAlign': 'textAlign',
        'flexDirection': 'direction',
        'alignItems': 'alignItems',
        'justifyContent': 'justifyContent',
        'display': '', // Remove display
        'position': '', // Remove position
        'top': '',
        'left': '',
        'right': '',
        'bottom': '',
      }

      for (const [css, mirror] of Object.entries(propMap)) {
        if (mirror) {
          // Replace with mirror equivalent
          const pattern = new RegExp(`${css}\\s*:`, 'g')
          result = result.replace(pattern, `${mirror}:`)
        } else {
          // Remove unsupported property
          const pattern = new RegExp(`${css}\\s*:\\s*[^,}]+,?`, 'g')
          result = result.replace(pattern, '')
        }
      }

      return result
    },
  },
]

function inferTokenFromContext(colorCode: string, fullCode: string): string | null {
  // Find the context around this color
  const index = fullCode.indexOf(colorCode)
  if (index === -1) return null

  const context = fullCode.substring(Math.max(0, index - 50), index + colorCode.length + 10)
  const contextLower = context.toLowerCase()

  // Determine token based on property
  if (contextLower.includes('background')) {
    if (colorCode.match(/#[0-9a-f]{6}/i)) {
      const isLight = isLightColor(colorCode)
      return isLight ? '"$surface.bg"' : '"$elevated.bg"'
    }
  }

  if (contextLower.includes('color')) {
    return '"$default.col"'
  }

  if (contextLower.includes('border')) {
    return '"$muted.col"'
  }

  // Default based on color brightness
  const isLight = isLightColor(colorCode)
  return isLight ? '"$heading.col"' : '"$default.bg"'
}

function isLightColor(hex: string): boolean {
  const match = hex.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i)
  if (!match) return true

  const r = parseInt(match[1], 16)
  const g = parseInt(match[2], 16)
  const b = parseInt(match[3], 16)

  // Calculate perceived brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128
}

function applyTargetedFixes(
  code: string,
  issues: ValidationIssue[]
): { code: string; fixesApplied: number } {
  let result = code
  let fixesApplied = 0

  // Group issues by type
  const issuesByType = new Map<ValidationIssueType, ValidationIssue[]>()
  for (const issue of issues) {
    if (!issuesByType.has(issue.type)) {
      issuesByType.set(issue.type, [])
    }
    issuesByType.get(issue.type)!.push(issue)
  }

  // Apply targeted strategies
  for (const strategy of TARGETED_STRATEGIES) {
    const typeIssues = issuesByType.get(strategy.issueType)
    if (!typeIssues || typeIssues.length === 0) continue

    const before = result
    result = strategy.fix(result, typeIssues)

    if (result !== before) {
      fixesApplied++
    }
  }

  return { code: result, fixesApplied }
}

// =============================================================================
// Semantic Repair (Phase 5)
// =============================================================================

interface SemanticRepair {
  name: string
  detect: (code: string, issues: ValidationIssue[]) => boolean
  repair: (code: string) => string
}

const SEMANTIC_REPAIRS: SemanticRepair[] = [
  // Fix unbalanced JSX tags
  {
    name: 'balance-jsx-tags',
    detect: (code) => {
      // Simple check for common unbalanced patterns
      const openTags = (code.match(/<[A-Z][a-zA-Z]*[^/>]*>/g) || []).length
      const closeTags = (code.match(/<\/[A-Z][a-zA-Z]*>/g) || []).length
      const selfClosing = (code.match(/<[A-Z][a-zA-Z]*[^>]*\/>/g) || []).length
      return openTags !== closeTags + selfClosing
    },
    repair: (code) => {
      // Try to balance by adding missing close tags
      const lines = code.split('\n')
      const openStack: string[] = []

      for (const line of lines) {
        const opens = line.match(/<([A-Z][a-zA-Z]*)[^/>]*>/g) || []
        const closes = line.match(/<\/([A-Z][a-zA-Z]*)>/g) || []

        for (const open of opens) {
          const tag = open.match(/<([A-Z][a-zA-Z]*)/)?.[1]
          if (tag) openStack.push(tag)
        }

        for (const close of closes) {
          const tag = close.match(/<\/([A-Z][a-zA-Z]*)>/)?.[1]
          if (tag && openStack.length > 0) {
            // Remove matching open tag
            const idx = openStack.lastIndexOf(tag)
            if (idx !== -1) openStack.splice(idx, 1)
          }
        }
      }

      // Add missing close tags
      let result = code
      while (openStack.length > 0) {
        const tag = openStack.pop()
        result += `\n</${tag}>`
      }

      return result
    },
  },

  // Fix incomplete mirror() definitions
  {
    name: 'fix-mirror-definition',
    detect: (code) => {
      return /mirror\s*\(\s*\{[^}]*$/.test(code) ||
             /mirror\s*\([^)]*$/.test(code)
    },
    repair: (code) => {
      // Try to close incomplete mirror definitions
      let result = code

      // Count braces and parens in mirror() calls
      const mirrorMatches = result.match(/mirror\s*\(/g) || []
      for (let i = 0; i < mirrorMatches.length; i++) {
        const startIdx = result.indexOf('mirror(')
        if (startIdx === -1) continue

        let braceCount = 0
        let parenCount = 0
        let inMirror = false

        for (let j = startIdx; j < result.length; j++) {
          const char = result[j]
          if (char === '(') {
            parenCount++
            inMirror = true
          } else if (char === ')') {
            parenCount--
            if (parenCount === 0 && inMirror) break
          } else if (char === '{') {
            braceCount++
          } else if (char === '}') {
            braceCount--
          }
        }

        // Add missing closing
        if (braceCount > 0) {
          result += '}'.repeat(braceCount)
        }
        if (parenCount > 0) {
          result += ')'.repeat(parenCount)
        }
      }

      return result
    },
  },

  // Remove React imports
  {
    name: 'remove-react-imports',
    detect: (code) => /import\s+.*\s+from\s+['"]react['"]/.test(code),
    repair: (code) => {
      return code.replace(/import\s+.*\s+from\s+['"]react['"];?\n?/g, '')
    },
  },

  // Remove TypeScript type annotations
  {
    name: 'remove-typescript',
    detect: (code) => /:\s*(string|number|boolean|React\.\w+|FC)/.test(code),
    repair: (code) => {
      // Remove type annotations from function params
      let result = code.replace(/:\s*(string|number|boolean|any)\b/g, '')
      // Remove React.FC type
      result = result.replace(/:\s*React\.\w+(<[^>]+>)?/g, '')
      // Remove generic type params
      result = result.replace(/<[A-Z]\w*>/g, '')
      return result
    },
  },
]

function applySemanticRepairs(
  code: string,
  issues: ValidationIssue[]
): { code: string; repairsApplied: number } {
  let result = code
  let repairsApplied = 0

  for (const repair of SEMANTIC_REPAIRS) {
    if (repair.detect(result, issues)) {
      const before = result
      result = repair.repair(result)
      if (result !== before) {
        repairsApplied++
      }
    }
  }

  return { code: result, repairsApplied }
}

// =============================================================================
// Main Pipeline
// =============================================================================

/**
 * Execute 6-phase incremental healing pipeline
 */
export async function incrementalHeal(
  code: string,
  options: IncrementalHealingOptions = {}
): Promise<IncrementalHealingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = performance.now()
  const phases: PhaseResult[] = []
  let currentCode = code
  let escalatedToLLM = false

  // Get initial issues
  const initialValidation = validateReactCode(code)
  const initialIssues = initialValidation.issues

  if (opts.debug) {
    console.log(`[Incremental Healing] Starting with ${initialIssues.length} issues`)
  }

  // Phase 1: Auto-fix (pattern-based)
  const phase1Start = performance.now()
  const phase1Result = applyPatternFixes(currentCode)
  currentCode = phase1Result.code
  const phase1Validation = validateReactCode(currentCode)

  phases.push({
    phase: 'auto-fix',
    code: currentCode,
    issuesBefore: initialIssues.length,
    issuesAfter: phase1Validation.issues.length,
    fixesApplied: phase1Result.fixesApplied,
    duration: performance.now() - phase1Start,
    success: phase1Validation.issues.length < initialIssues.length,
  })

  if (opts.debug) {
    console.log(`[Phase 1: Auto-fix] ${initialIssues.length} → ${phase1Validation.issues.length} issues`)
  }

  // Phase 2: Validation check
  const phase2Start = performance.now()
  phases.push({
    phase: 'validation-1',
    code: currentCode,
    issuesBefore: phase1Validation.issues.length,
    issuesAfter: phase1Validation.issues.length,
    fixesApplied: 0,
    duration: performance.now() - phase2Start,
    success: phase1Validation.valid,
  })

  // Early exit if valid
  if (phase1Validation.valid) {
    return buildResult(code, currentCode, phases, startTime, escalatedToLLM, [])
  }

  // Phase 3: Targeted fixes
  const phase3Start = performance.now()
  const phase3Result = applyTargetedFixes(currentCode, phase1Validation.issues)
  currentCode = phase3Result.code
  const phase3Validation = validateReactCode(currentCode)

  phases.push({
    phase: 'targeted-fix',
    code: currentCode,
    issuesBefore: phase1Validation.issues.length,
    issuesAfter: phase3Validation.issues.length,
    fixesApplied: phase3Result.fixesApplied,
    duration: performance.now() - phase3Start,
    success: phase3Validation.issues.length < phase1Validation.issues.length,
  })

  if (opts.debug) {
    console.log(`[Phase 3: Targeted] ${phase1Validation.issues.length} → ${phase3Validation.issues.length} issues`)
  }

  // Phase 4: Second validation check
  const phase4Start = performance.now()
  phases.push({
    phase: 'validation-2',
    code: currentCode,
    issuesBefore: phase3Validation.issues.length,
    issuesAfter: phase3Validation.issues.length,
    fixesApplied: 0,
    duration: performance.now() - phase4Start,
    success: phase3Validation.valid,
  })

  // Early exit if valid
  if (phase3Validation.valid) {
    return buildResult(code, currentCode, phases, startTime, escalatedToLLM, [])
  }

  // Phase 5: Semantic repair
  const phase5Start = performance.now()
  const phase5Result = applySemanticRepairs(currentCode, phase3Validation.issues)
  currentCode = phase5Result.code
  const phase5Validation = validateReactCode(currentCode)

  phases.push({
    phase: 'semantic-repair',
    code: currentCode,
    issuesBefore: phase3Validation.issues.length,
    issuesAfter: phase5Validation.issues.length,
    fixesApplied: phase5Result.repairsApplied,
    duration: performance.now() - phase5Start,
    success: phase5Validation.issues.length < phase3Validation.issues.length,
  })

  if (opts.debug) {
    console.log(`[Phase 5: Semantic] ${phase3Validation.issues.length} → ${phase5Validation.issues.length} issues`)
  }

  // Early exit if valid
  if (phase5Validation.valid) {
    return buildResult(code, currentCode, phases, startTime, escalatedToLLM, [])
  }

  // Phase 6: LLM escalation (if enabled and callback provided)
  if (opts.enableLLMEscalation && opts.llmRegenerator) {
    const phase6Start = performance.now()
    escalatedToLLM = true

    try {
      const regeneratedCode = await opts.llmRegenerator(currentCode, phase5Validation.issues)
      currentCode = regeneratedCode
      const phase6Validation = validateReactCode(currentCode)

      phases.push({
        phase: 'llm-escalation',
        code: currentCode,
        issuesBefore: phase5Validation.issues.length,
        issuesAfter: phase6Validation.issues.length,
        fixesApplied: 1, // LLM regeneration counts as one fix
        duration: performance.now() - phase6Start,
        success: phase6Validation.valid,
      })

      if (opts.debug) {
        console.log(`[Phase 6: LLM] ${phase5Validation.issues.length} → ${phase6Validation.issues.length} issues`)
      }

      return buildResult(
        code,
        currentCode,
        phases,
        startTime,
        escalatedToLLM,
        phase6Validation.issues
      )
    } catch (error) {
      // LLM escalation failed
      phases.push({
        phase: 'llm-escalation',
        code: currentCode,
        issuesBefore: phase5Validation.issues.length,
        issuesAfter: phase5Validation.issues.length,
        fixesApplied: 0,
        duration: performance.now() - phase6Start,
        success: false,
      })
    }
  }

  // Return final result
  const finalValidation = validateReactCode(currentCode)
  return buildResult(
    code,
    currentCode,
    phases,
    startTime,
    escalatedToLLM,
    finalValidation.issues
  )
}

function buildResult(
  originalCode: string,
  healedCode: string,
  phases: PhaseResult[],
  startTime: number,
  escalatedToLLM: boolean,
  remainingIssues: ValidationIssue[]
): IncrementalHealingResult {
  const totalFixesApplied = phases.reduce((sum, p) => sum + p.fixesApplied, 0)

  return {
    success: remainingIssues.length === 0,
    originalCode,
    healedCode,
    phases,
    totalDuration: performance.now() - startTime,
    totalFixesApplied,
    remainingIssues,
    escalatedToLLM,
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick incremental heal - phases 1-3 only
 */
export async function quickIncrementalHeal(code: string): Promise<IncrementalHealingResult> {
  return incrementalHeal(code, {
    enableLLMEscalation: false,
    maxAttemptsPerPhase: 2,
  })
}

/**
 * Full incremental heal with all phases including LLM
 */
export async function fullIncrementalHeal(
  code: string,
  llmRegenerator: (code: string, issues: ValidationIssue[]) => Promise<string>
): Promise<IncrementalHealingResult> {
  return incrementalHeal(code, {
    enableLLMEscalation: true,
    llmRegenerator,
    maxAttemptsPerPhase: 3,
  })
}

/**
 * Get healing preview without applying
 */
export function previewIncrementalHealing(code: string): {
  currentIssues: ValidationIssue[]
  estimatedFixableByAutoFix: number
  estimatedFixableByTargeted: number
  estimatedFixableBySemantic: number
  needsLLMEscalation: boolean
} {
  const validation = validateReactCode(code)
  const issues = validation.issues

  // Estimate auto-fix
  const autoFixableTypes: ValidationIssueType[] = [
    'HARDCODED_COLOR',
    'CLASSNAME_USED',
    'INVALID_COMPONENT',
    'SPREAD_OPERATOR',
  ]
  const autoFixable = issues.filter(i => autoFixableTypes.includes(i.type)).length

  // Estimate targeted fix
  const targetedFixableTypes: ValidationIssueType[] = [
    'UNSUPPORTED_PROP',
    'INVALID_TOKEN',
  ]
  const targetedFixable = issues.filter(i => targetedFixableTypes.includes(i.type)).length

  // Estimate semantic repair
  const semanticFixableTypes: ValidationIssueType[] = [
    'SYNTAX_ERROR',
    'CUSTOM_HOOK',
  ]
  const semanticFixable = issues.filter(i => semanticFixableTypes.includes(i.type)).length

  // Remaining would need LLM
  const remaining = issues.length - autoFixable - targetedFixable - semanticFixable

  return {
    currentIssues: issues,
    estimatedFixableByAutoFix: autoFixable,
    estimatedFixableByTargeted: targetedFixable,
    estimatedFixableBySemantic: semanticFixable,
    needsLLMEscalation: remaining > 0,
  }
}

export default incrementalHeal
