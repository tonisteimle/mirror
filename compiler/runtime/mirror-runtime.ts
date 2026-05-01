/**
 * Mirror Runtime Framework v2
 *
 * Designprinzip: JavaScript das Mirror direkt spiegelt.
 * Jeder Aufruf mappt 1:1 zu einem Mirror-Konstrukt.
 *
 * Mirror:                          JavaScript:
 * ──────────────────────────────────────────────────────────
 * Box bg #fff, pad 16              M('Box', { bg: '#fff', pad: 16 })
 *   Text "Hello"                   M('Text', 'Hello')
 *   Icon "home"                    M('Icon', 'home')
 *
 * Card: bg #1a1a23                 M.define('Card', { bg: '#1a1a23' })
 *   Title:                           .slots('Title', 'Content')
 *   Content:
 *
 * Card                             M('Card', {
 *   Title "Hello"                    Title: 'Hello',
 *   Content "World"                  Content: 'World'
 *                                  })
 *
 * onclick toggle                   onclick: 'toggle'
 * onclick select, close            onclick: ['select', 'close']
 * onkeydown escape: close          'onkeydown escape': 'close'
 *
 * state hover                      states: { hover: { bg: '#333' } }
 *   bg #333
 */

// =============================================================================
// TYPES
// =============================================================================

// MirrorElement lives in `./types` (single source of truth); imported for
// local type-annotations and re-exported for the M-API runtime which only
// uses a subset of its fields.
import type { MirrorElement } from './types'
export type { MirrorElement }

/**
 * Window with Mirror runtime functions
 */
interface WindowWithMirrorFunctions extends Window {
  [key: string]: unknown
}

/**
 * Internal type for CSS to Mirror conversion with temporary properties
 */
interface CSSConversionProps extends Partial<MirrorProps> {
  _justifyCenter?: boolean
  _alignCenter?: boolean
  [key: `_${string}`]: string | number | boolean | undefined
}

/** Mirror property names - exactly as in Mirror DSL */
export interface MirrorProps {
  // Layout
  hor?: boolean
  horizontal?: boolean
  ver?: boolean
  vertical?: boolean
  gap?: number | string
  g?: number | string
  spread?: boolean
  wrap?: boolean
  stacked?: boolean
  grid?: number | string

  // Alignment
  left?: boolean
  right?: boolean
  top?: boolean
  bottom?: boolean
  center?: boolean
  cen?: boolean
  'hor-center'?: boolean
  'ver-center'?: boolean

  // Sizing
  width?: number | string | 'hug' | 'full'
  w?: number | string | 'hug' | 'full'
  height?: number | string | 'hug' | 'full'
  h?: number | string | 'hug' | 'full'
  size?: number | string | 'hug' | 'full'
  'min-width'?: number | string
  minw?: number | string
  'max-width'?: number | string
  maxw?: number | string
  'min-height'?: number | string
  minh?: number | string
  'max-height'?: number | string
  maxh?: number | string

  // Spacing (can have directional: pad left 8)
  pad?: number | string | number[]
  padding?: number | string | number[]
  p?: number | string | number[]
  margin?: number | string | number[]
  m?: number | string | number[]

  // Colors
  bg?: string
  background?: string
  col?: string
  color?: string
  c?: string
  boc?: string
  'border-color'?: string

  // Border
  bor?: string | number | [number, string] | [number, string, string]
  border?: string | number | [number, string] | [number, string, string]
  rad?: number | string | number[]
  radius?: number | string | number[]

  // Typography
  'font-size'?: number
  fs?: number
  weight?: number | string
  line?: number | string
  font?: string
  'text-align'?: string
  italic?: boolean
  underline?: boolean
  truncate?: boolean
  uppercase?: boolean
  lowercase?: boolean

  // Icon
  'icon-size'?: number
  is?: number
  'icon-weight'?: number
  iw?: number
  'icon-color'?: string
  ic?: string
  fill?: boolean

  // Visual
  opacity?: number
  o?: number
  shadow?: string
  cursor?: string
  z?: number
  hidden?: boolean
  visible?: boolean
  disabled?: boolean
  rotate?: number
  rot?: number

  // Scroll
  scroll?: boolean
  'scroll-ver'?: boolean
  'scroll-hor'?: boolean
  'scroll-both'?: boolean
  clip?: boolean

  // Hover (inline)
  'hover-bg'?: string
  'hover-col'?: string
  'hover-opacity'?: number
  'hover-scale'?: number

  // HTML specific
  placeholder?: string
  value?: string
  src?: string
  href?: string
  type?: string

  // Instance naming
  named?: string

  // State
  state?: string // initial state
  states?: Record<string, Partial<MirrorProps>> // state definitions

  // Visibility condition
  'visible-when'?: string

  // Route
  route?: string

  // Selection binding
  selection?: string

  // Events - Mirror syntax as keys
  onclick?: Action | Action[]
  onhover?: Action | Action[]
  onfocus?: Action | Action[]
  onblur?: Action | Action[]
  onchange?: Action | Action[]
  oninput?: Action | Action[]
  'onclick-outside'?: Action | Action[]
  // Keyboard events: 'onkeydown escape', 'onkeydown arrow-down', etc.
  [key: `onkeydown ${string}`]: Action | Action[]
  [key: `onkeyup ${string}`]: Action | Action[]

  // Slot fills (dynamic keys for component slots)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [slotName: string]: any
}

/** Action - exactly as in Mirror: "toggle", "select", "highlight next" */
export type Action = string

/** Element node in the tree */
export interface MirrorNode {
  type: string // Component/primitive name
  content?: string // Text content or icon name
  props: MirrorProps
  children: MirrorNode[]
  slots: Record<string, MirrorNode | string>
  // For special node types
  _each?: {
    itemVar: string
    collection: string
    filter?: string
  }
  _if?: {
    condition: string
    else?: MirrorNode[]
  }
}

// =============================================================================
// ELEMENT CREATION
// =============================================================================

/**
 * Create a Mirror element
 *
 * Signatures:
 * - M('Box', props, children)           → Box with props and children
 * - M('Box', props)                     → Box with props, no children
 * - M('Box', children)                  → Box with children, no props
 * - M('Text', 'content')                → Text with content
 * - M('Text', 'content', props)         → Text with content and props
 * - M('Icon', 'name')                   → Icon with name
 * - M('Icon', 'name', props)            → Icon with name and props
 */
export function M(
  type: string,
  arg1?: MirrorProps | MirrorNode[] | string,
  arg2?: MirrorNode[] | MirrorProps
): MirrorNode {
  let content: string | undefined
  let props: MirrorProps = {}
  let children: MirrorNode[] = []

  // Parse arguments based on type
  const isContentPrimitive = ['Text', 'Icon', 'Button', 'Link'].includes(type)

  if (typeof arg1 === 'string') {
    // M('Text', 'content') or M('Text', 'content', props)
    content = arg1
    if (arg2 && !Array.isArray(arg2)) {
      props = arg2
    }
  } else if (Array.isArray(arg1)) {
    // M('Box', children)
    children = arg1
  } else if (arg1 && typeof arg1 === 'object') {
    // M('Box', props) or M('Box', props, children)
    props = arg1 as MirrorProps
    if (Array.isArray(arg2)) {
      children = arg2
    }
  }

  // Extract slot fills from props
  const slots: Record<string, MirrorNode | string> = {}
  const cleanProps: MirrorProps = {}

  const knownProps = new Set([
    'hor',
    'horizontal',
    'ver',
    'vertical',
    'gap',
    'g',
    'spread',
    'wrap',
    'stacked',
    'grid',
    'left',
    'right',
    'top',
    'bottom',
    'center',
    'cen',
    'hor-center',
    'ver-center',
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
    'pad',
    'padding',
    'p',
    'margin',
    'm',
    'bg',
    'background',
    'col',
    'color',
    'c',
    'boc',
    'border-color',
    'bor',
    'border',
    'rad',
    'radius',
    'font-size',
    'fs',
    'weight',
    'line',
    'font',
    'text-align',
    'italic',
    'underline',
    'truncate',
    'uppercase',
    'lowercase',
    'icon-size',
    'is',
    'icon-weight',
    'iw',
    'icon-color',
    'ic',
    'fill',
    'opacity',
    'o',
    'shadow',
    'cursor',
    'z',
    'hidden',
    'visible',
    'disabled',
    'rotate',
    'rot',
    'scroll',
    'scroll-ver',
    'scroll-hor',
    'scroll-both',
    'clip',
    'hover-bg',
    'hover-col',
    'hover-opacity',
    'hover-scale',
    'placeholder',
    'value',
    'src',
    'href',
    'type',
    'named',
    'state',
    'states',
    'visible-when',
    'route',
    'selection',
    'onclick',
    'onhover',
    'onfocus',
    'onblur',
    'onchange',
    'oninput',
    'onclick-outside',
  ])

  // Dynamic property assignment requires any cast due to index signature conflicts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propsRecord = cleanProps as Record<string, any>
  for (const [key, value] of Object.entries(props)) {
    if (knownProps.has(key) || key.startsWith('onkeydown') || key.startsWith('onkeyup')) {
      propsRecord[key] = value
    } else if (/^[A-Z]/.test(key)) {
      // Uppercase key = slot fill
      slots[key] = value
    } else {
      // Unknown prop - pass through
      propsRecord[key] = value
    }
  }

  return {
    type,
    content,
    props: cleanProps,
    children,
    slots,
  }
}

// =============================================================================
// EACH LOOP (DATA BINDING)
// =============================================================================

/**
 * Create an each loop for iteration
 *
 * Mirror:
 *   each task in tasks
 *     TaskCard task.title
 *
 * JavaScript:
 *   M.each('task', 'tasks', [
 *     M('Box', [M('Text', '$task.title')])
 *   ])
 *
 * With filter:
 *   M.each('task', 'tasks', [
 *     M('Box', [M('Text', '$task.title')])
 *   ], 'task.done === false')
 */
M.each = function (
  itemVar: string,
  collection: string,
  template: MirrorNode[],
  filter?: string
): MirrorNode {
  return {
    type: '_Each',
    props: {},
    children: template,
    slots: {},
    _each: {
      itemVar,
      collection,
      filter,
    },
  }
}

// =============================================================================
// CONDITIONAL RENDERING
// =============================================================================

/**
 * Create a conditional element
 *
 * Mirror:
 *   if isLoggedIn
 *     Avatar
 *   else
 *     LoginButton
 *
 * JavaScript:
 *   M.if('isLoggedIn',
 *     [M('Avatar')],
 *     [M('LoginButton')]  // else branch (optional)
 *   )
 */
M.if = function (
  condition: string,
  thenBranch: MirrorNode[],
  elseBranch?: MirrorNode[]
): MirrorNode {
  return {
    type: '_If',
    props: {},
    children: thenBranch,
    slots: {},
    _if: { condition, else: elseBranch },
  }
}

// =============================================================================
// RENDERING TO DOM
// =============================================================================

/** Tag mapping */
const TAG_MAP: Record<string, string> = {
  Box: 'div',
  Frame: 'div',
  Text: 'span',
  Button: 'button',
  Input: 'input',
  Textarea: 'textarea',
  Image: 'img',
  Link: 'a',
  Icon: 'span',
  Nav: 'nav',
  Header: 'header',
  Footer: 'footer',
  Section: 'section',
  Article: 'article',
}

/** Shadow presets */
const SHADOW_MAP: Record<string, string> = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
}

/**
 * Render to DOM
 */
M.render = function (node: MirrorNode, container: HTMLElement = document.body): MirrorUI {
  const root = renderNode(node)
  container.appendChild(root)
  const named = new Map<string, HTMLElement>()
  collectNamed(root, named)
  return {
    root,
    get: (name: string) => named.get(name) || null,
    destroy: () => {
      cleanup(root)
      root.remove()
    },
  }
}

interface MirrorUI {
  root: HTMLElement
  get: (name: string) => HTMLElement | null
  destroy: () => void
}

function renderNode(node: MirrorNode): HTMLElement {
  // Primitive element
  const tag = TAG_MAP[node.type] || 'div'
  const el = document.createElement(tag)

  // Apply styles
  applyStyles(el, node.props)

  // Apply content
  if (node.content !== undefined) {
    if (node.type === 'Icon') {
      loadIcon(el, node.content, node.props)
    } else {
      el.textContent = node.content
    }
  }

  // Apply HTML attributes
  applyAttributes(el, node.props)

  // Apply data attributes
  if (node.props.named) {
    el.dataset.mirrorName = node.props.named
  }
  if (node.props.state) {
    el.dataset.state = node.props.state
  }
  if (node.props.route) {
    el.dataset.route = node.props.route
  }
  if (node.props['visible-when']) {
    el.dataset.visibleWhen = node.props['visible-when']
    el.style.display = 'none' // Hidden until parent state matches
  }
  if (node.props.stacked) {
    el.dataset.layout = 'stacked'
  }

  // Apply states
  if (node.props.states) {
    const mirrorEl = el as MirrorElement
    mirrorEl._stateStyles = {}
    for (const [stateName, stateProps] of Object.entries(node.props.states)) {
      mirrorEl._stateStyles[stateName] = propsToCSS(stateProps)
    }
  }

  // Apply events
  applyEvents(el, node.props)

  // Render children
  for (const child of node.children) {
    el.appendChild(renderNode(child))
  }

  // Render slot fills
  for (const [slotName, slotContent] of Object.entries(node.slots)) {
    const slotEl =
      typeof slotContent === 'string' ? renderNode(M('Text', slotContent)) : renderNode(slotContent)
    slotEl.dataset.slot = slotName
    el.appendChild(slotEl)
  }

  return el
}

function applyStyles(el: HTMLElement, props: MirrorProps): void {
  const css = propsToCSS(props)
  Object.assign(el.style, css)
}

function propsToCSS(props: Partial<MirrorProps>): Record<string, string> {
  const css: Record<string, string> = {}
  const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)

  // Layout
  if (props.hor || props.horizontal) {
    css.display = 'flex'
    css.flexDirection = 'row'
  }
  if (props.ver || props.vertical) {
    css.display = 'flex'
    css.flexDirection = 'column'
  }
  // Default flex column for Box/Frame
  if (!css.display && !props.hor && !props.horizontal) {
    css.display = 'flex'
    css.flexDirection = 'column'
  }

  if (props.gap !== undefined || props.g !== undefined) {
    css.gap = px(props.gap ?? props.g!)
  }
  if (props.spread) css.justifyContent = 'space-between'
  if (props.wrap) css.flexWrap = 'wrap'
  if (props.stacked) css.position = 'relative'

  // Grid
  if (props.grid !== undefined) {
    css.display = 'grid'
    if (typeof props.grid === 'number') {
      css.gridTemplateColumns = `repeat(${props.grid}, 1fr)`
    } else {
      css.gridTemplateColumns = props.grid as string
    }
  }

  // Alignment
  if (props.center || props.cen) {
    css.justifyContent = 'center'
    css.alignItems = 'center'
  }
  if (props.left) css.alignItems = css.flexDirection === 'row' ? css.alignItems : 'flex-start'
  if (props.right) css.alignItems = css.flexDirection === 'row' ? css.alignItems : 'flex-end'
  if (props.top)
    css.justifyContent = css.flexDirection === 'column' ? 'flex-start' : css.justifyContent
  if (props.bottom)
    css.justifyContent = css.flexDirection === 'column' ? 'flex-end' : css.justifyContent

  // Sizing
  const formatSize = (v: number | string | 'hug' | 'full'): string => {
    if (v === 'hug') return 'fit-content'
    if (v === 'full') return '100%'
    return px(v)
  }

  if (props.width !== undefined || props.w !== undefined) {
    const v = props.width ?? props.w!
    css.width = formatSize(v)
    if (v === 'full') css.flexGrow = '1'
  }
  if (props.height !== undefined || props.h !== undefined) {
    const v = props.height ?? props.h!
    css.height = formatSize(v)
    if (v === 'full') css.flexGrow = '1'
  }
  if (props.size !== undefined) {
    css.width = formatSize(props.size)
    css.height = formatSize(props.size)
  }
  if (props['min-width'] !== undefined || props.minw !== undefined) {
    css.minWidth = px(props['min-width'] ?? props.minw!)
  }
  if (props['max-width'] !== undefined || props.maxw !== undefined) {
    css.maxWidth = px(props['max-width'] ?? props.maxw!)
  }
  if (props['min-height'] !== undefined || props.minh !== undefined) {
    css.minHeight = px(props['min-height'] ?? props.minh!)
  }
  if (props['max-height'] !== undefined || props.maxh !== undefined) {
    css.maxHeight = px(props['max-height'] ?? props.maxh!)
  }

  // Spacing
  const formatSpacing = (v: number | string | number[]): string => {
    if (Array.isArray(v)) return v.map(n => px(n)).join(' ')
    return px(v)
  }

  if (props.pad !== undefined || props.padding !== undefined || props.p !== undefined) {
    css.padding = formatSpacing(props.pad ?? props.padding ?? props.p!)
  }
  if (props.margin !== undefined || props.m !== undefined) {
    css.margin = formatSpacing(props.margin ?? props.m!)
  }

  // Colors
  if (props.bg !== undefined || props.background !== undefined) {
    css.background = props.bg ?? props.background!
  }
  if (props.col !== undefined || props.color !== undefined || props.c !== undefined) {
    css.color = props.col ?? props.color ?? props.c!
  }
  if (props.boc !== undefined || props['border-color'] !== undefined) {
    css.borderColor = props.boc ?? props['border-color']!
  }

  // Border
  if (props.bor !== undefined || props.border !== undefined) {
    const b = props.bor ?? props.border!
    if (typeof b === 'number') {
      css.border = `${b}px solid`
    } else if (typeof b === 'string') {
      css.border = b
    } else if (Array.isArray(b)) {
      if (b.length === 2) css.border = `${b[0]}px solid ${b[1]}`
      if (b.length === 3) css.border = `${b[0]}px ${b[1]} ${b[2]}`
    }
  }
  if (props.rad !== undefined || props.radius !== undefined) {
    const r = props.rad ?? props.radius!
    if (Array.isArray(r)) {
      css.borderRadius = r.map(n => px(n)).join(' ')
    } else {
      css.borderRadius = px(r)
    }
  }

  // Typography
  if (props['font-size'] !== undefined || props.fs !== undefined) {
    css.fontSize = px(props['font-size'] ?? props.fs!)
  }
  if (props.weight !== undefined) {
    css.fontWeight = String(props.weight)
  }
  if (props.line !== undefined) {
    css.lineHeight = String(props.line)
  }
  if (props.font !== undefined) {
    css.fontFamily = props.font
  }
  if (props['text-align'] !== undefined) {
    css.textAlign = props['text-align']
  }
  if (props.italic) css.fontStyle = 'italic'
  if (props.underline) css.textDecoration = 'underline'
  if (props.truncate) {
    css.overflow = 'hidden'
    css.textOverflow = 'ellipsis'
    css.whiteSpace = 'nowrap'
  }
  if (props.uppercase) css.textTransform = 'uppercase'
  if (props.lowercase) css.textTransform = 'lowercase'

  // Visual
  if (props.opacity !== undefined || props.o !== undefined) {
    css.opacity = String(props.opacity ?? props.o!)
  }
  if (props.shadow !== undefined) {
    css.boxShadow = SHADOW_MAP[props.shadow] || props.shadow
  }
  if (props.cursor !== undefined) {
    css.cursor = props.cursor
  }
  if (props.z !== undefined) {
    css.zIndex = String(props.z)
  }
  if (props.hidden) {
    css.display = 'none'
  }
  if (props.rotate !== undefined || props.rot !== undefined) {
    css.transform = `rotate(${props.rotate ?? props.rot}deg)`
  }

  // Scroll
  if (props.scroll || props['scroll-ver']) css.overflowY = 'auto'
  if (props['scroll-hor']) css.overflowX = 'auto'
  if (props['scroll-both']) css.overflow = 'auto'
  if (props.clip) css.overflow = 'hidden'

  return css
}

function applyAttributes(el: HTMLElement, props: MirrorProps): void {
  if (props.placeholder !== undefined) {
    ;(el as HTMLInputElement).placeholder = props.placeholder
  }
  if (props.value !== undefined) {
    ;(el as HTMLInputElement).value = props.value
  }
  if (props.src !== undefined) {
    ;(el as HTMLImageElement).src = props.src
  }
  if (props.href !== undefined) {
    ;(el as HTMLAnchorElement).href = props.href
  }
  if (props.type !== undefined) {
    ;(el as HTMLInputElement).type = props.type
  }
  if (props.disabled) {
    ;(el as HTMLButtonElement).disabled = true
  }
}

function applyEvents(el: HTMLElement, props: MirrorProps): void {
  const eventProps = [
    'onclick',
    'onhover',
    'onfocus',
    'onblur',
    'onchange',
    'oninput',
    'onclick-outside',
  ] as const

  for (const eventProp of eventProps) {
    const actions = props[eventProp]
    if (actions) {
      const eventName =
        eventProp === 'onhover'
          ? 'mouseenter'
          : eventProp === 'onclick-outside'
            ? 'click-outside'
            : eventProp.slice(2)

      attachEvent(el, eventName, normalizeActions(actions))
    }
  }

  // Keyboard events: 'onkeydown escape', 'onkeydown arrow-down', etc.
  for (const [key, value] of Object.entries(props)) {
    const keyMatch = key.match(/^onkeydown\s+(.+)$/)
    if (keyMatch) {
      const keyName = keyMatch[1]
      attachKeyEvent(el, 'keydown', keyName, normalizeActions(value))
    }
    const keyUpMatch = key.match(/^onkeyup\s+(.+)$/)
    if (keyUpMatch) {
      const keyName = keyUpMatch[1]
      attachKeyEvent(el, 'keyup', keyName, normalizeActions(value))
    }
  }
}

function normalizeActions(actions: Action | Action[]): string[] {
  if (Array.isArray(actions)) return actions
  return [actions]
}

function attachEvent(el: HTMLElement, eventName: string, actions: string[]): void {
  if (eventName === 'click-outside') {
    const handler = (e: Event) => {
      if (!el.contains(e.target as Node)) executeActions(el, actions)
    }
    document.addEventListener('click', handler)
    ;(el as MirrorElement)._clickOutsideHandler = handler
    return
  }
  el.addEventListener(eventName, () => executeActions(el, actions))
}

function attachKeyEvent(
  el: HTMLElement,
  eventType: string,
  keyName: string,
  actions: string[]
): void {
  // Make element focusable
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '0')
  }

  const keyMap: Record<string, string> = {
    escape: 'Escape',
    enter: 'Enter',
    tab: 'Tab',
    space: ' ',
    'arrow-up': 'ArrowUp',
    'arrow-down': 'ArrowDown',
    'arrow-left': 'ArrowLeft',
    'arrow-right': 'ArrowRight',
    backspace: 'Backspace',
    delete: 'Delete',
    home: 'Home',
    end: 'End',
  }

  el.addEventListener(eventType, (e: Event) => {
    const ke = e as KeyboardEvent
    if (ke.key === keyMap[keyName]) {
      e.preventDefault()
      executeActions(el, actions)
    }
  })
}

// =============================================================================
// ACTION EXECUTION
// =============================================================================

function executeActions(el: HTMLElement, actions: string[]): void {
  for (const action of actions) {
    executeAction(el, action)
  }
}

function executeAction(el: HTMLElement, action: string): void {
  const parts = action.trim().split(/\s+/)
  const type = parts[0]
  const target = parts[1] || 'self'
  const args = parts.slice(2)

  const targetEl = resolveTarget(el, target)

  switch (type) {
    case 'toggle':
      runtime.toggle(targetEl)
      break
    case 'show':
      runtime.show(targetEl)
      break
    case 'hide':
      runtime.hide(targetEl)
      break
    case 'close':
      runtime.close(targetEl || el)
      break
    case 'select':
      if (target === 'highlighted') {
        runtime.selectHighlighted(el)
      } else {
        runtime.select(targetEl || el)
      }
      break
    case 'deselect':
      runtime.deselect(targetEl || el)
      break
    case 'highlight':
      if (target === 'next') runtime.highlightNext(el)
      else if (target === 'prev') runtime.highlightPrev(el)
      else if (target === 'first') runtime.highlightFirst(el)
      else if (target === 'last') runtime.highlightLast(el)
      else runtime.highlight(targetEl || el)
      break
    case 'activate':
      runtime.activate(targetEl || el)
      break
    case 'deactivate':
      runtime.deactivate(targetEl || el)
      break
    case 'navigate':
      runtime.navigate(target)
      break
    case 'page':
      runtime.navigateToPage(target)
      break
    case 'focus':
      ;(targetEl || el)?.focus()
      break
    case 'call':
      const fn = (window as unknown as WindowWithMirrorFunctions)[target]
      if (typeof fn === 'function') fn(...args)
      break
    default:
      // Unknown action = try as function call
      const func = (window as unknown as WindowWithMirrorFunctions)[type]
      if (typeof func === 'function') func(target, ...args)
  }
}

function resolveTarget(el: HTMLElement, target: string): HTMLElement | null {
  if (target === 'self') return el
  if (target === 'next') return el.nextElementSibling as HTMLElement
  if (target === 'prev') return el.previousElementSibling as HTMLElement
  if (target === 'first') return el.parentElement?.firstElementChild as HTMLElement
  if (target === 'last') return el.parentElement?.lastElementChild as HTMLElement
  return document.querySelector(`[data-mirror-name="${target}"]`) as HTMLElement
}

// =============================================================================
// RUNTIME HELPERS
// =============================================================================

const runtime = {
  toggle(el: HTMLElement | null) {
    if (!el) return
    const state = el.dataset.state
    if (state === 'open' || state === 'closed') {
      this.setState(el, state === 'open' ? 'closed' : 'open')
    } else if (state === 'expanded' || state === 'collapsed') {
      this.setState(el, state === 'expanded' ? 'collapsed' : 'expanded')
    } else {
      el.hidden = !el.hidden
    }
  },

  show(el: HTMLElement | null) {
    if (!el) return
    el.hidden = false
    // Restore saved display value or clear inline style
    el.style.display = (el as MirrorElement)._savedDisplay || ''
  },

  hide(el: HTMLElement | null) {
    if (!el) return
    // Save current display before hiding (unless already hidden)
    if (el.style.display !== 'none') {
      ;(el as MirrorElement)._savedDisplay = el.style.display
    }
    el.hidden = true
    el.style.display = 'none'
  },

  close(el: HTMLElement | null) {
    if (!el) return
    const state = el.dataset.state
    if (state === 'open') this.setState(el, 'closed')
    else if (state === 'expanded') this.setState(el, 'collapsed')
    else this.hide(el)
  },

  select(el: HTMLElement | null) {
    if (!el) return
    // Deselect siblings
    if (el.parentElement) {
      for (const sibling of Array.from(el.parentElement.children)) {
        if (sibling !== el) this.deselect(sibling as HTMLElement)
      }
    }
    el.dataset.selected = 'true'
    this.applyState(el, 'selected')
  },

  deselect(el: HTMLElement | null) {
    if (!el) return
    delete el.dataset.selected
    this.removeState(el, 'selected')
  },

  highlight(el: HTMLElement | null) {
    if (!el) return
    // Clear other highlights
    if (el.parentElement) {
      for (const sibling of Array.from(el.parentElement.children)) {
        if (sibling !== el) this.unhighlight(sibling as HTMLElement)
      }
    }
    el.dataset.highlighted = 'true'
    this.applyState(el, 'highlighted')
  },

  unhighlight(el: HTMLElement | null) {
    if (!el) return
    delete el.dataset.highlighted
    this.removeState(el, 'highlighted')
  },

  highlightNext(container: HTMLElement | null) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    if (!items.length) return
    const current = items.findIndex(el => el.dataset.highlighted === 'true')
    const next = current === -1 ? 0 : Math.min(current + 1, items.length - 1)
    this.highlight(items[next])
  },

  highlightPrev(container: HTMLElement | null) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    if (!items.length) return
    const current = items.findIndex(el => el.dataset.highlighted === 'true')
    const prev = current === -1 ? items.length - 1 : Math.max(current - 1, 0)
    this.highlight(items[prev])
  },

  highlightFirst(container: HTMLElement | null) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    if (items.length) this.highlight(items[0])
  },

  highlightLast(container: HTMLElement | null) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    if (items.length) this.highlight(items[items.length - 1])
  },

  getHighlightableItems(container: HTMLElement): HTMLElement[] {
    const items: HTMLElement[] = []
    const walk = (el: HTMLElement) => {
      for (const child of Array.from(el.children)) {
        const htmlChild = child as MirrorElement
        if (htmlChild._stateStyles?.highlighted || htmlChild.style.cursor === 'pointer') {
          items.push(htmlChild)
        } else {
          walk(htmlChild)
        }
      }
    }
    walk(container)
    return items
  },

  selectHighlighted(container: HTMLElement | null) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    const highlighted = items.find(el => el.dataset.highlighted === 'true')
    if (highlighted) this.select(highlighted)
  },

  activate(el: HTMLElement | null) {
    if (!el) return
    el.dataset.active = 'true'
    this.applyState(el, 'active')
  },

  deactivate(el: HTMLElement | null) {
    if (!el) return
    delete el.dataset.active
    this.removeState(el, 'active')
  },

  setState(el: HTMLElement, stateName: string) {
    if (!el) return
    const mirrorEl = el as MirrorElement

    // Store base styles
    if (!mirrorEl._baseStyles && mirrorEl._stateStyles) {
      mirrorEl._baseStyles = {}
      const props = new Set<string>()
      for (const state of Object.values(mirrorEl._stateStyles)) {
        for (const p of Object.keys(state)) props.add(p)
      }
      for (const p of Array.from(props)) {
        mirrorEl._baseStyles[p] =
          (el.style as CSSStyleDeclaration & Record<string, string>)[p] || ''
      }
    }

    // Restore base
    if (mirrorEl._baseStyles) {
      Object.assign(el.style, mirrorEl._baseStyles)
    }

    // Apply new state
    el.dataset.state = stateName
    if (mirrorEl._stateStyles?.[stateName]) {
      Object.assign(el.style, mirrorEl._stateStyles[stateName])
    }

    // Update child visibility
    this.updateVisibility(el)
  },

  applyState(el: HTMLElement, state: string) {
    const mirrorEl = el as MirrorElement
    if (!mirrorEl._stateStyles?.[state]) return
    if (!mirrorEl._baseStyles) {
      mirrorEl._baseStyles = {}
      Object.keys(mirrorEl._stateStyles[state]).forEach(
        p =>
          (mirrorEl._baseStyles![p] =
            (el.style as CSSStyleDeclaration & Record<string, string>)[p] || '')
      )
    }
    Object.assign(el.style, mirrorEl._stateStyles[state])
  },

  removeState(el: HTMLElement, _state: string) {
    const mirrorEl = el as MirrorElement
    if (!mirrorEl._baseStyles) return
    Object.assign(el.style, mirrorEl._baseStyles)
  },

  updateVisibility(el: HTMLElement) {
    const state = el.dataset.state
    const children = el.querySelectorAll('[data-visible-when]')
    for (const child of Array.from(children)) {
      const condition = (child as HTMLElement).dataset.visibleWhen
      ;(child as HTMLElement).style.display = condition === state ? '' : 'none'
    }
  },

  navigate(targetName: string) {
    const target = document.querySelector(`[data-component="${targetName}"]`)
    if (!target?.parentElement) return
    for (const sibling of Array.from(target.parentElement.children)) {
      if ((sibling as HTMLElement).dataset?.component) {
        ;(sibling as HTMLElement).style.display = sibling === target ? '' : 'none'
      }
    }
  },

  navigateToPage(pageName: string) {
    // The framework runtime (M-API) doesn't produce a multi-page app
    // structure — that's a DOM-backend feature. If user code calls
    // `runtime.navigateToPage(...)`, they're mixing backends. Fail loud
    // so the integration mistake surfaces in dev, instead of silently
    // continuing as if navigation happened.
    throw new Error(
      `navigateToPage("${pageName}") is not supported in the framework runtime — ` +
        `use your framework's router (e.g. React Router) or compile with the DOM backend.`
    )
  },
}

// =============================================================================
// ICON LOADING
// =============================================================================

async function loadIcon(el: HTMLElement, name: string, props?: MirrorProps): Promise<void> {
  // Read from props first, then from dataset attributes (set by compiler), then defaults
  const size = props?.['icon-size'] ?? props?.is ?? el.dataset.iconSize ?? 24
  const color = props?.['icon-color'] ?? props?.ic ?? el.dataset.iconColor ?? 'currentColor'
  const weight = props?.['icon-weight'] ?? props?.iw ?? el.dataset.iconWeight ?? 2

  try {
    const res = await fetch(`https://unpkg.com/lucide-static/icons/${name}.svg`)
    if (!res.ok) {
      el.textContent = name
      return
    }
    const svg = await res.text()
    el.innerHTML = svg
    const svgEl = el.querySelector('svg')
    if (svgEl) {
      svgEl.style.width = `${size}px`
      svgEl.style.height = `${size}px`
      svgEl.style.color = String(color)
      svgEl.setAttribute('stroke-width', String(weight))
      svgEl.style.display = 'block'
    }
  } catch (err) {
    // Network error loading icon - fall back to showing icon name as text
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[Mirror] Failed to load icon "${name}":`, err)
    }
    el.textContent = name
  }
}

// =============================================================================
// REVERSE TRANSLATION: JavaScript → Mirror
// =============================================================================

/**
 * Convert MirrorNode back to Mirror DSL source
 *
 * This is DETERMINISTIC: same input always produces same output
 */
M.toMirror = function (node: MirrorNode, indent: number = 0): string {
  const lines: string[] = []
  const spaces = '  '.repeat(indent)

  // Handle special node types
  if (node._each) {
    // each item in collection [where filter]
    let eachLine = `${spaces}each ${node._each.itemVar} in ${node._each.collection}`
    if (node._each.filter) {
      eachLine += ` where ${node._each.filter}`
    }
    lines.push(eachLine)
    // Children are the template
    for (const child of node.children) {
      lines.push(M.toMirror(child, indent + 1))
    }
    return lines.join('\n')
  }

  if (node._if) {
    // if condition
    lines.push(`${spaces}if ${node._if.condition}`)
    // Then branch (children)
    for (const child of node.children) {
      lines.push(M.toMirror(child, indent + 1))
    }
    // Else branch
    if (node._if.else && node._if.else.length > 0) {
      lines.push(`${spaces}else`)
      for (const child of node._if.else) {
        lines.push(M.toMirror(child, indent + 1))
      }
    }
    return lines.join('\n')
  }

  // Element line: Type props
  let line = spaces + node.type

  // Add content for content-primitives
  if (node.content !== undefined) {
    line += ` "${escapeString(node.content)}"`
  }

  // Add props
  const propStr = propsToMirror(node.props)
  if (propStr) {
    line += (node.content ? ', ' : ' ') + propStr
  }

  lines.push(line)

  // Add states
  if (node.props.states) {
    for (const [stateName, stateProps] of Object.entries(node.props.states)) {
      const statePropStr = propsToMirror(stateProps)
      if (statePropStr) {
        lines.push(`${spaces}  state ${stateName} ${statePropStr}`)
      }
    }
  }

  // Add events
  const eventLines = eventsToMirror(node.props, indent + 1)
  lines.push(...eventLines)

  // Add children
  for (const child of node.children) {
    lines.push(M.toMirror(child, indent + 1))
  }

  // Add slot fills
  for (const [slotName, slotContent] of Object.entries(node.slots)) {
    if (typeof slotContent === 'string') {
      lines.push(`${spaces}  ${slotName} "${escapeString(slotContent)}"`)
    } else {
      lines.push(M.toMirror({ ...slotContent, type: slotName }, indent + 1))
    }
  }

  return lines.join('\n')
}

function propsToMirror(props: Partial<MirrorProps>): string {
  const parts: string[] = []

  // Layout
  if (props.hor || props.horizontal) parts.push('hor')
  if (props.ver || props.vertical) parts.push('ver')
  if (props.gap !== undefined) parts.push(`gap ${props.gap}`)
  if (props.g !== undefined) parts.push(`g ${props.g}`)
  if (props.spread) parts.push('spread')
  if (props.wrap) parts.push('wrap')
  if (props.center || props.cen) parts.push('center')
  if (props.grid !== undefined) parts.push(`grid ${props.grid}`)

  // Sizing
  if (props.w !== undefined) parts.push(`w ${props.w}`)
  if (props.width !== undefined) parts.push(`width ${props.width}`)
  if (props.h !== undefined) parts.push(`h ${props.h}`)
  if (props.height !== undefined) parts.push(`height ${props.height}`)

  // Spacing
  if (props.pad !== undefined) {
    parts.push(`pad ${Array.isArray(props.pad) ? props.pad.join(' ') : props.pad}`)
  }
  if (props.margin !== undefined) {
    parts.push(`margin ${Array.isArray(props.margin) ? props.margin.join(' ') : props.margin}`)
  }

  // Colors
  if (props.bg !== undefined) parts.push(`bg ${props.bg}`)
  if (props.col !== undefined) parts.push(`col ${props.col}`)

  // Border
  if (props.rad !== undefined) parts.push(`rad ${props.rad}`)
  if (props.bor !== undefined) {
    if (typeof props.bor === 'number') parts.push(`bor ${props.bor}`)
    else if (Array.isArray(props.bor)) parts.push(`bor ${props.bor.join(' ')}`)
    else parts.push(`bor ${props.bor}`)
  }

  // Typography
  if (props['font-size'] !== undefined) parts.push(`font-size ${props['font-size']}`)
  if (props.fs !== undefined) parts.push(`fs ${props.fs}`)
  if (props.weight !== undefined) parts.push(`weight ${props.weight}`)
  if (props.italic) parts.push('italic')
  if (props.underline) parts.push('underline')
  if (props.truncate) parts.push('truncate')

  // Icon
  if (props['icon-size'] !== undefined) parts.push(`icon-size ${props['icon-size']}`)
  if (props.is !== undefined) parts.push(`is ${props.is}`)
  if (props['icon-color'] !== undefined) parts.push(`icon-color ${props['icon-color']}`)
  if (props.ic !== undefined) parts.push(`ic ${props.ic}`)

  // Visual
  if (props.opacity !== undefined) parts.push(`opacity ${props.opacity}`)
  if (props.shadow !== undefined) parts.push(`shadow ${props.shadow}`)
  if (props.cursor !== undefined) parts.push(`cursor ${props.cursor}`)
  if (props.hidden) parts.push('hidden')
  if (props.z !== undefined) parts.push(`z ${props.z}`)

  // Border color (often used in states)
  if (props['border-color'] !== undefined) parts.push(`border-color ${props['border-color']}`)
  if (props.boc !== undefined) parts.push(`boc ${props.boc}`)

  // Color aliases
  if (props.color !== undefined) parts.push(`color ${props.color}`)
  if (props.c !== undefined) parts.push(`c ${props.c}`)
  if (props.background !== undefined) parts.push(`background ${props.background}`)

  // Min/Max sizing
  if (props['min-width'] !== undefined) parts.push(`min-width ${props['min-width']}`)
  if (props.minw !== undefined) parts.push(`minw ${props.minw}`)
  if (props['max-width'] !== undefined) parts.push(`max-width ${props['max-width']}`)
  if (props.maxw !== undefined) parts.push(`maxw ${props.maxw}`)
  if (props['min-height'] !== undefined) parts.push(`min-height ${props['min-height']}`)
  if (props.minh !== undefined) parts.push(`minh ${props.minh}`)
  if (props['max-height'] !== undefined) parts.push(`max-height ${props['max-height']}`)
  if (props.maxh !== undefined) parts.push(`maxh ${props.maxh}`)

  // Scroll
  if (props.scroll) parts.push('scroll')
  if (props.clip) parts.push('clip')

  // Transform
  if (props.rotate !== undefined) parts.push(`rotate ${props.rotate}`)
  if (props.scale !== undefined) parts.push(`scale ${props.scale}`)

  // Text
  if (props['text-align'] !== undefined) parts.push(`text-align ${props['text-align']}`)
  if (props.uppercase) parts.push('uppercase')
  if (props.lowercase) parts.push('lowercase')
  if (props.line !== undefined) parts.push(`line ${props.line}`)
  if (props.font !== undefined) parts.push(`font ${props.font}`)

  // Input specific
  if (props.placeholder !== undefined) parts.push(`placeholder "${props.placeholder}"`)
  if (props.type !== undefined) parts.push(`type ${props.type}`)
  if (props.value !== undefined) parts.push(`value "${props.value}"`)
  if (props.disabled) parts.push('disabled')

  // Special
  if (props.named !== undefined) parts.push(`named ${props.named}`)
  if (props.state !== undefined) parts.push(`state ${props.state}`)
  if (props.route !== undefined) parts.push(`route ${props.route}`)
  if (props['visible-when'] !== undefined) parts.push(`visible-when ${props['visible-when']}`)
  if (props.focusable) parts.push('focusable')

  return parts.join(', ')
}

function eventsToMirror(props: MirrorProps, indent: number): string[] {
  const lines: string[] = []
  const spaces = '  '.repeat(indent)

  const simpleEvents = ['onclick', 'onhover', 'onfocus', 'onblur', 'onchange', 'oninput'] as const

  for (const event of simpleEvents) {
    const actions = props[event]
    if (actions) {
      const actionStr = normalizeActions(actions).join(', ')
      lines.push(`${spaces}${event} ${actionStr}`)
    }
  }

  // Keyboard events
  for (const [key, value] of Object.entries(props)) {
    const match = key.match(/^(onkeydown|onkeyup)\s+(.+)$/)
    if (match) {
      const [, eventType, keyName] = match
      const actionStr = normalizeActions(value).join(', ')
      lines.push(`${spaces}${eventType} ${keyName}: ${actionStr}`)
    }
  }

  return lines
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// =============================================================================
// UTILITIES
// =============================================================================

function collectNamed(el: HTMLElement, map: Map<string, HTMLElement>): void {
  if (el.dataset.mirrorName) {
    map.set(el.dataset.mirrorName, el)
  }
  for (const child of Array.from(el.children)) {
    collectNamed(child as HTMLElement, map)
  }
}

function cleanup(el: HTMLElement): void {
  const mirrorEl = el as MirrorElement
  if (mirrorEl._clickOutsideHandler) {
    document.removeEventListener('click', mirrorEl._clickOutsideHandler)
  }
  for (const child of Array.from(el.children)) {
    cleanup(child as HTMLElement)
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export default M
