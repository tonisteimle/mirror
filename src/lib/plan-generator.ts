/**
 * Plan Generator
 *
 * Extracts component hierarchy from complex prompts using LLM.
 * Used for stepwise generation of complex UI structures.
 */

import { getApiKey } from './ai'
import { API } from '../constants'
import { logger } from '../services/logger'

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export interface ComponentPlan {
  name: string
  description: string
  children?: ComponentPlan[]
}

export interface GenerationPlan {
  components: ComponentPlan[]
  totalSteps: number
}

/**
 * Count total components in plan (for progress tracking)
 */
function countComponents(components: ComponentPlan[]): number {
  let count = 0
  for (const comp of components) {
    count += 1
    if (comp.children) {
      count += countComponents(comp.children)
    }
  }
  return count
}

/**
 * Extract component hierarchy from a complex prompt
 */
export async function generatePlan(prompt: string): Promise<GenerationPlan> {
  const apiKey = getApiKey()

  if (!apiKey) {
    logger.ai.warn('No API key for plan generation, using single-component fallback')
    return {
      components: [{ name: 'Component', description: prompt }],
      totalSteps: 1,
    }
  }

  const systemPrompt = `Du bist ein UI-Architektur-Analyst. Analysiere UI-Beschreibungen und extrahiere die Komponenten-Hierarchie.

REGELN:
1. Identifiziere die Hauptkomponente (Root)
2. Identifiziere alle Unterkomponenten/Gruppen
3. Behalte die hierarchische Struktur bei
4. Gib NUR valides JSON zurück, KEIN anderer Text

AUSGABE-FORMAT (nur JSON):
{
  "components": [
    {
      "name": "KomponentenName",
      "description": "Kurze Beschreibung was diese Komponente tut",
      "children": [
        { "name": "ChildName", "description": "..." }
      ]
    }
  ]
}`

  const userPrompt = `Analysiere diese UI-Beschreibung und extrahiere die Komponenten-Hierarchie:

${prompt}

Antworte NUR mit JSON.`

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mirror-dsl.app',
        'X-Title': 'Mirror DSL Editor',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in response')
    }

    // Extract JSON from response
    let jsonText = content.trim()

    // Handle markdown code blocks
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonText)

    if (!parsed.components || !Array.isArray(parsed.components)) {
      throw new Error('Invalid plan structure')
    }

    const components = parsed.components as ComponentPlan[]
    const totalSteps = countComponents(components)

    logger.ai.debug('Generated plan', { totalSteps, components })

    return { components, totalSteps }
  } catch (err) {
    logger.ai.error('Plan generation failed', err)

    // Fallback: treat entire prompt as single component
    return {
      components: [{ name: 'Component', description: prompt }],
      totalSteps: 1,
    }
  }
}
