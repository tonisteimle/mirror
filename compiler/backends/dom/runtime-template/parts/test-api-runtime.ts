/**
 * Test API Runtime Code (as embeddable string)
 *
 * Contains the __MIRROR_TEST__ object for testing.
 * This is separate from _runtime and goes after it in dom-runtime-string.ts
 */

export const TEST_API_RUNTIME = `
// ============================================
// TEST API
// ============================================

/**
 * Mirror Test API - Always available for testing
 */
const __MIRROR_TEST__ = {
  // Element Access
  getElement(nodeId) {
    return document.querySelector(\`[data-mirror-id="\${nodeId}"]\`)
  },

  getAllElements() {
    return Array.from(document.querySelectorAll('[data-mirror-id]'))
  },

  findByName(name) {
    return document.querySelector(\`[data-mirror-name="\${name}"]\`) ||
           document.querySelector(\`[data-instance-name="\${name}"]\`) ||
           document.querySelector(\`[data-component-name="\${name}"]\`) ||
           document.querySelector(\`[name="\${name}"]\`)
  },

  // State Inspection
  getState(el) {
    if (!el) return 'default'
    return el._stateMachine?.current || el.dataset?.state || 'default'
  },

  getAvailableStates(el) {
    if (!el?._stateMachine) return ['default']
    return Object.keys(el._stateMachine.states)
  },

  getStyles(el) {
    if (!el) return {}
    const styles = {}
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style[i]
      styles[prop] = el.style.getPropertyValue(prop)
    }
    return styles
  },

  getBaseStyles(el) {
    return el?._baseStyles || {}
  },

  // State Manipulation
  setState(el, state) {
    if (el) _runtime.transitionTo(el, state)
  },

  resetToBase(el) {
    if (el) _runtime.transitionTo(el, 'default')
  },

  // Event Simulation
  trigger(el, event) {
    if (!el) return
    switch (event) {
      case 'click': el.click(); break
      case 'hover': el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); break
      case 'focus': el.focus(); el.dispatchEvent(new FocusEvent('focus', { bubbles: true })); break
      case 'blur': el.blur(); el.dispatchEvent(new FocusEvent('blur', { bubbles: true })); break
      case 'change': el.dispatchEvent(new Event('change', { bubbles: true })); break
      case 'input': el.dispatchEvent(new InputEvent('input', { bubbles: true })); break
    }
  },

  triggerKey(el, key, eventType = 'keydown') {
    if (!el) return
    const keyMap = {
      'enter': 'Enter', 'escape': 'Escape', 'esc': 'Escape', 'space': ' ',
      'tab': 'Tab', 'backspace': 'Backspace', 'delete': 'Delete',
      'arrow-up': 'ArrowUp', 'arrow-down': 'ArrowDown',
      'arrow-left': 'ArrowLeft', 'arrow-right': 'ArrowRight',
      'up': 'ArrowUp', 'down': 'ArrowDown', 'left': 'ArrowLeft', 'right': 'ArrowRight',
    }
    const normalizedKey = keyMap[key.toLowerCase()] || key
    el.dispatchEvent(new KeyboardEvent(eventType, {
      key: normalizedKey, code: normalizedKey, bubbles: true, cancelable: true
    }))
  },

  // Built-in Function Calls
  toggle(el, states) {
    if (el) _runtime.stateMachineToggle(el, states)
  },

  exclusive(el, state) {
    if (!el) return
    const targetState = state ||
      (el._stateMachine ? Object.keys(el._stateMachine.states).find(s => s !== 'default') : 'active') ||
      'active'
    _runtime.exclusiveTransition(el, targetState)
  },

  // Visibility Control
  show(el) {
    if (!el) return
    el.hidden = false
    if (el.style.display === 'none') {
      el.style.display = el._savedDisplay || ''
    }
    _runtime.updateVisibility && _runtime.updateVisibility(el)
  },

  hide(el) {
    if (!el) return
    const currentDisplay = window.getComputedStyle(el).display
    if (currentDisplay !== 'none') {
      el._savedDisplay = currentDisplay
    }
    el.style.display = 'none'
    el.hidden = true
  },

  // Visibility Checks
  isVisible(el) {
    if (!el) return false
    if (el.hidden) return false
    const style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) !== 0
  },

  isHidden(el) {
    return !this.isVisible(el)
  },

  isDisplayNone(el) {
    if (!el) return true
    return window.getComputedStyle(el).display === 'none'
  },

  isOpacityZero(el) {
    if (!el) return true
    return parseFloat(window.getComputedStyle(el).opacity) === 0
  },

  hasHiddenAttribute(el) {
    if (!el) return true
    return el.hidden === true
  },

  getVisibilityState(el) {
    if (!el) return { visible: false, display: 'none', opacity: 0, hidden: true, reason: 'hidden' }
    const style = window.getComputedStyle(el)
    const display = style.display
    const opacity = parseFloat(style.opacity)
    const hidden = el.hidden
    const visibility = style.visibility
    let reason = 'visible', visible = true
    if (display === 'none') { visible = false; reason = 'display' }
    else if (opacity === 0) { visible = false; reason = 'opacity' }
    else if (hidden) { visible = false; reason = 'hidden' }
    else if (visibility === 'hidden') { visible = false; reason = 'visibility' }
    return { visible, display, opacity, hidden, reason }
  },

  getComputedStyle(el, prop) {
    if (!el) return ''
    return window.getComputedStyle(el).getPropertyValue(prop)
  },

  waitForHidden(el, timeout = 1000) {
    return new Promise(resolve => {
      if (!el) { resolve(true); return }
      if (!this.isVisible(el)) { resolve(true); return }
      const startTime = Date.now()
      const check = setInterval(() => {
        if (!this.isVisible(el)) { clearInterval(check); resolve(true) }
        else if (Date.now() - startTime > timeout) { clearInterval(check); resolve(false) }
      }, 16)
    })
  },

  // Async Helpers
  waitForState(el, state, timeout = 1000) {
    return new Promise(resolve => {
      if (!el) { resolve(false); return }
      if (this.getState(el) === state) { resolve(true); return }
      const startTime = Date.now()
      const check = setInterval(() => {
        if (this.getState(el) === state) { clearInterval(check); resolve(true) }
        else if (Date.now() - startTime > timeout) { clearInterval(check); resolve(false) }
      }, 16)
    })
  },

  waitForVisible(el, visible, timeout = 1000) {
    return new Promise(resolve => {
      if (!el) { resolve(false); return }
      if (this.isVisible(el) === visible) { resolve(true); return }
      const startTime = Date.now()
      const check = setInterval(() => {
        if (this.isVisible(el) === visible) { clearInterval(check); resolve(true) }
        else if (Date.now() - startTime > timeout) { clearInterval(check); resolve(false) }
      }, 16)
    })
  },

  // Debug
  logStateMachine(el) {
    const info = this.getStateMachineInfo(el)
    if (!info) { console.log('[Mirror Test API] No state machine'); return }
    console.group('[Mirror Test API] State Machine')
    console.log('Current:', info.current)
    console.log('Initial:', info.initial)
    console.log('States:', info.states)
    console.log('Transitions:', info.transitions)
    console.groupEnd()
  },

  getStateMachineInfo(el) {
    if (!el?._stateMachine) return null
    const sm = el._stateMachine
    return {
      current: sm.current,
      initial: sm.initial,
      states: Object.keys(sm.states),
      transitions: sm.transitions.map(t => ({
        trigger: t.trigger, to: t.to, key: t.key, modifier: t.modifier
      }))
    }
  },

  // Navigation
  _navigationHistory: [],
  _historyIndex: -1,

  navigate(target) {
    if (!target) return
    _runtime.navigate(target, null)
  },

  navigateToPage(pageName) {
    if (!pageName) return Promise.resolve()
    // Track history
    if (this._historyIndex < this._navigationHistory.length - 1) {
      this._navigationHistory = this._navigationHistory.slice(0, this._historyIndex + 1)
    }
    this._navigationHistory.push(pageName)
    this._historyIndex = this._navigationHistory.length - 1

    _runtime.navigateToPage(pageName, null)
    return new Promise(resolve => setTimeout(resolve, 50))
  },

  goBack() {
    if (this._historyIndex <= 0) return
    this._historyIndex--
    const previousPage = this._navigationHistory[this._historyIndex]
    if (previousPage) _runtime.navigateToPage(previousPage, null)
  },

  goForward() {
    if (this._historyIndex >= this._navigationHistory.length - 1) return
    this._historyIndex++
    const nextPage = this._navigationHistory[this._historyIndex]
    if (nextPage) _runtime.navigateToPage(nextPage, null)
  },

  getCurrentPage() {
    if (this._historyIndex >= 0 && this._historyIndex < this._navigationHistory.length) {
      return this._navigationHistory[this._historyIndex]
    }
    return null
  },

  getNavigationHistory() {
    return [...this._navigationHistory]
  },

  getNavigationState() {
    return {
      currentPage: this.getCurrentPage(),
      history: this.getNavigationHistory(),
      canGoBack: this._historyIndex > 0,
      canGoForward: this._historyIndex < this._navigationHistory.length - 1,
    }
  },

  getPageContainer() {
    return _runtime.getPageContainer()
  },

  showView(view) {
    if (!view) return
    view.style.display = ''
    view.hidden = false
  },

  hideView(view) {
    if (!view) return
    view.style.display = 'none'
    view.hidden = true
  },

  switchToView(view) {
    if (!view) return
    const parent = view.parentElement
    if (!parent) return
    Array.from(parent.children).forEach(sibling => {
      if (sibling.dataset?.component) {
        if (sibling === view) {
          sibling.style.display = ''
          sibling.hidden = false
        } else {
          sibling.style.display = 'none'
          sibling.hidden = true
        }
      }
    })
  },

  getActiveView(container) {
    const searchContainer = container || document.body
    const views = searchContainer.querySelectorAll('[data-component]')
    for (const view of views) {
      if (this._isViewVisible(view)) return view
    }
    return null
  },

  getAllViews(container) {
    const searchContainer = container || document.body
    return Array.from(searchContainer.querySelectorAll('[data-component]'))
  },

  getViewByName(name) {
    return document.querySelector('[data-component="' + name + '"]')
  },

  _isViewVisible(view) {
    if (!view) return false
    const style = window.getComputedStyle(view)
    return style.display !== 'none' && !view.hidden
  },

  waitForNavigation(pageName, timeout = 1000) {
    return new Promise(resolve => {
      if (this.getCurrentPage() === pageName) { resolve(true); return }
      const startTime = Date.now()
      const check = setInterval(() => {
        if (this.getCurrentPage() === pageName) { clearInterval(check); resolve(true) }
        else if (Date.now() - startTime > timeout) { clearInterval(check); resolve(false) }
      }, 16)
    })
  },

  waitForViewChange(view, timeout = 1000) {
    return new Promise(resolve => {
      if (!view) { resolve(false); return }
      if (this._isViewVisible(view)) { resolve(true); return }
      const startTime = Date.now()
      const check = setInterval(() => {
        if (this._isViewVisible(view)) { clearInterval(check); resolve(true) }
        else if (Date.now() - startTime > timeout) { clearInterval(check); resolve(false) }
      }, 16)
    })
  },

  resetNavigationHistory() {
    this._navigationHistory = []
    this._historyIndex = -1
  },
}

// Expose Test API on window
if (typeof window !== 'undefined') {
  window.__MIRROR_TEST__ = __MIRROR_TEST__
}
`
