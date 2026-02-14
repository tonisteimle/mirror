/**
 * Parser Utils Tests
 *
 * Tests for parser utility functions:
 * - Direction splitting
 * - CSS shorthand expansion
 * - AST node traversal
 * - Command application
 * - Template utilities
 */

import { describe, it, expect } from 'vitest'
import {
  splitDirections,
  expandCSSShorthand,
  applySpacingToProperties,
  createTextNode,
  findNode,
  findNodeRecursive,
  cloneChildrenWithNewIds,
  applyCommands,
  createTemplateFromNode,
  applyTemplate,
} from '../../parser/parser-utils'
import { createASTNode, createComponentTemplate } from '../kit/ast-builders'
import type { SelectionCommand } from '../../parser/types'

describe('parser-utils', () => {
  describe('splitDirections', () => {
    it('returns single direction as array', () => {
      expect(splitDirections('u')).toEqual(['u'])
      expect(splitDirections('d')).toEqual(['d'])
      expect(splitDirections('l')).toEqual(['l'])
      expect(splitDirections('r')).toEqual(['r'])
    })

    it('splits hyphenated directions', () => {
      expect(splitDirections('u-d')).toEqual(['u', 'd'])
      expect(splitDirections('l-r')).toEqual(['l', 'r'])
    })

    it('splits multiple hyphenated directions', () => {
      expect(splitDirections('u-d-l-r')).toEqual(['u', 'd', 'l', 'r'])
    })
  })

  describe('expandCSSShorthand', () => {
    it('expands single value to all directions', () => {
      expect(expandCSSShorthand([10])).toEqual({ u: 10, r: 10, d: 10, l: 10 })
    })

    it('expands two values (vertical, horizontal)', () => {
      expect(expandCSSShorthand([10, 20])).toEqual({ u: 10, d: 10, l: 20, r: 20 })
    })

    it('expands three values (top, horizontal, bottom)', () => {
      expect(expandCSSShorthand([10, 20, 30])).toEqual({ u: 10, l: 20, r: 20, d: 30 })
    })

    it('expands four values (top, right, bottom, left)', () => {
      expect(expandCSSShorthand([10, 20, 30, 40])).toEqual({ u: 10, r: 20, d: 30, l: 40 })
    })

    it('returns zeros for empty array', () => {
      expect(expandCSSShorthand([])).toEqual({ u: 0, r: 0, d: 0, l: 0 })
    })
  })

  describe('applySpacingToProperties', () => {
    it('does nothing for empty values', () => {
      const properties: Record<string, unknown> = {}
      applySpacingToProperties(properties, 'pad', [], [])
      expect(properties).toEqual({})
    })

    it('applies single value uniformly', () => {
      const properties: Record<string, unknown> = {}
      applySpacingToProperties(properties, 'pad', [16], [])
      expect(properties).toEqual({ pad: 16 })
    })

    it('applies to specific directions', () => {
      const properties: Record<string, unknown> = {}
      applySpacingToProperties(properties, 'pad', [16], ['l', 'r'])
      expect(properties).toEqual({ pad_l: 16, pad_r: 16 })
    })

    it('expands CSS shorthand for 2 values', () => {
      const properties: Record<string, unknown> = {}
      applySpacingToProperties(properties, 'mar', [10, 20], [])
      expect(properties).toEqual({
        mar_u: 10,
        mar_d: 10,
        mar_l: 20,
        mar_r: 20,
      })
    })

    it('expands CSS shorthand for 4 values', () => {
      const properties: Record<string, unknown> = {}
      applySpacingToProperties(properties, 'pad', [1, 2, 3, 4], [])
      expect(properties).toEqual({
        pad_u: 1,
        pad_r: 2,
        pad_d: 3,
        pad_l: 4,
      })
    })
  })

  describe('createTextNode', () => {
    it('creates text node with content', () => {
      const generateId = (name: string) => `${name}1`
      const node = createTextNode('Hello World', generateId)

      expect(node.type).toBe('component')
      expect(node.name).toBe('_text')
      expect(node.id).toBe('text1')
      expect(node.content).toBe('Hello World')
      expect(node.children).toEqual([])
    })

    it('creates text node without id when generateId is null', () => {
      const node = createTextNode('Test', null)

      expect(node.id).toBe('')
      expect(node.content).toBe('Test')
    })

    it('includes line and column when provided', () => {
      const generateId = (name: string) => `${name}1`
      const node = createTextNode('Text', generateId, 5, 10)

      expect(node.line).toBe(5)
      expect(node.column).toBe(10)
    })
  })

  describe('findNode', () => {
    it('finds node at top level', () => {
      const nodes = [
        createASTNode({ id: 'box1', name: 'Box' }),
        createASTNode({ id: 'box2', name: 'Box' }),
      ]

      const result = findNode(nodes, 'box2')

      expect(result).not.toBeNull()
      expect(result?.node.id).toBe('box2')
      expect(result?.parent).toBeNull()
      expect(result?.index).toBe(1)
    })

    it('finds nested node', () => {
      const child = createASTNode({ id: 'child1', name: 'Text' })
      const parent = createASTNode({ id: 'box1', name: 'Box', children: [child] })
      const nodes = [parent]

      const result = findNode(nodes, 'child1')

      expect(result).not.toBeNull()
      expect(result?.node.id).toBe('child1')
      expect(result?.parent?.id).toBe('box1')
      expect(result?.index).toBe(0)
    })

    it('returns null for non-existent id', () => {
      const nodes = [createASTNode({ id: 'box1', name: 'Box' })]

      const result = findNode(nodes, 'nonexistent')

      expect(result).toBeNull()
    })

    it('finds deeply nested node', () => {
      const deepChild = createASTNode({ id: 'deep1', name: 'Text' })
      const middleChild = createASTNode({ id: 'middle1', name: 'Box', children: [deepChild] })
      const parent = createASTNode({ id: 'box1', name: 'Box', children: [middleChild] })
      const nodes = [parent]

      const result = findNode(nodes, 'deep1')

      expect(result).not.toBeNull()
      expect(result?.node.id).toBe('deep1')
      expect(result?.parent?.id).toBe('middle1')
    })
  })

  describe('findNodeRecursive', () => {
    it('finds direct child', () => {
      const child = createASTNode({ id: 'child1', name: 'Text' })
      const parent = createASTNode({ id: 'parent1', name: 'Box', children: [child] })

      const result = findNodeRecursive(parent, 'child1')

      expect(result).not.toBeNull()
      expect(result?.node.id).toBe('child1')
      expect(result?.parent?.id).toBe('parent1')
    })

    it('finds grandchild', () => {
      const grandchild = createASTNode({ id: 'grandchild1', name: 'Text' })
      const child = createASTNode({ id: 'child1', name: 'Box', children: [grandchild] })
      const parent = createASTNode({ id: 'parent1', name: 'Box', children: [child] })

      const result = findNodeRecursive(parent, 'grandchild1')

      expect(result).not.toBeNull()
      expect(result?.parent?.id).toBe('child1')
    })

    it('returns null when not found', () => {
      const parent = createASTNode({ id: 'parent1', name: 'Box', children: [] })

      const result = findNodeRecursive(parent, 'missing')

      expect(result).toBeNull()
    })
  })

  describe('cloneChildrenWithNewIds', () => {
    it('clones children with new ids', () => {
      let counter = 0
      const generateId = () => `new${++counter}`

      const children = [
        createASTNode({ id: 'old1', name: 'Box' }),
        createASTNode({ id: 'old2', name: 'Text' }),
      ]

      const cloned = cloneChildrenWithNewIds(children, generateId)

      expect(cloned).toHaveLength(2)
      expect(cloned[0].id).toBe('new1')
      expect(cloned[1].id).toBe('new2')
      expect(cloned[0].name).toBe('Box')
      expect(cloned[1].name).toBe('Text')
    })

    it('recursively clones nested children', () => {
      let counter = 0
      const generateId = () => `new${++counter}`

      const grandchild = createASTNode({ id: 'gc1', name: 'Text' })
      const child = createASTNode({ id: 'c1', name: 'Box', children: [grandchild] })

      const cloned = cloneChildrenWithNewIds([child], generateId)

      expect(cloned[0].id).toBe('new1')
      expect(cloned[0].children[0].id).toBe('new2')
    })

    it('returns empty array for empty input', () => {
      const cloned = cloneChildrenWithNewIds([], () => 'id')
      expect(cloned).toEqual([])
    })
  })

  describe('applyCommands', () => {
    let idCounter: number
    const generateId = (name: string) => `${name}${++idCounter}`

    beforeEach(() => {
      idCounter = 0
    })

    it('applies modify command', () => {
      const nodes = [createASTNode({ id: 'box1', name: 'Box', properties: {} })]
      const commands: SelectionCommand[] = [{
        type: 'modify',
        targetId: 'box1',
        property: 'col',
        value: '#FF0000',
      }]

      applyCommands(nodes, commands, generateId)

      expect(nodes[0].properties.col).toBe('#FF0000')
    })

    it('applies addChild command', () => {
      const nodes = [createASTNode({ id: 'box1', name: 'Box', children: [] })]
      const commands: SelectionCommand[] = [{
        type: 'addChild',
        targetId: 'box1',
        component: {
          type: 'component',
          name: 'Text',
          properties: {},
          children: [],
        },
      }]

      applyCommands(nodes, commands, generateId)

      expect(nodes[0].children).toHaveLength(1)
      expect(nodes[0].children[0].name).toBe('Text')
      expect(nodes[0].children[0].id).toBe('Text1')
    })

    it('applies addAfter command at root level', () => {
      const nodes = [
        createASTNode({ id: 'box1', name: 'Box' }),
        createASTNode({ id: 'box2', name: 'Box' }),
      ]
      const commands: SelectionCommand[] = [{
        type: 'addAfter',
        targetId: 'box1',
        component: {
          type: 'component',
          name: 'Divider',
          properties: {},
          children: [],
        },
      }]

      applyCommands(nodes, commands, generateId)

      expect(nodes).toHaveLength(3)
      expect(nodes[0].id).toBe('box1')
      expect(nodes[1].name).toBe('Divider')
      expect(nodes[2].id).toBe('box2')
    })

    it('applies addBefore command at root level', () => {
      const nodes = [createASTNode({ id: 'box1', name: 'Box' })]
      const commands: SelectionCommand[] = [{
        type: 'addBefore',
        targetId: 'box1',
        component: {
          type: 'component',
          name: 'Header',
          properties: {},
          children: [],
        },
      }]

      applyCommands(nodes, commands, generateId)

      expect(nodes).toHaveLength(2)
      expect(nodes[0].name).toBe('Header')
      expect(nodes[1].id).toBe('box1')
    })

    it('ignores command for non-existent target', () => {
      const nodes = [createASTNode({ id: 'box1', name: 'Box' })]
      const commands: SelectionCommand[] = [{
        type: 'modify',
        targetId: 'missing',
        property: 'col',
        value: '#FF0000',
      }]

      applyCommands(nodes, commands, generateId)

      expect(nodes[0].properties.col).toBeUndefined()
    })
  })

  describe('createTemplateFromNode', () => {
    it('creates template with properties', () => {
      const node = createASTNode({
        properties: { col: '#FFF', pad: 16 },
      })

      const template = createTemplateFromNode(node)

      expect(template.properties).toEqual({ col: '#FFF', pad: 16 })
    })

    it('creates template with content', () => {
      const node = createASTNode({
        properties: {},
        content: 'Button Text',
      })

      const template = createTemplateFromNode(node)

      expect(template.content).toBe('Button Text')
    })

    it('creates empty children array', () => {
      const node = createASTNode({
        children: [createASTNode({ id: 'child1' })],
      })

      const template = createTemplateFromNode(node)

      expect(template.children).toEqual([])
    })
  })

  describe('applyTemplate', () => {
    it('applies template properties to node', () => {
      const registry = new Map([
        ['Card', createComponentTemplate({ properties: { rad: 8, col: '#FFF' } })],
      ])
      const node = createASTNode({ name: 'Card', properties: {} })

      applyTemplate(registry, node, 'Card', 'Card')

      expect(node.properties).toEqual({ rad: 8, col: '#FFF' })
    })

    it('applies template content to node', () => {
      const registry = new Map([
        ['Button', createComponentTemplate({ content: 'Click me' })],
      ])
      const node = createASTNode({ name: 'Button', properties: {} })

      applyTemplate(registry, node, 'Button', 'Button')

      expect(node.content).toBe('Click me')
    })

    it('prefers scoped name over unscoped', () => {
      const registry = new Map([
        ['Card.Button', createComponentTemplate({ properties: { col: '#scoped' } })],
        ['Button', createComponentTemplate({ properties: { col: '#unscoped' } })],
      ])
      const node = createASTNode({ name: 'Button', properties: {} })

      applyTemplate(registry, node, 'Card.Button', 'Button')

      expect(node.properties.col).toEqual('#scoped')
    })

    it('falls back to unscoped name', () => {
      const registry = new Map([
        ['Button', createComponentTemplate({ properties: { col: '#default' } })],
      ])
      const node = createASTNode({ name: 'Button', properties: {} })

      applyTemplate(registry, node, 'Card.Button', 'Button')

      expect(node.properties.col).toEqual('#default')
    })

    it('does nothing when no template found', () => {
      const registry = new Map<string, ReturnType<typeof createComponentTemplate>>()
      const node = createASTNode({
        name: 'Custom',
        properties: { col: 'blue' },
      })

      applyTemplate(registry, node, 'Custom', 'Custom')

      expect(node.properties).toEqual({ col: 'blue' })
    })
  })
})
