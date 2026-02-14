/**
 * useCodeParsing Hook Tests
 *
 * Tests for code parsing, merging, debouncing, preview overrides, and diagnostics.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCodeParsing } from '../../hooks/useCodeParsing'

describe('useCodeParsing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('code merging', () => {
    it('should merge tokens, components, and layout code', () => {
      const { result } = renderHook(() =>
        useCodeParsing('$primary: #FF0000', 'Button: pad 12', 'Button "Click"')
      )

      expect(result.current.mergedCode).toContain('$primary: #FF0000')
      expect(result.current.mergedCode).toContain('Button: pad 12')
      expect(result.current.mergedCode).toContain('Button "Click"')
    })

    it('should skip empty code sections when merging', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', 'Button: pad 12', '')
      )

      expect(result.current.mergedCode).toBe('Button: pad 12')
    })

    it('should handle all empty code sections', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', '')
      )

      expect(result.current.mergedCode).toBe('')
    })

    it('should separate sections with double newlines', () => {
      const { result } = renderHook(() =>
        useCodeParsing('$a: 1', '$b: 2', 'Box')
      )

      expect(result.current.mergedCode).toBe('$a: 1\n\n$b: 2\n\nBox')
    })
  })

  describe('debouncing', () => {
    it('should debounce code changes by default', async () => {
      const { result, rerender } = renderHook(
        ({ code }) => useCodeParsing('', '', code),
        { initialProps: { code: 'Box' } }
      )

      const initialDebouncedCode = result.current.debouncedCode

      rerender({ code: 'Box pad 12' })

      // Before debounce delay, debouncedCode should not have changed
      expect(result.current.debouncedCode).toBe(initialDebouncedCode)

      // After debounce delay (default is 250ms)
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.debouncedCode).toContain('Box pad 12')
    })

    it('should respect custom debounce delay', async () => {
      const { result, rerender } = renderHook(
        ({ code }) => useCodeParsing('', '', code, { debounceMs: 500 }),
        { initialProps: { code: 'Box' } }
      )

      rerender({ code: 'Box changed' })

      // Before 500ms
      act(() => {
        vi.advanceTimersByTime(400)
      })

      expect(result.current.debouncedCode).not.toContain('Box changed')

      // After 500ms
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.debouncedCode).toContain('Box changed')
    })
  })

  describe('parsing', () => {
    it('should return empty parse result for empty code', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', '')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.parseResult.nodes).toEqual([])
      expect(result.current.parseResult.errors).toEqual([])
    })

    it('should parse valid DSL code', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', 'Box pad 12 bg #FF0000')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.parseResult.nodes.length).toBeGreaterThan(0)
      expect(result.current.parseResult.nodes[0].name).toBe('Box')
    })

    it('should parse component definitions', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', 'Card: pad 16 bg #333', 'Card "Hello"')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.parseResult.registry.has('Card')).toBe(true)
    })

    it('should parse design tokens', () => {
      const { result } = renderHook(() =>
        useCodeParsing('$primary: #3B82F6', '', 'Box bg $primary')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.parseResult.tokens.has('primary')).toBe(true)
    })
  })

  describe('validation and diagnostics', () => {
    it('should report isValid as true for valid code', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', 'Box pad 12')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.isValid).toBe(true)
    })

    it('should report isValid as true for empty code', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', '')
      )

      expect(result.current.isValid).toBe(true)
      expect(result.current.diagnostics).toEqual([])
    })

    it('should sort diagnostics by line number', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', 'Box\n  unknownprop 123\nCard\n  badprop 456')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      const diagnostics = result.current.diagnostics
      for (let i = 1; i < diagnostics.length; i++) {
        expect(diagnostics[i].line).toBeGreaterThanOrEqual(diagnostics[i - 1].line)
      }
    })
  })

  describe('active cursor line filtering', () => {
    it('should filter diagnostics on active cursor line', () => {
      const code = 'Box\n  unknownprop 123'

      renderHook(() =>
        useCodeParsing('', '', code, { debounceMs: 0 })
      )

      const { result: resultWithFilter } = renderHook(() =>
        useCodeParsing('', '', code, { debounceMs: 0, activeCursorLine: 1 })
      )

      act(() => {
        vi.advanceTimersByTime(50)
      })

      // Without filter: may have diagnostics on line 1
      // With filter: diagnostics on line 1 should be filtered out
      const filteredDiagnostics = resultWithFilter.current.diagnostics.filter(d => d.line === 1)
      expect(filteredDiagnostics.length).toBe(0)
    })
  })

  describe('preview override', () => {
    it('should apply preview override to layout code', () => {
      const layoutCode = 'Box bg #FF0000'

      const { result } = renderHook(() =>
        useCodeParsing('', '', layoutCode, {
          debounceMs: 0,
          previewOverride: {
            from: 7,  // Start of #FF0000
            to: 14,   // End of #FF0000
            value: '#00FF00'
          }
        })
      )

      // The effective code should have #00FF00 instead of #FF0000
      expect(result.current.mergedCode).toContain('#00FF00')
      expect(result.current.mergedCode).not.toContain('#FF0000')
    })

    it('should skip debounce when preview is active', () => {
      const { result, rerender } = renderHook(
        ({ previewOverride }) => useCodeParsing('', '', 'Box bg #FF0000', {
          debounceMs: 500,
          previewOverride
        }),
        { initialProps: { previewOverride: null as { from: number; to: number; value: string } | null } }
      )

      // With no preview, debounce is applied
      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Rerender with preview override
      rerender({
        previewOverride: {
          from: 7,
          to: 14,
          value: '#00FF00'
        }
      })

      // Preview changes should be immediate (no debounce)
      expect(result.current.mergedCode).toContain('#00FF00')
    })
  })

  describe('findNodeById', () => {
    it('should find node by ID in flat structure', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', 'Box "test"')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      const nodes = result.current.parseResult.nodes
      if (nodes.length > 0) {
        const foundNode = result.current.findNodeById(nodes, nodes[0].id)
        expect(foundNode).toBe(nodes[0])
      }
    })

    it('should find node by ID in nested structure', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', 'Box\n  Card "nested"')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      const nodes = result.current.parseResult.nodes
      if (nodes.length > 0 && nodes[0].children.length > 0) {
        const childId = nodes[0].children[0].id
        const foundNode = result.current.findNodeById(nodes, childId)
        expect(foundNode).not.toBeNull()
        expect(foundNode!.id).toBe(childId)
      }
    })

    it('should return null for non-existent ID', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', 'Box')
      )

      act(() => {
        vi.advanceTimersByTime(200)
      })

      const foundNode = result.current.findNodeById(result.current.parseResult.nodes, 'non-existent-id')
      expect(foundNode).toBeNull()
    })

    it('should return null for empty nodes array', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', '')
      )

      const foundNode = result.current.findNodeById([], 'any-id')
      expect(foundNode).toBeNull()
    })
  })

  describe('backward compatibility', () => {
    it('should support old signature with debounceMs as number', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', 'Box', 100)
      )

      expect(result.current.mergedCode).toBe('Box')
    })

    it('should support old signature with previewOverride as parameter', () => {
      const { result } = renderHook(() =>
        useCodeParsing('', '', 'Box bg #FF0000', 0, {
          from: 7,
          to: 14,
          value: '#00FF00'
        })
      )

      expect(result.current.mergedCode).toContain('#00FF00')
    })
  })
})
