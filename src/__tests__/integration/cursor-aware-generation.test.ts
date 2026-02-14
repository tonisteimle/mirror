/**
 * Integration Test: Cursor-Aware AI Generation
 *
 * Tests the complete flow:
 * 1. User has existing code with tokens and components
 * 2. User positions cursor somewhere in the code
 * 3. User types a request like "Füge einen Button hinzu"
 * 4. System analyzes context and builds LLM prompt
 * 5. LLM receives full context with style patterns, tokens, examples
 */

import { describe, it, expect } from 'vitest'
import { MirrorCodeIntelligence } from '../../lib/ai-context'

// =============================================================================
// Example Files - Simulating a real project
// =============================================================================

const EXAMPLE_TOKENS = `
// Design System Tokens
$primary: #3B82F6
$secondary: #8B5CF6
$success: #10B981
$danger: #EF4444
$warning: #F59E0B

$bg-dark: #0F0F14
$bg-surface: #1A1A23
$bg-elevated: #252532

$text: #FFFFFF
$text-muted: #9CA3AF
$text-subtle: #6B7280

$pad-xs: 4
$pad-sm: 8
$pad-md: 16
$pad-lg: 24
$pad-xl: 32

$gap-sm: 8
$gap-md: 16
$gap-lg: 24

$rad-sm: 4
$rad-md: 8
$rad-lg: 12
$rad-full: 9999
`

const EXAMPLE_COMPONENTS = `
// Button Variants
Btn: pad $pad-sm $pad-md bg $primary col $text rad $rad-md cursor pointer
  hover-bg #2563EB
  state disabled
    opacity 0.5
    cursor not-allowed

SecondaryBtn from Btn: bg $bg-elevated bor 1 $text-muted
  hover-bg $bg-surface

DangerBtn from Btn: bg $danger
  hover-bg #DC2626

GhostBtn from Btn: bg transparent col $primary
  hover-bg $bg-elevated

// Card Components
Card: ver pad $pad-lg bg $bg-surface rad $rad-lg gap $gap-md
  Title: weight 700 size 18 col $text
  Subtitle: size 14 col $text-muted
  Body: size 14 col $text line 1.6
  Footer: hor gap $gap-sm

// Form Elements
FormField: ver gap $pad-xs
  Label: size 12 col $text-muted weight 500 uppercase

Input FormInput: pad $pad-sm $pad-md bg $bg-dark col $text rad $rad-md bor 1 $text-subtle
  placeholder col $text-subtle
  state focus
    bor 1 $primary

// Navigation
NavItem: pad $pad-sm $pad-md col $text-muted rad $rad-md cursor pointer
  hover-bg $bg-elevated
  hover-col $text
  state active
    bg $bg-elevated
    col $primary

// Badge
Badge: pad $pad-xs $pad-sm bg $bg-elevated col $text-muted rad $rad-full size 11 weight 600
SuccessBadge from Badge: bg $success col $text
DangerBadge from Badge: bg $danger col $text
`

const EXAMPLE_LAYOUT = `
// Main App Layout
App: ver full bg $bg-dark

  // Header Section
  Header: hor between pad $pad-md bg $bg-surface
    Logo: weight 700 size 20 col $text "Mirror"
    Nav: hor gap $gap-sm
      NavItem "Dashboard"
      NavItem "Projects"
      NavItem "Settings"
    UserMenu: hor gap $gap-md
      Badge "Pro"
      Avatar: 36 36 rad $rad-full bg $primary

  // Main Content
  Main: hor gap $gap-lg pad $pad-lg

    // Sidebar
    Sidebar: ver w 240 gap $gap-md
      Card
        Title "Quick Actions"
        Body "Get started with common tasks"
        Btn "New Project"
        SecondaryBtn "Import"

    // Content Area
    Content: ver grow gap $gap-lg

      // Stats Row
      StatsRow: hor gap $gap-md
        StatCard as Card
          Subtitle "Total Users"
          Title "12,543"
          SuccessBadge "+12%"

        StatCard as Card
          Subtitle "Revenue"
          Title "€48,234"
          SuccessBadge "+8%"

        StatCard as Card
          Subtitle "Active Projects"
          Title "34"
          Badge "Updated"

      // Projects Section
      ProjectsSection: ver gap $gap-md
        SectionHeader: hor between
          Title "Recent Projects"
          GhostBtn "View All"

        ProjectList: ver gap $gap-sm
          ProjectCard as Card
            Title "Website Redesign"
            Subtitle "Last edited 2 hours ago"
            Footer
              Badge "In Progress"
              SecondaryBtn "Open"
`

// Combine all code as if it were in the editor
const FULL_SOURCE_CODE = `${EXAMPLE_TOKENS}

${EXAMPLE_COMPONENTS}

${EXAMPLE_LAYOUT}`

// =============================================================================
// Tests
// =============================================================================

describe('Cursor-Aware AI Generation Integration', () => {

  describe('Context Analysis', () => {
    it('analyzes full codebase and finds all tokens', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const tokens = intelligence.getTokens()

      // Should find color tokens
      const colorTokens = tokens.filter(t => t.type === 'color')
      expect(colorTokens.length).toBeGreaterThan(5)
      expect(colorTokens.some(t => t.name === '$primary')).toBe(true)
      expect(colorTokens.some(t => t.name === '$bg-dark')).toBe(true)

      // Should find spacing tokens
      const numberTokens = tokens.filter(t => t.type === 'number')
      expect(numberTokens.length).toBeGreaterThan(5)
    })

    it('finds all component definitions', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const components = intelligence.getComponents()

      expect(components.some(c => c.name === 'Btn')).toBe(true)
      expect(components.some(c => c.name === 'Card')).toBe(true)
      expect(components.some(c => c.name === 'SecondaryBtn')).toBe(true)
    })

    it('detects style patterns', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const patterns = intelligence.detectStylePatterns()

      expect(patterns.length).toBeGreaterThan(0)

      // Should find Card pattern
      const cardPattern = patterns.find(p => p.components.some(c => c.includes('Card')))
      expect(cardPattern).toBeDefined()
    })
  })

  describe('Cursor Position Context', () => {
    it('identifies parent component at cursor position', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)

      // Find the line with "Sidebar" and position cursor inside it
      const lines = FULL_SOURCE_CODE.split('\n')
      const sidebarLine = lines.findIndex(l => l.includes('Sidebar: ver'))

      // Cursor a few lines after Sidebar (inside it)
      const cursorContext = intelligence.analyzeCursorContext(sidebarLine + 3, 0)

      expect(cursorContext.parent).toBeDefined()
      expect(cursorContext.indent).toBeGreaterThan(0)
    })

    it('captures surrounding code', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const lines = FULL_SOURCE_CODE.split('\n')
      const midPoint = Math.floor(lines.length / 2)

      const context = intelligence.analyzeCursorContext(midPoint, 0)

      expect(context.surroundings.linesBefore.length).toBeGreaterThan(0)
      expect(context.surroundings.linesAfter.length).toBeGreaterThan(0)
    })
  })

  describe('Generation Context Building', () => {
    it('builds complete context for "Add a button" request', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const lines = FULL_SOURCE_CODE.split('\n')

      // Position cursor in the Content area
      const contentLine = lines.findIndex(l => l.includes('Content: ver'))

      const context = intelligence.buildGenerationContext(
        'Füge einen neuen Button hinzu',
        contentLine + 2,
        4
      )

      // Should have insertion context
      expect(context.insertion).toBeDefined()
      expect(context.insertion!.indent).toBeGreaterThan(0)

      // Should find Btn as relevant component
      expect(context.relevantComponents.some(c => c.name.includes('Btn'))).toBe(true)

      // Should have style patterns
      expect(context.stylePatterns.length).toBeGreaterThan(0)

      // Should have suggestion
      expect(context.suggestion.action).toBeDefined()
    })

    it('builds context for "Add a card" request', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)

      // Use English "card" to match the component name
      const context = intelligence.buildGenerationContext(
        'Create a new Card for Notifications',
        50,
        0
      )

      // Should find Card as relevant (matches "card" in prompt)
      expect(context.relevantComponents.some(c => c.name === 'Card')).toBe(true)

      // Should have example code
      expect(context.exampleCode.length).toBeGreaterThan(0)
    })

    it('builds context for form input request', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)

      const context = intelligence.buildGenerationContext(
        'Add an email input field',
        60,
        0
      )

      // Should find Input-related components
      expect(context.relevantComponents.some(c =>
        c.name.toLowerCase().includes('input') ||
        c.name.toLowerCase().includes('form')
      )).toBe(true)
    })
  })

  describe('LLM Prompt Formatting', () => {
    it('formats complete prompt with all context', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const context = intelligence.buildGenerationContext(
        'Add a danger button for delete action',
        50,
        0
      )

      const formatted = intelligence.formatContextForLLM(context)

      // Must have design system rules
      expect(formatted).toContain('WICHTIG')
      expect(formatted).toContain('Design System')
      expect(formatted).toContain('MUSST')

      // Must have tokens section
      expect(formatted).toContain('Verfügbare Design Tokens')
      expect(formatted).toContain('$')

      // Must have patterns section
      expect(formatted).toContain('Style-Patterns')

      // Must have recommendation
      expect(formatted).toContain('Empfohlenes Vorgehen')
    })

    it('includes existing button examples for button requests', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const context = intelligence.buildGenerationContext('Create a button', 50, 0)

      const formatted = intelligence.formatContextForLLM(context)

      // Should mention Btn component
      expect(formatted).toContain('Btn')
    })

    it('shows insertion position info', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const context = intelligence.buildGenerationContext(
        'Add something',
        60,
        8 // 8 spaces indent
      )

      const formatted = intelligence.formatContextForLLM(context)

      expect(formatted).toContain('Einfüge-Position')
      expect(formatted).toContain('Einrückung')
    })
  })

  describe('Full Flow Simulation', () => {
    it('simulates complete generation request', () => {
      console.log('\n' + '='.repeat(60))
      console.log('SIMULATION: User Request "Füge einen Alert-Button hinzu"')
      console.log('='.repeat(60))

      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)

      // User has cursor in the Sidebar section, after the existing buttons
      const lines = FULL_SOURCE_CODE.split('\n')
      const sidebarBtnLine = lines.findIndex(l => l.includes('SecondaryBtn "Import"'))

      console.log(`\nCursor Position: Line ${sidebarBtnLine + 1}`)
      console.log('Context: Inside Sidebar Card, after "Import" button')

      const context = intelligence.buildGenerationContext(
        'Füge einen Alert-Button für Warnungen hinzu',
        sidebarBtnLine + 1,
        8
      )

      console.log('\n--- Analysis Results ---')
      console.log(`Relevant Components: ${context.relevantComponents.map(c => c.name).join(', ')}`)
      console.log(`Relevant Tokens: ${context.relevantTokens.map(t => t.name).join(', ')}`)
      console.log(`Style Patterns: ${context.stylePatterns.map(p => p.name).join(', ')}`)
      console.log(`Suggestion: ${context.suggestion.action} - ${context.suggestion.reason}`)

      const formatted = intelligence.formatContextForLLM(context)

      console.log('\n--- LLM Prompt (truncated) ---')
      console.log(formatted.slice(0, 1500) + '...')
      console.log('\n' + '='.repeat(60))

      // Assertions
      expect(context.relevantComponents.length).toBeGreaterThan(0)
      expect(context.relevantTokens.length).toBeGreaterThan(0)
      expect(formatted.length).toBeGreaterThan(200)
    })

    it('simulates adding a new card section', () => {
      console.log('\n' + '='.repeat(60))
      console.log('SIMULATION: User Request "Add a Card for Notifications"')
      console.log('='.repeat(60))

      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)

      // User has cursor after StatsRow
      const lines = FULL_SOURCE_CODE.split('\n')
      const statsLine = lines.findIndex(l => l.includes('Badge "Updated"'))

      console.log(`\nCursor Position: Line ${statsLine + 2}`)

      // Use "Card" in the prompt to match component name
      const context = intelligence.buildGenerationContext(
        'Add a Card for notifications with title and list',
        statsLine + 2,
        8
      )

      console.log('\n--- Analysis Results ---')
      console.log(`Found Card Component: ${context.relevantComponents.some(c => c.name === 'Card')}`)
      console.log(`Relevant Components: ${context.relevantComponents.map(c => c.name).join(', ')}`)
      console.log(`Example Code Available: ${context.exampleCode.length > 0}`)

      if (context.exampleCode.length > 0) {
        console.log('\nExample Code (first):')
        console.log(context.exampleCode[0])
      }

      const formatted = intelligence.formatContextForLLM(context)

      // Verify Card is mentioned in formatted output
      expect(formatted).toContain('Card')
      expect(context.relevantComponents.some(c => c.name === 'Card')).toBe(true)
    })
  })

  describe('Token Reuse Verification', () => {
    it('prioritizes existing tokens over hardcoded values', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const context = intelligence.buildGenerationContext(
        'Create a blue button with rounded corners',
        50,
        0
      )

      const formatted = intelligence.formatContextForLLM(context)

      // Should explicitly mention to use tokens
      expect(formatted).toContain('MUSST')
      expect(formatted).toContain('bestehenden Tokens')

      // Should list $primary (the blue color)
      expect(formatted).toContain('$primary')

      // Should list radius tokens
      expect(formatted).toContain('$rad')
    })

    it('shows all available color tokens for color-related requests', () => {
      const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
      const tokens = intelligence.findRelevantTokens('change the background color')

      const colorTokens = tokens.filter(t => t.type === 'color')
      expect(colorTokens.length).toBeGreaterThan(3)
    })
  })
})

describe('Edge Cases', () => {
  it('handles empty code gracefully', () => {
    const intelligence = new MirrorCodeIntelligence('')
    const context = intelligence.buildGenerationContext('Add a button', 0, 0)

    expect(context.relevantComponents).toEqual([])
    expect(context.relevantTokens).toEqual([])
    expect(context.stylePatterns).toEqual([])
  })

  it('handles code with only tokens (no components)', () => {
    const tokenOnlyCode = `
$primary: #3B82F6
$bg: #1E1E2E
$pad: 16
`
    const intelligence = new MirrorCodeIntelligence(tokenOnlyCode)
    const context = intelligence.buildGenerationContext('Add a button', 0, 0)

    // Should still find tokens
    expect(context.relevantTokens.length).toBeGreaterThan(0)

    // Should work without components
    expect(context.suggestion.action).toBe('create')
  })

  it('handles cursor at end of file', () => {
    const intelligence = new MirrorCodeIntelligence(FULL_SOURCE_CODE)
    const lines = FULL_SOURCE_CODE.split('\n')

    const context = intelligence.buildGenerationContext(
      'Add something at the end',
      lines.length - 1,
      0
    )

    expect(context.insertion).toBeDefined()
  })
})
