/**
 * AI Correction Workflow Tests
 *
 * Tests the complete AI-assisted editing workflow:
 * 1. User writes code → appears muted (draft)
 * 2. AI validates/corrects → code becomes bright (validated)
 * 3. User writes more code → only new code is draft, validated stays bright
 * 4. AI validates again → everything bright
 */

import type { TestCase } from '../../types'
import {
  createAIWorkflowSimulator,
  type AIWorkflowSimulator,
  formatLineStates,
} from './draft-lines-api'

// =============================================================================
// AI Workflow Tests
// =============================================================================

export const aiWorkflowTests: TestCase[] = [
  {
    name: 'AI Workflow: User writes code → all lines are draft (muted)',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // User types new code
      const draftLines = await sim.userWritesCode('Frame bg #1a1a1a\n  Text "Hello"')

      // All lines should be draft (muted) since nothing is validated yet
      api.assert.ok(
        draftLines.length === 2,
        `All 2 lines should be draft, got ${draftLines.length}`
      )
      api.assert.ok(draftLines.includes(1), 'Line 1 should be draft')
      api.assert.ok(draftLines.includes(2), 'Line 2 should be draft')

      // Verify visual state
      const state = sim.getState()
      api.assert.ok(state.draftLines.length === 2, 'State shows 2 draft lines')
      api.assert.ok(state.validatedLines.length === 0, 'State shows 0 validated lines')
    },
  },

  {
    name: 'AI Workflow: AI validates → all lines become bright (validated)',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // User types code
      await sim.userWritesCode('Frame bg #1a1a1a\n  Text "Hello"')

      // AI validates the code
      await sim.aiValidates()

      // All lines should now be validated (bright)
      const state = sim.getState()
      api.assert.ok(state.draftLines.length === 0, 'No lines should be draft after validation')
      api.assert.ok(state.validatedLines.length === 2, 'All 2 lines should be validated')
    },
  },

  {
    name: 'AI Workflow: After validation, new code is draft but validated stays bright',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // Step 1: User writes initial code
      await sim.userWritesCode('Frame bg #1a1a1a')

      // Step 2: AI validates
      await sim.aiValidates()

      // Step 3: User adds more code
      const draftLines = await sim.userWritesCode('Frame bg #1a1a1a\n  Text "New line"')

      // Only line 2 should be draft (new line)
      // Line 1 should remain validated (unchanged from validated version)
      api.assert.ok(
        draftLines.length === 1,
        `Only 1 line should be draft, got ${draftLines.length}: [${draftLines.join(', ')}]`
      )
      api.assert.ok(draftLines.includes(2), 'Line 2 (new) should be draft')

      const state = sim.getState()
      api.assert.ok(state.validatedLines.includes(1), 'Line 1 should remain validated (bright)')
      api.assert.ok(state.draftLines.includes(2), 'Line 2 should be draft (muted)')
    },
  },

  {
    name: 'AI Workflow: AI corrects wrong code → corrected code becomes bright',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // User writes incorrect code
      await sim.userWritesCode('Fram bg #1a1a1a') // Typo: "Fram" instead of "Frame"

      // All code is draft
      let state = sim.getState()
      api.assert.ok(state.draftLines.includes(1), 'Wrong code should be draft')

      // AI corrects the code
      await sim.aiCorrects('Frame bg #1a1a1a') // Corrected: "Frame"

      // Corrected code should be validated
      state = sim.getState()
      api.assert.ok(state.draftLines.length === 0, 'Corrected code should not be draft')
      api.assert.ok(state.validatedLines.includes(1), 'Corrected code should be validated')
      api.assert.ok(state.currentCode === 'Frame bg #1a1a1a', 'Editor should show corrected code')
    },
  },

  {
    name: 'AI Workflow: Complete cycle - write → validate → write more → validate',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // === Cycle 1: Write and validate ===

      // User writes first line
      let draftLines = await sim.userWritesCode('Frame bg #2271C1')
      api.assert.ok(draftLines.includes(1), 'Cycle 1: New line should be draft')

      // AI validates
      await sim.aiValidates()
      let state = sim.getState()
      api.assert.ok(state.validatedLines.includes(1), 'Cycle 1: Line validated after AI')

      // === Cycle 2: Add more code ===

      // User adds child element
      draftLines = await sim.userWritesCode('Frame bg #2271C1\n  Text "Title", col white')
      api.assert.ok(!draftLines.includes(1), 'Cycle 2: Line 1 should stay validated')
      api.assert.ok(draftLines.includes(2), 'Cycle 2: Line 2 should be draft')

      // AI validates again
      await sim.aiValidates()
      state = sim.getState()
      api.assert.ok(state.validatedLines.length === 2, 'Cycle 2: Both lines validated')
      api.assert.ok(state.draftLines.length === 0, 'Cycle 2: No draft lines')

      // === Cycle 3: Add even more code ===

      draftLines = await sim.userWritesCode(
        'Frame bg #2271C1\n  Text "Title", col white\n  Button "Click me"'
      )
      api.assert.ok(!draftLines.includes(1), 'Cycle 3: Line 1 stays validated')
      api.assert.ok(!draftLines.includes(2), 'Cycle 3: Line 2 stays validated')
      api.assert.ok(draftLines.includes(3), 'Cycle 3: Line 3 is draft')

      // Final validation
      await sim.aiValidates()
      state = sim.getState()
      api.assert.ok(state.validatedLines.length === 3, 'Final: All 3 lines validated')
    },
  },

  {
    name: 'AI Workflow: AI validation fails → draft lines remain draft',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // User writes code
      await sim.userWritesCode('Frame bg #invalid')

      // AI validation fails
      await sim.aiValidationFails()

      // Lines should still be draft
      const state = sim.getState()
      api.assert.ok(
        state.draftLines.includes(1),
        'Line should remain draft after failed validation'
      )
    },
  },

  {
    name: 'AI Workflow: Modifying validated line marks only that line as draft',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // Write and validate 3 lines
      await sim.userWritesCode('Frame\n  Text "One"\n  Text "Two"')
      await sim.aiValidates()

      // Modify the middle line
      const draftLines = await sim.userWritesCode('Frame\n  Text "Modified"\n  Text "Two"')

      // Only line 2 should be draft
      api.assert.ok(!draftLines.includes(1), 'Line 1 unchanged - should be validated')
      api.assert.ok(draftLines.includes(2), 'Line 2 modified - should be draft')
      api.assert.ok(!draftLines.includes(3), 'Line 3 unchanged - should be validated')
    },
  },

  {
    name: 'AI Workflow: AI corrects and adds lines → all corrected content is validated',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // User writes incomplete code
      await sim.userWritesCode('Frame')

      // AI corrects and expands the code
      await sim.aiCorrects('Frame bg #1a1a1a, pad 16\n  Text "Generated by AI"\n  Button "OK"')

      // All corrected/generated lines should be validated
      const state = sim.getState()
      api.assert.ok(state.draftLines.length === 0, 'All AI-generated code should be validated')
      api.assert.ok(state.validatedLines.length === 3, 'All 3 lines should be validated')
    },
  },

  {
    name: 'AI Workflow: Visual state inspection shows correct draft/validated status',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // Set up mixed state: validated line + draft line
      await sim.userWritesCode('Frame bg #1a1a1a')
      await sim.aiValidates()
      await sim.userWritesCode('Frame bg #1a1a1a\n  Text "New draft line"')

      // Inspect visual state
      const lines = sim.inspectLines()

      api.assert.ok(lines.length === 2, 'Should have 2 lines')
      api.assert.ok(!lines[0].hasDraftClass, 'Line 1 should NOT have draft class (validated)')
      api.assert.ok(lines[1].hasDraftClass, 'Line 2 should have draft class (draft)')
      api.assert.ok(lines[0].textContent.includes('Frame'), 'Line 1 content should include Frame')
      api.assert.ok(lines[1].textContent.includes('Text'), 'Line 2 content should include Text')
    },
  },

  {
    name: 'AI Workflow: Rapid typing cycles maintain correct state',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // Rapid sequence: write → validate → write → validate → write
      await sim.userWritesCode('Frame')
      await sim.aiValidates()

      await sim.userWritesCode('Frame\n  Text "A"')
      await sim.aiValidates()

      await sim.userWritesCode('Frame\n  Text "A"\n  Text "B"')
      await sim.aiValidates()

      const draftLines = await sim.userWritesCode('Frame\n  Text "A"\n  Text "B"\n  Text "C"')

      // Only the newest line should be draft
      api.assert.ok(draftLines.length === 1, 'Only 1 new line should be draft')
      api.assert.ok(draftLines.includes(4), 'Line 4 should be draft')

      const state = sim.getState()
      api.assert.ok(state.validatedLines.length === 3, 'Lines 1-3 should be validated')
    },
  },
]

// =============================================================================
// Visual Verification Tests
// =============================================================================

export const visualVerificationTests: TestCase[] = [
  {
    name: 'Visual: Draft lines have cm-draft-line CSS class',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      await sim.userWritesCode('Frame bg #1a1a1a\n  Text "Test"')

      const lines = document.querySelectorAll('.cm-line')
      api.assert.ok(
        lines[0]?.classList.contains('cm-draft-line'),
        'Line 1 should have cm-draft-line class'
      )
      api.assert.ok(
        lines[1]?.classList.contains('cm-draft-line'),
        'Line 2 should have cm-draft-line class'
      )
    },
  },

  {
    name: 'Visual: Validated lines do NOT have cm-draft-line CSS class',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      await sim.userWritesCode('Frame bg #1a1a1a')
      await sim.aiValidates()

      const lines = document.querySelectorAll('.cm-line')
      api.assert.ok(
        !lines[0]?.classList.contains('cm-draft-line'),
        'Validated line should NOT have cm-draft-line class'
      )
    },
  },

  {
    name: 'Visual: Mixed state - draft and validated lines have correct classes',
    run: async api => {
      const sim = await createAIWorkflowSimulator(api)

      // Create mixed state
      await sim.userWritesCode('Frame bg #1a1a1a')
      await sim.aiValidates()
      await sim.userWritesCode('Frame bg #1a1a1a\n  Text "Draft line"')

      const lines = document.querySelectorAll('.cm-line')

      // Line 1: validated (no draft class)
      api.assert.ok(
        !lines[0]?.classList.contains('cm-draft-line'),
        'Line 1 (validated) should NOT have draft class'
      )

      // Line 2: draft (has draft class)
      api.assert.ok(
        lines[1]?.classList.contains('cm-draft-line'),
        'Line 2 (draft) should have draft class'
      )
    },
  },
]

// =============================================================================
// Combined Export
// =============================================================================

export const allAIWorkflowTests: TestCase[] = [...aiWorkflowTests, ...visualVerificationTests]
