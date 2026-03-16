/**
 * Prelude Builder - Builds prelude from tokens and components files
 */

import type { PreludeResult } from './types'

export interface PreludeBuilderOptions {
  files: Record<string, string>
  currentFile: string
  getFileType: (filename: string) => 'tokens' | 'component' | 'layout'
}

/**
 * Build prelude from tokens and component files
 *
 * For layout files, prepends all tokens and components in order.
 * For component files, prepends only tokens.
 * For token files, returns empty prelude.
 */
export function buildPrelude(options: PreludeBuilderOptions): PreludeResult {
  const { files, currentFile, getFileType } = options

  const currentType = getFileType(currentFile)

  // Token files don't need prelude
  if (currentType === 'tokens') {
    return {
      prelude: '',
      offset: 0,
      tokenCount: 0,
      componentCount: 0,
    }
  }

  const parts: string[] = []
  let tokenCount = 0
  let componentCount = 0

  // Collect files by type
  const tokenFiles: string[] = []
  const componentFiles: string[] = []

  for (const filename of Object.keys(files)) {
    if (filename === currentFile) continue

    const type = getFileType(filename)
    if (type === 'tokens') {
      tokenFiles.push(filename)
    } else if (type === 'component') {
      componentFiles.push(filename)
    }
  }

  // Sort alphabetically for consistent ordering
  tokenFiles.sort()
  componentFiles.sort()

  // Add tokens first
  for (const filename of tokenFiles) {
    const content = files[filename]
    if (content && content.trim()) {
      parts.push(`// Tokens: ${filename}`)
      parts.push(content.trim())
      parts.push('')
      tokenCount++
    }
  }

  // Add components (only for layout files)
  if (currentType === 'layout') {
    for (const filename of componentFiles) {
      const content = files[filename]
      if (content && content.trim()) {
        parts.push(`// Component: ${filename}`)
        parts.push(content.trim())
        parts.push('')
        componentCount++
      }
    }
  }

  const prelude = parts.join('\n')

  return {
    prelude,
    offset: prelude.length > 0 ? prelude.length + 1 : 0, // +1 for newline
    tokenCount,
    componentCount,
  }
}

/**
 * Adjust line number from combined source back to original file
 */
export function adjustLineNumber(line: number, preludeLines: number): number {
  return Math.max(1, line - preludeLines)
}

/**
 * Count lines in prelude
 */
export function countPreludeLines(prelude: string): number {
  if (!prelude) return 0
  return prelude.split('\n').length
}
