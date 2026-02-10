/**
 * ValidationService - Main entry point for validating and correcting LLM output
 */

import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Correction,
  TabType
} from './types'

import { cleanLLMOutput } from './correctors/markdown-cleaner'
import { correctLineProperties } from './correctors/property-corrector'
import { correctLayoutLine } from './correctors/layout-corrector'
import {
  correctIndentation,
  removeDuplicateDefinitions,
  findMissingDefinitions,
  extractDefinedComponents,
  generateMissingDefinition
} from './correctors/structure-corrector'

import { validateSyntax, checkPropertyConflicts } from './rules/syntax-rules'
import { validateSemantics, validateValueRanges } from './rules/semantic-rules'
import { validateComponentsTab, validateLayoutTab, crossValidateTabs } from './rules/tab-rules'

import { shouldAutoApply } from './utils/confidence'

export interface ValidationOptions {
  autoCorrect?: boolean           // Apply auto-corrections (default: true)
  strictMode?: boolean            // Treat warnings as errors (default: false)
  allowMissingDefinitions?: boolean  // Don't error on undefined components (default: true)
  generateMissingDefs?: boolean   // Auto-generate missing definitions (default: false)
}

const defaultOptions: ValidationOptions = {
  autoCorrect: true,
  strictMode: false,
  allowMissingDefinitions: true,
  generateMissingDefs: false
}

/**
 * Main validation service class
 */
export class ValidationService {
  private options: ValidationOptions

  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = { ...defaultOptions, ...options }
  }

  /**
   * Validate and optionally correct LLM output
   */
  validate(rawOutput: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const corrections: Correction[] = []

    // Phase 1: Clean LLM output
    const cleaned = cleanLLMOutput(rawOutput)
    let componentsCode = cleaned.components
    let layoutCode = cleaned.layout

    if (cleaned.hadMarkdown) {
      corrections.push({
        tab: 'components',
        line: 0,
        original: '[markdown]',
        corrected: '[cleaned]',
        reason: 'Removed markdown code block formatting',
        confidence: 1
      })
    }

    if (cleaned.hadExplanation) {
      corrections.push({
        tab: 'components',
        line: 0,
        original: '[explanation]',
        corrected: '[cleaned]',
        reason: 'Removed explanatory text',
        confidence: 0.9
      })
    }

    // Phase 2: Correct properties in components tab
    if (this.options.autoCorrect) {
      const compResult = this.correctProperties(componentsCode, 'components')
      componentsCode = compResult.code
      corrections.push(...compResult.corrections)
    }

    // Phase 3: Remove properties from layout tab
    if (this.options.autoCorrect) {
      const layoutResult = this.correctLayoutTab(layoutCode)
      layoutCode = layoutResult.code
      corrections.push(...layoutResult.corrections)
    }

    // Phase 4: Fix indentation
    if (this.options.autoCorrect) {
      const compIndent = correctIndentation(componentsCode.split('\n'), 'components')
      if (compIndent.corrections.length > 0) {
        componentsCode = compIndent.correctedLines.join('\n')
        corrections.push(...compIndent.corrections)
      }

      const layoutIndent = correctIndentation(layoutCode.split('\n'), 'layout')
      if (layoutIndent.corrections.length > 0) {
        layoutCode = layoutIndent.correctedLines.join('\n')
        corrections.push(...layoutIndent.corrections)
      }
    }

    // Phase 5: Remove duplicate definitions
    if (this.options.autoCorrect) {
      const dedup = removeDuplicateDefinitions(componentsCode.split('\n'), 'components')
      if (dedup.corrections.length > 0) {
        componentsCode = dedup.correctedLines.join('\n')
        corrections.push(...dedup.corrections)
      }
    }

    // Phase 6: Generate missing definitions (if enabled)
    if (this.options.generateMissingDefs) {
      const defined = extractDefinedComponents(componentsCode.split('\n'))
      const missing = findMissingDefinitions(layoutCode.split('\n'), defined)

      if (missing.length > 0) {
        const newDefs = missing.map(name => generateMissingDefinition(name))
        componentsCode = componentsCode.trim() + '\n\n' + newDefs.join('\n')

        for (const name of missing) {
          corrections.push({
            tab: 'components',
            line: 0,
            original: '',
            corrected: generateMissingDefinition(name),
            reason: `Generated missing definition for "${name}"`,
            confidence: 0.7
          })
        }
      }
    }

    // Phase 7: Syntax validation
    const compSyntax = validateSyntax(componentsCode, 'components')
    const layoutSyntax = validateSyntax(layoutCode, 'layout')
    errors.push(...compSyntax.errors, ...layoutSyntax.errors)
    warnings.push(...compSyntax.warnings, ...layoutSyntax.warnings)

    // Phase 8: Property conflict checks
    const compConflicts = checkPropertyConflicts(componentsCode, 'components')
    warnings.push(...compConflicts)

    // Phase 9: Tab-specific validation
    const compTabResult = validateComponentsTab(componentsCode)
    const layoutTabResult = validateLayoutTab(layoutCode)
    errors.push(...compTabResult.errors, ...layoutTabResult.errors)
    warnings.push(...compTabResult.warnings, ...layoutTabResult.warnings)

    // Phase 10: Semantic validation
    const semantics = validateSemantics(componentsCode, layoutCode)
    errors.push(...semantics.errors)
    warnings.push(...semantics.warnings)

    // Phase 11: Value range validation
    const compRanges = validateValueRanges(componentsCode, 'components')
    warnings.push(...compRanges)

    // Phase 12: Cross-tab validation
    const crossResult = crossValidateTabs(componentsCode, layoutCode)
    errors.push(...crossResult.errors)
    warnings.push(...crossResult.warnings)

    // Filter duplicates
    const uniqueErrors = this.deduplicateErrors(errors)
    const uniqueWarnings = this.deduplicateWarnings(warnings)

    // Determine validity
    const isValid = uniqueErrors.length === 0 &&
      (!this.options.strictMode || uniqueWarnings.length === 0)

    return {
      isValid,
      components: componentsCode,
      layout: layoutCode,
      errors: uniqueErrors,
      warnings: uniqueWarnings,
      corrections: corrections.filter(c => shouldAutoApply(c.confidence) || !this.options.autoCorrect)
    }
  }

  /**
   * Validate without correction (useful for checking user input)
   */
  check(componentsCode: string, layoutCode: string): ValidationResult {
    const oldAutoCorrect = this.options.autoCorrect
    this.options.autoCorrect = false
    const result = this.validate(`--- COMPONENTS ---\n${componentsCode}\n--- LAYOUT ---\n${layoutCode}`)
    this.options.autoCorrect = oldAutoCorrect
    return result
  }

  /**
   * Correct properties in code
   */
  private correctProperties(code: string, tab: TabType): { code: string; corrections: Correction[] } {
    const lines = code.split('\n')
    const correctedLines: string[] = []
    const allCorrections: Correction[] = []

    for (let i = 0; i < lines.length; i++) {
      const result = correctLineProperties(lines[i], i + 1, tab)
      correctedLines.push(result.correctedLine)

      for (const c of result.corrections) {
        if (shouldAutoApply(c.confidence)) {
          allCorrections.push(c)
        }
      }
    }

    return { code: correctedLines.join('\n'), corrections: allCorrections }
  }

  /**
   * Correct layout tab (remove properties)
   */
  private correctLayoutTab(code: string): { code: string; corrections: Correction[] } {
    const lines = code.split('\n')
    const correctedLines: string[] = []
    const allCorrections: Correction[] = []

    for (let i = 0; i < lines.length; i++) {
      const result = correctLayoutLine(lines[i], i + 1)
      correctedLines.push(result.correctedLine)
      allCorrections.push(...result.corrections)
    }

    return { code: correctedLines.join('\n'), corrections: allCorrections }
  }

  /**
   * Deduplicate errors (same message + line)
   */
  private deduplicateErrors(errors: ValidationError[]): ValidationError[] {
    const seen = new Set<string>()
    return errors.filter(e => {
      const key = `${e.tab}:${e.line}:${e.message}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Deduplicate warnings (same message + line)
   */
  private deduplicateWarnings(warnings: ValidationWarning[]): ValidationWarning[] {
    const seen = new Set<string>()
    return warnings.filter(w => {
      const key = `${w.tab}:${w.line}:${w.message}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}

// Export singleton instance for convenience
export const validator = new ValidationService()

// Re-export types
export * from './types'

// Re-export utilities for direct use
export { cleanLLMOutput } from './correctors/markdown-cleaner'
export { correctProperty } from './correctors/property-corrector'
export { correctColor, looksLikeColor } from './correctors/color-corrector'
export { correctLayoutLine } from './correctors/layout-corrector'
