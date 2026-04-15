/**
 * Forward Movement Tests
 *
 * Tests that verify moving elements forward by one position is correctly
 * NOT flagged as a no-op. These tests document a previously fixed bug.
 *
 * SCENARIO:
 * - Elements: [A, B, C] at indices [0, 1, 2]
 * - User drags B to position "before C" (insertionIndex = 2)
 * - Expected result: [A, C, B] - B moved from index 1 to index 2
 *
 * The key insight is that the no-op detection must account for index shift:
 * - Before remove: [A, B, C] with B at index 1
 * - After remove:  [A, C] with C at index 1
 * - Insert at 2:   [A, C, B] - B is now at index 2 → MOVED!
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FlexWithChildrenStrategy } from '../../../studio/drag-drop/strategies/flex-with-children'
import { createMockFlexTarget, createMockCanvasSource } from '../../utils/mocks/drag-drop-mocks'
import type { ChildRect } from '../../../studio/drag-drop/strategies/types'
import type { Point } from '../../../studio/drag-drop/types'

describe('Forward Movement', () => {
  let strategy: FlexWithChildrenStrategy

  beforeEach(() => {
    strategy = new FlexWithChildrenStrategy()
  })

  /**
   * This test verifies that moving an element forward by one position is NOT a no-op.
   * Bug was fixed: isNoOp now correctly returns false.
   */
  it('moving element forward by one position should NOT be a no-op', () => {
    // ARRANGE: Three children vertically stacked
    // A: y=0-40,   midpoint=20
    // B: y=48-88,  midpoint=68 (this is the dragged element)
    // C: y=96-136, midpoint=116
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      { nodeId: 'c', rect: { x: 0, y: 96, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({
      direction: 'vertical',
      hasChildren: true,
    })

    // Source is 'b' at index 1
    const source = createMockCanvasSource({ nodeId: 'b' })

    // ACT: Cursor at y=95 - just before C's midpoint (116)
    // This makes C the closest element, with placement = 'before'
    // insertionIndex = 2 (before C)
    //
    // Distance calculations:
    // - to A (midpoint 20): |95-20| = 75
    // - to B (midpoint 68): |95-68| = 27
    // - to C (midpoint 116): |95-116| = 21 ← closest!
    const cursor: Point = { x: 50, y: 95 }
    const result = strategy.calculate(cursor, target, source, childRects)

    // ASSERT: This is NOT a no-op!
    // The user wants to move B from position 1 to position 2 (before C → after C in the original order)
    //
    // Proof:
    // 1. Original order: [A, B, C] with B at index 1
    // 2. Remove B: [A, C] with C now at index 1
    // 3. Insert B at index 2: [A, C, B]
    // 4. B is now at index 2, was at index 1 → MOVED!

    expect(result.insertionIndex).toBe(2) // Confirm insertion target
    expect(result.targetId).toBe('c') // Confirm closest is C
    expect(result.placement).toBe('before') // Confirm placement
    expect(result.isNoOp).toBe(false) // Correctly NOT a no-op
  })

  /**
   * Additional test: Moving forward by 2+ positions works correctly
   */
  it('moving element forward by two positions correctly returns isNoOp=false', () => {
    // Four children
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } }, // dragged
      { nodeId: 'c', rect: { x: 0, y: 96, width: 100, height: 40 } },
      { nodeId: 'd', rect: { x: 0, y: 144, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({
      direction: 'vertical',
      hasChildren: true,
    })
    const source = createMockCanvasSource({ nodeId: 'b' })

    // Cursor at y=160 (after D's midpoint at 164)
    // This makes D closest with placement 'after', insertionIndex = 4
    const cursor: Point = { x: 50, y: 170 }
    const result = strategy.calculate(cursor, target, source, childRects)

    // insertionIndex (4) !== sourceIndex (1)
    // insertionIndex (4) !== sourceIndex + 1 (2)
    // So isNoOp = false (correct!)
    expect(result.isNoOp).toBe(false)
  })

  /**
   * Additional test: Moving backward works correctly
   */
  it('moving element backward by one position correctly returns isNoOp=false', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      { nodeId: 'c', rect: { x: 0, y: 96, width: 100, height: 40 } }, // dragged
    ]
    const target = createMockFlexTarget({
      direction: 'vertical',
      hasChildren: true,
    })
    const source = createMockCanvasSource({ nodeId: 'c' })

    // Cursor at y=45 - just before B's midpoint (68)
    // B is closest, placement = 'before', insertionIndex = 1
    const cursor: Point = { x: 50, y: 45 }
    const result = strategy.calculate(cursor, target, source, childRects)

    // sourceIndex = 2, insertionIndex = 1
    // 1 !== 2, 1 !== 3 → isNoOp = false (correct!)
    expect(result.isNoOp).toBe(false)
  })

  /**
   * The existing test case from flex-with-children.test.ts
   * This test expects isNoOp=true, but is it correct?
   *
   * Scenario: Move B to "after B" (cursor on B, placement=after)
   * This is conceptually "hovering on yourself" which could be a no-op.
   * However, the resulting insertionIndex (2) would place B after C!
   *
   * This test documents the CURRENT behavior, not necessarily correct behavior.
   */
  it('existing test: moving to "after self" is flagged as no-op (questionable)', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      { nodeId: 'c', rect: { x: 0, y: 96, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({
      direction: 'vertical',
      hasChildren: true,
    })
    const source = createMockCanvasSource({ nodeId: 'b' })

    // Cursor at y=70 - just after B's midpoint (68)
    // B is closest, placement = 'after', insertionIndex = 2
    const cursor: Point = { x: 50, y: 70 }
    const result = strategy.calculate(cursor, target, source, childRects)

    // Current behavior: isNoOp = true
    // Question: Is this the correct UX interpretation?
    expect(result.isNoOp).toBe(true)
  })

  /**
   * Horizontal layout version: moving forward by one position is NOT a no-op.
   * Bug was fixed: isNoOp now correctly returns false.
   */
  it('horizontal forward movement is NOT a no-op', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 80, height: 40 } },
      { nodeId: 'b', rect: { x: 88, y: 0, width: 80, height: 40 } }, // dragged
      { nodeId: 'c', rect: { x: 176, y: 0, width: 80, height: 40 } },
    ]
    const target = createMockFlexTarget({
      direction: 'horizontal',
      hasChildren: true,
    })
    const source = createMockCanvasSource({ nodeId: 'b' })

    // Cursor at x=200 - just before C's midpoint (216)
    // Distance to B (midpoint 128): |200-128| = 72
    // Distance to C (midpoint 216): |200-216| = 16 ← closest
    // C is closest, placement = 'before', insertionIndex = 2
    const cursor: Point = { x: 200, y: 20 }
    const result = strategy.calculate(cursor, target, source, childRects)

    expect(result.insertionIndex).toBe(2)
    expect(result.targetId).toBe('c')
    expect(result.placement).toBe('before')
    expect(result.isNoOp).toBe(false) // Correctly NOT a no-op
  })
})

/**
 * ANALYSIS (Historical - Fix Implemented)
 *
 * This analysis documents the bug investigation. The fix has been implemented.
 *
 * The no-op detection needs to account for the index shift after removal.
 * When sourceIndex < insertionIndex, the effective insertion position is
 * insertionIndex - 1 (because everything shifts down after removal).
 *
 * Correct logic:
 *
 * let effectiveInsertionIndex = insertionIndex
 * if (sourceIndex < insertionIndex) {
 *   effectiveInsertionIndex = insertionIndex - 1
 * }
 * isNoOp = effectiveInsertionIndex === sourceIndex
 *
 * Or more simply:
 * isNoOp = insertionIndex === sourceIndex ||
 *          (sourceIndex < insertionIndex && insertionIndex === sourceIndex + 1) ||
 *          (sourceIndex > insertionIndex && insertionIndex === sourceIndex)
 *
 * Wait, that's getting complicated. Let me think again...
 *
 * Actually, the simplest fix:
 * - Moving backward: effectiveIndex = insertionIndex
 * - Moving forward: effectiveIndex = insertionIndex - 1 (shift compensation)
 *
 * isNoOp = effectiveIndex === sourceIndex
 *
 * For our bug case:
 * - sourceIndex = 1, insertionIndex = 2
 * - Moving forward (insertionIndex > sourceIndex)
 * - effectiveIndex = 2 - 1 = 1
 * - 1 === 1 → isNoOp = true
 *
 * Hmm, that still gives isNoOp = true. Let me reconsider...
 *
 * Actually, the effective position after move is:
 * - If moving forward: finalIndex = insertionIndex - 1
 * - If moving backward: finalIndex = insertionIndex
 *
 * isNoOp should be: finalIndex === sourceIndex
 *
 * For moving B (index 1) to before C (insertionIndex 2):
 * - Moving forward (2 > 1)
 * - finalIndex = 2 - 1 = 1
 * - 1 === 1 → isNoOp = true
 *
 * Wait, that's wrong! Let me trace through the actual array operations:
 *
 * Original: [A, B, C] with indices [0, 1, 2]
 * 1. Remove B at index 1: [A, C] with indices [0, 1]
 * 2. Insert B at insertionIndex 2: [A, C, B]
 * 3. B is now at index 2!
 *
 * So the final position is actually insertionIndex (2), not insertionIndex - 1.
 * The shift happens to other elements, not to the insertion position.
 *
 * The correct check is:
 * isNoOp = (insertionIndex === sourceIndex) ||
 *          (insertionIndex === sourceIndex + 1 && sourceIndex >= insertionIndex)
 *
 * Actually, let me think about this differently:
 *
 * For isNoOp to be true, the element's position after the operation must equal
 * its position before the operation.
 *
 * After removing element at sourceIndex and inserting at insertionIndex:
 * - If insertionIndex <= sourceIndex: finalPosition = insertionIndex
 * - If insertionIndex > sourceIndex: finalPosition = insertionIndex - 1
 *   (because the source was removed, shifting the insertion point down)
 *
 * Wait no, that's also wrong. When you insert at a position, everything after
 * shifts up, and the element goes to that position.
 *
 * Let me trace more carefully:
 *
 * Original: [A, B, C] = [index 0, index 1, index 2], B is at index 1
 * Step 1 - Remove B: [A, C] = [index 0, index 1]
 * Step 2 - Insert B at insertionIndex 2:
 *   - The array [A, C] has indices [0, 1]
 *   - Inserting at index 2 appends: [A, C, B]
 *   - B is now at index 2
 *
 * So B moved from index 1 to index 2. This is NOT a no-op.
 *
 * Another example: Move C (index 2) to before B (insertionIndex 1)
 * Original: [A, B, C], C at index 2
 * Remove C: [A, B]
 * Insert at index 1: [A, C, B]
 * C is now at index 1, was at index 2. This is NOT a no-op.
 *
 * So when is it actually a no-op?
 *
 * Case 1: insertionIndex === sourceIndex (insert before self)
 * - Move B to "before B" (insertionIndex = 1)
 * - Remove B: [A, C]
 * - Insert at 1: [A, B, C]
 * - B is at index 1, was at index 1. This IS a no-op!
 *
 * Case 2: insertionIndex === sourceIndex + 1 AND user is hovering on the dragged element
 * - This is the "after self" case where closestIndex === sourceIndex
 * - Move B to "after B" (closestIndex = 1, placement = after, insertionIndex = 2)
 * - BUT this is only a no-op if the user is hovering directly on B
 * - If they're hovering on the gap between B and C, it's still placement "after B"
 *   but conceptually they want to move B to after C!
 *
 * The problem is: "placement after B" and "placement before C" both result in
 * insertionIndex = 2, but they have different semantic meanings!
 *
 * The fix should consider closestIndex as well:
 * isNoOp = (insertionIndex === sourceIndex) ||
 *          (closestIndex === sourceIndex && placement === 'after')
 *
 * This correctly identifies:
 * - "insert before self" as no-op
 * - "insert after self (hovering on self)" as no-op
 * - "insert before C (which happens to be insertionIndex 2)" as NOT no-op
 */
