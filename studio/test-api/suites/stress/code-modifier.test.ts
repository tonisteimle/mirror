/**
 * Code Modifier Stress Tests
 *
 * Tests for the code modifier's ability to handle complex modifications.
 */

import type { TestSuite, TestAPI } from '../../types'
import { testWithSetup } from '../../test-runner'

// =============================================================================
// Multi-Property Modifications
// =============================================================================

export const multiPropertyTests: TestSuite = [
  testWithSetup(
    'CodeMod: Update multiple properties on same line',
    `Frame bg #333, pad 16, rad 8, gap 12`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // Update multiple properties rapidly
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '16')

      await api.utils.waitForCompile()
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 24'), 'Padding should be updated')
      api.assert.ok(code.includes('rad 12'), 'Radius should be updated')
      api.assert.ok(code.includes('gap 16'), 'Gap should be updated')
    }
  ),

  testWithSetup(
    'CodeMod: Add property to element with many properties',
    `Frame bg #333, pad 16, rad 8, gap 12, col white, bor 1, boc #555`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // Add a new property
      await api.panel.property.setProperty('shadow', 'md')

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      // Should still have all original properties
      api.assert.ok(code.includes('bg #333'), 'Should keep bg')
      api.assert.ok(code.includes('pad 16'), 'Should keep pad')
    }
  ),

  testWithSetup(
    'CodeMod: Remove property preserves others',
    `Frame bg #333, pad 16, rad 8, gap 12`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // Remove padding
      await api.panel.property.removeProperty('pad')

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(!code.includes('pad'), 'Padding should be removed')
      api.assert.ok(code.includes('bg #333'), 'Should keep bg')
      api.assert.ok(code.includes('rad 8'), 'Should keep rad')
      api.assert.ok(code.includes('gap 12'), 'Should keep gap')
    }
  ),
]

// =============================================================================
// Nested Structure Modifications
// =============================================================================

export const nestedModificationTests: TestSuite = [
  testWithSetup(
    'CodeMod: Modify deeply nested element',
    `Frame bg #111
  Frame bg #222
    Frame bg #333
      Frame bg #444
        Button "Deep", pad 8`,
    async (api: TestAPI) => {
      // Select the deep button
      await api.studio.setSelection('node-5')
      await api.utils.delay(100)

      // Modify it
      await api.panel.property.setProperty('pad', '16')

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 16'), 'Deep element should be modified')
    }
  ),

  testWithSetup(
    'CodeMod: Add child to nested parent',
    `Frame bg #111
  Frame bg #222, gap 8
    Text "Existing"`,
    async (api: TestAPI) => {
      const originalCode = api.editor.getCode()

      // Add child via code
      await api.editor.setCode(`Frame bg #111
  Frame bg #222, gap 8
    Text "Existing"
    Button "New"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      api.assert.exists('node-4')
      api.assert.hasText('node-4', 'New')
    }
  ),

  testWithSetup(
    'CodeMod: Move element between parents',
    `Frame hor, gap 16
  Frame bg #333, pad 16
    Button "Move Me"
  Frame bg #444, pad 16
    Text "Target"`,
    async (api: TestAPI) => {
      // Move button to second frame via code modification
      await api.editor.setCode(`Frame hor, gap 16
  Frame bg #333, pad 16
  Frame bg #444, pad 16
    Text "Target"
    Button "Move Me"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Button should now be child of second frame
      const code = api.editor.getCode()
      const targetPos = code.indexOf('Target')
      const buttonPos = code.indexOf('Move Me')
      api.assert.ok(buttonPos > targetPos, 'Button should be after Target')
    }
  ),
]

// =============================================================================
// State Block Modifications
// =============================================================================

export const stateModificationTests: TestSuite = [
  testWithSetup(
    'CodeMod: Add state to element',
    `Button "Click", bg #333, pad 12`,
    async (api: TestAPI) => {
      // Add hover state via code
      await api.editor.setCode(`Button "Click", bg #333, pad 12
  hover:
    bg #444`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Hover should work
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(68, 68, 68)')
    }
  ),

  testWithSetup(
    'CodeMod: Modify property inside state block',
    `Button "Click", bg #333
  hover:
    bg #444`,
    async (api: TestAPI) => {
      // Change hover color via code
      await api.editor.setCode(`Button "Click", bg #333
  hover:
    bg #555`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      await api.interact.hover('node-1')
      await api.utils.delay(100)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(85, 85, 85)')
    }
  ),

  testWithSetup('CodeMod: Add multiple states', `Button "Click", bg #333`, async (api: TestAPI) => {
    await api.editor.setCode(`Button "Click", bg #333, toggle()
  hover:
    bg #444
  on:
    bg #2271C1`)

    await api.utils.waitForCompile()
    await api.utils.delay(200)

    // Test hover
    await api.interact.hover('node-1')
    await api.utils.delay(100)
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(68, 68, 68)')

    // Test toggle
    await api.interact.unhover('node-1')
    await api.interact.click('node-1')
    await api.utils.delay(100)
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
  }),
]

// =============================================================================
// Token and Variable Modifications
// =============================================================================

export const tokenModificationTests: TestSuite = [
  testWithSetup(
    'CodeMod: Update token value',
    `primary.bg: #2271C1

Button "Click", bg $primary`,
    async (api: TestAPI) => {
      // Change token value
      await api.editor.setCode(`primary.bg: #ef4444

Button "Click", bg $primary`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Button should use new color
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
    }
  ),

  testWithSetup(
    'CodeMod: Add new token and use it',
    `Button "Click", bg #333`,
    async (api: TestAPI) => {
      await api.editor.setCode(`danger.bg: #ef4444

Button "Click", bg $danger`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
    }
  ),

  testWithSetup(
    'CodeMod: Update variable value',
    `count: 5

Text "Count: $count"`,
    async (api: TestAPI) => {
      await api.editor.setCode(`count: 10

Text "Count: $count"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      api.assert.hasText('node-1', 'Count: 10')
    }
  ),
]

// =============================================================================
// Edge Cases in Code Structure
// =============================================================================

export const codeStructureTests: TestSuite = [
  testWithSetup(
    'CodeMod: Handle inline elements (semicolon)',
    `Frame hor, gap 8; Button "A"; Button "B"; Button "C"`,
    async (api: TestAPI) => {
      // Modify inline element
      await api.editor.setCode(`Frame hor, gap 8; Button "A"; Button "B-changed"; Button "C"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      api.assert.hasText('node-3', 'B-changed')
    }
  ),

  testWithSetup(
    'CodeMod: Handle mixed indent styles',
    `Frame bg #333
  Text "Two spaces"
    Text "Four spaces"`,
    async (api: TestAPI) => {
      // Should still parse and allow modifications
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'CodeMod: Handle empty lines in code',
    `Frame bg #333

  Text "After empty"


  Button "After two empty"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
    }
  ),

  testWithSetup(
    'CodeMod: Handle comments in code',
    `// This is a comment
Frame bg #333
  // Another comment
  Text "Content"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasText('node-2', 'Content')
    }
  ),
]

// =============================================================================
// Component Modifications
// =============================================================================

export const componentModificationTests: TestSuite = [
  testWithSetup(
    'CodeMod: Modify component definition',
    `Card: Frame bg #333, pad 16, rad 8

Card
Card
Card`,
    async (api: TestAPI) => {
      // Change component definition
      await api.editor.setCode(`Card: Frame bg #444, pad 24, rad 12

Card
Card
Card`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // All instances should update
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(68, 68, 68)')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(68, 68, 68)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(68, 68, 68)')
    }
  ),

  testWithSetup(
    'CodeMod: Add slot to component',
    `Card: Frame bg #333, pad 16
  Title: Text col white, fs 18

Card
  Title "Hello"`,
    async (api: TestAPI) => {
      // Add another slot
      await api.editor.setCode(`Card: Frame bg #333, pad 16, gap 8
  Title: Text col white, fs 18
  Subtitle: Text col #888, fs 14

Card
  Title "Hello"
  Subtitle "World"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      api.assert.hasText('node-2', 'Hello')
      api.assert.hasText('node-3', 'World')
    }
  ),

  testWithSetup(
    'CodeMod: Override component property in instance',
    `Btn: Button bg #333, pad 12, rad 6

Btn "Default"
Btn "Custom", bg #2271C1`,
    async (api: TestAPI) => {
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),
]

// =============================================================================
// Export All
// =============================================================================

export const codeModifierTests: TestSuite = [
  ...multiPropertyTests,
  ...nestedModificationTests,
  ...stateModificationTests,
  ...tokenModificationTests,
  ...codeStructureTests,
  ...componentModificationTests,
]

export default codeModifierTests
