// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/sizing-section.ts (312 LOC, ~46%)
 *
 * Sizing = device preset dropdown, width/height inputs with hug/full
 * toggles + token buttons, plus a simplified Icon-size variant.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SizingSection,
  createSizingSection,
} from '../../studio/panels/property/sections/sizing-section'
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
}

function buildData(props: Prop[], extra: Partial<SectionData> = {}): SectionData {
  return {
    category: { name: 'sizing', properties: props },
    ...extra,
  } as unknown as SectionData
}

function renderSection(props: Prop[], extra: Partial<SectionData> = {}): HTMLElement {
  const html = createSizingSection(deps).render(buildData(props, extra))
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// Construction + render
// =============================================================================

describe('SizingSection — construction', () => {
  it('createSizingSection returns a SizingSection', () => {
    expect(createSizingSection(deps)).toBeInstanceOf(SizingSection)
  })

  it('returns empty when no category present', () => {
    expect(createSizingSection(deps).render({} as SectionData)).toBe('')
  })
})

describe('SizingSection — render shape (default)', () => {
  it('renders device preset dropdown with all 4 options', () => {
    const root = renderSection([])
    const select = root.querySelector('select[data-device-preset]') as HTMLSelectElement
    expect(select.querySelectorAll('option')).toHaveLength(4)
    const values = Array.from(select.querySelectorAll('option')).map(o => o.value)
    expect(values).toEqual(['', 'mobile', 'tablet', 'desktop'])
  })

  it('selects the matching device preset when w/h match a preset', () => {
    const root = renderSection([
      { name: 'w', value: '375' },
      { name: 'h', value: '812' },
    ])
    const select = root.querySelector('select[data-device-preset]') as HTMLSelectElement
    expect(select.value).toBe('mobile')
  })

  it('selects "Custom" (empty) when w/h don\'t match any preset', () => {
    const root = renderSection([
      { name: 'w', value: '500' },
      { name: 'h', value: '700' },
    ])
    const select = root.querySelector('select[data-device-preset]') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('renders width and height inputs', () => {
    const root = renderSection([
      { name: 'w', value: '200' },
      { name: 'h', value: '150' },
    ])
    expect((root.querySelector('input[data-prop="width"]') as HTMLInputElement).value).toBe('200')
    expect((root.querySelector('input[data-prop="height"]') as HTMLInputElement).value).toBe('150')
  })

  it('reads width/height from "width"/"height" full-name aliases', () => {
    const root = renderSection([
      { name: 'width', value: '300' },
      { name: 'height', value: '250' },
    ])
    expect((root.querySelector('input[data-prop="width"]') as HTMLInputElement).value).toBe('300')
    expect((root.querySelector('input[data-prop="height"]') as HTMLInputElement).value).toBe('250')
  })

  it('renders 4 size-mode toggles (width-hug/full + height-hug/full)', () => {
    const root = renderSection([])
    const toggles = root.querySelectorAll('.toggle-btn[data-size-mode]')
    expect(toggles).toHaveLength(4)
  })

  it('marks width-hug toggle active when width === "hug"', () => {
    const root = renderSection([{ name: 'w', value: 'hug' }])
    const hug = root.querySelector('[data-size-mode="width-hug"]') as HTMLElement
    expect(hug.classList.contains('active')).toBe(true)
  })

  it('marks width-full toggle active when width === "full"', () => {
    const root = renderSection([{ name: 'w', value: 'full' }])
    const full = root.querySelector('[data-size-mode="width-full"]') as HTMLElement
    expect(full.classList.contains('active')).toBe(true)
  })

  it('marks height-hug active when height === "hug"', () => {
    const root = renderSection([{ name: 'h', value: 'hug' }])
    const hug = root.querySelector('[data-size-mode="height-hug"]') as HTMLElement
    expect(hug.classList.contains('active')).toBe(true)
  })

  it('marks height-full active when height === "full"', () => {
    const root = renderSection([{ name: 'h', value: 'full' }])
    const full = root.querySelector('[data-size-mode="height-full"]') as HTMLElement
    expect(full.classList.contains('active')).toBe(true)
  })
})

describe('SizingSection — token resolution', () => {
  it('width $token resolved + token-resolved class set', () => {
    const root = renderSection([{ name: 'w', value: '$col' }], {
      resolveTokenValue: (ref, type) => (ref === '$col' && type === 'w' ? '320' : null),
    })
    const input = root.querySelector('input[data-prop="width"]') as HTMLInputElement
    expect(input.value).toBe('320')
    expect(input.classList.contains('token-resolved')).toBe(true)
    expect(input.dataset.tokenRef).toBe('$col')
  })

  it('height $token resolved + token-resolved class set', () => {
    const root = renderSection([{ name: 'h', value: '$row' }], {
      resolveTokenValue: (ref, type) => (ref === '$row' && type === 'h' ? '60' : null),
    })
    const input = root.querySelector('input[data-prop="height"]') as HTMLInputElement
    expect(input.value).toBe('60')
    expect(input.classList.contains('token-resolved')).toBe(true)
  })

  it('falls back to raw token value when resolveTokenValue returns null', () => {
    const root = renderSection([{ name: 'w', value: '$missing' }], {
      resolveTokenValue: () => null,
    })
    const input = root.querySelector('input[data-prop="width"]') as HTMLInputElement
    expect(input.value).toBe('$missing')
    expect(input.classList.contains('token-resolved')).toBe(false)
  })

  it('renders width token buttons from spacingTokens (filtered by .w suffix)', () => {
    const root = renderSection([], {
      spacingTokens: [
        { name: 'col', value: '320', fullName: 'card.w' },
        { name: 'row', value: '60', fullName: 'card.h' },
        { name: 'pad', value: '12', fullName: 'card.pad' },
      ],
    } as Partial<SectionData>)
    // Only .w tokens render in the width row's token-group
    const widthGroup = root.querySelectorAll('.toggle-btn[data-size-mode="width-hug"]')[0]
      ?.parentElement?.parentElement
    const widthBtns = widthGroup?.querySelectorAll('.token-btn')
    expect(widthBtns?.length).toBe(1)
  })
})

describe('SizingSection — Icon variant', () => {
  it('renders simplified icon-size input when primitive === "Icon"', () => {
    const root = renderSection([], {
      primitive: 'Icon',
      allProperties: [{ name: 'is', value: '32' }],
    } as Partial<SectionData>)
    const input = root.querySelector('input[data-prop="icon-size"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('32')
  })

  it('Icon variant defaults to "20" when no is/icon-size prop', () => {
    const root = renderSection([], {
      primitive: 'Icon',
      allProperties: [],
    } as Partial<SectionData>)
    const input = root.querySelector('input[data-prop="icon-size"]') as HTMLInputElement
    expect(input.value).toBe('20')
  })

  it('Icon variant reads from "icon-size" full-name alias', () => {
    const root = renderSection([], {
      primitive: 'Icon',
      allProperties: [{ name: 'icon-size', value: '24' }],
    } as Partial<SectionData>)
    const input = root.querySelector('input[data-prop="icon-size"]') as HTMLInputElement
    expect(input.value).toBe('24')
  })

  it('Icon variant does NOT render width/height controls', () => {
    const root = renderSection([], {
      primitive: 'Icon',
      allProperties: [],
    } as Partial<SectionData>)
    expect(root.querySelector('input[data-prop="width"]')).toBeNull()
    expect(root.querySelector('input[data-prop="height"]')).toBeNull()
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('SizingSection — handlers', () => {
  function getHandlers() {
    return createSizingSection(deps).getHandlers()
  }

  it('device preset change → onPropertyChange("__DEVICE_PRESET__", value, "dropdown")', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    const o = document.createElement('option')
    o.value = 'mobile'
    select.append(o)
    select.value = 'mobile'
    handlers['select[data-device-preset]'].change(new Event('change'), select)
    expect(onPropertyChange).toHaveBeenCalledWith('__DEVICE_PRESET__', 'mobile', 'dropdown')
  })

  it('device preset "Custom" (empty value) is a NO-OP', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    const o = document.createElement('option')
    o.value = ''
    select.append(o)
    select.value = ''
    handlers['select[data-device-preset]'].change(new Event('change'), select)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('size-mode toggle splits "width-hug" into prop+value', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.sizeMode = 'width-hug'
    handlers['.toggle-btn[data-size-mode]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('width', 'hug', 'toggle')
  })

  it('size-mode toggle splits "height-full" into prop+value', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.sizeMode = 'height-full'
    handlers['.toggle-btn[data-size-mode]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('height', 'full', 'toggle')
  })

  it('size-mode toggle is NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.toggle-btn[data-size-mode]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('width input.input → onPropertyChange("width", value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '400'
    handlers['input[data-prop="width"]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('width', '400', 'input')
  })

  it('height input.input → onPropertyChange("height", value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '300'
    handlers['input[data-prop="height"]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('height', '300', 'input')
  })

  it('icon-size input.input → onPropertyChange("is", value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '24'
    handlers['input[data-prop="icon-size"]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('is', '24', 'input')
  })

  it('width token-btn click — uses tokenRef when present', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.wToken = '320'
    btn.dataset.tokenRef = '$col'
    handlers['.token-btn[data-w-token], .token-dropdown-item[data-w-token]'].click(
      new Event('click'),
      btn
    )
    expect(onPropertyChange).toHaveBeenCalledWith('width', '$col', 'token')
  })

  it('height token-btn click — uses tokenRef when present', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.hToken = '60'
    btn.dataset.tokenRef = '$row'
    handlers['.token-btn[data-h-token], .token-dropdown-item[data-h-token]'].click(
      new Event('click'),
      btn
    )
    expect(onPropertyChange).toHaveBeenCalledWith('height', '$row', 'token')
  })

  it('width token-btn click is NO-OP when neither dataset is set', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.token-btn[data-w-token], .token-dropdown-item[data-w-token]'].click(
      new Event('click'),
      btn
    )
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('width token-btn closes parent dropdown after click', () => {
    const handlers = getHandlers()
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown open'
    const btn = document.createElement('button')
    btn.dataset.wToken = '320'
    dropdown.appendChild(btn)
    document.body.appendChild(dropdown)
    handlers['.token-btn[data-w-token], .token-dropdown-item[data-w-token]'].click(
      new Event('click'),
      btn
    )
    expect(dropdown.classList.contains('open')).toBe(false)
  })

  it('width more-btn click toggles dropdown open class', () => {
    const handlers = getHandlers()
    const container = document.createElement('div')
    container.className = 'token-more-container'
    const btn = document.createElement('button')
    btn.dataset.wTokenDir = ''
    container.appendChild(btn)
    const dropdown = document.createElement('div')
    dropdown.className = 'token-dropdown'
    container.appendChild(dropdown)
    document.body.appendChild(container)

    handlers['.token-more-btn[data-w-token-dir], .token-more-btn[data-h-token-dir]'].click(
      new MouseEvent('click'),
      btn
    )
    expect(dropdown.classList.contains('open')).toBe(true)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: detectDevice matches BOTH w AND h (catches ===→|| mutation)', () => {
    // mobile is 375×812 — only matches when both dims align
    const root = renderSection([
      { name: 'w', value: '375' },
      { name: 'h', value: '900' }, // wrong h, no preset matches
    ])
    const select = root.querySelector('select[data-device-preset]') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('M2: device preset empty value SKIPS the propertyChange call', () => {
    const handlers = createSizingSection(deps).getHandlers()
    const select = document.createElement('select')
    select.value = '' // Custom
    handlers['select[data-device-preset]'].change(new Event('change'), select)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('M3: size-mode dataset-split parses BOTH halves correctly', () => {
    // If split('-') is dropped, prop & value would be undefined.
    const handlers = createSizingSection(deps).getHandlers()
    const btn = document.createElement('button')
    btn.dataset.sizeMode = 'width-full'
    handlers['.toggle-btn[data-size-mode]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('width', 'full', 'toggle')
  })

  it('M4: Icon variant defaults to "20" (catches drop of fallback)', () => {
    const root = renderSection([], {
      primitive: 'Icon',
      allProperties: [],
    } as Partial<SectionData>)
    const input = root.querySelector('input[data-prop="icon-size"]') as HTMLInputElement
    expect(input.value).toBe('20')
  })
})
