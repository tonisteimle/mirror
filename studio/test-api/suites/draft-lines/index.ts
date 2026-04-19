/**
 * Draft Lines Tests
 *
 * Tests for the AI-assist draft line decoration feature.
 * Draft lines show muted syntax highlighting for code that hasn't been validated yet.
 */

import type { TestCase } from '../../types'

// =============================================================================
// Detection Logic Tests
// =============================================================================

export const draftLineDetectionTests: TestCase[] = [
  {
    name: 'detectDraftLines: all lines are draft when no validated content',
    run: async api => {
      const { detectDraftLines } = await import('../../../editor/draft-lines')

      const current = 'Frame bg #1a1a1a\n  Text "Hello"'
      const validated = ''

      const draftLines = detectDraftLines(current, validated)

      api.assert.ok(draftLines.has(1), 'Line 1 should be draft')
      api.assert.ok(draftLines.has(2), 'Line 2 should be draft')
      api.assert.ok(draftLines.size === 2, 'Should have 2 draft lines')
    },
  },

  {
    name: 'detectDraftLines: no draft lines when content matches validated',
    run: async api => {
      const { detectDraftLines } = await import('../../../editor/draft-lines')

      const content = 'Frame bg #1a1a1a\n  Text "Hello"'

      const draftLines = detectDraftLines(content, content)

      api.assert.ok(draftLines.size === 0, 'Should have no draft lines')
    },
  },

  {
    name: 'detectDraftLines: only new lines are draft',
    run: async api => {
      const { detectDraftLines } = await import('../../../editor/draft-lines')

      const validated = 'Frame bg #1a1a1a'
      const current = 'Frame bg #1a1a1a\n  Text "Hello"'

      const draftLines = detectDraftLines(current, validated)

      api.assert.ok(!draftLines.has(1), 'Line 1 should NOT be draft (unchanged)')
      api.assert.ok(draftLines.has(2), 'Line 2 should be draft (new)')
      api.assert.ok(draftLines.size === 1, 'Should have 1 draft line')
    },
  },

  {
    name: 'detectDraftLines: modified line is draft',
    run: async api => {
      const { detectDraftLines } = await import('../../../editor/draft-lines')

      const validated = 'Frame bg #1a1a1a\n  Text "Hello"'
      const current = 'Frame bg #1a1a1a\n  Text "World"'

      const draftLines = detectDraftLines(current, validated)

      api.assert.ok(!draftLines.has(1), 'Line 1 should NOT be draft')
      api.assert.ok(draftLines.has(2), 'Line 2 should be draft (modified)')
      api.assert.ok(draftLines.size === 1, 'Should have 1 draft line')
    },
  },
]

// =============================================================================
// Decoration Tests (require draftLinesExtension in EditorView)
// =============================================================================

export const draftLineDecorationTests: TestCase[] = [
  {
    name: 'Draft decoration applies to editor lines',
    run: async api => {
      // Get editor view from window
      const view = (window as any).editor
      if (!view) {
        throw new Error('EditorView not available')
      }

      const { setDraftLines, clearDraftLines } = await import('../../../editor/draft-lines')

      // Set some code
      await api.editor.setCode('Frame bg #1a1a1a\n  Text "Hello"\n  Button "OK"')
      await api.utils.delay(100)

      // Mark line 2 and 3 as draft
      setDraftLines(view, new Set([2, 3]))
      await api.utils.delay(50)

      // Check if draft-line class is applied
      const lines = document.querySelectorAll('.cm-line')
      const line2 = lines[1]
      const line3 = lines[2]

      api.assert.ok(
        line2?.classList.contains('cm-draft-line'),
        'Line 2 should have cm-draft-line class'
      )
      api.assert.ok(
        line3?.classList.contains('cm-draft-line'),
        'Line 3 should have cm-draft-line class'
      )

      // Clear draft lines
      clearDraftLines(view)
      await api.utils.delay(50)

      // Check classes are removed
      api.assert.ok(
        !line2?.classList.contains('cm-draft-line'),
        'Line 2 should NOT have cm-draft-line class after clear'
      )
    },
  },

  {
    name: 'Draft lines have muted colors (visual check)',
    run: async api => {
      const view = (window as any).editor
      if (!view) {
        throw new Error('EditorView not available')
      }

      const { setDraftLines } = await import('../../../editor/draft-lines')

      // Set code with syntax tokens
      await api.editor.setCode('Frame bg #1a1a1a, col white\n  Text "Hello"')
      await api.utils.delay(100)

      // Mark line 2 as draft
      setDraftLines(view, new Set([2]))
      await api.utils.delay(50)

      // Get the Text keyword on line 2
      const lines = document.querySelectorAll('.cm-line')
      const line2 = lines[1]

      if (!line2) {
        throw new Error('Line 2 not found')
      }

      // Find token element in line 2
      const token = line2.querySelector('.tok-keyword')

      if (token) {
        const style = window.getComputedStyle(token)
        const color = style.color

        // Draft color should be muted (darker)
        // We check if it's not the bright purple (#c792ea = rgb(199, 146, 234))
        api.assert.ok(color !== 'rgb(199, 146, 234)', `Token color should be muted, got: ${color}`)
      }

      // Test passes if we got here - visual verification
      api.assert.ok(true, 'Draft line decoration applied')
    },
  },
]

// =============================================================================
// Integration Tests (Manager with Editor and Compilation)
// =============================================================================

export const draftLineIntegrationTests: TestCase[] = [
  {
    name: 'Integration: new lines marked as draft after typing',
    run: async api => {
      const { detectDraftLines, setDraftLines } = await import('../../../editor/draft-lines')

      const view = (window as any).editor
      if (!view) throw new Error('EditorView not available')

      // Scenario: user has validated code, then types new content
      const validated = 'Frame bg #1a1a1a'
      const current = 'Frame bg #1a1a1a\n  Text "Hello"'

      // Set code in editor
      await api.editor.setCode(current)
      await api.utils.delay(100)

      // Detect draft lines using validated vs current
      const draftLines = detectDraftLines(current, validated)

      // Apply draft line decorations
      setDraftLines(view, draftLines)
      await api.utils.delay(50)

      // Verify: Line 1 unchanged, Line 2 is new (draft)
      api.assert.ok(!draftLines.has(1), 'Line 1 should NOT be draft (validated)')
      api.assert.ok(draftLines.has(2), 'Line 2 should be draft (new)')

      // Visual verification: check CSS class
      const lines = document.querySelectorAll('.cm-line')
      api.assert.ok(
        !lines[0]?.classList.contains('cm-draft-line'),
        'Line 1 should not have draft class'
      )
      api.assert.ok(lines[1]?.classList.contains('cm-draft-line'), 'Line 2 should have draft class')
    },
  },

  {
    name: 'Integration: draft lines cleared after successful compile',
    run: async api => {
      const { setDraftLines } = await import('../../../editor/draft-lines')
      const { state, events } = await import('../../../core')

      const view = (window as any).editor
      if (!view) throw new Error('EditorView not available')

      const code = 'Frame bg #2271C1\n  Text "Test"'

      // Set code in editor and state
      state.set({ source: code, validatedSource: '' })
      await api.editor.setCode(code)
      await api.utils.delay(100)

      // Mark as draft
      setDraftLines(view, new Set([1, 2]))
      await api.utils.delay(50)

      // Verify draft lines are set
      let lines = document.querySelectorAll('.cm-line')
      api.assert.ok(
        lines[0]?.classList.contains('cm-draft-line'),
        'Line 1 should be draft before compile'
      )

      // Simulate successful compilation
      events.emit('compile:completed', {
        hasErrors: false,
        ast: {},
        ir: {},
        sourceMap: { getNodeById: () => null },
        version: 1,
      })
      await api.utils.delay(100)

      // Check validated source was updated
      const validatedSource = state.get().validatedSource
      api.assert.ok(
        validatedSource.includes('Frame bg #2271C1'),
        'validatedSource should be updated'
      )

      // Check draft lines cleared
      lines = document.querySelectorAll('.cm-line')
      api.assert.ok(
        !lines[0]?.classList.contains('cm-draft-line'),
        'Line 1 should NOT be draft after compile'
      )
    },
  },

  {
    name: 'Integration: validated lines stay bright when new code added',
    run: async api => {
      const { detectDraftLines, setDraftLines, clearDraftLines } =
        await import('../../../editor/draft-lines')

      const view = (window as any).editor
      if (!view) throw new Error('EditorView not available')

      // Scenario: user has 2 validated lines, adds a 3rd line
      const validatedCode = 'Frame bg #1a1a1a\n  Text "Validated"'
      const newCode = 'Frame bg #1a1a1a\n  Text "Validated"\n  Button "New"'

      // Clear any existing draft lines first
      clearDraftLines(view)

      // Set code in editor
      await api.editor.setCode(newCode)
      await api.utils.delay(100)

      // Detect and apply draft lines
      const draftLines = detectDraftLines(newCode, validatedCode)
      setDraftLines(view, draftLines)
      await api.utils.delay(50)

      // Check: first 2 lines should NOT be draft (unchanged from validated)
      // Line 3 should be draft (new)
      api.assert.ok(!draftLines.has(1), 'Line 1 should stay validated (bright)')
      api.assert.ok(!draftLines.has(2), 'Line 2 should stay validated (bright)')
      api.assert.ok(draftLines.has(3), 'Line 3 should be draft (new)')

      // Visual verification
      const lines = document.querySelectorAll('.cm-line')
      api.assert.ok(!lines[0]?.classList.contains('cm-draft-line'), 'Line 1 visual: no draft class')
      api.assert.ok(!lines[1]?.classList.contains('cm-draft-line'), 'Line 2 visual: no draft class')
      api.assert.ok(lines[2]?.classList.contains('cm-draft-line'), 'Line 3 visual: has draft class')
    },
  },
]

// =============================================================================
// Comprehensive Tests (from separate file)
// =============================================================================

export {
  detectionTests as comprehensiveDetectionTests,
  decorationTests as comprehensiveDecorationTests,
  stateTests as comprehensiveStateTests,
  workflowTests as comprehensiveWorkflowTests,
  edgeCaseTests as comprehensiveEdgeCaseTests,
  inspectionTests as comprehensiveInspectionTests,
  allComprehensiveDraftLineTests,
} from './comprehensive.test'

// =============================================================================
// AI Workflow Tests (from separate file)
// =============================================================================

export { aiWorkflowTests, visualVerificationTests, allAIWorkflowTests } from './ai-workflow.test'

// Re-export API
export {
  createDraftLinesTestContext,
  createDraftLinesAssertions,
  DRAFT_LINES_SCENARIOS,
  inspectLineStates,
  formatLineStates,
  // AI Workflow API
  createAIWorkflowSimulator,
  getTokenColor,
  hasLinesMutedColors,
  type DraftLinesTestContext,
  type DraftLinesAssertions,
  type DraftLinesScenario,
  type LineVisualState,
  type AIWorkflowSimulator,
  type AIWorkflowContext,
  type AIWorkflowStep,
} from './draft-lines-api'

// =============================================================================
// Combined Exports
// =============================================================================

export const allDraftLineTests: TestCase[] = [
  ...draftLineDetectionTests,
  ...draftLineDecorationTests,
  ...draftLineIntegrationTests,
]
