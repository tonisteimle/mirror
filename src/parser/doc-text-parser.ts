/**
 * @module doc-text-parser
 * @description Doc Text Parser - Markdown-Formatierung für Multiline-Strings
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst Multiline-Strings mit Markdown-ähnlicher Formatierung
 *
 * Unterstützt:
 * - Block-Level: # Heading, $token Text
 * - Inline: **bold**, _italic_, `code`, [link](url)
 * - Soft Wrapping: Zeilenumbrüche werden zu Leerzeichen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOCK SYNTAX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Markdown Headings
 *   # Heading 1
 *   ## Heading 2
 *   ### Heading 3
 *   #### Heading 4
 *
 * @syntax Legacy Block Tokens
 *   $p Paragraph text
 *   $lead Lead paragraph
 *   $label SMALL LABEL
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INLINE SYNTAX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Bold
 *   **bold text**
 *
 * @syntax Italic
 *   _italic text_
 *
 * @syntax Code
 *   `inline code`
 *
 * @syntax Link
 *   [link text](https://url)
 *
 * @syntax Escaped Characters
 *   \* \_ \` \[ \] \( \) \\
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OUTPUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @interface TextSegment
 *   type: 'text' | 'block' | 'inline' | 'link'
 *   content: string
 *   token?: string     → Token-Name ohne $
 *   url?: string       → Für Links
 *   children?: TextSegment[] → Verschachtelte Segmente
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseDocText(input) → TextSegment[]
 *   Hauptfunktion: Parst kompletten Multiline-String
 *   - Erkennt Block-Tokens am Zeilenanfang
 *   - Kontinuationszeilen werden angehängt
 *   - Leerzeilen beenden Blöcke
 *
 * @function parseInlineTokens(text) → TextSegment[]
 *   Parst Inline-Formatierung innerhalb von Text
 *   - **bold**, _italic_, `code`, [link](url)
 *
 * @function normalizeIndent(content) → string
 *   Entfernt gemeinsame führende Einrückung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Input
 *   text
 *     '# Welcome
 *
 *      $p This is **bold** and _italic_ text.
 *      Click [here](https://example.com).'
 *
 * @example Output
 *   [
 *     { type: 'block', token: 'h1', content: 'Welcome' },
 *     { type: 'block', token: 'p', content: 'This is **bold** and _italic_ text...', children: [...] }
 *   ]
 *
 * @used-by Generator für text-Component Rendering
 */

import { getBlockShortcuts, getInlineShortcuts } from './doc-shortcuts'

/**
 * Represents a parsed text segment
 */
export interface TextSegment {
  type: 'text' | 'block' | 'inline' | 'link'
  content: string
  token?: string      // Token name without $
  url?: string        // For link type
  children?: TextSegment[]  // For nested content within blocks
}

/**
 * Parse a multiline string with doc-mode token formatting.
 *
 * Line breaks within text are treated as spaces (soft wrap).
 * Block tokens (# heading, $token) start new blocks.
 * Continuation lines (non-block, non-empty) are appended to current block.
 * Empty lines end the current block.
 *
 * @param input The raw multiline string content
 * @returns Array of text segments
 */
export function parseDocText(input: string): TextSegment[] {
  const segments: TextSegment[] = []
  const lines = input.split('\n')

  // Current block being built (if any)
  let currentBlock: { token: string; contentLines: string[] } | null = null
  // Accumulate non-block lines (plain text without block token)
  let currentParagraph: string[] = []

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      // Join lines with spaces (soft wrap)
      const paragraphText = currentParagraph.join(' ').trim()
      if (paragraphText) {
        const inlineSegments = parseInlineTokens(paragraphText)
        segments.push(...inlineSegments)
      }
      currentParagraph = []
    }
  }

  const flushBlock = () => {
    if (currentBlock) {
      // Parse inline tokens per line first (inline tokens cannot span lines)
      // then join the results with spaces
      const parsedLines = currentBlock.contentLines.map(line => parseInlineTokens(line.trim()))

      // Merge all line segments, adding space between lines
      const mergedSegments: TextSegment[] = []
      for (let i = 0; i < parsedLines.length; i++) {
        const lineSegments = parsedLines[i]
        for (const seg of lineSegments) {
          mergedSegments.push(seg)
        }
        // Add space between lines (unless last line)
        if (i < parsedLines.length - 1 && lineSegments.length > 0) {
          // Append space to last text segment or add new text segment
          const lastSeg = mergedSegments[mergedSegments.length - 1]
          if (lastSeg && lastSeg.type === 'text') {
            lastSeg.content += ' '
          } else {
            mergedSegments.push({ type: 'text', content: ' ' })
          }
        }
      }

      // Build full content string for the block
      const fullContent = currentBlock.contentLines.join(' ').trim()

      segments.push({
        type: 'block',
        content: fullContent,
        token: currentBlock.token,
        children: mergedSegments.length > 1 || mergedSegments[0]?.type !== 'text'
          ? mergedSegments
          : undefined
      })
      currentBlock = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trimStart()

    // Empty line = end current block/paragraph
    if (!line.trim()) {
      flushBlock()
      flushParagraph()
      continue
    }

    // Check for markdown heading at start of line: # ## ### ####
    const headingResult = parseMarkdownHeading(trimmedLine)
    if (headingResult) {
      // Flush any previous block or paragraph
      flushBlock()
      flushParagraph()

      // Start a new block
      currentBlock = {
        token: headingResult.token,
        contentLines: headingResult.content ? [headingResult.content] : []
      }
      continue
    }

    // Check for legacy block-level token at start of line: $token Text
    if (trimmedLine.startsWith('$')) {
      const blockResult = parseBlockToken(trimmedLine)
      if (blockResult) {
        // Flush any previous block or paragraph
        flushBlock()
        flushParagraph()

        // Start a new block
        currentBlock = {
          token: blockResult.token,
          contentLines: blockResult.content ? [blockResult.content] : []
        }
        continue
      }
    }

    // Regular text line
    if (currentBlock) {
      // We're inside a block - append to it
      currentBlock.contentLines.push(line.trim())
    } else {
      // No current block - accumulate as plain paragraph
      currentParagraph.push(line.trim())
    }
  }

  // Flush any remaining block or paragraph
  flushBlock()
  flushParagraph()

  return segments
}

/**
 * Parse markdown heading: # Heading, ## Heading, etc.
 */
function parseMarkdownHeading(line: string): { token: string; content: string } | null {
  // Match # followed by space (important: must have space after #)
  const match = line.match(/^(#{1,4})\s+(.*)$/)
  if (match) {
    const level = match[1].length
    return {
      token: `h${level}`,
      content: match[2]
    }
  }
  return null
}

/**
 * Parse a legacy block-level token: $token Text
 */
function parseBlockToken(line: string): { token: string; content: string } | null {
  // Match $token followed by space and text
  const match = line.match(/^\$([a-zA-Z_][a-zA-Z0-9_-]*)\s+(.*)$/)
  if (match) {
    return {
      token: match[1],
      content: match[2]
    }
  }

  // Match $token alone (no content)
  const tokenOnlyMatch = line.match(/^\$([a-zA-Z_][a-zA-Z0-9_-]*)$/)
  if (tokenOnlyMatch) {
    return {
      token: tokenOnlyMatch[1],
      content: ''
    }
  }

  return null
}

/**
 * Parse inline tokens within text:
 * - **bold** text
 * - _italic_ text
 * - `code` text
 * - [link text](url)
 */
export function parseInlineTokens(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let pos = 0
  let currentText = ''

  const flushText = () => {
    if (currentText) {
      segments.push({ type: 'text', content: currentText })
      currentText = ''
    }
  }

  while (pos < text.length) {
    // Check for escaped characters
    if (text[pos] === '\\' && pos + 1 < text.length) {
      const nextChar = text[pos + 1]
      // Escape special markdown characters
      if ('*_`[]()\\'.includes(nextChar)) {
        currentText += nextChar
        pos += 2
        continue
      }
    }

    // Check for **bold** (must check before single *)
    if (text.slice(pos, pos + 2) === '**') {
      const endPos = text.indexOf('**', pos + 2)
      if (endPos !== -1) {
        flushText()
        segments.push({
          type: 'inline',
          content: text.slice(pos + 2, endPos),
          token: 'b'
        })
        pos = endPos + 2
        continue
      }
    }

    // Check for _italic_
    // Only match if not preceded by alphanumeric (word boundary)
    if (text[pos] === '_') {
      const prevChar = pos > 0 ? text[pos - 1] : ' '
      if (!/[a-zA-Z0-9]/.test(prevChar)) {
        const endPos = findClosingUnderscore(text, pos + 1)
        if (endPos !== -1) {
          flushText()
          segments.push({
            type: 'inline',
            content: text.slice(pos + 1, endPos),
            token: 'i'
          })
          pos = endPos + 1
          continue
        }
      }
    }

    // Check for `code`
    if (text[pos] === '`') {
      const endPos = text.indexOf('`', pos + 1)
      if (endPos !== -1) {
        flushText()
        segments.push({
          type: 'inline',
          content: text.slice(pos + 1, endPos),
          token: 'code'
        })
        pos = endPos + 1
        continue
      }
    }

    // Check for [link text](url)
    if (text[pos] === '[') {
      const closeSquare = text.indexOf(']', pos + 1)
      if (closeSquare !== -1 && text[closeSquare + 1] === '(') {
        const closeParen = text.indexOf(')', closeSquare + 2)
        if (closeParen !== -1) {
          flushText()
          const linkText = text.slice(pos + 1, closeSquare)
          const url = text.slice(closeSquare + 2, closeParen)
          segments.push({
            type: 'link',
            content: linkText,
            token: 'link',
            url
          })
          pos = closeParen + 1
          continue
        }
      }
    }

    // Regular character
    currentText += text[pos]
    pos++
  }

  // Add remaining text
  flushText()

  return segments
}

/**
 * Find the closing underscore for italic text.
 * Must not be followed by alphanumeric (word boundary).
 */
function findClosingUnderscore(text: string, startPos: number): number {
  let pos = startPos
  while (pos < text.length) {
    if (text[pos] === '_') {
      const nextChar = pos + 1 < text.length ? text[pos + 1] : ' '
      // Only close if not followed by alphanumeric
      if (!/[a-zA-Z0-9]/.test(nextChar)) {
        return pos
      }
    }
    pos++
  }
  return -1
}

/**
 * Normalize whitespace in multiline string content.
 * Removes common leading indentation from all lines.
 */
export function normalizeIndent(content: string): string {
  const lines = content.split('\n')

  // Find minimum indentation (ignoring empty lines)
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim()) {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0
      minIndent = Math.min(minIndent, indent)
    }
  }

  if (minIndent === Infinity || minIndent === 0) {
    return content
  }

  // Remove common indentation
  return lines
    .map(line => line.slice(minIndent))
    .join('\n')
}
