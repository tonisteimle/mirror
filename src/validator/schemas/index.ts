/**
 * Validator Schemas
 */

export {
  getPropertySchema,
  isValidProperty,
  isValidBooleanValue,
  isValidColor,
  isValidNumber,
  isValidDirection,
  PROPERTIES,
  BOOLEAN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
  DIRECTIONAL_PROPERTIES,
  DIRECTIONS,
  BORDER_STYLES,
  type PropertyType,
  type PropertySchema
} from './property-schema'

export {
  getLibrarySchema,
  isValidSlot,
  getValidSlots,
  getRequiredSlots,
  isMultipleSlot,
  getValidActions as getLibraryActions,
  getValidStates as getLibraryStates,
  getLibraryComponentNames,
  getAllSlotNames,
  findSimilarLibraryComponent,
  findSimilarSlot,
  isLibraryComponent,
  LIBRARY_COMPONENT_NAMES,
  LIBRARY_SLOT_NAMES,
  type LibraryComponentSchema,
  type SlotSchema
} from './library-schema'

export {
  isValidEvent,
  getValidEvents,
  findSimilarEvent,
  isValidAction,
  getActionSchema,
  getValidActions,
  findSimilarAction,
  isValidAnimation,
  getValidAnimations,
  findSimilarAnimation,
  canCombineAnimations,
  TRANSITION_ANIMATIONS,
  CONTINUOUS_ANIMATIONS,
  isValidPosition,
  getValidPositions,
  findSimilarPosition,
  isSystemState,
  getSystemStates,
  EVENT_KEYWORDS,
  ACTION_KEYWORDS,
  ANIMATION_KEYWORDS,
  POSITION_KEYWORDS,
  SYSTEM_STATES,
  type ActionSchema
} from './event-schema'
