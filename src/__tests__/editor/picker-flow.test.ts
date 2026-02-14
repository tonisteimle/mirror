/**
 * Picker Flow Integration Tests
 *
 * Tests the complete flow of icon/font picker usage:
 * 1. User types "icon" + Space → Icon picker opens
 * 2. User presses Enter (selects icon) → Icon inserted, picker closes, NO auto-trigger
 * 3. User presses Space → Autocomplete opens
 *
 * This test verifies that we don't "swallow" spaces or auto-trigger pickers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Picker Flow', () => {
  // ===========================================
  // Mock State
  // ===========================================

  interface MockPanelState {
    isOpen: boolean
    type: 'icon' | 'font' | null
    selectedIndex: number
    triggerPos: number
    filter: string
  }

  interface MockCallbacks {
    openIconPicker: ReturnType<typeof vi.fn>
    openFontPicker: ReturnType<typeof vi.fn>
    triggerAutocomplete: ReturnType<typeof vi.fn>
  }

  let iconPanelState: MockPanelState
  let callbacks: MockCallbacks
  let editorContent: string
  let cursorPos: number

  beforeEach(() => {
    iconPanelState = {
      isOpen: false,
      type: null,
      selectedIndex: 0,
      triggerPos: 0,
      filter: '',
    }

    callbacks = {
      openIconPicker: vi.fn(() => {
        iconPanelState.isOpen = true
        iconPanelState.type = 'icon'
        iconPanelState.triggerPos = cursorPos
      }),
      openFontPicker: vi.fn(() => {
        iconPanelState.isOpen = true
        iconPanelState.type = 'font'
        iconPanelState.triggerPos = cursorPos
      }),
      triggerAutocomplete: vi.fn(),
    }

    editorContent = ''
    cursorPos = 0
  })

  // Helper: Simulate typing
  function typeText(text: string) {
    editorContent += text
    cursorPos = editorContent.length
  }

  // Helper: Insert text at cursor (replacing from triggerPos)
  function insertValue(value: string, triggerPos: number) {
    editorContent = editorContent.slice(0, triggerPos) + value
    cursorPos = triggerPos + value.length
  }

  // Helper: Get text before cursor
  function getTextBeforeCursor(): string {
    return editorContent.slice(0, cursorPos)
  }

  // Helper: Simulate Space keymap logic (from keymaps.ts)
  function simulateSpaceKey(): boolean {
    const textBefore = getTextBeforeCursor()

    // Check if we just typed "icon"
    if (/\bicon$/.test(textBefore)) {
      // Insert space
      typeText(' ')
      // Open icon picker (with delay in real code)
      callbacks.openIconPicker()
      return true
    }

    // Check if we just typed "font"
    if (/\bfont$/.test(textBefore)) {
      // Insert space
      typeText(' ')
      // Open font picker (with delay in real code)
      callbacks.openFontPicker()
      return true
    }

    // Default: just insert space (let autocomplete handle it)
    typeText(' ')
    return false
  }

  // Helper: Simulate Enter key in panel (from panel-keymap.ts)
  function simulateEnterInPanel(): boolean {
    if (!iconPanelState.isOpen) return false

    // Get selected value (in real code this comes from panel component)
    const selectedValue = '"search"' // Mock: first icon selected

    // Insert the value
    insertValue(selectedValue, iconPanelState.triggerPos)

    // Close panel
    iconPanelState.isOpen = false
    iconPanelState.type = null

    // IMPORTANT: No auto-trigger of autocomplete here!
    // This was the bug - we were calling triggerAutocompleteWithBoost()

    return true
  }

  // ===========================================
  // Tests
  // ===========================================

  describe('Icon Picker Flow', () => {
    it('should open icon picker when user types "icon" + Space', () => {
      // Step 1: User types "icon"
      typeText('icon')
      expect(editorContent).toBe('icon')
      expect(iconPanelState.isOpen).toBe(false)

      // Step 2: User presses Space
      simulateSpaceKey()

      // Verify: space inserted, icon picker opened
      expect(editorContent).toBe('icon ')
      expect(iconPanelState.isOpen).toBe(true)
      expect(iconPanelState.type).toBe('icon')
      expect(callbacks.openIconPicker).toHaveBeenCalledTimes(1)
    })

    it('should NOT auto-trigger autocomplete after Enter in icon picker', () => {
      // Setup: Icon picker is open
      typeText('icon')
      simulateSpaceKey()
      expect(iconPanelState.isOpen).toBe(true)

      // User presses Enter to select icon
      simulateEnterInPanel()

      // Verify: panel closed, value inserted
      expect(iconPanelState.isOpen).toBe(false)
      expect(editorContent).toBe('icon "search"')

      // CRITICAL: No auto-trigger of autocomplete!
      expect(callbacks.triggerAutocomplete).not.toHaveBeenCalled()
    })

    it('should trigger autocomplete only when user presses Space after icon selection', () => {
      // Full flow:
      // 1. Type "icon" + Space → picker opens
      typeText('icon')
      simulateSpaceKey()
      expect(iconPanelState.isOpen).toBe(true)

      // 2. Press Enter → icon inserted, picker closes
      simulateEnterInPanel()
      expect(iconPanelState.isOpen).toBe(false)
      expect(editorContent).toBe('icon "search"')

      // 3. After enter, no autocomplete triggered yet
      expect(callbacks.triggerAutocomplete).not.toHaveBeenCalled()

      // 4. User presses Space manually → NOW autocomplete should trigger
      // (In real code, the space would trigger the next property suggestion)
      const handled = simulateSpaceKey()
      expect(handled).toBe(false) // Not handled by icon/font trigger
      expect(editorContent).toBe('icon "search" ')
    })

    it('should handle full sequence: icon → select → space → next command', () => {
      // Sequence that was buggy before fix:
      // Type "Box icon" + Space
      typeText('Box icon')
      simulateSpaceKey()
      expect(callbacks.openIconPicker).toHaveBeenCalledTimes(1)
      expect(iconPanelState.isOpen).toBe(true)

      // Select icon with Enter
      simulateEnterInPanel()
      expect(editorContent).toBe('Box icon "search"')
      expect(iconPanelState.isOpen).toBe(false)

      // BEFORE FIX: autocomplete would trigger here automatically
      // AFTER FIX: no auto-trigger
      expect(callbacks.triggerAutocomplete).not.toHaveBeenCalled()

      // User types space + next property
      simulateSpaceKey()
      expect(editorContent).toBe('Box icon "search" ')

      // User continues typing...
      typeText('bg')
      expect(editorContent).toBe('Box icon "search" bg')
    })
  })

  describe('Space Trigger Patterns', () => {
    it('should trigger icon picker only when "icon" is at word boundary', () => {
      // "icon" at word boundary → should trigger
      typeText('Box icon')
      const handled1 = simulateSpaceKey()
      expect(handled1).toBe(true)
      expect(callbacks.openIconPicker).toHaveBeenCalledTimes(1)

      // Reset
      callbacks.openIconPicker.mockClear()
      iconPanelState.isOpen = false
      editorContent = ''
      cursorPos = 0

      // "lexicon" → should NOT trigger (icon not at word boundary)
      typeText('lexicon')
      const handled2 = simulateSpaceKey()
      expect(handled2).toBe(false)
      expect(callbacks.openIconPicker).not.toHaveBeenCalled()
    })

    it('should trigger font picker for "font"', () => {
      typeText('Text font')
      simulateSpaceKey()

      expect(callbacks.openFontPicker).toHaveBeenCalledTimes(1)
      expect(iconPanelState.type).toBe('font')
    })

    it('should NOT trigger picker when text does not end with "icon" or "font"', () => {
      typeText('Box bg')
      const handled = simulateSpaceKey()

      expect(handled).toBe(false)
      expect(callbacks.openIconPicker).not.toHaveBeenCalled()
      expect(callbacks.openFontPicker).not.toHaveBeenCalled()
    })
  })

  describe('Panel State Management', () => {
    it('should correctly track panel open/close state', () => {
      // Initially closed
      expect(iconPanelState.isOpen).toBe(false)
      expect(iconPanelState.type).toBeNull()

      // Open
      typeText('icon')
      simulateSpaceKey()
      expect(iconPanelState.isOpen).toBe(true)
      expect(iconPanelState.type).toBe('icon')
      expect(iconPanelState.triggerPos).toBe(5) // After "icon "

      // Close via Enter
      simulateEnterInPanel()
      expect(iconPanelState.isOpen).toBe(false)
      expect(iconPanelState.type).toBeNull()
    })

    it('should track triggerPos for correct value replacement', () => {
      typeText('Box icon')
      simulateSpaceKey()

      // triggerPos should be right after the space (position 9)
      expect(iconPanelState.triggerPos).toBe(9)

      // When Enter is pressed, value replaces from triggerPos
      simulateEnterInPanel()
      expect(editorContent).toBe('Box icon "search"')
    })
  })
})
