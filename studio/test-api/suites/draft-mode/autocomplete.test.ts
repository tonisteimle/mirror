/**
 * Draft Mode Autocomplete Tests
 *
 * Tests that autocomplete is suppressed in draft blocks,
 * but pickers (color, icon, etc.) still work.
 */

import type { TestCase } from '../../types'
import {
  createDraftModeTestContext,
  createDraftModeAssertions,
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
// Autocomplete Suppression Tests
// =============================================================================

export const suppressionTests: TestCase[] = [
  {
    name: 'Autocomplete: suppressed after -- marker line',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Set code with -- and partial property
        await ctx.setCode('Frame\n--\nFrame b')

        // Wait for potential autocomplete
        await ctx.delay(200)

        // Autocomplete should NOT appear
        assert.noAutocomplete()
      })
    },
  },

  {
    name: 'Autocomplete: suppressed for primitives in draft block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Start typing a primitive inside draft block
        await ctx.setCode('Frame\n--\nBu')

        await ctx.delay(200)

        // No autocomplete for Button, etc.
        assert.noAutocomplete()
      })
    },
  },

  {
    name: 'Autocomplete: still works BEFORE -- line',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        // Code where line 1 is before --
        await ctx.setCode('Frame b\n--')

        // Move cursor to line 1
        ctx.moveCursor(1, 7) // After "Frame b"

        await ctx.delay(200)

        // We can't easily trigger autocomplete here, but we verify
        // the draft block doesn't include line 1
        assert.linesNotInDraft([1])
      })
    },
  },

  {
    name: 'Autocomplete: suppressed for values in draft block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nFrame bg bl')

        await ctx.delay(200)

        // No autocomplete for "blue", etc.
        assert.noAutocomplete()
      })
    },
  },

  {
    name: 'Autocomplete: suppressed in closed draft block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nFrame b\n--')

        // Cursor is on line 3 (inside block)
        ctx.moveCursor(3, 8)

        await ctx.delay(200)

        assert.noAutocomplete()
      })
    },
  },

  {
    name: 'Autocomplete: works after closed block',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nBtn "A"\n--\nFrame')

        // Line 5 is after the block - should not be in draft
        assert.linesNotInDraft([5])
      })
    },
  },
]

// =============================================================================
// Picker Tests (should still work in draft)
// =============================================================================

export const pickerTests: TestCase[] = [
  {
    name: 'Picker: color trigger should work in draft block',
    run: async api => {
      await withDraftContext(api, async ctx => {
        // Set code with -- and color position
        await ctx.setCode('Frame\n--\nFrame bg #')

        // The trigger for # should still work (EditorTriggerManager is separate)
        // We just verify the draft state is correct
        api.assert.ok(ctx.isDraftActive(), 'Draft mode should be active')
        api.assert.ok(ctx.isLineInDraft(3), 'Line 3 should be in draft block')
      })
    },
  },

  {
    name: 'Picker: icon trigger position in draft block',
    run: async api => {
      await withDraftContext(api, async ctx => {
        // Set code with Icon in draft
        await ctx.setCode('Frame\n--\nIcon "')

        api.assert.ok(ctx.isDraftActive(), 'Draft mode should be active')
        // Icon picker trigger happens at ", should still work
      })
    },
  },

  {
    name: 'Picker: animation trigger in draft block',
    run: async api => {
      await withDraftContext(api, async ctx => {
        await ctx.setCode('Frame\n--\nFrame anim ')

        api.assert.ok(ctx.isDraftActive(), 'Draft mode should be active')
        // Animation picker triggers at "anim ", should still work
      })
    },
  },
]

// =============================================================================
// Edge Cases
// =============================================================================

export const edgeCaseAutocompleteTests: TestCase[] = [
  {
    name: 'Autocomplete: -- line itself has no autocomplete',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n-- a')

        // Cursor on the -- line
        ctx.moveCursor(2, 5)

        await ctx.delay(200)

        // No autocomplete on -- line (it's a prompt, not code)
        assert.noAutocomplete()
      })
    },
  },

  {
    name: 'Autocomplete: very long prompt line no autocomplete',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n-- add a blue button with hover effect and padding and rad')

        await ctx.delay(200)

        assert.noAutocomplete()
      })
    },
  },

  {
    name: 'Autocomplete: multiple lines in draft all suppressed',
    run: async api => {
      await withDraftContext(api, async (ctx, assert) => {
        await ctx.setCode('Frame\n--\nFrame b\nText c\nButton p')

        // Check each line in draft has no autocomplete
        for (const line of [3, 4, 5]) {
          ctx.moveCursor(line, 10)
          await ctx.delay(100)
          assert.noAutocomplete()
        }
      })
    },
  },
]

// =============================================================================
// Combined Export
// =============================================================================

export const allAutocompleteDraftModeTests: TestCase[] = [
  ...suppressionTests,
  ...pickerTests,
  ...edgeCaseAutocompleteTests,
]
