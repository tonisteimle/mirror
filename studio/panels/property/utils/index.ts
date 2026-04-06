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
