/**
 * Doc Text Parser
 *
 * Parses multiline strings with token formatting for doc-mode.
 *
 * Block-level syntax: $token Text (applies to rest of line)
 * Inline syntax: $token[phrase] (applies to bracketed content)
 * Link syntax: $link[text](url)
 */

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
 * Block tokens ($p, $h1, etc.) start new blocks.
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

    // Check for block-level token at start of line: $token Text
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
 * Parse a block-level token: $token Text
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
 * Parse inline tokens within text: $token[phrase] and $link[text](url)
 */
export function parseInlineTokens(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let pos = 0
  let currentText = ''

  while (pos < text.length) {
    // Check for escaped bracket
    if (text[pos] === '\\' && (text[pos + 1] === '[' || text[pos + 1] === ']')) {
      currentText += text[pos + 1]
      pos += 2
      continue
    }

    // Check for inline token: $token[content]
    if (text[pos] === '$') {
      // Try to match token name
      const tokenMatch = text.slice(pos).match(/^\$([a-zA-Z_][a-zA-Z0-9_-]*)\[/)
      if (tokenMatch) {
        // Save preceding text
        if (currentText) {
          segments.push({ type: 'text', content: currentText })
          currentText = ''
        }

        const tokenName = tokenMatch[1]
        pos += tokenMatch[0].length // Move past $token[

        // Find matching closing bracket (handle nested brackets)
        let bracketContent = ''
        let bracketDepth = 1
        while (pos < text.length && bracketDepth > 0) {
          if (text[pos] === '\\' && (text[pos + 1] === '[' || text[pos + 1] === ']')) {
            bracketContent += text[pos + 1]
            pos += 2
            continue
          }
          if (text[pos] === '[') bracketDepth++
          else if (text[pos] === ']') bracketDepth--

          if (bracketDepth > 0) {
            bracketContent += text[pos]
          }
          pos++
        }

        // Check for link syntax: $link[text](url)
        if (tokenName === 'link' && text[pos] === '(') {
          pos++ // Skip (
          let url = ''
          while (pos < text.length && text[pos] !== ')') {
            url += text[pos]
            pos++
          }
          pos++ // Skip )

          segments.push({
            type: 'link',
            content: bracketContent,
            token: tokenName,
            url
          })
        } else {
          segments.push({
            type: 'inline',
            content: bracketContent,
            token: tokenName
          })
        }
        continue
      }
    }

    // Regular character
    currentText += text[pos]
    pos++
  }

  // Add remaining text
  if (currentText) {
    segments.push({ type: 'text', content: currentText })
  }

  return segments
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
