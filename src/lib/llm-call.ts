/**
 * Simple LLM Call Utility
 *
 * Provides a unified interface for calling LLMs.
 */

import { API } from '../constants'
import { getApiKey } from './ai'

export interface LLMCallOptions {
  systemPrompt: string
  userPrompt: string
  model?: string
  maxTokens?: number
}

export interface LLMCallResult {
  content: string
  error?: string
}

/**
 * Call LLM with system and user prompt.
 * Returns the generated content.
 */
export async function callLLM(options: LLMCallOptions): Promise<LLMCallResult> {
  const {
    systemPrompt,
    userPrompt,
    model = API.MODEL_FAST,
    maxTokens = 2048,
  } = options

  const apiKey = getApiKey()
  if (!apiKey) {
    return { content: '', error: 'No API key' }
  }

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://mirror.dev',
        'X-Title': 'Mirror LLM Call',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { content: '', error: `API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    return { content }
  } catch (error) {
    return {
      content: '',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
