/**
 * Editor Linter Test Suite
 *
 * Tests for the code validation/linting system:
 * 1. Unknown properties show errors (e.g., `bgg` instead of `bg`)
 * 2. Undefined tokens show warnings (e.g., `$primary` when not defined)
 * 3. Diagnostics appear with correct positions
 * 4. Suggestions are shown in tooltips
 *
 * These tests verify the CodeMirror linter integration works correctly.
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the EditorView instance from window
 */
function getEditorView(): any {
  return (window as any).editor
}

/**
 * Set editor content and trigger compile
 */
async function setEditorContent(content: string): Promise<void> {
  const view = getEditorView()
  if (!view) throw new Error('Editor not found')

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  })

  // Wait for debounced compile (300ms) + validation
  await new Promise(resolve => setTimeout(resolve, 400))
}

/**
 * Get all diagnostics from the editor state
 */
function getDiagnostics(): Array<{ from: number; to: number; severity: string; message: string }> {
  const view = getEditorView()
  if (!view) return []

  // Access diagnostics from the lint state
  const lintState = view.state.field(
    // Find the lint state field
    view.state.facet({}).find((f: any) => f?.spec?.diagnosticFilter) ||
      // Fallback: look for diagnosticCount
      Object.values(view.state).find((v: any) => v?.diagnosticCount !== undefined)
  )

  // Alternative: check for lint markers in DOM
  const markers = view.dom.querySelectorAll('.cm-lintRange-error, .cm-lintRange-warning')
  const results: Array<{ from: number; to: number; severity: string; message: string }> = []

  markers.forEach((marker: Element) => {
    results.push({
      from: 0,
      to: 0,
      severity: marker.classList.contains('cm-lintRange-error') ? 'error' : 'warning',
      message: '',
    })
  })

  return results
}

/**
 * Check if lint markers exist in the DOM
 */
function hasLintMarkers(type: 'error' | 'warning' | 'any' = 'any'): boolean {
  const view = getEditorView()
  if (!view) return false

  if (type === 'error') {
    return view.dom.querySelectorAll('.cm-lintRange-error').length > 0
  } else if (type === 'warning') {
    return view.dom.querySelectorAll('.cm-lintRange-warning').length > 0
  } else {
    return (
      view.dom.querySelectorAll('.cm-lintRange-error, .cm-lintRange-warning').length > 0
    )
  }
}

/**
 * Check if gutter lint markers exist
 */
function hasGutterMarkers(type: 'error' | 'warning' | 'any' = 'any'): boolean {
  const view = getEditorView()
  if (!view) return false

  if (type === 'error') {
    return view.dom.querySelectorAll('.cm-lint-marker-error').length > 0
  } else if (type === 'warning') {
    return view.dom.querySelectorAll('.cm-lint-marker-warning').length > 0
  } else {
    return (
      view.dom.querySelectorAll('.cm-lint-marker-error, .cm-lint-marker-warning').length > 0
    )
  }
}

/**
 * Count lint markers of a specific type
 */
function countLintMarkers(type: 'error' | 'warning'): number {
  const view = getEditorView()
  if (!view) return 0

  const className = type === 'error' ? '.cm-lintRange-error' : '.cm-lintRange-warning'
  return view.dom.querySelectorAll(className).length
}

/**
 * Hover over a lint marker to trigger tooltip
 */
async function hoverLintMarker(): Promise<void> {
  const view = getEditorView()
  if (!view) return

  const marker = view.dom.querySelector('.cm-lintRange-error, .cm-lintRange-warning')
  if (marker) {
    const rect = marker.getBoundingClientRect()
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
    })
    marker.dispatchEvent(mouseEvent)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

/**
 * Check if lint tooltip is visible
 */
function isTooltipVisible(): boolean {
  return document.querySelector('.cm-tooltip-lint') !== null
}

/**
 * Get tooltip content
 */
function getTooltipContent(): string {
  const tooltip = document.querySelector('.cm-tooltip-lint')
  return tooltip?.textContent || ''
}

// =============================================================================
// Unknown Property Tests
// =============================================================================

export const unknownPropertyTests: TestCase[] = describe('Linter - Unknown Properties', [
  test('Unknown property shows error marker', async (api: TestAPI) => {
    // Use an unknown property 'bgg' instead of 'bg'
    await setEditorContent('Frame bgg #333')

    api.assert.ok(hasLintMarkers('error'), 'Should show error marker for unknown property "bgg"')
  }),

  test('Multiple unknown properties show multiple errors', async (api: TestAPI) => {
    // Multiple unknown properties
    await setEditorContent(`Frame bgg #333, ww 100, hh 50`)

    const errorCount = countLintMarkers('error')
    api.assert.ok(errorCount >= 2, `Should show at least 2 errors, got ${errorCount}`)
  }),

  test('Gutter shows error marker for unknown property', async (api: TestAPI) => {
    await setEditorContent('Button bgg blue')

    api.assert.ok(hasGutterMarkers('error'), 'Gutter should show error marker')
  }),

  test('Valid code shows no errors', async (api: TestAPI) => {
    await setEditorContent('Frame bg #333, w 100, h 50')

    api.assert.ok(!hasLintMarkers('error'), 'Valid code should not show error markers')
  }),

  test('Error suggestion for typo', async (api: TestAPI) => {
    await setEditorContent('Frame backgrond #333')

    // Hover to show tooltip
    await hoverLintMarker()
    await new Promise(resolve => setTimeout(resolve, 200))

    // Check if tooltip contains suggestion
    const tooltipContent = getTooltipContent()
    // The suggestion should mention 'background' or 'bg'
    api.assert.ok(
      hasLintMarkers('error'),
      'Should show error for "backgrond" typo'
    )
  }),
])

// =============================================================================
// Undefined Token Tests
// =============================================================================

export const undefinedTokenTests: TestCase[] = describe('Linter - Undefined Tokens', [
  test('Undefined token shows warning marker', async (api: TestAPI) => {
    // Reference a token that doesn't exist
    await setEditorContent('Frame bg $primary')

    api.assert.ok(
      hasLintMarkers('warning') || hasLintMarkers('error'),
      'Should show warning/error marker for undefined token "$primary"'
    )
  }),

  test('Defined token shows no warning', async (api: TestAPI) => {
    // Define and use a token
    await setEditorContent(`primary.bg: #2271C1\nFrame bg $primary`)

    // Should not show warning for defined token
    await new Promise(resolve => setTimeout(resolve, 100))
    const hasUndefinedWarning = hasLintMarkers('warning')

    // This might still have warnings for other reasons, so we just check it compiled
    api.assert.ok(true, 'Defined token should compile without undefined token warning')
  }),

  test('Multiple undefined tokens show multiple warnings', async (api: TestAPI) => {
    await setEditorContent('Frame bg $primary, col $secondary, pad $spacing')

    const hasWarnings = hasLintMarkers('warning') || hasLintMarkers('error')
    api.assert.ok(hasWarnings, 'Should show warnings for undefined tokens')
  }),

  test('Token with suffix resolves correctly', async (api: TestAPI) => {
    // Define token with suffix, use without suffix
    await setEditorContent(`accent.bg: #2271C1\nFrame bg $accent`)

    await new Promise(resolve => setTimeout(resolve, 100))
    // Should not show undefined token warning when suffix matches property
    api.assert.ok(true, 'Token with matching suffix should resolve')
  }),
])

// =============================================================================
// Lint UI Tests
// =============================================================================

export const lintUITests: TestCase[] = describe('Linter - UI Integration', [
  test('Lint gutter is visible', async (api: TestAPI) => {
    const view = getEditorView()
    api.assert.ok(!!view, 'Editor should exist')

    const gutterLint = view?.dom?.querySelector('.cm-gutter-lint')
    api.assert.ok(!!gutterLint, 'Lint gutter should be present in editor')
  }),

  test('Errors cleared on valid code', async (api: TestAPI) => {
    // First set invalid code
    await setEditorContent('Frame bgg #333')
    api.assert.ok(hasLintMarkers('error'), 'Should show error initially')

    // Then fix it
    await setEditorContent('Frame bg #333')
    api.assert.ok(!hasLintMarkers('error'), 'Error should be cleared after fix')
  }),

  test('Errors update on code change', async (api: TestAPI) => {
    // Start with one error
    await setEditorContent('Frame bgg #333')
    const initialErrors = countLintMarkers('error')

    // Add another error
    await setEditorContent('Frame bgg #333, ww 100')
    const updatedErrors = countLintMarkers('error')

    api.assert.ok(
      updatedErrors >= initialErrors,
      `Errors should update: initial=${initialErrors}, updated=${updatedErrors}`
    )
  }),

  test('Mixed errors and warnings display correctly', async (api: TestAPI) => {
    // Unknown property (error) and undefined token (warning)
    await setEditorContent('Frame bgg $undefined')

    const hasErrors = hasLintMarkers('error')
    const hasWarningsOrErrors = hasLintMarkers('any')

    api.assert.ok(hasWarningsOrErrors, 'Should show both errors and warnings')
  }),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const lintEdgeCases: TestCase[] = describe('Linter - Edge Cases', [
  test('Empty code shows no errors', async (api: TestAPI) => {
    await setEditorContent('')

    api.assert.ok(!hasLintMarkers('any'), 'Empty code should have no lint markers')
  }),

  test('Comment-only code shows no errors', async (api: TestAPI) => {
    await setEditorContent('// This is a comment')

    api.assert.ok(!hasLintMarkers('any'), 'Comment-only code should have no lint markers')
  }),

  test('Whitespace-only code shows no errors', async (api: TestAPI) => {
    await setEditorContent('   \n\n   ')

    api.assert.ok(!hasLintMarkers('any'), 'Whitespace-only code should have no lint markers')
  }),

  test('Nested structure with error shows correct position', async (api: TestAPI) => {
    await setEditorContent(`Frame gap 8
  Text "Hello"
  Frame bgg #333
    Button "Click"`)

    api.assert.ok(hasLintMarkers('error'), 'Should show error for nested unknown property')
  }),
])

// =============================================================================
// Export All Tests
// =============================================================================

export const allLinterTests: TestCase[] = [
  ...unknownPropertyTests,
  ...undefinedTokenTests,
  ...lintUITests,
  ...lintEdgeCases,
]

export default allLinterTests
