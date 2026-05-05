/**
 * Empty Project Tests
 *
 * Tests to verify that a new empty project is truly empty:
 * - Only contains index.mir
 * - index.mir has no content
 * - No tokens, components, or data files
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { EMPTY_PROJECT, DEFAULT_PROJECT } from '../../../storage/project-actions'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Simulate creating an empty project by clearing localStorage
 * and setting the EMPTY_PROJECT structure
 */
function simulateEmptyProject(): void {
  localStorage.setItem('mirror-files', JSON.stringify(EMPTY_PROJECT))
}

/**
 * Clear all files except index.mir to simulate empty state
 */
async function clearToEmptyState(api: TestAPI): Promise<void> {
  const files = api.panel.files
  const fileList = files.list()

  // Delete all files except index.mir
  for (const file of fileList) {
    if (file !== 'index.mir') {
      await files.delete(file)
    }
  }

  // Set index.mir to empty
  await api.editor.setCode('')
  await api.utils.delay(100)
}

// =============================================================================
// EMPTY_PROJECT Constant Tests
// =============================================================================

export const emptyProjectConstantTests: TestCase[] = describe('Empty Project - Constants', [
  test('EMPTY_PROJECT only contains index.mir', async (api: TestAPI) => {
    const fileNames = Object.keys(EMPTY_PROJECT)

    api.assert.equals(fileNames.length, 1, 'Should only have one file')
    api.assert.equals(fileNames[0], 'index.mir', 'File should be index.mir')
  }),

  test('EMPTY_PROJECT index.mir is empty string', async (api: TestAPI) => {
    const content = EMPTY_PROJECT['index.mir']

    api.assert.equals(content, '', 'index.mir content should be empty string')
  }),

  test('EMPTY_PROJECT has no tokens', async (api: TestAPI) => {
    const hasTokenFile = Object.keys(EMPTY_PROJECT).some(
      f => f.endsWith('.tok') || f.endsWith('.tokens')
    )

    api.assert.ok(!hasTokenFile, 'Empty project should have no token files')
  }),

  test('EMPTY_PROJECT has no components', async (api: TestAPI) => {
    const hasComponentFile = Object.keys(EMPTY_PROJECT).some(
      f => f.endsWith('.com') || f.endsWith('.components')
    )

    api.assert.ok(!hasComponentFile, 'Empty project should have no component files')
  }),

  test('EMPTY_PROJECT has no data files', async (api: TestAPI) => {
    const hasDataFile = Object.keys(EMPTY_PROJECT).some(
      f => f.endsWith('.data') || f.endsWith('.yaml') || f.endsWith('.yml')
    )

    api.assert.ok(!hasDataFile, 'Empty project should have no data files')
  }),

  test('DEFAULT_PROJECT is different from EMPTY_PROJECT', async (api: TestAPI) => {
    // MVP single-file mode: both projects now have one file (`index.mir`).
    // The demo project differs in *content* (tokens + components + canvas
    // inline) rather than in file count.
    const emptyContent = EMPTY_PROJECT['index.mir'] ?? ''
    const defaultContent = DEFAULT_PROJECT['index.mir'] ?? ''

    api.assert.ok(
      defaultContent.length > emptyContent.length,
      `Default project index.mir (${defaultContent.length} chars) should have more content than empty project (${emptyContent.length} chars)`
    )
  }),
])

// =============================================================================
// Runtime Empty State Tests
// =============================================================================

export const emptyProjectStateTests: TestCase[] = describe('Empty Project - Runtime State', [
  test('Empty state has only index.mir in file list', async (api: TestAPI) => {
    await clearToEmptyState(api)

    const files = api.panel.files.list()

    // Allow for index.mir to be the only .mir file
    const mirFiles = files.filter(f => f.endsWith('.mir'))
    api.assert.equals(
      mirFiles.length,
      1,
      `Should only have one .mir file, got: ${mirFiles.join(', ')}`
    )
    api.assert.ok(mirFiles.includes('index.mir'), 'Should include index.mir')
  }),

  test('Empty state has no token files', async (api: TestAPI) => {
    await clearToEmptyState(api)

    const files = api.panel.files.list()
    const tokenFiles = files.filter(f => f.endsWith('.tok') || f.endsWith('.tokens'))

    api.assert.equals(
      tokenFiles.length,
      0,
      `Should have no token files, got: ${tokenFiles.join(', ')}`
    )
  }),

  test('Empty state has no component files', async (api: TestAPI) => {
    await clearToEmptyState(api)

    const files = api.panel.files.list()
    const componentFiles = files.filter(f => f.endsWith('.com') || f.endsWith('.components'))

    api.assert.equals(
      componentFiles.length,
      0,
      `Should have no component files, got: ${componentFiles.join(', ')}`
    )
  }),

  test('Empty state has no data files', async (api: TestAPI) => {
    await clearToEmptyState(api)

    const files = api.panel.files.list()
    const dataFiles = files.filter(
      f => f.endsWith('.data') || f.endsWith('.yaml') || f.endsWith('.yml')
    )

    api.assert.equals(
      dataFiles.length,
      0,
      `Should have no data files, got: ${dataFiles.join(', ')}`
    )
  }),

  test('Empty state editor has no content', async (api: TestAPI) => {
    await clearToEmptyState(api)

    const code = api.editor.getCode()

    api.assert.equals(code.trim(), '', 'Editor should be empty')
  }),
])

// =============================================================================
// Preview Tests for Empty Project
// =============================================================================

export const emptyProjectPreviewTests: TestCase[] = describe('Empty Project - Preview', [
  test('Empty project renders nothing in preview', async (api: TestAPI) => {
    await api.editor.setCode('')
    await api.utils.waitForCompile()
    await api.utils.delay(100)

    const nodeIds = api.preview.getNodeIds()

    api.assert.equals(nodeIds.length, 0, `Empty code should render no nodes, got ${nodeIds.length}`)
  }),

  test('Empty project has no compile errors', async (api: TestAPI) => {
    await api.editor.setCode('')
    await api.utils.waitForCompile()
    await api.utils.delay(100)

    const errors = api.studio.getCompileErrors()

    api.assert.equals(
      errors.length,
      0,
      `Empty code should have no errors, got: ${errors.join(', ')}`
    )
  }),
])

// =============================================================================
// localStorage Verification Tests
// =============================================================================

export const emptyProjectStorageTests: TestCase[] = describe('Empty Project - Storage', [
  test('simulateEmptyProject sets correct localStorage', async (api: TestAPI) => {
    // Save current state
    const originalState = localStorage.getItem('mirror-files')

    // Simulate empty project
    simulateEmptyProject()

    // Check localStorage
    const stored = localStorage.getItem('mirror-files')
    api.assert.ok(stored !== null, 'localStorage should have mirror-files')

    const parsed = JSON.parse(stored!)
    const files = Object.keys(parsed)

    api.assert.equals(files.length, 1, `Should have 1 file, got ${files.length}`)
    api.assert.ok(files.includes('index.mir'), 'Should have index.mir')
    api.assert.equals(parsed['index.mir'], '', 'index.mir should be empty')

    // Restore original state
    if (originalState) {
      localStorage.setItem('mirror-files', originalState)
    }
  }),

  test('EMPTY_PROJECT matches expected structure', async (api: TestAPI) => {
    const expected = { 'index.mir': '' }
    const actual = EMPTY_PROJECT

    api.assert.equals(
      JSON.stringify(actual),
      JSON.stringify(expected),
      'EMPTY_PROJECT should match expected structure'
    )
  }),
])

// =============================================================================
// Export All Tests
// =============================================================================

export const allEmptyProjectTests: TestCase[] = [
  ...emptyProjectConstantTests,
  ...emptyProjectStateTests,
  ...emptyProjectPreviewTests,
  ...emptyProjectStorageTests,
]

export default allEmptyProjectTests
