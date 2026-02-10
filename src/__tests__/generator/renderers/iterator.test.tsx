/**
 * Iterator Renderer Tests
 *
 * Tests for iterator node rendering:
 * - Collection iteration
 * - Scoped variable context
 * - Nested path resolution
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IteratorRenderer } from '../../../generator/renderers/iterator-renderer'
import { RuntimeVariableProvider, useRuntimeVariables } from '../../../generator/runtime-context'
import { createASTNode, createIteratorNode } from '../../kit/ast-builders'
import type { ASTNode } from '../../../parser/types'
import type { GenerateOptions, RenderChildrenFn } from '../../../generator/renderers/types'

// Helper to check if element exists
function expectElement(text: string) {
  expect(screen.getByText(text)).toBeTruthy()
}

// Component that renders current iteration item
function ItemRenderer({ node }: { node: ASTNode }) {
  const { variables } = useRuntimeVariables()
  const item = variables[node.iteration?.itemVar || 'item'] as { name?: string; label?: string }
  return (
    <div data-testid={node.id}>
      {typeof item === 'object' ? item?.name || item?.label : String(item)}
    </div>
  )
}

// Mock render function that uses ItemRenderer for iterator children
const mockRenderChildren: RenderChildrenFn = (nodes) => {
  return nodes.map((node, idx) => {
    if (node.name === '_text') {
      return <span key={idx}>{node.content}</span>
    }
    return <ItemRenderer key={idx} node={node.children[0] || node} />
  })
}

const defaultOptions: GenerateOptions = {
  inspectMode: false,
  selectedId: null,
  hoveredId: null,
  onSelect: () => {},
  onHover: () => {},
}

function renderWithVariables(
  node: ASTNode,
  variables: Record<string, unknown> = {}
) {
  return render(
    <RuntimeVariableProvider initialVariables={variables}>
      <IteratorRenderer
        node={node}
        options={defaultOptions}
        renderChildren={mockRenderChildren}
      />
    </RuntimeVariableProvider>
  )
}

describe('IteratorRenderer', () => {
  describe('basic iteration', () => {
    it('renders each item in the collection', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createIteratorNode('items', 'item', [childNode])

      renderWithVariables(node, {
        items: [{ name: 'First' }, { name: 'Second' }, { name: 'Third' }]
      })

      expectElement('First')
      expectElement('Second')
      expectElement('Third')
    })

    it('renders nothing for empty collection', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createIteratorNode('items', 'item', [childNode])

      const { container } = renderWithVariables(node, { items: [] })

      expect(container.textContent).toBe('')
    })

    it('renders nothing when collection is undefined', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createIteratorNode('items', 'item', [childNode])

      const { container } = renderWithVariables(node, {})

      expect(container.textContent).toBe('')
    })

    it('renders nothing when collection is not an array', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createIteratorNode('items', 'item', [childNode])

      const { container } = renderWithVariables(node, { items: 'not an array' })

      expect(container.textContent).toBe('')
    })
  })

  describe('scoped variables', () => {
    it('provides item variable in scope', () => {
      // Create a render function that accesses item variable
      const childNode = createASTNode({
        id: 'item-child',
        name: 'Box',
        children: [createASTNode({ id: 'inner', name: 'Text' })]
      })
      const node = createIteratorNode('users', 'user', [childNode])

      // Use custom render that shows the user's name
      render(
        <RuntimeVariableProvider initialVariables={{
          users: [{ name: 'Alice' }, { name: 'Bob' }]
        }}>
          <IteratorRenderer
            node={node}
            options={defaultOptions}
            renderChildren={(nodes) => nodes.map((n, i) => (
              <IteratorChildRenderer key={i} itemVar="user" />
            ))}
          />
        </RuntimeVariableProvider>
      )

      expectElement('Alice')
      expectElement('Bob')
    })
  })

  describe('nested collection paths', () => {
    it('resolves collection from nested path', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createASTNode({
        name: '_iterator',
        id: 'iter1',
        iteration: {
          itemVar: 'item',
          collectionVar: 'items',
          collectionPath: ['data', 'items'],
        },
        children: [childNode],
      })

      renderWithVariables(node, {
        data: {
          items: [{ name: 'Nested1' }, { name: 'Nested2' }]
        }
      })

      expectElement('Nested1')
      expectElement('Nested2')
    })

    it('handles deeply nested paths', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createASTNode({
        name: '_iterator',
        id: 'iter1',
        iteration: {
          itemVar: 'item',
          collectionVar: 'items',
          collectionPath: ['app', 'state', 'list'],
        },
        children: [childNode],
      })

      renderWithVariables(node, {
        app: {
          state: {
            list: [{ name: 'Deep1' }, { name: 'Deep2' }]
          }
        }
      })

      expectElement('Deep1')
      expectElement('Deep2')
    })

    it('handles missing nested path gracefully', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createASTNode({
        name: '_iterator',
        id: 'iter1',
        iteration: {
          itemVar: 'item',
          collectionVar: 'items',
          collectionPath: ['missing', 'path'],
        },
        children: [childNode],
      })

      const { container } = renderWithVariables(node, { other: 'data' })

      expect(container.textContent).toBe('')
    })
  })

  describe('primitive collections', () => {
    it('iterates over array of strings', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createIteratorNode('tags', 'tag', [childNode])

      // Use custom renderer for primitives
      render(
        <RuntimeVariableProvider initialVariables={{
          tags: ['react', 'typescript', 'testing']
        }}>
          <IteratorRenderer
            node={node}
            options={defaultOptions}
            renderChildren={(nodes) => nodes.map((n, i) => (
              <PrimitiveRenderer key={i} itemVar="tag" />
            ))}
          />
        </RuntimeVariableProvider>
      )

      expectElement('react')
      expectElement('typescript')
      expectElement('testing')
    })

    it('iterates over array of numbers', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createIteratorNode('scores', 'score', [childNode])

      render(
        <RuntimeVariableProvider initialVariables={{
          scores: [100, 85, 92]
        }}>
          <IteratorRenderer
            node={node}
            options={defaultOptions}
            renderChildren={(nodes) => nodes.map((n, i) => (
              <PrimitiveRenderer key={i} itemVar="score" />
            ))}
          />
        </RuntimeVariableProvider>
      )

      expectElement('100')
      expectElement('85')
      expectElement('92')
    })
  })

  describe('edge cases', () => {
    it('returns null when no iteration config', () => {
      const node = createASTNode({
        name: '_iterator',
        id: 'iter1',
        children: [createASTNode({ id: 'child1' })],
      })

      const { container } = render(
        <RuntimeVariableProvider>
          <IteratorRenderer
            node={node}
            options={defaultOptions}
            renderChildren={mockRenderChildren}
          />
        </RuntimeVariableProvider>
      )

      expect(container.textContent).toBe('')
    })

    it('handles null values in collection', () => {
      const childNode = createASTNode({ id: 'item-child', name: 'Text' })
      const node = createIteratorNode('items', 'item', [childNode])

      render(
        <RuntimeVariableProvider initialVariables={{
          items: [{ name: 'Valid' }, null, { name: 'Also Valid' }]
        }}>
          <IteratorRenderer
            node={node}
            options={defaultOptions}
            renderChildren={(nodes) => nodes.map((n, i) => (
              <NullSafeRenderer key={i} itemVar="item" />
            ))}
          />
        </RuntimeVariableProvider>
      )

      expectElement('Valid')
      expectElement('Also Valid')
    })
  })
})

// Helper components for testing
function IteratorChildRenderer({ itemVar }: { itemVar: string }) {
  const { variables } = useRuntimeVariables()
  const item = variables[itemVar] as { name: string }
  return <div>{item?.name}</div>
}

function PrimitiveRenderer({ itemVar }: { itemVar: string }) {
  const { variables } = useRuntimeVariables()
  const item = variables[itemVar]
  return <div>{String(item)}</div>
}

function NullSafeRenderer({ itemVar }: { itemVar: string }) {
  const { variables } = useRuntimeVariables()
  const item = variables[itemVar] as { name?: string } | null
  if (!item) return null
  return <div>{item.name}</div>
}
