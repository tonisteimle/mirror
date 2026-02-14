/**
 * Validator Error Codes
 *
 * V001-V069: Comprehensive validation error codes organized by category.
 */

export const ValidatorErrorCodes = {
  // ============================================
  // Property Errors (V001-V009)
  // ============================================

  /** Unknown property name */
  UNKNOWN_PROPERTY: 'V001',
  /** Property value type mismatch (e.g., string for numeric property) */
  PROPERTY_TYPE_MISMATCH: 'V002',
  /** Property value out of valid range */
  PROPERTY_VALUE_OUT_OF_RANGE: 'V003',
  /** Invalid property value format */
  INVALID_PROPERTY_FORMAT: 'V004',
  /** Conflicting properties (e.g., hor and ver together) */
  CONFLICTING_PROPERTIES: 'V005',
  /** Invalid color value */
  INVALID_COLOR: 'V006',
  /** Invalid enum value for property */
  INVALID_ENUM_VALUE: 'V007',
  /** Invalid direction modifier */
  INVALID_DIRECTION: 'V008',
  /** Deprecated property */
  DEPRECATED_PROPERTY: 'V009',

  // ============================================
  // Library Component Errors (V010-V019)
  // ============================================

  /** Invalid slot name for library component */
  INVALID_SLOT: 'V010',
  /** Missing required slot */
  MISSING_REQUIRED_SLOT: 'V011',
  /** Slot appears too many times (when multiple=false) */
  SLOT_MULTIPLICITY_EXCEEDED: 'V012',
  /** Library component used incorrectly */
  INVALID_LIBRARY_USAGE: 'V013',
  /** Unknown library component */
  UNKNOWN_LIBRARY_COMPONENT: 'V014',
  /** Slot used outside library component */
  ORPHAN_SLOT: 'V015',

  // ============================================
  // Reference Errors (V020-V029)
  // ============================================

  /** Token reference not defined */
  UNDEFINED_TOKEN: 'V020',
  /** Circular token reference */
  CIRCULAR_TOKEN_REFERENCE: 'V021',
  /** Component reference not defined */
  UNDEFINED_COMPONENT: 'V022',
  /** Component property reference invalid */
  INVALID_COMPONENT_PROPERTY: 'V023',
  /** Cannot infer property from token */
  CANNOT_INFER_PROPERTY: 'V024',
  /** Action target not defined */
  UNDEFINED_ACTION_TARGET: 'V025',
  /** State reference not defined on component */
  UNDEFINED_STATE_ON_COMPONENT: 'V026',

  // ============================================
  // Event Errors (V030-V039)
  // ============================================

  /** Unknown event name */
  UNKNOWN_EVENT: 'V030',
  /** Duplicate event handler */
  DUPLICATE_EVENT_HANDLER: 'V031',
  /** Event not supported on component */
  UNSUPPORTED_EVENT: 'V032',

  // ============================================
  // Action Errors (V040-V049)
  // ============================================

  /** Unknown action type */
  UNKNOWN_ACTION: 'V040',
  /** Action requires target but none provided */
  MISSING_ACTION_TARGET: 'V041',
  /** Action target is invalid */
  INVALID_ACTION_TARGET: 'V042',
  /** Invalid animation for action */
  INVALID_ACTION_ANIMATION: 'V043',
  /** Invalid position for action */
  INVALID_ACTION_POSITION: 'V044',
  /** Invalid duration value */
  INVALID_ACTION_DURATION: 'V045',
  /** Action syntax error */
  ACTION_SYNTAX_ERROR: 'V046',
  /** Missing 'to' in change action */
  MISSING_CHANGE_TO: 'V047',

  // ============================================
  // Type Errors (V050-V059)
  // ============================================

  /** Type mismatch in comparison */
  COMPARISON_TYPE_MISMATCH: 'V050',
  /** Invalid operator for type */
  INVALID_OPERATOR_FOR_TYPE: 'V051',
  /** Division by zero */
  DIVISION_BY_ZERO: 'V052',
  /** Type cannot be compared */
  INCOMPARABLE_TYPE: 'V053',

  // ============================================
  // State Errors (V060-V069)
  // ============================================

  /** State name not defined on component */
  UNDEFINED_STATE: 'V060',
  /** Duplicate state definition */
  DUPLICATE_STATE: 'V061',
  /** Reserved system state being redefined */
  RESERVED_STATE: 'V062',
  /** Empty state definition */
  EMPTY_STATE: 'V063',

  // ============================================
  // Animation Errors (V070-V079)
  // ============================================

  /** Unknown animation type */
  UNKNOWN_ANIMATION: 'V070',
  /** Incompatible animations combined */
  INCOMPATIBLE_ANIMATIONS: 'V071',
  /** Invalid animation duration */
  INVALID_ANIMATION_DURATION: 'V072',
} as const

export type ValidatorErrorCode = typeof ValidatorErrorCodes[keyof typeof ValidatorErrorCodes]

/**
 * Error code descriptions for documentation and tooltips
 */
export const ErrorCodeDescriptions: Record<ValidatorErrorCode, string> = {
  V001: 'The property name is not recognized. Check spelling or see documentation for valid properties.',
  V002: 'The property expects a different type of value (e.g., number instead of string).',
  V003: 'The property value is outside the allowed range.',
  V004: 'The property value format is invalid.',
  V005: 'Two properties conflict and cannot be used together.',
  V006: 'The color value is not a valid hex, rgb, or hsl color.',
  V007: 'The value is not one of the allowed options for this property.',
  V008: 'The direction modifier is not valid (use l, r, u, d, or combinations).',
  V009: 'This property is deprecated and should not be used.',
  V010: 'This slot name is not valid for the library component.',
  V011: 'A required slot is missing from the library component.',
  V012: 'This slot can only appear once but appears multiple times.',
  V013: 'The library component is not being used correctly.',
  V014: 'This is not a recognized library component name.',
  V015: 'This slot is used outside of its parent library component.',
  V020: 'The token is referenced but never defined.',
  V021: 'Token definitions form a circular reference.',
  V022: 'The component is referenced but never defined.',
  V023: 'This property does not exist on the component.',
  V024: 'Cannot determine which property to set from this token.',
  V025: 'The action targets a component that is not defined.',
  V026: 'The state is not defined on the target component.',
  V030: 'The event name is not recognized.',
  V031: 'This event handler is defined multiple times.',
  V032: 'This event is not supported on this component type.',
  V040: 'The action type is not recognized.',
  V041: 'This action requires a target but none was provided.',
  V042: 'The action target is invalid.',
  V043: 'The animation name is not valid.',
  V044: 'The position value is not valid.',
  V045: 'The duration must be a positive number.',
  V046: 'The action syntax is incorrect.',
  V047: 'The change action requires "to" followed by state name.',
  V050: 'Comparing incompatible types.',
  V051: 'This operator cannot be used with this type.',
  V052: 'Division by zero.',
  V053: 'These values cannot be compared.',
  V060: 'The state is not defined on the component.',
  V061: 'This state is defined multiple times.',
  V062: 'Cannot redefine a system state (hover, focus, active, disabled).',
  V063: 'State definition has no properties or children.',
  V070: 'The animation name is not recognized.',
  V071: 'These animations cannot be combined.',
  V072: 'Animation duration must be a positive number in milliseconds.',
}
