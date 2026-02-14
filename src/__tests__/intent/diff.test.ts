/**
 * Tests für Intent Diff Module
 *
 * Testet JSON Patch Generierung und Anwendung
 */

import { describe, it, expect } from 'vitest'
import {
  generatePatch,
  applyPatch,
  optimizePatch,
  parseDiffResponse,
  type Patch
} from '../../intent/diff'
import type { Intent } from '../../intent/schema'

// =============================================================================
// Test Utilities
// =============================================================================

function createEmptyIntent(): Intent {
  return {
    tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
    components: [],
    layout: []
  }
}

// =============================================================================
// generatePatch Tests
// =============================================================================

describe('generatePatch', () => {
  it('detects no changes', () => {
    const intent = createEmptyIntent()
    const patch = generatePatch(intent, intent)
    expect(patch).toEqual([])
  })

  it('detects added token', () => {
    const oldIntent = createEmptyIntent()
    const newIntent: Intent = {
      ...createEmptyIntent(),
      tokens: {
        colors: { primary: '#3B82F6' },
        spacing: {}, radii: {}, sizes: {}
      }
    }

    const patch = generatePatch(oldIntent, newIntent)
    expect(patch).toContainEqual({
      op: 'add',
      path: '/tokens/colors/primary',
      value: '#3B82F6'
    })
  })

  it('detects removed token', () => {
    const oldIntent: Intent = {
      ...createEmptyIntent(),
      tokens: {
        colors: { primary: '#3B82F6' },
        spacing: {}, radii: {}, sizes: {}
      }
    }
    const newIntent = createEmptyIntent()

    const patch = generatePatch(oldIntent, newIntent)
    expect(patch).toContainEqual({
      op: 'remove',
      path: '/tokens/colors/primary'
    })
  })

  it('detects changed token', () => {
    const oldIntent: Intent = {
      ...createEmptyIntent(),
      tokens: {
        colors: { primary: '#3B82F6' },
        spacing: {}, radii: {}, sizes: {}
      }
    }
    const newIntent: Intent = {
      ...createEmptyIntent(),
      tokens: {
        colors: { primary: '#EF4444' },
        spacing: {}, radii: {}, sizes: {}
      }
    }

    const patch = generatePatch(oldIntent, newIntent)
    expect(patch).toContainEqual({
      op: 'replace',
      path: '/tokens/colors/primary',
      value: '#EF4444'
    })
  })

  it('detects added layout node', () => {
    const oldIntent = createEmptyIntent()
    const newIntent: Intent = {
      ...createEmptyIntent(),
      layout: [{ component: 'Button', text: 'Click' }]
    }

    const patch = generatePatch(oldIntent, newIntent)
    expect(patch).toContainEqual({
      op: 'add',
      path: '/layout/0',
      value: { component: 'Button', text: 'Click' }
    })
  })

  it('detects changed layout node', () => {
    const oldIntent: Intent = {
      ...createEmptyIntent(),
      layout: [{ component: 'Button', text: 'Click' }]
    }
    const newIntent: Intent = {
      ...createEmptyIntent(),
      layout: [{ component: 'Button', text: 'Submit' }]
    }

    const patch = generatePatch(oldIntent, newIntent)
    expect(patch).toContainEqual({
      op: 'replace',
      path: '/layout/0',
      value: { component: 'Button', text: 'Submit' }
    })
  })

  it('detects added component definition', () => {
    const oldIntent = createEmptyIntent()
    const newIntent: Intent = {
      ...createEmptyIntent(),
      components: [{ name: 'Card', style: { padding: 16 } }]
    }

    const patch = generatePatch(oldIntent, newIntent)
    expect(patch).toContainEqual({
      op: 'add',
      path: '/components/0',
      value: { name: 'Card', style: { padding: 16 } }
    })
  })
})

// =============================================================================
// applyPatch Tests
// =============================================================================

describe('applyPatch', () => {
  it('applies add operation to tokens', () => {
    const intent = createEmptyIntent()
    const patch: Patch = [
      { op: 'add', path: '/tokens/colors/primary', value: '#3B82F6' }
    ]

    const result = applyPatch(intent, patch)
    expect(result.tokens.colors?.primary).toBe('#3B82F6')
  })

  it('applies remove operation', () => {
    const intent: Intent = {
      ...createEmptyIntent(),
      tokens: {
        colors: { primary: '#3B82F6' },
        spacing: {}, radii: {}, sizes: {}
      }
    }
    const patch: Patch = [
      { op: 'remove', path: '/tokens/colors/primary' }
    ]

    const result = applyPatch(intent, patch)
    expect(result.tokens.colors?.primary).toBeUndefined()
  })

  it('applies replace operation', () => {
    const intent: Intent = {
      ...createEmptyIntent(),
      tokens: {
        colors: { primary: '#3B82F6' },
        spacing: {}, radii: {}, sizes: {}
      }
    }
    const patch: Patch = [
      { op: 'replace', path: '/tokens/colors/primary', value: '#EF4444' }
    ]

    const result = applyPatch(intent, patch)
    expect(result.tokens.colors?.primary).toBe('#EF4444')
  })

  it('applies add to array', () => {
    const intent = createEmptyIntent()
    const patch: Patch = [
      { op: 'add', path: '/layout/0', value: { component: 'Button' } }
    ]

    const result = applyPatch(intent, patch)
    expect(result.layout).toHaveLength(1)
    expect(result.layout[0].component).toBe('Button')
  })

  it('applies multiple operations in sequence', () => {
    const intent = createEmptyIntent()
    const patch: Patch = [
      { op: 'add', path: '/tokens/colors/primary', value: '#3B82F6' },
      { op: 'add', path: '/tokens/spacing/md', value: 16 },
      { op: 'add', path: '/layout/0', value: { component: 'Box' } }
    ]

    const result = applyPatch(intent, patch)
    expect(result.tokens.colors?.primary).toBe('#3B82F6')
    expect(result.tokens.spacing?.md).toBe(16)
    expect(result.layout).toHaveLength(1)
  })

  it('does not mutate original intent', () => {
    const intent: Intent = {
      ...createEmptyIntent(),
      tokens: {
        colors: { primary: '#3B82F6' },
        spacing: {}, radii: {}, sizes: {}
      }
    }
    const patch: Patch = [
      { op: 'replace', path: '/tokens/colors/primary', value: '#EF4444' }
    ]

    applyPatch(intent, patch)
    expect(intent.tokens.colors?.primary).toBe('#3B82F6') // Original unchanged
  })
})

// =============================================================================
// optimizePatch Tests
// =============================================================================

describe('optimizePatch', () => {
  it('combines add + replace on same path', () => {
    const patch: Patch = [
      { op: 'add', path: '/tokens/colors/primary', value: '#3B82F6' },
      { op: 'replace', path: '/tokens/colors/primary', value: '#EF4444' }
    ]

    const optimized = optimizePatch(patch)
    expect(optimized).toHaveLength(1)
    expect(optimized[0]).toEqual({
      op: 'add',
      path: '/tokens/colors/primary',
      value: '#EF4444'
    })
  })

  it('eliminates add + remove on same path', () => {
    const patch: Patch = [
      { op: 'add', path: '/tokens/colors/primary', value: '#3B82F6' },
      { op: 'remove', path: '/tokens/colors/primary' }
    ]

    const optimized = optimizePatch(patch)
    expect(optimized).toHaveLength(0)
  })

  it('combines replace + replace on same path', () => {
    const patch: Patch = [
      { op: 'replace', path: '/tokens/colors/primary', value: '#3B82F6' },
      { op: 'replace', path: '/tokens/colors/primary', value: '#EF4444' }
    ]

    const optimized = optimizePatch(patch)
    expect(optimized).toHaveLength(1)
    expect(optimized[0].value).toBe('#EF4444')
  })

  it('converts replace + remove to just remove', () => {
    const patch: Patch = [
      { op: 'replace', path: '/tokens/colors/primary', value: '#3B82F6' },
      { op: 'remove', path: '/tokens/colors/primary' }
    ]

    const optimized = optimizePatch(patch)
    expect(optimized).toHaveLength(1)
    expect(optimized[0].op).toBe('remove')
    expect(optimized[0].value).toBeUndefined()
  })

  it('keeps operations on different paths', () => {
    const patch: Patch = [
      { op: 'add', path: '/tokens/colors/primary', value: '#3B82F6' },
      { op: 'add', path: '/tokens/colors/secondary', value: '#6B7280' }
    ]

    const optimized = optimizePatch(patch)
    expect(optimized).toHaveLength(2)
  })
})

// =============================================================================
// parseDiffResponse Tests
// =============================================================================

describe('parseDiffResponse', () => {
  it('parses full intent response', () => {
    const currentIntent = createEmptyIntent()
    const response = JSON.stringify({
      tokens: { colors: { primary: '#3B82F6' }, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{ component: 'Button', text: 'Click' }]
    })

    const result = parseDiffResponse(response, currentIntent)
    expect(result).not.toBeNull()
    expect(result?.layout[0].component).toBe('Button')
  })

  it('parses patch response and applies it', () => {
    const currentIntent: Intent = {
      ...createEmptyIntent(),
      tokens: {
        colors: { primary: '#3B82F6' },
        spacing: {}, radii: {}, sizes: {}
      }
    }
    const response = JSON.stringify({
      patch: [
        { op: 'replace', path: '/tokens/colors/primary', value: '#EF4444' }
      ]
    })

    const result = parseDiffResponse(response, currentIntent)
    expect(result).not.toBeNull()
    expect(result?.tokens.colors?.primary).toBe('#EF4444')
  })

  it('handles markdown-wrapped JSON', () => {
    const currentIntent = createEmptyIntent()
    const response = '```json\n' + JSON.stringify({
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: []
    }) + '\n```'

    const result = parseDiffResponse(response, currentIntent)
    expect(result).not.toBeNull()
  })

  it('returns null for invalid JSON', () => {
    const currentIntent = createEmptyIntent()
    const response = 'not valid json {'

    const result = parseDiffResponse(response, currentIntent)
    expect(result).toBeNull()
  })
})

// =============================================================================
// Round-Trip Tests
// =============================================================================

describe('Diff Round-Trip', () => {
  it('applying generated patch produces target intent', () => {
    const oldIntent: Intent = {
      tokens: { colors: { primary: '#3B82F6' }, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{ component: 'Box', text: 'Hello' }]
    }

    const newIntent: Intent = {
      tokens: { colors: { primary: '#EF4444', secondary: '#6B7280' }, spacing: {}, radii: {}, sizes: {} },
      components: [{ name: 'Card', style: { padding: 16 } }],
      layout: [{ component: 'Card', text: 'Welcome' }]
    }

    const patch = generatePatch(oldIntent, newIntent)
    const result = applyPatch(oldIntent, patch)

    // Compare structures
    expect(result.tokens.colors?.primary).toBe('#EF4444')
    expect(result.tokens.colors?.secondary).toBe('#6B7280')
    expect(result.components).toHaveLength(1)
    expect(result.layout[0].component).toBe('Card')
  })
})
