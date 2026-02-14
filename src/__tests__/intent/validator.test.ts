import { describe, it, expect } from 'vitest'
import {
  validateIntent,
  ValidationResult,
} from '../../intent/validator'
import { Intent } from '../../intent/schema'

describe('Intent Validator', () => {
  describe('basic validation', () => {
    it('validates empty intent', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects null', () => {
      const result = validateIntent(null)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('null')
    })

    it('rejects non-object', () => {
      const result = validateIntent('string')
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('object')
    })
  })

  describe('token validation', () => {
    it('validates valid tokens', () => {
      const intent: Intent = {
        tokens: {
          colors: { primary: '#3B82F6', secondary: '$primary' },
          spacing: { sm: 8, md: 16 },
          radii: { sm: 4, md: 8 },
          sizes: { text: 14, heading: 24 },
        },
        components: [],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('rejects invalid hex color', () => {
      const intent = {
        tokens: {
          colors: { bad: '#ZZZ' },
        },
        components: [],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toBe('tokens.colors.bad')
    })

    it('rejects non-number spacing', () => {
      const intent = {
        tokens: {
          spacing: { bad: 'string' },
        },
        components: [],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toBe('tokens.spacing.bad')
    })
  })

  describe('component definition validation', () => {
    it('validates valid component', () => {
      const intent: Intent = {
        tokens: {},
        components: [
          {
            name: 'Card',
            style: {
              padding: 16,
              background: '#1E1E2E',
              radius: 12,
            },
            slots: ['Title', 'Content'],
          },
        ],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('rejects component without name', () => {
      const intent = {
        tokens: {},
        components: [{ style: {} }],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toBe('components[0].name')
    })

    it('rejects lowercase component name', () => {
      const intent = {
        tokens: {},
        components: [{ name: 'card', style: {} }],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toBe('components[0].name')
      expect(result.errors[0].message).toContain('uppercase')
    })

    it('validates component with inheritance', () => {
      const intent: Intent = {
        tokens: {},
        components: [
          { name: 'Button', style: { padding: 12 } },
          { name: 'DangerButton', base: 'Button', style: { background: '#EF4444' } },
        ],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates component with states', () => {
      const intent: Intent = {
        tokens: {},
        components: [
          {
            name: 'Toggle',
            style: { width: 52, height: 28 },
            states: {
              on: { background: '#3B82F6' },
              off: { background: '#333' },
            },
          },
        ],
        layout: [],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })
  })

  describe('style validation', () => {
    it('validates all style properties', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Box',
            style: {
              direction: 'horizontal',
              gap: 16,
              alignHorizontal: 'center',
              alignVertical: 'top',
              center: true,
              grow: true,
              shrink: 0,
              wrap: true,
              between: true,
              stacked: true,
              padding: 16,
              margin: [8, 16],
              width: 200,
              height: '50%',
              minWidth: 100,
              maxWidth: 500,
              background: '#1E1E2E',
              color: '#FFFFFF',
              borderColor: '#333',
              radius: 8,
              border: 1,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.5,
              textAlign: 'center',
              italic: true,
              underline: true,
              uppercase: true,
              truncate: true,
              shadow: 'md',
              opacity: 0.8,
              cursor: 'pointer',
              scroll: 'vertical',
              clip: true,
              position: 'relative',
              top: 0,
              zIndex: 100,
              hidden: true,
              disabled: true,
              hoverBackground: '#2A2A3E',
              hoverScale: 1.05,
              icon: 'check',
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('rejects invalid direction', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          { component: 'Box', style: { direction: 'diagonal' } },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('direction')
    })

    it('rejects invalid opacity', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          { component: 'Box', style: { opacity: 2 } },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('opacity')
    })

    it('accepts token references in styles', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Box',
            style: {
              gap: '$spacing-md',
              background: '$primary',
              padding: '$pad',
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })
  })

  describe('layout node validation', () => {
    it('validates nested children', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Card',
            children: [
              { component: 'Title', text: 'Welcome' },
              {
                component: 'Content',
                children: [
                  { component: 'Text', text: 'Hello' },
                ],
              },
            ],
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates list items', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Menu',
            children: [
              { component: 'Item', text: 'Profile', isListItem: true },
              { component: 'Item', text: 'Settings', isListItem: true },
            ],
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates node with id', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          { component: 'Button', id: 'SubmitBtn', text: 'Submit' },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })
  })

  describe('condition validation', () => {
    it('validates var condition', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Avatar',
            condition: { type: 'var', variable: '$isLoggedIn' },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates not condition', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'LoginButton',
            condition: {
              type: 'not',
              operand: { type: 'var', variable: '$isLoggedIn' },
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates comparison condition', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Badge',
            condition: {
              type: 'comparison',
              left: { type: 'var', variable: '$count' },
              operator: '>',
              value: 0,
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates and/or conditions', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Admin',
            condition: {
              type: 'and',
              left: { type: 'var', variable: '$isLoggedIn' },
              right: { type: 'var', variable: '$isAdmin' },
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('rejects variable without $', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Box',
            condition: { type: 'var', variable: 'isLoggedIn' },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('variable')
    })

    it('rejects invalid operator', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Box',
            condition: {
              type: 'comparison',
              left: { type: 'var', variable: '$x' },
              operator: '===',
              value: 1,
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('operator')
    })
  })

  describe('conditional style validation', () => {
    it('validates conditional styles', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Button',
            conditionalStyle: [
              {
                condition: { type: 'var', variable: '$active' },
                then: { background: '#3B82F6' },
                else: { background: '#333' },
              },
            ],
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })
  })

  describe('iterator validation', () => {
    it('validates iterator', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Card',
            iterator: {
              itemVariable: '$task',
              source: '$tasks',
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates iterator with sourcePath', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Item',
            iterator: {
              itemVariable: '$item',
              source: '$data',
              sourcePath: ['data', 'items'],
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('rejects iterator without $ prefix', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Card',
            iterator: {
              itemVariable: 'task',
              source: '$tasks',
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('itemVariable')
    })
  })

  describe('data binding validation', () => {
    it('validates data binding', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'TaskList',
            dataBinding: { typeName: 'Tasks' },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates data binding with filter', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'TodoList',
            dataBinding: {
              typeName: 'Tasks',
              filter: {
                type: 'comparison',
                left: { type: 'var', variable: '$done' },
                operator: '==',
                value: false,
              },
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })
  })

  describe('animation validation', () => {
    it('validates show/hide animations', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Panel',
            animations: {
              show: { types: ['fade', 'slide-up'], duration: 300 },
              hide: { types: ['fade'], duration: 150 },
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates continuous animation', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Loader',
            animations: {
              continuous: { types: ['spin'], duration: 1000 },
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('rejects invalid animation type', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Box',
            animations: {
              show: { types: ['explode'], duration: 300 },
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].value).toBe('explode')
    })
  })

  describe('event validation', () => {
    it('validates events with actions', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Button',
            events: {
              onclick: [
                { action: 'navigate', target: 'Dashboard' },
              ],
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates multiple actions', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Button',
            events: {
              onclick: [
                { action: 'select', target: 'self' },
                { action: 'close', target: 'Dropdown' },
              ],
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates open action with position and animation', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Button',
            events: {
              onclick: [
                {
                  action: 'open',
                  target: 'Modal',
                  position: 'center',
                  animation: 'fade',
                  duration: 200,
                },
              ],
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates conditional action', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Button',
            events: {
              onclick: [
                {
                  action: 'navigate',
                  target: 'Dashboard',
                  condition: { type: 'var', variable: '$isLoggedIn' },
                },
              ],
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('rejects invalid action', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Button',
            events: {
              onclick: [{ action: 'explode' }],
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].value).toBe('explode')
    })

    it('rejects invalid position', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Button',
            events: {
              onclick: [{ action: 'open', target: 'X', position: 'diagonal' }],
            },
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('position')
    })
  })

  describe('primitive property validation', () => {
    it('validates input properties', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Input',
            inputType: 'email',
            placeholder: 'Enter email',
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates image properties', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Image',
            src: 'avatar.jpg',
            alt: 'User avatar',
            fit: 'cover',
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates link properties', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Link',
            href: 'https://example.com',
            target: '_blank',
            text: 'Visit',
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates textarea properties', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Textarea',
            placeholder: 'Message',
            rows: 5,
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('validates slider properties', () => {
      const intent: Intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Slider',
            min: 0,
            max: 100,
            step: 5,
            value: 50,
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('rejects invalid input type', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Input',
            inputType: 'color',
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('inputType')
    })

    it('rejects invalid fit', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Image',
            fit: 'stretch',
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('fit')
    })

    it('rejects negative rows', () => {
      const intent = {
        tokens: {},
        components: [],
        layout: [
          {
            component: 'Textarea',
            rows: -1,
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('rows')
    })
  })

  describe('complex validation scenarios', () => {
    it('validates complete login form', () => {
      const intent: Intent = {
        tokens: {
          colors: { primary: '#3B82F6', surface: '#1E1E2E' },
          spacing: { md: 16 },
          radii: { md: 8 },
        },
        components: [
          {
            name: 'Card',
            style: {
              direction: 'vertical',
              padding: 24,
              background: '$surface',
              radius: 12,
              gap: 16,
            },
          },
        ],
        layout: [
          {
            component: 'Card',
            children: [
              { component: 'Text', text: 'Login', style: { fontSize: 24, fontWeight: 600 } },
              {
                component: 'Input',
                id: 'Email',
                inputType: 'email',
                placeholder: 'Email',
              },
              {
                component: 'Input',
                id: 'Password',
                inputType: 'password',
                placeholder: 'Password',
              },
              {
                component: 'Button',
                text: 'Sign In',
                style: { background: '$primary', padding: 12 },
                events: {
                  onclick: [
                    {
                      action: 'navigate',
                      target: 'Dashboard',
                      condition: {
                        type: 'and',
                        left: { type: 'var', variable: '$Email.value' },
                        right: { type: 'var', variable: '$Password.value' },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(true)
    })

    it('collects multiple errors', () => {
      const intent = {
        tokens: {
          colors: { bad: '#ZZZ' },
          spacing: { also_bad: 'string' },
        },
        components: [
          { style: {} },  // missing name
        ],
        layout: [
          { component: 'Box', style: { opacity: 5, direction: 'wrong' } },
        ],
      }

      const result = validateIntent(intent)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(3)
    })
  })
})
