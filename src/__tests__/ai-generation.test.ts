/**
 * Comprehensive AI Generation Tests
 *
 * Tests the full AI generation pipeline:
 * 1. LLM output validation (Zod schema)
 * 2. JSON-to-Mirror conversion
 * 3. API response parsing
 * 4. Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { jsonToMirror } from '../converter/json-to-mirror'
import { validateLLMOutput, safeParseLLMOutput } from '../schemas/llm-output'
import { parse } from '../parser/parser'

// ============================================================================
// LLM Output Validation Tests
// ============================================================================

describe('LLM Output Validation', () => {
  it('validates simple node structure', () => {
    const input = {
      nodes: [{
        type: 'component',
        name: 'Box',
        properties: { ver: true },
        children: []
      }]
    }

    const result = validateLLMOutput(input)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].name).toBe('Box')
  })

  it('validates nested nodes', () => {
    const input = {
      nodes: [{
        type: 'component',
        name: 'Card',
        properties: { pad: 16 },
        children: [{
          type: 'component',
          name: 'Title',
          properties: { size: 18 },
          content: 'Hello',
          children: []
        }]
      }]
    }

    const result = validateLLMOutput(input)
    expect(result.nodes[0].children).toHaveLength(1)
  })

  it('provides defaults for missing optional fields', () => {
    const input = {
      nodes: [{
        name: 'Box'
      }]
    }

    const result = validateLLMOutput(input)
    expect(result.nodes[0].type).toBe('component')
    expect(result.nodes[0].properties).toEqual({})
    expect(result.nodes[0].children).toEqual([])
  })

  it('rejects empty nodes array', () => {
    const input = { nodes: [] }
    expect(() => validateLLMOutput(input)).toThrow()
  })

  it('rejects missing name', () => {
    const input = {
      nodes: [{
        type: 'component',
        properties: {}
      }]
    }
    expect(() => validateLLMOutput(input)).toThrow()
  })

  it('safeParseLLMOutput returns null on failure', () => {
    const invalid = { nodes: [] }
    expect(safeParseLLMOutput(invalid)).toBeNull()

    const valid = { nodes: [{ name: 'Box' }] }
    expect(safeParseLLMOutput(valid)).not.toBeNull()
  })
})

// ============================================================================
// JSON to Mirror Conversion Tests - Advanced Scenarios
// ============================================================================

describe('JSON to Mirror Conversion - Advanced', () => {
  it('converts dashboard with multiple sections', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'Dashboard',
        properties: { ver: true, gap: 24, pad: 24, col: '#0f0f14' },
        children: [
          {
            type: 'component',
            name: 'Header',
            properties: { hor: true, between: true },
            children: [
              {
                type: 'component',
                name: 'Logo',
                properties: { size: 20, weight: 700, col: '#FFFFFF' },
                content: 'Dashboard',
                children: []
              },
              {
                type: 'component',
                name: 'Nav',
                properties: { hor: true, gap: 16 },
                children: []
              }
            ]
          },
          {
            type: 'component',
            name: 'Content',
            properties: { hor: true, wrap: true, gap: 16 },
            children: [
              {
                type: 'component',
                name: 'Card',
                properties: { ver: true, pad: 20, col: '#1a1a23', rad: 12 },
                children: [
                  {
                    type: 'component',
                    name: 'Value',
                    properties: { size: 28, weight: 700, col: '#FFFFFF' },
                    content: '2.7 Mio',
                    children: []
                  },
                  {
                    type: 'component',
                    name: 'Label',
                    properties: { size: 12, col: '#888888' },
                    content: 'Revenue',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }]
    }

    const result = jsonToMirror(json)

    // Verify structure
    expect(result).toContain('Dashboard ver gap 24 pad 24 col #0f0f14')
    expect(result).toContain('Header hor between')
    expect(result).toContain('Logo size 20 weight 700 col #FFFFFF "Dashboard"')
    expect(result).toContain('Card ver pad 20 col #1a1a23 rad 12')
    expect(result).toContain('Value size 28 weight 700 col #FFFFFF "2.7 Mio"')
  })

  it('converts form with inputs', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'Form',
        properties: { ver: true, gap: 16, pad: 24, col: '#1E1E1E', rad: 12 },
        children: [
          {
            type: 'component',
            name: 'Input',
            instanceName: 'Username',
            properties: { placeholder: 'Username', w: 'full' },
            children: []
          },
          {
            type: 'component',
            name: 'Input',
            instanceName: 'Password',
            properties: { placeholder: 'Password', type: 'password' },
            children: []
          },
          {
            type: 'component',
            name: 'Button',
            properties: { col: '#3B82F6', pad: 12, rad: 8 },
            content: 'Login',
            children: [],
            eventHandlers: [{
              event: 'onclick',
              actions: [{ type: 'page', target: 'Dashboard' }]
            }]
          }
        ]
      }]
    }

    const result = jsonToMirror(json)

    expect(result).toContain('Input Username: placeholder "Username"')
    expect(result).toContain('Input Password: placeholder "Password" type "password"')
    expect(result).toContain('Button col #3B82F6 pad 12 rad 8 "Login"')
    expect(result).toContain('onclick page Dashboard')
  })

  it('converts icons correctly', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'IconButton',
        properties: { hor: true, gap: 8, icon: 'search' },
        content: 'Search',
        children: []
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe('IconButton hor gap 8 icon "search" "Search"')
  })

  it('converts padding shortcuts', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'Box',
        properties: { 'pad-x': 16, 'pad-y': 8 },
        children: []
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe('Box pad l-r 16 pad u-d 8')
  })

  it('converts CSS property names to Mirror names', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'Box',
        properties: {
          padding: 16,
          'border-radius': 8,
          'font-size': 14,
          'font-weight': 600
        },
        children: []
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toContain('pad 16')
    expect(result).toContain('rad 8')
    expect(result).toContain('size 14')
    expect(result).toContain('weight 600')
  })
})

// ============================================================================
// End-to-End: Generated Code Parses Correctly
// ============================================================================

describe('Generated Code Parses Correctly', () => {
  it('dashboard parses without errors', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'Dashboard',
        properties: { ver: true, gap: 24, col: '#111111' },
        children: [
          {
            type: 'component',
            name: 'Header',
            properties: { hor: true },
            content: 'My App',
            children: []
          },
          {
            type: 'component',
            name: 'Content',
            properties: { ver: true, grow: true },
            children: []
          }
        ]
      }]
    }

    const mirrorCode = jsonToMirror(json)
    const parseResult = parse(mirrorCode)

    // Filter out warnings
    const errors = parseResult.errors.filter(e => !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
    expect(parseResult.nodes).toHaveLength(1)
    expect(parseResult.nodes[0].name).toBe('Dashboard')
  })

  it('form with events parses without errors', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'LoginForm',
        properties: { ver: true, gap: 16, pad: 24 },
        children: [
          {
            type: 'component',
            name: 'Title',
            properties: { size: 24 },
            content: 'Login',
            children: []
          },
          {
            type: 'component',
            name: 'Button',
            properties: { col: '#3B82F6' },
            content: 'Submit',
            children: [],
            eventHandlers: [{
              event: 'onclick',
              actions: [{ type: 'page', target: 'Home' }]
            }]
          }
        ]
      }]
    }

    const mirrorCode = jsonToMirror(json)
    const parseResult = parse(mirrorCode)

    const errors = parseResult.errors.filter(e => !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
  })

  it('complex nested structure parses without errors', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'App',
        properties: { ver: true, h: 'full', col: '#0A0A0A' },
        children: [
          {
            type: 'component',
            name: 'Sidebar',
            properties: { ver: true, w: 240, col: '#111111', pad: 16 },
            children: [
              {
                type: 'component',
                name: 'MenuItem',
                properties: { hor: true, gap: 8, pad: 12, rad: 8, icon: 'home' },
                content: 'Home',
                children: []
              },
              {
                type: 'component',
                name: 'MenuItem',
                properties: { hor: true, gap: 8, pad: 12, rad: 8, icon: 'settings' },
                content: 'Settings',
                children: []
              }
            ]
          },
          {
            type: 'component',
            name: 'Main',
            properties: { grow: true, pad: 24 },
            children: [
              {
                type: 'component',
                name: 'Card',
                properties: { ver: true, pad: 20, col: '#1E1E1E', rad: 12 },
                children: [
                  {
                    type: 'component',
                    name: 'CardTitle',
                    properties: { size: 18, weight: 600, col: '#FFFFFF' },
                    content: 'Welcome',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }]
    }

    const mirrorCode = jsonToMirror(json)
    const parseResult = parse(mirrorCode)

    const errors = parseResult.errors.filter(e => !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
    expect(parseResult.nodes[0].children).toHaveLength(2)
  })
})

// ============================================================================
// Error Handling
// ============================================================================

describe('Error Handling', () => {
  it('handles malformed JSON gracefully', () => {
    const invalidJSON = '{ nodes: [{ name: "Box" }] }' // Invalid JSON (unquoted keys)

    expect(() => JSON.parse(invalidJSON)).toThrow()
  })

  it('handles empty string content', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'Text',
        properties: {},
        content: '',
        children: []
      }]
    }

    const result = jsonToMirror(json)
    // Empty content should not add quotes
    expect(result).toBe('Text')
  })

  it('escapes special characters in content', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'Text',
        properties: {},
        content: 'Say "Hello"',
        children: []
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe('Text "Say \\"Hello\\""')
  })

  it('handles boolean false values (skipped)', () => {
    const json = {
      nodes: [{
        type: 'component',
        name: 'Box',
        properties: { hidden: false, ver: true },
        children: []
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe('Box ver')
    expect(result).not.toContain('hidden')
  })
})
