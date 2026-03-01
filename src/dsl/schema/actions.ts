/**
 * @module dsl/schema/actions
 * @description Action definitions for Mirror DSL
 */

import type { ActionDefinition } from './types'

// =============================================================================
// ACTIONS
// =============================================================================

export const ACTIONS: Record<string, ActionDefinition> = {
  // Visibility
  toggle: {
    name: 'toggle',
    description: 'Toggle-State wechseln',
    syntax: 'toggle',
    examples: ['onclick toggle'],
  },
  show: {
    name: 'show',
    description: 'Element anzeigen',
    validTargets: ['self', 'named'],
    supportsAnimation: true,
    syntax: 'show Target [animation]',
    examples: ['show Modal', 'show Dropdown fade'],
  },
  hide: {
    name: 'hide',
    description: 'Element verstecken',
    validTargets: ['self', 'named'],
    supportsAnimation: true,
    syntax: 'hide Target [animation]',
    examples: ['hide Modal', 'hide Tooltip fade'],
  },
  open: {
    name: 'open',
    description: 'Overlay öffnen (relativ zu Referenz-Element)',
    validTargets: ['named'],
    supportsAnimation: true,
    supportsPosition: true,
    syntax: 'open Target position-of Reference [animation] [duration]',
    examples: [
      'open Dropdown below-of self',
      'open Tooltip above-of EmailInput',
      'open Modal center fade 300',
      'open Submenu right-of MenuItem slide-right',
    ],
  },
  close: {
    name: 'close',
    description: 'Overlay schließen',
    supportsAnimation: true,
    syntax: 'close [animation]',
    examples: ['close', 'close fade'],
  },
  page: {
    name: 'page',
    description: 'Zu Seite wechseln',
    validTargets: ['named'],
    syntax: 'page PageName',
    examples: ['page Home', 'page Settings'],
  },

  // State Changes
  change: {
    name: 'change',
    description: 'State ändern',
    syntax: 'change self to State',
    examples: ['change self to active', 'change self to expanded'],
  },
  activate: {
    name: 'activate',
    description: 'Element aktivieren',
    validTargets: ['self', 'named'],
    syntax: 'activate [Target]',
    examples: ['activate', 'activate Tab1'],
  },
  deactivate: {
    name: 'deactivate',
    description: 'Element deaktivieren',
    validTargets: ['self', 'named'],
    syntax: 'deactivate [Target]',
    examples: ['deactivate', 'deactivate Tab1'],
  },
  'deactivate-siblings': {
    name: 'deactivate-siblings',
    description: 'Geschwister deaktivieren',
    syntax: 'deactivate-siblings',
    examples: ['onclick activate, deactivate-siblings'],
  },
  'toggle-state': {
    name: 'toggle-state',
    description: 'State umschalten',
    syntax: 'toggle-state',
    examples: ['onclick toggle-state'],
  },

  // Selection & Highlight
  highlight: {
    name: 'highlight',
    description: 'Element hervorheben',
    validTargets: ['self', 'next', 'prev', 'first', 'last', 'self-and-before', 'none'],
    syntax: 'highlight Target',
    examples: [
      'highlight next',
      'highlight prev',
      'highlight first',
      'highlight self-and-before',
    ],
  },
  select: {
    name: 'select',
    description: 'Element auswählen',
    validTargets: ['self', 'highlighted', 'all'],
    syntax: 'select Target',
    examples: ['select highlighted', 'select self'],
  },
  deselect: {
    name: 'deselect',
    description: 'Auswahl aufheben',
    validTargets: ['self', 'all'],
    syntax: 'deselect [Target]',
    examples: ['deselect', 'deselect all'],
  },
  'deselect-siblings': {
    name: 'deselect-siblings',
    description: 'Geschwister deselektieren',
    syntax: 'deselect-siblings',
    examples: ['onclick select, deselect-siblings'],
  },
  'clear-selection': {
    name: 'clear-selection',
    description: 'Alle Auswahlen löschen',
    syntax: 'clear-selection',
    examples: ['clear-selection'],
  },
  filter: {
    name: 'filter',
    description: 'Liste filtern',
    validTargets: ['named'],
    syntax: 'filter Target',
    examples: ['oninput debounce 300 filter Results'],
  },

  // Assignments & Forms
  assign: {
    name: 'assign',
    description: 'Variable zuweisen',
    syntax: 'assign $var to expr',
    examples: [
      'assign $selected to $item',
      'assign $count to $count + 1',
    ],
  },
  validate: {
    name: 'validate',
    description: 'Formular validieren',
    validTargets: ['self', 'named'],
    syntax: 'validate [Target]',
    examples: ['validate', 'validate Form'],
  },
  reset: {
    name: 'reset',
    description: 'Formular zurücksetzen',
    validTargets: ['self', 'named'],
    syntax: 'reset [Target]',
    examples: ['reset', 'reset Form'],
  },
  focus: {
    name: 'focus',
    description: 'Fokus setzen',
    validTargets: ['self', 'named', 'next', 'prev', 'first', 'first-empty'],
    syntax: 'focus Target',
    examples: ['focus SearchInput', 'focus next', 'focus first-empty'],
  },
  alert: {
    name: 'alert',
    description: 'Alert anzeigen',
    syntax: 'alert "message"',
    examples: ['alert "Saved successfully"'],
  },

  // JavaScript Integration
  call: {
    name: 'call',
    description: 'Externe JavaScript-Funktion aufrufen',
    syntax: 'call functionName',
    examples: ['onclick call handleLogin'],
  },

  // Syntax keywords used with actions (included for ACTION_KEYWORDS compatibility)
  to: {
    name: 'to',
    description: 'Zuweisungsziel (verwendet mit change/assign)',
    syntax: 'change self to State / assign $var to value',
    examples: ['change self to active', 'assign $selected to $item'],
  },
}
