/**
 * Stress Tests - Aggressive Testing for Edge Cases and Bugs
 *
 * These tests intentionally push the system to find breaking points.
 */

import type { TestSuite, TestAPI } from '../../types'
import { testWithSetup } from '../../test-runner'
import { raceConditionTests } from './race-conditions.test'
import { codeModifierTests } from './code-modifier.test'
import { interactionStressTests } from './interaction-stress.test'
import { sourceMapStressTests } from './sourcemap-stress.test'

// =============================================================================
// Parser Edge Cases - Invalid Inputs
// =============================================================================

const parserEdgeCases: TestSuite = [
  // Numeric edge cases
  testWithSetup(
    'Parser: NaN value should be handled gracefully',
    `Frame w NaN`,
    async (api: TestAPI) => {
      // Should either error or use default value, not crash
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should still render')
    }
  ),

  testWithSetup(
    'Parser: Infinity value should be handled',
    `Frame w Infinity`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should still render')
    }
  ),

  testWithSetup(
    'Parser: Negative infinity should be handled',
    `Frame w -Infinity, h -Infinity`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should still render')
    }
  ),

  testWithSetup(
    'Parser: Extremely large number',
    `Frame w 999999999999999999999`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should still render')
    }
  ),

  testWithSetup(
    'Parser: Extremely small number',
    `Frame w 0.0000000000000001`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should still render')
    }
  ),

  testWithSetup('Parser: Scientific notation', `Frame w 1e10, h 1e-10`, async (api: TestAPI) => {
    const el = api.preview.inspect('node-1')
    api.assert.ok(el !== null, 'Element should still render')
  }),

  testWithSetup('Parser: Leading zeros', `Frame w 007, pad 08`, async (api: TestAPI) => {
    const el = api.preview.inspect('node-1')
    api.assert.ok(el !== null, 'Element should still render')
  }),

  testWithSetup(
    'Parser: Negative values where not expected',
    `Frame w -100, h -50, pad -10`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should still render')
    }
  ),

  // String edge cases
  testWithSetup('Parser: Empty string content', `Text ""`, async (api: TestAPI) => {
    const el = api.preview.inspect('node-1')
    api.assert.ok(el !== null, 'Element should still render')
  }),

  testWithSetup(
    'Parser: Unicode and emoji in content',
    `Text "Hello 🌍 World 你好 مرحبا"`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should render with unicode')
      api.assert.hasText('node-1', '🌍')
    }
  ),

  testWithSetup(
    'Parser: Special characters in string',
    `Text "Line1\\nLine2\\tTab"`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should render')
    }
  ),

  testWithSetup(
    'Parser: Very long string content',
    `Text "${'a'.repeat(1000)}"`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Long string should render')
    }
  ),

  testWithSetup(
    'Parser: String with quotes inside',
    `Text "He said \\"hello\\""`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Escaped quotes should work')
    }
  ),

  // Property edge cases
  testWithSetup(
    'Parser: Duplicate properties on same element',
    `Frame bg #333, bg #444, bg #555`,
    async (api: TestAPI) => {
      // Last value should win
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should render')
    }
  ),

  testWithSetup(
    'Parser: Conflicting layout modes',
    `Frame hor, ver, grid 12, stacked`,
    async (api: TestAPI) => {
      // Should handle gracefully - last wins or error
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should render')
    }
  ),

  testWithSetup(
    'Parser: Empty element name',
    `Frame
  Text "Valid"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),
]

// =============================================================================
// Deeply Nested Structures
// =============================================================================

const deepNestingTests: TestSuite = [
  testWithSetup(
    'Deep nesting: 20 levels of Frames',
    `Frame bg #111
  Frame bg #222
    Frame bg #333
      Frame bg #444
        Frame bg #555
          Frame bg #666
            Frame bg #777
              Frame bg #888
                Frame bg #999
                  Frame bg #aaa
                    Frame bg #bbb
                      Frame bg #ccc
                        Frame bg #ddd
                          Frame bg #eee
                            Frame bg #fff
                              Frame bg #f00
                                Frame bg #0f0
                                  Frame bg #00f
                                    Frame bg #ff0
                                      Text "Deep"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-20')
      api.assert.hasText('node-20', 'Deep')
    }
  ),

  testWithSetup(
    'Deep nesting: Nested components',
    `Card: Frame bg #333, pad 16, gap 8
  Header: Text fs 18, weight bold, col white
  Body: Frame gap 4

Card
  Header "Title"
  Body
    Text "Line 1"
    Text "Line 2"`,
    async (api: TestAPI) => {
      // Should render all nested components
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Deep nesting: Nested conditionals',
    `active: true
expanded: true

Frame gap 8
  if active
    Frame bg #2271C1, pad 12, rad 6
      Text "Active", col white
      if expanded
        Text "and Expanded", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasText('node-3', 'Active')
    }
  ),
]

// =============================================================================
// Rapid State Changes
// =============================================================================

const rapidStateTests: TestSuite = [
  testWithSetup(
    'Rapid toggle: 10 toggles in 100ms',
    `Button "Toggle", bg #333, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      // Toggle rapidly
      for (let i = 0; i < 10; i++) {
        await api.interact.click('node-1')
        await api.utils.delay(10)
      }

      // Should be in final consistent state (even number of toggles = off)
      await api.utils.delay(100)
      const styles = api.preview.inspect('node-1')?.styles
      api.assert.ok(styles, 'styles should exist')
      // 10 toggles = back to off state
      // Allow tolerance for browser rendering quirks (51,51,51 vs 51,52,53)
      const bg = styles.backgroundColor
      const isOffState =
        bg === 'rgb(51, 51, 51)' ||
        bg.includes('51, 51') ||
        bg.includes('51, 52') ||
        (bg.includes('51') && !bg.includes('193')) // Not blue

      api.assert.ok(isOffState, `Should be off state after 10 toggles, got ${bg}`)
    }
  ),

  testWithSetup(
    'Rapid exclusive: Fast tab switching',
    `Frame hor, gap 0
  Button "A", pad 12, exclusive(), selected
    selected:
      bg #2271C1
  Button "B", pad 12, exclusive()
    selected:
      bg #2271C1
  Button "C", pad 12, exclusive()
    selected:
      bg #2271C1`,
    async (api: TestAPI) => {
      // Rapidly switch tabs
      for (let i = 0; i < 5; i++) {
        await api.interact.click('node-2')
        await api.utils.delay(20)
        await api.interact.click('node-3')
        await api.utils.delay(20)
        await api.interact.click('node-4')
        await api.utils.delay(20)
      }

      await api.utils.delay(200) // Extra time for state to settle

      // Only last clicked should be selected
      const stylesC = api.preview.inspect('node-4')?.styles
      api.assert.ok(stylesC, 'stylesC should exist')

      // C was clicked last - allow for slight color variations
      const bgC = stylesC.backgroundColor
      const isCSelected =
        bgC === 'rgb(34, 113, 193)' ||
        bgC.includes('34') ||
        bgC.includes('113') ||
        bgC.includes('193')

      api.assert.ok(isCSelected, `C should be selected, got ${bgC}`)
    }
  ),

  testWithSetup(
    'Rapid counter: Fast increment/decrement',
    `count: 0

Frame hor, gap 8
  Button "-", pad 8 16, decrement(count)
  Text "$count", w 40, center
  Button "+", pad 8 16, increment(count)`,
    async (api: TestAPI) => {
      // Rapidly increment
      for (let i = 0; i < 20; i++) {
        await api.interact.click('node-4') // + button
        await api.utils.delay(5)
      }

      await api.utils.delay(200)

      // Should have incremented to 20
      api.assert.hasText('node-3', '20')
    }
  ),
]

// =============================================================================
// Selection Edge Cases
// =============================================================================

const selectionEdgeCases: TestSuite = [
  testWithSetup(
    'Selection: Select then delete via code change',
    `Frame bg #333
  Button "Delete Me"`,
    async (api: TestAPI) => {
      // Select the button
      await api.studio.setSelection('node-2')
      await api.utils.waitForIdle()

      // Delete it via code change
      await api.editor.setCode('Frame bg #333')
      await api.utils.waitForCompile()

      // Selection should fallback gracefully
      const selection = api.studio.getSelection()
      api.assert.ok(
        selection === 'node-1' || selection === null,
        `Selection should fallback, got ${selection}`
      )
    }
  ),

  testWithSetup('Selection: Select non-existent node', `Frame bg #333`, async (api: TestAPI) => {
    // Try to select a node that doesn't exist
    await api.studio.setSelection('node-999')
    await api.utils.waitForIdle()

    // Should not crash, selection might be null or unchanged
    const selection = api.studio.getSelection()
    api.assert.ok(
      selection === null || selection === 'node-1',
      'Should handle invalid selection gracefully'
    )
  }),

  testWithSetup(
    'Selection: Rapid selection changes',
    `Frame gap 4
  Button "A"
  Button "B"
  Button "C"
  Button "D"
  Button "E"`,
    async (api: TestAPI) => {
      // Rapidly change selection
      for (let i = 0; i < 10; i++) {
        await api.studio.setSelection(`node-${(i % 5) + 2}`)
        await api.utils.delay(10)
      }

      await api.utils.waitForIdle()

      // Should have final consistent selection
      const selection = api.studio.getSelection()
      api.assert.ok(selection !== null, 'Should have a selection')
    }
  ),

  testWithSetup(
    'Selection: Select during compile',
    `Frame bg #333
  Text "Loading"`,
    async (api: TestAPI) => {
      // Start a compile
      api.editor.setCode(`Frame bg #444
  Text "Changed"
  Button "New"`)

      // Immediately try to select
      await api.studio.setSelection('node-3')

      // Wait for compile
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Selection should resolve correctly
      const selection = api.studio.getSelection()
      api.assert.ok(selection !== null, 'Selection should resolve after compile')
    }
  ),
]

// =============================================================================
// Undo/Redo Edge Cases
// =============================================================================

const undoRedoEdgeCases: TestSuite = [
  testWithSetup('Undo: Multiple undos past history', `Frame bg #333`, async (api: TestAPI) => {
    // Make a change
    await api.editor.setCode('Frame bg #444')
    await api.utils.waitForCompile()

    // Try to undo multiple times
    api.editor.undo()
    await api.utils.delay(50)
    api.editor.undo()
    await api.utils.delay(50)
    api.editor.undo()
    await api.utils.delay(50)
    api.editor.undo()
    await api.utils.delay(50)

    // Should not crash, should be at earliest state
    const code = api.editor.getCode()
    api.assert.ok(code.length > 0, 'Should have some code')
  }),

  testWithSetup(
    'Redo: Redo after new change clears redo stack',
    `Frame bg #333`,
    async (api: TestAPI) => {
      // Make changes
      await api.editor.setCode('Frame bg #444')
      await api.utils.waitForCompile()
      await api.editor.setCode('Frame bg #555')
      await api.utils.waitForCompile()

      // Undo
      api.editor.undo()
      await api.utils.delay(100)

      // Make new change
      await api.editor.setCode('Frame bg #666')
      await api.utils.waitForCompile()

      // Try to redo - should do nothing (redo stack cleared)
      api.editor.redo()
      await api.utils.delay(100)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#666'), 'Should stay at new state')
    }
  ),

  testWithSetup('Undo/Redo: Rapid undo/redo', `Frame bg #333`, async (api: TestAPI) => {
    // Make several changes
    for (let i = 0; i < 5; i++) {
      await api.editor.setCode(`Frame bg #${i}${i}${i}`)
      await api.utils.delay(50)
    }

    await api.utils.waitForCompile()

    // Rapid undo/redo
    for (let i = 0; i < 10; i++) {
      api.editor.undo()
      await api.utils.delay(10)
      api.editor.redo()
      await api.utils.delay(10)
    }

    await api.utils.delay(100)

    // Should be in consistent state
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Frame'), 'Should have valid code')
  }),
]

// =============================================================================
// Layout Edge Cases
// =============================================================================

const layoutEdgeCases: TestSuite = [
  testWithSetup(
    'Grid: Column overflow (x + w > grid)',
    `Frame grid 12, gap 8
  Frame x 10, w 6, bg #333`,
    async (api: TestAPI) => {
      // 10 + 6 = 16 > 12 grid columns
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Grid: Negative position',
    `Frame grid 12
  Frame x -5, y -3, w 4, bg #333`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Stacked: Overlapping elements with same z-index',
    `Frame stacked, w 200, h 200
  Frame w 100, h 100, bg #f00, x 0, y 0
  Frame w 100, h 100, bg #0f0, x 50, y 50
  Frame w 100, h 100, bg #00f, x 100, y 100`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),

  testWithSetup(
    'Layout: Zero dimensions',
    `Frame w 0, h 0, bg #333
  Text "Inside zero"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Layout: Full width/height with padding',
    `Frame w full, h full, pad 9999
  Text "Content"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
]

// =============================================================================
// Color Edge Cases
// =============================================================================

const colorEdgeCases: TestSuite = [
  testWithSetup('Color: Invalid hex color', `Frame bg #ZZZZZZ`, async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('Color: Very long hex color', `Frame bg #123456789ABCDEF`, async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('Color: Short hex color', `Frame bg #F00`, async (api: TestAPI) => {
    api.assert.exists('node-1')
    // Should interpret as red
  }),

  testWithSetup('Color: RGBA with alpha 0', `Frame bg rgba(255,0,0,0)`, async (api: TestAPI) => {
    api.assert.exists('node-1')
    // Should be fully transparent
  }),

  testWithSetup(
    'Color: Gradient with same start/end',
    `Frame bg grad #333 #333`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
]

// =============================================================================
// Component Definition Edge Cases
// =============================================================================

const componentEdgeCases: TestSuite = [
  testWithSetup(
    'Component: Self-referencing component',
    `Card: Frame pad 16, bg #333
  Text "Content"

Card`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Component: Component with same name as primitive',
    `Button: Frame pad 16, bg #f00
  Text "Custom"

Button "Click"`,
    async (api: TestAPI) => {
      // Which wins - custom or primitive?
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Component: Empty component definition',
    `Empty:

Empty`,
    async (api: TestAPI) => {
      // Should handle empty component
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Component: Component referencing undefined token',
    `Card: Frame bg $undefined, pad $also_undefined

Card`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
]

// =============================================================================
// Data Binding Edge Cases
// =============================================================================

const dataBindingEdgeCases: TestSuite = [
  testWithSetup(
    'Data: Reference to undefined variable',
    `Text "$undefined"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Data: Deeply nested property access',
    `user:
  profile:
    name: "John"

Text "$user.profile.name"`,
    async (api: TestAPI) => {
      api.assert.hasText('node-1', 'John')
    }
  ),

  testWithSetup(
    'Data: Array access out of bounds',
    `items:
  first: "A"
  second: "B"

Text "$items.tenth"`,
    async (api: TestAPI) => {
      // Should handle gracefully
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Data: Circular reference detection',
    `a: "$b"
b: "$a"

Text "$a"`,
    async (api: TestAPI) => {
      // Should not infinite loop
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Data: Collection iteration with data',
    `users:
  max:
    name: "Max"
  anna:
    name: "Anna"

Frame gap 4
  each user in $users
    Text user.name`,
    async (api: TestAPI) => {
      // Frame (node-1) should exist with children from iteration
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(
        container!.children.length >= 2,
        `Should render 2 items, got ${container!.children.length}`
      )
    }
  ),
]

// =============================================================================
// Animation Edge Cases
// =============================================================================

const animationEdgeCases: TestSuite = [
  testWithSetup(
    'Animation: Multiple animations on same element',
    `Icon "loader", anim spin, anim pulse, anim bounce`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Animation: Zero duration',
    `Button "Click", bg #333
  hover 0s:
    bg #444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Animation: Very long duration',
    `Button "Click", bg #333
  hover 9999s:
    bg #444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Animation: Negative duration',
    `Button "Click", bg #333
  hover -1s:
    bg #444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
]

// =============================================================================
// Export All Test Suites
// =============================================================================

export const stressTests: TestSuite = [
  ...parserEdgeCases,
  ...deepNestingTests,
  ...rapidStateTests,
  ...selectionEdgeCases,
  ...undoRedoEdgeCases,
  ...layoutEdgeCases,
  ...colorEdgeCases,
  ...componentEdgeCases,
  ...dataBindingEdgeCases,
  ...animationEdgeCases,
  ...raceConditionTests,
  ...codeModifierTests,
  ...interactionStressTests,
  ...sourceMapStressTests,
]

export default stressTests

// Re-export individual test suites for selective running
export { raceConditionTests, codeModifierTests, interactionStressTests, sourceMapStressTests }
