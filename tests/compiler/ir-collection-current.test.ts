/**
 * IR Tests: Collection .current
 *
 * Tests that $collection.current compiles correctly to the runtime.
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler'

describe('IR: Collection .current', () => {
  describe('Generated Code', () => {
    it('generates $collection helper function', () => {
      const input = `
Frame
  Text "Hello"
`
      const code = compile(input)
      expect(code).toContain('function $collection(name)')
      expect(code).toContain('__collections')
    })

    it('$get handles .current pattern', () => {
      const input = `
Frame
  Text "Hello"
`
      const code = compile(input)
      expect(code).toContain('currentMatch = name.match')
      expect(code).toContain('$collection(collectionName)')
      expect(code).toContain('coll.current')
    })

    it('compiles $tasks.current in text binding', () => {
      const input = `
Text $tasks.current.title
`
      const code = compile(input)
      // The text should use $get which will resolve .current
      // Use double quotes as the compiler generates them
      expect(code).toContain('$get("tasks.current.title")')
    })

    it('compiles $tasks.current in property binding via expression', () => {
      // Background colors with $ are compiled to $get in expressions
      const input = `
Frame
  Text "Selected: " + $tasks.current.title
`
      const code = compile(input)
      expect(code).toContain('$get("tasks.current.title")')
    })
  })

  describe('Runtime Support', () => {
    it('$collection helper supports current property', () => {
      const input = `
Frame
  Text "Test"
`
      const code = compile(input)
      // The $collection helper should have current getter/setter
      expect(code).toContain('get current()')
      expect(code).toContain('set current(item)')
    })

    it('$collection helper supports CRUD methods', () => {
      const input = `
Frame
  Text "Test"
`
      const code = compile(input)
      // CRUD methods
      expect(code).toContain('add(item)')
      expect(code).toContain('remove(item)')
      expect(code).toContain('update(item, changes)')
    })
  })
})
