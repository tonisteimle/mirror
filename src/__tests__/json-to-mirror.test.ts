import { describe, it, expect } from 'vitest'
import { jsonToMirror } from '../converter/json-to-mirror'

describe('JSON to Mirror Converter', () => {
  it('converts simple component', () => {
    const json = {
      nodes: [{
        type: 'component' as const,
        name: 'Box',
        id: '1',
        modifiers: [],
        properties: { ver: true, gap: 16 },
        children: []
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe('Box ver gap 16')
  })

  it('converts component with content', () => {
    const json = {
      nodes: [{
        type: 'component' as const,
        name: 'Text',
        id: '1',
        modifiers: [],
        properties: { size: 24, weight: 600 },
        content: 'Hello World',
        children: []
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe('Text size 24 weight 600 "Hello World"')
  })

  it('converts nested components', () => {
    const json = {
      nodes: [{
        type: 'component' as const,
        name: 'Box',
        id: '1',
        modifiers: [],
        properties: { ver: true },
        children: [
          {
            type: 'component' as const,
            name: 'Text',
            id: '2',
            modifiers: [],
            properties: {},
            content: 'Child',
            children: []
          }
        ]
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe(`Box ver
  Text "Child"`)
  })

  it('converts instance names', () => {
    const json = {
      nodes: [{
        type: 'component' as const,
        name: 'Input',
        id: '1',
        modifiers: [],
        instanceName: 'Email',
        properties: { placeholder: 'Enter email' },
        children: []
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe('Input Email: placeholder "Enter email"')
  })

  it('converts event handlers', () => {
    const json = {
      nodes: [{
        type: 'component' as const,
        name: 'Button',
        id: '1',
        modifiers: [],
        properties: { col: '#3B82F6' },
        content: 'Click me',
        children: [],
        eventHandlers: [{
          event: 'onclick',
          actions: [{ type: 'page', target: 'Home' }]
        }]
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe(`Button col #3B82F6 "Click me"
  onclick page Home`)
  })

  it('converts full login form', () => {
    const json = {
      nodes: [{
        type: 'component' as const,
        name: 'Box',
        id: '1',
        modifiers: [],
        properties: { ver: true, gap: 16, pad: 24, col: '#FFFFFF', rad: 8 },
        children: [
          {
            type: 'component' as const,
            name: 'Text',
            id: '2',
            modifiers: [],
            properties: { size: 24, weight: 600 },
            content: 'Login',
            children: []
          },
          {
            type: 'component' as const,
            name: 'Input',
            id: '3',
            modifiers: [],
            instanceName: 'Email',
            properties: { placeholder: 'Email' },
            children: []
          },
          {
            type: 'component' as const,
            name: 'Input',
            id: '4',
            modifiers: [],
            instanceName: 'Password',
            properties: { type: 'password', placeholder: 'Password' },
            children: []
          },
          {
            type: 'component' as const,
            name: 'Button',
            id: '5',
            modifiers: [],
            properties: { col: '#3B82F6' },
            content: 'Sign In',
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
    expect(result).toBe(`Box ver gap 16 pad 24 col #FFFFFF rad 8
  Text size 24 weight 600 "Login"
  Input Email: placeholder "Email"
  Input Password: type "password" placeholder "Password"
  Button col #3B82F6 "Sign In"
    onclick page Dashboard`)
  })

  it('converts overlay actions', () => {
    const json = {
      nodes: [{
        type: 'component' as const,
        name: 'Button',
        id: '1',
        modifiers: [],
        properties: {},
        content: 'Open Modal',
        children: [],
        eventHandlers: [{
          event: 'onclick',
          actions: [{
            type: 'open',
            target: 'Dialog',
            position: 'center',
            animation: 'fade',
            duration: 200
          }]
        }]
      }]
    }

    const result = jsonToMirror(json)
    expect(result).toBe(`Button "Open Modal"
  onclick open Dialog center fade 200`)
  })
})
