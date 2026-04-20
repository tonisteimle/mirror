/**
 * Draft Mode Basic Tests
 *
 * Tests fundamental -- marker detection and parsing.
 */

import type { TestCase } from '../../types'
import {
  createDraftModeTestContext,
  createDraftModeAssertions,
  DRAFT_MODE_SCENARIOS,
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

  // Start with clean state
  await ctx.setCode('')
  await ctx.delay(50)

  await fn(ctx, assertions)
}

// =============================================================================
// Detection Tests
// =============================================================================

export const detectionTests: TestCase[] = [
  {
    name: 'Draft Mode: -- at line start activates draft mode',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame bg #1a1a1a\n--')

        assert.isActive()
        assert.startsAtLine(2)
      })
    },
  },

  {
    name: 'Draft Mode: -- with trailing space works',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n-- ')

        assert.isActive()
        assert.hasNoPrompt()
      })
    },
  },

  {
    name: 'Draft Mode: -- with prompt extracts text',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n-- make responsive')

        assert.isActive()
        assert.hasPrompt('make responsive')
      })
    },
  },

  {
    name: 'Draft Mode: -- with long prompt extracts full text',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n-- add a blue button with hover effect and padding')

        assert.isActive()
        assert.hasPrompt('add a blue button with hover effect and padding')
      })
    },
  },

  {
    name: 'Draft Mode: no -- means inactive',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame bg #1a1a1a\n  Text "Hello"')

        assert.isNotActive()
      })
    },
  },

  {
    name: 'Draft Mode: -- on first line works',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('-- generate a form')

        assert.isActive()
        assert.startsAtLine(1)
        assert.hasPrompt('generate a form')
      })
    },
  },

  {
    name: 'Draft Mode: -- only at line start (not middle)',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Text "hello -- world"')

        assert.isNotActive()
      })
    },
  },
]

// =============================================================================
// Indentation Tests
// =============================================================================

export const indentationTests: TestCase[] = [
  {
    name: 'Draft Mode: 2-space indented -- works',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n  -- add child')

        assert.isActive()
        assert.hasIndent(2)
        assert.hasPrompt('add child')
      })
    },
  },

  {
    name: 'Draft Mode: 4-space indented -- works',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n  Frame\n    -- nested content')

        assert.isActive()
        assert.hasIndent(4)
        assert.startsAtLine(3)
      })
    },
  },

  {
    name: 'Draft Mode: tab indented -- works',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n\t-- with tab')

        assert.isActive()
        assert.hasIndent(1) // Tab counts as 1 character
      })
    },
  },

  {
    name: 'Draft Mode: deep nesting preserves indent',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n  Frame\n    Frame\n      -- deep')

        assert.isActive()
        assert.hasIndent(6)
        assert.startsAtLine(4)
      })
    },
  },
]

// =============================================================================
// Block Structure Tests
// =============================================================================

export const blockStructureTests: TestCase[] = [
  {
    name: 'Draft Mode: open block (no end marker)',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nBtn "Test"')

        assert.isActive()
        assert.startsAtLine(2)
        assert.endsAtLine(null)
      })
    },
  },

  {
    name: 'Draft Mode: closed block with two -- markers',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nBtn "Test"\n--')

        assert.isActive()
        assert.startsAtLine(2)
        assert.endsAtLine(4)
      })
    },
  },

  {
    name: 'Draft Mode: empty closed block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\n--')

        assert.isActive()
        assert.startsAtLine(2)
        assert.endsAtLine(3)
      })
    },
  },

  {
    name: 'Draft Mode: second -- ends block definitively',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nBtn "A"\n--\nText "After"')

        assert.isActive()
        assert.startsAtLine(2)
        assert.endsAtLine(4)

        // Line 5 is NOT in the draft block
        assert.linesNotInDraft([5])
      })
    },
  },

  {
    name: 'Draft Mode: closed block with prompt on start',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n-- fix this code\nBtn bg blue\n--')

        assert.isActive()
        assert.hasPrompt('fix this code')
        assert.startsAtLine(2)
        assert.endsAtLine(4)
      })
    },
  },
]

// =============================================================================
// Line Detection Tests
// =============================================================================

export const lineDetectionTests: TestCase[] = [
  {
    name: 'Draft Mode: isLineInDraft correct for open block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\nText "A"\n--\nBtn "B"\nIcon "check"')

        // Lines 1-2 are before --
        assert.linesNotInDraft([1, 2])

        // Lines 3-5 are in draft block
        assert.linesInDraft([3, 4, 5])
      })
    },
  },

  {
    name: 'Draft Mode: isLineInDraft correct for closed block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nBtn "A"\nText "B"\n--\nIcon "check"')

        // Line 1 is before block
        assert.linesNotInDraft([1])

        // Lines 2-5 are in block
        assert.linesInDraft([2, 3, 4, 5])

        // Line 6 is after block
        assert.linesNotInDraft([6])
      })
    },
  },

  {
    name: 'Draft Mode: single line draft (just --)',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('--')

        assert.isActive()
        assert.linesInDraft([1])
      })
    },
  },
]

// =============================================================================
// Scenario-Based Tests
// =============================================================================

export const scenarioTests: TestCase[] = DRAFT_MODE_SCENARIOS.map(scenario => ({
  name: `Draft Mode Scenario: ${scenario.description}`,
  run: async (api: any) => {
    await withDraftContext(api, async (ctx, assert) => {
      await ctx.setCode(scenario.code)

      // Check active state
      if (scenario.expected.active) {
        assert.isActive()
      } else {
        assert.isNotActive()
        return // No more checks needed
      }

      // Check start line
      if (scenario.expected.startLine !== undefined) {
        assert.startsAtLine(scenario.expected.startLine!)
      }

      // Check prompt
      if (scenario.expected.prompt !== undefined) {
        if (scenario.expected.prompt === null) {
          assert.hasNoPrompt()
        } else {
          assert.hasPrompt(scenario.expected.prompt)
        }
      }

      // Check end line
      if (scenario.expected.endLine !== undefined) {
        assert.endsAtLine(scenario.expected.endLine)
      }

      // Check indent
      if (scenario.expected.indent !== undefined) {
        assert.hasIndent(scenario.expected.indent)
      }

      // Check draft lines
      if (scenario.expected.draftLines) {
        assert.linesInDraft(scenario.expected.draftLines)
      }

      // Check non-draft lines
      if (scenario.expected.nonDraftLines) {
        assert.linesNotInDraft(scenario.expected.nonDraftLines)
      }
    })
  },
}))

// =============================================================================
// Dynamic Editing Tests
// =============================================================================

export const dynamicEditingTests: TestCase[] = [
  {
    name: 'Draft Mode: typing -- activates draft mode',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame bg #1a1a1a')

        // Initially not active
        assert.isNotActive()

        // Type newline and --
        await ctx.typeAtEnd('\n--')

        // Now active
        assert.isActive()
        assert.startsAtLine(2)
      })
    },
  },

  {
    name: 'Draft Mode: adding prompt updates state',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--')

        assert.isActive()
        assert.hasNoPrompt()

        // Type prompt
        await ctx.typeAtEnd(' add button')

        assert.hasPrompt('add button')
      })
    },
  },

  {
    name: 'Draft Mode: adding second -- closes block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nBtn "Test"')

        assert.isActive()
        assert.endsAtLine(null) // Open

        // Add closing --
        await ctx.typeAtEnd('\n--')

        assert.endsAtLine(4) // Now closed
      })
    },
  },

  {
    name: 'Draft Mode: deleting -- deactivates draft mode',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--')

        assert.isActive()

        // Replace code without --
        await ctx.setCode('Frame')

        assert.isNotActive()
      })
    },
  },
]

// =============================================================================
// Combined Export
// =============================================================================

export const allBasicDraftModeTests: TestCase[] = [
  ...detectionTests,
  ...indentationTests,
  ...blockStructureTests,
  ...lineDetectionTests,
  ...scenarioTests,
  ...dynamicEditingTests,
]
