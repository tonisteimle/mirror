/**
 * Zag API - Test interface for Zag Components
 *
 * Provides programmatic access to Zag component state machines:
 * - Dialog, Tooltip, Select, Tabs
 * - Checkbox, Switch, Slider, RadioGroup
 * - DatePicker and other Zag primitives
 */

import type { ZagAPI, ZagState } from './types'

// =============================================================================
// Zag API Implementation
// =============================================================================

export class ZagAPIImpl implements ZagAPI {
  private get previewContainer(): HTMLElement | null {
    return document.getElementById('preview')
  }

  /**
   * Find element by node ID in preview
   */
  private findElement(nodeId: string): HTMLElement | null {
    return this.previewContainer?.querySelector(
      `[data-mirror-id="${nodeId}"]`
    ) as HTMLElement | null
  }

  /**
   * Get the Zag scope from an element
   */
  private getZagScope(element: HTMLElement): string | null {
    // Walk up to find data-scope attribute
    let current: HTMLElement | null = element
    while (current) {
      const scope = current.getAttribute('data-scope')
      if (scope) return scope
      current = current.parentElement
    }
    return null
  }

  /**
   * Get data-state attribute (Zag's primary state indicator)
   */
  private getDataState(element: HTMLElement): string | null {
    // Check element and ancestors for data-state
    let current: HTMLElement | null = element
    while (current && current !== this.previewContainer) {
      const state = current.getAttribute('data-state')
      if (state) return state
      current = current.parentElement
    }
    return null
  }

  // ===========================================================================
  // State Access
  // ===========================================================================

  getState(nodeId: string): ZagState | null {
    const element = this.findElement(nodeId)
    if (!element) return null

    const scope = this.getZagScope(element)
    const dataState = this.getDataState(element)

    // Try to get state from global Zag registry
    const zagRegistry = (window as any).__zagMachines__
    if (zagRegistry && scope && zagRegistry[scope]) {
      return {
        scope,
        value: zagRegistry[scope].state?.value || dataState || 'unknown',
        context: zagRegistry[scope].state?.context || {},
      }
    }

    // Fallback: infer state from data attributes
    return {
      scope: scope || 'unknown',
      value: dataState || this.inferState(element),
      context: this.extractContext(element),
    }
  }

  /**
   * Infer state from element classes and attributes
   */
  private inferState(element: HTMLElement): string {
    // Check common state indicators
    if (element.hasAttribute('data-open')) return 'open'
    if (element.hasAttribute('data-closed')) return 'closed'
    if (element.hasAttribute('data-checked')) return 'checked'
    if (element.hasAttribute('data-unchecked')) return 'unchecked'
    if (element.hasAttribute('data-active')) return 'active'
    if (element.hasAttribute('data-selected')) return 'selected'
    if (element.hasAttribute('data-highlighted')) return 'highlighted'
    if (element.hasAttribute('data-disabled')) return 'disabled'

    // Check aria attributes
    if (element.getAttribute('aria-expanded') === 'true') return 'open'
    if (element.getAttribute('aria-expanded') === 'false') return 'closed'
    if (element.getAttribute('aria-checked') === 'true') return 'checked'
    if (element.getAttribute('aria-checked') === 'false') return 'unchecked'
    if (element.getAttribute('aria-selected') === 'true') return 'selected'

    // Check classes
    if (element.classList.contains('open')) return 'open'
    if (element.classList.contains('closed')) return 'closed'
    if (element.classList.contains('checked')) return 'checked'
    if (element.classList.contains('active')) return 'active'
    if (element.classList.contains('selected')) return 'selected'

    return 'idle'
  }

  /**
   * Extract context from element attributes
   */
  private extractContext(element: HTMLElement): Record<string, unknown> {
    const context: Record<string, unknown> = {}

    // Extract value from inputs
    if (element instanceof HTMLInputElement) {
      context.value = element.type === 'checkbox' ? element.checked : element.value
    }

    // Extract data attributes
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-') && attr.name !== 'data-mirror-id') {
        const key = attr.name.replace('data-', '').replace(/-([a-z])/g, g => g[1].toUpperCase())
        context[key] = attr.value
      }
    }

    return context
  }

  // ===========================================================================
  // Overlay Components (Dialog, Tooltip, Select)
  // ===========================================================================

  isOpen(nodeId: string): boolean {
    const element = this.findElement(nodeId)
    if (!element) return false

    const state = this.getDataState(element)
    if (state === 'open') return true

    // Check for open dialog/tooltip content
    const content = element.querySelector('[data-state="open"]')
    if (content) return true

    // Check aria-expanded on trigger
    const trigger = element.querySelector('[aria-expanded="true"]')
    if (trigger) return true

    // Check visibility of overlay content (support both data-part and data-slot)
    // But NOT for Select/Dropdown - those use aria-expanded on trigger
    const zagComponent = element.getAttribute('data-zag-component')
    if (zagComponent === 'select') {
      // For select, rely on aria-expanded which is already checked above
      // The trigger has aria-expanded="false" by default
      return false
    }

    if (zagComponent === 'tooltip') {
      // For tooltip, check if content/positioner is visible
      const tooltipContent = element.querySelector('[data-slot="Content"], [data-part="content"]')
      if (tooltipContent) {
        const style = window.getComputedStyle(tooltipContent)
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      }
      return false
    }

    // For Dialog/Tooltip: check if backdrop or content is visible
    const backdrop = element.querySelector('[data-slot="Backdrop"], [data-part="backdrop"]')
    if (backdrop) {
      const style = window.getComputedStyle(backdrop)
      if (style.display !== 'none' && style.visibility !== 'hidden') return true
    }

    const positioner = element.querySelector('[data-part="positioner"], [data-slot="Positioner"]')
    if (positioner) {
      const style = window.getComputedStyle(positioner)
      return style.display !== 'none' && style.visibility !== 'hidden'
    }

    return false
  }

  async open(nodeId: string): Promise<void> {
    if (this.isOpen(nodeId)) return

    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    // Check if this is a tooltip (requires hover, not click)
    const zagComponent = element.getAttribute('data-zag-component')
    const trigger = element.querySelector(
      '[data-part="trigger"], [data-slot="Trigger"]'
    ) as HTMLElement

    if (zagComponent === 'tooltip' && trigger) {
      // Tooltips open on hover, not click
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 200))
      return
    }

    // Find and click trigger (support both data-part and data-slot)
    if (trigger) {
      trigger.click()
      await new Promise(resolve => setTimeout(resolve, 150))
      return
    }

    // Fallback: click the element itself
    element.click()
    await new Promise(resolve => setTimeout(resolve, 150))
  }

  async close(nodeId: string): Promise<void> {
    if (!this.isOpen(nodeId)) return

    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    // Check if this is a tooltip (requires mouseleave)
    const zagComponent = element.getAttribute('data-zag-component')
    const trigger = element.querySelector(
      '[data-part="trigger"], [data-slot="Trigger"]'
    ) as HTMLElement

    if (zagComponent === 'tooltip' && trigger) {
      // Tooltips close on mouseleave
      trigger.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
      trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 200))
      return
    }

    // Find close trigger (support both data-part and data-slot)
    const closeTrigger = element.querySelector(
      '[data-part="close-trigger"], [data-slot="CloseTrigger"]'
    ) as HTMLElement
    if (closeTrigger) {
      closeTrigger.click()
      await new Promise(resolve => setTimeout(resolve, 150))
      return
    }

    // Try pressing Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 150))
  }

  // ===========================================================================
  // Form Controls (Checkbox, Switch)
  // ===========================================================================

  isChecked(nodeId: string): boolean {
    const element = this.findElement(nodeId)
    if (!element) return false

    // Check data-state
    const state = this.getDataState(element)
    if (state === 'checked') return true

    // Check input element
    const input = element.querySelector('input[type="checkbox"]') as HTMLInputElement
    if (input) return input.checked

    // Check data-checked attribute
    if (element.hasAttribute('data-checked')) return true

    // Check aria-checked
    if (element.getAttribute('aria-checked') === 'true') return true

    return false
  }

  async check(nodeId: string): Promise<void> {
    if (this.isChecked(nodeId)) return

    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    // Find control part or input (support both data-part and data-slot)
    const control = element.querySelector(
      '[data-part="control"], [data-slot="Control"]'
    ) as HTMLElement
    const input = element.querySelector('input') as HTMLInputElement

    if (control) {
      control.click()
    } else if (input) {
      input.click()
    } else {
      element.click()
    }

    await new Promise(resolve => setTimeout(resolve, 50))
  }

  async uncheck(nodeId: string): Promise<void> {
    if (!this.isChecked(nodeId)) return

    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    const control = element.querySelector(
      '[data-part="control"], [data-slot="Control"]'
    ) as HTMLElement
    const input = element.querySelector('input') as HTMLInputElement

    if (control) {
      control.click()
    } else if (input) {
      input.click()
    } else {
      element.click()
    }

    await new Promise(resolve => setTimeout(resolve, 50))
  }

  async toggle(nodeId: string): Promise<void> {
    if (this.isChecked(nodeId)) {
      await this.uncheck(nodeId)
    } else {
      await this.check(nodeId)
    }
  }

  // ===========================================================================
  // Value Components (Slider, Input, Select)
  // ===========================================================================

  getValue(nodeId: string): unknown {
    const element = this.findElement(nodeId)
    if (!element) return null

    // Check if element itself is an input/textarea/select
    const tagName = element.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      if ((inputEl as HTMLInputElement).type === 'checkbox')
        return (inputEl as HTMLInputElement).checked
      if (
        (inputEl as HTMLInputElement).type === 'number' ||
        (inputEl as HTMLInputElement).type === 'range'
      ) {
        return parseFloat(inputEl.value)
      }
      return inputEl.value
    }

    // Check for input inside container
    const input = element.querySelector('input, textarea, select') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null

    if (input) {
      if (input.type === 'checkbox') return (input as HTMLInputElement).checked
      if (input.type === 'number' || input.type === 'range') return parseFloat(input.value)
      return input.value
    }

    // Check for slider state (Mirror's custom slider implementation)
    const sliderState = (element as any)._sliderState
    if (sliderState) {
      // Single slider
      if (typeof sliderState.value === 'number') {
        return sliderState.value
      }
      // Range slider
      if (Array.isArray(sliderState.values)) {
        return sliderState.values
      }
    }

    // Check data-value
    const dataValue = element.getAttribute('data-value')
    if (dataValue) {
      // Try to parse as number
      const num = parseFloat(dataValue)
      return isNaN(num) ? dataValue : num
    }

    // Check for slider hidden input
    const hiddenInput = element.querySelector('input[type="hidden"]') as HTMLInputElement | null
    if (hiddenInput) {
      const num = parseFloat(hiddenInput.value)
      return isNaN(num) ? hiddenInput.value : num
    }

    // Check for slider thumb aria-valuenow (Mirror uses data-slot="Thumb", Zag uses data-part="thumb")
    const thumb = element.querySelector(
      '[data-slot="Thumb"], [data-part="thumb"]'
    ) as HTMLElement | null
    if (thumb) {
      const thumbValue = thumb.getAttribute('aria-valuenow') || thumb.getAttribute('data-value')
      if (thumbValue) {
        const num = parseFloat(thumbValue)
        return isNaN(num) ? thumbValue : num
      }
    }

    // Check for slider control aria-valuenow
    const sliderControl = element.querySelector(
      '[data-slot="Control"], [data-part="control"]'
    ) as HTMLElement | null
    if (sliderControl) {
      const ariaValue = sliderControl.getAttribute('aria-valuenow')
      if (ariaValue) {
        return parseFloat(ariaValue)
      }
    }

    // Check for selected value in select component
    const selectedItem = element.querySelector('[data-selected]')
    if (selectedItem) {
      return selectedItem.textContent?.trim() || null
    }

    return null
  }

  async setValue(nodeId: string, value: unknown): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    const input = element.querySelector('input, textarea') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null

    if (input) {
      input.value = String(value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 50))
      return
    }

    // For slider, try to find thumb and set via data attribute
    const thumb = element.querySelector('[data-part="thumb"]') as HTMLElement
    if (thumb) {
      // Sliders are complex - would need to simulate drag
      console.warn('Setting slider value programmatically requires drag simulation')
    }
  }

  // ===========================================================================
  // Tabs
  // ===========================================================================

  getActiveTab(nodeId: string): string | null {
    const element = this.findElement(nodeId)
    if (!element) return null

    // Find active tab trigger (support both data-part and data-slot)
    const activeTab = element.querySelector(
      '[data-part="trigger"][data-selected], [data-slot="Trigger"][data-selected], [role="tab"][aria-selected="true"]'
    )

    if (activeTab) {
      return activeTab.getAttribute('data-value') || activeTab.textContent?.trim() || null
    }

    return null
  }

  async selectTab(nodeId: string, tabValue: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    // Find tab trigger by value or text content (support both data-part and data-slot)
    const triggers = element.querySelectorAll(
      '[data-part="trigger"], [data-slot="Trigger"], [role="tab"]'
    )

    for (const trigger of triggers) {
      const value = trigger.getAttribute('data-value')
      const text = trigger.textContent?.trim()

      if (value === tabValue || text === tabValue) {
        ;(trigger as HTMLElement).click()
        await new Promise(resolve => setTimeout(resolve, 50))
        return
      }
    }

    throw new Error(`Tab "${tabValue}" not found in ${nodeId}`)
  }

  getAllTabs(nodeId: string): string[] {
    const element = this.findElement(nodeId)
    if (!element) return []

    const triggers = element.querySelectorAll(
      '[data-part="trigger"], [data-slot="Trigger"], [role="tab"]'
    )
    return Array.from(triggers)
      .map(t => t.getAttribute('data-value') || t.textContent?.trim() || '')
      .filter(Boolean)
  }

  // ===========================================================================
  // Select/Dropdown
  // ===========================================================================

  getSelectedOption(nodeId: string): string | null {
    const element = this.findElement(nodeId)
    if (!element) return null

    // Check for selected item indicator
    const selectedItem = element.querySelector('[data-selected], [aria-selected="true"]')
    if (selectedItem) {
      return selectedItem.getAttribute('data-value') || selectedItem.textContent?.trim() || null
    }

    // Check trigger for value text (not placeholder)
    const trigger = element.querySelector('[data-part="trigger"], [data-slot="Trigger"]')
    if (trigger) {
      // Check if trigger has placeholder attribute - if so, no selection yet
      if (trigger.hasAttribute('data-placeholder')) {
        return null
      }
      const valueText = trigger.querySelector('[data-part="value-text"], [data-slot="ValueText"]')
      if (valueText) {
        const text = valueText.textContent?.trim()
        // Check if this is the placeholder (look for placeholder attribute on parent)
        const placeholder =
          element.getAttribute('data-placeholder') || trigger.getAttribute('data-placeholder')
        if (text === placeholder) return null
        return text || null
      }
    }

    return this.getValue(nodeId) as string | null
  }

  async selectOption(nodeId: string, optionValue: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    // Open select first
    if (!this.isOpen(nodeId)) {
      await this.open(nodeId)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Find option (support both data-part and data-slot)
    const options = element.querySelectorAll(
      '[data-part="item"], [data-slot="Item"], [role="option"]'
    )

    for (const option of options) {
      const value = option.getAttribute('data-value')
      const text = option.textContent?.trim()

      if (value === optionValue || text === optionValue) {
        ;(option as HTMLElement).click()
        await new Promise(resolve => setTimeout(resolve, 100))
        return
      }
    }

    throw new Error(
      `Option "${optionValue}" not found in ${nodeId}. Available: ${Array.from(options)
        .map(o => o.getAttribute('data-value') || o.textContent?.trim())
        .join(', ')}`
    )
  }

  getOptions(nodeId: string): string[] {
    const element = this.findElement(nodeId)
    if (!element) return []

    const options = element.querySelectorAll(
      '[data-part="item"], [data-slot="Item"], [role="option"]'
    )
    return Array.from(options)
      .map(o => o.getAttribute('data-value') || o.textContent?.trim() || '')
      .filter(Boolean)
  }

  // ===========================================================================
  // Radio Group
  // ===========================================================================

  getSelectedRadio(nodeId: string): string | null {
    const element = this.findElement(nodeId)
    if (!element) return null

    const selected = element.querySelector('[data-state="checked"], [data-checked], input:checked')

    if (!selected) return null

    // Get value from data-value, value attribute, or label text
    const value = selected.getAttribute('data-value') || selected.getAttribute('value')

    if (value) return value

    // Try to find associated label
    const item = selected.closest(
      '[data-part="item"], [data-part="radio-item"], [data-slot="Item"]'
    )
    return (
      (
        item?.querySelector('[data-part="label"], [data-slot="ItemText"]') || item
      )?.textContent?.trim() || null
    )
  }

  async selectRadio(nodeId: string, value: string): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    const items = element.querySelectorAll(
      '[data-part="item"], [data-part="radio-item"], [data-slot="Item"], [role="radio"]'
    )

    for (const item of items) {
      const itemValue = item.getAttribute('data-value')
      const label = (
        item.querySelector('[data-part="label"], [data-slot="ItemText"]') || item
      )?.textContent?.trim()

      if (itemValue === value || label === value) {
        const control = item.querySelector(
          '[data-part="control"], [data-slot="ItemControl"]'
        ) as HTMLElement
        if (control) {
          control.click()
        } else {
          ;(item as HTMLElement).click()
        }
        await new Promise(resolve => setTimeout(resolve, 50))
        return
      }
    }

    throw new Error(
      `Radio option "${value}" not found in ${nodeId}. Available: ${Array.from(items)
        .map(i => i.getAttribute('data-value'))
        .join(', ')}`
    )
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  /**
   * Wait for state to change
   */
  private async waitForStateChange(
    nodeId: string,
    expectedState: string,
    timeout = 1000
  ): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = this.findElement(nodeId)
      if (!element) break

      const state = this.getDataState(element)
      if (state === expectedState) return

      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  /**
   * Send a custom event to the Zag machine
   */
  async send(nodeId: string, event: string, payload?: unknown): Promise<void> {
    const element = this.findElement(nodeId)
    if (!element) throw new Error(`Element ${nodeId} not found`)

    const scope = this.getZagScope(element)
    const zagRegistry = (window as any).__zagMachines__

    if (zagRegistry && scope && zagRegistry[scope]?.send) {
      zagRegistry[scope].send({ type: event, ...(payload as object) })
      await new Promise(resolve => setTimeout(resolve, 50))
      return
    }

    console.warn(`Cannot send event to ${nodeId}: Zag machine not found`)
  }
}

export function createZagAPI(): ZagAPI {
  return new ZagAPIImpl()
}
