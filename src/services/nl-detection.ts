/**
 * Natural Language Detection for Mirror DSL
 *
 * Detects whether a line is natural language (needs LLM translation)
 * or valid DSL syntax (pass through).
 *
 * Design Goals:
 * 1. High precision: Never translate valid DSL
 * 2. Good recall: Catch most natural language patterns
 * 3. Fast: No LLM calls, pure heuristics + lightweight parsing
 */

import { PROPERTIES, CONTROL_KEYWORDS, EVENT_KEYWORDS, ACTION_KEYWORDS, ANIMATION_KEYWORDS } from '../dsl/properties'
import { parse } from '../parser/parser'

// =============================================================================
// Natural Language Indicators
// =============================================================================

/** German articles - strong NL indicator when at start or in unexpected positions */
const GERMAN_ARTICLES = new Set([
  'ein', 'eine', 'einer', 'einem', 'einen', 'eines',
  'der', 'die', 'das', 'den', 'dem', 'des'
])

/** English articles */
const ENGLISH_ARTICLES = new Set(['a', 'an', 'the'])

/** German prepositions - strong NL indicator */
const GERMAN_PREPOSITIONS = new Set([
  'mit', 'ohne', 'für', 'und', 'oder', 'aber', 'von', 'zu', 'nach',
  'bei', 'aus', 'über', 'unter', 'zwischen', 'neben', 'am', 'im', 'an'
])

/** English prepositions that indicate NL */
const ENGLISH_PREPOSITIONS = new Set([
  'with', 'without', 'for', 'and', 'or', 'but', 'from', 'using'
])

/** Request/command verbs - strong indicator of meta-request */
const REQUEST_VERBS = new Set([
  // German - including polite forms
  'bitte', 'erstelle', 'erstell', 'mach', 'mache', 'generiere', 'erzeuge',
  'füge', 'hinzu', 'ändere', 'entferne', 'lösche', 'zeige',
  'baue', 'definiere', 'extrahiere', 'gib', 'schreibe', 'gestalte',
  // English - including polite forms
  'please', 'create', 'make', 'generate', 'add', 'change', 'remove', 'delete',
  'show', 'build', 'define', 'extract', 'write', 'design', 'give'
])

/** Adjectives that typically precede nouns in NL (not in DSL) */
const DESCRIPTIVE_ADJECTIVES = new Set([
  // German colors
  'rot', 'roter', 'rote', 'rotes', 'rotem', 'roten',
  'blau', 'blauer', 'blaue', 'blaues', 'blauem', 'blauen',
  'grün', 'grüner', 'grüne', 'grünes', 'grünem', 'grünen',
  'gelb', 'gelber', 'gelbe', 'gelbes', 'gelbem', 'gelben',
  'schwarz', 'schwarzer', 'schwarze', 'schwarzes', 'schwarzem', 'schwarzen',
  'weiß', 'weißer', 'weiße', 'weißes', 'weißem', 'weißen',
  'grau', 'grauer', 'graue', 'graues', 'grauem', 'grauen',
  // English colors
  'red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey',
  // German size
  'groß', 'großer', 'große', 'großes', 'großem', 'großen',
  'klein', 'kleiner', 'kleine', 'kleines', 'kleinem', 'kleinen',
  // English size
  'big', 'small', 'large', 'tiny', 'huge'
])

/** Known component names in Mirror DSL */
const COMPONENT_NAMES = new Set([
  'Box', 'Text', 'Button', 'Card', 'Input', 'Form', 'Image', 'Icon',
  'Link', 'Textarea', 'Panel', 'Header', 'Footer', 'Sidebar', 'Nav',
  'Menu', 'Item', 'List', 'Grid', 'Row', 'Column', 'Stack', 'Group',
  'Modal', 'Dialog', 'Dropdown', 'Tabs', 'Tab', 'Accordion', 'Badge',
  'Avatar', 'Tooltip', 'Alert', 'Notification', 'Spinner', 'Progress',
  'Slider', 'Switch', 'Toggle', 'Checkbox', 'Radio', 'Select', 'Option',
  'Table', 'Segment'
])

// =============================================================================
// Detection Logic
// =============================================================================

export interface DetectionResult {
  isNaturalLanguage: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * Detect if a line is natural language that needs translation.
 *
 * @param line The line to analyze
 * @returns Detection result with confidence and reason
 */
export function detectNaturalLanguage(line: string): DetectionResult {
  const trimmed = line.trim()

  // Empty lines - skip
  if (!trimmed) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'empty line' }
  }

  // Comments - always skip
  if (trimmed.startsWith('//')) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'comment' }
  }

  // Section headers - skip
  if (trimmed.startsWith('---') && trimmed.endsWith('---')) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'section header' }
  }

  // Token definitions ($name: value) - valid DSL
  if (/^\$[a-zA-Z][\w-]*\s*:/.test(trimmed)) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'token definition' }
  }

  // Component definitions (Name: { or Name: properties)
  if (/^[A-Z][a-zA-Z0-9]*\s*:\s*[\{\w]/.test(trimmed)) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'component definition' }
  }

  // List items starting with -
  if (trimmed.startsWith('-') && /^-\s*[A-Z]/.test(trimmed)) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'list item' }
  }

  // Control flow keywords at start
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase()
  if (CONTROL_KEYWORDS.has(firstWord)) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'control keyword' }
  }

  // Events block or state block
  if (firstWord === 'events' || firstWord === 'state') {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'DSL block keyword' }
  }

  // Event handlers (onclick:, onhover:, etc.)
  if (EVENT_KEYWORDS.has(firstWord) || EVENT_KEYWORDS.has(firstWord.replace(':', ''))) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'event handler' }
  }

  // Tokenize for word-level analysis
  const words = trimmed.toLowerCase().split(/\s+/)

  // Check for strong NL indicators

  // 1. Starts with article → definitely NL
  if (GERMAN_ARTICLES.has(words[0]) || ENGLISH_ARTICLES.has(words[0])) {
    return { isNaturalLanguage: true, confidence: 'high', reason: 'starts with article' }
  }

  // 2. Starts with request verb → likely NL (meta-request)
  // BUT: check if it's an action keyword followed by PascalCase (valid DSL)
  if (REQUEST_VERBS.has(words[0])) {
    // "show Dropdown", "hide Modal" are valid DSL actions
    if (ACTION_KEYWORDS.has(words[0]) && words.length >= 2) {
      const secondWord = trimmed.split(/\s+/)[1] // Keep original case
      if (/^[A-Z][a-zA-Z0-9]*$/.test(secondWord)) {
        return { isNaturalLanguage: false, confidence: 'high', reason: 'action with target' }
      }
    }
    return { isNaturalLanguage: true, confidence: 'high', reason: 'request verb' }
  }

  // 3. Contains prepositions that don't make sense in DSL
  // "mit", "with", "für", "for" in middle of line
  for (let i = 1; i < words.length; i++) {
    if (GERMAN_PREPOSITIONS.has(words[i]) || ENGLISH_PREPOSITIONS.has(words[i])) {
      // Exception: "and" can appear in conditions (not vs and)
      // Exception: "or" can appear in conditions
      if (words[i] !== 'and' && words[i] !== 'or') {
        return { isNaturalLanguage: true, confidence: 'high', reason: `contains preposition: ${words[i]}` }
      }
    }
  }

  // 4. Descriptive adjective before a component-like word
  // "roter button", "blue card"
  for (let i = 0; i < words.length - 1; i++) {
    if (DESCRIPTIVE_ADJECTIVES.has(words[i])) {
      const nextWord = words[i + 1]
      // Check if next word could be a component (capitalize first letter to check)
      const capitalized = nextWord.charAt(0).toUpperCase() + nextWord.slice(1)
      if (COMPONENT_NAMES.has(capitalized) || /^[a-z]+$/.test(nextWord)) {
        return { isNaturalLanguage: true, confidence: 'high', reason: 'adjective before noun' }
      }
    }
  }

  // 5. Numbers with German/English text
  // "3 buttons", "zwei spalten"
  const germanNumbers = ['zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn']
  if (germanNumbers.includes(words[0])) {
    return { isNaturalLanguage: true, confidence: 'high', reason: 'German number' }
  }

  // Now check if it looks like valid DSL

  // Starts with PascalCase (component name)
  if (/^[A-Z][a-zA-Z0-9]*/.test(trimmed)) {
    // Check if the rest looks like DSL properties
    const afterComponent = trimmed.replace(/^[A-Z][a-zA-Z0-9]*\s*/, '')

    // Has valid DSL structure: { } or property: value or boolean properties
    if (afterComponent.startsWith('{') ||
        afterComponent.startsWith('named ') ||
        /^[a-z-]+\s*:/.test(afterComponent) ||
        /^[a-z-]+\s+\d/.test(afterComponent) ||
        /^[a-z-]+\s+#/.test(afterComponent) ||
        /^[a-z-]+\s+\$/.test(afterComponent) ||
        PROPERTIES.has(afterComponent.split(/\s+/)[0]) ||
        afterComponent.startsWith('"')) {
      return { isNaturalLanguage: false, confidence: 'high', reason: 'valid DSL structure' }
    }

    // Just a component name alone - could be either
    if (!afterComponent || /^"[^"]*"$/.test(afterComponent)) {
      return { isNaturalLanguage: false, confidence: 'medium', reason: 'component with optional content' }
    }
  }

  // Check for property patterns (lowercase with : or number)
  if (/^[a-z-]+\s*:\s*/.test(trimmed) || /^[a-z-]+\s+\d+/.test(trimmed)) {
    const propName = trimmed.split(/[\s:]/)[0]
    if (PROPERTIES.has(propName)) {
      return { isNaturalLanguage: false, confidence: 'high', reason: 'property assignment' }
    }
  }

  // Action keywords at start
  if (ACTION_KEYWORDS.has(firstWord)) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'action keyword' }
  }

  // Animation keywords
  if (ANIMATION_KEYWORDS.has(firstWord)) {
    return { isNaturalLanguage: false, confidence: 'high', reason: 'animation keyword' }
  }

  // If we reach here, it's ambiguous - lean towards NL in NL mode
  // But with lower confidence

  // Check for any German/English NL words
  const nlWordCount = words.filter(w =>
    GERMAN_ARTICLES.has(w) ||
    ENGLISH_ARTICLES.has(w) ||
    GERMAN_PREPOSITIONS.has(w) ||
    ENGLISH_PREPOSITIONS.has(w) ||
    REQUEST_VERBS.has(w) ||
    DESCRIPTIVE_ADJECTIVES.has(w)
  ).length

  if (nlWordCount > 0) {
    return { isNaturalLanguage: true, confidence: 'medium', reason: `contains ${nlWordCount} NL indicator(s)` }
  }

  // All lowercase without DSL patterns - likely NL
  if (/^[a-z\s]+$/.test(trimmed) && !PROPERTIES.has(firstWord) && !ACTION_KEYWORDS.has(firstWord)) {
    return { isNaturalLanguage: true, confidence: 'low', reason: 'all lowercase, no DSL patterns' }
  }

  // Default: assume DSL (user can manually trigger translation)
  return { isNaturalLanguage: false, confidence: 'low', reason: 'no clear NL indicators' }
}

/**
 * Simple boolean check for shouldTranslate replacement.
 * Uses medium+ confidence threshold.
 */
export function isNaturalLanguageLine(line: string): boolean {
  const result = detectNaturalLanguage(line)

  // Translate if NL with at least medium confidence
  // Or if DSL detection has low confidence (ambiguous)
  if (result.isNaturalLanguage && result.confidence !== 'low') {
    return true
  }

  // Don't translate DSL
  return false
}

/**
 * Check if line should be translated in hybrid mode.
 * Combines parser-based detection with heuristics:
 * 1. If parser produces errors → LLM
 * 2. If line looks like natural language (heuristics) → LLM
 * 3. If component name is a typo → LLM
 */
export function shouldTranslateHybrid(line: string): boolean {
  const trimmed = line.trim()

  // Skip empty lines, comments, headers
  if (!trimmed || trimmed.startsWith('//') || (trimmed.startsWith('---') && trimmed.endsWith('---'))) {
    return false
  }

  // Skip token definitions ($name: value)
  if (/^\$[a-zA-Z][\w-]*\s*:/.test(trimmed)) {
    return false
  }

  // Skip indented lines (children, properties, states) - they depend on context
  if (line.startsWith('  ') || line.startsWith('\t')) {
    return false
  }

  // First: Check heuristics for clear natural language patterns
  // This catches "Please create...", "erstelle ein...", "toolbar mit..." etc.
  const nlDetection = detectNaturalLanguage(line)
  if (nlDetection.isNaturalLanguage && nlDetection.confidence === 'high') {
    return true
  }

  try {
    const result = parse(line)

    // 1. Parse errors → needs LLM
    if (result.errors && result.errors.length > 0) {
      return true
    }

    // 2. No nodes AND no registry entries → needs LLM
    // (Definitions produce registry entries but no nodes)
    const hasNodes = result.nodes && result.nodes.length > 0
    const hasRegistry = result.registry && result.registry.size > 0
    if (!hasNodes && !hasRegistry) {
      return true
    }

    // 3. Check if first word is a known component or a definition
    const firstWord = trimmed.split(/[\s:,]/)[0]
    const isDefinition = trimmed.includes(':') && /^[A-Z]/.test(firstWord)
    const isListItem = trimmed.startsWith('-')

    // If it starts with PascalCase but is not a known component and not a definition
    if (/^[A-Z][a-zA-Z0-9]*$/.test(firstWord) &&
        !COMPONENT_NAMES.has(firstWord) &&
        !isDefinition &&
        !isListItem) {
      // Could be a typo like "Buttn" - check if it's similar to a known component
      const similarComponent = findSimilarComponent(firstWord)
      if (similarComponent) {
        return true // Likely a typo
      }
    }

    // Valid DSL - don't translate
    return false
  } catch {
    // Parse exception → needs LLM
    return true
  }
}

/**
 * Find a similar component name (for typo detection)
 */
function findSimilarComponent(name: string): string | null {
  const nameLower = name.toLowerCase()
  for (const comp of COMPONENT_NAMES) {
    const compLower = comp.toLowerCase()
    // Check if it's a close match (e.g., "Buttn" vs "Button")
    if (levenshteinDistance(nameLower, compLower) <= 2) {
      return comp
    }
  }
  return null
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}
