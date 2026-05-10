// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/position-section.ts (107 LOC)
 *
 * Position = X / Y / Z controls. Only renders when element is inside a
 * stacked (absolute) container. Hidden otherwise.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PositionSection,
  createPositionSection,
} from '../../studio/panels/property/sections/position-section'
import type { SectionDependencies, SectionData } from '../../studio/panels/property/base/section'

let deps: SectionDependencies
let onPropertyChange: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  onPropertyChange = vi.fn()
  deps = {
    escapeHtml: (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    getDisplayLabel: (n: string) => n,
    onPropertyChange,
    onToggleProperty: vi.fn(),
  }
})

interface Prop {
  name: string
  value: string
}

function renderSection(props: Prop[] = [], inPosContainer = true): HTMLElement {
  const data = {
    isInPositionedContainer: inPosContainer,
    allProperties: props,
  } as unknown as SectionData
  const html = createPositionSection(deps).render(data as never)
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('PositionSection — construction', () => {
  it('createPositionSection returns a PositionSection', () => {
    expect(createPositionSection(deps)).toBeInstanceOf(PositionSection)
  })

  it('returns empty when isInPositionedContainer is false', () => {
    const html = createPositionSection(deps).render({} as never)
    expect(html).toBe('')
  })

  it('returns empty when isInPositionedContainer is undefined', () => {
    const html = createPositionSection(deps).render({ allProperties: [] } as never)
    expect(html).toBe('')
  })
})

describe('PositionSection — render', () => {
  it('renders X, Y, Z inputs when in positioned container', () => {
    const root = renderSection()
    const fields = Array.from(root.querySelectorAll('input[data-position-field]')).map(
      i => (i as HTMLInputElement).dataset.positionField
    )
    expect(fields).toEqual(['x', 'y', 'z'])
  })

  it('renders "Position" header', () => {
    const root = renderSection()
    expect(root.querySelector('.section-label')?.textContent).toBe('Position')
  })

  it('reads x value from x prop', () => {
    const root = renderSection([{ name: 'x', value: '42' }])
    const xInput = root.querySelector('input[data-position-field="x"]') as HTMLInputElement
    expect(xInput.value).toBe('42')
  })

  it('reads y value from y prop', () => {
    const root = renderSection([{ name: 'y', value: '100' }])
    const yInput = root.querySelector('input[data-position-field="y"]') as HTMLInputElement
    expect(yInput.value).toBe('100')
  })

  it('reads z value from z prop', () => {
    const root = renderSection([{ name: 'z', value: '5' }])
    const zInput = root.querySelector('input[data-position-field="z"]') as HTMLInputElement
    expect(zInput.value).toBe('5')
  })

  it('reads x, y, z independently', () => {
    const root = renderSection([
      { name: 'x', value: '10' },
      { name: 'y', value: '20' },
      { name: 'z', value: '30' },
    ])
    expect((root.querySelector('input[data-position-field="x"]') as HTMLInputElement).value).toBe(
      '10'
    )
    expect((root.querySelector('input[data-position-field="y"]') as HTMLInputElement).value).toBe(
      '20'
    )
    expect((root.querySelector('input[data-position-field="z"]') as HTMLInputElement).value).toBe(
      '30'
    )
  })

  it('empty values render as empty strings', () => {
    const root = renderSection()
    expect((root.querySelector('input[data-position-field="x"]') as HTMLInputElement).value).toBe(
      ''
    )
  })

  it('placeholder shows "0" for all three fields', () => {
    const root = renderSection()
    const inputs = root.querySelectorAll('input[data-position-field]')
    for (const i of inputs) {
      expect((i as HTMLInputElement).placeholder).toBe('0')
    }
  })

  it('escapes HTML in values (raw HTML source)', () => {
    const html = createPositionSection(deps).render({
      isInPositionedContainer: true,
      allProperties: [{ name: 'x', value: '"><script>' }],
    } as never)
    expect(html).toContain('value="&quot;&gt;&lt;script&gt;"')
  })

  it('renders Layer label for z field', () => {
    const root = renderSection()
    const labels = Array.from(root.querySelectorAll('.prop-label')).map(l => l.textContent)
    expect(labels).toContain('Layer')
    expect(labels).toContain('X / Y')
  })
})

describe('PositionSection — handlers', () => {
  function getHandlers() {
    return createPositionSection(deps).getHandlers()
  }

  it('input → onPropertyChange(field, value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.dataset.positionField = 'x'
    input.value = '50'
    handlers['input[data-position-field]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('x', '50', 'input')
  })

  it('input fires for y and z fields too', () => {
    const handlers = getHandlers()
    const yi = document.createElement('input')
    yi.dataset.positionField = 'y'
    yi.value = '75'
    handlers['input[data-position-field]'].input(new Event('input'), yi)

    const zi = document.createElement('input')
    zi.dataset.positionField = 'z'
    zi.value = '2'
    handlers['input[data-position-field]'].input(new Event('input'), zi)

    expect(onPropertyChange).toHaveBeenNthCalledWith(1, 'y', '75', 'input')
    expect(onPropertyChange).toHaveBeenNthCalledWith(2, 'z', '2', 'input')
  })

  it('input is NO-OP when field attribute is missing', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '50'
    handlers['input[data-position-field]'].input(new Event('input'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })
})

describe('P3 — mutation-driven', () => {
  it('M1: returns "" when isInPositionedContainer falsy (catches !-flip mutation)', () => {
    expect(createPositionSection(deps).render({ isInPositionedContainer: false } as never)).toBe('')
    expect(createPositionSection(deps).render({} as never)).toBe('')
  })

  it('M2: each field finds its own prop (catches all-three-share-one mutation)', () => {
    const root = renderSection([
      { name: 'x', value: 'X' },
      { name: 'y', value: 'Y' },
      { name: 'z', value: 'Z' },
    ])
    expect((root.querySelector('input[data-position-field="x"]') as HTMLInputElement).value).toBe(
      'X'
    )
    expect((root.querySelector('input[data-position-field="y"]') as HTMLInputElement).value).toBe(
      'Y'
    )
    expect((root.querySelector('input[data-position-field="z"]') as HTMLInputElement).value).toBe(
      'Z'
    )
  })

  it('M3: input handler `&& field` guard (catches drop of guard)', () => {
    const handlers = createPositionSection(deps).getHandlers()
    const input = document.createElement('input')
    input.value = '99' // no field
    handlers['input[data-position-field]'].input(new Event('input'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// Slice 7 V-4 (B-5): Position-Section in grid containers
// ===========================================================================
describe('Slice 7 V-4 — grid container support', () => {
  function renderInGrid(props: Prop[] = []): HTMLElement {
    const data = {
      isInPositionedContainer: false,
      isInGridContainer: true,
      allProperties: props,
    } as unknown as SectionData
    const html = createPositionSection(deps).render(data as never)
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.appendChild(root)
    return root
  }

  it('renders for grid container (isInGridContainer=true)', () => {
    const root = renderInGrid([{ name: 'x', value: '1' }])
    expect(root.querySelector('input[data-position-field="x"]')).toBeTruthy()
  })

  it('section label is "Grid Position" in grid context', () => {
    const root = renderInGrid()
    expect(root.querySelector('.section-label')?.textContent).toBe('Grid Position')
  })

  it('field labels are "Cell-X" / "Cell-Y" in grid context', () => {
    const root = renderInGrid()
    const labels = Array.from(root.querySelectorAll('.pp-position-label')).map(l => l.textContent)
    expect(labels).toEqual(['Cell-X', 'Cell-Y'])
  })

  it('x/y placeholders are "1" in grid context (not "0" like absolute)', () => {
    const root = renderInGrid()
    const x = root.querySelector('input[data-position-field="x"]') as HTMLInputElement
    expect(x.placeholder).toBe('1')
  })

  it('z (Layer) input is NOT rendered in grid context', () => {
    const root = renderInGrid()
    expect(root.querySelector('input[data-position-field="z"]')).toBeNull()
  })

  it('reads x/y values from props in grid context', () => {
    const root = renderInGrid([
      { name: 'x', value: '4' },
      { name: 'y', value: '3' },
    ])
    expect((root.querySelector('input[data-position-field="x"]') as HTMLInputElement).value).toBe(
      '4'
    )
    expect((root.querySelector('input[data-position-field="y"]') as HTMLInputElement).value).toBe(
      '3'
    )
  })

  it('returns "" when neither stacked nor grid', () => {
    const html = createPositionSection(deps).render({
      isInPositionedContainer: false,
      isInGridContainer: false,
    } as never)
    expect(html).toBe('')
  })

  it('stacked context still uses "X" / "Y" labels (not Cell-X / Cell-Y)', () => {
    const root = renderSection() // isInPosContainer=true, isInGrid undefined
    const labels = Array.from(root.querySelectorAll('.pp-position-label')).map(l => l.textContent)
    expect(labels).toEqual(['X', 'Y'])
    expect(root.querySelector('.section-label')?.textContent).toBe('Position')
  })
})
