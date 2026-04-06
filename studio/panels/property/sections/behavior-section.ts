/**
 * Behavior Section - Zag Component Properties
 *
 * Renders Zag component behavior properties:
 * - Boolean toggles
 * - Select dropdowns for enums
 * - Text/number inputs
 */

import { BaseSection, type SectionDependencies, type SectionData, type EventHandlerMap } from '../base/section'

/**
 * Properties to exclude from the Behavior UI
 */
const EXCLUDED_PROPS = ['clearable', 'disabled', 'required']

/**
 * Check icon path
 */
const CHECK_ICON = '<path d="M11 4L6 10L3 7" stroke="currentColor" stroke-width="2" fill="none"/>'

/**
 * Extended property type for behavior props
 */
interface BehaviorProperty {
  name: string
  value: string
  type?: string
  label?: string
  description?: string
  options?: string[]
  hasValue?: boolean
}

/**
 * Behavior Section class
 */
export class BehaviorSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Behavior' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties as BehaviorProperty[]
    if (props.length === 0) return ''

    // Filter excluded properties
    const filteredProps = props.filter(p => !EXCLUDED_PROPS.includes(p.name))

    // Separate by type
    const booleans = filteredProps.filter(p => p.type === 'boolean')
    const selects = filteredProps.filter(p => p.type === 'select' && p.options && p.options.length > 0)
    const others = filteredProps.filter(p => p.type !== 'boolean' && !(p.type === 'select' && p.options && p.options.length > 0))

    // Render each group
    const selectRows = this.renderSelectRows(selects)
    const otherRows = this.renderOtherRows(others)
    const booleanRows = this.renderBooleanRows(booleans)

    return `
      <div class="section">
        <div class="section-label">Behavior</div>
        <div class="section-content">
          ${otherRows}
          ${selectRows}
          ${booleanRows}
        </div>
      </div>
    `
  }

  private renderSelectRows(selects: BehaviorProperty[]): string {
    return selects.map(prop => {
      const options = (prop.options || []).map(opt =>
        `<option value="${this.deps.escapeHtml(opt)}" ${prop.value === opt ? 'selected' : ''}>${this.deps.escapeHtml(opt)}</option>`
      ).join('')
      const label = prop.label || prop.name
      return `
        <div class="prop-row">
          <span class="prop-label" title="${this.deps.escapeHtml(prop.description || '')}">${this.deps.escapeHtml(label)}</span>
          <div class="prop-content">
            <select class="prop-select" data-behavior-select="${prop.name}">
              <option value="">-</option>
              ${options}
            </select>
          </div>
        </div>
      `
    }).join('')
  }

  private renderOtherRows(others: BehaviorProperty[]): string {
    return others.map(prop => {
      const label = prop.label || prop.name
      const placeholder = prop.type === 'number' ? '0' : ''
      const isWide = prop.type === 'text'
      return `
        <div class="prop-row">
          <span class="prop-label" title="${this.deps.escapeHtml(prop.description || '')}">${this.deps.escapeHtml(label)}</span>
          <div class="prop-content">
            <input type="text" class="prop-input${isWide ? ' wide' : ''}" value="${this.deps.escapeHtml(prop.value || '')}" data-behavior-input="${prop.name}" placeholder="${placeholder}" autocomplete="off">
          </div>
        </div>
      `
    }).join('')
  }

  private renderBooleanRows(booleans: BehaviorProperty[]): string {
    return booleans.map(prop => {
      const isActive = prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)
      const label = prop.label || prop.name
      return `
        <div class="prop-row">
          <span class="prop-label" title="${this.deps.escapeHtml(prop.description || '')}">${this.deps.escapeHtml(label)}</span>
          <div class="prop-content">
            <button class="toggle-btn single ${isActive ? 'active' : ''}" data-behavior-toggle="${prop.name}" title="${this.deps.escapeHtml(prop.description || label)}">
              <svg class="icon" viewBox="0 0 14 14">
                ${isActive ? CHECK_ICON : ''}
              </svg>
            </button>
          </div>
        </div>
      `
    }).join('')
  }

  getHandlers(): EventHandlerMap {
    return {
      'select[data-behavior-select]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          const propName = select.dataset.behaviorSelect
          if (propName) {
            this.deps.onPropertyChange(propName, select.value, 'select')
          }
        }
      },
      'input[data-behavior-input]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const propName = input.dataset.behaviorInput
          if (propName) {
            this.deps.onPropertyChange(propName, input.value, 'input')
          }
        }
      },
      '.toggle-btn[data-behavior-toggle]': {
        click: (e: Event, target: HTMLElement) => {
          const propName = target.dataset.behaviorToggle
          if (propName) {
            this.deps.onToggleProperty(propName, target.classList.contains('active'))
          }
        }
      }
    }
  }
}

/**
 * Factory function
 */
export function createBehaviorSection(deps: SectionDependencies): BehaviorSection {
  return new BehaviorSection(deps)
}
