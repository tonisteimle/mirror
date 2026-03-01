/**
 * Density System
 *
 * Central definition for all density-related values.
 * ALL experts and primitives MUST use these values via getDensity().
 *
 * Density affects:
 * - Button height and padding
 * - Input padding
 * - Gap between elements
 * - Font sizes
 * - Icon sizes
 * - Border radius
 */

// =============================================================================
// DENSITY DEFINITIONS
// =============================================================================

export const DENSITY = {
  compact: {
    // Buttons
    button: {
      height: 28,
      paddingHorizontal: 12,
    },

    // Inputs
    input: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      minHeight: 80, // for textarea
    },

    // Labels
    label: {
      fontSize: 11,
      gap: 3,
    },

    // General
    gap: 8,
    fontSize: 12,
    iconSize: 16,
    radius: 4,
  },

  default: {
    // Buttons
    button: {
      height: 38,
      paddingHorizontal: 16,
    },

    // Inputs
    input: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      minHeight: 100,
    },

    // Labels
    label: {
      fontSize: 13,
      gap: 4,
    },

    // General
    gap: 12,
    fontSize: 13,
    iconSize: 18,
    radius: 6,
  },

  spacious: {
    // Buttons
    button: {
      height: 48,
      paddingHorizontal: 20,
    },

    // Inputs
    input: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      minHeight: 120,
    },

    // Labels
    label: {
      fontSize: 14,
      gap: 5,
    },

    // General
    gap: 16,
    fontSize: 14,
    iconSize: 20,
    radius: 8,
  },
} as const;

// =============================================================================
// TYPES
// =============================================================================

export type Density = keyof typeof DENSITY;
export type DensityConfig = (typeof DENSITY)[Density];

// =============================================================================
// ACCESSOR
// =============================================================================

/**
 * Get density configuration.
 * Use this instead of accessing DENSITY directly.
 *
 * @example
 * const d = getDensity('default');
 * const buttonHeight = d.button.height; // 38
 * const inputPadding = [d.input.paddingVertical, d.input.paddingHorizontal]; // [10, 12]
 */
export function getDensity(density: Density): DensityConfig {
  return DENSITY[density];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get button dimensions for a density level.
 */
export function getButtonDensity(density: Density) {
  const d = getDensity(density);
  return {
    height: d.button.height,
    paddingHorizontal: d.button.paddingHorizontal,
    fontSize: d.fontSize,
    iconSize: d.iconSize,
  };
}

/**
 * Get input dimensions for a density level.
 */
export function getInputDensity(density: Density) {
  const d = getDensity(density);
  return {
    paddingVertical: d.input.paddingVertical,
    paddingHorizontal: d.input.paddingHorizontal,
    fontSize: d.fontSize,
    minHeight: d.input.minHeight,
  };
}

/**
 * Get label dimensions for a density level.
 */
export function getLabelDensity(density: Density) {
  const d = getDensity(density);
  return {
    fontSize: d.label.fontSize,
    gap: d.label.gap,
  };
}
