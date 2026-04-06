/**
 * Test Helpers for Property Panel Testing
 *
 * Utility functions to simplify property panel test setup and assertions.
 */

import { vi } from 'vitest'
import type { PropertyPanel } from '../../../studio/panels'
import type { MockPropertyExtractor, MockCodeModifier, MockSelectionProvider } from '../mocks/property-panel-mocks'

// ============================================
// DOM HELPERS
// ============================================

/**
 * Gets a property input element by property name
 */
export function getPropertyInput(container: HTMLElement, propName: string): HTMLInputElement | null {
  return container.querySelector(`[data-property="${propName}"]`)
}

/**
 * Gets all property inputs in the panel
 */
export function getAllPropertyInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('[data-property]'))
}

/**
 * Gets all property fields (including non-input fields)
 */
export function getAllPropertyFields(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.pp-field, .property-field'))
}

/**
 * Gets a color swatch element
 */
export function getColorSwatch(container: HTMLElement, propName: string): HTMLElement | null {
  const field = container.querySelector(`[data-property="${propName}"]`)?.closest('.pp-field')
  return field?.querySelector('.pp-color-trigger, .color-swatch') || null
}

/**
 * Gets a preset button by value
 */
export function getPresetButton(container: HTMLElement, propName: string, value: string): HTMLElement | null {
  const field = container.querySelector(`[data-property="${propName}"]`)?.closest('.pp-field')
  return field?.querySelector(`[data-value="${value}"], .preset-button:contains("${value}")`) || null
}

/**
 * Gets category section by name
 */
export function getCategorySection(container: HTMLElement, categoryName: string): HTMLElement | null {
  return container.querySelector(`.category-${categoryName}, [data-category="${categoryName}"]`)
}

/**
 * Checks if panel is in empty state
 */
export function isEmptyState(container: HTMLElement): boolean {
  return container.querySelector('.pp-empty') !== null
}

/**
 * Checks if panel shows not found state
 */
export function isNotFoundState(container: HTMLElement): boolean {
  return container.querySelector('.pp-not-found') !== null
}

/**
 * Checks if panel has content
 */
export function hasContent(container: HTMLElement): boolean {
  return container.querySelector('.pp-content') !== null
}

// ============================================
// INPUT SIMULATION
// ============================================

/**
 * Simulates typing in an input field
 */
export async function simulateInputChange(
  input: HTMLInputElement,
  newValue: string,
  debounceMs = 350
): Promise<void> {
  input.value = newValue
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await vi.advanceTimersByTime(debounceMs)
}

/**
 * Simulates a complete property edit flow
 */
export async function simulatePropertyEdit(
  container: HTMLElement,
  propName: string,
  newValue: string,
  debounceMs = 350
): Promise<void> {
  const input = getPropertyInput(container, propName)
  if (!input) {
    throw new Error(`Property input "${propName}" not found`)
  }
  await simulateInputChange(input, newValue, debounceMs)
}

/**
 * Simulates clicking a preset button
 */
export function simulatePresetClick(container: HTMLElement, propName: string, value: string): void {
  const button = getPresetButton(container, propName, value)
  if (!button) {
    throw new Error(`Preset button "${value}" for property "${propName}" not found`)
  }
  button.click()
}

/**
 * Simulates clicking a color swatch
 */
export function simulateColorSwatchClick(container: HTMLElement, propName: string): void {
  const swatch = getColorSwatch(container, propName)
  if (!swatch) {
    throw new Error(`Color swatch for property "${propName}" not found`)
  }
  swatch.click()
}

/**
 * Simulates selecting from a dropdown
 */
export function simulateSelectChange(container: HTMLElement, propName: string, value: string): void {
  const select = container.querySelector(`select[data-property="${propName}"]`) as HTMLSelectElement | null
  if (!select) {
    throw new Error(`Select element for property "${propName}" not found`)
  }
  select.value = value
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

// ============================================
// ASSERTIONS
// ============================================

/**
 * Asserts that a property has a specific value displayed
 */
export function assertPropertyValue(container: HTMLElement, propName: string, expectedValue: string): void {
  const input = getPropertyInput(container, propName)
  if (!input) {
    throw new Error(`Property input "${propName}" not found`)
  }
  if (input.value !== expectedValue) {
    throw new Error(`Expected property "${propName}" to have value "${expectedValue}", but got "${input.value}"`)
  }
}

/**
 * Asserts that a property field shows inherited indicator
 */
export function assertPropertyInherited(container: HTMLElement, propName: string): void {
  const field = getPropertyInput(container, propName)?.closest('.pp-field, .property-field')
  if (!field?.classList.contains('inherited')) {
    throw new Error(`Expected property "${propName}" to be marked as inherited`)
  }
}

/**
 * Asserts that a property field shows instance indicator (not inherited)
 */
export function assertPropertyInstance(container: HTMLElement, propName: string): void {
  const field = getPropertyInput(container, propName)?.closest('.pp-field, .property-field')
  if (field?.classList.contains('inherited')) {
    throw new Error(`Expected property "${propName}" to be marked as instance, but it's inherited`)
  }
}

/**
 * Asserts that a property input has validation error
 */
export function assertPropertyInvalid(container: HTMLElement, propName: string): void {
  const input = getPropertyInput(container, propName)
  if (!input?.classList.contains('invalid')) {
    throw new Error(`Expected property "${propName}" to be invalid`)
  }
}

/**
 * Asserts that a property input is valid (no error)
 */
export function assertPropertyValid(container: HTMLElement, propName: string): void {
  const input = getPropertyInput(container, propName)
  if (input?.classList.contains('invalid')) {
    throw new Error(`Expected property "${propName}" to be valid, but it has error`)
  }
}

/**
 * Asserts that CodeModifier.updateProperty was called with expected args
 */
export function assertPropertyUpdated(
  modifier: MockCodeModifier,
  nodeId: string,
  propName: string,
  value: string
): void {
  const update = modifier._updateHistory.find(
    (u) => u.nodeId === nodeId && u.prop === propName && u.value === value
  )
  if (!update) {
    throw new Error(
      `Expected updateProperty(${nodeId}, ${propName}, ${value}) to be called, ` +
        `but got: ${JSON.stringify(modifier._updateHistory)}`
    )
  }
}

/**
 * Asserts that CodeModifier.updateProperty was NOT called
 */
export function assertNoPropertyUpdates(modifier: MockCodeModifier): void {
  if (modifier._updateHistory.length > 0) {
    throw new Error(
      `Expected no property updates, but got: ${JSON.stringify(modifier._updateHistory)}`
    )
  }
}

// ============================================
// PANEL LIFECYCLE
// ============================================

/**
 * Waits for panel to update after selection change
 */
export async function waitForPanelUpdate(container: HTMLElement, timeoutMs = 100): Promise<void> {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      observer.disconnect()
      resolve()
    })
    observer.observe(container, { childList: true, subtree: true })

    // Fallback timeout
    setTimeout(() => {
      observer.disconnect()
      resolve()
    }, timeoutMs)
  })
}

/**
 * Creates a test container and appends to document
 */
export function createTestContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'test-property-panel'
  document.body.appendChild(container)
  return container
}

/**
 * Removes test container from document
 */
export function removeTestContainer(container: HTMLElement): void {
  container.remove()
}

// ============================================
// SCENARIO BUILDERS
// ============================================

export interface PropertyPanelTestScenario {
  container: HTMLElement
  selectionProvider: MockSelectionProvider
  extractor: MockPropertyExtractor
  modifier: MockCodeModifier
  onCodeChange: ReturnType<typeof vi.fn>
  cleanup: () => void
}

/**
 * Sets up a complete property panel test scenario
 */
export function setupPropertyPanelScenario(
  createSelectionProvider: () => MockSelectionProvider,
  createExtractor: () => MockPropertyExtractor,
  createModifier: () => MockCodeModifier
): PropertyPanelTestScenario {
  const container = createTestContainer()
  const selectionProvider = createSelectionProvider()
  const extractor = createExtractor()
  const modifier = createModifier()
  const onCodeChange = vi.fn()

  return {
    container,
    selectionProvider,
    extractor,
    modifier,
    onCodeChange,
    cleanup: () => removeTestContainer(container),
  }
}

// ============================================
// TOKEN HELPERS
// ============================================

/**
 * Simulates token autocomplete appearing
 */
export function triggerTokenAutocomplete(container: HTMLElement, propName: string): void {
  const input = getPropertyInput(container, propName)
  if (!input) {
    throw new Error(`Property input "${propName}" not found`)
  }
  input.value = '$'
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Gets token autocomplete dropdown
 */
export function getTokenAutocomplete(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.token-autocomplete, .token-picker')
}

/**
 * Selects a token from autocomplete
 */
export function selectToken(container: HTMLElement, tokenName: string): void {
  const autocomplete = getTokenAutocomplete(container)
  if (!autocomplete) {
    throw new Error('Token autocomplete not found')
  }
  const option = autocomplete.querySelector(`[data-token="${tokenName}"], .token-option`)
  if (!option) {
    throw new Error(`Token option "${tokenName}" not found`)
  }
  ;(option as HTMLElement).click()
}
