/**
 * LLM Provider Abstraction
 *
 * Provides a unified interface for interacting with different LLM providers.
 * Currently supports OpenRouter with potential for future providers.
 */

import { API } from '../../constants'

// =============================================================================
// Types
// =============================================================================

export interface GenerateOptions {
  /** System prompt for the model */
  systemPrompt: string
  /** User message */
  userPrompt: string
  /** Model to use (provider-specific format) */
  model?: string
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Temperature (0-1) */
  temperature?: number
  /** Whether to stream the response */
  stream?: boolean
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

export interface GenerateResult {
  /** Generated text content */
  content: string
  /** Model used */
  model: string
  /** Token usage statistics */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  /** Whether the response was streamed */
  streamed: boolean
}

export interface StreamChunk {
  /** Chunk of generated text */
  content: string
  /** Whether this is the final chunk */
  done: boolean
}

export interface ProviderConfig {
  /** API endpoint URL */
  endpoint: string
  /** Default model */
  defaultModel: string
  /** Default max tokens */
  defaultMaxTokens: number
  /** Request timeout in ms */
  timeoutMs: number
}

// =============================================================================
// Provider Interface
// =============================================================================

/**
 * Abstract interface for LLM providers.
 * Implementations must provide generate and stream methods.
 */
export interface LLMProvider {
  /** Provider name */
  readonly name: string
  /** Provider configuration */
  readonly config: ProviderConfig

  /**
   * Generate a complete response.
   */
  generate(options: GenerateOptions): Promise<GenerateResult>

  /**
   * Stream a response chunk by chunk.
   */
  stream(options: GenerateOptions): AsyncGenerator<StreamChunk, void, unknown>

  /**
   * Cancel any active requests.
   */
  cancel(): void

  /**
   * Check if the provider is configured (has API key, etc.)
   */
  isConfigured(): boolean
}

// =============================================================================
// OpenRouter Provider
// =============================================================================

/**
 * OpenRouter LLM provider implementation.
 */
export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter'
  readonly config: ProviderConfig

  private apiKey: string = ''
  private abortController: AbortController | null = null

  constructor(config?: Partial<ProviderConfig>) {
    this.config = {
      endpoint: config?.endpoint ?? API.ENDPOINT,
      defaultModel: config?.defaultModel ?? API.MODEL_FAST,
      defaultMaxTokens: config?.defaultMaxTokens ?? API.MAX_TOKENS,
      timeoutMs: config?.timeoutMs ?? API.REQUEST_TIMEOUT_MS,
    }
  }

  /**
   * Set the API key.
   */
  setApiKey(key: string): void {
    this.apiKey = key
  }

  /**
   * Check if configured with an API key.
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  /**
   * Cancel any active request.
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Generate a complete response.
   */
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenRouter API key not configured')
    }

    this.cancel()
    this.abortController = new AbortController()

    const model = options.model ?? this.config.defaultModel
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens

    const timeoutId = setTimeout(
      () => this.abortController?.abort(),
      this.config.timeoutMs
    )

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          'X-Title': 'Mirror',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: options.temperature,
          stream: false,
        }),
        signal: options.signal ?? this.abortController.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
      }

      const data = await response.json() as {
        choices: Array<{ message?: { content?: string } }>
        model?: string
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
        }
      }

      return {
        content: data.choices[0]?.message?.content ?? '',
        model: data.model ?? model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        } : undefined,
        streamed: false,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled or timeout')
      }
      throw error
    } finally {
      this.abortController = null
    }
  }

  /**
   * Stream a response chunk by chunk.
   */
  async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.isConfigured()) {
      throw new Error('OpenRouter API key not configured')
    }

    this.cancel()
    this.abortController = new AbortController()

    const model = options.model ?? this.config.defaultModel
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          'X-Title': 'Mirror',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: options.temperature,
          stream: true,
        }),
        signal: options.signal ?? this.abortController.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          yield { content: '', done: true }
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Process SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          if (line === 'data: [DONE]') {
            yield { content: '', done: true }
            return
          }

          try {
            const data = JSON.parse(line.slice(6)) as {
              choices?: Array<{ delta?: { content?: string } }>
            }
            const content = data.choices?.[0]?.delta?.content

            if (content) {
              yield { content, done: false }
            }
          } catch {
            // Ignore parse errors for SSE lines
          }
        }
      }
    } finally {
      this.abortController = null
    }
  }
}

// =============================================================================
// Provider Factory
// =============================================================================

/**
 * Available provider types.
 */
export type ProviderType = 'openrouter'

/**
 * Create a provider instance by type.
 */
export function createProvider(
  type: ProviderType,
  config?: Partial<ProviderConfig>
): LLMProvider {
  switch (type) {
    case 'openrouter':
      return new OpenRouterProvider(config)
    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}

// =============================================================================
// Global Provider Instance
// =============================================================================

let globalProvider: OpenRouterProvider | null = null

/**
 * Get the global OpenRouter provider instance.
 * Creates one if it doesn't exist.
 */
export function getGlobalProvider(): OpenRouterProvider {
  if (!globalProvider) {
    globalProvider = new OpenRouterProvider()
  }
  return globalProvider
}

/**
 * Set the API key on the global provider.
 */
export function setGlobalProviderApiKey(key: string): void {
  getGlobalProvider().setApiKey(key)
}

/**
 * Check if the global provider is configured.
 */
export function isGlobalProviderConfigured(): boolean {
  return getGlobalProvider().isConfigured()
}

/**
 * Cancel any active request on the global provider.
 */
export function cancelGlobalProviderRequest(): void {
  globalProvider?.cancel()
}
