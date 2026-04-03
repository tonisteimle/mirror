/**
 * Tutorial 06 - Grid: BEHAVIOR Tests
 *
 * Testet:
 * - grid N erzeugt CSS Grid
 * - Spalten/Zeilen-Span mit w/h
 * - dense Packing
 * - gap in Grid
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
// GRID BASICS
// ============================================================
describe('Grid Basics', () => {

  it('grid N setzt display: grid', () => {
    const { root } = renderWithRuntime(`
Frame grid 3
  Frame bg #333
  Frame bg #444
  Frame bg #555
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.display).toBe('grid')
  })

  it('grid N setzt N Spalten', () => {
    const { root } = renderWithRuntime(`
Frame grid 4, gap 8
  Frame bg #333
  Frame bg #444
  Frame bg #555
  Frame bg #666
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.display).toBe('grid')
    // gridTemplateColumns sollte 4 Spalten haben
    expect(frame.style.gridTemplateColumns).toContain('1fr')
  })

  it('grid auto für automatische Spalten', () => {
    const { root } = renderWithRuntime(`
Frame grid auto
  Frame w 100, bg #333
  Frame w 100, bg #444
  Frame w 100, bg #555
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.display).toBe('grid')
  })
})

// ============================================================
// GRID GAP
// ============================================================
describe('Grid Gap', () => {

  it('gap in Grid funktioniert', () => {
    const { root } = renderWithRuntime(`
Frame grid 2, gap 16
  Frame bg #333
  Frame bg #444
  Frame bg #555
  Frame bg #666
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.gap).toBe('16px')
  })
})

// ============================================================
// GRID SPAN
// ============================================================
describe('Grid Span', () => {

  it('w 2 in Grid spannt 2 Spalten', () => {
    const { root } = renderWithRuntime(`
Frame grid 3, gap 8
  Frame w 2, bg #2563eb
  Frame bg #333
  Frame bg #333
  Frame bg #333
`, container)

    const wideItem = root.querySelectorAll('[data-mirror-name="Frame"]')[1] as HTMLElement
    // gridColumn sollte span 2 sein
    expect(wideItem.style.gridColumn).toContain('2')
  })

  it('h 2 in Grid spannt 2 Zeilen', () => {
    const { root } = renderWithRuntime(`
Frame grid 3, gap 8
  Frame h 2, bg #2563eb
  Frame bg #333
  Frame bg #333
  Frame bg #333
`, container)

    const tallItem = root.querySelectorAll('[data-mirror-name="Frame"]')[1] as HTMLElement
    // gridRow sollte span 2 sein
    expect(tallItem.style.gridRow).toContain('2')
  })
})

// ============================================================
// DENSE PACKING
// ============================================================
describe('Dense Packing', () => {

  it('dense setzt grid-auto-flow: dense', () => {
    const { root } = renderWithRuntime(`
Frame grid 3, dense
  Frame bg #333
  Frame w 2, bg #2563eb
  Frame bg #333
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.gridAutoFlow).toContain('dense')
  })
})

// ============================================================
// TUTORIAL BEISPIELE
// ============================================================
describe('Tutorial 06 Beispiele', () => {

  it('Beispiel: Photo Grid', () => {
    const { root } = renderWithRuntime(`
Frame grid 3, gap 8, pad 16, bg #111
  Frame h 150, bg #333, rad 8
  Frame w 2, h 150, bg #2563eb, rad 8
  Frame h 150, bg #333, rad 8
  Frame h 150, bg #333, rad 8
  Frame h 150, bg #333, rad 8
`, container)

    const grid = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(grid.style.display).toBe('grid')
  })

  it('Beispiel: Dashboard Grid', () => {
    const { root } = renderWithRuntime(`
Frame grid 4, gap 16, pad 16
  Frame w 2, h 2, bg #1a1a1a, rad 8, pad 16
    Text "Main Chart" weight bold
  Frame bg #1a1a1a, rad 8, pad 16
    Text "Stats 1"
  Frame bg #1a1a1a, rad 8, pad 16
    Text "Stats 2"
  Frame w 2, bg #1a1a1a, rad 8, pad 16
    Text "Table"
`, container)

    const grid = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(grid.style.display).toBe('grid')

    const children = grid.querySelectorAll(':scope > [data-mirror-name="Frame"]')
    expect(children.length).toBe(4)
  })
})
