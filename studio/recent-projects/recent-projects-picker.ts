/**
 * Recent Projects Picker — Cmd+Shift+O quick-switch for the Tauri shell.
 *
 * Tauri-only. Opens a floating overlay listing the paths returned by
 * `TauriProject.getRecentProjects()`, lets the user pick one with arrow
 * keys or click, and switches the workspace to it via
 * `TauriProject.openProject(path)` + a fresh reload.
 *
 * Slice 4 of the Tauri-Commit-Plan (`docs/concepts/tauri-strategy.md`).
 * Keyboard contract is a deliberate echo of the file-palette
 * (`studio/file-palette/`) so the user only has to learn one paradigm:
 *
 *   Cmd/Ctrl+Shift+O → open (or close if already open — toggle)
 *   ↑ / ↓            → move highlight (wraps at ends)
 *   Enter            → openProject + reload
 *   Esc              → close without switching
 *   click-out        → close without switching
 *   click on item    → openProject + reload (mousedown so focus doesn't drop first)
 *
 * The list is loaded fresh on every open so a project added during the
 * session shows up immediately. No filter (the recent list is rarely
 * larger than 20 entries — if it grows, add a substring filter).
 */

import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('RecentProjectsPicker')

export interface RecentProjectsPickerConfig {
  /** Snapshot the recent-projects list. Called on every open so
   *  additions during the session show up without re-wiring. Throws or
   *  rejects → picker shows an empty-state with the error message. */
  getRecentProjects: () => Promise<string[]>
  /** Open the chosen project as the active workspace. The implementor
   *  is responsible for reloading the app afterwards (mirror file-tree
   *  state etc.). */
  openProject: (path: string) => Promise<void>
}

export interface RecentProjectsPickerController {
  open(): void
  close(): void
  isOpen(): boolean
  dispose(): void
}

export function createRecentProjectsPicker(
  config: RecentProjectsPickerConfig
): RecentProjectsPickerController {
  let backdrop: HTMLDivElement | null = null
  let listEl: HTMLUListElement | null = null
  let highlighted = 0
  let projects: string[] = []
  let previouslyFocused: HTMLElement | null = null

  function build(): void {
    backdrop = document.createElement('div')
    backdrop.className = 'recent-projects-backdrop'
    backdrop.addEventListener('mousedown', e => {
      if (e.target === backdrop) close()
    })
    backdrop.addEventListener('keydown', handleKey)

    const panel = document.createElement('div')
    panel.className = 'recent-projects-panel'

    const header = document.createElement('div')
    header.className = 'recent-projects-header'
    header.textContent = 'Recent Projects'
    panel.appendChild(header)

    listEl = document.createElement('ul')
    listEl.className = 'recent-projects-list'
    listEl.tabIndex = 0 // so the panel can receive keydown
    listEl.addEventListener('mousedown', e => {
      const target = (e.target as HTMLElement).closest<HTMLLIElement>('.recent-projects-item')
      if (target?.dataset.path) {
        e.preventDefault()
        confirmPath(target.dataset.path)
      }
    })

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
      if (projects.length === 0) return
      highlighted = (highlighted + 1) % projects.length
      paintHighlight()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (projects.length === 0) return
      highlighted = (highlighted - 1 + projects.length) % projects.length
      paintHighlight()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const pick = projects[highlighted]
      if (pick) confirmPath(pick)
      return
    }
  }

  function renderList(items: string[]): void {
    if (!listEl) return
    listEl.innerHTML = ''
    if (items.length === 0) {
      const empty = document.createElement('li')
      empty.className = 'recent-projects-empty'
      empty.textContent = 'Keine Projekte zuletzt geöffnet'
      listEl.appendChild(empty)
      return
    }

    for (let i = 0; i < items.length; i++) {
      const li = document.createElement('li')
      li.className = 'recent-projects-item' + (i === highlighted ? ' is-highlighted' : '')
      li.dataset.path = items[i]
      // Render the project basename prominently and the parent dir as
      // a dim secondary line — full path is too noisy for ~20 entries
      // but we lose disambiguation if two projects share a name. The
      // parent-dir line solves that without dominating.
      const slashIdx = Math.max(items[i].lastIndexOf('/'), items[i].lastIndexOf('\\'))
      const basename = slashIdx >= 0 ? items[i].slice(slashIdx + 1) : items[i]
      const parent = slashIdx >= 0 ? items[i].slice(0, slashIdx) : ''
      const nameSpan = document.createElement('span')
      nameSpan.className = 'recent-projects-name'
      nameSpan.textContent = basename
      const parentSpan = document.createElement('span')
      parentSpan.className = 'recent-projects-parent'
      parentSpan.textContent = parent
      li.appendChild(nameSpan)
      if (parent) li.appendChild(parentSpan)
      listEl.appendChild(li)
    }
  }

  function paintHighlight(): void {
    if (!listEl) return
    const items = listEl.querySelectorAll<HTMLLIElement>('.recent-projects-item')
    items.forEach((el, idx) => {
      el.classList.toggle('is-highlighted', idx === highlighted)
    })
    const target = items[highlighted]
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest' })
    }
  }

  function confirmPath(path: string): void {
    close()
    config.openProject(path).catch(err => {
      log.warn('openProject threw:', err)
    })
  }

  async function open(): Promise<void> {
    if (backdrop && backdrop.isConnected) return
    if (!backdrop) build()
    if (!backdrop || !listEl) return
    previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
    document.body.appendChild(backdrop)
    highlighted = 0

    // Render a placeholder while the recents-list resolves so the user
    // sees the panel immediately (Tauri IPC can take ~100ms cold).
    projects = []
    const loading = document.createElement('li')
    loading.className = 'recent-projects-empty'
    loading.textContent = 'Lade…'
    listEl.innerHTML = ''
    listEl.appendChild(loading)
    listEl.focus()

    try {
      projects = await config.getRecentProjects()
    } catch (err) {
      log.warn('getRecentProjects threw:', err)
      projects = []
      if (listEl) {
        listEl.innerHTML = ''
        const errEl = document.createElement('li')
        errEl.className = 'recent-projects-empty'
        errEl.textContent = `Fehler beim Laden: ${err instanceof Error ? err.message : String(err)}`
        listEl.appendChild(errEl)
      }
      return
    }
    renderList(projects)
  }

  function close(): void {
    if (!backdrop || !backdrop.isConnected) return
    backdrop.remove()
    previouslyFocused?.focus()
    previouslyFocused = null
  }

  function isOpen(): boolean {
    return !!backdrop?.isConnected
  }

  function dispose(): void {
    close()
    backdrop = null
    listEl = null
  }

  return {
    open: () => {
      void open()
    },
    close,
    isOpen,
    dispose,
  }
}
