/**
 * Hug Sizing Edge Cases
 *
 * Tests for hug (fit-content) sizing in various scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { generateDOM } from '../../compiler/backends/dom'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.style.width = '500px'
  container.style.height = '500px'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

function renderMirror(code: string): HTMLElement {
  const ast = parse(code)
  let domCode = generateDOM(ast)
  domCode = domCode.replace(/^export\s+function/gm, 'function')
  const fn = new Function(domCode + '\nreturn createUI();')
  const ui = fn()
  container.appendChild(ui.root)
  // Skip the <style> element - find first non-style child
  const children = Array.from(ui.root.children) as HTMLElement[]
  return children.find(el => el.tagName.toLowerCase() !== 'style') as HTMLElement
}

function getStyle(el: HTMLElement, prop: string): string {
  return el.style.getPropertyValue(prop) || window.getComputedStyle(el).getPropertyValue(prop)
}

describe('Hug Sizing Edge Cases', () => {

  describe('hug in centered container', () => {

    it('w hug in centered container stays hug (not stretch)', () => {
      const root = renderMirror(`
Container: w 300, h 300, ver, center

Container:
  Box w hug, bg #f00
    Text "Hello"

Container
`)
      const box = root.children[0] as HTMLElement
      expect(getStyle(box, 'width')).toBe('fit-content')
    })

    it('h hug in centered hor container stays hug', () => {
      const root = renderMirror(`
Container: w 300, h 300, hor, center

Container:
  Box h hug, bg #f00
    Text "Hello"

Container
`)
      const box = root.children[0] as HTMLElement
      expect(getStyle(box, 'height')).toBe('fit-content')
    })
  })

  describe('hug with full siblings', () => {

    it('h hug sibling with h full', () => {
      const root = renderMirror(`
Container: w 200, h 300

Container:
  Box h hug, bg #f00
    Text "Header"
  Box h full, bg #0f0

Container
`)
      const hugChild = root.children[0] as HTMLElement
      const fullChild = root.children[1] as HTMLElement

      expect(getStyle(hugChild, 'height')).toBe('fit-content')
      expect(getStyle(fullChild, 'flex')).toBe('1 1 0%')
    })

    it('w hug + w full siblings in hor container', () => {
      const root = renderMirror(`
Row: w 400, h 100, hor

Row:
  Box w hug, bg #f00
    Text "Fixed"
  Box w full, bg #0f0

Row
`)
      const hugChild = root.children[0] as HTMLElement
      const fullChild = root.children[1] as HTMLElement

      expect(getStyle(hugChild, 'width')).toBe('fit-content')
      expect(getStyle(fullChild, 'flex')).toBe('1 1 0%')
    })

    it('multiple hug + one full', () => {
      const root = renderMirror(`
Container: w 200, h 400

Container:
  Box h hug
    Text "A"
  Box h hug
    Text "B"
  Box h full, bg #0f0

Container
`)
      expect(getStyle(root.children[0] as HTMLElement, 'height')).toBe('fit-content')
      expect(getStyle(root.children[1] as HTMLElement, 'height')).toBe('fit-content')
      expect(getStyle(root.children[2] as HTMLElement, 'flex')).toBe('1 1 0%')
    })
  })

  describe('nested hug containers', () => {

    it('nested hug containers all use fit-content', () => {
      const root = renderMirror(`
Outer as Frame:
  w hug
  h hug

Inner as Frame:
  w hug
  h hug

Outer
  Inner
    Text "Content"
`)
      expect(getStyle(root, 'width')).toBe('fit-content')
      expect(getStyle(root, 'height')).toBe('fit-content')

      const inner = root.children[0] as HTMLElement
      expect(getStyle(inner, 'width')).toBe('fit-content')
      expect(getStyle(inner, 'height')).toBe('fit-content')
    })

    it('hug parent with fixed children', () => {
      const root = renderMirror(`
Container: w hug, h hug

Container:
  Box w 100, h 50
  Box w 80, h 30

Container
`)
      expect(getStyle(root, 'width')).toBe('fit-content')
      expect(getStyle(root, 'height')).toBe('fit-content')
    })
  })

  describe('size hug shorthand', () => {

    it('size hug applies to both dimensions', () => {
      const root = renderMirror(`
Box: size hug

Box:
  Text "Test"

Box
`)
      expect(getStyle(root, 'width')).toBe('fit-content')
      expect(getStyle(root, 'height')).toBe('fit-content')
    })
  })

  describe('hug with alignment combinations', () => {

    it('hug children respect parent spread', () => {
      const root = renderMirror(`
Container: w 300, h 200, spread

Container:
  Box h hug
    Text "Top"
  Box h hug
    Text "Bottom"

Container
`)
      expect(getStyle(root, 'justify-content')).toBe('space-between')
      expect(getStyle(root.children[0] as HTMLElement, 'height')).toBe('fit-content')
      expect(getStyle(root.children[1] as HTMLElement, 'height')).toBe('fit-content')
    })
  })
})
