/**
 * Project Toolbar
 *
 * Toolbar im File Explorer Header mit Projekt-Aktionen:
 * - New: Neues leeres Projekt
 * - Demo: Demo-Projekt laden
 * - Load: Projekt-Ordner importieren
 * - Save: Projekt exportieren (ZIP)
 */

import { projectActions } from '../storage'

// =============================================================================
// Icons (16x16 SVG)
// =============================================================================

const ICONS = {
  new: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>`,

  demo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`,

  load: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>`,

  save: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`,
}

// =============================================================================
// Component
// =============================================================================

export interface ProjectToolbarConfig {
  container: HTMLElement
}

export class ProjectToolbar {
  private container: HTMLElement

  constructor(config: ProjectToolbarConfig) {
    this.container = config.container
  }

  render(): void {
    this.container.innerHTML = ''
    this.container.className = 'project-toolbar'

    // Label
    const label = document.createElement('span')
    label.className = 'project-toolbar-label'
    label.textContent = 'Files'
    this.container.appendChild(label)

    // Spacer
    const spacer = document.createElement('div')
    spacer.className = 'project-toolbar-spacer'
    this.container.appendChild(spacer)

    // Buttons
    this.addButton('new', 'Neues Projekt', ICONS.new, this.handleNew)
    this.addButton('demo', 'Demo-Projekt', ICONS.demo, this.handleDemo)
    this.addButton('load', 'Projekt laden', ICONS.load, this.handleLoad)
    this.addButton('save', 'Projekt speichern', ICONS.save, this.handleSave)
  }

  private addButton(
    id: string,
    title: string,
    icon: string,
    handler: () => void
  ): void {
    const btn = document.createElement('button')
    btn.className = 'project-toolbar-btn'
    btn.id = `project-${id}-btn`
    btn.title = title
    btn.innerHTML = icon
    btn.addEventListener('click', handler.bind(this))
    this.container.appendChild(btn)
  }

  // ===========================================================================
  // Handlers
  // ===========================================================================

  private async handleNew(): Promise<void> {
    if (!confirm('Neues Projekt erstellen? Alle aktuellen Änderungen gehen verloren.')) {
      return
    }
    await projectActions.new()
  }

  private async handleDemo(): Promise<void> {
    if (!confirm('Demo-Projekt laden? Alle aktuellen Änderungen gehen verloren.')) {
      return
    }
    await projectActions.demo()
  }

  private async handleLoad(): Promise<void> {
    await projectActions.import()
  }

  private async handleSave(): Promise<void> {
    await projectActions.export()
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createProjectToolbar(config: ProjectToolbarConfig): ProjectToolbar {
  const toolbar = new ProjectToolbar(config)
  toolbar.render()
  return toolbar
}
