/**
 * Property Panel Module
 *
 * Modular property panel architecture for Mirror Studio.
 *
 * This module provides:
 * - BaseSection: Abstract base class for property sections
 * - EventDelegator: Centralized event handling
 * - Reusable components: TokenInput, ToggleGroup, AlignGrid, ColorSwatch
 * - Extracted sections: LayoutSection, etc.
 *
 * Usage:
 * ```ts
 * import { BaseSection, EventDelegator, createLayoutSection } from './property'
 * ```
 */

// Types
export * from './types'

// Base classes
export { BaseSection, EventDelegator, type SectionDependencies } from './base'

// Components
export {
  renderTokenInput,
  spacingTokensToOptions,
  createTokenClickHandler,
  createInputChangeHandler,
  renderToggleGroup,
  renderSingleToggle,
  createToggleHandler,
  TOGGLE_ICONS,
  renderAlignGrid,
  parseAlignmentState,
  createAlignmentHandler,
  getAlignmentChanges,
  ALIGN_TO_PROPERTY,
  renderColorSwatch,
  renderColorRow,
  createColorSwatchHandler,
  createColorTokenHandler
} from './components'

// Utils
export {
  escapeHtml,
  dataAttrs,
  classNames,
  html,
  raw,
  svgIcon,
  ICON_PATHS,
  uniqueId,
  validateProperty,
  validateInput,
  parseNumericValue,
  parseSizeValue,
  parseColorValue,
  formatNumber,
  clamp,
  validateSpacingValue
} from './utils'

// Sections
export { LayoutSection, createLayoutSection } from './sections'
