// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/visual-section.ts (205 LOC, ~13%)
 *
 * Visual = shadow toggles, opacity presets+input, cursor dropdown,
 * z-index input, visibility toggles (hidden/visible/disabled).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  VisualSection,
  createVisualSection,
} from '../../studio/panels/property/sections/visual-section'
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
}

function renderSection(props: Prop[]): HTMLElement {
  const html = createVisualSection(deps).render({
    category: { name: 'visual', properties: props },
  } as unknown as SectionData)
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// Construction + render
// =============================================================================

describe('VisualSection — construction', () => {
  it('createVisualSection returns a VisualSection', () => {
    expect(createVisualSection(deps)).toBeInstanceOf(VisualSection)
  })

  it('returns empty string when category is missing', () => {
    expect(createVisualSection(deps).render({} as SectionData)).toBe('')
  })
})

describe('VisualSection — render shape', () => {
  it('renders 4 shadow toggles (none/sm/md/lg)', () => {
    const root = renderSection([])
    const toggles = root.querySelectorAll('.pp-shadow-toggle[data-shadow]')
    expect(toggles).toHaveLength(4)
    expect(Array.from(toggles).map(t => (t as HTMLElement).dataset.shadow)).toEqual([
      'none',
      'sm',
      'md',
      'lg',
    ])
  })

  it('marks the matching shadow toggle active', () => {
    const root = renderSection([{ name: 'shadow', value: 'md' }])
    const md = root.querySelector('[data-shadow="md"]') as HTMLElement
    expect(md.classList.contains('active')).toBe(true)
  })

  it('marks "none" shadow toggle active when there is NO shadow value (default)', () => {
    const root = renderSection([])
    const none = root.querySelector('[data-shadow="none"]') as HTMLElement
    expect(none.classList.contains('active')).toBe(true)
  })

  it('renders 5 opacity presets (0, 0.25, 0.5, 0.75, 1)', () => {
    const root = renderSection([])
    const presets = root.querySelectorAll('.pp-opacity-preset[data-opacity]')
    expect(presets).toHaveLength(5)
    expect(Array.from(presets).map(p => (p as HTMLElement).dataset.opacity)).toEqual([
      '0',
      '0.25',
      '0.5',
      '0.75',
      '1',
    ])
  })

  it('marks the matching opacity preset active', () => {
    const root = renderSection([{ name: 'opacity', value: '0.5' }])
    const half = root.querySelector('[data-opacity="0.5"]') as HTMLElement
    expect(half.classList.contains('active')).toBe(true)
  })

  it('reads opacity from "o" alias', () => {
    const root = renderSection([{ name: 'o', value: '0.25' }])
    const quarter = root.querySelector('[data-opacity="0.25"]') as HTMLElement
    expect(quarter.classList.contains('active')).toBe(true)
  })

  it('renders opacity input populated with the current value', () => {
    const root = renderSection([{ name: 'opacity', value: '0.7' }])
    const input = root.querySelector('input[data-prop="opacity"]') as HTMLInputElement
    expect(input.value).toBe('0.7')
  })

  it('renders cursor select with all 6 options + empty placeholder', () => {
    const root = renderSection([])
    const select = root.querySelector('select[data-prop="cursor"]') as HTMLSelectElement
    const optValues = Array.from(select.querySelectorAll('option')).map(o => o.value)
    expect(optValues).toEqual(['', 'default', 'pointer', 'text', 'move', 'not-allowed', 'grab'])
  })

  it('cursor select shows the matching option as selected', () => {
    const root = renderSection([{ name: 'cursor', value: 'pointer' }])
    const select = root.querySelector('select[data-prop="cursor"]') as HTMLSelectElement
    expect(select.value).toBe('pointer')
  })

  it('cursor select selects the empty placeholder when value is unset', () => {
    const root = renderSection([])
    const select = root.querySelector('select[data-prop="cursor"]') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('renders z-index input populated with the current value', () => {
    const root = renderSection([{ name: 'z', value: '5' }])
    const input = root.querySelector('input[data-prop="z"]') as HTMLInputElement
    expect(input.value).toBe('5')
  })

  it('renders 3 visibility toggles (hidden/visible/disabled)', () => {
    const root = renderSection([])
    const toggles = root.querySelectorAll('.pp-visibility-toggle[data-visibility]')
    expect(toggles).toHaveLength(3)
    expect(Array.from(toggles).map(t => (t as HTMLElement).dataset.visibility)).toEqual([
      'hidden',
      'visible',
      'disabled',
    ])
  })

  it('marks visibility toggle active when prop value === "true"', () => {
    const root = renderSection([{ name: 'hidden', value: 'true' }])
    const hidden = root.querySelector('[data-visibility="hidden"]') as HTMLElement
    expect(hidden.classList.contains('active')).toBe(true)
  })

  it('marks visibility toggle active for boolean-style prop (value="" with hasValue!==false)', () => {
    const root = renderSection([{ name: 'visible', value: '', hasValue: true }])
    const visible = root.querySelector('[data-visibility="visible"]') as HTMLElement
    expect(visible.classList.contains('active')).toBe(true)
  })

  it('does NOT mark visibility toggle active for hasValue=false', () => {
    const root = renderSection([{ name: 'disabled', value: '', hasValue: false }])
    const disabled = root.querySelector('[data-visibility="disabled"]') as HTMLElement
    expect(disabled.classList.contains('active')).toBe(false)
  })

  it('escapes HTML in opacity input value', () => {
    const root = renderSection([{ name: 'opacity', value: '<x>"' }])
    const input = root.querySelector('input[data-prop="opacity"]') as HTMLInputElement
    expect(input.value).toBe('<x>"')
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('VisualSection — handlers', () => {
  function getHandlers() {
    return createVisualSection(deps).getHandlers()
  }

  it('shadow toggle click — fires onPropertyChange with the shadow name', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.shadow = 'md'
    handlers['.pp-shadow-toggle[data-shadow]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('shadow', 'md', 'toggle')
  })

  it('shadow toggle click on "none" — fires onPropertyChange with empty value', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.shadow = 'none'
    handlers['.pp-shadow-toggle[data-shadow]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('shadow', '', 'toggle')
  })

  it('shadow toggle click is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.pp-shadow-toggle[data-shadow]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('opacity preset click → onPropertyChange("opacity", val, "preset")', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.opacity = '0.5'
    handlers['.pp-opacity-preset[data-opacity]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('opacity', '0.5', 'preset')
  })

  it('opacity preset click is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.pp-opacity-preset[data-opacity]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('opacity input.input → onPropertyChange("opacity", val, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '0.4'
    handlers['input[data-prop="opacity"]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('opacity', '0.4', 'input')
  })

  it('cursor select.change → onPropertyChange("cursor", val, "select")', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    const o = document.createElement('option')
    o.value = 'pointer'
    select.append(o)
    select.value = 'pointer'
    handlers['select[data-prop="cursor"]'].change(new Event('change'), select)
    expect(onPropertyChange).toHaveBeenCalledWith('cursor', 'pointer', 'select')
  })

  it('z-index input.input → onPropertyChange("z", val, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '10'
    handlers['input[data-prop="z"]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('z', '10', 'input')
  })

  it('visibility toggle click on ACTIVE → onToggleProperty(prop, true)', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.visibility = 'hidden'
    btn.classList.add('active')
    handlers['.pp-visibility-toggle[data-visibility]'].click(new Event('click'), btn)
    expect(onToggleProperty).toHaveBeenCalledWith('hidden', true)
  })

  it('visibility toggle click on INACTIVE → onToggleProperty(prop, false)', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.visibility = 'disabled'
    handlers['.pp-visibility-toggle[data-visibility]'].click(new Event('click'), btn)
    expect(onToggleProperty).toHaveBeenCalledWith('disabled', false)
  })

  it('visibility toggle click is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.pp-visibility-toggle[data-visibility]'].click(new Event('click'), btn)
    expect(onToggleProperty).not.toHaveBeenCalled()
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: shadow "none" defaults active when shadowValue is FALSY', () => {
    // If `(shadow === 'none' && !shadowValue)` is dropped, "none" is never
    // active by default — would fail this test.
    const root = renderSection([])
    const none = root.querySelector('[data-shadow="none"]') as HTMLElement
    expect(none.classList.contains('active')).toBe(true)
  })

  it('M2: shadow "none" click sends EMPTY string (catches drop of ternary)', () => {
    // If `shadow === 'none' ? '' : shadow` becomes just `shadow`, "none"
    // would be written to source as `shadow none` — wrong.
    const handlers = createVisualSection(deps).getHandlers()
    const btn = document.createElement('button')
    btn.dataset.shadow = 'none'
    handlers['.pp-shadow-toggle[data-shadow]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('shadow', '', 'toggle')
  })

  it('M3: visibility toggle click is GUARDED against empty dataset', () => {
    // If `if (prop)` is dropped, onToggleProperty(undefined, false) fires.
    const handlers = createVisualSection(deps).getHandlers()
    const btn = document.createElement('button')
    handlers['.pp-visibility-toggle[data-visibility]'].click(new Event('click'), btn)
    expect(onToggleProperty).not.toHaveBeenCalled()
  })

  it('M4: opacity reads BOTH "opacity" and "o" aliases (catches drop of OR-clause)', () => {
    const root = renderSection([{ name: 'o', value: '0.25' }])
    const quarter = root.querySelector('[data-opacity="0.25"]') as HTMLElement
    expect(quarter.classList.contains('active')).toBe(true)
  })
})
