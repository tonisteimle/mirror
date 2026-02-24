/**
 * Response Parser
 *
 * Parses and extracts code from LLM responses.
 * Part of Enhanced LLM Integration (Increment 24).
 */

/**
 * Parsed response structure
 */
export interface ParsedResponse {
  code: string | null
  explanation: string
  codeBlocks: CodeBlock[]
  hasCode: boolean
  confidence: number
  metadata: ResponseMetadata
}

/**
 * Code block extracted from response
 */
export interface CodeBlock {
  code: string
  language: string
  label?: string
  lineStart?: number
  lineEnd?: number
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  totalLength: number
  codeLength: number
  explanationLength: number
  blockCount: number
  primaryLanguage: string | null
}

/**
 * Parser options
 */
export interface ParserOptions {
  extractAll?: boolean
  preferredLanguage?: string
  stripComments?: boolean
  normalizeWhitespace?: boolean
}

const DEFAULT_OPTIONS: Required<ParserOptions> = {
  extractAll: false,
  preferredLanguage: 'mirror',
  stripComments: false,
  normalizeWhitespace: true
}

/**
 * Parses an LLM response and extracts code
 */
export function parseResponse(
  response: string,
  options?: ParserOptions
): ParsedResponse {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const codeBlocks = extractCodeBlocks(response)
  const explanation = extractExplanation(response, codeBlocks)

  // Find the primary code block
  const primaryBlock = findPrimaryBlock(codeBlocks, opts.preferredLanguage)

  let code = primaryBlock?.code || null

  // Post-process code if found
  if (code) {
    if (opts.stripComments) {
      code = stripMirrorComments(code)
    }
    if (opts.normalizeWhitespace) {
      code = normalizeWhitespace(code)
    }
  }

  // Calculate confidence
  const confidence = calculateConfidence(response, codeBlocks, primaryBlock)

  const metadata: ResponseMetadata = {
    totalLength: response.length,
    codeLength: codeBlocks.reduce((sum, b) => sum + b.code.length, 0),
    explanationLength: explanation.length,
    blockCount: codeBlocks.length,
    primaryLanguage: primaryBlock?.language || null
  }

  return {
    code,
    explanation,
    codeBlocks: opts.extractAll ? codeBlocks : (primaryBlock ? [primaryBlock] : []),
    hasCode: code !== null,
    confidence,
    metadata
  }
}

/**
 * Extracts all code blocks from response
 */
export function extractCodeBlocks(response: string): CodeBlock[] {
  const blocks: CodeBlock[] = []

  // Pattern for fenced code blocks
  const fencedPattern = /```(\w*)\n([\s\S]*?)```/g
  let match

  while ((match = fencedPattern.exec(response)) !== null) {
    const language = match[1].toLowerCase() || 'unknown'
    const code = match[2].trim()

    blocks.push({
      code,
      language: normalizeLanguage(language),
      lineStart: getLineNumber(response, match.index),
      lineEnd: getLineNumber(response, match.index + match[0].length)
    })
  }

  // If no fenced blocks, try to detect inline Mirror code
  if (blocks.length === 0) {
    const mirrorCode = extractInlineMirrorCode(response)
    if (mirrorCode) {
      blocks.push({
        code: mirrorCode,
        language: 'mirror'
      })
    }
  }

  return blocks
}

/**
 * Extracts Mirror code from non-fenced response
 */
function extractInlineMirrorCode(response: string): string | null {
  // Look for patterns that indicate Mirror code
  const lines = response.split('\n')
  const codeLines: string[] = []
  let inCode = false
  let braceCount = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Check for Mirror-like patterns
    const isMirrorLine = (
      /^[A-Z][A-Za-z0-9]*\s*[:{]/.test(trimmed) ||  // Component definition/instance
      /^\$[\w-]+\s*:/.test(trimmed) ||              // Token definition
      /^\s*-\s+[A-Z][A-Za-z0-9]*/.test(trimmed) ||  // List item
      /^(horizontal|vertical|center)\s*[,{]?/.test(trimmed) ||  // Layout keywords
      /^\}/.test(trimmed)  // Closing brace
    )

    if (isMirrorLine || inCode) {
      codeLines.push(line)
      inCode = true

      // Track brace balance
      braceCount += (line.match(/\{/g) || []).length
      braceCount -= (line.match(/\}/g) || []).length

      // Stop if we've closed all braces and have content
      if (braceCount <= 0 && codeLines.length > 0) {
        const nextIndex = lines.indexOf(line) + 1
        const nextLine = lines[nextIndex]?.trim()

        // Continue if next line looks like more code
        if (!nextLine || (!nextLine.match(/^[A-Z$]/) && !nextLine.startsWith('-'))) {
          break
        }
      }
    }
  }

  if (codeLines.length > 0) {
    return codeLines.join('\n').trim()
  }

  return null
}

/**
 * Extracts explanation text from response
 */
function extractExplanation(response: string, codeBlocks: CodeBlock[]): string {
  let text = response

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '')

  // Clean up
  text = text.trim()

  // Remove common prefixes
  text = text.replace(/^(Here's|Here is|I've created|I created|This is)[^:]*:/i, '')

  return text.trim()
}

/**
 * Finds the primary code block based on preferences
 */
function findPrimaryBlock(
  blocks: CodeBlock[],
  preferredLanguage: string
): CodeBlock | null {
  if (blocks.length === 0) return null

  // First try to find preferred language
  const preferred = blocks.find(b =>
    b.language === preferredLanguage ||
    b.language === 'mirror' ||
    b.language === 'dsl'
  )

  if (preferred) return preferred

  // Then try any code-like block
  const codeLike = blocks.find(b =>
    ['javascript', 'typescript', 'jsx', 'tsx', 'css', 'html', 'unknown'].includes(b.language)
  )

  if (codeLike) return codeLike

  // Return first block
  return blocks[0]
}

/**
 * Normalizes language identifier
 */
function normalizeLanguage(lang: string): string {
  const aliases: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'md': 'markdown',
    'mirror-dsl': 'mirror',
    'mirrordsl': 'mirror',
    '': 'unknown'
  }

  return aliases[lang] || lang
}

/**
 * Gets line number at position
 */
function getLineNumber(text: string, position: number): number {
  return text.substring(0, position).split('\n').length
}

/**
 * Strips Mirror comments from code
 */
export function stripMirrorComments(code: string): string {
  return code
    .split('\n')
    .map(line => {
      // Remove inline comments
      const commentIndex = line.indexOf('//')
      if (commentIndex >= 0) {
        // Check if // is inside a string
        const beforeComment = line.substring(0, commentIndex)
        const quoteCount = (beforeComment.match(/"/g) || []).length
        if (quoteCount % 2 === 0) {
          return line.substring(0, commentIndex).trimEnd()
        }
      }
      return line
    })
    .filter(line => line.trim().length > 0 || line === '')
    .join('\n')
}

/**
 * Normalizes whitespace in code
 */
export function normalizeWhitespace(code: string): string {
  return code
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')  // Collapse multiple blank lines
    .trim()
}

/**
 * Calculates confidence score for extraction
 */
function calculateConfidence(
  response: string,
  blocks: CodeBlock[],
  primaryBlock: CodeBlock | null
): number {
  let confidence = 0

  // Has code blocks
  if (blocks.length > 0) {
    confidence += 0.3
  }

  // Has Mirror-specific code
  if (primaryBlock?.language === 'mirror') {
    confidence += 0.2
  }

  // Code looks valid
  if (primaryBlock) {
    const code = primaryBlock.code

    // Has component definitions or instances
    if (/[A-Z][A-Za-z0-9]*\s*[:{]/.test(code)) {
      confidence += 0.2
    }

    // Has balanced braces
    const openCount = (code.match(/\{/g) || []).length
    const closeCount = (code.match(/\}/g) || []).length
    if (openCount === closeCount) {
      confidence += 0.2
    }

    // Reasonable length
    if (code.length > 10 && code.length < 10000) {
      confidence += 0.1
    }
  }

  return Math.min(confidence, 1)
}

/**
 * Extracts just the code, ignoring everything else
 */
export function extractCode(response: string): string | null {
  const parsed = parseResponse(response)
  return parsed.code
}

/**
 * Checks if response contains Mirror code
 */
export function hasMirrorCode(response: string): boolean {
  const blocks = extractCodeBlocks(response)

  // Check for Mirror language blocks
  if (blocks.some(b => b.language === 'mirror' || b.language === 'dsl')) {
    return true
  }

  // Check for Mirror patterns in any block
  return blocks.some(b => {
    const code = b.code
    return (
      /^[A-Z][A-Za-z0-9]*\s*[:{]/m.test(code) ||
      /^\$[\w-]+\s*:/m.test(code)
    )
  })
}

/**
 * Extracts multiple code sections with labels
 */
export function extractLabeledSections(response: string): Map<string, string> {
  const sections = new Map<string, string>()

  // Pattern for labeled sections
  const labelPattern = /(?:^|\n)#+\s*(.+?)(?:\n|$)[\s\S]*?```\w*\n([\s\S]*?)```/g
  let match

  while ((match = labelPattern.exec(response)) !== null) {
    const label = match[1].trim()
    const code = match[2].trim()
    sections.set(label, code)
  }

  return sections
}

/**
 * Parses streaming response chunks
 */
export class StreamingParser {
  private buffer: string = ''
  private extractedBlocks: CodeBlock[] = []

  /**
   * Adds a chunk to the buffer
   */
  addChunk(chunk: string): void {
    this.buffer += chunk
    this.tryExtract()
  }

  /**
   * Tries to extract completed code blocks
   */
  private tryExtract(): void {
    const completeBlockPattern = /```(\w*)\n([\s\S]*?)```/g
    let match

    while ((match = completeBlockPattern.exec(this.buffer)) !== null) {
      const block: CodeBlock = {
        code: match[2].trim(),
        language: normalizeLanguage(match[1])
      }

      // Check if we already have this block
      const isDuplicate = this.extractedBlocks.some(
        b => b.code === block.code
      )

      if (!isDuplicate) {
        this.extractedBlocks.push(block)
      }
    }
  }

  /**
   * Gets currently extracted blocks
   */
  getBlocks(): CodeBlock[] {
    return [...this.extractedBlocks]
  }

  /**
   * Gets the primary code
   */
  getCode(): string | null {
    const primary = findPrimaryBlock(this.extractedBlocks, 'mirror')
    return primary?.code || null
  }

  /**
   * Checks if code is currently being streamed
   */
  isStreaming(): boolean {
    // Check for unclosed code fence
    const openFences = (this.buffer.match(/```/g) || []).length
    return openFences % 2 !== 0
  }

  /**
   * Gets the final parsed response
   */
  finish(): ParsedResponse {
    return parseResponse(this.buffer)
  }

  /**
   * Resets the parser
   */
  reset(): void {
    this.buffer = ''
    this.extractedBlocks = []
  }
}

/**
 * Validates that extracted code is Mirror DSL
 */
export function validateMirrorCode(code: string): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for balanced braces
  const openCount = (code.match(/\{/g) || []).length
  const closeCount = (code.match(/\}/g) || []).length
  if (openCount !== closeCount) {
    issues.push(`Unbalanced braces: ${openCount} open, ${closeCount} close`)
  }

  // Check for component-like structure
  if (!/[A-Z][A-Za-z0-9]*\s*[:{]/.test(code)) {
    issues.push('No component definitions or instances found')
  }

  // Check for invalid tokens
  const tokenDefs = code.match(/\$\s+[\w-]+\s*:/g)
  if (tokenDefs) {
    issues.push('Invalid token syntax: space after $')
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Creates a quick response parser for simple extractions
 */
export function quickParse(response: string): {
  code: string | null
  isValid: boolean
} {
  const code = extractCode(response)

  if (!code) {
    return { code: null, isValid: false }
  }

  const validation = validateMirrorCode(code)

  return {
    code,
    isValid: validation.valid
  }
}
