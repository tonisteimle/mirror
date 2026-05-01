/**
 * Complex Scenarios — full workflows, undo across panels, multi-element edits
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const complexScenarioTests: TestCase[] = describe('Complex Scenarios', [
  testWithSetup(
    'Full workflow: create, edit, style',
    `Frame pad 16, bg #1a1a1a, gap 8`,
    async (api: TestAPI) => {
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Button "New", bg #333, col white, pad 12 24, rad 6`)
      await api.utils.delay(50)

      await api.interact.click('node-2')
      await api.utils.delay(50)

      await api.panel.property.setProperty('background', '#2271C1')
      await api.utils.delay(50)

      const code = api.editor.getCode()
      await api.editor.setCode(code + `\n  Text "Added", col white`)
      await api.utils.delay(100)

      api.assert.exists('node-2')
      api.assert.exists('node-3')
    }
  ),

  testWithSetup(
    'Undo after panel edit',
    `Frame pad 16, bg #1a1a1a
  Button "Test", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(50)

      const originalCode = api.editor.getCode()

      await api.panel.property.setProperty('background', '#ef4444')
      await api.utils.delay(100)

      const changedCode = api.editor.getCode()
      api.assert.ok(changedCode !== originalCode, 'Code should change after panel edit')

      api.editor.undo()
      await api.utils.delay(100)

      const afterUndo = api.editor.getCode()
      api.assert.ok(
        afterUndo.includes('#333') || afterUndo === originalCode,
        'Should revert to original after undo'
      )
    }
  ),

  testWithSetup(
    'Multiple elements workflow',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Title", col white, fs 24, weight bold
  Text "Description", col #888, fs 14
  Button "Action", bg #2271C1, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('color', '#2271C1')
      await api.utils.delay(50)

      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.panel.property.setProperty('font-size', '16')
      await api.utils.delay(50)

      await api.interact.click('node-4')
      await api.utils.delay(50)
      await api.panel.property.setProperty('background', '#10b981')
      await api.utils.delay(100)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('10b981'), 'Button should be green')
    }
  ),
])
