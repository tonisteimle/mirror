/**
 * Intent → Mirror Code Generator Tests
 */

import { describe, it, expect } from 'vitest'
import { intentToMirror } from '../../intent/intent-to-mirror'
import type { Intent } from '../../intent/schema'

describe('intentToMirror', () => {
  it('generates tokens', () => {
    const intent: Intent = {
      tokens: {
        colors: {
          primary: '#3B82F6',
          surface: '#1E1E2E',
        },
        spacing: {
          'spacing-md': 16,
          'spacing-lg': 24,
        },
      },
      components: [],
      layout: [],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('$primary: #3B82F6')
    expect(code).toContain('$surface: #1E1E2E')
    expect(code).toContain('$spacing-md: 16')
    expect(code).toContain('$spacing-lg: 24')
  })

  it('generates simple component definition', () => {
    const intent: Intent = {
      tokens: {},
      components: [
        {
          name: 'Card',
          style: {
            padding: '$spacing-md',
            background: '$surface',
            radius: 8,
          },
        },
      ],
      layout: [],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Card: pad $spacing-md bg $surface rad 8')
  })

  it('generates component with inheritance', () => {
    const intent: Intent = {
      tokens: {},
      components: [
        {
          name: 'PrimaryButton',
          base: 'Button',
          style: {
            background: '$primary',
            color: '#FFFFFF',
            padding: [12, 24],
          },
        },
      ],
      layout: [],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('PrimaryButton from Button: pad 12 24 bg $primary col #FFFFFF')
  })

  it('generates component with states', () => {
    const intent: Intent = {
      tokens: {},
      components: [
        {
          name: 'Button',
          style: {
            background: '$primary',
          },
          states: {
            hover: { background: '$primary-dark' },
          },
        },
      ],
      layout: [],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Button: bg $primary')
    expect(code).toContain('state hover')
    expect(code).toContain('bg $primary-dark')
  })

  it('generates simple layout', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Box',
          style: { direction: 'vertical', gap: 16 },
          children: [
            { component: 'Text', text: 'Hello' },
            { component: 'Button', text: 'Click' },
          ],
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Box ver gap 16')
    expect(code).toContain('  Text "Hello"')
    expect(code).toContain('  Button "Click"')
  })

  it('generates named instances', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Button',
          id: 'SubmitBtn',
          text: 'Submit',
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Button named SubmitBtn "Submit"')
  })

  it('generates events', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Button',
          text: 'Open',
          events: {
            onclick: [{ action: 'open', target: 'Dialog' }],
          },
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Button "Open"')
    expect(code).toContain('onclick open Dialog')
  })

  it('generates complete example', () => {
    const intent: Intent = {
      tokens: {
        colors: {
          primary: '#3B82F6',
          'primary-dark': '#2563EB',
          surface: '#1E1E2E',
          text: '#FFFFFF',
        },
        spacing: {
          'spacing-md': 16,
          'spacing-lg': 24,
        },
        radii: {
          'radius-md': 8,
        },
      },
      components: [
        {
          name: 'Card',
          style: {
            direction: 'vertical',
            padding: '$spacing-lg',
            background: '$surface',
            radius: '$radius-md',
            gap: '$spacing-md',
          },
        },
        {
          name: 'PrimaryButton',
          style: {
            background: '$primary',
            color: '$text',
            padding: [12, 24],
            radius: '$radius-md',
            cursor: 'pointer',
          },
          states: {
            hover: { background: '$primary-dark' },
          },
        },
      ],
      layout: [
        {
          component: 'Card',
          children: [
            { component: 'Text', text: 'Welcome', style: { fontSize: 24, fontWeight: 600 } },
            { component: 'Text', text: 'Please login to continue' },
            {
              component: 'PrimaryButton',
              id: 'LoginBtn',
              text: 'Login',
              events: {
                onclick: [{ action: 'navigate', target: 'Dashboard' }],
              },
            },
          ],
        },
      ],
    }

    const code = intentToMirror(intent)

    // Tokens
    expect(code).toContain('$primary: #3B82F6')
    expect(code).toContain('$spacing-lg: 24')
    expect(code).toContain('$radius-md: 8')

    // Components
    expect(code).toContain('Card:')
    expect(code).toContain('PrimaryButton:')
    expect(code).toContain('state hover')

    // Layout
    expect(code).toContain('Card')
    expect(code).toContain('"Welcome"')
    expect(code).toContain('PrimaryButton named LoginBtn "Login"')
    expect(code).toContain('onclick navigate Dashboard')

    // Output for inspection
    console.log('\n=== GENERATED MIRROR CODE ===\n')
    console.log(code)
    console.log('\n=============================\n')
  })

  it('generates list items with - prefix', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Menu',
          children: [
            { component: 'Item', text: 'Profile', isListItem: true },
            { component: 'Item', text: 'Settings', isListItem: true },
            { component: 'Item', text: 'Logout', isListItem: true },
          ],
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Menu')
    expect(code).toContain('- Item "Profile"')
    expect(code).toContain('- Item "Settings"')
    expect(code).toContain('- Item "Logout"')
  })

  it('generates conditional styles', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Button',
          text: 'Toggle',
          conditionalStyle: [
            {
              condition: { type: 'var', variable: '$active' },
              then: { background: '#3B82F6' },
              else: { background: '#333333' },
            },
          ],
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Button')
    expect(code).toContain('if $active then bg #3B82F6 else bg #333333')
  })

  it('generates events with position and animation', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Button',
          text: 'Open',
          events: {
            onclick: [{
              action: 'open',
              target: 'Dialog',
              position: 'center',
              animation: 'fade',
              duration: 300,
            }],
          },
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('onclick open Dialog center fade 300')
  })

  it('generates conditional actions', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Button',
          text: 'Submit',
          events: {
            onclick: [{
              action: 'navigate',
              target: 'Dashboard',
              condition: { type: 'var', variable: '$isValid' },
            }],
          },
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('onclick if $isValid navigate Dashboard')
  })

  it('generates extended actions', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Item',
          text: 'Click me',
          events: {
            onclick: [
              { action: 'select', target: 'self' },
              { action: 'deactivate-siblings' },
            ],
            onhover: [
              { action: 'highlight', target: 'self' },
            ],
          },
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('onclick select self')
    expect(code).toContain('onclick deactivate-siblings')
    expect(code).toContain('onhover highlight self')
  })

  it('generates iterator (each loop)', () => {
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
          children: [
            { component: 'Text', text: '$task.title' },
          ],
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('each $task in $tasks')
    expect(code).toContain('Card')
    expect(code).toContain('Text "$task.title"')
  })

  it('generates iterator with nested source path', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Item',
          iterator: {
            itemVariable: '$item',
            source: '$data.items',
            sourcePath: ['data', 'items'],
          },
          text: '$item.name',
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('each $item in $data.items')
    expect(code).toContain('Item "$item.name"')
  })

  it('generates show/hide animations', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Dialog',
          style: { hidden: true },
          animations: {
            show: { types: ['fade', 'slide-up'], duration: 300 },
            hide: { types: ['fade'], duration: 150 },
          },
          text: 'Content',
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Dialog')
    expect(code).toContain('hidden')
    expect(code).toContain('show fade slide-up 300')
    expect(code).toContain('hide fade 150')
  })

  it('generates continuous animation', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Loader',
          style: { icon: 'loader' },
          animations: {
            continuous: { types: ['spin'], duration: 1000 },
          },
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Loader')
    expect(code).toContain('animate spin 1000')
  })

  it('generates input with type and placeholder', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Input',
          inputType: 'email',
          placeholder: 'Enter your email',
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Input')
    expect(code).toContain('type email')
    expect(code).toContain('placeholder "Enter your email"')
  })

  it('generates image with src, alt, fit', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Image',
          src: 'avatar.jpg',
          alt: 'User avatar',
          fit: 'cover',
          style: { width: 48, height: 48, radius: 24 },
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Image')
    expect(code).toContain('src "avatar.jpg"')
    expect(code).toContain('alt "User avatar"')
    expect(code).toContain('fit cover')
    expect(code).toContain('w 48')
    expect(code).toContain('rad 24')
  })

  it('generates link with href and target', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Link',
          href: 'https://example.com',
          target: '_blank',
          text: 'Visit site',
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Link')
    expect(code).toContain('href "https://example.com"')
    expect(code).toContain('target _blank')
    expect(code).toContain('"Visit site"')
  })

  it('generates textarea with rows', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'Textarea',
          placeholder: 'Enter message...',
          rows: 5,
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('Textarea')
    expect(code).toContain('placeholder "Enter message..."')
    expect(code).toContain('rows 5')
  })

  it('generates slider with min, max, step, value', () => {
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

    const code = intentToMirror(intent)

    expect(code).toContain('Slider')
    expect(code).toContain('min 0')
    expect(code).toContain('max 100')
    expect(code).toContain('step 5')
    expect(code).toContain('value 50')
  })

  it('generates data binding', () => {
    const intent: Intent = {
      tokens: {},
      components: [],
      layout: [
        {
          component: 'TaskList',
          dataBinding: {
            typeName: 'Tasks',
          },
          children: [
            { component: 'TaskItem', text: '$item.title' },
          ],
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('data Tasks')
    expect(code).toContain('TaskList')
    expect(code).toContain('TaskItem')
  })

  it('generates data binding with filter', () => {
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
              left: { type: 'var', variable: 'done' },
              operator: '==',
              value: false,
            },
          },
        },
      ],
    }

    const code = intentToMirror(intent)

    expect(code).toContain('data Tasks where')
    expect(code).toContain('done == false')
  })
})
