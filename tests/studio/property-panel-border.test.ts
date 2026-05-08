// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/border-section.ts (344 LOC, ~54%)
 *
 * Border = Radius (collapsed "All" + 4-corner expanded) + Border (width
 * toggle 0/1/2 + color trigger, with 4-side expanded view).
 *
 * Border value is parsed split-style: "1 #333" → width=1, color=#333.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  BorderSection,
  createBorderSection,
} from '../../studio/panels/property/sections/border-section'
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
  const normalised = props.map(p => ({
    ...p,
    hasValue: p.hasValue ?? p.value.length > 0,
  }))
  return {
    category: { name: 'border', properties: normalised },
    ...extra,
  } as unknown as SectionData
}

function renderSection(props: Prop[], extra: Partial<SectionData> = {}): HTMLElement {
  const html = createBorderSection(deps).render(buildData(props, extra))
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// Construction + render
// =============================================================================

describe('BorderSection — construction', () => {
  it('createBorderSection returns a BorderSection', () => {
    expect(createBorderSection(deps)).toBeInstanceOf(BorderSection)
  })

  it('returns empty when category is missing', () => {
    expect(createBorderSection(deps).render({} as SectionData)).toBe('')
  })
})

describe('BorderSection — Radius render shape', () => {
  it('renders Radius section with All-row + 4 corner inputs', () => {
    const root = renderSection([])
    const labels = Array.from(root.querySelectorAll('.section-label span')).map(s => s.textContent)
    expect(labels).toContain('Radius')
    const corners = root.querySelectorAll('input[data-radius-corner]')
    expect(corners).toHaveLength(4)
  })

  it('reads radius shorthand', () => {
    const root = renderSection([{ name: 'rad', value: '8' }])
    const allInput = root.querySelector('input[data-prop="radius"]') as HTMLInputElement
    expect(allInput.value).toBe('8')
  })

  it('reads radius from full "radius" name', () => {
    const root = renderSection([{ name: 'radius', value: '12' }])
    const allInput = root.querySelector('input[data-prop="radius"]') as HTMLInputElement
    expect(allInput.value).toBe('12')
  })

  it('marks radius row override when source === "instance"', () => {
    const root = renderSection([{ name: 'rad', value: '8', source: 'instance' }])
    expect(root.querySelector('.collapsed-row.override')).not.toBeNull()
  })

  it('does NOT mark override when source is undefined', () => {
    const root = renderSection([{ name: 'rad', value: '8' }])
    expect(root.querySelector('.collapsed-row.override')).toBeNull()
  })

  it('renders the "0" preset token-btn', () => {
    const root = renderSection([])
    expect(root.querySelector('.token-btn[data-rad-token="0"]')).not.toBeNull()
  })

  it('renders the "999" full-radius token-btn with circle icon', () => {
    const root = renderSection([])
    const fullBtn = root.querySelector('.token-btn[data-rad-token="999"]')
    expect(fullBtn).not.toBeNull()
    expect(fullBtn?.querySelector('svg circle')).not.toBeNull()
  })

  it('marks the full-radius btn active when value === "999"', () => {
    const root = renderSection([{ name: 'rad', value: '999' }])
    const fullBtn = root.querySelector('.token-btn[data-rad-token="999"]')
    expect(fullBtn?.classList.contains('active')).toBe(true)
  })

  it('does NOT mark full-radius btn active when value !== "999"', () => {
    const root = renderSection([{ name: 'rad', value: '8' }])
    const fullBtn = root.querySelector('.token-btn[data-rad-token="999"]')
    expect(fullBtn?.classList.contains('active')).toBe(false)
  })

  it('renders user-supplied radius tokens', () => {
    const root = renderSection([], {
      spacingTokens: [
        { name: 'sm', value: '4', fullName: 's.rad' },
        { name: 'md', value: '12', fullName: 'm.rad' },
        { name: 'pad', value: '8', fullName: 'card.pad' }, // not .rad
      ],
    } as Partial<SectionData>)
    expect(root.querySelectorAll('.token-btn').length).toBeGreaterThanOrEqual(3) // 0 + sm + md + 999
  })

  it('resolves $token via resolveTokenValue("...", "rad")', () => {
    const root = renderSection([{ name: 'rad', value: '$md' }], {
      resolveTokenValue: (ref, type) => (ref === '$md' && type === 'rad' ? '12' : null),
    })
    const allInput = root.querySelector('input[data-prop="radius"]') as HTMLInputElement
    expect(allInput.value).toBe('12')
    expect(allInput.classList.contains('token-resolved')).toBe(true)
  })

  it('falls back to raw $token when resolveTokenValue returns null', () => {
    const root = renderSection([{ name: 'rad', value: '$missing' }], {
      resolveTokenValue: () => null,
    })
    const allInput = root.querySelector('input[data-prop="radius"]') as HTMLInputElement
    expect(allInput.value).toBe('$missing')
    expect(allInput.classList.contains('token-resolved')).toBe(false)
  })

  it('passes resolved value into corner inputs (token-resolved class)', () => {
    const root = renderSection([{ name: 'rad', value: '$md' }], {
      resolveTokenValue: () => '12',
    })
    const corners = root.querySelectorAll('input[data-radius-corner]')
    for (const c of corners) {
      expect((c as HTMLInputElement).value).toBe('12')
      expect(c.classList.contains('token-resolved')).toBe(true)
    }
  })

  it('expanded class set when expandedSections contains "radius"', () => {
    const root = renderSection([], {
      expandedSections: new Set(['radius']),
    } as Partial<SectionData>)
    expect(
      root.querySelector('[data-expand-container="radius"]')?.classList.contains('expanded')
    ).toBe(true)
  })
})

describe('BorderSection — Border render shape', () => {
  it('renders Border section with All row + 4 side rows (T/R/B/L)', () => {
    const root = renderSection([])
    const labels = Array.from(root.querySelectorAll('.section-label span')).map(s => s.textContent)
    expect(labels).toContain('Border')

    const sideLabels = Array.from(root.querySelectorAll('.side-detail .prop-label')).map(
      s => s.textContent
    )
    expect(sideLabels).toEqual(['Top', 'Right', 'Bottom', 'Left'])
  })

  it('renders 0/1/2 width toggles in the All row', () => {
    const root = renderSection([])
    // First toggle-group is the All row
    const allRow = root.querySelector('.collapsed-row[data-expand-group="border"]')
    const widths = allRow?.querySelectorAll('.toggle-btn[data-border-width]')
    expect(widths).toHaveLength(3)
    expect(Array.from(widths || []).map(w => (w as HTMLElement).dataset.borderWidth)).toEqual([
      '0',
      '1',
      '2',
    ])
  })

  it('parses border value "1 #333" → width=1, color=#333', () => {
    const root = renderSection([{ name: 'bor', value: '1 #333' }])
    const allRow = root.querySelector('.collapsed-row[data-expand-group="border"]')
    const activeBtn = allRow?.querySelector('.toggle-btn.active') as HTMLElement
    expect(activeBtn.dataset.borderWidth).toBe('1')

    const trigger = allRow?.querySelector('.pp-color-trigger') as HTMLElement
    expect(trigger.dataset.currentValue).toBe('#333')
  })

  it('parses border value with $token color', () => {
    const root = renderSection([{ name: 'bor', value: '2 $primary' }], {
      resolveTokenValue: (ref, type) => (ref === '$primary' && type === 'boc' ? '#2271C1' : null),
    })
    const trigger = root.querySelector('.pp-color-trigger') as HTMLElement
    expect(trigger.dataset.currentValue).toBe('$primary')
    // Swatch shows resolved color (background style)
    const swatch = trigger.querySelector('.pp-color-swatch') as HTMLElement
    expect(swatch.getAttribute('style')).toContain('#2271C1')
  })

  it('falls back to raw $token swatch when resolveTokenValue is null', () => {
    const root = renderSection([{ name: 'bor', value: '1 $primary' }], {
      resolveTokenValue: () => null,
    })
    const trigger = root.querySelector('.pp-color-trigger') as HTMLElement
    const swatch = trigger.querySelector('.pp-color-swatch') as HTMLElement
    // No resolved value → raw "$primary" used as background (will be invalid CSS but the codepath runs)
    expect(swatch.getAttribute('style')).toContain('$primary')
  })

  it('reads border from "border" full name', () => {
    const root = renderSection([{ name: 'border', value: '2' }])
    const allRow = root.querySelector('.collapsed-row[data-expand-group="border"]')
    const activeBtn = allRow?.querySelector('.toggle-btn.active') as HTMLElement
    expect(activeBtn.dataset.borderWidth).toBe('2')
  })

  it('defaults to width=0 active when no border prop', () => {
    const root = renderSection([])
    const allRow = root.querySelector('.collapsed-row[data-expand-group="border"]')
    const activeBtn = allRow?.querySelector('.toggle-btn.active') as HTMLElement
    expect(activeBtn.dataset.borderWidth).toBe('0')
  })

  it('marks border row override when source === "instance"', () => {
    const root = renderSection([{ name: 'bor', value: '1 #333', source: 'instance' }])
    const overrides = root.querySelectorAll('.prop-row.override')
    // radius row + border-all row should both be checked separately;
    // here only border has source instance.
    expect(Array.from(overrides).some(o => o.getAttribute('data-expand-group') === 'border')).toBe(
      true
    )
  })

  it('color swatch has "empty" class when borderColor is missing', () => {
    const root = renderSection([{ name: 'bor', value: '1' }])
    const swatch = root.querySelector('.collapsed-row[data-expand-group="border"] .pp-color-swatch')
    expect(swatch?.classList.contains('empty')).toBe(true)
  })

  it('color swatch lacks "empty" class when borderColor is present', () => {
    const root = renderSection([{ name: 'bor', value: '1 #333' }])
    const swatch = root.querySelector('.collapsed-row[data-expand-group="border"] .pp-color-swatch')
    expect(swatch?.classList.contains('empty')).toBe(false)
  })

  it('expanded class set when expandedSections contains "border"', () => {
    const root = renderSection([], {
      expandedSections: new Set(['border']),
    } as Partial<SectionData>)
    expect(
      root.querySelector('[data-expand-container="border"]')?.classList.contains('expanded')
    ).toBe(true)
  })

  it('side rows carry data-border-color-prop="bor-{side}"', () => {
    const root = renderSection([])
    const sides = Array.from(root.querySelectorAll('.side-detail [data-border-color-prop]')).map(
      el => (el as HTMLElement).dataset.borderColorProp
    )
    expect(sides).toEqual(['bor-t', 'bor-r', 'bor-b', 'bor-l'])
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('BorderSection — handlers', () => {
  function getHandlers() {
    return createBorderSection(deps).getHandlers()
  }

  it('rad-token click — uses tokenRef when present', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.radToken = '12'
    btn.dataset.tokenRef = '$md'
    handlers['.token-btn[data-rad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('radius', '$md', 'token')
  })

  it('rad-token click — falls back to raw value when no tokenRef', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.radToken = '999'
    handlers['.token-btn[data-rad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('radius', '999', 'token')
  })

  it('rad-token click is NO-OP when value is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.token-btn[data-rad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('input data-prop=radius → onPropertyChange("radius", value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '16'
    handlers['input[data-prop="radius"]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('radius', '16', 'input')
  })

  it('corner input → __RADIUS_CORNER__ with {corner, value}', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '4'
    input.dataset.radiusCorner = 'tl'
    handlers['input[data-radius-corner]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__RADIUS_CORNER__',
      JSON.stringify({ corner: 'tl', value: '4' }),
      'input'
    )
  })

  it('corner input is NO-OP when corner is missing', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '4'
    handlers['input[data-radius-corner]'].input(new Event('input'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('toggle-btn[data-border-width] click → __BORDER_WIDTH__', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.borderWidth = '2'
    handlers['.toggle-btn[data-border-width]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('__BORDER_WIDTH__', '2', 'toggle')
  })

  it('toggle-btn click is NO-OP when width is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.toggle-btn[data-border-width]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('color-trigger click → __BORDER_COLOR_PICKER__ JSON {prop, currentValue, borderWidth}', () => {
    const handlers = getHandlers()
    const trigger = document.createElement('div')
    trigger.dataset.borderColorProp = 'bor'
    trigger.dataset.currentValue = '#333'
    trigger.dataset.borderWidth = '2'
    handlers['[data-border-color-prop]'].click(new Event('click'), trigger)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__BORDER_COLOR_PICKER__',
      JSON.stringify({ property: 'bor', currentValue: '#333', borderWidth: '2' }),
      'toggle'
    )
  })

  it('color-trigger click — defaults borderWidth to "1" when missing', () => {
    const handlers = getHandlers()
    const trigger = document.createElement('div')
    trigger.dataset.borderColorProp = 'bor-t'
    handlers['[data-border-color-prop]'].click(new Event('click'), trigger)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__BORDER_COLOR_PICKER__',
      JSON.stringify({ property: 'bor-t', currentValue: '', borderWidth: '1' }),
      'toggle'
    )
  })

  it('color-trigger click is NO-OP when property is missing', () => {
    const handlers = getHandlers()
    const trigger = document.createElement('div')
    handlers['[data-border-color-prop]'].click(new Event('click'), trigger)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('token-more-btn click toggles dropdown open class', () => {
    const handlers = getHandlers()
    const container = document.createElement('div')
    container.className = 'token-more-container'
    const btn = document.createElement('button')
    container.appendChild(btn)
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown'
    container.appendChild(dropdown)
    document.body.appendChild(container)
    handlers['.token-more-btn'].click(new MouseEvent('click'), btn)
    expect(dropdown.classList.contains('open')).toBe(true)
  })

  it('token-dropdown-item click → onPropertyChange("radius", ...) + closes dropdown', () => {
    const handlers = getHandlers()
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown open'
    const item = document.createElement('button')
    item.dataset.radToken = '8'
    dropdown.appendChild(item)
    document.body.appendChild(dropdown)
    handlers['.token-dropdown-item[data-rad-token]'].click(new MouseEvent('click'), item)
    expect(onPropertyChange).toHaveBeenCalledWith('radius', '8', 'token')
    expect(dropdown.classList.contains('open')).toBe(false)
  })

  it('token-dropdown-item click is NO-OP when value is missing', () => {
    const handlers = getHandlers()
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown open'
    const item = document.createElement('button')
    dropdown.appendChild(item)
    document.body.appendChild(dropdown)
    handlers['.token-dropdown-item[data-rad-token]'].click(new MouseEvent('click'), item)
    expect(onPropertyChange).not.toHaveBeenCalled()
    // Dropdown still closes
    expect(dropdown.classList.contains('open')).toBe(false)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: full-radius btn active iff value === "999" exactly (not >= 99)', () => {
    const root1 = renderSection([{ name: 'rad', value: '99' }])
    const root2 = renderSection([{ name: 'rad', value: '999' }])
    expect(
      root1.querySelector('.token-btn[data-rad-token="999"]')?.classList.contains('active')
    ).toBe(false)
    expect(
      root2.querySelector('.token-btn[data-rad-token="999"]')?.classList.contains('active')
    ).toBe(true)
  })

  it('M2: borderColor picker — color is FIRST $/# token (not last)', () => {
    const root = renderSection([{ name: 'bor', value: '2 #333 #444' }])
    const trigger = root.querySelector(
      '.collapsed-row[data-expand-group="border"] .pp-color-trigger'
    ) as HTMLElement
    // First $/# wins
    expect(trigger.dataset.currentValue).toBe('#333')
  })

  it('M3: borderWidth picker default "1" — catches drop of `|| "1"`', () => {
    const handlers = createBorderSection(deps).getHandlers()
    const trigger = document.createElement('div')
    trigger.dataset.borderColorProp = 'bor'
    handlers['[data-border-color-prop]'].click(new Event('click'), trigger)
    const call = onPropertyChange.mock.calls[0]
    const payload = JSON.parse(call[1])
    expect(payload.borderWidth).toBe('1')
  })

  it('M4: token-btn rad-token tokenRef wins over data-rad-token', () => {
    const handlers = createBorderSection(deps).getHandlers()
    const btn = document.createElement('button')
    btn.dataset.radToken = '12' // raw px value
    btn.dataset.tokenRef = '$md' // token reference
    handlers['.token-btn[data-rad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('radius', '$md', 'token')
  })

  it('M5: corner input `&& corner` guard — fires NOTHING without corner attr', () => {
    const handlers = createBorderSection(deps).getHandlers()
    const input = document.createElement('input')
    input.value = '4'
    handlers['input[data-radius-corner]'].input(new Event('input'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })
})
