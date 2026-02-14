/**
 * Doc Mode Rendering Integration Tests
 *
 * Tests that doc-mode components render correctly.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { parse } from '../../parser/parser'
import {
  generateReactElement,
  BehaviorRegistryProvider,
  ComponentRegistryProvider,
  TemplateRegistryProvider,
  OverlayRegistryProvider,
  DataProvider
} from '../../generator/react-generator'

// Wrapper to provide all required contexts
function RenderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BehaviorRegistryProvider>
      <ComponentRegistryProvider>
        <TemplateRegistryProvider registry={new Map()}>
          <OverlayRegistryProvider>
            <DataProvider allRecords={new Map()} schemas={[]}>
              {children}
            </DataProvider>
          </OverlayRegistryProvider>
        </TemplateRegistryProvider>
      </ComponentRegistryProvider>
    </BehaviorRegistryProvider>
  )
}

describe('doc-mode rendering', () => {
  describe('text block', () => {
    it('renders text with heading', () => {
      const code = `text
  '$h2 Hello World'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const { container } = render(
        <RenderWrapper>
          {generateReactElement(result.nodes, {})}
        </RenderWrapper>
      )

      // Check that the heading text is rendered
      expect(container.textContent).toContain('Hello World')
    })

    it('renders text with paragraph', () => {
      const code = `text
  '$p This is a paragraph with some content.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const { container } = render(
        <RenderWrapper>
          {generateReactElement(result.nodes, {})}
        </RenderWrapper>
      )

      expect(container.textContent).toContain('This is a paragraph')
    })

    it('renders text with inline formatting', () => {
      const code = `text
  '$p Here is $b[bold] and $i[italic] text.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const { container } = render(
        <RenderWrapper>
          {generateReactElement(result.nodes, {})}
        </RenderWrapper>
      )

      expect(container.textContent).toContain('Here is bold and italic text.')
    })

    it('renders multiple lines', () => {
      const code = `text
  '$h2 Title

   $p First paragraph.

   $p Second paragraph.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const { container } = render(
        <RenderWrapper>
          {generateReactElement(result.nodes, {})}
        </RenderWrapper>
      )

      expect(container.textContent).toContain('Title')
      expect(container.textContent).toContain('First paragraph.')
      expect(container.textContent).toContain('Second paragraph.')
    })
  })

  describe('playground block', () => {
    it('renders playground with code view', () => {
      const code = `playground
  'Button bg #2271c1 "Click me"'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const { container } = render(
        <RenderWrapper>
          {generateReactElement(result.nodes, {})}
        </RenderWrapper>
      )

      // Check that code is displayed
      expect(container.textContent).toContain('Button')
      expect(container.textContent).toContain('Click me')
    })

    it('renders playground with live preview', () => {
      const code = `playground
  'Box 100 100 bg #3B82F6 rad 8'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const { container } = render(
        <RenderWrapper>
          {generateReactElement(result.nodes, {})}
        </RenderWrapper>
      )

      // Check that both Code and Preview sections exist
      expect(container.textContent).toContain('Code')
      expect(container.textContent).toContain('Preview')
    })
  })

  describe('mixed content', () => {
    it('renders text and playground together', () => {
      const code = `text
  '$h2 Getting Started'

playground
  'Button bg #2271c1 pad 12 24 "Click me"'

text
  '$p Try clicking the button above.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const { container } = render(
        <RenderWrapper>
          {generateReactElement(result.nodes, {})}
        </RenderWrapper>
      )

      expect(container.textContent).toContain('Getting Started')
      expect(container.textContent).toContain('Button')
      expect(container.textContent).toContain('Try clicking')
    })
  })
})
