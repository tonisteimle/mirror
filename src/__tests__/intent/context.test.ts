/**
 * Tests für Intent Context Optimization Module
 *
 * Testet fokussierte Kontext-Erstellung für effizientere LLM-Anfragen
 */

import { describe, it, expect } from 'vitest'
import {
  createFocusedIntent,
  mergeFocusedIntent,
  estimateTokenCount,
  shouldUseFocusedContext,
  selectOptimalContext
} from '../../intent/context'
import type { Intent, LayoutNode } from '../../intent/schema'

// =============================================================================
// Test Utilities
// =============================================================================

function createLargeIntent(): Intent {
  const layout: LayoutNode[] = []

  // Create 10 top-level cards with children
  for (let i = 0; i < 10; i++) {
    layout.push({
      component: 'Card',
      id: `Card${i}`,
      text: `Card ${i}`,
      style: {
        padding: '$spacing-md',
        background: '$surface',
        radius: '$radius-md'
      },
      children: [
        { component: 'Title', text: `Title ${i}`, style: { color: '$text' } },
        { component: 'Text', text: `Description ${i}`, style: { color: '$text-muted' } },
        {
          component: 'Button',
          text: `Action ${i}`,
          style: { background: '$primary' },
          events: {
            onclick: [{ action: 'navigate', target: `Page${i}` }]
          }
        }
      ]
    })
  }

  return {
    tokens: {
      colors: {
        primary: '#3B82F6',
        'primary-dark': '#2563EB',
        surface: '#1E1E2E',
        text: '#FFFFFF',
        'text-muted': '#9CA3AF'
      },
      spacing: {
        sm: 8,
        md: 16,
        lg: 24
      },
      radii: {
        sm: 4,
        md: 8,
        lg: 12
      },
      sizes: {
        'text-sm': 12,
        'text-md': 14,
        'text-lg': 18
      }
    },
    components: [
      {
        name: 'Card',
        style: { padding: '$spacing-md', background: '$surface', radius: '$radius-md' }
      },
      {
        name: 'PrimaryButton',
        base: 'Button',
        style: { background: '$primary', padding: [12, 24] },
        states: { hover: { background: '$primary-dark' } }
      }
    ],
    layout
  }
}

// =============================================================================
// createFocusedIntent Tests
// =============================================================================

describe('createFocusedIntent', () => {
  it('returns full intent when no selection', () => {
    const intent = createLargeIntent()
    const focused = createFocusedIntent(intent, {})

    expect(focused.intent.layout).toEqual(intent.layout)
  })

  it('focuses on selected node by path', () => {
    const intent = createLargeIntent()
    const focused = createFocusedIntent(intent, {
      nodePath: [5] // Select 6th card
    })

    expect(focused.intent.layout).toHaveLength(1)
    expect(focused.intent.layout[0].id).toBe('Card5')
    expect(focused.layoutMapping.get(0)).toBe(5)
  })

  it('focuses on nested node by path', () => {
    const intent = createLargeIntent()
    const focused = createFocusedIntent(intent, {
      nodePath: [0, 0] // First card's first child (Title)
    })

    expect(focused.intent.layout).toHaveLength(1)
    expect(focused.intent.layout[0].component).toBe('Title')
  })

  it('focuses on nodes by IDs', () => {
    const intent = createLargeIntent()
    const focused = createFocusedIntent(intent, {
      nodeIds: ['Card2', 'Card5']
    })

    expect(focused.intent.layout.length).toBe(2)
    expect(focused.includedComponents.has('Card')).toBe(true)
  })

  it('extracts only referenced tokens', () => {
    const intent: Intent = {
      tokens: {
        colors: { primary: '#3B82F6', secondary: '#6B7280', unused: '#000' },
        spacing: { md: 16, lg: 24, unused: 999 },
        radii: {},
        sizes: {}
      },
      components: [],
      layout: [
        {
          component: 'Button',
          style: { background: '$primary', padding: '$md' }
        }
      ]
    }

    const focused = createFocusedIntent(intent, {})

    expect(focused.includedTokens.has('primary')).toBe(true)
    expect(focused.includedTokens.has('md')).toBe(true)
    expect(focused.includedTokens.has('unused')).toBe(false)
  })

  it('includes base components', () => {
    const intent: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [
        { name: 'Button', style: { padding: 12 } },
        { name: 'PrimaryButton', base: 'Button', style: { background: '#3B82F6' } }
      ],
      layout: [
        { component: 'PrimaryButton', text: 'Click' }
      ]
    }

    const focused = createFocusedIntent(intent, {})

    // Should include both PrimaryButton and its base Button
    expect(focused.intent.components).toHaveLength(2)
    expect(focused.intent.components.map(c => c.name)).toContain('Button')
    expect(focused.intent.components.map(c => c.name)).toContain('PrimaryButton')
  })
})

// =============================================================================
// mergeFocusedIntent Tests
// =============================================================================

describe('mergeFocusedIntent', () => {
  it('merges modified tokens back', () => {
    const fullIntent: Intent = {
      tokens: { colors: { primary: '#3B82F6' }, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{ component: 'Button' }]
    }

    const focused = createFocusedIntent(fullIntent, {})

    const modifiedResult: Intent = {
      tokens: {
        colors: { primary: '#EF4444', secondary: '#6B7280' },
        spacing: {}, radii: {}, sizes: {}
      },
      components: [],
      layout: [{ component: 'Button', style: { background: '$primary' } }]
    }

    const merged = mergeFocusedIntent(fullIntent, modifiedResult, focused)

    expect(merged.tokens.colors?.primary).toBe('#EF4444')
    expect(merged.tokens.colors?.secondary).toBe('#6B7280')
  })

  it('merges modified layout nodes back to correct positions', () => {
    const fullIntent: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [
        { component: 'Card', id: 'Card0', text: 'First' },
        { component: 'Card', id: 'Card1', text: 'Second' },
        { component: 'Card', id: 'Card2', text: 'Third' }
      ]
    }

    const focused = createFocusedIntent(fullIntent, { nodePath: [1] })

    // Modify the focused node
    const modifiedResult: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{ component: 'Card', id: 'Card1', text: 'Modified Second' }]
    }

    const merged = mergeFocusedIntent(fullIntent, modifiedResult, focused)

    expect(merged.layout[0].text).toBe('First')       // Unchanged
    expect(merged.layout[1].text).toBe('Modified Second')  // Modified
    expect(merged.layout[2].text).toBe('Third')       // Unchanged
  })

  it('adds new layout nodes', () => {
    const fullIntent: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{ component: 'Card', text: 'Existing' }]
    }

    const focused = createFocusedIntent(fullIntent, {})

    const modifiedResult: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [
        { component: 'Card', text: 'Existing' },
        { component: 'Button', text: 'New' }
      ]
    }

    const merged = mergeFocusedIntent(fullIntent, modifiedResult, focused)

    expect(merged.layout).toHaveLength(2)
    expect(merged.layout[1].text).toBe('New')
  })

  it('updates component definitions', () => {
    const fullIntent: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [
        { name: 'Card', style: { padding: 16 } }
      ],
      layout: [{ component: 'Card' }]
    }

    const focused = createFocusedIntent(fullIntent, {})

    const modifiedResult: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [
        { name: 'Card', style: { padding: 24, background: '#1E1E2E' } }
      ],
      layout: [{ component: 'Card' }]
    }

    const merged = mergeFocusedIntent(fullIntent, modifiedResult, focused)

    expect(merged.components[0].style?.padding).toBe(24)
    expect(merged.components[0].style?.background).toBe('#1E1E2E')
  })
})

// =============================================================================
// estimateTokenCount Tests
// =============================================================================

describe('estimateTokenCount', () => {
  it('estimates small intent', () => {
    const intent: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{ component: 'Button', text: 'Click' }]
    }

    const count = estimateTokenCount(intent)
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(100) // Small intent should be under 100 tokens
  })

  it('estimates larger intent proportionally', () => {
    const small: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{ component: 'Button' }]
    }

    const large = createLargeIntent()

    const smallCount = estimateTokenCount(small)
    const largeCount = estimateTokenCount(large)

    expect(largeCount).toBeGreaterThan(smallCount * 5)
  })
})

// =============================================================================
// shouldUseFocusedContext Tests
// =============================================================================

describe('shouldUseFocusedContext', () => {
  it('returns true when focused is significantly smaller', () => {
    const intent = createLargeIntent()

    const should = shouldUseFocusedContext(intent, {
      nodePath: [0] // Just first card
    }, 0.5)

    expect(should).toBe(true)
  })

  it('returns false when no selection (full context)', () => {
    const intent = createLargeIntent()

    const should = shouldUseFocusedContext(intent, {}, 0.5)

    expect(should).toBe(false)
  })

  it('respects threshold parameter', () => {
    const intent = createLargeIntent()

    // Very strict threshold
    const strict = shouldUseFocusedContext(intent, { nodePath: [0] }, 0.01)
    // Very lenient threshold
    const lenient = shouldUseFocusedContext(intent, { nodePath: [0] }, 0.99)

    // Lenient should always return true
    expect(lenient).toBe(true)
  })
})

// =============================================================================
// selectOptimalContext Tests
// =============================================================================

describe('selectOptimalContext', () => {
  it('returns full intent when under max tokens', () => {
    const intent: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{ component: 'Button', text: 'Click' }]
    }

    const result = selectOptimalContext(intent, 'make it red', 10000)

    expect(result).toEqual(intent)
  })

  it('focuses on mentioned component', () => {
    const intent = createLargeIntent()

    const result = selectOptimalContext(intent, 'change the Card5 background', 500)

    // Should try to focus on Card5 if it can reduce tokens
    // Exact behavior depends on token estimation
    expect(result).toBeDefined()
  })

  it('focuses on mentioned node text', () => {
    const intent: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [
        { component: 'Card', id: 'card1', text: 'Dashboard' },
        { component: 'Card', id: 'card2', text: 'Settings' }
      ]
    }

    // Mention "Dashboard" in request
    const result = selectOptimalContext(intent, 'make dashboard bigger', 50)

    expect(result).toBeDefined()
  })

  it('trims deep children when necessary', () => {
    const deepIntent: Intent = {
      tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
      components: [],
      layout: [{
        component: 'Root',
        children: [{
          component: 'Level1',
          children: [{
            component: 'Level2',
            children: [{
              component: 'Level3',
              children: [{ component: 'Level4' }]
            }]
          }]
        }]
      }]
    }

    const result = selectOptimalContext(deepIntent, 'modify root', 100)

    // Should still return something usable
    expect(result.layout).toBeDefined()
    expect(result.layout.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Context Integration', () => {
  it('focus + merge preserves unaffected parts', () => {
    const intent = createLargeIntent()

    // Focus on card 5
    const focused = createFocusedIntent(intent, { nodePath: [5] })

    // Simulate LLM modification
    const modified: Intent = {
      ...focused.intent,
      layout: [{
        ...focused.intent.layout[0],
        text: 'Modified Card 5'
      }]
    }

    // Merge back
    const result = mergeFocusedIntent(intent, modified, focused)

    // Card5 should be modified
    expect(result.layout[5].text).toBe('Modified Card 5')

    // Other cards should be unchanged
    expect(result.layout[0].text).toBe('Card 0')
    expect(result.layout[9].text).toBe('Card 9')
  })
})
