/**
 * Mirror DOM Runtime
 *
 * Core runtime functions for Mirror-generated DOM code.
 * These functions handle element state, visibility, selection,
 * highlighting, navigation, and other interactive behaviors.
 *
 * This module is designed to be:
 * 1. Bundled with generated code (for standalone builds)
 * 2. Unit-testable in isolation
 * 3. Tree-shakeable for production builds
 */

// ============================================
// TYPES
// ============================================

/**
 * Element with Mirror runtime metadata
 */
export interface MirrorElement extends HTMLElement {
  _stateStyles?: Record<string, Record<string, string>>
  _baseStyles?: Record<string, string>
  _initialState?: string
  _visibleWhen?: string
  _selectionBinding?: string
  _textBinding?: string
  _textPlaceholder?: string
  _savedDisplay?: string
  _clickOutsideHandler?: (e: MouseEvent) => void
  _eachConfig?: {
    itemVar: string
    collection: string
    filter?: string
    renderItem: (item: unknown, index: number) => HTMLElement
  }
  _conditionalConfig?: {
    condition: () => boolean
    renderThen: () => DocumentFragment
    renderElse?: () => DocumentFragment
  }
}

/**
 * Mirror property to CSS mapping
 */
export const PROP_MAP: Record<string, string> = {
  'bg': 'background',
  'col': 'color',
  'pad': 'padding',
  'rad': 'borderRadius',
  'gap': 'gap',
  'w': 'width',
  'h': 'height',
  'opacity': 'opacity',
}

// ============================================
// ALIGNMENT HELPERS
// ============================================

const ALIGN_MAP: Record<string, string> = {
  'left': 'flex-start',
  'right': 'flex-end',
  'center': 'center',
  'top': 'flex-start',
  'bottom': 'flex-end',
}

const REVERSE_ALIGN_MAP: Record<string, string> = {
  'flex-start': 'left',
  'flex-end': 'right',
  'center': 'center',
}

const VERT_ALIGN_MAP: Record<string, string> = {
  'flex-start': 'top',
  'flex-end': 'bottom',
  'center': 'center',
}

/**
 * Convert alignment value to CSS and apply to element
 */
export function alignToCSS(el: HTMLElement, prop: string, value: string): void {
  const dir = el.style.flexDirection || 'column'
  const isRow = dir === 'row'
  const cssVal = ALIGN_MAP[value] || value

  if (prop === 'align' || prop === 'hor-align') {
    if (isRow) {
      el.style.justifyContent = cssVal
    } else {
      el.style.alignItems = cssVal
    }
  } else if (prop === 'ver-align') {
    if (isRow) {
      el.style.alignItems = cssVal
    } else {
      el.style.justifyContent = cssVal
    }
  }
}

/**
 * Get alignment value from element
 */
export function getAlign(el: HTMLElement, prop: string): string {
  const dir = el.style.flexDirection || 'column'
  const isRow = dir === 'row'

  if (prop === 'align' || prop === 'hor-align') {
    const val = isRow ? el.style.justifyContent : el.style.alignItems
    return REVERSE_ALIGN_MAP[val] || val
  } else if (prop === 'ver-align') {
    const val = isRow ? el.style.alignItems : el.style.justifyContent
    return VERT_ALIGN_MAP[val] || val
  }
  return ''
}

// ============================================
// ELEMENT WRAPPER
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

/**
 * Wrap an element with a convenient API
 */
export function wrap(el: MirrorElement | null): ElementWrapper | null {
  if (!el) return null

  return {
    _el: el,

    get text() { return el.textContent || '' },
    set text(v: string) { el.textContent = v },
    get value() { return (el as HTMLInputElement).value },
    set value(v: string) { (el as HTMLInputElement).value = v },

    get visible() { return el.style.display !== 'none' },
    set visible(v: boolean) { el.style.display = v ? '' : 'none' },
    get hidden() { return el.hidden },
    set hidden(v: boolean) { el.hidden = v; el.style.display = v ? 'none' : '' },

    get align() { return getAlign(el, 'align') },
    set align(v: string) { alignToCSS(el, 'align', v) },
    get verAlign() { return getAlign(el, 'ver-align') },
    set verAlign(v: string) { alignToCSS(el, 'ver-align', v) },

    get bg() { return el.style.background },
    set bg(v: string) { el.style.background = v },
    get col() { return el.style.color },
    set col(v: string) { el.style.color = v },
    get pad() { return el.style.padding },
    set pad(v: string | number) { el.style.padding = typeof v === 'number' ? v + 'px' : v },
    get gap() { return el.style.gap },
    set gap(v: string | number) { el.style.gap = typeof v === 'number' ? v + 'px' : v },
    get rad() { return el.style.borderRadius },
    set rad(v: string | number) { el.style.borderRadius = typeof v === 'number' ? v + 'px' : v },
    get w() { return el.style.width },
    set w(v: string | number) { el.style.width = typeof v === 'number' ? v + 'px' : v },
    get h() { return el.style.height },
    set h(v: string | number) { el.style.height = typeof v === 'number' ? v + 'px' : v },
    get opacity() { return el.style.opacity },
    set opacity(v: string | number) { el.style.opacity = String(v) },

    get state() { return el.dataset.state || 'default' },
    set state(v: string) { setState(el, v) },

    set onclick(fn: (e: MouseEvent) => void) { el.addEventListener('click', fn) },
    set onchange(fn: (e: Event) => void) { el.addEventListener('change', fn) },

    addClass(c: string) { el.classList.add(c) },
    removeClass(c: string) { el.classList.remove(c) },
    toggleClass(c: string) { el.classList.toggle(c) },
    setStyle(prop: string, val: string) { (el.style as unknown as Record<string, string>)[prop] = val },
    getStyle(prop: string) { return (el.style as unknown as Record<string, string>)[prop] },
  }
}

// ============================================
// VISIBILITY & TOGGLE
// ============================================

/**
 * Toggle element visibility or state
 */
export function toggle(el: MirrorElement | null): void {
  if (!el) return

  const currentState = el.dataset.state || el._initialState

  if (currentState === 'closed' || currentState === 'open') {
    const newState = currentState === 'closed' ? 'open' : 'closed'
    setState(el, newState)
  } else if (currentState === 'collapsed' || currentState === 'expanded') {
    const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed'
    setState(el, newState)
  } else {
    el.hidden = !el.hidden
    applyState(el, el.hidden ? 'off' : 'on')
  }
}

/**
 * Show an element
 */
export function show(el: MirrorElement | null): void {
  if (!el) return
  el.hidden = false
  // Restore saved display value or clear inline style
  el.style.display = el._savedDisplay || ''
}

/**
 * Hide an element
 */
export function hide(el: MirrorElement | null): void {
  if (!el) return
  // Save current display before hiding (unless already hidden)
  if (el.style.display !== 'none') {
    el._savedDisplay = el.style.display
  }
  el.hidden = true
  el.style.display = 'none'
}

/**
 * Close an element (set to closed/collapsed state or hide)
 */
export function close(el: MirrorElement | null): void {
  if (!el) return

  const initialState = el._initialState
  if (initialState === 'closed' || initialState === 'open' ||
      el.dataset.state === 'open' || el.dataset.state === 'closed') {
    setState(el, 'closed')
  } else if (initialState === 'expanded' || initialState === 'collapsed' ||
             el.dataset.state === 'expanded' || el.dataset.state === 'collapsed') {
    setState(el, 'collapsed')
  } else {
    hide(el)
  }
}

// ============================================
// SELECTION
// ============================================

/**
 * Select an element (and deselect siblings)
 */
export function select(el: MirrorElement | null): void {
  if (!el) return

  if (el.parentElement) {
    Array.from(el.parentElement.children).forEach(sibling => {
      if (sibling !== el && (sibling as HTMLElement).dataset.selected) {
        deselect(sibling as MirrorElement)
      }
    })
  }

  el.dataset.selected = 'true'
  applyState(el, 'selected')
  updateSelectionBinding(el)
}

/**
 * Deselect an element
 */
export function deselect(el: MirrorElement | null): void {
  if (!el) return
  delete el.dataset.selected
  removeState(el, 'selected')
}

/**
 * Select the currently highlighted element
 */
export function selectHighlighted(container: MirrorElement | null): void {
  if (!container) return
  const items = getHighlightableItems(container)
  const highlighted = items.find(el => el.dataset.highlighted === 'true')
  if (highlighted) select(highlighted)
}

// ============================================
// HIGHLIGHTING
// ============================================

/**
 * Highlight an element (and unhighlight siblings)
 */
export function highlight(el: MirrorElement | null): void {
  if (!el) return

  if (el.parentElement) {
    Array.from(el.parentElement.children).forEach(sibling => {
      if (sibling !== el && (sibling as HTMLElement).dataset.highlighted) {
        unhighlight(sibling as MirrorElement)
      }
    })
  }

  el.dataset.highlighted = 'true'
  applyState(el, 'highlighted')
}

/**
 * Remove highlight from an element
 */
export function unhighlight(el: MirrorElement | null): void {
  if (!el) return
  delete el.dataset.highlighted
  removeState(el, 'highlighted')
}

/**
 * Highlight the next item in a container
 */
export function highlightNext(container: MirrorElement | null): void {
  if (!container) return
  const items = getHighlightableItems(container)
  if (!items.length) return

  const current = items.findIndex(el => el.dataset.highlighted === 'true')
  const next = current === -1 ? 0 : Math.min(current + 1, items.length - 1)
  highlight(items[next])
}

/**
 * Highlight the previous item in a container
 */
export function highlightPrev(container: MirrorElement | null): void {
  if (!container) return
  const items = getHighlightableItems(container)
  if (!items.length) return

  const current = items.findIndex(el => el.dataset.highlighted === 'true')
  const prev = current === -1 ? items.length - 1 : Math.max(current - 1, 0)
  highlight(items[prev])
}

/**
 * Highlight the first item in a container
 */
export function highlightFirst(container: MirrorElement | null): void {
  if (!container) return
  const items = getHighlightableItems(container)
  if (items.length) highlight(items[0])
}

/**
 * Highlight the last item in a container
 */
export function highlightLast(container: MirrorElement | null): void {
  if (!container) return
  const items = getHighlightableItems(container)
  if (items.length) highlight(items[items.length - 1])
}

/**
 * Get all highlightable items in a container
 */
export function getHighlightableItems(container: MirrorElement): MirrorElement[] {
  const findItems = (el: HTMLElement, requireHighlightState: boolean): MirrorElement[] => {
    const items: MirrorElement[] = []

    for (const child of Array.from(el.children) as MirrorElement[]) {
      if (child._stateStyles?.highlighted) {
        items.push(child)
      } else if (!requireHighlightState && child.style.cursor === 'pointer') {
        items.push(child)
      } else {
        items.push(...findItems(child, requireHighlightState))
      }
    }

    return items
  }

  let items = findItems(container, true)
  if (!items.length) items = findItems(container, false)

  return items
}

// ============================================
// ACTIVATION
// ============================================

/**
 * Activate an element
 */
export function activate(el: MirrorElement | null): void {
  if (!el) return
  el.dataset.active = 'true'
  applyState(el, 'active')
}

/**
 * Deactivate an element
 */
export function deactivate(el: MirrorElement | null): void {
  if (!el) return
  delete el.dataset.active
  removeState(el, 'active')
}

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Apply state styles to an element
 */
export function applyState(el: MirrorElement | null, state: string): void {
  if (!el?._stateStyles || !el._stateStyles[state]) return
  Object.assign(el.style, el._stateStyles[state])
}

/**
 * Remove state styles from an element (restore base styles)
 */
export function removeState(el: MirrorElement | null, _state: string): void {
  if (!el?._baseStyles) return
  Object.assign(el.style, el._baseStyles)
}

/**
 * Set element to a named state
 */
export function setState(el: MirrorElement | null, stateName: string): void {
  if (!el) return

  // Store base styles on first state change
  if (!el._baseStyles && el._stateStyles) {
    el._baseStyles = {}
    const stateProps = new Set<string>()

    for (const state of Object.values(el._stateStyles)) {
      for (const prop of Object.keys(state)) {
        stateProps.add(prop)
      }
    }

    for (const prop of stateProps) {
      el._baseStyles[prop] = (el.style as unknown as Record<string, string>)[prop] || ''
    }
  }

  // Restore base styles first
  if (el._baseStyles) {
    Object.assign(el.style, el._baseStyles)
  }

  // Apply new state
  el.dataset.state = stateName

  if (stateName !== 'default' && el._stateStyles && el._stateStyles[stateName]) {
    Object.assign(el.style, el._stateStyles[stateName])
  }

  // Update visibility of children based on new state
  updateVisibility(el)
}

/**
 * Toggle between two states
 */
export function toggleState(el: MirrorElement | null, state1: string, state2?: string): void {
  if (!el) return
  state2 = state2 || 'default'
  const current = el.dataset.state || state2
  const next = current === state1 ? state2 : state1
  setState(el, next)
}

/**
 * Update visibility of children based on parent state
 */
export function updateVisibility(el: MirrorElement | null): void {
  if (!el) return

  const state = el.dataset.state
  const children = el.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>

  children.forEach(child => {
    if (child._visibleWhen) {
      const condition = child._visibleWhen
      let visible = false

      if (condition.includes('&&') || condition.includes('||')) {
        try {
          const open = state === 'open'
          const closed = state === 'closed'
          const expanded = state === 'expanded'
          const collapsed = state === 'collapsed'
          // Using Function constructor instead of eval for slightly better security
          visible = new Function('open', 'closed', 'expanded', 'collapsed',
            `return ${condition}`)(open, closed, expanded, collapsed)
        } catch {
          visible = false
        }
      } else {
        visible = state === condition
      }

      child.style.display = visible ? '' : 'none'
    }
  })
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Navigate to a target component (for component routing)
 */
export function navigate(targetName: string, clickedElement: MirrorElement | null): void {
  if (!targetName) return

  const target = document.querySelector(`[data-component="${targetName}"]`) as HTMLElement | null
  if (!target) return

  if (target.parentElement) {
    Array.from(target.parentElement.children).forEach(sibling => {
      if ((sibling as HTMLElement).dataset?.component) {
        (sibling as HTMLElement).style.display = sibling === target ? '' : 'none'
      }
    })
  }

  updateNavSelection(clickedElement)
}

/**
 * Update selected state for navigation items
 */
export function updateNavSelection(clickedElement: MirrorElement | null): void {
  if (!clickedElement) return

  const nav = clickedElement.closest('nav')
  if (!nav) return

  const navItems = nav.querySelectorAll('[data-route]') as NodeListOf<MirrorElement>

  navItems.forEach(item => {
    if (item === clickedElement) {
      item.dataset.selected = 'true'
      applyState(item, 'selected')
    } else {
      delete item.dataset.selected
      removeState(item, 'selected')
    }
  })
}

// Storage for readFile callback
let _readFileCallback: ((filename: string) => string | null) | null = null

/**
 * Set the readFile callback for page navigation
 */
export function setReadFileCallback(callback: (filename: string) => string | null): void {
  _readFileCallback = callback
}

/**
 * Navigate to a page (load .mirror file)
 */
export function navigateToPage(pageName: string, clickedElement: MirrorElement | null): void {
  if (!pageName) return

  const filename = pageName.endsWith('.mirror') ? pageName : pageName + '.mirror'

  const readFile = _readFileCallback || (window as { _mirrorReadFile?: (f: string) => string | null })._mirrorReadFile
  if (!readFile) {
    console.warn('No readFile callback available for page navigation')
    return
  }

  const content = readFile(filename)
  if (!content) {
    console.warn(`Page not found: ${filename}`)
    return
  }

  const Mirror = (window as { Mirror?: { compile: (code: string, opts?: { readFile?: (f: string) => string | null }) => string } }).Mirror
  if (!Mirror?.compile) {
    console.warn('Mirror compiler not available for dynamic page loading')
    return
  }

  try {
    const pageCode = Mirror.compile(content, { readFile })

    const container = getPageContainer()
    if (!container) {
      console.warn('No page container found for rendering')
      return
    }

    container.innerHTML = ''
    const execCode = pageCode.replace('export function createUI', 'function createUI')
    const fn = new Function(execCode + '\nreturn createUI();')
    const ui = fn() as { root?: HTMLElement }

    if (ui?.root) {
      while (ui.root.firstChild) {
        container.appendChild(ui.root.firstChild)
      }
    }
  } catch (err) {
    console.error(`Failed to load page ${filename}:`, err)
  }

  updateNavSelection(clickedElement)
}

/**
 * Get container for page content
 */
export function getPageContainer(): HTMLElement | null {
  let container = document.querySelector('[data-page-container]') as HTMLElement | null
  if (container) return container

  container = document.querySelector('[data-instance-name="PageContent"]') as HTMLElement | null
  if (container) return container
  container = document.querySelector('[data-instance-name="Content"]') as HTMLElement | null
  if (container) return container

  const nav = document.querySelector('nav')
  if (nav?.parentElement) {
    for (const sibling of Array.from(nav.parentElement.children)) {
      if (sibling !== nav && sibling.tagName !== 'NAV') {
        return sibling as HTMLElement
      }
    }
  }

  return null
}

// ============================================
// SELECTION BINDING
// ============================================

/**
 * Update the selection variable when an item is selected
 */
export function updateSelectionBinding(el: MirrorElement): void {
  if (!el) return

  let parent = el.parentElement as MirrorElement | null

  while (parent) {
    if (parent._selectionBinding) {
      const value = el.textContent?.trim() || ''
      const varName = parent._selectionBinding
      const mirrorState = ((window as { _mirrorState?: Record<string, string> })._mirrorState ||= {})
      mirrorState[varName] = value
      updateBoundElements(varName, value)
      return
    }
    parent = parent.parentElement as MirrorElement | null
  }
}

/**
 * Update all elements bound to a variable
 */
export function updateBoundElements(varName: string, value: string): void {
  const elements = document.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>

  elements.forEach(el => {
    if (el._textBinding === varName) {
      el.textContent = value || el._textPlaceholder || ''
    }
  })
}

// ============================================
// CLEANUP
// ============================================

/**
 * Destroy an element and clean up handlers
 */
export function destroy(el: MirrorElement | null): void {
  if (!el) return

  if (el._clickOutsideHandler) {
    document.removeEventListener('click', el._clickOutsideHandler)
    delete el._clickOutsideHandler
  }

  if (el.children) {
    Array.from(el.children).forEach(child => destroy(child as MirrorElement))
  }
}

// ============================================
// ICONS
// ============================================

/**
 * Load Lucide icon from CDN
 */
export async function loadIcon(el: MirrorElement, iconName: string): Promise<void> {
  if (!el || !iconName) return

  const size = el.dataset.iconSize || '16'
  const color = el.dataset.iconColor || 'currentColor'
  const strokeWidth = el.dataset.iconWeight || '2'

  try {
    const url = `https://unpkg.com/lucide-static/icons/${iconName}.svg`
    const res = await fetch(url)

    if (!res.ok) {
      console.warn(`Icon "${iconName}" not found`)
      el.textContent = iconName
      return
    }

    const svgText = await res.text()
    el.innerHTML = svgText

    const svg = el.querySelector('svg')
    if (svg) {
      svg.style.width = size + 'px'
      svg.style.height = size + 'px'
      svg.style.color = color
      svg.setAttribute('stroke-width', strokeWidth)
      svg.style.display = 'block'
    }
  } catch (err) {
    console.warn(`Failed to load icon "${iconName}":`, err)
    el.textContent = iconName
  }
}

// ============================================
// ANIMATIONS
// ============================================

/**
 * Animation registry
 */
const _animations: Map<string, {
  name: string
  easing: string
  duration?: number
  roles?: string[]
  keyframes: { time: number; properties: { property: string; value: string; target?: string }[] }[]
}> = new Map()

/**
 * Register an animation definition
 */
export function registerAnimation(animation: {
  name: string
  easing: string
  duration?: number
  roles?: string[]
  keyframes: { time: number; properties: { property: string; value: string; target?: string }[] }[]
}): void {
  _animations.set(animation.name, animation)
}

/**
 * Get a registered animation
 */
export function getAnimation(name: string) {
  return _animations.get(name)
}

/**
 * Convert Mirror keyframes to Web Animations API format
 */
function convertKeyframes(keyframes: { time: number; properties: { property: string; value: string }[] }[], duration: number): Keyframe[] {
  const result: Keyframe[] = []

  for (const kf of keyframes) {
    const frame: Keyframe = { offset: kf.time / duration }

    for (const prop of kf.properties) {
      // Map Mirror properties to CSS
      if (prop.property === 'opacity') {
        frame.opacity = prop.value
      } else if (prop.property === 'y-offset') {
        frame.transform = `translateY(${prop.value}px)`
      } else if (prop.property === 'x-offset') {
        frame.transform = `translateX(${prop.value}px)`
      } else if (prop.property === 'scale') {
        frame.transform = `scale(${prop.value})`
      } else if (prop.property === 'rotate') {
        frame.transform = `rotate(${prop.value}deg)`
      }
    }

    result.push(frame)
  }

  return result
}

/**
 * Run an animation on elements
 */
export function animate(
  animationName: string,
  elements: MirrorElement | MirrorElement[] | null,
  options: { duration?: number; delay?: number; stagger?: number; loop?: boolean; reverse?: boolean; fill?: FillMode } = {}
): Animation[] | null {
  if (!elements) return null

  const animation = _animations.get(animationName)
  if (!animation) {
    console.warn(`Animation "${animationName}" not found`)
    return null
  }

  const els = Array.isArray(elements) ? elements : [elements]
  const duration = (options.duration || animation.duration || 0.3) * 1000
  const animations: Animation[] = []

  els.forEach((el, index) => {
    const keyframes = convertKeyframes(animation.keyframes, animation.duration || 0.3)
    const delay = (options.delay || 0) * 1000 + (options.stagger || 0) * 1000 * index

    const anim = el.animate(keyframes, {
      duration,
      delay,
      easing: animation.easing,
      fill: options.fill || 'forwards',
      iterations: options.loop ? Infinity : 1,
      direction: options.reverse ? 'reverse' : 'normal'
    })

    animations.push(anim)
  })

  return animations
}

/**
 * Setup IntersectionObserver for onenter/onexit events
 */
export function setupEnterExitObserver(
  el: MirrorElement,
  onEnter?: () => void,
  onExit?: () => void
): IntersectionObserver {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        onEnter?.()
      } else {
        onExit?.()
      }
    }
  }, { threshold: 0.1 })

  observer.observe(el)
  return observer
}

// ============================================
// RUNTIME OBJECT (for compatibility)
// ============================================

/**
 * Runtime object that groups all functions
 * This is the format expected by generated code
 */
export const runtime = {
  _propMap: PROP_MAP,
  _alignToCSS: alignToCSS,
  _getAlign: getAlign,
  wrap,
  toggle,
  show,
  hide,
  close,
  select,
  deselect,
  selectHighlighted,
  highlight,
  unhighlight,
  highlightNext,
  highlightPrev,
  highlightFirst,
  highlightLast,
  getHighlightableItems,
  activate,
  deactivate,
  applyState,
  removeState,
  setState,
  toggleState,
  updateVisibility,
  navigate,
  updateNavSelection,
  navigateToPage,
  getPageContainer,
  updateSelectionBinding,
  updateBoundElements,
  destroy,
  loadIcon,
  setReadFileCallback,
  registerAnimation,
  getAnimation,
  animate,
  setupEnterExitObserver,
}

export default runtime
