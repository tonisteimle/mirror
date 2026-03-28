/**
 * Tests for h full / w full CSS generation
 *
 * The IR should generate proper flex CSS for "full" sizing values
 * to ensure elements fill remaining space in flex containers correctly.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

// Helper to get styles from first child
function getStyles(code: string) {
  const ast = parse(code)
  const ir = toIR(ast)
  if (ir.nodes.length === 0) return []
  const node = ir.nodes[0]
  // If it's a component definition, get child styles
  if (node.children && node.children.length > 0) {
    return node.children[0].styles
  }
  return node.styles
}

// Helper to find style by property name
function findStyle(styles: any[], prop: string) {
  return styles.find(s => s.property === prop)
}

describe('IR: Full Sizing (h full / w full)', () => {

  describe('Height full', () => {
    it('generates flex: 1 1 0% for h full', () => {
      const styles = getStyles(`
Container:
  Box h full

Container
`)
      const flex = findStyle(styles, 'flex')
      expect(flex).toBeDefined()
      expect(flex.value).toBe('1 1 0%')
    })

    it('generates min-height: 0 for h full', () => {
      const styles = getStyles(`
Container:
  Box h full

Container
`)
      const minHeight = findStyle(styles, 'min-height')
      expect(minHeight).toBeDefined()
      expect(minHeight.value).toBe('0')
    })

    it('does not generate height: 100% for h full', () => {
      const styles = getStyles(`
Container:
  Box h full

Container
`)
      const height = findStyle(styles, 'height')
      expect(height).toBeUndefined()
    })

    it('works with height full (long form)', () => {
      const styles = getStyles(`
Container:
  Box height full

Container
`)
      const flex = findStyle(styles, 'flex')
      expect(flex).toBeDefined()
      expect(flex.value).toBe('1 1 0%')
    })
  })

  describe('Width full', () => {
    it('generates flex: 1 1 0% for w full', () => {
      const styles = getStyles(`
Container:
  Box w full

Container
`)
      const flex = findStyle(styles, 'flex')
      expect(flex).toBeDefined()
      expect(flex.value).toBe('1 1 0%')
    })

    it('generates min-width: 0 for w full', () => {
      const styles = getStyles(`
Container:
  Box w full

Container
`)
      const minWidth = findStyle(styles, 'min-width')
      expect(minWidth).toBeDefined()
      expect(minWidth.value).toBe('0')
    })

    it('does not generate width: 100% for w full', () => {
      const styles = getStyles(`
Container:
  Box w full

Container
`)
      const width = findStyle(styles, 'width')
      expect(width).toBeUndefined()
    })

    it('works with width full (long form)', () => {
      const styles = getStyles(`
Container:
  Box width full

Container
`)
      const flex = findStyle(styles, 'flex')
      expect(flex).toBeDefined()
      expect(flex.value).toBe('1 1 0%')
    })
  })

  describe('Height hug', () => {
    it('generates height: fit-content for h hug', () => {
      const styles = getStyles(`
Container:
  Box h hug

Container
`)
      const height = findStyle(styles, 'height')
      expect(height).toBeDefined()
      expect(height.value).toBe('fit-content')
    })
  })

  describe('Width hug', () => {
    it('generates width: fit-content for w hug', () => {
      const styles = getStyles(`
Container:
  Box w hug

Container
`)
      const width = findStyle(styles, 'width')
      expect(width).toBeDefined()
      expect(width.value).toBe('fit-content')
    })
  })

  describe('Fixed sizes', () => {
    it('generates fixed height for h with number', () => {
      const styles = getStyles(`
Container:
  Box h 300

Container
`)
      const height = findStyle(styles, 'height')
      expect(height).toBeDefined()
      expect(height.value).toBe('300px')
    })

    it('generates fixed width for w with number', () => {
      const styles = getStyles(`
Container:
  Box w 200

Container
`)
      const width = findStyle(styles, 'width')
      expect(width).toBeDefined()
      expect(width.value).toBe('200px')
    })
  })

  describe('Combinations', () => {
    it('combines h full with fixed w', () => {
      const styles = getStyles(`
Container:
  Box w 250 h full

Container
`)
      const width = findStyle(styles, 'width')
      const flex = findStyle(styles, 'flex')
      const minHeight = findStyle(styles, 'min-height')

      expect(width).toBeDefined()
      expect(width.value).toBe('250px')
      expect(flex).toBeDefined()
      expect(flex.value).toBe('1 1 0%')
      expect(minHeight).toBeDefined()
      expect(minHeight.value).toBe('0')
    })

    it('combines w full with fixed h', () => {
      const styles = getStyles(`
Container:
  Box w full h 100

Container
`)
      const height = findStyle(styles, 'height')
      const flex = findStyle(styles, 'flex')
      const minWidth = findStyle(styles, 'min-width')

      expect(height).toBeDefined()
      expect(height.value).toBe('100px')
      expect(flex).toBeDefined()
      expect(flex.value).toBe('1 1 0%')
      expect(minWidth).toBeDefined()
      expect(minWidth.value).toBe('0')
    })

    it('combines h full with other properties', () => {
      const styles = getStyles(`
Container:
  Box h full bg #333 pad 16

Container
`)
      const flex = findStyle(styles, 'flex')
      const bg = findStyle(styles, 'background')
      const pad = findStyle(styles, 'padding')

      expect(flex).toBeDefined()
      expect(flex.value).toBe('1 1 0%')
      expect(bg).toBeDefined()
      expect(bg.value).toBe('#333')
      expect(pad).toBeDefined()
      expect(pad.value).toBe('16px')
    })
  })
})
