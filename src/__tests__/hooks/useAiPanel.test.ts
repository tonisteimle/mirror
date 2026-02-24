/**
 * useAiPanel Hook Tests
 *
 * Tests for the AI panel hook including code parsing for Data Tab markers.
 */
import { describe, it, expect } from 'vitest'

// Re-export the parser function for testing (it's internal to the module)
// We test it indirectly through the module's behavior, but for unit testing
// we can test the parsing logic directly
describe('parseGeneratedCode', () => {
  // Inline the function for testing (same logic as in useAiPanel.ts)
  function parseGeneratedCode(code: string): { dataCode: string | null; layoutCode: string } {
    const dataMarker = '// === DATA TAB ==='
    const layoutMarker = '// === LAYOUT TAB ==='

    const dataIndex = code.indexOf(dataMarker)
    const layoutIndex = code.indexOf(layoutMarker)

    // No markers found - return all as layout
    if (dataIndex === -1 && layoutIndex === -1) {
      return { dataCode: null, layoutCode: code }
    }

    // Extract Data Tab content if marker found
    let dataCode: string | null = null
    let layoutCode = code

    if (dataIndex !== -1) {
      const dataStart = dataIndex + dataMarker.length
      const dataEnd = layoutIndex !== -1 ? layoutIndex : code.length
      dataCode = code.slice(dataStart, dataEnd).trim()
    }

    // Extract Layout Tab content if marker found
    if (layoutIndex !== -1) {
      layoutCode = code.slice(layoutIndex + layoutMarker.length).trim()
    } else if (dataIndex !== -1) {
      // Only Data Tab marker, no Layout - should not happen but handle gracefully
      layoutCode = ''
    }

    return { dataCode, layoutCode }
  }

  it('returns code as layoutCode when no markers present', () => {
    const code = `Button "Click me"
Card
  Title "Hello"`
    const result = parseGeneratedCode(code)
    expect(result.dataCode).toBeNull()
    expect(result.layoutCode).toBe(code)
  })

  it('extracts Data Tab and Layout Tab content with both markers', () => {
    const code = `// === DATA TAB ===
Contact:
  name: text
  email: text

- Contact "John Doe", "john@example.com"
- Contact "Jane Smith", "jane@example.com"

// === LAYOUT TAB ===
$selected: null

Row hor
  List data Contacts
    - Item pad 12
      onclick assign $selected to $item
      Text $item.name

  if $selected
    Card
      Title $selected.name
      Text $selected.email`

    const result = parseGeneratedCode(code)

    expect(result.dataCode).toBe(`Contact:
  name: text
  email: text

- Contact "John Doe", "john@example.com"
- Contact "Jane Smith", "jane@example.com"`)

    expect(result.layoutCode).toBe(`$selected: null

Row hor
  List data Contacts
    - Item pad 12
      onclick assign $selected to $item
      Text $item.name

  if $selected
    Card
      Title $selected.name
      Text $selected.email`)
  })

  it('handles only Data Tab marker (edge case)', () => {
    const code = `// === DATA TAB ===
Contact:
  name: text`

    const result = parseGeneratedCode(code)
    expect(result.dataCode).toBe('Contact:\n  name: text')
    expect(result.layoutCode).toBe('')
  })

  it('handles only Layout Tab marker (unlikely but valid)', () => {
    const code = `// === LAYOUT TAB ===
Button "Hello"`

    const result = parseGeneratedCode(code)
    expect(result.dataCode).toBeNull()
    expect(result.layoutCode).toBe('Button "Hello"')
  })

  it('trims whitespace from extracted sections', () => {
    const code = `// === DATA TAB ===

Contact:
  name: text


// === LAYOUT TAB ===

Button "Click me"

`

    const result = parseGeneratedCode(code)
    expect(result.dataCode).toBe('Contact:\n  name: text')
    expect(result.layoutCode).toBe('Button "Click me"')
  })
})

describe('extractComponentAtCursor', () => {
  // Inline the function for testing (same logic as in useAiPanel.ts)
  function extractComponentAtCursor(code: string, cursorLine: number): {
    block: string
    startLine: number
    componentName: string
  } | null {
    const lines = code.split('\n')
    if (cursorLine < 1 || cursorLine > lines.length) return null

    const getIndent = (line: string) => line.match(/^(\s*)/)?.[1].length || 0

    let currentLine = cursorLine - 1

    while (currentLine >= 0) {
      const trimmed = lines[currentLine].trim()
      if (trimmed && !trimmed.startsWith('//')) break
      currentLine--
    }
    if (currentLine < 0) return null

    let currentIndent = getIndent(lines[currentLine])

    let definitionLine = currentLine
    while (definitionLine > 0 && currentIndent > 0) {
      const prevLineIdx = definitionLine - 1
      const prevLine = lines[prevLineIdx]
      const prevTrimmed = prevLine.trim()

      if (!prevTrimmed || prevTrimmed.startsWith('//')) {
        definitionLine--
        continue
      }

      const prevIndent = getIndent(prevLine)

      if (prevIndent < currentIndent) {
        definitionLine = prevLineIdx
        currentIndent = prevIndent
      } else {
        definitionLine--
      }
    }

    const defLine = lines[definitionLine]
    const nameMatch = defLine.trim().match(/^([A-Z][a-zA-Z0-9]*)/)
    if (!nameMatch) return null

    const componentName = nameMatch[1]
    const definitionIndent = getIndent(defLine)

    let endLine = definitionLine + 1
    while (endLine < lines.length) {
      const line = lines[endLine]
      const trimmed = line.trim()

      if (!trimmed) {
        endLine++
        continue
      }

      if (trimmed.startsWith('//')) {
        endLine++
        continue
      }

      const indent = getIndent(line)
      if (indent <= definitionIndent) {
        break
      }

      endLine++
    }

    // Trim trailing empty lines
    while (endLine > definitionLine && !lines[endLine - 1].trim()) {
      endLine--
    }
    const block = lines.slice(definitionLine, endLine).join('\n')

    return {
      block,
      startLine: definitionLine + 1,
      componentName
    }
  }

  it('extracts a simple component definition', () => {
    const code = `IconButton: hor, gap 8, pad 8 12, rad 6
  Icon: size 16
  Text: size 14`

    const result = extractComponentAtCursor(code, 1)
    expect(result).not.toBeNull()
    expect(result?.componentName).toBe('IconButton')
    expect(result?.startLine).toBe(1)
    expect(result?.block).toBe(code)
  })

  it('extracts component when cursor is on child line', () => {
    const code = `IconButton: hor, gap 8, pad 8 12, rad 6
  Icon: size 16
  Text: size 14`

    const result = extractComponentAtCursor(code, 2) // Cursor on Icon line
    expect(result).not.toBeNull()
    expect(result?.componentName).toBe('IconButton')
    expect(result?.startLine).toBe(1)
    expect(result?.block).toBe(code)
  })

  it('extracts component when cursor is on last child', () => {
    const code = `IconButton: hor, gap 8, pad 8 12, rad 6
  Icon: size 16
  Text: size 14`

    const result = extractComponentAtCursor(code, 3) // Cursor on Text line
    expect(result).not.toBeNull()
    expect(result?.componentName).toBe('IconButton')
    expect(result?.block).toBe(code)
  })

  it('extracts component followed by another component', () => {
    const code = `IconButton: hor, gap 8
  Icon: size 16
  Text: size 14

Card: pad 16
  Title: size 18`

    const result = extractComponentAtCursor(code, 2)
    expect(result).not.toBeNull()
    expect(result?.componentName).toBe('IconButton')
    expect(result?.block).toBe(`IconButton: hor, gap 8
  Icon: size 16
  Text: size 14`)
  })

  it('extracts second component when cursor is there', () => {
    const code = `IconButton: hor, gap 8
  Icon: size 16

Card: pad 16
  Title: size 18`

    const result = extractComponentAtCursor(code, 5) // Cursor on Title line
    expect(result).not.toBeNull()
    expect(result?.componentName).toBe('Card')
    expect(result?.block).toBe(`Card: pad 16
  Title: size 18`)
  })

  it('handles instance without colon', () => {
    const code = `Button pad 12, bg #3B82F6, "Click me"`

    const result = extractComponentAtCursor(code, 1)
    expect(result).not.toBeNull()
    expect(result?.componentName).toBe('Button')
    expect(result?.block).toBe(code)
  })

  it('returns null for invalid line number', () => {
    const code = `Button "Click"`
    expect(extractComponentAtCursor(code, 0)).toBeNull()
    expect(extractComponentAtCursor(code, 5)).toBeNull()
  })
})
