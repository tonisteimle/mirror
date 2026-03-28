/**
 * Parser JavaScript Block Tests (Phase 2)
 *
 * Tests parsing of JavaScript code embedded in Mirror files.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'

describe('Parser: JavaScript Detection', () => {
  it('detects let keyword', () => {
    const ast = parse(`
Button as button:
  pad 8

let count = 0
`)
    expect(ast.components.length).toBe(1)
    expect(ast.javascript).toBeDefined()
    expect(ast.javascript?.code).toContain('let count = 0')
  })

  it('detects const keyword', () => {
    const ast = parse(`
primary: #3B82F6

const API_URL = "https://api.example.com"
`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.javascript).toBeDefined()
    expect(ast.javascript?.code).toContain('const API_URL')
  })

  it('detects var keyword', () => {
    const ast = parse(`
Card as frame:

var oldStyle = true
`)
    expect(ast.javascript).toBeDefined()
    expect(ast.javascript?.code).toContain('var oldStyle')
  })

  it('detects function keyword', () => {
    const ast = parse(`
Button named saveBtn "Save"

function handleSave() {
  console.log('saved')
}
`)
    expect(ast.instances.length).toBe(1)
    expect(ast.javascript).toBeDefined()
    expect(ast.javascript?.code).toContain('function handleSave')
  })

  it('detects class keyword', () => {
    const ast = parse(`
App as frame:

class AppController {
  constructor() {}
}
`)
    expect(ast.javascript).toBeDefined()
    expect(ast.javascript?.code).toContain('class AppController')
  })

  it('captures entire JavaScript block', () => {
    const ast = parse(`
Button as button:
  pad 8

let count = 0

function increment() {
  count++
  update()
}

function decrement() {
  count--
  update()
}
`)
    expect(ast.javascript).toBeDefined()
    expect(ast.javascript?.code).toContain('let count = 0')
    expect(ast.javascript?.code).toContain('function increment')
    expect(ast.javascript?.code).toContain('function decrement')
  })

  it('preserves JavaScript formatting', () => {
    const ast = parse(`
Card as frame:

const data = {
  name: "Test",
  value: 42
}
`)
    expect(ast.javascript).toBeDefined()
    expect(ast.javascript?.code).toContain('name: "Test"')
    expect(ast.javascript?.code).toContain('value: 42')
  })
})

describe('Parser: No JavaScript', () => {
  it('returns undefined javascript for pure Mirror', () => {
    const ast = parse(`
primary: #3B82F6

Button as button:
  pad 8, bg primary

Button "Click"
`)
    expect(ast.javascript).toBeUndefined()
  })
})

describe('Parser: JavaScript with Full Mirror', () => {
  it('parses complete Mirror + JS file', () => {
    const ast = parse(`
// Tokens
primary: #3B82F6
surface: #1a1a23

// Components
Text as text:
  col #E4E4E7

Counter as frame:
  pad 16, gap 8, center, bg surface
  Text count

Counter

// JavaScript
let count = 0

function increment() {
  count++
  update()
}
`)
    expect(ast.tokens.length).toBe(2)
    expect(ast.components.length).toBe(2)
    expect(ast.instances.length).toBe(1)
    expect(ast.javascript).toBeDefined()
    expect(ast.javascript?.code).toContain('let count = 0')
    expect(ast.javascript?.code).toContain('function increment')
  })
})
