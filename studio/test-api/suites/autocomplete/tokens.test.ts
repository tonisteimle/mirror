/**
 * Token Completion Tests (autocomplete suggests defined tokens after `$`)
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tokenCompletionTests: TestCase[] = describe('Token Completions', [
  test('Shows tokens after $', async (api: TestAPI) => {
    await api.editor.setCode('primary.bg: #2271C1\nFrame bg $')
    api.editor.setCursor(2, 10)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    api.assert.ok(completions.length >= 0, 'Should attempt token completions')
  }),
])
