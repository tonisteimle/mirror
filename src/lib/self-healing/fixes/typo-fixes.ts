/**
 * Typo Fixes
 *
 * Phase 3: Fix common typos in events, actions, states, components, and properties.
 */

import type { Fix } from '../types'

// =============================================================================
// Component Typo Map
// =============================================================================

const COMPONENT_TYPOS: Record<string, string> = {
  // Common typos (both casing)
  'Buttn': 'Button',
  'buttn': 'Button',
  'Buton': 'Button',
  'buton': 'Button',
  'Buttton': 'Button',
  'Crad': 'Card',
  'crad': 'Card',
  'Cardd': 'Card',
  'Inputt': 'Input',
  'Inpuut': 'Input',
  'Imput': 'Input',
  'imput': 'Input',
  // NOTE: Toogle/Togle capital only - lowercase versions handled by fixActionTypos
  'Toogle': 'Toggle',
  'Togle': 'Toggle',
  'Textt': 'Text',
  'Iccon': 'Icon',
  'Iocn': 'Icon',
  'Roow': 'Row',
  'Rwo': 'Row',
  'Columnn': 'Column',
  'Colum': 'Column',
  'Boxx': 'Box',
  'Boz': 'Box',
  'Lable': 'Label',
  'Labeel': 'Label',
  'Navv': 'Nav',
  'Alrt': 'Alert',
  'Badgee': 'Badge',
  'Modall': 'Modal',
  'Dropdownn': 'Dropdown',
  // HTML → Mirror (excluding short words 'a', 'p' that cause false positives)
  'Div': 'Box',
  'div': 'Box',
  'Span': 'Text',
  'span': 'Text',
  'Img': 'Image',
  'img': 'Image',
  'H1': 'Title',
  'h1': 'Title',
  'H2': 'Title',
  'h2': 'Title',
  'H3': 'Title',
  'h3': 'Title',
  // Lowercase → Capitalized (excluding 'toggle' - handled by fixActionTypos)
  'button': 'Button',
  'card': 'Card',
  'input': 'Input',
  'text': 'Text',
  'icon': 'Icon',
  'row': 'Row',
  'column': 'Column',
  'box': 'Box',
  'label': 'Label',
  'nav': 'Nav',
  'alert': 'Alert',
  'badge': 'Badge',
  'modal': 'Modal',
  'dropdown': 'Dropdown',
  'image': 'Image',
  'link': 'Link',
  'title': 'Title',
  'header': 'Header',
  'footer': 'Footer',
  'sidebar': 'Sidebar',
}

// =============================================================================
// Property Typo Map
// =============================================================================

const PROPERTY_TYPOS: Record<string, string> = {
  // Background
  'backgrund': 'bg',
  'backgorund': 'bg',
  'backgroundd': 'bg',
  'backgroud': 'bg',
  'backgound': 'bg',
  'bakground': 'bg',
  'bgcolor': 'bg',
  'bg-color': 'bg',
  'hintergrund': 'bg', // German
  // Padding
  'paddng': 'pad',
  'paddin': 'pad',
  'paddingg': 'pad',
  'padd': 'pad',
  'paddign': 'pad',
  'pading': 'pad',
  'abstand': 'pad', // German
  // Color
  'colr': 'col',
  'colour': 'col',
  'colorr': 'col',
  'colro': 'col',
  'farbe': 'col', // German
  'textfarbe': 'col', // German
  // Radius
  'raduis': 'rad',
  'radious': 'rad',
  'radiuss': 'rad',
  'raidus': 'rad',
  'radis': 'rad',
  'rundung': 'rad', // German
  'ecken': 'rad', // German
  // Border
  'boader': 'bor',
  'bordr': 'bor',
  'boreder': 'bor',
  'boarder': 'bor',
  'rahmen': 'bor', // German
  // Size
  'heigth': 'height',
  'heiht': 'height',
  'heihgt': 'height',
  'höhe': 'height', // German
  'widht': 'width',
  'witdh': 'width',
  'widh': 'width',
  'breite': 'width', // German
  // Font
  'fontt': 'font',
  'font-sizee': 'fs',
  'fontsize': 'fs',
  'schrift': 'font', // German
  'schriftgröße': 'fs', // German
  // Weight
  'weigth': 'weight',
  'wieght': 'weight',
  'weightt': 'weight',
  // Other
  'opactiy': 'opacity',
  'opacitiy': 'opacity',
  'marginn': 'margin',
  'marign': 'margin',
  'gapp': 'gap',
  'gaap': 'gap',
  'lücke': 'gap', // German
  'schatten': 'shadow', // German
  'sichtbar': 'visible', // German
  'versteckt': 'hidden', // German
  // Icon
  'icn': 'icon',
  'iconn': 'icon',
  'ikon': 'icon',
}

// =============================================================================
// Fix Functions
// =============================================================================

/**
 * Fix component name typos.
 */
export function fixComponentTypos(code: string): string {
  // Process line by line to skip comment lines
  return code.split('\n').map(line => {
    // Skip comment lines
    if (line.trim().startsWith('//')) {
      return line
    }

    let result = line
    for (const [typo, correct] of Object.entries(COMPONENT_TYPOS)) {
      // Match at line start or after whitespace/dash
      const pattern = new RegExp(`(^|\\s|-)${typo}(?=\\s|$|:)`, 'g')
      result = result.replace(pattern, `$1${correct}`)
    }
    return result
  }).join('\n')
}

/**
 * Fix property name typos.
 */
export function fixPropertyTypos(code: string): string {
  let result = code
  for (const [typo, correct] of Object.entries(PROPERTY_TYPOS)) {
    // Match property followed by space and value
    const pattern = new RegExp(`\\b${typo}\\s+`, 'gi')
    result = result.replace(pattern, `${correct} `)
  }
  return result
}

/**
 * Fix common event typos.
 */
export function fixEventTypos(code: string): string {
  const eventTypos: Record<string, string> = {
    'onlick': 'onclick',
    'onclck': 'onclick',
    'onclik': 'onclick',
    'onhver': 'onhover',
    'onhovr': 'onhover',
    'onchage': 'onchange',
    'onchnge': 'onchange',
    'oninpt': 'oninput',
    'onfoucs': 'onfocus',
    'onblr': 'onblur',
    'onkeydonw': 'onkeydown',
    'onkeydwn': 'onkeydown',
  }

  let result = code
  for (const [typo, correct] of Object.entries(eventTypos)) {
    result = result.replace(new RegExp(`\\b${typo}\\b`, 'gi'), correct)
  }
  return result
}

/**
 * Fix camelCase event handlers to lowercase.
 * onClick → onclick, onHover → onhover, onChange → onchange, etc.
 */
export function fixCamelCaseEvents(code: string): string {
  const camelCaseEvents = [
    'onClick', 'onHover', 'onChange', 'onInput', 'onFocus', 'onBlur',
    'onKeyDown', 'onKeyUp', 'onKeyPress', 'onLoad', 'onSubmit',
  ]

  let result = code
  for (const event of camelCaseEvents) {
    const lowercase = event.toLowerCase()
    // Match onClick followed by space and action (not ={...})
    result = result.replace(
      new RegExp(`\\b${event}\\b(?!\\s*=)`, 'g'),
      lowercase
    )
  }
  return result
}

/**
 * Remove JSX-style ={...} syntax from event handlers and props.
 * onClick={handleClick} → onclick handleClick
 * size={24} → size 24
 */
export function removeJsxSyntax(code: string): string {
  let result = code

  // Remove ={...} with function reference: onClick={handleClick} → onclick handleClick
  result = result.replace(
    /\b(on[A-Za-z]+)=\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
    (_, event, handler) => `${event.toLowerCase()}`
  )

  // Remove ={number}: size={24} → size 24
  result = result.replace(
    /\b([a-z][a-zA-Z]*)=\{(\d+)\}/g,
    '$1 $2'
  )

  // Remove ={string}: color={"#333"} → color "#333"
  result = result.replace(
    /\b([a-z][a-zA-Z]*)=\{"([^"]+)"\}/g,
    '$1 "$2"'
  )

  // Remove remaining ={...} patterns
  result = result.replace(/=\{[^}]*\}/g, '')

  return result
}

/**
 * Fix CSS pseudo-class syntax at line start.
 * :hover → hover
 * :focus → focus
 * :active → active
 * :disabled → disabled
 */
export function fixCssPseudoClasses(code: string): string {
  return code.split('\n').map(line => {
    const trimmed = line.trim()
    // Match :hover, :focus, :active, :disabled at start of line (with optional leading whitespace)
    if (/^:(hover|focus|active|disabled)\b/.test(trimmed)) {
      const indent = line.match(/^(\s*)/)?.[1] || ''
      return line.replace(/^(\s*):/, '$1')
    }
    return line
  }).join('\n')
}

/**
 * Fix common action typos.
 */
export function fixActionTypos(code: string): string {
  const actionTypos: Record<string, string> = {
    'toogle': 'toggle',
    'togle': 'toggle',
    'shwo': 'show',
    'hdie': 'hide',
    'hidde': 'hide',
    'opne': 'open',
    'clsoe': 'close',
    'chnage': 'change',
    'asign': 'assign',
    'assgin': 'assign',
  }

  let result = code
  for (const [typo, correct] of Object.entries(actionTypos)) {
    result = result.replace(new RegExp(`\\b${typo}\\b`, 'gi'), correct)
  }
  return result
}

/**
 * Fix CSS state names that are not supported in Mirror.
 */
export function fixUnsupportedStates(code: string): string {
  const stateReplacements: Record<string, string> = {
    'focus-within': 'focus',
    'focus-visible': 'focus',
    'checked': 'active',
    'enabled': 'active',
    'visited': 'active',
    'first-child': 'default',
    'last-child': 'default',
  }

  let result = code
  for (const [cssState, mirrorState] of Object.entries(stateReplacements)) {
    result = result.replace(
      new RegExp(`(state\\s+)${cssState}\\b`, 'gi'),
      `$1${mirrorState}`
    )
  }
  return result
}

// =============================================================================
// Exported Fixes
// =============================================================================

export const typoFixes: Fix[] = [
  {
    name: 'fixComponentTypos',
    fn: fixComponentTypos,
    phase: 'typo',
    description: 'Fix common component name typos (Buttn→Button, Div→Box)',
  },
  {
    name: 'fixPropertyTypos',
    fn: fixPropertyTypos,
    phase: 'typo',
    description: 'Fix common property name typos (backgrund→bg, paddng→pad)',
  },
  {
    name: 'fixEventTypos',
    fn: fixEventTypos,
    phase: 'typo',
    description: 'Fix common event name typos',
  },
  {
    name: 'fixCamelCaseEvents',
    fn: fixCamelCaseEvents,
    phase: 'typo',
    description: 'Convert camelCase events to lowercase (onClick→onclick)',
  },
  {
    name: 'removeJsxSyntax',
    fn: removeJsxSyntax,
    phase: 'typo',
    description: 'Remove JSX ={...} syntax from props and events',
  },
  {
    name: 'fixCssPseudoClasses',
    fn: fixCssPseudoClasses,
    phase: 'typo',
    description: 'Convert :hover/:focus to hover/focus at line start',
  },
  {
    name: 'fixActionTypos',
    fn: fixActionTypos,
    phase: 'typo',
    description: 'Fix common action name typos',
  },
  {
    name: 'fixUnsupportedStates',
    fn: fixUnsupportedStates,
    phase: 'typo',
    description: 'Convert CSS pseudo-states to Mirror states',
  },
]
