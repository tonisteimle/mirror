/**
 * Element Wrapper Module
 *
 * Convenient API for element manipulation.
 */

import type { MirrorElement } from './types'
import { getAlign, alignToCSS } from './alignment'
import { setState } from './state-machine'
import { isAllowedCSSProperty, sanitizeCSSValue } from './security'

// ============================================
// TYPES
// ============================================

export interface ElementWrapper {
  _el: MirrorElement
  text: string
  value: string
  visible: boolean
  hidden: boolean
  align: string
  verAlign: string
  bg: string
  col: string
  pad: string | number
  gap: string | number
  rad: string | number
  w: string | number
  h: string | number
  opacity: string | number
  state: string
  onclick: (e: MouseEvent) => void
  onchange: (e: Event) => void
  addClass(c: string): void
  removeClass(c: string): void
  toggleClass(c: string): void
  setStyle(prop: string, val: string): void
  getStyle(prop: string): string
}

// ============================================
// VALUE FORMATTING
// ============================================

/**
 * Format pixel value
 */
function toPixels(v: string | number): string {
  return typeof v === 'number' ? v + 'px' : v
}

// ============================================
// PROPERTY ACCESSORS
// ============================================

/**
 * Create text accessors
 */
function createTextAccessors(el: MirrorElement): Pick<ElementWrapper, 'text'> {
  return {
    get text() {
      return el.textContent || ''
    },
    set text(v: string) {
      el.textContent = v
    },
  }
}

/**
 * Create value accessor
 */
function createValueAccessors(el: MirrorElement): Pick<ElementWrapper, 'value'> {
  return {
    get value() {
      return (el as HTMLInputElement).value
    },
    set value(v: string) {
      ;(el as HTMLInputElement).value = v
    },
  }
}

/**
 * Create visibility accessors
 */
function createVisibilityAccessors(el: MirrorElement): Pick<ElementWrapper, 'visible' | 'hidden'> {
  return {
    get visible() {
      return el.style.display !== 'none'
    },
    set visible(v: boolean) {
      el.style.display = v ? '' : 'none'
    },
    get hidden() {
      return el.hidden
    },
    set hidden(v: boolean) {
      el.hidden = v
      el.style.display = v ? 'none' : ''
    },
  }
}

/**
 * Create alignment accessors
 */
function createAlignmentAccessors(el: MirrorElement): Pick<ElementWrapper, 'align' | 'verAlign'> {
  return {
    get align() {
      return getAlign(el, 'align')
    },
    set align(v: string) {
      alignToCSS(el, 'align', v)
    },
    get verAlign() {
      return getAlign(el, 'ver-align')
    },
    set verAlign(v: string) {
      alignToCSS(el, 'ver-align', v)
    },
  }
}

/**
 * Create style accessors
 */
function createStyleAccessors(
  el: MirrorElement
): Pick<ElementWrapper, 'bg' | 'col' | 'pad' | 'gap' | 'rad' | 'w' | 'h' | 'opacity'> {
  return {
    get bg() {
      return el.style.background
    },
    set bg(v: string) {
      el.style.background = v
    },
    get col() {
      return el.style.color
    },
    set col(v: string) {
      el.style.color = v
    },
    get pad() {
      return el.style.padding
    },
    set pad(v: string | number) {
      el.style.padding = toPixels(v)
    },
    get gap() {
      return el.style.gap
    },
    set gap(v: string | number) {
      el.style.gap = toPixels(v)
    },
    get rad() {
      return el.style.borderRadius
    },
    set rad(v: string | number) {
      el.style.borderRadius = toPixels(v)
    },
    get w() {
      return el.style.width
    },
    set w(v: string | number) {
      el.style.width = toPixels(v)
    },
    get h() {
      return el.style.height
    },
    set h(v: string | number) {
      el.style.height = toPixels(v)
    },
    get opacity() {
      return el.style.opacity
    },
    set opacity(v: string | number) {
      el.style.opacity = String(v)
    },
  }
}

/**
 * Create state accessor
 */
function createStateAccessor(el: MirrorElement): Pick<ElementWrapper, 'state'> {
  return {
    get state() {
      return el.dataset.state || 'default'
    },
    set state(v: string) {
      setState(el, v)
    },
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Create event handlers
 */
function createEventHandlers(el: MirrorElement): Pick<ElementWrapper, 'onclick' | 'onchange'> {
  return {
    set onclick(fn: (e: MouseEvent) => void) {
      el.addEventListener('click', fn)
    },
    set onchange(fn: (e: Event) => void) {
      el.addEventListener('change', fn)
    },
  }
}

// ============================================
// CLASS METHODS
// ============================================

/**
 * Create class methods
 */
function createClassMethods(
  el: MirrorElement
): Pick<ElementWrapper, 'addClass' | 'removeClass' | 'toggleClass'> {
  return {
    addClass(c: string) {
      el.classList.add(c)
    },
    removeClass(c: string) {
      el.classList.remove(c)
    },
    toggleClass(c: string) {
      el.classList.toggle(c)
    },
  }
}

// ============================================
// STYLE METHODS
// ============================================

/**
 * Create style methods with security
 */
function createStyleMethods(el: MirrorElement): Pick<ElementWrapper, 'setStyle' | 'getStyle'> {
  return {
    setStyle(prop: string, val: string) {
      if (!isAllowedCSSProperty(prop)) {
        console.warn('[Security] CSS property not allowed:', prop)
        return
      }
      const safeVal = sanitizeCSSValue(val)
      if (safeVal === null) {
        console.warn('[Security] CSS value rejected:', val)
        return
      }
      ;(el.style as unknown as Record<string, string>)[prop] = safeVal
    },
    getStyle(prop: string) {
      return (el.style as unknown as Record<string, string>)[prop]
    },
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Wrap an element with a convenient API
 */
export function wrap(el: MirrorElement | null): ElementWrapper | null {
  if (!el) return null
  return {
    _el: el,
    ...createTextAccessors(el),
    ...createValueAccessors(el),
    ...createVisibilityAccessors(el),
    ...createAlignmentAccessors(el),
    ...createStyleAccessors(el),
    ...createStateAccessor(el),
    ...createEventHandlers(el),
    ...createClassMethods(el),
    ...createStyleMethods(el),
  }
}
