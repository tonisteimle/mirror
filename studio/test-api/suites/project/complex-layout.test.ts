/**
 * Project — Complex Layouts
 */

import type { TestSuite, TestAPI } from '../../types'
import { setupProject, cleanupProject } from './_fixtures'

// =============================================================================
// Complex Layout Tests
// =============================================================================

export const complexLayoutTests: TestSuite = [
  {
    name: 'Project: Header-Sidebar-Main layout',
    run: async (api: TestAPI) => {
      await setupProject(api)

      await api.editor.setCode(`App
  Header
    Text "App Title"
  Frame hor, h full, grow
    Sidebar
      Text "Nav"
    Main
      Text "Content"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Check structure
      api.assert.exists('node-1') // App
      const app = api.preview.inspect('node-1')
      api.assert.ok(app !== null, 'App inspect should return info')
      api.assert.ok(
        app!.children.length >= 2,
        `App should have Header and Frame, got ${app!.children.length}`
      )

      await cleanupProject(api)
    },
  },

  {
    name: 'Project: Grid of cards',
    run: async (api: TestAPI) => {
      await setupProject(api)

      await api.editor.setCode(`Frame hor, wrap, gap $l
  Card w 200
    CardTitle "Card 1"
  Card w 200
    CardTitle "Card 2"
  Card w 200
    CardTitle "Card 3"
  Card w 200
    CardTitle "Card 4"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container inspect should return info')
      api.assert.ok(
        container!.children.length === 4,
        `Should have 4 cards, got ${container!.children.length}`
      )

      await cleanupProject(api)
    },
  },

  {
    name: 'Project: Data table with rows',
    run: async (api: TestAPI) => {
      await setupProject(api)

      await api.editor.setCode(`DataTable
  TableHeader
    TableHeaderCell "Name"
    TableHeaderCell "Status"
  TableRow
    TableCell "Item 1"
    TableCell "Active"
  TableRow
    TableCell "Item 2"
    TableCell "Pending"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Check that table rendered
      api.assert.exists('node-1')
      const table = api.preview.inspect('node-1')
      api.assert.ok(table !== null, 'Table inspect should return info')
      api.assert.ok(
        table!.children.length >= 3,
        `Table should have header and rows, got ${table!.children.length}`
      )

      await cleanupProject(api)
    },
  },
]
