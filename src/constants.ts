/**
 * Central constants for the Mirror application.
 * All magic numbers and configuration values should be defined here.
 */

// UI Constraints
export const UI = {
  PANEL_MIN_WIDTH: 300,
  PANEL_MAX_WIDTH: 800,
  PANEL_DEFAULT_WIDTH: 420,
  HEADER_HEIGHT: 40,
  DEBOUNCE_DELAY_MS: 500,
  AUTOCOMPLETE_DELAY_MS: 300,
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
export const API = {
  MODEL: 'anthropic/claude-3.5-sonnet',
  MAX_TOKENS: 4096,
  ENDPOINT: '/api/openrouter/chat/completions',
  REQUEST_TIMEOUT_MS: 60000,  // 60 seconds timeout for AI requests
} as const

// Default token definitions (design system)
// Note: Using explicit string type to allow useState to accept string values
export const DEFAULT_TOKENS: string = `// Farben
$primary: #3B82F6
$primary-hover: #2563EB
$secondary: #6366F1
$accent: #10B981
$bg: #0A0A0A
$surface: #1A1A1A
$surface-hover: #252525
$border: #333333
$text: #FFFFFF
$text-muted: #888888
$success: #22C55E
$warning: #F59E0B
$error: #EF4444

// Schriften
$font-sans: "Inter", system-ui, sans-serif
$font-mono: "JetBrains Mono", monospace
$font-heading: "Inter", sans-serif

// Abstände
$space-xs: 4
$space-sm: 8
$space-md: 12
$space-lg: 16
$space-xl: 24
$space-2xl: 32

// Radien
$radius-sm: 4
$radius-md: 8
$radius-lg: 12
$radius-full: 9999

// Schatten
$shadow-sm: sm
$shadow-md: md
$shadow-lg: lg

// Schriftgrössen
$size-xs: 10
$size-sm: 12
$size-base: 14
$size-lg: 16
$size-xl: 20
$size-2xl: 24

// Schriftstärken
$weight-normal: 400
$weight-medium: 500
$weight-semibold: 600
$weight-bold: 700
`
