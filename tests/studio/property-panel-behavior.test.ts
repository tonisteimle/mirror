// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/behavior-section.ts (166 LOC, ~11%)
 *
 * Behavior renders Zag-component properties: select dropdowns for enums,
 * text/number inputs for "other" types, and boolean toggles.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  BehaviorSection,
  createBehaviorSection,
} from '../../studio/panels/property/sections/behavior-section'
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

interface BProp {
  name: string
  value: string
  type?: string
  label?: string
  description?: string
  options?: string[]
  hasValue?: boolean
}

function renderSection(props: BProp[]): HTMLElement {
  const html = createBehaviorSection(deps).render({
    category: { name: 'behavior', properties: props },
  } as unknown as SectionData)
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// Construction + render
// =============================================================================

describe('BehaviorSection — construction', () => {
  it('createBehaviorSection returns a BehaviorSection', () => {
    expect(createBehaviorSection(deps)).toBeInstanceOf(BehaviorSection)
  })

  it('returns empty when category is missing', () => {
    expect(createBehaviorSection(deps).render({} as SectionData)).toBe('')
  })

  it('returns empty when properties array is empty', () => {
    expect(
      createBehaviorSection(deps).render({
        category: { name: 'behavior', properties: [] },
      } as unknown as SectionData)
    ).toBe('')
  })
})

describe('BehaviorSection — render shape', () => {
  it('renders select rows for enum properties', () => {
    const root = renderSection([
      {
        name: 'positioning',
        value: 'bottom-start',
        type: 'select',
        options: ['top', 'bottom', 'bottom-start'],
      },
    ])
    const select = root.querySelector(
      'select[data-behavior-select="positioning"]'
    ) as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.value).toBe('bottom-start')
  })

  it('always prepends an empty placeholder option to selects', () => {
    const root = renderSection([
      { name: 'positioning', value: 'top', type: 'select', options: ['top', 'bottom'] },
    ])
    const select = root.querySelector(
      'select[data-behavior-select="positioning"]'
    ) as HTMLSelectElement
    expect(select.querySelector('option[value=""]')).not.toBeNull()
  })

  it('renders input rows for text-type properties', () => {
    const root = renderSection([{ name: 'placeholder', value: 'Type here', type: 'text' }])
    const input = root.querySelector('input[data-behavior-input="placeholder"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('Type here')
    expect(input.classList.contains('wide')).toBe(true)
  })

  it('renders input rows for number-type properties with placeholder "0"', () => {
    const root = renderSection([{ name: 'startOfWeek', value: '', type: 'number' }])
    const input = root.querySelector('input[data-behavior-input="startOfWeek"]') as HTMLInputElement
    expect(input.placeholder).toBe('0')
    expect(input.classList.contains('wide')).toBe(false)
  })

  it('renders boolean toggles', () => {
    const root = renderSection([{ name: 'fixedWeeks', value: 'false', type: 'boolean' }])
    const btn = root.querySelector(
      '.toggle-btn[data-behavior-toggle="fixedWeeks"]'
    ) as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.classList.contains('active')).toBe(false)
  })

  it('marks boolean toggle active when value === "true"', () => {
    const root = renderSection([{ name: 'fixedWeeks', value: 'true', type: 'boolean' }])
    const btn = root.querySelector(
      '.toggle-btn[data-behavior-toggle="fixedWeeks"]'
    ) as HTMLButtonElement
    expect(btn.classList.contains('active')).toBe(true)
  })

  it('marks boolean toggle active for value="" with hasValue !== false', () => {
    const root = renderSection([{ name: 'fixedWeeks', value: '', type: 'boolean', hasValue: true }])
    const btn = root.querySelector(
      '.toggle-btn[data-behavior-toggle="fixedWeeks"]'
    ) as HTMLButtonElement
    expect(btn.classList.contains('active')).toBe(true)
  })

  it('does NOT mark boolean toggle active when hasValue === false', () => {
    const root = renderSection([
      { name: 'fixedWeeks', value: '', type: 'boolean', hasValue: false },
    ])
    const btn = root.querySelector(
      '.toggle-btn[data-behavior-toggle="fixedWeeks"]'
    ) as HTMLButtonElement
    expect(btn.classList.contains('active')).toBe(false)
  })

  it('uses prop.label when provided, else falls back to prop.name', () => {
    const root = renderSection([
      { name: 'startOfWeek', label: 'Start Day', value: '0', type: 'number' },
      { name: 'fixedWeeks', value: 'false', type: 'boolean' },
    ])
    const labels = Array.from(root.querySelectorAll('.prop-label')).map(l => l.textContent)
    expect(labels).toContain('Start Day')
    expect(labels).toContain('fixedWeeks')
  })

  it('falls back to input rendering for select-type with EMPTY options (no select rendered)', () => {
    const root = renderSection([{ name: 'mode', value: '', type: 'select', options: [] }])
    expect(root.querySelector('select[data-behavior-select="mode"]')).toBeNull()
    // Falls through to "others" branch → renders as input
    expect(root.querySelector('input[data-behavior-input="mode"]')).not.toBeNull()
  })

  it('EXCLUDES disabled / clearable / required from rendering', () => {
    const root = renderSection([
      { name: 'disabled', value: 'true', type: 'boolean' },
      { name: 'clearable', value: 'true', type: 'boolean' },
      { name: 'required', value: 'true', type: 'boolean' },
      { name: 'fixedWeeks', value: 'true', type: 'boolean' },
    ])
    expect(root.querySelector('[data-behavior-toggle="disabled"]')).toBeNull()
    expect(root.querySelector('[data-behavior-toggle="clearable"]')).toBeNull()
    expect(root.querySelector('[data-behavior-toggle="required"]')).toBeNull()
    expect(root.querySelector('[data-behavior-toggle="fixedWeeks"]')).not.toBeNull()
  })

  it('escapes the description tooltip text', () => {
    const root = renderSection([
      { name: 'mode', value: '', type: 'text', description: '<script>"x' },
    ])
    const label = root.querySelector('.prop-label') as HTMLElement
    expect(label.getAttribute('title')).toBe('<script>"x') // escaped on input, browser parses on read
  })

  it('escapes the input value to prevent XSS', () => {
    const root = renderSection([{ name: 'placeholder', value: '<x>', type: 'text' }])
    const input = root.querySelector('input[data-behavior-input="placeholder"]') as HTMLInputElement
    expect(input.value).toBe('<x>')
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('BehaviorSection — handlers', () => {
  function getHandlers() {
    return createBehaviorSection(deps).getHandlers()
  }

  it('select.change → onPropertyChange(propName, value, "select")', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    select.dataset.behaviorSelect = 'positioning'
    const opt = document.createElement('option')
    opt.value = 'top'
    select.append(opt)
    select.value = 'top'
    handlers['select[data-behavior-select]'].change(new Event('change'), select)
    expect(onPropertyChange).toHaveBeenCalledWith('positioning', 'top', 'select')
  })

  it('select.change is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    handlers['select[data-behavior-select]'].change(new Event('change'), select)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('input.input → onPropertyChange(propName, value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.dataset.behaviorInput = 'placeholder'
    input.value = 'Hello'
    handlers['input[data-behavior-input]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('placeholder', 'Hello', 'input')
  })

  it('input.input is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    handlers['input[data-behavior-input]'].input(new Event('input'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('toggle click on ACTIVE → onToggleProperty(propName, true)', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.behaviorToggle = 'fixedWeeks'
    btn.classList.add('active')
    handlers['.toggle-btn[data-behavior-toggle]'].click(new Event('click'), btn)
    expect(onToggleProperty).toHaveBeenCalledWith('fixedWeeks', true)
  })

  it('toggle click on INACTIVE → onToggleProperty(propName, false)', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.behaviorToggle = 'fixedWeeks'
    handlers['.toggle-btn[data-behavior-toggle]'].click(new Event('click'), btn)
    expect(onToggleProperty).toHaveBeenCalledWith('fixedWeeks', false)
  })

  it('toggle click is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.toggle-btn[data-behavior-toggle]'].click(new Event('click'), btn)
    expect(onToggleProperty).not.toHaveBeenCalled()
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: EXCLUDED_PROPS filter dropping ANY of disabled/clearable/required (catches list shrink)', () => {
    // If any of the three is removed from EXCLUDED_PROPS, it would render.
    const root = renderSection([
      { name: 'disabled', value: 'true', type: 'boolean' },
      { name: 'clearable', value: 'true', type: 'boolean' },
      { name: 'required', value: 'true', type: 'boolean' },
    ])
    expect(root.querySelectorAll('[data-behavior-toggle]')).toHaveLength(0)
  })

  it('M2: select rendering REQUIRES non-empty options (catches drop of length check)', () => {
    // If `p.options.length > 0` is dropped, an empty-options prop would
    // render an empty <select> instead of falling through to the input branch.
    const root = renderSection([{ name: 'mode', value: '', type: 'select', options: [] }])
    expect(root.querySelector('select[data-behavior-select="mode"]')).toBeNull()
    expect(root.querySelector('input[data-behavior-input="mode"]')).not.toBeNull()
  })

  it('M3: number-type input uses placeholder "0" (catches drop of ternary)', () => {
    const root = renderSection([{ name: 'n', value: '', type: 'number' }])
    const input = root.querySelector('input[data-behavior-input="n"]') as HTMLInputElement
    expect(input.placeholder).toBe('0')
  })

  it('M4: text-type input has the .wide CSS class (catches drop of ternary)', () => {
    const root = renderSection([{ name: 't', value: '', type: 'text' }])
    const input = root.querySelector('input[data-behavior-input="t"]') as HTMLInputElement
    expect(input.classList.contains('wide')).toBe(true)
  })
})
