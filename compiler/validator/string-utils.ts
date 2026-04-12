/**
 * String Utility Functions
 *
 * Levenshtein distance and suggestion utilities for the validator.
 */

/**
 * Calculate Levenshtein distance between two strings.
 * Used for "Did you mean...?" suggestions.
 */
export function levenshtein(a: string, b: string): number {
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Find the most similar candidate to input string.
 * Returns undefined if no candidate is within maxDistance.
 *
 * @param input The input string to match
 * @param candidates Iterable of candidate strings
 * @param maxDistance Maximum Levenshtein distance (default 3)
 * @returns The most similar candidate or undefined
 */
export function suggestSimilar(
  input: string,
  candidates: Iterable<string>,
  maxDistance = 3
): string | undefined {
  let best: string | undefined
  let bestDistance = Infinity

  for (const candidate of candidates) {
    const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase())
    if (distance < bestDistance && distance <= maxDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  return best
}
