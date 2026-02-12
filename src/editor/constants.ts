/**
 * Editor Timing Constants
 *
 * Centralized timing values for editor interactions.
 * These delays are necessary for proper sequencing of UI updates.
 */

/**
 * Delay before opening a picker after a trigger character is typed.
 * Short delay allows the character to be inserted before the picker opens.
 * 10ms is sufficient for the DOM update to complete.
 */
export const TRIGGER_DELAY_MS = 10

/**
 * Delay before opening a value picker after property completion.
 * Allows the property syntax to be inserted before the picker opens.
 * 50ms gives enough time for the editor state to settle.
 */
export const PICKER_OPEN_DELAY_MS = 50

/**
 * Delay before returning focus to editor after picker closes.
 * Ensures the picker is fully unmounted before focus returns.
 * 0ms (next tick) is usually sufficient.
 */
export const FOCUS_RETURN_DELAY_MS = 0

/**
 * Default debounce delay for search inputs in pickers.
 * Balances responsiveness with performance for large lists.
 */
export const SEARCH_DEBOUNCE_MS = 150

/**
 * Cache size for fuzzy score calculations.
 * LRU cache with this many entries for property/token scoring.
 */
export const FUZZY_SCORE_CACHE_SIZE = 2000

/**
 * Maximum autocomplete options to render.
 * Limits DOM nodes for performance.
 */
export const MAX_AUTOCOMPLETE_OPTIONS = 50
