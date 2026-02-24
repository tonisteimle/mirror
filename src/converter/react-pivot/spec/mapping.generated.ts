/**
 * @generated
 * @description React-to-Mirror mapping spec - DO NOT EDIT
 *
 * Generated from src/dsl/properties.ts by scripts/generate-react-pivot-spec.ts
 * Regenerate with: npx tsx scripts/generate-react-pivot-spec.ts
 *
 * This mapping ensures 100% feature coverage for the React-Pivot transformation.
 */

// =============================================================================
// PROPERTY MAPPING (React/CSS → Mirror DSL)
// =============================================================================

/**
 * Maps React/CSS style property names to Mirror DSL property names.
 * Some mappings include alternatives separated by '|' for context-dependent resolution.
 */
export const REACT_TO_MIRROR_PROPERTIES = {
  'direction': 'hor|ver',
  'flexDirection': 'hor|ver',
  'gap': 'gap',
  'rowGap': 'gap-row',
  'columnGap': 'gap-col',
  'alignItems': 'ver-center|top|bottom',
  'justifyContent': 'hor-center|left|right|spread',
  'flexWrap': 'wrap',
  'flexGrow': 'grow',
  'flexShrink': 'shrink',
  'flex': 'grow',
  'width': 'w',
  'height': 'h',
  'minWidth': 'min-w',
  'maxWidth': 'max-w',
  'minHeight': 'min-h',
  'maxHeight': 'max-h',
  'padding': 'pad',
  'paddingTop': 'pad top',
  'paddingRight': 'pad right',
  'paddingBottom': 'pad bottom',
  'paddingLeft': 'pad left',
  'paddingX': 'pad',
  'paddingY': 'pad',
  'margin': 'mar',
  'marginTop': 'mar top',
  'marginRight': 'mar right',
  'marginBottom': 'mar bottom',
  'marginLeft': 'mar left',
  'marginX': 'mar',
  'marginY': 'mar',
  'background': 'bg',
  'backgroundColor': 'bg',
  'color': 'col',
  'borderColor': 'boc',
  'border': 'bor',
  'borderWidth': 'bor',
  'borderStyle': 'bor',
  'borderRadius': 'rad',
  'borderTopLeftRadius': 'rad tl',
  'borderTopRightRadius': 'rad tr',
  'borderBottomLeftRadius': 'rad bl',
  'borderBottomRightRadius': 'rad br',
  'borderTop': 'bor top',
  'borderRight': 'bor right',
  'borderBottom': 'bor bottom',
  'borderLeft': 'bor left',
  'fontSize': 'size',
  'fontWeight': 'weight',
  'fontFamily': 'font',
  'lineHeight': 'line',
  'textAlign': 'align',
  'fontStyle': 'italic',
  'textDecoration': 'underline',
  'textTransform': 'uppercase|lowercase',
  'textOverflow': 'truncate',
  'whiteSpace': 'truncate',
  'opacity': 'o',
  'boxShadow': 'shadow',
  'shadow': 'shadow',
  'cursor': 'cursor',
  'zIndex': 'z',
  'visibility': 'visible|hidden',
  'display': 'hidden',
  'transform': 'rot|translate',
  'rotate': 'rot',
  'scale': 'scale',
  'overflow': 'scroll|clip',
  'overflowX': 'scroll-hor',
  'overflowY': 'scroll-ver',
  'position': 'stacked',
  'top': 'top',
  'right': 'right',
  'bottom': 'bottom',
  'left': 'left',
  'objectFit': 'fit',
  'src': 'src',
  'alt': 'alt',
  'fill': 'fill',
  'placeholder': 'placeholder',
  'type': 'type',
  'value': 'value',
  'href': 'href',
  'target': 'target',
  'hidden': 'hidden',
  'disabled': 'disabled',
  'wrap': 'wrap',
  'clip': 'clip',
  'scroll': 'scroll',
  'truncate': 'truncate',
  'italic': 'italic',
  'underline': 'underline',
  'uppercase': 'uppercase',
  'lowercase': 'lowercase',
  'grow': 'grow'
} as const

// =============================================================================
// EVENT MAPPING
// =============================================================================

/**
 * Maps React event handler names to Mirror event names.
 */
export const REACT_TO_MIRROR_EVENTS = {
  'onClick': 'onclick',
  'onClickOutside': 'onclick-outside',
  'onHover': 'onhover',
  'onChange': 'onchange',
  'onInput': 'oninput',
  'onFocus': 'onfocus',
  'onBlur': 'onblur',
  'onLoad': 'onload',
  'onKeyDown': 'onkeydown',
  'onKeyUp': 'onkeyup',
  'onSubmit': 'onsubmit'
} as const

// =============================================================================
// ACTION MAPPING
// =============================================================================

/**
 * Maps action type names (identical in both systems).
 */
export const REACT_TO_MIRROR_ACTIONS = {
  'toggle': 'toggle',
  'show': 'show',
  'hide': 'hide',
  'open': 'open',
  'close': 'close',
  'page': 'page',
  'highlight': 'highlight',
  'select': 'select',
  'deselect': 'deselect',
  'clear-selection': 'clear-selection',
  'change': 'change',
  'filter': 'filter',
  'focus': 'focus',
  'activate': 'activate',
  'deactivate': 'deactivate',
  'deactivate-siblings': 'deactivate-siblings',
  'toggle-state': 'toggle-state',
  'validate': 'validate',
  'reset': 'reset',
  'assign': 'assign',
  'alert': 'alert',
  'call': 'call'
} as const

// =============================================================================
// STATE MAPPING
// =============================================================================

/**
 * Maps state names (identical in both systems).
 */
export const REACT_TO_MIRROR_STATES = {
  'hover': 'hover',
  'focus': 'focus',
  'active': 'active',
  'disabled': 'disabled',
  'highlighted': 'highlighted',
  'selected': 'selected',
  'expanded': 'expanded',
  'collapsed': 'collapsed',
  'valid': 'valid',
  'invalid': 'invalid',
  'default': 'default',
  'on': 'on',
  'off': 'off',
  'inactive': 'inactive'
} as const

// =============================================================================
// ANIMATION MAPPING
// =============================================================================

/**
 * Maps animation type names (identical in both systems).
 */
export const REACT_TO_MIRROR_ANIMATIONS = {
  'slide-up': 'slide-up',
  'slide-down': 'slide-down',
  'slide-left': 'slide-left',
  'slide-right': 'slide-right',
  'fade': 'fade',
  'scale': 'scale',
  'none': 'none',
  'spin': 'spin',
  'pulse': 'pulse',
  'bounce': 'bounce'
} as const

// =============================================================================
// POSITION MAPPING
// =============================================================================

/**
 * Maps overlay position keywords (identical in both systems).
 */
export const REACT_TO_MIRROR_POSITIONS = {
  'below': 'below',
  'above': 'above',
  'left': 'left',
  'right': 'right',
  'center': 'center',
  'cen': 'center'
} as const

// =============================================================================
// TARGET MAPPING
// =============================================================================

/**
 * Maps action target keywords (identical in both systems).
 */
export const REACT_TO_MIRROR_TARGETS = {
  'self': 'self',
  'next': 'next',
  'prev': 'prev',
  'first': 'first',
  'last': 'last',
  'first-empty': 'first-empty',
  'highlighted': 'highlighted',
  'selected': 'selected',
  'self-and-before': 'self-and-before',
  'all': 'all',
  'none': 'none'
} as const

// =============================================================================
// ALLOWED COMPONENTS
// =============================================================================

/**
 * Components allowed in the constrained React subset.
 * These map directly to Mirror primitive or defined components.
 */
export const ALLOWED_COMPONENTS = [
  'Box',
  'Row',
  'Col',
  'Column',
  'Stack',
  'Grid',
  'Text',
  'Title',
  'Label',
  'Paragraph',
  'Icon',
  'Image',
  'Avatar',
  'Button',
  'Link',
  'Input',
  'Textarea',
  'Checkbox',
  'Select',
  'Dropdown',
  'Card',
  'Panel',
  'Section',
  'Header',
  'Footer',
  'Sidebar',
  'Nav',
  'Menu',
  'Dialog',
  'Modal',
  'Tooltip',
  'Popup',
  'Toast',
  'Alert',
  'Badge',
  'Tag',
  'List',
  'Item',
  'Table',
  'TableRow',
  'TableHeader',
  'App',
  'Page',
  'Main',
  'Spacer',
  'Divider',
  'Form',
  'FormField'
] as const

export type AllowedComponent = typeof ALLOWED_COMPONENTS[number]

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a React property name is valid for the Mirror mapping.
 */
export function isValidReactProperty(name: string): boolean {
  return name in REACT_TO_MIRROR_PROPERTIES
}

/**
 * Check if a React event name is valid for the Mirror mapping.
 */
export function isValidReactEvent(name: string): boolean {
  return name in REACT_TO_MIRROR_EVENTS
}

/**
 * Check if an action type is valid.
 */
export function isValidAction(name: string): boolean {
  return name in REACT_TO_MIRROR_ACTIONS
}

/**
 * Check if a state name is valid.
 */
export function isValidState(name: string): boolean {
  return name in REACT_TO_MIRROR_STATES
}

/**
 * Check if an animation type is valid.
 */
export function isValidAnimation(name: string): boolean {
  return name in REACT_TO_MIRROR_ANIMATIONS
}

/**
 * Check if a position keyword is valid.
 */
export function isValidPosition(name: string): boolean {
  return name in REACT_TO_MIRROR_POSITIONS
}

/**
 * Check if a target keyword is valid.
 */
export function isValidTarget(name: string): boolean {
  return name in REACT_TO_MIRROR_TARGETS
}

/**
 * Check if a component name is in the allowed set.
 */
export function isAllowedComponent(name: string): boolean {
  return (ALLOWED_COMPONENTS as readonly string[]).includes(name)
}

// =============================================================================
// PROPERTY TRANSFORMATION HELPERS
// =============================================================================

/**
 * Get the Mirror property name for a React/CSS property.
 * Returns null if not mapped.
 */
export function getMirrorProperty(reactProp: string): string | null {
  const mapping = REACT_TO_MIRROR_PROPERTIES[reactProp as keyof typeof REACT_TO_MIRROR_PROPERTIES]
  if (!mapping) return null

  // If mapping contains alternatives, return the first one
  // The transformer will handle context-dependent resolution
  if (mapping.includes('|')) {
    return mapping.split('|')[0]
  }

  return mapping
}

/**
 * Get the Mirror event name for a React event.
 */
export function getMirrorEvent(reactEvent: string): string | null {
  return REACT_TO_MIRROR_EVENTS[reactEvent as keyof typeof REACT_TO_MIRROR_EVENTS] ?? null
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ReactPropertyName = keyof typeof REACT_TO_MIRROR_PROPERTIES
export type ReactEventName = keyof typeof REACT_TO_MIRROR_EVENTS
export type ActionType = keyof typeof REACT_TO_MIRROR_ACTIONS
export type StateName = keyof typeof REACT_TO_MIRROR_STATES
export type AnimationType = keyof typeof REACT_TO_MIRROR_ANIMATIONS
export type PositionType = keyof typeof REACT_TO_MIRROR_POSITIONS
export type TargetType = keyof typeof REACT_TO_MIRROR_TARGETS
