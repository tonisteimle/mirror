/**
 * React Generator Tests
 *
 * Tests for React code generation utilities:
 * - TemplateRegistryProvider
 * - generateReactCode
 * - ReactGenerator component
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  TemplateRegistryProvider,
  BehaviorRegistryProvider,
  ComponentRegistryProvider,
  RuntimeVariableProvider,
} from '../../generator/react-generator'
import { useTemplateRegistry } from '../../generator/contexts'
import { generateReactCode } from '../../generator/code-generator'
import type { ASTNode, ComponentTemplate } from '../../parser/parser'
import { createASTNode } from '../kit/ast-builders'

describe('react-generator', () => {
  describe('TemplateRegistryProvider', () => {
    it('provides registry to children', () => {
      const registry = new Map<string, ComponentTemplate>()
      registry.set('Button', {
        properties: { pad: 12 },
        children: [],
      })

      const { result } = renderHook(() => useTemplateRegistry(), {
        wrapper: ({ children }) => (
          <TemplateRegistryProvider registry={registry}>
            {children}
          </TemplateRegistryProvider>
        ),
      })

      expect(result.current).toBe(registry)
      expect(result.current?.get('Button')).toBeDefined()
    })

    it('returns null when not in provider', () => {
      const { result } = renderHook(() => useTemplateRegistry())
      expect(result.current).toBeNull()
    })
  })

  describe('generateReactCode', () => {
    it('generates code for simple text node', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'text1',
          name: '_text',
          content: 'Hello World',
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('Hello World')
    })

    it('generates code for Box component', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'box1',
          name: 'Box',
          properties: { w: 100, h: 50 },
          children: [],
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('div')
    })

    it('generates nested components', () => {
      const childNode = createASTNode({
        id: 'child1',
        name: '_text',
        content: 'Inner text',
      })
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'box1',
          name: 'Box',
          children: [childNode],
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('Inner text')
    })

    it('handles empty nodes array', () => {
      const code = generateReactCode([])
      expect(code).toBe('')
    })

    it('applies indentation', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'text1',
          name: '_text',
          content: 'Test',
        }),
      ]

      const code = generateReactCode(nodes, 2)
      expect(code.startsWith('    ')).toBe(true) // 2 levels = 4 spaces
    })

    it('generates style attributes', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'box1',
          name: 'Box',
          properties: { bg: '#FF0000', pad: 16 },
          children: [],
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('style')
    })

    it('generates Image components with className', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'img1',
          name: 'Image',
          properties: { src: 'test.png', w: 100 },
          children: [],
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('className="Image"')
    })

    it('generates Link components with className', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'link1',
          name: 'Link',
          properties: { href: 'https://example.com' },
          content: 'Click here',
          children: [],
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('className="Link"')
      expect(code).toContain('Click here')
    })

    it('generates Button components with className', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'btn1',
          name: 'Button',
          content: 'Submit',
          children: [],
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('className="Button"')
      expect(code).toContain('Submit')
    })

    it('generates Input components with className', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'input1',
          name: 'Input',
          properties: { placeholder: 'Enter text' },
          children: [],
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('className="Input"')
    })

    it('generates Heading components with className', () => {
      const nodes: ASTNode[] = [
        createASTNode({
          id: 'h1',
          name: 'H1',
          content: 'Title',
          children: [],
        }),
      ]

      const code = generateReactCode(nodes)
      expect(code).toContain('className="H1"')
      expect(code).toContain('Title')
    })
  })

  describe('Provider exports', () => {
    it('exports BehaviorRegistryProvider', () => {
      expect(BehaviorRegistryProvider).toBeDefined()
    })

    it('exports ComponentRegistryProvider', () => {
      expect(ComponentRegistryProvider).toBeDefined()
    })

    it('exports RuntimeVariableProvider', () => {
      expect(RuntimeVariableProvider).toBeDefined()
    })
  })
})
