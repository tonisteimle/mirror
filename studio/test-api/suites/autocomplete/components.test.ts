/**
 * Component Completion Tests (custom components defined in source + built-in components)
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const componentCompletionTests: TestCase[] = describe('Component Completions', [
  test('Shows defined components', async (api: TestAPI) => {
    await api.editor.setCode('Btn: bg #333, pad 12\n\n')
    api.editor.setCursor(3, 0)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasCustomComponent = completions.includes('Btn')
    api.assert.ok(hasCustomComponent, 'Should show custom component')
  }),

  test('Shows built-in components', async (api: TestAPI) => {
    await api.editor.setCode('')
    api.editor.setCursor(1, 0)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasComponents = completions.some(c =>
      ['Dialog', 'Tooltip', 'Tabs', 'Select', 'Checkbox', 'Switch', 'Slider'].includes(c)
    )
    api.assert.ok(hasComponents, 'Should show built-in components')
  }),
])
