/**
 * Keyboard Editing Test Suite
 *
 * Covers:
 * - T/R/I element insertion shortcuts
 * - Arrow-key spacing adjustment in P/M/G modes
 * - Esc exits spacing mode
 *
 * See docs/concepts/spacing-keyboard-mode.md for the design.
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

const DEFAULT_GRID = 8 // matches handleSnapSettings DEFAULT_HANDLE_SNAP.gridSize

function getPadding(nodeId: string): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!el) return { top: 0, right: 0, bottom: 0, left: 0 }
  const s = window.getComputedStyle(el)
  return {
    top: parseInt(s.paddingTop, 10) || 0,
    right: parseInt(s.paddingRight, 10) || 0,
    bottom: parseInt(s.paddingBottom, 10) || 0,
    left: parseInt(s.paddingLeft, 10) || 0,
  }
}

function getMarginTop(nodeId: string): number {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!el) return 0
  return parseInt(window.getComputedStyle(el).marginTop, 10) || 0
}

function getGap(nodeId: string): number {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!el) return 0
  return parseInt(window.getComputedStyle(el).gap, 10) || 0
}

// =============================================================================
// T / R / I — Element Insertion
// =============================================================================

export const insertElementTests: TestCase[] = describe('Keyboard Insertion (T/R/I)', [
  testWithSetup(
    'T inserts Text as last child of selected Frame',
    'Frame pad 16, gap 8\n  Text "Existing"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(150)

      await api.interact.pressKey('t')
      await api.utils.waitForCompile()

      api.assert.codeContains(/Text "Text"/)
      // The new Text should be visible in the DOM (rendered by the Frame)
      const allTexts = document.querySelectorAll('[data-mirror-id] span, [data-mirror-id] div')
      api.assert.ok(
        Array.from(allTexts).some(el => el.textContent?.trim() === 'Text'),
        'New Text element should be rendered'
      )
    }
  ),

  testWithSetup(
    'R inserts Frame as last child of selected Frame',
    'Frame pad 16, gap 8\n  Text "Existing"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(150)

      await api.interact.pressKey('r')
      await api.utils.waitForCompile()

      // Should be a new Frame line in the source — the original was the
      // root Frame on line 1, the new one is a child Frame.
      api.assert.codeContains(/\n\s+Frame\s*$/m)
    }
  ),

  testWithSetup(
    'I inserts Icon as last child of selected Frame',
    'Frame pad 16, gap 8\n  Text "Existing"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(150)

      await api.interact.pressKey('i')
      await api.utils.waitForCompile()

      api.assert.codeContains(/Icon "circle"/)
    }
  ),

  testWithSetup(
    'New element becomes selected after insertion',
    'Frame pad 16, gap 8\n  Text "Existing"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(150)

      const before = api.studio.getSelection()
      api.assert.equal(before, 'node-1', 'Frame should be selected before insert')

      await api.interact.pressKey('t')
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const after = api.studio.getSelection()
      api.assert.ok(after !== null, 'A node should be selected after insert')
      api.assert.ok(
        after !== 'node-1',
        `New child should be selected, not the parent — got ${after}`
      )
    }
  ),

  testWithSetup(
    'Chained insertion: R then T inserts Text into the new Frame',
    'Frame pad 16, gap 8\n  Text "First"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(150)

      // Insert a new Frame — selection moves to it
      await api.interact.pressKey('r')
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Now T should insert Text *into* the new Frame, not the root Frame
      await api.interact.pressKey('t')
      await api.utils.waitForCompile()

      // Code should now have two Texts: "First" and "Text"
      const sourceMatches = (api.editor.getCode().match(/Text "/g) || []).length
      api.assert.equal(sourceMatches, 2, 'Should have two Text elements after chained insert')
    }
  ),
])

// =============================================================================
// Arrow Keys in P Mode — Padding Adjustment
// =============================================================================

export const paddingArrowTests: TestCase[] = describe('Padding Mode Arrow Keys', [
  testWithSetup(
    'Plain ArrowUp in P mode increases padding by gridSize',
    'Frame pad 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      const before = getPadding('node-1')
      api.assert.equal(before.top, 8, 'Initial padding-top should be 8')

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      await api.interact.pressKey('ArrowUp')
      await api.utils.waitForCompile()

      const after = getPadding('node-1')
      api.assert.equal(
        after.top,
        8 + DEFAULT_GRID,
        `Padding-top should increase by ${DEFAULT_GRID}, got ${after.top}`
      )
    }
  ),

  testWithSetup(
    'Plain ArrowDown in P mode decreases padding by gridSize',
    'Frame pad 24, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      await api.interact.pressKey('ArrowDown')
      await api.utils.waitForCompile()

      const after = getPadding('node-1')
      api.assert.equal(
        after.top,
        24 - DEFAULT_GRID,
        `Padding-top should decrease by ${DEFAULT_GRID}, got ${after.top}`
      )
    }
  ),

  testWithSetup(
    'Option+ArrowUp in P mode increases only top padding',
    'Frame pad 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      await api.interact.pressKey('ArrowUp', { alt: true })
      await api.utils.waitForCompile()

      const after = getPadding('node-1')
      api.assert.equal(after.top, 16, 'top should increase by 8')
      api.assert.equal(after.bottom, 8, 'bottom should stay at 8')
      api.assert.equal(after.left, 8, 'left should stay at 8')
      api.assert.equal(after.right, 8, 'right should stay at 8')
    }
  ),

  testWithSetup(
    'Option+Shift+ArrowUp in P mode decreases only top padding',
    'Frame pad 16, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      await api.interact.pressKey('ArrowUp', { alt: true, shift: true })
      await api.utils.waitForCompile()

      const after = getPadding('node-1')
      api.assert.equal(after.top, 8, 'top should decrease by 8 (Shift inverts sign)')
      api.assert.equal(after.right, 16, 'right should stay at 16')
    }
  ),

  testWithSetup(
    'Option+ArrowRight in P mode increases only right padding',
    'Frame pad 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      await api.interact.pressKey('ArrowRight', { alt: true })
      await api.utils.waitForCompile()

      const after = getPadding('node-1')
      api.assert.equal(after.right, 16, 'right should increase by 8')
      api.assert.equal(after.top, 8, 'top should stay at 8')
      api.assert.equal(after.left, 8, 'left should stay at 8')
    }
  ),

  testWithSetup(
    'Off-grid value snaps to grid on first ArrowUp press',
    'Frame pad 13, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      await api.interact.pressKey('ArrowUp')
      await api.utils.waitForCompile()

      const after = getPadding('node-1')
      // 13 is off-grid for gridSize 8. Next grid value above 13 is 16.
      api.assert.equal(after.top, 16, `Off-grid 13 should snap to 16, got ${after.top}`)
    }
  ),
])

// =============================================================================
// Arrow Keys in M / G Mode
// =============================================================================

export const marginGapArrowTests: TestCase[] = describe('Margin/Gap Mode Arrow Keys', [
  testWithSetup(
    'ArrowUp in M mode increases margin',
    'Frame pad 16, mar 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      await api.interact.pressKey('ArrowUp')
      await api.utils.waitForCompile()

      const newMargin = getMarginTop('node-1')
      api.assert.equal(newMargin, 16, `Margin-top should be 16, got ${newMargin}`)
    }
  ),

  testWithSetup(
    'ArrowUp in G mode increases gap',
    'Frame hor, gap 8, pad 16, bg #1a1a1a\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      await api.interact.pressKey('ArrowUp')
      await api.utils.waitForCompile()

      const newGap = getGap('node-1')
      api.assert.equal(newGap, 16, `Gap should be 16, got ${newGap}`)
    }
  ),
])

// =============================================================================
// Esc & Mode Interaction
// =============================================================================

export const spacingModeEscTests: TestCase[] = describe('Esc Exits Spacing Mode', [
  testWithSetup(
    'Esc exits padding mode and hides handles',
    'Frame pad 16, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      let handles = document.querySelectorAll('.padding-handle')
      api.assert.ok(handles.length > 0, 'Padding handles should be visible')

      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      handles = document.querySelectorAll('.padding-handle')
      api.assert.ok(handles.length === 0, 'Padding handles should be hidden after Esc')
    }
  ),

  testWithSetup(
    'After Esc, T inserts again (insertion was disabled in spacing mode)',
    'Frame pad 16, bg #1a1a1a\n  Text "Original"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Enter padding mode — T should be a no-op here
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      const sourceBeforeT = api.editor.getCode()
      await api.interact.pressKey('t')
      await api.utils.delay(150)
      const sourceAfterT = api.editor.getCode()
      api.assert.equal(
        sourceAfterT,
        sourceBeforeT,
        'T should not insert while spacing mode is active'
      )

      // Exit mode and try again — now T should insert
      await api.interact.pressKey('Escape')
      await api.utils.delay(200)
      await api.interact.pressKey('t')
      await api.utils.waitForCompile()
      api.assert.codeContains(/Text "Text"/)
    }
  ),
])

// =============================================================================
// Undo Coalescing — many arrow presses = one undo entry
// =============================================================================

export const spacingUndoCoalescingTests: TestCase[] = describe('Spacing Mode Undo Coalescing', [
  testWithSetup(
    'Multiple arrow presses in P mode collapse to ONE undo entry',
    'Frame pad 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      api.studio.history.clear()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      const startStack = api.studio.history.getUndoStackSize()

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Five separate arrow presses
      for (let i = 0; i < 5; i++) {
        await api.interact.pressKey('ArrowUp')
        await api.utils.waitForCompile()
      }

      // While the session is still open, no undo entry has been pushed yet —
      // all five live changes accumulate inside the session buffer.
      const midStack = api.studio.history.getUndoStackSize()
      api.assert.equal(
        midStack,
        startStack,
        `Mid-session stack should still be ${startStack}, got ${midStack}`
      )

      // Esc commits the session as exactly one batch entry.
      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      const endStack = api.studio.history.getUndoStackSize()
      api.assert.equal(
        endStack,
        startStack + 1,
        `After Esc, exactly ONE new undo entry should exist; got delta ${endStack - startStack}`
      )
    }
  ),

  testWithSetup(
    'Single undo restores the original value across all session changes',
    'Frame pad 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      api.studio.history.clear()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      const before = getPadding('node-1').top
      api.assert.equal(before, 8, 'Initial padding-top should be 8')

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Three steps: 8 → 16 → 24 → 32
      for (let i = 0; i < 3; i++) {
        await api.interact.pressKey('ArrowUp')
        await api.utils.waitForCompile()
      }
      api.assert.equal(getPadding('node-1').top, 32, 'Padding should be 32 after 3 steps')

      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      // ONE undo should restore all three changes at once.
      const undone = await api.studio.history.undo()
      api.assert.ok(undone, 'Undo should succeed')
      await api.utils.waitForCompile()

      const after = getPadding('node-1').top
      api.assert.equal(after, 8, `Single undo should restore padding to 8, got ${after}`)
    }
  ),

  testWithSetup(
    'Switching from P to M commits the P session as one entry',
    'Frame pad 8, mar 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.studio.clearSelection()
      api.studio.history.clear()
      await api.utils.delay(100)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      const startStack = api.studio.history.getUndoStackSize()

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Two padding changes
      await api.interact.pressKey('ArrowUp')
      await api.utils.waitForCompile()
      await api.interact.pressKey('ArrowUp')
      await api.utils.waitForCompile()

      // Switch to M mode — should commit the P session
      await api.interact.pressKey('m')
      await api.utils.delay(300)

      const afterSwitch = api.studio.history.getUndoStackSize()
      api.assert.equal(
        afterSwitch,
        startStack + 1,
        `Mode switch should commit one batch; got delta ${afterSwitch - startStack}`
      )

      // One margin change
      await api.interact.pressKey('ArrowUp')
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      const afterMargin = api.studio.history.getUndoStackSize()
      api.assert.equal(
        afterMargin,
        startStack + 2,
        `Margin session should add one more batch; got delta ${afterMargin - startStack}`
      )
    }
  ),
])

// =============================================================================
// Aggregate
// =============================================================================

export const allKeyboardEditingTests: TestCase[] = [
  ...insertElementTests,
  ...paddingArrowTests,
  ...marginGapArrowTests,
  ...spacingModeEscTests,
  ...spacingUndoCoalescingTests,
]
