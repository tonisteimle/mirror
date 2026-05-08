// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/spacing-section.ts (225 LOC, ~39%)
 *
 * Spacing = padding controls (Hor/Ver collapsed + T/R/B/L expanded).
 * Structurally identical to margin-section but for `pad`/`p`/`padding`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SpacingSection,
  createSpacingSection,
  buildSpacingValue,
} from '../../studio/panels/property/sections/spacing-section'
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
    category: { name: 'spacing', properties: normalised },
    ...extra,
  } as unknown as SectionData
}

function renderSection(props: Prop[], extra: Partial<SectionData> = {}): HTMLElement {
  const html = createSpacingSection(deps).render(buildData(props, extra))
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// buildSpacingValue
// =============================================================================

describe('buildSpacingValue', () => {
  it('1-form when all sides equal', () => {
    expect(buildSpacingValue('8', '8', '8', '8')).toBe('8')
  })

  it('2-form when t==b and r==l', () => {
    expect(buildSpacingValue('8', '12', '8', '12')).toBe('8 12')
  })

  it('4-form when all differ', () => {
    expect(buildSpacingValue('1', '2', '3', '4')).toBe('1 2 3 4')
  })

  it('treats empty strings as "0"', () => {
    expect(buildSpacingValue('', '', '', '')).toBe('0')
  })
})

// =============================================================================
// Construction + render
// =============================================================================

describe('SpacingSection — construction', () => {
  it('createSpacingSection returns a SpacingSection', () => {
    expect(createSpacingSection(deps)).toBeInstanceOf(SpacingSection)
  })

  it('returns empty when category is missing', () => {
    expect(createSpacingSection(deps).render({} as SectionData)).toBe('')
  })
})

describe('SpacingSection — render shape', () => {
  it('renders all 6 rows (Hor/Ver + T/R/B/L)', () => {
    const root = renderSection([])
    expect(root.querySelectorAll('.prop-row')).toHaveLength(6)
  })

  it('reads pad shorthand → all sides', () => {
    const root = renderSection([{ name: 'pad', value: '12' }])
    const inputs = root.querySelectorAll('input[data-pad-dir]')
    for (const i of inputs) {
      expect((i as HTMLInputElement).value).toBe('12')
    }
  })

  it('reads padding from "padding" full-name alias', () => {
    const root = renderSection([{ name: 'padding', value: '20' }])
    const top = root.querySelector('input[data-pad-dir="t"]') as HTMLInputElement
    expect(top.value).toBe('20')
  })

  it('reads padding from "p" ultra-short alias', () => {
    const root = renderSection([{ name: 'p', value: '4' }])
    const top = root.querySelector('input[data-pad-dir="t"]') as HTMLInputElement
    expect(top.value).toBe('4')
  })

  it('axis overrides (pad-x / pad-y) populate the right rows', () => {
    const root = renderSection([
      { name: 'pad-x', value: '12' },
      { name: 'pad-y', value: '8' },
    ])
    expect((root.querySelector('input[data-pad-dir="t"]') as HTMLInputElement).value).toBe('8')
    expect((root.querySelector('input[data-pad-dir="l"]') as HTMLInputElement).value).toBe('12')
  })

  it('per-side overrides win over axis + shorthand', () => {
    const root = renderSection([
      { name: 'pad', value: '4' },
      { name: 'pad-x', value: '8' },
      { name: 'pad-r', value: '20' },
    ])
    expect((root.querySelector('input[data-pad-dir="r"]') as HTMLInputElement).value).toBe('20')
    expect((root.querySelector('input[data-pad-dir="l"]') as HTMLInputElement).value).toBe('8')
    expect((root.querySelector('input[data-pad-dir="t"]') as HTMLInputElement).value).toBe('4')
  })

  it('marks override class when source === "instance"', () => {
    const root = renderSection([{ name: 'pad', value: '8', source: 'instance' }])
    expect(root.querySelectorAll('.prop-row.override').length).toBe(6)
  })

  it('does NOT mark override when source is undefined', () => {
    const root = renderSection([{ name: 'pad', value: '8' }])
    expect(root.querySelectorAll('.prop-row.override')).toHaveLength(0)
  })

  it('renders token buttons when spacingTokens contain .pad entries', () => {
    const root = renderSection([], {
      spacingTokens: [
        { name: 'sm', value: '4', fullName: 's.pad' },
        { name: 'md', value: '12', fullName: 'm.pad' },
        { name: 'mar', value: '8', fullName: 'card.mar' }, // not .pad
      ],
    } as Partial<SectionData>)
    expect(root.querySelectorAll('.token-btn').length).toBeGreaterThanOrEqual(2)
  })

  it('does NOT render token-group when no .pad tokens', () => {
    const root = renderSection([], {
      spacingTokens: [{ name: 'mar', value: '8', fullName: 'card.mar' }],
    } as Partial<SectionData>)
    expect(root.querySelector('.token-group')).toBeNull()
  })

  it('resolves $token via resolveTokenValue("...", "pad")', () => {
    const root = renderSection([{ name: 'pad-t', value: '$md' }], {
      resolveTokenValue: (ref, type) => (ref === '$md' && type === 'pad' ? '12' : null),
    })
    const top = root.querySelector('input[data-pad-dir="t"]') as HTMLInputElement
    expect(top.value).toBe('12')
    expect(top.classList.contains('token-resolved')).toBe(true)
  })

  it('falls back to raw $token when resolveTokenValue returns null', () => {
    const root = renderSection([{ name: 'pad-t', value: '$missing' }], {
      resolveTokenValue: () => null,
    })
    const top = root.querySelector('input[data-pad-dir="t"]') as HTMLInputElement
    expect(top.value).toBe('$missing')
    expect(top.classList.contains('token-resolved')).toBe(false)
  })

  it('expanded class set when expandedSections contains "spacing"', () => {
    const root = renderSection([], {
      expandedSections: new Set(['spacing']),
    } as Partial<SectionData>)
    expect(root.querySelector('.section.expanded')).not.toBeNull()
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('SpacingSection — handlers', () => {
  function getHandlers() {
    return createSpacingSection(deps).getHandlers()
  }

  it('token-btn click → __PAD_TOKEN__ with {value, dir}', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.padToken = '12'
    btn.dataset.tokenRef = '$md'
    btn.dataset.padDir = 't'
    handlers['.token-btn[data-pad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__PAD_TOKEN__',
      JSON.stringify({ value: '$md', dir: 't' }),
      'token'
    )
  })

  it('token-btn click — uses raw value when no tokenRef', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.padToken = '12'
    btn.dataset.padDir = 'r'
    handlers['.token-btn[data-pad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__PAD_TOKEN__',
      JSON.stringify({ value: '12', dir: 'r' }),
      'token'
    )
  })

  it('token-btn click is NO-OP when value is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.padDir = 't'
    handlers['.token-btn[data-pad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('token-btn click is NO-OP when dir is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.padToken = '12'
    handlers['.token-btn[data-pad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('input.input → __PAD_INPUT__ with {value, dir}', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '20'
    input.dataset.padDir = 't'
    handlers['input[data-pad-dir]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__PAD_INPUT__',
      JSON.stringify({ value: '20', dir: 't' }),
      'input'
    )
  })

  it('input.input is NO-OP when dir is missing', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '20'
    handlers['input[data-pad-dir]'].input(new Event('input'), input)
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

  it('token-dropdown-item click fires __PAD_TOKEN__ + closes dropdown', () => {
    const handlers = getHandlers()
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown open'
    const item = document.createElement('button')
    item.dataset.padToken = '12'
    item.dataset.padDir = 't'
    dropdown.appendChild(item)
    document.body.appendChild(dropdown)
    handlers['.token-dropdown-item'].click(new MouseEvent('click'), item)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__PAD_TOKEN__',
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
  it('M1: buildSpacingValue collapses to 1-form when all sides equal', () => {
    expect(buildSpacingValue('4', '4', '4', '4')).toBe('4')
  })

  it('M1b: 3-of-4-equal does NOT collapse (catches `&&` → `||` mutation)', () => {
    // 8/8/8/4: AND-form returns 4-form ("8 8 8 4"); OR-form returns "8".
    expect(buildSpacingValue('8', '8', '8', '4')).toBe('8 8 8 4')
  })

  it('M2: buildSpacingValue collapses to 2-form when t==b AND r==l', () => {
    expect(buildSpacingValue('4', '8', '4', '8')).toBe('4 8')
  })

  it('M3: per-side wins over axis (catches re-order mutation in extractSides)', () => {
    const root = renderSection([
      { name: 'pad-x', value: '8' },
      { name: 'pad-r', value: '20' },
    ])
    expect((root.querySelector('input[data-pad-dir="r"]') as HTMLInputElement).value).toBe('20')
  })

  it('M4: token-btn GUARDS against missing dir', () => {
    const handlers = createSpacingSection(deps).getHandlers()
    const btn = document.createElement('button')
    btn.dataset.padToken = '12' // no dir
    handlers['.token-btn[data-pad-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })
})
