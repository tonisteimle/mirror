/**
 * VisualSection - Shadow, Opacity, Cursor, Z-Index, Overflow, Visibility
 *
 * Handles:
 * - Shadow presets (none, sm, md, lg)
 * - Opacity presets and input
 * - Cursor dropdown
 * - Z-Index input
 * - Overflow toggles (scroll, scroll-hor, clip)
 * - Visibility toggles (hidden, visible, disabled)
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory } from '../types'
import { escapeHtml } from '../utils'
import { makeScrubable, type ScrubInstance } from '../utils/scrub'

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
 * Icons for various toggles
 */
const ICONS = {
  scrollVer: '<path d="M7 2v10M4 5l3-3 3 3M4 9l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  scrollHor: '<path d="M2 7h10M5 4l-3 3 3 3M9 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  clip: '<rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5 9l4-4M9 9l-4-4" stroke="currentColor" stroke-width="1" opacity="0.5"/>',
  hidden: '<path d="M7 3C3 3 1 7 1 7s2 4 6 4 6-4 6-4-2-4-6-4z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M2 12L12 2" stroke="currentColor" stroke-width="1.5"/>',
  visible: '<path d="M7 3C3 3 1 7 1 7s2 4 6 4 6-4 6-4-2-4-6-4z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  disabled: '<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M4 10L10 4" stroke="currentColor" stroke-width="1.5"/>'
}

/**
 * VisualSection class
 */
export class VisualSection extends BaseSection {
  private scrubInstances: ScrubInstance[] = []

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

    // Find overflow/scroll properties
    const scrollProp = props.find(p => p.name === 'scroll' || p.name === 'scroll-ver')
    const scrollHorProp = props.find(p => p.name === 'scroll-hor')
    const clipProp = props.find(p => p.name === 'clip')

    const isScrollActive = !!(scrollProp && (scrollProp.value === 'true' || (scrollProp.value === '' && scrollProp.hasValue !== false)))
    const isScrollHorActive = !!(scrollHorProp && (scrollHorProp.value === 'true' || (scrollHorProp.value === '' && scrollHorProp.hasValue !== false)))
    const isClipActive = !!(clipProp && (clipProp.value === 'true' || (clipProp.value === '' && clipProp.hasValue !== false)))

    return `
      <div class="pp-section">
        <div class="pp-section-label">Visual</div>
        <div class="pp-section-content">
          ${this.renderShadowRow(shadowValue)}
          ${this.renderOpacityRow(opacityValue)}
          ${this.renderCursorRow(cursorValue)}
          ${this.renderZIndexRow(zIndexValue)}
          ${this.renderOverflowRow(isScrollActive, isScrollHorActive, isClipActive)}
          ${this.renderVisibilityRow(props)}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Shadow toggle
      '[data-shadow]': {
        click: (e: Event, target: HTMLElement) => {
          const value = target.getAttribute('data-shadow')
          if (value) {
            const actualValue = value === 'none' ? '' : value
            this.deps.onPropertyChange('shadow', actualValue, 'toggle')
          }
        }
      },
      // Opacity preset
      '[data-opacity]': {
        click: (e: Event, target: HTMLElement) => {
          const value = target.getAttribute('data-opacity')
          if (value) {
            this.deps.onPropertyChange('opacity', value, 'token')
          }
        }
      },
      // Opacity input
      'input[data-prop="opacity"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('opacity', input.value, 'input')
        }
      },
      // Cursor select
      'select[data-prop="cursor"]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          this.deps.onPropertyChange('cursor', select.value, 'input')
        }
      },
      // Z-Index input
      'input[data-prop="z"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('z', input.value, 'input')
        }
      },
      // Overflow toggle
      '[data-overflow]': {
        click: (e: Event, target: HTMLElement) => {
          const value = target.getAttribute('data-overflow')
          if (value) {
            this.deps.onPropertyChange('__OVERFLOW__', value, 'toggle')
          }
        }
      },
      // Visibility toggle
      '[data-visibility]': {
        click: (e: Event, target: HTMLElement) => {
          const value = target.getAttribute('data-visibility')
          if (value) {
            this.deps.onPropertyChange('__VISIBILITY__', value, 'toggle')
          }
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderShadowRow(shadowValue: string): string {
    const toggles = SHADOW_PRESETS.map(shadow => {
      const active = shadowValue === shadow || (shadow === 'none' && !shadowValue)
      return `
        <button class="pp-toggle-btn ${active ? 'active' : ''}" data-shadow="${shadow}" title="${shadow}">
          ${shadow}
        </button>
      `
    }).join('')

    return `
      <div class="pp-row">
        <span class="pp-row-label">Shadow</span>
        <div class="pp-row-content">
          <div class="pp-toggle-group">
            ${toggles}
          </div>
        </div>
      </div>
    `
  }

  private renderOpacityRow(opacityValue: string): string {
    const presets = OPACITY_PRESETS.map(val => {
      const active = opacityValue === val
      return `<button class="pp-token-btn ${active ? 'active' : ''}" data-opacity="${val}">${val}</button>`
    }).join('')

    return `
      <div class="pp-row" data-scrub="opacity" data-scrub-min="0" data-scrub-max="1" data-scrub-step="0.01" data-scrub-decimals="true">
        <span class="pp-row-label">Opacity</span>
        <div class="pp-row-content">
          <div class="pp-token-group">
            ${presets}
          </div>
          <input type="text" class="pp-input" value="${escapeHtml(opacityValue)}" data-prop="opacity" placeholder="1" autocomplete="off">
        </div>
      </div>
    `
  }

  private renderCursorRow(cursorValue: string): string {
    const options = CURSOR_OPTIONS.map(opt =>
      `<option value="${opt}" ${opt === cursorValue ? 'selected' : ''}>${opt}</option>`
    ).join('')

    return `
      <div class="pp-row">
        <span class="pp-row-label">Cursor</span>
        <div class="pp-row-content">
          <select class="pp-select" data-prop="cursor">
            <option value="" ${!cursorValue ? 'selected' : ''}>-</option>
            ${options}
          </select>
        </div>
      </div>
    `
  }

  private renderZIndexRow(zIndexValue: string): string {
    return `
      <div class="pp-row" data-scrub="z">
        <span class="pp-row-label">Z-Index</span>
        <div class="pp-row-content">
          <input type="text" class="pp-input" value="${escapeHtml(zIndexValue)}" data-prop="z" placeholder="0" autocomplete="off">
        </div>
      </div>
    `
  }

  private renderOverflowRow(scrollActive: boolean, scrollHorActive: boolean, clipActive: boolean): string {
    return `
      <div class="pp-row">
        <span class="pp-row-label">Overflow</span>
        <div class="pp-row-content">
          <div class="pp-toggle-group">
            <button class="pp-toggle-btn ${scrollActive ? 'active' : ''}" data-overflow="scroll" title="Scroll vertical">
              <svg class="pp-icon" viewBox="0 0 14 14">${ICONS.scrollVer}</svg>
            </button>
            <button class="pp-toggle-btn ${scrollHorActive ? 'active' : ''}" data-overflow="scroll-hor" title="Scroll horizontal">
              <svg class="pp-icon" viewBox="0 0 14 14">${ICONS.scrollHor}</svg>
            </button>
            <button class="pp-toggle-btn ${clipActive ? 'active' : ''}" data-overflow="clip" title="Clip overflow">
              <svg class="pp-icon" viewBox="0 0 14 14">${ICONS.clip}</svg>
            </button>
          </div>
        </div>
      </div>
    `
  }

  private renderVisibilityRow(props: Array<{ name: string; value: string; hasValue?: boolean }>): string {
    const visibilityProps = ['hidden', 'visible', 'disabled']

    const toggles = visibilityProps.map(prop => {
      const propObj = props.find(p => p.name === prop)
      const isActive = propObj && (propObj.value === 'true' || (propObj.value === '' && propObj.hasValue !== false))
      const iconPath = ICONS[prop as keyof typeof ICONS] || ''

      return `
        <button class="pp-toggle-btn ${isActive ? 'active' : ''}" data-visibility="${prop}" title="${prop}">
          <svg class="pp-icon" viewBox="0 0 14 14">${iconPath}</svg>
        </button>
      `
    }).join('')

    return `
      <div class="pp-row">
        <span class="pp-row-label">Visibility</span>
        <div class="pp-row-content">
          <div class="pp-toggle-group">
            ${toggles}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Called after the section is mounted
   */
  afterMount(): void {
    if (this.container) {
      this.setupScrubbing()
    }
  }

  /**
   * Clean up scrub instances before re-render
   */
  private cleanupScrubbing(): void {
    this.scrubInstances.forEach(instance => instance.destroy())
    this.scrubInstances = []
  }

  /**
   * Set up scrubbing on all scrubbable labels
   */
  private setupScrubbing(): void {
    this.cleanupScrubbing()

    if (!this.container) return

    // Find all rows with data-scrub attribute
    const rows = this.container.querySelectorAll('[data-scrub]')

    rows.forEach(row => {
      const label = row.querySelector('.pp-row-label') as HTMLElement
      const input = row.querySelector('input[type="text"]') as HTMLInputElement
      const property = row.getAttribute('data-scrub')

      if (!label || !input || !property) return

      // Get config from data attributes
      const min = row.hasAttribute('data-scrub-min')
        ? parseFloat(row.getAttribute('data-scrub-min')!)
        : undefined
      const max = row.hasAttribute('data-scrub-max')
        ? parseFloat(row.getAttribute('data-scrub-max')!)
        : undefined
      const step = row.hasAttribute('data-scrub-step')
        ? parseFloat(row.getAttribute('data-scrub-step')!)
        : 1
      const allowDecimals = row.getAttribute('data-scrub-decimals') === 'true'

      const instance = makeScrubable({
        label,
        input,
        min,
        max,
        step,
        allowDecimals,
        onChange: (value) => {
          this.deps.onPropertyChange(property, String(value), 'input')
        }
      })

      this.scrubInstances.push(instance)
    })
  }
}

/**
 * Factory function
 */
export function createVisualSection(deps: SectionDependencies): VisualSection {
  return new VisualSection(deps)
}
