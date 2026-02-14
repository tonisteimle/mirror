/**
 * Tests for useProjectStorage hook
 *
 * These tests verify the hook's interface and basic functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useProjectStorage, type ProjectState } from '../../hooks/useProjectStorage'

// Mock the export function
vi.mock('../../generator/export', () => ({
  exportReact: vi.fn(() => ({
    tsx: 'export function App() { return <div /> }',
    css: '.box { display: flex; }',
  })),
}))

describe('useProjectStorage', () => {
  const mockState: ProjectState = {
    pages: [{ id: 'page1', name: 'Page 1', layoutCode: 'Box "Hello"' }],
    currentPageId: 'page1',
    layoutCode: 'Box "Hello"',
    dataCode: '',
    componentsCode: '',
    tokensCode: '$primary: #3B82F6',
  }

  const mockOptions = {
    onError: vi.fn(),
    onImportSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('interface', () => {
    it('returns openProject function', () => {
      const { result } = renderHook(() => useProjectStorage(mockState, mockOptions))
      expect(result.current.openProject).toBeDefined()
      expect(typeof result.current.openProject).toBe('function')
    })

    it('returns saveProject function', () => {
      const { result } = renderHook(() => useProjectStorage(mockState, mockOptions))
      expect(result.current.saveProject).toBeDefined()
      expect(typeof result.current.saveProject).toBe('function')
    })

    it('returns exportReactCode function', () => {
      const { result } = renderHook(() => useProjectStorage(mockState, mockOptions))
      expect(result.current.exportReactCode).toBeDefined()
      expect(typeof result.current.exportReactCode).toBe('function')
    })
  })

  describe('state changes', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() =>
        useProjectStorage(mockState, mockOptions)
      )

      const firstOpenProject = result.current.openProject
      const firstSaveProject = result.current.saveProject
      const firstExportReactCode = result.current.exportReactCode

      rerender()

      // Function references should be stable (memoized)
      expect(result.current.openProject).toBe(firstOpenProject)
      expect(result.current.saveProject).toBe(firstSaveProject)
      expect(result.current.exportReactCode).toBe(firstExportReactCode)
    })
  })
})
