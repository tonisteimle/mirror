/**
 * Utility Functions
 */

export {
  escapeHtml,
  dataAttrs,
  classNames,
  html,
  raw,
  svgIcon,
  ICON_PATHS,
  uniqueId
} from './html'

export {
  validateProperty,
  validateWithRule,
  applyValidationStyle,
  validateInput,
  parseNumericValue,
  parseSizeValue,
  parseColorValue,
  formatNumber,
  clamp,
  validateSpacingValue,
  type ValidationResult
} from './validation'

export {
  resolveColorToken,
  resolveSpacingToken,
  resolveToken,
  isTokenRef
} from './tokens'

export {
  PROPERTY_DESCRIPTIONS,
  getPropertyDescription,
  formatLabelWithTooltip
} from './descriptions'

export {
  isExpanded,
  setExpanded,
  toggleExpanded,
  applyExpandedState
} from './expand-state'

export {
  makeScrubable,
  setupScrubbing,
  isScrubbing,
  type ScrubOptions,
  type ScrubInstance
} from './scrub'

export {
  PROP_ICONS,
  iconLabel
} from './icons'
