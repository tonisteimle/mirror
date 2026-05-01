/**
 * Project — Project Setup (file creation, lifecycle)
 */

import type { TestSuite, TestAPI } from '../../types'
import {
  TOKENS_FILE,
  COMPONENTS_FILE,
  DASHBOARD_SCREEN,
  setupProject,
  cleanupProject,
} from './_fixtures'

// =============================================================================
// Project Setup Tests
// =============================================================================

export const projectSetupTests: TestSuite = [
  {
    name: 'Project: Create token file',
    run: async (api: TestAPI) => {
      const files = api.panel.files

      // Clean up any pre-existing file from previous test runs
      await files.delete('tokens.tok')
      await api.utils.delay(50)

      const created = await files.create('tokens.tok', TOKENS_FILE)
      api.assert.ok(created, 'Token file should be created')

      const content = files.getContent('tokens.tok')
      api.assert.ok(content !== null, 'Token file should have content')
      api.assert.ok(content!.includes('primary.bg: #2271C1'), 'Should contain primary color')

      await files.delete('tokens.tok')
    },
  },

  {
    name: 'Project: Create component file',
    run: async (api: TestAPI) => {
      const files = api.panel.files

      await files.create('tokens.tok', TOKENS_FILE)
      await files.create('components.com', COMPONENTS_FILE)

      const content = files.getContent('components.com')
      api.assert.ok(content !== null, 'Component file should have content')
      api.assert.ok(content!.includes('App:'), 'Should contain App component')
      api.assert.ok(content!.includes('PrimaryBtn as Btn:'), 'Should contain PrimaryBtn')

      await files.delete('components.com')
      await files.delete('tokens.tok')
    },
  },

  {
    name: 'Project: Create layout file with subdirectory',
    run: async (api: TestAPI) => {
      const files = api.panel.files

      // Create screens folder structure
      const created = await files.create('screens/dashboard.mir', DASHBOARD_SCREEN)

      // Verify creation reported success
      api.assert.ok(created, 'files.create() should return true')

      // Check if file exists in file list (subdirectory support varies)
      const fileList = files.list()
      const hasFile =
        fileList.includes('screens/dashboard.mir') || fileList.includes('dashboard.mir')

      api.assert.ok(hasFile, `Created file should be in file list, got: ${fileList.join(', ')}`)

      // Cleanup
      await files.delete('screens/dashboard.mir')
      await files.delete('dashboard.mir')
    },
  },

  {
    name: 'Project: Full project setup',
    run: async (api: TestAPI) => {
      await setupProject(api)

      const files = api.panel.files
      const fileList = files.list()

      // Should have multiple files
      api.assert.ok(fileList.length >= 4, `Should have at least 4 files, got ${fileList.length}`)

      // Should include token and component files
      const hasTokens = fileList.some(f => f.includes('tokens'))
      const hasComponents = fileList.some(f => f.includes('components'))

      api.assert.ok(hasTokens, 'Should have tokens file')
      api.assert.ok(hasComponents, 'Should have components file')

      await cleanupProject(api)
    },
  },
]
