/**
 * Tests for CodeModifier.wrapNodes and unwrapNode
 */

import { describe, it, expect } from 'vitest'
import { CodeModifier } from '../../src/studio/code-modifier'
import { SourceMapBuilder } from '../../src/ir/source-map'

// Helper to create SourceMap from source
function createSourceMap(config: {
  nodes: Array<{
    id: string
    componentName: string
    line: number
    endLine: number
    parentId?: string
  }>
}) {
  const builder = new SourceMapBuilder()

  for (const node of config.nodes) {
    builder.addNode(node.id, node.componentName, {
      line: node.line,
      column: 1,
      endLine: node.endLine,
      endColumn: 100,
    }, {
      parentId: node.parentId,
    })
  }

  return builder.build()
}

describe('CodeModifier.wrapNodes', () => {
  it('wraps two sibling nodes in a Box', () => {
    const source = `App
  Button "First"
  Button "Second"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 3 },
        { id: 'btn1', componentName: 'Button', line: 2, endLine: 2, parentId: 'app' },
        { id: 'btn2', componentName: 'Button', line: 3, endLine: 3, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.wrapNodes(['btn1', 'btn2'], 'Box', 'hor')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Box hor')
    expect(result.newSource).toContain('    Button "First"')  // Re-indented
    expect(result.newSource).toContain('    Button "Second"') // Re-indented
  })

  it('wraps nodes with custom wrapper name', () => {
    const source = `App
  Text "A"
  Text "B"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 3 },
        { id: 'txt1', componentName: 'Text', line: 2, endLine: 2, parentId: 'app' },
        { id: 'txt2', componentName: 'Text', line: 3, endLine: 3, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.wrapNodes(['txt1', 'txt2'], 'Stack')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Stack')
  })

  it('preserves nested children when wrapping', () => {
    const source = `App
  Box
    Button "Inside"
  Text "Outside"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 4 },
        { id: 'box', componentName: 'Box', line: 2, endLine: 3, parentId: 'app' },
        { id: 'btn', componentName: 'Button', line: 3, endLine: 3, parentId: 'box' },
        { id: 'txt', componentName: 'Text', line: 4, endLine: 4, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.wrapNodes(['box', 'txt'], 'Box', 'ver')

    expect(result.success).toBe(true)
    // Should contain the nested Button
    expect(result.newSource).toContain('Button "Inside"')
    expect(result.newSource).toContain('Text "Outside"')
  })

  it('fails with less than 2 nodes', () => {
    const source = `App
  Button "Single"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 2 },
        { id: 'btn', componentName: 'Button', line: 2, endLine: 2, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.wrapNodes(['btn'])

    expect(result.success).toBe(false)
    expect(result.error).toContain('at least 2 nodes')
  })

  it('fails when nodes have different parents', () => {
    const source = `App
  Box
    Button "In Box"
  Button "Outside"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 4 },
        { id: 'box', componentName: 'Box', line: 2, endLine: 3, parentId: 'app' },
        { id: 'btn1', componentName: 'Button', line: 3, endLine: 3, parentId: 'box' },
        { id: 'btn2', componentName: 'Button', line: 4, endLine: 4, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.wrapNodes(['btn1', 'btn2'])

    expect(result.success).toBe(false)
    expect(result.error).toContain('same parent')
  })

  it('fails when node not found', () => {
    const source = `App
  Button "Exists"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 2 },
        { id: 'btn', componentName: 'Button', line: 2, endLine: 2, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.wrapNodes(['btn', 'nonexistent'])

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('maintains correct indentation levels', () => {
    const source = `App
  Container
    Button "A"
    Button "B"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 4 },
        { id: 'container', componentName: 'Container', line: 2, endLine: 4, parentId: 'app' },
        { id: 'btnA', componentName: 'Button', line: 3, endLine: 3, parentId: 'container' },
        { id: 'btnB', componentName: 'Button', line: 4, endLine: 4, parentId: 'container' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.wrapNodes(['btnA', 'btnB'], 'Box', 'hor')

    expect(result.success).toBe(true)
    // Wrapper should be at same level as original nodes (4 spaces)
    expect(result.newSource).toMatch(/    Box hor/)
    // Children should be indented 2 more spaces (6 spaces)
    expect(result.newSource).toMatch(/      Button "A"/)
    expect(result.newSource).toMatch(/      Button "B"/)
  })
})

describe('CodeModifier.unwrapNode', () => {
  it('unwraps a container, promoting children to parent level', () => {
    const source = `App
  Box hor
    Button "First"
    Button "Second"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 4 },
        { id: 'box', componentName: 'Box', line: 2, endLine: 4, parentId: 'app' },
        { id: 'btn1', componentName: 'Button', line: 3, endLine: 3, parentId: 'box' },
        { id: 'btn2', componentName: 'Button', line: 4, endLine: 4, parentId: 'box' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.unwrapNode('box')

    expect(result.success).toBe(true)
    // Box should be removed
    expect(result.newSource).not.toContain('Box hor')
    // Children should be at parent level (2 spaces instead of 4)
    expect(result.newSource).toContain('  Button "First"')
    expect(result.newSource).toContain('  Button "Second"')
  })

  it('preserves nested children when unwrapping', () => {
    const source = `App
  Wrapper
    Container
      Text "Nested"
    Button "Direct"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 5 },
        { id: 'wrapper', componentName: 'Wrapper', line: 2, endLine: 5, parentId: 'app' },
        { id: 'container', componentName: 'Container', line: 3, endLine: 4, parentId: 'wrapper' },
        { id: 'text', componentName: 'Text', line: 4, endLine: 4, parentId: 'container' },
        { id: 'btn', componentName: 'Button', line: 5, endLine: 5, parentId: 'wrapper' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.unwrapNode('wrapper')

    expect(result.success).toBe(true)
    // Wrapper should be removed
    expect(result.newSource).not.toContain('Wrapper')
    // Container and Button should be at App level
    expect(result.newSource).toContain('  Container')
    expect(result.newSource).toContain('  Button "Direct"')
    // Text should still be nested under Container
    expect(result.newSource).toContain('    Text "Nested"')
  })

  it('fails when node has no children', () => {
    const source = `App
  Button "Leaf"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 2 },
        { id: 'btn', componentName: 'Button', line: 2, endLine: 2, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.unwrapNode('btn')

    expect(result.success).toBe(false)
    expect(result.error).toContain('no children')
  })

  it('fails when trying to unwrap root', () => {
    const source = `App
  Button "Child"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 2 },
        { id: 'btn', componentName: 'Button', line: 2, endLine: 2, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.unwrapNode('app')

    expect(result.success).toBe(false)
    expect(result.error).toContain('root')
  })

  it('fails when node not found', () => {
    const source = `App
  Button "Exists"`

    const sourceMap = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 2 },
        { id: 'btn', componentName: 'Button', line: 2, endLine: 2, parentId: 'app' },
      ]
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.unwrapNode('nonexistent')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('wrap and unwrap are inverse operations', () => {
    // Start with two buttons
    const originalSource = `App
  Button "First"
  Button "Second"`

    const sourceMap1 = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 3 },
        { id: 'btn1', componentName: 'Button', line: 2, endLine: 2, parentId: 'app' },
        { id: 'btn2', componentName: 'Button', line: 3, endLine: 3, parentId: 'app' },
      ]
    })

    // Wrap them
    const modifier1 = new CodeModifier(originalSource, sourceMap1)
    const wrapResult = modifier1.wrapNodes(['btn1', 'btn2'], 'Box', 'hor')
    expect(wrapResult.success).toBe(true)

    // Now unwrap
    const sourceMap2 = createSourceMap({
      nodes: [
        { id: 'app', componentName: 'App', line: 1, endLine: 4 },
        { id: 'box', componentName: 'Box', line: 2, endLine: 4, parentId: 'app' },
        { id: 'btn1', componentName: 'Button', line: 3, endLine: 3, parentId: 'box' },
        { id: 'btn2', componentName: 'Button', line: 4, endLine: 4, parentId: 'box' },
      ]
    })

    const modifier2 = new CodeModifier(wrapResult.newSource, sourceMap2)
    const unwrapResult = modifier2.unwrapNode('box')
    expect(unwrapResult.success).toBe(true)

    // Should be back to original (or equivalent)
    expect(unwrapResult.newSource).toContain('  Button "First"')
    expect(unwrapResult.newSource).toContain('  Button "Second"')
    expect(unwrapResult.newSource).not.toContain('Box')
  })
})
