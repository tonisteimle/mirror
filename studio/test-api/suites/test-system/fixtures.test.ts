/**
 * Fixtures API — list, get, getByCategory, load, loadCode, register
 */

import type { TestCase, TestAPI } from '../../types'

export const fixturesTests: TestCase[] = [
  {
    name: 'Fixtures: list returns available fixtures',
    category: 'testSystem',
    run: async (api: TestAPI) => {
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
    run: async (api: TestAPI) => {
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
    run: async (api: TestAPI) => {
      const layoutFixtures = api.fixtures.getByCategory('layout')
      const zagFixtures = api.fixtures.getByCategory('zag')

      api.assert.ok(layoutFixtures.length >= 5, 'Should have multiple layout fixtures')
      api.assert.ok(zagFixtures.length >= 3, 'Should have multiple zag fixtures')

      for (const f of layoutFixtures) {
        api.assert.ok(f.category === 'layout', `${f.name} should be in layout category`)
      }
    },
  },

  {
    name: 'Fixtures: load renders fixture correctly',
    category: 'testSystem',
    run: async (api: TestAPI) => {
      await api.fixtures.load('horizontal-layout')
      await api.utils.delay(200)

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 4, 'Should render 4 nodes (Frame + 3 Text)')

      const root = api.preview.inspect(nodeIds[0])
      api.assert.ok(root !== null, 'Root element should exist')
      api.assert.ok(
        root!.styles.flexDirection === 'row',
        `Should have horizontal flex direction, got: ${root!.styles.flexDirection}`
      )
    },
  },

  {
    name: 'Fixtures: loadCode renders custom code',
    category: 'testSystem',
    run: async (api: TestAPI) => {
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
    run: async (api: TestAPI) => {
      api.fixtures.register({
        name: 'test-custom-fixture',
        category: 'test',
        code: 'Frame gap 8\n  Button "Custom"',
        description: 'Test fixture',
      })

      const fixture = api.fixtures.get('test-custom-fixture')
      api.assert.ok(fixture !== undefined, 'Should find registered fixture')
      api.assert.ok(fixture!.category === 'test', 'Should have correct category')

      await api.fixtures.load('test-custom-fixture')
      await api.utils.delay(200)

      const btn = api.preview.findByText('Custom')
      api.assert.ok(btn !== null, 'Should render custom button')
    },
  },
]
