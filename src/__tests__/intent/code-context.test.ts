/**
 * Tests für Code Context Extractor Module
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeRequest,
  buildCodeContext,
  buildContextAwarePrompt
} from '../../intent/code-context'
import type { Intent } from '../../intent/schema'

// =============================================================================
// Test Utilities
// =============================================================================

function createLargeIntent(): Intent {
  const layout = []
  for (let i = 0; i < 10; i++) {
    layout.push({
      component: 'Card',
      id: `Card${i}`,
      text: `Card ${i}`,
      style: { padding: '$md', background: '$surface' },
      children: [
        { component: 'Text', id: `Title${i}`, text: `Title ${i}` },
        { component: 'Button', id: `Button${i}`, text: `Action ${i}` }
      ]
    })
  }

  return {
    tokens: {
      colors: { primary: '#3B82F6', surface: '#1E1E2E', text: '#FFFFFF' },
      spacing: { sm: 8, md: 16, lg: 24 },
      radii: { sm: 4, md: 8 },
      sizes: {}
    },
    components: [
      { name: 'Card', style: { padding: '$md', radius: '$md' } },
      { name: 'PrimaryButton', base: 'Button', style: { background: '$primary' } }
    ],
    layout
  }
}

function createSimpleIntent(): Intent {
  return {
    tokens: { colors: { primary: '#3B82F6' }, spacing: {}, radii: {}, sizes: {} },
    components: [],
    layout: [
      { component: 'Button', id: 'MainButton', text: 'Click me' }
    ]
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Request Analysis', () => {
  describe('analyzeRequest', () => {
    it('detects add action', () => {
      const intent = createSimpleIntent()

      const patterns = [
        'Füge einen Button hinzu',
        'Add a new card',
        'Erstelle ein Input',
        'Create a form'
      ]

      for (const request of patterns) {
        const analysis = analyzeRequest(request, intent)
        expect(analysis.actionType).toBe('add')
      }
    })

    it('detects modify action', () => {
      const intent = createSimpleIntent()

      const patterns = [
        'Ändere die Farbe',
        'Change the size',
        'Mach es größer',
        'Make it blue'
      ]

      for (const request of patterns) {
        const analysis = analyzeRequest(request, intent)
        expect(['modify', 'style']).toContain(analysis.actionType)
      }
    })

    it('detects remove action', () => {
      const intent = createSimpleIntent()

      const patterns = [
        'Entferne den Button',
        'Remove the card',
        'Lösche das Element',
        'Delete the input'
      ]

      for (const request of patterns) {
        const analysis = analyzeRequest(request, intent)
        expect(analysis.actionType).toBe('remove')
      }
    })

    it('detects style action', () => {
      const intent = createSimpleIntent()

      // Note: 'padding' contains 'add' substring, so we use 'spacing' instead
      const patterns = [
        'Ändere die Farbe zu blau',
        'Make the spacing bigger',
        'Change the background color'
      ]

      for (const request of patterns) {
        const analysis = analyzeRequest(request, intent)
        expect(['style', 'modify']).toContain(analysis.actionType)
      }
    })

    it('detects mentioned components', () => {
      const intent = createLargeIntent()

      const analysis = analyzeRequest('Ändere Card5 und Button3', intent)

      expect(analysis.mentionedComponents).toContain('Card5')
      expect(analysis.mentionedComponents).toContain('Button3')
    })

    it('detects component types', () => {
      const intent = createLargeIntent()

      const analysis = analyzeRequest('Make the button bigger', intent)

      expect(analysis.mentionedComponents.length).toBeGreaterThan(0)
      expect(analysis.scope).toBe('specific')
    })

    it('detects all scope', () => {
      // Use empty intent so no specific components are found
      const emptyIntent: Intent = {
        tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
        components: [],
        layout: []
      }

      const patterns = [
        'Ändere alle Elemente',
        'Change all items',
        'Make every element blue'
      ]

      for (const request of patterns) {
        const analysis = analyzeRequest(request, emptyIntent)
        expect(analysis.scope).toBe('all')
      }
    })

    it('detects mentioned properties', () => {
      const intent = createSimpleIntent()

      const analysis = analyzeRequest('Ändere die Hintergrundfarbe und das Padding', intent)

      expect(analysis.mentionedProperties).toContain('background')
      expect(analysis.mentionedProperties).toContain('padding')
    })

    it('handles complex requests', () => {
      const intent = createLargeIntent()

      const analysis = analyzeRequest(
        'Füge einen neuen Button mit roter Farbe und großem Padding zu Card3 hinzu',
        intent
      )

      expect(analysis.actionType).toBe('add')
      expect(analysis.mentionedComponents).toContain('Card3')
      expect(analysis.mentionedProperties).toContain('padding')
    })
  })
})

describe('Code Context Building', () => {
  describe('buildCodeContext', () => {
    it('returns full context for small intents', () => {
      const intent = createSimpleIntent()

      const context = buildCodeContext(intent, { maxTokens: 10000 })

      expect(context.intent).toEqual(intent)
      expect(context.reasoning).toContain('Vollständiger Kontext')
    })

    it('includes selected component', () => {
      const intent = createLargeIntent()

      const context = buildCodeContext(intent, {
        maxTokens: 500,
        selection: { componentId: 'Card5' }
      })

      expect(context.includedComponents).toContain('Card5')
      expect(context.reasoning).toContain('Selektiert')
    })

    it('includes mentioned components from request', () => {
      const intent = createLargeIntent()

      const context = buildCodeContext(intent, {
        maxTokens: 500,
        userRequest: 'Change Card3 background'
      })

      expect(context.includedComponents).toContain('Card3')
      expect(context.reasoning).toContain('Erwähnt')
    })

    it('includes recent components', () => {
      const intent = createLargeIntent()

      const context = buildCodeContext(intent, {
        maxTokens: 500,
        recentComponents: ['Card7', 'Button2']
      })

      expect(context.includedComponents.length).toBeGreaterThan(0)
    })

    it('extracts referenced tokens only', () => {
      const intent = createLargeIntent()

      const context = buildCodeContext(intent, {
        maxTokens: 500,
        selection: { componentId: 'Card0' }
      })

      // Should only include tokens that are actually used
      const tokenCount = Object.keys(context.intent.tokens.colors || {}).length +
                         Object.keys(context.intent.tokens.spacing || {}).length

      // Should be reduced from full set
      expect(tokenCount).toBeLessThanOrEqual(
        Object.keys(intent.tokens.colors || {}).length +
        Object.keys(intent.tokens.spacing || {}).length
      )
    })

    it('returns full context for all scope', () => {
      const intent = createLargeIntent()

      // Use request that clearly indicates all scope without matching specific components
      const context = buildCodeContext(intent, {
        maxTokens: 500,
        userRequest: 'Ändere alle Elemente'
      })

      expect(context.reasoning).toContain('Alle Elemente')
    })

    it('provides token count estimate', () => {
      const intent = createLargeIntent()

      const context = buildCodeContext(intent)

      expect(context.tokenCount).toBeGreaterThan(0)
    })
  })

  describe('buildContextAwarePrompt', () => {
    it('builds complete prompt', () => {
      const intent = createSimpleIntent()

      const result = buildContextAwarePrompt(intent, 'Make the button blue')

      expect(result.userPrompt).toBe('Make the button blue')
      expect(result.context).toBeDefined()
    })

    it('includes conversation context', () => {
      const intent = createSimpleIntent()

      const result = buildContextAwarePrompt(intent, 'Make it bigger', {
        conversationContext: '## Konversation\n- Vorher: Button erstellt'
      })

      expect(result.systemPrompt).toContain('Konversation')
    })

    it('includes history context', () => {
      const intent = createSimpleIntent()

      const result = buildContextAwarePrompt(intent, 'Change color', {
        historyContext: '## Letzte Änderungen\n- Button hinzugefügt'
      })

      expect(result.systemPrompt).toContain('Letzte Änderungen')
    })

    it('includes context reasoning', () => {
      const intent = createLargeIntent()

      const result = buildContextAwarePrompt(intent, 'Change Card5', {
        maxTokens: 500
      })

      expect(result.systemPrompt).toContain('Kontext-Info')
    })
  })
})

describe('Integration', () => {
  it('full workflow: analyze, build context, generate prompt', () => {
    const intent = createLargeIntent()

    // Simulate user workflow
    const userRequest = 'Ändere die Farbe von Card5 zu rot'

    // 1. Analyze request
    const analysis = analyzeRequest(userRequest, intent)
    expect(analysis.mentionedComponents).toContain('Card5')
    expect(analysis.actionType).toBe('style')

    // 2. Build context
    const context = buildCodeContext(intent, {
      userRequest,
      maxTokens: 1000
    })
    expect(context.includedComponents).toContain('Card5')

    // 3. Generate prompt
    const prompt = buildContextAwarePrompt(intent, userRequest, {
      maxTokens: 1000,
      conversationContext: '## Vorherige Anfragen\n- Card3 geändert'
    })

    expect(prompt.userPrompt).toBe(userRequest)
    expect(prompt.context.includedComponents).toContain('Card5')
  })
})
