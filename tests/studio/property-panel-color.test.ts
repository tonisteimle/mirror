// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/color-section.ts (252 LOC, ~72%)
 *
 * Color = configurable rows (bg/col/ic/boc) driven by `colorProps` from
 * SectionData, plus an Icon-only Fill toggle and a compact-mode header
 * variant. Each row renders a swatch + value + token buttons; clicks
 * fire `__COLOR_PICKER__` or write a token ref directly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ColorSection,
  createColorSection,
} from '../../studio/panels/property/sections/color-section'
import type { SectionDependencies, SectionData } from '../../studio/panels/property/base/section'

let deps: SectionDependencies
let onPropertyChange: ReturnType<typeof vi.fn>
let onToggleProperty: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  onPropertyChange = vi.fn()
  onToggleProperty = vi.fn()
  deps = {
    escapeHtml: (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    getDisplayLabel: (n: string) => n,
    onPropertyChange,
    onToggleProperty,
  }
})

interface Prop {
  name: string
  value: string
  hasValue?: boolean
  source?: string
}

function renderSection(extra: Partial<SectionData> = {}, props: Prop[] = []): HTMLElement {
  const data = {
    category: { name: 'color', properties: [] },
    colorProps: ['bg', 'col'],
    allProperties: props.map(p => ({ ...p, hasValue: p.hasValue ?? p.value.length > 0 })),
    ...extra,
  } as unknown as SectionData
  const html = createColorSection(deps).render(data)
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// Construction + render
// =============================================================================

describe('ColorSection — construction', () => {
  it('createColorSection returns a ColorSection', () => {
    expect(createColorSection(deps)).toBeInstanceOf(ColorSection)
  })

  it('returns empty when no rows match colorProps', () => {
    const html = createColorSection(deps).render({
      colorProps: ['nope'],
      allProperties: [],
    } as unknown as SectionData)
    expect(html).toBe('')
  })

  it('uses default colorProps [bg, col] when none provided', () => {
    const root = renderSection({ colorProps: undefined } as Partial<SectionData>)
    const labels = Array.from(root.querySelectorAll('.prop-label')).map(l => l.textContent)
    expect(labels).toEqual(['Background', 'Text'])
  })
})

describe('ColorSection — render shape', () => {
  it('row labels: bg=Background, col=Text, ic=Color, boc=Border', () => {
    const root = renderSection({ colorProps: ['bg', 'col', 'ic', 'boc'] })
    const labels = Array.from(root.querySelectorAll('.prop-label')).map(l => l.textContent)
    expect(labels[0]).toBe('Background')
    expect(labels[1]).toBe('Text')
    expect(labels[2]).toBe('Color')
    expect(labels[3]).toBe('Border')
  })

  it('reads bg from "background" alias', () => {
    const root = renderSection({}, [{ name: 'background', value: '#ff0' }])
    const trigger = root.querySelector('[data-color-prop="bg"]') as HTMLElement
    expect(trigger.dataset.currentValue).toBe('#ff0')
  })

  it('reads col from "c" ultra-short alias', () => {
    const root = renderSection({}, [{ name: 'c', value: 'white' }])
    const trigger = root.querySelector('[data-color-prop="col"]') as HTMLElement
    expect(trigger.dataset.currentValue).toBe('white')
  })

  it('reads ic from "icon-color" alias', () => {
    const root = renderSection({ colorProps: ['ic'] }, [{ name: 'icon-color', value: '#888' }])
    const trigger = root.querySelector('[data-color-prop="ic"]') as HTMLElement
    expect(trigger.dataset.currentValue).toBe('#888')
  })

  it('reads boc from "border-color" alias', () => {
    const root = renderSection({ colorProps: ['boc'] }, [{ name: 'border-color', value: '#333' }])
    const trigger = root.querySelector('[data-color-prop="boc"]') as HTMLElement
    expect(trigger.dataset.currentValue).toBe('#333')
  })

  it('shows "none" when value is empty', () => {
    const root = renderSection({}, [])
    const valueSpans = root.querySelectorAll('.pp-color-value')
    expect(valueSpans[0].textContent).toBe('none')
  })

  it('shows raw token text when isToken', () => {
    const root = renderSection({}, [{ name: 'bg', value: '$primary' }])
    const span = root.querySelector('.pp-color-value') as HTMLElement
    expect(span.textContent).toBe('$primary')
    expect(span.classList.contains('token')).toBe(true)
  })

  it('resolves $token swatch via resolveTokenValue("...", "bg")', () => {
    const root = renderSection(
      {
        resolveTokenValue: (ref, type) => (ref === '$primary' && type === 'bg' ? '#2271C1' : null),
      },
      [{ name: 'bg', value: '$primary' }]
    )
    const swatch = root.querySelector('.pp-color-swatch') as HTMLElement
    expect(swatch.getAttribute('style')).toContain('#2271C1')
  })

  it('falls back to raw $token swatch when resolveTokenValue returns null', () => {
    const root = renderSection({ resolveTokenValue: () => null }, [
      { name: 'bg', value: '$missing' },
    ])
    const swatch = root.querySelector('.pp-color-swatch') as HTMLElement
    expect(swatch.getAttribute('style')).toContain('$missing')
  })

  it('marks override class when source === "instance"', () => {
    const root = renderSection({}, [{ name: 'bg', value: '#fff', source: 'instance' }])
    const overrideRows = root.querySelectorAll('.prop-row.override')
    expect(overrideRows.length).toBe(1)
  })

  it('does NOT mark override when source is undefined', () => {
    const root = renderSection({}, [{ name: 'bg', value: '#fff' }])
    expect(root.querySelectorAll('.prop-row.override')).toHaveLength(0)
  })

  it('marks swatch as empty when value is missing', () => {
    const root = renderSection({}, [])
    const swatch = root.querySelector('.pp-color-swatch') as HTMLElement
    expect(swatch.classList.contains('empty')).toBe(true)
  })

  it('NOT empty when value is present', () => {
    const root = renderSection({}, [{ name: 'bg', value: '#ff0' }])
    const swatch = root.querySelector('.pp-color-swatch') as HTMLElement
    expect(swatch.classList.contains('empty')).toBe(false)
  })

  it('renders compact mode without "Color" header', () => {
    const root = renderSection({ compact: true } as Partial<SectionData>)
    const sectionLabel = root.querySelector('.section-label')
    expect(sectionLabel).toBeNull()
  })

  it('renders default mode WITH "Color" header', () => {
    const root = renderSection({})
    const sectionLabel = root.querySelector('.section-label')
    expect(sectionLabel?.textContent).toBe('Color')
  })

  it('renders Fill toggle for primitive=Icon', () => {
    const root = renderSection({ primitive: 'Icon', colorProps: ['ic'] } as Partial<SectionData>)
    expect(root.querySelector('input[data-toggle-prop="fill"]')).not.toBeNull()
  })

  it('does NOT render Fill toggle for non-Icon primitives', () => {
    const root = renderSection({ primitive: 'Frame' } as Partial<SectionData>)
    expect(root.querySelector('input[data-toggle-prop="fill"]')).toBeNull()
  })

  it('Fill toggle is checked when fill prop value is "true"', () => {
    const root = renderSection({ primitive: 'Icon', colorProps: ['ic'] } as Partial<SectionData>, [
      { name: 'fill', value: 'true' },
    ])
    const toggle = root.querySelector('input[data-toggle-prop="fill"]') as HTMLInputElement
    expect(toggle.checked).toBe(true)
  })

  it('Fill toggle is checked when fill prop value is "" (standalone presence)', () => {
    const root = renderSection({ primitive: 'Icon', colorProps: ['ic'] } as Partial<SectionData>, [
      { name: 'fill', value: '' },
    ])
    const toggle = root.querySelector('input[data-toggle-prop="fill"]') as HTMLInputElement
    expect(toggle.checked).toBe(true)
  })

  it('Fill toggle is unchecked when fill prop is absent', () => {
    const root = renderSection({ primitive: 'Icon', colorProps: ['ic'] } as Partial<SectionData>)
    const toggle = root.querySelector('input[data-toggle-prop="fill"]') as HTMLInputElement
    expect(toggle.checked).toBe(false)
  })

  it('escapes HTML in current-value attribute (raw HTML source)', () => {
    // Render to an unparsed string so HTML entities aren't auto-decoded.
    const html = createColorSection(deps).render({
      colorProps: ['bg'],
      allProperties: [{ name: 'bg', value: '"><script>', hasValue: true }],
    } as unknown as SectionData)
    expect(html).toContain('data-current-value="&quot;&gt;&lt;script&gt;"')
  })
})

describe('ColorSection — token filtering', () => {
  it('renders property-set tokens (no dot) on every color slot', () => {
    const root = renderSection({
      colorProps: ['bg', 'col'],
      colorTokens: [{ name: 'primary', value: '#2271C1', fullName: 'primary' }],
    } as Partial<SectionData>)
    const tokenGroups = root.querySelectorAll('.token-group')
    // Both rows show the token (it has no dot → applies to bg + col)
    expect(tokenGroups.length).toBe(2)
  })

  it('only renders ".bg" suffixed tokens on the bg row', () => {
    const root = renderSection({
      colorProps: ['bg', 'col'],
      colorTokens: [{ name: 'primary.bg', value: '#2271C1', fullName: 'primary.bg' }],
    } as Partial<SectionData>)
    const tokenGroups = root.querySelectorAll('.token-group')
    expect(tokenGroups.length).toBe(1)
  })

  it('does NOT render token-group when no tokens match', () => {
    const root = renderSection({
      colorProps: ['col'],
      colorTokens: [{ name: 'primary.bg', value: '#2271C1', fullName: 'primary.bg' }],
    } as Partial<SectionData>)
    expect(root.querySelector('.token-group')).toBeNull()
  })

  it('token button label uses short form (drops .bg suffix)', () => {
    const root = renderSection({
      colorProps: ['bg'],
      colorTokens: [{ name: 'primary.bg', value: '#2271C1', fullName: 'primary.bg' }],
    } as Partial<SectionData>)
    const btn = root.querySelector('.token-btn')
    expect(btn?.textContent?.trim()).toContain('primary')
    expect(btn?.textContent?.trim()).not.toContain('.bg')
  })

  it('token-ref uses $name (without .suffix)', () => {
    const root = renderSection({
      colorProps: ['bg'],
      colorTokens: [{ name: 'primary.bg', value: '#2271C1', fullName: 'primary.bg' }],
    } as Partial<SectionData>)
    const btn = root.querySelector('.token-btn[data-bg-token]') as HTMLElement
    // ColorSection.shortLabel strips '.bg' for both label AND tokenRef
    expect(btn?.dataset.tokenRef).toBe('$primary.bg')
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('ColorSection — handlers', () => {
  function getHandlers() {
    return createColorSection(deps).getHandlers()
  }

  it('color-trigger click → __COLOR_PICKER__ JSON {property, currentValue}', () => {
    const handlers = getHandlers()
    const trigger = document.createElement('div')
    trigger.dataset.colorProp = 'bg'
    trigger.dataset.currentValue = '#fff'
    handlers['[data-color-prop]'].click(new Event('click'), trigger)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__COLOR_PICKER__',
      JSON.stringify({ property: 'bg', currentValue: '#fff' }),
      'toggle'
    )
  })

  it('color-trigger click — defaults currentValue to "" when missing', () => {
    const handlers = getHandlers()
    const trigger = document.createElement('div')
    trigger.dataset.colorProp = 'bg'
    handlers['[data-color-prop]'].click(new Event('click'), trigger)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__COLOR_PICKER__',
      JSON.stringify({ property: 'bg', currentValue: '' }),
      'toggle'
    )
  })

  it('color-trigger click is NO-OP when prop is missing', () => {
    const handlers = getHandlers()
    const trigger = document.createElement('div')
    handlers['[data-color-prop]'].click(new Event('click'), trigger)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('fill toggle change — calls onToggleProperty("fill", !checked)', () => {
    const handlers = getHandlers()
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = true
    handlers['input[data-toggle-prop="fill"]'].change(new Event('change'), checkbox)
    expect(onToggleProperty).toHaveBeenCalledWith('fill', false)
  })

  it('fill toggle change — unchecked passes !false=true', () => {
    const handlers = getHandlers()
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = false
    handlers['input[data-toggle-prop="fill"]'].change(new Event('change'), checkbox)
    expect(onToggleProperty).toHaveBeenCalledWith('fill', true)
  })

  for (const prop of ['bg', 'col', 'boc', 'ic']) {
    it(`token-btn[data-${prop}-token] click writes "${prop}" property`, () => {
      const handlers = getHandlers()
      const btn = document.createElement('button')
      btn.dataset.tokenRef = `$primary`
      const handler =
        handlers[`.token-btn[data-${prop}-token], .token-dropdown-item[data-${prop}-token]`]
      handler.click(new Event('click'), btn)
      expect(onPropertyChange).toHaveBeenCalledWith(prop, '$primary', 'token')
    })
  }

  it('token-btn click is NO-OP when tokenRef is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.token-btn[data-bg-token], .token-dropdown-item[data-bg-token]'].click(
      new Event('click'),
      btn
    )
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('token-dropdown-item click closes parent dropdown', () => {
    const handlers = getHandlers()
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown open'
    const item = document.createElement('button')
    item.dataset.tokenRef = '$primary'
    dropdown.appendChild(item)
    document.body.appendChild(dropdown)
    handlers['.token-btn[data-bg-token], .token-dropdown-item[data-bg-token]'].click(
      new Event('click'),
      item
    )
    expect(dropdown.classList.contains('open')).toBe(false)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: filterColorTokensForProp INCLUDES dot-less tokens (catches `t.name.includes(".") return false`)', () => {
    const root = renderSection({
      colorProps: ['col'],
      colorTokens: [{ name: 'primary', value: '#2271C1', fullName: 'primary' }],
    } as Partial<SectionData>)
    expect(root.querySelector('.token-group')).not.toBeNull()
  })

  it('M2: filterColorTokensForProp EXCLUDES wrong-suffix tokens (catches drop of endsWith check)', () => {
    const root = renderSection({
      colorProps: ['col'],
      colorTokens: [{ name: 'primary.bg', value: '#2271C1', fullName: 'primary.bg' }],
    } as Partial<SectionData>)
    expect(root.querySelector('.token-group')).toBeNull()
  })

  it('M3: Fill toggle handler INVERTS checked state (catches `!checkbox.checked` → `checkbox.checked`)', () => {
    const handlers = createColorSection(deps).getHandlers()
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = true
    handlers['input[data-toggle-prop="fill"]'].change(new Event('change'), checkbox)
    expect(onToggleProperty).toHaveBeenCalledWith('fill', false) // inverted
  })

  it('M4: Icon-fill detection — value === "" counts as fill (catches drop of `|| ""`)', () => {
    const root = renderSection({ primitive: 'Icon', colorProps: ['ic'] } as Partial<SectionData>, [
      { name: 'fill', value: '' },
    ])
    const toggle = root.querySelector('input[data-toggle-prop="fill"]') as HTMLInputElement
    expect(toggle.checked).toBe(true)
  })

  it('M5: shortLabel strips at first dot (catches lastIndexOf swap)', () => {
    const root = renderSection({
      colorProps: ['bg'],
      colorTokens: [{ name: 'a.b.bg', value: '#2271C1', fullName: 'a.b.bg' }],
    } as Partial<SectionData>)
    const btn = root.querySelector('.token-btn')
    expect(btn?.textContent?.trim()).toContain('a')
    expect(btn?.textContent?.trim()).not.toContain('a.b')
  })
})
