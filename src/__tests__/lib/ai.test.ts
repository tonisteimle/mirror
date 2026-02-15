/**
 * AI Generation Module Tests
 *
 * Comprehensive tests for the main AI generation orchestrator.
 * Tests cover:
 * - Basic code generation
 * - Self-healing validation
 * - Code intelligence integration
 * - API key management
 * - Error handling
 * - Request cancellation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockFetch,
  createMockResponse,
  createMockErrorResponse,
  installFetchMock,
  createSessionStorageMock,
  VALID_MIRROR_CODE,
  INVALID_MIRROR_CODE,
  LLM_PROMPTS,
  getCallCount,
  getLastRequestBody,
  getLastRequestModel,
} from './llm-test-utils'
import { API, STORAGE_KEYS } from '../../constants'

// ============================================================================
// Setup
// ============================================================================

// Mock sessionStorage before importing ai module
const sessionStorageMock = createSessionStorageMock()
vi.stubGlobal('sessionStorage', sessionStorageMock)

// Import after mocking
import {
  generateMirrorCode,
  generateWithValidation,
  generateWithCodeIntelligence,
  setApiKey,
  getApiKey,
  hasApiKey,
  clearApiKey,
  cancelActiveRequest,
  validateGeneratedCode,
} from '../../lib/ai'

describe('AI Generation Module', () => {
  let cleanupFetch: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorageMock.clear()
    // Set a default API key
    setApiKey('test-api-key')
  })

  afterEach(() => {
    cleanupFetch?.()
    clearApiKey()
  })

  // ==========================================================================
  // API Key Management
  // ==========================================================================

  describe('API Key Management', () => {
    beforeEach(() => {
      clearApiKey()
    })

    it('should store API key in sessionStorage', () => {
      setApiKey('my-secret-key')

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.API_KEY,
        'my-secret-key'
      )
    })

    it('should retrieve API key', () => {
      setApiKey('retrieve-test-key')

      expect(getApiKey()).toBe('retrieve-test-key')
    })

    it('should check if API key is set', () => {
      expect(hasApiKey()).toBe(false)

      setApiKey('some-key')
      expect(hasApiKey()).toBe(true)
    })

    it('should clear API key', () => {
      setApiKey('to-be-cleared')
      clearApiKey()

      expect(hasApiKey()).toBe(false)
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.API_KEY)
    })

    it('should handle empty key gracefully', () => {
      setApiKey('')

      expect(hasApiKey()).toBe(false)
      expect(sessionStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // generateMirrorCode - Basic Generation
  // ==========================================================================

  describe('generateMirrorCode', () => {
    it('should generate code from a simple prompt', async () => {
      const mockFetch = createMockFetch([
        { content: VALID_MIRROR_CODE.simple }
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateMirrorCode(LLM_PROMPTS.simple)

      expect(result.code).toBe(VALID_MIRROR_CODE.simple)
      expect(result.error).toBeUndefined()
    })

    it('should throw error when no API key is set', async () => {
      clearApiKey()

      await expect(generateMirrorCode(LLM_PROMPTS.simple))
        .rejects.toThrow('API Key')
    })

    it('should send correct request to OpenRouter API', async () => {
      const mockFetch = createMockFetch([{ content: 'Box' }])
      cleanupFetch = installFetchMock(mockFetch)

      await generateMirrorCode('Test prompt')

      expect(mockFetch).toHaveBeenCalledWith(
        API.ENDPOINT,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
        })
      )

      const body = getLastRequestBody(mockFetch)
      expect(body).toMatchObject({
        model: API.MODEL,
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Test prompt' }),
        ]),
      })
    })

    it('should strip markdown code blocks from response', async () => {
      const mockFetch = createMockFetch([{
        content: '```mirror\nBox padding 16\n```'
      }])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateMirrorCode(LLM_PROMPTS.simple)

      expect(result.code).toBe('Box padding 16')
      expect(result.code).not.toContain('```')
    })

    it('should strip markdown with dsl language tag', async () => {
      const mockFetch = createMockFetch([{
        content: '```dsl\nButton "Click"\n```'
      }])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateMirrorCode(LLM_PROMPTS.simple)

      expect(result.code).toBe('Button "Click"')
    })

    it('should handle API errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        createMockErrorResponse(429, 'Rate limit exceeded')
      )
      cleanupFetch = installFetchMock(mockFetch)

      await expect(generateMirrorCode(LLM_PROMPTS.simple))
        .rejects.toThrow('API Error: 429')
    })

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      cleanupFetch = installFetchMock(mockFetch)

      await expect(generateMirrorCode(LLM_PROMPTS.simple))
        .rejects.toThrow('Network error')
    })

    it('should handle empty response content', async () => {
      const mockFetch = createMockFetch([{ content: '' }])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateMirrorCode(LLM_PROMPTS.simple)

      expect(result.code).toBe('')
    })
  })

  // ==========================================================================
  // generateWithValidation - Self-Healing
  // ==========================================================================

  describe('generateWithValidation', () => {
    it('should return valid result for correct code', async () => {
      const mockFetch = createMockFetch([
        { content: VALID_MIRROR_CODE.simple }
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateWithValidation(LLM_PROMPTS.simple)

      expect(result.valid).toBe(true)
      expect(result.code).toBe(VALID_MIRROR_CODE.simple)
      expect(result.attempts).toBe(1)
      expect(result.issues).toHaveLength(0)
    })

    it('should attempt correction for invalid code', async () => {
      const mockFetch = createMockFetch([
        { content: INVALID_MIRROR_CODE.unknownProperty },
        { content: VALID_MIRROR_CODE.simple },
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateWithValidation(LLM_PROMPTS.simple, {
        maxAttempts: 2
      })

      expect(result.valid).toBe(true)
      expect(result.attempts).toBe(2)
      expect(getCallCount(mockFetch)).toBe(2)
    })

    it('should include correction prompt with errors', async () => {
      const mockFetch = createMockFetch([
        { content: INVALID_MIRROR_CODE.unknownProperty },
        { content: VALID_MIRROR_CODE.simple },
      ])
      cleanupFetch = installFetchMock(mockFetch)

      await generateWithValidation(LLM_PROMPTS.simple, { maxAttempts: 2 })

      // Check that second request includes error info
      const secondCallBody = JSON.parse(
        mockFetch.mock.calls[1][1].body as string
      )
      const userMessage = secondCallBody.messages.find(
        (m: { role: string }) => m.role === 'user'
      )
      expect(userMessage.content).toContain('FEHLER')
      expect(userMessage.content).toContain('paddin')
    })

    it('should respect maxAttempts option', async () => {
      // Use syntax errors that cannot be auto-corrected
      const mockFetch = createMockFetch([
        { content: INVALID_MIRROR_CODE.unterminatedString }, // unclosed string
        { content: INVALID_MIRROR_CODE.invalidConditional }, // invalid if/then
        { content: INVALID_MIRROR_CODE.unterminatedString }, // unclosed string again
        { content: VALID_MIRROR_CODE.simple },
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateWithValidation(LLM_PROMPTS.simple, {
        maxAttempts: 2
      })

      expect(result.valid).toBe(false)
      expect(result.attempts).toBe(2)
      expect(getCallCount(mockFetch)).toBe(2)
    })

    it('should call onProgress callback', async () => {
      const mockFetch = createMockFetch([
        { content: INVALID_MIRROR_CODE.unknownProperty },
        { content: VALID_MIRROR_CODE.simple },
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const onProgress = vi.fn()

      await generateWithValidation(LLM_PROMPTS.simple, {
        maxAttempts: 2,
        onProgress
      })

      expect(onProgress).toHaveBeenCalledWith('generating', 1)
      expect(onProgress).toHaveBeenCalledWith('validating', 1)
      expect(onProgress).toHaveBeenCalledWith('correcting', 1)
    })

    it('should use German correction prompts by default', async () => {
      const mockFetch = createMockFetch([
        { content: INVALID_MIRROR_CODE.unknownProperty },
        { content: VALID_MIRROR_CODE.simple },
      ])
      cleanupFetch = installFetchMock(mockFetch)

      await generateWithValidation(LLM_PROMPTS.simple)

      const secondCallBody = JSON.parse(
        mockFetch.mock.calls[1][1].body as string
      )
      const userMessage = secondCallBody.messages.find(
        (m: { role: string }) => m.role === 'user'
      )
      expect(userMessage.content).toContain('FEHLER')
      expect(userMessage.content).toContain('korrigiere')
    })

    it('should use English correction prompts when specified', async () => {
      const mockFetch = createMockFetch([
        { content: INVALID_MIRROR_CODE.unknownProperty },
        { content: VALID_MIRROR_CODE.simple },
      ])
      cleanupFetch = installFetchMock(mockFetch)

      await generateWithValidation(LLM_PROMPTS.simple, {
        language: 'en'
      })

      const secondCallBody = JSON.parse(
        mockFetch.mock.calls[1][1].body as string
      )
      const userMessage = secondCallBody.messages.find(
        (m: { role: string }) => m.role === 'user'
      )
      expect(userMessage.content).toContain('ERRORS')
      expect(userMessage.content).toContain('fix')
    })
  })

  // ==========================================================================
  // generateWithCodeIntelligence - Context-Aware Generation
  // ==========================================================================

  describe('generateWithCodeIntelligence', () => {
    const SOURCE_CODE_WITH_TOKENS = `$primary: #3B82F6
$bg-dark: #1E1E1E
$spacing: 16

Card: vertical padding $spacing background $bg-dark radius 8
  Title: size 18 weight 600 color white

Card
  Title "Welcome"`

    it('should include token context in prompt', async () => {
      const mockFetch = createMockFetch([
        { content: 'Button background $primary "Click"' }
      ])
      cleanupFetch = installFetchMock(mockFetch)

      await generateWithCodeIntelligence('Add a button', {
        sourceCode: SOURCE_CODE_WITH_TOKENS
      })

      const body = getLastRequestBody(mockFetch) as {
        messages: Array<{ role: string; content: string }>
      }
      const userMessage = body.messages.find(m => m.role === 'user')
      expect(userMessage?.content).toContain('$primary')
      expect(userMessage?.content).toContain('$bg-dark')
    })

    it('should include component context', async () => {
      const mockFetch = createMockFetch([
        { content: 'Card Title "New Card"' }
      ])
      cleanupFetch = installFetchMock(mockFetch)

      await generateWithCodeIntelligence('Add another card', {
        sourceCode: SOURCE_CODE_WITH_TOKENS
      })

      const body = getLastRequestBody(mockFetch) as {
        messages: Array<{ role: string; content: string }>
      }
      const userMessage = body.messages.find(m => m.role === 'user')
      expect(userMessage?.content).toContain('Card')
      expect(userMessage?.content).toContain('Title')
    })

    it('should detect approach based on existing code', async () => {
      const mockFetch = createMockFetch([
        { content: 'Card Title "Reused"' }
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateWithCodeIntelligence('Add a card', {
        sourceCode: SOURCE_CODE_WITH_TOKENS
      })

      // Should suggest reusing existing Card component
      expect(['reuse', 'extend', 'create']).toContain(result.approach)
    })

    it('should adjust indentation for cursor position', async () => {
      const mockFetch = createMockFetch([
        { content: 'Button "Click"' }
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateWithCodeIntelligence('Add button', {
        sourceCode: SOURCE_CODE_WITH_TOKENS,
        cursor: { line: 7, column: 4 }  // Inside Card
      })

      // Should include insertion info
      expect(result.insertAt).toBeDefined()
    })

    it('should call onProgress with analyzing status', async () => {
      const mockFetch = createMockFetch([
        { content: 'Box padding 16' }
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const onProgress = vi.fn()

      await generateWithCodeIntelligence('Add a box', {
        sourceCode: '',
        onProgress
      })

      expect(onProgress).toHaveBeenCalledWith('analyzing', 0)
      expect(onProgress).toHaveBeenCalledWith('generating', 1)
    })

    it('should apply self-healing to generated code', async () => {
      const mockFetch = createMockFetch([
        { content: 'Box paddin 16' },
        { content: 'Box padding 16' },
      ])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateWithCodeIntelligence('Add a box', {
        sourceCode: '',
        maxAttempts: 2
      })

      expect(result.valid).toBe(true)
    })
  })

  // ==========================================================================
  // validateGeneratedCode - Quick Validation
  // ==========================================================================

  describe('validateGeneratedCode', () => {
    it('should validate correct code', () => {
      const result = validateGeneratedCode(VALID_MIRROR_CODE.simple)

      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect property typos', () => {
      const result = validateGeneratedCode(INVALID_MIRROR_CODE.unknownProperty)

      expect(result.valid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues.some(i => i.includes('paddin'))).toBe(true)
    })

    it('should detect event typos', () => {
      const result = validateGeneratedCode(INVALID_MIRROR_CODE.unknownEvent)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.includes('onclck'))).toBe(true)
    })

    it('should handle complex valid code', () => {
      const result = validateGeneratedCode(VALID_MIRROR_CODE.nested)

      expect(result.valid).toBe(true)
    })

    it('should handle code with events', () => {
      const result = validateGeneratedCode(VALID_MIRROR_CODE.withEvents)

      expect(result.valid).toBe(true)
    })
  })

  // ==========================================================================
  // Request Cancellation
  // ==========================================================================

  describe('Request Cancellation', () => {
    it('should have cancelActiveRequest function', () => {
      // Cancellation is hard to test in unit tests due to async timing
      // Just verify the function exists and is callable
      expect(typeof cancelActiveRequest).toBe('function')
      // Should not throw when called
      expect(() => cancelActiveRequest()).not.toThrow()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = 'Create a '.repeat(1000) + 'button'
      const mockFetch = createMockFetch([{ content: 'Button "Click"' }])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateMirrorCode(longPrompt)

      expect(result.code).toBeDefined()
    })

    it('should handle special characters in prompts', async () => {
      const specialPrompt = 'Button mit "Anführungszeichen" und <Tags>'
      const mockFetch = createMockFetch([{ content: 'Button "Click"' }])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateMirrorCode(specialPrompt)

      expect(result.code).toBeDefined()
    })

    it('should handle unicode in prompts', async () => {
      const unicodePrompt = 'Erstelle einen Button mit 🔵 Emoji'
      const mockFetch = createMockFetch([{ content: 'Button "🔵 Click"' }])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateMirrorCode(unicodePrompt)

      expect(result.code).toContain('🔵')
    })

    it('should handle multiline code response', async () => {
      const mockFetch = createMockFetch([{ content: VALID_MIRROR_CODE.nested }])
      cleanupFetch = installFetchMock(mockFetch)

      const result = await generateMirrorCode(LLM_PROMPTS.complex)

      expect(result.code.split('\n').length).toBeGreaterThan(1)
    })
  })
})
