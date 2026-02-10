/**
 * Input Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { inputComponent } from '../library/components/input'
import { getLibraryComponent, isLibraryComponent } from '../library/registry'
import { InputBehavior } from '../generator/behaviors/input'
import type { ASTNode } from '../parser/parser'
import type { BehaviorRegistry } from '../generator/behaviors/index'

// Helper to create ASTNode with required fields
function createNode(overrides: Partial<ASTNode> & { name: string }): ASTNode {
  return {
    type: 'component',
    id: `${overrides.name}-${Math.random().toString(36).slice(2)}`,
    modifiers: [],
    properties: {},
    content: '',
    children: [],
    line: 1,
    ...overrides,
  }
}

describe('Input Library Component', () => {
  it('should be registered in the library', () => {
    expect(isLibraryComponent('Input')).toBe(true)
  })

  it('should have correct metadata', () => {
    const component = getLibraryComponent('Input')
    expect(component).toBeDefined()
    expect(component?.name).toBe('Input')
    expect(component?.category).toBe('form')
  })

  it('should have Label, Field, and Hint slots', () => {
    expect(inputComponent.slots).toHaveLength(3)
    expect(inputComponent.slots.map(s => s.name)).toEqual(['Label', 'Field', 'Hint'])
  })

  it('should have Field as required slot', () => {
    const fieldSlot = inputComponent.slots.find(s => s.name === 'Field')
    expect(fieldSlot?.required).toBe(true)
  })

  it('should have Label and Hint as optional slots', () => {
    const labelSlot = inputComponent.slots.find(s => s.name === 'Label')
    const hintSlot = inputComponent.slots.find(s => s.name === 'Hint')
    expect(labelSlot?.required).toBe(false)
    expect(hintSlot?.required).toBe(false)
  })

  it('should have definitions and layoutExample', () => {
    expect(inputComponent.definitions).toContain('// Input')
    expect(inputComponent.definitions).toContain('InputLabel')
    expect(inputComponent.definitions).toContain('InputField')
    expect(inputComponent.layoutExample).toContain('Input')
  })
})

describe('Input Behavior Handler', () => {
  const mockRegistry: BehaviorRegistry = {
    getHandler: () => undefined,
    getState: () => '',
    setState: () => {},
    toggle: () => {},
  }

  const mockRenderFn = (node: ASTNode) => node.content || null

  it('should have correct name', () => {
    expect(InputBehavior.name).toBe('Input')
  })

  it('should render input field', () => {
    const fieldNode = createNode({
      name: 'Field',
      properties: { placeholder: 'Enter text...' },
      line: 2,
    })
    const node = createNode({
      name: 'Input',
      children: [fieldNode],
    })

    const children = new Map<string, ASTNode[]>()
    children.set('Field', [fieldNode])

    const result = InputBehavior.render(node, children, mockRenderFn, mockRegistry)

    const { container } = render(<>{result}</>)
    const input = container.querySelector('input')

    expect(input).toBeDefined()
    expect(input?.getAttribute('placeholder')).toBe('Enter text...')
  })

  it('should render label when provided', () => {
    const labelNode = createNode({
      name: 'Label',
      content: 'Email',
      line: 2,
    })
    const fieldNode = createNode({
      name: 'Field',
      line: 3,
    })
    const node = createNode({
      name: 'Input',
      children: [labelNode, fieldNode],
    })

    const children = new Map<string, ASTNode[]>()
    children.set('Label', [labelNode])
    children.set('Field', [fieldNode])

    const result = InputBehavior.render(node, children, mockRenderFn, mockRegistry)

    const { container } = render(<>{result}</>)
    const label = container.querySelector('label')

    expect(label).toBeDefined()
    expect(label?.textContent).toBe('Email')
  })

  it('should render hint when provided', () => {
    const fieldNode = createNode({
      name: 'Field',
      line: 2,
    })
    const hintNode = createNode({
      name: 'Hint',
      content: 'This is a hint',
      line: 3,
    })
    const node = createNode({
      name: 'Input',
      children: [fieldNode, hintNode],
    })

    const children = new Map<string, ASTNode[]>()
    children.set('Field', [fieldNode])
    children.set('Hint', [hintNode])

    const result = InputBehavior.render(node, children, mockRenderFn, mockRegistry)

    const { container } = render(<>{result}</>)
    const hint = container.querySelector('span')

    expect(hint).toBeDefined()
    expect(hint?.textContent).toBe('This is a hint')
  })

  it('should apply custom styles to field', () => {
    const fieldNode = createNode({
      name: 'Field',
      properties: {
        bg: '#222222',
        rad: 8,
        size: 16,
      },
      line: 2,
    })
    const node = createNode({
      name: 'Input',
      children: [fieldNode],
    })

    const children = new Map<string, ASTNode[]>()
    children.set('Field', [fieldNode])

    const result = InputBehavior.render(node, children, mockRenderFn, mockRegistry)

    const { container } = render(<>{result}</>)
    const input = container.querySelector('input')

    expect(input?.style.backgroundColor).toBe('rgb(34, 34, 34)')
    expect(input?.style.borderRadius).toBe('8px')
    expect(input?.style.fontSize).toBe('16px')
  })

  it('should support different input types', () => {
    const fieldNode = createNode({
      name: 'Field',
      properties: { type: 'password' },
      line: 2,
    })
    const node = createNode({
      name: 'Input',
      children: [fieldNode],
    })

    const children = new Map<string, ASTNode[]>()
    children.set('Field', [fieldNode])

    const result = InputBehavior.render(node, children, mockRenderFn, mockRegistry)

    const { container } = render(<>{result}</>)
    const input = container.querySelector('input')

    expect(input?.getAttribute('type')).toBe('password')
  })
})
