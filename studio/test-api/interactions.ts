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
