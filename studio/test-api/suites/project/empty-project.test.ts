/**
 * Empty Project Tests
 *
 * The empty-project template has four files (one per editor tab):
 *   data.data / tokens.tok / components.com / app.mir
 * All start as empty strings — content lives in DEFAULT_PROJECT (the
 * demo). These tests assert that EMPTY_PROJECT actually has those four
 * empty slots and that the runtime state matches when the editor is
 * cleared.
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { EMPTY_PROJECT, DEFAULT_PROJECT } from '../../../storage/project-actions'

const EXPECTED_FILES = ['data.data', 'tokens.tok', 'components.com', 'app.mir'] as const

// =============================================================================
// Helper Functions
// =============================================================================

function simulateEmptyProject(): void {
  localStorage.setItem('mirror-files', JSON.stringify(EMPTY_PROJECT))
}

async function clearEditor(api: TestAPI): Promise<void> {
  await api.editor.setCode('')
  await api.utils.delay(100)
}

// =============================================================================
// EMPTY_PROJECT Constant Tests
// =============================================================================

export const emptyProjectConstantTests: TestCase[] = describe('Empty Project - Constants', [
  test('EMPTY_PROJECT contains the four canonical files', async (api: TestAPI) => {
    const fileNames = Object.keys(EMPTY_PROJECT).sort()
    const expected = [...EXPECTED_FILES].sort()
    api.assert.equals(
      JSON.stringify(fileNames),
      JSON.stringify(expected),
      `EMPTY_PROJECT should be exactly ${expected.join(',')}`
    )
  }),

  test('EMPTY_PROJECT files are all empty strings', async (api: TestAPI) => {
    for (const file of EXPECTED_FILES) {
      api.assert.equals(EMPTY_PROJECT[file], '', `${file} should be empty`)
    }
  }),

  test('EMPTY_PROJECT exposes a tokens slot', async (api: TestAPI) => {
    api.assert.ok('tokens.tok' in EMPTY_PROJECT, 'tokens.tok slot must exist')
  }),

  test('EMPTY_PROJECT exposes a components slot', async (api: TestAPI) => {
    api.assert.ok('components.com' in EMPTY_PROJECT, 'components.com slot must exist')
  }),

  test('EMPTY_PROJECT exposes a data slot', async (api: TestAPI) => {
    api.assert.ok('data.data' in EMPTY_PROJECT, 'data.data slot must exist')
  }),

  test('DEFAULT_PROJECT app.mir has more content than EMPTY_PROJECT', async (api: TestAPI) => {
    const emptyApp = EMPTY_PROJECT['app.mir'] ?? ''
    const defaultApp = DEFAULT_PROJECT['app.mir'] ?? ''
    api.assert.ok(
      defaultApp.length > emptyApp.length,
      `Default app.mir (${defaultApp.length} chars) must exceed empty (${emptyApp.length})`
    )
  }),
])

// =============================================================================
// Runtime Empty State Tests
// =============================================================================

export const emptyProjectStateTests: TestCase[] = describe('Empty Project - Runtime State', [
  test('Empty editor compiles cleanly', async (api: TestAPI) => {
    await clearEditor(api)

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
  test('simulateEmptyProject writes the four-file structure to localStorage', async (api: TestAPI) => {
    const originalState = localStorage.getItem('mirror-files')

    simulateEmptyProject()

    const stored = localStorage.getItem('mirror-files')
    api.assert.ok(stored !== null, 'localStorage should have mirror-files')

    const parsed = JSON.parse(stored!)
    const files = Object.keys(parsed).sort()
    const expected = [...EXPECTED_FILES].sort()

    api.assert.equals(
      JSON.stringify(files),
      JSON.stringify(expected),
      `Should have ${expected.join(',')}, got ${files.join(',')}`
    )
    for (const file of EXPECTED_FILES) {
      api.assert.equals(parsed[file], '', `${file} should be empty in storage`)
    }

    if (originalState) {
      localStorage.setItem('mirror-files', originalState)
    }
  }),

  test('EMPTY_PROJECT matches the four-file empty structure', async (api: TestAPI) => {
    const expected: Record<string, string> = {
      'data.data': '',
      'tokens.tok': '',
      'components.com': '',
      'app.mir': '',
    }
    api.assert.equals(
      JSON.stringify(EMPTY_PROJECT),
      JSON.stringify(expected),
      'EMPTY_PROJECT should match the four-file empty structure'
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
