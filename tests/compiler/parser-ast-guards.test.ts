/**
 * AST Type Guard Tests
 *
 * `compiler/parser/ast.ts` was 60% — type guards `isTable`,
 * `isTableColumn`, `isConditional`, `hasContent` were uncovered.
 */

import { describe, it, expect } from 'vitest'
import {
  isComponent,
  isInstance,
  isZagComponent,
  isSlot,
  isText,
  isEach,
  isConditional,
  hasContent,
  isTable,
  isTableColumn,
} from '../../compiler/parser/ast'

describe('AST Type Guards — positive cases', () => {
  it.each([
    [isComponent, { type: 'Component' }],
    [isInstance, { type: 'Instance' }],
    [isZagComponent, { type: 'ZagComponent' }],
    [isSlot, { type: 'Slot' }],
    [isText, { type: 'Text' }],
    [isEach, { type: 'Each' }],
    [isTable, { type: 'Table' }],
    [isTableColumn, { type: 'TableColumn' }],
  ])('returns true for matching type', (guard, node) => {
    expect((guard as any)(node)).toBe(true)
  })

  it('isConditional returns true for kind="conditional"', () => {
    expect(isConditional({ kind: 'conditional' })).toBe(true)
  })

  it('hasContent returns true for objects with content prop', () => {
    expect(hasContent({ content: 'Hello' })).toBe(true)
  })
})

describe('AST Type Guards — negative cases', () => {
  it.each([
    isComponent,
    isInstance,
    isZagComponent,
    isSlot,
    isText,
    isEach,
    isConditional,
    hasContent,
    isTable,
    isTableColumn,
  ])('rejects null/undefined/primitives', guard => {
    expect((guard as any)(null)).toBe(false)
    expect((guard as any)(undefined)).toBe(false)
    expect((guard as any)('string')).toBe(false)
    expect((guard as any)(42)).toBe(false)
    expect((guard as any)(true)).toBe(false)
  })

  it('rejects objects with wrong type field', () => {
    expect(isInstance({ type: 'Component' })).toBe(false)
    expect(isText({ type: 'Instance' })).toBe(false)
    expect(isTable({ type: 'TableRow' })).toBe(false)
    expect(isTableColumn({ type: 'Table' })).toBe(false)
  })

  it('isConditional rejects objects without kind="conditional"', () => {
    expect(isConditional({ type: 'Conditional' })).toBe(false)
    expect(isConditional({ kind: 'expression' })).toBe(false)
    expect(isConditional({})).toBe(false)
  })

  it('hasContent rejects objects without content prop', () => {
    expect(hasContent({ name: 'X' })).toBe(false)
    expect(hasContent({})).toBe(false)
  })
})
