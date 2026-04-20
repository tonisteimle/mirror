/**
 * Draft Mode Scenario Tests
 *
 * Tests real-world use cases: generation, correction, refactoring.
 */

import type { TestCase } from '../../types'
import {
  createDraftModeTestContext,
  createDraftModeAssertions,
  executeDraftWorkflow,
  type DraftModeTestContext,
  type DraftModeAssertions,
} from './draft-mode-api'

// =============================================================================
// Helper
// =============================================================================

async function withDraftContext(
  api: any,
  fn: (ctx: DraftModeTestContext, assert: DraftModeAssertions) => Promise<void>
): Promise<void> {
  const ctx = await createDraftModeTestContext(api)
  const assertions = createDraftModeAssertions(ctx, (cond, msg) => api.assert.ok(cond, msg))

  await ctx.setCode('')
  await ctx.delay(50)

  await fn(ctx, assertions)
}

// =============================================================================
// Generation Use Case Tests
// =============================================================================

export const generationTests: TestCase[] = [
  {
    name: 'Scenario: generate new element with prompt',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // User has a Frame and wants to add a button
        await ctx.setCode('Frame gap 12, pad 16\n  Text "Titel"\n  -- add a blue button')

        assert.isActive()
        assert.hasPrompt('add a blue button')
        assert.hasIndent(2) // Indented to match parent context
        assert.startsAtLine(3)
      })
    },
  },

  {
    name: 'Scenario: generate at root level',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Empty file, user wants to generate a form
        await ctx.setCode('-- generate a login form')

        assert.isActive()
        assert.hasPrompt('generate a login form')
        assert.hasIndent(0)
        assert.startsAtLine(1)
      })
    },
  },

  {
    name: 'Scenario: generate multiple elements',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n  -- add navigation with 3 links')

        assert.isActive()
        assert.hasPrompt('add navigation with 3 links')
      })
    },
  },

  {
    name: 'Scenario: generate deeply nested content',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n  Frame hor, gap 8\n    Frame\n      -- add icon and label')

        assert.isActive()
        assert.hasIndent(6)
        assert.hasPrompt('add icon and label')
      })
    },
  },
]

// =============================================================================
// Correction Use Case Tests
// =============================================================================

export const correctionTests: TestCase[] = [
  {
    name: 'Scenario: correct syntax error',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // User has invalid code that needs fixing
        await ctx.setCode('Frame\n--\nBtn "Test" bg blue col white\n--')

        assert.isActive()
        assert.hasNoPrompt() // No explicit prompt = fix the code
        assert.startsAtLine(2)
        assert.endsAtLine(4)

        // Code contains the error
        assert.codeContains('bg blue')
      })
    },
  },

  {
    name: 'Scenario: correct missing comma',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nText "Hello" fs 24 weight bold\n--')

        assert.isActive()
        // The code has missing commas - AI should fix
        assert.codeContains('fs 24 weight bold')
      })
    },
  },

  {
    name: 'Scenario: correct invalid property value',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nFrame w 100px h 200px\n--')

        assert.isActive()
        // 100px is invalid (should be just 100)
        assert.codeContains('100px')
      })
    },
  },

  {
    name: 'Scenario: multiple errors to correct',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode(
          [
            'Frame',
            '--',
            'btn "Test"', // lowercase btn
            'text fs=24', // = instead of space
            'Frame bg: #1a1a1a', // : not needed
            '--',
          ].join('\n')
        )

        assert.isActive()
        assert.startsAtLine(2)
        assert.endsAtLine(6)
      })
    },
  },
]

// =============================================================================
// Refactoring Use Case Tests
// =============================================================================

export const refactoringTests: TestCase[] = [
  {
    name: 'Scenario: make responsive',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode(
          [
            'Frame',
            '-- make this responsive',
            '  Frame hor, gap 8',
            '    Button "A", w 100',
            '    Button "B", w 100',
            '    Button "C", w 100',
            '--',
          ].join('\n')
        )

        assert.isActive()
        assert.hasPrompt('make this responsive')
        assert.startsAtLine(2)
        assert.endsAtLine(7)
      })
    },
  },

  {
    name: 'Scenario: add hover effects',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode(
          [
            'Frame',
            '-- add hover effects to all buttons',
            '  Button "Save", bg #2271C1, col white',
            '  Button "Cancel", bg #333, col white',
            '--',
          ].join('\n')
        )

        assert.isActive()
        assert.hasPrompt('add hover effects to all buttons')
      })
    },
  },

  {
    name: 'Scenario: extract to component',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode(
          [
            'Frame',
            '-- extract this as a Card component',
            '  Frame bg #1a1a1a, pad 16, rad 8, gap 8',
            '    Text "Title", col white, fs 18',
            '    Text "Description", col #888',
            '--',
          ].join('\n')
        )

        assert.isActive()
        assert.hasPrompt('extract this as a Card component')
      })
    },
  },

  {
    name: 'Scenario: improve styling',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode(
          ['-- improve the styling', 'Frame', '  Text "Hello"', '  Button "Click"', '--'].join('\n')
        )

        assert.isActive()
        assert.hasPrompt('improve the styling')
        assert.startsAtLine(1)
      })
    },
  },
]

// =============================================================================
// Workflow Tests (step-by-step user actions)
// =============================================================================

export const workflowTests: TestCase[] = [
  {
    name: 'Workflow: type code then add -- for fix',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Step 1: User types some code
        await ctx.setCode('Frame bg #1a1a1a')

        assert.isNotActive()

        // Step 2: User types -- on new line
        await ctx.typeAtEnd('\n--')

        assert.isActive()
        assert.startsAtLine(2)

        // Step 3: User adds code to fix
        await ctx.typeAtEnd('\nBtn bg blue')

        assert.isActive()
        assert.linesInDraft([2, 3])

        // Step 4: User closes block
        await ctx.typeAtEnd('\n--')

        assert.endsAtLine(4)
      })
    },
  },

  {
    name: 'Workflow: add prompt incrementally',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--')

        assert.isActive()
        assert.hasNoPrompt()

        // User types prompt word by word
        await ctx.typeAtEnd(' add')
        assert.hasPrompt('add')

        await ctx.typeAtEnd(' blue')
        assert.hasPrompt('add blue')

        await ctx.typeAtEnd(' button')
        assert.hasPrompt('add blue button')
      })
    },
  },

  {
    name: 'Workflow: change indent level',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Start with non-indented
        await ctx.setCode('Frame\n-- add')

        assert.hasIndent(0)

        // Change to indented
        await ctx.setCode('Frame\n  -- add')

        assert.hasIndent(2)

        // Change to more indented
        await ctx.setCode('Frame\n    -- add')

        assert.hasIndent(4)
      })
    },
  },

  {
    name: 'Workflow: convert open to closed block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Start with open block
        await ctx.setCode('Frame\n--\nBtn "Test"')

        assert.isActive()
        assert.endsAtLine(null) // Open

        // Add closing marker
        await ctx.typeAtEnd('\n--')

        assert.endsAtLine(4) // Now closed

        // Add content after
        await ctx.typeAtEnd('\nText "After"')

        // Line 5 is NOT in draft
        assert.linesNotInDraft([5])
      })
    },
  },
]

// =============================================================================
// Context Preservation Tests
// =============================================================================

export const contextTests: TestCase[] = [
  {
    name: 'Context: -- inside Frame provides parent context',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode(
          ['Frame bg #1a1a1a, pad 16, gap 8', '  Text "Header"', '  -- add footer'].join('\n')
        )

        assert.isActive()
        assert.hasIndent(2)
        // AI sees: Frame > Text, then -- (knows it's inside Frame)
      })
    },
  },

  {
    name: 'Context: -- inside nested Frames',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode(
          [
            'Frame // Outer',
            '  Frame // Middle',
            '    Frame // Inner',
            '      -- add content here',
          ].join('\n')
        )

        assert.hasIndent(6)
        assert.startsAtLine(4)
        // AI knows: Outer > Middle > Inner > ???
      })
    },
  },

  {
    name: 'Context: sibling elements visible',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode(
          ['Frame', '  Text "Before A"', '  Text "Before B"', '  --', '  Text "After"'].join('\n')
        )

        assert.isActive()
        // AI sees siblings before and after --
        assert.codeContains('Before A')
        assert.codeContains('After')
      })
    },
  },
]

// =============================================================================
// Edge Case Scenarios
// =============================================================================

export const edgeCaseScenarioTests: TestCase[] = [
  {
    name: 'Scenario: -- at very end of file',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n  Text "A"\n--')

        assert.isActive()
        assert.startsAtLine(3)
        assert.endsAtLine(null)
      })
    },
  },

  {
    name: 'Scenario: only -- in file',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('--')

        assert.isActive()
        assert.startsAtLine(1)
        assert.hasNoPrompt()
      })
    },
  },

  {
    name: 'Scenario: -- with special characters in prompt',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n-- add "quoted text" and #color')

        assert.isActive()
        assert.hasPrompt('add "quoted text" and #color')
      })
    },
  },

  {
    name: 'Scenario: multiple spaces in prompt',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--   add    spaced   prompt')

        assert.isActive()
        // Should trim/normalize
        assert.hasPrompt('add    spaced   prompt')
      })
    },
  },

  {
    name: 'Scenario: tab indentation',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n\t-- with tab')

        assert.isActive()
        assert.hasIndent(1) // Tab = 1 char
      })
    },
  },
]

// =============================================================================
// Combined Export
// =============================================================================

export const allScenarioDraftModeTests: TestCase[] = [
  ...generationTests,
  ...correctionTests,
  ...refactoringTests,
  ...workflowTests,
  ...contextTests,
  ...edgeCaseScenarioTests,
]
