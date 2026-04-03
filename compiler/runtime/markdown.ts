/**
 * Minimal Markdown to HTML Converter
 *
 * Supports basic markdown syntax:
 * - **bold** → <strong>
 * - *italic* → <em>
 * - [text](url) → <a href="url">
 * - # Heading → <h1> (up to h6)
 * - - item → <li> in <ul>
 * - `code` → <code>
 * - Paragraphs separated by blank lines
 *
 * This is a minimal implementation for Mirror's .data files.
 * For complex markdown, consider using an external library.
 */

/**
 * Convert markdown string to HTML
 */
export function markdownToHTML(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return ''
  }

  const lines = markdown.split('\n')
  const result: string[] = []
  let inList = false
  let listBuffer: string[] = []
  let paragraphBuffer: string[] = []

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(' ')
      const processed = processInlineFormatting(text)
      result.push(`<p>${processed}</p>`)
      paragraphBuffer = []
    }
  }

  function flushList() {
    if (inList && listBuffer.length > 0) {
      result.push('<ul>')
      for (const item of listBuffer) {
        const processed = processInlineFormatting(item)
        result.push(`<li>${processed}</li>`)
      }
      result.push('</ul>')
      listBuffer = []
      inList = false
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Empty line - flush paragraph
    if (trimmed === '') {
      flushList()
      flushParagraph()
      continue
    }

    // Heading: # text, ## text, etc.
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (headingMatch) {
      flushList()
      flushParagraph()
      const level = headingMatch[1].length
      const text = processInlineFormatting(headingMatch[2])
      result.push(`<h${level}>${text}</h${level}>`)
      continue
    }

    // Unordered list item: - text or * text
    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed)
    if (listMatch) {
      flushParagraph()
      inList = true
      listBuffer.push(listMatch[1])
      continue
    }

    // Ordered list item: 1. text
    const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmed)
    if (orderedMatch) {
      flushParagraph()
      // Treat as unordered for simplicity (could be enhanced)
      inList = true
      listBuffer.push(orderedMatch[1])
      continue
    }

    // Regular text - add to paragraph buffer
    flushList()
    paragraphBuffer.push(trimmed)
  }

  // Flush any remaining content
  flushList()
  flushParagraph()

  return result.join('\n')
}

/**
 * Process inline formatting: bold, italic, links, code
 */
function processInlineFormatting(text: string): string {
  let result = text

  // Escape HTML special characters first (but preserve our patterns)
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code: `text` → <code>text</code>
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Bold: **text** → <strong>text</strong>
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic: *text* → <em>text</em>
  // Be careful not to match ** patterns (already processed)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')

  // Links: [text](url) → <a href="url">text</a>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  return result
}

/**
 * Convert markdown to plain text (strip formatting)
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return ''
  }

  let result = markdown

  // Remove heading markers
  result = result.replace(/^#{1,6}\s+/gm, '')

  // Remove list markers
  result = result.replace(/^[-*]\s+/gm, '')
  result = result.replace(/^\d+\.\s+/gm, '')

  // Remove bold markers
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1')

  // Remove italic markers
  result = result.replace(/\*([^*]+)\*/g, '$1')

  // Remove code markers
  result = result.replace(/`([^`]+)`/g, '$1')

  // Extract link text: [text](url) → text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  return result.trim()
}

/**
 * Check if a string contains markdown formatting
 */
export function hasMarkdownFormatting(text: string): boolean {
  if (!text) return false

  // Check for common markdown patterns
  return (
    /^#{1,6}\s+/.test(text) ||      // Headings
    /^[-*]\s+/.test(text) ||         // Lists
    /\*\*.+\*\*/.test(text) ||       // Bold
    /\*.+\*/.test(text) ||           // Italic
    /\[.+\]\(.+\)/.test(text) ||     // Links
    /`.+`/.test(text)                // Code
  )
}
