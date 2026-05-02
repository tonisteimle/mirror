/**
 * studio/visual/layout-inference/layout-converter
 *
 * Wraps an alignment group in a layout container via CodeModifier.
 * We pin the validation/preview paths and the integration via a
 * minimal Mirror source. jsdom for AlignmentGroup's HTMLElement
 * fields, even though we don't render anything.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  LayoutConverter,
  createLayoutConverter,
} from '../../studio/visual/layout-inference/layout-converter'
import type { AlignmentGroup, ElementBounds } from '../../studio/visual/layout-inference/types'

function makeBounds(nodeId: string): ElementBounds {
  return {
    nodeId,
    element: document.createElement('div'),
    rect: new DOMRect(0, 0, 0, 0),
    centerX: 0,
    centerY: 0,
  }
}

function makeGroup(nodeIds: string[]): AlignmentGroup {
  return {
    id: 'g1',
    type: 'horizontal',
    elements: nodeIds.map(makeBounds),
    inferredGap: 16,
    suggestedDSL: 'hor, gap 16',
  }
}

describe('LayoutConverter — guard rails', () => {
  it('fails when no source is available', () => {
    const lc = new LayoutConverter({
      getSource: () => '',
      getSourceMap: () => null,
      onSourceChange: () => {},
    })
    const result = lc.convert(makeGroup(['a', 'b']))
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/source/i)
  })

  it('fails when fewer than 2 elements', () => {
    const lc = new LayoutConverter({
      getSource: () => 'Frame',
      getSourceMap: () => ({}),
      onSourceChange: () => {},
    })
    const result = lc.convert(makeGroup(['only-one']))
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/2 elements/)
  })
})

describe('LayoutConverter — preview', () => {
  it('formats preview with suggested DSL and node-id comments', () => {
    const lc = new LayoutConverter({
      getSource: () => '',
      getSourceMap: () => null,
      onSourceChange: () => {},
    })
    const out = lc.preview(makeGroup(['a', 'b', 'c']))
    expect(out).toContain('Box hor, gap 16')
    expect(out).toContain('// Element: a')
    expect(out).toContain('// Element: b')
    expect(out).toContain('// Element: c')
  })

  it('handles empty group elements gracefully', () => {
    const lc = new LayoutConverter({
      getSource: () => '',
      getSourceMap: () => null,
      onSourceChange: () => {},
    })
    const group: AlignmentGroup = {
      id: 'g',
      type: 'vertical',
      elements: [],
      inferredGap: 0,
      suggestedDSL: 'ver',
    }
    expect(lc.preview(group)).toBe('Box ver\n')
  })
})

describe('LayoutConverter — dispose + factory', () => {
  it('dispose() is callable and idempotent', () => {
    const lc = new LayoutConverter({
      getSource: () => '',
      getSourceMap: () => null,
      onSourceChange: () => {},
    })
    expect(() => {
      lc.dispose()
      lc.dispose()
    }).not.toThrow()
  })

  it('createLayoutConverter factory returns a working instance', () => {
    let changed: string | null = null
    const lc = createLayoutConverter({
      getSource: () => 'Frame',
      getSourceMap: () => ({}),
      onSourceChange: src => {
        changed = src
      },
    })
    expect(lc).toBeInstanceOf(LayoutConverter)
    // Trigger validation path so we exercise the converter without
    // needing a real wrap operation
    const r = lc.convert(makeGroup(['only-one']))
    expect(r.success).toBe(false)
    expect(changed).toBeNull()
  })
})

describe('LayoutConverter — passes structural failure from CodeModifier', () => {
  beforeEach(() => {})

  it('reports failure when wrapNodes cannot find nodes in source', () => {
    // Source with no matching node IDs → wrapNodes returns failure
    const lc = new LayoutConverter({
      getSource: () => 'Frame',
      getSourceMap: () => ({ getNodeById: () => null }),
      onSourceChange: () => {},
    })
    const result = lc.convert(makeGroup(['nonexistent-1', 'nonexistent-2']))
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
