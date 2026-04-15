/**
 * Compiler Test Suite
 *
 * Tests that Mirror DSL code compiles correctly to DOM.
 * These tests verify that the compiler produces the expected
 * HTML structure and CSS styles.
 *
 * Run in browser console:
 *   const tests = await import('./suites/compiler-tests.js')
 *   __mirrorTest.run(tests.primitiveTests, 'Primitives')
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Primitive Tests
// =============================================================================

export const primitiveTests: TestCase[] = describe('Primitives', [
  testWithSetup(
    'Frame renders as div with flex',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info?.tagName === 'div', 'Frame should be a div')
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
    }
  ),

  testWithSetup('Text renders with content', 'Text "Hello World"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasText('node-1', 'Hello World')
  }),

  testWithSetup('Button renders as button element', 'Button "Click Me"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'button', 'Button should be a button element')
    api.assert.hasText('node-1', 'Click Me')
  }),

  testWithSetup('Icon renders with lucide class', 'Icon "check"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // Icons are rendered as spans with SVG inside
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Icon element should exist')
  }),

  testWithSetup(
    'Input renders as input element',
    'Input placeholder "Enter text"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info?.tagName === 'input', 'Input should be an input element')
      api.assert.hasAttribute('node-1', 'placeholder', 'Enter text')
    }
  ),

  testWithSetup('Divider renders as hr', 'Divider', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'hr', 'Divider should be an hr element')
  }),
])

// =============================================================================
// Layout Tests
// =============================================================================

export const layoutTests: TestCase[] = describe('Layout', [
  testWithSetup(
    'hor creates horizontal flex',
    'Frame hor, gap 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasChildren('node-1', 2)
    }
  ),

  testWithSetup(
    'center aligns items center',
    'Frame center, w 200, h 100\n  Text "Centered"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')
    }
  ),

  testWithSetup(
    'spread distributes items',
    'Frame hor, spread\n  Text "Left"\n  Text "Right"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'space-between')
    }
  ),

  testWithSetup(
    'gap applies spacing',
    'Frame gap 24\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '24px')
    }
  ),

  testWithSetup(
    'nested frames maintain structure',
    'Frame gap 16\n  Frame gap 8\n    Text "Inner"\n  Text "Outer"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.hasChildren('node-1', 2)
      api.assert.hasChildren('node-2', 1)
    }
  ),
])

// =============================================================================
// Styling Tests
// =============================================================================

export const stylingTests: TestCase[] = describe('Styling', [
  testWithSetup('bg applies background color', 'Frame bg #2271C1', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // Colors are normalized to rgb() format
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
  }),

  testWithSetup('col applies text color', 'Text "Hello", col #ef4444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'color', 'rgb(239, 68, 68)')
  }),

  testWithSetup('pad applies padding', 'Frame pad 20', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'padding', '20px')
  }),

  testWithSetup('rad applies border-radius', 'Frame rad 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderRadius', '8px')
  }),

  testWithSetup('fs applies font-size', 'Text "Big", fs 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontSize', '24px')
  }),

  testWithSetup('weight applies font-weight', 'Text "Bold", weight bold', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '700')
  }),

  testWithSetup('w and h apply dimensions', 'Frame w 200, h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'width', '200px')
    api.assert.hasStyle('node-1', 'height', '100px')
  }),

  testWithSetup('opacity applies', 'Frame opacity 0.5', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'opacity', '0.5')
  }),
])

// =============================================================================
// Nesting & Hierarchy Tests
// =============================================================================

export const nestingTests: TestCase[] = describe('Nesting', [
  testWithSetup(
    '2-level nesting',
    'Frame gap 16\n  Frame gap 8\n    Text "Deep"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const root = api.preview.inspect('node-1')
      const middle = api.preview.inspect('node-2')
      const leaf = api.preview.inspect('node-3')

      api.assert.ok(root?.children.includes('node-2'), 'node-2 should be child of node-1')
      api.assert.ok(middle?.children.includes('node-3'), 'node-3 should be child of node-2')
      api.assert.ok(leaf?.children.length === 0, 'node-3 should have no children')
    }
  ),

  testWithSetup(
    '3-level nesting',
    'Frame\n  Frame\n    Frame\n      Text "Deepest"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
      api.assert.hasText('node-4', 'Deepest')
    }
  ),

  testWithSetup(
    'siblings at same level',
    'Frame gap 8\n  Text "First"\n  Text "Second"\n  Text "Third"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)
      api.assert.hasText('node-2', 'First')
      api.assert.hasText('node-3', 'Second')
      api.assert.hasText('node-4', 'Third')
    }
  ),
])

// =============================================================================
// Run All Compiler Tests
// =============================================================================

export const allCompilerTests: TestCase[] = [
  ...primitiveTests,
  ...layoutTests,
  ...stylingTests,
  ...nestingTests,
]

/**
 * Run all compiler tests
 * Usage: await runCompilerTests()
 */
export async function runCompilerTests() {
  const api = (window as any).__mirrorTest
  if (!api) {
    console.error('Mirror Test API not available')
    return
  }
  return api.run(allCompilerTests, 'Compiler Tests')
}
