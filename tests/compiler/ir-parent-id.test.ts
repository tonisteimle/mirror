/**
 * Tests for parentId propagation in SourceMap
 *
 * Verifies that child nodes correctly receive their parent's nodeId
 * in the sourceMap, which is critical for drag-drop move operations.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('SourceMap parentId propagation', () => {
  it('should set parentId for direct children of App', () => {
    const code = `
App bg #18181b, pad 20
  rect w 100, h 200, bg #FCC419
`
    const ast = parse(code)
    const { sourceMap } = toIR(ast, true)

    // Find the App node (root)
    const allNodes = sourceMap.getAllNodeIds()
    expect(allNodes.length).toBe(2) // App + rect

    // Find the rect node
    const rectNode = Array.from(allNodes)
      .map(id => sourceMap.getNodeById(id))
      .find(node => node?.componentName === 'rect')

    expect(rectNode).toBeDefined()
    expect(rectNode?.parentId).toBeDefined()

    // rect's parentId should match App's nodeId
    const appNode = Array.from(allNodes)
      .map(id => sourceMap.getNodeById(id))
      .find(node => node?.componentName === 'App')

    expect(appNode).toBeDefined()
    expect(rectNode?.parentId).toBe(appNode?.nodeId)
  })

  it('should set parentId for nested children', () => {
    const code = `
App
  Box pad 20
    Button "Click"
`
    const ast = parse(code)
    const { sourceMap } = toIR(ast, true)

    const allNodes = sourceMap.getAllNodeIds()
    expect(allNodes.length).toBe(3) // App + Box + Button

    // Find all nodes
    const nodes = Array.from(allNodes)
      .map(id => sourceMap.getNodeById(id))
      .filter(Boolean)

    const appNode = nodes.find(n => n?.componentName === 'App')
    const boxNode = nodes.find(n => n?.componentName === 'Box')
    const buttonNode = nodes.find(n => n?.componentName === 'Button')

    expect(appNode).toBeDefined()
    expect(boxNode).toBeDefined()
    expect(buttonNode).toBeDefined()

    // Box's parent should be App
    expect(boxNode?.parentId).toBe(appNode?.nodeId)

    // Button's parent should be Box
    expect(buttonNode?.parentId).toBe(boxNode?.nodeId)
  })

  it('should set parentId for multiple siblings', () => {
    const code = `
App
  Button "One"
  Button "Two"
  Button "Three"
`
    const ast = parse(code)
    const { sourceMap } = toIR(ast, true)

    const allNodes = sourceMap.getAllNodeIds()
    expect(allNodes.length).toBe(4) // App + 3 Buttons

    const nodes = Array.from(allNodes)
      .map(id => sourceMap.getNodeById(id))
      .filter(Boolean)

    const appNode = nodes.find(n => n?.componentName === 'App')
    const buttonNodes = nodes.filter(n => n?.componentName === 'Button')

    expect(appNode).toBeDefined()
    expect(buttonNodes.length).toBe(3)

    // All buttons should have App as parent
    for (const button of buttonNodes) {
      expect(button?.parentId).toBe(appNode?.nodeId)
    }
  })

  it('should NOT set parentId for root App node', () => {
    const code = `
App bg #18181b
`
    const ast = parse(code)
    const { sourceMap } = toIR(ast, true)

    const allNodes = sourceMap.getAllNodeIds()
    expect(allNodes.length).toBe(1) // Just App

    const appNode = sourceMap.getNodeById(allNodes[0])
    expect(appNode?.componentName).toBe('App')
    expect(appNode?.parentId).toBeUndefined()
  })
})
