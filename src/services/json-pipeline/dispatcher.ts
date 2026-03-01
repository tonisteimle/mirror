/**
 * Prompt Dispatcher
 *
 * Ein kleiner LLM-Call der entscheidet, welcher Ablauf für einen Prompt
 * am besten geeignet ist.
 */

import { getApiKey } from '../../lib/ai'
import { API } from '../../constants'

// =============================================================================
// Types
// =============================================================================

export type PipelineRoute =
  | 'quick'      // Einfach: Combined, kein Review
  | 'standard'   // Mittel: 4-Stage, light Review
  | 'full'       // Komplex: 4-Stage, full Review
  | 'modify'     // Änderung: Spezieller Modify-Ablauf

export interface DispatchResult {
  route: PipelineRoute
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  estimatedComplexity: number // 1-10
}

// =============================================================================
// Dispatcher Prompt
// =============================================================================

const DISPATCHER_SYSTEM_PROMPT = `Du bist ein Dispatcher für UI-Generierung.

## DEINE AUFGABE

Analysiere den Prompt und entscheide welcher Ablauf passt.

## ROUTEN

1. **quick** - Einfache, einzelne Komponente
   - "Ein Button", "Eine Card", "Ein Icon"
   - Keine komplexe Verschachtelung
   - Keine Events/States nötig

2. **standard** - Mittlere Komplexität
   - "Navigation mit Items", "Formular mit Feldern"
   - Mehrere Komponenten, klare Struktur
   - Hover/States erwähnt

3. **full** - Komplex oder kritisch
   - Dashboard, komplexe Layouts
   - Viele Interaktionen
   - Master-Detail, Tabs, komplexe Listen

4. **modify** - Änderung an bestehendem Code
   - "Ändere...", "Füge hinzu...", "Entferne..."
   - "Mache den Button rot"
   - Bezieht sich auf existierenden Code

## OUTPUT FORMAT

Antworte NUR mit JSON:
{
  "route": "quick|standard|full|modify",
  "confidence": "high|medium|low",
  "reasoning": "Kurze Begründung",
  "estimatedComplexity": 1-10
}

## BEISPIELE

"Ein blauer Button" → quick, high, 2
"Navigation mit 5 Items und Icons" → standard, high, 5
"Dashboard mit Sidebar, Header und Statistiken" → full, high, 8
"Ändere die Hintergrundfarbe auf rot" → modify, high, 2
"Irgendwas cooles" → standard, low, 5 (unsicher → standard)`

// =============================================================================
// Dispatcher Function
// =============================================================================

/**
 * Dispatch: Entscheidet welcher Pipeline-Ablauf für einen Prompt passt.
 *
 * @param prompt - Der User-Prompt
 * @param hasExistingCode - Ob bereits Code existiert (für modify-Erkennung)
 * @returns Route und Metadaten
 */
export async function dispatch(
  prompt: string,
  hasExistingCode: boolean = false
): Promise<DispatchResult> {
  const startTime = performance.now()

  try {
    const userPrompt = hasExistingCode
      ? `[KONTEXT: Es existiert bereits Code]\n\nPrompt: "${prompt}"`
      : `Prompt: "${prompt}"`

    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        'X-Title': 'Mirror - Dispatcher',
      },
      body: JSON.stringify({
        model: API.MODEL_FAST, // Haiku für Speed
        messages: [
          { role: 'system', content: DISPATCHER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 256,
        temperature: 0.1, // Sehr deterministisch
      }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content || ''

    // Parse JSON
    content = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Try to extract JSON
    let result: DispatchResult
    try {
      result = JSON.parse(content)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse dispatcher response')
      }
    }

    // Validate and normalize
    const validRoutes: PipelineRoute[] = ['quick', 'standard', 'full', 'modify']
    if (!validRoutes.includes(result.route)) {
      result.route = 'standard' // Default fallback
    }

    const duration = performance.now() - startTime
    console.debug(`[Dispatcher] ${result.route} (${result.confidence}) in ${duration.toFixed(0)}ms`)

    return {
      route: result.route,
      confidence: result.confidence || 'medium',
      reasoning: result.reasoning || '',
      estimatedComplexity: Math.min(10, Math.max(1, result.estimatedComplexity || 5)),
    }

  } catch (error) {
    console.debug('[Dispatcher] Error, falling back to standard:', error)

    // Fallback: Keyword-basierte Entscheidung
    return fallbackDispatch(prompt, hasExistingCode)
  }
}

// =============================================================================
// Fallback (ohne LLM)
// =============================================================================

function fallbackDispatch(prompt: string, hasExistingCode: boolean): DispatchResult {
  const lower = prompt.toLowerCase()

  // Modify-Keywords
  if (hasExistingCode && /^(ändere|füge|entferne|mache|setze)/i.test(prompt)) {
    return {
      route: 'modify',
      confidence: 'medium',
      reasoning: 'Fallback: Modify-Keyword erkannt',
      estimatedComplexity: 3,
    }
  }

  // Complex-Keywords
  const complexKeywords = [
    'dashboard', 'sidebar', 'header', 'footer',
    'master-detail', 'tabs', 'wizard', 'stepper',
    'login', 'register', 'checkout', 'settings',
    'tabelle', 'table', 'grid', 'kalender',
  ]

  if (complexKeywords.some(kw => lower.includes(kw))) {
    return {
      route: 'full',
      confidence: 'medium',
      reasoning: 'Fallback: Complex-Keyword erkannt',
      estimatedComplexity: 7,
    }
  }

  // Simple-Keywords
  const simpleKeywords = [
    'button', 'icon', 'text', 'badge', 'chip', 'avatar',
  ]

  const isSimple = simpleKeywords.some(kw => lower.includes(kw)) &&
                   prompt.length < 50 &&
                   !lower.includes(' und ') &&
                   !lower.includes(' mit ')

  if (isSimple) {
    return {
      route: 'quick',
      confidence: 'medium',
      reasoning: 'Fallback: Simple component detected',
      estimatedComplexity: 2,
    }
  }

  // Default
  return {
    route: 'standard',
    confidence: 'low',
    reasoning: 'Fallback: Default route',
    estimatedComplexity: 5,
  }
}

// =============================================================================
// Route Configuration
// =============================================================================

export interface RouteConfig {
  useCombinedGeneration: boolean
  maxReviewIterations: number
  maxRegenerations: number
  skipReview: boolean
}

export function getRouteConfig(route: PipelineRoute): RouteConfig {
  switch (route) {
    case 'quick':
      return {
        useCombinedGeneration: true,
        maxReviewIterations: 1,  // One quick review to catch token issues
        maxRegenerations: 0,
        skipReview: false,       // Don't skip - just minimal review
      }
    case 'standard':
      return {
        useCombinedGeneration: false,
        maxReviewIterations: 1,
        maxRegenerations: 1,  // Allow 1 regeneration for semantic mismatches
        skipReview: false,
      }
    case 'full':
      return {
        useCombinedGeneration: false,
        maxReviewIterations: 3,
        maxRegenerations: 1,
        skipReview: false,
      }
    case 'modify':
      return {
        useCombinedGeneration: true, // Modify ist meist einfacher
        maxReviewIterations: 1,
        maxRegenerations: 0,
        skipReview: false,
      }
  }
}
