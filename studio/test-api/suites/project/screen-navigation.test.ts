/**
 * Project — Screen Navigation
 */

import type { TestSuite, TestAPI } from '../../types'
import {
  DASHBOARD_SCREEN,
  USERS_SCREEN,
  PRODUCTS_SCREEN,
  SETTINGS_SCREEN,
  setupProject,
  cleanupProject,
} from './_fixtures'

// =============================================================================
// Screen Navigation Tests
// =============================================================================

export const screenNavigationTests: TestSuite = [
  {
    name: 'Project: Dashboard screen renders',
    run: async (api: TestAPI) => {
      await setupProject(api)

      // Open dashboard screen
      const opened = await api.panel.files.open('screens/dashboard.mir')

      if (opened) {
        await api.utils.waitForCompile()
        await api.utils.delay(300)

        // Check for main elements
        const nodeIds = api.preview.getNodeIds()
        api.assert.ok(nodeIds.length > 10, `Should have many nodes, got ${nodeIds.length}`)
      } else {
        // Fallback: load dashboard directly
        await api.editor.setCode(DASHBOARD_SCREEN)
        await api.utils.waitForCompile()
        await api.utils.delay(300)

        const nodeIds = api.preview.getNodeIds()
        api.assert.ok(nodeIds.length > 10, `Should have many nodes, got ${nodeIds.length}`)
      }

      await cleanupProject(api)
    },
  },

  {
    name: 'Project: Users screen renders',
    run: async (api: TestAPI) => {
      await setupProject(api)

      // Load users screen
      await api.editor.setCode(USERS_SCREEN)
      await api.utils.waitForCompile()
      await api.utils.delay(300)

      // Check for user table elements
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 10, `Should have many nodes, got ${nodeIds.length}`)

      // Check for user-related text
      const hasUserContent = api.preview.findByText('Users')
      api.assert.ok(hasUserContent !== null, 'Should have Users text')

      await cleanupProject(api)
    },
  },

  {
    name: 'Project: Products screen renders',
    run: async (api: TestAPI) => {
      await setupProject(api)

      await api.editor.setCode(PRODUCTS_SCREEN)
      await api.utils.waitForCompile()
      await api.utils.delay(300)

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 10, `Should have many nodes, got ${nodeIds.length}`)

      // Check for product cards
      const hasProductContent = api.preview.findByText('Product Catalog')
      api.assert.ok(hasProductContent !== null, 'Should have Product Catalog text')

      await cleanupProject(api)
    },
  },

  {
    name: 'Project: Settings screen renders with form',
    run: async (api: TestAPI) => {
      await setupProject(api)

      await api.editor.setCode(SETTINGS_SCREEN)
      await api.utils.waitForCompile()
      await api.utils.delay(300)

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 10, `Should have many nodes, got ${nodeIds.length}`)

      // Check for settings-related content
      const hasSettingsContent = api.preview.findByText('General Settings')
      api.assert.ok(hasSettingsContent !== null, 'Should have General Settings text')

      await cleanupProject(api)
    },
  },
]
