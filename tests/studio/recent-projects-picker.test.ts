/**
 * Recent Projects Picker tests — Cmd+Shift+O quick-switch UI behaviour
 * (Tauri-only in production; browser path no-ops via empty-list).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRecentProjectsPicker } from '../../studio/recent-projects'

function setup(opts?: {
  recents?: string[] | (() => Promise<string[]>)
  openProject?: (path: string) => Promise<void>
}) {
  const openProject = opts?.openProject ?? vi.fn().mockResolvedValue(undefined)
  const getRecentProjects =
    typeof opts?.recents === 'function'
      ? opts.recents
      : async () => opts?.recents ?? ['/Users/x/proj-a', '/Users/x/work/proj-b']
  const picker = createRecentProjectsPicker({ getRecentProjects, openProject })
  return { picker, openProject }
}

function getList(): HTMLUListElement | null {
  return document.querySelector<HTMLUListElement>('.recent-projects-list')
}

function getItems(): HTMLLIElement[] {
  return Array.from(document.querySelectorAll<HTMLLIElement>('.recent-projects-item'))
}

function highlighted(): HTMLLIElement | null {
  return document.querySelector<HTMLLIElement>('.recent-projects-item.is-highlighted')
}

function pressKey(key: string): void {
  const list = getList()
  if (!list) return
  list.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

async function flushPromises(): Promise<void> {
  // The picker's open() awaits getRecentProjects then renders. Two
  // microtask flushes are enough since there's only the one await chain.
  await Promise.resolve()
  await Promise.resolve()
}

describe('RecentProjectsPicker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('open / close lifecycle', () => {
    it('open() mounts the panel and shows the loading placeholder', () => {
      const { picker } = setup()
      expect(picker.isOpen()).toBe(false)
      picker.open()
      expect(picker.isOpen()).toBe(true)
      expect(document.querySelector('.recent-projects-panel')).not.toBeNull()
      expect(document.querySelector('.recent-projects-empty')?.textContent).toBe('Lade…')
    })

    it('close() removes the panel from the DOM', async () => {
      const { picker } = setup()
      picker.open()
      await flushPromises()
      picker.close()
      expect(picker.isOpen()).toBe(false)
      expect(document.querySelector('.recent-projects-panel')).toBeNull()
    })

    it('open() while already open is a no-op', async () => {
      const { picker } = setup()
      picker.open()
      await flushPromises()
      const firstEl = document.querySelector('.recent-projects-panel')
      picker.open()
      await flushPromises()
      expect(document.querySelector('.recent-projects-panel')).toBe(firstEl)
    })

    it('Escape closes without dispatching openProject', async () => {
      const openProject = vi.fn().mockResolvedValue(undefined)
      const { picker } = setup({ openProject })
      picker.open()
      await flushPromises()
      pressKey('Escape')
      expect(picker.isOpen()).toBe(false)
      expect(openProject).not.toHaveBeenCalled()
    })

    it('mousedown on the backdrop closes the picker', async () => {
      const { picker, openProject } = setup()
      picker.open()
      await flushPromises()
      const backdrop = document.querySelector<HTMLElement>('.recent-projects-backdrop')!
      backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      expect(picker.isOpen()).toBe(false)
      expect(openProject).not.toHaveBeenCalled()
    })
  })

  describe('list rendering', () => {
    it('renders one item per recent path with basename + parent dir', async () => {
      const { picker } = setup({
        recents: ['/Users/x/work/alpha', '/Users/x/beta'],
      })
      picker.open()
      await flushPromises()
      const items = getItems()
      expect(items.length).toBe(2)
      expect(items[0].dataset.path).toBe('/Users/x/work/alpha')
      const name0 = items[0].querySelector('.recent-projects-name')?.textContent
      const parent0 = items[0].querySelector('.recent-projects-parent')?.textContent
      expect(name0).toBe('alpha')
      expect(parent0).toBe('/Users/x/work')
      expect(items[1].dataset.path).toBe('/Users/x/beta')
    })

    it('handles paths with no slash (basename only, no parent line)', async () => {
      const { picker } = setup({ recents: ['solo-project'] })
      picker.open()
      await flushPromises()
      const item = getItems()[0]
      expect(item.querySelector('.recent-projects-name')?.textContent).toBe('solo-project')
      expect(item.querySelector('.recent-projects-parent')).toBeNull()
    })

    it('shows empty-state when the recents list is empty', async () => {
      const { picker } = setup({ recents: [] })
      picker.open()
      await flushPromises()
      const empty = document.querySelector('.recent-projects-empty')
      expect(empty?.textContent).toMatch(/Keine Projekte/)
    })

    it('shows error-state when getRecentProjects rejects', async () => {
      const { picker } = setup({
        recents: async () => {
          throw new Error('IPC failed')
        },
      })
      picker.open()
      await flushPromises()
      const empty = document.querySelector('.recent-projects-empty')
      expect(empty?.textContent).toMatch(/Fehler beim Laden.*IPC failed/)
    })

    it('highlights the first item by default', async () => {
      const { picker } = setup({ recents: ['/a', '/b', '/c'] })
      picker.open()
      await flushPromises()
      expect(highlighted()?.dataset.path).toBe('/a')
    })
  })

  describe('keyboard navigation', () => {
    it('ArrowDown moves the highlight forward, wrapping at the end', async () => {
      const { picker } = setup({ recents: ['/a', '/b', '/c'] })
      picker.open()
      await flushPromises()
      pressKey('ArrowDown')
      expect(highlighted()?.dataset.path).toBe('/b')
      pressKey('ArrowDown')
      expect(highlighted()?.dataset.path).toBe('/c')
      pressKey('ArrowDown')
      expect(highlighted()?.dataset.path).toBe('/a') // wrapped
    })

    it('ArrowUp wraps at the start', async () => {
      const { picker } = setup({ recents: ['/a', '/b'] })
      picker.open()
      await flushPromises()
      pressKey('ArrowUp')
      expect(highlighted()?.dataset.path).toBe('/b') // wrapped
    })

    it('Enter dispatches openProject for the highlighted path and closes', async () => {
      const openProject = vi.fn().mockResolvedValue(undefined)
      const { picker } = setup({ recents: ['/a', '/b'], openProject })
      picker.open()
      await flushPromises()
      pressKey('ArrowDown')
      pressKey('Enter')
      expect(openProject).toHaveBeenCalledWith('/b')
      expect(picker.isOpen()).toBe(false)
    })

    it('Enter on an empty list is a no-op', async () => {
      const openProject = vi.fn().mockResolvedValue(undefined)
      const { picker } = setup({ recents: [], openProject })
      picker.open()
      await flushPromises()
      pressKey('Enter')
      expect(openProject).not.toHaveBeenCalled()
    })

    it('Arrow keys are no-ops on empty list (do not throw)', async () => {
      const { picker } = setup({ recents: [] })
      picker.open()
      await flushPromises()
      expect(() => pressKey('ArrowDown')).not.toThrow()
      expect(() => pressKey('ArrowUp')).not.toThrow()
    })
  })

  describe('mouse selection', () => {
    it('mousedown on an item dispatches openProject + closes', async () => {
      const openProject = vi.fn().mockResolvedValue(undefined)
      const { picker } = setup({ recents: ['/a', '/b'], openProject })
      picker.open()
      await flushPromises()
      const target = getItems().find(el => el.dataset.path === '/b')!
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      expect(openProject).toHaveBeenCalledWith('/b')
      expect(picker.isOpen()).toBe(false)
    })
  })

  describe('error tolerance', () => {
    it('survives openProject throwing', async () => {
      const openProject = vi.fn().mockRejectedValue(new Error('boom'))
      const { picker } = setup({ recents: ['/a'], openProject })
      picker.open()
      await flushPromises()
      expect(() => pressKey('Enter')).not.toThrow()
      expect(picker.isOpen()).toBe(false) // closed before the throw
    })
  })

  describe('dispose', () => {
    it('removes the panel and resets isOpen', async () => {
      const { picker } = setup()
      picker.open()
      await flushPromises()
      picker.dispose()
      expect(document.querySelector('.recent-projects-panel')).toBeNull()
      expect(picker.isOpen()).toBe(false)
    })
  })
})
