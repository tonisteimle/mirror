/**
 * Fuzzy search utilities using Levenshtein distance.
 * Extracted from PropertyPicker for reuse.
 */

/**
 * Calculate Levenshtein distance between two strings.
 * Measures the minimum number of single-character edits needed
 * to transform one string into the other.
 */
export function levenshteinDistance(a: string, b: string): number {
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
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate fuzzy match score between search term and target.
 * Returns a score between 0 and 1, where higher is better.
 *
 * @param search - The search query
 * @param target - The target string to match against
 * @returns Score from 0 (no match) to 1 (exact match)
 */
export function fuzzyScore(search: string, target: string): number {
  const s = search.toLowerCase()
  const t = target.toLowerCase()

  // Exact match
  if (t === s) return 1

  // Starts with search term
  if (t.startsWith(s)) return 0.95

  // Contains search term
  if (t.includes(s)) return 0.85

  // Fuzzy match with Levenshtein
  const distance = levenshteinDistance(s, t)
  const maxLen = Math.max(s.length, t.length)

  // Allow up to 2 character difference for short words, 3 for longer
  const threshold = s.length <= 4 ? 2 : 3

  if (distance <= threshold) {
    return 0.7 - (distance / maxLen) * 0.3
  }

  // Check if search matches start of target with typos
  if (t.length >= s.length) {
    const targetStart = t.substring(0, s.length + 1)
    const startDistance = levenshteinDistance(s, targetStart)
    if (startDistance <= 2) {
      return 0.5 - (startDistance / maxLen) * 0.2
    }
  }

  return 0
}

/**
 * Filter and score items using fuzzy matching.
 *
 * @param items - Array of items to search
 * @param query - Search query
 * @param getSearchableStrings - Function to get searchable strings from an item
 * @returns Sorted array of items with scores, filtered to matches only
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getSearchableStrings: (item: T) => string[]
): Array<{ item: T; score: number; matchedString: string | null }> {
  const q = query.trim().toLowerCase()

  if (!q) {
    return items.map(item => ({ item, score: 0, matchedString: null }))
  }

  return items
    .map(item => {
      const searchable = getSearchableStrings(item)
      let bestScore = 0
      let matchedString: string | null = null

      for (const str of searchable) {
        const score = fuzzyScore(q, str)
        if (score > bestScore) {
          bestScore = score
          matchedString = str
        }
      }

      return { item, score: bestScore, matchedString }
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
}

/**
 * Find the closest match from a set of candidates.
 *
 * @param input - The input string to match
 * @param candidates - Set or array of candidate strings
 * @param maxDistance - Maximum Levenshtein distance to consider (default: 3)
 * @returns The best match and its distance, or null if no match within threshold
 */
export function findClosestMatch(
  input: string,
  candidates: Set<string> | string[],
  maxDistance: number = 3
): { match: string | null; distance: number } {
  let bestMatch: string | null = null
  let bestDistance = Infinity

  const candidateArray = Array.isArray(candidates) ? candidates : Array.from(candidates)

  for (const candidate of candidateArray) {
    const distance = levenshteinDistance(input.toLowerCase(), candidate.toLowerCase())
    if (distance < bestDistance && distance <= maxDistance) {
      bestDistance = distance
      bestMatch = candidate
    }
  }

  return { match: bestMatch, distance: bestDistance }
}

/**
 * Check if two strings are similar (within Levenshtein threshold).
 *
 * @param a - First string
 * @param b - Second string
 * @param threshold - Maximum distance to consider similar (default: 2)
 * @returns True if strings are within threshold distance
 */
export function areSimilar(a: string, b: string, threshold: number = 2): boolean {
  return levenshteinDistance(a.toLowerCase(), b.toLowerCase()) <= threshold
}
