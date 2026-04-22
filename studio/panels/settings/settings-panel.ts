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
  agentSettings,
  type GridSettings,
  type SmartGuidesSettings,
  type HandleSnapSettings,
  type GeneralSettings,
  type AgentSettings,
  type AgentType,
} from '../../core/settings'
import { events } from '../../core/events'
import { getUserSettings } from '../../storage/user-settings'

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
        ${this.renderAgentSection()}
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

  private renderAgentSection(): string {
    const settings = agentSettings.get()
    const agentOptions = [
      { value: 'openrouter', label: 'OpenRouter' },
      { value: 'anthropic-sdk', label: 'Anthropic SDK' },
      { value: 'claude-cli', label: 'Claude CLI (Desktop)' },
    ]

    const anthropicModels = [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    ]

    const openrouterModels = [
      { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
      { value: 'anthropic/claude-opus-4', label: 'Claude Opus 4' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    ]

    // Conditionally show fields based on agent type
    const showAnthropicFields = settings.type === 'anthropic-sdk'
    const showOpenrouterFields = settings.type === 'openrouter'

    return `
      <div class="section">
        <div class="section-label">AI Agent</div>
        <div class="section-content">
          ${this.renderSelect('agent.type', 'Backend', settings.type, agentOptions)}

          <div class="agent-fields anthropic-fields" style="display: ${showAnthropicFields ? 'block' : 'none'}">
            ${this.renderTextInput('agent.anthropicApiKey', 'API Key', settings.anthropicApiKey, 'sk-ant-...', 'password')}
            ${this.renderSelect('agent.anthropicModel', 'Model', settings.anthropicModel, anthropicModels)}
          </div>

          <div class="agent-fields openrouter-fields" style="display: ${showOpenrouterFields ? 'block' : 'none'}">
            ${this.renderTextInput('agent.openrouterApiKey', 'API Key', settings.openrouterApiKey, 'sk-or-...', 'password')}
            ${this.renderSelect('agent.openrouterModel', 'Model', settings.openrouterModel, openrouterModels)}
          </div>

          <div class="agent-fields claude-cli-fields" style="display: ${settings.type === 'claude-cli' ? 'block' : 'none'}">
            <div class="prop-row">
              <span class="prop-label hint">Verwendet Claude Code CLI in der Desktop-App</span>
            </div>
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
      const inputEl = input as HTMLInputElement
      const setting = inputEl.dataset.setting
      if (!setting) return

      // Skip agent text inputs (they use different handling)
      if (setting.startsWith('agent.') && !inputEl.dataset.min) {
        // Text input for agent settings (API keys)
        inputEl.addEventListener(
          'change',
          e => {
            const target = e.target as HTMLInputElement
            const [section, key] = setting.split('.')
            this.updateSetting(section, key, target.value)
          },
          { signal }
        )
      } else {
        // Number input
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
      }
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

          // Special handling for agent type change - show/hide fields
          if (setting === 'agent.type') {
            this.toggleAgentFields(target.value as AgentType)
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
      events.on('settings:changed', () => this.refreshValues()),
      events.on('agent:changed', () => this.refreshValues())
    )
  }

  private toggleAgentFields(agentType: AgentType): void {
    const anthropicFields = this.container.querySelector('.anthropic-fields') as HTMLElement
    const openrouterFields = this.container.querySelector('.openrouter-fields') as HTMLElement
    const cliFields = this.container.querySelector('.claude-cli-fields') as HTMLElement

    if (anthropicFields) {
      anthropicFields.style.display = agentType === 'anthropic-sdk' ? 'block' : 'none'
    }
    if (openrouterFields) {
      openrouterFields.style.display = agentType === 'openrouter' ? 'block' : 'none'
    }
    if (cliFields) {
      cliFields.style.display = agentType === 'claude-cli' ? 'block' : 'none'
    }
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
      case 'agent':
        agentSettings.set({ [key]: value } as Partial<AgentSettings>)
        // Persist to localStorage
        this.saveAgentSettings()
        break
    }

    this.callbacks.onSettingsChange?.(section, { [key]: value })
  }

  private saveAgentSettings(): void {
    const settings = agentSettings.get()
    getUserSettings().setAgentSettings(settings)
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

    // Agent settings (string values)
    const agentSettingsValues = agentSettings.get()
    const allAgentSettings: Record<string, string> = {
      'agent.type': agentSettingsValues.type,
      'agent.anthropicApiKey': agentSettingsValues.anthropicApiKey,
      'agent.anthropicModel': agentSettingsValues.anthropicModel,
      'agent.openrouterApiKey': agentSettingsValues.openrouterApiKey,
      'agent.openrouterModel': agentSettingsValues.openrouterModel,
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

    // Update agent settings
    for (const [key, value] of Object.entries(allAgentSettings)) {
      const input = this.container.querySelector(`input[data-setting="${key}"]`) as HTMLInputElement
      if (input) {
        input.value = value
      }

      const select = this.container.querySelector(
        `select[data-setting="${key}"]`
      ) as HTMLSelectElement
      if (select) {
        select.value = value
      }
    }

    // Update field visibility based on agent type
    this.toggleAgentFields(agentSettingsValues.type)
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
