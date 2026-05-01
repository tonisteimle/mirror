/**
 * Value Completion Tests (sizes, alignments, weights, cursors, shadows, animations)
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const valueCompletionTests: TestCase[] = describe('Value Completions', [
  test('Shows size values for width', async (api: TestAPI) => {
    await api.editor.setCode('Frame w ')
    api.editor.setCursor(1, 8)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasSizeValues = completions.some(c => ['full', 'hug'].includes(c))
    api.assert.ok(hasSizeValues, 'Should show size value completions')
  }),

  test('Shows alignment values', async (api: TestAPI) => {
    await api.editor.setCode('Frame ')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const alignments = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br']
    const hasAlignment = alignments.some(a => completions.includes(a))
    api.assert.ok(hasAlignment, 'Should show alignment completions')
  }),

  test('Shows font weight values', async (api: TestAPI) => {
    await api.editor.setCode('Text "Hi", weight ')
    api.editor.setCursor(1, 18)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasWeights = completions.some(c => ['bold', 'normal', 'light', 'semibold'].includes(c))
    api.assert.ok(hasWeights, 'Should show font weight values')
  }),

  test('Shows cursor values', async (api: TestAPI) => {
    await api.editor.setCode('Frame cursor ')
    api.editor.setCursor(1, 13)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasCursors = completions.some(c => ['pointer', 'grab', 'move', 'text'].includes(c))
    api.assert.ok(hasCursors, 'Should show cursor values')
  }),

  test('Shows shadow values', async (api: TestAPI) => {
    await api.editor.setCode('Frame shadow ')
    api.editor.setCursor(1, 13)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasShadows = completions.some(c => ['sm', 'md', 'lg'].includes(c))
    api.assert.ok(hasShadows, 'Should show shadow size values')
  }),

  test('Shows animation values', async (api: TestAPI) => {
    await api.editor.setCode('Frame anim ')
    api.editor.setCursor(1, 11)
    api.editor.triggerAutocomplete()
    await api.utils.waitForIdle()

    const completions = api.editor.getCompletions()
    const hasAnimations = completions.some(c =>
      ['pulse', 'bounce', 'shake', 'spin', 'fade-in'].includes(c)
    )
    api.assert.ok(hasAnimations, 'Should show animation presets')
  }),
])
