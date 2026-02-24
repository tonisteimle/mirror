/**
 * @module converter/react-pivot/pipeline/dry-extractor
 * @description Extracts repeated style patterns into component definitions
 *
 * This post-processor analyzes Mirror code for repeated style combinations
 * and automatically extracts them into reusable component definitions.
 *
 * Example transformation:
 *
 * BEFORE (flat, repetitive):
 *   Table
 *     Row hor, gap $md.gap, pad $md.pad
 *       Text grow, col $heading.col, weight 600 "Name"
 *       Text grow, col $heading.col, weight 600 "Email"
 *     - Row hor, gap $md.gap, pad $md.pad
 *       Text grow, col $default.col "Max"
 *       Text grow, col $default.col "max@example.com"
 *
 * AFTER (DRY):
 *   TableRow: hor, gap $md.gap, pad $md.pad
 *   HeaderCell: Text grow, col $heading.col, weight 600
 *   DataCell: Text grow, col $default.col
 *
 *   Table
 *     TableRow
 *       HeaderCell "Name"
 *       HeaderCell "Email"
 *     - TableRow
 *       DataCell "Max"
 *       DataCell "max@example.com"
 */

export interface DryExtractionResult {
  /** Transformed code with definitions */
  code: string

  /** Number of definitions extracted */
  definitionsExtracted: number

  /** Names of extracted definitions */
  definitionNames: string[]

  /** Whether any extraction was performed */
  modified: boolean
}

interface ParsedLine {
  indent: number
  isListItem: boolean
  component: string
  styles: string
  text: string
  original: string
  lineIndex: number
}

interface StylePattern {
  component: string
  styles: string
  occurrences: number
  lines: number[]
}

/**
 * Extract repeated style patterns into component definitions.
 */
export function extractDryDefinitions(mirrorCode: string): DryExtractionResult {
  const lines = mirrorCode.split('\n')
  const parsedLines = parseLines(lines)

  // Find repeated style patterns
  const patterns = findRepeatedPatterns(parsedLines)

  // Filter patterns that occur 2+ times and have meaningful styles
  const extractablePatterns = patterns.filter(p =>
    p.occurrences >= 2 &&
    p.styles.length > 10 && // Minimum style length to be worth extracting
    !p.styles.includes(':') // Don't extract definitions
  )

  if (extractablePatterns.length === 0) {
    return {
      code: mirrorCode,
      definitionsExtracted: 0,
      definitionNames: [],
      modified: false,
    }
  }

  // Generate definition names
  const definitions = generateDefinitions(extractablePatterns)

  // Replace instances with definition references
  const transformedLines = replaceWithDefinitions(lines, parsedLines, definitions)

  // Build final code with definitions at top
  const definitionBlock = definitions
    .map(d => `${d.name}: ${d.baseComponent ? d.baseComponent + ' ' : ''}${d.styles}`)
    .join('\n')

  const layoutBlock = transformedLines.join('\n')

  // Find where to insert definitions (after tokens, before layout)
  const finalCode = insertDefinitions(definitionBlock, layoutBlock)

  return {
    code: finalCode,
    definitionsExtracted: definitions.length,
    definitionNames: definitions.map(d => d.name),
    modified: true,
  }
}

/**
 * Parse lines into structured format.
 */
function parseLines(lines: string[]): ParsedLine[] {
  const parsed: ParsedLine[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Skip token definitions and comments
    if (line.trim().startsWith('$') || line.trim().startsWith('//')) {
      continue
    }

    const indent = line.search(/\S/)
    const trimmed = line.trim()

    // Check for list item
    const isListItem = trimmed.startsWith('- ')
    const content = isListItem ? trimmed.slice(2) : trimmed

    // Parse component, styles, and text
    const { component, styles, text } = parseComponentLine(content)

    if (component) {
      parsed.push({
        indent,
        isListItem,
        component,
        styles,
        text,
        original: line,
        lineIndex: i,
      })
    }
  }

  return parsed
}

/**
 * Parse a component line into parts.
 */
function parseComponentLine(line: string): { component: string; styles: string; text: string } {
  // Skip definitions (contain :)
  if (line.includes(':') && !line.includes('$')) {
    return { component: '', styles: '', text: '' }
  }

  // Extract text content (quoted strings at end)
  let text = ''
  const textMatch = line.match(/["']([^"']+)["']\s*$/)
  if (textMatch) {
    text = textMatch[1]
    line = line.slice(0, textMatch.index).trim()
  }

  // Component is first word
  const parts = line.split(/\s+/)
  const component = parts[0]

  // Rest are styles
  const styles = parts.slice(1).join(' ').replace(/,\s*$/, '')

  return { component, styles, text }
}

/**
 * Find repeated style patterns.
 */
function findRepeatedPatterns(parsedLines: ParsedLine[]): StylePattern[] {
  const patternMap = new Map<string, StylePattern>()

  for (const line of parsedLines) {
    if (!line.styles) continue

    const key = `${line.component}|${normalizeStyles(line.styles)}`

    if (patternMap.has(key)) {
      const pattern = patternMap.get(key)!
      pattern.occurrences++
      pattern.lines.push(line.lineIndex)
    } else {
      patternMap.set(key, {
        component: line.component,
        styles: line.styles,
        occurrences: 1,
        lines: [line.lineIndex],
      })
    }
  }

  return Array.from(patternMap.values())
}

/**
 * Normalize styles for comparison (sort properties).
 */
function normalizeStyles(styles: string): string {
  // Split by comma, trim, sort, rejoin
  return styles
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .sort()
    .join(', ')
}

interface Definition {
  name: string
  baseComponent: string
  styles: string
  originalLines: number[]
}

/**
 * Generate definition names and structures.
 */
function generateDefinitions(patterns: StylePattern[]): Definition[] {
  const definitions: Definition[] = []
  const usedNames = new Set<string>()

  for (const pattern of patterns) {
    // Generate a meaningful name
    let name = generateDefinitionName(pattern, usedNames)
    usedNames.add(name)

    definitions.push({
      name,
      baseComponent: pattern.component,
      styles: pattern.styles,
      originalLines: pattern.lines,
    })
  }

  return definitions
}

/**
 * Generate a meaningful definition name.
 */
function generateDefinitionName(pattern: StylePattern, usedNames: Set<string>): string {
  const component = pattern.component
  const styles = pattern.styles.toLowerCase()

  // Try to infer semantic prefix from styles
  let prefix = ''

  if (styles.includes('heading.col') || styles.includes('weight 600') || styles.includes('weight 700')) {
    prefix = 'Header'
  } else if (styles.includes('default.col') && !styles.includes('heading')) {
    prefix = 'Data'
  } else if (styles.includes('muted.col')) {
    prefix = 'Muted'
  } else if (styles.includes('elevated.bg')) {
    prefix = 'Elevated'
  } else if (styles.includes('primary.bg')) {
    prefix = 'Primary'
  } else if (styles.includes('cursor pointer') && styles.includes('hor')) {
    prefix = 'Clickable'
  }

  // Generate name based on component type
  let baseName: string

  if (component === 'Text') {
    // Text → HeaderCell, DataCell, MutedText
    if (prefix === 'Header') {
      baseName = 'HeaderCell'
    } else if (prefix === 'Data') {
      baseName = 'DataCell'
    } else if (prefix) {
      baseName = `${prefix}Text`
    } else {
      baseName = 'StyledText'
    }
  } else if (component === 'Row' || component === 'TableRow' || component === 'Box') {
    // Row-like → TableRow, DataRow, ClickableRow
    if (prefix === 'Header') {
      baseName = 'HeaderRow'
    } else if (prefix === 'Data' || prefix === 'Clickable') {
      baseName = 'DataRow'
    } else if (prefix === 'Elevated') {
      baseName = 'ElevatedRow'
    } else if (component === 'TableRow') {
      baseName = 'StyledTableRow'
    } else {
      baseName = 'StyledRow'
    }
  } else if (component === 'Card') {
    baseName = prefix ? `${prefix}Card` : 'StyledCard'
  } else if (component === 'NavItem' || component === 'Item') {
    baseName = prefix ? `${prefix}Item` : 'StyledItem'
  } else if (component === 'Button') {
    baseName = prefix ? `${prefix}Button` : 'StyledButton'
  } else if (component === 'Title') {
    baseName = prefix ? `${prefix}Title` : 'StyledTitle'
  } else {
    // Generic fallback
    baseName = prefix ? `${prefix}${component}` : `Styled${component}`
  }

  // Ensure uniqueness
  let name = baseName
  let counter = 2
  while (usedNames.has(name)) {
    name = `${baseName}${counter}`
    counter++
  }

  return name
}

/**
 * Replace instances with definition references.
 */
function replaceWithDefinitions(
  originalLines: string[],
  parsedLines: ParsedLine[],
  definitions: Definition[]
): string[] {
  const lines = [...originalLines]

  // Create lookup: lineIndex -> definition
  const lineToDefinition = new Map<number, Definition>()
  for (const def of definitions) {
    for (const lineIndex of def.originalLines) {
      lineToDefinition.set(lineIndex, def)
    }
  }

  // Replace lines
  for (const parsed of parsedLines) {
    const def = lineToDefinition.get(parsed.lineIndex)
    if (!def) continue

    // Build replacement line
    const indent = ' '.repeat(parsed.indent)
    const prefix = parsed.isListItem ? '- ' : ''
    const text = parsed.text ? ` "${parsed.text}"` : ''

    lines[parsed.lineIndex] = `${indent}${prefix}${def.name}${text}`
  }

  return lines
}

/**
 * Insert definitions at the appropriate place in the code.
 */
function insertDefinitions(definitionBlock: string, layoutBlock: string): string {
  const lines = layoutBlock.split('\n')

  // Find where tokens end and layout begins
  let insertIndex = 0
  let inTokens = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('$')) {
      inTokens = true
      insertIndex = i + 1
    } else if (inTokens && line && !line.startsWith('$') && !line.startsWith('//')) {
      // First non-token, non-comment line after tokens
      break
    } else if (!inTokens && line && !line.startsWith('//')) {
      // No tokens, insert at beginning
      break
    }
  }

  // Insert definitions with blank line
  const before = lines.slice(0, insertIndex)
  const after = lines.slice(insertIndex)

  const result = [
    ...before,
    '', // blank line after tokens
    definitionBlock,
    '', // blank line before layout
    ...after,
  ]

  // Clean up multiple blank lines
  return result
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default extractDryDefinitions
