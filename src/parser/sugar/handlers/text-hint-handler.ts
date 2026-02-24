/**
 * @module sugar/handlers/text-hint-handler
 * @description Text Hint Handler - Lorem Ipsum Generierung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Erkennt Text-Hints und generiert Lorem Ipsum mit entsprechender Länge
 *
 * @example
 *   Text 30W          → Text "Lorem ipsum dolor sit amet..." (30 Wörter)
 *   Text kurz         → Text "Lorem ipsum dolor" (3 Wörter)
 *   Text lang         → Text "Lorem ipsum..." (50 Wörter)
 *   Title titel       → Title "Lorem Ipsum Dolor Sit" (4 Wörter)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEXT HINTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @hint kurz      → 3 Wörter
 * @hint mittel    → 15 Wörter
 * @hint lang      → 50 Wörter
 * @hint titel     → 4 Wörter (Title Case)
 * @hint absatz    → 30 Wörter
 * @hint NW        → N Wörter (z.B. 30W → 30 Wörter)
 *
 * @used-by sugar/index.ts
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'
import { isTextComponent } from '../component-type-matcher'

/**
 * Lorem ipsum word bank for generating placeholder text.
 */
const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
]

/**
 * Named text hint mappings.
 * Maps hint keywords to word counts.
 */
const TEXT_HINTS: Map<string, number> = new Map([
  ['kurz', 3],
  ['short', 3],
  ['mittel', 15],
  ['medium', 15],
  ['lang', 50],
  ['long', 50],
  ['titel', 4],
  ['title', 4],
  ['heading', 4],
  ['absatz', 30],
  ['paragraph', 30],
  ['satz', 8],
  ['sentence', 8],
])

/**
 * Generate lorem ipsum text with specified word count.
 */
function generateLoremIpsum(wordCount: number, titleCase: boolean = false): string {
  const words: string[] = []

  for (let i = 0; i < wordCount; i++) {
    const word = LOREM_WORDS[i % LOREM_WORDS.length]
    words.push(word)
  }

  // Capitalize first letter
  if (words.length > 0) {
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
  }

  // Apply title case if requested
  if (titleCase) {
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return words.join(' ')
}

/**
 * Parse word count from hint pattern (e.g., "30W" → 30).
 */
function parseWordCountHint(value: string): number | null {
  const match = value.match(/^(\d+)[wW]$/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

/**
 * Check if a value is a text hint.
 */
function isTextHint(value: string): boolean {
  const lower = value.toLowerCase()
  return TEXT_HINTS.has(lower) || parseWordCountHint(value) !== null
}

/**
 * Text hint handler.
 * Recognizes text hints (kurz, lang, 30W, etc.) and generates lorem ipsum.
 */
export const textHintHandler: SugarHandler = {
  name: 'text-hint',
  priority: 140,
  tokenTypes: ['UNKNOWN_PROPERTY', 'COMPONENT_NAME'],

  canHandle(context: SugarContext): boolean {
    const { node, token } = context

    // Only handle for text-like components (Text, Title, Description, etc.)
    if (!isTextComponent(node)) {
      return false
    }

    // Check if token is a text hint
    return isTextHint(token.value)
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node, token } = context
    const hintValue = token.value.toLowerCase()

    // Consume the hint token
    ctx.advance()

    // Determine word count
    let wordCount: number
    let titleCase = false

    // Check for NW pattern (e.g., 30W)
    const parsedCount = parseWordCountHint(token.value)
    if (parsedCount !== null) {
      wordCount = parsedCount
    } else if (TEXT_HINTS.has(hintValue)) {
      wordCount = TEXT_HINTS.get(hintValue)!
      // Use title case for title hints
      titleCase = hintValue === 'titel' || hintValue === 'title' || hintValue === 'heading'
    } else {
      return { handled: false }
    }

    // Generate lorem ipsum and set as content
    const loremText = generateLoremIpsum(wordCount, titleCase)
    node.content = loremText

    // Clear any existing text children
    node.children = node.children.filter(child => child.name !== '_text')

    return { handled: true }
  }
}
