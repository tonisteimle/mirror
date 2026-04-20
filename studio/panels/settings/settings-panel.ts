/**
 * Settings Panel - Panel for Studio Settings
 *
 * Uses same styling patterns as Property Panel.
 */

import {
  gridSettings,
  smartGuidesSettings,
  handleSnapSettings,
  generalSettings,
  type GridSettings,
  type SmartGuidesSettings,
  type HandleSnapSettings,
  type GeneralSettings,
} from '../../core/settings'
import { events } from '../../core/events'

export interface SettingsPanelConfig {
  container?: HTMLElement
}

export interface SettingsPanelCallbacks {
  onSettingsChange?: (section: string, settings: unknown) => void
  onClose?: () => void
}

// Icons matching Property Panel style
const ICONS = {
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  check: `<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="2,7 5.5,10.5 12,4"/>
  </svg>`,
}

/**
 * Settings Panel
 */
export class SettingsPanel {
  private container: HTMLElement
  private callbacks: SettingsPanelCallbacks
  private abortController: AbortController | null = null
  private eventUnsubscribes: Array<() => void> = []
  private isVisible = false
  private rendered = false

  constructor(config: SettingsPanelConfig = {}, callbacks: SettingsPanelCallbacks = {}) {
    this.container = config.container || document.getElementById('settings-panel') || document.body
    this.callbacks = callbacks
  }

  show(): void {
    if (this.isVisible) return

    if (!this.rendered) {
      this.render()
      this.rendered = true
    }

    this.isVisible = true
    this.abortController = new AbortController()
    this.bindEvents()
    this.container.classList.add('visible')
  }

  hide(): void {
    if (!this.isVisible) return

    this.container.classList.remove('visible')
    this.isVisible = false
    this.unbindEvents()
    this.callbacks.onClose?.()
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  isShowing(): boolean {
    return this.isVisible
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Settings</span>
        <button class="pp-close" data-action="close" title="Close (Esc)">${ICONS.close}</button>
      </div>
      <div class="pp-content">
        ${this.renderGridSection()}
        ${this.renderSmartGuidesSection()}
        ${this.renderHandleSnapSection()}
        ${this.renderGeneralSection()}
      </div>
    `
  }

  private renderToggle(setting: string, label: string, checked: boolean): string {
    return `
      <div class="prop-row">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          <button class="toggle-btn single ${checked ? 'active' : ''}" data-setting="${setting}" title="${label}">
            ${ICONS.check}
          </button>
        </div>
      </div>
    `
  }

  private renderNumberInput(
    setting: string,
    label: string,
    value: number,
    min: number,
    max: number
  ): string {
    return `
      <div class="prop-row">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          <div class="input-wrapper">
            <input type="text" class="prop-input" data-setting="${setting}" value="${value}" data-min="${min}" data-max="${max}">
            <span class="input-unit">px</span>
          </div>
        </div>
      </div>
    `
  }

  private renderGridSection(): string {
    const settings = gridSettings.get()
    return `
      <div class="section">
        <div class="section-label">Grid</div>
        <div class="section-content">
          ${this.renderToggle('grid.enabled', 'Snap to Grid', settings.enabled)}
          ${this.renderToggle('grid.showVisual', 'Show Grid', settings.showVisual)}
          ${this.renderNumberInput('grid.size', 'Grid Size', settings.size, 1, 100)}
        </div>
      </div>
    `
  }

  private renderSmartGuidesSection(): string {
    const settings = smartGuidesSettings.get()
    return `
      <div class="section">
        <div class="section-label">Smart Guides</div>
        <div class="section-content">
          ${this.renderToggle('smartGuides.enabled', 'Enable', settings.enabled)}
          ${this.renderToggle('smartGuides.showDistances', 'Distances', settings.showDistances)}
          ${this.renderNumberInput('smartGuides.threshold', 'Threshold', settings.threshold, 1, 20)}
        </div>
      </div>
    `
  }

  private renderHandleSnapSection(): string {
    const settings = handleSnapSettings.get()
    return `
      <div class="section">
        <div class="section-label">Handle Snap</div>
        <div class="section-content">
          ${this.renderToggle('handleSnap.enabled', 'Enable', settings.enabled)}
          ${this.renderToggle('handleSnap.tokenSnapping', 'Tokens', settings.tokenSnapping)}
          ${this.renderNumberInput('handleSnap.gridSize', 'Snap Grid', settings.gridSize, 1, 64)}
        </div>
      </div>
    `
  }

  private renderGeneralSection(): string {
    const settings = generalSettings.get()
    return `
      <div class="section">
        <div class="section-label">General</div>
        <div class="section-content">
          ${this.renderToggle('general.showPositionLabels', 'Position Labels', settings.showPositionLabels)}
          ${this.renderNumberInput('general.moveStep', 'Arrow Step', settings.moveStep, 1, 20)}
          ${this.renderNumberInput('general.moveStepShift', 'Shift + Arrow', settings.moveStepShift, 1, 100)}
        </div>
      </div>
    `
  }

  private bindEvents(): void {
    if (!this.abortController) return

    const signal = this.abortController.signal

    // Close button
    this.container
      .querySelector('[data-action="close"]')
      ?.addEventListener('click', () => this.hide(), { signal })

    // Escape key
    document.addEventListener(
      'keydown',
      e => {
        if (e.key === 'Escape' && this.isVisible) {
          this.hide()
        }
      },
      { signal }
    )

    // Toggle buttons
    this.container.querySelectorAll('.toggle-btn[data-setting]').forEach(btn => {
      btn.addEventListener(
        'click',
        e => {
          const target = e.currentTarget as HTMLButtonElement
          const setting = target.dataset.setting
          if (!setting) return

          const isActive = target.classList.contains('active')
          target.classList.toggle('active', !isActive)

          const [section, key] = setting.split('.')
          this.updateSetting(section, key, !isActive)
        },
        { signal }
      )
    })

    // Number inputs (text type with validation)
    this.container.querySelectorAll('input.prop-input[data-setting]').forEach(input => {
      input.addEventListener(
        'change',
        e => {
          const target = e.target as HTMLInputElement
          const setting = target.dataset.setting
          if (!setting) return

          const [section, key] = setting.split('.')
          const value = parseInt(target.value, 10)
          const min = parseInt(target.dataset.min || '0', 10)
          const max = parseInt(target.dataset.max || '100', 10)

          if (!isNaN(value)) {
            const clampedValue = Math.max(min, Math.min(max, value))
            target.value = String(clampedValue)
            this.updateSetting(section, key, clampedValue)
          }
        },
        { signal }
      )
    })

    // External settings changes
    this.eventUnsubscribes.push(
      events.on('grid:changed', () => this.refreshValues()),
      events.on('smartGuides:changed', () => this.refreshValues()),
      events.on('handleSnap:changed', () => this.refreshValues()),
      events.on('settings:changed', () => this.refreshValues())
    )
  }

  private unbindEvents(): void {
    for (const unsubscribe of this.eventUnsubscribes) {
      unsubscribe()
    }
    this.eventUnsubscribes = []
    this.abortController?.abort()
    this.abortController = null
  }

  private updateSetting(section: string, key: string, value: boolean | number): void {
    switch (section) {
      case 'grid':
        gridSettings.set({ [key]: value } as Partial<GridSettings>)
        break
      case 'smartGuides':
        smartGuidesSettings.set({ [key]: value } as Partial<SmartGuidesSettings>)
        break
      case 'handleSnap':
        handleSnapSettings.set({ [key]: value } as Partial<HandleSnapSettings>)
        break
      case 'general':
        generalSettings.set({ [key]: value } as Partial<GeneralSettings>)
        break
    }

    this.callbacks.onSettingsChange?.(section, { [key]: value })
  }

  private refreshValues(): void {
    const allSettings: Record<string, boolean | number> = {
      'grid.enabled': gridSettings.get().enabled,
      'grid.showVisual': gridSettings.get().showVisual,
      'grid.size': gridSettings.get().size,
      'smartGuides.enabled': smartGuidesSettings.get().enabled,
      'smartGuides.showDistances': smartGuidesSettings.get().showDistances,
      'smartGuides.threshold': smartGuidesSettings.get().threshold,
      'handleSnap.enabled': handleSnapSettings.get().enabled,
      'handleSnap.tokenSnapping': handleSnapSettings.get().tokenSnapping,
      'handleSnap.gridSize': handleSnapSettings.get().gridSize,
      'general.showPositionLabels': generalSettings.get().showPositionLabels,
      'general.moveStep': generalSettings.get().moveStep,
      'general.moveStepShift': generalSettings.get().moveStepShift,
    }

    for (const [key, value] of Object.entries(allSettings)) {
      // Toggle buttons
      const btn = this.container.querySelector(`.toggle-btn[data-setting="${key}"]`)
      if (btn) {
        btn.classList.toggle('active', value as boolean)
      }

      // Number inputs
      const input = this.container.querySelector(`input[data-setting="${key}"]`) as HTMLInputElement
      if (input) {
        input.value = String(value)
      }
    }
  }

  dispose(): void {
    this.unbindEvents()
    this.container.innerHTML = ''
    this.container.classList.remove('visible')
    this.rendered = false
    this.isVisible = false
  }
}

export function createSettingsPanel(
  config?: SettingsPanelConfig,
  callbacks?: SettingsPanelCallbacks
): SettingsPanel {
  return new SettingsPanel(config, callbacks)
}
