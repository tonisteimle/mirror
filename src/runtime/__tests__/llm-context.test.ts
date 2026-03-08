/**
 * Tests for LLM Context Builder
 */

import {
  extractComponents,
  extractTokens,
  buildCursorContext,
  buildContext,
  formatContextForPrompt,
  buildSystemPrompt,
  reindentCode,
  integrateCode
} from '../llm-context'

describe('extractComponents()', () => {

  test('extracts simple component definition', () => {
    const source = `Card: bg #1a1a23, pad 16, rad 8`
    const components = extractComponents(source)

    expect(components).toHaveLength(1)
    expect(components[0].name).toBe('Card')
    expect(components[0].props).toContain('bg #1a1a23')
    expect(components[0].props).toContain('pad 16')
    expect(components[0].props).toContain('rad 8')
  })

  test('extracts component with slots', () => {
    const source = `
Card: bg #1a1a23, pad 16
  Title:
  Content:
  Footer:
`
    const components = extractComponents(source)

    // Card component should have slots
    const card = components.find(c => c.name === 'Card')
    expect(card).toBeDefined()
    expect(card!.slots).toContain('Title')
    expect(card!.slots).toContain('Content')
    expect(card!.slots).toContain('Footer')
  })

  test('extracts component inheritance', () => {
    const source = `
Button: pad 12, bg #3B82F6, rad 8
DangerButton as Button: bg #EF4444
`
    const components = extractComponents(source)

    expect(components).toHaveLength(2)
    expect(components[0].name).toBe('Button')
    expect(components[1].name).toBe('DangerButton')
    expect(components[1].extends).toBe('Button')
    expect(components[1].props).toContain('bg #EF4444')
  })

  test('extracts multiple components', () => {
    const source = `
Card: bg #1a1a23, pad 16, rad 8
  Title:
  Content:

Button: pad 12, bg #3B82F6, rad 8

Input: pad 8, bg #0a0a0f, rad 4
`
    const components = extractComponents(source)

    // Should find Card, Title, Content, Button, Input (slots are also detected as components)
    const names = components.map(c => c.name)
    expect(names).toContain('Card')
    expect(names).toContain('Button')
    expect(names).toContain('Input')
  })

  test('ignores instances (no colon)', () => {
    const source = `
Card: bg #333
  Title:

Card
  Title "Hello"
`
    const components = extractComponents(source)

    // Should find Card and Title definitions, but not the instance usage
    const names = components.map(c => c.name)
    expect(names).toContain('Card')
    // "Title" also gets picked up as a definition since it has ":"
    expect(names.filter(n => n === 'Card').length).toBe(1) // Only one Card definition
  })

})

describe('extractTokens()', () => {

  test('extracts simple tokens', () => {
    const source = `
$primary.bg: #3B82F6
$primary.hover.bg: #2563EB
$surface.bg: #1a1a23
`
    const tokens = extractTokens(source)

    expect(tokens).toHaveLength(3)
    expect(tokens[0].name).toBe('$primary.bg')
    expect(tokens[0].value).toBe('#3B82F6')
    expect(tokens[0].category).toBe('color')
  })

  test('extracts spacing tokens', () => {
    const source = `
$sm.pad: 4
$md.pad: 8
$lg.pad: 16
$md.gap: 12
`
    const tokens = extractTokens(source)

    expect(tokens).toHaveLength(4)
    expect(tokens[0].category).toBe('spacing')
    expect(tokens[3].name).toBe('$md.gap')
  })

  test('extracts radius tokens', () => {
    const source = `
$sm.rad: 4
$md.rad: 8
$lg.rad: 12
`
    const tokens = extractTokens(source)

    expect(tokens).toHaveLength(3)
    expect(tokens.every(t => t.category === 'radius')).toBe(true)
  })

  test('extracts token blocks', () => {
    const source = `
$dropdown:
  bg #1a1a23
  border #333
  item.hover #2a2a33
`
    const tokens = extractTokens(source)

    expect(tokens).toHaveLength(3)
    expect(tokens[0].name).toBe('$dropdown.bg')
    expect(tokens[0].value).toBe('#1a1a23')
    expect(tokens[1].name).toBe('$dropdown.border')
    expect(tokens[2].name).toBe('$dropdown.item.hover')
  })

  test('categorizes based on value when name is ambiguous', () => {
    const source = `
$custom: #FF0000
$amount: 24
`
    const tokens = extractTokens(source)

    expect(tokens[0].category).toBe('color') // #FF0000 is a color
    expect(tokens[1].category).toBe('spacing') // 24 is numeric, defaults to spacing
  })

})

describe('buildCursorContext()', () => {

  test('identifies component at cursor', () => {
    const source = `
Card: bg #333
  Title:
  Content:
    // cursor is here
`
    const context = buildCursorContext(source, 5, 10)

    expect(context.line).toBe(5)
    expect(context.insideComponent).toBe('Card')
  })

  test('identifies slot at cursor', () => {
    const source = `
Card: bg #333
  Title:
  Content:
    Text "Hello"
`
    const context = buildCursorContext(source, 5, 10)

    expect(context.insideComponent).toBe('Card')
    expect(context.insideSlot).toBe('Content')
  })

  test('includes surrounding code', () => {
    const source = `Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7`
    const context = buildCursorContext(source, 4, 1)

    expect(context.surroundingCode).toContain('Line 2')
    expect(context.surroundingCode).toContain('Line 4')
    expect(context.surroundingCode).toContain('Line 6')
  })

  test('includes selection', () => {
    const source = `Card: bg #333`
    const context = buildCursorContext(source, 1, 1, 'Card')

    expect(context.selection).toBe('Card')
  })

})

describe('buildContext()', () => {

  test('builds complete context', () => {
    const source = `
$primary.bg: #3B82F6

Card: bg $primary.bg, pad 16
  Title:
  Content:
`
    const context = buildContext(source, 5, 5)

    // Card, Title, Content all get detected as components
    const names = context.components.map(c => c.name)
    expect(names).toContain('Card')
    expect(context.tokens).toHaveLength(1)
    expect(context.cursor).toBeDefined()
    expect(context.cursor?.insideComponent).toBe('Card')
  })

  test('works without cursor', () => {
    const source = `
Card: bg #333
`
    const context = buildContext(source)

    expect(context.components).toHaveLength(1)
    expect(context.cursor).toBeUndefined()
  })

})

describe('formatContextForPrompt()', () => {

  test('formats components section', () => {
    const context = {
      components: [
        { name: 'Card', props: ['bg #333', 'pad 16'], slots: ['Title', 'Content'] }
      ],
      tokens: []
    }

    const prompt = formatContextForPrompt(context)

    expect(prompt).toContain('## Available Components')
    expect(prompt).toContain('Card:')
    expect(prompt).toContain('bg #333')
    expect(prompt).toContain('Title:')
  })

  test('formats tokens by category', () => {
    const context = {
      components: [],
      tokens: [
        { name: '$primary.bg', value: '#3B82F6', category: 'color' as const },
        { name: '$md.pad', value: '8', category: 'spacing' as const }
      ]
    }

    const prompt = formatContextForPrompt(context)

    expect(prompt).toContain('## Design Tokens')
    expect(prompt).toContain('### Color')
    expect(prompt).toContain('$primary.bg: #3B82F6')
    expect(prompt).toContain('### Spacing')
    expect(prompt).toContain('$md.pad: 8')
  })

  test('formats cursor context', () => {
    const context = {
      components: [],
      tokens: [],
      cursor: {
        line: 5,
        column: 10,
        insideComponent: 'Card',
        insideSlot: 'Content',
        surroundingCode: 'Text "Hello"'
      }
    }

    const prompt = formatContextForPrompt(context)

    expect(prompt).toContain('## Current Context')
    expect(prompt).toContain('Cursor is inside: Card')
    expect(prompt).toContain('Inside slot: Content')
    expect(prompt).toContain('Nearby code:')
  })

})

describe('buildSystemPrompt()', () => {

  test('returns base prompt without context', () => {
    const prompt = buildSystemPrompt()

    expect(prompt).toContain("M('Component', { props })")
    expect(prompt).not.toContain('## Available Components')
  })

  test('includes context when provided', () => {
    const context = {
      components: [
        { name: 'Card', props: ['bg #333'], slots: [] }
      ],
      tokens: [
        { name: '$primary.bg', value: '#3B82F6', category: 'color' as const }
      ]
    }

    const prompt = buildSystemPrompt(context)

    expect(prompt).toContain("M('Component', { props })")
    expect(prompt).toContain('# Project Context')
    expect(prompt).toContain('## Available Components')
    expect(prompt).toContain('Card:')
    expect(prompt).toContain('$primary.bg: #3B82F6')
  })

  test('reminds to reuse components', () => {
    const prompt = buildSystemPrompt()

    expect(prompt).toContain('Reuse existing components when available')
    expect(prompt).toContain('Use design tokens')
  })

})

describe('reindentCode()', () => {

  test('adds base indentation to unindented code', () => {
    const code = `M('Box', { bg: '#333' })`
    const result = reindentCode(code, '    ')

    expect(result).toBe(`    M('Box', { bg: '#333' })`)
  })

  test('preserves relative indentation in multi-line code', () => {
    const code = `M('Box', {}, [
  M('Text', 'Hello'),
  M('Text', 'World')
])`
    const result = reindentCode(code, '  ')

    expect(result).toContain(`  M('Box', {}, [`)
    expect(result).toContain(`    M('Text', 'Hello')`)
    expect(result).toContain(`    M('Text', 'World')`)
    expect(result).toContain(`  ])`)
  })

  test('handles already indented code', () => {
    const code = `    M('Box', {})
      M('Text', 'Inner')`
    const result = reindentCode(code, '  ')

    // Should strip minimum indent (4 spaces) and add base indent (2 spaces)
    expect(result.startsWith(`  M('Box', {})`)).toBe(true)
    expect(result).toContain(`    M('Text', 'Inner')`)
  })

  test('handles empty lines correctly', () => {
    const code = `M('Box', {})

M('Text', 'After gap')`
    const result = reindentCode(code, '  ')

    const lines = result.split('\n')
    expect(lines[0]).toBe(`  M('Box', {})`)
    expect(lines[1]).toBe('') // Empty line stays empty
    expect(lines[2]).toBe(`  M('Text', 'After gap')`)
  })

})

describe('integrateCode()', () => {

  test('inserts code at cursor line', () => {
    const source = `Card: bg #333
  Title:
  Content:
`
    const generatedCode = `M('Text', 'Generated')`
    const cursor = {
      line: 3,
      column: 1,
      insideComponent: 'Card',
      insideSlot: 'Content',
      indentLevel: 4,
      indentString: '    '
    }

    const result = integrateCode(source, generatedCode, cursor, 'insert')

    expect(result).toContain(`    M('Text', 'Generated')`)
    expect(result.indexOf('Title:')).toBeLessThan(result.indexOf('Generated'))
  })

  test('replaces selected text', () => {
    const source = `Card: bg #333
  Title: "Old Title"
  Content:`
    const generatedCode = `"New Title"`
    const cursor = {
      line: 2,
      column: 10,
      selection: '"Old Title"',
      indentLevel: 2,
      indentString: '  '
    }

    const result = integrateCode(source, generatedCode, cursor, 'replace')

    expect(result).toContain('Title:   "New Title"')
    expect(result).not.toContain('Old Title')
  })

  test('uses cursor indentation for inserted code', () => {
    const source = `Box: hor
  Left:
  Right:`
    const generatedCode = `M('Icon', 'home', { is: 20 })`
    const cursor = {
      line: 2,
      column: 1,
      insideComponent: 'Box',
      indentLevel: 4,
      indentString: '    '
    }

    const result = integrateCode(source, generatedCode, cursor, 'insert')

    // The generated code should be indented with 4 spaces
    expect(result).toContain(`    M('Icon', 'home', { is: 20 })`)
  })

})

describe('Real-world example', () => {

  test('extracts context from a realistic Mirror file', () => {
    const source = `
// Design Tokens
$grey-900: #18181B
$grey-800: #27272A
$grey-700: #3F3F46

$primary.bg: #3B82F6
$primary.hover.bg: #2563EB
$surface.bg: $grey-800
$card.bg: $grey-700

$sm.pad: 4
$md.pad: 8
$lg.pad: 16

$sm.rad: 4
$md.rad: 8

// Components
Card: bg $card.bg, pad $lg.pad, rad $md.rad, shadow md
  Title:
  Content:
  Footer:

Button: pad $md.pad $lg.pad, rad $sm.rad, cursor pointer
  state hover bg $primary.hover.bg

PrimaryButton as Button: bg $primary.bg, col white

IconButton as Button: center, w 32, h 32, rad 16

// Usage
Card
  Title "Welcome"
  Content
    Text "Get started"
  Footer
    PrimaryButton "Continue"
`
    const context = buildContext(source, 28, 5) // Cursor on PrimaryButton line

    // Check components
    expect(context.components.length).toBeGreaterThanOrEqual(3)
    expect(context.components.find(c => c.name === 'Card')).toBeDefined()
    expect(context.components.find(c => c.name === 'Button')).toBeDefined()
    expect(context.components.find(c => c.name === 'PrimaryButton')).toBeDefined()

    // Check tokens
    expect(context.tokens.length).toBeGreaterThanOrEqual(5)
    expect(context.tokens.find(t => t.name === '$primary.bg')).toBeDefined()
    expect(context.tokens.find(t => t.name === '$lg.pad')).toBeDefined()

    // Check cursor context
    expect(context.cursor).toBeDefined()

    // Generate prompt
    const prompt = buildSystemPrompt(context)
    expect(prompt).toContain('Card:')
    expect(prompt).toContain('$primary.bg')
    expect(prompt).toContain('# Project Context')
  })

})
