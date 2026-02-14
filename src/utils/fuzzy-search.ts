/**
 * Fuzzy search utilities using Levenshtein distance.
 * Extracted from PropertyPicker for reuse.
 */

/**
 * Calculate Levenshtein distance between two strings.
 * Measures the minimum number of single-character edits needed
 * to transform one string into the other.
 *
 * Optimized implementation:
 * - Uses two rows instead of full matrix (O(min(m,n)) space)
 * - Optional early termination when max distance exceeded
 * - Quick return for length-based bounds
 */
export function levenshteinDistance(a: string, b: string, maxDistance?: number): number {
  // Quick checks
  if (a === b) return 0
  if (a.length === 0) return maxDistance !== undefined && b.length > maxDistance ? maxDistance + 1 : b.length
  if (b.length === 0) return maxDistance !== undefined && a.length > maxDistance ? maxDistance + 1 : a.length

  // Ensure a is the shorter string for space optimization
  if (a.length > b.length) {
    [a, b] = [b, a]
  }

  const aLen = a.length
  const bLen = b.length

  // Early termination if length difference exceeds max distance
  if (maxDistance !== undefined && bLen - aLen > maxDistance) {
    return maxDistance + 1
  }

  // Use two rows instead of full matrix (O(n) space)
  let prevRow = new Array(aLen + 1)
  let currRow = new Array(aLen + 1)

  // Initialize first row
  for (let j = 0; j <= aLen; j++) {
    prevRow[j] = j
  }

  // Fill in the matrix row by row
  for (let i = 1; i <= bLen; i++) {
    currRow[0] = i
    let minInRow = i // Track minimum value in current row for early termination

    for (let j = 1; j <= aLen; j++) {
      const cost = b.charCodeAt(i - 1) === a.charCodeAt(j - 1) ? 0 : 1
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      )
      if (currRow[j] < minInRow) {
        minInRow = currRow[j]
      }
    }

    // Early termination: if minimum possible distance exceeds max, return early
    if (maxDistance !== undefined && minInRow > maxDistance) {
      return maxDistance + 1
    }

    // Swap rows
    ;[prevRow, currRow] = [currRow, prevRow]
  }

  return prevRow[aLen]
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
  // Allow up to 2 character difference for short words, 3 for longer
  const threshold = s.length <= 4 ? 2 : 3
  const distance = levenshteinDistance(s, t, threshold)
  const maxLen = Math.max(s.length, t.length)

  if (distance <= threshold) {
    return 0.7 - (distance / maxLen) * 0.3
  }

  // Check if search matches start of target with typos
  if (t.length >= s.length) {
    const targetStart = t.substring(0, s.length + 1)
    const startDistance = levenshteinDistance(s, targetStart, 2)
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
  let bestDistance = maxDistance + 1

  const candidateArray = Array.isArray(candidates) ? candidates : Array.from(candidates)
  const inputLower = input.toLowerCase()

  for (const candidate of candidateArray) {
    // Use bestDistance as maxDistance for early termination
    const distance = levenshteinDistance(inputLower, candidate.toLowerCase(), bestDistance - 1)
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = candidate
      // Perfect match found, no need to continue
      if (distance === 0) break
    }
  }

  return { match: bestMatch, distance: bestDistance <= maxDistance ? bestDistance : Infinity }
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
  return levenshteinDistance(a.toLowerCase(), b.toLowerCase(), threshold) <= threshold
}
