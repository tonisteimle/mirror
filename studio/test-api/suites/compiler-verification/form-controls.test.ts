/**
 * Compiler Verification — Form Controls
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 16. Form Controls
// =============================================================================

export const formControlsTests: TestCase[] = describe('Form Controls', [
  testWithSetup(
    'Input with placeholder',
    `Input placeholder "Enter your name...", bg #333, col white, pad 12, rad 6, w 200`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'input', 'Should be input element')
      api.assert.ok(
        input.attributes.placeholder === 'Enter your name...',
        `Placeholder should be set, got ${input.attributes.placeholder}`
      )
    }
  ),

  testWithSetup(
    'Textarea with placeholder',
    `Textarea placeholder "Write your message...", bg #333, col white, pad 12, rad 6, w 300, h 100`,
    async (api: TestAPI) => {
      const textarea = api.preview.inspect('node-1')
      api.assert.ok(textarea !== null, 'Textarea should exist')
      api.assert.ok(textarea.tagName === 'textarea', 'Should be textarea element')
      api.assert.ok(
        textarea.styles.height === '100px',
        `Height should be 100px, got ${textarea.styles.height}`
      )
    }
  ),

  testWithSetup(
    'Input types',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input type "text", placeholder "Text input"
  Input type "password", placeholder "Password"
  Input type "email", placeholder "Email"
  Input type "number", placeholder "Number"`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-2')
      api.assert.ok(text, 'text should exist')
      const password = api.preview.inspect('node-3')
      api.assert.ok(password, 'password should exist')
      const email = api.preview.inspect('node-4')
      api.assert.ok(email, 'email should exist')
      const number = api.preview.inspect('node-5')
      api.assert.ok(number, 'number should exist')

      // Text input: type defaults to 'text' in HTML if not specified
      api.assert.ok(text !== null, 'Text input element must exist')
      api.assert.ok(
        text!.attributes.type === 'text' || text!.attributes.type === undefined,
        `Text input type should be 'text' or default, got: ${text!.attributes.type}`
      )
      api.assert.ok(password !== null, 'Password input element must exist')
      api.assert.ok(
        password!.attributes.type === 'password',
        `Password input type should be 'password', got: ${password!.attributes.type}`
      )
      api.assert.ok(email !== null, 'Email input element must exist')
      api.assert.ok(
        email!.attributes.type === 'email',
        `Email input type should be 'email', got: ${email!.attributes.type}`
      )
      api.assert.ok(number !== null, 'Number input element must exist')
      api.assert.ok(
        number!.attributes.type === 'number',
        `Number input type should be 'number', got: ${number!.attributes.type}`
      )
    }
  ),

  testWithSetup(
    'Readonly input',
    `Input readonly, value "Cannot edit", bg #222, col #888, pad 12, rad 6`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')

      // STRICT: Must have readonly attribute
      const isReadonly =
        input.attributes.readonly !== undefined ||
        input.dataAttributes['data-readonly'] !== undefined

      api.assert.ok(
        isReadonly,
        `Input should be readonly, got attributes: ${JSON.stringify(input.attributes)}`
      )
    }
  ),
])
