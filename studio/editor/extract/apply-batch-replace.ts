/**
 * Apply Batch Replace — pure file-content transformation
 *
 * For each accepted match (file + line), replace the line's element
 * name with the new component name and clear the line's properties
 * (since the new component definition already carries them). Children
 * on subsequent lines are left untouched — they remain indented under
 * the new instance line.
 *
 * Pure function: no editor / no file-system access. Returns the new
 * content per file. Caller is responsible for dispatching the changes
 * to the editor / writing the files.
 */

import type { MatchResult, SegmentMatch } from './pattern-match'

export interface BatchReplaceResult {
  /** filename → new content (only files with at least one accepted match). */
  changedFiles: Map<string, string>
}

export interface ApplyBatchReplaceInput {
  /** All project files with their CURRENT source. */
  files: { filename: string; source: string }[]
  /** Matches the user accepted (subset of findProjectMatches result). */
  acceptedMatches: MatchResult[]
  /** Component name to replace with on each match line. */
  componentName: string
}

export function applyBatchReplace(input: ApplyBatchReplaceInput): BatchReplaceResult {
  const changedFiles = new Map<string, string>()

  // Group matches by file so we can rewrite each file's lines once.
  const matchesByFile = new Map<string, MatchResult[]>()
  for (const m of input.acceptedMatches) {
    const list = matchesByFile.get(m.filename) ?? []
    list.push(m)
    matchesByFile.set(m.filename, list)
  }

  for (const [filename, matches] of matchesByFile) {
    const file = input.files.find(f => f.filename === filename)
    if (!file) continue

    const lines = file.source.split('\n')
    for (const m of matches) {
      const idx = m.lineNumber - 1
      if (idx < 0 || idx >= lines.length) continue
      lines[idx] = rewriteMatchLine(lines[idx], input.componentName)
    }
    changedFiles.set(filename, lines.join('\n'))
  }

  return { changedFiles }
}

/**
 * Replace the element name on a matched line with the new component
 * name and drop all properties. Preserves leading indent and any
 * trailing inline comment.
 *
 *   `  Frame pad 16, bg #1a1a1a, rad 8  // outer card`
 *   → `  Card  // outer card`
 *
 * If the line had a leading content string (e.g. `Text "Hi", col white`),
 * keep the content string at the new instance:
 *   `Text "Hi", col white` → `Card "Hi"`
 */
export function rewriteMatchLine(line: string, newComponentName: string): string {
  const indentMatch = line.match(/^(\s*)/)
  const indent = indentMatch ? indentMatch[1] : ''

  // Detach an inline `//` comment (outside of strings) so we can
  // re-attach it after the replace.
  const { code, comment } = splitInlineComment(line.slice(indent.length))

  // Element name + optional leading string + properties.
  const elementMatch = code.match(/^[A-Z][a-zA-Z0-9_]*\b/)
  if (!elementMatch) return line // shouldn't happen for a matched line

  let pos = elementMatch[0].length
  while (pos < code.length && /\s/.test(code[pos])) pos++

  let leadingString = ''
  if (code[pos] === '"' || code[pos] === "'") {
    const quote = code[pos]
    let end = pos + 1
    while (end < code.length) {
      if (code[end] === '\\') {
        end += 2
        continue
      }
      if (code[end] === quote) {
        end++
        break
      }
      end++
    }
    leadingString = code.slice(pos, end)
  }

  let result = indent + newComponentName
  if (leadingString) result += ' ' + leadingString
  if (comment) result += '  ' + comment
  return result
}

// ---------------------------------------------------------------------------
// Segment-Level Replace (for Token-Extract Batch-Replace)
// ---------------------------------------------------------------------------

export interface ApplySegmentReplaceInput {
  files: { filename: string; source: string }[]
  acceptedMatches: SegmentMatch[]
  /** Property name (e.g. `bg`). */
  property: string
  /** Token name without `$` prefix (e.g. `primary`). */
  tokenName: string
}

/**
 * Replace each accepted segment-match's `<property> <value>` text with
 * `<property> $<tokenName>`. Multiple matches on the same line are
 * applied right-to-left so column positions stay valid.
 */
export function applySegmentReplace(input: ApplySegmentReplaceInput): BatchReplaceResult {
  const changedFiles = new Map<string, string>()

  // Group by file → line.
  const byFile = new Map<string, Map<number, SegmentMatch[]>>()
  for (const m of input.acceptedMatches) {
    let lineMap = byFile.get(m.filename)
    if (!lineMap) {
      lineMap = new Map()
      byFile.set(m.filename, lineMap)
    }
    const list = lineMap.get(m.lineNumber) ?? []
    list.push(m)
    lineMap.set(m.lineNumber, list)
  }

  const replacement = `${input.property} $${input.tokenName}`

  for (const [filename, lineMap] of byFile) {
    const file = input.files.find(f => f.filename === filename)
    if (!file) continue
    const lines = file.source.split('\n')

    for (const [lineNumber, matches] of lineMap) {
      const idx = lineNumber - 1
      if (idx < 0 || idx >= lines.length) continue
      // Apply right-to-left so left-side columns stay valid.
      const sorted = [...matches].sort((a, b) => b.columnStart - a.columnStart)
      let lineText = lines[idx]
      for (const m of sorted) {
        lineText =
          lineText.slice(0, m.columnStart) + replacement + lineText.slice(m.columnStart + m.length)
      }
      lines[idx] = lineText
    }

    changedFiles.set(filename, lines.join('\n'))
  }

  return { changedFiles }
}

function splitInlineComment(s: string): { code: string; comment: string } {
  let inString = false
  let quote = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === quote) inString = false
      continue
    }
    if (c === '"' || c === "'") {
      inString = true
      quote = c
      continue
    }
    if (c === '/' && s[i + 1] === '/') {
      return { code: s.slice(0, i).trimEnd(), comment: s.slice(i) }
    }
  }
  return { code: s.trimEnd(), comment: '' }
}
