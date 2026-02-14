/**
 * Tests for Style Pattern Detection
 *
 * Verifies that the AI context system correctly identifies
 * existing styles and tokens for consistent code generation.
 */

import { describe, it, expect } from 'vitest'
import { MirrorCodeIntelligence } from '../../lib/ai-context'

describe('Style Pattern Detection', () => {
  const sampleCode = `
// Design Tokens
$primary: #3B82F6
$secondary: #6366F1
$bg: #1E1E2E
$surface: #2A2A3E
$text: #FFFFFF
$muted: #9CA3AF
$pad-sm: 8
$pad-md: 16
$rad: 8

// Component Definitions
Btn: pad $pad-sm $pad-md bg $primary col $text rad $rad cursor pointer
SecondaryBtn: pad $pad-sm $pad-md bg $surface col $text rad $rad bor 1 $muted
DangerBtn: pad $pad-sm $pad-md bg #EF4444 col $text rad $rad

Card: ver pad $pad-md bg $surface rad $rad gap $pad-sm
  Title: weight 600 size 16 col $text
  Desc: size 14 col $muted

Input: pad $pad-sm bg $bg col $text rad $rad bor 1 $muted

// Layout
App ver gap $pad-md
  Header hor between
    Logo
    Nav hor gap $pad-sm
      Btn "Home"
      Btn "About"
  Main
    Card
      Title "Welcome"
      Desc "Get started with our app"
      Btn "Learn More"
`

  describe('detectStylePatterns', () => {
    it('detects button style patterns', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const patterns = intelligence.detectStylePatterns()

      // "Btn" component gets categorized as its own pattern since it doesn't contain "Button"
      const btnPattern = patterns.find(p => p.components.includes('Btn'))
      expect(btnPattern).toBeDefined()
      expect(btnPattern!.tokensUsed).toContain('$pad-sm')
      expect(btnPattern!.tokensUsed).toContain('$primary')
    })

    it('detects card style patterns', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const patterns = intelligence.detectStylePatterns()

      const cardPattern = patterns.find(p => p.name === 'Card Style')
      expect(cardPattern).toBeDefined()
      expect(cardPattern!.components).toContain('Card')
      expect(cardPattern!.tokensUsed).toContain('$surface')
      expect(cardPattern!.tokensUsed).toContain('$pad-md')
    })

    it('extracts common properties', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const patterns = intelligence.detectStylePatterns()

      // Find any pattern with properties
      const patternWithProps = patterns.find(p => Object.keys(p.properties).length > 0)
      expect(patternWithProps).toBeDefined()
      expect(Object.keys(patternWithProps!.properties).length).toBeGreaterThan(0)
    })
  })

  describe('findRelevantTokens', () => {
    it('finds color tokens for button requests', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const tokens = intelligence.findRelevantTokens('Create a blue button')

      const colorTokens = tokens.filter(t => t.type === 'color')
      expect(colorTokens.length).toBeGreaterThan(0)
      expect(colorTokens.some(t => t.name === '$primary')).toBe(true)
    })

    it('finds spacing tokens for layout requests', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const tokens = intelligence.findRelevantTokens('Add padding to container')

      const spacingTokens = tokens.filter(t => t.type === 'number')
      expect(spacingTokens.length).toBeGreaterThan(0)
    })

    it('includes highly-used tokens', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const tokens = intelligence.findRelevantTokens('anything')

      // Tokens used multiple times should be included
      const tokenNames = tokens.map(t => t.name)
      expect(tokenNames).toContain('$pad-sm')
    })
  })

  describe('extractExampleCode', () => {
    it('extracts component definition examples', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const examples = intelligence.extractExampleCode(['Card', 'Btn'])

      expect(examples.length).toBeGreaterThan(0)
      expect(examples.some(e => e.includes('Card:'))).toBe(true)
    })

    it('includes child components in examples', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const examples = intelligence.extractExampleCode(['Card'])

      const cardExample = examples.find(e => e.includes('Card:'))
      expect(cardExample).toContain('Title:')
      expect(cardExample).toContain('Desc:')
    })
  })

  describe('buildGenerationContext', () => {
    it('includes style patterns in context', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const context = intelligence.buildGenerationContext('Add a new button')

      expect(context.stylePatterns.length).toBeGreaterThan(0)
    })

    it('includes example code in context', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const context = intelligence.buildGenerationContext('Add a card')

      expect(context.exampleCode.length).toBeGreaterThan(0)
    })

    it('includes relevant tokens', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const context = intelligence.buildGenerationContext('Create a form with inputs')

      expect(context.relevantTokens.length).toBeGreaterThan(0)
    })
  })

  describe('formatContextForLLM', () => {
    it('outputs design system rules', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const context = intelligence.buildGenerationContext('Add a button')
      const formatted = intelligence.formatContextForLLM(context)

      expect(formatted).toContain('WICHTIG: Design System Regeln')
      expect(formatted).toContain('MUSST die bestehenden Tokens')
    })

    it('lists available tokens', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const context = intelligence.buildGenerationContext('Add a button')
      const formatted = intelligence.formatContextForLLM(context)

      expect(formatted).toContain('Verfügbare Design Tokens')
      expect(formatted).toContain('$primary')
    })

    it('shows style patterns', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const context = intelligence.buildGenerationContext('Add a button')
      const formatted = intelligence.formatContextForLLM(context)

      expect(formatted).toContain('Erkannte Style-Patterns')
    })

    it('includes example code snippets', () => {
      const intelligence = new MirrorCodeIntelligence(sampleCode)
      const context = intelligence.buildGenerationContext('Add a card')
      const formatted = intelligence.formatContextForLLM(context)

      expect(formatted).toContain('Beispiel-Code')
    })
  })
})

describe('Real-world Scenario', () => {
  it('provides complete context for generating consistent UI', () => {
    const existingCode = `
$blue: #3B82F6
$dark: #1E1E2E
$light: #F3F4F6
$radius: 8

PrimaryBtn: pad 12 24 bg $blue col white rad $radius hover-bg #2563EB
GhostBtn: pad 12 24 bg transparent col $blue rad $radius bor 1 $blue

Card: ver pad 24 bg $dark rad $radius gap 16
  Heading: weight 700 size 20 col white
  Body: size 14 col $light line 1.6

// Usage
LoginCard as Card
  Heading "Sign In"
  Body "Enter your credentials"
  PrimaryBtn "Login"
  GhostBtn "Forgot Password?"
`

    const intelligence = new MirrorCodeIntelligence(existingCode)
    const context = intelligence.buildGenerationContext(
      'Füge eine neue Card für Registrierung hinzu', // Use "Card" to trigger component matching
      10 // cursor line
    )

    // Should detect existing patterns
    expect(context.stylePatterns.length).toBeGreaterThan(0)

    // Should include tokens (may be any type)
    expect(context.relevantTokens.length).toBeGreaterThan(0)

    // Should find Card as relevant component (contains "Card" keyword)
    expect(context.relevantComponents.some(c => c.name === 'Card')).toBe(true)

    // Format should include all necessary info
    const formatted = intelligence.formatContextForLLM(context)

    // LLM should see design system rules
    expect(formatted).toContain('WICHTIG')        // Instruction header
    expect(formatted).toContain('Card')           // Component to reuse
    expect(formatted).toContain('BEFOLGEN')       // Instruction to follow patterns
  })
})
