/**
 * Primitive Renderers Tests
 *
 * Tests for primitive detection and rendering functions.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  isInputPrimitive,
  isTextareaPrimitive,
  isLinkPrimitive,
  isIconComponent,
  isImageComponent,
  isHeadingPrimitive,
  renderInput,
  renderTextarea,
  renderLink,
  renderIcon,
  renderImageElement,
  renderHeading,
  getImageSrc,
  getHeadingLevel,
} from '../../../generator/primitives'
import { createASTNode } from '../../kit/ast-builders'

describe('primitive-renderers', () => {
  describe('isInputPrimitive', () => {
    it('returns true for Input name', () => {
      const node = createASTNode({ name: 'Input' })
      expect(isInputPrimitive(node)).toBe(true)
    })

    it('returns true for names ending with Input', () => {
      const node = createASTNode({ name: 'SearchInput' })
      expect(isInputPrimitive(node)).toBe(true)
    })

    it('returns true for _primitiveType Input', () => {
      const node = createASTNode({ name: 'Field', properties: { _primitiveType: 'Input' } })
      expect(isInputPrimitive(node)).toBe(true)
    })

    it('returns false for non-input', () => {
      const node = createASTNode({ name: 'Box' })
      expect(isInputPrimitive(node)).toBe(false)
    })
  })

  describe('isTextareaPrimitive', () => {
    it('returns true for Textarea name', () => {
      const node = createASTNode({ name: 'Textarea' })
      expect(isTextareaPrimitive(node)).toBe(true)
    })

    it('returns true for names ending with Textarea', () => {
      const node = createASTNode({ name: 'CommentTextarea' })
      expect(isTextareaPrimitive(node)).toBe(true)
    })

    it('returns true for _primitiveType Textarea', () => {
      const node = createASTNode({ name: 'Field', properties: { _primitiveType: 'Textarea' } })
      expect(isTextareaPrimitive(node)).toBe(true)
    })

    it('returns false for non-textarea', () => {
      const node = createASTNode({ name: 'Input' })
      expect(isTextareaPrimitive(node)).toBe(false)
    })
  })

  describe('isLinkPrimitive', () => {
    it('returns true for Link name', () => {
      const node = createASTNode({ name: 'Link' })
      expect(isLinkPrimitive(node)).toBe(true)
    })

    it('returns true for names ending with Link', () => {
      const node = createASTNode({ name: 'NavLink' })
      expect(isLinkPrimitive(node)).toBe(true)
    })

    it('returns true for _primitiveType Link', () => {
      const node = createASTNode({ name: 'Button', properties: { _primitiveType: 'Link' } })
      expect(isLinkPrimitive(node)).toBe(true)
    })

    it('returns false for non-link', () => {
      const node = createASTNode({ name: 'Button' })
      expect(isLinkPrimitive(node)).toBe(false)
    })
  })

  describe('isIconComponent', () => {
    it('returns true for Icon name', () => {
      const node = createASTNode({ name: 'Icon' })
      expect(isIconComponent(node)).toBe(true)
    })

    it('returns true for names ending with Icon', () => {
      const node = createASTNode({ name: 'SearchIcon' })
      expect(isIconComponent(node)).toBe(true)
    })

    it('returns false for non-icon', () => {
      const node = createASTNode({ name: 'Image' })
      expect(isIconComponent(node)).toBe(false)
    })
  })

  describe('isImageComponent', () => {
    it('returns true for Image name', () => {
      const node = createASTNode({ name: 'Image' })
      expect(isImageComponent(node)).toBe(true)
    })

    it('returns true for names ending with Image', () => {
      const node = createASTNode({ name: 'ProfileImage' })
      expect(isImageComponent(node)).toBe(true)
    })

    it('returns true for _primitiveType Image', () => {
      const node = createASTNode({ name: 'Avatar', properties: { _primitiveType: 'Image' } })
      expect(isImageComponent(node)).toBe(true)
    })

    it('returns false for non-image', () => {
      const node = createASTNode({ name: 'Box' })
      expect(isImageComponent(node)).toBe(false)
    })
  })

  describe('isHeadingPrimitive', () => {
    it('returns true for H1', () => {
      const node = createASTNode({ name: 'H1' })
      expect(isHeadingPrimitive(node)).toBe(true)
    })

    it('returns true for H2-H6', () => {
      expect(isHeadingPrimitive(createASTNode({ name: 'H2' }))).toBe(true)
      expect(isHeadingPrimitive(createASTNode({ name: 'H3' }))).toBe(true)
      expect(isHeadingPrimitive(createASTNode({ name: 'H4' }))).toBe(true)
      expect(isHeadingPrimitive(createASTNode({ name: 'H5' }))).toBe(true)
      expect(isHeadingPrimitive(createASTNode({ name: 'H6' }))).toBe(true)
    })

    it('returns false for non-heading', () => {
      const node = createASTNode({ name: 'Text' })
      expect(isHeadingPrimitive(node)).toBe(false)
    })
  })

  describe('getHeadingLevel', () => {
    it('returns correct level for H1-H6', () => {
      expect(getHeadingLevel(createASTNode({ name: 'H1' }))).toBe(1)
      expect(getHeadingLevel(createASTNode({ name: 'H2' }))).toBe(2)
      expect(getHeadingLevel(createASTNode({ name: 'H3' }))).toBe(3)
      expect(getHeadingLevel(createASTNode({ name: 'H4' }))).toBe(4)
      expect(getHeadingLevel(createASTNode({ name: 'H5' }))).toBe(5)
      expect(getHeadingLevel(createASTNode({ name: 'H6' }))).toBe(6)
    })
  })

  describe('renderInput', () => {
    it('renders input element', () => {
      const node = createASTNode({
        id: 'input1',
        name: 'Input',
        properties: { placeholder: 'Enter text' },
      })

      const { container } = render(
        renderInput({ node, style: {} })
      )

      const input = container.querySelector('input')
      expect(input).toBeTruthy()
      expect(input?.getAttribute('placeholder')).toBe('Enter text')
    })

    it('renders with correct type', () => {
      const node = createASTNode({
        id: 'input1',
        name: 'Input',
        properties: { type: 'password' },
      })

      const { container } = render(
        renderInput({ node, style: {} })
      )

      const input = container.querySelector('input')
      expect(input?.getAttribute('type')).toBe('password')
    })

    it('applies style', () => {
      const node = createASTNode({
        id: 'input1',
        name: 'Input',
        properties: {},
      })

      const { container } = render(
        renderInput({ node, style: { width: '200px' } })
      )

      const input = container.querySelector('input')
      expect(input?.style.width).toBe('200px')
    })

    it('sets data-id attribute', () => {
      const node = createASTNode({
        id: 'my-input',
        name: 'Input',
        properties: {},
      })

      const { container } = render(
        renderInput({ node, style: {} })
      )

      const input = container.querySelector('input')
      expect(input?.getAttribute('data-id')).toBe('my-input')
    })
  })

  describe('renderTextarea', () => {
    it('renders textarea element', () => {
      const node = createASTNode({
        id: 'textarea1',
        name: 'Textarea',
        properties: { placeholder: 'Enter message' },
      })

      const { container } = render(
        renderTextarea({ node, style: {} })
      )

      const textarea = container.querySelector('textarea')
      expect(textarea).toBeTruthy()
      expect(textarea?.getAttribute('placeholder')).toBe('Enter message')
    })

    it('sets default rows to 3', () => {
      const node = createASTNode({
        id: 'textarea1',
        name: 'Textarea',
        properties: {},
      })

      const { container } = render(
        renderTextarea({ node, style: {} })
      )

      const textarea = container.querySelector('textarea')
      expect(textarea?.getAttribute('rows')).toBe('3')
    })

    it('uses custom rows', () => {
      const node = createASTNode({
        id: 'textarea1',
        name: 'Textarea',
        properties: { rows: 5 },
      })

      const { container } = render(
        renderTextarea({ node, style: {} })
      )

      const textarea = container.querySelector('textarea')
      expect(textarea?.getAttribute('rows')).toBe('5')
    })
  })

  describe('renderLink', () => {
    it('renders anchor element', () => {
      const node = createASTNode({
        id: 'link1',
        name: 'Link',
        properties: { href: 'https://example.com' },
      })

      const { container } = render(
        renderLink({ node, style: {} }, 'Click here')
      )

      const link = container.querySelector('a')
      expect(link).toBeTruthy()
      expect(link?.getAttribute('href')).toBe('https://example.com')
      expect(link?.textContent).toBe('Click here')
    })

    it('sets target and rel for _blank', () => {
      const node = createASTNode({
        id: 'link1',
        name: 'Link',
        properties: { href: 'https://example.com', target: '_blank' },
      })

      const { container } = render(
        renderLink({ node, style: {} }, 'External')
      )

      const link = container.querySelector('a')
      expect(link?.getAttribute('target')).toBe('_blank')
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('sanitizes href', () => {
      const node = createASTNode({
        id: 'link1',
        name: 'Link',
        properties: { href: 'javascript:alert(1)' },
      })

      const { container } = render(
        renderLink({ node, style: {} }, 'Bad link')
      )

      const link = container.querySelector('a')
      // Should be sanitized (not contain javascript:)
      expect(link?.getAttribute('href')).not.toContain('javascript:')
    })
  })

  describe('renderIcon', () => {
    it('returns null when no icon specified', () => {
      const node = createASTNode({
        id: 'icon1',
        name: 'Icon',
        properties: {},
      })

      const result = renderIcon({ node, style: {} })
      expect(result).toBeNull()
    })

    it('renders icon with valid icon name', () => {
      const node = createASTNode({
        id: 'icon1',
        name: 'Icon',
        properties: { icon: 'Search' },
      })

      const { container } = render(
        <div>{renderIcon({ node, style: {} })}</div>
      )

      const span = container.querySelector('span')
      expect(span).toBeTruthy()
      expect(span?.getAttribute('data-id')).toBe('icon1')
    })

    it('uses custom size and color', () => {
      const node = createASTNode({
        id: 'icon1',
        name: 'Icon',
        properties: { icon: 'Search', size: 24, col: '#FF0000' },
      })

      const result = renderIcon({ node, style: {} })
      expect(result).toBeTruthy()
    })
  })

  describe('renderImageElement', () => {
    it('returns null when no src', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Image',
        properties: {},
      })

      const result = renderImageElement(node)
      expect(result).toBeNull()
    })

    it('renders img with src', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Image',
        properties: { src: '/test.jpg' },
      })

      const { container } = render(
        <div>{renderImageElement(node)}</div>
      )

      const img = container.querySelector('img')
      expect(img).toBeTruthy()
    })

    it('uses content as src for Image component', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Image',
        content: '/content-image.jpg',
        properties: {},
      })

      const { container } = render(
        <div>{renderImageElement(node)}</div>
      )

      const img = container.querySelector('img')
      expect(img).toBeTruthy()
    })

    it('sets alt attribute', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Image',
        properties: { src: '/test.jpg', alt: 'Test image' },
      })

      const { container } = render(
        <div>{renderImageElement(node)}</div>
      )

      const img = container.querySelector('img')
      expect(img?.getAttribute('alt')).toBe('Test image')
    })

    it('defaults to cover fit', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Image',
        properties: { src: '/test.jpg' },
      })

      const { container } = render(
        <div>{renderImageElement(node)}</div>
      )

      const img = container.querySelector('img')
      expect(img?.style.objectFit).toBe('cover')
    })

    it('uses custom fit', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Image',
        properties: { src: '/test.jpg', fit: 'contain' },
      })

      const { container } = render(
        <div>{renderImageElement(node)}</div>
      )

      const img = container.querySelector('img')
      expect(img?.style.objectFit).toBe('contain')
    })
  })

  describe('getImageSrc', () => {
    it('returns undefined when no src', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Box',
        properties: {},
      })

      expect(getImageSrc(node)).toBeUndefined()
    })

    it('returns resolved src from properties', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Image',
        properties: { src: 'image.jpg' },
      })

      // resolveImageSrc prepends /media/ to relative paths
      expect(getImageSrc(node)).toBe('/media/image.jpg')
    })

    it('returns resolved content as src for Image component', () => {
      const node = createASTNode({
        id: 'img1',
        name: 'Image',
        content: 'content.jpg',
        properties: {},
      })

      // resolveImageSrc prepends /media/ to relative paths
      expect(getImageSrc(node)).toBe('/media/content.jpg')
    })
  })

  describe('renderHeading', () => {
    it('renders h1 for H1 component', () => {
      const node = createASTNode({
        id: 'h1',
        name: 'H1',
        properties: {},
      })

      const { container } = render(
        renderHeading({ node, style: {} }, 'Title')
      )

      const h1 = container.querySelector('h1')
      expect(h1).toBeTruthy()
      expect(h1?.textContent).toBe('Title')
    })

    it('renders correct heading level', () => {
      const h3Node = createASTNode({
        id: 'h3',
        name: 'H3',
        properties: {},
      })

      const { container } = render(
        renderHeading({ node: h3Node, style: {} }, 'Subtitle')
      )

      const h3 = container.querySelector('h3')
      expect(h3).toBeTruthy()
    })

    it('applies style', () => {
      const node = createASTNode({
        id: 'h1',
        name: 'H1',
        properties: {},
      })

      const { container } = render(
        renderHeading({ node, style: { color: 'red' } }, 'Styled')
      )

      const h1 = container.querySelector('h1')
      expect(h1?.style.color).toBe('red')
    })

    it('sets data-id', () => {
      const node = createASTNode({
        id: 'my-heading',
        name: 'H2',
        properties: {},
      })

      const { container } = render(
        renderHeading({ node, style: {} }, 'Content')
      )

      const h2 = container.querySelector('h2')
      expect(h2?.getAttribute('data-id')).toBe('my-heading')
    })
  })
})
