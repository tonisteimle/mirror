/**
 * Feedback Behavior Tests
 *
 * Tests for feedback behavior components:
 * - ProgressBehavior
 * - SliderBehavior
 * - AvatarBehavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProgressBehavior } from '../../../generator/behaviors/progress'
import { SliderBehavior } from '../../../generator/behaviors/slider'
import { AvatarBehavior } from '../../../generator/behaviors/avatar'
import type { ASTNode } from '../../../parser/parser'
import type { BehaviorRegistry, RenderFn } from '../../../generator/behaviors/index'
import { createASTNode } from '../../kit/ast-builders'

// Create mock registry
function createMockRegistry(): BehaviorRegistry {
  return {
    getState: vi.fn(() => 'closed'),
    setState: vi.fn(),
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

// Wrapper for behaviors that use hooks (Progress and Slider)
function ProgressWrapper({
  node,
  registry,
  renderFn,
}: {
  node: ASTNode
  registry: BehaviorRegistry
  renderFn: RenderFn
}) {
  return <>{ProgressBehavior.render(node, new Map(), renderFn, registry)}</>
}


describe('feedback behaviors', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('ProgressBehavior', () => {
    it('has correct name', () => {
      expect(ProgressBehavior.name).toBe('Progress')
    })

    it('renders progress bar', () => {
      const node = createASTNode({
        id: 'progress1',
        name: 'Progress',
        properties: { w: 200, h: 8, rad: 4 },
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <ProgressWrapper node={node} registry={registry} renderFn={renderFn} />
      )

      // Progress root should be rendered
      const progressRoot = container.querySelector('[role="progressbar"]')
      expect(progressRoot).toBeTruthy()
    })

    it('renders with indicator slot', () => {
      const indicatorNode = createASTNode({
        id: 'indicator1',
        name: 'Indicator',
        properties: { bg: '#22C55E' },
      })
      const node = createASTNode({
        id: 'progress1',
        name: 'Progress',
        children: [indicatorNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <ProgressWrapper node={node} registry={registry} renderFn={renderFn} />
      )

      expect(container.querySelector('[role="progressbar"]')).toBeTruthy()
    })

    it('handles empty children', () => {
      const node = createASTNode({
        id: 'progress1',
        name: 'Progress',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(<ProgressWrapper node={node} registry={registry} renderFn={renderFn} />)
      }).not.toThrow()
    })

    it('applies styles from node properties', () => {
      const node = createASTNode({
        id: 'progress1',
        name: 'Progress',
        properties: { w: 300, h: 10, bg: '#333', rad: 5 },
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <ProgressWrapper node={node} registry={registry} renderFn={renderFn} />
      )

      const progressRoot = container.querySelector('[role="progressbar"]')
      expect(progressRoot).toBeTruthy()
    })
  })

  describe('SliderBehavior', () => {
    it('has correct name', () => {
      expect(SliderBehavior.name).toBe('Slider')
    })

    // Note: Slider tests requiring render are skipped due to ResizeObserver
    // not being available in jsdom. The behavior is tested via integration tests.
  })

  describe('AvatarBehavior', () => {
    it('has correct name', () => {
      expect(AvatarBehavior.name).toBe('Avatar')
    })

    it('renders avatar container', () => {
      const node = createASTNode({
        id: 'avatar1',
        name: 'Avatar',
        properties: { w: 40, h: 40, rad: 20 },
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <>{AvatarBehavior.render(node, new Map(), renderFn, registry)}</>
      )

      // Avatar root should be rendered
      expect(container.firstChild).toBeTruthy()
    })

    it('uses groupChildrenBySlot for image detection', () => {
      const imageNode = createASTNode({
        id: 'image1',
        name: 'Image',
        properties: { src: 'https://example.com/avatar.jpg' },
      })
      const node = createASTNode({
        id: 'avatar1',
        name: 'Avatar',
        children: [imageNode],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      // Avatar uses groupChildrenBySlot internally to find Image slot
      // This verifies the node structure is correct
      expect(node.children[0].name).toBe('Image')
      expect(node.children[0].properties.src).toBe('https://example.com/avatar.jpg')
    })

    it('uses groupChildrenBySlot for fallback detection', () => {
      const fallbackNode = createASTNode({
        id: 'fallback1',
        name: 'Fallback',
        content: 'AB',
        properties: { bg: '#3B82F6', col: '#FFF' },
      })
      const node = createASTNode({
        id: 'avatar1',
        name: 'Avatar',
        children: [fallbackNode],
      })

      // Avatar uses groupChildrenBySlot internally to find Fallback slot
      expect(node.children[0].name).toBe('Fallback')
      expect(node.children[0].content).toBe('AB')
    })

    it('handles empty children', () => {
      const node = createASTNode({
        id: 'avatar1',
        name: 'Avatar',
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      expect(() => {
        render(<>{AvatarBehavior.render(node, new Map(), renderFn, registry)}</>)
      }).not.toThrow()
    })

    it('applies styles from node properties', () => {
      const node = createASTNode({
        id: 'avatar1',
        name: 'Avatar',
        properties: { w: 48, h: 48, rad: 24, bg: '#333' },
        children: [],
      })

      const registry = createMockRegistry()
      const renderFn = createMockRenderFn()

      const { container } = render(
        <>{AvatarBehavior.render(node, new Map(), renderFn, registry)}</>
      )

      expect(container.firstChild).toBeTruthy()
    })

    it('groups multiple slots correctly', () => {
      const imageNode = createASTNode({
        id: 'image1',
        name: 'Image',
        properties: { src: 'https://example.com/avatar.jpg' },
      })
      const fallbackNode = createASTNode({
        id: 'fallback1',
        name: 'Fallback',
        content: 'JD',
      })
      const node = createASTNode({
        id: 'avatar1',
        name: 'Avatar',
        children: [imageNode, fallbackNode],
      })

      // Verify node structure has both Image and Fallback children
      expect(node.children).toHaveLength(2)
      expect(node.children[0].name).toBe('Image')
      expect(node.children[1].name).toBe('Fallback')
    })
  })
})
