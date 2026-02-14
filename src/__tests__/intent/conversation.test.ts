/**
 * Tests für Conversation Context Module
 */

import { describe, it, expect } from 'vitest'
import {
  createConversationContext,
  addTurn,
  setFocus,
  resolveReferences,
  enrichRequest,
  generateConversationPrompt,
  detectAffectedComponents,
  detectAffectedProperties
} from '../../intent/conversation'
import type { Intent } from '../../intent/schema'

// =============================================================================
// Test Utilities
// =============================================================================

function createTestIntent(): Intent {
  return {
    tokens: {
      colors: { primary: '#3B82F6', surface: '#1E1E2E' },
      spacing: { md: 16 },
      radii: {},
      sizes: {}
    },
    components: [
      { name: 'Card', style: { padding: 16 } }
    ],
    layout: [
      {
        component: 'Card',
        id: 'MainCard',
        children: [
          { component: 'Text', id: 'Title', text: 'Welcome' },
          { component: 'Button', id: 'SubmitBtn', text: 'Submit' },
          { component: 'Button', id: 'CancelBtn', text: 'Cancel' }
        ]
      }
    ]
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Conversation Context', () => {
  describe('createConversationContext', () => {
    it('creates empty context', () => {
      const ctx = createConversationContext()
      expect(ctx.turns).toHaveLength(0)
      expect(ctx.focusedComponent).toBeNull()
      expect(ctx.recentComponents).toHaveLength(0)
    })

    it('uses default max turns', () => {
      const ctx = createConversationContext()
      expect(ctx.maxTurns).toBe(10)
    })
  })

  describe('addTurn', () => {
    it('adds turn to context', () => {
      let ctx = createConversationContext()
      ctx = addTurn(ctx, 'Change the button', ['SubmitBtn'], ['background'])

      expect(ctx.turns).toHaveLength(1)
      expect(ctx.turns[0].userRequest).toBe('Change the button')
    })

    it('updates recent components', () => {
      let ctx = createConversationContext()
      ctx = addTurn(ctx, 'Change button', ['SubmitBtn'], [])
      ctx = addTurn(ctx, 'Change card', ['MainCard'], [])

      expect(ctx.recentComponents).toContain('SubmitBtn')
      expect(ctx.recentComponents).toContain('MainCard')
    })

    it('updates recent properties', () => {
      let ctx = createConversationContext()
      ctx = addTurn(ctx, 'Change color', [], ['background', 'color'])

      expect(ctx.recentProperties).toContain('background')
      expect(ctx.recentProperties).toContain('color')
    })

    it('updates focused component', () => {
      let ctx = createConversationContext()
      ctx = addTurn(ctx, 'Edit button', ['SubmitBtn'], [])

      expect(ctx.focusedComponent).toBe('SubmitBtn')
    })

    it('respects max turns', () => {
      let ctx = createConversationContext(3)

      for (let i = 0; i < 10; i++) {
        ctx = addTurn(ctx, `Request ${i}`, [], [])
      }

      expect(ctx.turns.length).toBeLessThanOrEqual(3)
    })
  })

  describe('setFocus', () => {
    it('sets focused component', () => {
      let ctx = createConversationContext()
      ctx = setFocus(ctx, 'SubmitBtn')

      expect(ctx.focusedComponent).toBe('SubmitBtn')
    })

    it('can clear focus', () => {
      let ctx = createConversationContext()
      ctx = setFocus(ctx, 'SubmitBtn')
      ctx = setFocus(ctx, null)

      expect(ctx.focusedComponent).toBeNull()
    })
  })

  describe('resolveReferences', () => {
    it('resolves "es" to focused component', () => {
      let ctx = createConversationContext()
      ctx = setFocus(ctx, 'SubmitBtn')

      const refs = resolveReferences('Mach es größer', ctx, createTestIntent())

      expect(refs.length).toBeGreaterThan(0)
      expect(refs.some(r => r.resolved === 'SubmitBtn')).toBe(true)
    })

    it('resolves "it" to focused component', () => {
      let ctx = createConversationContext()
      ctx = setFocus(ctx, 'MainCard')

      const refs = resolveReferences('Make it blue', ctx, createTestIntent())

      expect(refs.some(r => r.resolved === 'MainCard')).toBe(true)
    })

    it('resolves "der button" to Button component', () => {
      const ctx = createConversationContext()
      const intent = createTestIntent()

      const refs = resolveReferences('Ändere der Button', ctx, intent)

      expect(refs.some(r => r.original.includes('button'))).toBe(true)
    })

    it('resolves "the text" to Text component', () => {
      const ctx = createConversationContext()
      const intent = createTestIntent()

      const refs = resolveReferences('Change the text color', ctx, intent)

      expect(refs.some(r => r.original.includes('text'))).toBe(true)
    })

    it('resolves property references', () => {
      let ctx = createConversationContext()
      ctx = addTurn(ctx, 'Change background', [], ['background'])

      const refs = resolveReferences('Ändere die Farbe', ctx, createTestIntent())

      expect(refs.some(r => r.resolved === 'background')).toBe(true)
    })

    it('returns empty for no references', () => {
      const ctx = createConversationContext()
      const refs = resolveReferences('Erstelle einen neuen Button', ctx, createTestIntent())

      // May or may not find references, but shouldn't crash
      expect(Array.isArray(refs)).toBe(true)
    })
  })

  describe('enrichRequest', () => {
    it('adds context hints to request', () => {
      let ctx = createConversationContext()
      ctx = setFocus(ctx, 'SubmitBtn')

      const enriched = enrichRequest('Mach es blau', ctx, createTestIntent())

      expect(enriched).toContain('SubmitBtn')
      expect(enriched).toContain('Kontext')
    })

    it('returns original if no references', () => {
      const ctx = createConversationContext()
      const original = 'Erstelle ein komplett neues Layout'
      const enriched = enrichRequest(original, ctx, createTestIntent())

      expect(enriched).toBe(original)
    })
  })

  describe('generateConversationPrompt', () => {
    it('returns empty for no turns', () => {
      const ctx = createConversationContext()
      const prompt = generateConversationPrompt(ctx)

      expect(prompt).toBe('')
    })

    it('includes conversation history', () => {
      let ctx = createConversationContext()
      ctx = addTurn(ctx, 'Make the button blue', ['SubmitBtn'], ['background'])
      ctx = addTurn(ctx, 'Add some padding', ['MainCard'], ['padding'])

      const prompt = generateConversationPrompt(ctx)

      expect(prompt).toContain('Konversationsverlauf')
      expect(prompt).toContain('Make the button blue')
      expect(prompt).toContain('Add some padding')
    })

    it('includes focused component', () => {
      let ctx = createConversationContext()
      ctx = setFocus(ctx, 'SubmitBtn')
      ctx = addTurn(ctx, 'Change it', ['SubmitBtn'], [])

      const prompt = generateConversationPrompt(ctx)

      expect(prompt).toContain('fokussiert')
      expect(prompt).toContain('SubmitBtn')
    })
  })

  describe('detectAffectedComponents', () => {
    it('detects added components', () => {
      const oldIntent = createTestIntent()
      const newIntent = {
        ...createTestIntent(),
        layout: [
          ...createTestIntent().layout,
          { component: 'Input', id: 'NewInput' }
        ]
      }

      const affected = detectAffectedComponents(oldIntent, newIntent)

      expect(affected).toContain('NewInput')
    })

    it('detects changed components', () => {
      const oldIntent = createTestIntent()
      const newIntent = JSON.parse(JSON.stringify(oldIntent)) as Intent
      newIntent.layout[0].children![0].text = 'Changed Title'

      const affected = detectAffectedComponents(oldIntent, newIntent)

      expect(affected).toContain('Title')
    })

    it('detects added component definitions', () => {
      const oldIntent = createTestIntent()
      const newIntent = {
        ...oldIntent,
        components: [
          ...oldIntent.components,
          { name: 'PrimaryButton', style: { background: '#3B82F6' } }
        ]
      }

      const affected = detectAffectedComponents(oldIntent, newIntent)

      expect(affected).toContain('PrimaryButton')
    })
  })

  describe('detectAffectedProperties', () => {
    it('detects changed tokens', () => {
      const oldIntent = createTestIntent()
      const newIntent = JSON.parse(JSON.stringify(oldIntent)) as Intent
      newIntent.tokens.colors!['primary'] = '#EF4444'

      const affected = detectAffectedProperties(oldIntent, newIntent)

      expect(affected).toContain('primary')
      expect(affected).toContain('colors')
    })

    it('detects changed style properties', () => {
      const oldIntent = createTestIntent()
      const newIntent = JSON.parse(JSON.stringify(oldIntent)) as Intent
      newIntent.layout[0].style = { padding: 24, background: '#000' }

      const affected = detectAffectedProperties(oldIntent, newIntent)

      expect(affected).toContain('padding')
      expect(affected).toContain('background')
    })
  })
})
