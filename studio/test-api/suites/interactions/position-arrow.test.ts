/**
 * Position-arrow integration tests.
 *
 * The unit-level position-arrow tests (`tests/studio/preview-keyboard-
 * position.test.ts`) cover the position-read/write logic with mocked
 * DOM. These integration tests run the real preview, with a real
 * SetPositionCommand and real recompile, to verify:
 *
 *   - Plain arrow moves by 1px and writes back to the source.
 *   - Shift+arrow moves by 10px.
 *   - Arrow on an element that is NOT in an absolute container does
 *     not move it (silent no-op, source unchanged).
 *
 * Catches regressions that the unit tests miss: mis-wired
 * SetPositionCommand, broken compile path, or a guard that incorrectly
 * fires on flex-positioned elements.
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

export const positionArrowTests: TestCase[] = describe('Position arrow keys', [
  testWithSetup(
    'ArrowRight on stacked element moves x by 1px',
    'Frame stacked, w 400, h 200\n  Frame x 50, y 50, w 60, h 40, bg #5BA8F5',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.studio.setSelection('node-2')
      await api.utils.delay(50)

      await api.interact.pressKey('ArrowRight')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame stacked, w 400, h 200\n  Frame x 51, y 50, w 60, h 40, bg #5BA8F5'
      api.assert.ok(
        actual === expected,
        `Expected x to advance from 50 to 51.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )
    }
  ),

  testWithSetup(
    'Shift+ArrowDown on stacked element moves y by 10px',
    'Frame stacked, w 400, h 200\n  Frame x 20, y 30, w 60, h 40, bg #5BA8F5',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.studio.setSelection('node-2')
      await api.utils.delay(50)

      await api.interact.pressKey('ArrowDown', { shift: true })
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame stacked, w 400, h 200\n  Frame x 20, y 40, w 60, h 40, bg #5BA8F5'
      api.assert.ok(
        actual === expected,
        `Expected y to advance from 30 to 40.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )
    }
  ),

  testWithSetup(
    'Arrow on flex element is a no-op (not in absolute container)',
    'Frame gap 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const codeBefore = api.editor.getCode()
      await api.studio.setSelection('node-2')
      await api.utils.delay(50)

      // ArrowDown on a flex child should NOT move it (the guard
      // isInAbsoluteContainer returns false for flex layouts).
      await api.interact.pressKey('ArrowDown')
      await api.utils.delay(150)

      const codeAfter = api.editor.getCode()
      api.assert.ok(
        codeAfter === codeBefore,
        `Arrow should not change source for flex children.\n--- Before ---\n${codeBefore}\n--- After ---\n${codeAfter}`
      )
    }
  ),

  testWithSetup(
    'Multiple arrows accumulate (3× ArrowRight = +3px)',
    'Frame stacked, w 400, h 200\n  Frame x 100, y 50, w 60, h 40, bg #5BA8F5',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.studio.setSelection('node-2')
      await api.utils.delay(50)

      await api.interact.pressKey('ArrowRight')
      await api.utils.waitForCompile()
      await api.interact.pressKey('ArrowRight')
      await api.utils.waitForCompile()
      await api.interact.pressKey('ArrowRight')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame stacked, w 400, h 200\n  Frame x 103, y 50, w 60, h 40, bg #5BA8F5'
      api.assert.ok(
        actual === expected,
        `Three ArrowRight presses should land at x=103.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )
    }
  ),
])
