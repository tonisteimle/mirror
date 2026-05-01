/**
 * Error Recovery Tests (invalid code does not crash, recovery after fix)
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const errorRecoveryTests: TestCase[] = describe('Error Recovery', [
  test('Invalid code does not crash preview', async (api: TestAPI) => {
    await api.editor.setCode('Text "Valid"')
    await api.utils.waitForCompile()
    api.assert.exists('node-1')

    await api.editor.setCode('Text "Unclosed')
    await api.utils.waitForIdle()
  }),

  test('Recovery after fixing syntax error', async (api: TestAPI) => {
    await api.editor.setCode('Frame (\n  invalid')
    await api.utils.waitForIdle()

    await api.editor.setCode('Frame\n  Text "Fixed"')
    await api.utils.waitForCompile()

    api.assert.exists('node-1')
    api.assert.exists('node-2')
  }),
])
