/**
 * Conditional Renderer Tests
 *
 * Tests for conditional node rendering:
 * - Condition evaluation
 * - If/else branch rendering
 * - Variable-based conditions
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConditionalRenderer } from '../../../generator/renderers/conditional-renderer'
import { RuntimeVariableProvider } from '../../../generator/runtime-context'
import {
  createASTNode,
  createConditionalNode,
  varCondition,
  notCondition,
  compareCondition,
} from '../../kit/ast-builders'
import type { ASTNode } from '../../../parser/types'
import type { GenerateOptions, RenderChildrenFn } from '../../../generator/renderers/types'

// Mock render function that renders children as text
const mockRenderChildren: RenderChildrenFn = (nodes) => {
  return nodes.map((node, idx) => (
    <div key={idx} data-testid={node.id}>
      {node.content || node.name}
    </div>
  ))
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
      <ConditionalRenderer
        node={node}
        options={defaultOptions}
        renderChildren={mockRenderChildren}
      />
    </RuntimeVariableProvider>
  )
}

// Helper to check if element exists
function expectElement(text: string) {
  expect(screen.getByText(text)).toBeTruthy()
}

function expectNoElement(text: string) {
  expect(screen.queryByText(text)).toBeNull()
}

describe('ConditionalRenderer', () => {
  describe('basic rendering', () => {
    it('renders children when condition is true', () => {
      const node = createConditionalNode(
        varCondition('isActive'),
        [createASTNode({ id: 'child1', content: 'Active Content' })]
      )

      renderWithVariables(node, { isActive: true })

      expectElement('Active Content')
    })

    it('does not render children when condition is false', () => {
      const node = createConditionalNode(
        varCondition('isActive'),
        [createASTNode({ id: 'child1', content: 'Active Content' })]
      )

      renderWithVariables(node, { isActive: false })

      expectNoElement('Active Content')
    })

    it('renders else children when condition is false', () => {
      const node = createConditionalNode(
        varCondition('isActive'),
        [createASTNode({ id: 'child1', content: 'Active' })],
        [createASTNode({ id: 'else1', content: 'Inactive' })]
      )

      renderWithVariables(node, { isActive: false })

      expectNoElement('Active')
      expectElement('Inactive')
    })

    it('renders if children when condition is true (with else)', () => {
      const node = createConditionalNode(
        varCondition('isActive'),
        [createASTNode({ id: 'child1', content: 'Active' })],
        [createASTNode({ id: 'else1', content: 'Inactive' })]
      )

      renderWithVariables(node, { isActive: true })

      expectElement('Active')
      expectNoElement('Inactive')
    })
  })

  describe('multiple children', () => {
    it('renders all children when condition is true', () => {
      const node = createConditionalNode(
        varCondition('show'),
        [
          createASTNode({ id: 'child1', content: 'First' }),
          createASTNode({ id: 'child2', content: 'Second' }),
          createASTNode({ id: 'child3', content: 'Third' }),
        ]
      )

      renderWithVariables(node, { show: true })

      expectElement('First')
      expectElement('Second')
      expectElement('Third')
    })

    it('renders all else children when condition is false', () => {
      const node = createConditionalNode(
        varCondition('show'),
        [createASTNode({ id: 'if1', content: 'If Child' })],
        [
          createASTNode({ id: 'else1', content: 'Else First' }),
          createASTNode({ id: 'else2', content: 'Else Second' }),
        ]
      )

      renderWithVariables(node, { show: false })

      expectNoElement('If Child')
      expectElement('Else First')
      expectElement('Else Second')
    })
  })

  describe('negated conditions', () => {
    it('renders when not condition evaluates to true', () => {
      const node = createConditionalNode(
        notCondition(varCondition('isHidden')),
        [createASTNode({ id: 'child1', content: 'Visible' })]
      )

      renderWithVariables(node, { isHidden: false })

      expectElement('Visible')
    })

    it('does not render when not condition evaluates to false', () => {
      const node = createConditionalNode(
        notCondition(varCondition('isHidden')),
        [createASTNode({ id: 'child1', content: 'Visible' })]
      )

      renderWithVariables(node, { isHidden: true })

      expectNoElement('Visible')
    })
  })

  describe('comparison conditions', () => {
    it('renders when comparison is true (==)', () => {
      const node = createConditionalNode(
        compareCondition(varCondition('status'), '==', 'active'),
        [createASTNode({ id: 'child1', content: 'Status Active' })]
      )

      renderWithVariables(node, { status: 'active' })

      expectElement('Status Active')
    })

    it('does not render when comparison is false (==)', () => {
      const node = createConditionalNode(
        compareCondition(varCondition('status'), '==', 'active'),
        [createASTNode({ id: 'child1', content: 'Status Active' })]
      )

      renderWithVariables(node, { status: 'inactive' })

      expectNoElement('Status Active')
    })

    it('handles numeric comparison (>)', () => {
      const node = createConditionalNode(
        compareCondition(varCondition('count'), '>', 5),
        [createASTNode({ id: 'child1', content: 'High Count' })]
      )

      renderWithVariables(node, { count: 10 })

      expectElement('High Count')
    })
  })

  describe('edge cases', () => {
    it('renders children when no condition is set', () => {
      const node = createASTNode({
        name: '_conditional',
        id: 'cond1',
        children: [createASTNode({ id: 'child1', content: 'Always Visible' })],
      })

      renderWithVariables(node, {})

      expectElement('Always Visible')
    })

    it('renders empty when no else children and condition false', () => {
      const node = createConditionalNode(
        varCondition('show'),
        [createASTNode({ id: 'child1', content: 'Hidden' })]
      )

      const { container } = renderWithVariables(node, { show: false })

      expect(container.textContent).toBe('')
    })

    it('handles undefined variable as falsy', () => {
      const node = createConditionalNode(
        varCondition('undefinedVar'),
        [createASTNode({ id: 'child1', content: 'Not Shown' })],
        [createASTNode({ id: 'else1', content: 'Shown Instead' })]
      )

      renderWithVariables(node, {})

      expectNoElement('Not Shown')
      expectElement('Shown Instead')
    })
  })
})
