/**
 * DSL Autocomplete for CodeMirror
 * VS Code-like inline autocomplete that replaces the modal PropertyPicker.
 */
import { autocompletion, type CompletionContext, type CompletionResult, type Completion } from '@codemirror/autocomplete'
import { EditorView } from '@codemirror/view'
import { properties, type Property, type ValuePickerType } from '../data/dsl-properties'
import { fuzzyScore } from '../utils/fuzzy-search'
import { colors } from '../theme'
import { LRUCache } from '../utils/lru-cache'

export interface DSLAutocompleteOptions {
  onValuePickerNeeded?: (picker: ValuePickerType, property?: string) => void
  getDesignTokens?: () => Map<string, unknown>
}

/**
 * Token suffix mappings for context-aware filtering.
 * Maps property names to their valid token suffixes.
 */
export const PROPERTY_TO_TOKEN_SUFFIXES: Record<string, string[]> = {
  'col': ['-col', '-color'],
  'pad': ['-pad', '-padding'],
  'mar': ['-mar', '-margin'],
  'rad': ['-rad', '-radius'],
  'gap': ['-gap'],
  'boc': ['-boc', '-border-color'],
  'bor': ['-bor', '-border'],
  'size': ['-size', '-font-size'],
  'weight': ['-weight', '-font-weight'],
  'w': ['-w', '-width'],
  'h': ['-h', '-height'],
  'z': ['-z', '-index'],
}

interface ScoredProperty {
  prop: Property
  score: number
  matchedKeyword: string | null
}

/**
 * LRU cache for fuzzy scores to avoid recalculating for repeated queries.
 * Uses LRU eviction instead of TTL for O(1) operations and bounded memory.
 * Key format: "query:target"
 */
const scoreCache = new LRUCache<string, number>(2000)

/**
 * Get a cached fuzzy score or calculate and cache it.
 * O(1) lookup and insertion with automatic LRU eviction.
 */
function getCachedScore(query: string, target: string): number {
  const key = `${query}:${target}`
  const cached = scoreCache.get(key)

  if (cached !== undefined) {
    return cached
  }

  const score = fuzzyScore(query, target)
  scoreCache.set(key, score)

  return score
}

/**
 * Score properties against a search query using weighted multi-field fuzzy search.
 */
function scoreProperties(query: string): ScoredProperty[] {
  if (!query) {
    return properties.map(p => ({ prop: p, score: 0, matchedKeyword: null }))
  }

  return properties
    .map(prop => {
      // Score against property name (highest priority) - using cache
      const nameScore = getCachedScore(query, prop.name)

      // Score against keywords (German/English synonyms) - using cache
      let keywordScore = 0
      let matchedKeyword: string | null = null
      for (const kw of prop.keywords) {
        const s = getCachedScore(query, kw) * 0.9 // Slightly lower weight than direct name match
        if (s > keywordScore) {
          keywordScore = s
          matchedKeyword = kw
        }
      }

      // Score against description - using cache
      const descScore = getCachedScore(query, prop.description) * 0.5

      // Score against category - using cache
      const catScore = getCachedScore(query, prop.category) * 0.3

      // Take the best score from all fields
      const score = Math.max(nameScore, keywordScore, descScore, catScore)

      return {
        prop,
        score,
        matchedKeyword: keywordScore > nameScore ? matchedKeyword : null
      }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
}

/**
 * Create an apply function that inserts the property and optionally opens a value picker.
 */
function createApplyFunction(
  prop: Property,
  onValuePickerNeeded?: (picker: ValuePickerType, property?: string) => void
): Completion['apply'] {
  return (view: EditorView, _completion: Completion, from: number, to: number) => {
    view.dispatch({
      changes: { from, to, insert: prop.syntax },
      selection: { anchor: from + prop.syntax.length }
    })

    // Open value picker after a short delay to let the editor update
    if (prop.valuePicker && prop.valuePicker !== 'none' && onValuePickerNeeded) {
      setTimeout(() => onValuePickerNeeded(prop.valuePicker!, prop.valuePickerProperty), 50)
    }
  }
}

/**
 * Filter tokens based on the preceding property context.
 * Returns all tokens if no property context, or filtered tokens matching the property.
 */
export function filterTokensForProperty(
  tokens: Map<string, unknown>,
  propertyContext: string | null
): Array<{ name: string; value: unknown }> {
  const result: Array<{ name: string; value: unknown }> = []

  for (const [name, value] of tokens) {
    // If no property context, show all tokens
    if (!propertyContext) {
      result.push({ name, value })
      continue
    }

    // Get valid suffixes for this property
    const validSuffixes = PROPERTY_TO_TOKEN_SUFFIXES[propertyContext]
    if (!validSuffixes) {
      // Unknown property - show all tokens
      result.push({ name, value })
      continue
    }

    // Check if token name ends with any valid suffix
    const lowerName = name.toLowerCase()
    if (validSuffixes.some(suffix => lowerName.endsWith(suffix))) {
      result.push({ name, value })
    }
  }

  return result
}

/**
 * Get the property context before a token reference.
 * Returns the property name if cursor is after "property $", null otherwise.
 */
export function getPropertyContextForToken(textBefore: string): string | null {
  // Match pattern: "property $" or "property $partial"
  const match = textBefore.match(/\b([a-z]+)\s+\$[a-zA-Z0-9_-]*$/)
  if (match) {
    return match[1]
  }
  return null
}

/**
 * Create the DSL completion source for CodeMirror autocompletion.
 */
function createDSLCompletionSource(options: DSLAutocompleteOptions) {
  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos)
    const textBefore = line.text.slice(0, context.pos - line.from)

    // Don't trigger autocomplete inside strings
    const quoteCount = (textBefore.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) return null

    // Don't trigger autocomplete when typing hex color values (after #)
    // This prevents interference with the color picker
    if (/#[0-9a-fA-F]*$/.test(textBefore)) return null

    // Don't trigger autocomplete when typing pure numbers (property values like "pad 16")
    // Check if the current word is purely numeric
    const currentWord = context.matchBefore(/[\w-]+/)
    if (currentWord && /^\d+$/.test(currentWord.text)) return null

    // Check for token reference: $...
    const tokenMatch = context.matchBefore(/\$[a-zA-Z0-9_-]*/)
    if (tokenMatch && options.getDesignTokens) {
      const tokens = options.getDesignTokens()
      const propertyContext = getPropertyContextForToken(textBefore)
      const filteredTokens = filterTokensForProperty(tokens, propertyContext)

      // Filter by typed text after $
      const typedText = tokenMatch.text.slice(1).toLowerCase() // Remove $

      const completionOptions: Completion[] = filteredTokens
        .filter(t => !typedText || t.name.toLowerCase().includes(typedText))
        .map(({ name, value }) => {
          // Format value for display
          let detail = ''
          if (typeof value === 'number') {
            detail = String(value)
          } else if (typeof value === 'string') {
            detail = value
          } else if (value && typeof value === 'object' && 'tokens' in value) {
            // Token sequence
            detail = '(sequence)'
          }

          return {
            label: `$${name}`,
            detail,
            apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
              view.dispatch({
                changes: { from, to, insert: `$${name}` },
                selection: { anchor: from + name.length + 1 }
              })
            }
          }
        })

      if (completionOptions.length > 0) {
        return {
          from: tokenMatch.from,
          filter: false,
          options: completionOptions,
        }
      }
    }

    // Match word characters and hyphens (for properties like "hor-cen")
    const word = context.matchBefore(/[\w-]+/)

    // Don't show autocomplete unless typing or explicitly triggered
    if (!word && !context.explicit) return null

    // Don't trigger right after a component name (let dot keymap handle that)
    if (/^[A-Z][a-zA-Z0-9]*$/.test(word?.text || '')) {
      // This might be a component name being typed, don't interfere
      if (textBefore.trimStart() === word?.text) return null
    }

    const query = word?.text.toLowerCase() ?? ''
    const scored = scoreProperties(query)

    // Build completion options
    const completionOptions: Completion[] = scored.map(({ prop, matchedKeyword }) => {
      // Build a concise detail string
      let detail = prop.description
      if (matchedKeyword) {
        detail = `${matchedKeyword}`
      }

      return {
        label: prop.name,
        detail,
        apply: createApplyFunction(prop, options.onValuePickerNeeded),
      }
    })

    return {
      from: word?.from ?? context.pos,
      filter: false, // We handle filtering ourselves with fuzzyScore
      options: completionOptions,
    }
  }
}

/**
 * Theme for the autocomplete dropdown.
 * Matches editor styling: 11px JetBrains Mono, dark neutral colors.
 */
const autocompleteTheme = EditorView.baseTheme({
  '.cm-tooltip-autocomplete': {
    backgroundColor: `${colors.panel} !important`,
    border: `1px solid ${colors.border} !important`,
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    maxHeight: '200px',
    padding: '2px',
  },
  '.cm-tooltip-autocomplete > ul': {
    fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
    fontSize: '11px',
    maxHeight: '196px',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    padding: '2px 6px',
    borderRadius: '2px',
    margin: '0',
    lineHeight: '1.4',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: colors.panelHover,
  },
  // Property name in syntax color (light blue like editor)
  '.cm-completionLabel': {
    color: colors.textDim,
  },
  // Description in muted gray
  '.cm-completionDetail': {
    color: colors.textMuted,
    marginLeft: '8px',
    fontStyle: 'normal',
    fontSize: '11px',
  },
  '.cm-completionMatchedText': {
    color: '#9CDCFE',
    textDecoration: 'underline',
  },
  // Hide section headers for cleaner look
  '.cm-tooltip-autocomplete .cm-completionSection': {
    display: 'none',
  },
})

/**
 * Create the DSL autocomplete extension for the editor.
 *
 * @param options - Configuration options
 * @returns CodeMirror extension array
 */
export function dslAutocomplete(options: DSLAutocompleteOptions = {}) {
  return [
    autocompletion({
      override: [createDSLCompletionSource(options)],
      activateOnTyping: true,
      selectOnOpen: true,
      maxRenderedOptions: 50,
    }),
    autocompleteTheme,
  ]
}
