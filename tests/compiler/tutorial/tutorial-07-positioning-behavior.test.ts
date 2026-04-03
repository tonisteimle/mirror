/**
 * Tutorial 07 - Positioning: BEHAVIOR Tests
 *
 * Testet:
 * - stacked Layout
 * - pin-* Abstände
 * - z-index
 * - absolute/fixed
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
// STACKED LAYOUT
// ============================================================
describe('Stacked Layout', () => {

  it('stacked setzt position: relative auf Parent', () => {
    const { root } = renderWithRuntime(`
Frame stacked, w 200, h 200
  Frame w full, h full, bg #333
  Frame w 100, h 100, bg #2563eb
`, container)

    const parent = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(parent.style.position).toBe('relative')
  })

  it('stacked Children sind absolute', () => {
    const { root } = renderWithRuntime(`
Frame stacked, w 200, h 200
  Frame w full, h full, bg #333
  Frame w 100, h 100, bg #2563eb
`, container)

    const children = root.querySelectorAll('[data-mirror-name="Frame"] > [data-mirror-name="Frame"]')
    expect(children.length).toBe(2)

    // Kinder sollten absolute sein
    Array.from(children).forEach(child => {
      expect((child as HTMLElement).style.position).toBe('absolute')
    })
  })
})

// ============================================================
// Z-INDEX
// ============================================================
describe('Z-Index', () => {

  it('z N setzt z-index', () => {
    const { root } = renderWithRuntime(`
Frame stacked, w 200, h 200
  Frame z 1, w 100, h 100, bg #333
  Frame z 2, w 100, h 100, bg #2563eb
`, container)

    const children = root.querySelectorAll('[data-mirror-name="Frame"] > [data-mirror-name="Frame"]')
    expect((children[0] as HTMLElement).style.zIndex).toBe('1')
    expect((children[1] as HTMLElement).style.zIndex).toBe('2')
  })

  it('z funktioniert mit negativen Werten', () => {
    const { root } = renderWithRuntime(`
Frame stacked, w 200, h 200
  Frame z -1, w 100, h 100, bg #333
`, container)

    const child = root.querySelector('[data-mirror-name="Frame"] > [data-mirror-name="Frame"]') as HTMLElement
    expect(child.style.zIndex).toBe('-1')
  })
})

// ============================================================
// ABSOLUTE & FIXED
// ============================================================
describe('Absolute & Fixed', () => {

  it('absolute setzt position: absolute', () => {
    const { root } = renderWithRuntime(`
Frame w 200, h 200
  Frame absolute, pt 10, pl 10, w 50, h 50, bg #2563eb
`, container)

    const child = root.querySelector('[data-mirror-name="Frame"] > [data-mirror-name="Frame"]') as HTMLElement
    expect(child.style.position).toBe('absolute')
  })

  it('fixed setzt position: fixed', () => {
    const { root } = renderWithRuntime(`
Frame fixed, pt 0, pl 0, pr 0, h 60, bg #1a1a1a
  Text "Fixed Header"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.position).toBe('fixed')
  })
})

// ============================================================
// X/Y ABSOLUTE POSITIONING
// ============================================================
describe('X/Y Absolute Positioning', () => {

  it('x N setzt position absolute und left', () => {
    const { root } = renderWithRuntime(`
Frame x 50
  Text "Offset"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.position).toBe('absolute')
    expect(frame.style.left).toBe('50px')
  })

  it('y N setzt position absolute und top', () => {
    const { root } = renderWithRuntime(`
Frame y 50
  Text "Offset"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.position).toBe('absolute')
    expect(frame.style.top).toBe('50px')
  })
})

// ============================================================
// TUTORIAL BEISPIELE
// ============================================================
describe('Tutorial 07 Beispiele', () => {

  it('Beispiel: Badge auf Card', () => {
    const { root } = renderWithRuntime(`
Frame stacked, w 200, h 150, bg #1a1a1a, rad 12
  Text "Card Content", pad 16
  Frame absolute, pt 8, pr 8, pad 4 8, bg #ef4444, rad 999
    Text "NEW", col white, fs 12
`, container)

    const parent = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(parent.style.position).toBe('relative')
  })

  it('Beispiel: Overlay', () => {
    const { root } = renderWithRuntime(`
Frame stacked, w 300, h 200
  Frame w full, h full, bg #333
  Frame w full, h full, bg rgba(0,0,0,0.5), center
    Text "Overlay" col white
`, container)

    const children = root.querySelectorAll('[data-mirror-name="Frame"] > [data-mirror-name="Frame"]')
    expect(children.length).toBe(2)
  })
})
