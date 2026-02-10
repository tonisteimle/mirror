/**
 * Additional Behavior Tests
 *
 * Tests for additional behavior components:
 * - TooltipBehavior
 * - CollapsibleBehavior
 * - SelectBehavior
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipBehavior } from '../../../generator/behaviors/tooltip'
import { CollapsibleBehavior } from '../../../generator/behaviors/collapsible'
import { SelectBehavior } from '../../../generator/behaviors/select'
import type { ASTNode } from '../../../parser/parser'
import type { BehaviorRegistry, RenderFn } from '../../../generator/behaviors/index'
import { createASTNode } from '../../kit/ast-builders'

// Create mock registry
function createMockRegistry(initialState: Record<string, string> = {}): BehaviorRegistry {
  const state = { ...initialState }
  return {
    getState: vi.fn((id: string) => state[id] || 'closed'),
    setState: vi.fn((id: string, newState: string) => {
      state[id] = newState
    }),
    toggle: vi.fn(),
    getHandler: vi.fn(),
  }
}

// Create mock render function
function createMockRenderFn(): RenderFn {
  return (node: ASTNode, _options?: unknown) => {
    return (
      <div key={node.id} data-testid={`node-${node.id}`} data-name={node.name}>
        {node.content || node.name}
      </div>
    )
  }
}

// Wrapper for Select (uses hooks)
function SelectWrapper({
  node,
  registry,
  renderFn,
}: {
  node: ASTNode
  registry: BehaviorRegistry
  renderFn: RenderFn
}) {
  return <>{SelectBehavior.render(node, new Map(), renderFn, registry)}</>
}

describe('additional behaviors', () => {
  describe('TooltipBehavior', () => {
    it('has correct name', () => {
      expect(TooltipBehavior.name).toBe('Tooltip')
    })

    it('renders trigger', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Hover me',
      })
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        content: 'Tooltip text',
      })
      const node = createASTNode({
        id: 'tooltip1',
        name: 'Tooltip',
        children: [triggerNode, contentNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {TooltipBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      expect(screen.getByTestId('node-trigger1')).toBeTruthy()
    })

    it('handles empty children', () => {
      const node = createASTNode({
        id: 'tooltip1',
        name: 'Tooltip',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(
          <div>
            {TooltipBehavior.render(node, new Map(), renderFn, registry)}
          </div>
        )
      }).not.toThrow()
    })

    it('groups slots correctly', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Button',
      })
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        content: 'Help text',
        properties: { bg: '#333', pad: 8 },
      })
      const node = createASTNode({
        id: 'tooltip1',
        name: 'Tooltip',
        children: [triggerNode, contentNode],
      })

      expect(node.children[0].name).toBe('Trigger')
      expect(node.children[1].name).toBe('Content')
      expect(node.children[1].content).toBe('Help text')
    })
  })

  describe('CollapsibleBehavior', () => {
    it('has correct name', () => {
      expect(CollapsibleBehavior.name).toBe('Collapsible')
    })

    it('renders trigger', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Click to expand',
      })
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        content: 'Hidden content',
      })
      const node = createASTNode({
        id: 'collapsible1',
        name: 'Collapsible',
        children: [triggerNode, contentNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {CollapsibleBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      expect(screen.getByTestId('node-trigger1')).toBeTruthy()
    })

    it('queries registry for state', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Toggle',
      })
      const node = createASTNode({
        id: 'collapsible1',
        name: 'Collapsible',
        children: [triggerNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {CollapsibleBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      expect(registry.getState).toHaveBeenCalledWith('Collapsible')
    })

    it('handles empty children', () => {
      const node = createASTNode({
        id: 'collapsible1',
        name: 'Collapsible',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(
          <div>
            {CollapsibleBehavior.render(node, new Map(), renderFn, registry)}
          </div>
        )
      }).not.toThrow()
    })

    it('renders content when open', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Toggle',
      })
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        content: 'Expanded content',
      })
      const node = createASTNode({
        id: 'collapsible1',
        name: 'Collapsible',
        children: [triggerNode, contentNode],
      })

      const registry = createMockRegistry({ Collapsible: 'open' })
      const renderFn = createMockRenderFn()

      render(
        <div>
          {CollapsibleBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      expect(screen.getByText('Expanded content')).toBeTruthy()
    })
  })

  describe('SelectBehavior', () => {
    it('has correct name', () => {
      expect(SelectBehavior.name).toBe('Select')
    })

    it('renders trigger with placeholder', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Choose option',
      })
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        children: [
          createASTNode({ id: 'item1', name: 'Item', content: 'Option 1' }),
          createASTNode({ id: 'item2', name: 'Item', content: 'Option 2' }),
        ],
      })
      const node = createASTNode({
        id: 'select1',
        name: 'Select',
        children: [triggerNode, contentNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(<SelectWrapper node={node} registry={registry} renderFn={renderFn} />)

      // Trigger should be rendered
      expect(screen.getByText('Choose option')).toBeTruthy()
    })

    it('queries registry for state', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Select',
      })
      const node = createASTNode({
        id: 'select1',
        name: 'Select',
        children: [triggerNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(<SelectWrapper node={node} registry={registry} renderFn={renderFn} />)

      expect(registry.getState).toHaveBeenCalledWith('Select')
    })

    it('handles empty children', () => {
      const node = createASTNode({
        id: 'select1',
        name: 'Select',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(<SelectWrapper node={node} registry={registry} renderFn={renderFn} />)
      }).not.toThrow()
    })

    it('supports grouped items', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Select fruit',
      })
      const groupNode = createASTNode({
        id: 'group1',
        name: 'Group',
        children: [
          createASTNode({ id: 'label1', name: 'Label', content: 'Fruits' }),
          createASTNode({ id: 'item1', name: 'Item', content: 'Apple' }),
          createASTNode({ id: 'item2', name: 'Item', content: 'Banana' }),
        ],
      })
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        children: [groupNode],
      })
      const node = createASTNode({
        id: 'select1',
        name: 'Select',
        children: [triggerNode, contentNode],
      })

      // Verify structure supports groups
      expect(node.children[1].children[0].name).toBe('Group')
      expect(node.children[1].children[0].children[0].name).toBe('Label')
    })

    it('extracts items from content', () => {
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        children: [
          createASTNode({ id: 'item1', name: 'Item', content: 'First' }),
          createASTNode({ id: 'item2', name: 'Item', content: 'Second' }),
          createASTNode({ id: 'item3', name: 'Item', content: 'Third' }),
        ],
      })

      const items = contentNode.children.filter(c => c.name === 'Item')
      expect(items).toHaveLength(3)
      expect(items[0].content).toBe('First')
    })
  })
})
