/**
 * Heading Components Tests
 *
 * Tests for H1-H6 heading primitives:
 * - Heading detection
 * - Level extraction
 * - Rendering as semantic HTML elements
 */

import { describe, it, expect } from 'vitest'
import {
  isHeadingComponent,
  getHeadingLevel,
  isTextComponent,
  getComponentCategory,
} from '../../parser/sugar/component-type-matcher'
import type { ASTNode } from '../../parser/types'

// Helper to create a minimal ASTNode for testing
function createNode(name: string, properties: Record<string, unknown> = {}): ASTNode {
  return {
    type: 'component',
    name,
    id: 'test-id',
    properties,
    children: [],
  }
}

describe('heading components', () => {
  describe('isHeadingComponent', () => {
    it('identifies H1-H6 by name', () => {
      expect(isHeadingComponent(createNode('H1'))).toBe(true)
      expect(isHeadingComponent(createNode('H2'))).toBe(true)
      expect(isHeadingComponent(createNode('H3'))).toBe(true)
      expect(isHeadingComponent(createNode('H4'))).toBe(true)
      expect(isHeadingComponent(createNode('H5'))).toBe(true)
      expect(isHeadingComponent(createNode('H6'))).toBe(true)
    })

    it('identifies headings ending with H1-H6', () => {
      expect(isHeadingComponent(createNode('PageH1'))).toBe(true)
      expect(isHeadingComponent(createNode('CardH2'))).toBe(true)
      expect(isHeadingComponent(createNode('SectionH3'))).toBe(true)
    })

    it('identifies headings by _primitiveType', () => {
      expect(isHeadingComponent(createNode('Title', { _primitiveType: 'H1' }))).toBe(true)
      expect(isHeadingComponent(createNode('Subtitle', { _primitiveType: 'H2' }))).toBe(true)
    })

    it('rejects non-heading components', () => {
      expect(isHeadingComponent(createNode('Text'))).toBe(false)
      expect(isHeadingComponent(createNode('Box'))).toBe(false)
      expect(isHeadingComponent(createNode('Header'))).toBe(false)
      expect(isHeadingComponent(createNode('H7'))).toBe(false)
      expect(isHeadingComponent(createNode('H0'))).toBe(false)
    })
  })

  describe('getHeadingLevel', () => {
    it('returns correct level for H1-H6', () => {
      expect(getHeadingLevel(createNode('H1'))).toBe(1)
      expect(getHeadingLevel(createNode('H2'))).toBe(2)
      expect(getHeadingLevel(createNode('H3'))).toBe(3)
      expect(getHeadingLevel(createNode('H4'))).toBe(4)
      expect(getHeadingLevel(createNode('H5'))).toBe(5)
      expect(getHeadingLevel(createNode('H6'))).toBe(6)
    })

    it('extracts level from compound names', () => {
      expect(getHeadingLevel(createNode('PageH1'))).toBe(1)
      expect(getHeadingLevel(createNode('CardH2'))).toBe(2)
    })

    it('extracts level from _primitiveType', () => {
      expect(getHeadingLevel(createNode('Title', { _primitiveType: 'H1' }))).toBe(1)
      expect(getHeadingLevel(createNode('Subtitle', { _primitiveType: 'H3' }))).toBe(3)
    })

    it('returns null for non-headings', () => {
      expect(getHeadingLevel(createNode('Text'))).toBeNull()
      expect(getHeadingLevel(createNode('Box'))).toBeNull()
    })
  })

  describe('isTextComponent', () => {
    it('identifies Text components', () => {
      expect(isTextComponent(createNode('Text'))).toBe(true)
      expect(isTextComponent(createNode('BodyText'))).toBe(true)
      expect(isTextComponent(createNode('LabelText'))).toBe(true)
    })

    it('identifies P and Span', () => {
      expect(isTextComponent(createNode('P'))).toBe(true)
      expect(isTextComponent(createNode('Span'))).toBe(true)
    })

    it('identifies by _primitiveType', () => {
      expect(isTextComponent(createNode('Label', { _primitiveType: 'Text' }))).toBe(true)
      expect(isTextComponent(createNode('Caption', { _primitiveType: 'P' }))).toBe(true)
    })

    it('rejects non-text components', () => {
      expect(isTextComponent(createNode('Box'))).toBe(false)
      expect(isTextComponent(createNode('Button'))).toBe(false)
    })
  })

  describe('getComponentCategory', () => {
    it('returns heading for H1-H6', () => {
      expect(getComponentCategory(createNode('H1'))).toBe('heading')
      expect(getComponentCategory(createNode('H2'))).toBe('heading')
      expect(getComponentCategory(createNode('PageH3'))).toBe('heading')
    })

    it('returns text for Text/P/Span', () => {
      expect(getComponentCategory(createNode('Text'))).toBe('text')
      expect(getComponentCategory(createNode('P'))).toBe('text')
      expect(getComponentCategory(createNode('Span'))).toBe('text')
    })

    it('returns container for other components', () => {
      expect(getComponentCategory(createNode('Box'))).toBe('container')
      expect(getComponentCategory(createNode('Card'))).toBe('container')
    })
  })
})
