/**
 * Sizing Constants for Visual Elements
 *
 * Centralized size constraints used across the visual editing system.
 */

// ============================================================================
// Minimum Element Sizes
// ============================================================================

/**
 * Absolute minimum size for elements during resize operations.
 * Elements cannot be resized smaller than this.
 */
export const MIN_RESIZE_SIZE = 8

/**
 * Threshold below which small handles are used instead of normal handles.
 * This prevents handles from being too large for small elements.
 */
export const SMALL_ELEMENT_THRESHOLD = 40

// ============================================================================
// Handle Sizes
// ============================================================================

/** Size of normal drag handles */
export const HANDLE_SIZE = 12

/** Size of handles for small elements */
export const HANDLE_SIZE_SMALL = 8

// ============================================================================
// Default Fallback Sizes
// ============================================================================

/**
 * Default container size when parent cannot be determined.
 * Used as fallback for fill calculations.
 */
export const DEFAULT_CONTAINER_SIZE = 400
