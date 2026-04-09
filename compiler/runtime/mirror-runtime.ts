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

/**
 * Extended HTMLElement with Mirror runtime properties
 * Used for state management, visibility, and event handlers
 */
export interface MirrorElement extends HTMLElement {
  /** State-specific styles: { hover: { background: '#333' }, selected: {...} } */
  _stateStyles?: Record<string, Record<string, string>>
  /** Base styles saved before applying state styles */
  _baseStyles?: Record<string, string>
  /** Saved display value before hiding */
  _savedDisplay?: string
  /** Click outside handler for cleanup */
  _clickOutsideHandler?: (e: Event) => void
}

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
  state?: string                              // initial state
  states?: Record<string, Partial<MirrorProps>>  // state definitions

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
  [slotName: string]: any
}

/** Action - exactly as in Mirror: "toggle", "select", "highlight next" */
export type Action = string

/** Element node in the tree */
export interface MirrorNode {
  type: string                    // Component/primitive name
  content?: string                // Text content or icon name
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

/** Component definition */
export interface ComponentDef {
  name: string
  props: MirrorProps
  slots: string[]
  extends?: string
}

// =============================================================================
// ELEMENT CREATION
// =============================================================================

const components = new Map<string, ComponentDef>()

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
    'hor', 'horizontal', 'ver', 'vertical', 'gap', 'g', 'spread', 'wrap', 'stacked', 'grid',
    'left', 'right', 'top', 'bottom', 'center', 'cen', 'hor-center', 'ver-center',
    'width', 'w', 'height', 'h', 'size', 'min-width', 'minw', 'max-width', 'maxw',
    'min-height', 'minh', 'max-height', 'maxh',
    'pad', 'padding', 'p', 'margin', 'm',
    'bg', 'background', 'col', 'color', 'c', 'boc', 'border-color',
    'bor', 'border', 'rad', 'radius',
    'font-size', 'fs', 'weight', 'line', 'font', 'text-align',
    'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
    'icon-size', 'is', 'icon-weight', 'iw', 'icon-color', 'ic', 'fill',
    'opacity', 'o', 'shadow', 'cursor', 'z', 'hidden', 'visible', 'disabled',
    'rotate', 'rot', 'scroll', 'scroll-ver', 'scroll-hor', 'scroll-both', 'clip',
    'hover-bg', 'hover-col', 'hover-opacity', 'hover-scale',
    'placeholder', 'value', 'src', 'href', 'type',
    'named', 'state', 'states', 'visible-when', 'route', 'selection',
    'onclick', 'onhover', 'onfocus', 'onblur', 'onchange', 'oninput', 'onclick-outside'
  ])

  for (const [key, value] of Object.entries(props)) {
    if (knownProps.has(key) || key.startsWith('onkeydown') || key.startsWith('onkeyup')) {
      (cleanProps as any)[key] = value
    } else if (/^[A-Z]/.test(key)) {
      // Uppercase key = slot fill
      slots[key] = value
    } else {
      // Unknown prop - pass through
      (cleanProps as any)[key] = value
    }
  }

  return {
    type,
    content,
    props: cleanProps,
    children,
    slots
  }
}

// =============================================================================
// COMPONENT DEFINITION
// =============================================================================

interface DefineBuilder {
  slots(...names: string[]): DefineBuilder
  extends(parent: string): DefineBuilder
  build(): void
}

/**
 * Define a component
 *
 * M.define('Card', { bg: '#1a1a23', pad: 16 })
 *   .slots('Title', 'Content')
 *   .build()
 */
M.define = function(name: string, props: MirrorProps = {}): DefineBuilder {
  const def: ComponentDef = {
    name,
    props,
    slots: [],
    extends: undefined
  }

  const builder: DefineBuilder = {
    slots(...names: string[]) {
      def.slots = names
      return this
    },
    extends(parent: string) {
      def.extends = parent
      return this
    },
    build() {
      components.set(name, def)
    }
  }

  return builder
}

/**
 * Extend a component
 *
 * M.extend('Button', 'DangerButton', { bg: '#EF4444' })
 */
M.extend = function(parent: string, name: string, props: MirrorProps = {}): void {
  const parentDef = components.get(parent)
  if (!parentDef) {
    console.warn(`Parent component '${parent}' not found`)
  }

  components.set(name, {
    name,
    props: { ...parentDef?.props, ...props },
    slots: parentDef?.slots || [],
    extends: parent
  })
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
M.each = function(
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
      filter
    }
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
M.if = function(
  condition: string,
  thenBranch: MirrorNode[],
  elseBranch?: MirrorNode[]
): MirrorNode {
  return {
    type: '_If',
    props: {},
    children: thenBranch,
    slots: {},
    _if: {
      condition,
      else: elseBranch
    }
  }
}

// =============================================================================
// RENDERING TO DOM
// =============================================================================

/** Tag mapping */
const TAG_MAP: Record<string, string> = {
  Box: 'div', Frame: 'div',
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
  Article: 'article'
}

/** Shadow presets */
const SHADOW_MAP: Record<string, string> = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
}

/**
 * Render to DOM
 */
M.render = function(node: MirrorNode, container: HTMLElement = document.body): MirrorUI {
  const root = renderNode(node)
  container.appendChild(root)

  // Collect named elements
  const named = new Map<string, HTMLElement>()
  collectNamed(root, named)

  return {
    root,
    get: (name: string) => named.get(name) || null,
    destroy: () => {
      cleanup(root)
      root.remove()
    }
  }
}

interface MirrorUI {
  root: HTMLElement
  get: (name: string) => HTMLElement | null
  destroy: () => void
}

function renderNode(node: MirrorNode): HTMLElement {
  // Check if it's a defined component
  const compDef = components.get(node.type)
  if (compDef) {
    return renderComponent(node, compDef)
  }

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
    el.style.display = 'none'  // Hidden until parent state matches
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
    const slotEl = typeof slotContent === 'string'
      ? renderNode(M('Text', slotContent))
      : renderNode(slotContent)
    slotEl.dataset.slot = slotName
    el.appendChild(slotEl)
  }

  return el
}

function renderComponent(node: MirrorNode, def: ComponentDef): HTMLElement {
  // Merge props: definition defaults + instance overrides
  const mergedProps = { ...def.props, ...node.props }

  // Create element with merged props
  const el = document.createElement('div')
  applyStyles(el, mergedProps)
  applyAttributes(el, mergedProps)
  applyEvents(el, mergedProps)

  // Data attributes
  el.dataset.component = def.name
  if (mergedProps.named) {
    el.dataset.mirrorName = mergedProps.named
  }
  if (mergedProps.state) {
    el.dataset.state = mergedProps.state
  }

  // States
  if (mergedProps.states) {
    const mirrorEl = el as MirrorElement
    mirrorEl._stateStyles = {}
    for (const [stateName, stateProps] of Object.entries(mergedProps.states)) {
      mirrorEl._stateStyles[stateName] = propsToCSS(stateProps)
    }
  }

  // Render slots
  for (const slotName of def.slots) {
    const slotContent = node.slots[slotName]
    if (slotContent) {
      const slotEl = typeof slotContent === 'string'
        ? renderNode(M('Text', slotContent))
        : renderNode(slotContent)
      slotEl.dataset.slot = slotName
      el.appendChild(slotEl)
    }
  }

  // Render children
  for (const child of node.children) {
    el.appendChild(renderNode(child))
  }

  return el
}

function applyStyles(el: HTMLElement, props: MirrorProps): void {
  const css = propsToCSS(props)
  Object.assign(el.style, css)
}

function propsToCSS(props: Partial<MirrorProps>): Record<string, string> {
  const css: Record<string, string> = {}
  const px = (v: number | string) => typeof v === 'number' ? `${v}px` : v

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
  if (props.top) css.justifyContent = css.flexDirection === 'column' ? 'flex-start' : css.justifyContent
  if (props.bottom) css.justifyContent = css.flexDirection === 'column' ? 'flex-end' : css.justifyContent

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
    (el as HTMLInputElement).placeholder = props.placeholder
  }
  if (props.value !== undefined) {
    (el as HTMLInputElement).value = props.value
  }
  if (props.src !== undefined) {
    (el as HTMLImageElement).src = props.src
  }
  if (props.href !== undefined) {
    (el as HTMLAnchorElement).href = props.href
  }
  if (props.type !== undefined) {
    (el as HTMLInputElement).type = props.type
  }
  if (props.disabled) {
    (el as HTMLButtonElement).disabled = true
  }
}

function applyEvents(el: HTMLElement, props: MirrorProps): void {
  const eventProps = [
    'onclick', 'onhover', 'onfocus', 'onblur', 'onchange', 'oninput', 'onclick-outside'
  ]

  for (const eventProp of eventProps) {
    const actions = (props as any)[eventProp]
    if (actions) {
      const eventName = eventProp === 'onhover' ? 'mouseenter'
        : eventProp === 'onclick-outside' ? 'click-outside'
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
      if (!el.contains(e.target as Node)) {
        executeActions(el, actions)
      }
    }
    document.addEventListener('click', handler)
    ;(el as MirrorElement)._clickOutsideHandler = handler
    return
  }

  el.addEventListener(eventName, () => {
    executeActions(el, actions)
  })
}

function attachKeyEvent(el: HTMLElement, eventType: string, keyName: string, actions: string[]): void {
  // Make element focusable
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '0')
  }

  const keyMap: Record<string, string> = {
    'escape': 'Escape',
    'enter': 'Enter',
    'tab': 'Tab',
    'space': ' ',
    'arrow-up': 'ArrowUp',
    'arrow-down': 'ArrowDown',
    'arrow-left': 'ArrowLeft',
    'arrow-right': 'ArrowRight',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'home': 'Home',
    'end': 'End'
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
      (targetEl || el)?.focus()
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
      (el as MirrorElement)._savedDisplay = el.style.display
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
        mirrorEl._baseStyles[p] = (el.style as CSSStyleDeclaration & Record<string, string>)[p] || ''
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

    // Store base first time
    if (!mirrorEl._baseStyles) {
      mirrorEl._baseStyles = {}
      const props = Object.keys(mirrorEl._stateStyles[state])
      for (const p of props) {
        mirrorEl._baseStyles[p] = (el.style as CSSStyleDeclaration & Record<string, string>)[p] || ''
      }
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
        (sibling as HTMLElement).style.display = sibling === target ? '' : 'none'
      }
    }
  },

  navigateToPage(_pageName: string) {
    console.warn('Page navigation requires Mirror compiler')
  }
}

// =============================================================================
// ICON LOADING
// =============================================================================

async function loadIcon(el: HTMLElement, name: string, props: MirrorProps): Promise<void> {
  const size = props['icon-size'] ?? props.is ?? 24
  const color = props['icon-color'] ?? props.ic ?? 'currentColor'
  const weight = props['icon-weight'] ?? props.iw ?? 2

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
M.toMirror = function(node: MirrorNode, indent: number = 0): string {
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

  const simpleEvents = ['onclick', 'onhover', 'onfocus', 'onblur', 'onchange', 'oninput']

  for (const event of simpleEvents) {
    const actions = (props as any)[event]
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
// VALIDATION
// =============================================================================

/**
 * Validation result from M.validate()
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  path: string
  message: string
  type: 'invalid_component' | 'invalid_property' | 'invalid_structure' | 'invalid_value'
}

export interface ValidationWarning {
  path: string
  message: string
  type: 'unknown_property' | 'deprecated' | 'suspicious_value'
}

// Valid component/primitive names
const VALID_COMPONENTS = new Set([
  // Primitives
  'box', 'frame', 'text', 'button', 'input', 'textarea', 'image', 'link', 'icon',
  // Semantic
  'header', 'nav', 'main', 'section', 'article', 'aside', 'footer',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Special
  '_each', '_if'
])

// Valid property names
const VALID_PROPERTIES = new Set([
  // Layout
  'hor', 'horizontal', 'ver', 'vertical', 'gap', 'g', 'spread', 'wrap', 'stacked', 'grid',
  // Alignment
  'left', 'right', 'top', 'bottom', 'center', 'cen', 'hor-center', 'ver-center',
  // Sizing
  'width', 'w', 'height', 'h', 'size', 'min-width', 'minw', 'max-width', 'maxw',
  'min-height', 'minh', 'max-height', 'maxh',
  // Spacing
  'pad', 'padding', 'p', 'margin', 'm',
  // Colors
  'bg', 'background', 'col', 'color', 'c', 'boc', 'border-color',
  // Border
  'bor', 'border', 'rad', 'radius',
  // Typography
  'font-size', 'fs', 'weight', 'line', 'font', 'text-align',
  'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
  // Icon
  'icon-size', 'is', 'icon-weight', 'iw', 'icon-color', 'ic', 'fill',
  // Visual
  'opacity', 'o', 'shadow', 'cursor', 'z', 'hidden', 'visible', 'disabled', 'rotate', 'rot',
  // Scroll
  'scroll', 'scroll-ver', 'scroll-hor', 'scroll-both', 'clip',
  // Hover inline
  'hover-bg', 'hover-col', 'hover-opacity', 'hover-scale',
  // HTML specific
  'placeholder', 'value', 'src', 'href', 'type',
  // Instance naming
  'named',
  // State
  'state', 'states',
  // Visibility & routing
  'visible-when', 'route', 'selection',
  // Events
  'onclick', 'onhover', 'onfocus', 'onblur', 'onchange', 'oninput', 'onclick-outside',
  // Focusable
  'focusable'
])

/**
 * Validate a MirrorNode tree
 *
 * @example
 * const result = M.validate(M('Box', { bg: '#fff' }, [M('Text', 'Hello')]))
 * if (!result.valid) {
 *   console.error(result.errors)
 * }
 */
M.validate = function(node: MirrorNode | MirrorNode[], path: string = 'root'): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Handle array of nodes
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const childResult = M.validate(node[i], `${path}[${i}]`)
      errors.push(...childResult.errors)
      warnings.push(...childResult.warnings)
    }
    return { valid: errors.length === 0, errors, warnings }
  }

  // Check node structure
  if (!node || typeof node !== 'object') {
    errors.push({
      path,
      message: `Expected MirrorNode object, got ${typeof node}`,
      type: 'invalid_structure'
    })
    return { valid: false, errors, warnings }
  }

  // Check type
  if (typeof node.type !== 'string') {
    errors.push({
      path,
      message: `Node must have a 'type' property (string)`,
      type: 'invalid_structure'
    })
  } else {
    const typeLower = node.type.toLowerCase()
    // Allow custom components (capitalized) and valid primitives
    const isCustomComponent = node.type[0] === node.type[0].toUpperCase() && node.type[0] !== '_'
    if (!isCustomComponent && !VALID_COMPONENTS.has(typeLower)) {
      warnings.push({
        path,
        message: `Unknown component type '${node.type}'. Valid primitives: Box, Text, Button, Input, Icon, etc.`,
        type: 'unknown_property'
      })
    }
  }

  // Check props
  if (node.props && typeof node.props === 'object') {
    for (const [key, value] of Object.entries(node.props)) {
      // Skip slot fills (PascalCase keys)
      if (key[0] === key[0].toUpperCase()) continue

      // Check for keyboard events (onkeydown escape, etc.)
      if (key.startsWith('onkeydown ') || key.startsWith('onkeyup ')) continue

      if (!VALID_PROPERTIES.has(key)) {
        warnings.push({
          path: `${path}.props.${key}`,
          message: `Unknown property '${key}'`,
          type: 'unknown_property'
        })
      }

      // Validate specific property types
      if (key === 'states' && value !== null && typeof value === 'object') {
        for (const [stateName, stateProps] of Object.entries(value as object)) {
          if (typeof stateProps !== 'object' || stateProps === null) {
            errors.push({
              path: `${path}.props.states.${stateName}`,
              message: `State '${stateName}' must be an object with properties`,
              type: 'invalid_value'
            })
          }
        }
      }
    }
  } else if (node.props !== undefined && typeof node.props !== 'object') {
    errors.push({
      path: `${path}.props`,
      message: `'props' must be an object, got ${typeof node.props}`,
      type: 'invalid_structure'
    })
  }

  // Check children
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      errors.push({
        path: `${path}.children`,
        message: `'children' must be an array, got ${typeof node.children}`,
        type: 'invalid_structure'
      })
    } else {
      for (let i = 0; i < node.children.length; i++) {
        const childResult = M.validate(node.children[i], `${path}.children[${i}]`)
        errors.push(...childResult.errors)
        warnings.push(...childResult.warnings)
      }
    }
  }

  // Check _each structure
  if (node._each) {
    if (typeof node._each.itemVar !== 'string') {
      errors.push({
        path: `${path}._each.itemVar`,
        message: `_each.itemVar must be a string`,
        type: 'invalid_structure'
      })
    }
    if (typeof node._each.collection !== 'string') {
      errors.push({
        path: `${path}._each.collection`,
        message: `_each.collection must be a string`,
        type: 'invalid_structure'
      })
    }
  }

  // Check _if structure
  if (node._if) {
    if (typeof node._if.condition !== 'string') {
      errors.push({
        path: `${path}._if.condition`,
        message: `_if.condition must be a string`,
        type: 'invalid_structure'
      })
    }
    if (node._if.else !== undefined && !Array.isArray(node._if.else)) {
      errors.push({
        path: `${path}._if.else`,
        message: `_if.else must be an array`,
        type: 'invalid_structure'
      })
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// =============================================================================
// CORRECTION / NORMALIZATION
// =============================================================================

/**
 * Property corrections - maps wrong property names to correct ones
 */
const PROPERTY_CORRECTIONS: Record<string, string> = {
  // Color
  'color': 'col',
  'background-color': 'bg',
  'backgroundColor': 'bg',

  // Sizing
  'size': 'is',  // For icons - common LLM mistake
  'fontSize': 'font-size',
  'borderRadius': 'rad',
  'border-radius': 'rad',

  // Spacing
  'padding': 'pad',
  'paddingTop': 'pad',
  'paddingBottom': 'pad',
  'paddingLeft': 'pad',
  'paddingRight': 'pad',
  'padding-top': 'pad',
  'padding-bottom': 'pad',
  'padding-left': 'pad',
  'padding-right': 'pad',
  'marginTop': 'margin',
  'marginBottom': 'margin',
  'marginLeft': 'margin',
  'marginRight': 'margin',
  'margin-top': 'margin',
  'margin-bottom': 'margin',
  'margin-left': 'margin',
  'margin-right': 'margin',

  // Layout
  'flexDirection': 'hor',
  'flex-direction': 'hor',
  'justifyContent': 'center',
  'justify-content': 'center',
  'alignItems': 'center',
  'align-items': 'center',
  'flexWrap': 'wrap',
  'flex-wrap': 'wrap',

  // Visual
  'boxShadow': 'shadow',
  'box-shadow': 'shadow',
  'zIndex': 'z',
  'z-index': 'z',

  // Typography
  'fontWeight': 'weight',
  'font-weight': 'weight',
  'lineHeight': 'line',
  'line-height': 'line',
  'fontFamily': 'font',
  'font-family': 'font',
  'textAlign': 'text-align',
}

/**
 * Properties to remove completely (handled differently or invalid)
 */
const PROPERTIES_TO_REMOVE = new Set([
  'display',      // M() uses flex by default
  'flexGrow',
  'flex-grow',
  'flexShrink',
  'flex-shrink',
  'boxSizing',
  'box-sizing',
  'position',     // Will be extracted from style
  'top', 'left', 'right', 'bottom',  // Will be extracted from style
  'transform',    // Use rotate/scale instead
])

/**
 * Properties that need special handling (not just rename or remove)
 */
const SPECIAL_PROPERTIES = new Set([
  'flex',         // flex: 1 → w: 'full'
  'style',        // Parse CSS string
  'states',       // Recursive correction
])

/**
 * Parse inline CSS style string into properties
 */
function parseStyleString(styleStr: string): Record<string, string> {
  const result: Record<string, string> = {}
  const rules = styleStr.split(';').map(s => s.trim()).filter(Boolean)

  for (const rule of rules) {
    const colonIdx = rule.indexOf(':')
    if (colonIdx === -1) continue
    const prop = rule.slice(0, colonIdx).trim()
    const val = rule.slice(colonIdx + 1).trim()
    result[prop] = val
  }

  return result
}

/**
 * Convert CSS style properties to M() props
 */
function cssToMirrorProps(cssProps: Record<string, string>): Partial<MirrorProps> {
  const mirrorProps: CSSConversionProps = {}

  for (const [cssProp, value] of Object.entries(cssProps)) {
    switch (cssProp) {
      case 'position':
        // position: relative → stacked: true (parent for absolute children)
        if (value === 'relative') {
          mirrorProps.stacked = true
        }
        // position: absolute/fixed - not directly supported but we note it
        break

      case 'top':
      case 'left':
      case 'right':
      case 'bottom':
        // Positioning not directly supported - will be noted in warnings
        break

      case 'z-index':
        mirrorProps.z = parseInt(value) || 0
        break

      case 'width':
        if (value === '100%') mirrorProps.w = 'full'
        else if (value.endsWith('px')) mirrorProps.w = parseInt(value)
        else mirrorProps.w = value
        break

      case 'height':
        if (value === '100%') mirrorProps.h = 'full'
        else if (value.endsWith('px')) mirrorProps.h = parseInt(value)
        else mirrorProps.h = value
        break

      case 'padding':
        if (value.endsWith('px')) mirrorProps.pad = parseInt(value)
        else mirrorProps.pad = value
        break

      case 'margin':
        if (value.endsWith('px')) mirrorProps.margin = parseInt(value)
        else mirrorProps.margin = value
        break

      case 'margin-left':
      case 'margin-right':
      case 'margin-top':
      case 'margin-bottom':
        // Convert to margin array if possible
        if (value.endsWith('px')) {
          // Store as side-specific for now
          mirrorProps[`_${cssProp}`] = parseInt(value)
        }
        break

      case 'background':
      case 'background-color':
        mirrorProps.bg = value
        break

      case 'color':
        mirrorProps.col = value
        break

      case 'border-radius':
        if (value.endsWith('px')) mirrorProps.rad = parseInt(value)
        else mirrorProps.rad = value
        break

      case 'border':
        mirrorProps.bor = value
        break

      case 'flex-direction':
        if (value === 'row') mirrorProps.hor = true
        else if (value === 'column') mirrorProps.ver = true
        break

      case 'justify-content':
        if (value === 'center') {
          // Will combine with align-items check
          mirrorProps._justifyCenter = true
        } else if (value === 'space-between') {
          mirrorProps.spread = true
        }
        break

      case 'align-items':
        if (value === 'center') {
          mirrorProps._alignCenter = true
        }
        break

      case 'gap':
        if (value.endsWith('px')) mirrorProps.gap = parseInt(value)
        else mirrorProps.gap = value
        break

      case 'display':
        // Ignore - M() uses flex by default
        // But grid is special
        if (value === 'grid') {
          mirrorProps.grid = 1  // Default grid
        }
        break

      case 'overflow':
        if (value === 'hidden') {
          mirrorProps.clip = true
        } else if (value === 'auto' || value === 'scroll') {
          mirrorProps.scroll = true
        }
        break

      case 'overflow-y':
        if (value === 'auto' || value === 'scroll') {
          mirrorProps.scroll = true
        }
        break

      case 'overflow-x':
        if (value === 'auto' || value === 'scroll') {
          mirrorProps['scroll-hor'] = true
        }
        break

      case 'flex-shrink':
        // Ignore - not directly supported but not an error
        break

      case 'opacity':
        mirrorProps.opacity = parseFloat(value)
        break

      case 'cursor':
        mirrorProps.cursor = value
        break

      case 'font-size':
        if (value.endsWith('px')) mirrorProps['font-size'] = parseInt(value)
        break

      case 'font-weight':
        mirrorProps.weight = value
        break

      case 'line-height':
        mirrorProps.line = value
        break

      case 'text-align':
        mirrorProps['text-align'] = value
        break
    }
  }

  // Combine justify-content: center + align-items: center → center: true
  if (mirrorProps._justifyCenter && mirrorProps._alignCenter) {
    mirrorProps.center = true
    delete mirrorProps._justifyCenter
    delete mirrorProps._alignCenter
  }

  return mirrorProps
}

/**
 * Correction result with statistics
 */
export interface CorrectionResult {
  node: MirrorNode
  corrections: CorrectionEntry[]
  warnings: string[]
}

export interface CorrectionEntry {
  path: string
  type: 'property_renamed' | 'property_removed' | 'style_extracted' | 'value_fixed' | 'icon_size_fixed'
  original: string
  corrected: string
}

/**
 * Correct a MirrorNode tree - fix common LLM mistakes
 *
 * @example
 * const llmOutput = M('Box', { color: '#fff', style: 'position: relative' }, [...])
 * const { node, corrections } = M.correct(llmOutput)
 * // node now has { col: '#fff' } and style is processed
 */
M.correct = function(node: MirrorNode | MirrorNode[], path: string = 'root'): CorrectionResult {
  const corrections: CorrectionEntry[] = []
  const warnings: string[] = []

  // Handle array of nodes
  if (Array.isArray(node)) {
    const correctedChildren: MirrorNode[] = []
    for (let i = 0; i < node.length; i++) {
      const childResult = M.correct(node[i], `${path}[${i}]`)
      correctedChildren.push(childResult.node)
      corrections.push(...childResult.corrections)
      warnings.push(...childResult.warnings)
    }
    return {
      node: correctedChildren as any,
      corrections,
      warnings
    }
  }

  // Clone the node to avoid mutating original
  const correctedNode: MirrorNode = {
    type: node.type,
    content: node.content,
    props: { ...node.props },
    children: [],
    slots: { ...node.slots },
    _each: node._each ? { ...node._each } : undefined,
    _if: node._if ? { ...node._if, else: node._if.else ? [...node._if.else] : undefined } : undefined
  }

  // 1. Fix property names
  const newProps: MirrorProps = {}
  for (const [key, value] of Object.entries(correctedNode.props)) {
    // Handle flex: 1 → w: 'full' (special case before removal check)
    if (key === 'flex') {
      if (value === 1 || value === '1') {
        newProps.w = 'full'
        corrections.push({
          path: `${path}.props.flex`,
          type: 'value_fixed',
          original: 'flex: 1',
          corrected: "w: 'full'"
        })
      }
      // Skip further processing of flex
      continue
    }

    // Check if this property should be renamed
    if (PROPERTY_CORRECTIONS[key]) {
      const correctedKey = PROPERTY_CORRECTIONS[key]
      corrections.push({
        path: `${path}.props.${key}`,
        type: 'property_renamed',
        original: key,
        corrected: correctedKey
      })

      // Special handling for size → is (only for Icon)
      if (key === 'size' && correctedNode.type === 'Icon') {
        (newProps as any)[correctedKey] = value
      } else if (key === 'size' && correctedNode.type !== 'Icon') {
        // size for non-icons - might be width/height
        newProps.w = value as any
        newProps.h = value as any
        corrections[corrections.length - 1].corrected = 'w, h'
      } else {
        (newProps as any)[correctedKey] = value
      }
    }
    // Check if property should be removed
    else if (PROPERTIES_TO_REMOVE.has(key)) {
      corrections.push({
        path: `${path}.props.${key}`,
        type: 'property_removed',
        original: `${key}: ${JSON.stringify(value)}`,
        corrected: '(removed)'
      })
    }
    // Handle inline style string
    else if (key === 'style' && typeof value === 'string') {
      const cssProps = parseStyleString(value)
      const extractedProps = cssToMirrorProps(cssProps)

      corrections.push({
        path: `${path}.props.style`,
        type: 'style_extracted',
        original: value,
        corrected: JSON.stringify(extractedProps)
      })

      // Check for positioning that we can't fully support
      // position:relative is OK - converted to stacked
      if (cssProps['position'] && cssProps['position'] !== 'relative') {
        warnings.push(`${path}: position:'${cssProps['position']}' not fully supported in M(). Consider restructuring layout.`)
      }
      if (cssProps['top'] || cssProps['left'] || cssProps['right'] || cssProps['bottom']) {
        warnings.push(`${path}: absolute positioning (top/left/right/bottom) not supported in M(). Use layout props instead.`)
      }

      // Merge extracted props
      Object.assign(newProps, extractedProps)
    }
    // Handle states recursively
    else if (key === 'states' && typeof value === 'object' && value !== null) {
      const correctedStates: Record<string, Partial<MirrorProps>> = {}
      for (const [stateName, stateProps] of Object.entries(value as object)) {
        if (typeof stateProps === 'object' && stateProps !== null) {
          const stateResult = M.correct({
            type: 'Box',
            props: stateProps as any,
            children: [],
            slots: {}
          }, `${path}.props.states.${stateName}`)
          correctedStates[stateName] = stateResult.node.props
          corrections.push(...stateResult.corrections)
        } else {
          correctedStates[stateName] = stateProps as any
        }
      }
      newProps.states = correctedStates
    }
    // Keep other properties as-is
    else {
      (newProps as any)[key] = value
    }
  }

  // 2. Fix Icon-specific issues
  if (correctedNode.type === 'Icon') {
    // If 'size' was used instead of 'is', we already handled above
    // But also check for numeric 'size' in newProps
    if ('size' in (newProps as any) && !('is' in newProps)) {
      newProps.is = (newProps as any).size as number
      delete (newProps as any).size
      corrections.push({
        path: `${path}.props.size`,
        type: 'icon_size_fixed',
        original: 'size',
        corrected: 'is'
      })
    }
  }

  correctedNode.props = newProps

  // 4. Recursively correct children
  for (let i = 0; i < node.children.length; i++) {
    const childResult = M.correct(node.children[i], `${path}.children[${i}]`)
    correctedNode.children.push(childResult.node)
    corrections.push(...childResult.corrections)
    warnings.push(...childResult.warnings)
  }

  // 5. Recursively correct slots
  for (const [slotName, slotContent] of Object.entries(node.slots)) {
    if (typeof slotContent === 'object' && slotContent !== null) {
      const slotResult = M.correct(slotContent as MirrorNode, `${path}.slots.${slotName}`)
      correctedNode.slots[slotName] = slotResult.node
      corrections.push(...slotResult.corrections)
      warnings.push(...slotResult.warnings)
    }
  }

  // 6. Correct _if else branch
  if (correctedNode._if?.else) {
    const correctedElse: MirrorNode[] = []
    for (let i = 0; i < correctedNode._if.else.length; i++) {
      const elseResult = M.correct(correctedNode._if.else[i], `${path}._if.else[${i}]`)
      correctedElse.push(elseResult.node)
      corrections.push(...elseResult.corrections)
      warnings.push(...elseResult.warnings)
    }
    correctedNode._if.else = correctedElse
  }

  return { node: correctedNode, corrections, warnings }
}

/**
 * Correct and validate in one step
 */
M.correctAndValidate = function(node: MirrorNode | MirrorNode[]): {
  node: MirrorNode | MirrorNode[]
  corrections: CorrectionEntry[]
  validation: ValidationResult
} {
  const correctionResult = M.correct(node)
  const validation = M.validate(correctionResult.node)

  // Add correction warnings to validation warnings
  for (const warning of correctionResult.warnings) {
    validation.warnings.push({
      path: 'correction',
      message: warning,
      type: 'suspicious_value'
    })
  }

  return {
    node: correctionResult.node,
    corrections: correctionResult.corrections,
    validation
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export default M
