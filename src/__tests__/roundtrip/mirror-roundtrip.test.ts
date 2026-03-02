/**
 * Mirror Roundtrip Tests
 *
 * Tests that Mirror code can be:
 * 1. Parsed to AST
 * 2. Generated to React
 * 3. (Future: React back to Mirror)
 *
 * These tests verify the complete pipeline works correctly.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { exportReact } from '../../generator/export'
import { propertiesToStyle } from '../../utils/style-converter'

// =============================================================================
// Test Helpers
// =============================================================================

interface RoundtripResult {
  ast: ReturnType<typeof parse>
  react: { tsx: string; css: string }
  style: React.CSSProperties
}

/** Full pipeline: Mirror → AST → React + CSS */
function roundtrip(mirror: string): RoundtripResult {
  const ast = parse(mirror)
  const react = exportReact(mirror)
  const node = ast.nodes[0]
  const style = node
    ? propertiesToStyle(node.properties, node.children.length > 0, node.name)
    : {}

  return { ast, react, style }
}

/** Assert no parse errors */
function expectNoErrors(result: RoundtripResult): void {
  expect(result.ast.errors).toHaveLength(0)
}

/** Assert CSS contains property */
function expectCss(result: RoundtripResult, css: string): void {
  expect(result.react.css).toContain(css)
}

/** Assert JSX contains content */
function expectJsx(result: RoundtripResult, jsx: string): void {
  expect(result.react.tsx).toContain(jsx)
}

// =============================================================================
// Basic Roundtrip Tests
// =============================================================================

describe('Basic Roundtrip', () => {
  it('simple box with padding', () => {
    const result = roundtrip('Box pad 16')
    expectNoErrors(result)
    expectCss(result, 'padding: 16px')
  })

  it('box with dimensions', () => {
    const result = roundtrip('Box 300 200')
    expectNoErrors(result)
    expectCss(result, 'width: 300px')
    expectCss(result, 'height: 200px')
  })

  it('text content', () => {
    const result = roundtrip('Box "Hello World"')
    expectNoErrors(result)
    expectJsx(result, 'Hello World')
  })

  it('nested structure', () => {
    const result = roundtrip(`
Card pad 16
  Title "Welcome"
  Button "Click"
`)
    expectNoErrors(result)
    expect(result.ast.nodes[0].children.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Sizing Keywords Roundtrip
// =============================================================================

describe('Sizing Roundtrip', () => {
  it('full hug → width 100%, height fit-content', () => {
    const result = roundtrip('Box full hug')
    expectNoErrors(result)
    expect(result.style.width).toBe('100%')
    expect(result.style.height).toBe('fit-content')
  })

  it('hug full → width fit-content, height 100%', () => {
    const result = roundtrip('Box hug full')
    expectNoErrors(result)
    expect(result.style.width).toBe('fit-content')
    expect(result.style.height).toBe('100%')
  })

  it('w full h hug', () => {
    const result = roundtrip('Box w full h hug')
    expectNoErrors(result)
    expect(result.style.width).toBe('100%')
    expect(result.style.height).toBe('fit-content')
  })
})

// =============================================================================
// Context-Dependent Size Roundtrip
// =============================================================================

describe('Context-Dependent Size Roundtrip', () => {
  it('Icon size generates font-size in CSS', () => {
    const result = roundtrip('Icon size 24 "search"')
    expectNoErrors(result)
    // Icon size should become icon-size property
    expect(result.ast.nodes[0].properties['icon-size']).toBe(24)
  })

  it('Text size generates font-size in CSS', () => {
    const result = roundtrip('Text size 16 "Hello"')
    expectNoErrors(result)
    expect(result.ast.nodes[0].properties['text-size']).toBe(16)
  })

  it('Box size generates width/height in CSS', () => {
    const result = roundtrip('Box size 100 200')
    expectNoErrors(result)
    expect(result.style.width).toBe('100px')
    expect(result.style.height).toBe('200px')
  })
})

// =============================================================================
// Layout Aliases Roundtrip
// =============================================================================

describe('Layout Aliases Roundtrip', () => {
  it('vert generates column layout', () => {
    const result = roundtrip('Box vert')
    expectNoErrors(result)
    expect(result.style.flexDirection).toBe('column')
  })

  it('ver generates column layout', () => {
    const result = roundtrip('Box ver')
    expectNoErrors(result)
    expect(result.style.flexDirection).toBe('column')
  })

  it('vertical generates column layout', () => {
    const result = roundtrip('Box vertical')
    expectNoErrors(result)
    expect(result.style.flexDirection).toBe('column')
  })
})

// =============================================================================
// Component Definitions Roundtrip
// =============================================================================

describe('Component Definitions Roundtrip', () => {
  it('definition + instance', () => {
    const result = roundtrip(`
Button: pad 12 bg #3B82F6
Button "Click me"
`)
    expectNoErrors(result)
    // First node is Button instance (definition doesn't render)
    expect(result.ast.nodes[0].name).toBe('Button')
  })

  it('inheritance', () => {
    const result = roundtrip(`
Button: pad 12 bg #3B82F6
DangerButton as Button: bg #EF4444
DangerButton "Delete"
`)
    expectNoErrors(result)
    // DangerButton should inherit pad from Button
    const props = result.ast.nodes[0].properties
    expect(props.pad).toBe(12)
    expect(props.bg).toBe('#EF4444')
  })

  it('Navigation-style definition', () => {
    const result = roundtrip(`
Navigation: w 300 vert pad 16
Navigation-Group: full hug pad top 16 bottom 8
    Title as Text "Group"
Navigation
`)
    expectNoErrors(result)
  })
})

// =============================================================================
// Real-World Examples Roundtrip
// =============================================================================

describe('Real-World Examples', () => {
  it('card component', () => {
    const result = roundtrip(`
Card: pad 16 bg #1E1E2E rad 8
  Title: size 18 weight bold
  Description: size 14 col #888

Card
  Title "Welcome"
  Description "Get started with Mirror"
`)
    expectNoErrors(result)
  })

  it('button group', () => {
    const result = roundtrip(`
ButtonGroup: hor gap 8

ButtonGroup
  Button "Save"
  Button "Cancel"
`)
    expectNoErrors(result)
  })

  it('form layout', () => {
    const result = roundtrip(`
Form: vert gap 16 w 400
  Label: size 14 col #666
  Input: pad 12 bg #333 rad 4

Form
  Label "Email"
  Input "you@example.com"
  Label "Password"
  Input type password
`)
    expectNoErrors(result)
  })
})
