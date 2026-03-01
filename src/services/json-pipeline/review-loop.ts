/**
 * Self-Review Loop for JSON Pipeline
 *
 * After generation, the LLM reviews its own output:
 * 1. Run validation function
 * 2. LLM analyzes errors + does quality review
 * 3. Based on severity:
 *    - CRITICAL: Regenerate from start with feedback
 *    - MINOR: Apply improvements, re-validate, loop
 * 4. Continue until good or max attempts reached
 */

import type { PropertiesJSON, AnalysisContext, ValidationError } from './types'
import { validatePropertiesJSON } from './json-validator'
import { jsonToMirror } from './json-to-mirror'
import { validateMirrorCode } from '../../lib/self-healing'
import { getApiKey } from '../../lib/ai'
import { API } from '../../constants'

// =============================================================================
// Types
// =============================================================================

export interface ReviewResult {
  /** Final JSON after review */
  json: PropertiesJSON
  /** Final Mirror code */
  mirrorCode: string
  /** Whether the result is valid */
  isValid: boolean
  /** Review iterations performed */
  iterations: number
  /** Whether a full regeneration was triggered */
  wasRegenerated: boolean
  /** Remaining issues (if any) */
  remainingIssues: string[]
  /** Total time for review loop */
  durationMs: number
}

export interface ReviewOptions {
  /** Maximum review iterations (default: 3) */
  maxIterations?: number
  /** Maximum full regenerations (default: 1) */
  maxRegenerations?: number
  /** Threshold for "critical" errors triggering regeneration (default: 5) */
  criticalErrorThreshold?: number
  /** Enable debug logging */
  debug?: boolean
}

type ErrorSeverity = 'critical' | 'major' | 'minor' | 'none'

interface ReviewAnalysis {
  severity: ErrorSeverity
  semanticMatch: boolean
  semanticIssues: string[]
  validationErrors: string[]
  qualityIssues: string[]
  suggestedFixes: string[]
  shouldRegenerate: boolean
}

// =============================================================================
// Review System Prompt
// =============================================================================

const REVIEW_SYSTEM_PROMPT = `Du bist ein Code-Reviewer für Mirror DSL.

## DEINE AUFGABE

Analysiere das generierte JSON und den daraus entstehenden Mirror-Code.
Prüfe ob der Code dem ORIGINAL-PROMPT entspricht und identifiziere Probleme.

## ANALYSE-KATEGORIEN

1. **Semantische Fehler** (kritisch):
   - Code entspricht NICHT dem Prompt (z.B. "vertikal" aber Code ist horizontal)
   - Falsche UI-Struktur für die Anforderung
   - Fehlende wesentliche Elemente die im Prompt genannt wurden

2. **Strukturelle Fehler** (kritisch):
   - Fehlende Komponenten-Typen
   - Ungültige Verschachtelung
   - Fehlende Pflicht-Properties

3. **Property-Fehler** (major):
   - Ungültige Property-Namen
   - Falsche Werttypen
   - Fehlende Token-Referenzen

4. **Qualitäts-Issues** (minor):
   - Fehlende hover/focus States
   - Keine semantischen Tokens verwendet
   - Fehlende Accessibility

## OUTPUT FORMAT

Antworte NUR mit JSON:
{
  "severity": "critical" | "major" | "minor" | "none",
  "semanticMatch": true/false,
  "semanticIssues": ["Falls semanticMatch=false: Was stimmt nicht?"],
  "validationErrors": ["Fehler aus Validierung..."],
  "qualityIssues": ["Eigene Beobachtungen..."],
  "suggestedFixes": ["Konkrete Fixes..."],
  "shouldRegenerate": true/false
}

## REGELN

- semanticMatch=false → IMMER shouldRegenerate=true (Code passt nicht zum Prompt!)
- "critical" + shouldRegenerate:true → Code wird komplett neu generiert
- "major"/"minor" → Verbesserungen werden angewendet
- "none" → Code ist gut, keine Änderungen nötig
- WICHTIG: Prüfe zuerst ob "vertikal/horizontal", "Liste/Grid", etc. korrekt umgesetzt wurden`

const IMPROVEMENT_SYSTEM_PROMPT = `Du verbesserst Mirror DSL JSON basierend auf Review-Feedback.

## DEINE AUFGABE

Wende die vorgeschlagenen Fixes auf das JSON an.
Behalte die Grundstruktur bei, korrigiere nur die Probleme.

## OUTPUT FORMAT

Antworte NUR mit dem korrigierten JSON.
Keine Erklärungen, kein Markdown.

## REGELN

1. Behalte alle funktionierenden Teile bei
2. Korrigiere nur die gemeldeten Probleme
3. Verwende valide Property-Namen
4. Verwende Tokens für Farben (isToken: true)
5. Stelle sicher dass horizontale Layouts grow haben`

// =============================================================================
// Main Review Loop
// =============================================================================

/**
 * Run the self-review loop on generated JSON.
 *
 * @param json - Generated PropertiesJSON
 * @param context - Analysis context
 * @param originalPrompt - Original user prompt (for regeneration)
 * @param regenerateCallback - Function to call for full regeneration
 * @param options - Review options
 */
export async function runReviewLoop(
  json: PropertiesJSON,
  context: AnalysisContext,
  originalPrompt: string,
  regenerateCallback: (prompt: string, feedback: string) => Promise<PropertiesJSON>,
  options: ReviewOptions = {}
): Promise<ReviewResult> {
  const startTime = performance.now()
  const {
    maxIterations = 3,
    maxRegenerations = 1,
    criticalErrorThreshold = 5,
    debug = false,
  } = options

  let currentJson = json
  let iterations = 0
  let regenerations = 0
  let wasRegenerated = false

  while (iterations < maxIterations) {
    iterations++

    if (debug) {
      console.debug(`[Review] Iteration ${iterations}/${maxIterations}`)
    }

    // Merge context with tokens defined in JSON
    const mergedContext = mergeContextWithJsonTokens(context, currentJson)

    // Step 1: Validate JSON (with merged context so generated tokens are recognized)
    const jsonValidation = validatePropertiesJSON(currentJson, mergedContext)

    // Step 2: Convert to Mirror and validate
    const mirrorCode = jsonToMirror(currentJson)
    const mirrorValidation = validateMirrorCode(mirrorCode, false, 'de')

    // Collect all errors AND warnings (token issues come as warnings)
    const allErrors = [
      ...jsonValidation.errors.map(e => `JSON Error: ${e.path} - ${e.message}`),
      ...jsonValidation.warnings.map(w => `JSON Warning: ${w.path} - ${w.message}`),
      ...mirrorValidation.issues.map(i => `Mirror L${i.line}: ${i.message}`),
    ]

    if (debug) {
      console.debug(`[Review] Found ${allErrors.length} errors`)
    }

    // Step 3: If no errors, we're done
    if (allErrors.length === 0) {
      return {
        json: currentJson,
        mirrorCode,
        isValid: true,
        iterations,
        wasRegenerated,
        remainingIssues: [],
        durationMs: performance.now() - startTime,
      }
    }

    // Step 4: LLM Review (includes original prompt for semantic checking)
    const review = await analyzeWithLLM(currentJson, mirrorCode, allErrors, originalPrompt, debug)

    if (debug) {
      console.debug(`[Review] LLM Analysis:`, review)
      if (!review.semanticMatch) {
        console.debug(`[Review] ⚠️ SEMANTIC MISMATCH: Code doesn't match prompt!`)
        console.debug(`[Review] Semantic issues:`, review.semanticIssues)
      }
    }

    // Step 5: Decide action based on severity
    if (review.shouldRegenerate && regenerations < maxRegenerations) {
      // Critical errors - regenerate from start
      regenerations++
      wasRegenerated = true

      if (debug) {
        console.debug(`[Review] Triggering full regeneration (${regenerations}/${maxRegenerations})`)
      }

      // Build feedback for regeneration
      const feedback = buildRegenerationFeedback(review)

      try {
        currentJson = await regenerateCallback(originalPrompt, feedback)
      } catch (error) {
        if (debug) {
          console.debug('[Review] Regeneration failed:', error)
        }
        // Continue with current JSON
      }
    } else if (review.severity !== 'none' && (review.suggestedFixes.length > 0 || allErrors.length > 0)) {
      // Minor/major errors - apply improvements
      if (debug) {
        console.debug(`[Review] Applying ${review.suggestedFixes.length} fixes`)
      }

      try {
        // Pass actual validation errors, not LLM's rewrite
        currentJson = await applyImprovements(currentJson, allErrors, review.severity, debug)
      } catch (error) {
        if (debug) {
          console.debug('[Review] Improvement failed:', error)
        }
        // Continue with current JSON
      }
    } else {
      // No more improvements possible
      break
    }
  }

  // Final validation
  const finalMirror = jsonToMirror(currentJson)
  const finalValidation = validateMirrorCode(finalMirror, false, 'de')

  return {
    json: currentJson,
    mirrorCode: finalMirror,
    isValid: finalValidation.valid,
    iterations,
    wasRegenerated,
    remainingIssues: finalValidation.issues.map(i => i.message),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// LLM Analysis
// =============================================================================

async function analyzeWithLLM(
  json: PropertiesJSON,
  mirrorCode: string,
  validationErrors: string[],
  originalPrompt: string,
  debug: boolean
): Promise<ReviewAnalysis> {
  const userPrompt = `## ORIGINAL-PROMPT (Was der User wollte)
"${originalPrompt}"

## GENERIERTES JSON
\`\`\`json
${JSON.stringify(json, null, 2)}
\`\`\`

## RESULTIERENDER MIRROR CODE
\`\`\`
${mirrorCode}
\`\`\`

## VALIDIERUNGSFEHLER
${validationErrors.length > 0 ? validationErrors.map(e => `- ${e}`).join('\n') : 'Keine'}

Analysiere den Code und prüfe:
1. Entspricht der Code dem Original-Prompt? (z.B. "vertikal" = vertical, nicht horizontal)
2. Sind alle vom User genannten Elemente vorhanden?
3. Gibt es technische Fehler?

Gib dein Review als JSON zurück.`

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        'X-Title': 'Mirror JSON Pipeline - Review',
      },
      body: JSON.stringify({
        model: API.MODEL, // Sonnet for better review quality
        messages: [
          { role: 'system', content: REVIEW_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.3, // Lower temperature for more consistent analysis
      }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content || ''

    // Clean up response - extract JSON from markdown if needed
    content = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Try to extract JSON object from response
    let analysis: ReviewAnalysis
    try {
      analysis = JSON.parse(content) as ReviewAnalysis
    } catch {
      // Try to find JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]) as ReviewAnalysis
        } catch {
          throw new Error('Could not parse LLM response as JSON')
        }
      } else {
        throw new Error('No JSON object found in LLM response')
      }
    }

    // Check semantic match - if false, force regeneration
    const semanticMatch = analysis.semanticMatch !== false // default to true if not specified
    const semanticIssues = Array.isArray(analysis.semanticIssues) ? analysis.semanticIssues : []

    // Validate and normalize response structure
    return {
      severity: !semanticMatch ? 'critical' : // Semantic mismatch is always critical
        ['critical', 'major', 'minor', 'none'].includes(analysis.severity)
        ? analysis.severity
        : 'minor',
      semanticMatch,
      semanticIssues,
      validationErrors: Array.isArray(analysis.validationErrors)
        ? analysis.validationErrors
        : validationErrors,
      qualityIssues: Array.isArray(analysis.qualityIssues)
        ? analysis.qualityIssues
        : [],
      suggestedFixes: Array.isArray(analysis.suggestedFixes)
        ? analysis.suggestedFixes
        : [],
      // Force regeneration if semantic mismatch
      shouldRegenerate: !semanticMatch || Boolean(analysis.shouldRegenerate),
    }
  } catch (error) {
    if (debug) {
      console.debug('[Review] LLM analysis failed:', error)
    }

    // Fallback: determine severity from error count
    const severity: ErrorSeverity =
      validationErrors.length > 10 ? 'critical' :
      validationErrors.length > 5 ? 'major' :
      validationErrors.length > 0 ? 'minor' : 'none'

    return {
      severity,
      semanticMatch: true, // Assume match on fallback
      semanticIssues: [],
      validationErrors,
      qualityIssues: [],
      suggestedFixes: [],
      shouldRegenerate: validationErrors.length > 10,
    }
  }
}

// =============================================================================
// Apply Improvements (Deterministic where possible)
// =============================================================================

/**
 * Apply improvements to JSON - prefer deterministic fixes over LLM rewrites.
 * This prevents the LLM from making things worse.
 */
async function applyImprovements(
  json: PropertiesJSON,
  validationErrors: string[],
  severity: ErrorSeverity,
  debug: boolean
): Promise<PropertiesJSON> {
  // Clone the JSON for modification
  const fixed = JSON.parse(JSON.stringify(json)) as PropertiesJSON

  // Apply deterministic fixes first
  let fixCount = 0

  // 1. Fix undefined tokens by adding them to the tokens object
  const undefinedTokens = extractUndefinedTokens(validationErrors)

  if (debug && undefinedTokens.length > 0) {
    console.debug(`[Review] Extracted undefined tokens: ${undefinedTokens.join(', ')}`)
  }

  if (undefinedTokens.length > 0) {
    if (!fixed.tokens) fixed.tokens = {}
    for (const token of undefinedTokens) {
      // Map common semantic token names to reasonable defaults
      const defaultValue = getDefaultTokenValue(token)
      if (defaultValue && !fixed.tokens[token]) {
        fixed.tokens[token] = defaultValue
        fixCount++
        if (debug) console.debug(`[Review] Added missing token: ${token} = ${defaultValue}`)
      } else if (debug && !defaultValue) {
        console.debug(`[Review] No default value for token: ${token}`)
      }
    }
  }

  // 2. If we made deterministic fixes, return without LLM
  if (fixCount > 0) {
    if (debug) console.debug(`[Review] Applied ${fixCount} deterministic fixes`)
    return fixed
  }

  // 3. Only use LLM for complex fixes we can't handle deterministically
  // But be very conservative - often better to leave as-is
  if (severity === 'minor') {
    if (debug) console.debug('[Review] Skipping LLM fixes for minor issues')
    return fixed
  }

  // If we get here, we have complex issues that need LLM
  // But this path is now rarely used
  return fixed
}

/**
 * Extract undefined token names from validation errors.
 */
function extractUndefinedTokens(errors: string[]): string[] {
  const tokens: string[] = []
  for (const error of errors) {
    // Match various patterns for undefined tokens:
    // - JSON Warning: ...value - Token "$primary" not found in design tokens
    // - Mirror L6: Token "$primary" is not defined
    // - Token $text ist nicht definiert
    const patterns = [
      // JSON/Mirror format with quotes: Token "$primary" not found / is not defined
      /[Tt]oken\s+["']\$?(\w+(?:[\.\-]\w+)*)["']\s+(?:is\s+)?(?:not found|not defined)/i,
      // Without quotes: Token $primary not found
      /[Tt]oken\s+\$(\w+(?:[\.\-]\w+)*)\s+(?:is\s+)?(?:not found|not defined)/i,
      // German format
      /[Tt]oken\s+["']?\$?(\w+(?:[\.\-]\w+)*)["']?\s+(?:ist\s+)?nicht\s+definiert/i,
      // Direct $token reference in error message
      /\$(\w+(?:[\.\-]\w+)*)['"]*\s+(?:is\s+)?(?:not found|not defined)/i,
    ]

    for (const pattern of patterns) {
      const match = error.match(pattern)
      if (match) {
        const tokenName = match[1].replace(/^\$/, '')
        if (tokenName && tokenName.length > 1) {
          tokens.push(tokenName)
        }
        break
      }
    }
  }
  return [...new Set(tokens)]
}

/**
 * Get reasonable default values for common semantic token names.
 */
function getDefaultTokenValue(token: string): string | null {
  const defaults: Record<string, string> = {
    // Backgrounds
    'surface': '#1E1E2E',
    'elevated': '#27272A',
    'background': '#18181B',
    'card': '#27272A',
    'card-bg': '#27272A',
    'sidebar-bg': '#1E1E2E',
    'input-bg': '#27272A',
    'hover-bg': '#3F3F46',
    'nav-hover': '#3F3F46',
    'nav-selected': '#3B82F6',
    'item-hover': '#3F3F46',
    'item-active': '#3B82F6',
    // Text colors
    'text': '#E4E4E7',
    'muted': '#71717A',
    'heading': '#FAFAFA',
    'on-primary': '#FFFFFF',
    'on-surface': '#E4E4E7',
    // Status colors
    'danger': '#EF4444',
    'success': '#22C55E',
    'warning': '#F59E0B',
    'error': '#EF4444',
    // Borders
    'border': '#3F3F46',
    'input-border': '#3F3F46',
    'border-focus': '#60A5FA',
    'input-focus': '#60A5FA',
    // Primary
    'primary': '#3B82F6',
    'primary-hover': '#2563EB',
    'primary.hover': '#2563EB',
    'accent': '#3B82F6',
    'accent-hover': '#2563EB',
    // Selected/Active
    'selected': '#3B82F6',
    'active': '#3B82F6',
    'hover': '#3F3F46',
    // Spacing (numeric defaults)
    'spacing-sm': '8',
    'spacing-md': '12',
    'spacing-lg': '16',
    'spacing-xl': '24',
    // Radius
    'radius-sm': '4',
    'radius-md': '8',
    'radius-lg': '12',
    // Icon
    'icon-size': '20',
    'icon-color': '#E4E4E7',
  }

  // Try exact match first
  if (defaults[token]) return defaults[token]

  // Try partial match (e.g., "surface.bg" -> surface)
  const base = token.split('.')[0]
  if (defaults[base]) return defaults[base]

  // Try suffix match (e.g., "nav-item-hover" -> hover-bg)
  const suffixes = ['hover', 'active', 'selected', 'focus', 'bg', 'color', 'border']
  for (const suffix of suffixes) {
    if (token.endsWith(suffix) || token.endsWith(`-${suffix}`)) {
      const suffixDefaults: Record<string, string> = {
        'hover': '#3F3F46',
        'active': '#3B82F6',
        'selected': '#3B82F6',
        'focus': '#60A5FA',
        'bg': '#27272A',
        'color': '#E4E4E7',
        'border': '#3F3F46',
      }
      return suffixDefaults[suffix] || null
    }
  }

  return null
}

// =============================================================================
// Regeneration Feedback Builder
// =============================================================================

function buildRegenerationFeedback(review: ReviewAnalysis): string {
  const parts: string[] = []

  parts.push('Der vorherige Versuch hatte kritische Fehler:')
  parts.push('')

  // Semantic issues are most important - they mean the code doesn't match the prompt
  if (!review.semanticMatch && review.semanticIssues.length > 0) {
    parts.push('SEMANTISCHE FEHLER (Code entspricht nicht dem Prompt!):')
    for (const issue of review.semanticIssues) {
      parts.push(`- ${issue}`)
    }
    parts.push('')
    parts.push('WICHTIG: Bitte lies den Prompt GENAU und achte auf:')
    parts.push('- "vertikal" → vertical (nicht horizontal!)')
    parts.push('- "horizontal" → horizontal')
    parts.push('- "Liste" → Mehrere Kinder untereinander')
    parts.push('')
  }

  if (review.validationErrors.length > 0) {
    parts.push('VALIDIERUNGSFEHLER:')
    for (const error of review.validationErrors.slice(0, 5)) {
      parts.push(`- ${error}`)
    }
    if (review.validationErrors.length > 5) {
      parts.push(`- ... und ${review.validationErrors.length - 5} weitere`)
    }
    parts.push('')
  }

  if (review.qualityIssues.length > 0) {
    parts.push('QUALITÄTSPROBLEME:')
    for (const issue of review.qualityIssues.slice(0, 3)) {
      parts.push(`- ${issue}`)
    }
    parts.push('')
  }

  parts.push('BITTE BEACHTEN:')
  parts.push('- Verwende nur gültige Property-Namen (padding, background, color, etc.)')
  parts.push('- Verwende Tokens für Farben (isToken: true)')
  parts.push('- Kinder in horizontal Layout brauchen grow: true')
  parts.push('- Komponenten-Typen in PascalCase')

  return parts.join('\n')
}

// =============================================================================
// Context Merging
// =============================================================================

/**
 * Merge context with tokens defined in the JSON output.
 * This ensures tokens defined by the LLM are recognized as valid.
 */
function mergeContextWithJsonTokens(
  context: AnalysisContext,
  json: PropertiesJSON
): AnalysisContext {
  if (!json.tokens || Object.keys(json.tokens).length === 0) {
    return context
  }

  // Clone context
  const merged = { ...context }

  // Add tokens from JSON to the context tokens list
  const existingTokenNames = new Set(context.tokens.map(t => t.name.replace(/^\$/, '')))
  const additionalTokens = Object.entries(json.tokens)
    .filter(([name]) => !existingTokenNames.has(name.replace(/^\$/, '')))
    .map(([name, value]) => ({
      name: name.startsWith('$') ? name : `$${name}`,
      value: String(value),
      type: (typeof value === 'number' ? 'number' : value.startsWith('#') ? 'color' : 'string') as 'color' | 'number' | 'string',
      usedBy: [] as string[],
    }))

  merged.tokens = [...context.tokens, ...additionalTokens]

  return merged
}

// =============================================================================
// Quick Validation (without LLM)
// =============================================================================

/**
 * Quick validation without LLM review.
 * Use for fast feedback during development.
 */
export function quickValidate(
  json: PropertiesJSON,
  context: AnalysisContext
): {
  isValid: boolean
  errorCount: number
  severity: ErrorSeverity
  errors: string[]
} {
  // Create merged context that includes tokens defined in the JSON
  const mergedContext = mergeContextWithJsonTokens(context, json)

  // JSON validation - include both errors AND warnings
  // Warnings like "Unknown property" can cause issues in Mirror
  const jsonValidation = validatePropertiesJSON(json, mergedContext)

  // Mirror validation
  const mirrorCode = jsonToMirror(json)
  const mirrorValidation = validateMirrorCode(mirrorCode, false, 'de')

  // Count JSON errors and warnings as problems
  const jsonProblems = [
    ...jsonValidation.errors.map(e => `JSON Error: ${e.path}: ${e.message}`),
    ...jsonValidation.warnings.map(w => `JSON Warning: ${w.path}: ${w.message}`),
  ]

  // Mirror errors are always problems, warnings depend on type
  const mirrorProblems = mirrorValidation.issues
    .filter(i => i.type.includes('error') || i.message.includes('not defined'))
    .map(i => `Mirror L${i.line}: ${i.message}`)

  const allErrors = [...jsonProblems, ...mirrorProblems]

  const severity: ErrorSeverity =
    allErrors.length > 10 ? 'critical' :
    allErrors.length > 5 ? 'major' :
    allErrors.length > 0 ? 'minor' : 'none'

  return {
    isValid: allErrors.length === 0,
    errorCount: allErrors.length,
    severity,
    errors: allErrors,
  }
}
