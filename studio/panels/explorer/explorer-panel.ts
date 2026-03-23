/**
 * Explorer Panel - Container for Activity Bar + switchable views
 *
 * Manages Files view and Components view, with Activity Bar for switching.
 */

import { ActivityBar, createActivityBar, ACTIVITY_BAR_ICONS } from './activity-bar'
import { events } from '../../core'

export type ExplorerView = 'files' | 'components'

export interface ExplorerPanelConfig {
  container: HTMLElement
  /** File tree container element */
  fileTreeContainer: HTMLElement
  /** Component panel container element */
  componentPanelContainer: HTMLElement
  /** Default view */
  defaultView?: ExplorerView
}

export interface ExplorerPanelCallbacks {
  onViewChange?: (view: ExplorerView) => void
}

/**
 * Explorer Panel - wraps Activity Bar + content views
 */
export class ExplorerPanel {
  private config: ExplorerPanelConfig
  private callbacks: ExplorerPanelCallbacks
  private activityBar: ActivityBar | null = null
  private activeView: ExplorerView = 'files'
  private element: HTMLElement | null = null

  constructor(config: ExplorerPanelConfig, callbacks: ExplorerPanelCallbacks = {}) {
    this.config = config
    this.callbacks = callbacks
    this.activeView = config.defaultView ?? 'files'
  }

  initialize(): void {
    // Create wrapper structure
    this.element = document.createElement('div')
    this.element.className = 'explorer-panel'

    // Activity Bar container
    const activityBarContainer = document.createElement('div')
    activityBarContainer.className = 'explorer-activity-bar'

    // Content container (holds both views)
    const contentContainer = document.createElement('div')
    contentContainer.className = 'explorer-content'

    // Move file tree into content
    this.config.fileTreeContainer.classList.add('explorer-view', 'explorer-view-files')
    contentContainer.appendChild(this.config.fileTreeContainer)

    // Move component panel into content
    this.config.componentPanelContainer.classList.add('explorer-view', 'explorer-view-components')
    contentContainer.appendChild(this.config.componentPanelContainer)

    this.element.appendChild(activityBarContainer)
    this.element.appendChild(contentContainer)

    // Replace original container content
    this.config.container.innerHTML = ''
    this.config.container.appendChild(this.element)

    // Initialize Activity Bar
    this.activityBar = createActivityBar(
      {
        container: activityBarContainer,
        items: [
          { id: 'files', icon: ACTIVITY_BAR_ICONS.files, tooltip: 'Files' },
          { id: 'components', icon: ACTIVITY_BAR_ICONS.components, tooltip: 'Components' },
        ],
        defaultActive: this.activeView,
      },
      {
        onItemClick: (id) => {
          this.showView(id as ExplorerView)
        },
      }
    )
    this.activityBar.render()

    // Apply initial view
    this.updateViewVisibility()
    console.log('[ExplorerPanel] Initialized with view:', this.activeView)
    console.log('[ExplorerPanel] File tree classes:', this.config.fileTreeContainer.className)
  }

  showView(view: ExplorerView): void {
    if (this.activeView === view) return
    this.activeView = view

    this.activityBar?.setActive(view)
    this.updateViewVisibility()

    // Emit event
    events.emit('explorer:view-changed', { view })
    this.callbacks.onViewChange?.(view)
  }

  private updateViewVisibility(): void {
    const filesView = this.config.fileTreeContainer
    const componentsView = this.config.componentPanelContainer

    if (this.activeView === 'files') {
      filesView.classList.add('active')
      filesView.style.display = ''
      componentsView.classList.remove('active')
      componentsView.style.display = 'none'
    } else {
      filesView.classList.remove('active')
      filesView.style.display = 'none'
      componentsView.classList.add('active')
      componentsView.style.display = ''
    }
  }

  getActiveView(): ExplorerView {
    return this.activeView
  }

  dispose(): void {
    this.activityBar?.dispose()
    this.activityBar = null
    this.element?.remove()
    this.element = null
  }
}

/**
 * Create an ExplorerPanel instance
 */
export function createExplorerPanel(
  config: ExplorerPanelConfig,
  callbacks?: ExplorerPanelCallbacks
): ExplorerPanel {
  return new ExplorerPanel(config, callbacks)
}
