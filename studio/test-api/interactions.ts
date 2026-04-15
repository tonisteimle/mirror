/**
 * Mirror Test Framework - Interactions
 *
 * Simulates user interactions like clicks, hovers,
 * keyboard input, and drag operations.
 */

import type { InteractionAPI } from './types'

// =============================================================================
// Interaction Implementation
// =============================================================================

export class Interactions implements InteractionAPI {
  private get previewContainer(): HTMLElement | null {
    return document.getElementById('preview')
  }

  private get studioActions(): any {
    return (window as any).__mirrorStudio__?.actions
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
   * Hover over element
   */
  async hover(nodeId: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    this.dispatchMouseEvent(element, 'mouseenter')
    this.dispatchMouseEvent(element, 'mouseover')

    // Add hover class for CSS :hover simulation
    element.classList.add('__test-hover')

    await this.delay(50)
  }

  /**
   * Leave hover state
   */
  async unhover(nodeId: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    this.dispatchMouseEvent(element, 'mouseleave')
    this.dispatchMouseEvent(element, 'mouseout')

    element.classList.remove('__test-hover')

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
    const element = this.findElement(nodeId) as HTMLInputElement | HTMLTextAreaElement
    if (!element) throw new Error(`Element ${nodeId} not found`)

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
    const element = this.findElement(nodeId) as HTMLInputElement | HTMLTextAreaElement
    if (!element) throw new Error(`Element ${nodeId} not found`)

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
   * Press a key
   */
  async pressKey(key: string): Promise<void> {
    const activeElement = document.activeElement || document.body

    this.dispatchKeyboardEvent(activeElement as HTMLElement, 'keydown', key)
    this.dispatchKeyboardEvent(activeElement as HTMLElement, 'keypress', key)
    this.dispatchKeyboardEvent(activeElement as HTMLElement, 'keyup', key)

    await this.delay(50)
  }

  // ===========================================================================
  // Selection
  // ===========================================================================

  /**
   * Select element in preview (triggers studio selection)
   */
  select(nodeId: string): void {
    if (this.studioActions?.setSelection) {
      this.studioActions.setSelection(nodeId, 'preview')
    } else {
      // Fallback: click the element
      const element = this.findElement(nodeId)
      if (element) {
        element.click()
      }
    }
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    if (this.studioActions?.setSelection) {
      this.studioActions.setSelection(null, 'preview')
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
