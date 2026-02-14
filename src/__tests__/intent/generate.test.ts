/**
 * Intent-basierte Generierung Tests
 */

import { describe, it, expect } from 'vitest'
import { generateWithIntent, createMockLLM } from '../../intent/generate'
import type { Intent } from '../../intent/schema'

describe('generateWithIntent', () => {
  it('completes full flow: Mirror → Intent → LLM → Intent → Mirror', async () => {
    // Aktueller Code
    const layoutCode = `
Box ver gap 16 pad 24 bg #1E1E2E
  Text "Hello"
  Button bg #3B82F6 "Click"
`

    // Mock LLM: macht den Button rot
    const mockLLM = createMockLLM((intent) => {
      // Finde Button im Layout und ändere Farbe
      const modifiedIntent: Intent = JSON.parse(JSON.stringify(intent))

      if (modifiedIntent.layout[0]?.children) {
        const button = modifiedIntent.layout[0].children.find(c => c.component === 'Button')
        if (button) {
          button.style = { ...button.style, background: '#EF4444' }
        }
      }

      return modifiedIntent
    })

    // Generieren
    const result = await generateWithIntent(
      'Mach den Button rot',
      { layoutCode },
      mockLLM
    )

    expect(result.success).toBe(true)
    expect(result.layoutCode).toContain('#EF4444')
    expect(result.layoutCode).toContain('Button')

    console.log('\n=== GENERATE FLOW ===')
    console.log('Input:', layoutCode)
    console.log('Output:', result.layoutCode)
    console.log('=====================\n')
  })

  it('extracts tokens from LLM response', async () => {
    const layoutCode = 'Box bg #333'

    // Mock LLM: fügt Token hinzu
    const mockLLM = createMockLLM((intent) => {
      return {
        tokens: {
          colors: { primary: '#3B82F6', surface: '#1E1E2E' },
          spacing: { 'spacing-md': 16 },
          radii: {},
          sizes: {},
        },
        components: [],
        layout: [
          {
            component: 'Card',
            style: { background: '$surface', padding: '$spacing-md' },
            children: [
              { component: 'Button', text: 'Click', style: { background: '$primary' } }
            ]
          }
        ]
      }
    })

    const result = await generateWithIntent(
      'Erstelle eine Card mit Button',
      { layoutCode },
      mockLLM
    )

    expect(result.success).toBe(true)
    expect(result.tokensCode).toContain('$primary: #3B82F6')
    expect(result.tokensCode).toContain('$surface: #1E1E2E')
    expect(result.layoutCode).toContain('Card')
    expect(result.layoutCode).toContain('$surface')

    console.log('\n=== WITH TOKENS ===')
    console.log('Tokens:', result.tokensCode)
    console.log('Layout:', result.layoutCode)
    console.log('===================\n')
  })

  it('creates component definitions', async () => {
    const layoutCode = 'Box'

    // Mock LLM: erstellt Komponenten-Definitionen
    const mockLLM = createMockLLM(() => ({
      tokens: {
        colors: { primary: '#3B82F6' },
        spacing: {},
        radii: { 'radius-md': 8 },
        sizes: {},
      },
      components: [
        {
          name: 'PrimaryButton',
          style: {
            background: '$primary',
            color: '#FFFFFF',
            padding: [12, 24],
            radius: '$radius-md',
            cursor: 'pointer',
          },
          states: {
            hover: { background: '#2563EB' }
          }
        }
      ],
      layout: [
        { component: 'PrimaryButton', text: 'Submit' }
      ]
    }))

    const result = await generateWithIntent(
      'Erstelle einen Primary Button',
      { layoutCode },
      mockLLM
    )

    expect(result.success).toBe(true)
    expect(result.componentsCode).toContain('PrimaryButton:')
    expect(result.componentsCode).toContain('state hover')
    expect(result.layoutCode).toContain('PrimaryButton "Submit"')

    console.log('\n=== WITH COMPONENTS ===')
    console.log('Tokens:', result.tokensCode)
    console.log('Components:', result.componentsCode)
    console.log('Layout:', result.layoutCode)
    console.log('=======================\n')
  })

  it('handles complex UI generation', async () => {
    const layoutCode = ''

    // Mock LLM: erstellt komplettes Login-Form
    const mockLLM = createMockLLM(() => ({
      tokens: {
        colors: {
          primary: '#3B82F6',
          'primary-dark': '#2563EB',
          surface: '#1E1E2E',
          'surface-light': '#2A2A3E',
          text: '#FFFFFF',
          'text-muted': '#9CA3AF',
        },
        spacing: {
          'spacing-sm': 8,
          'spacing-md': 16,
          'spacing-lg': 24,
          'spacing-xl': 32,
        },
        radii: {
          'radius-sm': 4,
          'radius-md': 8,
          'radius-lg': 12,
        },
        sizes: {
          'text-sm': 12,
          'text-md': 14,
          'text-lg': 18,
          'text-xl': 24,
        },
      },
      components: [
        {
          name: 'Card',
          style: {
            direction: 'vertical',
            padding: '$spacing-lg',
            background: '$surface',
            radius: '$radius-lg',
            gap: '$spacing-md',
          },
        },
        {
          name: 'Input',
          style: {
            padding: [12, 16],
            background: '$surface-light',
            color: '$text',
            radius: '$radius-md',
          },
          states: {
            focus: { borderColor: '$primary' }
          }
        },
        {
          name: 'PrimaryButton',
          style: {
            padding: [12, 24],
            background: '$primary',
            color: '$text',
            radius: '$radius-md',
            cursor: 'pointer',
            fontWeight: 600,
          },
          states: {
            hover: { background: '$primary-dark' }
          }
        },
      ],
      layout: [
        {
          component: 'Card',
          style: { width: 320 },
          children: [
            {
              component: 'Text',
              text: 'Login',
              style: { fontSize: '$text-xl', fontWeight: 600 }
            },
            {
              component: 'Text',
              text: 'Welcome back',
              style: { color: '$text-muted', fontSize: '$text-sm' }
            },
            {
              component: 'Input',
              id: 'EmailInput',
              text: 'Email',
            },
            {
              component: 'Input',
              id: 'PasswordInput',
              text: 'Password',
            },
            {
              component: 'PrimaryButton',
              text: 'Sign In',
              events: {
                onclick: [{ action: 'navigate', target: 'Dashboard' }]
              }
            }
          ]
        }
      ]
    }))

    const result = await generateWithIntent(
      'Erstelle ein Login-Formular mit Email, Password und Submit-Button',
      { layoutCode },
      mockLLM
    )

    expect(result.success).toBe(true)

    console.log('\n========== COMPLETE LOGIN FORM ==========')
    console.log('\n--- TOKENS ---')
    console.log(result.tokensCode)
    console.log('\n--- COMPONENTS ---')
    console.log(result.componentsCode)
    console.log('\n--- LAYOUT ---')
    console.log(result.layoutCode)
    console.log('\n==========================================\n')

    // Verify structure
    expect(result.tokensCode).toContain('$primary')
    expect(result.tokensCode).toContain('$spacing-md')
    expect(result.componentsCode).toContain('Card:')
    expect(result.componentsCode).toContain('PrimaryButton:')
    expect(result.componentsCode).toContain('state hover')
    expect(result.layoutCode).toContain('"Login"')
    expect(result.layoutCode).toContain('"Sign In"')
  })
})
