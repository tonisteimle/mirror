/**
 * State Completion Tests (autocomplete suggests state names like hover:, focus:)
 */

import { testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const stateCompletionTests: TestCase[] = describe('State Completions', [
  // TODO: State completions not reliably triggered in test environment
  testSkip('Shows state names for colon', async (api: TestAPI) => {
    await api.editor.setCode('Button "Test"\n  ')
    api.editor.setCursor(2, 2)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasStates = completions.some(c =>
      [
        'hover:',
        'focus:',
        'active:',
        'disabled:',
        'on:',
        'selected:',
        'hover',
        'focus',
        'active',
      ].includes(c)
    )
    api.assert.ok(hasStates, 'Should show state completions')
  }),
])
