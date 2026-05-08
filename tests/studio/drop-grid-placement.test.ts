/**
 * ElementMoveHandler — grid placement folded into the moveNode call.
 *
 * Phase-2 contract (current): when DropResult.gridPlacement is present,
 * the handler passes `{ properties: 'x N, y M [, w P] [, h Q]' }` to
 * moveNode so the new placement is written onto the moved block's first
 * line in the same edit. Default spans (w=1, h=1) are omitted to keep
 * the DSL minimal. Earlier iterations issued separate updateProperty
 * calls after the move; that broke because moveNode rewrites the source
 * but does NOT refresh sourceMap, so the follow-up updates targeted
 * stale line positions.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { ElementMoveHandler } from '../../studio/drop/handlers/element-move'
import type { DropResult, DropContext, CodeModifier } from '../../studio/drop/types'

function makeContext() {
  const calls: string[] = []
  const codeModifier: CodeModifier = {
    duplicateNode: vi.fn(),
    moveNode: vi.fn(
      (
        src: string,
        target: string,
        placement: string,
        idx?: number,
        options?: { properties?: string }
      ) => {
        const propsSuffix = options?.properties ? ` [props: ${options.properties}]` : ''
        calls.push(`move(${src} → ${target}@${idx ?? '?'}, ${placement})${propsSuffix}`)
        return {
          success: true,
          newSource: 'AFTER_MOVE',
          change: { from: 0, to: 100, insert: 'AFTER_MOVE' },
        }
      }
    ),
    updateProperty: vi.fn((nodeId: string, prop: string, value: string) => {
      calls.push(`updateProp(${nodeId}.${prop}=${value})`)
      return {
        success: true,
        newSource: `AFTER_${prop.toUpperCase()}=${value}`,
        change: {
          from: 0,
          to: 100,
          insert: `AFTER_${prop.toUpperCase()}=${value}`,
        },
      }
    }),
    addChild: vi.fn(),
    addChildWithTemplate: vi.fn(),
    getSourceLength: vi.fn(() => 100),
    addProperty: vi.fn(),
  }
  return { codeModifier, calls, context: { codeModifier } as unknown as DropContext }
}

describe('ElementMoveHandler — grid placement', () => {
  let handler: ElementMoveHandler

  beforeEach(() => {
    handler = new ElementMoveHandler()
  })

  test('folds x and y into the move call when gridPlacement uses default span', async () => {
    const { codeModifier, calls, context } = makeContext()
    const result: DropResult = {
      source: { type: 'element', nodeId: 'node-7' },
      targetNodeId: 'node-grid',
      placement: 'inside',
      insertionIndex: 0,
      gridPlacement: { x: 3, y: 1, w: 1, h: 1 },
    }

    const out = await handler.handle(result, context)

    expect(out.success).toBe(true)
    // Default spans (w=1, h=1) MUST NOT be emitted — keeps DSL minimal.
    expect(calls).toEqual(['move(node-7 → node-grid@0, inside) [props: x 3, y 1]'])
    expect(codeModifier.updateProperty).not.toHaveBeenCalled()
  })

  test('folds w and h into the move call when span > 1', async () => {
    const { codeModifier, calls, context } = makeContext()
    const result: DropResult = {
      source: { type: 'element', nodeId: 'node-7' },
      targetNodeId: 'node-grid',
      placement: 'inside',
      insertionIndex: 0,
      gridPlacement: { x: 2, y: 3, w: 4, h: 2 },
    }

    await handler.handle(result, context)

    expect(calls).toEqual(['move(node-7 → node-grid@0, inside) [props: x 2, y 3, w 4, h 2]'])
    expect(codeModifier.updateProperty).not.toHaveBeenCalled()
  })

  test('does not write x/y when no gridPlacement (regular flex move)', async () => {
    const { calls, context } = makeContext()
    const result: DropResult = {
      source: { type: 'element', nodeId: 'node-7' },
      targetNodeId: 'node-other',
      placement: 'inside',
      insertionIndex: 2,
    }

    await handler.handle(result, context)

    expect(calls).toEqual(['move(node-7 → node-other@2, inside)'])
  })

  test('change range covers the full original→final source for atomic undo', async () => {
    const { context } = makeContext()
    const result: DropResult = {
      source: { type: 'element', nodeId: 'node-7' },
      targetNodeId: 'node-grid',
      placement: 'inside',
      insertionIndex: 0,
      gridPlacement: { x: 3, y: 1, w: 1, h: 1 },
    }

    const out = await handler.handle(result, context)

    expect(out.change?.from).toBe(0)
    expect(out.change?.to).toBe(100) // original source length
  })

  test('aborts on move failure (does not attempt grid writes)', async () => {
    const { calls, context } = makeContext()
    ;(context.codeModifier.moveNode as any).mockReturnValue({
      success: false,
      error: 'cannot move into self',
    })

    const result: DropResult = {
      source: { type: 'element', nodeId: 'node-7' },
      targetNodeId: 'node-grid',
      placement: 'inside',
      insertionIndex: 0,
      gridPlacement: { x: 1, y: 1, w: 1, h: 1 },
    }

    const out = await handler.handle(result, context)

    expect(out.success).toBe(false)
    expect(calls.length).toBe(0)
  })
})
