/**
 * Primitive Completion Tests (autocomplete suggests primitives at line start)
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const primitiveCompletionTests: TestCase[] = describe('Primitive Completions', [
  test('Shows primitives at line start', async (api: TestAPI) => {
    await api.editor.setCode('')
    api.editor.setCursor(1, 0)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    api.assert.ok(completions.length > 0, 'Should show completions')

    const hasPrimitives = completions.some(c => ['Frame', 'Text', 'Button', 'Icon'].includes(c))
    api.assert.ok(hasPrimitives, 'Should include primitive completions')
  }),

  test('Shows primitives after indent', async (api: TestAPI) => {
    await api.editor.setCode('Frame\n  ')
    api.editor.setCursor(2, 2)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    api.assert.ok(completions.length > 0, 'Should show completions for nested element')
  }),

  test('Filters primitives by typed prefix', async (api: TestAPI) => {
    await api.editor.setCode('Bu')
    api.editor.setCursor(1, 2)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    api.assert.ok(
      completions.length > 0,
      `Should have completions for 'Bu' prefix, got ${completions.length}`
    )
    const allStartWithBu = completions.every(c => c.toLowerCase().startsWith('bu'))
    api.assert.ok(
      allStartWithBu,
      `All completions should start with 'bu', got: ${completions.slice(0, 5).join(', ')}`
    )
  }),
])
