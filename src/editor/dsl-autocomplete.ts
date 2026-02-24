/**
 * DSL Autocomplete for CodeMirror
 * VS Code-like inline autocomplete that replaces the modal PropertyPicker.
 */
import { autocompletion, startCompletion, type CompletionContext, type CompletionResult, type Completion } from '@codemirror/autocomplete'
import { EditorView } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import { properties, type Property, type ValuePickerType } from '../data/dsl-properties'
import { getAllLibraryComponents } from '../library/registry'
import { fuzzyScore } from '../utils/fuzzy-search'
import { colors } from '../theme'
import { LRUCache } from '../utils/lru-cache'
import { isInsideString } from './utils'
import { FUZZY_SCORE_CACHE_SIZE, PICKER_OPEN_DELAY_MS, MAX_AUTOCOMPLETE_OPTIONS } from './constants'
import { LONG_TO_SHORT } from './shorthand-expansion'

// =============================================================================
// Pre-compiled Regex Patterns (Performance Optimization)
// =============================================================================

/** Pattern for "as " with space at end */
const REGEX_AFTER_AS_SPACE = /\bas\s$/

/** Pattern for "as " followed by word */
const REGEX_TYPING_AFTER_AS = /\bas\s+$/

/** Pattern for "property $token" context */
const REGEX_PROPERTY_TOKEN_CONTEXT = /\b([a-z]+)\s+\$[a-zA-Z0-9_-]*$/

/**
 * Property groups for contextual boosting.
 * After selecting a value for one property, related properties are boosted.
 */
const PROPERTY_BOOST_GROUPS: Record<string, string[]> = {
  // Typography: after font, suggest size/weight/line/col
  font: ['size', 'weight', 'line', 'col'],
  size: ['weight', 'line', 'font', 'col'],
  weight: ['size', 'line', 'font'],
  line: ['size', 'weight', 'font'],
  // Icon: after icon, suggest size/col
  icon: ['size', 'col'],
  // Spacing: after pad, suggest mar/gap
  pad: ['mar', 'gap'],
  mar: ['pad', 'gap'],
  gap: ['pad', 'mar'],
  // Box styling: after bg, suggest bor/rad
  bg: ['bor', 'rad', 'col'],
  bor: ['rad', 'bg', 'boc'],
  rad: ['bor', 'bg'],
  // Layout: after hor/ver, suggest gap and alignment
  hor: ['gap', 'ver-cen', 'hor-cen', 'wrap'],
  ver: ['gap', 'ver-cen', 'hor-cen'],
}

// =============================================================================
// Component Type to Property Mapping
// =============================================================================
// Properties that are most relevant for each component type.
// These get boosted in autocomplete when working with that component type.

/**
 * Relevant properties for each component type.
 * Properties are specified by their syntax name (short or long form).
 */
const COMPONENT_TYPE_PROPERTIES: Record<string, string[]> = {
  // Input fields: form-related properties
  Input: [
    'padding', 'background', 'color', 'border', 'border-color', 'radius',
    'width', 'height', 'font', 'size',
    'hover-background', 'hover-border-color',
  ],
  Textarea: [
    'padding', 'background', 'color', 'border', 'border-color', 'radius',
    'width', 'height', 'min-height', 'font', 'size', 'line',
    'hover-background', 'hover-border-color', 'scroll',
  ],
  // Text elements: typography properties
  Text: [
    'color', 'font', 'size', 'weight', 'line', 'uppercase', 'truncate',
    'hor-l', 'hor-cen', 'hor-r',
  ],
  Link: [
    'color', 'font', 'size', 'weight', 'line', 'uppercase', 'truncate',
    'hover-color',
  ],
  // Images: image-specific and sizing
  Image: [
    'src', 'alt', 'fit', 'width', 'height', 'min-width', 'min-height',
    'max-width', 'max-height', 'radius', 'border', 'shadow',
  ],
  // Buttons: interactive styling
  Button: [
    'background', 'color', 'padding', 'radius', 'border', 'border-color',
    'font', 'size', 'weight', 'shadow',
    'hover-background', 'hover-color', 'hover-border-color',
    'horizontal', 'gap',
  ],
  // Icons: icon-specific
  Icon: [
    'color', 'size', 'opacity',
  ],
  // Container types: layout properties
  Box: [
    'background', 'padding', 'gap', 'horizontal', 'vertical',
    'border', 'border-color', 'radius', 'shadow',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b',
    'wrap', 'grow', 'clip', 'scroll',
  ],
  Container: [
    'background', 'padding', 'gap', 'horizontal', 'vertical',
    'border', 'border-color', 'radius', 'shadow',
    'width', 'max-width', 'hor-cen',
  ],
  Row: [
    'gap', 'padding', 'background',
    'hor-l', 'hor-cen', 'hor-r', 'hor-between',
    'ver-t', 'ver-cen', 'ver-b',
    'wrap', 'grow',
  ],
  Column: [
    'gap', 'padding', 'background',
    'hor-l', 'hor-cen', 'hor-r',
    'ver-t', 'ver-cen', 'ver-b', 'ver-between',
    'grow',
  ],
  Stack: [
    'gap', 'padding', 'background',
    'hor-l', 'hor-cen', 'hor-r',
    'ver-t', 'ver-cen', 'ver-b',
  ],
  // Segment control
  Segment: [
    'background', 'padding', 'radius', 'border', 'gap',
    'color', 'size', 'weight',
  ],
}

// Aliases for component types
const COMPONENT_TYPE_ALIASES: Record<string, string> = {
  Col: 'Column',
  Group: 'Box',
  Wrapper: 'Box',
  View: 'Box',
}

/** Pattern to detect component type at line start: "  ComponentName ..." */
const REGEX_COMPONENT_AT_START = /^\s*([A-Z][a-zA-Z0-9]*)/

/** Pattern to detect "as Type" syntax: "... as Type ..." */
const REGEX_AS_TYPE_CONTEXT = /\bas\s+([A-Z][a-zA-Z0-9]*)/

/**
 * Detect the component type from the current line.
 * Checks for "as Type" pattern first, then component name at line start.
 */
function detectComponentType(lineText: string): string | null {
  // First check for "as Type" - this takes precedence
  const asMatch = lineText.match(REGEX_AS_TYPE_CONTEXT)
  if (asMatch) {
    const type = asMatch[1]
    return COMPONENT_TYPE_ALIASES[type] || type
  }

  // Then check for component name at line start
  const startMatch = lineText.match(REGEX_COMPONENT_AT_START)
  if (startMatch) {
    const name = startMatch[1]
    return COMPONENT_TYPE_ALIASES[name] || name
  }

  return null
}

/**
 * StateEffect to set the boost context (which property was just completed).
 */
export const setBoostContext = StateEffect.define<string | null>()

/**
 * StateField to track the current boost context.
 * This is set when a picker closes to boost related properties.
 */
export const boostContextField = StateField.define<string | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setBoostContext)) {
        return effect.value
      }
    }
    // Clear boost context when user types (after the initial autocomplete)
    if (tr.docChanged && value !== null) {
      return null
    }
    return value
  },
})

/**
 * Track pending autocomplete boost timers per editor view for cleanup.
 */
const pendingBoostTimers = new WeakMap<EditorView, ReturnType<typeof setTimeout>>()

/**
 * Trigger autocomplete with property boost context.
 * Call this after a picker closes to show related properties first.
 *
 * @param view - The editor view
 * @param property - The property that was just completed (e.g., 'font')
 */
export function triggerAutocompleteWithBoost(view: EditorView, property: string): void {
  // Cancel any pending boost timer for this view
  const existingTimer = pendingBoostTimers.get(view)
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer)
  }

  // Set the boost context
  view.dispatch({
    effects: setBoostContext.of(property),
  })

  // Trigger autocomplete after a short delay to let the state settle
  const timer = setTimeout(() => {
    pendingBoostTimers.delete(view)
    // Check if view is still valid (not destroyed)
    if (view.dom?.isConnected) {
      startCompletion(view)
    }
  }, 50)
  pendingBoostTimers.set(view, timer)
}

export interface DSLAutocompleteOptions {
  onValuePickerNeeded?: (picker: ValuePickerType, property?: string) => void
  getDesignTokens?: () => Map<string, unknown>
  /** Return true to suppress autocomplete (e.g., when inline panel is open) */
  isAutocompleteSuppressed?: () => boolean
  /** Return true for long form (padding), false for short form (pad). Default: true */
  getExpandShorthand?: () => boolean
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
const scoreCache = new LRUCache<string, number>(FUZZY_SCORE_CACHE_SIZE)

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
 * Cache for empty query results by boost context.
 * Avoids recalculating the same property list repeatedly.
 * Uses LRU to bound memory (max 50 entries covers all boost contexts).
 */
const emptyQueryCache = new LRUCache<string, ScoredProperty[]>(50)

/**
 * Score properties against a search query using weighted multi-field fuzzy search.
 * @param query - The search query
 * @param boostContext - Optional property name to boost related properties (e.g., 'font' boosts size/weight/line)
 * @param componentType - Optional component type to boost type-relevant properties
 */
function scoreProperties(
  query: string,
  boostContext: string | null = null,
  componentType: string | null = null
): ScoredProperty[] {
  // Get boosted properties for the context (after completing a property)
  const boostedProps = boostContext ? PROPERTY_BOOST_GROUPS[boostContext] ?? [] : []
  const boostSet = new Set(boostedProps)

  // Get type-relevant properties for the component
  const typeProps = componentType ? COMPONENT_TYPE_PROPERTIES[componentType] ?? [] : []
  const typeSet = new Set(typeProps)

  if (!query) {
    // Check cache for empty query results
    // Include component type in cache key for type-specific results
    const cacheKey = `${boostContext ?? '_null_'}:${componentType ?? '_null_'}`
    const cached = emptyQueryCache.get(cacheKey)
    if (cached) return cached

    // No query - show type-relevant and boosted properties first
    const typeRelevant = properties
      .filter(p => typeSet.has(p.name) && !boostSet.has(p.name))
      .map(p => ({ prop: p, score: 800, matchedKeyword: null })) // Type-relevant score
    const boosted = properties
      .filter(p => boostSet.has(p.name))
      .map(p => ({ prop: p, score: 1000, matchedKeyword: null })) // High score for boosted
    const others = properties
      .filter(p => !boostSet.has(p.name) && !typeSet.has(p.name))
      .map(p => ({ prop: p, score: 0, matchedKeyword: null }))
    const result = [...boosted, ...typeRelevant, ...others]
    emptyQueryCache.set(cacheKey, result)
    return result
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
      let score = Math.max(nameScore, keywordScore, descScore, catScore)

      // Boost score for context-related properties (after completing a property)
      if (boostSet.has(prop.name)) {
        score += 500 // Significant boost to appear at top
      }

      // Boost score for type-relevant properties
      if (typeSet.has(prop.name)) {
        score += 300 // Moderate boost for type relevance
      }

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
 * Track pending picker timers per editor view for cleanup.
 * Uses ReturnType<typeof setTimeout> for cross-environment compatibility.
 */
const pendingPickers = new WeakMap<EditorView, ReturnType<typeof setTimeout>>()

/**
 * Get the display name for a property based on the current mode.
 * @param propName The long-form property name (e.g., 'padding')
 * @param toLongForm If true, return long form; if false, return short form
 */
function getPropertyDisplayName(propName: string, toLongForm: boolean): string {
  if (toLongForm) {
    return propName
  }
  // Convert to short form
  return LONG_TO_SHORT[propName] || propName
}

/**
 * Create an apply function that inserts the property and optionally opens a value picker.
 * V1 syntax: inserts "property " with space for value entry.
 */
function createApplyFunction(
  prop: Property,
  onValuePickerNeeded?: (picker: ValuePickerType, property?: string) => void,
  getExpandShorthand?: () => boolean
): Completion['apply'] {
  return (view: EditorView, _completion: Completion, from: number, to: number) => {
    // Cancel any previous pending picker to avoid stacking timeouts
    const existingTimer = pendingPickers.get(view)
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer)
    }

    // Get the appropriate form based on current mode
    const toLongForm = getExpandShorthand?.() ?? true
    const propName = getPropertyDisplayName(prop.syntax, toLongForm)
    // V1 syntax: property value (with space, no colon)
    const insertText = `${propName} `

    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: from + insertText.length }
    })

    // Open value picker after a short delay to let the editor state settle
    if (prop.valuePicker && prop.valuePicker !== 'none' && onValuePickerNeeded) {
      const timerId = setTimeout(() => {
        pendingPickers.delete(view)
        onValuePickerNeeded(prop.valuePicker!, prop.valuePickerProperty)
      }, PICKER_OPEN_DELAY_MS)
      pendingPickers.set(view, timerId)
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
  const match = textBefore.match(REGEX_PROPERTY_TOKEN_CONTEXT)
  if (match) {
    return match[1]
  }
  return null
}

/**
 * Check if the current position is inside an NL prompt block.
 * NL blocks start with "/" at the beginning of a line.
 * Multi-line blocks: all lines from "/" until cursor are part of the block.
 */
function isInsideNLBlock(doc: { lineAt: (pos: number) => { text: string; number: number }; line: (n: number) => { text: string } }, pos: number): boolean {
  const currentLine = doc.lineAt(pos)

  // Check if current line starts with /
  if (/^\s*\//.test(currentLine.text)) {
    return true
  }

  // Check if any previous line in this block starts with /
  // A block continues while lines are non-empty or indented
  for (let lineNum = currentLine.number - 1; lineNum >= 1; lineNum--) {
    const line = doc.line(lineNum)
    const text = line.text

    // Empty line breaks the block
    if (text.trim() === '') {
      return false
    }

    // Found the / start
    if (/^\s*\//.test(text)) {
      return true
    }
  }

  return false
}

/**
 * Create the DSL completion source for CodeMirror autocompletion.
 */
function createDSLCompletionSource(options: DSLAutocompleteOptions) {
  return (context: CompletionContext): CompletionResult | null => {
    // Don't show autocomplete when inline panel (font, icon) is open
    if (options.isAutocompleteSuppressed?.()) return null

    const line = context.state.doc.lineAt(context.pos)
    const textBefore = line.text.slice(0, context.pos - line.from)

    // Don't show autocomplete in NL prompt mode (lines starting with /)
    if (isInsideNLBlock(context.state.doc, context.pos)) return null

    // Don't trigger autocomplete inside strings
    if (isInsideString(textBefore)) return null

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

    // Check if we're after "as " - show library components for casting
    // This check comes BEFORE the early return so it works when no word is typed yet
    const isAfterAsSpace = REGEX_AFTER_AS_SPACE.test(textBefore)
    const textBeforeWord = word ? textBefore.slice(0, textBefore.length - word.text.length) : textBefore
    const isTypingAfterAs = word && REGEX_TYPING_AFTER_AS.test(textBeforeWord)

    if (isAfterAsSpace || isTypingAfterAs) {
      // Show HTML primitives and library components after "as "
      const query = word?.text.toLowerCase() ?? ''

      // HTML primitives supported by the parser (PascalCase)
      const htmlPrimitives = [
        { name: 'Input', detail: 'HTML', description: 'Text input field → <input>' },
        { name: 'Textarea', detail: 'HTML', description: 'Multi-line text → <textarea>' },
        { name: 'Button', detail: 'HTML', description: 'Clickable button → <button>' },
        { name: 'Link', detail: 'HTML', description: 'Hyperlink → <a>' },
        { name: 'Image', detail: 'HTML', description: 'Image → <img>' },
      ]

      const htmlOptions: Completion[] = htmlPrimitives
        .filter(el => !query || el.name.toLowerCase().includes(query))
        .map(el => ({
          label: el.name,
          detail: el.detail,
          info: el.description,
          boost: 10, // Boost HTML primitives to top
          apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
            view.dispatch({
              changes: { from, to, insert: el.name },
              selection: { anchor: from + el.name.length }
            })
          }
        }))

      // Library components
      const components = getAllLibraryComponents()
      const componentOptions: Completion[] = components
        .filter(c => !query || c.name.toLowerCase().includes(query))
        .map(component => ({
          label: component.name,
          detail: component.category,
          info: component.description,
          apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
            view.dispatch({
              changes: { from, to, insert: component.name },
              selection: { anchor: from + component.name.length }
            })
          }
        }))

      const allOptions = [...htmlOptions, ...componentOptions]

      if (allOptions.length > 0) {
        return {
          from: word?.from ?? context.pos,
          filter: false,
          options: allOptions,
        }
      }
    }

    // Don't show autocomplete unless typing or explicitly triggered
    if (!word && !context.explicit) return null

    // Check if we're at the start of a line (only whitespace before the current word)
    // This means we're typing a component name, not a property
    const isAtLineStart = /^\s*$/.test(textBeforeWord)

    if (isAtLineStart) {
      // Show component suggestions
      const query = word?.text.toLowerCase() ?? ''
      const components = getAllLibraryComponents()

      const componentOptions: Completion[] = components
        .filter(c => !query || c.name.toLowerCase().includes(query))
        .map(component => ({
          label: component.name,
          detail: component.category,
          apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
            view.dispatch({
              changes: { from, to, insert: component.name },
              selection: { anchor: from + component.name.length }
            })
          }
        }))

      if (componentOptions.length > 0) {
        return {
          from: word?.from ?? context.pos,
          filter: false,
          options: componentOptions,
        }
      }

      // If no components match, don't show anything at line start
      return null
    }

    // We're after a component name, show properties only
    const query = word?.text.toLowerCase() ?? ''

    // Get boost context from state (set by triggerAutocompleteWithBoost)
    const boostContext = context.state.field(boostContextField, false)

    // Detect component type from the current line for type-specific property boosting
    const componentType = detectComponentType(line.text)

    const scored = scoreProperties(query, boostContext, componentType)

    // Build completion options
    const toLongForm = options.getExpandShorthand?.() ?? true
    const completionOptions: Completion[] = scored.map(({ prop, matchedKeyword }) => {
      // Build a concise detail string
      let detail = prop.description
      if (matchedKeyword) {
        detail = `${matchedKeyword}`
      }

      // Get the appropriate display name based on mode
      const displayName = getPropertyDisplayName(prop.name, toLongForm)

      return {
        label: displayName,
        detail,
        apply: createApplyFunction(prop, options.onValuePickerNeeded, options.getExpandShorthand),
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
    boostContextField,
    autocompletion({
      override: [createDSLCompletionSource(options)],
      activateOnTyping: true,
      selectOnOpen: true,
      maxRenderedOptions: MAX_AUTOCOMPLETE_OPTIONS,
      interactionDelay: 150, // 150ms debounce prevents crash on rapid typing/backspace
    }),
    autocompleteTheme,
  ]
}
