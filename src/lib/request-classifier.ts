/**
 * Request Classifier
 *
 * Classifies user prompts as CREATE or MODIFY to route them
 * to the appropriate generation pipeline.
 */

export type RequestType = 'create' | 'modify'

export interface ClassificationResult {
  type: RequestType
  confidence: number
  signals: string[]
}

// =============================================================================
// Pattern Definitions
// =============================================================================

const CREATE_PATTERNS = [
  // German
  /\berstell(e|en)\b/i,
  /\bbau(e|en)\b/i,
  /\bmach(e|en)?\s+(mir\s+)?(ein|eine|einen)\b/i,
  /\bneue?[srm]?\b/i,
  /\bdesign(e|en)?\b/i,
  /\bgenerier(e|en)?\b/i,
  /\bzeig(e|en)?\s+(mir\s+)?(ein|eine|einen)\b/i,
  // English
  /\bcreate\b/i,
  /\bbuild\b/i,
  /\bmake\s+(me\s+)?(a|an)\b/i,
  /\bgenerate\b/i,
  /\bdesign\b/i,
  /\bshow\s+(me\s+)?(a|an)\b/i,
  /\bnew\b/i,
  // Implicit create patterns (describing what to build)
  /^(ein|eine|einen|a|an)\s+\w+/i,
  /\bwith\s+\d+\s+\w+/i,  // "with 3 buttons"
  /\bmit\s+\d+\s+\w+/i,   // "mit 3 buttons"
]

const MODIFY_PATTERNS = [
  // German
  /\bänder(e|n|st)?\b/i,
  /\bändere?\b/i,
  /\bmach(e|en)?\s+(den|die|das|es|ihn|sie)\b/i,
  /\bsetz(e|en)?\s+(den|die|das)\b/i,
  /\bfärb(e|en)?\b/i,
  /\bverschieb(e|en)?\b/i,
  /\bentfern(e|en)?\b/i,
  /\blösch(e|en)?\b/i,
  /\bhinzufüg(e|en)?\b/i,
  /\bfüg(e|en)?\s+.+\s+hinzu\b/i,
  /\bvergrößer(e|n)?\b/i,
  /\bverkleinern?\b/i,
  /\bersetze?\b/i,
  /\baktualisier(e|en)?\b/i,
  // English
  /\bchange\b/i,
  /\bmodify\b/i,
  /\bupdate\b/i,
  /\bedit\b/i,
  /\bmake\s+(it|the|this)\b/i,
  /\bset\s+(the|it|this)\b/i,
  /\badd\s+(a|an|the|to)\b/i,
  /\bremove\b/i,
  /\bdelete\b/i,
  /\bmove\b/i,
  /\bresize\b/i,
  /\breplace\b/i,
  /\bfix\b/i,
  /\badjust\b/i,
  // Color modifications
  /\b(rot|blau|grün|gelb|orange|pink|lila|schwarz|weiß|grau)\b/i,
  /\b(red|blue|green|yellow|orange|pink|purple|black|white|gray)\b/i,
  /\bdunkler\b/i,
  /\bheller\b/i,
  /\bdarker\b/i,
  /\blighter\b/i,
  // Size modifications
  /\bgrößer\b/i,
  /\bkleiner\b/i,
  /\bbigger\b/i,
  /\bsmaller\b/i,
  /\blarger\b/i,
  // Reference patterns (implies existing element)
  /\bden\s+(button|text|card|box|input)\b/i,
  /\bdie\s+(karte|box|komponente)\b/i,
  /\bthe\s+(button|text|card|box|input)\b/i,
]

// Patterns that strongly indicate existing code context
const CONTEXT_REFERENCE_PATTERNS = [
  /\boben\b/i,         // "oben" (top)
  /\bunten\b/i,        // "unten" (bottom)
  /\blinks\b/i,        // "links" (left)
  /\brechts\b/i,       // "rechts" (right)
  /\bdaneben\b/i,      // "daneben" (next to)
  /\bdarunter\b/i,     // "darunter" (below)
  /\bdarüber\b/i,      // "darüber" (above)
  /\bden\s+ersten?\b/i, // "den ersten" (the first)
  /\bden\s+letzten?\b/i, // "den letzten" (the last)
  /\bdie\s+erste?\b/i,  // "die erste" (the first)
  /\bthe\s+first\b/i,
  /\bthe\s+last\b/i,
  /\babove\b/i,
  /\bbelow\b/i,
  /\bnext\s+to\b/i,
]

// =============================================================================
// Classifier
// =============================================================================

/**
 * Classify a user request as CREATE or MODIFY
 *
 * @param userPrompt - The user's request text
 * @param existingCode - Existing Mirror code (if any)
 * @returns Classification result with type, confidence, and signals
 */
export function classifyRequest(
  userPrompt: string,
  existingCode: string
): ClassificationResult {
  const signals: string[] = []
  let createScore = 0
  let modifyScore = 0

  // Normalize prompt
  const prompt = userPrompt.toLowerCase().trim()

  // Check CREATE patterns
  for (const pattern of CREATE_PATTERNS) {
    if (pattern.test(prompt)) {
      createScore += 1
      const match = prompt.match(pattern)?.[0]
      if (match) signals.push(`CREATE pattern: "${match}"`)
    }
  }

  // Check MODIFY patterns
  for (const pattern of MODIFY_PATTERNS) {
    if (pattern.test(prompt)) {
      modifyScore += 2  // MODIFY patterns are weighted higher
      const match = prompt.match(pattern)?.[0]
      if (match) signals.push(`MODIFY pattern: "${match}"`)
    }
  }

  // Check context reference patterns
  for (const pattern of CONTEXT_REFERENCE_PATTERNS) {
    if (pattern.test(prompt)) {
      modifyScore += 1
      const match = prompt.match(pattern)?.[0]
      if (match) signals.push(`Context reference: "${match}"`)
    }
  }

  // Existing code analysis
  const hasExistingCode = existingCode.trim().length > 0
  if (hasExistingCode) {
    // Count lines and components in existing code
    const lines = existingCode.split('\n').filter(l => l.trim()).length
    const hasComponents = /^\w+[:\s{]/.test(existingCode.trim())

    if (lines > 3 && hasComponents) {
      modifyScore += 2
      signals.push(`Existing code: ${lines} lines`)
    } else if (lines > 0) {
      modifyScore += 1
      signals.push('Existing code present')
    }
  } else {
    // No existing code strongly favors CREATE
    createScore += 3
    signals.push('No existing code')
  }

  // Short prompts without explicit patterns
  // "button rot" → modify if code exists, create if not
  if (prompt.split(/\s+/).length <= 3 && createScore === 0 && modifyScore === 0) {
    if (hasExistingCode) {
      modifyScore += 1
      signals.push('Short prompt with existing code')
    } else {
      createScore += 1
      signals.push('Short prompt without code')
    }
  }

  // Calculate result
  const totalScore = createScore + modifyScore
  const type: RequestType = modifyScore > createScore ? 'modify' : 'create'
  const confidence = totalScore === 0
    ? 0.5  // No signals → neutral
    : Math.abs(createScore - modifyScore) / totalScore

  return {
    type,
    confidence: Math.min(confidence, 1),
    signals,
  }
}

/**
 * Quick check if a request is likely a CREATE request
 */
export function isCreateRequest(userPrompt: string, existingCode: string): boolean {
  return classifyRequest(userPrompt, existingCode).type === 'create'
}

/**
 * Quick check if a request is likely a MODIFY request
 */
export function isModifyRequest(userPrompt: string, existingCode: string): boolean {
  return classifyRequest(userPrompt, existingCode).type === 'modify'
}
