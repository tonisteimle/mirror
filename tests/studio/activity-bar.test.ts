// @vitest-environment jsdom
/**
 * Tests for studio/panels/explorer/activity-bar.ts
 *
 * ActivityBar is a vertical icon bar for toggling panel visibility.
 * Previously zero coverage. This pins:
 *  - render emits the expected DOM structure (logo + items + spacer + bottom)
 *  - toggle() flips internal state AND DOM `.active` class
 *  - default activeItems is derived from items where `active !== false`
 *  - bottom items NEVER toggle, only fire callback
 *  - dispose() removes the element + aborts listeners
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ActivityBar,
  createActivityBar,
  ACTIVITY_BAR_ICONS,
  type ActivityBarItem,
} from '../../studio/panels/explorer/activity-bar'

let container: HTMLElement
const items: ActivityBarItem[] = [
  { id: 'files', icon: '<svg id="ic-files"/>', tooltip: 'Files' },
  { id: 'props', icon: '<svg id="ic-props"/>', tooltip: 'Properties', active: false },
  { id: 'preview', icon: '<svg id="ic-preview"/>', tooltip: 'Preview' },
]

beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>'
  container = document.getElementById('host')!
})

describe('ActivityBar — render', () => {
  it('mounts an .activity-bar element with logo + items', () => {
    const bar = createActivityBar({ container, items })
    bar.render()

    const root = container.querySelector('.activity-bar')!
    expect(root).not.toBeNull()
    expect(root.querySelector('.activity-bar-logo')).not.toBeNull()
    expect(root.querySelectorAll('.activity-bar-item')).toHaveLength(3)
  })

  it('uses each item.tooltip as the button title', () => {
    const bar = createActivityBar({ container, items })
    bar.render()
    const filesBtn = container.querySelector('[data-id="files"]') as HTMLElement
    expect(filesBtn.title).toBe('Files')
  })

  it('inlines the SVG string via innerHTML (allows custom icons)', () => {
    const bar = createActivityBar({ container, items })
    bar.render()
    const filesBtn = container.querySelector('[data-id="files"]')!
    expect(filesBtn.innerHTML).toContain('<svg id="ic-files"')
  })

  it('does NOT render bottom-section when bottomItems is empty', () => {
    const bar = createActivityBar({ container, items })
    bar.render()
    expect(container.querySelector('.activity-bar-spacer')).toBeNull()
    expect(container.querySelector('.activity-bar-bottom-item')).toBeNull()
  })

  it('renders bottom items with .activity-bar-bottom-item class + spacer', () => {
    const bar = createActivityBar({
      container,
      items,
      bottomItems: [{ id: 'settings', icon: '<svg/>', tooltip: 'Settings' }],
    })
    bar.render()
    expect(container.querySelector('.activity-bar-spacer')).not.toBeNull()
    const bottomBtn = container.querySelector('.activity-bar-bottom-item')!
    expect(bottomBtn.getAttribute('data-id')).toBe('settings')
    expect((bottomBtn as HTMLElement).title).toBe('Settings')
  })
})

describe('ActivityBar — initial active state', () => {
  it('defaults: every item with active !== false is initially active', () => {
    const bar = createActivityBar({ container, items })
    bar.render()
    expect(bar.isActive('files')).toBe(true) // active default true
    expect(bar.isActive('props')).toBe(false) // active: false explicitly
    expect(bar.isActive('preview')).toBe(true)
  })

  it('explicit activeItems config overrides per-item active flags', () => {
    const bar = createActivityBar({
      container,
      items,
      activeItems: ['props'], // ONLY props active, even though item.active is false
    })
    bar.render()
    expect(bar.isActive('files')).toBe(false)
    expect(bar.isActive('props')).toBe(true)
    expect(bar.isActive('preview')).toBe(false)
  })

  it('reflects initial active state in DOM via .active class', () => {
    const bar = createActivityBar({ container, items, activeItems: ['files'] })
    bar.render()
    expect(container.querySelector('[data-id="files"]')!.classList.contains('active')).toBe(true)
    expect(container.querySelector('[data-id="props"]')!.classList.contains('active')).toBe(false)
  })
})

describe('ActivityBar — toggle()', () => {
  it('toggles internal state AND the .active class on the corresponding button', () => {
    const bar = createActivityBar({ container, items, activeItems: [] })
    bar.render()

    bar.toggle('files')
    expect(bar.isActive('files')).toBe(true)
    expect(container.querySelector('[data-id="files"]')!.classList.contains('active')).toBe(true)

    bar.toggle('files')
    expect(bar.isActive('files')).toBe(false)
    expect(container.querySelector('[data-id="files"]')!.classList.contains('active')).toBe(false)
  })

  it('clicking an item button triggers toggle', () => {
    const bar = createActivityBar({ container, items, activeItems: [] })
    bar.render()
    const btn = container.querySelector('[data-id="files"]') as HTMLElement
    btn.click()
    expect(bar.isActive('files')).toBe(true)
  })

  it('fires onToggle callback with (id, newActiveState)', () => {
    const calls: Array<[string, boolean]> = []
    const bar = createActivityBar(
      { container, items, activeItems: [] },
      { onToggle: (id, active) => calls.push([id, active]) }
    )
    bar.render()

    bar.toggle('files')
    bar.toggle('files')
    expect(calls).toEqual([
      ['files', true],
      ['files', false],
    ])
  })
})

describe('ActivityBar — setActive() (direct, no toggle)', () => {
  it('sets state to the requested value', () => {
    const bar = createActivityBar({ container, items, activeItems: [] })
    bar.render()
    bar.setActive('props', true)
    expect(bar.isActive('props')).toBe(true)
    bar.setActive('props', false)
    expect(bar.isActive('props')).toBe(false)
  })

  it('is a no-op when the requested state matches current — does NOT fire onToggle', () => {
    const calls: string[] = []
    const bar = createActivityBar(
      { container, items, activeItems: ['files'] },
      { onToggle: id => calls.push(id) }
    )
    bar.render()
    bar.setActive('files', true) // already true → no-op
    bar.setActive('preview', false) // already false (no, preview is active by default!)
    // setActive does NOT fire onToggle by design — only toggle() does.
    expect(calls).toEqual([])
  })

  it('updates the DOM .active class to match', () => {
    const bar = createActivityBar({ container, items, activeItems: [] })
    bar.render()
    bar.setActive('files', true)
    expect(container.querySelector('[data-id="files"]')!.classList.contains('active')).toBe(true)
  })
})

describe('ActivityBar — bottom items', () => {
  it('clicking a bottom item fires onBottomItemClick (NOT onToggle)', () => {
    const bottomCalls: string[] = []
    const toggleCalls: string[] = []
    const bar = createActivityBar(
      {
        container,
        items,
        bottomItems: [{ id: 'settings', icon: '<svg/>', tooltip: 'Settings' }],
      },
      {
        onBottomItemClick: id => bottomCalls.push(id),
        onToggle: id => toggleCalls.push(id),
      }
    )
    bar.render()
    const settingsBtn = container.querySelector('[data-id="settings"]') as HTMLElement
    settingsBtn.click()
    expect(bottomCalls).toEqual(['settings'])
    expect(toggleCalls).toEqual([])
  })

  it('bottom items do NOT carry the .active toggle behavior', () => {
    const bar = createActivityBar({
      container,
      items,
      bottomItems: [{ id: 'settings', icon: '<svg/>', tooltip: 'Settings', active: true }],
    })
    bar.render()
    // active flag on bottom item is ignored — they don't track active state.
    expect(bar.isActive('settings')).toBe(false)
    const settingsBtn = container.querySelector('[data-id="settings"]') as HTMLElement
    settingsBtn.click()
    expect(settingsBtn.classList.contains('active')).toBe(false)
  })
})

describe('ActivityBar — getActiveItems', () => {
  it('returns all active items as a fresh array', () => {
    const bar = createActivityBar({ container, items, activeItems: ['files', 'preview'] })
    bar.render()
    expect(bar.getActiveItems().sort()).toEqual(['files', 'preview'])
  })

  it('updates after toggle', () => {
    const bar = createActivityBar({ container, items, activeItems: [] })
    bar.render()
    bar.toggle('props')
    expect(bar.getActiveItems()).toEqual(['props'])
  })
})

describe('ActivityBar — re-render', () => {
  it('a second render() ABORTS prior listeners (clicks on stale buttons no-op)', () => {
    const calls: string[] = []
    const bar = createActivityBar(
      { container, items, activeItems: [] },
      { onToggle: id => calls.push(id) }
    )
    bar.render()
    const staleBtn = container.querySelector('[data-id="files"]') as HTMLElement

    bar.render() // re-render — abort prior listeners

    // Click the STALE node (still in DOM but its listener was aborted).
    staleBtn.click()
    expect(calls).toEqual([])

    // Click the NEW node — listener works.
    const newBtns = container.querySelectorAll('[data-id="files"]')
    const fresh = newBtns[newBtns.length - 1] as HTMLElement
    fresh.click()
    expect(calls).toEqual(['files'])
  })
})

describe('ActivityBar — dispose', () => {
  it('removes the rendered element from the DOM', () => {
    const bar = createActivityBar({ container, items })
    bar.render()
    expect(container.querySelector('.activity-bar')).not.toBeNull()
    bar.dispose()
    expect(container.querySelector('.activity-bar')).toBeNull()
  })

  it('aborts listeners — clicks after dispose are no-ops', () => {
    const calls: string[] = []
    const bar = createActivityBar(
      { container, items, activeItems: [] },
      { onToggle: id => calls.push(id) }
    )
    bar.render()
    const btn = container.querySelector('[data-id="files"]') as HTMLElement
    bar.dispose()
    btn.click() // detached but still triggers click — listener should be aborted
    expect(calls).toEqual([])
  })

  it('is safe to call multiple times', () => {
    const bar = createActivityBar({ container, items })
    bar.render()
    bar.dispose()
    expect(() => bar.dispose()).not.toThrow()
  })
})

describe('ACTIVITY_BAR_ICONS', () => {
  it('exposes the canonical icon set as inline SVG strings', () => {
    expect(ACTIVITY_BAR_ICONS.files).toContain('<svg')
    expect(ACTIVITY_BAR_ICONS.components).toContain('<svg')
    expect(ACTIVITY_BAR_ICONS.designSystem).toContain('<svg')
    expect(ACTIVITY_BAR_ICONS.code).toContain('<svg')
    expect(ACTIVITY_BAR_ICONS.preview).toContain('<svg')
    expect(ACTIVITY_BAR_ICONS.properties).toContain('<svg')
    expect(ACTIVITY_BAR_ICONS.userComponents).toContain('<svg')
    expect(ACTIVITY_BAR_ICONS.settings).toContain('<svg')
  })
})

describe('ActivityBar — direct constructor parity with factory', () => {
  it('createActivityBar() and `new ActivityBar()` produce equivalent instances', () => {
    const a = new ActivityBar({ container, items })
    const b = createActivityBar({ container, items })
    expect(a.isActive('files')).toBe(b.isActive('files'))
    expect(a.getActiveItems().sort()).toEqual(b.getActiveItems().sort())
  })
})
