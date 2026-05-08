// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/layout-section.ts (309 LOC, ~38%)
 *
 * Layout = mode toggles (vertical/horizontal/grid/stacked), gap input
 * + tokens, wrap toggle (only for hor/ver), 3x3 alignment grid.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  LayoutSection,
  createLayoutSection,
} from '../../studio/panels/property/sections/layout-section'
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

function buildData(
  layoutProps: Prop[],
  alignProps: Prop[] = [],
  extra: Partial<SectionData> = {}
): SectionData {
  return {
    categories: [
      { name: 'layout', properties: layoutProps },
      ...(alignProps.length ? [{ name: 'alignment', properties: alignProps }] : []),
    ],
    ...extra,
  } as unknown as SectionData
}

function renderSection(
  layoutProps: Prop[],
  alignProps: Prop[] = [],
  extra: Partial<SectionData> = {}
): HTMLElement {
  const html = createLayoutSection(deps).render(buildData(layoutProps, alignProps, extra))
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

// =============================================================================
// Construction + render
// =============================================================================

describe('LayoutSection — construction', () => {
  it('createLayoutSection returns a LayoutSection', () => {
    expect(createLayoutSection(deps)).toBeInstanceOf(LayoutSection)
  })

  it('returns empty when no layout category present', () => {
    expect(createLayoutSection(deps).render({} as SectionData)).toBe('')
    expect(createLayoutSection(deps).render({ categories: [] } as unknown as SectionData)).toBe('')
  })
})

describe('LayoutSection — mode toggle', () => {
  it('renders 4 mode toggles', () => {
    const root = renderSection([])
    expect(root.querySelectorAll('.toggle-btn[data-layout]')).toHaveLength(4)
  })

  it('defaults to "vertical" active when no mode prop is set', () => {
    const root = renderSection([])
    const ver = root.querySelector('[data-layout="vertical"]') as HTMLElement
    expect(ver.classList.contains('active')).toBe(true)
  })

  it('horizontal active when "hor" prop has value="true"', () => {
    const root = renderSection([{ name: 'hor', value: 'true' }])
    const hor = root.querySelector('[data-layout="horizontal"]') as HTMLElement
    expect(hor.classList.contains('active')).toBe(true)
  })

  it('horizontal active for boolean "hor" (value="" with hasValue!==false)', () => {
    const root = renderSection([{ name: 'hor', value: '', hasValue: true }])
    const hor = root.querySelector('[data-layout="horizontal"]') as HTMLElement
    expect(hor.classList.contains('active')).toBe(true)
  })

  it('grid active when "grid" prop is truthy', () => {
    const root = renderSection([{ name: 'grid', value: 'true' }])
    const grid = root.querySelector('[data-layout="grid"]') as HTMLElement
    expect(grid.classList.contains('active')).toBe(true)
  })

  it('stacked active when "stacked" prop is truthy', () => {
    const root = renderSection([{ name: 'stacked', value: 'true' }])
    const st = root.querySelector('[data-layout="stacked"]') as HTMLElement
    expect(st.classList.contains('active')).toBe(true)
  })
})

describe('LayoutSection — gap', () => {
  it('renders gap input populated with the current value', () => {
    const root = renderSection([{ name: 'gap', value: '12' }])
    const input = root.querySelector('input[data-prop="gap"]') as HTMLInputElement
    expect(input.value).toBe('12')
  })

  it('reads gap from "g" alias', () => {
    const root = renderSection([{ name: 'g', value: '8' }])
    const input = root.querySelector('input[data-prop="gap"]') as HTMLInputElement
    expect(input.value).toBe('8')
  })

  it('resolves $token via resolveTokenValue + adds token-resolved class', () => {
    const root = renderSection([{ name: 'gap', value: '$md' }], [], {
      resolveTokenValue: (ref, type) => (ref === '$md' && type === 'gap' ? '12' : null),
    })
    const input = root.querySelector('input[data-prop="gap"]') as HTMLInputElement
    expect(input.value).toBe('12')
    expect(input.classList.contains('token-resolved')).toBe(true)
    expect(input.dataset.tokenRef).toBe('$md')
  })

  it('falls back to raw token value when resolveTokenValue returns null', () => {
    const root = renderSection([{ name: 'gap', value: '$missing' }], [], {
      resolveTokenValue: () => null,
    })
    const input = root.querySelector('input[data-prop="gap"]') as HTMLInputElement
    expect(input.value).toBe('$missing')
    expect(input.classList.contains('token-resolved')).toBe(false)
  })

  it('renders gap token buttons via getSpacingTokens callback', () => {
    const root = renderSection([], [], {
      getSpacingTokens: type =>
        type === 'gap'
          ? [
              { name: 'sm', value: '8', fullName: 'gap.sm' },
              { name: 'md', value: '12', fullName: 'gap.md' },
            ]
          : [],
    } as Partial<SectionData>)
    expect(root.querySelectorAll('.token-btn').length).toBeGreaterThanOrEqual(2)
  })
})

describe('LayoutSection — wrap row', () => {
  it('renders wrap toggle when mode is horizontal', () => {
    const root = renderSection([{ name: 'hor', value: 'true' }])
    expect(root.querySelector('[data-wrap]')).not.toBeNull()
  })

  it('renders wrap toggle when mode is vertical (default)', () => {
    const root = renderSection([])
    expect(root.querySelector('[data-wrap]')).not.toBeNull()
  })

  it('does NOT render wrap row when mode is grid', () => {
    const root = renderSection([{ name: 'grid', value: 'true' }])
    expect(root.querySelector('[data-wrap]')).toBeNull()
  })

  it('does NOT render wrap row when mode is stacked', () => {
    const root = renderSection([{ name: 'stacked', value: 'true' }])
    expect(root.querySelector('[data-wrap]')).toBeNull()
  })

  it('wrap toggle data-wrap attribute reflects current state', () => {
    const root1 = renderSection([{ name: 'wrap', value: 'true' }])
    const btn1 = root1.querySelector('[data-wrap]') as HTMLElement
    expect(btn1.dataset.wrap).toBe('off') // active → click would turn off
    expect(btn1.classList.contains('active')).toBe(true)

    const root2 = renderSection([])
    const btn2 = root2.querySelector('[data-wrap]') as HTMLElement
    expect(btn2.dataset.wrap).toBe('on') // inactive → click would turn on
  })
})

describe('LayoutSection — alignment grid', () => {
  it('renders 9 alignment cells when alignment category provided', () => {
    const root = renderSection([], [])
    expect(root.querySelectorAll('.align-cell[data-align]')).toHaveLength(0) // no alignment cat → no grid

    const root2 = renderSection([], [{ name: 'top', value: '' }])
    expect(root2.querySelectorAll('.align-cell[data-align]')).toHaveLength(9)
  })

  it('top-left active when both top + left props are truthy', () => {
    const root = renderSection(
      [],
      [
        { name: 'top', value: 'true' },
        { name: 'left', value: 'true' },
      ]
    )
    const tl = root.querySelector('[data-align="top-left"]') as HTMLElement
    expect(tl.classList.contains('active')).toBe(true)
  })

  it('middle-center active when "center" prop is truthy', () => {
    const root = renderSection([], [{ name: 'center', value: 'true' }])
    const mc = root.querySelector('[data-align="middle-center"]') as HTMLElement
    expect(mc.classList.contains('active')).toBe(true)
  })

  it('middle-center active when ver-center + hor-center BOTH truthy', () => {
    const root = renderSection(
      [],
      [
        { name: 'ver-center', value: 'true' },
        { name: 'hor-center', value: 'true' },
      ]
    )
    const mc = root.querySelector('[data-align="middle-center"]') as HTMLElement
    expect(mc.classList.contains('active')).toBe(true)
  })

  it('bottom-right active when both bottom + right are truthy', () => {
    const root = renderSection(
      [],
      [
        { name: 'bottom', value: 'true' },
        { name: 'right', value: 'true' },
      ]
    )
    const br = root.querySelector('[data-align="bottom-right"]') as HTMLElement
    expect(br.classList.contains('active')).toBe(true)
  })

  it('no cell active when no alignment props are set', () => {
    const root = renderSection([], [{ name: 'top', value: 'false' }])
    const active = root.querySelectorAll('.align-cell.active')
    expect(active).toHaveLength(0)
  })
})

// =============================================================================
// Handlers
// =============================================================================

describe('LayoutSection — handlers', () => {
  function getHandlers() {
    return createLayoutSection(deps).getHandlers()
  }

  it('mode toggle click → onPropertyChange("__LAYOUT_MODE__", mode, "toggle")', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.layout = 'horizontal'
    handlers['.toggle-btn[data-layout]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('__LAYOUT_MODE__', 'horizontal', 'toggle')
  })

  it('mode toggle click is a NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.toggle-btn[data-layout]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('gap token click — uses tokenRef when present', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.gapToken = '12'
    btn.dataset.tokenRef = '$md'
    handlers['.token-btn[data-gap-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('gap', '$md', 'token')
  })

  it('gap token click — falls back to raw value when no tokenRef', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.gapToken = '12'
    handlers['.token-btn[data-gap-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('gap', '12', 'token')
  })

  it('gap token click is NO-OP when neither dataset is set', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['.token-btn[data-gap-token]'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('gap input.input → onPropertyChange("gap", value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = '24'
    handlers['input[data-prop="gap"]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('gap', '24', 'input')
  })

  it('wrap toggle click — fires onToggleProperty("wrap", true) when data-wrap="off"', () => {
    // data-wrap is "off" when wrap is currently inactive — clicking should
    // ENABLE wrap (turn it ON). The handler reads `wrapAction === 'off'`
    // → newValue=true.
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.wrap = 'off'
    handlers['.toggle-btn[data-wrap]'].click(new Event('click'), btn)
    expect(onToggleProperty).toHaveBeenCalledWith('wrap', true)
  })

  it('wrap toggle click — fires onToggleProperty("wrap", false) when data-wrap="on"', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.wrap = 'on'
    handlers['.toggle-btn[data-wrap]'].click(new Event('click'), btn)
    expect(onToggleProperty).toHaveBeenCalledWith('wrap', false)
  })

  it('align cell click → onPropertyChange("__ALIGN__", cell, "toggle")', () => {
    const handlers = getHandlers()
    const cell = document.createElement('button')
    cell.dataset.align = 'top-right'
    handlers['.align-cell[data-align]'].click(new Event('click'), cell)
    expect(onPropertyChange).toHaveBeenCalledWith('__ALIGN__', 'top-right', 'toggle')
  })

  it('align cell click is NO-OP when dataset is missing', () => {
    const handlers = getHandlers()
    const cell = document.createElement('button')
    handlers['.align-cell[data-align]'].click(new Event('click'), cell)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('token-more-btn click toggles dropdown open class', () => {
    const tokens = [
      { name: 'xs', value: '4', fullName: 'gap.xs' },
      { name: 'sm', value: '8', fullName: 'gap.sm' },
      { name: 'md', value: '12', fullName: 'gap.md' },
      { name: 'lg', value: '16', fullName: 'gap.lg' },
      { name: 'xl', value: '24', fullName: 'gap.xl' },
    ]
    const root = renderSection([], [], {
      getSpacingTokens: type => (type === 'gap' ? tokens : []),
    } as Partial<SectionData>)
    document.body.appendChild(root)

    const moreBtn = root.querySelector('.token-more-btn') as HTMLElement
    expect(moreBtn).not.toBeNull()
    const dropdown = root.querySelector('.token-dropdown') as HTMLElement
    expect(dropdown.classList.contains('open')).toBe(false)

    const handlers = getHandlers()
    handlers['.token-more-btn'].click(new MouseEvent('click'), moreBtn)
    expect(dropdown.classList.contains('open')).toBe(true)
  })

  it('token-dropdown-item click fires onPropertyChange + closes dropdown', () => {
    const tokens = [
      { name: 'xs', value: '4', fullName: 'gap.xs' },
      { name: 'sm', value: '8', fullName: 'gap.sm' },
      { name: 'md', value: '12', fullName: 'gap.md' },
      { name: 'lg', value: '16', fullName: 'gap.lg' },
      { name: 'xl', value: '24', fullName: 'gap.xl' },
    ]
    const root = renderSection([], [], {
      getSpacingTokens: type => (type === 'gap' ? tokens : []),
    } as Partial<SectionData>)
    document.body.appendChild(root)

    const dropdown = root.querySelector('.token-dropdown') as HTMLElement
    dropdown.classList.add('open')
    const item = root.querySelector('.token-dropdown-item[data-gap-token]') as HTMLElement
    expect(item).not.toBeNull()
    const handlers = getHandlers()
    handlers['.token-dropdown-item[data-gap-token]'].click(new MouseEvent('click'), item)
    expect(onPropertyChange).toHaveBeenCalledWith(
      'gap',
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
  it('M1: short-form alias "hor" maps to horizontal mode (catches drop of name.substring fallback)', () => {
    const root = renderSection([{ name: 'hor', value: '' }])
    const hor = root.querySelector('[data-layout="horizontal"]') as HTMLElement
    expect(hor.classList.contains('active')).toBe(true)
  })

  it('M2: wrap row HIDDEN for grid/stacked (catches drop of mode check)', () => {
    const grid = renderSection([{ name: 'grid', value: 'true' }])
    expect(grid.querySelector('[data-wrap]')).toBeNull()
  })

  it('M3: wrap toggle data-wrap encodes the OPPOSITE of current state', () => {
    // If `wrapActive ? 'off' : 'on'` is inverted, the click would not flip.
    const inactive = renderSection([])
    const btn = inactive.querySelector('[data-wrap]') as HTMLElement
    expect(btn.dataset.wrap).toBe('on')
  })

  it('M4: middle-center active for "center" prop OR (ver-center + hor-center)', () => {
    // If isCenter || (vMatch && hMatch) check is mutated to AND, single
    // "center" prop would NOT activate middle-center.
    const root = renderSection([], [{ name: 'center', value: 'true' }])
    const mc = root.querySelector('[data-align="middle-center"]') as HTMLElement
    expect(mc.classList.contains('active')).toBe(true)
  })
})
