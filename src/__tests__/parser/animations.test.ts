/**
 * Animation Parsing Tests
 *
 * Tests for the new animation syntax:
 * - show fade slide-up 300 (entrance animation)
 * - hide fade 200 (exit animation)
 * - animate spin 1000 (continuous animation)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

// Helper to filter out warnings from errors array
function getErrors(result: ReturnType<typeof parse>) {
  return (result.errors || []).filter(
    (e: string) => !e.startsWith('Warning:')
  )
}

describe('Animation Parsing', () => {
  describe('show animation', () => {
    it('parses single animation with duration', () => {
      const input = `
Panel
  show fade 300
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const panel = result.nodes[0]
      expect(panel.showAnimation).toBeDefined()
      expect(panel.showAnimation!.type).toBe('show')
      expect(panel.showAnimation!.animations).toEqual(['fade'])
      expect(panel.showAnimation!.duration).toBe(300)
    })

    it('parses multiple animations with duration', () => {
      const input = `
Content
  show fade slide-up 400
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const content = result.nodes[0]
      expect(content.showAnimation).toBeDefined()
      expect(content.showAnimation!.type).toBe('show')
      expect(content.showAnimation!.animations).toEqual(['fade', 'slide-up'])
      expect(content.showAnimation!.duration).toBe(400)
    })

    it('uses default duration when not specified', () => {
      const input = `
Box
  show fade
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const box = result.nodes[0]
      expect(box.showAnimation).toBeDefined()
      expect(box.showAnimation!.animations).toEqual(['fade'])
      expect(box.showAnimation!.duration).toBe(300) // Default for show/hide
    })

    it('parses scale animation', () => {
      const input = `
Modal
  show scale 250
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const modal = result.nodes[0]
      expect(modal.showAnimation).toBeDefined()
      expect(modal.showAnimation!.animations).toEqual(['scale'])
      expect(modal.showAnimation!.duration).toBe(250)
    })

    it('parses slide-down animation', () => {
      const input = `
Menu
  show slide-down 200
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const menu = result.nodes[0]
      expect(menu.showAnimation).toBeDefined()
      expect(menu.showAnimation!.animations).toEqual(['slide-down'])
      expect(menu.showAnimation!.duration).toBe(200)
    })
  })

  describe('hide animation', () => {
    it('parses single animation with duration', () => {
      const input = `
Panel
  hide fade 200
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const panel = result.nodes[0]
      expect(panel.hideAnimation).toBeDefined()
      expect(panel.hideAnimation!.type).toBe('hide')
      expect(panel.hideAnimation!.animations).toEqual(['fade'])
      expect(panel.hideAnimation!.duration).toBe(200)
    })

    it('parses multiple animations', () => {
      const input = `
Content
  hide fade slide-down 300
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const content = result.nodes[0]
      expect(content.hideAnimation).toBeDefined()
      expect(content.hideAnimation!.animations).toEqual(['fade', 'slide-down'])
      expect(content.hideAnimation!.duration).toBe(300)
    })

    it('uses default duration when not specified', () => {
      const input = `
Box
  hide scale
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const box = result.nodes[0]
      expect(box.hideAnimation).toBeDefined()
      expect(box.hideAnimation!.duration).toBe(300) // Default for show/hide
    })
  })

  describe('animate (continuous animation)', () => {
    it('parses spin animation', () => {
      const input = `
Loader
  animate spin 1000
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const loader = result.nodes[0]
      expect(loader.continuousAnimation).toBeDefined()
      expect(loader.continuousAnimation!.type).toBe('animate')
      expect(loader.continuousAnimation!.animations).toEqual(['spin'])
      expect(loader.continuousAnimation!.duration).toBe(1000)
    })

    it('parses pulse animation', () => {
      const input = `
Indicator
  animate pulse 800
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const indicator = result.nodes[0]
      expect(indicator.continuousAnimation).toBeDefined()
      expect(indicator.continuousAnimation!.animations).toEqual(['pulse'])
      expect(indicator.continuousAnimation!.duration).toBe(800)
    })

    it('parses bounce animation', () => {
      const input = `
Arrow
  animate bounce 600
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const arrow = result.nodes[0]
      expect(arrow.continuousAnimation).toBeDefined()
      expect(arrow.continuousAnimation!.animations).toEqual(['bounce'])
      expect(arrow.continuousAnimation!.duration).toBe(600)
    })

    it('uses default duration (1000ms) when not specified', () => {
      const input = `
LoadingIndicator
  animate spin
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const loadingIndicator = result.nodes[0]
      expect(loadingIndicator.continuousAnimation).toBeDefined()
      expect(loadingIndicator.continuousAnimation!.duration).toBe(1000) // Default for continuous
    })
  })

  describe('combined show/hide animations', () => {
    it('parses both show and hide animations on same element', () => {
      const input = `
Panel
  show fade slide-up 300
  hide fade 200
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const panel = result.nodes[0]
      expect(panel.showAnimation).toBeDefined()
      expect(panel.showAnimation!.animations).toEqual(['fade', 'slide-up'])
      expect(panel.showAnimation!.duration).toBe(300)

      expect(panel.hideAnimation).toBeDefined()
      expect(panel.hideAnimation!.animations).toEqual(['fade'])
      expect(panel.hideAnimation!.duration).toBe(200)
    })

    it('parses show, hide, and continuous animation together', () => {
      const input = `
Widget
  show scale 200
  hide fade 150
  animate pulse 2000
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const widget = result.nodes[0]
      expect(widget.showAnimation).toBeDefined()
      expect(widget.showAnimation!.animations).toEqual(['scale'])

      expect(widget.hideAnimation).toBeDefined()
      expect(widget.hideAnimation!.animations).toEqual(['fade'])

      expect(widget.continuousAnimation).toBeDefined()
      expect(widget.continuousAnimation!.animations).toEqual(['pulse'])
      expect(widget.continuousAnimation!.duration).toBe(2000)
    })
  })

  describe('animation with other properties', () => {
    it('parses animations alongside regular properties', () => {
      const input = `
Panel pad 16 col #F00
  show fade 300
  hide fade 200
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const panel = result.nodes[0]
      expect(panel.properties.pad).toBe(16)
      expect(panel.properties.col).toBe('#F00')
      expect(panel.showAnimation).toBeDefined()
      expect(panel.hideAnimation).toBeDefined()
    })

    it('parses animations with children', () => {
      const input = `
Container
  show slide-up 300
  Text "Hello"
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const container = result.nodes[0]
      expect(container.showAnimation).toBeDefined()
      expect(container.children).toHaveLength(1)
      expect(container.children[0].name).toBe('Text')
    })

    it('parses animations with hidden property', () => {
      const input = `
Content hidden
  show fade slide-up 300
  hide fade 200
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const content = result.nodes[0]
      expect(content.properties.hidden).toBe(true)
      expect(content.showAnimation).toBeDefined()
      expect(content.hideAnimation).toBeDefined()
    })
  })

  describe('all animation types', () => {
    it('parses slide-left animation', () => {
      const input = `
Drawer
  show slide-left 300
  hide slide-right 300
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const drawer = result.nodes[0]
      expect(drawer.showAnimation!.animations).toEqual(['slide-left'])
      expect(drawer.hideAnimation!.animations).toEqual(['slide-right'])
    })

    it('parses combined fade and scale', () => {
      const input = `
Modal
  show fade scale 250
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const modal = result.nodes[0]
      expect(modal.showAnimation!.animations).toEqual(['fade', 'scale'])
    })
  })
})
