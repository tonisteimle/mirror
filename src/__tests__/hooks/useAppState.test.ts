/**
 * useAppState Hook Tests
 *
 * Tests for the central app state hook that composes all domain-specific hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppState } from '../../hooks/useAppState'

// Mock all composed hooks
vi.mock('../../hooks/usePageManager', () => ({
  usePageManager: () => ({
    pages: [{ id: 'home', name: 'Home', layoutCode: '' }],
    currentPageId: 'home',
    layoutCode: '',
    setLayoutCode: vi.fn(),
    loadProject: vi.fn(),
    syncPagesWithCode: vi.fn(),
    selectPage: vi.fn(),
    deletePage: vi.fn(),
    renamePage: vi.fn(),
  }),
}))

vi.mock('../../hooks/useEditorState', () => ({
  useEditorState: () => ({
    activeTab: 'layout' as const,
    setActiveTab: vi.fn(),
    componentsCode: '',
    setComponentsCode: vi.fn(),
    tokensCode: '',
    setTokensCode: vi.fn(),
    dataCode: '',
    setDataCode: vi.fn(),
    autoCompleteMode: 'always' as const,
    setAutoCompleteMode: vi.fn(),
    dataSchemas: new Map(),
    dataRecords: new Map(),
  }),
}))

vi.mock('../../hooks/usePanelResize', () => ({
  usePanelResize: () => ({
    editorWidth: 500,
    previewWidth: 500,
    handleResizeStart: vi.fn(),
    handleResize: vi.fn(),
    handleResizeEnd: vi.fn(),
  }),
}))

vi.mock('../../hooks/useDialogs', () => ({
  useDialogs: () => ({
    error: null,
    setError: vi.fn(),
    showSettings: false,
    setShowSettings: vi.fn(),
  }),
}))

vi.mock('../../hooks/useCodeParsing', () => ({
  useCodeParsing: () => ({
    ast: [],
    registry: new Map(),
    tokens: new Map(),
    errors: [],
    diagnostics: [],
    parseIssues: [],
  }),
}))

vi.mock('../../hooks/useAiAssistant', () => ({
  useAiAssistant: () => ({
    isGenerating: false,
    generate: vi.fn(),
  }),
}))

vi.mock('../../hooks/useHistory', () => ({
  useHistory: () => ({
    canUndo: false,
    canRedo: false,
    pushState: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('../../hooks/useProjectStorage', () => ({
  useProjectStorage: () => ({
    isSaving: false,
    save: vi.fn(),
    openFile: vi.fn(),
    exportFile: vi.fn(),
  }),
}))

vi.mock('../../library/registry', () => ({
  isLibraryComponent: () => false,
  getLibraryDefinitions: () => null,
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useAppState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should return all expected state properties', () => {
      const { result } = renderHook(() => useAppState())

      // Domain state
      expect(result.current.pageManager).toBeDefined()
      expect(result.current.editor).toBeDefined()
      expect(result.current.panel).toBeDefined()
      expect(result.current.dialogs).toBeDefined()
      expect(result.current.parsing).toBeDefined()
      expect(result.current.ai).toBeDefined()
      expect(result.current.history).toBeDefined()
      expect(result.current.projectStorage).toBeDefined()

      // Code values
      expect(result.current.layoutCode).toBeDefined()
      expect(result.current.componentsCode).toBeDefined()
      expect(result.current.tokensCode).toBeDefined()

      // Actions
      expect(result.current.handleClear).toBeDefined()
      expect(result.current.handleNewPrototype).toBeDefined()
      expect(result.current.editorActions).toBeDefined()
    })

    it('should have editorActions with onClear callback', () => {
      const { result } = renderHook(() => useAppState())

      expect(result.current.editorActions.onClear).toBeDefined()
      expect(typeof result.current.editorActions.onClear).toBe('function')
    })
  })

  describe('preview override', () => {
    it('should initialize previewOverride as null', () => {
      const { result } = renderHook(() => useAppState())

      expect(result.current.previewOverride).toBeNull()
    })

    it('should update previewOverride when setPreviewOverride is called', () => {
      const { result } = renderHook(() => useAppState())

      const override = { line: 5, property: 'bg', value: '#FF0000' }

      act(() => {
        result.current.setPreviewOverride(override)
      })

      expect(result.current.previewOverride).toEqual(override)
    })

    it('should clear previewOverride when set to null', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.setPreviewOverride({ line: 5, property: 'bg', value: '#FF0000' })
      })

      act(() => {
        result.current.setPreviewOverride(null)
      })

      expect(result.current.previewOverride).toBeNull()
    })
  })

  describe('cursor line tracking', () => {
    it('should provide onCursorLineChange callback', () => {
      const { result } = renderHook(() => useAppState())

      expect(result.current.onCursorLineChange).toBeDefined()
      expect(typeof result.current.onCursorLineChange).toBe('function')
    })
  })

  describe('data tab state', () => {
    it('should expose dataCode and setDataCode', () => {
      const { result } = renderHook(() => useAppState())

      expect(result.current.dataCode).toBeDefined()
      expect(result.current.setDataCode).toBeDefined()
    })

    it('should expose dataSchemas and dataRecords', () => {
      const { result } = renderHook(() => useAppState())

      expect(result.current.dataSchemas).toBeDefined()
      expect(result.current.dataRecords).toBeDefined()
    })
  })

  describe('localStorage loading', () => {
    it('should attempt to load project from localStorage on mount', () => {
      renderHook(() => useAppState())

      expect(localStorageMock.getItem).toHaveBeenCalled()
    })

    it('should handle missing localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useAppState())

      // Should not throw and should have default state
      expect(result.current.pageManager).toBeDefined()
    })

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json {{{')

      // Should not throw
      expect(() => {
        renderHook(() => useAppState())
      }).not.toThrow()
    })
  })
})

describe('useAppState keyboard shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should register keyboard event listener on mount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    renderHook(() => useAppState())

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should remove keyboard event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useAppState())
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
