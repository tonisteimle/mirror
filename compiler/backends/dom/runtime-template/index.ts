/**
 * DOM Runtime als einbettbarer JavaScript-String
 *
 * Diese Datei exportiert den Runtime-Code als String,
 * damit der Generator ihn einbetten kann.
 *
 * Structure (modularized for maintainability):
 * - Core runtime: inline (~1,800 lines)
 *   - Property mapping, icons, element wrapper
 *   - Positioning, scroll, toast, input control
 *   - Navigation, keyboard nav, tables, values
 *   - CRUD, data binding, clipboard, icon loading
 * - Zag components: from parts/zag-runtime.ts (~9,200 lines)
 *   - 33 component init functions (Select, Tabs, Dialog, etc.)
 * - Charts runtime: from parts/charts-runtime.ts (~280 lines)
 *   - Chart.js integration, animation system
 * - Test API: from parts/test-api-runtime.ts (~370 lines)
 *   - __MIRROR_TEST__ object for testing
 */

import { CHARTS_RUNTIME } from './parts/charts-runtime'
import { TEST_API_RUNTIME } from './parts/test-api-runtime'
import { ZAG_RUNTIME } from './parts/zag-runtime'

// Single-source-of-truth constants from the typed runtime modules.
// Stamped into the template string at module-load time so a change in
// dom-runtime.ts (or debug.ts) is automatically picked up by the
// emitted runtime — no hand-sync.
import { PROP_MAP } from '../../../runtime/dom-runtime'
import { ALIGN_MAP } from '../../../runtime/alignment'
import { FALLBACK_ICON, LUCIDE_CDN, sanitizeIconName, sanitizeSVG } from '../../../runtime/icons'
import {
  resolveElement,
  scrollTo as scrollToTyped,
  scrollBy as scrollByTyped,
  scrollToTop as scrollToTopTyped,
  scrollToBottom as scrollToBottomTyped,
} from '../../../runtime/scroll'
import { createToastModule } from '../../../runtime/toast'
import {
  focus as focusTyped,
  blur as blurTyped,
  clear as clearTyped,
  selectText as selectTextTyped,
  setError as setErrorTyped,
  clearError as clearErrorTyped,
} from '../../../runtime/input-control'
import {
  show as showTyped,
  hide as hideTyped,
  toggle as toggleTyped,
} from '../../../runtime/visibility'
import { sanitizePageName } from '../../../runtime/component-navigation'
import {
  applyState,
  removeState,
  setState,
  toggleState,
  updateVisibility,
  collectStateProperties,
  storeBaseStyles,
  ensureBaseStyles,
  buildStateContext,
  evaluateToken,
  evaluateCondition,
  hasLogicalOperators,
  evaluateChildVisibility,
} from '../../../runtime/state-machine'
import {
  updateBoundElements,
  updateSelectionBinding,
  updateTriggerText,
  bindTriggerText,
  deselectSiblings,
  unhighlightSiblings,
  getHighlightableItems,
  select as selectTyped,
  deselect as deselectTyped,
  selectHighlighted,
  highlight as highlightTyped,
  unhighlight as unhighlightTyped,
  highlightNext,
  highlightPrev,
  highlightFirst,
  highlightLast,
} from '../../../runtime/selection'

const PROP_MAP_LITERAL = JSON.stringify(PROP_MAP)
const ALIGN_MAP_LITERAL = JSON.stringify(ALIGN_MAP)
const FALLBACK_ICON_LITERAL = JSON.stringify(FALLBACK_ICON)

// Stamp the typed security functions verbatim. Both are self-contained
// (helpers are nested in the function body) so .toString() yields a
// runnable snippet. This kills the security drift the third audit
// flagged: production runtime now uses the SAME validation/sanitization
// as the typed module that has dedicated unit tests.
const SANITIZE_ICON_NAME_SRC = sanitizeIconName.toString()
const SANITIZE_SVG_SRC = sanitizeSVG.toString()

// Stamp the typed scroll helpers. resolveElement is the shared lookup;
// the four scroll functions reference it by name. They become top-level
// declarations in the emitted runtime; _runtime exposes them via shorthand
// property assignment (scrollTo, scrollBy, …) so emitter call sites
// (_runtime.scrollTo(...)) keep working.
const RESOLVE_ELEMENT_SRC = resolveElement.toString()
const SCROLL_TO_SRC = scrollToTyped.toString()
const SCROLL_BY_SRC = scrollByTyped.toString()
const SCROLL_TO_TOP_SRC = scrollToTopTyped.toString()
const SCROLL_TO_BOTTOM_SRC = scrollToBottomTyped.toString()

// Stamp the toast factory. createToastModule.toString() yields a
// self-contained closure that owns its own counter + active-toast map.
// At runtime the template invokes the factory once and exposes
// toast/dismissToast on _runtime. This fixes a real bug: the previous
// inline template used positional args (toast(msg, type, position))
// while the compiler emits the options-object form
// (toast(msg, { type, position })) — so types/positions were silently
// ignored in production.
const CREATE_TOAST_MODULE_SRC = createToastModule.toString()

// Stamp the typed input-control helpers. Each accepts string|element
// (string lookup via resolveElement, the existing top-level helper)
// and is fully self-contained — no state-machine dependency, just
// dataset.state assignment. _runtime exposes them via shorthand.
const FOCUS_SRC = focusTyped.toString()
const BLUR_SRC = blurTyped.toString()
const CLEAR_SRC = clearTyped.toString()
const SELECT_TEXT_SRC = selectTextTyped.toString()
const SET_ERROR_SRC = setErrorTyped.toString()
const CLEAR_ERROR_SRC = clearErrorTyped.toString()

// Stamp typed show/hide/toggle. close() stays inline because it has a
// `this.transitionTo(el, 'default')` fast-path for state-machine
// elements — and transitionTo isn't yet stamped.
const SHOW_SRC = showTyped.toString()
const HIDE_SRC = hideTyped.toString()
const TOGGLE_SRC = toggleTyped.toString()

// Stamp the state-machine cluster (no-animation half).
// applyState / removeState — pure DOM ops.
// setState / toggleState / updateVisibility — needed by selection +
// visibility, depend on internal helpers (collectStateProperties,
// storeBaseStyles, ensureBaseStyles, buildStateContext, evaluateToken,
// evaluateCondition, hasLogicalOperators, evaluateChildVisibility) that
// also get stamped, in dep order, so name lookups resolve at runtime.
//
// transitionTo / exclusiveTransition / stateMachineToggle / watchStates
// are still inline _runtime methods because they pull in
// playStateAnimation + batchInFrame from animations.ts/batching.ts —
// that's a separate consolidation pass.
const APPLY_STATE_SRC = applyState.toString()
const REMOVE_STATE_SRC = removeState.toString()
const COLLECT_STATE_PROPERTIES_SRC = collectStateProperties.toString()
const STORE_BASE_STYLES_SRC = storeBaseStyles.toString()
const ENSURE_BASE_STYLES_SRC = ensureBaseStyles.toString()
const BUILD_STATE_CONTEXT_SRC = buildStateContext.toString()
const EVALUATE_TOKEN_SRC = evaluateToken.toString()
const HAS_LOGICAL_OPERATORS_SRC = hasLogicalOperators.toString()
const EVALUATE_CONDITION_SRC = evaluateCondition.toString()
const EVALUATE_CHILD_VISIBILITY_SRC = evaluateChildVisibility.toString()
const UPDATE_VISIBILITY_SRC = updateVisibility.toString()
const SET_STATE_SRC = setState.toString()
const TOGGLE_STATE_SRC = toggleState.toString()

// Stamp the full selection cluster from compiler/runtime/selection.ts.
// Both helpers and the public API are exported from the typed module
// just so the template can stamp them by name; the public API
// references the helpers by name so they MUST be top-level in the
// emitted runtime.
const UPDATE_BOUND_ELEMENTS_SRC = updateBoundElements.toString()
const UPDATE_TRIGGER_TEXT_SRC = updateTriggerText.toString()
const UPDATE_SELECTION_BINDING_SRC = updateSelectionBinding.toString()
const BIND_TRIGGER_TEXT_SRC = bindTriggerText.toString()
const DESELECT_SIBLINGS_SRC = deselectSiblings.toString()
const UNHIGHLIGHT_SIBLINGS_SRC = unhighlightSiblings.toString()
const GET_HIGHLIGHTABLE_ITEMS_SRC = getHighlightableItems.toString()
const SELECT_SRC = selectTyped.toString()
const DESELECT_SRC = deselectTyped.toString()
const SELECT_HIGHLIGHTED_SRC = selectHighlighted.toString()
const HIGHLIGHT_SRC = highlightTyped.toString()
const UNHIGHLIGHT_SRC = unhighlightTyped.toString()
const HIGHLIGHT_NEXT_SRC = highlightNext.toString()
const HIGHLIGHT_PREV_SRC = highlightPrev.toString()
const HIGHLIGHT_FIRST_SRC = highlightFirst.toString()
const HIGHLIGHT_LAST_SRC = highlightLast.toString()

// Stamp the page-name sanitizer. Closes a real gap: the inline
// template's navigateToPage built filenames straight from user input
// without any path-traversal / absolute-path / weird-character check.
// (The typed module also had a validateCompiledCode regex scanner;
// audit-4 deleted it because compiled output always embeds the Mirror
// runtime, which legitimately contains every "dangerous" pattern the
// scanner looked for. sanitizePageName at the entry point is the
// real defence — see compiler/runtime/component-navigation.ts.)
const SANITIZE_PAGE_NAME_SRC = sanitizePageName.toString()

export const DOM_RUNTIME_CODE = `
// Mirror DOM Runtime

// Stamping shim: when the typed runtime modules are .toString()'d at
// compile time, esbuild/tsx may insert __name(fn, "label") calls to
// preserve Function.name across minification. The compiled output
// references __name at runtime; declare a no-op so the calls are
// harmless. (Real function names come from the function declarations
// themselves; this only masks the build-tool helper.)
function __name(fn, _name) { return fn }

// Security helpers (stamped from compiler/runtime/icons.ts via .toString())
${SANITIZE_ICON_NAME_SRC}
${SANITIZE_SVG_SRC}

// Scroll helpers (stamped from compiler/runtime/scroll.ts via .toString())
${RESOLVE_ELEMENT_SRC}
${SCROLL_TO_SRC}
${SCROLL_BY_SRC}
${SCROLL_TO_TOP_SRC}
${SCROLL_TO_BOTTOM_SRC}

// Toast module (stamped factory from compiler/runtime/toast.ts).
// Invoke once to get a fresh counter + active-toast map; expose the
// public API as top-level functions so _runtime can shorthand them.
${CREATE_TOAST_MODULE_SRC}
const { toast, dismissToast } = createToastModule()

// Input-control helpers (stamped from compiler/runtime/input-control.ts)
${FOCUS_SRC}
${BLUR_SRC}
${CLEAR_SRC}
${SELECT_TEXT_SRC}
${SET_ERROR_SRC}
${CLEAR_ERROR_SRC}

// Page-navigation security (stamped from compiler/runtime/component-navigation.ts)
${SANITIZE_PAGE_NAME_SRC}

// State-machine cluster (stamped from compiler/runtime/state-machine.ts).
// Helpers in dep order: collectStateProperties → storeBaseStyles →
// ensureBaseStyles, buildStateContext → evaluateToken → evaluateCondition,
// hasLogicalOperators → evaluateChildVisibility → updateVisibility, and
// finally setState / toggleState which use the lot.
${APPLY_STATE_SRC}
${REMOVE_STATE_SRC}
${COLLECT_STATE_PROPERTIES_SRC}
${STORE_BASE_STYLES_SRC}
${ENSURE_BASE_STYLES_SRC}
${BUILD_STATE_CONTEXT_SRC}
${EVALUATE_TOKEN_SRC}
${HAS_LOGICAL_OPERATORS_SRC}
${EVALUATE_CONDITION_SRC}
${EVALUATE_CHILD_VISIBILITY_SRC}
${UPDATE_VISIBILITY_SRC}
${SET_STATE_SRC}
${TOGGLE_STATE_SRC}

// Visibility helpers (stamped from compiler/runtime/visibility.ts).
// show/hide/toggle reference top-level applyState/setState (above).
// close() stays as inline _runtime method (state-machine fast-path).
${SHOW_SRC}
${HIDE_SRC}
${TOGGLE_SRC}

// Selection / highlight cluster (stamped from compiler/runtime/selection.ts).
// Helpers come first so the public API can reference them by name.
${UPDATE_BOUND_ELEMENTS_SRC}
${UPDATE_TRIGGER_TEXT_SRC}
${UPDATE_SELECTION_BINDING_SRC}
${BIND_TRIGGER_TEXT_SRC}
${DESELECT_SIBLINGS_SRC}
${UNHIGHLIGHT_SIBLINGS_SRC}
${GET_HIGHLIGHTABLE_ITEMS_SRC}
${SELECT_SRC}
${DESELECT_SRC}
${SELECT_HIGHLIGHTED_SRC}
${HIGHLIGHT_SRC}
${UNHIGHLIGHT_SRC}
${HIGHLIGHT_NEXT_SRC}
${HIGHLIGHT_PREV_SRC}
${HIGHLIGHT_FIRST_SRC}
${HIGHLIGHT_LAST_SRC}

const _runtime = {
  // Debug mode check
  _isDebug() { return typeof window !== 'undefined' && window.__MIRROR_DEBUG__ === true },

  // Property mapping (stamped from compiler/runtime/dom-runtime.ts → PROP_MAP)
  _propMap: ${PROP_MAP_LITERAL},

  // SVG Icon Constants (extracted to avoid duplication)
  _icons: {
    chevronDown: (size = 14) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>\`,
    chevronUp: (size = 14) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"></polyline></svg>\`,
    chevronLeft: (size = 16) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>\`,
    chevronRight: (size = 16) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>\`,
    chevronDouble: (size = 12) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>\`,
    check: (size = 14, strokeWidth = 2) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="\${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>\`,
    x: (size = 14) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>\`,
    minus: (size = 12) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>\`,
    calendar: (size = 16) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>\`,
    user: (size = 24) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>\`,
    upload: (size = 40) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>\`,
    file: (size = 20) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>\`,
    eyeOff: (size = 20) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>\`,
    eye: (size = 20) => \`<svg width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>\`,
  },

  // Alignment helpers
  _alignToCSS(el, prop, value) {
    const dir = el.style.flexDirection || 'column'
    const isRow = dir === 'row'
    const alignMap = ${ALIGN_MAP_LITERAL}
    const cssVal = alignMap[value] || value

    if (prop === 'align' || prop === 'hor-align') {
      if (isRow) { el.style.justifyContent = cssVal }
      else { el.style.alignItems = cssVal }
    } else if (prop === 'ver-align') {
      if (isRow) { el.style.alignItems = cssVal }
      else { el.style.justifyContent = cssVal }
    }
  },

  _getAlign(el, prop) {
    const dir = el.style.flexDirection || 'column'
    const isRow = dir === 'row'
    const reverseMap = { 'flex-start': 'left', 'flex-end': 'right', 'center': 'center' }

    if (prop === 'align' || prop === 'hor-align') {
      const val = isRow ? el.style.justifyContent : el.style.alignItems
      return reverseMap[val] || val
    } else if (prop === 'ver-align') {
      const val = isRow ? el.style.alignItems : el.style.justifyContent
      const vertMap = { 'flex-start': 'top', 'flex-end': 'bottom', 'center': 'center' }
      return vertMap[val] || val
    }
  },

  // Element wrapper
  wrap(el) {
    if (!el) return null
    const self = this
    return {
      _el: el,
      get text() { return el.textContent },
      set text(v) { el.textContent = v },
      get value() { return el.value },
      set value(v) { el.value = v },
      get visible() { return el.style.display !== 'none' },
      set visible(v) { el.style.display = v ? '' : 'none' },
      get hidden() { return el.hidden },
      set hidden(v) { el.hidden = v; el.style.display = v ? 'none' : '' },
      get align() { return self._getAlign(el, 'align') },
      set align(v) { self._alignToCSS(el, 'align', v) },
      get verAlign() { return self._getAlign(el, 'ver-align') },
      set verAlign(v) { self._alignToCSS(el, 'ver-align', v) },
      get bg() { return el.style.background },
      set bg(v) { el.style.background = v },
      get col() { return el.style.color },
      set col(v) { el.style.color = v },
      get pad() { return el.style.padding },
      set pad(v) { el.style.padding = typeof v === 'number' ? v + 'px' : v },
      get gap() { return el.style.gap },
      set gap(v) { el.style.gap = typeof v === 'number' ? v + 'px' : v },
      get rad() { return el.style.borderRadius },
      set rad(v) { el.style.borderRadius = typeof v === 'number' ? v + 'px' : v },
      get w() { return el.style.width },
      set w(v) { el.style.width = typeof v === 'number' ? v + 'px' : v },
      get h() { return el.style.height },
      set h(v) { el.style.height = typeof v === 'number' ? v + 'px' : v },
      get opacity() { return el.style.opacity },
      set opacity(v) { el.style.opacity = v },
      get state() { return el.dataset.state || 'default' },
      set state(v) { self.setState(el, v) },
      set onclick(fn) { el.addEventListener('click', fn) },
      set onchange(fn) { el.addEventListener('change', fn) },
      addClass(c) { el.classList.add(c) },
      removeClass(c) { el.classList.remove(c) },
      toggleClass(c) { el.classList.toggle(c) },
      setStyle(prop, val) { el.style[prop] = val },
      getStyle(prop) { return el.style[prop] },
    }
  },

  // show/hide/toggle stamped from compiler/runtime/visibility.ts (top-level)
  show,
  hide,
  toggle,

  close(el) {
    if (!el) return
    const initialState = el._initialState
    const currentState = el.dataset.state
    const hasStateMachine = el._stateMachine

    // Check if element has open/closed states in its state machine
    if (hasStateMachine && (hasStateMachine.states?.open || hasStateMachine.states?.closed)) {
      this.transitionTo(el, 'default')
    } else if (initialState === 'closed' || initialState === 'open' || currentState === 'open' || currentState === 'closed') {
      this.setState(el, 'closed')
    } else if (initialState === 'expanded' || initialState === 'collapsed' || currentState === 'expanded' || currentState === 'collapsed') {
      this.setState(el, 'collapsed')
    } else {
      // Falls through to the top-level stamped hide() function
      // (lexical scope picks it up, no method-on-_runtime lookup).
      hide(el)
    }
  },

  // ============================================
  // POSITIONING FUNCTIONS (Built-in)
  // ============================================

  showBelow(el, trigger, offset = 4) {
    if (typeof el === 'string') {
      el = document.querySelector('[data-mirror-name="' + el + '"]')
    }
    if (!el || !trigger) return

    const rect = trigger.getBoundingClientRect()
    el.style.position = 'fixed'
    el.style.top = (rect.bottom + offset) + 'px'
    el.style.left = rect.left + 'px'
    el.style.zIndex = '1000'
    el.hidden = false
    el.style.display = el._savedDisplay || ''
  },

  showAbove(el, trigger, offset = 4) {
    if (typeof el === 'string') {
      el = document.querySelector('[data-mirror-name="' + el + '"]')
    }
    if (!el || !trigger) return

    const rect = trigger.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    el.style.position = 'fixed'
    el.style.top = (rect.top - elRect.height - offset) + 'px'
    el.style.left = rect.left + 'px'
    el.style.zIndex = '1000'
    el.hidden = false
    el.style.display = el._savedDisplay || ''
  },

  showLeft(el, trigger, offset = 4) {
    if (typeof el === 'string') {
      el = document.querySelector('[data-mirror-name="' + el + '"]')
    }
    if (!el || !trigger) return

    const rect = trigger.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    el.style.position = 'fixed'
    el.style.top = rect.top + 'px'
    el.style.left = (rect.left - elRect.width - offset) + 'px'
    el.style.zIndex = '1000'
    el.hidden = false
    el.style.display = el._savedDisplay || ''
  },

  showRight(el, trigger, offset = 4) {
    if (typeof el === 'string') {
      el = document.querySelector('[data-mirror-name="' + el + '"]')
    }
    if (!el || !trigger) return

    const rect = trigger.getBoundingClientRect()
    el.style.position = 'fixed'
    el.style.top = rect.top + 'px'
    el.style.left = (rect.right + offset) + 'px'
    el.style.zIndex = '1000'
    el.hidden = false
    el.style.display = el._savedDisplay || ''
  },

  showAt(el, trigger, position = 'below', offset = 4) {
    switch (position) {
      case 'below': return this.showBelow(el, trigger, offset)
      case 'above': return this.showAbove(el, trigger, offset)
      case 'left': return this.showLeft(el, trigger, offset)
      case 'right': return this.showRight(el, trigger, offset)
      default: return this.showBelow(el, trigger, offset)
    }
  },

  showModal(el, backdrop = true) {
    if (typeof el === 'string') {
      el = document.querySelector('[data-mirror-name="' + el + '"]')
    }
    if (!el) return

    // Create backdrop if requested
    if (backdrop) {
      const bd = document.createElement('div')
      bd.dataset.mirrorBackdrop = 'true'
      bd.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999'
      document.body.appendChild(bd)
    }

    el.style.position = 'fixed'
    el.style.top = '50%'
    el.style.left = '50%'
    el.style.transform = 'translate(-50%, -50%)'
    el.style.zIndex = '1000'
    el.hidden = false
    el.style.display = el._savedDisplay || ''
  },

  dismiss(el) {
    if (typeof el === 'string') {
      el = document.querySelector('[data-mirror-name="' + el + '"]')
    }
    if (!el) return

    el.hidden = true
    el.style.display = 'none'
    el.style.position = ''
    el.style.top = ''
    el.style.left = ''
    el.style.transform = ''
    el.style.zIndex = ''

    // Remove backdrop if exists
    const backdrop = document.querySelector('[data-mirror-backdrop]')
    if (backdrop) backdrop.remove()
  },

  // ============================================
  // SCROLL FUNCTIONS (Built-in)
  // ============================================

  // scrollTo / scrollBy / scrollToTop / scrollToBottom are stamped from
  // compiler/runtime/scroll.ts as top-level functions; expose them on
  // _runtime via shorthand property assignment so the emitter's
  // _runtime.scrollTo(...) call sites keep working — the typed unit
  // tests in tests/integration/builtin-scroll.test.ts now exercise the
  // exact same code that ships in production.
  scrollTo,
  scrollBy,
  scrollToTop,
  scrollToBottom,

  // ============================================
  // FEEDBACK: Toast Notifications
  // ============================================

  // toast / dismissToast are stamped from compiler/runtime/toast.ts
  // (see createToastModule call above the _runtime declaration).
  // Compiler emits toast(message, { type, position }) — the typed
  // function honours that signature; the previous inline impl took
  // positional args and silently dropped the options object.
  toast,
  dismissToast,

  // ============================================
  // INPUT CONTROL: Focus, Clear, Error
  // ============================================
  // Stamped from compiler/runtime/input-control.ts. Each accepts
  // string|element via resolveElement. setError/clearError now use
  // dataset.state directly (no state-machine roundtrip), matching
  // what production has always actually shipped.
  focus,
  blur,
  clear,
  selectText,
  setError,
  clearError,

  // ============================================
  // NAVIGATION: Back, Forward, OpenUrl
  // ============================================

  back() {
    window.history.back()
  },

  forward() {
    window.history.forward()
  },

  openUrl(url, options = {}) {
    if (!url) return
    const { newTab = true } = options
    // Ensure URL has a protocol
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')
      ? url
      : 'https://' + url
    const target = newTab ? '_blank' : '_self'
    window.open(fullUrl, target, newTab ? 'noopener,noreferrer' : undefined)
  },

  // ============================================
  // KEYBOARD NAVIGATION (Accessibility)
  // ============================================

  /**
   * Setup keyboard navigation for a form container
   * - Enter moves to next field (or submits if last)
   * - Escape blurs current field
   * - Tab cycles through fields normally
   */
  setupKeyboardNav(container) {
    if (!container) return
    if (container._keyboardNavSetup) return // Already setup
    container._keyboardNavSetup = true

    // Selector for form inputs
    const inputSelector = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'

    // Get ordered list of inputs
    const getInputs = () => {
      const inputs = Array.from(container.querySelectorAll(inputSelector))
      // Sort by tabindex if present
      return inputs.sort((a, b) => {
        const aTab = parseInt(a.getAttribute('tabindex') || '0', 10)
        const bTab = parseInt(b.getAttribute('tabindex') || '0', 10)
        return aTab - bTab
      })
    }

    container.addEventListener('keydown', (e) => {
      const target = e.target
      if (!target.matches || !target.matches(inputSelector)) return

      if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        const inputs = getInputs()
        const currentIndex = inputs.indexOf(target)

        if (currentIndex < inputs.length - 1) {
          // Move to next input
          inputs[currentIndex + 1].focus()
        } else {
          // Last input - look for submit button
          const submitBtn = container.querySelector('button[type="submit"], button:not([type])')
          if (submitBtn) {
            submitBtn.click()
          }
        }
      } else if (e.key === 'Escape') {
        target.blur()
      }
    })
  },

  // ============================================
  // TYPEAHEAD NAVIGATION (Accessibility)
  // ============================================

  /**
   * Setup typeahead for a list container
   * Typing characters jumps to matching item
   */
  setupTypeahead(container) {
    if (!container) return
    if (container._typeaheadEnabled) return // Already setup
    container._typeaheadEnabled = true

    // Typeahead state
    const state = { text: '', timeout: null }

    // Get highlightable items
    const getItems = () => {
      const findItems = (el, requireState) => {
        const items = []
        for (const child of el.children) {
          if (child._stateStyles?.highlighted) {
            items.push(child)
          } else if (!requireState && child.style.cursor === 'pointer') {
            items.push(child)
          } else {
            items.push(...findItems(child, requireState))
          }
        }
        return items
      }
      // First try with highlight state, then fallback to cursor:pointer
      let items = findItems(container, true)
      if (!items.length) items = findItems(container, false)
      return items
    }

    container.addEventListener('keydown', (e) => {
      // Only handle printable characters
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return

      const char = e.key.toLowerCase()
      const items = getItems()
      if (!items.length) return

      // Clear previous timeout
      if (state.timeout) clearTimeout(state.timeout)

      // Add character to buffer
      state.text += char

      // Find matching item
      const searchText = state.text.toLowerCase()
      const match = items.find(item => {
        const text = item.textContent?.trim().toLowerCase() || ''
        return text.startsWith(searchText)
      })

      if (match) {
        // Unhighlight others, highlight match
        for (const item of items) {
          if (item !== match && item.dataset.highlighted) {
            delete item.dataset.highlighted
            this.removeState(item, 'highlighted')
          }
        }
        match.dataset.highlighted = 'true'
        this.applyState(match, 'highlighted')
        match.scrollIntoView({ block: 'nearest' })
      }

      // Clear buffer after 500ms
      state.timeout = setTimeout(() => {
        state.text = ''
      }, 500)
    })
  },

  // Bind trigger text to show selected value (stamped from selection.ts).
  bindTriggerText,

  /**
   * Hover-to-highlight for list items inside a loop-focus container.
   * Mirrors the keyboard arrow behaviour so mouse-driven UX (Select,
   * Menu, Combobox) and keyboard navigation share the same "current"
   * item. A single delegated mouseover listener handles all items —
   * cheaper than per-item and survives DOM swaps.
   */
  setupHoverHighlight(container) {
    if (!container) return
    if (container._hoverHighlightEnabled) return
    container._hoverHighlightEnabled = true

    const findItems = (el, requireState) => {
      const items = []
      for (const child of el.children) {
        if (child._stateStyles?.highlighted) {
          items.push(child)
        } else if (!requireState && child.style.cursor === 'pointer') {
          items.push(child)
        } else {
          items.push(...findItems(child, requireState))
        }
      }
      return items
    }

    const getItems = () => {
      let items = findItems(container, true)
      if (!items.length) items = findItems(container, false)
      return items
    }

    container.addEventListener('mouseover', (e) => {
      const target = e.target
      if (!target) return
      const items = getItems()
      const item = items.find(it => it === target || it.contains(target))
      if (!item) return
      // Unhighlight siblings, highlight current
      for (const sibling of items) {
        if (sibling !== item && sibling.dataset.highlighted === 'true') {
          delete sibling.dataset.highlighted
          this.removeState(sibling, 'highlighted')
        }
      }
      item.dataset.highlighted = 'true'
      this.applyState(item, 'highlighted')
    })
  },

  // ============================================
  // TABLE FUNCTIONS (Built-in)
  // ============================================

  /**
   * Sort table by field
   * Toggles between ascending and descending on repeated clicks
   */
  tableSort(table, field) {
    if (!table) return

    // Initialize or get sort state
    const state = table._sortState || { field: null, desc: false }

    // Toggle direction if same field, otherwise reset to ascending
    if (state.field === field) {
      state.desc = !state.desc
    } else {
      state.field = field
      state.desc = false
    }
    table._sortState = state

    // Update sort icons visual state
    table.querySelectorAll('.mirror-sort-icon').forEach(icon => {
      const isActive = icon.dataset.field === field
      icon.style.opacity = isActive ? '1' : '0.5'

      // Check for custom icons
      if (icon.dataset.hasCustomIcons === 'true') {
        const ascIcon = icon.querySelector('.mirror-sort-asc')
        const descIcon = icon.querySelector('.mirror-sort-desc')
        const defaultIcon = icon.querySelector('.mirror-sort-default')

        if (isActive) {
          if (defaultIcon) defaultIcon.style.display = 'none'
          if (state.desc) {
            if (ascIcon) ascIcon.style.display = 'none'
            if (descIcon) descIcon.style.display = ''
          } else {
            if (ascIcon) ascIcon.style.display = ''
            if (descIcon) descIcon.style.display = 'none'
          }
        } else {
          // Reset to default
          if (ascIcon) ascIcon.style.display = 'none'
          if (descIcon) descIcon.style.display = 'none'
          if (defaultIcon) defaultIcon.style.display = ''
        }
      } else {
        // Update icon direction with default SVGs
        if (isActive) {
          if (state.desc) {
            icon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10l5 5 5-5"/></svg>'
          } else {
            icon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 14l5-5 5 5"/></svg>'
          }
        } else {
          // Reset to default double chevron
          icon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>'
        }
      }
    })

    // Re-sort the table body
    const body = table.querySelector('.mirror-table-body')
    if (!body) return

    const rows = Array.from(body.querySelectorAll('.mirror-table-row'))
    rows.sort((a, b) => {
      const aVal = a.dataset[field] || a.querySelector('[data-field="' + field + '"]')?.textContent || ''
      const bVal = b.dataset[field] || b.querySelector('[data-field="' + field + '"]')?.textContent || ''

      // Try numeric comparison first
      const aNum = parseFloat(aVal)
      const bNum = parseFloat(bVal)

      let cmp
      if (!isNaN(aNum) && !isNaN(bNum)) {
        cmp = aNum - bNum
      } else {
        cmp = aVal.localeCompare(bVal)
      }

      return state.desc ? -cmp : cmp
    })

    // Re-append sorted rows
    rows.forEach(row => body.appendChild(row))
  },

  /**
   * Go to previous page in paginated table
   */
  tablePrev(table) {
    if (!table || !table._pageState) return

    const state = table._pageState
    if (state.current > 1) {
      state.current--
      this._updateTablePage(table)
    }
  },

  /**
   * Go to next page in paginated table
   */
  tableNext(table) {
    if (!table || !table._pageState) return

    const state = table._pageState
    const totalPages = Math.ceil(state.total / state.size)
    if (state.current < totalPages) {
      state.current++
      this._updateTablePage(table)
    }
  },

  /**
   * Update table to show current page
   */
  _updateTablePage(table) {
    if (!table || !table._pageState) return

    const state = table._pageState
    const body = table.querySelector('.mirror-table-body')
    if (!body) return

    const rows = Array.from(body.querySelectorAll('.mirror-table-row'))
    const start = (state.current - 1) * state.size
    const end = start + state.size

    rows.forEach((row, index) => {
      row.style.display = (index >= start && index < end) ? '' : 'none'
    })

    // Update page info
    const totalPages = Math.ceil(state.total / state.size)
    const pageInfo = table.querySelector('.mirror-paginator-info')
    if (pageInfo) {
      pageInfo.textContent = 'Page ' + state.current + ' of ' + totalPages
    }
  },

  // ============================================
  // VALUE FUNCTIONS (Built-in)
  // ============================================

  // Token storage
  _tokens: {},
  _initialTokens: {},
  _tokenWatchers: [],

  registerToken(name, value) {
    this._tokens[name] = value
    this._initialTokens[name] = value
  },

  watchToken(name, el, prop) {
    this._tokenWatchers.push({ name, el, prop })
  },

  _notifyTokenWatchers(name) {
    this._tokenWatchers.forEach(w => {
      if (w.name === name) {
        if (w.prop === 'textContent') {
          w.el.textContent = this._tokens[name]
        } else {
          w.el[w.prop] = this._tokens[name]
        }
      }
    })
  },

  get(name) {
    // Read from __mirrorData for consistency with $get()
    if (window.__mirrorData && name in window.__mirrorData) {
      return window.__mirrorData[name]
    }
    return this._tokens[name]
  },

  set(name, value) {
    this._tokens[name] = value
    // Also update __mirrorData so $get() returns new value
    if (window.__mirrorData) {
      window.__mirrorData[name] = value
    }
    this._notifyTokenWatchers(name)
    // Notify text bindings to re-render
    this.notifyDataChange && this.notifyDataChange(name, value)
  },

  increment(name, options = {}) {
    // Read from __mirrorData for consistency
    const current = (window.__mirrorData && name in window.__mirrorData)
      ? (typeof window.__mirrorData[name] === 'number' ? window.__mirrorData[name] : 0)
      : (this._tokens[name] || 0)
    const step = options.step || 1
    let newVal = current + step
    if (options.max !== undefined && newVal > options.max) {
      newVal = options.max
    }
    this._tokens[name] = newVal
    // Also update __mirrorData so $get() returns new value
    if (window.__mirrorData) {
      window.__mirrorData[name] = newVal
    }
    this._notifyTokenWatchers(name)
    // Notify text bindings to re-render
    this.notifyDataChange && this.notifyDataChange(name, newVal)
  },

  decrement(name, options = {}) {
    // Read from __mirrorData for consistency
    const current = (window.__mirrorData && name in window.__mirrorData)
      ? (typeof window.__mirrorData[name] === 'number' ? window.__mirrorData[name] : 0)
      : (this._tokens[name] || 0)
    const step = options.step || 1
    let newVal = current - step
    if (options.min !== undefined && newVal < options.min) {
      newVal = options.min
    }
    this._tokens[name] = newVal
    // Also update __mirrorData so $get() returns new value
    if (window.__mirrorData) {
      window.__mirrorData[name] = newVal
    }
    this._notifyTokenWatchers(name)
    // Notify text bindings to re-render
    this.notifyDataChange && this.notifyDataChange(name, newVal)
  },

  reset(name, initialValue) {
    let newVal
    if (initialValue !== undefined) {
      newVal = initialValue
    } else {
      newVal = this._initialTokens[name]
    }
    this._tokens[name] = newVal
    // Also update __mirrorData so $get() returns new value
    if (window.__mirrorData) {
      window.__mirrorData[name] = newVal
    }
    this._notifyTokenWatchers(name)
    // Notify text bindings to re-render
    this.notifyDataChange && this.notifyDataChange(name, newVal)
  },

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  // Generate unique ID for new entries
  _generateId(prefix = 'item') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },

  // Add new entry to collection
  add(collectionName, values) {
    const name = collectionName.startsWith('$') ? collectionName.slice(1) : collectionName
    const data = window.__mirrorData || {}

    if (!data[name] || typeof data[name] !== 'object') {
      data[name] = {}
    }

    const collection = data[name]
    const key = this._generateId(name.slice(0, 3))

    // Use provided values or create empty entry with _key
    collection[key] = values || { _key: key }
    if (!collection[key]._key) {
      collection[key]._key = key
    }

    this._refreshEachLoops(name)
    return key
  },

  // Remove entry from collection
  remove(itemOrCollection, key) {
    let collectionName, entryKey

    if (typeof itemOrCollection === 'string') {
      // Called as remove('collectionName', 'key')
      collectionName = itemOrCollection.startsWith('$') ? itemOrCollection.slice(1) : itemOrCollection
      entryKey = key
    } else if (itemOrCollection && typeof itemOrCollection === 'object') {
      // Called as remove(item) - find collection by _key
      if (typeof itemOrCollection._key !== 'string') {
        console.warn('[Mirror] remove() requires item with _key property')
        return
      }
      entryKey = itemOrCollection._key

      // Find which collection contains this key
      const data = window.__mirrorData || {}
      const found = Object.entries(data).find(([, val]) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return val[entryKey] !== undefined
        }
        return false
      })

      if (!found) {
        console.warn('[Mirror] remove() could not find collection for item')
        return
      }
      collectionName = found[0]
    } else {
      return
    }

    const data = window.__mirrorData || {}
    const collection = data[collectionName]

    if (!collection || typeof collection !== 'object') {
      return
    }

    delete collection[entryKey]
    this._refreshEachLoops(collectionName)
  },

  // Create new entry in collection
  create(collectionName, initialValues = {}) {
    const name = collectionName.startsWith('$') ? collectionName.slice(1) : collectionName
    const data = window.__mirrorData || {}
    const collection = data[name]

    if (!collection || typeof collection !== 'object' || Array.isArray(collection)) {
      console.warn('[Mirror] create() - collection not found:', name)
      return null
    }

    // Generate unique key
    const newKey = 'new_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)

    // Get template from existing entry
    const entries = Object.values(collection)
    const template = entries[0]
    const newEntry = { _key: newKey }

    // Copy structure from template
    if (template && typeof template === 'object') {
      for (const key of Object.keys(template)) {
        if (key !== '_key') {
          const val = template[key]
          if (typeof val === 'string') newEntry[key] = ''
          else if (typeof val === 'number') newEntry[key] = 0
          else if (typeof val === 'boolean') newEntry[key] = false
          else newEntry[key] = null
        }
      }
    }

    // Apply initial values
    Object.assign(newEntry, initialValues)

    // Add to collection
    collection[newKey] = newEntry
    this._refreshEachLoops(name)

    return newEntry
  },

  // Save (dispatch event for persistence)
  save(target) {
    const data = window.__mirrorData || {}
    if (this._isDebug()) console.log('[Mirror] save()', target || '', data)
    window.dispatchEvent(new CustomEvent('mirror:save', { detail: { target, data } }))
  },

  // Delete item (alias for remove, avoids reserved word)
  deleteItem(itemOrKey) {
    this.remove(itemOrKey)
  },

  // Revert changes (dispatch event)
  revert(target) {
    if (this._isDebug()) console.log('[Mirror] revert()', target || '')
    window.dispatchEvent(new CustomEvent('mirror:revert', { detail: { target } }))
  },

  // Update field in item
  updateField(item, field, value) {
    if (!item || typeof item._key !== 'string') {
      return
    }

    item[field] = value

    // Also update in __mirrorData
    const data = window.__mirrorData || {}
    const entryKey = item._key

    for (const [collName, colData] of Object.entries(data)) {
      if (colData && typeof colData === 'object' && !Array.isArray(colData)) {
        if (colData[entryKey]) {
          colData[entryKey][field] = value
          return
        }
      }
    }
  },

  // Re-render each loops for a collection after data changes
  _refreshEachLoops(collectionName) {
    const containers = document.querySelectorAll('[data-each-container]')

    containers.forEach(container => {
      const config = container._eachConfig
      if (!config) return
      if (config.collection !== collectionName) return

      // Clear and re-render
      container.innerHTML = ''

      const data = window.__mirrorData || {}
      let items = data[collectionName]

      if (!items) return

      // Convert object to array with _key
      if (!Array.isArray(items)) {
        items = Object.entries(items).map(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            return { _key: k, ...v }
          }
          return v
        })
      }

      // Apply filter if configured
      if (config.filterFn) {
        items = items.filter(config.filterFn)
      }

      // Apply sort if configured
      if (config.orderBy) {
        const dir = config.orderDesc ? -1 : 1
        items = [...items].sort((a, b) => {
          const aVal = a[config.orderBy]
          const bVal = b[config.orderBy]
          if (aVal < bVal) return -dir
          if (aVal > bVal) return dir
          return 0
        })
      }

      // Render each item
      items.forEach((item, index) => {
        const itemEl = config.renderItem(item, index)
        container.appendChild(itemEl)
      })
    })
  },

  // ============================================
  // TWO-WAY DATA BINDING
  // ============================================

  // Bindings Registry: path → Set of bound elements
  _inputBindings: new Map(),
  _textBindings: new Map(),
  _visibilityBindings: new Map(),  // path → Set of elements with _visibleWhen depending on this path

  // Register element for two-way value binding (Input, Textarea)
  bindValue(el, path) {
    if (!el || !path) return
    el._valueBinding = path
    if (!this._inputBindings.has(path)) {
      this._inputBindings.set(path, new Set())
    }
    this._inputBindings.get(path).add(el)
  },

  // ============================================
  // INPUT MASK
  // ============================================

  // Parse mask pattern into char types
  _parseMask(pattern) {
    return pattern.split('').map(c => {
      if (c === '#') return { type: 'digit', char: c }
      if (c === 'A') return { type: 'letter', char: c }
      if (c === '*') return { type: 'alphanum', char: c }
      return { type: 'literal', char: c }
    })
  },

  // Check if char is valid for mask type
  _isMaskCharValid(char, type) {
    if (type === 'digit') return /\\d/.test(char)
    if (type === 'letter') return /[a-zA-Z]/.test(char)
    if (type === 'alphanum') return /[a-zA-Z0-9]/.test(char)
    return false
  },

  // Format value with mask pattern
  formatWithMask(value, pattern) {
    const mask = this._parseMask(pattern)
    const raw = String(value || '').replace(/[^a-zA-Z0-9]/g, '').split('')
    let result = '', ri = 0

    for (const m of mask) {
      if (ri >= raw.length) break
      if (m.type === 'literal') {
        result += m.char
      } else {
        while (ri < raw.length && !this._isMaskCharValid(raw[ri], m.type)) ri++
        if (ri < raw.length) result += raw[ri++]
      }
    }
    return result
  },

  // Get raw value from masked input (extracts all alphanumeric chars)
  getMaskRawValue(input) {
    const pattern = input._maskPattern
    if (!pattern) return input.value
    // Extract all alphanumeric characters, regardless of current formatting
    return (input.value || '').replace(/[^a-zA-Z0-9]/g, '')
  },

  // Adjust cursor position after formatting
  _adjustMaskCursor(oldVal, newVal, oldPos, pattern) {
    const mask = this._parseMask(pattern)
    let inputChars = 0
    for (let i = 0; i < oldPos && i < mask.length; i++) {
      if (mask[i].type !== 'literal') inputChars++
    }
    let newPos = 0, counted = 0
    for (let i = 0; i < newVal.length && i < mask.length; i++) {
      newPos = i + 1
      if (mask[i].type !== 'literal') {
        counted++
        if (counted >= inputChars) break
      }
    }
    while (newPos < mask.length && mask[newPos] && mask[newPos].type === 'literal') newPos++
    return Math.min(newPos, newVal.length)
  },

  // Apply mask to input element
  applyMask(input, pattern) {
    const self = this
    input._maskPattern = pattern

    // Format initial value
    if (input.value) {
      input.value = self.formatWithMask(input.value, pattern)
    }

    // Handle input events
    input.addEventListener('input', () => {
      const pos = input.selectionStart || 0
      const old = input.value
      const raw = self.getMaskRawValue(input)
      const formatted = self.formatWithMask(raw, pattern)

      if (formatted !== old) {
        input.value = formatted
        const newPos = self._adjustMaskCursor(old, formatted, pos, pattern)
        input.setSelectionRange(newPos, newPos)
      }
    })

    // Validate keypress
    input.addEventListener('keypress', (e) => {
      if (e.ctrlKey || e.metaKey || e.key.length > 1) return
      const pos = input.selectionStart || 0
      const mask = self._parseMask(pattern)

      let maskIdx = 0
      for (let i = 0; i < pos && maskIdx < mask.length; i++) {
        maskIdx++
      }
      while (maskIdx < mask.length && mask[maskIdx].type === 'literal') maskIdx++

      if (maskIdx >= mask.length || !self._isMaskCharValid(e.key, mask[maskIdx].type)) {
        e.preventDefault()
      }
    })

    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault()
      const data = (e.clipboardData && e.clipboardData.getData('text')) || ''
      input.value = self.formatWithMask(data, pattern)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  },

  // Register element for text binding (Text elements that display data)
  bindText(el, path, expression) {
    if (!el || !path) return
    el._textBinding = path
    el._textExpression = expression  // For complex expressions like "Hello, " + $name
    if (!this._textBindings.has(path)) {
      this._textBindings.set(path, new Set())
    }
    this._textBindings.get(path).add(el)
  },

  // Register element for visibility binding (elements with _visibleWhen that depends on data)
  bindVisibility(el, path) {
    if (!el || !path) return
    // Store all paths this element depends on
    if (!el._visibilityPaths) {
      el._visibilityPaths = []
    }
    el._visibilityPaths.push(path)
    // Register in the bindings map
    if (!this._visibilityBindings.has(path)) {
      this._visibilityBindings.set(path, new Set())
    }
    this._visibilityBindings.get(path).add(el)
  },

  // Evaluate a visibility condition using $get
  // Supports both $varName and bare varName formats
  _evaluateVisibilityCondition(condition) {
    try {
      const reserved = new Set([
        'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
        'typeof', 'instanceof', 'new', 'delete', 'void'
      ])

      // First handle $-prefixed variables: $varName → $get("varName")
      let evalCondition = condition.replace(/\\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, '$get("$1")')

      // Then handle bare identifiers (not already wrapped, not reserved)
      evalCondition = evalCondition.replace(
        /(?<![\"\\w$.])(\\b[a-zA-Z_][a-zA-Z0-9_]*(?:\\.[a-zA-Z_][a-zA-Z0-9_]*)*\\b)(?![\"\\w(])/g,
        (match, identifier) => {
          const firstPart = identifier.split('.')[0]
          if (reserved.has(firstPart)) return match
          return '$get("' + identifier + '")'
        }
      )

      // Use Function constructor to evaluate in the context with $get
      const result = new Function('$get', 'return ' + evalCondition)($get)
      return !!result
    } catch (e) {
      return false
    }
  },

  // Set data value and notify all bound elements
  notifyDataChange(path, value) {
    // Collect all paths to update: the exact path AND all sub-paths (e.g., selectedAddress.firstName)
    const pathsToUpdate = [path]
    const pathPrefix = path + '.'

    // Find all registered paths that are sub-paths of the changed path
    for (const registeredPath of this._textBindings.keys()) {
      if (registeredPath.startsWith(pathPrefix)) {
        pathsToUpdate.push(registeredPath)
      }
    }
    for (const registeredPath of this._inputBindings.keys()) {
      if (registeredPath.startsWith(pathPrefix) && !pathsToUpdate.includes(registeredPath)) {
        pathsToUpdate.push(registeredPath)
      }
    }
    for (const registeredPath of this._visibilityBindings.keys()) {
      if (registeredPath.startsWith(pathPrefix) && !pathsToUpdate.includes(registeredPath)) {
        pathsToUpdate.push(registeredPath)
      }
    }

    // Update all affected paths
    for (const updatePath of pathsToUpdate) {
      // Update other inputs (skip active element to avoid cursor jumping)
      const inputElements = this._inputBindings.get(updatePath)
      if (inputElements) {
        for (const el of inputElements) {
          if (el !== document.activeElement) {
            el.value = value ?? ''
          }
        }
      }

      // Update text elements
      const textElements = this._textBindings.get(updatePath)
      if (textElements) {
        for (const el of textElements) {
          if (el._textTemplate) {
            // Re-evaluate expression template with new data
            try {
              const result = el._textTemplate()
              el.textContent = result ?? ''
            } catch (e) {
              el.textContent = value ?? ''
            }
          } else {
            el.textContent = value ?? ''
          }
        }
      }

      // Update visibility of elements with _visibleWhen that depend on this path
      const visElements = this._visibilityBindings.get(updatePath)
      if (visElements) {
        for (const el of visElements) {
          if (el._visibleWhen) {
            const visible = this._evaluateVisibilityCondition(el._visibleWhen)
            el.style.display = visible ? '' : 'none'
          }
        }
      }
    }

    // Refresh all each loops as their filter expressions may depend on the changed value
    this._refreshAllEachLoops()
  },

  // Refresh all each loops (for filter variable changes)
  _refreshAllEachLoops() {
    const containers = document.querySelectorAll('[data-each-container]')
    const data = window.__mirrorData || {}

    containers.forEach(container => {
      const config = container._eachConfig
      if (!config) return

      const collectionName = typeof config.collection === 'string' ? config.collection : null
      if (!collectionName) return

      // Clear existing items
      container.innerHTML = ''

      // Get fresh data
      const items = data[collectionName]
      if (!items || typeof items !== 'object') return

      // Convert to array
      let itemsArray
      if (Array.isArray(items)) {
        itemsArray = items
      } else {
        itemsArray = Object.entries(items).map(([k, v]) =>
          typeof v === 'object' && v !== null ? { _key: k, ...v } : { _key: k, value: v }
        )
      }

      // Apply filter
      if (config.filterFn) {
        itemsArray = itemsArray.filter(config.filterFn)
      }

      // Apply sorting
      if (config.orderBy) {
        const sortDir = config.orderDesc ? -1 : 1
        itemsArray = [...itemsArray].sort((a, b) => {
          const aVal = a[config.orderBy]
          const bVal = b[config.orderBy]
          if (aVal < bVal) return -sortDir
          if (aVal > bVal) return sortDir
          return 0
        })
      }

      // Render
      if (config.renderItem) {
        itemsArray.forEach((item, index) => {
          container.appendChild(config.renderItem(item, index))
        })
      }
    })
  },

  // Remove element from bindings (cleanup)
  unbindValue(el) {
    if (!el || !el._valueBinding) return
    const path = el._valueBinding
    const elements = this._inputBindings.get(path)
    if (elements) {
      elements.delete(el)
      if (elements.size === 0) {
        this._inputBindings.delete(path)
      }
    }
    delete el._valueBinding
  },

  // ============================================
  // CLIPBOARD FUNCTIONS (Built-in)
  // ============================================

  async copy(text, triggerEl) {
    const textToCopy = String(text)
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy)
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = textToCopy
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      // Apply feedback state to trigger element
      if (triggerEl) {
        const prevState = triggerEl.dataset.state
        triggerEl.dataset.state = 'copied'
        setTimeout(() => {
          if (prevState) {
            triggerEl.dataset.state = prevState
          } else {
            delete triggerEl.dataset.state
          }
        }, 2000)
      }
    } catch (err) {
      console.error('Copy failed:', err)
    }
  },

  // Selection + highlight cluster — stamped from compiler/runtime/selection.ts
  // (see top-level declarations above _runtime). Helpers use the
  // top-level applyState/removeState by lexical name lookup, not
  // this.applyState method dispatch.
  select,
  deselect,
  highlight,
  unhighlight,
  highlightNext,
  highlightPrev,
  highlightFirst,
  highlightLast,
  getHighlightableItems,

  selectHighlighted,

  // Activation
  activate(el) {
    if (!el) return
    el.dataset.active = 'true'
    this.applyState(el, 'active')
  },

  deactivate(el) {
    if (!el) return
    delete el.dataset.active
    this.removeState(el, 'active')
  },

  // State management
  // applyState / removeState stamped from compiler/runtime/state-machine.ts
  applyState,
  removeState,

  // setState / toggleState stamped from state-machine.ts (top-level above).
  setState,
  toggleState,

  // State Machine Functions (Interaction Model)
  transitionTo(el, stateName, animation) {
    if (!el?._stateMachine) return
    const sm = el._stateMachine
    const prevStateName = sm.current
    const prevState = sm.states[prevStateName]
    const newState = sm.states[stateName]
    if (!newState) return
    if (prevStateName === stateName) return
    // Store base styles on first transition
    if (!el._baseStyles) {
      el._baseStyles = {}
      const stateProps = new Set()
      for (const state of Object.values(sm.states)) {
        // styles is an object like { 'background': '#2271C1' }
        for (const prop of Object.keys(state.styles || {})) {
          stateProps.add(prop)
        }
      }
      for (const prop of stateProps) {
        el._baseStyles[prop] = el.style[prop] || ''
      }
    }
    // Store base children on first transition (if any state has children)
    // This enables states with completely different children (like Figma Variants)
    if (!el._baseChildren) {
      const hasStateWithChildren = Object.values(sm.states).some(s => s.children)
      if (hasStateWithChildren) {
        el._baseChildren = Array.from(el.children)
      }
    }
    sm.current = stateName
    el.dataset.state = stateName
    // Restore base styles before applying new state
    if (el._baseStyles) {
      Object.assign(el.style, el._baseStyles)
    }
    // Swap children if state has children defined (like Figma Variants)
    if (newState.children) {
      // Remove current children
      while (el.firstChild) {
        el.removeChild(el.firstChild)
      }
      // Add state children (created fresh via factory function)
      const stateChildren = newState.children()
      for (const child of stateChildren) {
        el.appendChild(child)
      }
    } else if (el._baseChildren && prevState?.children) {
      // Previous state had children, restore base children
      while (el.firstChild) {
        el.removeChild(el.firstChild)
      }
      // Re-create base children (clone them since originals may be reused)
      for (const child of el._baseChildren) {
        el.appendChild(child.cloneNode(true))
      }
    }
    // Temporarily disable transition to ensure immediate style application
    const originalTransition = el.style.transition
    el.style.transition = 'none'
    Object.assign(el.style, newState.styles)
    // Force synchronous style recalc
    void el.offsetHeight
    // Restore transition
    el.style.transition = originalTransition
    // Handle visibility states specially
    if (stateName === 'visible') {
      el.style.display = el._baseDisplay || 'flex'
      el.hidden = false
    } else if (prevStateName === 'visible' && sm.states['visible']) {
      el.style.display = 'none'
      el.hidden = true
    }
    this.updateVisibility(el)
    // Note: animation parameter accepted for API compatibility but not executed in string runtime
  },

  // Toggle: 1 state = binary (default ↔ state), 2+ states = cycle
  stateMachineToggle(el, stateOrder) {
    if (!el?._stateMachine) return
    const sm = el._stateMachine
    // Get custom states (exclude 'default' and CSS pseudo-states)
    // CSS pseudo-states are browser-triggered, not toggle targets
    const cssStates = ['default', 'hover', 'focus', 'active', 'disabled']
    const order = stateOrder || Object.keys(sm.states).filter(s => !cssStates.includes(s))
    if (order.length === 0) return

    if (order.length === 1) {
      // Binary toggle: default ↔ single state
      const targetState = order[0]
      if (sm.current === targetState) {
        this.transitionTo(el, 'default')
      } else {
        this.transitionTo(el, targetState)
      }
    } else {
      // Cycle through multiple states
      const currentIndex = order.indexOf(sm.current)
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % order.length
      this.transitionTo(el, order[nextIndex])
    }
  },

  exclusiveTransition(el, stateName, animation) {
    if (!el?._stateMachine) return
    // Find siblings - handle display:contents wrapper elements (from each loops)
    // Walk up until we find a real parent (not display:contents or eachItem)
    let parent = el.parentElement
    try {
      while (parent && (
        parent.dataset.eachItem !== undefined ||
        (typeof getComputedStyle === 'function' && getComputedStyle(parent).display === 'contents')
      )) {
        parent = parent.parentElement
      }
    } catch (e) {
      // getComputedStyle might fail in some environments, fall back to direct parent
      parent = el.parentElement
    }
    if (parent) {
      // Find all elements with same component name (for exclusive within component type)
      // Use data-component (not data-mirror-name which gets overwritten by instance name)
      const componentName = el.dataset.component
      const siblings = componentName
        ? parent.querySelectorAll(\`[data-component="\${componentName}"]\`)
        : parent.querySelectorAll('[data-mirror-id]')
      siblings.forEach(sibling => {
        if (sibling !== el && sibling._stateMachine) {
          const sibSm = sibling._stateMachine
          // Deselect siblings: transition to 'default' state (not initial!)
          // A sibling might have started in 'active' state, but we want to
          // deselect it by going to 'default', not back to 'active'
          if (sibSm.current !== 'default') {
            this.transitionTo(sibling, 'default')
          }
        }
      })
    }
    this.transitionTo(el, stateName)

    // Update bind variable if parent has one
    // Walk up to find container with data-bind attribute
    let container = el.parentElement
    while (container) {
      const bindVar = container.dataset?.bind
      if (bindVar) {
        // Get the loop item if available (from each loops), otherwise fall back to textContent
        // Walk up from el to find the _loopItem, checking each parent including itemContainer
        let loopItem = el._loopItem
        if (loopItem === undefined) {
          // Check parent elements (template elements might store the item on a wrapper)
          let walker = el.parentElement
          while (walker && loopItem === undefined) {
            if (walker._loopItem !== undefined) {
              loopItem = walker._loopItem
            } else if (walker.dataset?.eachItem !== undefined) {
              // Stop at eachItem container boundary
              break
            }
            walker = walker.parentElement
          }
        }
        const activeValue = loopItem !== undefined ? loopItem : (el.textContent?.trim() || '')
        // Update the global state and notify bound elements
        if (typeof window !== 'undefined') {
          window._mirrorState = window._mirrorState || {}
          window._mirrorState[bindVar] = activeValue
        }
        this.notifyDataChange && this.notifyDataChange(bindVar, activeValue)
        break
      }
      container = container.parentElement
    }
  },

  // Wrapper for exclusive selection (used by template actions)
  exclusive(el, state) {
    if (!el) return
    const targetState = state ||
      (el._stateMachine ? Object.keys(el._stateMachine.states).find(s => s !== 'default') : 'active') ||
      'active'
    this.exclusiveTransition(el, targetState)
  },

  watchStates(el, targetState, initialState, condition, dependencies) {
    if (!el) return
    const root = el.closest('[data-mirror-root]') || document.body
    const targetElements = new Map()
    for (const dep of dependencies) {
      const targetEl = root.querySelector(\`[data-mirror-name="\${dep.target}"]\`)
      if (targetEl) targetElements.set(dep.target, targetEl)
    }
    const checkCondition = () => {
      if (condition === 'and') {
        return dependencies.every(dep => {
          const targetEl = targetElements.get(dep.target)
          return targetEl?.dataset.state === dep.state
        })
      } else {
        return dependencies.some(dep => {
          const targetEl = targetElements.get(dep.target)
          return targetEl?.dataset.state === dep.state
        })
      }
    }
    const updateState = () => {
      if (checkCondition()) {
        this.transitionTo(el, targetState)
      } else {
        this.transitionTo(el, initialState)
      }
    }
    updateState()
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-state') {
          updateState()
          break
        }
      }
    })
    for (const targetEl of targetElements.values()) {
      observer.observe(targetEl, { attributes: true, attributeFilter: ['data-state'] })
    }
  },

  // updateVisibility stamped from state-machine.ts (top-level above).
  // The inline _evaluateCondition was orphaned after this consolidation
  // (the typed updateVisibility uses evaluateChildVisibility which is
  // also stamped at top-level).
  updateVisibility,

  // Navigation
  navigate(targetName, clickedElement) {
    if (!targetName) return
    // Get the root node (Shadow DOM root or document) to support both contexts
    const root = clickedElement ? clickedElement.getRootNode() : document
    // Try data-mirror-name first (from name property), then fall back to data-component
    const target = root.querySelector(\`[data-mirror-name="\${targetName}"]\`) ||
                   root.querySelector(\`[data-component="\${targetName}"]\`)
    if (!target) return
    if (target.parentElement) {
      Array.from(target.parentElement.children).forEach(sibling => {
        // Check for either data-mirror-name or data-component to identify view elements
        if (sibling.dataset && (sibling.dataset.mirrorName || sibling.dataset.component)) {
          sibling.style.display = sibling === target ? '' : 'none'
        }
      })
    }
    this.updateNavSelection(clickedElement)
  },

  updateNavSelection(clickedElement) {
    if (!clickedElement) return
    const nav = clickedElement.closest('nav')
    if (!nav) return
    const navItems = nav.querySelectorAll('[data-route]')
    navItems.forEach(item => {
      if (item === clickedElement) {
        item.dataset.selected = 'true'
        this.applyState(item, 'selected')
      } else {
        delete item.dataset.selected
        this.removeState(item, 'selected')
      }
    })
  },

  navigateToPage(pageName, clickedElement) {
    if (!pageName) return
    // Reject path-traversal / absolute-path / weird-character page names
    // BEFORE constructing a filename. sanitizePageName is stamped from
    // compiler/runtime/component-navigation.ts.
    const safePage = sanitizePageName(pageName)
    if (!safePage) return
    const filename = safePage.endsWith('.mirror') ? safePage : safePage + '.mirror'
    const readFile = this._readFile || window._mirrorReadFile
    if (!readFile) {
      console.warn('No readFile callback available for page navigation')
      return
    }
    const content = readFile(filename)
    if (!content) {
      console.warn(\`Page not found: \${filename}\`)
      return
    }
    if (typeof Mirror === 'undefined' || !Mirror.compile) {
      console.warn('Mirror compiler not available for dynamic page loading')
      return
    }
    try {
      const pageCode = Mirror.compile(content, { readFile })
      const container = this.getPageContainer()
      if (!container) {
        console.warn('No page container found for rendering')
        return
      }
      container.innerHTML = ''
      const execCode = pageCode.replace('export function createUI', 'function createUI')
      const fn = new Function(execCode + '\\nreturn createUI();')
      const ui = fn()
      if (ui && ui.root) {
        while (ui.root.firstChild) {
          container.appendChild(ui.root.firstChild)
        }
      }
    } catch (err) {
      console.error(\`Failed to load page \${filename}:\`, err)
    }
    this.updateNavSelection(clickedElement)
  },

  getPageContainer() {
    let container = document.querySelector('[data-page-container]')
    if (container) return container
    container = document.querySelector('[data-instance-name="PageContent"]')
    if (container) return container
    container = document.querySelector('[data-instance-name="Content"]')
    if (container) return container
    const nav = document.querySelector('nav')
    if (nav && nav.parentElement) {
      for (const sibling of nav.parentElement.children) {
        if (sibling !== nav && sibling.tagName !== 'NAV') {
          return sibling
        }
      }
    }
    return null
  },

  // Selection binding + trigger-text + bound-elements update —
  // stamped from compiler/runtime/selection.ts.
  updateSelectionBinding,
  updateTriggerText,
  updateBoundElements,

  // Cleanup
  destroy(el) {
    if (!el) return
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler)
      delete el._clickOutsideHandler
    }
    if (el.children) {
      Array.from(el.children).forEach(child => this.destroy(child))
    }
  },

${ZAG_RUNTIME}

  // Icon cache and loading
  _iconCache: new Map(),
  _customIcons: new Map(),
  _pendingIcons: new Map(),
  _fallbackIcon: ${FALLBACK_ICON_LITERAL},

  // Register a user-defined icon via $icons: name: "M..." path data.
  // Stored in a separate registry that loadIcon consults first, ahead of
  // the network/Lucide cache.
  registerIcon(name, pathData, viewBox) {
    this._customIcons.set(name, { path: pathData, viewBox: viewBox || '0 0 24 24' })
  },

  async loadIcon(el, iconName) {
    if (!el || !iconName) return
    // Reject malicious icon names (path traversal, scripts, oversized).
    // sanitizeIconName is stamped from compiler/runtime/icons.ts.
    const safeName = sanitizeIconName(iconName)
    if (!safeName) return
    iconName = safeName
    const size = el.dataset.iconSize || '16'
    const color = el.dataset.iconColor || 'currentColor'
    const strokeWidth = el.dataset.iconWeight || '2'
    const isFilled = el.dataset.iconFill === 'true'

    // Custom icons (via $icons:) take precedence over Lucide
    const custom = this._customIcons.get(iconName)
    if (custom) {
      const paths = String(custom.path)
        .split(/[\\n|]/)
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(d => \`<path d="\${d}"/>\`)
        .join('')
      el.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="\${custom.viewBox}" fill="\${isFilled ? 'currentColor' : 'none'}" stroke="\${isFilled ? 'none' : 'currentColor'}" stroke-width="\${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="width:\${size}px;height:\${size}px;color:\${color};display:block;">\${paths}</svg>\`
      return
    }

    // Check cache first
    let svgText = this._iconCache.get(iconName)

    if (!svgText) {
      // Check pending request
      let pending = this._pendingIcons.get(iconName)
      if (!pending) {
        pending = this._fetchIcon(iconName)
        this._pendingIcons.set(iconName, pending)
      }
      svgText = await pending
      this._pendingIcons.delete(iconName)
      if (!svgText) {
        console.warn(\`Icon "\${iconName}" not found, using fallback\`)
        svgText = this._fallbackIcon
      }
    }

    el.innerHTML = svgText
    const svg = el.querySelector('svg')
    if (svg) {
      svg.style.width = size + 'px'
      svg.style.height = size + 'px'
      svg.style.color = color
      svg.style.display = 'block'
      if (isFilled) {
        svg.setAttribute('fill', 'currentColor')
        svg.setAttribute('stroke', 'none')
      } else {
        svg.setAttribute('stroke-width', strokeWidth)
      }
    }
  },

  async _fetchIcon(iconName) {
    // Defence-in-depth: reject unsafe names even if a caller bypasses
    // loadIcon's check. sanitizeIconName is stamped from icons.ts.
    const safeName = sanitizeIconName(iconName)
    if (!safeName) return null
    try {
      const url = \`${LUCIDE_CDN}/\${safeName}.svg\`
      const res = await fetch(url)
      if (!res.ok) return null
      const rawSvg = await res.text()
      // Strip script/foreignObject/use/event-handlers from CDN response
      // before it ever reaches innerHTML. sanitizeSVG is stamped from
      // compiler/runtime/icons.ts.
      const svgText = sanitizeSVG(rawSvg)
      if (!svgText) return null
      this._iconCache.set(safeName, svgText)
      return svgText
    } catch (err) {
      console.warn(\`Failed to load icon "\${safeName}":\`, err)
      return null
    }
  },

  preloadIcons(names) {
    names.forEach(name => {
      if (!this._iconCache.has(name)) {
        this._fetchIcon(name)
      }
    })
  },

${CHARTS_RUNTIME}
}
${TEST_API_RUNTIME}
`

/**
 * Gibt die Anzahl der Zeilen im Runtime-Code zurück
 */
export function getRuntimeLineCount(): number {
  return DOM_RUNTIME_CODE.split('\n').length
}
