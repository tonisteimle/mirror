/**
 * File Palette tests — Cmd+P quick-switch UI behaviour.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFilePalette } from '../../studio/file-palette'

function setup(opts?: {
  files?: string[]
  current?: string | null
  switchFile?: (name: string) => void
}) {
  const switchFile = opts?.switchFile ?? vi.fn()
  const palette = createFilePalette({
    getFiles: () => opts?.files ?? ['app.mir', 'tokens.tok', 'components.com'],
    getCurrentFile: () => opts?.current ?? 'app.mir',
    switchFile,
  })
  return { palette, switchFile }
}

function getInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('.file-palette-input')!
}

function getItems(): HTMLLIElement[] {
  return Array.from(document.querySelectorAll<HTMLLIElement>('.file-palette-item'))
}

function highlighted(): HTMLLIElement | null {
  return document.querySelector<HTMLLIElement>('.file-palette-item.is-highlighted')
}

function pressKey(key: string): void {
  const input = getInput()
  const evt = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  input.dispatchEvent(evt)
}

describe('FilePalette', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('open / close lifecycle', () => {
    it('open() mounts the palette and focuses the input', () => {
      const { palette } = setup()
      expect(palette.isOpen()).toBe(false)
      palette.open()
      expect(palette.isOpen()).toBe(true)
      expect(document.querySelector('.file-palette')).not.toBeNull()
      expect(document.activeElement).toBe(getInput())
    })

    it('close() removes the palette from the DOM', () => {
      const { palette } = setup()
      palette.open()
      palette.close()
      expect(palette.isOpen()).toBe(false)
      expect(document.querySelector('.file-palette')).toBeNull()
    })

    it('open() while already open is a no-op', () => {
      const { palette } = setup()
      palette.open()
      const firstEl = document.querySelector('.file-palette')
      palette.open()
      expect(document.querySelector('.file-palette')).toBe(firstEl)
    })

    it('Escape closes without dispatching switchFile', () => {
      const switchFile = vi.fn()
      const { palette } = setup({ switchFile })
      palette.open()
      pressKey('Escape')
      expect(palette.isOpen()).toBe(false)
      expect(switchFile).not.toHaveBeenCalled()
    })

    it('mousedown on the backdrop closes the palette', () => {
      const { palette, switchFile } = setup()
      palette.open()
      const backdrop = document.querySelector<HTMLElement>('.file-palette-backdrop')!
      backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      expect(palette.isOpen()).toBe(false)
      expect(switchFile).not.toHaveBeenCalled()
    })
  })

  describe('initial render', () => {
    it('lists every file with the current file at the bottom', () => {
      const { palette } = setup({
        files: ['a.mir', 'b.mir', 'c.mir'],
        current: 'b.mir',
      })
      palette.open()
      const items = getItems()
      expect(items.map(el => el.textContent)).toEqual(['a.mir', 'c.mir', 'b.mir'])
    })

    it('marks the current file with .is-current', () => {
      const { palette } = setup({ files: ['a.mir', 'b.mir'], current: 'a.mir' })
      palette.open()
      const current = document.querySelector<HTMLLIElement>('.file-palette-item.is-current')
      expect(current?.dataset.name).toBe('a.mir')
    })

    it('highlights the first item by default', () => {
      const { palette } = setup({ files: ['a.mir', 'b.mir'], current: 'a.mir' })
      palette.open()
      expect(highlighted()?.dataset.name).toBe('b.mir')
    })

    it('shows "No matches" when the file list is empty', () => {
      const { palette } = setup({ files: [], current: null })
      palette.open()
      const empty = document.querySelector('.file-palette-empty')
      expect(empty?.textContent).toBe('No matches')
    })
  })

  describe('filter', () => {
    it('startsWith matches outrank substring matches', () => {
      const { palette } = setup({
        files: ['app.mir', 'snap.mir', 'wrap-app.mir'],
        current: null,
      })
      palette.open()
      const input = getInput()
      input.value = 'ap'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      const names = getItems().map(el => el.dataset.name)
      // "app.mir" starts with "ap" → first; the others contain it.
      expect(names[0]).toBe('app.mir')
      expect(names).toContain('snap.mir')
      expect(names).toContain('wrap-app.mir')
    })

    it('case-insensitive substring match', () => {
      const { palette } = setup({ files: ['ProjectA.mir', 'projectb.mir'], current: null })
      palette.open()
      const input = getInput()
      input.value = 'PROJECT'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      expect(getItems().length).toBe(2)
    })

    it('shows "No matches" when nothing matches', () => {
      const { palette } = setup()
      palette.open()
      const input = getInput()
      input.value = 'zzzzz'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      expect(document.querySelector('.file-palette-empty')).not.toBeNull()
    })
  })

  describe('keyboard navigation', () => {
    it('ArrowDown moves the highlight forward, wrapping at the end', () => {
      const { palette } = setup({ files: ['a.mir', 'b.mir', 'c.mir'], current: null })
      palette.open()
      expect(highlighted()?.dataset.name).toBe('a.mir')
      pressKey('ArrowDown')
      expect(highlighted()?.dataset.name).toBe('b.mir')
      pressKey('ArrowDown')
      expect(highlighted()?.dataset.name).toBe('c.mir')
      pressKey('ArrowDown')
      expect(highlighted()?.dataset.name).toBe('a.mir') // wrapped
    })

    it('ArrowUp moves the highlight backward, wrapping at the start', () => {
      const { palette } = setup({ files: ['a.mir', 'b.mir'], current: null })
      palette.open()
      pressKey('ArrowUp')
      expect(highlighted()?.dataset.name).toBe('b.mir') // wrapped
    })

    it('Enter switches to the highlighted file and closes', () => {
      const switchFile = vi.fn()
      const { palette } = setup({
        files: ['a.mir', 'b.mir', 'c.mir'],
        current: null,
        switchFile,
      })
      palette.open()
      pressKey('ArrowDown')
      pressKey('Enter')
      expect(switchFile).toHaveBeenCalledWith('b.mir')
      expect(palette.isOpen()).toBe(false)
    })

    it('Enter on an empty filtered list is a no-op', () => {
      const switchFile = vi.fn()
      const { palette } = setup({ files: [], current: null, switchFile })
      palette.open()
      pressKey('Enter')
      expect(switchFile).not.toHaveBeenCalled()
    })
  })

  describe('mouse selection', () => {
    it('mousedown on an item dispatches switchFile', () => {
      const switchFile = vi.fn()
      const { palette } = setup({ switchFile })
      palette.open()
      const items = getItems()
      const target = items.find(el => el.dataset.name === 'tokens.tok')!
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      expect(switchFile).toHaveBeenCalledWith('tokens.tok')
      expect(palette.isOpen()).toBe(false)
    })
  })

  describe('switchFile error handling', () => {
    it('survives switchFile throwing', () => {
      const switchFile = vi.fn(() => {
        throw new Error('boom')
      })
      const { palette } = setup({ switchFile })
      palette.open()
      expect(() => pressKey('Enter')).not.toThrow()
      expect(palette.isOpen()).toBe(false) // closed before the throw
    })
  })

  describe('dispose', () => {
    it('removes the palette and frees references', () => {
      const { palette } = setup()
      palette.open()
      palette.dispose()
      expect(document.querySelector('.file-palette')).toBeNull()
      expect(palette.isOpen()).toBe(false)
    })
  })
})
