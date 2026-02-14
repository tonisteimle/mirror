/**
 * Inline Panel Navigation Utilities
 *
 * Utility functions for navigating inline panels (icon, font, etc.)
 * Separated from components to avoid react-refresh issues.
 */

const GRID_COLUMNS = 6

/**
 * Calculate next index for icon grid navigation.
 */
export function navigateIconGrid(
  currentIndex: number,
  direction: 'up' | 'down' | 'left' | 'right',
  totalItems: number,
  columns: number = GRID_COLUMNS
): number {
  if (totalItems === 0) return 0

  switch (direction) {
    case 'up':
      return Math.max(0, currentIndex - columns)
    case 'down':
      return Math.min(totalItems - 1, currentIndex + columns)
    case 'left':
      return Math.max(0, currentIndex - 1)
    case 'right':
      return Math.min(totalItems - 1, currentIndex + 1)
    default:
      return currentIndex
  }
}

/**
 * Calculate next index for font list navigation.
 */
export function navigateFontList(
  currentIndex: number,
  direction: 'up' | 'down',
  totalItems: number
): number {
  if (totalItems === 0) return 0

  switch (direction) {
    case 'up':
      return Math.max(0, currentIndex - 1)
    case 'down':
      return Math.min(totalItems - 1, currentIndex + 1)
    default:
      return currentIndex
  }
}
