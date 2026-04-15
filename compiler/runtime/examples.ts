/**
 * Mirror Runtime v2 Examples
 *
 * Das JavaScript spiegelt Mirror 1:1.
 * Reverse-Translation ist deterministisch.
 */

import { M } from './mirror-runtime'

// =============================================================================
// VERGLEICH: Mirror ↔ JavaScript
// =============================================================================

/**
 * MIRROR:
 * ```
 * Card bg #1a1a23, pad 16, rad 8
 *   Text "Welcome", weight bold
 *   Text "Description", col #888
 * ```
 *
 * JAVASCRIPT:
 */
export const card = M('Box', { bg: '#1a1a23', pad: 16, rad: 8 }, [
  M('Text', 'Welcome', { weight: 'bold' }),
  M('Text', 'Description', { col: '#888' }),
])

// Die Struktur ist identisch:
// - Komponenten-Name als String
// - Props als Objekt (exakt gleiche Namen)
// - Children als Array (= Einrückung)

// =============================================================================
// BUTTON MIT HOVER STATE
// =============================================================================

/**
 * MIRROR:
 * ```
 * Button "Click me", pad 12, bg #5BA8F5, col white, rad 6, cursor pointer
 *   state hover bg #2271C1
 * ```
 *
 * JAVASCRIPT:
 */
export const button = M('Button', 'Click me', {
  pad: 12,
  bg: '#5BA8F5',
  col: 'white',
  rad: 6,
  cursor: 'pointer',
  states: {
    hover: { bg: '#2271C1' },
  },
})

// =============================================================================
// DROPDOWN MIT KEYBOARD
// =============================================================================

/**
 * MIRROR:
 * ```
 * Dropdown state closed
 *   Trigger hor, gap 8, cursor pointer
 *     onclick toggle
 *     Text "Select option"
 *     Icon "chevron-down"
 *   Menu hidden, visible-when open
 *     Item pad 8, cursor pointer
 *       onclick select, close
 *       state highlighted bg #333
 *       Text "Option 1"
 *     Item pad 8, cursor pointer
 *       onclick select, close
 *       state highlighted bg #333
 *       Text "Option 2"
 *   onkeydown escape: close
 *   onkeydown arrow-down: highlight next
 *   onkeydown arrow-up: highlight prev
 *   onkeydown enter: select highlighted, close
 * ```
 *
 * JAVASCRIPT:
 */
export const dropdown = M(
  'Box',
  {
    state: 'closed',
    'onkeydown escape': 'close',
    'onkeydown arrow-down': 'highlight next',
    'onkeydown arrow-up': 'highlight prev',
    'onkeydown enter': ['select highlighted', 'close'],
  },
  [
    // Trigger
    M(
      'Box',
      {
        hor: true,
        gap: 8,
        cursor: 'pointer',
        onclick: 'toggle',
      },
      [M('Text', 'Select option'), M('Icon', 'chevron-down')]
    ),

    // Menu
    M(
      'Box',
      {
        hidden: true,
        'visible-when': 'open',
      },
      [
        M(
          'Box',
          {
            pad: 8,
            cursor: 'pointer',
            onclick: ['select', 'close'],
            states: { highlighted: { bg: '#333' } },
          },
          [M('Text', 'Option 1')]
        ),

        M(
          'Box',
          {
            pad: 8,
            cursor: 'pointer',
            onclick: ['select', 'close'],
            states: { highlighted: { bg: '#333' } },
          },
          [M('Text', 'Option 2')]
        ),
      ]
    ),
  ]
)

// =============================================================================
// COMPONENT DEFINITION & VERWENDUNG
// =============================================================================

/**
 * MIRROR:
 * ```
 * Card: bg #1a1a23, pad 16, rad 8
 *   Title:
 *   Content:
 *
 * Card
 *   Title "Welcome"
 *   Content "Description here"
 * ```
 *
 * JAVASCRIPT:
 */

// Definition
M.define('Card', { bg: '#1a1a23', pad: 16, rad: 8 }).slots('Title', 'Content').build()

// Verwendung - Slots als Props mit Großbuchstaben
export const cardWithSlots = M('Card', {
  Title: 'Welcome',
  Content: 'Description here',
})

// Oder mit komplexem Slot-Inhalt:
export const cardWithComplexSlots = M('Card', {
  Title: M('Text', 'Welcome', { weight: 'bold', 'font-size': 18 }),
  Content: M('Box', { gap: 8 }, [M('Text', 'Line 1'), M('Text', 'Line 2', { col: '#888' })]),
})

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * MIRROR:
 * ```
 * App hor, w full, h full
 *   Nav ver, gap 4, bg #1a1a23, pad 8, w 200
 *     NavItem pad 8, cursor pointer, route Home
 *       onclick navigate Home
 *       state selected bg #333
 *       Icon "home"
 *       Text "Home"
 *     NavItem pad 8, cursor pointer, route Settings
 *       onclick navigate Settings
 *       state selected bg #333
 *       Icon "settings"
 *       Text "Settings"
 *   Content w full, pad 16
 *     Home "Home content"
 *     Settings hidden, "Settings content"
 * ```
 *
 * JAVASCRIPT:
 */
export const navigation = M('Box', { hor: true, w: 'full', h: 'full' }, [
  M('Nav', { ver: true, gap: 4, bg: '#1a1a23', pad: 8, w: 200 }, [
    M(
      'Box',
      {
        pad: 8,
        cursor: 'pointer',
        route: 'Home',
        onclick: 'navigate Home',
        states: { selected: { bg: '#333' } },
      },
      [M('Icon', 'home'), M('Text', 'Home')]
    ),
    M(
      'Box',
      {
        pad: 8,
        cursor: 'pointer',
        route: 'Settings',
        onclick: 'navigate Settings',
        states: { selected: { bg: '#333' } },
      },
      [M('Icon', 'settings'), M('Text', 'Settings')]
    ),
  ]),
  M('Box', { w: 'full', pad: 16 }, [
    M('Box', { named: 'Home' }, [M('Text', 'Home content')]),
    M('Box', { named: 'Settings', hidden: true }, [M('Text', 'Settings content')]),
  ]),
])

// =============================================================================
// FORM
// =============================================================================

/**
 * MIRROR:
 * ```
 * Form ver, gap 16
 *   Input named Email, placeholder "Email"
 *     state invalid bor 1 #EF4444
 *     state valid bor 1 #22C55E
 *   Input named Password, type password, placeholder "Password"
 *   Button "Submit", bg #5BA8F5, col white, pad 12
 *     onclick call submitForm
 * ```
 *
 * JAVASCRIPT:
 */
export const form = M('Box', { ver: true, gap: 16 }, [
  M('Input', {
    named: 'Email',
    placeholder: 'Email',
    states: {
      invalid: { bor: [1, '#EF4444'] },
      valid: { bor: [1, '#22C55E'] },
    },
  }),
  M('Input', {
    named: 'Password',
    type: 'password',
    placeholder: 'Password',
  }),
  M('Button', 'Submit', {
    bg: '#5BA8F5',
    col: 'white',
    pad: 12,
    onclick: 'call submitForm',
  }),
])

// =============================================================================
// ICON GRID
// =============================================================================

/**
 * MIRROR:
 * ```
 * IconGrid grid 4, gap 8
 *   Icon "home", is 24
 *   Icon "settings", is 24
 *   Icon "user", is 24
 *   Icon "search", is 24
 * ```
 *
 * JAVASCRIPT:
 */
export const iconGrid = M('Box', { grid: 4, gap: 8 }, [
  M('Icon', 'home', { is: 24 }),
  M('Icon', 'settings', { is: 24 }),
  M('Icon', 'user', { is: 24 }),
  M('Icon', 'search', { is: 24 }),
])

// =============================================================================
// REVERSE TRANSLATION
// =============================================================================

/**
 * JavaScript → Mirror (deterministisch)
 */
export function demonstrateReverseTranslation() {
  const element = M('Box', { bg: '#1a1a23', pad: 16, rad: 8 }, [
    M('Text', 'Hello', { weight: 'bold' }),
    M('Text', 'World', { col: '#888' }),
  ])
  const mirrorCode = M.toMirror(element)
  console.log(mirrorCode) // Box bg #1a1a23, pad 16, rad 8 | Text "Hello", weight bold | Text "World", col #888
  return mirrorCode
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render to DOM:
 *
 * const ui = M.render(card, document.getElementById('app'))
 * ui.get('Email')?.focus()
 * ui.destroy()
 */

// =============================================================================
// ZUSAMMENFASSUNG: 1:1 Mapping
// =============================================================================

/**
 * | Mirror                    | JavaScript                           |
 * |---------------------------|--------------------------------------|
 * | Box                       | M('Box', ...)                        |
 * | Text "Hello"              | M('Text', 'Hello')                   |
 * | Icon "home"               | M('Icon', 'home')                    |
 * | bg #fff                   | { bg: '#fff' }                       |
 * | pad 16                    | { pad: 16 }                          |
 * | font-size 18              | { 'font-size': 18 }                  |
 * | Einrückung (Children)     | [...] Array                          |
 * | onclick toggle            | { onclick: 'toggle' }                |
 * | onclick select, close     | { onclick: ['select', 'close'] }     |
 * | onkeydown escape: close   | { 'onkeydown escape': 'close' }      |
 * | state hover bg #333       | { states: { hover: { bg: '#333' } }} |
 * | Card:                     | M.define('Card', ...)                |
 * |   Title:                  |   .slots('Title', ...)               |
 * | Card                      | M('Card', {                          |
 * |   Title "Hi"              |   Title: 'Hi'                        |
 * |                           | })                                   |
 */
