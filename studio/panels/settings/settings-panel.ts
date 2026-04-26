/**
 * Settings Panel - Panel for Studio Settings
 *
 * Uses same styling patterns as Property Panel.
 */

import { handleSnapSettings, type HandleSnapSettings } from '../../core/settings'
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
      <div class="settings-dialog-backdrop" data-action="close"></div>
      <div class="settings-dialog">
        <div class="settings-dialog-header">
          <span class="settings-dialog-title">Settings</span>
          <button class="settings-dialog-close" data-action="close" title="Close (Esc)">${ICONS.close}</button>
        </div>
        <div class="settings-dialog-content">
          ${this.renderSnappingSection()}
        </div>
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

  private renderSelect(
    setting: string,
    label: string,
    value: string,
    options: { value: string; label: string }[]
  ): string {
    const optionsHtml = options
      .map(
        opt =>
          `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`
      )
      .join('')

    return `
      <div class="prop-row">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          <select class="prop-select" data-setting="${setting}">
            ${optionsHtml}
          </select>
        </div>
      </div>
    `
  }

  private renderTextInput(
    setting: string,
    label: string,
    value: string,
    placeholder: string = '',
    type: string = 'text'
  ): string {
    return `
      <div class="prop-row">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          <input type="${type}" class="prop-input full-width" data-setting="${setting}" value="${value}" placeholder="${placeholder}">
        </div>
      </div>
    `
  }

  private renderSnappingSection(): string {
    const settings = handleSnapSettings.get()
    return `
      <div class="section">
        <div class="section-label">Snapping</div>
        <div class="section-content">
          ${this.renderToggle('handleSnap.tokenSnapping', 'Token Snapping', settings.tokenSnapping)}
          ${this.renderNumberInput('handleSnap.gridSize', 'Snap Grid', settings.gridSize, 1, 64)}
        </div>
      </div>
    `
  }

  private bindEvents(): void {
    if (!this.abortController) return

    const signal = this.abortController.signal

    // Close button and backdrop
    this.container.querySelectorAll('[data-action="close"]').forEach(el => {
      el.addEventListener('click', () => this.hide(), { signal })
    })

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
      const inputEl = input as HTMLInputElement
      const setting = inputEl.dataset.setting
      if (!setting) return

      inputEl.addEventListener(
        'change',
        e => {
          const target = e.target as HTMLInputElement
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

    // Select inputs
    this.container.querySelectorAll('select.prop-select[data-setting]').forEach(select => {
      select.addEventListener(
        'change',
        e => {
          const target = e.target as HTMLSelectElement
          const setting = target.dataset.setting
          if (!setting) return

          const [section, key] = setting.split('.')
          this.updateSetting(section, key, target.value)
        },
        { signal }
      )
    })

    // External settings changes
    this.eventUnsubscribes.push(events.on('handleSnap:changed', () => this.refreshValues()))
  }

  private unbindEvents(): void {
    for (const unsubscribe of this.eventUnsubscribes) {
      unsubscribe()
    }
    this.eventUnsubscribes = []
    this.abortController?.abort()
    this.abortController = null
  }

  private updateSetting(section: string, key: string, value: boolean | number | string): void {
    if (section === 'handleSnap') {
      handleSnapSettings.set({ [key]: value } as Partial<HandleSnapSettings>)
    }

    this.callbacks.onSettingsChange?.(section, { [key]: value })
  }

  private refreshValues(): void {
    const snapSettings = handleSnapSettings.get()
    const snappingValues: Record<string, boolean | number> = {
      'handleSnap.tokenSnapping': snapSettings.tokenSnapping,
      'handleSnap.gridSize': snapSettings.gridSize,
    }

    for (const [key, value] of Object.entries(snappingValues)) {
      const btn = this.container.querySelector(`.toggle-btn[data-setting="${key}"]`)
      if (btn) {
        btn.classList.toggle('active', value as boolean)
      }
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
