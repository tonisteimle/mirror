/**
 * Context Provider
 *
 * Unified interface for providing context to LLM generation.
 * Part of Enhanced Context Provider (Increment 10).
 */

import { analyzeContext } from '../analysis/context-analyzer'
import type { CodeContext, AnalyzeContextOptions } from '../analysis/context-analyzer'
import { summarizeContext, formatSummaryForLLM } from './context-summarizer'
import type { ContextSummary, SummaryConfig } from './context-summarizer'
import { detectPatterns } from './pattern-matcher'
import type { PatternAnalysis } from './pattern-matcher'
import { analyzeModification } from './modification-context'
import type { ModificationContext, ModificationRequest } from './modification-context'

/**
 * Context request options
 */
export interface ContextRequestOptions {
  // What to include
  includePatterns?: boolean
  includeModificationContext?: boolean
  includeSummary?: boolean

  // Detail level
  detailLevel?: 'minimal' | 'standard' | 'detailed'

  // For modification requests
  modificationAction?: string
  targetComponent?: string
  cursorLine?: number

  // Token budget
  maxTokens?: number
}

/**
 * Complete context result
 */
export interface ContextResult {
  // Core context
  context: CodeContext

  // Summary (if requested)
  summary?: ContextSummary

  // Patterns (if requested)
  patterns?: PatternAnalysis

  // Modification context (if requested)
  modification?: ModificationContext

  // Formatted output
  formatted: string

  // Metadata
  metadata: {
    tokenEstimate: number
    processingTime: number
    detailLevel: string
  }
}

/**
 * Context provider class
 */
export class ContextProvider {
  private code: string
  private cachedContext?: CodeContext
  private cachedPatterns?: PatternAnalysis

  constructor(code: string) {
    this.code = code
  }

  /**
   * Updates the code (invalidates caches)
   */
  updateCode(code: string): void {
    if (code !== this.code) {
      this.code = code
      this.cachedContext = undefined
      this.cachedPatterns = undefined
    }
  }

  /**
   * Gets the base context (with caching)
   */
  getContext(options?: AnalyzeContextOptions): CodeContext {
    if (!this.cachedContext) {
      this.cachedContext = analyzeContext(this.code, options)
    }
    return this.cachedContext
  }

  /**
   * Gets pattern analysis (with caching)
   */
  getPatterns(): PatternAnalysis {
    if (!this.cachedPatterns) {
      const context = this.getContext()
      this.cachedPatterns = detectPatterns(context)
    }
    return this.cachedPatterns
  }

  /**
   * Provides complete context for a request
   */
  provide(options: ContextRequestOptions = {}): ContextResult {
    const startTime = Date.now()
    const detailLevel = options.detailLevel || 'standard'

    // Get base context
    const context = this.getContext()

    // Get summary if requested
    let summary: ContextSummary | undefined
    if (options.includeSummary !== false) {
      summary = summarizeContext(context, {
        level: detailLevel,
        maxTokens: options.maxTokens
      })
    }

    // Get patterns if requested
    let patterns: PatternAnalysis | undefined
    if (options.includePatterns) {
      patterns = this.getPatterns()
    }

    // Get modification context if requested
    let modification: ModificationContext | undefined
    if (options.includeModificationContext && options.modificationAction) {
      const request: ModificationRequest = {
        code: this.code,
        action: options.modificationAction,
        targetComponent: options.targetComponent,
        cursorLine: options.cursorLine
      }
      modification = analyzeModification(request)
    }

    // Format output
    const formatted = this.formatResult({
      context,
      summary,
      patterns,
      modification,
      options
    })

    // Calculate token estimate
    const tokenEstimate = Math.ceil(formatted.length / 4)

    return {
      context,
      summary,
      patterns,
      modification,
      formatted,
      metadata: {
        tokenEstimate,
        processingTime: Date.now() - startTime,
        detailLevel
      }
    }
  }

  /**
   * Provides context specifically for new code generation
   */
  provideForGeneration(componentType?: string): ContextResult {
    return this.provide({
      includePatterns: true,
      includeSummary: true,
      detailLevel: 'standard'
    })
  }

  /**
   * Provides context specifically for code modification
   */
  provideForModification(
    action: string,
    target?: string,
    cursorLine?: number
  ): ContextResult {
    return this.provide({
      includePatterns: true,
      includeSummary: true,
      includeModificationContext: true,
      modificationAction: action,
      targetComponent: target,
      cursorLine,
      detailLevel: 'detailed'
    })
  }

  /**
   * Provides minimal context for quick operations
   */
  provideMinimal(): ContextResult {
    return this.provide({
      includeSummary: true,
      includePatterns: false,
      includeModificationContext: false,
      detailLevel: 'minimal'
    })
  }

  /**
   * Formats the result for LLM consumption
   */
  private formatResult(params: {
    context: CodeContext
    summary?: ContextSummary
    patterns?: PatternAnalysis
    modification?: ModificationContext
    options: ContextRequestOptions
  }): string {
    const { context, summary, patterns, modification, options } = params
    const lines: string[] = []

    // Add summary if available
    if (summary) {
      lines.push(formatSummaryForLLM(summary, options.maxTokens))
      lines.push('')
    }

    // Add pattern info if available
    if (patterns && patterns.primaryPattern) {
      lines.push(`Erkanntes Pattern: ${patterns.primaryPattern}`)

      if (patterns.patterns.length > 1) {
        const otherPatterns = patterns.patterns
          .filter(p => p.type !== patterns.primaryPattern)
          .slice(0, 2)
          .map(p => p.type)
          .join(', ')
        if (otherPatterns) {
          lines.push(`Weitere Patterns: ${otherPatterns}`)
        }
      }
      lines.push('')
    }

    // Add modification context if available
    if (modification) {
      lines.push(`Änderungstyp: ${modification.type}`)
      if (modification.target) {
        lines.push(`Ziel: ${modification.target}`)
      }
      if (modification.constraints.length > 0) {
        const required = modification.constraints.filter(c => c.required)
        if (required.length > 0) {
          lines.push('Anforderungen:')
          required.forEach(c => {
            lines.push(`- ${c.description}`)
          })
        }
      }
      if (modification.suggestions.length > 0) {
        lines.push('Hinweise:')
        modification.suggestions.slice(0, 3).forEach(s => {
          lines.push(`- ${s}`)
        })
      }
    }

    return lines.join('\n').trim()
  }
}

/**
 * Creates a context provider for the given code
 */
export function createContextProvider(code: string): ContextProvider {
  return new ContextProvider(code)
}

/**
 * Quick function to get formatted context
 */
export function getFormattedContext(
  code: string,
  options?: ContextRequestOptions
): string {
  const provider = new ContextProvider(code)
  const result = provider.provide(options)
  return result.formatted
}

/**
 * Quick function to get context for generation
 */
export function getGenerationContext(code: string, componentType?: string): string {
  const provider = new ContextProvider(code)
  return provider.provideForGeneration(componentType).formatted
}

/**
 * Quick function to get context for modification
 */
export function getModificationContext(
  code: string,
  action: string,
  target?: string
): string {
  const provider = new ContextProvider(code)
  return provider.provideForModification(action, target).formatted
}
