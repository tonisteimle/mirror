/**
 * Clean LLM output from markdown formatting and explanatory text
 */

export interface CleanResult {
  components: string
  layout: string
  hadMarkdown: boolean
  hadExplanation: boolean
}

/**
 * Remove markdown code blocks and extract content
 */
function removeCodeBlocks(text: string): string {
  // Match ```language ... ``` blocks
  const codeBlockRegex = /```(?:dsl|text|plaintext|)?\s*\n?([\s\S]*?)```/g
  const matches = text.matchAll(codeBlockRegex)
  const blocks = Array.from(matches).map(m => m[1].trim())

  if (blocks.length > 0) {
    return blocks.join('\n\n')
  }

  return text
}

/**
 * Remove common LLM explanation patterns
 */
function removeExplanations(text: string): string {
  const lines = text.split('\n')
  const cleanedLines: string[] = []

  // Patterns that indicate explanation text (not DSL)
  const explanationPatterns = [
    /^here'?s?\s/i,
    /^this\s/i,
    /^the\s(following|above|below)/i,
    /^i'?ve?\s/i,
    /^note:/i,
    /^explanation:/i,
    /^output:/i,
    /^result:/i,
    /^\*\*/,           // Bold markdown
    /^[-*]\s/,         // Bullet points
    /^\d+\.\s/,        // Numbered lists
    /^#{1,6}\s/,       // Headers
    /^>\s/,            // Blockquotes
  ]

  // Check if line looks like DSL
  const dslLinePattern = /^(\s*)([A-Z][a-zA-Z0-9]*)(:|[\s]|$)/

  for (const line of lines) {
    const trimmed = line.trim()

    // Keep empty lines (they might be separators)
    if (!trimmed) {
      cleanedLines.push(line)
      continue
    }

    // Check if it matches explanation patterns
    const isExplanation = explanationPatterns.some(p => p.test(trimmed))
    if (isExplanation) {
      continue
    }

    // Check if it looks like DSL (starts with component name)
    if (dslLinePattern.test(line) || line.startsWith('---')) {
      cleanedLines.push(line)
      continue
    }

    // If it's a continuation of DSL (indented content, properties)
    if (/^\s+[a-zA-Z]/.test(line)) {
      cleanedLines.push(line)
    }
  }

  return cleanedLines.join('\n')
}

/**
 * Detect and split by markers
 */
function splitByMarkers(text: string): { components: string; layout: string } | null {
  // Look for various marker formats
  const markerPatterns = [
    /---\s*COMPONENTS\s*---/i,
    /###\s*COMPONENTS/i,
    /COMPONENTS:/i,
    /\[COMPONENTS\]/i,
  ]

  const layoutMarkerPatterns = [
    /---\s*LAYOUT\s*---/i,
    /###\s*LAYOUT/i,
    /LAYOUT:/i,
    /\[LAYOUT\]/i,
  ]

  let componentsStart = -1
  let layoutStart = -1

  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (componentsStart === -1) {
      for (const pattern of markerPatterns) {
        if (pattern.test(line)) {
          componentsStart = i + 1
          break
        }
      }
    }

    if (layoutStart === -1) {
      for (const pattern of layoutMarkerPatterns) {
        if (pattern.test(line)) {
          layoutStart = i + 1
          break
        }
      }
    }
  }

  if (componentsStart !== -1 && layoutStart !== -1) {
    const componentsEnd = layoutStart - 1
    const components = lines.slice(componentsStart, componentsEnd).join('\n').trim()
    const layout = lines.slice(layoutStart).join('\n').trim()
    return { components, layout }
  }

  return null
}

/**
 * Try to intelligently split content without markers
 */
function intelligentSplit(text: string): { components: string; layout: string } {
  const lines = text.split('\n')
  const definitions: string[] = []
  const instances: string[] = []

  let currentBlock: string[] = []
  let isDefinitionBlock = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      // Empty line might end a block
      if (currentBlock.length > 0) {
        if (isDefinitionBlock) {
          definitions.push(...currentBlock)
        } else {
          instances.push(...currentBlock)
        }
        currentBlock = []
      }
      continue
    }

    // Check if this is a definition (has :)
    if (/^[A-Z][a-zA-Z0-9]*:/.test(trimmed)) {
      // Start of definition block
      if (currentBlock.length > 0 && !isDefinitionBlock) {
        instances.push(...currentBlock)
        currentBlock = []
      }
      isDefinitionBlock = true
      currentBlock.push(line)
    } else if (/^\s+/.test(line) && currentBlock.length > 0) {
      // Indented line belongs to current block
      currentBlock.push(line)
    } else if (/^[A-Z][a-zA-Z0-9]*[\s"]/.test(trimmed) || /^[A-Z][a-zA-Z0-9]*$/.test(trimmed)) {
      // Instance line
      if (currentBlock.length > 0 && isDefinitionBlock) {
        definitions.push(...currentBlock)
        currentBlock = []
      }
      isDefinitionBlock = false
      currentBlock.push(line)
    }
  }

  // Don't forget the last block
  if (currentBlock.length > 0) {
    if (isDefinitionBlock) {
      definitions.push(...currentBlock)
    } else {
      instances.push(...currentBlock)
    }
  }

  return {
    components: definitions.join('\n'),
    layout: instances.join('\n')
  }
}

/**
 * Main cleaning function
 */
export function cleanLLMOutput(rawOutput: string): CleanResult {
  let text = rawOutput
  let hadMarkdown = false
  let hadExplanation = false

  // Step 1: Remove markdown code blocks
  const withoutCodeBlocks = removeCodeBlocks(text)
  if (withoutCodeBlocks !== text) {
    hadMarkdown = true
    text = withoutCodeBlocks
  }

  // Step 2: Remove explanation text
  const withoutExplanations = removeExplanations(text)
  if (withoutExplanations.length < text.length * 0.9) {
    hadExplanation = true
  }
  text = withoutExplanations

  // Step 3: Try to split by markers
  const markerSplit = splitByMarkers(text)
  if (markerSplit) {
    return {
      ...markerSplit,
      hadMarkdown,
      hadExplanation
    }
  }

  // Step 4: Intelligent split
  const intelligentResult = intelligentSplit(text)

  return {
    ...intelligentResult,
    hadMarkdown,
    hadExplanation
  }
}
