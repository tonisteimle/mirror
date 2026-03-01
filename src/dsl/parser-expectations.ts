/**
 * @module dsl/parser-expectations
 * @description Expected parser outputs for schema-driven compliance testing.
 *
 * This file defines the expected parsing and CSS generation results for all DSL elements.
 * Used by schema-compliance.test.ts to verify parser correctness.
 *
 * IMPORTANT: Property names use INTERNAL (short) form for parsed properties:
 * - g (not gap)
 * - pad (not padding)
 * - bg (not background)
 * - col (not color)
 * - hor, ver (not horizontal, vertical)
 * - etc.
 *
 * Flow: Input → Preprocessor (normalizes to canonical) → Parser (stores in short internal form)
 */

import type React from 'react'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface PropertyExpectation {
  /** Mirror DSL input code */
  input: string
  /** Expected parsed property object (partial match) */
  property?: Record<string, unknown>
  /** Expected CSS output (partial match) */
  css?: React.CSSProperties
  /** Optional explanation for edge cases */
  note?: string
}

export interface EventExpectation {
  /** Mirror DSL input code */
  input: string
  /** Expected event name */
  event: string
  /** Key modifier for keyboard events */
  key?: string
  /** Expected action type */
  actionType?: string
  /** Expected action target */
  target?: string
  /** Debounce value in ms */
  debounce?: number
  /** Delay value in ms */
  delay?: number
}

export interface StateExpectation {
  /** Mirror DSL input code (multiline) */
  input: string
  /** Expected state name */
  stateName: string
  /** Expected properties within state */
  stateProperties?: Record<string, unknown>
  /** State type */
  type?: 'system' | 'behavior'
}

export interface ActionExpectation {
  /** Mirror DSL input code */
  input: string
  /** Event that triggers action */
  event: string
  /** Expected actions array */
  actions: Array<{
    type: string
    target?: string
    value?: unknown
    animation?: string
    position?: string
  }>
}

export interface AnimationExpectation {
  /** Mirror DSL input code */
  input: string
  /** Animation type */
  type: 'show' | 'hide' | 'animate'
  /** Animation names */
  animations?: string[]
  /** Duration in ms */
  duration?: number
}

// =============================================================================
// PROPERTY EXPECTATIONS
// =============================================================================
// Property expectations use INTERNAL (short) forms for parsed properties

export const PROPERTY_EXPECTATIONS = {
  // ---------------------------------------------------------------------------
  // LAYOUT PROPERTIES
  // ---------------------------------------------------------------------------
  layout: {
    horizontal: [
      { input: 'Box horizontal', property: { hor: true }, css: { flexDirection: 'row' } },
      { input: 'Box hor', property: { hor: true }, css: { flexDirection: 'row' } },
    ],
    vertical: [
      { input: 'Box vertical', property: { ver: true }, css: { flexDirection: 'column' } },
      { input: 'Box ver', property: { ver: true }, css: { flexDirection: 'column' } },
    ],
    gap: [
      { input: 'Box gap 16', property: { g: 16 }, css: { gap: '16px' } },
      { input: 'Box g 8', property: { g: 8 }, css: { gap: '8px' } },
      { input: 'Box gap 0', property: { g: 0 }, css: { gap: '0px' } },
    ],
    'gap-col': [
      { input: 'Box gap-col 16', property: { 'gap-col': 16 }, css: { columnGap: '16px' } },
      { input: 'Box gap-x 8', property: { 'gap-col': 8 }, css: { columnGap: '8px' } },
    ],
    'gap-row': [
      { input: 'Box gap-row 16', property: { 'gap-row': 16 }, css: { rowGap: '16px' } },
      { input: 'Box gap-y 8', property: { 'gap-row': 8 }, css: { rowGap: '8px' } },
    ],
    spread: [
      // Parser normalizes spread to between
      { input: 'Box spread', property: { between: true }, css: { justifyContent: 'space-between' } },
    ],
    between: [
      { input: 'Box between', property: { between: true }, css: { justifyContent: 'space-between' } },
    ],
    wrap: [
      { input: 'Box wrap', property: { wrap: true }, css: { flexWrap: 'wrap' } },
    ],
    stacked: [
      { input: 'Box stacked', property: { stacked: true }, css: { display: 'grid' } },
    ],
    grow: [
      { input: 'Box grow', property: { grow: true }, css: { flexGrow: 1 } },
    ],
    shrink: [
      { input: 'Box shrink 0', property: { shrink: 0 }, css: { flexShrink: 0 } },
      { input: 'Box shrink 1', property: { shrink: 1 }, css: { flexShrink: 1 } },
    ],
    grid: [
      { input: 'Box grid 3', property: { grid: 3 }, css: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' } },
      { input: 'Box grid 2, g 16', property: { grid: 2, g: 16 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // ALIGNMENT PROPERTIES
  // ---------------------------------------------------------------------------
  alignment: {
    center: [
      // center stores as align_main/align_cross
      { input: 'Box center', property: { align_main: 'cen', align_cross: 'cen' }, css: { justifyContent: 'center', alignItems: 'center' } },
      { input: 'Box cen', property: { align_main: 'cen', align_cross: 'cen' }, css: { justifyContent: 'center', alignItems: 'center' } },
    ],
    'horizontal-left': [
      { input: 'Box left', property: { 'hor-l': true } },
      { input: 'Box hor-l', property: { 'hor-l': true } },
    ],
    'horizontal-right': [
      { input: 'Box right', property: { 'hor-r': true } },
      { input: 'Box hor-r', property: { 'hor-r': true } },
    ],
    'horizontal-center': [
      { input: 'Box hor-center', property: { 'hor-cen': true } },
      { input: 'Box hor-cen', property: { 'hor-cen': true } },
    ],
    'vertical-top': [
      { input: 'Box top', property: { 'ver-t': true } },
      { input: 'Box ver-t', property: { 'ver-t': true } },
    ],
    'vertical-bottom': [
      { input: 'Box bottom', property: { 'ver-b': true } },
      { input: 'Box ver-b', property: { 'ver-b': true } },
    ],
    'vertical-center': [
      { input: 'Box ver-center', property: { 'ver-cen': true } },
      { input: 'Box ver-cen', property: { 'ver-cen': true } },
    ],
    centered: [
      { input: 'Box centered', property: { centered: true } },
    ],
  },

  // ---------------------------------------------------------------------------
  // SIZING PROPERTIES
  // ---------------------------------------------------------------------------
  sizing: {
    width: [
      { input: 'Box width 300', property: { w: 300 }, css: { width: '300px' } },
      { input: 'Box w 200', property: { w: 200 }, css: { width: '200px' } },
      // width hug/full only sets w
      { input: 'Box width hug', property: { w: 'min' }, css: { width: 'fit-content' } },
      { input: 'Box width full', property: { w: 'max' }, css: { width: '100%', flexGrow: 1 } },
      // Percentage values are preserved as strings with %
      { input: 'Box width 50%', property: { w: '50%' } },
    ],
    height: [
      { input: 'Box height 400', property: { h: 400 }, css: { height: '400px' } },
      { input: 'Box h 200', property: { h: 200 }, css: { height: '200px' } },
      // height hug/full only sets h
      { input: 'Box height hug', property: { h: 'min' }, css: { height: 'fit-content' } },
      { input: 'Box height full', property: { h: 'max' }, css: { height: '100%', flexGrow: 1 } },
    ],
    size: [
      // Parser uses short w/h internally
      { input: 'Box size 100 200', property: { w: 100, h: 200 } },
      { input: 'Box size hug', property: { w: 'min', h: 'min' } },
      { input: 'Box size full', property: { w: 'max', h: 'max' } },
    ],
    'min-width': [
      { input: 'Box min-width 200', property: { minw: 200 }, css: { minWidth: '200px' } },
      { input: 'Box minw 100', property: { minw: 100 }, css: { minWidth: '100px' } },
    ],
    'max-width': [
      { input: 'Box max-width 800', property: { maxw: 800 }, css: { maxWidth: '800px' } },
      { input: 'Box maxw 600', property: { maxw: 600 }, css: { maxWidth: '600px' } },
    ],
    'min-height': [
      { input: 'Box min-height 100', property: { minh: 100 }, css: { minHeight: '100px' } },
      { input: 'Box minh 50', property: { minh: 50 }, css: { minHeight: '50px' } },
    ],
    'max-height': [
      { input: 'Box max-height 600', property: { maxh: 600 }, css: { maxHeight: '600px' } },
      { input: 'Box maxh 400', property: { maxh: 400 }, css: { maxHeight: '400px' } },
    ],
    hug: [
      // Parser expands to w/h with min values
      { input: 'Box hug', property: { w: 'min', h: 'min' }, css: { width: 'fit-content', height: 'fit-content' } },
    ],
    full: [
      // Parser expands to w/h with max values
      { input: 'Box full', property: { w: 'max', h: 'max' }, css: { width: '100%', height: '100%', flexGrow: 1 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // SPACING PROPERTIES
  // ---------------------------------------------------------------------------
  spacing: {
    padding: [
      { input: 'Box padding 16', property: { pad: 16 }, css: { padding: '16px' } },
      { input: 'Box pad 12', property: { pad: 12 }, css: { padding: '12px' } },
      { input: 'Box p 8', property: { pad: 8 } },
      // Shorthand directional
      { input: 'Box pt 16', property: { pad_u: 16 } },
      { input: 'Box pb 16', property: { pad_d: 16 } },
      { input: 'Box pl 16', property: { pad_l: 16 } },
      { input: 'Box pr 16', property: { pad_r: 16 } },
    ],
    margin: [
      { input: 'Box margin 16', property: { mar: 16 }, css: { margin: '16px' } },
      { input: 'Box mar 12', property: { mar: 12 }, css: { margin: '12px' } },
      { input: 'Box m 8', property: { mar: 8 } },
      // Shorthand directional
      { input: 'Box mt 16', property: { mar_u: 16 } },
      { input: 'Box mb 16', property: { mar_d: 16 } },
      { input: 'Box ml 16', property: { mar_l: 16 } },
      { input: 'Box mr 16', property: { mar_r: 16 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // COLOR PROPERTIES
  // ---------------------------------------------------------------------------
  color: {
    color: [
      { input: 'Box color #333', property: { col: '#333' }, css: { color: '#333' } },
      { input: 'Box col #FFF', property: { col: '#FFF' }, css: { color: '#FFF' } },
      { input: 'Box c #3B82F6', property: { col: '#3B82F6' } },
    ],
    background: [
      { input: 'Box background #3B82F6', property: { bg: '#3B82F6' }, css: { backgroundColor: '#3B82F6' } },
      { input: 'Box bg #333', property: { bg: '#333' }, css: { backgroundColor: '#333' } },
      { input: 'Box bg transparent', property: { bg: 'transparent' }, css: { backgroundColor: 'transparent' } },
    ],
    'border-color': [
      { input: 'Box border-color #555', property: { boc: '#555' }, css: { borderColor: '#555' } },
      { input: 'Box boc #3B82F6', property: { boc: '#3B82F6' }, css: { borderColor: '#3B82F6' } },
    ],
  },

  // ---------------------------------------------------------------------------
  // BORDER PROPERTIES
  // ---------------------------------------------------------------------------
  border: {
    border: [
      { input: 'Box border 1', property: { bor: 1 }, css: { border: '1px solid' } },
      { input: 'Box bor 2', property: { bor: 2 }, css: { border: '2px solid' } },
    ],
    radius: [
      { input: 'Box radius 8', property: { rad: 8 }, css: { borderRadius: '8px' } },
      { input: 'Box rad 4', property: { rad: 4 }, css: { borderRadius: '4px' } },
      // Note: Corner-specific radius (radius tl 8) is not yet supported by the parser
      // The preprocessor normalizes rad→radius but doesn't transform corner syntax
    ],
  },

  // ---------------------------------------------------------------------------
  // TYPOGRAPHY PROPERTIES
  // ---------------------------------------------------------------------------
  typography: {
    'text-size': [
      { input: 'Text text-size 14', css: { fontSize: '14px' } },
      { input: 'Text fs 12', css: { fontSize: '12px' } },
      { input: 'Text ts 16', css: { fontSize: '16px' } },
    ],
    'font-weight': [
      { input: 'Text weight bold', property: { weight: 700 }, css: { fontWeight: 700 } },
      { input: 'Text weight 400', property: { weight: 400 }, css: { fontWeight: 400 } },
    ],
    'line-height': [
      { input: 'Text line 24', property: { line: 24 } },
    ],
    'font-family': [
      { input: 'Text font "SF Pro"', property: { font: 'SF Pro' } },
    ],
    'text-align': [
      // Parser normalizes text-align to align
      { input: 'Text text-align center', property: { align: 'center' }, css: { textAlign: 'center' } },
      { input: 'Text align right', property: { align: 'right' }, css: { textAlign: 'right' } },
    ],
    italic: [
      { input: 'Text italic', property: { italic: true }, css: { fontStyle: 'italic' } },
    ],
    underline: [
      { input: 'Text underline', property: { underline: true }, css: { textDecoration: 'underline' } },
    ],
    truncate: [
      { input: 'Text truncate', property: { truncate: true } },
    ],
    uppercase: [
      { input: 'Text uppercase', property: { uppercase: true }, css: { textTransform: 'uppercase' } },
    ],
    lowercase: [
      { input: 'Text lowercase', property: { lowercase: true }, css: { textTransform: 'lowercase' } },
    ],
  },

  // ---------------------------------------------------------------------------
  // ICON PROPERTIES
  // ---------------------------------------------------------------------------
  // NOTE: Icon properties remain in long form internally (historical decision)
  // They are NOT normalized to short form like other properties
  icon: {
    'icon-size': [
      { input: 'Icon "search", icon-size 20', property: { 'icon-size': 20 } },
      { input: 'Icon "home", is 24', property: { 'icon-size': 24 } },
    ],
    'icon-weight': [
      { input: 'Icon "search", icon-weight 300', property: { 'icon-weight': 300 } },
      { input: 'Icon "home", iw 600', property: { 'icon-weight': 600 } },
    ],
    'icon-color': [
      { input: 'Icon "search", icon-color #3B82F6', property: { 'icon-color': '#3B82F6' } },
      { input: 'Icon "home", ic #FFF', property: { 'icon-color': '#FFF' } },
    ],
    fill: [
      { input: 'Icon "home", fill', property: { fill: true } },
    ],
    material: [
      { input: 'Icon "home", material', property: { material: true } },
    ],
  },

  // ---------------------------------------------------------------------------
  // VISUAL PROPERTIES
  // ---------------------------------------------------------------------------
  visual: {
    opacity: [
      { input: 'Box opacity 0.5', property: { o: 0.5 }, css: { opacity: 0.5 } },
      { input: 'Box o 0.8', property: { o: 0.8 }, css: { opacity: 0.8 } },
      { input: 'Box opa 0.3', property: { o: 0.3 }, css: { opacity: 0.3 } },
    ],
    shadow: [
      { input: 'Box shadow sm', property: { shadow: 'sm' } },
      { input: 'Box shadow md', property: { shadow: 'md' } },
      { input: 'Box shadow lg', property: { shadow: 'lg' } },
    ],
    cursor: [
      { input: 'Box cursor pointer', property: { cursor: 'pointer' }, css: { cursor: 'pointer' } },
      { input: 'Box cursor grab', property: { cursor: 'grab' }, css: { cursor: 'grab' } },
    ],
    z: [
      { input: 'Box z 10', property: { z: 10 }, css: { zIndex: 10 } },
      { input: 'Box z 100', property: { z: 100 }, css: { zIndex: 100 } },
    ],
    hidden: [
      { input: 'Box hidden', property: { hidden: true } },
    ],
    visible: [
      // Parser represents visible as hidden: false
      { input: 'Box visible', property: { hidden: false } },
    ],
    disabled: [
      { input: 'Box disabled', property: { disabled: true } },
    ],
    rotate: [
      { input: 'Box rotate 45', property: { rot: 45 } },
      { input: 'Box rot 90', property: { rot: 90 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // SCROLL PROPERTIES
  // ---------------------------------------------------------------------------
  scroll: {
    scroll: [
      { input: 'Box scroll', property: { scroll: true }, css: { overflowY: 'auto' } },
    ],
    'scroll-vertical': [
      { input: 'Box scroll-vertical', property: { 'scroll-vertical': true }, css: { overflowY: 'auto' } },
      { input: 'Box scroll-ver', property: { 'scroll-vertical': true }, css: { overflowY: 'auto' } },
    ],
    'scroll-horizontal': [
      { input: 'Box scroll-horizontal', property: { 'scroll-horizontal': true }, css: { overflowX: 'auto' } },
      { input: 'Box scroll-hor', property: { 'scroll-horizontal': true }, css: { overflowX: 'auto' } },
    ],
    'scroll-both': [
      { input: 'Box scroll-both', property: { 'scroll-both': true }, css: { overflow: 'auto' } },
    ],
    clip: [
      { input: 'Box clip', property: { clip: true }, css: { overflow: 'hidden' } },
    ],
    snap: [
      { input: 'Box snap', property: { snap: true } },
    ],
  },

  // ---------------------------------------------------------------------------
  // HOVER PROPERTIES (Inline)
  // ---------------------------------------------------------------------------
  hover: {
    'hover-background': [
      { input: 'Box hover-background #555', property: { 'hover-background': '#555' } },
      { input: 'Box hover-bg #333', property: { 'hover-background': '#333' } },
    ],
    'hover-color': [
      { input: 'Box hover-color #FFF', property: { 'hover-color': '#FFF' } },
      { input: 'Box hover-col #3B82F6', property: { 'hover-color': '#3B82F6' } },
    ],
    'hover-opacity': [
      { input: 'Box hover-opacity 0.8', property: { 'hover-opacity': 0.8 } },
      { input: 'Box hover-opa 0.5', property: { 'hover-opacity': 0.5 } },
    ],
    'hover-scale': [
      { input: 'Box hover-scale 1.05', property: { 'hover-scale': 1.05 } },
    ],
    'hover-border': [
      { input: 'Box hover-border 2', property: { 'hover-border': 2 } },
      { input: 'Box hover-bor 1', property: { 'hover-border': 1 } },
    ],
    'hover-border-color': [
      { input: 'Box hover-border-color #3B82F6', property: { 'hover-border-color': '#3B82F6' } },
      { input: 'Box hover-boc #FFF', property: { 'hover-border-color': '#FFF' } },
    ],
    'hover-radius': [
      { input: 'Box hover-radius 12', property: { 'hover-radius': 12 } },
      { input: 'Box hover-rad 8', property: { 'hover-radius': 8 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // FORM PROPERTIES
  // ---------------------------------------------------------------------------
  form: {
    placeholder: [
      { input: 'Input placeholder "Enter email..."', property: { placeholder: 'Enter email...' } },
    ],
    type: [
      { input: 'Input type email', property: { type: 'email' } },
      { input: 'Input type password', property: { type: 'password' } },
    ],
    value: [
      { input: 'Input value 50', property: { value: 50 } },
    ],
    step: [
      { input: 'Input step 1', property: { step: 1 } },
    ],
    rows: [
      { input: 'Textarea rows 4', property: { rows: 4 } },
    ],
    segments: [
      { input: 'Segment segments 4', property: { segments: 4 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // IMAGE PROPERTIES
  // ---------------------------------------------------------------------------
  image: {
    src: [
      { input: 'Image src "https://example.com/image.jpg"', property: { src: 'https://example.com/image.jpg' } },
    ],
    alt: [
      { input: 'Image alt "Description"', property: { alt: 'Description' } },
    ],
    fit: [
      { input: 'Image fit cover', property: { fit: 'cover' } },
      { input: 'Image fit contain', property: { fit: 'contain' } },
    ],
  },

  // ---------------------------------------------------------------------------
  // LINK PROPERTIES
  // ---------------------------------------------------------------------------
  link: {
    href: [
      { input: 'Link href "/about"', property: { href: '/about' } },
    ],
    target: [
      { input: 'Link target _blank', property: { target: '_blank' } },
    ],
  },

  // ---------------------------------------------------------------------------
  // DIMENSION SHORTHAND
  // ---------------------------------------------------------------------------
  shorthand: {
    dimension: [
      { input: 'Box 300, pad 16', property: { w: 300, pad: 16 }, note: 'Single dimension = width' },
      { input: 'Box 300, 400, pad 16', property: { w: 300, h: 400, pad: 16 }, note: 'Two dimensions = width, height' },
      { input: 'Card 200, pad 8', property: { w: 200, pad: 8 } },
    ],
  },
} as const

// =============================================================================
// EVENT EXPECTATIONS
// =============================================================================

export const EVENT_EXPECTATIONS: Record<string, EventExpectation[]> = {
  // Basic events
  onclick: [
    { input: 'Button onclick toggle', event: 'onclick', actionType: 'toggle' },
    { input: 'Button onclick show Modal', event: 'onclick', actionType: 'show', target: 'Modal' },
    { input: 'Button onclick hide Dropdown', event: 'onclick', actionType: 'hide', target: 'Dropdown' },
  ],
  'onclick-outside': [
    { input: 'Box onclick-outside close', event: 'onclick-outside', actionType: 'close' },
  ],
  onhover: [
    { input: 'Box onhover show Tooltip', event: 'onhover', actionType: 'show', target: 'Tooltip' },
  ],
  onfocus: [
    { input: 'Input onfocus show Hint', event: 'onfocus', actionType: 'show', target: 'Hint' },
  ],
  onblur: [
    { input: 'Input onblur hide Results', event: 'onblur', actionType: 'hide', target: 'Results' },
    { input: 'Input onblur delay 200 hide Results', event: 'onblur', actionType: 'hide', target: 'Results', delay: 200 },
  ],
  onchange: [
    { input: 'Input onchange validate', event: 'onchange', actionType: 'validate' },
  ],
  oninput: [
    { input: 'Input oninput filter Results', event: 'oninput', actionType: 'filter', target: 'Results' },
    { input: 'Input oninput debounce 300 filter Results', event: 'oninput', actionType: 'filter', target: 'Results', debounce: 300 },
  ],
  onload: [
    { input: 'Box onload activate', event: 'onload', actionType: 'activate' },
  ],
  onsubmit: [
    { input: 'Form onsubmit validate', event: 'onsubmit', actionType: 'validate' },
  ],
  onopen: [
    { input: 'Modal onopen focus SearchInput', event: 'onopen', actionType: 'focus', target: 'SearchInput' },
  ],
  onclose: [
    { input: 'Modal onclose reset', event: 'onclose', actionType: 'reset' },
  ],

  // Keyboard events
  'onkeydown-escape': [
    { input: 'Input\n  onkeydown escape: close', event: 'onkeydown', key: 'escape', actionType: 'close' },
  ],
  'onkeydown-enter': [
    { input: 'Input\n  onkeydown enter: select highlighted', event: 'onkeydown', key: 'enter', actionType: 'select', target: 'highlighted' },
  ],
  'onkeydown-arrow-down': [
    { input: 'Input\n  onkeydown arrow-down: highlight next', event: 'onkeydown', key: 'arrow-down', actionType: 'highlight', target: 'next' },
  ],
  'onkeydown-arrow-up': [
    { input: 'Input\n  onkeydown arrow-up: highlight prev', event: 'onkeydown', key: 'arrow-up', actionType: 'highlight', target: 'prev' },
  ],
  'onkeydown-tab': [
    { input: 'Input\n  onkeydown tab: focus next', event: 'onkeydown', key: 'tab', actionType: 'focus', target: 'next' },
  ],
  'onkeydown-space': [
    { input: 'Button\n  onkeydown space: activate', event: 'onkeydown', key: 'space', actionType: 'activate' },
  ],
}

// =============================================================================
// STATE EXPECTATIONS
// =============================================================================

export const STATE_EXPECTATIONS: Record<string, StateExpectation[]> = {
  // System states (using short internal forms)
  hover: [
    {
      input: `Button
  hover
    bg #555`,
      stateName: 'hover',
      stateProperties: { bg: '#555' },
      type: 'system',
    },
  ],
  focus: [
    {
      input: `Input
  focus
    boc #3B82F6`,
      stateName: 'focus',
      stateProperties: { boc: '#3B82F6' },
      type: 'system',
    },
  ],
  active: [
    {
      input: `Button
  active
    bg #444`,
      stateName: 'active',
      stateProperties: { bg: '#444' },
      type: 'system',
    },
  ],
  disabled: [
    {
      input: `Button
  state disabled
    o 0.5`,
      stateName: 'disabled',
      stateProperties: { o: 0.5 },
      type: 'system',
    },
  ],

  // Behavior states (using short internal forms)
  highlighted: [
    {
      input: `Item
  state highlighted
    bg #333`,
      stateName: 'highlighted',
      stateProperties: { bg: '#333' },
      type: 'behavior',
    },
  ],
  selected: [
    {
      input: `Item
  state selected
    bg #3B82F6`,
      stateName: 'selected',
      stateProperties: { bg: '#3B82F6' },
      type: 'behavior',
    },
  ],
  expanded: [
    {
      input: `Accordion
  state expanded
    h 400`,
      stateName: 'expanded',
      stateProperties: { h: 400 },
      type: 'behavior',
    },
  ],
  collapsed: [
    {
      input: `Accordion
  state collapsed
    h 0`,
      stateName: 'collapsed',
      stateProperties: { h: 0 },
      type: 'behavior',
    },
  ],
  on: [
    {
      input: `Toggle
  state on
    bg #22C55E`,
      stateName: 'on',
      stateProperties: { bg: '#22C55E' },
      type: 'behavior',
    },
  ],
  off: [
    {
      input: `Toggle
  state off
    bg #71717A`,
      stateName: 'off',
      stateProperties: { bg: '#71717A' },
      type: 'behavior',
    },
  ],
}

// =============================================================================
// ACTION EXPECTATIONS
// =============================================================================

export const ACTION_EXPECTATIONS: Record<string, ActionExpectation[]> = {
  // Visibility actions
  toggle: [
    { input: 'Button onclick toggle', event: 'onclick', actions: [{ type: 'toggle' }] },
  ],
  show: [
    { input: 'Button onclick show Modal', event: 'onclick', actions: [{ type: 'show', target: 'Modal' }] },
  ],
  hide: [
    { input: 'Button onclick hide Modal', event: 'onclick', actions: [{ type: 'hide', target: 'Modal' }] },
  ],
  open: [
    { input: 'Button onclick open Dropdown below', event: 'onclick', actions: [{ type: 'open', target: 'Dropdown', position: 'below' }] },
    { input: 'Button onclick open Modal center', event: 'onclick', actions: [{ type: 'open', target: 'Modal', position: 'center' }] },
  ],
  close: [
    { input: 'Button onclick close', event: 'onclick', actions: [{ type: 'close' }] },
  ],
  page: [
    { input: 'NavItem onclick page Home', event: 'onclick', actions: [{ type: 'page', target: 'Home' }] },
  ],

  // State change actions
  change: [
    { input: 'Button onclick change self to active', event: 'onclick', actions: [{ type: 'change', target: 'self' }] },
  ],
  activate: [
    { input: 'Tab onclick activate', event: 'onclick', actions: [{ type: 'activate' }] },
    { input: 'Tab onclick activate, deactivate-siblings', event: 'onclick', actions: [{ type: 'activate' }, { type: 'deactivate-siblings' }] },
  ],
  deactivate: [
    { input: 'Tab onclick deactivate', event: 'onclick', actions: [{ type: 'deactivate' }] },
  ],
  'deactivate-siblings': [
    { input: 'Tab onclick deactivate-siblings', event: 'onclick', actions: [{ type: 'deactivate-siblings' }] },
  ],
  'toggle-state': [
    { input: 'Toggle onclick toggle-state', event: 'onclick', actions: [{ type: 'toggle-state' }] },
  ],

  // Selection actions
  highlight: [
    { input: 'Item onhover highlight self', event: 'onhover', actions: [{ type: 'highlight', target: 'self' }] },
    { input: 'Box\n  onkeydown arrow-down: highlight next', event: 'onkeydown', actions: [{ type: 'highlight', target: 'next' }] },
    { input: 'Box\n  onkeydown arrow-up: highlight prev', event: 'onkeydown', actions: [{ type: 'highlight', target: 'prev' }] },
  ],
  select: [
    { input: 'Item onclick select', event: 'onclick', actions: [{ type: 'select' }] },
    { input: 'Item onclick select, deselect-siblings', event: 'onclick', actions: [{ type: 'select' }, { type: 'deselect-siblings' }] },
  ],
  deselect: [
    { input: 'Item onclick deselect', event: 'onclick', actions: [{ type: 'deselect' }] },
  ],
  'deselect-siblings': [
    { input: 'Item onclick deselect-siblings', event: 'onclick', actions: [{ type: 'deselect-siblings' }] },
  ],
  'clear-selection': [
    { input: 'Button onclick clear-selection', event: 'onclick', actions: [{ type: 'clear-selection' }] },
  ],
  filter: [
    { input: 'Input oninput filter Results', event: 'oninput', actions: [{ type: 'filter', target: 'Results' }] },
  ],

  // Form actions
  validate: [
    { input: 'Button onclick validate', event: 'onclick', actions: [{ type: 'validate' }] },
  ],
  reset: [
    { input: 'Button onclick reset', event: 'onclick', actions: [{ type: 'reset' }] },
  ],
  focus: [
    { input: 'Button onclick focus SearchInput', event: 'onclick', actions: [{ type: 'focus', target: 'SearchInput' }] },
    { input: 'Segment onfill focus next', event: 'onfill', actions: [{ type: 'focus', target: 'next' }] },
  ],
  alert: [
    { input: 'Button onclick alert "Saved!"', event: 'onclick', actions: [{ type: 'alert' }] },
  ],

  // Assignment
  assign: [
    { input: 'Item onclick assign $selected to $item', event: 'onclick', actions: [{ type: 'assign' }] },
  ],

  // JS integration
  call: [
    { input: 'Button onclick call handleLogin', event: 'onclick', actions: [{ type: 'call', target: 'handleLogin' }] },
  ],
}

// =============================================================================
// ANIMATION EXPECTATIONS
// =============================================================================

export const ANIMATION_EXPECTATIONS: Record<string, AnimationExpectation[]> = {
  // Show animations
  fade: [
    { input: 'Panel\n  show fade', type: 'show', animations: ['fade'] },
    { input: 'Panel\n  show fade 300', type: 'show', animations: ['fade'], duration: 300 },
  ],
  scale: [
    { input: 'Panel\n  show scale', type: 'show', animations: ['scale'] },
    { input: 'Panel\n  show scale 200', type: 'show', animations: ['scale'], duration: 200 },
  ],
  'slide-up': [
    { input: 'Panel\n  show slide-up', type: 'show', animations: ['slide-up'] },
    { input: 'Panel\n  show slide-up 300', type: 'show', animations: ['slide-up'], duration: 300 },
  ],
  'slide-down': [
    { input: 'Panel\n  show slide-down', type: 'show', animations: ['slide-down'] },
  ],
  'slide-left': [
    { input: 'Panel\n  show slide-left', type: 'show', animations: ['slide-left'] },
  ],
  'slide-right': [
    { input: 'Panel\n  show slide-right', type: 'show', animations: ['slide-right'] },
  ],
  combined: [
    { input: 'Panel\n  show fade slide-up 300', type: 'show', animations: ['fade', 'slide-up'], duration: 300 },
  ],

  // Hide animations
  'hide-fade': [
    { input: 'Panel\n  hide fade', type: 'hide', animations: ['fade'] },
    { input: 'Panel\n  hide fade 150', type: 'hide', animations: ['fade'], duration: 150 },
  ],
  'hide-none': [
    { input: 'Panel\n  hide none', type: 'hide', animations: ['none'] },
  ],

  // Continuous animations
  spin: [
    { input: 'Spinner\n  animate spin', type: 'animate', animations: ['spin'] },
    { input: 'Spinner\n  animate spin 1000', type: 'animate', animations: ['spin'], duration: 1000 },
  ],
  pulse: [
    { input: 'Badge\n  animate pulse', type: 'animate', animations: ['pulse'] },
    { input: 'Badge\n  animate pulse 800', type: 'animate', animations: ['pulse'], duration: 800 },
  ],
  bounce: [
    { input: 'Arrow\n  animate bounce', type: 'animate', animations: ['bounce'] },
  ],
}

// =============================================================================
// AGGREGATE EXPORT
// =============================================================================

export const PARSER_EXPECTATIONS = {
  properties: PROPERTY_EXPECTATIONS,
  events: EVENT_EXPECTATIONS,
  states: STATE_EXPECTATIONS,
  actions: ACTION_EXPECTATIONS,
  animations: ANIMATION_EXPECTATIONS,
}
