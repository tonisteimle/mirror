/**
 * LLM Test Utilities
 *
 * Shared mocking and assertion utilities for LLM integration tests.
 */

import { vi } from 'vitest'
import { API } from '../../constants'

// ============================================================================
// Mock Response Factories
// ============================================================================

export interface MockLLMResponse {
  content: string
  model?: string
  usage?: { prompt_tokens: number; completion_tokens: number }
}

/**
 * Create a mock OpenRouter API response
 */
export function createMockResponse(content: string, options?: Partial<MockLLMResponse>): object {
  return {
    choices: [{
      message: {
        content,
        role: 'assistant',
      },
      finish_reason: 'stop',
    }],
    model: options?.model || API.MODEL,
    usage: options?.usage || { prompt_tokens: 100, completion_tokens: 50 },
  }
}

/**
 * Create a mock streaming response (SSE format)
 */
export function createMockStreamResponse(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        const chunk = chunks[index]
        const data = JSON.stringify({
          choices: [{ delta: { content: chunk } }]
        })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        index++
      } else {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    }
  })
}

/**
 * Create a mock error response
 */
export function createMockErrorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ============================================================================
// Fetch Mocking
// ============================================================================

type FetchMock = ReturnType<typeof vi.fn>

/**
 * Create a mock fetch that returns specified responses
 */
export function createMockFetch(responses: (MockLLMResponse | Error)[]): FetchMock {
  let callIndex = 0

  return vi.fn().mockImplementation(async () => {
    const response = responses[callIndex] || responses[responses.length - 1]
    callIndex++

    if (response instanceof Error) {
      throw response
    }

    return new Response(JSON.stringify(createMockResponse(response.content, response)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

/**
 * Create a mock fetch for streaming responses
 */
export function createStreamingMockFetch(chunks: string[]): FetchMock {
  return vi.fn().mockImplementation(async () => {
    return new Response(createMockStreamResponse(chunks), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  })
}

/**
 * Install fetch mock globally and return cleanup function
 */
export function installFetchMock(mockFetch: FetchMock): () => void {
  const originalFetch = global.fetch
  global.fetch = mockFetch as unknown as typeof fetch

  return () => {
    global.fetch = originalFetch
  }
}

// ============================================================================
// Session Storage Mock
// ============================================================================

export function createSessionStorageMock() {
  const store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

export const VALID_MIRROR_CODE = {
  simple: 'Box padding 16 background #1E1E1E',
  withToken: `$primary: #3B82F6
Box background $primary`,
  nested: `Card: vertical padding 16 background #1E1E1E radius 8
  Title: size 18 weight 600
  Body: color #9CA3AF

Card
  Title "Welcome"
  Body "Content"`,
  withEvents: `Button named SaveBtn padding 12 background #3B82F6 "Save"`,
}

export const INVALID_MIRROR_CODE = {
  unknownProperty: 'Box paddin 16',
  unknownEvent: 'Button onclck toggle',
  missingDollar: `primary: #3B82F6
Box background primary`,
  cssProperties: 'Box padding-left 16 border-radius 8',
  // Syntax errors that cannot be auto-corrected (for maxAttempts testing)
  unterminatedString: 'Box "unclosed string',
  invalidConditional: 'Button if then',
  invalidComponent: '123Box padding 16',
}

export const LLM_PROMPTS = {
  simple: 'Erstelle einen blauen Button',
  complex: 'Erstelle ein Login-Formular mit E-Mail, Passwort und Submit-Button',
  withTokens: 'Erstelle eine Card mit dem Primary-Token als Hintergrund',
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that generated code is valid Mirror DSL
 */
export function assertValidMirrorCode(code: string): void {
  // Check for common syntax errors
  const lines = code.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue

    // Token definitions should have $ prefix
    if (trimmed.includes(':') && !trimmed.startsWith('$') && !trimmed.startsWith('-')) {
      const colonIndex = trimmed.indexOf(':')
      const beforeColon = trimmed.slice(0, colonIndex)
      // It's a token if it starts with lowercase or is a simple word
      if (/^[a-z]/.test(beforeColon) && !beforeColon.includes(' ')) {
        throw new Error(`Token definition missing $ prefix: "${beforeColon}"`)
      }
    }
  }
}

/**
 * Assert that code uses specific tokens
 */
export function assertUsesTokens(code: string, tokens: string[]): void {
  for (const token of tokens) {
    if (!code.includes(token)) {
      throw new Error(`Code should use token "${token}" but doesn't`)
    }
  }
}

/**
 * Count API calls made
 */
export function getCallCount(mockFetch: FetchMock): number {
  return mockFetch.mock.calls.length
}

/**
 * Get the last request body sent to the API
 */
export function getLastRequestBody(mockFetch: FetchMock): object {
  const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
  const body = lastCall?.[1]?.body
  return body ? JSON.parse(body as string) : {}
}

/**
 * Get the model used in the last request
 */
export function getLastRequestModel(mockFetch: FetchMock): string {
  const body = getLastRequestBody(mockFetch) as { model?: string }
  return body.model || ''
}
