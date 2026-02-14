/**
 * Central constants for the Mirror application.
 * All magic numbers and configuration values should be defined here.
 */

// UI Constraints
export const UI = {
  PANEL_MIN_WIDTH: 300,
  PANEL_MAX_WIDTH: 800,
  PANEL_DEFAULT_WIDTH: 548,
  HEADER_HEIGHT: 40,
  DEBOUNCE_DELAY_MS: 500,
  AUTOCOMPLETE_DELAY_MS: 300,
} as const

// Common Timing Values
export const TIMING = {
  /** Default debounce delay for search/input (ms) */
  DEBOUNCE_DEFAULT_MS: 150,
  /** Tooltip show delay (ms) */
  TOOLTIP_DELAY_MS: 200,
  /** Avatar tooltip delay (ms) */
  AVATAR_TOOLTIP_DELAY_MS: 600,
  /** Focus return delay - next tick (ms) */
  FOCUS_NEXT_TICK_MS: 0,
  /** Short focus delay for UI transitions (ms) */
  FOCUS_SHORT_DELAY_MS: 10,
} as const

// History settings
export const HISTORY = {
  MAX_SIZE: 50,
  DEBOUNCE_MS: 500,
  MAX_MEMORY_BYTES: 5 * 1024 * 1024, // 5 MB limit for future delta storage
} as const

// Parser settings
export const PARSER = {
  MAX_NESTING_DEPTH: 20,
  MAX_CHILDREN_PER_NODE: 100,
} as const

// Storage Keys
export const STORAGE_KEYS = {
  PROJECT: 'mirror-project',
  AUTOCOMPLETE: 'mirror-autocomplete',
  API_KEY: 'mirror-api-key',
  AI_MODE: 'mirror-ai-mode',
  NL_MODE: 'mirror-nl-mode',
  PICKER_MODE: 'mirror-picker-mode',
} as const

// Editor Tabs
export const TABS = {
  LAYOUT: 'layout',
  COMPONENTS: 'components',
  TOKENS: 'tokens',
  LIBRARY: 'library',
} as const

// Picker Types
export const PICKERS = {
  COLOR: 'color',
  FONT: 'font',
  ICON: 'icon',
  SPACING: 'spacing',
  TOKEN: 'token',
  PROPERTY: 'property',
  VALUE: 'value',
  COMMAND: 'command',
} as const

// Autocomplete Modes
export const AUTOCOMPLETE_MODES = {
  ALWAYS: 'always',
  DELAY: 'delay',
  OFF: 'off',
} as const

// Highlight Colors (for inspect mode)
export const HIGHLIGHT_COLORS = {
  HOVER: '#3B82F6',
  SELECTED: '#10B981',
} as const

// Internal Node Names (for Parser/Generator)
export const INTERNAL_NODES = {
  TEXT: '_text',
  CONDITIONAL: '_conditional',
  ITERATOR: '_iterator',
} as const

// API Configuration
function getApiEndpoint(): string {
  // Always use direct OpenRouter endpoint (CORS is allowed)
  return 'https://openrouter.ai/api/v1/chat/completions'
}

export const API = {
  MODEL: 'anthropic/claude-sonnet-4.5',
  MAX_TOKENS: 4096,
  get ENDPOINT() { return getApiEndpoint() },
  REQUEST_TIMEOUT_MS: 60000,  // 60 seconds timeout for AI requests
} as const

// Default tokens - empty by default
export const DEFAULT_TOKENS: string = ''
