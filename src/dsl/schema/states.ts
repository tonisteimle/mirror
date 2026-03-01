/**
 * @module dsl/schema/states
 * @description State definitions for Mirror DSL
 */

import type { StateDefinition } from './types'

// =============================================================================
// STATES
// =============================================================================

export const STATES: Record<string, StateDefinition> = {
  // System States - automatically bound to browser pseudo-classes
  hover: {
    name: 'hover',
    type: 'system',
    description: 'Maus über Element',
    cssMapping: ':hover',
  },
  focus: {
    name: 'focus',
    type: 'system',
    description: 'Element hat Fokus',
    cssMapping: ':focus',
  },
  active: {
    name: 'active',
    type: 'system',
    description: 'Element ist aktiv (gedrückt)',
    cssMapping: ':active',
  },
  disabled: {
    name: 'disabled',
    type: 'system',
    description: 'Element ist deaktiviert',
    cssMapping: ':disabled',
  },

  // Behavior States - activated by actions
  highlighted: {
    name: 'highlighted',
    type: 'behavior',
    description: 'Hervorgehoben (via highlight)',
    triggeredBy: 'highlight',
  },
  selected: {
    name: 'selected',
    type: 'behavior',
    description: 'Ausgewählt (via select)',
    triggeredBy: 'select',
  },
  // Note: 'active' is also a system state, but can be used as behavior state
  'active-behavior': {
    name: 'active',
    type: 'behavior',
    description: 'Aktiv (via activate)',
    triggeredBy: 'activate',
  },
  inactive: {
    name: 'inactive',
    type: 'behavior',
    description: 'Inaktiv',
    triggeredBy: 'deactivate',
  },
  expanded: {
    name: 'expanded',
    type: 'behavior',
    description: 'Ausgeklappt',
    triggeredBy: 'change',
  },
  collapsed: {
    name: 'collapsed',
    type: 'behavior',
    description: 'Eingeklappt',
    triggeredBy: 'change',
  },
  valid: {
    name: 'valid',
    type: 'behavior',
    description: 'Eingabe valide',
    triggeredBy: 'validate',
  },
  invalid: {
    name: 'invalid',
    type: 'behavior',
    description: 'Eingabe invalide',
    triggeredBy: 'validate',
  },
  default: {
    name: 'default',
    type: 'behavior',
    description: 'Initialzustand',
  },
  on: {
    name: 'on',
    type: 'behavior',
    description: 'Toggle an',
    triggeredBy: 'toggle',
  },
  off: {
    name: 'off',
    type: 'behavior',
    description: 'Toggle aus',
    triggeredBy: 'toggle',
  },
}
