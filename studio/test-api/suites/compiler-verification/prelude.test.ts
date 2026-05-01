/**
 * Prelude Builder Tests
 *
 * Tests that verify the prelude system correctly prepends tokens/components
 * WITHOUT automatically wrapping user code in an App component.
 *
 * Background: Previously, user code was automatically wrapped in `App\n  ...`
 * which caused unexpected padding from the App component definition.
 * This behavior was removed - code now stays as-written.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Helper to inspect with null check
function inspectStrict(api: TestAPI, nodeId: string, name: string) {
  const info = api.preview.inspect(nodeId)
  api.assert.ok(info !== null, `${name} inspect should return info`)
  return info!
}

/**
 * No Automatic App Wrapper Tests
 *
 * Verify that user code is NOT wrapped in an implicit App component.
 */
export const noAutoWrapperTests: TestCase[] = describe('No Auto Wrapper', [
  testWithSetup(
    'Frame without padding has no padding',
    'Frame w full, h full\n  Text "Content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Frame should NOT have padding from an implicit App wrapper
      api.assert.hasStyle('node-1', 'padding', '0px')
    }
  ),

  testWithSetup(
    'Frame is root element (not wrapped in App)',
    'Frame bg #1a1a1a\n  Text "Hello"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // The first node should be our Frame, not an App wrapper
      const info = inspectStrict(api, 'node-1', 'Frame')
      api.assert.ok(
        info.tagName === 'div',
        `First element should be a div (Frame), got: ${info.tagName}`
      )
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  testWithSetup(
    'Code starts with Text - no App wrapper',
    'Text "Direct Text"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasText('node-1', 'Direct Text')
      // Text should be the root element, not wrapped in App
      const info = inspectStrict(api, 'node-1', 'Text')
      api.assert.ok(info.tagName === 'span', `Text should be span, got: ${info.tagName}`)
    }
  ),

  testWithSetup(
    'Multiple root elements - no App wrapper',
    'Text "First"\nText "Second"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.hasText('node-1', 'First')
      api.assert.hasText('node-2', 'Second')
    }
  ),

  testWithSetup('Button as root - no App wrapper', 'Button "Click Me"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Button')
    api.assert.ok(
      info.tagName === 'button',
      `Button should be button element, got: ${info.tagName}`
    )
    api.assert.hasText('node-1', 'Click Me')
  }),
])

/**
 * Explicit App Usage Tests
 *
 * When the user explicitly uses App, it should work normally.
 */
export const explicitAppTests: TestCase[] = describe('Explicit App', [
  testWithSetup(
    'Explicit App with padding works',
    'App pad 20\n  Text "In App"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'padding', '20px')
    }
  ),

  testWithSetup(
    'Explicit App without padding has no padding',
    'App\n  Text "In App"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // App without explicit padding should have no padding
      api.assert.hasStyle('node-1', 'padding', '0px')
    }
  ),
])

/**
 * User Code Integrity Tests
 *
 * Verify that user's explicit styling is preserved exactly.
 */
export const codeIntegrityTests: TestCase[] = describe('Code Integrity', [
  testWithSetup(
    'Explicit pad 0 is respected',
    'Frame pad 0, bg #333\n  Text "No Padding"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'padding', '0px')
    }
  ),

  testWithSetup(
    'Explicit padding is applied correctly',
    'Frame pad 24\n  Text "Has Padding"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'padding', '24px')
    }
  ),

  testWithSetup(
    'No implicit gap from App wrapper',
    'Frame gap 0\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '0px')
    }
  ),

  testWithSetup(
    'No implicit background from App wrapper',
    'Frame\n  Text "Plain"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Frame without bg should have transparent background
      const info = api.preview.inspect('node-1')
      const bg = info?.styles?.backgroundColor || ''
      // Should be transparent (rgba(0, 0, 0, 0)) or empty
      api.assert.ok(
        bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === '',
        `Expected transparent background, got: ${bg}`
      )
    }
  ),
])

/**
 * Nested Structure Tests
 *
 * Verify nested structures are preserved without additional wrapping.
 */
export const nestedStructureTests: TestCase[] = describe('Nested Structure', [
  testWithSetup(
    'Nested frames maintain exact structure',
    'Frame gap 16\n  Frame gap 8, pad 12\n    Text "Inner"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      // Outer frame
      api.assert.hasStyle('node-1', 'gap', '16px')
      api.assert.hasStyle('node-1', 'padding', '0px')
      // Inner frame
      api.assert.hasStyle('node-2', 'gap', '8px')
      api.assert.hasStyle('node-2', 'padding', '12px')
      // Structure: node-1 > node-2 > node-3
      const outer = inspectStrict(api, 'node-1', 'Outer frame')
      api.assert.ok(outer.children.includes('node-2'), 'node-2 should be child of node-1')
    }
  ),

  testWithSetup(
    'Complex layout without App wrapper',
    'Frame hor, gap 8\n  Frame ver, gap 4, pad 16\n    Text "Left"\n  Frame ver, gap 4, pad 16\n    Text "Right"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'padding', '0px') // No implicit App padding
      api.assert.hasChildren('node-1', 2)
    }
  ),
])

// =============================================================================
// Combined Exports
// =============================================================================

export const allPreludeTests: TestCase[] = [
  ...noAutoWrapperTests,
  ...explicitAppTests,
  ...codeIntegrityTests,
  ...nestedStructureTests,
]

/**
 * Run all prelude tests
 */
export async function runPreludeTests() {
  const api = (window as any).__mirrorTest
  if (!api) {
    console.error('Mirror Test API not available')
    return
  }
  return api.run(allPreludeTests, 'Prelude Builder Tests')
}
