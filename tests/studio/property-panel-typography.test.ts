// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/typography-section.ts (299 LOC, ~10%)
 *
 * Covers: render shape (font dropdown, weight dropdown, font-size input
 * + token resolution, align toggles, style toggles), event handlers,
 * mutation-driven coverage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  TypographySection,
  createTypographySection,
} from '../../studio/panels/property/sections/typography-section'
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

function buildData(props: Prop[], extra: Partial<SectionData> = {}): SectionData {
  return {
    category: { name: 'typography', properties: props } as never,
    ...extra,
  } as SectionData
}

function renderSection(props: Prop[], extra: Partial<SectionData> = {}): HTMLElement {
  const section = createTypographySection(deps)
  const html = section.render(buildData(props, extra))
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// Construction + render
// =============================================================================

describe('TypographySection — construction', () => {
  it('createTypographySection returns a TypographySection', () => {
    expect(createTypographySection(deps)).toBeInstanceOf(TypographySection)
  })

  it('returns empty string when no category is in the data', () => {
    const section = createTypographySection(deps)
    const html = section.render({} as SectionData)
    expect(html).toBe('')
  })
})

describe('TypographySection — render shape', () => {
  it('renders all four prop rows (font, size, weight, align)', () => {
    const root = renderSection([])
    const labels = Array.from(root.querySelectorAll('.prop-label')).map(l => l.textContent)
    expect(labels).toEqual(['Font', 'Size', 'Weight', 'Align'])
  })

  it('renders all 8 font options', () => {
    const root = renderSection([])
    const select = root.querySelector('select.pp-font-input') as HTMLSelectElement
    expect(select.querySelectorAll('option')).toHaveLength(8)
  })

  it('font option for current value is marked selected', () => {
    const root = renderSection([{ name: 'font', value: 'Helvetica' }])
    const select = root.querySelector('select.pp-font-input') as HTMLSelectElement
    expect(select.value).toBe('Helvetica')
  })

  it('renders all 9 weight options (100…900)', () => {
    const root = renderSection([])
    const select = root.querySelector('select.pp-weight-input') as HTMLSelectElement
    expect(select.querySelectorAll('option')).toHaveLength(9)
  })

  it('weight option for current value is marked selected', () => {
    const root = renderSection([{ name: 'weight', value: '700' }])
    const select = root.querySelector('select.pp-weight-input') as HTMLSelectElement
    expect(select.value).toBe('700')
  })

  it('renders 3 align toggles (left/center/right)', () => {
    const root = renderSection([])
    const toggles = root.querySelectorAll('.toggle-btn[data-text-align]')
    expect(toggles).toHaveLength(3)
    expect(Array.from(toggles).map(t => (t as HTMLElement).dataset.textAlign)).toEqual([
      'left',
      'center',
      'right',
    ])
  })

  it('marks the active align toggle', () => {
    const root = renderSection([{ name: 'text-align', value: 'center' }])
    const center = root.querySelector('[data-text-align="center"]') as HTMLElement
    const left = root.querySelector('[data-text-align="left"]') as HTMLElement
    expect(center.classList.contains('active')).toBe(true)
    expect(left.classList.contains('active')).toBe(false)
  })

  it('renders italic + underline style toggles', () => {
    const root = renderSection([])
    const toggles = root.querySelectorAll('.toggle-btn[data-text-style]')
    expect(toggles).toHaveLength(2)
    expect(Array.from(toggles).map(t => (t as HTMLElement).dataset.textStyle)).toEqual([
      'italic',
      'underline',
    ])
  })

  it('marks italic active when prop is "true"', () => {
    const root = renderSection([{ name: 'italic', value: 'true' }])
    const italic = root.querySelector('[data-text-style="italic"]') as HTMLElement
    expect(italic.classList.contains('active')).toBe(true)
  })

  it('marks italic active for boolean-style standalone prop (value="" with hasValue!==false)', () => {
    const root = renderSection([{ name: 'italic', value: '', hasValue: true }])
    const italic = root.querySelector('[data-text-style="italic"]') as HTMLElement
    expect(italic.classList.contains('active')).toBe(true)
  })

  it('does NOT mark italic active when value="" AND hasValue=false', () => {
    const root = renderSection([{ name: 'italic', value: '', hasValue: false }])
    const italic = root.querySelector('[data-text-style="italic"]') as HTMLElement
    expect(italic.classList.contains('active')).toBe(false)
  })
})

describe('TypographySection — font-size handling', () => {
  it('renders font-size input with raw value', () => {
    const root = renderSection([{ name: 'fs', value: '18' }])
    const input = root.querySelector('input[data-prop="font-size"]') as HTMLInputElement
    expect(input.value).toBe('18')
  })

  it('renders font-size input from "font-size" prop alias', () => {
    const root = renderSection([{ name: 'font-size', value: '24' }])
    const input = root.querySelector('input[data-prop="font-size"]') as HTMLInputElement
    expect(input.value).toBe('24')
  })

  it('resolves $token to its value via resolveTokenValue', () => {
    const root = renderSection([{ name: 'fs', value: '$body' }], {
      resolveTokenValue: (ref, type) => (ref === '$body' && type === 'fs' ? '14' : null),
    })
    const input = root.querySelector('input[data-prop="font-size"]') as HTMLInputElement
    expect(input.value).toBe('14')
    expect(input.classList.contains('token-resolved')).toBe(true)
    expect(input.dataset.tokenRef).toBe('$body')
  })

  it('falls back to raw token value when resolveTokenValue returns null', () => {
    const root = renderSection([{ name: 'fs', value: '$missing' }], {
      resolveTokenValue: () => null,
    })
    const input = root.querySelector('input[data-prop="font-size"]') as HTMLInputElement
    expect(input.value).toBe('$missing')
    expect(input.classList.contains('token-resolved')).toBe(false)
  })

  it('renders token buttons via getSpacingTokens callback', () => {
    const root = renderSection([], {
      getSpacingTokens: type =>
        type === 'fs'
          ? [
              { name: 'small', value: '12', fullName: 'fs.small' },
              { name: 'body', value: '14', fullName: 'fs.body' },
            ]
          : [],
    } as Partial<SectionData>)
    const tokens = root.querySelectorAll('.token-btn')
    expect(tokens.length).toBeGreaterThanOrEqual(2)
  })

  it('escapes HTML in font-size input value', () => {
    const root = renderSection([{ name: 'fs', value: '<script>"x' }])
    // The browser parses the HTML — we read the deserialized value
    const input = root.querySelector('input[data-prop="font-size"]') as HTMLInputElement
    expect(input.value).toBe('<script>"x')
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('TypographySection — handlers', () => {
  function getHandlers() {
    const section = createTypographySection(deps)
    return section.getHandlers()
  }

  it('font select.change → onPropertyChange("font", value, "select")', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    const opt = document.createElement('option')
    opt.value = 'Inter'
    select.append(opt)
    select.value = 'Inter'
    handlers['select[data-prop="font"]'].change(new Event('change'), select)
    expect(onPropertyChange).toHaveBeenCalledWith('font', 'Inter', 'select')
  })

  it('weight select.change → onPropertyChange("weight", value, "select")', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    const opt = document.createElement('option')
    opt.value = '600'
    select.append(opt)
    select.value = '600'
    handlers['select[data-prop="weight"]'].change(new Event('change'), select)
    expect(onPropertyChange).toHaveBeenCalledWith('weight', '600', 'select')
  })

  it('font-size input.input → onPropertyChange("font-size", value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '20'
    handlers['input[data-prop="font-size"]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('font-size', '20', 'input')
  })

  it('fs token-btn click — uses tokenRef when available', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.fsToken = '14'
    btn.dataset.tokenRef = '$body'
    handlers['.token-btn[data-fs-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('font-size', '$body', 'token')
  })

  it('fs token-btn click — falls back to raw value when no tokenRef', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.fsToken = '14'
    handlers['.token-btn[data-fs-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('font-size', '14', 'token')
  })

  it('fs token-btn click is a NO-OP when neither dataset attribute is set', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.token-btn[data-fs-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('text-align toggle click → onPropertyChange("text-align", align, "toggle")', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.textAlign = 'center'
    handlers['.toggle-btn[data-text-align]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('text-align', 'center', 'toggle')
  })

  it('text-align toggle click is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.toggle-btn[data-text-align]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('text-style toggle click → onToggleProperty(style, isActive)', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.textStyle = 'italic'
    btn.classList.add('active')
    handlers['.toggle-btn[data-text-style]'].click(new Event('click'), btn)
    expect(onToggleProperty).toHaveBeenCalledWith('italic', true)
  })

  it('text-style toggle click on INACTIVE button → onToggleProperty(style, false)', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.textStyle = 'underline'
    handlers['.toggle-btn[data-text-style]'].click(new Event('click'), btn)
    expect(onToggleProperty).toHaveBeenCalledWith('underline', false)
  })

  it('text-style toggle click is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.toggle-btn[data-text-style]'].click(new Event('click'), btn)
    expect(onToggleProperty).not.toHaveBeenCalled()
  })
})

describe('TypographySection — token-more dropdown', () => {
  it('clicking token-more-btn opens the dropdown', () => {
    // Render with 5+ tokens to trigger the more-button + dropdown.
    const tokens = [
      { name: 'xs', value: '10', fullName: 'fs.xs' },
      { name: 'sm', value: '12', fullName: 'fs.sm' },
      { name: 'md', value: '14', fullName: 'fs.md' },
      { name: 'lg', value: '18', fullName: 'fs.lg' },
      { name: 'xl', value: '24', fullName: 'fs.xl' },
    ]
    const root = renderSection([], {
      getSpacingTokens: type => (type === 'fs' ? tokens : []),
    } as Partial<SectionData>)
    document.body.appendChild(root)

    const moreBtn = root.querySelector('.token-more-btn') as HTMLElement
    expect(moreBtn).not.toBeNull()
    const dropdown = root.querySelector('.token-dropdown') as HTMLElement
    expect(dropdown.classList.contains('open')).toBe(false)

    const handlers = createTypographySection(deps).getHandlers()
    handlers['.token-more-btn'].click(new MouseEvent('click'), moreBtn)
    expect(dropdown.classList.contains('open')).toBe(true)
  })

  it('clicking a dropdown-item fires onPropertyChange + closes dropdown', () => {
    const tokens = [
      { name: 'xs', value: '10', fullName: 'fs.xs' },
      { name: 'sm', value: '12', fullName: 'fs.sm' },
      { name: 'md', value: '14', fullName: 'fs.md' },
      { name: 'lg', value: '18', fullName: 'fs.lg' },
      { name: 'xl', value: '24', fullName: 'fs.xl' },
    ]
    const root = renderSection([], {
      getSpacingTokens: type => (type === 'fs' ? tokens : []),
    } as Partial<SectionData>)
    document.body.appendChild(root)

    const dropdown = root.querySelector('.token-dropdown') as HTMLElement
    dropdown.classList.add('open')
    const item = root.querySelector('.token-dropdown-item[data-fs-token]') as HTMLElement
    expect(item).not.toBeNull()
    const handlers = createTypographySection(deps).getHandlers()
    handlers['.token-dropdown-item[data-fs-token]'].click(new MouseEvent('click'), item)

    expect(onPropertyChange).toHaveBeenCalledWith(
      'font-size',
      expect.stringMatching(/^\$|^[0-9]+$/),
      'token'
    )
    expect(dropdown.classList.contains('open')).toBe(false)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: token resolution applies the token-resolved class (catches drop of resolution branch)', () => {
    const root = renderSection([{ name: 'fs', value: '$body' }], {
      resolveTokenValue: () => '14',
    })
    const input = root.querySelector('input[data-prop="font-size"]') as HTMLInputElement
    expect(input.classList.contains('token-resolved')).toBe(true)
  })

  it('M2: italic active=true branch checks BOTH "true" AND empty+hasValue', () => {
    // If the second branch is dropped, value="" won't activate the toggle.
    const root = renderSection([{ name: 'italic', value: '', hasValue: true }])
    const italic = root.querySelector('[data-text-style="italic"]') as HTMLElement
    expect(italic.classList.contains('active')).toBe(true)
  })

  it('M3: align comparison uses === (catches !== mutation)', () => {
    // With === intact, only the matching align is active.
    const root = renderSection([{ name: 'text-align', value: 'left' }])
    const left = root.querySelector('[data-text-align="left"]') as HTMLElement
    const center = root.querySelector('[data-text-align="center"]') as HTMLElement
    const right = root.querySelector('[data-text-align="right"]') as HTMLElement
    expect(left.classList.contains('active')).toBe(true)
    expect(center.classList.contains('active')).toBe(false)
    expect(right.classList.contains('active')).toBe(false)
  })
})
