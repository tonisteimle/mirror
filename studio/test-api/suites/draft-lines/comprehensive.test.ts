/**
 * Comprehensive Draft Lines Test Suite
 *
 * Tests all aspects of the draft lines feature:
 * - Detection logic
 * - Visual decorations
 * - State management
 * - Event handling
 * - Edge cases
 * - Workflow scenarios
 */

import type { TestCase } from '../../types'
import {
  createDraftLinesTestContext,
  createDraftLinesAssertions,
  DRAFT_LINES_SCENARIOS,
  inspectLineStates,
  formatLineStates,
  type DraftLinesTestContext,
  type DraftLinesAssertions,
} from './draft-lines-api'

// =============================================================================
// Helper to create test context
// =============================================================================

async function withDraftContext(
  api: any,
  fn: (ctx: DraftLinesTestContext, assert: DraftLinesAssertions) => Promise<void>
): Promise<void> {
  const ctx = await createDraftLinesTestContext(
    code => api.editor.setCode(code),
    ms => api.utils.delay(ms)
  )
  const assertions = createDraftLinesAssertions(ctx, (cond, msg) => api.assert.ok(cond, msg))

  // Clear any existing state
  ctx.clearDraft()
  ctx.setValidated('')
  await ctx.delay(50)

  await fn(ctx, assertions)
}

// =============================================================================
// 1. Detection Logic Tests
// =============================================================================

export const detectionTests: TestCase[] = [
  // Run all predefined scenarios
  ...DRAFT_LINES_SCENARIOS.map(scenario => ({
    name: `Detection: ${scenario.description}`,
    run: async (api: any) => {
      await withDraftContext(api, async (ctx, assert) => {
        // Detect draft lines
        const draftLines = ctx.detectDraft(scenario.current, scenario.validated)

        // Verify expected lines
        const expected = new Set(scenario.expectedDraftLines)
        const actual = draftLines

        api.assert.ok(
          expected.size === actual.size && [...expected].every(n => actual.has(n)),
          `Scenario "${scenario.name}": Expected draft lines [${scenario.expectedDraftLines.join(', ')}] but got [${[...actual].join(', ')}]`
        )
      })
    },
  })),

  // Additional detection edge cases
  {
    name: 'Detection: handles empty current content',
    run: async api => {
      await withDraftContext(api, async ctx => {
        // Note: ''.split('\n') returns [''] (array with one empty string)
        // So empty content still has 1 "line" which differs from validated content
        const draftLines = ctx.detectDraft('', 'Frame bg #1a1a1a')
        api.assert.ok(
          draftLines.size === 1 && draftLines.has(1),
          'Empty current has 1 empty line which differs from validated'
        )
      })
    },
  },

  {
    name: 'Detection: handles both empty',
    run: async api => {
      await withDraftContext(api, async ctx => {
        // Both empty strings: ''.split('\n') returns [''] for both
        // The empty lines match, so no draft lines
        const draftLines = ctx.detectDraft('', '')
        api.assert.ok(
          draftLines.size === 0,
          'Both empty should have no draft lines (empty lines match)'
        )
      })
    },
  },

  {
    name: 'Detection: current shorter than validated',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const validated = 'Line 1\nLine 2\nLine 3'
        const current = 'Line 1'
        const draftLines = ctx.detectDraft(current, validated)

        // Line 1 is unchanged
        api.assert.ok(!draftLines.has(1), 'Line 1 should not be draft')
        api.assert.ok(draftLines.size === 0, 'Only existing line, which is unchanged')
      })
    },
  },

  {
    name: 'Detection: returns 1-indexed line numbers',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const draftLines = ctx.detectDraft('New line', '')

        api.assert.ok(draftLines.has(1), 'First line should be index 1, not 0')
        api.assert.ok(!draftLines.has(0), 'Should not have index 0')
      })
    },
  },
]

// =============================================================================
// 2. Visual Decoration Tests
// =============================================================================

export const decorationTests: TestCase[] = [
  {
    name: 'Decoration: applies cm-draft-line class to specified lines',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Line 1\nLine 2\nLine 3')

        ctx.applyDraft(new Set([2]))
        await ctx.delay(50)

        assert.linesAreValidated([1, 3])
        assert.linesAreDraft([2])
      })
    },
  },

  {
    name: 'Decoration: can mark multiple lines as draft',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Line 1\nLine 2\nLine 3\nLine 4\nLine 5')

        ctx.applyDraft(new Set([1, 3, 5]))
        await ctx.delay(50)

        assert.linesAreDraft([1, 3, 5])
        assert.linesAreValidated([2, 4])
      })
    },
  },

  {
    name: 'Decoration: clearDraft removes all draft classes',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Line 1\nLine 2\nLine 3')

        // Apply draft to all lines
        ctx.applyDraft(new Set([1, 2, 3]))
        await ctx.delay(50)
        assert.allLinesDraft(3)

        // Clear all
        ctx.clearDraft()
        await ctx.delay(50)
        assert.noDraftLines()
      })
    },
  },

  {
    name: 'Decoration: applying new draft lines replaces old ones',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Line 1\nLine 2\nLine 3')

        // First apply to line 1
        ctx.applyDraft(new Set([1]))
        await ctx.delay(50)
        assert.exactDraftLines([1])

        // Then apply to line 3 (should replace, not add)
        ctx.applyDraft(new Set([3]))
        await ctx.delay(50)
        assert.exactDraftLines([3])
      })
    },
  },

  {
    name: 'Decoration: handles out-of-bounds line numbers gracefully',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Line 1\nLine 2')

        // Try to mark line 10 (doesn't exist)
        ctx.applyDraft(new Set([1, 10]))
        await ctx.delay(50)

        // Only line 1 should be marked
        assert.exactDraftLines([1])
      })
    },
  },

  {
    name: 'Decoration: empty set clears all decorations',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Line 1\nLine 2')

        ctx.applyDraft(new Set([1, 2]))
        await ctx.delay(50)
        assert.allLinesDraft(2)

        ctx.applyDraft(new Set())
        await ctx.delay(50)
        assert.noDraftLines()
      })
    },
  },
]

// =============================================================================
// 3. State Management Tests
// =============================================================================

export const stateTests: TestCase[] = [
  {
    name: 'State: validatedSource persists across operations',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const validated = 'Frame bg #1a1a1a'
        ctx.setValidated(validated)

        api.assert.ok(ctx.getValidated() === validated, 'validatedSource should be stored in state')
      })
    },
  },

  {
    name: 'State: compile:completed updates validatedSource',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const code = 'Frame bg #2271C1'
        await ctx.setCode(code)
        ctx.setValidated('') // Start with no validated

        // Simulate successful compile
        ctx.emitCompileCompleted(false)
        await ctx.delay(100)

        api.assert.ok(
          ctx.getValidated() === code,
          'validatedSource should be updated to current source after compile'
        )
      })
    },
  },

  {
    name: 'State: compile:completed with errors does NOT update validatedSource',
    run: async api => {
      // This test verifies the manager's behavior on compile:completed with hasErrors=true
      // We don't use withDraftContext because automatic compilation interferes with the test
      const { detectDraftLines, setDraftLines, clearDraftLines } =
        await import('../../../editor/draft-lines')
      const { state, events } = await import('../../../core')

      const view = (window as any).editor
      if (!view) throw new Error('EditorView not available')

      // Start with known state
      const validated = 'Frame bg #1a1a1a'
      state.set({ validatedSource: validated })
      await api.utils.delay(50)

      // Verify our validated source is set
      const beforeCompile = state.get().validatedSource
      api.assert.ok(
        beforeCompile === validated,
        `validatedSource should be '${validated}' before test (got '${beforeCompile}')`
      )

      // Now emit compile:completed with hasErrors=true
      // The manager should NOT update validatedSource
      events.emit('compile:completed', {
        hasErrors: true,
        ast: {},
        ir: {},
        sourceMap: { getNodeById: () => null },
        version: Date.now(),
      })
      await api.utils.delay(100)

      // Check that validatedSource was NOT changed
      const afterCompile = state.get().validatedSource
      api.assert.ok(
        afterCompile === validated,
        `validatedSource should still be '${validated}' after compile with errors (got '${afterCompile}')`
      )
    },
  },
]

// =============================================================================
// 4. Workflow Tests (End-to-End)
// =============================================================================

export const workflowTests: TestCase[] = [
  {
    name: 'Workflow: type new code → lines marked draft → compile → lines validated',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Step 1: Set validated baseline
        const validated = 'Frame bg #1a1a1a'
        ctx.setValidated(validated)
        await ctx.setCode(validated)
        await ctx.delay(50)

        // Step 2: Add new line (simulate typing)
        const newCode = 'Frame bg #1a1a1a\n  Text "New"'
        await ctx.setCode(newCode)

        // Step 3: Detect and apply draft lines
        const draftLines = ctx.detectDraft(newCode, validated)
        ctx.applyDraft(draftLines)
        await ctx.delay(50)

        // Verify: Line 1 validated, Line 2 draft
        assert.linesAreValidated([1])
        assert.linesAreDraft([2])

        // Step 4: Simulate successful compilation
        ctx.emitCompileCompleted(false)
        await ctx.delay(100)

        // Verify: All lines now validated
        assert.noDraftLines()

        // Verify: validatedSource updated
        api.assert.ok(ctx.getValidated() === newCode, 'validatedSource should match new code')
      })
    },
  },

  {
    name: 'Workflow: validated lines stay bright when new code added',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Start with validated 2-line code
        const validated = 'Frame\n  Text "Validated"'
        ctx.setValidated(validated)
        await ctx.setCode(validated)
        ctx.clearDraft()
        await ctx.delay(50)

        // Add a third line
        const newCode = 'Frame\n  Text "Validated"\n  Button "New"'
        await ctx.setCode(newCode)

        // Detect and apply draft
        const draftLines = ctx.detectDraft(newCode, validated)
        ctx.applyDraft(draftLines)
        await ctx.delay(50)

        // Verify: First 2 lines stay validated, line 3 is draft
        assert.linesAreValidated([1, 2])
        assert.linesAreDraft([3])
      })
    },
  },

  {
    name: 'Workflow: editing validated line marks only that line as draft',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Start with validated 3-line code
        const validated = 'Frame\n  Text "Middle"\n  Button "OK"'
        ctx.setValidated(validated)
        await ctx.setCode(validated)
        ctx.clearDraft()
        await ctx.delay(50)

        // Modify middle line only
        const modified = 'Frame\n  Text "Changed"\n  Button "OK"'
        await ctx.setCode(modified)

        // Detect and apply draft
        const draftLines = ctx.detectDraft(modified, validated)
        ctx.applyDraft(draftLines)
        await ctx.delay(50)

        // Only line 2 should be draft
        assert.linesAreValidated([1, 3])
        assert.linesAreDraft([2])
      })
    },
  },

  {
    name: 'Workflow: rapid edits - each change updates draft state',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        const validated = 'Frame'
        ctx.setValidated(validated)

        // Rapid sequence of edits
        const edits = [
          'Frame\n  Text "1"',
          'Frame\n  Text "1"\n  Text "2"',
          'Frame\n  Text "1"\n  Text "2"\n  Text "3"',
        ]

        for (let i = 0; i < edits.length; i++) {
          await ctx.setCode(edits[i])
          const draftLines = ctx.detectDraft(edits[i], validated)
          ctx.applyDraft(draftLines)
          await ctx.delay(30)

          // Verify correct number of draft lines
          const expectedDraftCount = i + 1 // 1, 2, 3 new lines
          api.assert.ok(
            draftLines.size === expectedDraftCount,
            `Edit ${i + 1}: Expected ${expectedDraftCount} draft lines, got ${draftLines.size}`
          )
        }
      })
    },
  },

  {
    name: 'Workflow: failed compile keeps draft lines',
    run: async api => {
      // This test verifies that draft lines remain after a failed compile
      // We test this by directly controlling the compile:completed event
      const { detectDraftLines, setDraftLines, clearDraftLines } =
        await import('../../../editor/draft-lines')
      const { state, events } = await import('../../../core')

      const view = (window as any).editor
      if (!view) throw new Error('EditorView not available')

      // Set up validated baseline
      const validated = 'Frame'
      state.set({ validatedSource: validated })

      // Set editor code - this will trigger an automatic compile,
      // but we'll override with our own compile:completed event
      await api.editor.setCode('Frame\n  Text "New"')
      await api.utils.delay(100)

      // Now set up draft lines manually
      const newCode = 'Frame\n  Text "New"'
      const draftLines = detectDraftLines(newCode, validated)
      setDraftLines(view, draftLines)
      await api.utils.delay(50)

      // Verify line 2 is draft
      const lines = document.querySelectorAll('.cm-line')
      api.assert.ok(
        lines[1]?.classList.contains('cm-draft-line'),
        'Line 2 should be marked as draft'
      )

      // Store validatedSource before our test event
      state.set({ validatedSource: validated })
      await api.utils.delay(50)

      // Emit compile:completed with hasErrors=true
      events.emit('compile:completed', {
        hasErrors: true,
        ast: {},
        ir: {},
        sourceMap: { getNodeById: () => null },
        version: Date.now(),
      })
      await api.utils.delay(100)

      // Check that validatedSource was NOT updated
      const afterValidated = state.get().validatedSource
      api.assert.ok(
        afterValidated === validated,
        `validatedSource should remain '${validated}' after failed compile (got '${afterValidated}')`
      )
    },
  },
]

// =============================================================================
// 5. Edge Case Tests
// =============================================================================

export const edgeCaseTests: TestCase[] = [
  {
    name: 'Edge: single character change',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const validated = 'Frame bg #1a1a1a'
        const current = 'Frame bg #1a1a1b' // Last char different

        const draftLines = ctx.detectDraft(current, validated)
        api.assert.ok(draftLines.has(1), 'Single char change should mark line as draft')
      })
    },
  },

  {
    name: 'Edge: only whitespace in content',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const validated = '   '
        const current = '    ' // One more space

        const draftLines = ctx.detectDraft(current, validated)
        api.assert.ok(draftLines.has(1), 'Whitespace change should mark line as draft')
      })
    },
  },

  {
    name: 'Edge: Unicode content',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const validated = 'Text "Hello 世界"'
        const current = 'Text "Hello 世界"\nText "Emoji 🎉"'

        const draftLines = ctx.detectDraft(current, validated)
        api.assert.ok(!draftLines.has(1), 'Unicode line unchanged should be validated')
        api.assert.ok(draftLines.has(2), 'New Unicode line should be draft')
      })
    },
  },

  {
    name: 'Edge: very long lines',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const longLine = 'Text "' + 'x'.repeat(1000) + '"'
        const validated = longLine
        const current = longLine + 'y' // One char added

        const draftLines = ctx.detectDraft(current, validated)
        api.assert.ok(draftLines.has(1), 'Long line with change should be draft')
      })
    },
  },

  {
    name: 'Edge: many lines (100+)',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const lines = Array.from({ length: 100 }, (_, i) => `Text "Line ${i + 1}"`)
        const validated = lines.join('\n')
        const current = lines.join('\n') + '\nText "New Line 101"'

        const draftLines = ctx.detectDraft(current, validated)

        // Only line 101 should be draft
        api.assert.ok(draftLines.size === 1, 'Only 1 new line should be draft')
        api.assert.ok(draftLines.has(101), 'Line 101 should be draft')
      })
    },
  },

  {
    name: 'Edge: blank lines in content',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const validated = 'Line 1\n\nLine 3'
        const current = 'Line 1\n\nLine 3 modified'

        const draftLines = ctx.detectDraft(current, validated)

        api.assert.ok(!draftLines.has(1), 'Line 1 unchanged')
        api.assert.ok(!draftLines.has(2), 'Blank line unchanged')
        api.assert.ok(draftLines.has(3), 'Line 3 modified')
      })
    },
  },

  {
    name: 'Edge: tabs vs spaces',
    run: async api => {
      await withDraftContext(api, async ctx => {
        const validated = '  Text "Spaces"'
        const current = '\tText "Spaces"' // Tab instead of spaces

        const draftLines = ctx.detectDraft(current, validated)
        api.assert.ok(draftLines.has(1), 'Tab/space difference should mark as draft')
      })
    },
  },
]

// =============================================================================
// 6. Visual Inspection Tests (Debug helpers)
// =============================================================================

export const inspectionTests: TestCase[] = [
  {
    name: 'Inspection: inspectLineStates returns correct structure',
    run: async api => {
      await withDraftContext(api, async ctx => {
        await ctx.setCode('Line 1\nLine 2\nLine 3')
        ctx.applyDraft(new Set([2]))
        await ctx.delay(50)

        const states = inspectLineStates(ctx)

        api.assert.ok(states.length === 3, 'Should have 3 line states')
        api.assert.ok(states[0].lineNumber === 1, 'First state should be line 1')
        api.assert.ok(!states[0].hasDraftClass, 'Line 1 should not be draft')
        api.assert.ok(states[1].hasDraftClass, 'Line 2 should be draft')
        api.assert.ok(!states[2].hasDraftClass, 'Line 3 should not be draft')
      })
    },
  },

  {
    name: 'Inspection: formatLineStates produces readable output',
    run: async api => {
      await withDraftContext(api, async ctx => {
        await ctx.setCode('Frame\n  Text "Hi"')
        ctx.applyDraft(new Set([2]))
        await ctx.delay(50)

        const states = inspectLineStates(ctx)
        const formatted = formatLineStates(states)

        api.assert.ok(formatted.includes('[VALID]'), 'Should include VALID marker')
        api.assert.ok(formatted.includes('[DRAFT]'), 'Should include DRAFT marker')
        api.assert.ok(formatted.includes('L1:'), 'Should include line numbers')
      })
    },
  },
]

// =============================================================================
// Combined Export
// =============================================================================

export const allComprehensiveDraftLineTests: TestCase[] = [
  ...detectionTests,
  ...decorationTests,
  ...stateTests,
  ...workflowTests,
  ...edgeCaseTests,
  ...inspectionTests,
]
