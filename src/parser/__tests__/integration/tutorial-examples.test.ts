/**
 * Tutorial Examples Integration Tests
 *
 * Extracts all Mirror code blocks from tutorial.md and validates
 * that they parse correctly with snapshot testing.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser'
import * as fs from 'fs'
import * as path from 'path'

// Read tutorial.md
const tutorialPath = path.resolve(__dirname, '../../../../../../docs/tutorial.md')
const tutorialContent = fs.readFileSync(tutorialPath, 'utf-8')

// Extract code blocks from markdown
function extractCodeBlocks(markdown: string): Array<{ code: string; lineNumber: number }> {
  const blocks: Array<{ code: string; lineNumber: number }> = []
  const lines = markdown.split('\n')

  let inCodeBlock = false
  let currentBlock = ''
  let blockStartLine = 0
  let isJavaScript = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Starting a code block
        inCodeBlock = true
        currentBlock = ''
        blockStartLine = i + 1
        // Check if it's JavaScript/TypeScript (skip those)
        isJavaScript = line.includes('javascript') || line.includes('typescript') || line.includes('js') || line.includes('ts')
      } else {
        // Ending a code block
        inCodeBlock = false
        if (!isJavaScript && currentBlock.trim()) {
          blocks.push({
            code: currentBlock.trim(),
            lineNumber: blockStartLine
          })
        }
      }
    } else if (inCodeBlock) {
      currentBlock += line + '\n'
    }
  }

  return blocks
}

// Filter out non-Mirror code blocks (comments-only, syntax examples, etc.)
function isMirrorCode(code: string): boolean {
  // Skip if it's just comments
  if (code.split('\n').every(line => line.trim().startsWith('//') || line.trim() === '')) {
    return false
  }

  // Skip if it looks like file paths or imports only
  if (code.startsWith('packages/') || code.startsWith('src/')) {
    return false
  }

  // Skip syntax reference blocks (just showing syntax patterns)
  if (code.includes('PRIMITIVEN') || code.includes('TOKENS') || code.includes('KOMPONENTE')) {
    return false
  }

  return true
}

const codeBlocks = extractCodeBlocks(tutorialContent).filter(block => isMirrorCode(block.code))

// ============================================================================
// TUTORIAL CODE BLOCKS - SNAPSHOT TESTS
// ============================================================================

describe('Tutorial Examples: Parsing', () => {
  it.each(codeBlocks.map((block, index) => [index + 1, block.lineNumber, block.code]))(
    'Block %i (line %i) parses without error',
    (_index, _line, code) => {
      expect(() => parse(code as string)).not.toThrow()
    }
  )
})

describe('Tutorial Examples: AST Snapshots', () => {
  codeBlocks.forEach((block, index) => {
    it(`Block ${index + 1} (line ${block.lineNumber}): AST snapshot`, () => {
      const ast = parse(block.code)

      // Create a clean snapshot without positions for readability
      const cleanAst = cleanForSnapshot(ast)

      expect(cleanAst).toMatchSnapshot()
    })
  })
})

// Helper to clean AST for readable snapshots
function cleanForSnapshot(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanForSnapshot)
  }

  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Skip position info for cleaner snapshots
      if (key === 'line' || key === 'column' || key === 'position') {
        continue
      }
      // Skip empty arrays
      if (Array.isArray(value) && value.length === 0) {
        continue
      }
      cleaned[key] = cleanForSnapshot(value)
    }
    return cleaned
  }

  return obj
}

// ============================================================================
// INDIVIDUAL IMPORTANT EXAMPLES
// ============================================================================

describe('Tutorial Examples: Key Structures', () => {
  it('Basic component definition', () => {
    const ast = parse(`
Text as text:
    col #E4E4E7
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].name).toBe('Text')
    expect(ast.components[0].primitive).toBe('text')
    expect(ast.components[0].properties).toHaveLength(1)
    expect(ast.components[0].properties[0].name).toBe('col')
  })

  it('Component with children (slots)', () => {
    const ast = parse(`
Card as frame:
    pad 16, bg #1a1a23, rad 8
    Title:
    Content:
`)
    expect(ast.components).toHaveLength(1)
    // Slots are parsed as children
    expect(ast.components[0].children.length).toBeGreaterThanOrEqual(2)
  })

  it('Inheritance with extends', () => {
    const ast = parse(`
Button as button:
    pad 8 16, bg primary, col white, rad 4

DangerButton extends Button:
    bg danger
`)
    expect(ast.components).toHaveLength(2)
    expect(ast.components[1].name).toBe('DangerButton')
    expect(ast.components[1].extends).toBe('Button')
  })

  it('Instance with named', () => {
    const ast = parse(`Button named saveBtn "Speichern"`)
    expect(ast.instances).toHaveLength(1)
    expect(ast.instances[0].name).toBe('saveBtn')
    // String content is stored as 'content' property
    const contentProp = ast.instances[0].properties.find(p => p.name === 'content')
    expect(contentProp?.values[0]).toBe('Speichern')
  })

  it('States with hover', () => {
    const ast = parse(`
Card as frame:
    pad 16, bg surface, rad 8
    hover:
        bg #333
`)
    expect(ast.components[0].states).toHaveLength(1)
    expect(ast.components[0].states[0].name).toBe('hover')
    expect(ast.components[0].states[0].properties).toHaveLength(1)
  })

  it('Events with onclick', () => {
    const ast = parse(`
Button as button:
    pad 8, bg primary
    onclick toggle Menu
`)
    expect(ast.components[0].events).toHaveLength(1)
    expect(ast.components[0].events[0].name).toBe('onclick')
  })

  it('Each loop iteration', () => {
    const ast = parse(`
each task in tasks
    Card
        Text task.title
`)
    expect(ast.instances).toHaveLength(1)
    const each = ast.instances[0] as any
    expect(each.type).toBe('Each')
    expect(each.item).toBe('task')
    expect(each.collection).toBe('tasks')
  })

  it('Conditional with if/else', () => {
    const ast = parse(`
if (loggedIn)
    Avatar
    Text username
else
    Button "Login"
`)
    expect(ast.instances).toHaveLength(1)
    const cond = ast.instances[0] as any
    expect(cond.type).toBe('Conditional')
    expect(cond.condition).toBe('(loggedIn)')
  })

  it('Data binding with where', () => {
    const ast = parse(`
TaskList as frame:
    data tasks where done === false
`)
    // Data binding is in properties
    const dataProp = ast.components[0].properties.find(p => p.name === 'data')
    expect(dataProp).toBeDefined()
  })

  it('Keys block', () => {
    const ast = parse(`
Dropdown as frame:
    keys
        escape close
        arrow-down highlight next
        arrow-up highlight prev
        enter select
`)
    expect(ast.components[0].events.length).toBeGreaterThanOrEqual(4)
  })

  it('Token definitions', () => {
    const ast = parse(`
primary: color = #3B82F6
sm: size = 4
`)
    expect(ast.tokens).toHaveLength(2)
    expect(ast.tokens[0].name).toBe('primary')
    expect(ast.tokens[0].tokenType).toBe('color')
    expect(ast.tokens[1].name).toBe('sm')
  })

  it('Import statement', () => {
    const ast = parse(`import "components"`)
    // Import handling depends on parser implementation
    // Just verify it parses without error
    expect(ast).toBeDefined()
  })
})
