/**
 * LLM Integration Tests
 * Tests for processing and validating LLM-generated DSL output
 */

import { describe, it, expect } from 'vitest'
import { ValidationService, cleanLLMOutput } from '../validation'
import { parse } from '../parser/parser'
import { generateReactElement } from '../generator/react-generator'

// ============================================================================
// Mock LLM Responses - Simulating various LLM output formats
// ============================================================================

const MOCK_LLM_RESPONSES = {
  // Perfect output - exactly as expected
  perfect: `--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6 size 14 weight 500

--- LAYOUT ---
Button "Click me"`,

  // With Markdown code blocks (common LLM behavior)
  withMarkdown: `Here's your button component:

\`\`\`
--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6

--- LAYOUT ---
Button "Click me"
\`\`\`

This creates a centered blue button.`,

  // With language-specific markdown
  withMarkdownDSL: `\`\`\`dsl
--- COMPONENTS ---
Card: ver pad 16 col #1F2937 rad 8 gap 8
  Title size 18 weight 600 col #FFF
  Body size 14 col #9CA3AF

--- LAYOUT ---
Card Title "Hello" Body "World"
\`\`\``,

  // Using CSS property names instead of DSL
  withCSSProperties: `--- COMPONENTS ---
Button: horizontal center vertical-center height 40 padding 16 border-radius 8 background #3B82F6 color #FFFFFF

--- LAYOUT ---
Button padding 16 "Click me"`,

  // Using named colors instead of hex
  withNamedColors: `--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 bg blue col white

--- LAYOUT ---
Button "Click me"`,

  // With explanations mixed in
  withExplanations: `I'll create a login form for you.

--- COMPONENTS ---
LoginForm: ver gap 16 pad 24 col #1F2937 rad 12 w 320
Input: h 40 pad l-r 12 col #374151 rad 6 col #FFF
Button: hor hor-cen ver-cen h 44 rad 8 col #3B82F6

--- LAYOUT ---
LoginForm
  Input "Email"
  Input "Password"
  Button "Sign In"

The form uses a dark theme with rounded corners.`,

  // Properties in layout (common mistake)
  propertiesInLayout: `--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 rad 8 col #3B82F6

--- LAYOUT ---
Button pad 16 col #EF4444 "Click me"`,

  // Complex nested structure
  complexNested: `--- COMPONENTS ---
Dashboard: hor full col #111827
  Sidebar: ver w 240 col #1F2937 pad u-d 16
    Logo: hor ver-cen h 48 pad l-r 16
    NavItem: hor ver-cen h 40 pad l-r 16 rad 8 gap 12 hover-col #374151
  Content: ver grow
    Header: hor between ver-cen h 64 pad l-r 24 col #1F2937
    Main: ver grow pad 24 gap 24

--- LAYOUT ---
Dashboard
  Sidebar
    Logo "MyApp"
    NavItem "Home"
    NavItem "Settings"
  Content
    Header "Dashboard"
    Main`,

  // With RGB colors
  withRGBColors: `--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 bg rgb(59, 130, 246) col rgb(255, 255, 255)

--- LAYOUT ---
Button "Click me"`,

  // With typos
  withTypos: `--- COMPONENTS ---
Button: horizonal centre h 40 padding 16 radi 8 backgrnd #3B82F6 colour #FFF

--- LAYOUT ---
Button "Click me"`,

  // Missing COMPONENTS marker
  missingComponentsMarker: `Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6

--- LAYOUT ---
Button "Click me"`,

  // Missing LAYOUT marker
  missingLayoutMarker: `--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6

Button "Click me"`,

  // Definition in layout (wrong)
  definitionInLayout: `--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 rad 8 col #3B82F6

--- LAYOUT ---
NewButton: hor pad 16 col #EF4444
Button "Click me"`,

  // Using from inheritance
  withInheritance: `--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6 size 14
DangerButton: from Button col #EF4444
GhostButton: from Button bg transparent col #3B82F6 bor 1 boc #3B82F6

--- LAYOUT ---
Button "Primary"
DangerButton "Delete"
GhostButton "Cancel"`,

  // With hover states
  withHoverStates: `--- COMPONENTS ---
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6 hover-col #2563EB hover-col #FFFFFF
Link: size 14 col #9CA3AF hover-col #FFF

--- LAYOUT ---
Button "Hover me"
Link "Click here"`,

  // With icons
  withIcons: `--- COMPONENTS ---
IconButton: hor hor-cen ver-cen h 40 w 40 rad 8 col #3B82F6
SearchBar: hor ver-cen gap 8 h 40 pad l-r 12 col #374151 rad 8
  SearchIcon icon "search" size 16 col #9CA3AF
  Input grow col #FFF

--- LAYOUT ---
IconButton icon "plus"
SearchBar
  SearchIcon
  Input "Search..."`,

  // Product grid example
  productGrid: `--- COMPONENTS ---
Grid: hor wrap gap 16 pad 16
ProductCard: ver w 200 col #1F2937 rad 8 hover-col #374151
  Image h 150 col #374151 rad u 8
  Info: ver pad 12 gap 8
    Name size 14 weight 500 col #FFF
    Price size 16 weight 700 col #10B981

--- LAYOUT ---
Grid
  ProductCard
    Image
    Info Name "iPhone" Price "$999"
  ProductCard
    Image
    Info Name "MacBook" Price "$1999"
  ProductCard
    Image
    Info Name "AirPods" Price "$199"`,

  // Chat interface
  chatInterface: `--- COMPONENTS ---
Chat: ver full col #111827
Messages: ver grow pad 16 gap 12
MyMessage: ver maxw 280 pad 12 rad 12 col #3B82F6
TheirMessage: ver maxw 280 pad 12 rad 12 col #374151
InputArea: hor gap 12 pad 16 col #1F2937 bor u 1 boc #374151
  Input grow h 44 pad l-r 16 col #374151 rad 22 col #FFF
  SendButton: hor hor-cen ver-cen w 44 h 44 rad 22 col #3B82F6

--- LAYOUT ---
Chat
  Messages
    TheirMessage "Hello!"
    MyMessage "Hi there!"
    TheirMessage "How are you?"
  InputArea
    Input "Type a message..."
    SendButton icon "send"`,

  // Empty response
  empty: '',

  // Only explanation, no code
  onlyExplanation: `I would be happy to help you create a button component.
A button typically has padding, a background color, and centered text.
Would you like me to proceed with the implementation?`,

  // Malformed output
  malformed: `COMP0NENTS
Button pad 16
LAYOOUT
Button`,
}

// ============================================================================
// Validator Instance
// ============================================================================

const validator = new ValidationService({
  autoCorrect: true,
  strictMode: false,
  allowMissingDefinitions: true,
  generateMissingDefs: false
})

// ============================================================================
// Tests
// ============================================================================

describe('LLM Output Processing', () => {
  describe('Perfect Output', () => {
    it('processes perfect output correctly', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.perfect)

      // May have warnings but should produce valid output
      expect(result.components).toContain('Button:')
      expect(result.layout).toContain('Button "Click me"')
    })

    it('generates valid React elements from perfect output', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.perfect)
      const parseResult = parse(result.components + '\n\n' + result.layout)

      expect(parseResult.nodes.length).toBeGreaterThan(0)

      const elements = generateReactElement(parseResult.nodes)
      expect(elements).toBeDefined()
    })
  })

  describe('Markdown Cleaning', () => {
    it('removes markdown code blocks', () => {
      const result = cleanLLMOutput(MOCK_LLM_RESPONSES.withMarkdown)

      expect(result.hadMarkdown).toBe(true)
      expect(result.components).not.toContain('```')
      expect(result.layout).not.toContain('```')
    })

    it('removes language-specific markdown blocks', () => {
      const result = cleanLLMOutput(MOCK_LLM_RESPONSES.withMarkdownDSL)

      expect(result.hadMarkdown).toBe(true)
      expect(result.components).toContain('Card:')
      expect(result.layout).toContain('Card Title "Hello"')
    })

    it('removes explanatory text', () => {
      const result = cleanLLMOutput(MOCK_LLM_RESPONSES.withExplanations)

      // Result should contain the actual code
      expect(result.components).toContain('LoginForm:')
    })
  })

  describe('CSS Property Correction', () => {
    it('corrects CSS property names to DSL', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withCSSProperties)

      // CSS properties should be corrected
      expect(result.components).toContain('pad')
      expect(result.components).toContain('rad')
      expect(result.components).toContain('col')
      expect(result.components).toContain('col')

      // Original CSS names should be gone
      expect(result.components).not.toContain('padding')
      expect(result.components).not.toContain('border-radius')
      expect(result.components).not.toContain('background')
    })

    it('removes properties from layout', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withCSSProperties)

      // Layout should not have properties
      expect(result.layout).not.toContain('padding')
      expect(result.layout).toContain('Button')
      expect(result.layout).toContain('"Click me"')
    })
  })

  describe('Color Correction', () => {
    it('handles named colors', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withNamedColors)

      // Should produce valid output
      expect(result.components).toContain('Button:')
      expect(result.components).toContain('col')
      expect(result.components).toContain('col')
    })

    it('handles RGB colors', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withRGBColors)

      // Should produce valid output
      expect(result.components).toContain('Button:')
    })
  })

  describe('Typo Correction', () => {
    it('corrects common typos', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withTypos)

      // Typos should be corrected
      expect(result.components).toContain('hor')
      expect(result.components).not.toContain('horizonal')

      expect(result.components).toContain('rad')
      expect(result.components).not.toContain('radi')

      expect(result.components).toContain('col')
      expect(result.components).not.toContain('backgrnd')

      expect(result.components).toContain('col')
      expect(result.components).not.toContain('colour')
    })
  })

  describe('Layout Validation', () => {
    it('removes properties from layout lines', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.propertiesInLayout)

      // Properties should be removed from layout
      expect(result.layout).not.toContain('pad')
      expect(result.layout).not.toContain('col')
      expect(result.layout).toContain('Button')
      expect(result.layout).toContain('"Click me"')
    })

    it('detects definitions in layout', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.definitionInLayout)

      // Should have error about definition in layout
      expect(result.errors.some(e => e.type === 'DEFINITION_IN_LAYOUT')).toBe(true)
    })
  })

  describe('Complex Structures', () => {
    it('handles complex nested components', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.complexNested)

      // Should produce valid output even if there are warnings
      expect(result.components).toContain('Dashboard:')
      expect(result.components).toContain('Sidebar:')
      expect(result.layout).toContain('Dashboard')
    })

    it('processes product grid correctly', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.productGrid)

      expect(result.components).toContain('Grid:')
      expect(result.components).toContain('ProductCard:')
      expect(result.layout).toContain('Grid')
      expect(result.layout).toContain('ProductCard')
    })

    it('processes chat interface correctly', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.chatInterface)

      expect(result.components).toContain('Chat:')
      expect(result.components).toContain('MyMessage:')
      expect(result.components).toContain('TheirMessage:')
      expect(result.layout).toContain('Chat')
    })
  })

  describe('Component Inheritance', () => {
    it('processes from inheritance correctly', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withInheritance)

      expect(result.components).toContain('DangerButton: from Button')
      expect(result.components).toContain('GhostButton: from Button')
      expect(result.layout).toContain('DangerButton')
      expect(result.layout).toContain('GhostButton')
    })

    it('inherited components are defined', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withInheritance)
      const parseResult = parse(result.components + '\n\n' + result.layout)

      // DangerButton should be defined
      const dangerButton = parseResult.registry.get('DangerButton')
      expect(dangerButton).toBeDefined()
      expect(dangerButton!.properties.col).toBe('#EF4444')
    })
  })

  describe('Hover States', () => {
    it('processes hover properties', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withHoverStates)

      expect(result.components).toContain('hover-col')
      expect(result.components).toContain('hover-col')
    })

    it('hover properties are preserved', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withHoverStates)

      // Hover properties should be in components
      expect(result.components).toContain('hover-col')
      expect(result.components).toContain('hover-col')
    })
  })

  describe('Icons', () => {
    it('processes icon properties in components', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withIcons)

      // Icon should be in components
      expect(result.components).toContain('icon')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty response', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.empty)

      expect(result.components).toBe('')
      expect(result.layout).toBe('')
    })

    it('handles response with only explanation', () => {
      const result = cleanLLMOutput(MOCK_LLM_RESPONSES.onlyExplanation)

      // Without markers, the entire text ends up in layout
      // This is expected behavior - the validator handles the filtering
      expect(result).toBeDefined()
    })

    it('handles malformed output', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.malformed)

      // Should not crash, may have errors
      expect(result).toBeDefined()
    })

    it('handles missing COMPONENTS marker', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.missingComponentsMarker)

      // Should still extract the component definition
      expect(result.components).toContain('Button:')
    })

    it('handles missing LAYOUT marker', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.missingLayoutMarker)

      // Should still parse components
      expect(result.components).toContain('Button:')
    })
  })

  describe('Correction Statistics', () => {
    it('tracks number of corrections', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withCSSProperties)

      expect(result.corrections.length).toBeGreaterThan(0)
    })

    it('provides correction details', () => {
      const result = validator.validate(MOCK_LLM_RESPONSES.withTypos)

      const correction = result.corrections.find(c => c.original.includes('horizonal'))
      expect(correction).toBeDefined()
      expect(correction!.corrected).toContain('hor')
    })
  })
})

describe('LLM Output to React Rendering', () => {
  it('renders button from LLM output', () => {
    const result = validator.validate(MOCK_LLM_RESPONSES.perfect)
    const parseResult = parse(result.components + '\n\n' + result.layout)
    const elements = generateReactElement(parseResult.nodes)

    expect(elements).toBeDefined()
    expect(Array.isArray(elements) ? elements.length : 1).toBeGreaterThan(0)
  })

  it('renders complex dashboard from LLM output', () => {
    const result = validator.validate(MOCK_LLM_RESPONSES.complexNested)
    const parseResult = parse(result.components + '\n\n' + result.layout)
    const elements = generateReactElement(parseResult.nodes)

    expect(elements).toBeDefined()
  })

  it('renders product grid from LLM output', () => {
    const result = validator.validate(MOCK_LLM_RESPONSES.productGrid)
    const parseResult = parse(result.components + '\n\n' + result.layout)
    const elements = generateReactElement(parseResult.nodes)

    expect(elements).toBeDefined()
  })

  it('renders chat interface from LLM output', () => {
    const result = validator.validate(MOCK_LLM_RESPONSES.chatInterface)
    const parseResult = parse(result.components + '\n\n' + result.layout)
    const elements = generateReactElement(parseResult.nodes)

    expect(elements).toBeDefined()
  })
})

describe('Real-World LLM Scenarios', () => {
  describe('Login Form Generation', () => {
    const mockLoginResponse = `--- COMPONENTS ---
LoginForm: ver gap 16 pad 24 col #1F2937 rad 12 w 320
Title: size 24 weight 700 col #FFF
Field: ver gap 4
  Label size 12 col #9CA3AF
  Input h 40 pad l-r 12 col #374151 rad 6 col #FFF bor 1 boc #4B5563
SubmitButton: hor hor-cen ver-cen h 44 rad 8 col #3B82F6 size 14 weight 500 hover-col #2563EB

--- LAYOUT ---
LoginForm
  Title "Sign In"
  Field Label "Email" Input
  Field Label "Password" Input
  SubmitButton "Sign In"`

    it('processes login form response', () => {
      const result = validator.validate(mockLoginResponse)

      // Should produce valid components and layout
      expect(result.components).toContain('LoginForm:')
      expect(result.components).toContain('Field:')
      expect(result.components).toContain('SubmitButton:')
      expect(result.layout).toContain('LoginForm')
    })

    it('renders login form', () => {
      const result = validator.validate(mockLoginResponse)
      const parseResult = parse(result.components + '\n\n' + result.layout)

      expect(parseResult.nodes.length).toBe(1)
      expect(parseResult.nodes[0].name).toBe('LoginForm')
    })
  })

  describe('Navigation Bar Generation', () => {
    const mockNavResponse = `Here's a navigation bar:

\`\`\`
--- COMPONENTS ---
Navbar: hor between ver-cen h 64 pad l-r 24 col #1F2937 bor d 1 boc #374151
Logo: size 20 weight 700 col #FFF
NavLinks: hor gap 24
NavLink: size 14 col #9CA3AF hover-col #FFF
Button: hor hor-cen ver-cen h 36 pad l-r 16 rad 6 col #3B82F6 size 14

--- LAYOUT ---
Navbar
  Logo "MyApp"
  NavLinks
    NavLink "Home"
    NavLink "Features"
    NavLink "Pricing"
  Button "Sign Up"
\`\`\`

This creates a responsive navigation bar.`

    it('cleans and processes navigation response', () => {
      const result = validator.validate(mockNavResponse)

      expect(result.components).toContain('Navbar:')
      expect(result.components).not.toContain('```')
      expect(result.layout).not.toContain('responsive')
    })
  })

  describe('Card Grid Generation', () => {
    const mockCardGridResponse = `--- COMPONENTS ---
CardGrid: hor wrap gap 16 pad 16
Card: ver w 280 col #1F2937 rad 12 hover-col #374151
  CardImage h 160 col #374151 rad u 12
  CardContent: ver pad 16 gap 8
    CardTitle size 16 weight 600 col #FFF
    CardDescription size 14 col #9CA3AF
    CardFooter: hor between ver-cen pad u 8 bor u 1 boc #374151
      Price size 18 weight 700 col #10B981
      ActionButton: hor hor-cen ver-cen h 32 pad l-r 12 rad 6 col #3B82F6 size 12

--- LAYOUT ---
CardGrid
  Card
    CardImage
    CardContent
      CardTitle "Product 1"
      CardDescription "Amazing product"
      CardFooter Price "$99" ActionButton "Buy"
  Card
    CardImage
    CardContent
      CardTitle "Product 2"
      CardDescription "Another great product"
      CardFooter Price "$149" ActionButton "Buy"`

    it('processes card grid with nested children', () => {
      const result = validator.validate(mockCardGridResponse)
      const parseResult = parse(result.components + '\n\n' + result.layout)

      expect(parseResult.registry.has('CardGrid')).toBe(true)
      expect(parseResult.registry.has('Card')).toBe(true)
      expect(parseResult.nodes.length).toBe(1) // CardGrid

      const grid = parseResult.nodes[0]
      expect(grid.children.length).toBe(2) // 2 Cards
    })
  })

  describe('Error Recovery', () => {
    it('recovers from partially broken output', () => {
      const brokenOutput = `--- COMPONENTS ---
Button: hor center padding 16 background blue color white

--- LAYOUT ---
Button padding 16 "Click"`

      const result = validator.validate(brokenOutput)

      // Should still produce usable output
      expect(result.components).toContain('Button:')
      expect(result.layout).toContain('Button')
      expect(result.layout).toContain('"Click"')

      // Properties should be removed from layout
      expect(result.layout).not.toContain('padding')
    })

    it('handles mixed good and bad definitions', () => {
      const mixedOutput = `--- COMPONENTS ---
GoodButton: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6
BadButton: horizontal center padding 16 background red

--- LAYOUT ---
GoodButton "Good"
BadButton "Bad"`

      const result = validator.validate(mixedOutput)

      // Both should be present, with corrections
      expect(result.components).toContain('GoodButton:')
      expect(result.components).toContain('BadButton:')
      expect(result.corrections.length).toBeGreaterThan(0)
    })
  })
})

describe('Performance with Large Outputs', () => {
  it('handles large component definitions', () => {
    // Generate a large output with many components
    let components = '--- COMPONENTS ---\n'
    for (let i = 0; i < 50; i++) {
      components += `Button${i}: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6 size 14\n`
    }

    let layout = '--- LAYOUT ---\n'
    for (let i = 0; i < 50; i++) {
      layout += `Button${i} "Button ${i}"\n`
    }

    const largeOutput = components + '\n' + layout

    const start = performance.now()
    const result = validator.validate(largeOutput)
    const duration = performance.now() - start

    // Should produce output (may have warnings)
    expect(result.components).toContain('Button0:')
    expect(result.layout).toContain('Button0')
    expect(duration).toBeLessThan(2000) // Should complete in reasonable time
  })

  it('handles deeply nested structures', () => {
    const nestedOutput = `--- COMPONENTS ---
Level0: ver pad 16 col #1F2937
Level1: ver pad 12 col #374151
Level2: ver pad 8 col #4B5563
Level3: ver pad 4 col #6B7280
Content: size 14 col #FFF

--- LAYOUT ---
Level0
  Level1
    Level2
      Level3
        Content "Deep"`

    const result = validator.validate(nestedOutput)
    const parseResult = parse(result.components + '\n\n' + result.layout)

    expect(parseResult.nodes.length).toBe(1)

    // Navigate down the tree
    let current = parseResult.nodes[0]
    expect(current.name).toBe('Level0')
    expect(current.children.length).toBe(1)
  })
})
