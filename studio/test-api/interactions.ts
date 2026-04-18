/**
 * Mirror Test Framework - Interactions
 *
 * Simulates user interactions like clicks, hovers,
 * keyboard input, and drag operations.
 */

import type { InteractionAPI, KeyModifiers } from './types'

// =============================================================================
// Interaction Implementation
// =============================================================================

export class Interactions implements InteractionAPI {
  private get previewContainer(): HTMLElement | null {
    return document.getElementById('preview')
  }

  private get studio(): any {
    return (window as any).__mirrorStudio__
  }

  private get studioActions(): any {
    return this.studio?.actions
  }

  /**
   * Find element by node ID
   */
  private findElement(nodeId: string): HTMLElement | null {
    return this.previewContainer?.querySelector(
      `[data-mirror-id="${nodeId}"]`
    ) as HTMLElement | null
  }

  /**
   * Dispatch a mouse event on an element
   */
  private dispatchMouseEvent(
    element: HTMLElement,
    type: string,
    options: Partial<MouseEventInit> = {}
  ): void {
    const rect = element.getBoundingClientRect()
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      ...options,
    })
    element.dispatchEvent(event)
  }

  /**
   * Dispatch a keyboard event
   */
  private dispatchKeyboardEvent(
    element: HTMLElement | Document,
    type: string,
    key: string,
    options: Partial<KeyboardEventInit> = {}
  ): void {
    const event = new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      key,
      code: this.keyToCode(key),
      ...options,
    })
    element.dispatchEvent(event)
  }

  /**
   * Convert key name to code
   */
  private keyToCode(key: string): string {
    const keyMap: Record<string, string> = {
      Enter: 'Enter',
      Escape: 'Escape',
      Tab: 'Tab',
      Backspace: 'Backspace',
      Delete: 'Delete',
      ArrowUp: 'ArrowUp',
      ArrowDown: 'ArrowDown',
      ArrowLeft: 'ArrowLeft',
      ArrowRight: 'ArrowRight',
      Space: 'Space',
      ' ': 'Space',
    }
    return keyMap[key] || `Key${key.toUpperCase()}`
  }

  /**
   * Small delay for DOM updates
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ===========================================================================
  // Click Events
  // ===========================================================================

  /**
   * Click on element
   */
  async click(nodeId: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    this.dispatchMouseEvent(element, 'mousedown')
    this.dispatchMouseEvent(element, 'mouseup')
    this.dispatchMouseEvent(element, 'click')

    await this.delay(50)
  }

  /**
   * Click with modifiers (Shift, Cmd/Ctrl, Alt)
   */
  async clickWithModifiers(
    nodeId: string,
    modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }
  ): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    const eventOptions = {
      ctrlKey: modifiers.ctrl ?? false,
      shiftKey: modifiers.shift ?? false,
      altKey: modifiers.alt ?? false,
      metaKey: modifiers.meta ?? false,
    }

    this.dispatchMouseEvent(element, 'mousedown', eventOptions)
    this.dispatchMouseEvent(element, 'mouseup', eventOptions)
    this.dispatchMouseEvent(element, 'click', eventOptions)

    await this.delay(50)
  }

  /**
   * Shift+Click (for multi-select)
   */
  async shiftClick(nodeId: string): Promise<void> {
    return this.clickWithModifiers(nodeId, { shift: true })
  }

  /**
   * Cmd/Ctrl+Click (for multi-select)
   */
  async metaClick(nodeId: string): Promise<void> {
    return this.clickWithModifiers(nodeId, { meta: true })
  }

  /**
   * Double click on element
   */
  async doubleClick(nodeId: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    this.dispatchMouseEvent(element, 'mousedown')
    this.dispatchMouseEvent(element, 'mouseup')
    this.dispatchMouseEvent(element, 'click')
    this.dispatchMouseEvent(element, 'mousedown')
    this.dispatchMouseEvent(element, 'mouseup')
    this.dispatchMouseEvent(element, 'click')
    this.dispatchMouseEvent(element, 'dblclick')

    await this.delay(50)
  }

  // ===========================================================================
  // Hover Events
  // ===========================================================================

  /**
   * Store original inline styles for unhover restoration
   */
  private hoverOriginalStyles = new WeakMap<HTMLElement, string>()

  /**
   * Find and apply CSS :hover rules for an element
   */
  private applyHoverStyles(element: HTMLElement): void {
    // Store original inline style for later restoration
    this.hoverOriginalStyles.set(element, element.getAttribute('style') || '')

    // Collect all :hover styles that match this element
    const hoverStyles: Record<string, string> = {}

    // First, search through document.styleSheets
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules || sheet.rules
        if (!rules) continue

        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule && rule.selectorText?.includes(':hover')) {
            this.extractHoverStylesFromRule(rule, element, hoverStyles)
          }
        }
      } catch {
        // Cross-origin stylesheet, skip
      }
    }

    // Also search through inline <style> elements in the preview
    // (these might not be in document.styleSheets yet due to timing)
    const preview = document.getElementById('preview')
    if (preview) {
      const styleElements = preview.querySelectorAll('style')
      for (const styleEl of styleElements) {
        this.extractHoverStylesFromStyleElement(styleEl, element, hoverStyles)
      }
    }

    // Apply collected hover styles
    for (const [prop, value] of Object.entries(hoverStyles)) {
      element.style.setProperty(prop, value, 'important')
    }
  }

  /**
   * Extract hover styles from a CSS rule
   */
  private extractHoverStylesFromRule(
    rule: CSSStyleRule,
    element: HTMLElement,
    hoverStyles: Record<string, string>
  ): void {
    // Create a selector without :hover to test if it matches
    const baseSelector = rule.selectorText
      .replace(/:hover/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    try {
      if (baseSelector && element.matches(baseSelector)) {
        // Extract styles from this rule
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i]
          const value = rule.style.getPropertyValue(prop)
          if (value) {
            hoverStyles[prop] = value
          }
        }
      }
    } catch {
      // Invalid selector, skip
    }
  }

  /**
   * Extract hover styles by parsing a <style> element's text content
   */
  private extractHoverStylesFromStyleElement(
    styleEl: HTMLStyleElement,
    element: HTMLElement,
    hoverStyles: Record<string, string>
  ): void {
    const css = styleEl.textContent || ''

    // Parse hover rules with regex - find selector:hover { ... }
    // Pattern: [data-mirror-id^="node-X"]:hover { property: value !important; }
    const hoverRuleRegex = /\[data-mirror-id\^?="([^"]+)"\]:hover\s*\{([^}]+)\}/g
    let match

    while ((match = hoverRuleRegex.exec(css)) !== null) {
      const nodeIdPattern = match[1]
      const styleBlock = match[2]

      // Check if element matches this pattern
      const mirrorId = element.getAttribute('data-mirror-id')
      if (mirrorId && mirrorId.startsWith(nodeIdPattern)) {
        // Parse the style block
        const styleDecls = styleBlock.split(';').filter(s => s.trim())
        for (const decl of styleDecls) {
          const colonIdx = decl.indexOf(':')
          if (colonIdx > 0) {
            const prop = decl.substring(0, colonIdx).trim()
            let value = decl.substring(colonIdx + 1).trim()
            // Remove !important suffix for setProperty call
            value = value.replace(/\s*!important\s*$/, '')
            if (prop && value) {
              hoverStyles[prop] = value
            }
          }
        }
      }
    }
  }

  /**
   * Remove applied hover styles and restore original
   */
  private removeHoverStyles(element: HTMLElement): void {
    const originalStyle = this.hoverOriginalStyles.get(element)
    if (originalStyle !== undefined) {
      element.setAttribute('style', originalStyle)
      this.hoverOriginalStyles.delete(element)
    }
  }

  /**
   * Hover over element
   * Simulates CSS :hover by finding and applying matching :hover rules
   */
  async hover(nodeId: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    // Dispatch mouse events for JavaScript handlers
    this.dispatchMouseEvent(element, 'mouseenter')
    this.dispatchMouseEvent(element, 'mouseover')

    // Add hover class for any class-based hover handling
    element.classList.add('__test-hover')

    // Apply CSS :hover styles directly
    this.applyHoverStyles(element)

    await this.delay(50)
  }

  /**
   * Leave hover state
   */
  async unhover(nodeId: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    // Dispatch mouse events
    this.dispatchMouseEvent(element, 'mouseleave')
    this.dispatchMouseEvent(element, 'mouseout')

    // Remove hover class
    element.classList.remove('__test-hover')

    // Restore original styles
    this.removeHoverStyles(element)

    await this.delay(50)
  }

  // ===========================================================================
  // Focus Events
  // ===========================================================================

  /**
   * Focus element
   */
  async focus(nodeId: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    element.focus()

    await this.delay(50)
  }

  /**
   * Blur element
   */
  async blur(nodeId: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    element.blur()

    await this.delay(50)
  }

  // ===========================================================================
  // Input Events
  // ===========================================================================

  /**
   * Type text into input element
   */
  async type(nodeId: string, text: string): Promise<void> {
    const containerElement = this.findElement(nodeId)
    if (!containerElement) throw new Error(`Element ${nodeId} not found`)

    // Find the actual input element (might be the element itself or a child)
    let element: HTMLInputElement | HTMLTextAreaElement
    const tagName = containerElement.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea') {
      element = containerElement as HTMLInputElement | HTMLTextAreaElement
    } else {
      const inputChild = containerElement.querySelector('input, textarea') as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null
      if (!inputChild) throw new Error(`No input/textarea found in ${nodeId}`)
      element = inputChild
    }

    // Focus first
    element.focus()

    // Type each character
    for (const char of text) {
      this.dispatchKeyboardEvent(element, 'keydown', char)
      this.dispatchKeyboardEvent(element, 'keypress', char)

      // Update value
      const currentValue = element.value || ''
      element.value = currentValue + char

      // Dispatch input event
      element.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: char,
          inputType: 'insertText',
        })
      )

      this.dispatchKeyboardEvent(element, 'keyup', char)

      await this.delay(10)
    }

    // Final change event
    element.dispatchEvent(new Event('change', { bubbles: true }))

    await this.delay(50)
  }

  /**
   * Clear input element
   */
  async clear(nodeId: string): Promise<void> {
    const containerElement = this.findElement(nodeId)
    if (!containerElement) throw new Error(`Element ${nodeId} not found`)

    // Find the actual input element (might be the element itself or a child)
    let element: HTMLInputElement | HTMLTextAreaElement
    const tagName = containerElement.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea') {
      element = containerElement as HTMLInputElement | HTMLTextAreaElement
    } else {
      const inputChild = containerElement.querySelector('input, textarea') as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null
      if (!inputChild) throw new Error(`No input/textarea found in ${nodeId}`)
      element = inputChild
    }

    element.focus()
    element.value = ''
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContent' }))
    element.dispatchEvent(new Event('change', { bubbles: true }))

    await this.delay(50)
  }

  // ===========================================================================
  // Keyboard Events
  // ===========================================================================

  /**
   * Press a key with optional modifiers
   *
   * Note: Dispatches on document to ensure global keyboard handlers receive the event.
   * The KeyboardHandler for preview shortcuts listens on document.
   */
  async pressKey(key: string, modifiers?: KeyModifiers): Promise<void> {
    const opts = this.buildModifiers(modifiers)

    // Dispatch on document for global shortcuts (H, V, F, etc.)
    this.dispatchKeyboardEvent(document, 'keydown', key, opts)
    // keypress is deprecated for non-printable keys
    if (key.length === 1) {
      this.dispatchKeyboardEvent(document, 'keypress', key, opts)
    }
    this.dispatchKeyboardEvent(document, 'keyup', key, opts)

    await this.delay(50)
  }

  /**
   * Press a key on specific element
   */
  async pressKeyOn(nodeId: string, key: string, modifiers?: KeyModifiers): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    const opts = this.buildModifiers(modifiers)

    this.dispatchKeyboardEvent(element, 'keydown', key, opts)
    if (key.length === 1) {
      this.dispatchKeyboardEvent(element, 'keypress', key, opts)
    }
    this.dispatchKeyboardEvent(element, 'keyup', key, opts)

    await this.delay(50)
  }

  /**
   * Press a sequence of keys
   */
  async pressSequence(keys: string[], delayBetween = 50): Promise<void> {
    for (const key of keys) {
      await this.pressKey(key)
      if (delayBetween > 0) {
        await this.delay(delayBetween)
      }
    }
  }

  /**
   * Type text character by character (with optional delay)
   */
  async typeText(text: string, delayPerChar = 20): Promise<void> {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement

    for (const char of text) {
      this.dispatchKeyboardEvent(activeElement, 'keydown', char)
      this.dispatchKeyboardEvent(activeElement, 'keypress', char)

      // Update value if it's an input
      if (activeElement && 'value' in activeElement) {
        activeElement.value = (activeElement.value || '') + char
        activeElement.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: char,
            inputType: 'insertText',
          })
        )
      }

      this.dispatchKeyboardEvent(activeElement, 'keyup', char)

      if (delayPerChar > 0) {
        await this.delay(delayPerChar)
      }
    }
  }

  /**
   * Build keyboard event options from modifiers
   */
  private buildModifiers(modifiers?: KeyModifiers): Partial<KeyboardEventInit> {
    if (!modifiers) return {}

    return {
      ctrlKey: modifiers.ctrl ?? false,
      shiftKey: modifiers.shift ?? false,
      altKey: modifiers.alt ?? false,
      metaKey: modifiers.meta ?? false,
    }
  }

  // ===========================================================================
  // Selection
  // ===========================================================================

  /**
   * Select element in preview (triggers studio selection)
   */
  select(nodeId: string): void {
    // Try actions.setSelection first
    if (this.studioActions?.setSelection) {
      this.studioActions.setSelection(nodeId, 'preview')
      return
    }

    // Try sync.setSelection
    if (this.studio?.sync?.setSelection) {
      this.studio.sync.setSelection(nodeId, 'preview')
      return
    }

    // Try direct state update
    if (this.studio?.state?.set) {
      this.studio.state.set({ selection: { nodeId, origin: 'preview' } })
      return
    }

    // Fallback: click the element
    const element = this.findElement(nodeId)
    if (element) {
      element.click()
    }
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    // Use actions.clearSelection first (handles deduplication correctly)
    if (this.studioActions?.clearSelection) {
      this.studioActions.clearSelection('preview')
      return
    }

    // Try sync.clearSelection
    if (this.studio?.sync?.clearSelection) {
      this.studio.sync.clearSelection('preview')
      return
    }

    // Try actions.setSelection with null
    if (this.studioActions?.setSelection) {
      this.studioActions.setSelection(null, 'preview')
      return
    }

    // Try direct state update and emit event
    if (this.studio?.state?.set) {
      this.studio.state.set({ selection: { nodeId: null, origin: 'preview' } })
      // Also emit the event manually since direct state.set doesn't
      this.studio?.events?.emit?.('selection:changed', { nodeId: null, origin: 'preview' })
    }
  }

  // ===========================================================================
  // Drag & Drop
  // ===========================================================================

  /**
   * Drag component from palette to target
   */
  async dragFromPalette(component: string, target: string, index: number): Promise<void> {
    const dragTest = (window as any).__dragTest
    if (!dragTest) {
      throw new Error('Drag test API not available')
    }

    const result = await dragTest
      .fromPalette(component)
      .toContainer(target)
      .atIndex(index)
      .execute()

    if (!result.success) {
      throw new Error(`Drag failed: ${result.error}`)
    }
  }

  /**
   * Drag component from palette to absolute position (for stacked containers)
   */
  async dragToPosition(component: string, target: string, x: number, y: number): Promise<void> {
    const dragTest = (window as any).__dragTest
    if (!dragTest) {
      throw new Error('Drag test API not available')
    }

    const result = await dragTest
      .fromPalette(component)
      .toContainer(target)
      .atPosition(x, y)
      .execute()

    if (!result.success) {
      throw new Error(`Drag to position failed: ${result.error}`)
    }
  }

  /**
   * Move element to new position
   */
  async moveElement(source: string, target: string, index: number): Promise<void> {
    const dragTest = (window as any).__dragTest
    if (!dragTest) {
      throw new Error('Drag test API not available')
    }

    const result = await dragTest.moveElement(source).toContainer(target).atIndex(index).execute()

    if (!result.success) {
      throw new Error(`Move failed: ${result.error}`)
    }
  }

  /**
   * Drag component from palette to alignment zone (9-point grid for empty containers)
   * @param component - Component name (e.g., 'Button', 'Text')
   * @param target - Target container node ID
   * @param zone - Alignment zone: 'top-left', 'top-center', 'top-right',
   *               'center-left', 'center', 'center-right',
   *               'bottom-left', 'bottom-center', 'bottom-right'
   */
  async dragToAlignmentZone(
    component: string,
    target: string,
    zone:
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'center-left'
      | 'center'
      | 'center-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right'
  ): Promise<void> {
    const dragTest = (window as any).__dragTest
    if (!dragTest) {
      throw new Error('Drag test API not available')
    }

    const result = await dragTest
      .fromPalette(component)
      .toContainer(target)
      .atAlignmentZone(zone)
      .execute()

    if (!result.success) {
      throw new Error(`Drag to alignment zone failed: ${result.error}`)
    }
  }

  /**
   * Move element to alignment zone (9-point grid)
   *
   * Used when moving an element within its container. When the element is
   * the only child, alignment zones appear allowing repositioning.
   *
   * @param source - Source element node ID
   * @param target - Target container node ID
   * @param zone - Alignment zone: 'top-left', 'top-center', 'top-right',
   *               'center-left', 'center', 'center-right',
   *               'bottom-left', 'bottom-center', 'bottom-right'
   */
  async moveElementToAlignmentZone(
    source: string,
    target: string,
    zone:
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'center-left'
      | 'center'
      | 'center-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right'
  ): Promise<void> {
    const dragTest = (window as any).__dragTest
    if (!dragTest) {
      throw new Error('Drag test API not available')
    }

    const result = await dragTest
      .moveElement(source)
      .toContainer(target)
      .atAlignmentZone(zone)
      .execute()

    if (!result.success) {
      throw new Error(`Move to alignment zone failed: ${result.error}`)
    }
  }

  // ===========================================================================
  // Resize Handle Interactions
  // ===========================================================================

  /**
   * Double-click on a resize handle to set dimension to full
   *
   * - n/s handles: set height to full
   * - e/w handles: set width to full
   * - corner handles (nw/ne/sw/se): set both dimensions to full
   */
  async doubleClickResizeHandle(
    nodeId: string,
    position: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
  ): Promise<void> {
    // First, select the element to show resize handles
    await this.click(nodeId)
    await this.delay(200) // Give more time for handles to appear

    // Wait for resize handles to appear (retry a few times)
    let resizeHandlesContainer: Element | null = null
    for (let i = 0; i < 10; i++) {
      resizeHandlesContainer = document.querySelector('.visual-overlay .resize-handles')
      if (resizeHandlesContainer && resizeHandlesContainer.children.length > 0) {
        break
      }
      await this.delay(50)
    }

    if (!resizeHandlesContainer || resizeHandlesContainer.children.length === 0) {
      throw new Error('Resize handles container not found. Is the element selected?')
    }

    // Find the handle
    const handle = resizeHandlesContainer.querySelector(
      `.resize-handle[data-position="${position}"]`
    ) as HTMLElement

    if (!handle) {
      throw new Error(`Resize handle at position "${position}" not found`)
    }

    // Double-click the handle
    this.dispatchMouseEvent(handle, 'mousedown')
    this.dispatchMouseEvent(handle, 'mouseup')
    this.dispatchMouseEvent(handle, 'click')
    this.dispatchMouseEvent(handle, 'mousedown')
    this.dispatchMouseEvent(handle, 'mouseup')
    this.dispatchMouseEvent(handle, 'click')
    this.dispatchMouseEvent(handle, 'dblclick')

    await this.delay(100)
  }

  /**
   * Drag a resize handle to change element size
   *
   * @param nodeId - The element to resize
   * @param position - Which handle to drag (n, s, e, w, nw, ne, sw, se)
   * @param deltaX - Horizontal drag distance in pixels
   * @param deltaY - Vertical drag distance in pixels
   * @returns Object with before/during/after dimensions and handle verification for assertions
   */
  async dragResizeHandle(
    nodeId: string,
    position: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se',
    deltaX: number,
    deltaY: number
  ): Promise<ResizeDragResult> {
    // First, select the element to show resize handles
    await this.click(nodeId)
    await this.delay(200)

    // Wait for resize handles to appear
    let resizeHandlesContainer: Element | null = null
    for (let i = 0; i < 10; i++) {
      resizeHandlesContainer = document.querySelector('.visual-overlay .resize-handles')
      if (resizeHandlesContainer && resizeHandlesContainer.children.length > 0) {
        break
      }
      await this.delay(50)
    }

    if (!resizeHandlesContainer || resizeHandlesContainer.children.length === 0) {
      throw new Error('Resize handles container not found. Is the element selected?')
    }

    // Find the handle
    const handle = resizeHandlesContainer.querySelector(
      `.resize-handle[data-position="${position}"]`
    ) as HTMLElement

    if (!handle) {
      throw new Error(`Resize handle at position "${position}" not found`)
    }

    // Get the element for dimension checks
    const element = this.findElement(nodeId)
    if (!element) {
      throw new Error(`Element ${nodeId} not found`)
    }

    // Helper to get element dimensions
    const getDimensions = (): ElementDimensions => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        computedWidth: style.width,
        computedHeight: style.height,
      }
    }

    // Helper to get handle positions
    const getHandlePositions = (): ResizeHandleInfo[] => {
      return this.getResizeHandles()
    }

    // Capture before state
    const before = getDimensions()
    const handlesBefore = getHandlePositions()

    // Get handle position for drag calculation
    const handleRect = handle.getBoundingClientRect()
    const startX = handleRect.left + handleRect.width / 2
    const startY = handleRect.top + handleRect.height / 2

    // Dispatch mousedown on handle
    this.dispatchMouseEvent(handle, 'mousedown', {
      clientX: startX,
      clientY: startY,
    })

    await this.delay(50)

    // Step delay for drag simulation
    const stepDelay = 20
    const steps = 5

    // Smooth drag with multiple steps
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const currentX = startX + deltaX * progress
      const currentY = startY + deltaY * progress

      this.dispatchMouseEvent(document.body, 'mousemove', {
        clientX: currentX,
        clientY: currentY,
      })

      await this.delay(stepDelay)
    }

    // Capture during state (while dragging, before mouseup)
    const during = getDimensions()
    const handlesDuring = getHandlePositions()

    // Dispatch mouseup on document
    this.dispatchMouseEvent(document.body, 'mouseup', {
      clientX: startX + deltaX,
      clientY: startY + deltaY,
    })

    await this.delay(100)

    // Capture after state
    const after = getDimensions()
    const handlesAfter = getHandlePositions()

    // Check if element is still selected (handles should still be visible)
    const isStillSelected = handlesAfter.length > 0

    // Check if handles updated position correctly
    const handlesUpdated = handlesBefore.some((hBefore, i) => {
      const hAfter = handlesAfter[i]
      if (!hAfter) return true // Handle count changed
      return (
        Math.abs(hBefore.rect.left - hAfter.rect.left) > 1 ||
        Math.abs(hBefore.rect.top - hAfter.rect.top) > 1
      )
    })

    // Check if handles are at correct position relative to element
    const handlesCorrectlyPositioned = this.verifyHandlePositions(nodeId, handlesAfter)

    return {
      before,
      during,
      after,
      isStillSelected,
      handlesUpdated,
      handlesCorrectlyPositioned,
      handlesBefore,
      handlesAfter,
    }
  }

  /**
   * Get resize handle positions for assertions
   *
   * @returns Array of resize handle information
   */
  getResizeHandles(): ResizeHandleInfo[] {
    const handles = document.querySelectorAll('.resize-handle')
    return Array.from(handles).map(handle => {
      const rect = handle.getBoundingClientRect()
      const dataset = (handle as HTMLElement).dataset
      return {
        position: dataset.position as ResizeHandle,
        nodeId: dataset.nodeId || '',
        isMulti: dataset.isMulti === 'true',
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      }
    })
  }

  /**
   * Verify that resize handles are positioned correctly around the element
   *
   * @param nodeId - The element to check handles for
   * @param handles - Optional handles array (fetched if not provided)
   * @returns true if all handles are correctly positioned
   */
  verifyHandlePositions(nodeId: string, handles?: ResizeHandleInfo[]): boolean {
    const element = this.findElement(nodeId)
    if (!element) return false

    const elementRect = element.getBoundingClientRect()
    const resizeHandles = handles ?? this.getResizeHandles()

    // Filter handles for this element
    const elementHandles = resizeHandles.filter(h => h.nodeId === nodeId)
    if (elementHandles.length === 0) return false

    // Get container bounds for clamping calculation
    // The handles are rendered in an overlay relative to the preview container
    const container =
      document.querySelector('#preview-scroll-container') ||
      document.querySelector('#preview-container')
    const containerRect = container?.getBoundingClientRect()

    // Handle clamping constants (must match resize-manager.ts)
    const HANDLE_SIZE = 8
    const HANDLE_HALF = HANDLE_SIZE / 2
    const MIN_INSET = 2

    // Expected positions relative to element (handle centers)
    const expectedPositions: Record<ResizeHandle, { x: number; y: number }> = {
      nw: { x: 0, y: 0 },
      n: { x: 0.5, y: 0 },
      ne: { x: 1, y: 0 },
      e: { x: 1, y: 0.5 },
      se: { x: 1, y: 1 },
      s: { x: 0.5, y: 1 },
      sw: { x: 0, y: 1 },
      w: { x: 0, y: 0.5 },
    }

    // Tolerance for position matching - higher tolerance to account for:
    // - Rounding differences
    // - Clamping adjustments
    // - Layout shifts during drag operations
    const TOLERANCE = 15

    for (const handle of elementHandles) {
      const expected = expectedPositions[handle.position]
      if (!expected) continue

      // Calculate expected handle center position (before clamping)
      let expectedX = elementRect.left + elementRect.width * expected.x
      let expectedY = elementRect.top + elementRect.height * expected.y

      // Apply clamping if container bounds are available
      // This matches the clamping logic in resize-manager.ts
      if (containerRect) {
        const minX = containerRect.left + MIN_INSET + HANDLE_HALF
        const maxX = containerRect.right - MIN_INSET - HANDLE_HALF
        const minY = containerRect.top + MIN_INSET + HANDLE_HALF
        const maxY = containerRect.bottom - MIN_INSET - HANDLE_HALF

        expectedX = Math.max(minX, Math.min(maxX, expectedX))
        expectedY = Math.max(minY, Math.min(maxY, expectedY))
      }

      // Get actual handle center
      const actualX = handle.rect.left + handle.rect.width / 2
      const actualY = handle.rect.top + handle.rect.height / 2

      // Check if within tolerance
      if (Math.abs(expectedX - actualX) > TOLERANCE || Math.abs(expectedY - actualY) > TOLERANCE) {
        return false
      }
    }

    return true
  }

  /**
   * Get detailed selection state for verification
   *
   * @param nodeId - The element to check
   * @returns Selection verification info
   */
  getSelectionState(nodeId: string): SelectionStateInfo {
    const element = this.findElement(nodeId)
    if (!element) {
      return {
        elementExists: false,
        isSelected: false,
        hasResizeHandles: false,
        hasPaddingHandles: false,
        hasMarginHandles: false,
        resizeHandleCount: 0,
        paddingHandleCount: 0,
        marginHandleCount: 0,
      }
    }

    const resizeHandles = this.getResizeHandles().filter(h => h.nodeId === nodeId)
    const paddingHandles = this.getPaddingHandles().filter(h => h.nodeId === nodeId)
    const marginHandles = this.getMarginHandles().filter(h => h.nodeId === nodeId)

    return {
      elementExists: true,
      isSelected: resizeHandles.length > 0 || paddingHandles.length > 0 || marginHandles.length > 0,
      hasResizeHandles: resizeHandles.length > 0,
      hasPaddingHandles: paddingHandles.length > 0,
      hasMarginHandles: marginHandles.length > 0,
      resizeHandleCount: resizeHandles.length,
      paddingHandleCount: paddingHandles.length,
      marginHandleCount: marginHandles.length,
    }
  }

  // ===========================================================================
  // Padding Handle Interactions
  // ===========================================================================

  /**
   * Enter padding mode for an element (press P key)
   *
   * @param nodeId - The element to enter padding mode for
   */
  async enterPaddingMode(nodeId: string): Promise<void> {
    // First select the element
    await this.click(nodeId)
    await this.delay(100)

    // Check if padding handles are already visible (mode already active)
    const existingHandles = document.querySelectorAll('.padding-handle')
    if (existingHandles.length > 0) {
      // Mode is already active - check if it's for the right element
      const handleNodeId = (existingHandles[0] as HTMLElement).dataset.nodeId
      if (handleNodeId === nodeId) {
        // Already in padding mode for this element
        return
      }
      // Different element - exit current mode first
      await this.pressKey('p')
      await this.delay(100)
    }

    // Press P to enter padding mode
    await this.pressKey('p')
    await this.delay(150)

    // Wait for padding handles to appear
    let found = false
    for (let i = 0; i < 10; i++) {
      const paddingHandles = document.querySelectorAll('.padding-handle')
      if (paddingHandles.length > 0) {
        found = true
        break
      }
      await this.delay(50)
    }

    if (!found) {
      throw new Error('Padding handles not found after pressing P')
    }
  }

  /**
   * Exit padding mode (press P again to toggle back)
   */
  async exitPaddingMode(): Promise<void> {
    await this.pressKey('p')
    await this.delay(100)
  }

  /**
   * Drag a padding handle to adjust padding
   *
   * @param side - Which padding side to drag (top, right, bottom, left)
   * @param delta - Drag distance in pixels (positive = increase padding)
   * @param options - Options for the drag operation
   *                   - shift: adjust all sides uniformly
   *                   - alt: adjust axis (top/bottom or left/right together)
   * @returns Object with before/during/after padding values for verification
   */
  async dragPaddingHandle(
    side: 'top' | 'right' | 'bottom' | 'left',
    delta: number,
    options?: { shift?: boolean; alt?: boolean }
  ): Promise<{
    before: PaddingValues
    during: PaddingValues
    after: PaddingValues
    zonesUpdated: boolean
  }> {
    // Find the padding handle
    const handle = document.querySelector(`.padding-handle-${side}`) as HTMLElement
    if (!handle) {
      throw new Error(
        `Padding handle for "${side}" not found. Did you call enterPaddingMode first?`
      )
    }

    // Get current padding values from the element
    const nodeId = handle.dataset.nodeId
    if (!nodeId) {
      throw new Error('Padding handle missing nodeId')
    }

    const element = this.findElement(nodeId)
    if (!element) {
      throw new Error(`Element ${nodeId} not found`)
    }

    const getBoundsPadding = (): PaddingValues => {
      const style = window.getComputedStyle(element)
      return {
        top: parseInt(style.paddingTop || '0', 10),
        right: parseInt(style.paddingRight || '0', 10),
        bottom: parseInt(style.paddingBottom || '0', 10),
        left: parseInt(style.paddingLeft || '0', 10),
      }
    }

    const getPaddingZoneBounds = (): DOMRect[] => {
      const zones = document.querySelectorAll('.padding-area')
      return Array.from(zones).map(z => z.getBoundingClientRect())
    }

    // Capture before state
    const before = getBoundsPadding()
    const zonesBefore = getPaddingZoneBounds()

    // Calculate drag positions
    const handleRect = handle.getBoundingClientRect()
    const startX = handleRect.left + handleRect.width / 2
    const startY = handleRect.top + handleRect.height / 2

    // Calculate end position based on side and delta
    let endX = startX
    let endY = startY
    if (side === 'top') {
      endY = startY + delta
    } else if (side === 'bottom') {
      endY = startY - delta
    } else if (side === 'left') {
      endX = startX + delta
    } else if (side === 'right') {
      endX = startX - delta
    }

    const eventOptions = {
      shiftKey: options?.shift ?? false,
      altKey: options?.alt ?? false,
    }

    // Step delay for drag simulation (20ms default, smooth and fast)
    const stepDelay = 20

    // Start drag
    this.dispatchMouseEvent(handle, 'mousedown', {
      clientX: startX,
      clientY: startY,
      ...eventOptions,
    })

    await this.delay(stepDelay * 2)

    // Move (multiple steps for smoother simulation)
    const steps = 5
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const currentX = startX + (endX - startX) * progress
      const currentY = startY + (endY - startY) * progress

      this.dispatchMouseEvent(document.body, 'mousemove', {
        clientX: currentX,
        clientY: currentY,
        ...eventOptions,
      })

      await this.delay(stepDelay)
    }

    // Capture during state (while dragging)
    const during = getBoundsPadding()
    const zonesDuring = getPaddingZoneBounds()

    // Check if zones updated during drag
    const zonesUpdated =
      zonesBefore.length !== zonesDuring.length ||
      zonesBefore.some((z, i) => {
        const d = zonesDuring[i]
        return (
          !d ||
          Math.abs(z.width - d.width) > 1 ||
          Math.abs(z.height - d.height) > 1 ||
          Math.abs(z.left - d.left) > 1 ||
          Math.abs(z.top - d.top) > 1
        )
      })

    // End drag
    this.dispatchMouseEvent(document.body, 'mouseup', {
      clientX: endX,
      clientY: endY,
      ...eventOptions,
    })

    await this.delay(100)

    // Capture after state
    const after = getBoundsPadding()

    return { before, during, after, zonesUpdated }
  }

  /**
   * Get current padding zone information for assertions
   *
   * @returns Array of padding zone rectangles and their positions
   */
  getPaddingZones(): PaddingZoneInfo[] {
    const zones = document.querySelectorAll('.padding-area')
    const zoneInfos = Array.from(zones).map(zone => {
      const rect = zone.getBoundingClientRect()
      const style = window.getComputedStyle(zone)
      return {
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        color: style.backgroundColor,
        visible: rect.width > 0 && rect.height > 0,
      }
    })

    // Determine position based on dimensions and location
    // Horizontal zones (top/bottom): width > height
    // Vertical zones (left/right): height > width
    const horizontalZones = zoneInfos.filter(z => z.rect.width > z.rect.height)
    const verticalZones = zoneInfos.filter(z => z.rect.height > z.rect.width)

    // Sort horizontal zones by top position
    horizontalZones.sort((a, b) => a.rect.top - b.rect.top)
    // Sort vertical zones by left position
    verticalZones.sort((a, b) => a.rect.left - b.rect.left)

    return zoneInfos.map(z => {
      let position: 'top' | 'right' | 'bottom' | 'left' | 'unknown' = 'unknown'
      if (z.rect.width > z.rect.height) {
        // Horizontal zone
        position = horizontalZones.indexOf(z) === 0 ? 'top' : 'bottom'
      } else if (z.rect.height > z.rect.width) {
        // Vertical zone
        position = verticalZones.indexOf(z) === 0 ? 'left' : 'right'
      }
      return { ...z, position }
    })
  }

  /**
   * Get padding handle positions for assertions
   */
  getPaddingHandles(): PaddingHandleInfo[] {
    const handles = document.querySelectorAll('.padding-handle')
    return Array.from(handles).map(handle => {
      const rect = handle.getBoundingClientRect()
      const dataset = (handle as HTMLElement).dataset
      return {
        position: dataset.position as 'top' | 'right' | 'bottom' | 'left',
        nodeId: dataset.nodeId || '',
        padding: parseInt(dataset.padding || '0', 10),
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      }
    })
  }

  // ===========================================================================
  // Margin Handle Interactions
  // ===========================================================================

  /**
   * Enter margin mode for an element (press M key)
   *
   * @param nodeId - The element to enter margin mode for
   */
  async enterMarginMode(nodeId: string): Promise<void> {
    // First select the element
    await this.click(nodeId)
    await this.delay(100)

    // Check if margin handles are already visible (mode already active)
    const existingHandles = document.querySelectorAll('.margin-handle')
    if (existingHandles.length > 0) {
      // Mode is already active - check if it's for the right element
      const handleNodeId = (existingHandles[0] as HTMLElement).dataset.nodeId
      if (handleNodeId === nodeId) {
        // Already in margin mode for this element
        return
      }
      // Different element - exit current mode first
      await this.pressKey('m')
      await this.delay(100)
    }

    // Press M to enter margin mode
    await this.pressKey('m')
    await this.delay(150)

    // Wait for margin handles to appear
    let found = false
    for (let i = 0; i < 10; i++) {
      const marginHandles = document.querySelectorAll('.margin-handle')
      if (marginHandles.length > 0) {
        found = true
        break
      }
      await this.delay(50)
    }

    if (!found) {
      throw new Error('Margin handles not found after pressing M')
    }
  }

  /**
   * Exit margin mode (press M again to toggle back)
   */
  async exitMarginMode(): Promise<void> {
    await this.pressKey('m')
    await this.delay(100)
  }

  /**
   * Drag a margin handle to adjust margin
   *
   * @param side - Which margin side to drag (top, right, bottom, left)
   * @param delta - Drag distance in pixels (positive = increase margin)
   * @param options - Options for the drag operation
   *                   - shift: adjust all sides uniformly
   *                   - alt: adjust axis (top/bottom or left/right together)
   * @returns Object with before/during/after margin values for verification
   */
  async dragMarginHandle(
    side: 'top' | 'right' | 'bottom' | 'left',
    delta: number,
    options?: { shift?: boolean; alt?: boolean }
  ): Promise<{
    before: MarginValues
    during: MarginValues
    after: MarginValues
    zonesUpdated: boolean
  }> {
    // Find the margin handle
    const handle = document.querySelector(`.margin-handle-${side}`) as HTMLElement
    if (!handle) {
      throw new Error(`Margin handle for "${side}" not found. Did you call enterMarginMode first?`)
    }

    // Get current margin values from the element
    const nodeId = handle.dataset.nodeId
    if (!nodeId) {
      throw new Error('Margin handle missing nodeId')
    }

    const element = this.findElement(nodeId)
    if (!element) {
      throw new Error(`Element ${nodeId} not found`)
    }

    const getBoundsMargin = (): MarginValues => {
      const style = window.getComputedStyle(element)
      return {
        top: parseInt(style.marginTop || '0', 10),
        right: parseInt(style.marginRight || '0', 10),
        bottom: parseInt(style.marginBottom || '0', 10),
        left: parseInt(style.marginLeft || '0', 10),
      }
    }

    const getMarginZoneBounds = (): DOMRect[] => {
      const zones = document.querySelectorAll('.margin-area')
      return Array.from(zones).map(z => z.getBoundingClientRect())
    }

    // Capture before state
    const before = getBoundsMargin()
    const zonesBefore = getMarginZoneBounds()

    // Calculate drag positions
    const handleRect = handle.getBoundingClientRect()
    const startX = handleRect.left + handleRect.width / 2
    const startY = handleRect.top + handleRect.height / 2

    // Calculate end position based on side and delta
    // Margin handles are OUTSIDE the element, so dragging direction is inverted:
    // - Top: drag UP (negative Y) to increase margin
    // - Bottom: drag DOWN (positive Y) to increase margin
    // - Left: drag LEFT (negative X) to increase margin
    // - Right: drag RIGHT (positive X) to increase margin
    let endX = startX
    let endY = startY
    if (side === 'top') {
      endY = startY - delta // Drag up to increase top margin
    } else if (side === 'bottom') {
      endY = startY + delta // Drag down to increase bottom margin
    } else if (side === 'left') {
      endX = startX - delta // Drag left to increase left margin
    } else if (side === 'right') {
      endX = startX + delta // Drag right to increase right margin
    }

    const eventOptions = {
      shiftKey: options?.shift ?? false,
      altKey: options?.alt ?? false,
    }

    // Step delay for drag simulation (20ms default, smooth and fast)
    const stepDelay = 20

    // Start drag
    this.dispatchMouseEvent(handle, 'mousedown', {
      clientX: startX,
      clientY: startY,
      ...eventOptions,
    })

    await this.delay(stepDelay * 2)

    // Move (multiple steps for smoother simulation)
    const steps = 5
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const currentX = startX + (endX - startX) * progress
      const currentY = startY + (endY - startY) * progress

      this.dispatchMouseEvent(document.body, 'mousemove', {
        clientX: currentX,
        clientY: currentY,
        ...eventOptions,
      })

      await this.delay(stepDelay)
    }

    // Capture during state (while dragging)
    const during = getBoundsMargin()
    const zonesDuring = getMarginZoneBounds()

    // Check if zones updated during drag
    const zonesUpdated =
      zonesBefore.length !== zonesDuring.length ||
      zonesBefore.some((z, i) => {
        const d = zonesDuring[i]
        return (
          !d ||
          Math.abs(z.width - d.width) > 1 ||
          Math.abs(z.height - d.height) > 1 ||
          Math.abs(z.left - d.left) > 1 ||
          Math.abs(z.top - d.top) > 1
        )
      })

    // End drag
    this.dispatchMouseEvent(document.body, 'mouseup', {
      clientX: endX,
      clientY: endY,
      ...eventOptions,
    })

    await this.delay(100)

    // Capture after state
    const after = getBoundsMargin()

    return { before, during, after, zonesUpdated }
  }

  /**
   * Get current margin zone information for assertions
   *
   * @returns Array of margin zone rectangles and their positions
   */
  getMarginZones(): MarginZoneInfo[] {
    const zones = document.querySelectorAll('.margin-area')
    const zoneInfos = Array.from(zones).map(zone => {
      const rect = zone.getBoundingClientRect()
      const style = window.getComputedStyle(zone)
      return {
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        color: style.backgroundColor,
        visible: rect.width > 0 && rect.height > 0,
      }
    })

    // Determine position based on dimensions and location
    // Horizontal zones (top/bottom): width > height
    // Vertical zones (left/right): height > width
    const horizontalZones = zoneInfos.filter(z => z.rect.width > z.rect.height)
    const verticalZones = zoneInfos.filter(z => z.rect.height > z.rect.width)

    // Sort horizontal zones by top position
    horizontalZones.sort((a, b) => a.rect.top - b.rect.top)
    // Sort vertical zones by left position
    verticalZones.sort((a, b) => a.rect.left - b.rect.left)

    return zoneInfos.map(z => {
      let position: 'top' | 'right' | 'bottom' | 'left' | 'unknown' = 'unknown'
      if (z.rect.width > z.rect.height) {
        // Horizontal zone
        position = horizontalZones.indexOf(z) === 0 ? 'top' : 'bottom'
      } else if (z.rect.height > z.rect.width) {
        // Vertical zone
        position = verticalZones.indexOf(z) === 0 ? 'left' : 'right'
      }
      return { ...z, position }
    })
  }

  /**
   * Get margin handle positions for assertions
   */
  getMarginHandles(): MarginHandleInfo[] {
    const handles = document.querySelectorAll('.margin-handle')
    return Array.from(handles).map(handle => {
      const rect = handle.getBoundingClientRect()
      const dataset = (handle as HTMLElement).dataset
      return {
        position: dataset.position as 'top' | 'right' | 'bottom' | 'left',
        nodeId: dataset.nodeId || '',
        margin: parseInt(dataset.margin || '0', 10),
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      }
    })
  }
}

// =============================================================================
// Padding Types
// =============================================================================

export interface PaddingValues {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PaddingZoneInfo {
  rect: { left: number; top: number; width: number; height: number }
  color: string
  visible: boolean
}

export interface PaddingHandleInfo {
  position: 'top' | 'right' | 'bottom' | 'left'
  nodeId: string
  padding: number
  rect: { left: number; top: number; width: number; height: number }
}

// =============================================================================
// Margin Types
// =============================================================================

export interface MarginValues {
  top: number
  right: number
  bottom: number
  left: number
}

export interface MarginZoneInfo {
  rect: { left: number; top: number; width: number; height: number }
  color: string
  visible: boolean
  position?: 'top' | 'right' | 'bottom' | 'left' | 'unknown'
}

export interface MarginHandleInfo {
  position: 'top' | 'right' | 'bottom' | 'left'
  nodeId: string
  margin: number
  rect: { left: number; top: number; width: number; height: number }
}

// =============================================================================
// Resize Types
// =============================================================================

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export interface ElementDimensions {
  width: number
  height: number
  left: number
  top: number
  computedWidth: string
  computedHeight: string
}

export interface ResizeHandleInfo {
  position: ResizeHandle
  nodeId: string
  isMulti: boolean
  rect: { left: number; top: number; width: number; height: number }
}

export interface ResizeDragResult {
  /** Element dimensions before resize */
  before: ElementDimensions
  /** Element dimensions during drag (live preview) */
  during: ElementDimensions
  /** Element dimensions after resize completed */
  after: ElementDimensions
  /** Whether the element is still selected after resize */
  isStillSelected: boolean
  /** Whether resize handles moved during the operation */
  handlesUpdated: boolean
  /** Whether resize handles are correctly positioned relative to element */
  handlesCorrectlyPositioned: boolean
  /** Handle positions before resize */
  handlesBefore: ResizeHandleInfo[]
  /** Handle positions after resize */
  handlesAfter: ResizeHandleInfo[]
}

export interface SelectionStateInfo {
  elementExists: boolean
  isSelected: boolean
  hasResizeHandles: boolean
  hasPaddingHandles: boolean
  hasMarginHandles: boolean
  resizeHandleCount: number
  paddingHandleCount: number
  marginHandleCount: number
}

// =============================================================================
// Interaction Helpers
// =============================================================================

/**
 * Simulate CSS :hover state by injecting styles
 */
export function enableHoverSimulation(): void {
  const style = document.createElement('style')
  style.id = '__mirror-test-hover-styles'
  style.textContent = `
    /* Mirror Test Framework: Hover Simulation */
    .__test-hover {
      /* This class is added to elements during simulated hover */
    }

    /* Clone :hover styles to .__test-hover */
    /* Note: This is a simplified approach. Full hover simulation
       would require parsing and duplicating all :hover rules */
  `
  document.head.appendChild(style)
}

/**
 * Disable hover simulation
 */
export function disableHoverSimulation(): void {
  const style = document.getElementById('__mirror-test-hover-styles')
  if (style) {
    style.remove()
  }
}
