/**
 * File Palette — Cmd+P quick-switch UI.
 *
 * Floating overlay that lists every file in the current project, lets
 * the user filter by typing, and switches to the chosen file on Enter.
 * Keyboard-only flow:
 *
 *   Cmd/Ctrl+P  → open (autofocus the search input)
 *   ↑ / ↓       → move highlight
 *   Enter       → switch to highlighted file + close
 *   Esc         → close without switching
 *   click-out   → close without switching
 *
 * Filter is a simple lowercase substring match against the filename.
 * Order: matches that start with the query first, then everything else
 * with a match anywhere.
 *
 * Tracked in docs/findings.md ("Tutorial-Blocking Gaps") — Chapter 24
 * of the Studio tutorial demos this flow.
 */

import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('FilePalette')

export interface FilePaletteConfig {
  /** Snapshot the current file list. Called on every open + on every
   *  filter change so additions/renames during long sessions show up
   *  without rewiring. */
  getFiles: () => string[]
  /** Optional accessor for the active file — used to skip listing
   *  the current file as the top match (less surprising in arrow-nav). */
  getCurrentFile?: () => string | null
  /** Called with the chosen filename when the user hits Enter. */
  switchFile: (name: string) => void
}

export interface FilePaletteController {
  open(): void
  close(): void
  isOpen(): boolean
  dispose(): void
}

export function createFilePalette(config: FilePaletteConfig): FilePaletteController {
  let backdrop: HTMLDivElement | null = null
  let input: HTMLInputElement | null = null
  let listEl: HTMLUListElement | null = null
  let highlighted = 0
  let filtered: string[] = []
  let previouslyFocused: HTMLElement | null = null

  function build(): void {
    backdrop = document.createElement('div')
    backdrop.className = 'file-palette-backdrop'
    backdrop.addEventListener('mousedown', e => {
      if (e.target === backdrop) close()
    })

    const panel = document.createElement('div')
    panel.className = 'file-palette'

    input = document.createElement('input')
    input.type = 'text'
    input.className = 'file-palette-input'
    input.placeholder = 'Switch file…'
    input.spellcheck = false
    input.autocomplete = 'off'
    input.addEventListener('input', () => {
      highlighted = 0
      render()
    })
    input.addEventListener('keydown', handleKey)

    listEl = document.createElement('ul')
    listEl.className = 'file-palette-list'
    listEl.addEventListener('mousedown', e => {
      // Use mousedown — click loses focus to the editor before we can
      // dispatch switchFile. mousedown also fires before the input
      // blur, so the highlight stays meaningful for confirm().
      const target = (e.target as HTMLElement).closest<HTMLLIElement>('.file-palette-item')
      if (target?.dataset.name) {
        e.preventDefault()
        confirmName(target.dataset.name)
      }
    })

    panel.appendChild(input)
    panel.appendChild(listEl)
    backdrop.appendChild(panel)
  }

  function handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length === 0) return
      highlighted = (highlighted + 1) % filtered.length
      paintHighlight()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length === 0) return
      highlighted = (highlighted - 1 + filtered.length) % filtered.length
      paintHighlight()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const pick = filtered[highlighted]
      if (pick) confirmName(pick)
      return
    }
  }

  function render(): void {
    if (!listEl || !input) return
    const query = input.value.trim().toLowerCase()
    const all = config.getFiles()
    const current = config.getCurrentFile?.() ?? null

    if (query === '') {
      // Empty query: list every file, current file at the bottom so the
      // top selection is always "switch to a different file".
      filtered = current
        ? [...all.filter(f => f !== current), ...(all.includes(current) ? [current] : [])]
        : all.slice()
    } else {
      const startsWith: string[] = []
      const contains: string[] = []
      for (const f of all) {
        const lower = f.toLowerCase()
        if (lower.startsWith(query)) startsWith.push(f)
        else if (lower.includes(query)) contains.push(f)
      }
      filtered = [...startsWith, ...contains]
    }

    if (highlighted >= filtered.length) highlighted = Math.max(0, filtered.length - 1)

    listEl.innerHTML = ''
    if (filtered.length === 0) {
      const empty = document.createElement('li')
      empty.className = 'file-palette-empty'
      empty.textContent = 'No matches'
      listEl.appendChild(empty)
      return
    }

    for (let i = 0; i < filtered.length; i++) {
      const li = document.createElement('li')
      li.className = 'file-palette-item' + (i === highlighted ? ' is-highlighted' : '')
      li.dataset.name = filtered[i]
      if (filtered[i] === current) li.classList.add('is-current')
      li.textContent = filtered[i]
      listEl.appendChild(li)
    }
  }

  function paintHighlight(): void {
    if (!listEl) return
    const items = listEl.querySelectorAll<HTMLLIElement>('.file-palette-item')
    items.forEach((el, idx) => {
      el.classList.toggle('is-highlighted', idx === highlighted)
    })
    // jsdom doesn't implement scrollIntoView — only call it when available.
    const target = items[highlighted]
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest' })
    }
  }

  function confirmName(name: string): void {
    close()
    try {
      config.switchFile(name)
    } catch (err) {
      log.warn('switchFile threw:', err)
    }
  }

  function open(): void {
    if (backdrop && backdrop.isConnected) return
    if (!backdrop) build()
    if (!backdrop || !input) return
    previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
    document.body.appendChild(backdrop)
    input.value = ''
    highlighted = 0
    render()
    // Focus after the element is in the DOM tree.
    input.focus()
  }

  function close(): void {
    if (!backdrop || !backdrop.isConnected) return
    backdrop.remove()
    // Return focus to whatever had it before — usually the editor.
    previouslyFocused?.focus()
    previouslyFocused = null
  }

  function isOpen(): boolean {
    return !!backdrop?.isConnected
  }

  function dispose(): void {
    close()
    backdrop = null
    input = null
    listEl = null
  }

  return { open, close, isOpen, dispose }
}
