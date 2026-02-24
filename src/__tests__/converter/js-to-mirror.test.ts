/**
 * JS Builder → Mirror DSL Transformer Tests
 *
 * Tests the deterministic transformation from JS Builder API output to Mirror DSL.
 */

import { describe, it, expect } from 'vitest'
import { jsToMirror } from '../../converter/js-to-mirror'
import type { JsNode, JsDefinition, JsToken, JsAction, JsState } from '../../converter/js-builder'

describe('jsToMirror', () => {
  describe('Basic Components', () => {
    it('transforms simple component', () => {
      const node: JsNode = {
        name: 'Box',
        props: {},
        children: []
      }

      const result = jsToMirror(node)
      expect(result).toBe('Box')
    })

    it('transforms component with properties', () => {
      const node: JsNode = {
        name: 'Button',
        props: { bg: '#3B82F6', pad: 12, rad: 8 },
        children: []
      }

      const result = jsToMirror(node)
      expect(result).toContain('Button')
      expect(result).toContain('bg #3B82F6')
      expect(result).toContain('pad 12')
      expect(result).toContain('rad 8')
    })

    it('transforms component with content', () => {
      const node: JsNode = {
        name: 'Button',
        props: {},
        content: 'Click me',
        children: []
      }

      const result = jsToMirror(node)
      expect(result).toContain('"Click me"')
    })

    it('auto-injects hor for Row', () => {
      const node: JsNode = {
        name: 'Row',
        props: { gap: 12 },
        children: []
      }

      const result = jsToMirror(node)
      expect(result).toContain('hor')
    })
  })

  describe('Nested Components', () => {
    it('transforms parent with children', () => {
      const node: JsNode = {
        name: 'Card',
        props: { pad: 16 },
        children: [
          { name: 'Title', props: {}, content: 'Hello', children: [] },
          { name: 'Text', props: {}, content: 'World', children: [] }
        ]
      }

      const result = jsToMirror(node)
      const lines = result.split('\n')

      expect(lines[0]).toContain('Card')
      expect(lines[1]).toMatch(/^\s+Title/)
      expect(lines[2]).toMatch(/^\s+Text/)
    })

    it('maintains proper indentation', () => {
      const node: JsNode = {
        name: 'Box',
        props: {},
        children: [{
          name: 'Row',
          props: {},
          children: [{
            name: 'Button',
            props: {},
            content: 'OK',
            children: []
          }]
        }]
      }

      const result = jsToMirror(node)
      const lines = result.split('\n')

      expect(lines[0]).toBe('Box')
      expect(lines[1]).toMatch(/^  Row/)
      expect(lines[2]).toMatch(/^    Button/)
    })
  })

  describe('Definitions', () => {
    it('transforms component definition', () => {
      const def: JsDefinition = {
        _type: 'definition',
        name: 'PrimaryButton',
        props: { bg: '#3B82F6', pad: 12 },
        children: []
      }

      const result = jsToMirror(def)
      expect(result).toContain('PrimaryButton:')
      expect(result).toContain('bg #3B82F6')
    })

    it('transforms definition with inheritance', () => {
      const def: JsDefinition = {
        _type: 'definition',
        name: 'DangerButton',
        extends: 'Button',
        props: { bg: '#EF4444' },
        children: []
      }

      const result = jsToMirror(def)
      expect(result).toContain('DangerButton:')
      expect(result).toContain('Button')
    })
  })

  describe('Tokens', () => {
    it('transforms token definition', () => {
      const token: JsToken = {
        _type: 'token',
        name: 'primary',
        value: '#3B82F6'
      }

      const result = jsToMirror([token])
      expect(result).toContain('$primary')
      expect(result).toContain('#3B82F6')
    })

    it('transforms multiple tokens', () => {
      const tokens: JsToken[] = [
        { _type: 'token', name: 'primary', value: '#3B82F6' },
        { _type: 'token', name: 'spacing', value: 16 }
      ]

      const result = jsToMirror(tokens)
      expect(result).toContain('$primary')
      expect(result).toContain('$spacing')
    })
  })

  describe('States', () => {
    it('transforms hover state', () => {
      // States must be in props.states, not node.states
      const node: JsNode = {
        name: 'Button',
        props: {
          bg: '#333',
          states: [{
            _type: 'state',
            name: 'hover',
            props: { bg: '#444' }
          }]
        },
        children: []
      }

      const result = jsToMirror(node)
      expect(result).toContain('state hover')
      expect(result).toContain('bg #444')
    })

    it('transforms behavior states', () => {
      const node: JsNode = {
        name: 'Tab',
        props: {
          states: [
            { _type: 'state', name: 'active', props: { bg: '#3B82F6' } },
            { _type: 'state', name: 'inactive', props: { bg: 'transparent' } }
          ]
        },
        children: []
      }

      const result = jsToMirror(node)
      expect(result).toContain('state active')
      expect(result).toContain('state inactive')
    })
  })

  describe('Events', () => {
    it('transforms onclick event', () => {
      // Events are passed as props with JsAction values
      const node: JsNode = {
        name: 'Button',
        props: {
          onclick: { _type: 'action', action: 'toggle', target: 'Panel' }
        },
        children: []
      }

      const result = jsToMirror(node)
      expect(result).toContain('onclick')
      expect(result).toContain('toggle Panel')
    })

    it('transforms show/hide actions', () => {
      const node: JsNode = {
        name: 'Button',
        props: {
          onclick: { _type: 'action', action: 'show', target: 'Modal' }
        },
        children: []
      }

      const result = jsToMirror(node)
      expect(result).toContain('onclick')
      expect(result).toContain('show Modal')
    })
  })
})
