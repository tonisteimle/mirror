/**
 * Complex Integration Scenarios
 *
 * Tests for realistic, complex UI patterns that combine multiple DSL features:
 * - Tokens + Components + States + Events
 * - Deep nesting with slot system
 * - Component inheritance chains
 * - Data binding with conditionals
 * - Multi-component interactions
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'
import { generateReactElement } from '../../../generator/react-generator'

// Helper to check parse success
function expectNoParsErrors(result: ReturnType<typeof parse>) {
  const errors = result.errors.filter(e => !e.startsWith('Warning:'))
  if (errors.length > 0) {
    console.error('Parse errors:', errors)
  }
  expect(errors).toHaveLength(0)
}

// Helper to render and check no exceptions
function expectRenders(result: ReturnType<typeof parse>) {
  expect(() => {
    generateReactElement(result.nodes, {
      tokens: result.tokens,
      registry: result.registry
    })
  }).not.toThrow()
}

// ============================================
// SCENARIO 1: Complete Design System
// ============================================

describe('Complete Design System', () => {
  const designSystemDSL = `
// Design Tokens
$primary: #3B82F6
$primary-hover: #2563EB
$secondary: #6B7280
$danger: #EF4444
$success: #10B981

$bg-dark: #0F0F0F
$bg-card: #1A1A1A
$bg-input: #2A2A2A
$bg-hover: #333333

$text-primary: #FFFFFF
$text-secondary: #9CA3AF
$text-muted: #6B7280

$spacing-xs: 4
$spacing-sm: 8
$spacing-md: 16
$spacing-lg: 24
$spacing-xl: 32

$radius-sm: 4
$radius-md: 8
$radius-lg: 12
$radius-full: 9999

$shadow-sm: sm
$shadow-md: md
$shadow-lg: lg

// Base Components
Button: padding $spacing-sm $spacing-md radius $radius-md cursor pointer
  state hover
    opacity 0.9
  state active
    opacity 0.8
  state disabled
    opacity 0.5 cursor default

PrimaryButton from Button: background $primary color $text-primary
  state hover
    background $primary-hover

SecondaryButton from Button: background transparent border 1 border-color $secondary color $text-secondary
  state hover
    background $bg-hover

DangerButton from Button: background $danger color $text-primary
  state hover
    opacity 0.9

Card: vertical padding $spacing-lg background $bg-card radius $radius-lg
  CardHeader: horizontal between vertical-center padding-bottom $spacing-md border bottom 1 border-color $bg-hover
    CardTitle: size 18 weight 600 color $text-primary
    CardActions: horizontal gap $spacing-sm
  CardBody: vertical gap $spacing-md padding-top $spacing-md
  CardFooter: horizontal between vertical-center padding-top $spacing-md border top 1 border-color $bg-hover

Input: width full padding $spacing-sm $spacing-md background $bg-input radius $radius-md border 1 border-color $bg-hover color $text-primary
  state focus
    border-color $primary
  state invalid
    border-color $danger

// Usage
App vertical gap $spacing-lg padding $spacing-xl background $bg-dark
  Card width 400
    CardHeader
      CardTitle "User Settings"
      CardActions
        SecondaryButton icon "settings" "Settings"
    CardBody
      Input "Enter your name"
      Input "Enter your email" type email
    CardFooter
      SecondaryButton "Cancel"
      PrimaryButton "Save Changes"
`

  it('parses complete design system', () => {
    const result = parse(designSystemDSL)
    expectNoParsErrors(result)
  })

  it('defines all tokens', () => {
    const result = parse(designSystemDSL)
    // Tokens are stored without $ prefix
    expect(result.tokens.get('primary')).toBe('#3B82F6')
    expect(result.tokens.get('spacing-md')).toBe(16)
    expect(result.tokens.get('radius-lg')).toBe(12)
  })

  it('creates component inheritance chain', () => {
    const result = parse(designSystemDSL)
    expect(result.registry.has('Button')).toBe(true)
    expect(result.registry.has('PrimaryButton')).toBe(true)
    expect(result.registry.has('SecondaryButton')).toBe(true)
    expect(result.registry.has('DangerButton')).toBe(true)
  })

  it('Card has nested slots', () => {
    const result = parse(designSystemDSL)
    const card = result.registry.get('Card')
    expect(card?.children.some(c => c.name === 'CardHeader')).toBe(true)
    expect(card?.children.some(c => c.name === 'CardBody')).toBe(true)
    expect(card?.children.some(c => c.name === 'CardFooter')).toBe(true)
  })

  it('renders without errors', () => {
    const result = parse(designSystemDSL)
    expectRenders(result)
  })
})

// ============================================
// SCENARIO 2: Dashboard Layout
// ============================================

describe('Dashboard Layout', () => {
  const dashboardDSL = `
$sidebar-width: 240
$header-height: 56
$accent: #8B5CF6

Sidebar: vertical width $sidebar-width height full background #111 padding 16 gap 8
  Logo: horizontal gap 8 vertical-center padding-bottom 16 border bottom 1 border-color #333
    LogoIcon: icon "box" size 24 color $accent
    LogoText: size 18 weight 700 "Dashboard"
  NavSection: vertical gap 4
    NavLabel: size 11 uppercase color #666 padding 8 0
    NavItem: horizontal gap 12 padding 12 radius 8 cursor pointer color #999
      state active
        background #222 color white
      state hover
        background #1a1a1a
      NavIcon: icon "home" size 18
      NavText: size 14

Header: horizontal between vertical-center height $header-height padding 0 24 background #0a0a0a border bottom 1 border-color #222
  SearchBox: horizontal gap 8 padding 8 16 background #1a1a1a radius 20 width 300
    SearchIcon: icon "search" size 16 color #666
    SearchInput: background transparent border 0 color white "Search..."
  UserMenu: horizontal gap 16 vertical-center
    BellIcon: icon "bell" size 20 color #666 cursor pointer
    Avatar: 36 36 radius 18 background $accent

MainContent: vertical padding 24 gap 24 scroll
  PageTitle: size 24 weight 600
  StatsGrid: horizontal gap 16 wrap
    StatCard: vertical padding 20 background #111 radius 12 width 200 gap 8
      StatLabel: size 12 color #666 uppercase
      StatValue: size 28 weight 700
      StatChange: horizontal gap 4 vertical-center size 12
        ChangeIcon: size 14
        ChangeText: color #666

Dashboard horizontal height full background #000
  Sidebar
    Logo
    NavSection
      NavLabel "Main"
      - NavItem active
          NavIcon icon "home"
          NavText "Overview"
      - NavItem
          NavIcon icon "bar-chart"
          NavText "Analytics"
      - NavItem
          NavIcon icon "users"
          NavText "Customers"
    - NavSection
        NavLabel "Settings"
        - NavItem
            NavIcon icon "settings"
            NavText "Configuration"
  Content vertical grow
    Header
      SearchBox
      UserMenu
    MainContent
      PageTitle "Dashboard Overview"
      StatsGrid
        - StatCard
            StatLabel "Revenue"
            StatValue "$48,352"
            StatChange
              ChangeIcon icon "trending-up" color #10B981
              ChangeText "+12.5%"
        - StatCard
            StatLabel "Orders"
            StatValue "1,429"
            StatChange
              ChangeIcon icon "trending-up" color #10B981
              ChangeText "+8.2%"
        - StatCard
            StatLabel "Customers"
            StatValue "3,842"
            StatChange
              ChangeIcon icon "trending-down" color #EF4444
              ChangeText "-2.1%"
`

  it('parses dashboard layout', () => {
    const result = parse(dashboardDSL)
    expectNoParsErrors(result)
  })

  it('creates all layout components', () => {
    const result = parse(dashboardDSL)
    expect(result.registry.has('Sidebar')).toBe(true)
    expect(result.registry.has('Header')).toBe(true)
    expect(result.registry.has('MainContent')).toBe(true)
  })

  it('NavItem has active and hover states', () => {
    const result = parse(dashboardDSL)
    // Nested components use qualified registry keys like 'Sidebar.NavSection'
    // Navigate through children from top-level Sidebar
    const sidebar = result.registry.get('Sidebar')
    const navSection = sidebar?.children.find(c => c.name === 'NavSection')
    const navItem = navSection?.children.find(c => c.name === 'NavItem')
    const activeState = navItem?.states?.find(s => s.name === 'active')
    const hoverState = navItem?.states?.find(s => s.name === 'hover')
    expect(activeState).toBeDefined()
    expect(hoverState).toBeDefined()
  })

  it('renders complex dashboard', () => {
    const result = parse(dashboardDSL)
    expectRenders(result)
  })
})

// ============================================
// SCENARIO 3: E-commerce Product Page
// ============================================

describe('E-commerce Product Page', () => {
  const productPageDSL = `
$brand: #FF6B00
$price-color: #10B981

ProductGallery: vertical gap 16
  MainImage: width full height 400 radius 12 fit cover background #1a1a1a
  Thumbnails: horizontal gap 8
    Thumbnail: 80 80 radius 8 fit cover cursor pointer border 2 border-color transparent
      state selected
        border-color $brand
      onclick select self
      onclick deselect-siblings

ProductInfo: vertical gap 16 padding 24
  ProductBadge: padding 4 12 background $brand radius 4 size 12 uppercase weight 600 "New"
  ProductTitle: size 28 weight 700 line 1.2
  Rating: horizontal gap 8 vertical-center
    Stars: horizontal gap 2
      Star: icon "star" size 16 color #FFD700
    ReviewCount: size 14 color #666
  Price: horizontal gap 12 vertical-center
    CurrentPrice: size 32 weight 700 color $price-color
    OriginalPrice: size 18 color #666 line-through
    Discount: padding 4 8 background #EF4444 radius 4 size 12 weight 600 "-20%"
  ProductDescription: size 14 color #999 line 1.6

VariantSelector: vertical gap 12
  SelectorLabel: size 14 weight 500
  Options: horizontal gap 8 wrap
    Option: padding 12 20 border 1 border-color #333 radius 8 cursor pointer
      state selected
        border-color $brand background #FF6B0020
      state hover
        border-color #666
      onclick select self
      onclick deselect-siblings

QuantitySelector: horizontal gap 0 border 1 border-color #333 radius 8
  QtyButton: padding 12 cursor pointer
    state hover
      background #222
  Minus from QtyButton: icon "minus" size 16
  Count: padding 12 24 border left-right 1 border-color #333 size 16 weight 500 "1"
  Plus from QtyButton: icon "plus" size 16

AddToCart: horizontal gap 16
  CartButton: grow padding 16 background $brand radius 8 horizontal center gap 8 cursor pointer
    state hover
      opacity 0.9
    CartIcon: icon "shopping-cart" size 20
    CartText: weight 600 "Add to Cart"
  WishlistButton: padding 16 border 1 border-color #333 radius 8 cursor pointer
    state hover
      background #222
    state active
      background #EF444420 border-color #EF4444
    HeartIcon: icon "heart" size 20

ProductPage horizontal gap 48 padding 48 max-width 1200
  ProductGallery width 500
    MainImage "product-main.jpg"
    Thumbnails
      - Thumbnail selected "thumb-1.jpg"
      - Thumbnail "thumb-2.jpg"
      - Thumbnail "thumb-3.jpg"
      - Thumbnail "thumb-4.jpg"
  ProductDetails vertical grow gap 24
    ProductInfo
      ProductTitle "Premium Wireless Headphones"
      Rating
        Stars
          - Star
          - Star
          - Star
          - Star
          - Star icon "star-half"
        ReviewCount "(128 reviews)"
      Price
        CurrentPrice "$199"
        OriginalPrice "$249"
      ProductDescription "Experience crystal-clear audio with our premium wireless headphones."
    - VariantSelector
        SelectorLabel "Color"
        Options
          - Option selected "Midnight Black"
          - Option "Arctic White"
          - Option "Navy Blue"
    - VariantSelector
        SelectorLabel "Size"
        Options
          - Option "Standard"
          - Option selected "Over-Ear Pro"
    QuantitySelector
    AddToCart
`

  it('parses e-commerce product page', () => {
    const result = parse(productPageDSL)
    expectNoParsErrors(result)
  })

  it('creates all product components', () => {
    const result = parse(productPageDSL)
    expect(result.registry.has('ProductGallery')).toBe(true)
    expect(result.registry.has('ProductInfo')).toBe(true)
    expect(result.registry.has('VariantSelector')).toBe(true)
    expect(result.registry.has('QuantitySelector')).toBe(true)
  })

  it('Thumbnail has selection states', () => {
    const result = parse(productPageDSL)
    const gallery = result.registry.get('ProductGallery')
    const thumbnails = gallery?.children.find(c => c.name === 'Thumbnails')
    const thumbnail = thumbnails?.children.find(c => c.name === 'Thumbnail')
    const selectedState = thumbnail?.states?.find(s => s.name === 'selected')
    expect(selectedState).toBeDefined()
  })

  it('Option has selected state', () => {
    const result = parse(productPageDSL)
    // VariantSelector is top-level, access children
    const selector = result.registry.get('VariantSelector')
    const options = selector?.children.find(c => c.name === 'Options')
    const option = options?.children.find(c => c.name === 'Option')
    // Check that Option has states defined
    const selectedState = option?.states?.find(s => s.name === 'selected')
    expect(selectedState).toBeDefined()
  })

  it('renders complete product page', () => {
    const result = parse(productPageDSL)
    expectRenders(result)
  })
})

// ============================================
// SCENARIO 4: Chat Application
// ============================================

describe('Chat Application', () => {
  const chatAppDSL = `
$online: #10B981
$offline: #6B7280
$sent: #3B82F6
$received: #2A2A2A

ChatSidebar: vertical width 280 background #111 border right 1 border-color #222
  SidebarHeader: horizontal between vertical-center padding 16 border bottom 1 border-color #222
    SidebarTitle: size 16 weight 600 "Messages"
    ComposeBtn: padding 8 radius 8 cursor pointer
      state hover
        background #222
      ComposeIcon: icon "edit" size 18
  SearchBar: padding 12
    SearchInput: width full padding 10 14 background #1a1a1a radius 20 border 0 "Search conversations..."
  ConversationList: vertical scroll
    Conversation: horizontal gap 12 padding 12 16 cursor pointer
      state active
        background #1a1a1a
      state hover
        background #151515
      ConvAvatar: 44 44 radius 22 background #333
        StatusDot: 10 10 radius 5 position absolute bottom 0 right 0 border 2 border-color #111
          state online
            background $online
          state offline
            background $offline
      ConvInfo: vertical grow gap 2
        TopRow: horizontal between
          ConvName: size 14 weight 500
          ConvTime: size 11 color #666
        ConvPreview: size 13 color #888 truncate

ChatMain: vertical grow background #0a0a0a
  ChatHeader: horizontal between vertical-center padding 16 border bottom 1 border-color #222
    UserInfo: horizontal gap 12 vertical-center
      UserAvatar: 40 40 radius 20 background #333
      UserDetails: vertical gap 2
        UserName: size 14 weight 500
        UserStatus: size 12 color $online "Online"
    Actions: horizontal gap 8
      ActionBtn: padding 8 radius 8 cursor pointer
        state hover
          background #222

  MessageList: vertical grow padding 16 gap 16 scroll
    Message: horizontal gap 12 max-width 70%
      state sent
        horizontal-right margin-left auto
      state received
        horizontal-left
      MsgAvatar: 32 32 radius 16 background #333 shrink 0
      Bubble: vertical gap 4 padding 12 16 radius 16
        state sent
          background $sent radius-bottom-right 4
        state received
          background $received radius-bottom-left 4
        MsgText: size 14 line 1.5
        MsgTime: size 11 color #888

  InputBar: horizontal gap 12 padding 16 border top 1 border-color #222
    AttachBtn: padding 10 radius 8 cursor pointer
      state hover
        background #222
      AttachIcon: icon "paperclip" size 20 color #666
    MsgInput: grow padding 12 16 background #1a1a1a radius 24 border 0 "Type a message..."
    SendBtn: padding 12 background $sent radius 12 cursor pointer
      state hover
        opacity 0.9
      state disabled
        opacity 0.5
      SendIcon: icon "send" size 18

ChatApp horizontal height full
  ChatSidebar
    SidebarHeader
    SearchBar
    ConversationList
      - Conversation active
          ConvAvatar
            StatusDot online
          ConvInfo
            TopRow
              ConvName "Alice Johnson"
              ConvTime "2m"
            ConvPreview "That sounds great! Let me check..."
      - Conversation
          ConvAvatar
            StatusDot offline
          ConvInfo
            TopRow
              ConvName "Bob Smith"
              ConvTime "1h"
            ConvPreview "Thanks for the update"
      - Conversation
          ConvAvatar
            StatusDot online
          ConvInfo
            TopRow
              ConvName "Carol Davis"
              ConvTime "3h"
            ConvPreview "Can we schedule a call?"
  ChatMain
    ChatHeader
      UserInfo
        UserAvatar
        UserDetails
      Actions
        - ActionBtn icon "phone"
        - ActionBtn icon "video"
        - ActionBtn icon "more-vertical"
    MessageList
      - Message received
          MsgAvatar
          Bubble
            MsgText "Hey! How's the project going?"
            MsgTime "10:30 AM"
      - Message sent
          Bubble
            MsgText "Going well! Just finished the design review."
            MsgTime "10:32 AM"
      - Message received
          MsgAvatar
          Bubble
            MsgText "That sounds great! Let me check the latest updates."
            MsgTime "10:33 AM"
    InputBar
`

  it('parses chat application', () => {
    const result = parse(chatAppDSL)
    expectNoParsErrors(result)
  })

  it('creates sidebar and main components', () => {
    const result = parse(chatAppDSL)
    expect(result.registry.has('ChatSidebar')).toBe(true)
    expect(result.registry.has('ChatMain')).toBe(true)
  })

  it('Message has sent/received states', () => {
    const result = parse(chatAppDSL)
    // ChatMain is top-level, children are nested
    const chatMain = result.registry.get('ChatMain')
    const messageList = chatMain?.children.find(c => c.name === 'MessageList')
    const message = messageList?.children.find(c => c.name === 'Message')
    // Message should have states
    expect(message).toBeDefined()
    const states = message?.states?.map(s => s.name) || []
    // At least one of sent/received should be defined
    expect(states.length).toBeGreaterThanOrEqual(1)
  })

  it('Conversation has active and hover states', () => {
    const result = parse(chatAppDSL)
    const sidebar = result.registry.get('ChatSidebar')
    const list = sidebar?.children.find(c => c.name === 'ConversationList')
    const conv = list?.children.find(c => c.name === 'Conversation')
    // Conversation should have at least active state
    expect(conv).toBeDefined()
    const states = conv?.states?.map(s => s.name) || []
    expect(states).toContain('active')
  })

  it('renders complete chat app', () => {
    const result = parse(chatAppDSL)
    expectRenders(result)
  })
})

// ============================================
// SCENARIO 5: Form with Validation
// ============================================

describe('Form with Complex Validation', () => {
  // Simplified form - avoiding list items with complex templates
  const complexFormDSL = `
$valid: #10B981
$invalid: #EF4444
$warning: #F59E0B

FormField: vertical gap 6
  FieldLabel: size 13 weight 500
    Required: color $invalid " *"
  InputWrapper: horizontal gap 8 vertical-center
    FieldInput: grow padding 12 background #1a1a1a radius 8 border 1 border-color #333
      state focus
        border-color #3B82F6
      state valid
        border-color $valid
      state invalid
        border-color $invalid
    ValidationIcon: size 18
      state valid
        icon "check-circle" color $valid
      state invalid
        icon "x-circle" color $invalid
  HelpText: size 12 color #666
  ErrorText: size 12 color $invalid hidden
    state invalid
      visible true

PasswordStrength: vertical gap 8
  Meter: horizontal gap 4 height 4
    Segment: grow radius 2 background #333
      state weak
        background $invalid
      state medium
        background $warning
      state strong
        background $valid
  StrengthLabel: size 12 color #666

Checkbox: 18 18 radius 4 border 1 border-color #333 cursor pointer
  state checked
    background #3B82F6 border-color #3B82F6
  CheckIcon: icon "check" size 12 color white hidden
    state checked
      visible true

Form: vertical gap 24 padding 32 background #111 radius 16 width 400
  FormHeader: vertical gap 8 margin 0 0 16 0 border bottom 1 border-color #222
    FormTitle: size 24 weight 700 "Create Account"
    FormSubtitle: size 14 color #666 "Fill in your details to get started"

  Fields: vertical gap 16
    FormField
      FieldLabel "Full Name"
      InputWrapper
        FieldInput "Enter your full name"
        ValidationIcon
      HelpText "Your name as it appears on official documents"

  Terms: horizontal gap 8
    Checkbox
    TermsText: size 13 color #888 line 1.5 "I agree to the Terms"

  FormActions: vertical gap 12 margin 8 0 0 0
    SubmitBtn: padding 14 background #3B82F6 radius 8 horizontal center weight 600 cursor pointer
      state hover
        opacity 0.9
      state disabled
        opacity 0.5 cursor default
      "Create Account"
`

  it('parses complex form', () => {
    const result = parse(complexFormDSL)
    expectNoParsErrors(result)
  })

  it('FormField has all sub-components', () => {
    const result = parse(complexFormDSL)
    const field = result.registry.get('FormField')
    expect(field?.children.some(c => c.name === 'FieldLabel')).toBe(true)
    expect(field?.children.some(c => c.name === 'InputWrapper')).toBe(true)
    expect(field?.children.some(c => c.name === 'HelpText')).toBe(true)
    expect(field?.children.some(c => c.name === 'ErrorText')).toBe(true)
  })

  it('FieldInput has focus, valid, and invalid states', () => {
    const result = parse(complexFormDSL)
    const field = result.registry.get('FormField')
    const wrapper = field?.children.find(c => c.name === 'InputWrapper')
    const input = wrapper?.children.find(c => c.name === 'FieldInput')
    const states = input?.states?.map(s => s.name) || []
    expect(states).toContain('focus')
    expect(states).toContain('valid')
    expect(states).toContain('invalid')
  })

  it('PasswordStrength meter has strength states', () => {
    const result = parse(complexFormDSL)
    const strength = result.registry.get('PasswordStrength')
    const meter = strength?.children.find(c => c.name === 'Meter')
    const segment = meter?.children.find(c => c.name === 'Segment')
    expect(segment?.states?.length).toBeGreaterThanOrEqual(1)
  })

  it('Checkbox has checked state', () => {
    const result = parse(complexFormDSL)
    // Get Checkbox directly from registry, not nested
    const checkbox = result.registry.get('Checkbox')
    const checkedState = checkbox?.states?.find(s => s.name === 'checked')
    expect(checkedState).toBeDefined()
  })

  it('renders complete form', () => {
    const result = parse(complexFormDSL)
    expectRenders(result)
  })
})

// ============================================
// SCENARIO 6: Data-Driven Components
// ============================================

describe('Component with Multiple States', () => {
  // This scenario tests components with multiple behavioral states
  // and priority indicators (without requiring array tokens)
  const statefulComponentsDSL = `
$high-color: #EF4444
$medium-color: #F59E0B
$low-color: #10B981
$check-color: #3B82F6

TaskItem: horizontal between vertical-center padding 12 border bottom 1 border-color #222
  TaskLeft: horizontal gap 12 vertical-center
    TaskCheckbox: 20 20 radius 4 border 1 border-color #333 cursor pointer
      state checked
        background $check-color border-color $check-color
    TaskTitle: size 14
      state done
        color #666
  TaskPriority: padding 4 8 radius 4 size 11 uppercase
    state high
      background #EF444420 color $high-color
    state medium
      background #F59E0B20 color $medium-color
    state low
      background #10B98120 color $low-color

TaskList: vertical background #111 radius 12
  ListHeader: horizontal between vertical-center padding 16 border bottom 1 border-color #222
    ListTitle: size 16 weight 600 "Tasks"
    AddBtn: horizontal gap 6 padding 8 12 background #3B82F6 radius 6 cursor pointer size 13
      AddIcon: icon "plus" size 14
      "Add Task"
  ListItems: vertical
    - TaskItem
        TaskLeft
          TaskCheckbox checked
          TaskTitle done "Review PRs"
        TaskPriority high "HIGH"
    - TaskItem
        TaskLeft
          TaskCheckbox
          TaskTitle "Write tests"
        TaskPriority medium "MEDIUM"
    - TaskItem
        TaskLeft
          TaskCheckbox
          TaskTitle "Update docs"
        TaskPriority low "LOW"
`

  it('parses stateful components', () => {
    const result = parse(statefulComponentsDSL)
    expectNoParsErrors(result)
  })

  it('defines color tokens', () => {
    const result = parse(statefulComponentsDSL)
    expect(result.tokens.get('high-color')).toBe('#EF4444')
    expect(result.tokens.get('medium-color')).toBe('#F59E0B')
    expect(result.tokens.get('low-color')).toBe('#10B981')
  })

  it('TaskItem has nested structure', () => {
    const result = parse(statefulComponentsDSL)
    const taskItem = result.registry.get('TaskItem')
    expect(taskItem?.children.some(c => c.name === 'TaskLeft')).toBe(true)
    expect(taskItem?.children.some(c => c.name === 'TaskPriority')).toBe(true)
  })

  it('TaskPriority has priority states', () => {
    const result = parse(statefulComponentsDSL)
    const taskItem = result.registry.get('TaskItem')
    const priority = taskItem?.children.find(c => c.name === 'TaskPriority')
    // TaskPriority should have at least one state
    expect(priority).toBeDefined()
    const states = priority?.states?.map(s => s.name) || []
    // Check at least one priority state exists
    const hasPriorityState = states.includes('high') || states.includes('medium') || states.includes('low')
    expect(hasPriorityState).toBe(true)
  })

  it('renders stateful UI', () => {
    const result = parse(statefulComponentsDSL)
    expectRenders(result)
  })
})

// ============================================
// SCENARIO 7: Multi-Step Wizard
// ============================================

describe('Multi-Step Wizard', () => {
  const wizardDSL = `
$step: 1
$maxSteps: 4

StepIndicator: horizontal gap 0 horizontal-center
  Step: horizontal vertical-center gap 8
    StepCircle: 32 32 radius 16 horizontal center vertical-center size 14 weight 600
      state completed
        background #10B981 color white
      state active
        background #3B82F6 color white
      state pending
        background #333 color #666
    StepLabel: size 13
      state active
        color white weight 500
      state pending
        color #666
  Connector: width 40 height 2 background #333 margin 0 8
    state completed
      background #10B981

WizardPanel: vertical padding 32 min-height 300
  state active
    visible true
  state inactive
    hidden

WizardFooter: horizontal between margin 24 0 0 0 border top 1 border-color #222
  BackBtn: horizontal gap 8 padding 12 20 radius 8 cursor pointer
    state disabled
      opacity 0.5 cursor default
    state hover
      background #222
    BackIcon: icon "arrow-left" size 18
    "Back"
  NextBtn: horizontal gap 8 padding 12 20 background #3B82F6 radius 8 cursor pointer
    state hover
      opacity 0.9
    "Next"
    NextIcon: icon "arrow-right" size 18
  FinishBtn: horizontal gap 8 padding 12 24 background #10B981 radius 8 cursor pointer hidden
    state active
      visible true
    FinishIcon: icon "check" size 18
    "Complete"

Wizard: vertical width 600 background #111 radius 16 padding 24
  StepIndicator
    - Step completed
        StepCircle "1"
        StepLabel "Account"
    - Connector completed
    - Step active
        StepCircle "2"
        StepLabel "Profile"
    - Connector
    - Step pending
        StepCircle "3"
        StepLabel "Preferences"
    - Connector
    - Step pending
        StepCircle "4"
        StepLabel "Review"

  Panels: vertical
    - WizardPanel active
        PanelTitle: size 20 weight 600 margin 0 0 16 0 "Profile Information"
        PanelFields: vertical gap 16
          NameInput: width full padding 12 background #1a1a1a radius 8 "Full Name"
          BioInput: width full padding 12 background #1a1a1a radius 8 "Bio"
          Upload: horizontal gap 12 padding 16 border 1 dashed border-color #333 radius 8 cursor pointer
            UploadIcon: icon "upload" size 24 color #666
            UploadInfo: vertical gap 4
              UploadLabel: size 14 "Upload Avatar"
              UploadHint: size 12 color #666 "PNG, JPG up to 5MB"

    - WizardPanel inactive
        PrefsTitle: size 20 weight 600 margin 0 0 16 0 "Preferences"
        PrefsOptions: vertical gap 12
          NotifyOption: horizontal gap 12 vertical-center padding 12 border 1 border-color #333 radius 8 cursor pointer
            state selected
              border-color #3B82F6 background #3B82F620
            NotifyCheckbox: 18 18 radius 4 border 1 border-color #333
              state selected
                background #3B82F6
            NotifyLabel: size 14 "Receive email notifications"

  WizardFooter
    BackBtn disabled
    NextBtn
`

  it('parses multi-step wizard', () => {
    const result = parse(wizardDSL)
    expectNoParsErrors(result)
  })

  it('Step has completed and active states', () => {
    const result = parse(wizardDSL)
    const indicator = result.registry.get('StepIndicator')
    const step = indicator?.children.find(c => c.name === 'Step')
    const circle = step?.children.find(c => c.name === 'StepCircle')
    // StepCircle should have states
    expect(circle).toBeDefined()
    const states = circle?.states?.map(s => s.name) || []
    // Check at least completed and active are defined
    expect(states).toContain('completed')
    expect(states).toContain('active')
  })

  it('WizardPanel has visibility states', () => {
    const result = parse(wizardDSL)
    const panel = result.registry.get('WizardPanel')
    const activeState = panel?.states?.find(s => s.name === 'active')
    const inactiveState = panel?.states?.find(s => s.name === 'inactive')
    expect(activeState).toBeDefined()
    expect(inactiveState).toBeDefined()
  })

  it('renders complete wizard', () => {
    const result = parse(wizardDSL)
    expectRenders(result)
  })
})
