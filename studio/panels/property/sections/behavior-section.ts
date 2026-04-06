/**
 * BehaviorSection - Zag Component Properties
 *
 * Handles:
 * - Boolean properties as toggle buttons
 * - Enum properties as select dropdowns
 * - String/number properties as inputs
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory, ExtractedProperty } from '../types'
import { escapeHtml } from '../utils'

/**
 * Properties to exclude from UI
 */
const EXCLUDED_PROPS = ['clearable', 'disabled', 'required']

/**
 * Check icon
 */
const CHECK_ICON = '<path d="M11 4L6 10L3 7" stroke="currentColor" stroke-width="2" fill="none"/>'

/**
 * BehaviorSection class
 */
export class BehaviorSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Behavior' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties
    if (props.length === 0) return ''

    // Filter excluded properties
    const filteredProps = props.filter(p => !EXCLUDED_PROPS.includes(p.name))

    // Separate by type
    const booleans = filteredProps.filter(p => p.type === 'boolean')
    const selects = filteredProps.filter(p => p.type === 'select' && p.options && p.options.length > 0)
    const others = filteredProps.filter(p => p.type !== 'boolean' && !(p.type === 'select' && p.options && p.options.length > 0))

    // Render rows
    const otherRows = others.map(prop => this.renderInputRow(prop)).join('')
    const selectRows = selects.map(prop => this.renderSelectRow(prop)).join('')
    const booleanRows = booleans.map(prop => this.renderBooleanRow(prop)).join('')

    return `
      <div class="pp-section">
        <div class="pp-section-label">Behavior</div>
        <div class="pp-section-content">
          ${otherRows}
          ${selectRows}
          ${booleanRows}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Boolean toggle
      '[data-behavior-toggle]': {
        click: (e: Event, target: HTMLElement) => {
          const propName = target.getAttribute('data-behavior-toggle')
          if (propName) {
            this.deps.onPropertyChange('__BEHAVIOR_TOGGLE__', propName, 'toggle')
          }
        }
      },
      // Select change
      '[data-behavior-select]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          const propName = select.getAttribute('data-behavior-select')
          if (propName) {
            this.deps.onPropertyChange(propName, select.value, 'input')
          }
        }
      },
      // Input change
      '[data-behavior-input]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const propName = input.getAttribute('data-behavior-input')
          if (propName) {
            this.deps.onPropertyChange(propName, input.value, 'input')
          }
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderInputRow(prop: ExtractedProperty): string {
    const label = prop.label || prop.name
    const placeholder = prop.type === 'number' ? '0' : ''
    const isWide = prop.type === 'text'

    return `
      <div class="pp-row">
        <span class="pp-row-label" title="${escapeHtml(prop.description || '')}">${escapeHtml(label)}</span>
        <div class="pp-row-content">
          <input type="text" class="pp-input${isWide ? ' wide' : ''}" value="${escapeHtml(prop.value || '')}" data-behavior-input="${prop.name}" placeholder="${placeholder}" autocomplete="off">
        </div>
      </div>
    `
  }

  private renderSelectRow(prop: ExtractedProperty): string {
    const options = (prop.options || []).map(opt =>
      `<option value="${escapeHtml(opt)}" ${prop.value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`
    ).join('')
    const label = prop.label || prop.name

    return `
      <div class="pp-row">
        <span class="pp-row-label" title="${escapeHtml(prop.description || '')}">${escapeHtml(label)}</span>
        <div class="pp-row-content">
          <select class="pp-select" data-behavior-select="${prop.name}">
            <option value="">-</option>
            ${options}
          </select>
        </div>
      </div>
    `
  }

  private renderBooleanRow(prop: ExtractedProperty): string {
    const isActive = prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)
    const label = prop.label || prop.name

    return `
      <div class="pp-row">
        <span class="pp-row-label" title="${escapeHtml(prop.description || '')}">${escapeHtml(label)}</span>
        <div class="pp-row-content">
          <button class="pp-toggle-btn single ${isActive ? 'active' : ''}" data-behavior-toggle="${prop.name}" title="${escapeHtml(prop.description || label)}">
            <svg class="pp-icon" viewBox="0 0 14 14">
              ${isActive ? CHECK_ICON : ''}
            </svg>
          </button>
        </div>
      </div>
    `
  }
}

/**
 * Factory function
 */
export function createBehaviorSection(deps: SectionDependencies): BehaviorSection {
  return new BehaviorSection(deps)
}
