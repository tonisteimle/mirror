/**
 * Hook for generating React code from Mirror DSL.
 * Uses the multi-file exporter and provides memoized results.
 */

import { useMemo } from 'react'
import { generateMultiFileExport, type ExportedFile } from '../generator/multi-file-exporter'
import type { ASTNode } from '../parser/parser'

interface UseReactExportOptions {
  /** AST nodes from parsed layout */
  nodes: ASTNode[]
  /** Components code */
  componentsCode: string
  /** Tokens code */
  tokensCode: string
}

interface UseReactExportResult {
  /** Generated files */
  files: ExportedFile[]
  /** Whether there are any files */
  hasFiles: boolean
}

/**
 * Generates React code files from Mirror DSL code.
 * Memoized to only regenerate when inputs change.
 */
export function useReactExport({
  nodes,
  componentsCode,
  tokensCode,
}: UseReactExportOptions): UseReactExportResult {
  const files = useMemo(() => {
    // Don't generate if there are no nodes
    if (!nodes || nodes.length === 0) {
      return []
    }

    try {
      const result = generateMultiFileExport(nodes, componentsCode, tokensCode)
      return result.files
    } catch (error) {
      console.error('Error generating React export:', error)
      return []
    }
  }, [nodes, componentsCode, tokensCode])

  return {
    files,
    hasFiles: files.length > 0,
  }
}

/**
 * Group files by folder for display in file tree.
 */
export function groupFilesByFolder(files: ExportedFile[]): Map<string, ExportedFile[]> {
  const groups = new Map<string, ExportedFile[]>()

  for (const file of files) {
    const parts = file.path.split('/')
    const folder = parts.length > 1 ? parts[0] : ''

    if (!groups.has(folder)) {
      groups.set(folder, [])
    }
    groups.get(folder)!.push(file)
  }

  return groups
}
