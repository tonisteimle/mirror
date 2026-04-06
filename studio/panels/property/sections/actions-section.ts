/**
 * ActionsSection - State Definitions and Actions
 *
 * Handles:
 * - Display of defined states
 * - Add/edit state definitions
 * - State actions configuration
 *
 * Note: This section is a placeholder for future state management UI.
 * Currently shows available actions defined on the element.
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, ExtractedAction } from '../types'
import { escapeHtml } from '../utils'

/**
 * Icons
 */
const ICONS = {
  add: '<path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.5"/>',
  state: '<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>'
}

/**
 * ActionsSection class
 */
export class ActionsSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Actions' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const actions = data.actions || []

    if (actions.length === 0) {
      return ''
    }

    const actionRows = actions.map((action, index) => this.renderActionRow(action, index)).join('')

    return `
      <div class="pp-section">
        <div class="pp-label-with-action">
          <span class="pp-label">Actions</span>
          <button class="pp-add-action-btn" title="Add action">
            <svg viewBox="0 0 14 14" width="12" height="12">
              ${ICONS.add}
            </svg>
            Add
          </button>
        </div>
        <div class="pp-actions-list">
          ${actionRows}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Add action button
      '.pp-add-action-btn': {
        click: (e: Event, target: HTMLElement) => {
          this.deps.onPropertyChange('__ADD_ACTION__', '', 'toggle')
        }
      },
      // Action row click
      '.pp-action-row': {
        click: (e: Event, target: HTMLElement) => {
          const index = target.getAttribute('data-action-index')
          if (index) {
            this.deps.onPropertyChange('__EDIT_ACTION__', index, 'toggle')
          }
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderActionRow(action: ExtractedAction, index: number): string {
    const target = action.target ? `(${action.target})` : ''
    const displayName = action.isFunctionCall ? `${action.name}()` : action.name

    return `
      <div class="pp-action-row" data-action-index="${index}">
        <svg class="pp-action-icon" viewBox="0 0 14 14" width="12" height="12">
          ${ICONS.state}
        </svg>
        <span class="pp-action-name">${escapeHtml(displayName)}${escapeHtml(target)}</span>
      </div>
    `
  }
}

/**
 * Factory function
 */
export function createActionsSection(deps: SectionDependencies): ActionsSection {
  return new ActionsSection(deps)
}
