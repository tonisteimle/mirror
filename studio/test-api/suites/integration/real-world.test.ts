/**
 * Integration — Real-World Patterns
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Real-World UI Patterns
// =============================================================================

export const realWorldPatternTests: TestCase[] = describe('Real-World Patterns', [
  testWithSetup(
    'Complete form field pattern',
    `FormField: gap 4
  FieldLabel: fs 12, col #888, weight 500
  FieldInput as Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444
    focus:
      boc #2271C1
  FieldError: fs 11, col #ef4444, hidden

FormField
  FieldLabel "Email Address"
  FieldInput placeholder "you@example.com"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // FormField

      // FormField layout
      api.assert.hasStyle('node-1', 'gap', '4px')

      const field = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(field !== null, 'FormField should exist')

      // Find the input element
      const input = field!.querySelector('input') as HTMLInputElement
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'INPUT', 'Should be an input element')
      api.assert.ok(input.placeholder === 'you@example.com', 'Should have correct placeholder')

      // Input styling
      const inputStyle = getComputedStyle(input)
      api.assert.ok(inputStyle.padding === '12px', 'Input should have 12px padding')
      api.assert.ok(
        inputStyle.backgroundColor === 'rgb(34, 34, 34)',
        'Input should have dark background'
      )
      api.assert.ok(inputStyle.borderRadius === '6px', 'Input should have 6px radius')

      // Label exists
      const fieldText = field!.textContent || ''
      api.assert.ok(fieldText.includes('Email Address'), 'Should have label text')
    }
  ),

  testWithSetup(
    'Alert component with variants',
    `Alert: hor, pad 12 16, rad 6, gap 12, ver-center
  AlertIcon as Icon: is 20
  AlertText: grow

SuccessAlert as Alert: bg #10b98120, bor 1, boc #10b981
InfoAlert as Alert: bg #2271C120, bor 1, boc #2271C1
WarningAlert as Alert: bg #f59e0b20, bor 1, boc #f59e0b
ErrorAlert as Alert: bg #ef444420, bor 1, boc #ef4444

Frame gap 8
  SuccessAlert
    AlertIcon "check-circle", ic #10b981
    AlertText "Operation successful", col #10b981
  ErrorAlert
    AlertIcon "x-circle", ic #ef4444
    AlertText "Something went wrong", col #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // SuccessAlert
      api.assert.exists('node-5') // ErrorAlert

      // Frame layout
      api.assert.hasStyle('node-1', 'gap', '8px')

      // SuccessAlert layout and border
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'paddingTop', '12px')
      api.assert.hasStyle('node-2', 'paddingLeft', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')
      api.assert.hasStyle('node-2', 'gap', '12px')
      api.assert.hasStyle('node-2', 'alignItems', 'center')
      api.assert.hasStyle('node-2', 'borderWidth', '1px')
      api.assert.hasStyle('node-2', 'borderColor', 'rgb(16, 185, 129)')

      // ErrorAlert border
      api.assert.hasStyle('node-5', 'borderColor', 'rgb(239, 68, 68)')

      // Content exists
      const success = document.querySelector('[data-mirror-id="node-2"]')
      const error = document.querySelector('[data-mirror-id="node-5"]')
      api.assert.ok(success !== null, 'Success alert should exist')
      api.assert.ok(error !== null, 'Error alert should exist')
      const successText = success!.textContent || ''
      const errorText = error!.textContent || ''
      api.assert.ok(
        successText.includes('Operation successful'),
        `Success should have message, got: "${successText}"`
      )
      api.assert.ok(
        errorText.includes('Something went wrong'),
        `Error should have message, got: "${errorText}"`
      )
    }
  ),

  testWithSetup(
    'Dropdown menu pattern with cross-element state',
    `MenuBtn as Button: pad 10 16, bg #333, col white, rad 6, hor, gap 8, toggle()
  open:
    bg #444

Dropdown: bg #1a1a1a, pad 8, rad 8, shadow lg, hidden, abs, y 48
  MenuBtn.open:
    visible

MenuItem: pad 10 16, col #888, rad 4, cursor pointer
  hover:
    bg #222
    col white

Frame relative
  MenuBtn
    Text "Options"
    Icon "chevron-down", ic white, is 16
  Dropdown
    MenuItem "Edit"
    MenuItem "Duplicate"
    MenuItem "Delete"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // MenuBtn

      // Frame must be relative positioned
      api.assert.hasStyle('node-1', 'position', 'relative')

      // === INITIAL: Menu button closed ===
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '8px')
      api.assert.hasStyle('node-2', 'paddingTop', '10px')
      api.assert.hasStyle('node-2', 'paddingLeft', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      // Button has correct content
      const btn = document.querySelector('[data-mirror-id="node-2"]') as HTMLButtonElement
      api.assert.ok(btn !== null, 'MenuBtn element should exist')
      api.assert.ok(btn.tagName === 'BUTTON', 'MenuBtn must be a button')
      const btnText = btn.textContent || ''
      api.assert.ok(btnText.includes('Options'), `Button should say Options, got: "${btnText}"`)

      // === CLICK TO OPEN ===
      await api.interact.click('node-2')
      await api.utils.delay(200)

      // Button changes to open state
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(68, 68, 68)')

      // Verify data-state - Mirror code uses 'open:' state block
      const el = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const actualState = el.getAttribute('data-state')
      api.assert.ok(actualState === 'open', `Should be in 'open' state, got: '${actualState}'`)
    }
  ),

  testWithSetup(
    'Tag input pattern',
    `Tag: hor, gap 4, pad 4 8, bg #333, rad 4, ver-center
  TagText: col white, fs 12
  TagRemove as Icon: is 14, ic #888, cursor pointer
    hover:
      ic white

TagInput as Input: pad 8, bg transparent, col white, bor 0, grow

Frame hor, wrap, gap 8, pad 12, bg #1a1a1a, rad 6, bor 1, boc #444
  Tag
    TagText "JavaScript"
    TagRemove "x"
  Tag
    TagText "TypeScript"
    TagRemove "x"
  Tag
    TagText "React"
    TagRemove "x"
  TagInput placeholder "Add tag..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container

      // Container layout with wrap
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'flexWrap', 'wrap')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'padding', '12px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'borderWidth', '1px')
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(68, 68, 68)')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // All tags present
      api.assert.ok(containerText.includes('JavaScript'), 'Should have JS tag')
      api.assert.ok(containerText.includes('TypeScript'), 'Should have TS tag')
      api.assert.ok(containerText.includes('React'), 'Should have React tag')

      // Input exists with correct placeholder
      const input = container!.querySelector('input') as HTMLInputElement
      api.assert.ok(input !== null, 'TagInput should exist')
      api.assert.ok(input.placeholder === 'Add tag...', 'Input should have placeholder')

      // Input has grow (flex-grow)
      const inputStyle = getComputedStyle(input)
      api.assert.ok(inputStyle.flexGrow === '1', 'Input should have flex-grow: 1')
    }
  ),

  testWithSetup(
    'Pricing card with CTA',
    `PricingCard: bg #1a1a1a, pad 24, rad 12, gap 16, center, w 280
  PlanName: fs 14, col #888, uppercase, weight 500
  Price: hor, gap 4, ver-center
  PriceAmount: fs 48, col white, weight bold
  PricePeriod: fs 14, col #888
  Features: gap 8, w full
  Feature: hor, gap 8, ver-center
  FeatureIcon as Icon: is 16, ic #10b981
  FeatureText: col #888, fs 14
  CTABtn as Button: w full, pad 12, bg #2271C1, col white, rad 6, weight 500
    hover:
      bg #1d5fa8

PricingCard
  PlanName "Pro Plan"
  Price
    PriceAmount "$49"
    PricePeriod "/month"
  Features
    Feature
      FeatureIcon "check"
      FeatureText "Unlimited projects"
    Feature
      FeatureIcon "check"
      FeatureText "Priority support"
    Feature
      FeatureIcon "check"
      FeatureText "Advanced analytics"
  CTABtn "Get Started"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // PricingCard

      // Card styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')
      api.assert.hasStyle('node-1', 'gap', '16px')
      api.assert.hasStyle('node-1', 'width', '280px')

      // Card has centering
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      const cardText = card!.textContent || ''

      // Content verification
      api.assert.ok(cardText.includes('Pro Plan'), 'Should have plan name')
      api.assert.ok(cardText.includes('$49'), 'Should have price')
      api.assert.ok(cardText.includes('/month'), 'Should have period')
      api.assert.ok(cardText.includes('Unlimited projects'), 'Should have feature 1')
      api.assert.ok(cardText.includes('Priority support'), 'Should have feature 2')
      api.assert.ok(cardText.includes('Advanced analytics'), 'Should have feature 3')
      api.assert.ok(cardText.includes('Get Started'), 'Should have CTA')

      // Find CTA button
      const button = card!.querySelector('button') as HTMLButtonElement
      api.assert.ok(button !== null, 'CTA button should exist')
      const buttonText = button.textContent || ''
      api.assert.ok(
        buttonText.includes('Get Started'),
        `Button should say Get Started, got: "${buttonText}"`
      )

      // CTA button styling
      const btnStyle = getComputedStyle(button)
      api.assert.ok(
        btnStyle.backgroundColor === 'rgb(34, 113, 193)',
        'Button should be primary blue'
      )
      api.assert.ok(btnStyle.color === 'rgb(255, 255, 255)', 'Button text should be white')
      api.assert.ok(btnStyle.borderRadius === '6px', 'Button should have 6px radius')
    }
  ),
])
