/**
 * Visual Section - Shadow, Opacity, Cursor, Z-Index, Visibility
 *
 * Renders visual effect controls including shadow toggles, opacity presets,
 * cursor dropdown, z-index input, and visibility toggles.
 */

import { BaseSection, type SectionDependencies, type SectionData, type EventHandlerMap } from '../base/section'
import { PROPERTY_ICONS } from '../../../icons'

/**
 * Shadow presets
 */
const SHADOW_PRESETS = ['none', 'sm', 'md', 'lg'] as const

/**
 * Opacity presets
 */
const OPACITY_PRESETS = ['0', '0.25', '0.5', '0.75', '1'] as const

/**
 * Cursor options
 */
const CURSOR_OPTIONS = ['default', 'pointer', 'text', 'move', 'not-allowed', 'grab']

/**
 * Visibility properties
 */
const VISIBILITY_PROPS = ['hidden', 'visible', 'disabled']

/**
 * Visual Section class
 */
export class VisualSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Visual' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties

    // Find visual properties
    const shadowProp = props.find(p => p.name === 'shadow')
    const opacityProp = props.find(p => p.name === 'opacity' || p.name === 'o')
    const cursorProp = props.find(p => p.name === 'cursor')
    const zIndexProp = props.find(p => p.name === 'z')

    const shadowValue = shadowProp?.value || ''
    const opacityValue = opacityProp?.value || ''
    const cursorValue = cursorProp?.value || ''
    const zIndexValue = zIndexProp?.value || ''

    // Render sections
    const shadowToggles = this.renderShadowToggles(shadowValue)
    const opacityPresets = this.renderOpacityPresets(opacityValue)
    const cursorSelect = this.renderCursorSelect(cursorValue)
    const visibilityToggles = this.renderVisibilityToggles(props)

    return `
      <div class="pp-section">
        <div class="pp-label">Visual</div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Shadow</span>
          <div class="pp-shadow-group">
            ${shadowToggles}
          </div>
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Opacity</span>
          <div class="pp-opacity-group">
            ${opacityPresets}
          </div>
          <input type="text" class="pp-opacity-input" value="${this.deps.escapeHtml(opacityValue)}" data-prop="opacity" placeholder="1" autocomplete="off">
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Cursor</span>
          ${cursorSelect}
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Z-Index</span>
          <input type="text" class="pp-zindex-input" value="${this.deps.escapeHtml(zIndexValue)}" data-prop="z" placeholder="0" autocomplete="off">
        </div>
        <div class="pp-visual-row">
          <div class="pp-visibility-group">
            ${visibilityToggles}
          </div>
        </div>
      </div>
    `
  }

  private renderShadowToggles(shadowValue: string): string {
    return SHADOW_PRESETS.map(shadow => {
      const active = shadowValue === shadow || (shadow === 'none' && !shadowValue)
      const iconPath = PROPERTY_ICONS[`shadow-${shadow}` as keyof typeof PROPERTY_ICONS]
      return `
        <button class="pp-shadow-toggle ${active ? 'active' : ''}" data-shadow="${shadow}" title="${shadow}">
          ${iconPath ? `<svg viewBox="0 0 14 14" width="14" height="14">${iconPath}</svg>` : shadow}
        </button>
      `
    }).join('')
  }

  private renderOpacityPresets(opacityValue: string): string {
    return OPACITY_PRESETS.map(val => {
      const active = opacityValue === val
      return `<button class="pp-opacity-preset ${active ? 'active' : ''}" data-opacity="${val}">${val}</button>`
    }).join('')
  }

  private renderCursorSelect(cursorValue: string): string {
    const options = CURSOR_OPTIONS.map(opt =>
      `<option value="${opt}" ${opt === cursorValue ? 'selected' : ''}>${opt}</option>`
    ).join('')

    return `
      <select class="pp-cursor-select" data-prop="cursor">
        <option value="" ${!cursorValue ? 'selected' : ''}>-</option>
        ${options}
      </select>
    `
  }

  private renderVisibilityToggles(props: Array<{ name: string; value: string; hasValue?: boolean }>): string {
    return VISIBILITY_PROPS.map(prop => {
      const propObj = props.find(p => p.name === prop)
      const isActive = propObj && (propObj.value === 'true' || (propObj.value === '' && propObj.hasValue !== false))
      const iconPath = PROPERTY_ICONS[prop as keyof typeof PROPERTY_ICONS]
      return `
        <button class="pp-visibility-toggle ${isActive ? 'active' : ''}" data-visibility="${prop}" title="${prop}">
          ${iconPath ? `<svg viewBox="0 0 14 14" width="14" height="14">${iconPath}</svg>` : prop}
        </button>
      `
    }).join('')
  }

  getHandlers(): EventHandlerMap {
    return {
      '.pp-shadow-toggle[data-shadow]': {
        click: (e: Event, target: HTMLElement) => {
          const shadow = target.dataset.shadow
          if (shadow) {
            this.deps.onPropertyChange('shadow', shadow === 'none' ? '' : shadow, 'toggle')
          }
        }
      },
      '.pp-opacity-preset[data-opacity]': {
        click: (e: Event, target: HTMLElement) => {
          const opacity = target.dataset.opacity
          if (opacity) {
            this.deps.onPropertyChange('opacity', opacity, 'preset')
          }
        }
      },
      'input[data-prop="opacity"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('opacity', input.value, 'input')
        }
      },
      'select[data-prop="cursor"]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          this.deps.onPropertyChange('cursor', select.value, 'select')
        }
      },
      'input[data-prop="z"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('z', input.value, 'input')
        }
      },
      '.pp-visibility-toggle[data-visibility]': {
        click: (e: Event, target: HTMLElement) => {
          const prop = target.dataset.visibility
          if (prop) {
            this.deps.onToggleProperty(prop, target.classList.contains('active'))
          }
        }
      }
    }
  }
}

/**
 * Factory function
 */
export function createVisualSection(deps: SectionDependencies): VisualSection {
  return new VisualSection(deps)
}
