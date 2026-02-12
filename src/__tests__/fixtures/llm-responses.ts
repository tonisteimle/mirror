/**
 * Mock LLM Responses for Tests
 *
 * Simulating various LLM output formats for validation testing.
 */

// =============================================================================
// MOCK LLM RESPONSES
// =============================================================================

export const LLM_RESPONSES = {
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
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col blue textCol white

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
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col rgb(59, 130, 246) textCol rgb(255, 255, 255)

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
GhostButton: from Button col transparent textCol #3B82F6 bor 1 boc #3B82F6

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

// =============================================================================
// REAL-WORLD LLM SCENARIOS
// =============================================================================

export const REAL_WORLD = {
  // Login form response
  loginForm: `--- COMPONENTS ---
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
  SubmitButton "Sign In"`,

  // Navigation bar response
  navigationBar: `Here's a navigation bar:

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

This creates a responsive navigation bar.`,

  // Card grid response
  cardGrid: `--- COMPONENTS ---
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
      CardFooter Price "$149" ActionButton "Buy"`,

  // Broken output that should recover
  brokenOutput: `--- COMPONENTS ---
Button: hor center padding 16 background blue color white

--- LAYOUT ---
Button padding 16 "Click"`,

  // Mixed good and bad definitions
  mixedOutput: `--- COMPONENTS ---
GoodButton: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6
BadButton: horizontal center padding 16 background red

--- LAYOUT ---
GoodButton "Good"
BadButton "Bad"`,
}

// =============================================================================
// PERFORMANCE TEST DATA
// =============================================================================

export function generateLargeOutput(componentCount: number): string {
  let components = '--- COMPONENTS ---\n'
  for (let i = 0; i < componentCount; i++) {
    components += `Button${i}: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6 size 14\n`
  }

  let layout = '--- LAYOUT ---\n'
  for (let i = 0; i < componentCount; i++) {
    layout += `Button${i} "Button ${i}"\n`
  }

  return components + '\n' + layout
}

export const DEEPLY_NESTED = `--- COMPONENTS ---
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
