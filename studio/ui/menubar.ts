/**
 * App Menubar (Web)
 *
 * Renders a macOS-style top-of-window menubar with File and View
 * dropdowns. Visible in the browser only — hidden in Tauri, where
 * the native macOS menubar takes over (the bar would otherwise
 * duplicate what's already in the OS menubar).
 *
 * The menu structure mirrors the native menu (src-tauri/src/main.rs)
 * so users see the same entries in both environments. Actions
 * dispatch to the existing project-actions / panel-visibility APIs
 * — no parallel command layer.
 */

import { projectActions } from '../storage'
import { actions as studioActions, state, type PanelVisibility } from '../core/state'
import { createLogger } from '../../compiler'

const log = createLogger('Menubar')

declare const MirrorDialog: {
  confirm: (message: string, options?: { title?: string }) => Promise<boolean>
  choose: <T>(
    message: string,
    choices: Array<{ label: string; value: T; primary?: boolean }>,
    options?: { title?: string; cancelLabel?: string }
  ) => Promise<T | null>
}

// =============================================================================
// Menu Spec
// =============================================================================

type PanelKey = keyof PanelVisibility

interface MenuItem {
  id: string
  label: string
  shortcut?: string
  separator?: false
  /** For View items only — the panel-visibility key to toggle. */
  panel?: PanelKey
}

interface MenuSeparator {
  separator: true
}

type MenuEntry = MenuItem | MenuSeparator

interface MenuSection {
  title: string
  items: MenuEntry[]
}

const SHORTCUT_MOD = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl+'

const MENU: MenuSection[] = [
  {
    title: 'Datei',
    items: [
      { id: 'new', label: 'Neues Projekt' },
      { id: 'demo', label: 'Demo-Projekt' },
      { separator: true },
      { id: 'import', label: 'Projekt öffnen…', shortcut: `${SHORTCUT_MOD}O` },
      { id: 'export', label: 'Projekt speichern…', shortcut: `${SHORTCUT_MOD}S` },
    ],
  },
  {
    title: 'Ansicht',
    items: [
      { id: 'toggle_prompt', label: 'Prompt', panel: 'prompt' },
      { id: 'toggle_files', label: 'Files', panel: 'files' },
      { id: 'toggle_code', label: 'Code', panel: 'code' },
      { id: 'toggle_components', label: 'Components', panel: 'components' },
      { id: 'toggle_preview', label: 'Preview', panel: 'preview' },
      { id: 'toggle_property', label: 'Properties', panel: 'property' },
    ],
  },
]

// =============================================================================
// State
// =============================================================================

let openTitle: string | null = null
let openDropdown: HTMLElement | null = null
let openTrigger: HTMLButtonElement | null = null
let outsideHandler: ((e: MouseEvent) => void) | null = null

// =============================================================================
// Render
// =============================================================================

export function renderMenubar(container: HTMLElement): void {
  container.innerHTML = ''
  container.classList.add('app-menubar')

  for (const section of MENU) {
    const trigger = document.createElement('button')
    trigger.className = 'app-menubar-trigger'
    trigger.type = 'button'
    trigger.textContent = section.title
    trigger.dataset.section = section.title

    trigger.addEventListener('click', e => {
      e.stopPropagation()
      if (openTitle === section.title) {
        closeMenu()
      } else {
        openMenu(section, trigger)
      }
    })

    trigger.addEventListener('mouseenter', () => {
      // If any menu is already open, hover switches to this section
      // (macOS-style menubar behaviour).
      if (openTitle && openTitle !== section.title) {
        openMenu(section, trigger)
      }
    })

    container.appendChild(trigger)
  }
}

function openMenu(section: MenuSection, trigger: HTMLButtonElement): void {
  closeMenu()

  const dropdown = document.createElement('div')
  dropdown.className = 'app-menubar-dropdown'
  dropdown.setAttribute('role', 'menu')

  for (const entry of section.items) {
    if ('separator' in entry && entry.separator) {
      const sep = document.createElement('div')
      sep.className = 'app-menubar-separator'
      dropdown.appendChild(sep)
      continue
    }
    const item = entry as MenuItem
    const btn = document.createElement('button')
    btn.className = 'app-menubar-item'
    btn.type = 'button'
    btn.dataset.id = item.id
    btn.setAttribute('role', 'menuitem')

    const check = document.createElement('span')
    check.className = 'app-menubar-check'
    if (item.panel) {
      const visible = state.get().panelVisibility[item.panel]
      check.textContent = visible ? '✓' : ''
    }
    btn.appendChild(check)

    const label = document.createElement('span')
    label.className = 'app-menubar-label'
    label.textContent = item.label
    btn.appendChild(label)

    if (item.shortcut) {
      const shortcut = document.createElement('span')
      shortcut.className = 'app-menubar-shortcut'
      shortcut.textContent = item.shortcut
      btn.appendChild(shortcut)
    }

    btn.addEventListener('click', () => {
      closeMenu()
      void handleAction(item)
    })

    dropdown.appendChild(btn)
  }

  // Position right below the trigger, left edge aligned.
  const rect = trigger.getBoundingClientRect()
  dropdown.style.position = 'fixed'
  dropdown.style.top = `${rect.bottom}px`
  dropdown.style.left = `${rect.left}px`

  document.body.appendChild(dropdown)
  trigger.classList.add('is-open')

  openTitle = section.title
  openDropdown = dropdown
  openTrigger = trigger

  outsideHandler = (e: MouseEvent) => {
    const target = e.target as Node | null
    if (!target) return
    if (dropdown.contains(target)) return
    if (trigger.contains(target)) return
    closeMenu()
  }
  // Defer so the click that opened the menu isn't immediately treated as outside.
  setTimeout(() => {
    if (outsideHandler) document.addEventListener('click', outsideHandler)
  }, 0)
}

function closeMenu(): void {
  if (openDropdown) {
    openDropdown.remove()
    openDropdown = null
  }
  if (openTrigger) {
    openTrigger.classList.remove('is-open')
    openTrigger = null
  }
  if (outsideHandler) {
    document.removeEventListener('click', outsideHandler)
    outsideHandler = null
  }
  openTitle = null
}

// =============================================================================
// Actions
// =============================================================================

async function handleAction(item: MenuItem): Promise<void> {
  if (item.panel) {
    studioActions.togglePanelVisibility(item.panel)
    return
  }

  switch (item.id) {
    case 'new': {
      try {
        const choice = await MirrorDialog.choose<'empty' | 'demo'>(
          'Alle aktuellen Änderungen gehen verloren.',
          [
            { label: 'Leeres Projekt', value: 'empty' },
            { label: 'Demo-Projekt', value: 'demo', primary: true },
          ],
          { title: 'Neues Projekt erstellen' }
        )
        if (choice === null) return
        await projectActions.new(choice)
      } catch (err) {
        log.error('new project failed:', err)
      }
      break
    }
    case 'demo': {
      try {
        const ok = await MirrorDialog.confirm('Alle aktuellen Änderungen gehen verloren.', {
          title: 'Demo-Projekt laden?',
        })
        if (!ok) return
        await projectActions.demo()
      } catch (err) {
        log.error('demo load failed:', err)
      }
      break
    }
    case 'import':
      try {
        await projectActions.import()
      } catch (err) {
        log.error('import failed:', err)
      }
      break
    case 'export':
      try {
        await projectActions.export()
      } catch (err) {
        log.error('export failed:', err)
      }
      break
    default:
      log.warn('Unhandled menu action:', item.id)
  }
}
