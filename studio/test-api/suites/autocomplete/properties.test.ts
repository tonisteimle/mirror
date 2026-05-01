/**
 * Property Completion Tests (autocomplete suggests properties after primitive)
 */

import { test, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const propertyCompletionTests: TestCase[] = describe('Property Completions', [
  test('Shows properties after primitive', async (api: TestAPI) => {
    await api.editor.setCode('Frame ')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasProperties = completions.some(c => ['bg', 'pad', 'gap', 'hor', 'center'].includes(c))
    api.assert.ok(hasProperties, 'Should include property completions')
  }),

  test('Shows properties after comma', async (api: TestAPI) => {
    await api.editor.setCode('Frame bg #333, ')
    api.editor.setCursor(1, 15)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    api.assert.ok(completions.length > 0, 'Should show more properties after comma')
  }),

  test('Shows layout properties for Frame', async (api: TestAPI) => {
    await api.editor.setCode('Frame ')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const layoutProps = ['hor', 'ver', 'gap', 'center', 'spread', 'wrap', 'grid', 'stacked']
    const hasLayout = layoutProps.some(p => completions.includes(p))
    api.assert.ok(hasLayout, 'Frame should show layout properties')
  }),

  // TODO: Context-aware completions not yet implemented
  testSkip('Shows icon properties for Icon', async (api: TestAPI) => {
    await api.editor.setCode('Icon "check", ')
    api.editor.setCursor(1, 14)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasIconProps = completions.some(c => ['ic', 'is', 'fill'].includes(c))
    api.assert.ok(hasIconProps, 'Icon should show icon-specific properties')
  }),

  // TODO: Context-aware completions not yet implemented
  testSkip('Shows input properties for Input', async (api: TestAPI) => {
    await api.editor.setCode('Input ')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasInputProps = completions.some(c =>
      ['placeholder', 'value', 'type', 'disabled'].includes(c)
    )
    api.assert.ok(hasInputProps, 'Input should show input-specific properties')
  }),
])
