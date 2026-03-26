/**
 * Autocomplete Completions
 *
 * Auto-generated aus src/schema/dsl.ts – nicht manuell editieren!
 */

// ============================================================================
// Keywords
// ============================================================================

export const RESERVED_KEYWORDS: string[] = [
  'as',
  'extends',
  'named',
  'each',
  'in',
  'if',
  'else',
  'then',
  'where',
  'and',
  'or',
  'not',
  'data',
  'keys',
  'selection',
  'route',
  'animation',
]

// ============================================================================
// Primitives
// ============================================================================

export const PRIMITIVES: string[] = [
  'Frame',
  'Text',
  'Button',
  'Input',
  'Textarea',
  'Label',
  'Image',
  'Icon',
  'Link',
  'Slot',
  'Divider',
  'Spacer',
  'Header',
  'Nav',
  'Main',
  'Section',
  'Article',
  'Aside',
  'Footer',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]

// ============================================================================
// Property Aliases
// ============================================================================

export const PROPERTY_ALIASES: Record<string, string> = {
  'w': 'width',
  'h': 'height',
  'minw': 'min-width',
  'maxw': 'max-width',
  'minh': 'min-height',
  'maxh': 'max-height',
  'hor': 'horizontal',
  'ver': 'vertical',
  'g': 'gap',
  'cen': 'center',
  'tl': 'top-left',
  'tc': 'top-center',
  'tr': 'top-right',
  'cl': 'center-left',
  'cr': 'center-right',
  'bl': 'bottom-left',
  'bc': 'bottom-center',
  'br': 'bottom-right',
  'positioned': 'pos',
  'pad': 'padding',
  'p': 'padding',
  'm': 'margin',
  'bg': 'background',
  'col': 'color',
  'c': 'color',
  'boc': 'border-color',
  'bor': 'border',
  'rad': 'radius',
  'fs': 'font-size',
  'pl': 'pin-left',
  'pr': 'pin-right',
  'pt': 'pin-top',
  'pb': 'pin-bottom',
  'pcx': 'pin-center-x',
  'pcy': 'pin-center-y',
  'pc': 'pin-center',
  'abs': 'absolute',
  'rot': 'rotate',
  'o': 'opacity',
  'opa': 'opacity',
  'blur-bg': 'backdrop-blur',
  'scroll-ver': 'scroll',
}

// ============================================================================
// Keywords per Property
// ============================================================================

export const PROPERTY_KEYWORDS: Record<string, string[]> = {
  'width': ['full', 'hug'],
  'height': ['full', 'hug'],
  'size': ['full', 'hug'],
  'aspect': ['square', 'video'],
  'grid': ['auto'],
  'align': ['top', 'bottom', 'left', 'right', 'center'],
  'weight': ['thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'black'],
  'font': ['sans', 'serif', 'mono', 'roboto'],
  'text-align': ['left', 'center', 'right', 'justify'],
  'shadow': ['sm', 'md', 'lg'],
  'cursor': ['pointer', 'grab', 'move', 'text', 'wait', 'not-allowed'],
}

// ============================================================================
// All Properties
// ============================================================================

export const ALL_PROPERTIES: string[] = [
  'width',
  'w',
  'height',
  'h',
  'size',
  'min-width',
  'minw',
  'max-width',
  'maxw',
  'min-height',
  'minh',
  'max-height',
  'maxh',
  'aspect',
  'horizontal',
  'hor',
  'vertical',
  'ver',
  'gap',
  'g',
  'center',
  'cen',
  'spread',
  'top-left',
  'tl',
  'top-center',
  'tc',
  'top-right',
  'tr',
  'center-left',
  'cl',
  'center-right',
  'cr',
  'bottom-left',
  'bl',
  'bottom-center',
  'bc',
  'bottom-right',
  'br',
  'wrap',
  'pos',
  'positioned',
  'stacked',
  'grid',
  'grow',
  'shrink',
  'align',
  'left',
  'right',
  'top',
  'bottom',
  'hor-center',
  'ver-center',
  'padding',
  'pad',
  'p',
  'margin',
  'm',
  'background',
  'bg',
  'color',
  'col',
  'c',
  'border-color',
  'boc',
  'border',
  'bor',
  'radius',
  'rad',
  'font-size',
  'fs',
  'weight',
  'line',
  'font',
  'text-align',
  'italic',
  'underline',
  'uppercase',
  'lowercase',
  'truncate',
  'x',
  'y',
  'pin-left',
  'pl',
  'pin-right',
  'pr',
  'pin-top',
  'pt',
  'pin-bottom',
  'pb',
  'pin-center-x',
  'pcx',
  'pin-center-y',
  'pcy',
  'pin-center',
  'pc',
  'z',
  'absolute',
  'abs',
  'fixed',
  'relative',
  'rotate',
  'rot',
  'scale',
  'translate',
  'opacity',
  'o',
  'opa',
  'shadow',
  'cursor',
  'blur',
  'backdrop-blur',
  'blur-bg',
  'hidden',
  'visible',
  'disabled',
  'scroll',
  'scroll-ver',
  'scroll-hor',
  'scroll-both',
  'clip',
]

// ============================================================================
// Color Properties
// ============================================================================

export const COLOR_PROPERTIES: string[] = [
  'background',
  'bg',
  'color',
  'col',
  'c',
  'border-color',
  'boc',
]

// ============================================================================
// Token Properties
// ============================================================================

export const TOKEN_PROPERTIES: string[] = [
  'width',
  'w',
  'height',
  'h',
  'size',
  'min-width',
  'minw',
  'max-width',
  'maxw',
  'min-height',
  'minh',
  'max-height',
  'maxh',
  'gap',
  'g',
  'padding',
  'pad',
  'p',
  'margin',
  'm',
  'background',
  'bg',
  'color',
  'col',
  'c',
  'border-color',
  'boc',
  'border',
  'bor',
  'radius',
  'rad',
  'font-size',
  'fs',
  'line',
  'font',
]

// ============================================================================
// Events
// ============================================================================

export const EVENTS: string[] = [
  'onclick',
  'onhover',
  'onfocus',
  'onblur',
  'onchange',
  'oninput',
  'onkeydown',
  'onkeyup',
  'onclick-outside',
  'onload',
  'onenter',
  'onexit',
]

// ============================================================================
// Actions
// ============================================================================

export const ACTIONS: string[] = [
  'show',
  'hide',
  'toggle',
  'open',
  'close',
  'select',
  'highlight',
  'activate',
  'deactivate',
  'page',
  'call',
  'assign',
  'focus',
  'blur',
  'submit',
  'reset',
  'navigate',
]

// ============================================================================
// States
// ============================================================================

export const STATES: string[] = [
  'hover',
  'focus',
  'active',
  'disabled',
  'selected',
  'highlighted',
  'expanded',
  'collapsed',
  'on',
  'off',
  'open',
  'closed',
  'filled',
  'valid',
  'invalid',
  'loading',
  'error',
]

export const SYSTEM_STATES: string[] = [
  'hover',
  'focus',
  'active',
  'disabled',
]

export const CUSTOM_STATES: string[] = [
  'selected',
  'highlighted',
  'expanded',
  'collapsed',
  'on',
  'off',
  'open',
  'closed',
  'filled',
  'valid',
  'invalid',
  'loading',
  'error',
]

// ============================================================================
// Keyboard Keys
// ============================================================================

export const KEYBOARD_KEYS: string[] = [
  'escape',
  'enter',
  'space',
  'tab',
  'backspace',
  'delete',
  'arrow-up',
  'arrow-down',
  'arrow-left',
  'arrow-right',
  'home',
  'end',
]