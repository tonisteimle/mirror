/**
 * @module dsl/schema/events
 * @description Event definitions for Mirror DSL
 */

import type { EventDefinition } from './types'

// =============================================================================
// EVENTS
// =============================================================================

export const EVENTS: Record<string, EventDefinition> = {
  onclick: {
    name: 'onclick',
    description: 'Klick-Event',
    supportsTiming: false,
    examples: ['onclick toggle', 'onclick show Modal'],
  },
  'onclick-outside': {
    name: 'onclick-outside',
    description: 'Klick außerhalb des Elements',
    supportsTiming: false,
    examples: ['onclick-outside close'],
  },
  'onclick-inside': {
    name: 'onclick-inside',
    description: 'Klick innerhalb des Elements',
    supportsTiming: false,
    examples: ['onclick-inside activate'],
  },
  onhover: {
    name: 'onhover',
    description: 'Hover-Event',
    supportsTiming: false,
    examples: ['onhover show Tooltip'],
  },
  onchange: {
    name: 'onchange',
    description: 'Wert geändert (nach Blur)',
    supportsTiming: true,
    examples: ['onchange validate'],
  },
  oninput: {
    name: 'oninput',
    description: 'Während Eingabe',
    supportsTiming: true,
    examples: ['oninput debounce 300 filter Results'],
  },
  onload: {
    name: 'onload',
    description: 'Komponente geladen',
    supportsTiming: false,
    examples: ['onload activate'],
  },
  onfocus: {
    name: 'onfocus',
    description: 'Fokus erhalten',
    supportsTiming: false,
    examples: ['onfocus show Hint'],
  },
  onblur: {
    name: 'onblur',
    description: 'Fokus verloren',
    supportsTiming: true,
    examples: ['onblur delay 200 hide Results'],
  },
  onkeydown: {
    name: 'onkeydown',
    description: 'Taste gedrückt',
    keyModifiers: [
      'escape', 'enter', 'tab', 'space',
      'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
      'backspace', 'delete', 'home', 'end',
    ],
    supportsTiming: false,
    examples: [
      'onkeydown escape: close',
      'onkeydown enter: select highlighted',
      'onkeydown arrow-down: highlight next',
    ],
  },
  onkeyup: {
    name: 'onkeyup',
    description: 'Taste losgelassen',
    keyModifiers: [
      'escape', 'enter', 'tab', 'space',
      'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
      'backspace', 'delete', 'home', 'end',
    ],
    supportsTiming: false,
    examples: ['onkeyup enter: submit'],
  },
  onsubmit: {
    name: 'onsubmit',
    description: 'Formular absenden',
    supportsTiming: false,
    examples: ['onsubmit validate'],
  },
  onopen: {
    name: 'onopen',
    description: 'Overlay/Dialog geöffnet',
    supportsTiming: false,
    examples: ['onopen focus SearchInput'],
  },
  onclose: {
    name: 'onclose',
    description: 'Overlay/Dialog geschlossen',
    supportsTiming: false,
    examples: ['onclose reset'],
  },
  onfill: {
    name: 'onfill',
    description: 'Segment gefüllt',
    supportsTiming: false,
    examples: ['onfill focus next'],
  },
  oncomplete: {
    name: 'oncomplete',
    description: 'Alle Segmente gefüllt',
    supportsTiming: false,
    examples: ['oncomplete validate'],
  },
  onempty: {
    name: 'onempty',
    description: 'Segment geleert',
    supportsTiming: false,
    examples: ['onempty focus prev'],
  },
}
