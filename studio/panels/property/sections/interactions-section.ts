/**
 * InteractionsSection - Toggle, Exclusive, Select Modes
 *
 * Handles:
 * - Interaction mode selection (toggle, exclusive, select)
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, ExtractedInteraction } from '../types'
import { escapeHtml } from '../utils'

/**
 * Interaction modes with descriptions
 */
const INTERACTION_MODES = [
  { name: 'toggle', label: 'Toggle', description: 'Toggle between states on click' },
  { name: 'exclusive', label: 'Exclusive', description: 'Only one can be active (radio behavior)' },
  { name: 'select', label: 'Select', description: 'Selection behavior for lists' },
] as const

/**
 * InteractionsSection class
 */
export class InteractionsSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Interactions' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const interactions = data.interactions || []

    // Check which mode is active
    const activeInteraction = interactions.length > 0 ? interactions[0] : null

    const buttons = INTERACTION_MODES.map(mode => {
      const isActive = activeInteraction?.name === mode.name
      return `
        <button class="pp-interaction-btn ${isActive ? 'active' : ''}"
                data-interaction="${mode.name}"
                title="${mode.description}">
          ${mode.label}
        </button>
      `
    }).join('')

    return `
      <div class="pp-section">
        <div class="pp-label">Interactions</div>
        <div class="pp-interaction-row">
          ${buttons}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Interaction button click
      '[data-interaction]': {
        click: (e: Event, target: HTMLElement) => {
          const interaction = target.getAttribute('data-interaction')
          if (interaction) {
            this.deps.onPropertyChange('__INTERACTION__', interaction, 'toggle')
          }
        }
      }
    }
  }
}

/**
 * Factory function
 */
export function createInteractionsSection(deps: SectionDependencies): InteractionsSection {
  return new InteractionsSection(deps)
}
