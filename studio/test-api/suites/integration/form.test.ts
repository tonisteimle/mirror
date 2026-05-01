/**
 * Integration — Form Integration
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Form Integration
// =============================================================================

export const formIntegrationTests: TestCase[] = describe('Form Integration', [
  testWithSetup(
    'Complete login form',
    `FormField: gap 4
  Label: fs 12, col #888, weight 500
  FormInput as Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444, w full
    focus:
      boc #2271C1

SubmitBtn as Button: w full, pad 14, bg #2271C1, col white, rad 6, weight 600, fs 16
  hover:
    bg #1d5fa8

Frame gap 20, pad 24, bg #1a1a1a, rad 12, w 320
  Text "Login", col white, fs 24, weight bold, center
  FormField
    Label "Email"
    FormInput placeholder "you@example.com", type email
  FormField
    Label "Password"
    FormInput placeholder "••••••••", type password
  SubmitBtn "Sign In"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Form container

      // Container styling
      api.assert.hasStyle('node-1', 'gap', '20px')
      api.assert.hasStyle('node-1', 'padding', '24px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')
      api.assert.hasStyle('node-1', 'width', '320px')

      const form = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(form !== null, 'Form should exist')
      const formText = form!.textContent || ''

      // Title exists
      api.assert.ok(formText.includes('Login'), 'Should have Login title')

      // Find inputs
      const inputs = form!.querySelectorAll('input')
      api.assert.ok(inputs.length === 2, `Should have 2 inputs, found ${inputs.length}`)

      // Email input
      const emailInput = inputs[0] as HTMLInputElement
      api.assert.ok(emailInput.placeholder === 'you@example.com', 'Email should have placeholder')
      api.assert.ok(emailInput.type === 'email', 'Email should have type email')

      // Password input
      const passwordInput = inputs[1] as HTMLInputElement
      api.assert.ok(passwordInput.type === 'password', 'Password should have type password')

      // Submit button
      const button = form!.querySelector('button')
      api.assert.ok(button !== null, 'Submit button should exist')
      const buttonText = button!.textContent || ''
      api.assert.ok(
        buttonText.includes('Sign In'),
        `Button should say Sign In, got: "${buttonText}"`
      )

      const btnStyle = getComputedStyle(button as Element)
      api.assert.ok(btnStyle.backgroundColor === 'rgb(34, 113, 193)', 'Button should be blue')
      // Button has `w full` which becomes width: 100%, computed to content width of parent
      // Parent is 320px with 24px padding, so content area is 272px
      const btnWidth = parseFloat(btnStyle.width)
      api.assert.ok(btnWidth > 0, `Button should have width > 0, got: ${btnStyle.width}`)
      api.assert.ok(
        btnWidth >= 200 && btnWidth <= 320,
        `Button should fill available width (~272px), got: ${btnStyle.width}`
      )
    }
  ),

  testWithSetup(
    'Input with validation states',
    `ValidInput as Input: pad 12, bg #222, col white, rad 6, bor 2, boc #10b981, w full
ErrorInput as Input: pad 12, bg #222, col white, rad 6, bor 2, boc #ef4444, w full
DefaultInput as Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444, w full

Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 300
  Frame gap 4
    Text "Valid Input", col #10b981, fs 12
    ValidInput placeholder "Valid value"
  Frame gap 4
    Text "Error Input", col #ef4444, fs 12
    ErrorInput placeholder "Invalid value"
  Frame gap 4
    Text "Default Input", col #888, fs 12
    DefaultInput placeholder "Enter value"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')

      // Find all inputs
      const inputs = container!.querySelectorAll('input')
      api.assert.ok(inputs.length === 3, `Should have 3 inputs, found ${inputs.length}`)

      // Valid input has green border
      const validInput = inputs[0] as HTMLInputElement
      const validStyle = getComputedStyle(validInput)
      api.assert.ok(
        validStyle.borderColor === 'rgb(16, 185, 129)',
        'Valid input should have green border'
      )
      api.assert.ok(validStyle.borderWidth === '2px', 'Valid input should have 2px border')

      // Error input has red border
      const errorInput = inputs[1] as HTMLInputElement
      const errorStyle = getComputedStyle(errorInput)
      api.assert.ok(
        errorStyle.borderColor === 'rgb(239, 68, 68)',
        'Error input should have red border'
      )

      // Default input has gray border
      const defaultInput = inputs[2] as HTMLInputElement
      const defaultStyle = getComputedStyle(defaultInput)
      api.assert.ok(
        defaultStyle.borderColor === 'rgb(68, 68, 68)',
        'Default input should have gray border'
      )
      api.assert.ok(defaultStyle.borderWidth === '1px', 'Default input should have 1px border')
    }
  ),

  testWithSetup(
    'Checkbox and switch styling',
    `Frame gap 16, pad 16, bg #1a1a1a, rad 8
  Frame hor, gap 12, ver-center
    Frame w 20, h 20, rad 4, bor 2, boc #2271C1, bg #2271C1, center
      Icon "check", ic white, is 14
    Text "Checked checkbox", col white
  Frame hor, gap 12, ver-center
    Frame w 20, h 20, rad 4, bor 2, boc #444
    Text "Unchecked checkbox", col #888
  Frame hor, gap 12, ver-center
    Frame w 44, h 24, rad 99, bg #2271C1, relative
      Frame w 20, h 20, rad 99, bg white, abs, x 22, y 2
    Text "Switch on", col white
  Frame hor, gap 12, ver-center
    Frame w 44, h 24, rad 99, bg #444, relative
      Frame w 20, h 20, rad 99, bg white, abs, x 2, y 2
    Text "Switch off", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // Has all checkbox/switch labels
      api.assert.ok(containerText.includes('Checked checkbox'), 'Should have checked label')
      api.assert.ok(containerText.includes('Unchecked checkbox'), 'Should have unchecked label')
      api.assert.ok(containerText.includes('Switch on'), 'Should have switch on label')
      api.assert.ok(containerText.includes('Switch off'), 'Should have switch off label')

      // Checked checkbox styling (node-2 is the Frame with checkbox)
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '12px')
      api.assert.hasStyle('node-2', 'alignItems', 'center')
    }
  ),

  testWithSetup(
    'Textarea with character count',
    `Textarea as Textarea: pad 12, bg #222, col white, rad 6, bor 1, boc #444, w full, h 120, resize none

Frame gap 8, pad 16, bg #1a1a1a, rad 8, w 300
  Text "Message", col #888, fs 12, weight 500
  Textarea placeholder "Enter your message..."
  Frame hor, spread
    Text "Max 500 characters", col #666, fs 11
    Text "0/500", col #888, fs 11`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')

      // Find textarea
      const textarea = container!.querySelector('textarea')
      api.assert.ok(textarea !== null, 'Textarea should exist')
      api.assert.ok(
        textarea!.placeholder === 'Enter your message...',
        'Textarea should have placeholder'
      )

      // Textarea styling
      const style = getComputedStyle(textarea as Element)
      api.assert.ok(style.padding === '12px', 'Textarea should have 12px padding')
      api.assert.ok(style.backgroundColor === 'rgb(34, 34, 34)', 'Textarea should have dark bg')
      api.assert.ok(style.borderRadius === '6px', 'Textarea should have 6px radius')
      api.assert.ok(style.height === '120px', 'Textarea should be 120px tall')

      // Character count text
      const containerText = container!.textContent || ''
      api.assert.ok(containerText.includes('0/500'), 'Should show character count')
    }
  ),
])
