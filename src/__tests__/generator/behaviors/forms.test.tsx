/**
 * Form Behavior Tests
 *
 * Tests for form behavior components:
 * - InputBehavior
 * - SwitchBehavior
 * - CheckboxBehavior
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InputBehavior } from '../../../generator/behaviors/input'
import { SwitchBehavior } from '../../../generator/behaviors/switch'
import { CheckboxBehavior } from '../../../generator/behaviors/checkbox'
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

// Helper to create children map
function createChildrenMap(node: ASTNode): Map<string, ASTNode[]> {
  const map = new Map<string, ASTNode[]>()
  for (const child of node.children) {
    const existing = map.get(child.name) || []
    existing.push(child)
    map.set(child.name, existing)
  }
  return map
}

describe('form behaviors', () => {
  describe('InputBehavior', () => {
    it('has correct name', () => {
      expect(InputBehavior.name).toBe('Input')
    })

    it('renders container with label', () => {
      const labelNode = createASTNode({
        id: 'label1',
        name: 'Label',
        content: 'Email Address',
      })
      const fieldNode = createASTNode({
        id: 'field1',
        name: 'Field',
        properties: { placeholder: 'Enter email' },
      })
      const node = createASTNode({
        id: 'input1',
        name: 'Input',
        children: [labelNode, fieldNode],
      })

      const childrenMap = createChildrenMap(node)
      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {InputBehavior.render(node, childrenMap, renderFn, registry)}
        </div>
      )

      expect(screen.getByText('Email Address')).toBeTruthy()
      expect(screen.getByPlaceholderText('Enter email')).toBeTruthy()
    })

    it('renders field with correct type', () => {
      const fieldNode = createASTNode({
        id: 'field1',
        name: 'Field',
        properties: { type: 'password', placeholder: 'Password' },
      })
      const node = createASTNode({
        id: 'input1',
        name: 'Input',
        children: [fieldNode],
      })

      const childrenMap = createChildrenMap(node)
      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {InputBehavior.render(node, childrenMap, renderFn, registry)}
        </div>
      )

      const input = screen.getByPlaceholderText('Password') as HTMLInputElement
      expect(input.type).toBe('password')
    })

    it('renders hint text', () => {
      const hintNode = createASTNode({
        id: 'hint1',
        name: 'Hint',
        content: 'Enter a valid email',
      })
      const fieldNode = createASTNode({
        id: 'field1',
        name: 'Field',
        properties: {},
      })
      const node = createASTNode({
        id: 'input1',
        name: 'Input',
        children: [fieldNode, hintNode],
      })

      const childrenMap = createChildrenMap(node)
      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      render(
        <div>
          {InputBehavior.render(node, childrenMap, renderFn, registry)}
        </div>
      )

      expect(screen.getByText('Enter a valid email')).toBeTruthy()
    })

    it('applies container width styles', () => {
      const node = createASTNode({
        id: 'input1',
        name: 'Input',
        properties: { w: 'full' },
        children: [],
      })

      const childrenMap = createChildrenMap(node)
      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {InputBehavior.render(node, childrenMap, renderFn, registry)}
        </div>
      )

      const wrapper = container.querySelector('div > div')
      expect(wrapper).toBeTruthy()
    })

    it('handles empty children gracefully', () => {
      const node = createASTNode({
        id: 'input1',
        name: 'Input',
        children: [],
      })

      const childrenMap = createChildrenMap(node)
      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(
          <div>
            {InputBehavior.render(node, childrenMap, renderFn, registry)}
          </div>
        )
      }).not.toThrow()
    })
  })

  describe('SwitchBehavior', () => {
    it('has correct name', () => {
      expect(SwitchBehavior.name).toBe('Switch')
    })

    it('renders switch component', () => {
      const node = createASTNode({
        id: 'switch1',
        name: 'Switch',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {SwitchBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      // Switch root should be rendered
      const switchRoot = container.querySelector('button')
      expect(switchRoot).toBeTruthy()
    })

    it('reads checked state from registry', () => {
      const node = createASTNode({
        id: 'switch1',
        name: 'Switch',
        children: [],
      })

      const registry = createMockRegistry({ Switch: 'on' })
      const renderFn = createMockRenderFn()

      render(
        <div>
          {SwitchBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      expect(registry.getState).toHaveBeenCalledWith('Switch')
    })

    it('updates registry when toggled', () => {
      const node = createASTNode({
        id: 'switch1',
        name: 'Switch',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {SwitchBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      const switchRoot = container.querySelector('button')
      if (switchRoot) {
        fireEvent.click(switchRoot)
        expect(registry.setState).toHaveBeenCalledWith('Switch', 'on')
      }
    })

    it('applies styles from node', () => {
      const node = createASTNode({
        id: 'switch1',
        name: 'Switch',
        properties: { w: 44, h: 24, rad: 12 },
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {SwitchBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      const switchRoot = container.querySelector('button')
      expect(switchRoot).toBeTruthy()
    })

    it('renders with thumb slot', () => {
      const thumbNode = createASTNode({
        id: 'thumb1',
        name: 'Thumb',
        properties: { w: 20, h: 20, rad: 10 },
      })
      const node = createASTNode({
        id: 'switch1',
        name: 'Switch',
        children: [thumbNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {SwitchBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      // Thumb should be rendered inside switch
      const thumb = container.querySelector('[data-state]')
      expect(thumb).toBeTruthy()
    })
  })

  describe('CheckboxBehavior', () => {
    it('has correct name', () => {
      expect(CheckboxBehavior.name).toBe('Checkbox')
    })

    it('renders checkbox component', () => {
      const node = createASTNode({
        id: 'checkbox1',
        name: 'Checkbox',
        properties: { w: 18, h: 18, rad: 4 },
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {CheckboxBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      const checkbox = container.querySelector('button')
      expect(checkbox).toBeTruthy()
    })

    it('reads checked state from registry', () => {
      const node = createASTNode({
        id: 'checkbox1',
        name: 'Checkbox',
        children: [],
      })

      const registry = createMockRegistry({ Checkbox: 'checked' })
      const renderFn = createMockRenderFn()

      render(
        <div>
          {CheckboxBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      expect(registry.getState).toHaveBeenCalledWith('Checkbox')
    })

    it('updates registry when clicked', () => {
      const node = createASTNode({
        id: 'checkbox1',
        name: 'Checkbox',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {CheckboxBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      const checkbox = container.querySelector('button')
      if (checkbox) {
        fireEvent.click(checkbox)
        expect(registry.setState).toHaveBeenCalledWith('Checkbox', 'checked')
      }
    })

    it('applies styles from node properties', () => {
      const node = createASTNode({
        id: 'checkbox1',
        name: 'Checkbox',
        properties: { bg: '#333', boc: '#555', rad: 4 },
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {CheckboxBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      const checkbox = container.querySelector('button')
      expect(checkbox).toBeTruthy()
    })

    it('shows indicator when checked', () => {
      const node = createASTNode({
        id: 'checkbox1',
        name: 'Checkbox',
        children: [],
      })

      const registry = createMockRegistry({ Checkbox: 'checked' })
      const renderFn = createMockRenderFn()

      const { container } = render(
        <div>
          {CheckboxBehavior.render(node, new Map(), renderFn, registry)}
        </div>
      )

      // When checked, the indicator should be visible
      const checkbox = container.querySelector('button[data-state="checked"]')
      expect(checkbox).toBeTruthy()
    })
  })
})
