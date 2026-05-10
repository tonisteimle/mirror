/**
 * Tutorial — Lint markers in editor (videos/run-lint.webm)
 * Embedded in: docs/tutorial/26-run-mode.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BAD = `Frame bg #2271
  Text fs bold`

const FIXED = `Frame bg #2271C1
  Text "Hello", fs 18, weight bold`

export const runLint: TestCase[] = describe('demos.tutorial', [
  testWithSetup('lint: invalid hex + bad property', BAD, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(1200)

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(800)

    // Park cursor at top of editor — viewer should see any lint marks.
    // (In test-mode lint may or may not surface; the concept demo lands
    // a working state at the end either way.)
    await sleep(1200)

    await api.editor.setCode(FIXED)
    await sleep(1200)

    api.assert.matches(api.editor.getCode(), /bg #2271C1/, 'hex fixed to 6 chars')
    api.assert.matches(api.editor.getCode(), /weight bold/, 'fs bold corrected to weight bold')

    await sleep(500)
    await osMouse.park()
  }),
])
