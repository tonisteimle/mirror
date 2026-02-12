/**
 * FormField Component Tests
 *
 * Testing library component registration and behavior handlers.
 */
import { describe, it, expect } from './kit'
import { render } from '@testing-library/react'
import { formFieldComponent } from '../library/components/input'
import { getLibraryComponent, isLibraryComponent } from '../library/registry'
import { FormFieldBehavior } from '../generator/behaviors/input'
import type { ASTNode } from '../parser/parser'
import type { BehaviorRegistry } from '../generator/behaviors/index'

// Helper to create ASTNode with required fields
function createNode(overrides: Partial<ASTNode> & { name: string }): ASTNode {
  return {
    type: 'component',
    id: `${overrides.name}-${Math.random().toString(36).slice(2)}`,
    properties: {},
    content: '',
    children: [],
    line: 1,
    ...overrides,
  }
}

describe('FormField Library Component', () => {
  it('is registered in the library', () => {
    expect(isLibraryComponent('FormField')).toBe(true)
  })

  it('has correct metadata', () => {
    const component = getLibraryComponent('FormField')
    expect(component).toBeDefined()
    expect(component?.name).toBe('FormField')
    expect(component?.category).toBe('form')
  })

  it('has Label, Field, Hint, and Error slots', () => {
    expect(formFieldComponent.slots).toHaveLength(4)
    expect(formFieldComponent.slots.map(s => s.name)).toEqual(['Label', 'Field', 'Hint', 'Error'])
  })

  it('has Field as required slot', () => {
    const fieldSlot = formFieldComponent.slots.find(s => s.name === 'Field')
    expect(fieldSlot?.required).toBe(true)
  })

  it('has Label, Hint, and Error as optional slots', () => {
    const labelSlot = formFieldComponent.slots.find(s => s.name === 'Label')
    const hintSlot = formFieldComponent.slots.find(s => s.name === 'Hint')
    const errorSlot = formFieldComponent.slots.find(s => s.name === 'Error')
    expect(labelSlot?.required).toBe(false)
    expect(hintSlot?.required).toBe(false)
    expect(errorSlot?.required).toBe(false)
  })

  it('has definitions and layoutExample', () => {
    expect(formFieldComponent.definitions).toContain('// FormField')
    expect(formFieldComponent.definitions).toContain('FormFieldLabel')
    expect(formFieldComponent.definitions).toContain('FormFieldInput')
    expect(formFieldComponent.layoutExample).toContain('FormField')
  })
})

describe('FormField Behavior Handler', () => {
  const mockRegistry: BehaviorRegistry = {
    getHandler: () => undefined,
    getState: () => '',
    setState: () => {},
    toggle: () => {},
  }

  const mockRenderFn = (node: ASTNode) => node.content || null

  it('has correct name', () => {
    expect(FormFieldBehavior.name).toBe('FormField')
  })

  it('renders input field', () => {
    const fieldNode = createNode({
      name: 'Field',
      properties: { placeholder: 'Enter text...' },
      line: 2,
    })
    const node = createNode({
      name: 'FormField',
      children: [fieldNode],
    })

    const children = new Map<string, ASTNode[]>()
    children.set('Field', [fieldNode])

    const result = FormFieldBehavior.render(node, children, mockRenderFn, mockRegistry)
    const { container } = render(<>{result}</>)
    const input = container.querySelector('input')

    expect(input).toBeDefined()
    expect(input?.getAttribute('placeholder')).toBe('Enter text...')
  })

  it('renders label when provided', () => {
    const labelNode = createNode({ name: 'Label', content: 'Email', line: 2 })
    const fieldNode = createNode({ name: 'Field', line: 3 })
    const node = createNode({ name: 'FormField', children: [labelNode, fieldNode] })

    const children = new Map<string, ASTNode[]>()
    children.set('Label', [labelNode])
    children.set('Field', [fieldNode])

    const result = FormFieldBehavior.render(node, children, mockRenderFn, mockRegistry)
    const { container } = render(<>{result}</>)
    const label = container.querySelector('label')

    expect(label).toBeDefined()
    expect(label?.textContent).toBe('Email')
  })

  it('renders hint when provided', () => {
    const fieldNode = createNode({ name: 'Field', line: 2 })
    const hintNode = createNode({ name: 'Hint', content: 'This is a hint', line: 3 })
    const node = createNode({ name: 'FormField', children: [fieldNode, hintNode] })

    const children = new Map<string, ASTNode[]>()
    children.set('Field', [fieldNode])
    children.set('Hint', [hintNode])

    const result = FormFieldBehavior.render(node, children, mockRenderFn, mockRegistry)
    const { container } = render(<>{result}</>)
    const hint = container.querySelector('span')

    expect(hint).toBeDefined()
    expect(hint?.textContent).toBe('This is a hint')
  })

  it('applies custom styles to field', () => {
    const fieldNode = createNode({
      name: 'Field',
      properties: { bg: '#222222', rad: 8, size: 16 },
      line: 2,
    })
    const node = createNode({ name: 'FormField', children: [fieldNode] })

    const children = new Map<string, ASTNode[]>()
    children.set('Field', [fieldNode])

    const result = FormFieldBehavior.render(node, children, mockRenderFn, mockRegistry)
    const { container } = render(<>{result}</>)
    const input = container.querySelector('input')

    expect(input?.style.backgroundColor).toBe('rgb(34, 34, 34)')
    expect(input?.style.borderRadius).toBe('8px')
    expect(input?.style.fontSize).toBe('16px')
  })

  it('supports different input types', () => {
    const fieldNode = createNode({
      name: 'Field',
      properties: { type: 'password' },
      line: 2,
    })
    const node = createNode({ name: 'FormField', children: [fieldNode] })

    const children = new Map<string, ASTNode[]>()
    children.set('Field', [fieldNode])

    const result = FormFieldBehavior.render(node, children, mockRenderFn, mockRegistry)
    const { container } = render(<>{result}</>)
    const input = container.querySelector('input')

    expect(input?.getAttribute('type')).toBe('password')
  })
})
