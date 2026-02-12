import { useMemo, useCallback } from 'react'
import { parse } from '../parser/parser'
import { useDebouncedValue } from './useDebouncedValue'
import type { ASTNode, ComponentTemplate, TokenValue, StyleMixin, SelectionCommand } from '../parser/types'

export interface ParseResult {
  nodes: ASTNode[]
  errors: unknown[]
  registry: Map<string, ComponentTemplate>
  tokens: Map<string, TokenValue>
  styles: Map<string, StyleMixin>
  commands: SelectionCommand[]
}

export interface UseCodeParsingReturn {
  mergedCode: string
  debouncedCode: string
  parseResult: ParseResult
  findNodeById: (nodes: ASTNode[], id: string) => ASTNode | null
}

const emptyParseResult: ParseResult = {
  nodes: [],
  errors: [],
  registry: new Map(),
  tokens: new Map(),
  styles: new Map(),
  commands: [],
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

export function useCodeParsing(
  tokensCode: string,
  componentsCode: string,
  layoutCode: string,
  debounceMs = 150,
  previewOverride?: PreviewOverride | null
): UseCodeParsingReturn {
  // Apply preview override to layout code if present
  const effectiveLayoutCode = useMemo(() => {
    if (!previewOverride) return layoutCode
    const { from, to, value } = previewOverride
    return layoutCode.slice(0, from) + value + layoutCode.slice(to)
  }, [layoutCode, previewOverride])

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
  const shouldSkipDebounce = !!previewOverride
  const debouncedCode = useDebouncedValue(
    mergedCode,
    shouldSkipDebounce ? 0 : debounceMs
  )

  const parseResult = useMemo(() => {
    if (!debouncedCode.trim()) {
      return emptyParseResult
    }
    return parse(debouncedCode)
  }, [debouncedCode])

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
    findNodeById,
  }
}
