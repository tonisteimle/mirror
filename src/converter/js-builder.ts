/**
 * JavaScript Builder API for Mirror DSL
 *
 * Enables LLMs to generate UI using familiar JavaScript syntax,
 * which is then transformed to Mirror DSL.
 *
 * Example:
 * ```javascript
 * Card({ padding: 16, bg: '#333', radius: 8 }, [
 *   Title({ size: 18, weight: 'bold' }, "Hello"),
 *   Button({ onclick: show('Dialog') }, "Click me")
 * ])
 * ```
 *
 * Transforms to:
 * ```mirror
 * Card padding 16, bg #333, radius 8
 *   Title size 18, weight bold, "Hello"
 *   Button onclick show Dialog "Click me"
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export interface JsNode {
  _type: 'component'
  name: string
  props: Record<string, unknown>
  children: (JsNode | string)[]
  content?: string
}

export interface JsAction {
  _type: 'action'
  action: string
  target?: string
  args?: unknown[]
}

export interface JsState {
  _type: 'state'
  name: string
  props: Record<string, unknown>
}

export interface JsDefinition {
  _type: 'definition'
  name: string
  props: Record<string, unknown>
  children: (JsNode | string)[]
}

export interface JsToken {
  _type: 'token'
  name: string
  value: string | number
}

// =============================================================================
// COMPONENT FACTORY
// =============================================================================

/**
 * Creates a component factory function
 */
function createComponent(name: string) {
  return function(
    propsOrContent?: Record<string, unknown> | string | (JsNode | string)[],
    childrenOrContent?: string | (JsNode | string)[]
  ): JsNode {
    let props: Record<string, unknown> = {}
    let children: (JsNode | string)[] = []
    let content: string | undefined

    // Parse arguments
    if (typeof propsOrContent === 'string') {
      // Component("content")
      content = propsOrContent
    } else if (Array.isArray(propsOrContent)) {
      // Component([children])
      children = propsOrContent
    } else if (propsOrContent && typeof propsOrContent === 'object') {
      // Component({ props }, ...)
      props = propsOrContent

      if (typeof childrenOrContent === 'string') {
        // Component({ props }, "content")
        content = childrenOrContent
      } else if (Array.isArray(childrenOrContent)) {
        // Component({ props }, [children])
        children = childrenOrContent
      }
    }

    return {
      _type: 'component',
      name,
      props,
      children,
      content
    }
  }
}

// =============================================================================
// BUILT-IN COMPONENTS
// =============================================================================

// Layout
export const Box = createComponent('Box')
export const Row = createComponent('Row')
export const Column = createComponent('Column')
export const Stack = createComponent('Stack')
export const Grid = createComponent('Grid')

// Content
export const Text = createComponent('Text')
export const Title = createComponent('Title')
export const Label = createComponent('Label')
export const Paragraph = createComponent('Paragraph')

// Interactive
export const Button = createComponent('Button')
export const Link = createComponent('Link')

// Form
export const Input = createComponent('Input')
export const Textarea = createComponent('Textarea')
export const Checkbox = createComponent('Checkbox')
export const Select = createComponent('Select')
export const Dropdown = createComponent('Dropdown')

// Media
export const Image = createComponent('Image')
export const Icon = createComponent('Icon')
export const Avatar = createComponent('Avatar')

// Containers
export const Card = createComponent('Card')
export const Panel = createComponent('Panel')
export const Section = createComponent('Section')
export const Header = createComponent('Header')
export const Footer = createComponent('Footer')
export const Sidebar = createComponent('Sidebar')
export const Nav = createComponent('Nav')
export const Menu = createComponent('Menu')

// Overlay
export const Dialog = createComponent('Dialog')
export const Modal = createComponent('Modal')
export const Tooltip = createComponent('Tooltip')
export const Popup = createComponent('Popup')

// Feedback
export const Alert = createComponent('Alert')
export const Badge = createComponent('Badge')
export const Tag = createComponent('Tag')
export const Toast = createComponent('Toast')

// Data
export const List = createComponent('List')
export const Item = createComponent('Item')
export const Table = createComponent('Table')

// Additional components (common LLM outputs)
export const Logo = createComponent('Logo')
export const Accordion = createComponent('Accordion')
export const Layout = createComponent('Layout')
export const Form = createComponent('Form')
export const Container = createComponent('Container')
export const Divider = createComponent('Divider')
export const Spacer = createComponent('Spacer')
export const Progress = createComponent('Progress')
export const Slider = createComponent('Slider')
export const Switch = createComponent('Switch')
export const Radio = createComponent('Radio')
export const Tabs = createComponent('Tabs')
export const Tab = createComponent('Tab')
export const TabPanel = createComponent('TabPanel')
export const Breadcrumb = createComponent('Breadcrumb')
export const Pagination = createComponent('Pagination')
export const Spinner = createComponent('Spinner')
export const Skeleton = createComponent('Skeleton')

// =============================================================================
// CUSTOM COMPONENT
// =============================================================================

/**
 * Create a custom component by name
 *
 * @example
 * const MyCard = component('MyCard')
 * MyCard({ padding: 16 }, "Content")
 */
export function component(name: string) {
  return createComponent(name)
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Show an element
 * @example Button({ onclick: show('Dialog') }, "Open")
 */
export function show(target: string): JsAction {
  return { _type: 'action', action: 'show', target }
}

/**
 * Hide an element
 * @example Button({ onclick: hide('Panel') }, "Close")
 */
export function hide(target: string): JsAction {
  return { _type: 'action', action: 'hide', target }
}

/**
 * Toggle element state
 * @example Button({ onclick: toggle() }, "Toggle")
 */
export function toggle(target?: string): JsAction {
  return { _type: 'action', action: 'toggle', target }
}

/**
 * Open overlay/dialog
 * @example Button({ onclick: open('Modal', 'center', 'fade') }, "Open")
 */
export function open(target: string, position?: string, animation?: string): JsAction {
  return { _type: 'action', action: 'open', target, args: [position, animation].filter(Boolean) }
}

/**
 * Close overlay/dialog
 * @example Button({ onclick: close() }, "Close")
 */
export function close(target?: string): JsAction {
  return { _type: 'action', action: 'close', target }
}

/**
 * Navigate to page
 * @example Button({ onclick: page('Dashboard') }, "Go")
 */
export function page(target: string): JsAction {
  return { _type: 'action', action: 'page', target }
}

/**
 * Assign value to variable
 * @example Button({ onclick: assign('$count', '$count + 1') }, "Increment")
 */
export function assign(variable: string, value: string): JsAction {
  return { _type: 'action', action: 'assign', target: variable, args: [value] }
}

/**
 * Change state
 * @example Button({ onclick: change('self', 'active') }, "Activate")
 */
export function change(target: string, toState: string): JsAction {
  return { _type: 'action', action: 'change', target, args: ['to', toState] }
}

/**
 * Highlight element
 * @example Item({ onhover: highlight('self') })
 */
export function highlight(target: string): JsAction {
  return { _type: 'action', action: 'highlight', target }
}

/**
 * Select element
 * @example Item({ onclick: select('self') })
 */
export function select(target: string): JsAction {
  return { _type: 'action', action: 'select', target }
}

/**
 * Validate form/element
 * @example Button({ onclick: validate('Form') })
 */
export function validate(target?: string): JsAction {
  return { _type: 'action', action: 'validate', target }
}

/**
 * Generic action (for any custom action)
 * @example Button({ onclick: action('submit') })
 */
export function action(name: string, target?: string): JsAction {
  return { _type: 'action', action: name, target }
}

// =============================================================================
// STATES
// =============================================================================

/**
 * Define a state with properties
 *
 * @example
 * Button({
 *   bg: '#333',
 *   states: [
 *     state('hover', { bg: '#444' }),
 *     state('active', { bg: '#3B82F6' })
 *   ]
 * }, "Click me")
 */
export function state(name: string, props: Record<string, unknown>): JsState {
  return { _type: 'state', name, props }
}

// =============================================================================
// DEFINITIONS
// =============================================================================

/**
 * Define a reusable component template
 *
 * @example
 * define('Card', { padding: 16, radius: 8, bg: '#1E1E2E' }, [
 *   slot('Title', { size: 18, weight: 'bold' }),
 *   slot('Content')
 * ])
 */
export function define(
  name: string,
  props: Record<string, unknown>,
  children?: (JsNode | string)[]
): JsDefinition {
  return {
    _type: 'definition',
    name,
    props,
    children: children || []
  }
}

/**
 * Define a slot in a component definition
 *
 * @example
 * define('Card', { padding: 16 }, [
 *   slot('Title', { size: 18 }),
 *   slot('Body')
 * ])
 */
export function slot(name: string, props?: Record<string, unknown>): JsNode {
  return {
    _type: 'component',
    name,
    props: props || {},
    children: [],
    content: undefined
  }
}

// =============================================================================
// TOKENS
// =============================================================================

/**
 * Define a token (design system variable)
 *
 * @example
 * const tokens = [
 *   token('primary', '#3B82F6'),
 *   token('spacing', 16)
 * ]
 */
export function token(name: string, value: string | number): JsToken {
  return { _type: 'token', name, value }
}

// =============================================================================
// LAYOUT HELPERS
// =============================================================================

/**
 * Create a horizontal row
 * Shorthand for Box({ hor: true, ... })
 */
export function row(
  propsOrChildren?: Record<string, unknown> | (JsNode | string)[],
  children?: (JsNode | string)[]
): JsNode {
  if (Array.isArray(propsOrChildren)) {
    return Box({ hor: true }, propsOrChildren)
  }
  return Box({ hor: true, ...propsOrChildren }, children || [])
}

/**
 * Create a vertical column
 * Shorthand for Box({ ver: true, ... })
 */
export function col(
  propsOrChildren?: Record<string, unknown> | (JsNode | string)[],
  children?: (JsNode | string)[]
): JsNode {
  if (Array.isArray(propsOrChildren)) {
    return Box({ ver: true }, propsOrChildren)
  }
  return Box({ ver: true, ...propsOrChildren }, children || [])
}

/**
 * Create a centered container
 */
export function center(
  propsOrChildren?: Record<string, unknown> | (JsNode | string)[],
  children?: (JsNode | string)[]
): JsNode {
  if (Array.isArray(propsOrChildren)) {
    return Box({ center: true }, propsOrChildren)
  }
  return Box({ center: true, ...propsOrChildren }, children || [])
}

// =============================================================================
// LIST HELPERS
// =============================================================================

/**
 * Create a list item (with - prefix in Mirror)
 *
 * @example
 * Menu([
 *   item(Item, { value: 'a' }, "Option A"),
 *   item(Item, { value: 'b' }, "Option B")
 * ])
 */
export function item(
  componentFn: ReturnType<typeof createComponent>,
  propsOrContent?: Record<string, unknown> | string,
  content?: string
): JsNode {
  const node = typeof propsOrContent === 'string'
    ? componentFn(propsOrContent)
    : componentFn(propsOrContent, content)

  // Mark as list item
  node.props._isListItem = true
  return node
}

// =============================================================================
// CONDITIONAL HELPERS
// =============================================================================

/**
 * Conditional rendering
 *
 * @example
 * when('$isLoggedIn',
 *   Avatar({ src: '$user.avatar' }),
 *   Button("Login")
 * )
 */
export function when(
  condition: string,
  thenNode: JsNode,
  elseNode?: JsNode
): JsNode {
  return {
    _type: 'component',
    name: '_conditional',
    props: { condition, else: elseNode ? true : false },
    children: elseNode ? [thenNode, elseNode] : [thenNode],
    content: undefined
  }
}

/**
 * Iteration
 *
 * @example
 * each('$item', '$items',
 *   Card({ bg: '$item.color' }, '$item.title')
 * )
 */
export function each(
  itemVar: string,
  listVar: string,
  template: JsNode
): JsNode {
  return {
    _type: 'component',
    name: '_iterator',
    props: { itemVar, listVar },
    children: [template],
    content: undefined
  }
}
