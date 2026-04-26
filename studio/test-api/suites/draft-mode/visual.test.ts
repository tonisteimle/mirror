/**
 * Draft Mode Visual Tests
 *
 * Tests visual feedback: CSS classes, muted colors, marker styling.
 */

import type { TestCase } from '../../types'
import {
  createDraftModeTestContext,
  createDraftModeAssertions,
  inspectDraftVisualState,
  formatDraftVisualState,
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
// CSS Class Tests
// =============================================================================

export const cssClassTests: TestCase[] = [
  {
    name: 'Visual: draft lines have cm-draft-line class',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame bg #1a1a1a\n??\n  Text "Draft"\n  Button "OK"')

        // Lines 2, 3, 4 should have cm-draft-line class
        assert.linesHaveDraftClass([2, 3, 4])

        // Line 1 should NOT have it
        assert.linesNoDraftClass([1])
      })
    },
  },

  {
    name: 'Visual: closed block only marks lines within block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n??\nBtn "Test"\n??\nText "After"')

        // Lines 2-4 are in block
        assert.linesHaveDraftClass([2, 3, 4])

        // Lines 1 and 5 are outside
        assert.linesNoDraftClass([1, 5])
      })
    },
  },

  {
    name: 'Visual: ?? marker line has special class',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n??\nBtn "Test"')

        // Check marker class on line 2
        const hasMarker = ctx.hasMarkerClass(2)
        api.assert.ok(hasMarker, 'Line 2 (?? marker) should have cm-draft-marker-line class')
      })
    },
  },

  {
    name: 'Visual: both start and end markers have class',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n??\nBtn "Test"\n??')

        // Both line 2 and 4 should have marker class
        const hasStart = ctx.hasMarkerClass(2)
        const hasEnd = ctx.hasMarkerClass(4)

        api.assert.ok(hasStart, 'Start ?? should have marker class')
        api.assert.ok(hasEnd, 'End ?? should have marker class')
      })
    },
  },

  {
    name: 'Visual: no draft classes when inactive',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame bg #1a1a1a\n  Text "Hello"\n  Button "OK"')

        // No lines should have draft class
        const draftLines = ctx.getDraftClassLines()
        api.assert.ok(
          draftLines.length === 0,
          `Expected no draft lines but got [${draftLines.join(', ')}]`
        )
      })
    },
  },

  {
    name: 'Visual: single line ?? gets draft class',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('??')

        assert.linesHaveDraftClass([1])
      })
    },
  },
]

// =============================================================================
// Muted Color Tests
// =============================================================================

export const mutedColorTests: TestCase[] = [
  {
    name: 'Visual: draft lines have muted styling (class presence)',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame bg #2271C1, col white, pad 16\n??\n  Text "Draft", fs 24')

        // The cm-draft-line class applies muted CSS variables
        // We verify the class is applied, which triggers the styling
        assert.linesHaveDraftClass([2, 3])
        assert.linesNoDraftClass([1])
      })
    },
  },

  {
    name: 'Visual: validated lines stay bright (no draft class)',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame bg #ef4444, col white\n  Text "Validated"\n??\n  Button "Draft"')

        // Lines 1-2 should NOT have draft class (bright)
        assert.linesNoDraftClass([1, 2])

        // Lines 3-4 should have draft class (muted)
        assert.linesHaveDraftClass([3, 4])
      })
    },
  },
]

// =============================================================================
// Visual State Inspector Tests
// =============================================================================

export const inspectorTests: TestCase[] = [
  {
    name: 'Visual: inspectDraftVisualState returns correct info',
    run: async api => {
      await withDraftContext(api, async ctx => {
        await ctx.setCode('Frame\n??\nBtn "A"\n??\nText')

        const states = inspectDraftVisualState(ctx)

        api.assert.ok(states.length === 5, `Expected 5 lines, got ${states.length}`)

        // Line 1: normal
        api.assert.ok(!states[0].hasDraftClass, 'Line 1 should not have draft class')

        // Line 2: draft + marker
        api.assert.ok(states[1].hasDraftClass, 'Line 2 should have draft class')

        // Line 3: draft (content)
        api.assert.ok(states[2].hasDraftClass, 'Line 3 should have draft class')

        // Line 4: draft + marker
        api.assert.ok(states[3].hasDraftClass, 'Line 4 should have draft class')

        // Line 5: normal (after block)
        api.assert.ok(!states[4].hasDraftClass, 'Line 5 should not have draft class')
      })
    },
  },

  {
    name: 'Visual: formatDraftVisualState produces readable output',
    run: async api => {
      await withDraftContext(api, async ctx => {
        await ctx.setCode('Frame\n??\nBtn')

        const states = inspectDraftVisualState(ctx)
        const formatted = formatDraftVisualState(states)

        api.assert.ok(
          formatted.includes('L1:') && formatted.includes('L2:') && formatted.includes('L3:'),
          'Formatted output should include all lines'
        )
      })
    },
  },
]

// =============================================================================
// Dynamic Visual Update Tests
// =============================================================================

export const dynamicVisualTests: TestCase[] = [
  {
    name: 'Visual: adding ?? updates visual state',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame bg #1a1a1a\nText "Hello"')

        // Initially no draft lines
        const draftLines = ctx.getDraftClassLines()
        api.assert.ok(draftLines.length === 0, 'Initially no draft lines')

        // Add ??
        await ctx.typeAtEnd('\n??')
        await ctx.delay(100)

        // Now line 3 should be draft
        assert.linesHaveDraftClass([3])
      })
    },
  },

  {
    name: 'Visual: removing ?? clears visual state',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n??\nBtn "Test"')

        // Initially has draft lines
        assert.linesHaveDraftClass([2, 3])

        // Remove ??
        await ctx.setCode('Frame\nBtn "Test"')
        await ctx.delay(100)

        // No more draft lines
        const draftLines = ctx.getDraftClassLines()
        api.assert.ok(draftLines.length === 0, 'Should have no draft lines after removing ??')
      })
    },
  },

  {
    name: 'Visual: extending draft block updates classes',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n??\nBtn "A"')

        // Initially 2 draft lines (2, 3)
        assert.linesHaveDraftClass([2, 3])

        // Add more content
        await ctx.typeAtEnd('\nText "B"\nIcon "check"')
        await ctx.delay(100)

        // Now 4 draft lines (2, 3, 4, 5)
        assert.linesHaveDraftClass([2, 3, 4, 5])
      })
    },
  },

  {
    name: 'Visual: closing block limits draft lines',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n??\nBtn "A"\nText "B"')

        // Open block: lines 2-4 are draft
        assert.linesHaveDraftClass([2, 3, 4])

        // Close the block
        await ctx.typeAtEnd('\n??\nIcon "check"')
        await ctx.delay(100)

        // Lines 2-5 are draft (block), line 6 is NOT
        assert.linesHaveDraftClass([2, 3, 4, 5])
        assert.linesNoDraftClass([1, 6])
      })
    },
  },
]

// =============================================================================
// Edge Case Visual Tests
// =============================================================================

export const edgeCaseVisualTests: TestCase[] = [
  {
    name: 'Visual: empty document with just ??',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('??')

        assert.linesHaveDraftClass([1])
      })
    },
  },

  {
    name: 'Visual: ?? with only whitespace after',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n??   \n  ')

        assert.linesHaveDraftClass([2, 3])
      })
    },
  },

  {
    name: 'Visual: indented ?? still applies classes',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n  ?? add child\n    Btn "Test"')

        // Line 2 (indented ??) and 3 should have draft class
        assert.linesHaveDraftClass([2, 3])
        assert.linesNoDraftClass([1])
      })
    },
  },

  {
    name: 'Visual: deeply nested content all marked',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n??\n  Frame\n    Frame\n      Text "Deep"')

        // All lines from 2-5 should be draft
        assert.linesHaveDraftClass([2, 3, 4, 5])
      })
    },
  },
]

// =============================================================================
// Combined Export
// =============================================================================

export const allVisualDraftModeTests: TestCase[] = [
  ...cssClassTests,
  ...mutedColorTests,
  ...inspectorTests,
  ...dynamicVisualTests,
  ...edgeCaseVisualTests,
]
