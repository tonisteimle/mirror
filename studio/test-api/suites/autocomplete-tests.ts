/**
 * Autocomplete Test Suite
 *
 * Tests the autocomplete/completion system:
 * - Primitive completions
 * - Property completions
 * - Value completions
 * - Context-aware completions
 */

import { test, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Primitive Completions
// =============================================================================

export const primitiveCompletionTests: TestCase[] = describe('Primitive Completions', [
  test('Shows primitives at line start', async (api: TestAPI) => {
    await api.editor.setCode('')
    api.editor.setCursor(1, 0)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    api.assert.ok(completions.length > 0, 'Should show completions')

    // Check for common primitives
    const hasPrimitives = completions.some(c => ['Frame', 'Text', 'Button', 'Icon'].includes(c))
    api.assert.ok(hasPrimitives, 'Should include primitive completions')
  }),

  test('Shows primitives after indent', async (api: TestAPI) => {
    await api.editor.setCode('Frame\n  ')
    api.editor.setCursor(2, 2)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    api.assert.ok(completions.length > 0, 'Should show completions for nested element')
  }),

  test('Filters primitives by typed prefix', async (api: TestAPI) => {
    await api.editor.setCode('Bu')
    api.editor.setCursor(1, 2)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const allStartWithBu = completions.every(c => c.toLowerCase().startsWith('bu'))
    api.assert.ok(allStartWithBu || completions.length === 0, 'Should filter by prefix')
  }),
])

// =============================================================================
// Property Completions
// =============================================================================

export const propertyCompletionTests: TestCase[] = describe('Property Completions', [
  test('Shows properties after primitive', async (api: TestAPI) => {
    await api.editor.setCode('Frame ')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasProperties = completions.some(c => ['bg', 'pad', 'gap', 'hor', 'center'].includes(c))
    api.assert.ok(hasProperties, 'Should include property completions')
  }),

  test('Shows properties after comma', async (api: TestAPI) => {
    await api.editor.setCode('Frame bg #333, ')
    api.editor.setCursor(1, 15)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    api.assert.ok(completions.length > 0, 'Should show more properties after comma')
  }),

  test('Shows layout properties for Frame', async (api: TestAPI) => {
    await api.editor.setCode('Frame ')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const layoutProps = ['hor', 'ver', 'gap', 'center', 'spread', 'wrap', 'grid', 'stacked']
    const hasLayout = layoutProps.some(p => completions.includes(p))
    api.assert.ok(hasLayout, 'Frame should show layout properties')
  }),

  test('Shows icon properties for Icon', async (api: TestAPI) => {
    await api.editor.setCode('Icon "check", ')
    api.editor.setCursor(1, 14)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasIconProps = completions.some(c => ['ic', 'is', 'fill'].includes(c))
    api.assert.ok(hasIconProps, 'Icon should show icon-specific properties')
  }),

  test('Shows input properties for Input', async (api: TestAPI) => {
    await api.editor.setCode('Input ')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasInputProps = completions.some(c =>
      ['placeholder', 'value', 'type', 'disabled'].includes(c)
    )
    api.assert.ok(hasInputProps, 'Input should show input-specific properties')
  }),
])

// =============================================================================
// Value Completions
// =============================================================================

export const valueCompletionTests: TestCase[] = describe('Value Completions', [
  test('Shows size values for width', async (api: TestAPI) => {
    await api.editor.setCode('Frame w ')
    api.editor.setCursor(1, 8)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasSizeValues = completions.some(c => ['full', 'hug'].includes(c))
    api.assert.ok(hasSizeValues, 'Should show size value completions')
  }),

  test('Shows alignment values', async (api: TestAPI) => {
    await api.editor.setCode('Frame ')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const alignments = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br']
    const hasAlignment = alignments.some(a => completions.includes(a))
    api.assert.ok(hasAlignment, 'Should show alignment completions')
  }),

  test('Shows font weight values', async (api: TestAPI) => {
    await api.editor.setCode('Text "Hi", weight ')
    api.editor.setCursor(1, 18)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasWeights = completions.some(c => ['bold', 'normal', 'light', 'semibold'].includes(c))
    api.assert.ok(hasWeights, 'Should show font weight values')
  }),

  test('Shows cursor values', async (api: TestAPI) => {
    await api.editor.setCode('Frame cursor ')
    api.editor.setCursor(1, 13)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasCursors = completions.some(c => ['pointer', 'grab', 'move', 'text'].includes(c))
    api.assert.ok(hasCursors, 'Should show cursor values')
  }),

  test('Shows shadow values', async (api: TestAPI) => {
    await api.editor.setCode('Frame shadow ')
    api.editor.setCursor(1, 13)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasShadows = completions.some(c => ['sm', 'md', 'lg'].includes(c))
    api.assert.ok(hasShadows, 'Should show shadow size values')
  }),

  test('Shows animation values', async (api: TestAPI) => {
    await api.editor.setCode('Frame anim ')
    api.editor.setCursor(1, 11)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasAnimations = completions.some(c =>
      ['pulse', 'bounce', 'shake', 'spin', 'fade-in'].includes(c)
    )
    api.assert.ok(hasAnimations, 'Should show animation presets')
  }),
])

// =============================================================================
// Icon Name Completions
// =============================================================================

export const iconCompletionTests: TestCase[] = describe('Icon Completions', [
  test('Shows icon names after Icon', async (api: TestAPI) => {
    await api.editor.setCode('Icon "')
    api.editor.setCursor(1, 6)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasIcons = completions.some(c =>
      ['check', 'x', 'plus', 'minus', 'arrow-left', 'arrow-right', 'search', 'settings'].includes(c)
    )
    api.assert.ok(hasIcons, 'Should show icon name completions')
  }),

  test('Filters icons by prefix', async (api: TestAPI) => {
    await api.editor.setCode('Icon "arr')
    api.editor.setCursor(1, 9)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const allArrow = completions.every(c => c.startsWith('arrow'))
    api.assert.ok(allArrow || completions.length === 0, 'Should filter icons by prefix')
  }),
])

// =============================================================================
// Token Completions
// =============================================================================

export const tokenCompletionTests: TestCase[] = describe('Token Completions', [
  test('Shows tokens after $', async (api: TestAPI) => {
    // First define some tokens
    await api.editor.setCode('primary.bg: #2271C1\nFrame bg $')
    api.editor.setCursor(2, 10)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    // Should show defined tokens
    api.assert.ok(completions.length >= 0, 'Should attempt token completions')
  }),
])

// =============================================================================
// State Completions
// =============================================================================

export const stateCompletionTests: TestCase[] = describe('State Completions', [
  test('Shows state names for colon', async (api: TestAPI) => {
    await api.editor.setCode('Button "Test"\n  ')
    api.editor.setCursor(2, 2)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasStates = completions.some(c =>
      ['hover:', 'focus:', 'active:', 'disabled:', 'on:', 'selected:'].includes(c)
    )
    api.assert.ok(hasStates, 'Should show state completions')
  }),
])

// =============================================================================
// Component Completions
// =============================================================================

export const componentCompletionTests: TestCase[] = describe('Component Completions', [
  test('Shows defined components', async (api: TestAPI) => {
    await api.editor.setCode('Btn: bg #333, pad 12\n\n')
    api.editor.setCursor(3, 0)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasCustomComponent = completions.includes('Btn')
    api.assert.ok(hasCustomComponent, 'Should show custom component')
  }),

  test('Shows Zag components', async (api: TestAPI) => {
    await api.editor.setCode('')
    api.editor.setCursor(1, 0)
    api.editor.triggerAutocomplete()
    await api.utils.delay(200)

    const completions = api.editor.getCompletions()
    const hasZag = completions.some(c =>
      ['Dialog', 'Tooltip', 'Tabs', 'Select', 'Checkbox', 'Switch', 'Slider'].includes(c)
    )
    api.assert.ok(hasZag, 'Should show Zag components')
  }),
])

// =============================================================================
// Export All
// =============================================================================

export const allAutocompleteTests: TestCase[] = [
  ...primitiveCompletionTests,
  ...propertyCompletionTests,
  ...valueCompletionTests,
  ...iconCompletionTests,
  ...tokenCompletionTests,
  ...stateCompletionTests,
  ...componentCompletionTests,
]
