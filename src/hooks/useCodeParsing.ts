import { useMemo, useCallback } from 'react'
import { parse } from '../parser/parser'
import { useDebouncedValue } from './useDebouncedValue'
import type { ASTNode } from '../parser/parser'

export interface ParseResult {
  nodes: ASTNode[]
  errors: unknown[]
  registry: Map<string, unknown>
  tokens: Map<string, unknown>
  styles: Map<string, unknown>
  commands: unknown[]
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

export function useCodeParsing(
  tokensCode: string,
  componentsCode: string,
  layoutCode: string,
  debounceMs = 150
): UseCodeParsingReturn {
  // Merge tokens (first) + components (second) + layout (third) for parsing
  const mergedCode = useMemo(() => {
    const parts = []
    if (tokensCode.trim()) parts.push(tokensCode)
    if (componentsCode.trim()) parts.push(componentsCode)
    if (layoutCode.trim()) parts.push(layoutCode)
    return parts.join('\n\n')
  }, [tokensCode, componentsCode, layoutCode])

  // Debounce merged code to avoid parsing on every keystroke
  const debouncedCode = useDebouncedValue(mergedCode, debounceMs)

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
