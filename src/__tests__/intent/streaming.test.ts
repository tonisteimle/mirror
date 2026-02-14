/**
 * Tests für Intent Streaming Module
 *
 * Testet inkrementelles JSON-Parsing für Streaming-Antworten
 */

import { describe, it, expect } from 'vitest'
import {
  parseIncompleteJSON,
  extractPartialIntentFromStream,
  createDebouncedPreview
} from '../../intent/streaming'

// =============================================================================
// parseIncompleteJSON Tests
// =============================================================================

describe('parseIncompleteJSON', () => {
  it('parses complete JSON', () => {
    const json = '{"name": "test", "value": 42}'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({ name: 'test', value: 42 })
  })

  it('closes unclosed braces', () => {
    const json = '{"name": "test"'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({ name: 'test' })
  })

  it('closes unclosed brackets', () => {
    const json = '{"items": [1, 2, 3'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({ items: [1, 2, 3] })
  })

  it('closes nested structures', () => {
    const json = '{"outer": {"inner": {"value": 1'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({ outer: { inner: { value: 1 } } })
  })

  it('removes trailing comma', () => {
    const json = '{"a": 1, "b": 2,'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('closes unclosed string', () => {
    const json = '{"name": "partial'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({ name: 'partial' })
  })

  it('handles arrays with trailing comma', () => {
    const json = '[1, 2, 3,'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual([1, 2, 3])
  })

  it('handles mixed nested arrays and objects', () => {
    // Note: Partial objects need complete key-value pairs to be parseable
    const json = '{"items": [{"id": 1}, {"id": 2}'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }] })
  })

  it('handles empty object', () => {
    const json = '{'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({})
  })

  it('handles empty array', () => {
    const json = '['
    const result = parseIncompleteJSON(json)
    expect(result).toEqual([])
  })

  it('returns null for completely invalid JSON', () => {
    const json = 'not json at all'
    const result = parseIncompleteJSON(json)
    expect(result).toBeNull()
  })

  it('handles escaped characters in strings', () => {
    const json = '{"text": "hello \\"world\\"'
    const result = parseIncompleteJSON(json)
    expect(result).toEqual({ text: 'hello "world"' })
  })
})

// =============================================================================
// extractPartialIntentFromStream Tests
// =============================================================================

describe('extractPartialIntentFromStream', () => {
  it('extracts tokens section', () => {
    const partial = '{"tokens": {"colors": {"primary": "#3B82F6"}}'
    const result = extractPartialIntentFromStream(partial)

    expect(result).not.toBeNull()
    expect(result?.tokens?.colors?.primary).toBe('#3B82F6')
  })

  it('extracts layout section', () => {
    const partial = '{"layout": [{"component": "Button", "text": "Click"}]}'
    const result = extractPartialIntentFromStream(partial)

    expect(result).not.toBeNull()
    expect(result?.layout?.[0].component).toBe('Button')
  })

  it('extracts components section', () => {
    const partial = '{"components": [{"name": "Card", "style": {"padding": 16}}]}'
    const result = extractPartialIntentFromStream(partial)

    expect(result).not.toBeNull()
    expect(result?.components?.[0].name).toBe('Card')
  })

  it('extracts multiple sections', () => {
    const partial = `{
      "tokens": {"colors": {"primary": "#3B82F6"}},
      "layout": [{"component": "Box"}]
    }`
    const result = extractPartialIntentFromStream(partial)

    expect(result).not.toBeNull()
    expect(result?.tokens).toBeDefined()
    expect(result?.layout).toBeDefined()
  })

  it('handles partial tokens section', () => {
    const partial = '{"tokens": {"colors": {"primary": "#3B8'
    const result = extractPartialIntentFromStream(partial)

    // Should still attempt extraction even if incomplete
    expect(result).not.toBeNull()
  })

  it('returns null for empty object', () => {
    const partial = '{}'
    const result = extractPartialIntentFromStream(partial)
    expect(result).toBeNull()
  })

  it('returns null for no intent sections', () => {
    const partial = '{"other": "value"}'
    const result = extractPartialIntentFromStream(partial)
    expect(result).toBeNull()
  })

  it('handles realistically streamed intent', () => {
    // Simulate what might come from a streaming LLM response
    const streamedChunks = [
      '{"tokens": {"colors": {"primary": "#3B82F6"',
      '}, "spacing": {"md": 16}}, "components": []',
      ', "layout": [{"component": "Button"'
    ]

    // As more chunks arrive, we should be able to extract more
    let accumulated = ''
    let lastResult = null

    for (const chunk of streamedChunks) {
      accumulated += chunk
      const result = extractPartialIntentFromStream(accumulated)
      if (result) {
        lastResult = result
      }
    }

    expect(lastResult).not.toBeNull()
    expect(lastResult?.tokens).toBeDefined()
  })
})

// =============================================================================
// createDebouncedPreview Tests
// =============================================================================

describe('createDebouncedPreview', () => {
  it('debounces multiple rapid calls', async () => {
    let callCount = 0
    let lastValue = ''

    const update = (code: string) => {
      callCount++
      lastValue = code
    }

    const debouncedUpdate = createDebouncedPreview(update, 50)

    // Rapid fire calls
    debouncedUpdate('a')
    debouncedUpdate('b')
    debouncedUpdate('c')

    // Not called immediately
    expect(callCount).toBe(0)

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 100))

    // Only called once with last value
    expect(callCount).toBe(1)
    expect(lastValue).toBe('c')
  })

  it('calls immediately after debounce period', async () => {
    let callCount = 0

    const update = (_code: string) => {
      callCount++
    }

    const debouncedUpdate = createDebouncedPreview(update, 50)

    debouncedUpdate('a')
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(callCount).toBe(1)

    debouncedUpdate('b')
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(callCount).toBe(2)
  })

  it('uses default 100ms debounce', async () => {
    let callCount = 0
    const update = () => { callCount++ }
    const debouncedUpdate = createDebouncedPreview(update)

    debouncedUpdate('test')

    // Not called at 50ms
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(callCount).toBe(0)

    // Called by 150ms
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(callCount).toBe(1)
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Streaming Integration', () => {
  it('can parse progressively arriving JSON', () => {
    const chunks = [
      '{"',
      'tokens": {"colors": {"primary": "#3B82F6"',
      '}, "spacing": {}}, "components": []',
      ', "layout": [{"component": "Button", "text": "Click"}',
      ']}'
    ]

    let accumulated = ''
    const results: Array<ReturnType<typeof parseIncompleteJSON>> = []

    for (const chunk of chunks) {
      accumulated += chunk
      const result = parseIncompleteJSON(accumulated)
      if (result) {
        results.push(result)
      }
    }

    // Should have gotten parseable results along the way
    expect(results.length).toBeGreaterThan(0)

    // Final result should be complete
    const final = results[results.length - 1] as any
    expect(final.tokens.colors.primary).toBe('#3B82F6')
    expect(final.layout[0].component).toBe('Button')
  })
})
