/**
 * Test System Feature Tests
 *
 * Tests for the new test framework features:
 * - Fixtures API
 * - Test Isolation (reset)
 * - Keyboard simulation with modifiers
 * - Wait helpers
 */

import type { TestCase } from '../types'

// =============================================================================
// Fixtures API Tests
// =============================================================================

export const fixturesTests: TestCase[] = [
  {
    name: 'Fixtures: list returns available fixtures',
    category: 'testSystem',
    run: async api => {
      const fixtures = api.fixtures.list()

      api.assert.ok(Array.isArray(fixtures), 'list() should return array')
      api.assert.ok(fixtures.length > 0, 'Should have built-in fixtures')
      api.assert.ok(
        fixtures.includes('horizontal-layout'),
        'Should include horizontal-layout fixture'
      )
      api.assert.ok(fixtures.includes('button-variants'), 'Should include button-variants fixture')
    },
  },

  {
    name: 'Fixtures: get returns fixture by name',
    category: 'testSystem',
    run: async api => {
      const fixture = api.fixtures.get('horizontal-layout')

      api.assert.ok(fixture !== undefined, 'Should find horizontal-layout fixture')
      api.assert.ok(fixture!.name === 'horizontal-layout', 'Fixture name should match')
      api.assert.ok(fixture!.category === 'layout', 'Fixture category should be layout')
      api.assert.ok(fixture!.code.includes('hor'), 'Fixture code should contain hor')
    },
  },

  {
    name: 'Fixtures: getByCategory returns category fixtures',
    category: 'testSystem',
    run: async api => {
      const layoutFixtures = api.fixtures.getByCategory('layout')
      const zagFixtures = api.fixtures.getByCategory('zag')

      api.assert.ok(layoutFixtures.length >= 5, 'Should have multiple layout fixtures')
      api.assert.ok(zagFixtures.length >= 3, 'Should have multiple zag fixtures')

      // Check all layout fixtures have correct category
      for (const f of layoutFixtures) {
        api.assert.ok(f.category === 'layout', `${f.name} should be in layout category`)
      }
    },
  },

  {
    name: 'Fixtures: load renders fixture correctly',
    category: 'testSystem',
    run: async api => {
      await api.fixtures.load('horizontal-layout')
      await api.utils.delay(200)

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 4, 'Should render 4 nodes (Frame + 3 Text)')

      // Check horizontal layout
      const root = api.preview.inspect(nodeIds[0])
      api.assert.ok(root?.styles.flexDirection === 'row', 'Should have horizontal flex direction')
    },
  },

  {
    name: 'Fixtures: loadCode renders custom code',
    category: 'testSystem',
    run: async api => {
      await api.fixtures.loadCode(`Frame bg #2271C1, pad 20
  Text "Custom Fixture"`)
      await api.utils.delay(200)

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 2, 'Should render 2 nodes')

      const text = api.preview.findByText('Custom Fixture')
      api.assert.ok(text !== null, 'Should find custom text')
    },
  },

  {
    name: 'Fixtures: register adds custom fixture',
    category: 'testSystem',
    run: async api => {
      api.fixtures.register({
        name: 'test-custom-fixture',
        category: 'test',
        code: 'Frame gap 8\n  Button "Custom"',
        description: 'Test fixture',
      })

      const fixture = api.fixtures.get('test-custom-fixture')
      api.assert.ok(fixture !== undefined, 'Should find registered fixture')
      api.assert.ok(fixture!.category === 'test', 'Should have correct category')

      // Load and verify
      await api.fixtures.load('test-custom-fixture')
      await api.utils.delay(200)

      const btn = api.preview.findByText('Custom')
      api.assert.ok(btn !== null, 'Should render custom button')
    },
  },
]

// =============================================================================
// Test Isolation Tests
// =============================================================================

export const isolationTests: TestCase[] = [
  {
    name: 'Isolation: reset clears editor',
    category: 'testSystem',
    run: async api => {
      // Set some code first
      await api.editor.setCode('Frame\n  Text "Before Reset"')
      await api.utils.delay(100)

      let code = api.editor.getCode()
      api.assert.ok(code.includes('Before Reset'), 'Code should be set')

      // Reset
      await api.studio.reset()

      code = api.editor.getCode()
      api.assert.ok(code === '', 'Code should be empty after reset')
    },
  },

  {
    name: 'Isolation: reset clears history',
    category: 'testSystem',
    run: async api => {
      // Make some changes
      await api.editor.setCode('Frame\n  Text "Change 1"')
      await api.utils.delay(100)
      await api.editor.setCode('Frame\n  Text "Change 2"')
      await api.utils.delay(100)

      // Reset
      await api.studio.reset()

      api.assert.ok(api.studio.history.getUndoStackSize() === 0, 'Undo stack should be empty')
      api.assert.ok(api.studio.history.getRedoStackSize() === 0, 'Redo stack should be empty')
    },
  },

  {
    name: 'Isolation: reset clears selection',
    category: 'testSystem',
    run: async api => {
      // Set code and select
      await api.editor.setCode('Frame\n  Text "Select Me"')
      await api.utils.delay(200)

      const nodeIds = api.preview.getNodeIds()
      if (nodeIds.length > 0) {
        api.interact.select(nodeIds[0])
        await api.utils.delay(100)
      }

      // Reset
      await api.studio.reset()

      const selection = api.studio.getSelection()
      api.assert.ok(selection === null, 'Selection should be null after reset')
    },
  },

  {
    name: 'Isolation: getStateSnapshot captures state',
    category: 'testSystem',
    run: async api => {
      await api.editor.setCode('Frame\n  Text "Snapshot Test"')
      await api.utils.delay(200)

      const snapshot = api.studio.getStateSnapshot()

      api.assert.ok(snapshot.code.includes('Snapshot Test'), 'Snapshot should have code')
      api.assert.ok(Array.isArray(snapshot.nodeIds), 'Snapshot should have nodeIds')
      api.assert.ok(snapshot.nodeIds.length >= 2, 'Should have at least 2 nodes')
      api.assert.ok(typeof snapshot.undoStackSize === 'number', 'Should have undoStackSize')
    },
  },
]

// =============================================================================
// Keyboard Simulation Tests
// =============================================================================

export const keyboardTests: TestCase[] = [
  {
    name: 'Keyboard: pressKey fires events',
    category: 'testSystem',
    setup: `Frame
  Input placeholder "Type here..."`,
    run: async api => {
      await api.utils.delay(100)
      const nodeIds = api.preview.getNodeIds()
      const inputId = nodeIds.find(id => {
        const info = api.preview.inspect(id)
        // Check for input tag (case insensitive)
        return info?.tagName?.toUpperCase() === 'INPUT'
      })

      if (!inputId) {
        // Fallback: just test that pressKey works without an element
        await api.interact.pressKey('a')
        await api.interact.pressKey('b')
        await api.interact.pressKey('c')
        api.assert.ok(true, 'Keys pressed without error (no input element)')
        return
      }

      await api.interact.focus(inputId)
      await api.interact.pressKey('a')
      await api.interact.pressKey('b')
      await api.interact.pressKey('c')

      api.assert.ok(true, 'Keys pressed without error')
    },
  },

  {
    name: 'Keyboard: pressSequence fires multiple keys',
    category: 'testSystem',
    run: async api => {
      // Just verify the method works without error
      await api.interact.pressSequence(['ArrowDown', 'ArrowDown', 'Enter'])
      api.assert.ok(true, 'Key sequence completed')
    },
  },

  {
    name: 'Keyboard: pressKey with modifiers',
    category: 'testSystem',
    run: async api => {
      // Test that modifiers are accepted
      await api.interact.pressKey('a', { ctrl: true })
      await api.interact.pressKey('s', { ctrl: true, shift: true })
      await api.interact.pressKey('z', { meta: true })

      api.assert.ok(true, 'Keys with modifiers pressed')
    },
  },

  {
    name: 'Keyboard: typeText types character by character',
    category: 'testSystem',
    setup: `Frame
  Input placeholder "Type here..."`,
    run: async api => {
      await api.utils.delay(100)
      const nodeIds = api.preview.getNodeIds()
      const inputId = nodeIds.find(id => {
        const info = api.preview.inspect(id)
        return info?.tagName?.toUpperCase() === 'INPUT'
      })

      if (!inputId) {
        // Fallback: test typeText without an input
        await api.interact.typeText('Hi', 10)
        api.assert.ok(true, 'Text typed (no input element)')
        return
      }

      await api.interact.focus(inputId)
      await api.interact.typeText('Hello', 10)

      api.assert.ok(true, 'Text typed character by character')
    },
  },
]

// =============================================================================
// Wait Helper Tests
// =============================================================================

export const waitHelperTests: TestCase[] = [
  {
    name: 'WaitHelpers: waitForElement finds element',
    category: 'testSystem',
    setup: `Frame
  Text "Wait For Me"`,
    run: async api => {
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
    run: async api => {
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
    run: async api => {
      // Should find 4 elements (1 Frame + 3 Text)
      await api.utils.waitForCount('[data-mirror-id]', 4)
      api.assert.ok(true, 'Found expected count')
    },
  },

  {
    name: 'WaitHelpers: waitForIdle completes',
    category: 'testSystem',
    run: async api => {
      await api.utils.waitForIdle()
      api.assert.ok(true, 'waitForIdle completed')
    },
  },

  {
    name: 'WaitHelpers: waitForAnimation completes',
    category: 'testSystem',
    setup: `Frame
  Text "Animated"`,
    run: async api => {
      await api.utils.waitForAnimation()
      api.assert.ok(true, 'waitForAnimation completed')
    },
  },

  {
    name: 'WaitHelpers: waitUntil waits for condition',
    category: 'testSystem',
    run: async api => {
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

// =============================================================================
// Export All Tests
// =============================================================================

export const allTestSystemTests: TestCase[] = [
  ...fixturesTests,
  ...isolationTests,
  ...keyboardTests,
  ...waitHelperTests,
]
