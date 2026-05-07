/**
 * Cmd+G / Ctrl+G keyboard grouping tests.
 *
 * Existing coverage is implicit: ungroup-cycle tests use Cmd+G as setup
 * and check loose `code.includes('Box')`. These dedicated tests pin
 * down the *exact* source the group operation should produce, so a
 * regression that picks the wrong wrapper, drops the layout direction,
 * or mis-orders children is caught here instead of hiding behind a
 * happy-path ungroup.
 *
 * Covered:
 *   1. Two siblings under a vertical parent → Box ver wrapper
 *   2. Two siblings under a horizontal parent → Box hor wrapper
 *   3. Three siblings preserve their original order
 *   4. Ctrl+G (non-Mac variant) works identically
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

async function multiSelect(api: TestAPI, ids: string[]): Promise<void> {
  await api.interact.click(ids[0])
  await api.utils.delay(50)
  for (const id of ids.slice(1)) {
    await api.interact.shiftClick(id)
    await api.utils.delay(50)
  }
}

function expectCode(api: TestAPI, expected: string, label: string): void {
  const actual = api.editor.getCode()
  api.assert.ok(
    actual === expected,
    `[${label}] Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
  )
}

export const keyboardGroupTests: TestCase[] = describe('Cmd+G grouping', [
  testWithSetup(
    'Cmd+G groups two siblings under vertical parent into Box ver',
    'Frame ver, gap 8\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await multiSelect(api, ['node-2', 'node-3'])
      await api.interact.pressKey('g', { meta: true })
      await api.utils.waitForCompile()

      // Wrapper is Box, layout is ver (matches parent's flex-direction).
      // Two grouped children indented one extra level.
      expectCode(
        api,
        'Frame ver, gap 8\n  Box ver\n    Text "A"\n    Text "B"\n  Text "C"',
        'Cmd+G ver parent'
      )
    }
  ),

  testWithSetup(
    'Cmd+G groups two siblings under horizontal parent into Box hor',
    'Frame hor, gap 8\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await multiSelect(api, ['node-2', 'node-3'])
      await api.interact.pressKey('g', { meta: true })
      await api.utils.waitForCompile()

      expectCode(
        api,
        'Frame hor, gap 8\n  Box hor\n    Text "A"\n    Text "B"\n  Text "C"',
        'Cmd+G hor parent'
      )
    }
  ),

  testWithSetup(
    'Cmd+G preserves order for three contiguous siblings',
    'Frame ver, gap 8\n  Text "A"\n  Text "B"\n  Text "C"\n  Text "D"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await multiSelect(api, ['node-2', 'node-3', 'node-4'])
      await api.interact.pressKey('g', { meta: true })
      await api.utils.waitForCompile()

      expectCode(
        api,
        'Frame ver, gap 8\n  Box ver\n    Text "A"\n    Text "B"\n    Text "C"\n  Text "D"',
        'Cmd+G three-sibling order'
      )
    }
  ),

  testWithSetup(
    'Ctrl+G (non-Mac variant) behaves like Cmd+G',
    'Frame ver, gap 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await multiSelect(api, ['node-2', 'node-3'])
      await api.interact.pressKey('g', { ctrl: true })
      await api.utils.waitForCompile()

      expectCode(
        api,
        'Frame ver, gap 8\n  Box ver\n    Text "A"\n    Text "B"',
        'Ctrl+G ver parent'
      )
    }
  ),
])
