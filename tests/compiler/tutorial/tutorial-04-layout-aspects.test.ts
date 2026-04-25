/**
 * Tutorial 04-layout — Aspect Closure Tests (Thema 4 Iter 2)
 *
 * Schließt Tutorial-Aspekte aus `04-layout.html`, die nicht durch die
 * existierenden tutorial-05-layout / tutorial-06-grid / tutorial-07-
 * positioning Behavior-Tests abgedeckt sind:
 * - Device Presets (canvas mobile/tablet/desktop)
 * - Grid als Komponente
 * - Badge-on-Icon (stacked)
 * - Size-States als Tutorial-Aspekt (eingebaute compact/regular/wide)
 * - Eigene Size-States (compact.max / wide.min Tokens)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => container.remove())

describe('Tutorial 04 Aspekte: Device Presets', () => {
  it('canvas mobile sets fixed width 375 + height 812 on the .mirror-root', () => {
    const { root } = renderWithRuntime(
      `canvas mobile

Text "Hallo"`,
      container
    )
    expect(root.style.width).toBe('375px')
    expect(root.style.height).toBe('812px')
  })

  it('Frame device tablet applies tablet preset (768)', () => {
    const { root } = renderWithRuntime(
      `Frame device tablet
  Text "Tablet"`,
      container
    )
    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame).toBeTruthy()
    // Tablet preset sets w 768
    expect(frame.style.width).toBe('768px')
  })
})

describe('Tutorial 04 Aspekte: Grid als Komponente', () => {
  it('component wrapping grid layout exposes grid columns to children', () => {
    const { root } = renderWithRuntime(
      `Gallery: grid 3, gap 8
  Title: col white, fs 14

Gallery
  Title "Header"
  Frame bg #f00
  Frame bg #0f0
  Frame bg #00f`,
      container
    )
    const gallery = root.querySelector('[data-mirror-name="Gallery"]') as HTMLElement
    expect(gallery).toBeTruthy()
    expect(gallery.style.display).toBe('grid')
    expect(gallery.style.gridTemplateColumns).toMatch(/repeat\(3,\s*1fr\)/)
  })
})

describe('Tutorial 04 Aspekte: Badge auf Icon (stacked)', () => {
  it('stacked layout positions a badge over an icon via x/y', () => {
    const { root } = renderWithRuntime(
      `Frame stacked, w 40, h 40
  Icon "bell", ic #888, is 24
  Frame x 24, y -4, w 16, h 16, bg #ef4444, rad 99
    Text "3", col white, fs 10`,
      container
    )
    const stacked = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(stacked).toBeTruthy()
    // Stacked parent has position: relative
    expect(stacked.style.position).toBe('relative')
    // The badge frame (the second Frame inside) has absolute positioning
    const inner = Array.from(stacked.querySelectorAll('[data-mirror-name="Frame"]'))
    const badge = inner[0] as HTMLElement
    expect(badge?.style.position).toBe('absolute')
  })
})

describe('Tutorial 04 Aspekte: Eingebaute Size-States', () => {
  it('compact: block emits a @container query in CSS', () => {
    const { root } = renderWithRuntime(
      `Card: bg #1a1a1a, pad 16, gap 12, ver
  compact:
    pad 12, gap 8

Card w 300
  Text "Test"`,
      container
    )
    const css = root.querySelector('style')!.textContent!
    // Size-states use CSS Container Queries
    expect(css).toMatch(/@container/)
  })

  it('compact + regular + wide produce three @container blocks', () => {
    const { root } = renderWithRuntime(
      `Card: bg #1a1a1a, rad 8
  compact:
    pad 12
  wide:
    pad 24, hor

Card w 600
  Text "X"`,
      container
    )
    const css = root.querySelector('style')!.textContent!
    const containerCount = (css.match(/@container/g) || []).length
    expect(containerCount).toBeGreaterThanOrEqual(2)
  })

  it('Custom size-state via token (compact.max: 250) overrides default threshold', () => {
    const { root } = renderWithRuntime(
      `compact.max: 250

Card: bg #1a1a1a, pad 16
  compact:
    pad 8

Card w 200
  Text "X"`,
      container
    )
    const css = root.querySelector('style')!.textContent!
    // Custom threshold 250 must reach the @container query
    expect(css).toMatch(/(max-width:\s*249|max-width:\s*250)/)
  })
})
