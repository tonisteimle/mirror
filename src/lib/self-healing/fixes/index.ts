/**
 * Fixes Index
 *
 * Central export for all fix functions.
 */

export { cssCleanupFixes } from './css-fixes'
export { colorValueFixes } from './color-fixes'
export { tokenFixes } from './token-fixes'
export { typoFixes } from './typo-fixes'
export { structuralFixes } from './structural-fixes'

// Re-export individual fix functions from css-fixes
export {
  removeImportant,
  removeCssTransitions,
  removeCalcExpressions,
  fixCssNoneValues,
  convertCssPropertyNames,
  convertCamelCaseProperties,
  removePropertyColons,
  removePxSuffix,
  convertPercentageToFull,
  removeUnsupportedUnits
} from './css-fixes'

// Re-export individual fix functions from color-fixes
export {
  convertHslToHex,
  expandShortHex,
  convertRgbaToHex,
  convertNamedColorsToHex,
  convertCssShadowToSize,
  fixOpacityRange,
  fixBorderShorthand,
  fixBorderColorOnly,
  addMissingHashToHex
} from './color-fixes'

// Re-export individual fix functions from token-fixes
export {
  fixMissingTokenPrefix,
  fixTokenAsProperty,
  fixTokensOnSameLine,
  fixHyphenatedTokenNames,
  removeEmptyLinesBetweenTokens,
  fixUndefinedTokenReferences
} from './token-fixes'

// Re-export all from typo-fixes
export * from './typo-fixes'

// Re-export individual fix functions from structural-fixes (excluding fixBorderShorthand to avoid duplicate)
export {
  removeCurlyBraces,
  fixSemicolons,
  convertHtmlTags,
  fixQuotes,
  fixIconNameAttribute,
  fixFlexShorthand,
  fixStateInlineComma,
  removeCssClassSyntax,
  fixMarginShorthands,
  fixPaddingShorthands,
  fixUnknownComponents,
  fixTextOnSeparateLine,
  fixSingleDashElement,
  fixDimensionShorthandInDefinition,
  fixDefinitionAndUsageOnSameLine,
  fixDuplicateElementNames,
  fixSplitPropertyLines,
  fixOrphanedLayoutKeywords,
  fixOrphanedNumbers,
  removeHtmlInputTypes,
  removeBooleanTrue,
  removeUnsupportedAnimations,
  fixDisplayProperty,
  removePositionProperty,
  fixOverflowProperty,
  fixZIndex,
  fixCursorProperty
} from './structural-fixes'
