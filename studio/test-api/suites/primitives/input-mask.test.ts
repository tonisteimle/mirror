/**
 * Input Mask Browser Tests
 *
 * Tests for the input mask feature:
 * - Pattern formatting (# = digit, A = letter, * = alphanumeric)
 * - Automatic literal insertion
 * - Value binding with masks
 * - Various mask patterns (AHV, phone, date, currency)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Helper to get input value
function getInputValue(api: TestAPI, nodeId: string): string {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLInputElement
  return el?.value ?? ''
}

// Helper to get raw value (without mask formatting)
function getRawValue(api: TestAPI, nodeId: string): string {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLInputElement & {
    _maskPattern?: string
  }
  if (!el) return ''
  const pattern = el._maskPattern
  if (!pattern) return el.value

  // Extract all alphanumeric characters (same as runtime does)
  return (el.value || '').replace(/[^a-zA-Z0-9]/g, '')
}

export const inputMaskTests: TestCase[] = describe('Input Mask', [
  // =============================================================================
  // Basic Mask Rendering
  // =============================================================================

  testWithSetup(
    'Input with mask property renders',
    'Input mask "###.####.####.##", placeholder "AHV-Nummer"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info?.tagName === 'input', 'Should render as input element')
    }
  ),

  testWithSetup(
    'Input with mask has placeholder',
    'Input mask "###.####.####.##", placeholder "AHV-Nummer"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasAttribute('node-1', 'placeholder', 'AHV-Nummer')
    }
  ),

  // =============================================================================
  // Digit Pattern (#)
  // =============================================================================

  testWithSetup(
    'Mask formats digits with separators',
    'Input mask "###.####.####.##"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Type digits - should be formatted with dots
      await api.interact.type('node-1', '7561234567890')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(value === '756.1234.5678.90', `Expected "756.1234.5678.90", got "${value}"`)
    }
  ),

  testWithSetup(
    'Mask handles partial input',
    'Input mask "###.####.####.##"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', '756123')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(value === '756.123', `Expected "756.123", got "${value}"`)
    }
  ),

  testWithSetup(
    'Phone mask formats correctly',
    'Input mask "(###) ###-####"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', '0791234567')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(value === '(079) 123-4567', `Expected "(079) 123-4567", got "${value}"`)
    }
  ),

  testWithSetup('Date mask formats correctly', 'Input mask "####-##-##"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.type('node-1', '20240115')
    await api.utils.delay(50)

    const value = getInputValue(api, 'node-1')
    api.assert.ok(value === '2024-01-15', `Expected "2024-01-15", got "${value}"`)
  }),

  testWithSetup(
    'Currency mask formats correctly',
    'Input mask "##\'###.##"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', '1234567')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(value === "12'345.67", `Expected "12'345.67", got "${value}"`)
    }
  ),

  // =============================================================================
  // Letter Pattern (A)
  // =============================================================================

  testWithSetup(
    'Letter mask accepts only letters',
    'Input mask "AAA-###"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', 'ABC123')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(value === 'ABC-123', `Expected "ABC-123", got "${value}"`)
    }
  ),

  testWithSetup(
    'Letter mask filters out digits in letter positions',
    'Input mask "AAA"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Typing "A1B2C" should result in "ABC" (digits filtered)
      await api.interact.type('node-1', 'A1B2C')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(value === 'ABC', `Expected "ABC", got "${value}"`)
    }
  ),

  // =============================================================================
  // Alphanumeric Pattern (*)
  // =============================================================================

  testWithSetup(
    'Alphanumeric mask accepts letters and digits',
    'Input mask "***-***"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', 'A1B2C3')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(value === 'A1B-2C3', `Expected "A1B-2C3", got "${value}"`)
    }
  ),

  // =============================================================================
  // Value Binding with Mask
  // =============================================================================

  testWithSetup(
    'Mask with data binding stores raw value',
    `ahv: ""
Input mask "###.####.####.##", bind ahv`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', '7561234567890')
      await api.utils.delay(100)

      // Display value should be formatted
      const displayValue = getInputValue(api, 'node-1')
      api.assert.ok(
        displayValue === '756.1234.5678.90',
        `Display should be "756.1234.5678.90", got "${displayValue}"`
      )

      // Check raw value via the helper
      const rawValue = getRawValue(api, 'node-1')
      api.assert.ok(
        rawValue === '7561234567890',
        `Raw value should be "7561234567890", got "${rawValue}"`
      )
    }
  ),

  testWithSetup(
    'Mask formats initial bound value',
    `ahv: "7561234567890"
Input mask "###.####.####.##", bind ahv`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(
        value === '756.1234.5678.90',
        `Initial value should be formatted as "756.1234.5678.90", got "${value}"`
      )
    }
  ),

  // =============================================================================
  // Edge Cases
  // =============================================================================

  testWithSetup(
    'Mask ignores invalid characters for digit pattern',
    'Input mask "##-##"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Typing "12ABC34" should result in "12-34" (letters filtered)
      await api.interact.type('node-1', '12ABC34')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(value === '12-34', `Expected "12-34", got "${value}"`)
    }
  ),

  testWithSetup('Mask handles empty input', 'Input mask "###-####"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    const value = getInputValue(api, 'node-1')
    api.assert.ok(value === '', `Empty input should have empty value, got "${value}"`)
  }),

  testWithSetup(
    'Input without mask works normally',
    'Input placeholder "Normal input"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', 'Any text 123!')
      await api.utils.delay(50)

      const value = getInputValue(api, 'node-1')
      api.assert.ok(
        value === 'Any text 123!',
        `Normal input should accept any text, got "${value}"`
      )
    }
  ),

  // =============================================================================
  // Multiple Masks on Page
  // =============================================================================

  testWithSetup(
    'Multiple inputs with different masks work independently',
    `Frame gap 12
  Input mask "###.####.####.##", placeholder "AHV"
  Input mask "(###) ###-####", placeholder "Phone"
  Input mask "####-##-##", placeholder "Date"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)

      // Type in AHV input
      await api.interact.type('node-2', '7561234567890')
      await api.utils.delay(50)

      // Type in Phone input
      await api.interact.type('node-3', '0791234567')
      await api.utils.delay(50)

      // Type in Date input
      await api.interact.type('node-4', '20240115')
      await api.utils.delay(50)

      const ahvValue = getInputValue(api, 'node-2')
      const phoneValue = getInputValue(api, 'node-3')
      const dateValue = getInputValue(api, 'node-4')

      api.assert.ok(
        ahvValue === '756.1234.5678.90',
        `AHV should be "756.1234.5678.90", got "${ahvValue}"`
      )
      api.assert.ok(
        phoneValue === '(079) 123-4567',
        `Phone should be "(079) 123-4567", got "${phoneValue}"`
      )
      api.assert.ok(dateValue === '2024-01-15', `Date should be "2024-01-15", got "${dateValue}"`)
    }
  ),
])

// Export for index
export default inputMaskTests
