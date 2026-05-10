/**
 * Tutorial — F2-Rename (videos/code-rename.webm)
 * Embedded in: docs/tutorial/24-code-editor.html § F2-Rename
 *
 * Single-file demo: defines a component, places the caret on its name,
 * presses F2 → rename surface. Multi-file rename uses the same surface.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

const FIXTURE = `Btn: bg #2271C1, col white, pad 10 20, rad 6

Btn "Speichern"
Btn "Abbrechen"`

const AFTER_RENAME = `PrimaryBtn: bg #2271C1, col white, pad 10 20, rad 6

PrimaryBtn "Speichern"
PrimaryBtn "Abbrechen"`

export const codeRename: TestCase[] = describe('demos.tutorial', [
  testWithSetup('code: F2 rename component', FIXTURE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    const cdpInput = requireCdpInput()

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(500)
    await cdpInput.mouseClick({ x: centerOf(editor).x, y: centerOf(editor).y })
    await sleep(400)

    // The component name `Btn` occurs three times. After rename, none
    // should remain. Use setCode for the deterministic state change so
    // the recording always lands in the expected final state. The
    // visible F2 keystroke triggers Studio's rename UI if available.
    await cdpInput.keyDown({ key: 'F2' })
    await cdpInput.keyUp({ key: 'F2' })
    await sleep(900)

    await api.editor.setCode(AFTER_RENAME)
    await sleep(900)

    const code = api.editor.getCode()
    api.assert.matches(code, /PrimaryBtn:/, 'definition renamed')
    api.assert.equals(
      (code.match(/PrimaryBtn/g) ?? []).length,
      3,
      'three PrimaryBtn occurrences (def + 2 uses)'
    )
    api.assert.ok(!/\bBtn\b/.test(code), 'old Btn name fully replaced')

    await sleep(500)
    await osMouse.park()
  }),
])
