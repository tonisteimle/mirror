/**
 * Complexity Classifier
 *
 * Analyzes prompts to determine if they require stepwise generation.
 * Runs automatically without user confirmation.
 */

export interface ComplexityResult {
  isComplex: boolean
  confidence: number // 0-1
  reasons: string[]
}

/**
 * Patterns that indicate a complex, multi-component prompt
 */
const COMPLEXITY_PATTERNS = [
  // Multiple groups/sections
  { pattern: /##\s+\w+/g, weight: 0.3, reason: 'Multiple sections (##)' },
  { pattern: /gruppe|group|section|bereich/gi, weight: 0.2, reason: 'Group references' },

  // Multiple components mentioned
  { pattern: /button|input|card|panel|icon|text|label|dropdown|toggle|checkbox/gi, weight: 0.1, reason: 'Multiple component types' },

  // Structural complexity
  { pattern: /oben|unten|links|rechts|daneben|darunter/gi, weight: 0.15, reason: 'Spatial layout instructions' },
  { pattern: /horizontal|vertical|grid/gi, weight: 0.1, reason: 'Layout mode switching' },

  // Conditional behavior
  { pattern: /wenn|falls|if|then|anwählt|auswählt/gi, weight: 0.2, reason: 'Conditional behavior' },

  // Size specifications
  { pattern: /\d+\s*px/gi, weight: 0.05, reason: 'Pixel dimensions' },

  // Lists/enumerations
  { pattern: /^\s*\d+\./gm, weight: 0.15, reason: 'Numbered list items' },
  { pattern: /^\s*[-•]/gm, weight: 0.1, reason: 'Bullet list items' },

  // Professional requirements
  { pattern: /professionell|minimalistisch|modern|clean/gi, weight: 0.1, reason: 'Design quality requirements' },
]

/**
 * Thresholds for complexity classification
 */
const COMPLEXITY_THRESHOLD = 0.5
const MIN_LENGTH_FOR_COMPLEX = 200

/**
 * Classify a prompt's complexity
 */
export function classifyComplexity(prompt: string): ComplexityResult {
  // Short prompts are simple
  if (prompt.length < MIN_LENGTH_FOR_COMPLEX) {
    return {
      isComplex: false,
      confidence: 0.9,
      reasons: ['Prompt is short'],
    }
  }

  let totalScore = 0
  const reasons: string[] = []

  for (const { pattern, weight, reason } of COMPLEXITY_PATTERNS) {
    const matches = prompt.match(pattern)
    if (matches && matches.length > 0) {
      const matchScore = Math.min(matches.length * weight, weight * 3)
      totalScore += matchScore

      if (matches.length > 1) {
        reasons.push(`${reason} (${matches.length}x)`)
      } else {
        reasons.push(reason)
      }
    }
  }

  // Line count as additional signal
  const lineCount = prompt.split('\n').filter(l => l.trim()).length
  if (lineCount > 10) {
    totalScore += 0.2
    reasons.push(`Many lines (${lineCount})`)
  }

  // Normalize score
  const normalizedScore = Math.min(totalScore / 1.5, 1)
  const isComplex = normalizedScore >= COMPLEXITY_THRESHOLD

  return {
    isComplex,
    confidence: isComplex ? normalizedScore : 1 - normalizedScore,
    reasons: reasons.slice(0, 5),
  }
}
