/**
 * Tutorial 08 - Styling: BEHAVIOR Tests
 *
 * Testet:
 * - Farben (Hex, Named, RGBA)
 * - Border & Radius
 * - Typography
 * - Shadow, Opacity, Blur
 * - Cursor
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

// ============================================================
// FARBEN
// ============================================================
describe('Farben', () => {

  it('Hex-Farben', () => {
    const { root } = renderWithRuntime(`
Frame bg #2563eb, pad 16
  Text "Blue" col white
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.background).toMatch(/2563eb|rgb\(37,\s*99,\s*235\)/)
  })

  it('Named Colors', () => {
    const { root } = renderWithRuntime(`
Frame bg white, pad 16
  Text "White" col black
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.background).toMatch(/white|rgb\(255,\s*255,\s*255\)/)
  })

  it('RGBA', () => {
    const { root } = renderWithRuntime(`
Frame bg rgba(0,0,0,0.5), pad 16
  Text "Semi-transparent"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.background).toBeTruthy()
  })

  it('Short Hex', () => {
    const { root } = renderWithRuntime(`
Frame bg #f00, pad 16
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.background).toMatch(/f00|ff0000|rgb\(255,\s*0,\s*0\)/)
  })
})

// ============================================================
// BORDER & RADIUS
// ============================================================
describe('Border & Radius', () => {

  it('bor N setzt Border', () => {
    const { root } = renderWithRuntime(`
Frame bor 1, boc #333, pad 16
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.borderWidth).toBe('1px')
  })

  it('rad N setzt Border-Radius', () => {
    const { root } = renderWithRuntime(`
Frame rad 8, bg #333, pad 16
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.borderRadius).toBe('8px')
  })

  it('rad 999 für Pill-Form', () => {
    const { root } = renderWithRuntime(`
Frame rad 999, bg #333, pad 8 16
  Text "Pill"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.borderRadius).toBe('999px')
  })
})

// ============================================================
// TYPOGRAPHY
// ============================================================
describe('Typography', () => {

  it('fs N setzt Font-Size', () => {
    const { root } = renderWithRuntime(`
Text "Large" fs 24
`, container)

    const text = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    expect(text.style.fontSize).toBe('24px')
  })

  it('weight bold', () => {
    const { root } = renderWithRuntime(`
Text "Bold" weight bold
`, container)

    const text = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    // "bold" wird zu "700" konvertiert (standard CSS behavior)
    expect(text.style.fontWeight).toMatch(/bold|700/)
  })

  it('weight N (numerisch)', () => {
    const { root } = renderWithRuntime(`
Text "500" weight 500
`, container)

    const text = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    expect(text.style.fontWeight).toBe('500')
  })

  it('italic', () => {
    const { root } = renderWithRuntime(`
Text "Italic" italic
`, container)

    const text = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    expect(text.style.fontStyle).toBe('italic')
  })

  it('underline', () => {
    const { root } = renderWithRuntime(`
Text "Underlined" underline
`, container)

    const text = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    expect(text.style.textDecoration).toContain('underline')
  })

  it('uppercase', () => {
    const { root } = renderWithRuntime(`
Text "caps" uppercase
`, container)

    const text = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    expect(text.style.textTransform).toBe('uppercase')
  })

  it('truncate', () => {
    const { root } = renderWithRuntime(`
Text "Very long text that should be truncated..." truncate, w 100
`, container)

    const text = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    expect(text.style.overflow).toBe('hidden')
    expect(text.style.textOverflow).toBe('ellipsis')
  })
})

// ============================================================
// SHADOW & OPACITY
// ============================================================
describe('Shadow & Opacity', () => {

  it('shadow md', () => {
    const { root } = renderWithRuntime(`
Frame shadow md, bg #1a1a1a, pad 16
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.boxShadow).toBeTruthy()
  })

  it('opacity N', () => {
    const { root } = renderWithRuntime(`
Frame opacity 0.5, bg #333, pad 16
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.opacity).toBe('0.5')
  })

  it('blur N', () => {
    const { root } = renderWithRuntime(`
Frame blur 4, pad 16
  Text "Blurred"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.filter).toContain('blur')
  })
})

// ============================================================
// CURSOR
// ============================================================
describe('Cursor', () => {

  it('cursor pointer', () => {
    const { root } = renderWithRuntime(`
Frame cursor pointer, pad 16, bg #333
  Text "Clickable"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.cursor).toBe('pointer')
  })

  it('cursor grab', () => {
    const { root } = renderWithRuntime(`
Frame cursor grab, pad 16, bg #333
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.cursor).toBe('grab')
  })
})

// ============================================================
// TUTORIAL BEISPIELE
// ============================================================
describe('Tutorial 08 Beispiele', () => {

  it('Beispiel: Styled Card', () => {
    const { root } = renderWithRuntime(`
Frame pad 20, bg #1a1a1a, rad 12, shadow md, cursor pointer
  Text "Premium Card" fs 18, weight bold, col white
  Text "Click to view details" fs 14, col #888
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.borderRadius).toBe('12px')
    expect(frame.style.cursor).toBe('pointer')
    expect(frame.style.boxShadow).toBeTruthy()
  })

  it('Beispiel: Badge Styles', () => {
    const { root } = renderWithRuntime(`
Frame hor, gap 8
  Frame pad 4 8, bg #2563eb, rad 999
    Text "NEW" col white, fs 12, weight bold, uppercase
  Frame pad 4 8, bg #10b981, rad 999
    Text "SALE" col white, fs 12, weight bold, uppercase
`, container)

    const badges = root.querySelectorAll('[data-mirror-name="Frame"] > [data-mirror-name="Frame"]')
    expect(badges.length).toBe(2)
  })
})
