/**
 * SourceMap Coverage Tests (Thema 17)
 *
 * Schließt Lücken in `ir-source-map.test.ts` für Methoden, die im Original
 * nicht/kaum geprüft wurden:
 * - getSiblings / getNextSibling / getPreviousSibling
 * - getParent
 * - isDescendantOf (inkl. Cycle-Protection)
 * - getDefinitionAtLine
 * - getRootNodes
 * - getMainRoot
 * - calculatePropertyPosition
 * - SourceMapBuilder addPropertyPosition (no-op-Fall)
 *
 * Plus Integration-Tests: parse → IR → SourceMap konsistent für echte
 * Mirror-Snippets.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SourceMap,
  SourceMapBuilder,
  calculatePropertyPosition,
  type NodeMapping,
} from '../../compiler/ir/source-map'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

function makeNode(
  id: string,
  line: number,
  endLine: number = line,
  options: Partial<NodeMapping> = {}
): NodeMapping {
  return {
    nodeId: id,
    componentName: options.componentName ?? 'X',
    position: { line, column: 1, endLine, endColumn: 1 },
    properties: new Map(),
    isDefinition: options.isDefinition ?? false,
    instanceName: options.instanceName,
    isEachTemplate: options.isEachTemplate,
    isConditional: options.isConditional,
    parentId: options.parentId,
  }
}

// =============================================================================
// Sibling navigation
// =============================================================================

describe('SourceMap — getSiblings / getNextSibling / getPreviousSibling', () => {
  let map: SourceMap
  beforeEach(() => {
    map = new SourceMap()
    map.addNode(makeNode('parent', 1, 10))
    map.addNode(makeNode('child-a', 2, 2, { parentId: 'parent' }))
    map.addNode(makeNode('child-b', 4, 4, { parentId: 'parent' }))
    map.addNode(makeNode('child-c', 6, 6, { parentId: 'parent' }))
  })

  it('getSiblings returns other children of same parent, sorted by line', () => {
    const siblings = map.getSiblings('child-b')
    expect(siblings.map(s => s.nodeId)).toEqual(['child-a', 'child-c'])
  })

  it('getSiblings returns [] for non-existent node', () => {
    expect(map.getSiblings('missing')).toEqual([])
  })

  it('getSiblings of a root node returns other root nodes', () => {
    const map2 = new SourceMap()
    map2.addNode(makeNode('root-1', 1, 1))
    map2.addNode(makeNode('root-2', 3, 3))
    map2.addNode(makeNode('root-3', 5, 5))
    expect(map2.getSiblings('root-1').map(s => s.nodeId)).toEqual(['root-2', 'root-3'])
  })

  it('getNextSibling finds the first sibling after this node', () => {
    expect(map.getNextSibling('child-a')?.nodeId).toBe('child-b')
    expect(map.getNextSibling('child-b')?.nodeId).toBe('child-c')
  })

  it('getNextSibling returns null when this is the last sibling', () => {
    expect(map.getNextSibling('child-c')).toBeNull()
  })

  it('getNextSibling returns null for non-existent node', () => {
    expect(map.getNextSibling('missing')).toBeNull()
  })

  it('getPreviousSibling finds the last sibling before this node', () => {
    expect(map.getPreviousSibling('child-c')?.nodeId).toBe('child-b')
    expect(map.getPreviousSibling('child-b')?.nodeId).toBe('child-a')
  })

  it('getPreviousSibling returns null when this is the first sibling', () => {
    expect(map.getPreviousSibling('child-a')).toBeNull()
  })

  it('getPreviousSibling returns null for non-existent node', () => {
    expect(map.getPreviousSibling('missing')).toBeNull()
  })
})

// =============================================================================
// Parent navigation
// =============================================================================

describe('SourceMap — getParent', () => {
  let map: SourceMap
  beforeEach(() => {
    map = new SourceMap()
    map.addNode(makeNode('grandparent', 1, 10))
    map.addNode(makeNode('parent', 2, 8, { parentId: 'grandparent' }))
    map.addNode(makeNode('child', 3, 3, { parentId: 'parent' }))
  })

  it('returns the parent node', () => {
    expect(map.getParent('child')?.nodeId).toBe('parent')
    expect(map.getParent('parent')?.nodeId).toBe('grandparent')
  })

  it('returns null for root nodes (no parent)', () => {
    expect(map.getParent('grandparent')).toBeNull()
  })

  it('returns null for non-existent nodes', () => {
    expect(map.getParent('missing')).toBeNull()
  })
})

// =============================================================================
// isDescendantOf
// =============================================================================

describe('SourceMap — isDescendantOf', () => {
  let map: SourceMap
  beforeEach(() => {
    map = new SourceMap()
    map.addNode(makeNode('a', 1, 20))
    map.addNode(makeNode('b', 2, 15, { parentId: 'a' }))
    map.addNode(makeNode('c', 3, 10, { parentId: 'b' }))
    map.addNode(makeNode('d', 16, 19, { parentId: 'a' }))
  })

  it('returns true for direct children', () => {
    expect(map.isDescendantOf('b', 'a')).toBe(true)
    expect(map.isDescendantOf('d', 'a')).toBe(true)
  })

  it('returns true for transitive descendants', () => {
    expect(map.isDescendantOf('c', 'a')).toBe(true)
    expect(map.isDescendantOf('c', 'b')).toBe(true)
  })

  it('returns false for non-ancestors', () => {
    expect(map.isDescendantOf('b', 'c')).toBe(false)
    expect(map.isDescendantOf('b', 'd')).toBe(false)
  })

  it('returns false when target equals ancestor', () => {
    expect(map.isDescendantOf('a', 'a')).toBe(false)
  })

  it('returns false for unknown nodes', () => {
    expect(map.isDescendantOf('missing', 'a')).toBe(false)
    expect(map.isDescendantOf('c', 'missing')).toBe(false)
  })

  it('terminates safely on a parent-id cycle', () => {
    // Construct a synthetic cycle: x → y → x
    const cycleMap = new SourceMap()
    cycleMap.addNode(makeNode('x', 1, 5, { parentId: 'y' }))
    cycleMap.addNode(makeNode('y', 1, 5, { parentId: 'x' }))
    // Should not infinite-loop and must return false
    expect(cycleMap.isDescendantOf('x', 'unrelated')).toBe(false)
  })
})

// =============================================================================
// Definition / Root / Main-Root
// =============================================================================

describe('SourceMap — getDefinitionAtLine', () => {
  let map: SourceMap
  beforeEach(() => {
    map = new SourceMap()
    map.addNode(makeNode('def-outer', 1, 20, { isDefinition: true }))
    map.addNode(makeNode('def-inner', 5, 10, { isDefinition: true }))
    map.addNode(makeNode('inst', 5, 10, { isDefinition: false }))
  })

  it('finds the most specific definition at a line', () => {
    const found = map.getDefinitionAtLine(7)
    expect(found?.nodeId).toBe('def-inner')
  })

  it('falls back to outer definition when only it covers the line', () => {
    const found = map.getDefinitionAtLine(15)
    expect(found?.nodeId).toBe('def-outer')
  })

  it('returns null when no definition covers the line', () => {
    expect(map.getDefinitionAtLine(99)).toBeNull()
  })

  it('skips non-definition nodes', () => {
    const found = map.getDefinitionAtLine(5)
    expect(found?.isDefinition).toBe(true)
  })
})

describe('SourceMap — getRootNodes / getMainRoot', () => {
  it('getRootNodes returns nodes without parentId, excluding definitions', () => {
    const map = new SourceMap()
    map.addNode(makeNode('def', 1, 10, { isDefinition: true }))
    map.addNode(makeNode('root-1', 11, 11))
    map.addNode(makeNode('root-2', 12, 12))
    map.addNode(makeNode('child', 13, 13, { parentId: 'root-2' }))

    const roots = map.getRootNodes()
    expect(roots.map(r => r.nodeId).sort()).toEqual(['root-1', 'root-2'])
  })

  it('getMainRoot prefers a node named "App" (instanceName)', () => {
    const map = new SourceMap()
    map.addNode(makeNode('a', 1, 1, { instanceName: 'Other' }))
    map.addNode(makeNode('b', 2, 2, { instanceName: 'App' }))
    expect(map.getMainRoot()?.nodeId).toBe('b')
  })

  it('getMainRoot prefers a node named "App" (componentName)', () => {
    const map = new SourceMap()
    map.addNode(makeNode('a', 1, 1, { componentName: 'Frame' }))
    map.addNode(makeNode('b', 2, 2, { componentName: 'App' }))
    expect(map.getMainRoot()?.nodeId).toBe('b')
  })

  it('getMainRoot falls back to first root if no App', () => {
    const map = new SourceMap()
    map.addNode(makeNode('first', 1, 1))
    map.addNode(makeNode('second', 2, 2))
    expect(map.getMainRoot()?.nodeId).toBe('first')
  })

  it('getMainRoot returns null when there are no roots', () => {
    const map = new SourceMap()
    expect(map.getMainRoot()).toBeNull()
  })
})

// =============================================================================
// calculatePropertyPosition
// =============================================================================

describe('SourceMap — calculatePropertyPosition', () => {
  it('finds property + value in a single-line', () => {
    const pos = calculatePropertyPosition('Frame pad 12, bg #333, col white', 5, 'pad', '12')
    expect(pos).not.toBeNull()
    expect(pos?.line).toBe(5)
    // 'pad' starts at column 7 (1-indexed)
    expect(pos?.column).toBeGreaterThan(0)
  })

  it('returns null when property is not present', () => {
    const pos = calculatePropertyPosition('Frame col white', 1, 'bg', '#fff')
    expect(pos).toBeNull()
  })

  it('finds property even without explicit value (standalone property)', () => {
    const pos = calculatePropertyPosition('Frame hor', 1, 'hor', '')
    expect(pos).not.toBeNull()
  })

  it('handles property at start of line (no preceding space)', () => {
    const pos = calculatePropertyPosition('pad 12', 1, 'pad', '12')
    expect(pos).not.toBeNull()
    expect(pos?.column).toBe(1)
  })
})

// =============================================================================
// SourceMapBuilder edge cases
// =============================================================================

describe('SourceMapBuilder — addPropertyPosition no-op for missing node', () => {
  it('silently ignores property add for unknown node', () => {
    const builder = new SourceMapBuilder()
    builder.addPropertyPosition('does-not-exist', 'pad', {
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 5,
    })
    // No throw, no node created
    expect(builder.build().getAllNodeIds()).toEqual([])
  })
})

// =============================================================================
// Integration: real parse → IR → SourceMap
// =============================================================================

describe('SourceMap Integration — real Mirror snippets', () => {
  it('produces a non-empty source map for a basic Frame + children', () => {
    const ast = parse(`Frame gap 8
  Text "Hello"
  Text "World"`)
    const ir = toIR(ast, true)
    expect(ir.sourceMap).toBeTruthy()
    const ids = ir.sourceMap.getAllNodeIds()
    expect(ids.length).toBeGreaterThan(0)
  })

  it('parent-child hierarchy is captured', () => {
    const ast = parse(`Frame
  Text "X"`)
    const ir = toIR(ast, true)
    const sm = ir.sourceMap
    const allNodes = sm.getAllNodes()
    // At least one node has a parentId set (the inner Text)
    const haveParent = allNodes.filter(n => n.parentId)
    expect(haveParent.length).toBeGreaterThan(0)
  })

  it('component definition nodes are flagged as isDefinition', () => {
    const ast = parse(`Btn: pad 10 20, bg #2271C1

Btn "Click"`)
    const ir = toIR(ast, true)
    const sm = ir.sourceMap
    const definitions = sm.getAllNodes().filter(n => n.isDefinition)
    expect(definitions.length).toBeGreaterThan(0)
    expect(definitions[0].componentName).toBe('Btn')
  })

  it('each-loop creates a template node flagged isEachTemplate', () => {
    const ast = parse(`tasks:
  t1:
    title: "A"
  t2:
    title: "B"

each task in $tasks
  Text task.title`)
    const ir = toIR(ast, true)
    const sm = ir.sourceMap
    const templates = sm.getAllNodes().filter(n => n.isEachTemplate)
    expect(templates.length).toBeGreaterThan(0)
  })

  it('getNodeAtLine finds the most specific node for a click', () => {
    const ast = parse(`Frame gap 8
  Text "Hello"
  Text "World"`)
    const ir = toIR(ast, true)
    const sm = ir.sourceMap
    // Line 2 contains the first Text
    const found = sm.getNodeAtLine(2)
    expect(found).not.toBeNull()
    expect(found?.componentName).toBe('Text')
  })
})
