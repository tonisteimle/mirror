// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/margin-section.ts (219 LOC, ~36%)
 *
 * Margin = collapsed (Hor/Ver) + expanded (T/R/B/L) rows backed by the
 * spacing-parse utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MarginSection,
  createMarginSection,
  buildMarginValue,
} from '../../studio/panels/property/sections/margin-section'
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
  hasValue?: boolean
  source?: string
}

function buildData(props: Prop[], extra: Partial<SectionData> = {}): SectionData {
  // Match what the extractor produces — properties default to hasValue:true
  // when value is non-empty so extractSides actually picks them up.
  const normalised = props.map(p => ({
    ...p,
    hasValue: p.hasValue ?? p.value.length > 0,
  }))
  return {
    category: { name: 'spacing', properties: normalised },
    ...extra,
  } as unknown as SectionData
}

function renderSection(props: Prop[], extra: Partial<SectionData> = {}): HTMLElement {
  const html = createMarginSection(deps).render(buildData(props, extra))
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// buildMarginValue
// =============================================================================

describe('buildMarginValue', () => {
  it('collapses 4 equal sides to 1 form', () => {
    expect(buildMarginValue('8', '8', '8', '8')).toBe('8')
  })

  it('collapses symmetric sides (t==b, r==l) to 2 form', () => {
    expect(buildMarginValue('8', '12', '8', '12')).toBe('8 12')
  })

  it('writes 4-form when all sides differ', () => {
    expect(buildMarginValue('1', '2', '3', '4')).toBe('1 2 3 4')
  })

  it('treats empty strings as "0"', () => {
    expect(buildMarginValue('', '', '', '')).toBe('0')
  })

  it('mixed empty + value fills empties with "0"', () => {
    expect(buildMarginValue('8', '', '8', '')).toBe('8 0')
  })
})

// =============================================================================
// Construction + render
// =============================================================================

describe('MarginSection — construction', () => {
  it('createMarginSection returns a MarginSection', () => {
    expect(createMarginSection(deps)).toBeInstanceOf(MarginSection)
  })

  it('returns empty when category is missing', () => {
    expect(createMarginSection(deps).render({} as SectionData)).toBe('')
  })
})

describe('MarginSection — render shape', () => {
  it('renders all 6 rows (Hor/Ver collapsed + T/R/B/L expanded)', () => {
    const root = renderSection([])
    const rows = root.querySelectorAll('.prop-row')
    expect(rows).toHaveLength(6)
    const labels = Array.from(rows).map(r => r.querySelector('.prop-label')?.textContent)
    expect(labels).toEqual(['Horizontal', 'Vertical', 'Top', 'Right', 'Bottom', 'Left'])
  })

  it('reads margin shorthand and distributes to all sides', () => {
    const root = renderSection([{ name: 'mar', value: '8' }])
    const inputs = root.querySelectorAll('input[data-mar-dir]')
    for (const i of inputs) {
      expect((i as HTMLInputElement).value).toBe('8')
    }
  })

  it('reads margin from "margin" full-name alias', () => {
    const root = renderSection([{ name: 'margin', value: '12' }])
    const top = root.querySelector('input[data-mar-dir="t"]') as HTMLInputElement
    expect(top.value).toBe('12')
  })

  it('reads margin from "m" ultra-short alias', () => {
    const root = renderSection([{ name: 'm', value: '4' }])
    const top = root.querySelector('input[data-mar-dir="t"]') as HTMLInputElement
    expect(top.value).toBe('4')
  })

  it('axis overrides (mar-x / mar-y) populate the right rows', () => {
    const root = renderSection([
      { name: 'mar-x', value: '12' },
      { name: 'mar-y', value: '8' },
    ])
    expect((root.querySelector('input[data-mar-dir="t"]') as HTMLInputElement).value).toBe('8')
    expect((root.querySelector('input[data-mar-dir="b"]') as HTMLInputElement).value).toBe('8')
    expect((root.querySelector('input[data-mar-dir="l"]') as HTMLInputElement).value).toBe('12')
    expect((root.querySelector('input[data-mar-dir="r"]') as HTMLInputElement).value).toBe('12')
  })

  it('per-side overrides win over axis + shorthand', () => {
    const root = renderSection([
      { name: 'mar', value: '4' },
      { name: 'mar-x', value: '8' },
      { name: 'mar-r', value: '20' },
    ])
    expect((root.querySelector('input[data-mar-dir="r"]') as HTMLInputElement).value).toBe('20')
    expect((root.querySelector('input[data-mar-dir="l"]') as HTMLInputElement).value).toBe('8') // mar-x
    expect((root.querySelector('input[data-mar-dir="t"]') as HTMLInputElement).value).toBe('4') // shorthand
  })

  it('Horizontal collapsed row reflects the right side', () => {
    const root = renderSection([{ name: 'mar', value: '4 8 4 8' }])
    const horInput = root.querySelectorAll('input[data-mar-dir="h"]')
    // Hor doesn't have its own data-mar-dir="h" input — Hor is the right-side collapsed view
    // Actually `data-mar-dir="h"` is correct because collapsed rows use h/v
    const collapsedRows = root.querySelectorAll('.collapsed-row input')
    expect((collapsedRows[0] as HTMLInputElement).value).toBe('8') // hor (right side)
    expect((collapsedRows[1] as HTMLInputElement).value).toBe('4') // ver (top)
  })

  it('marks override class when source === "instance"', () => {
    const root = renderSection([{ name: 'mar', value: '8', source: 'instance' }])
    const overrides = root.querySelectorAll('.prop-row.override')
    expect(overrides.length).toBe(6) // all rows marked
  })

  it('does NOT mark override when source is undefined', () => {
    const root = renderSection([{ name: 'mar', value: '8' }])
    expect(root.querySelectorAll('.prop-row.override')).toHaveLength(0)
  })

  it('renders token buttons when spacingTokens contain .mar entries', () => {
    const root = renderSection([], {
      spacingTokens: [
        { name: 'sm', value: '4', fullName: 's.mar' },
        { name: 'md', value: '12', fullName: 'm.mar' },
        { name: 'pad', value: '12', fullName: 'card.pad' }, // not .mar
      ],
    } as Partial<SectionData>)
    expect(root.querySelectorAll('.token-btn').length).toBeGreaterThanOrEqual(2)
  })

  it('does NOT render token-group when no .mar tokens', () => {
    const root = renderSection([], {
      spacingTokens: [{ name: 'pad', value: '12', fullName: 'card.pad' }],
    } as Partial<SectionData>)
    expect(root.querySelector('.token-group')).toBeNull()
  })

  it('resolves $token via resolveTokenValue + adds token-resolved class', () => {
    const root = renderSection([{ name: 'mar-t', value: '$md' }], {
      resolveTokenValue: (ref, type) => (ref === '$md' && type === 'mar' ? '12' : null),
    })
    const top = root.querySelector('input[data-mar-dir="t"]') as HTMLInputElement
    expect(top.value).toBe('12')
    expect(top.classList.contains('token-resolved')).toBe(true)
  })

  it('falls back to raw $token when resolveTokenValue returns null', () => {
    const root = renderSection([{ name: 'mar-t', value: '$missing' }], {
      resolveTokenValue: () => null,
    })
    const top = root.querySelector('input[data-mar-dir="t"]') as HTMLInputElement
    expect(top.value).toBe('$missing')
    expect(top.classList.contains('token-resolved')).toBe(false)
  })

  it('expanded class set on section when expandedSections contains "margin"', () => {
    const root = renderSection([], {
      expandedSections: new Set(['margin']),
    } as Partial<SectionData>)
    expect(root.querySelector('.section.expanded')).not.toBeNull()
    expect(root.querySelector('.section-content.expanded')).not.toBeNull()
  })

  it('NO expanded class when expandedSections is empty', () => {
    const root = renderSection([])
    expect(root.querySelector('.section.expanded')).toBeNull()
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('MarginSection — handlers', () => {
  function getHandlers() {
    return createMarginSection(deps).getHandlers()
  }

  it('token-btn click — uses tokenRef when present', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.marToken = '12'
    btn.dataset.tokenRef = '$md'
    btn.dataset.marDir = 't'
    handlers['.token-btn[data-mar-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__MAR_TOKEN__',
      JSON.stringify({ value: '$md', dir: 't' }),
      'token'
    )
  })

  it('token-btn click — falls back to raw value when no tokenRef', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.marToken = '12'
    btn.dataset.marDir = 'r'
    handlers['.token-btn[data-mar-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__MAR_TOKEN__',
      JSON.stringify({ value: '12', dir: 'r' }),
      'token'
    )
  })

  it('token-btn click is NO-OP when value is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.marDir = 't'
    handlers['.token-btn[data-mar-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('token-btn click is NO-OP when dir is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.marToken = '12'
    handlers['.token-btn[data-mar-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('input.input — fires __MAR_INPUT__ with {value, dir}', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '20'
    input.dataset.marDir = 't'
    handlers['input[data-mar-dir]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__MAR_INPUT__',
      JSON.stringify({ value: '20', dir: 't' }),
      'input'
    )
  })

  it('input.input is NO-OP when dir is missing', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '20'
    handlers['input[data-mar-dir]'].input(new Event('input'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('token-more-btn click toggles dropdown open class', () => {
    const handlers = getHandlers()
    const container = document.createElement('div')
    container.className = 'token-more-container'
    const btn = document.createElement('button')
    btn.dataset.marDir = 't'
    container.appendChild(btn)
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown'
    container.appendChild(dropdown)
    document.body.appendChild(container)

    handlers['.token-more-btn[data-mar-dir]'].click(new MouseEvent('click'), btn)
    expect(dropdown.classList.contains('open')).toBe(true)
  })

  it('token-dropdown-item click fires __MAR_TOKEN__ + closes dropdown', () => {
    const handlers = getHandlers()
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown open'
    const item = document.createElement('button')
    item.dataset.marToken = '12'
    item.dataset.marDir = 't'
    dropdown.appendChild(item)
    document.body.appendChild(dropdown)
    handlers['.token-dropdown-item[data-mar-token]'].click(new MouseEvent('click'), item)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__MAR_TOKEN__',
      JSON.stringify({ value: '12', dir: 't' }),
      'token'
    )
    expect(dropdown.classList.contains('open')).toBe(false)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: buildMarginValue collapses to 1-form when all sides equal', () => {
    expect(buildMarginValue('8', '8', '8', '8')).toBe('8')
  })

  it('M2: buildMarginValue collapses to 2-form when t==b AND r==l', () => {
    expect(buildMarginValue('8', '12', '8', '12')).toBe('8 12')
  })

  it('M3: per-side override wins over axis override (catches re-order mutation)', () => {
    const root = renderSection([
      { name: 'mar-x', value: '8' },
      { name: 'mar-r', value: '20' },
    ])
    const r = root.querySelector('input[data-mar-dir="r"]') as HTMLInputElement
    expect(r.value).toBe('20') // per-side beats axis
  })

  it('M4: token-btn click GUARDS against missing dir (catches drop of `&& dir`)', () => {
    const handlers = createMarginSection(deps).getHandlers()
    const btn = document.createElement('button')
    btn.dataset.marToken = '12'
    // no dir set
    handlers['.token-btn[data-mar-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })
})
