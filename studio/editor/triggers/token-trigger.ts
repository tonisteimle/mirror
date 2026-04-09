/**
 * Token Trigger - Editor Trigger for Token Picker
 *
 * Triggers the TokenPicker when typing '$' after properties.
 * Uses the new TriggerManager system.
 */

import type { EditorView, ViewUpdate } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import {
  TokenPicker,
  createTokenPicker,
  parseTokensFromFiles,
  filterTokensBySuffix as filterBySuffix,
  filterTokensByType as filterByType,
  type TokenDefinition,
} from '../../pickers'
import type { TriggerConfig, TriggerContext } from './types'
import { getTriggerManager } from '../trigger-manager'

export const TOKEN_TRIGGER_ID = 'token'

// Property → suffix mapping for filtering tokens
const PROPERTY_SUFFIXES: Record<string, string> = {
  bg: '.bg',
  background: '.bg',
  col: '.col',
  color: '.col',
  boc: '.boc',
  'border-color': '.boc',
  'hover-bg': '.bg',
  'hover-col': '.col',
  'hover-boc': '.boc',
  pad: '.pad',
  padding: '.pad',
  gap: '.gap',
  margin: '.margin',
  rad: '.rad',
  radius: '.rad',
}

// Property → panel type mapping
const PROPERTY_TYPES: Record<string, 'color' | 'spacing'> = {
  bg: 'color',
  background: 'color',
  col: 'color',
  color: 'color',
  boc: 'color',
  'border-color': 'color',
  'hover-bg': 'color',
  'hover-col': 'color',
  'hover-boc': 'color',
  pad: 'spacing',
  padding: 'spacing',
  gap: 'spacing',
  margin: 'spacing',
  rad: 'spacing',
  radius: 'spacing',
}

// Context pattern for $ trigger
// Matches: property + optional space + $ (e.g., "bg $", "pad$")
// Also matches token definition with suffix (e.g., "name.bg: $" or legacy "$name.bg: $")
const TOKEN_CONTEXT_PATTERN =
  /\b(bg|background|col|color|boc|border-color|hover-bg|hover-col|hover-boc|pad|padding|gap|margin|rad|radius)\s*$|\$?([\w-]+)\.(bg|col|boc|pad|gap|margin|rad):\s*$/

// State for token picker
interface TokenTriggerState {
  allTokens: TokenDefinition[]
  filteredTokens: TokenDefinition[]
  picker: TokenPicker | null
}

let tokenState: TokenTriggerState = {
  allTokens: [],
  filteredTokens: [],
  picker: null,
}

/**
 * Extract tokens from all project files
 * @param files - Map of filename to content
 */
export function extractAllTokens(files: Record<string, string>): TokenDefinition[] {
  return parseTokensFromFiles(files)
}


/**
 * Get token types allowed for a property
 */
function getTypesForProperty(property: string): ('color' | 'spacing')[] {
  const type = PROPERTY_TYPES[property]
  return type ? [type] : ['color', 'spacing']
}

/**
 * Create the token trigger configuration
 */
export function createTokenTriggerConfig(
  getFiles: () => Record<string, string>
): TriggerConfig {
  // Store the current property context for filtering
  let currentProperty: string | undefined

  return {
    id: TOKEN_TRIGGER_ID,
    trigger: {
      type: 'char',
      char: '$',
      contextPattern: TOKEN_CONTEXT_PATTERN,
    },
    picker: () => {
      // Get all tokens from project files
      tokenState.allTokens = extractAllTokens(getFiles())

      // Filter by property context if available
      let initialTokens = tokenState.allTokens
      if (currentProperty) {
        const suffix = PROPERTY_SUFFIXES[currentProperty]
        if (suffix) {
          initialTokens = filterBySuffix(initialTokens, suffix)
        }
        // If no suffix matches, try by type
        if (initialTokens.length === 0) {
          const types = getTypesForProperty(currentProperty)
          initialTokens = filterByType(tokenState.allTokens, types)
        }
      }
      tokenState.filteredTokens = initialTokens

      // Create picker with filtered tokens and context
      tokenState.picker = createTokenPicker(
        {
          tokens: tokenState.filteredTokens,
          showPreview: true,
          groupByCategory: true,
          searchable: false, // We handle filtering via live filter
          context: currentProperty ? {
            property: currentProperty,
            allowedTypes: getTypesForProperty(currentProperty),
          } : undefined,
        },
        {
          onSelect: () => {}, // Will be overridden
        }
      )

      return tokenState.picker
    },
    onSelect: (value: string, context: TriggerContext, view: EditorView) => {
      insertToken(value, context, view)
    },
    liveFilter: true,
    closeOnChars: [' ', '\n', '\t'],
    keyboard: {
      orientation: 'vertical',
    },
    priority: 90,
    shouldActivate: (update: ViewUpdate, insertedText: string, context: TriggerContext) => {
      // Don't trigger at line start (new token definition)
      const isLineStart = /^\s*$/.test(context.textBefore)
      if (isLineStart) return false

      // Check if context matches and extract property
      const match = context.textBefore.match(TOKEN_CONTEXT_PATTERN)
      if (match) {
        currentProperty = match[1] // Capture the property name
        return true
      }
      return false
    },
    shouldClose: (update: ViewUpdate, insertedText: string, context: TriggerContext) => {
      // Close on non-identifier characters (except . for suffixes)
      return /[^a-zA-Z0-9._-]/.test(insertedText)
    },
  }
}

/**
 * Insert selected token into the editor
 */
function insertToken(value: string, context: TriggerContext, view: EditorView): void {
  // Value already starts with $, but user has typed $ too
  // So we insert without the $ prefix
  let insertValue = value
  if (value.startsWith('$')) {
    insertValue = value.slice(1)
  }

  const from = context.startPos
  const to = view.state.selection.main.head

  view.dispatch({
    changes: { from, to, insert: insertValue },
    selection: { anchor: from + insertValue.length },
    annotations: Transaction.userEvent.of('input.token'),
  })

  view.focus()
}

/**
 * Filter tokens for live filtering
 */
export function filterTokens(filterText: string, property?: string): void {
  if (!tokenState.picker) return

  const suffix = property ? PROPERTY_SUFFIXES[property] : undefined
  const type = property ? PROPERTY_TYPES[property] : undefined

  // Start with all tokens
  let filtered = tokenState.allTokens

  // Filter by suffix first
  if (suffix) {
    filtered = filterBySuffix(filtered, suffix)
  }

  // If no suffix matches, filter by type
  if (filtered.length === 0 && type) {
    filtered = filterByType(tokenState.allTokens, [type])
  }

  // Apply text filter
  if (filterText) {
    const lowerFilter = filterText.toLowerCase()
    filtered = filtered.filter(t => t.name.toLowerCase().includes(lowerFilter))
  }

  tokenState.filteredTokens = filtered
  tokenState.picker.setTokens(filtered)
}

/**
 * Register the token trigger with the global trigger manager
 * @param getFiles - Function to get current project files
 */
export function registerTokenTrigger(getFiles: () => Record<string, string>): void {
  const manager = getTriggerManager()
  manager.register(createTokenTriggerConfig(getFiles))
}

/**
 * Unregister the token trigger
 */
export function unregisterTokenTrigger(): void {
  const manager = getTriggerManager()
  manager.unregister(TOKEN_TRIGGER_ID)
  tokenState = { allTokens: [], filteredTokens: [], picker: null }
}

/**
 * Get the property suffix mapping
 */
export function getPropertySuffixes(): Record<string, string> {
  return { ...PROPERTY_SUFFIXES }
}

/**
 * Get the property type mapping
 */
export function getPropertyTypes(): Record<string, 'color' | 'spacing'> {
  return { ...PROPERTY_TYPES }
}
