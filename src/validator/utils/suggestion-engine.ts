/**
 * Suggestion Engine
 *
 * Fuzzy matching and "Did you mean?" suggestions for validation errors.
 */

import type { FixSuggestion } from '../types'

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length

  // Create distance matrix
  const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  // Initialize first row and column
  for (let i = 0; i <= m; i++) d[i][0] = i
  for (let j = 0; j <= n; j++) d[0][j] = j

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return d[m][n]
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen
}

export interface SuggestionMatch {
  value: string
  score: number
}

/**
 * Find similar strings from a list of candidates
 */
export function findSimilar(
  input: string,
  candidates: string[] | Set<string>,
  options: {
    maxResults?: number
    minScore?: number
  } = {}
): SuggestionMatch[] {
  const { maxResults = 3, minScore = 0.4 } = options

  const candidateArray = Array.isArray(candidates) ? candidates : Array.from(candidates)
  const inputLower = input.toLowerCase()

  // Score all candidates
  const matches: SuggestionMatch[] = candidateArray
    .map(candidate => ({
      value: candidate,
      score: calculateMatchScore(inputLower, candidate.toLowerCase())
    }))
    .filter(m => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  return matches
}

/**
 * Calculate match score with multiple strategies
 */
function calculateMatchScore(input: string, candidate: string): number {
  // Exact match
  if (input === candidate) return 1

  // Prefix match (high score)
  if (candidate.startsWith(input)) {
    return 0.9 + (input.length / candidate.length) * 0.1
  }

  // Contains match
  if (candidate.includes(input)) {
    return 0.7 + (input.length / candidate.length) * 0.2
  }

  // Levenshtein similarity
  return similarity(input, candidate)
}

/**
 * Create "Did you mean?" suggestion
 */
export function didYouMean(
  input: string,
  candidates: string[] | Set<string>,
  options: { maxResults?: number; minScore?: number } = {}
): FixSuggestion[] {
  const matches = findSimilar(input, candidates, options)

  return matches.map(m => ({
    label: `Did you mean "${m.value}"?`,
    replacement: m.value
  }))
}

/**
 * Get the best match if similarity is high enough
 */
export function getBestMatch(
  input: string,
  candidates: string[] | Set<string>,
  minScore: number = 0.6
): string | undefined {
  const matches = findSimilar(input, candidates, { maxResults: 1, minScore })
  return matches.length > 0 ? matches[0].value : undefined
}

/**
 * Format a "Did you mean?" message
 */
export function formatDidYouMean(input: string, candidates: string[] | Set<string>): string | undefined {
  const matches = findSimilar(input, candidates, { maxResults: 2 })

  if (matches.length === 0) return undefined

  if (matches.length === 1) {
    return `Did you mean "${matches[0].value}"?`
  }

  const suggestions = matches.map(m => `"${m.value}"`).join(' or ')
  return `Did you mean ${suggestions}?`
}

/**
 * Find similar properties considering hyphenated variants
 */
export function findSimilarProperty(
  input: string,
  properties: Set<string>
): SuggestionMatch[] {
  // First try direct matches
  const directMatches = findSimilar(input, properties)
  if (directMatches.length > 0 && directMatches[0].score > 0.7) {
    return directMatches
  }

  // Try without hyphens
  const inputNoHyphen = input.replace(/-/g, '')
  const candidatesNoHyphen = new Map<string, string>()
  for (const prop of properties) {
    candidatesNoHyphen.set(prop.replace(/-/g, ''), prop)
  }

  const noHyphenMatches = findSimilar(inputNoHyphen, Array.from(candidatesNoHyphen.keys()))
  return noHyphenMatches.map(m => ({
    value: candidatesNoHyphen.get(m.value)!,
    score: m.score
  }))
}

/**
 * Get valid options message for error context
 */
export function formatValidOptions(options: string[], maxShow: number = 5): string {
  if (options.length <= maxShow) {
    return `Valid options: ${options.join(', ')}`
  }

  const shown = options.slice(0, maxShow)
  const remaining = options.length - maxShow
  return `Valid options: ${shown.join(', ')} (and ${remaining} more)`
}
