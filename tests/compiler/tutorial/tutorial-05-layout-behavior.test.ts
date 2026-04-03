/**
 * Tutorial 05 - Layout: BEHAVIOR Tests
 *
 * Testet:
 * - hor/ver erzeugt korrektes Flexbox
 * - gap wird angewendet
 * - center/spread funktionieren
 * - w full/hug
 * - 9-Zone Alignment
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
// FLEX DIRECTION
// ============================================================
describe('Flex Direction', () => {

  it('hor setzt flex-direction: row', () => {
    const { root } = renderWithRuntime(`
Frame hor
  Text "A"
  Text "B"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.flexDirection).toBe('row')
  })

  it('ver setzt flex-direction: column', () => {
    const { root } = renderWithRuntime(`
Frame ver
  Text "A"
  Text "B"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.flexDirection).toBe('column')
  })

  it('Default ist column', () => {
    const { root } = renderWithRuntime(`
Frame
  Text "A"
  Text "B"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.flexDirection).toBe('column')
  })
})

// ============================================================
// GAP
// ============================================================
describe('Gap', () => {

  it('gap N setzt gap-Style', () => {
    const { root } = renderWithRuntime(`
Frame gap 16
  Text "A"
  Text "B"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.gap).toBe('16px')
  })

  it('gap 0 ist erlaubt', () => {
    const { root } = renderWithRuntime(`
Frame gap 0
  Text "A"
  Text "B"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.gap).toBe('0px')
  })
})

// ============================================================
// CENTER & SPREAD
// ============================================================
describe('Center & Spread', () => {

  it('center zentriert Items', () => {
    const { root } = renderWithRuntime(`
Frame center, w 200, h 200
  Text "Centered"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.alignItems).toBe('center')
    expect(frame.style.justifyContent).toBe('center')
  })

  it('spread verteilt Items', () => {
    const { root } = renderWithRuntime(`
Frame hor, spread, w 300
  Text "Left"
  Text "Right"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.justifyContent).toBe('space-between')
  })

  it('hor center kombiniert', () => {
    const { root } = renderWithRuntime(`
Frame hor, center
  Text "A"
  Text "B"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.flexDirection).toBe('row')
    expect(frame.style.alignItems).toBe('center')
  })
})

// ============================================================
// WIDTH & HEIGHT
// ============================================================
describe('Width & Height', () => {

  it('w N setzt Breite in Pixel', () => {
    const { root } = renderWithRuntime(`
Frame w 200
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.width).toBe('200px')
  })

  it('h N setzt Höhe in Pixel', () => {
    const { root } = renderWithRuntime(`
Frame h 100
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.height).toBe('100px')
  })

  it('w full setzt width: 100%', () => {
    const { root } = renderWithRuntime(`
Frame w full
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.width).toBe('100%')
  })

  it('h full setzt height: 100%', () => {
    const { root } = renderWithRuntime(`
Frame h full
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.height).toBe('100%')
  })
})

// ============================================================
// 9-ZONE ALIGNMENT
// ============================================================
describe('9-Zone Alignment', () => {

  it('tl = top-left', () => {
    const { root } = renderWithRuntime(`
Frame tl, w 200, h 200
  Text "Top Left"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.alignItems).toBe('flex-start')
    expect(frame.style.justifyContent).toBe('flex-start')
  })

  it('tc = top-center', () => {
    const { root } = renderWithRuntime(`
Frame tc, w 200, h 200
  Text "Top Center"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.alignItems).toBe('center')
    expect(frame.style.justifyContent).toBe('flex-start')
  })

  it('br = bottom-right', () => {
    const { root } = renderWithRuntime(`
Frame br, w 200, h 200
  Text "Bottom Right"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.alignItems).toBe('flex-end')
    expect(frame.style.justifyContent).toBe('flex-end')
  })

  it('center = middle', () => {
    const { root } = renderWithRuntime(`
Frame center, w 200, h 200
  Text "Center"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.alignItems).toBe('center')
    expect(frame.style.justifyContent).toBe('center')
  })
})

// ============================================================
// WRAP
// ============================================================
describe('Wrap', () => {

  it('wrap setzt flex-wrap: wrap', () => {
    const { root } = renderWithRuntime(`
Frame hor, wrap, w 200
  Frame w 80, h 40, bg #333
  Frame w 80, h 40, bg #333
  Frame w 80, h 40, bg #333
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.flexWrap).toBe('wrap')
  })
})
