/**
 * Icon Name Completion Tests
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const iconCompletionTests: TestCase[] = describe('Icon Completions', [
  test('Shows icon names after Icon', async (api: TestAPI) => {
    await api.editor.setCode('Icon "')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasIcons = completions.some(c =>
      ['check', 'x', 'plus', 'minus', 'arrow-left', 'arrow-right', 'search', 'settings'].includes(c)
    )
    api.assert.ok(hasIcons, 'Should show icon name completions')
  }),

  test('Filters icons by prefix', async (api: TestAPI) => {
    await api.editor.setCode('Icon "arr')
    api.editor.setCursor(1, 9)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    api.assert.ok(
      completions.length > 0,
      `Should have completions for 'arrow' prefix, got ${completions.length}`
    )
    const allArrow = completions.every(c => c.startsWith('arrow'))
    api.assert.ok(
      allArrow,
      `All completions should start with 'arrow', got: ${completions.slice(0, 5).join(', ')}`
    )
  }),
])
