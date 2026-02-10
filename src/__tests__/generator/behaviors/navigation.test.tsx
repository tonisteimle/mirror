/**
 * Navigation Behavior Tests
 *
 * Tests for navigation behavior components:
 * - TabsBehavior
 * - AccordionBehavior
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabsBehavior } from '../../../generator/behaviors/tabs'
import { AccordionBehavior } from '../../../generator/behaviors/accordion'
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
    toggle: vi.fn((id: string) => {
      state[id] = state[id] === 'open' ? 'closed' : 'open'
    }),
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

// Wrapper component for TabsBehavior (which uses hooks)
function TabsWrapper({
  node,
  registry,
  renderFn,
}: {
  node: ASTNode
  registry: BehaviorRegistry
  renderFn: RenderFn
}) {
  return <>{TabsBehavior.render(node, new Map(), renderFn, registry)}</>
}

describe('navigation behaviors', () => {
  describe('TabsBehavior', () => {
    it('has correct name', () => {
      expect(TabsBehavior.name).toBe('Tabs')
    })

    it('renders tabs list with triggers', () => {
      const tab1 = createASTNode({
        id: 'tab1',
        name: 'Tab',
        content: 'Tab 1',
      })
      const tab2 = createASTNode({
        id: 'tab2',
        name: 'Tab',
        content: 'Tab 2',
      })
      const listNode = createASTNode({
        id: 'list1',
        name: 'List',
        children: [tab1, tab2],
      })
      const node = createASTNode({
        id: 'tabs1',
        name: 'Tabs',
        children: [listNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(<TabsWrapper node={node} registry={registry} renderFn={renderFn} />)

      expect(screen.getByText('Tab 1')).toBeTruthy()
      expect(screen.getByText('Tab 2')).toBeTruthy()
    })

    it('renders panels corresponding to tabs', () => {
      const tab1 = createASTNode({
        id: 'tab1',
        name: 'Tab',
        content: 'Tab 1',
      })
      const listNode = createASTNode({
        id: 'list1',
        name: 'List',
        children: [tab1],
      })
      const panelNode = createASTNode({
        id: 'panel1',
        name: 'Panel',
        content: 'Panel Content',
      })
      const node = createASTNode({
        id: 'tabs1',
        name: 'Tabs',
        children: [listNode, panelNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(<TabsWrapper node={node} registry={registry} renderFn={renderFn} />)

      expect(screen.getByText('Tab 1')).toBeTruthy()
      expect(screen.getByText('Panel Content')).toBeTruthy()
    })

    it('handles empty tabs gracefully', () => {
      const node = createASTNode({
        id: 'tabs1',
        name: 'Tabs',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(<TabsWrapper node={node} registry={registry} renderFn={renderFn} />)
      }).not.toThrow()
    })

    it('renders tabs with correct initial state', () => {
      const tab1 = createASTNode({
        id: 'tab1',
        name: 'Tab',
        content: 'First Tab',
      })
      const tab2 = createASTNode({
        id: 'tab2',
        name: 'Tab',
        content: 'Second Tab',
      })
      const listNode = createASTNode({
        id: 'list1',
        name: 'List',
        children: [tab1, tab2],
      })
      const panel1 = createASTNode({
        id: 'panel1',
        name: 'Panel',
        content: 'Content 1',
      })
      const panel2 = createASTNode({
        id: 'panel2',
        name: 'Panel',
        content: 'Content 2',
      })
      const node = createASTNode({
        id: 'tabs1',
        name: 'Tabs',
        children: [listNode, panel1, panel2],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(<TabsWrapper node={node} registry={registry} renderFn={renderFn} />)

      // First tab should be active initially
      const firstTab = screen.getByText('First Tab')
      expect(firstTab.getAttribute('data-state')).toBe('active')

      // Second tab should be inactive
      const secondTab = screen.getByText('Second Tab')
      expect(secondTab.getAttribute('data-state')).toBe('inactive')

      // First panel content should be visible
      expect(screen.getByText('Content 1')).toBeTruthy()
    })

    it('applies styles from list node', () => {
      const tab1 = createASTNode({
        id: 'tab1',
        name: 'Tab',
        content: 'Tab',
      })
      const listNode = createASTNode({
        id: 'list1',
        name: 'List',
        properties: { gap: 8, hor: true },
        children: [tab1],
      })
      const node = createASTNode({
        id: 'tabs1',
        name: 'Tabs',
        children: [listNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <TabsWrapper node={node} registry={registry} renderFn={renderFn} />
      )

      // Tab list should be rendered
      expect(container.querySelector('[role="tablist"]')).toBeTruthy()
    })
  })

  describe('AccordionBehavior', () => {
    it('has correct name', () => {
      expect(AccordionBehavior.name).toBe('Accordion')
    })

    it('renders accordion items', () => {
      const triggerNode = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Section 1',
      })
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        content: 'Section content',
      })
      const itemNode = createASTNode({
        id: 'item1',
        name: 'Item',
        children: [triggerNode, contentNode],
      })
      const node = createASTNode({
        id: 'accordion1',
        name: 'Accordion',
        children: [itemNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {AccordionBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      expect(screen.getByText('Section 1')).toBeTruthy()
    })

    it('renders multiple accordion items', () => {
      const item1Trigger = createASTNode({
        id: 'trigger1',
        name: 'Trigger',
        content: 'Item 1',
      })
      const item1Content = createASTNode({
        id: 'content1',
        name: 'Content',
        content: 'Content 1',
      })
      const item1 = createASTNode({
        id: 'item1',
        name: 'Item',
        children: [item1Trigger, item1Content],
      })

      const item2Trigger = createASTNode({
        id: 'trigger2',
        name: 'Trigger',
        content: 'Item 2',
      })
      const item2Content = createASTNode({
        id: 'content2',
        name: 'Content',
        content: 'Content 2',
      })
      const item2 = createASTNode({
        id: 'item2',
        name: 'Item',
        children: [item2Trigger, item2Content],
      })

      const node = createASTNode({
        id: 'accordion1',
        name: 'Accordion',
        children: [item1, item2],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {AccordionBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      expect(screen.getByText('Item 1')).toBeTruthy()
      expect(screen.getByText('Item 2')).toBeTruthy()
    })

    it('handles empty accordion', () => {
      const node = createASTNode({
        id: 'accordion1',
        name: 'Accordion',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(
          <div>
            {AccordionBehavior.render(node, new Map(), renderFn, registry)}
          </div>
        )
      }).not.toThrow()
    })

    it('expands item when clicked', () => {
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
      const itemNode = createASTNode({
        id: 'item1',
        name: 'Item',
        children: [triggerNode, contentNode],
      })
      const node = createASTNode({
        id: 'accordion1',
        name: 'Accordion',
        children: [itemNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {AccordionBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      // Click to expand
      const trigger = screen.getByText('Click to expand')
      fireEvent.click(trigger)

      // Content should become visible
      expect(screen.getByText('Hidden content')).toBeTruthy()
    })

    it('renders items without trigger gracefully', () => {
      const contentNode = createASTNode({
        id: 'content1',
        name: 'Content',
        content: 'Only content',
      })
      const itemNode = createASTNode({
        id: 'item1',
        name: 'Item',
        children: [contentNode],
      })
      const node = createASTNode({
        id: 'accordion1',
        name: 'Accordion',
        children: [itemNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(
          <div>
            {AccordionBehavior.render(node, new Map(), renderFn, registry)}
          </div>
        )
      }).not.toThrow()
    })
  })
})
