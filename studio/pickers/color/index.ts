/**
 * Color Picker — public surface (barrel)
 *
 * Implementation lives in picker.ts / palette.ts / canvas-picker.ts / full-picker.ts.
 * This file is a thin re-export.
 */

// Palette utilities + tokens
export {
  parseColor,
  isLightColor,
  hexToHSL,
  hslToHex,
  generateShades,
  DEFAULT_PALETTES,
  ALL_PALETTES,
  GRAYS,
  QUICK_COLORS,
  COLORS,
  OPEN_COLORS,
  TAILWIND_COLORS,
  OPEN_COLOR_PALETTE,
  TAILWIND_PALETTE,
  MATERIAL_PALETTE,
  // HSV color space functions
  hsvToRgb,
  rgbToHsv,
  hexToRgb,
  rgbToHex,
  hexToHsv,
  hsvToHex,
} from './palette'
export type { ColorPalette, RGB, HSV } from './palette'

// Canvas-based HSV color picker
export {
  CanvasColorPicker,
  createCanvasColorPicker,
  type CanvasPickerState,
  type CanvasPickerCallbacks,
  type CanvasPickerElements,
} from './canvas-picker'

// Full Color Picker (dynamically generates HTML)
export {
  FullColorPicker,
  getFullColorPicker,
  createFullColorPicker,
  type FullColorPickerConfig,
} from './full-picker'

// ColorPicker class + globals
export {
  ColorPicker,
  createColorPicker,
  showColorPickerForProperty,
  hideGlobalColorPicker,
  isGlobalColorPickerVisible,
  initColorPickerGlobalAPI,
  type ColorPickerConfig,
  type ColorPickerCallbacks,
} from './picker'

// Studio setup (FullColorPicker glue, keyboard, window globals)
export {
  initColorPicker,
  type ColorPickerSetupDeps,
  type ColorPickerHandle,
  type ColorPickerCallback,
  type ShowColorPickerOptions,
} from './setup'
