/**
 * Generation Validator
 *
 * Validates LLM-generated Mirror DSL code.
 * Part of Enhanced LLM Integration (Increment 23).
 */

import { validate } from '../../validation/pipeline/validate'
import type { ValidationResult } from '../../validation/core'
import { heal } from '../self-healing/healing-pipeline'
import type { HealingResult } from '../self-healing/healing-pipeline'
import { analyzeContext } from '../analysis/context-analyzer'
import type { CodeContext } from '../analysis/context-analyzer'

/**
 * Validation result for generated code
 */
export interface GenerationValidationResult {
  valid: boolean
  code: string
  originalCode: string
  errors: ValidationError[]
  warnings: ValidationWarning[]
  fixes: AppliedFix[]
  metrics: ValidationMetrics
}

/**
 * Validation error
 */
export interface ValidationError {
  type: ValidationErrorType
  message: string
  line?: number
  severity: 'error' | 'warning'
  fixable: boolean
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  type: string
  message: string
  suggestion?: string
}

/**
 * Applied fix
 */
export interface AppliedFix {
  type: string
  description: string
  line?: number
  wasAutomatic: boolean
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  syntaxValid: boolean
  semanticValid: boolean
  styleCompliant: boolean
  tokenUsage: number  // 0-1, how many tokens are used vs available
  complexityScore: number  // 0-1, code complexity
  autoFixCount: number
  processingTime: number
}

/**
 * Validation error types
 */
export type ValidationErrorType =
  | 'SYNTAX_ERROR'
  | 'SEMANTIC_ERROR'
  | 'UNDEFINED_TOKEN'
  | 'UNDEFINED_COMPONENT'
  | 'INVALID_PROPERTY'
  | 'LAYOUT_ERROR'
  | 'STYLE_VIOLATION'

/**
 * Validation options
 */
export interface ValidationOptions {
  autoFix?: boolean
  strictMode?: boolean
  checkTokenUsage?: boolean
  checkStyle?: boolean
  existingContext?: CodeContext
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  autoFix: true,
  strictMode: false,
  checkTokenUsage: true,
  checkStyle: true,
  existingContext: undefined as unknown as CodeContext
}

/**
 * Validates generated code
 */
export function validateGeneration(
  generatedCode: string,
  options?: ValidationOptions
): GenerationValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()

  const originalCode = generatedCode
  let code = generatedCode
  const fixes: AppliedFix[] = []

  // Step 1: Syntax validation
  let report = validate(code)
  const syntaxValid = report.diagnostics.filter((e: { severity: string }) => e.severity === 'error').length === 0

  // Step 2: Auto-fix if enabled
  if (opts.autoFix && !syntaxValid) {
    const healingResult = heal(code)
    code = healingResult.healedCode

    for (const fix of healingResult.appliedFixes) {
      fixes.push({
        type: fix.fix.fix.type,
        description: fix.fix.fix.description,
        line: fix.fix.error.line,
        wasAutomatic: fix.wasAutoApplied
      })
    }

    // Re-validate after healing
    report = validate(code)
  }

  // Step 3: Semantic validation
  const semanticErrors = validateSemantics(code, opts.existingContext)

  // Step 4: Style validation
  const styleWarnings = opts.checkStyle ? validateStyle(code, opts.existingContext) : []

  // Step 5: Token usage check
  const tokenUsage = opts.checkTokenUsage ? calculateTokenUsage(code, opts.existingContext) : 0

  // Step 6: Complexity analysis
  const complexityScore = calculateComplexity(code)

  // Combine errors
  const errors: ValidationError[] = [
    ...report.diagnostics
      .filter((d: { severity: string }) => d.severity === 'error')
      .map((e: { code: string; message: string; location: { line: number }; severity: string }) => ({
        type: mapErrorType(e.code),
        message: e.message,
        line: e.location?.line,
        severity: (e.severity === 'info' ? 'warning' : e.severity) as 'error' | 'warning',
        fixable: isFixable(e.code)
      })),
    ...semanticErrors
  ]

  const warnings: ValidationWarning[] = [
    ...report.diagnostics
      .filter((d: { severity: string }) => d.severity === 'warning')
      .map((w: { code: string; message: string }) => ({
        type: w.code,
        message: w.message,
        suggestion: undefined
      })),
    ...styleWarnings
  ]

  const metrics: ValidationMetrics = {
    syntaxValid: errors.filter(e => e.severity === 'error').length === 0,
    semanticValid: semanticErrors.length === 0,
    styleCompliant: styleWarnings.length === 0,
    tokenUsage,
    complexityScore,
    autoFixCount: fixes.filter(f => f.wasAutomatic).length,
    processingTime: Date.now() - startTime
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    code,
    originalCode,
    errors,
    warnings,
    fixes,
    metrics
  }
}

/**
 * Maps validation error types
 */
function mapErrorType(type: string): ValidationErrorType {
  const typeMap: Record<string, ValidationErrorType> = {
    'LOWERCASE_COMPONENT': 'SYNTAX_ERROR',
    'UNBALANCED_BRACES': 'SYNTAX_ERROR',
    'INVALID_TOKEN_NAME': 'SYNTAX_ERROR',
    'UNDEFINED_TOKEN': 'UNDEFINED_TOKEN',
    'UNDEFINED_COMPONENT': 'UNDEFINED_COMPONENT',
    'CONFLICTING_LAYOUT': 'LAYOUT_ERROR',
    'INVALID_PROPERTY_VALUE': 'INVALID_PROPERTY'
  }

  return typeMap[type] || 'SYNTAX_ERROR'
}

/**
 * Checks if an error type is auto-fixable
 */
function isFixable(type: string): boolean {
  const fixableTypes = [
    'LOWERCASE_COMPONENT',
    'UNBALANCED_BRACES',
    'MISSING_SPACE',
    'EXTRA_COMMA'
  ]

  return fixableTypes.includes(type)
}

/**
 * Validates semantic correctness
 */
function validateSemantics(
  code: string,
  existingContext?: CodeContext
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!existingContext) {
    return errors
  }

  // Check for undefined token references
  const tokenRefs = code.match(/\$[\w-]+/g) || []
  const definedTokens = existingContext.tokens.all.map(t => t.name)

  for (const ref of tokenRefs) {
    // Skip if it's a token definition (has : after)
    if (code.includes(`${ref}:`)) continue

    if (!definedTokens.includes(ref)) {
      // Check if it's defined in the new code
      const newDefPattern = new RegExp(`^\\s*\\${ref}\\s*:`, 'm')
      if (!newDefPattern.test(code)) {
        errors.push({
          type: 'UNDEFINED_TOKEN',
          message: `Token ${ref} is not defined`,
          severity: 'error',
          fixable: false
        })
      }
    }
  }

  // Check for undefined component references
  const componentRefs = code.match(/\b[A-Z][A-Za-z0-9]+\s*\{/g) || []
  const definedComponents = existingContext.components.definitionNames

  for (const ref of componentRefs) {
    const name = ref.replace(/\s*\{$/, '')
    // Skip if it's a definition
    if (code.includes(`${name}:`)) continue

    // Skip built-in primitives
    if (isBuiltinComponent(name)) continue

    if (!definedComponents.includes(name)) {
      // Check if defined in new code
      const newDefPattern = new RegExp(`^\\s*${name}\\s*:`, 'm')
      if (!newDefPattern.test(code)) {
        // This is just a usage, might be intentional - don't error
      }
    }
  }

  return errors
}

/**
 * Checks if a component is built-in
 */
function isBuiltinComponent(name: string): boolean {
  const builtins = [
    'App', 'Box', 'Card', 'Button', 'Text', 'Icon', 'Image', 'Input',
    'Textarea', 'Link', 'Header', 'Footer', 'Sidebar', 'Main', 'Content',
    'Nav', 'Menu', 'List', 'Item', 'Grid', 'Row', 'Column', 'Container',
    'Section', 'Panel', 'Modal', 'Dialog', 'Dropdown', 'Tooltip'
  ]

  return builtins.includes(name)
}

/**
 * Validates style compliance
 */
function validateStyle(
  code: string,
  existingContext?: CodeContext
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  // Check for inconsistent naming
  if (existingContext?.naming) {
    const { componentPrefixes, tokenStyle } = existingContext.naming

    // Check component naming
    if (componentPrefixes.length > 0) {
      const newComponents = code.match(/^[A-Z][A-Za-z0-9]+(?=\s*:)/gm) || []
      for (const comp of newComponents) {
        const hasPrefix = componentPrefixes.some(p => comp.startsWith(p))
        if (!hasPrefix) {
          warnings.push({
            type: 'NAMING_INCONSISTENCY',
            message: `Component ${comp} doesn't follow naming convention`,
            suggestion: `Consider using prefix: ${componentPrefixes[0]}${comp}`
          })
        }
      }
    }

    // Check token naming style
    if (tokenStyle !== 'mixed') {
      const newTokens = code.match(/^\$[\w-]+(?=\s*:)/gm) || []
      for (const token of newTokens) {
        const name = token.slice(1) // Remove $
        const isKebab = name.includes('-')
        const isCamel = /[a-z][A-Z]/.test(name)

        if (tokenStyle === 'kebab-case' && isCamel) {
          warnings.push({
            type: 'NAMING_INCONSISTENCY',
            message: `Token ${token} uses camelCase, but kebab-case is preferred`,
            suggestion: `Use: $${toKebabCase(name)}`
          })
        } else if (tokenStyle === 'camelCase' && isKebab) {
          warnings.push({
            type: 'NAMING_INCONSISTENCY',
            message: `Token ${token} uses kebab-case, but camelCase is preferred`,
            suggestion: `Use: $${toCamelCase(name)}`
          })
        }
      }
    }
  }

  // Check for hardcoded values when tokens exist
  if (existingContext?.tokens.hasColors) {
    const hardcodedColors = code.match(/#[0-9A-Fa-f]{3,8}\b/g) || []
    const definedColors = existingContext.tokens.categorized.colors.map(t => t.value)

    for (const color of hardcodedColors) {
      // Skip if it's a token definition
      if (code.includes(`${color}`)) {
        const beforeColor = code.substring(0, code.indexOf(color))
        if (beforeColor.match(/\$[\w-]+\s*:\s*$/)) continue
      }

      // Check if a similar token exists
      const normalizedColor = color.toUpperCase()
      const matchingToken = existingContext.tokens.categorized.colors.find(
        t => t.value.toUpperCase() === normalizedColor
      )

      if (matchingToken) {
        warnings.push({
          type: 'HARDCODED_VALUE',
          message: `Hardcoded color ${color} could use token`,
          suggestion: `Use: ${matchingToken.name}`
        })
      }
    }
  }

  return warnings
}

/**
 * Calculates token usage ratio
 */
function calculateTokenUsage(code: string, existingContext?: CodeContext): number {
  if (!existingContext || existingContext.tokens.all.length === 0) {
    return 0
  }

  const tokenRefs = code.match(/\$[\w-]+/g) || []
  const definedTokens = existingContext.tokens.all.map(t => t.name)

  // Count how many available tokens are used
  const usedTokens = new Set<string>()
  for (const ref of tokenRefs) {
    if (definedTokens.includes(ref)) {
      usedTokens.add(ref)
    }
  }

  return usedTokens.size / definedTokens.length
}

/**
 * Calculates code complexity score
 */
function calculateComplexity(code: string): number {
  const lines = code.split('\n').filter(l => l.trim()).length
  const nestingDepth = calculateMaxNesting(code)
  const componentCount = (code.match(/[A-Z][A-Za-z0-9]*\s*\{/g) || []).length

  // Normalize to 0-1 scale
  const lineComplexity = Math.min(lines / 100, 1)
  const nestingComplexity = Math.min(nestingDepth / 10, 1)
  const componentComplexity = Math.min(componentCount / 20, 1)

  return (lineComplexity + nestingComplexity + componentComplexity) / 3
}

/**
 * Calculates maximum nesting depth
 */
function calculateMaxNesting(code: string): number {
  let depth = 0
  let maxDepth = 0

  for (const char of code) {
    if (char === '{') {
      depth++
      maxDepth = Math.max(maxDepth, depth)
    } else if (char === '}') {
      depth--
    }
  }

  return maxDepth
}

/**
 * Converts camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Converts kebab-case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * Quick validation for simple checks
 */
export function quickValidate(code: string): {
  valid: boolean
  errorCount: number
  warningCount: number
} {
  const report = validate(code)

  return {
    valid: report.valid,
    errorCount: report.diagnostics.filter(d => d.severity === 'error').length,
    warningCount: report.diagnostics.filter(d => d.severity === 'warning').length
  }
}

/**
 * Validates and fixes in one step
 */
export function validateAndFix(code: string): {
  code: string
  wasFixed: boolean
  fixCount: number
} {
  const result = validateGeneration(code, { autoFix: true })

  return {
    code: result.code,
    wasFixed: result.code !== result.originalCode,
    fixCount: result.fixes.length
  }
}

/**
 * Checks if code is safe to insert
 */
export function isSafeToInsert(
  generatedCode: string,
  existingCode: string
): {
  safe: boolean
  reason?: string
} {
  // Check for obvious issues
  const result = validateGeneration(generatedCode)

  if (!result.valid) {
    return {
      safe: false,
      reason: `Code has ${result.errors.length} errors`
    }
  }

  // Check for duplicate definitions
  const existingContext = analyzeContext(existingCode)
  const newContext = analyzeContext(generatedCode)

  for (const newDef of newContext.components.definitionNames) {
    if (existingContext.components.definitionNames.includes(newDef)) {
      return {
        safe: false,
        reason: `Duplicate component definition: ${newDef}`
      }
    }
  }

  for (const newToken of newContext.tokens.all) {
    if (existingContext.tokens.all.some(t => t.name === newToken.name)) {
      return {
        safe: false,
        reason: `Duplicate token definition: ${newToken.name}`
      }
    }
  }

  return { safe: true }
}

/**
 * Gets validation summary for display
 */
export function getValidationSummary(result: GenerationValidationResult): string {
  const lines: string[] = []

  if (result.valid) {
    lines.push('✓ Code ist valide')
  } else {
    lines.push(`✗ ${result.errors.length} Fehler gefunden`)
  }

  if (result.warnings.length > 0) {
    lines.push(`⚠ ${result.warnings.length} Warnungen`)
  }

  if (result.fixes.length > 0) {
    lines.push(`🔧 ${result.fixes.length} automatische Korrekturen`)
  }

  const metrics = result.metrics
  lines.push(`Komplexität: ${Math.round(metrics.complexityScore * 100)}%`)

  if (metrics.tokenUsage > 0) {
    lines.push(`Token-Nutzung: ${Math.round(metrics.tokenUsage * 100)}%`)
  }

  return lines.join('\n')
}
