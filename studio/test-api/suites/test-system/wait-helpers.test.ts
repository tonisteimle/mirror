/**
 * Wait Helpers — waitForElement, waitForCount, waitForIdle, waitForAnimation, waitUntil
 */

import type { TestCase, TestAPI } from '../../types'

export const waitHelperTests: TestCase[] = [
  {
    name: 'WaitHelpers: waitForElement finds element',
    category: 'testSystem',
    setup: `Frame
  Text "Wait For Me"`,
    run: async (api: TestAPI) => {
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Should have nodes')

      const element = await api.utils.waitForElement(nodeIds[0])
      api.assert.ok(element !== null, 'Should find element')
      api.assert.ok(element instanceof HTMLElement, 'Should be HTMLElement')
    },
  },

  {
    name: 'WaitHelpers: waitForElement throws on timeout',
    category: 'testSystem',
    run: async (api: TestAPI) => {
      try {
        await api.utils.waitForElement('non-existent-node', 100)
        api.assert.ok(false, 'Should have thrown')
      } catch (e) {
        api.assert.ok((e as Error).message.includes('not found'), 'Should throw not found error')
      }
    },
  },

  {
    name: 'WaitHelpers: waitForCount waits for element count',
    category: 'testSystem',
    setup: `Frame
  Text "A"
  Text "B"
  Text "C"`,
    run: async (api: TestAPI) => {
      await api.utils.waitForCount('[data-mirror-id]', 4)

      const elements = document.querySelectorAll('[data-mirror-id]')
      api.assert.ok(
        elements.length === 4,
        `Should have exactly 4 elements with data-mirror-id, got ${elements.length}`
      )
    },
  },

  {
    name: 'WaitHelpers: waitForIdle completes',
    category: 'testSystem',
    setup: `Frame
  Text "Idle Test"`,
    run: async (api: TestAPI) => {
      await api.editor.setCode('Frame\n  Text "Updated"')

      await api.utils.waitForIdle()

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 2, 'Should have nodes after waitForIdle')

      const text = api.preview.findByText('Updated')
      api.assert.ok(text !== null, 'Should find updated text after idle')
    },
  },

  {
    name: 'WaitHelpers: waitForAnimation completes',
    category: 'testSystem',
    setup: `Frame
  Text "Animated"`,
    run: async (api: TestAPI) => {
      await api.utils.waitForAnimation()

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 2, 'Should have nodes after waitForAnimation')

      const text = api.preview.findByText('Animated')
      api.assert.ok(text !== null, 'Should find Animated text element')
    },
  },

  {
    name: 'WaitHelpers: waitUntil waits for condition',
    category: 'testSystem',
    run: async (api: TestAPI) => {
      let counter = 0
      const interval = setInterval(() => counter++, 50)

      try {
        await api.utils.waitUntil(() => counter >= 3, 1000)
        api.assert.ok(counter >= 3, 'Condition should be met')
      } finally {
        clearInterval(interval)
      }
    },
  },
]
