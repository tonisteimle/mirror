import { useMemo, useCallback, useEffect } from 'react'
import { parse } from '../parser/parser'
import { useDebouncedValue } from './useDebouncedValue'
import type { ASTNode, ParseIssue, ParseResult as ParserParseResult } from '../parser/types'
import type { EditorView } from '@codemirror/view'
import { updateDiagnostics, type Diagnostic } from '../editor/diagnostic-decorations'
// Import validator to trigger auto-registration with parser
import '../validator'

// Re-export parser's ParseResult for backward compatibility
export type ParseResult = ParserParseResult

export interface CodeDiagnostic {
  type: 'error' | 'warning' | 'info'
  line: number
  column: number
  message: string
  suggestion?: string
}

export interface UseCodeParsingReturn {
  mergedCode: string
  debouncedCode: string
  parseResult: ParseResult
  /** All diagnostics (parse issues + validation errors/warnings) */
  diagnostics: CodeDiagnostic[]
  /** Whether the code is valid (no errors) */
  isValid: boolean
  findNodeById: (nodes: ASTNode[], id: string) => ASTNode | null
}

const emptyParseResult: ParseResult = {
  nodes: [],
  errors: [],
  diagnostics: [],
  parseIssues: [],
  registry: new Map(),
  tokens: new Map(),
  styles: new Map(),
  commands: [],
  centralizedEvents: [],
  themes: new Map(),
  activeTheme: null,
}

/**
 * Preview override for live picker preview.
 * When set, the preview value temporarily replaces text at the specified range.
 */
export interface PreviewOverride {
  /** Start position in layoutCode */
  from: number
  /** End position in layoutCode (cursor position) */
  to: number
  /** Value to preview (e.g. selected color, font) */
  value: string
}

/** Editor tab type for diagnostic line offset calculation */
export type EditorTab = 'layout' | 'components' | 'tokens' | 'data'

export interface UseCodeParsingOptions {
  /** Debounce delay in ms (default: 150) */
  debounceMs?: number
  /** Preview override for live picker preview */
  previewOverride?: PreviewOverride | null
  /**
   * Active cursor line (0-indexed).
   * Diagnostics on this line are suppressed while typing.
   */
  activeCursorLine?: number | null
  /**
   * EditorView reference for showing inline diagnostics (red underlines).
   * When provided, undefined tokens etc. are highlighted in the editor.
   */
  editorView?: EditorView | null
  /**
   * Active editor tab. Used to filter and adjust diagnostic line numbers
   * since parsing is done on merged code but editor shows individual sections.
   */
  activeTab?: EditorTab | null
}

export function useCodeParsing(
  tokensCode: string,
  componentsCode: string,
  layoutCode: string,
  optionsOrDebounceMs: number | UseCodeParsingOptions = 250, // PERF: Default increased for large docs
  previewOverride?: PreviewOverride | null
): UseCodeParsingReturn {
  // Support both old signature (debounceMs, previewOverride) and new options object
  const options: UseCodeParsingOptions = typeof optionsOrDebounceMs === 'number'
    ? { debounceMs: optionsOrDebounceMs, previewOverride }
    : optionsOrDebounceMs

  const {
    debounceMs = 250, // PERF: Increased from 150ms for better perceived performance
    previewOverride: previewOverrideFromOptions = null,
    activeCursorLine = null,
    editorView = null,
    activeTab = null
  } = options

  // Use previewOverride from options if provided, otherwise fall back to parameter
  const effectivePreviewOverride = previewOverrideFromOptions ?? previewOverride ?? null
  // Apply preview override to layout code if present
  const effectiveLayoutCode = useMemo(() => {
    if (!effectivePreviewOverride) return layoutCode
    const { from, to, value } = effectivePreviewOverride
    return layoutCode.slice(0, from) + value + layoutCode.slice(to)
  }, [layoutCode, effectivePreviewOverride])

  // Merge tokens (first) + components (second) + layout (third) for parsing
  const mergedCode = useMemo(() => {
    const parts = []
    if (tokensCode.trim()) parts.push(tokensCode)
    if (componentsCode.trim()) parts.push(componentsCode)
    if (effectiveLayoutCode.trim()) parts.push(effectiveLayoutCode)
    return parts.join('\n\n')
  }, [tokensCode, componentsCode, effectiveLayoutCode])

  // Debounce merged code to avoid parsing on every keystroke
  // Skip debouncing when preview is active for instant feedback
  const shouldSkipDebounce = !!effectivePreviewOverride
  const debouncedCode = useDebouncedValue(
    mergedCode,
    shouldSkipDebounce ? 0 : debounceMs
  )

  const parseResult = useMemo(() => {
    if (!debouncedCode.trim()) {
      return emptyParseResult
    }
    // Enable validation to get diagnostics for undefined tokens etc.
    return parse(debouncedCode, { validate: true })
  }, [debouncedCode])

  // Run validation (debounced via parseResult dependency)
  const { diagnostics, isValid } = useMemo(() => {
    if (!debouncedCode.trim() || parseResult === emptyParseResult) {
      return { diagnostics: [], isValid: true }
    }

    const allDiagnostics: CodeDiagnostic[] = []

    // Collect parse issues (lexer-level typos like "onclck", "paddin")
    if (parseResult.parseIssues) {
      parseResult.parseIssues.forEach((issue: ParseIssue) => {
        allDiagnostics.push({
          type: 'error',
          line: issue.line,
          column: issue.column,
          message: issue.message,
          suggestion: issue.suggestion
        })
      })
    }

    // Collect parser errors (strings)
    if (parseResult.errors) {
      parseResult.errors.forEach((error, index) => {
        allDiagnostics.push({
          type: 'error',
          line: index + 1,
          column: 0,
          message: typeof error === 'string' ? error : String(error),
        })
      })
    }

    // Sort by line number
    allDiagnostics.sort((a, b) => a.line - b.line)

    // Filter out diagnostics on the active cursor line (user is still typing)
    // This prevents distracting errors while the user is mid-edit
    const filteredDiagnostics = activeCursorLine !== null
      ? allDiagnostics.filter(d => d.line !== activeCursorLine)
      : allDiagnostics

    const hasErrors = filteredDiagnostics.some(d => d.type === 'error')

    return {
      diagnostics: filteredDiagnostics,
      isValid: !hasErrors
    }
  }, [debouncedCode, parseResult, activeCursorLine])

  // Calculate line offsets for each section in the merged code
  // Order: tokens, components, layout (with "\n\n" separators)
  // Example: tokens(1 line) + \n\n + components(1 line) + \n\n + layout
  // Line 1: token content
  // Line 2: (blank from \n\n)
  // Line 3: component content
  // Line 4: (blank from \n\n)
  // Line 5: layout content
  const sectionOffsets = useMemo(() => {
    const countLines = (code: string) => code ? code.split('\n').length : 0
    const hasTokens = tokensCode.trim().length > 0
    const hasComponents = componentsCode.trim().length > 0

    // Tokens start at line 1
    const tokensStart = 1
    const tokensEnd = hasTokens ? countLines(tokensCode) : 0

    // Components start after tokens (plus 2 lines for "\n\n" separator if tokens exist)
    const componentsStart = hasTokens ? tokensEnd + 2 : 1
    const componentsEnd = hasComponents
      ? componentsStart + countLines(componentsCode) - 1
      : componentsStart - 1

    // Layout starts after components (plus 2 lines for "\n\n" separator)
    const layoutStart = (hasTokens || hasComponents)
      ? (hasComponents ? componentsEnd + 2 : tokensEnd + 2)
      : 1

    return {
      tokens: { start: tokensStart, end: tokensEnd },
      components: { start: componentsStart, end: componentsEnd },
      layout: { start: layoutStart, end: Infinity },
    }
  }, [tokensCode, componentsCode])

  // Send diagnostics to editor for inline display (red underlines)
  useEffect(() => {
    if (!editorView) return

    // Convert parser diagnostics to editor format
    const editorDiagnostics: Diagnostic[] = []

    // Add diagnostics from parseResult.diagnostics (includes UNDEFINED_TOKEN)
    if (parseResult.diagnostics) {
      for (const diag of parseResult.diagnostics) {
        const line = diag.location.line

        // Filter diagnostics based on active tab and adjust line numbers
        let adjustedLine = line
        if (activeTab) {
          const offsets = sectionOffsets[activeTab as keyof typeof sectionOffsets]
          if (!offsets) continue // Skip 'data' tab (no DSL parsing)

          // Check if diagnostic is in the current section
          if (line < offsets.start || line > offsets.end) {
            continue // Diagnostic is not in this section
          }

          // Adjust line number relative to section start
          adjustedLine = line - offsets.start + 1
        }

        // Skip diagnostics on the active cursor line
        if (activeCursorLine !== null && adjustedLine === activeCursorLine) {
          continue
        }

        editorDiagnostics.push({
          severity: diag.severity as 'error' | 'warning' | 'info',
          code: diag.code,
          message: diag.message,
          location: {
            line: adjustedLine,
            column: diag.location.column,
            endColumn: diag.location.endColumn,
          },
          source: diag.source,
        })
      }
    }

    updateDiagnostics(editorView, editorDiagnostics)
  }, [editorView, parseResult.diagnostics, activeCursorLine, activeTab, sectionOffsets])

  // Helper to find a node by ID in the AST
  const findNodeById = useCallback((nodes: ASTNode[], id: string): ASTNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = findNodeById(node.children, id)
      if (found) return found
    }
    return null
  }, [])

  return {
    mergedCode,
    debouncedCode,
    parseResult,
    diagnostics,
    isValid,
    findNodeById,
  }
}
