/**
 * Error-Tolerant Parsing Tests
 *
 * Tests that invalid tokens (typos, etc.) are properly detected
 * at the lexer level and collected as parseIssues.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { tokenize } from '../../parser/lexer'

describe('Error-Tolerant Parsing', () => {
  describe('Lexer Heuristics', () => {
    it('detects unknown events (onclck -> onclick)', () => {
      const tokens = tokenize('Button onclck toggle "Click"')
      const unknownEvent = tokens.find(t => t.type === 'UNKNOWN_EVENT')

      expect(unknownEvent).toBeDefined()
      expect(unknownEvent?.value).toBe('onclck')
    })

    it('detects unknown events (onhovr -> onhover)', () => {
      const tokens = tokenize('Box onhovr show Tooltip')
      const unknownEvent = tokens.find(t => t.type === 'UNKNOWN_EVENT')

      expect(unknownEvent).toBeDefined()
      expect(unknownEvent?.value).toBe('onhovr')
    })

    it('detects unknown events (onchng -> onchange)', () => {
      const tokens = tokenize('Input onchng assign $val to $event.value')
      const unknownEvent = tokens.find(t => t.type === 'UNKNOWN_EVENT')

      expect(unknownEvent).toBeDefined()
      expect(unknownEvent?.value).toBe('onchng')
    })

    it('detects unknown properties (paddin -> pad)', () => {
      const tokens = tokenize('Box paddin 16')
      const unknownProp = tokens.find(t => t.type === 'UNKNOWN_PROPERTY')

      expect(unknownProp).toBeDefined()
      expect(unknownProp?.value).toBe('paddin')
    })

    it('detects unknown properties (colr -> col)', () => {
      const tokens = tokenize('Text colr #FFF')
      const unknownProp = tokens.find(t => t.type === 'UNKNOWN_PROPERTY')

      expect(unknownProp).toBeDefined()
      expect(unknownProp?.value).toBe('colr')
    })

    it('detects unknown properties (radus -> rad)', () => {
      const tokens = tokenize('Card radus 8')
      const unknownProp = tokens.find(t => t.type === 'UNKNOWN_PROPERTY')

      expect(unknownProp).toBeDefined()
      expect(unknownProp?.value).toBe('radus')
    })

    it('detects unknown animations (slideup -> slide-up)', () => {
      const tokens = tokenize('Panel show slideup 300')
      const unknownAnim = tokens.find(t => t.type === 'UNKNOWN_ANIMATION')

      expect(unknownAnim).toBeDefined()
      expect(unknownAnim?.value).toBe('slideup')
    })

    it('detects unknown animations (fde -> fade)', () => {
      const tokens = tokenize('Dialog show fde 200')
      const unknownAnim = tokens.find(t => t.type === 'UNKNOWN_ANIMATION')

      expect(unknownAnim).toBeDefined()
      expect(unknownAnim?.value).toBe('fde')
    })

    it('does not flag valid events', () => {
      const tokens = tokenize('Button onclick toggle "Click"')
      const unknownEvent = tokens.find(t => t.type === 'UNKNOWN_EVENT')

      expect(unknownEvent).toBeUndefined()

      const validEvent = tokens.find(t => t.type === 'EVENT')
      expect(validEvent).toBeDefined()
      expect(validEvent?.value).toBe('onclick')
    })

    it('does not flag valid properties', () => {
      const tokens = tokenize('Box pad 16 bg #333')
      const unknownProp = tokens.find(t => t.type === 'UNKNOWN_PROPERTY')

      expect(unknownProp).toBeUndefined()

      const validProps = tokens.filter(t => t.type === 'PROPERTY')
      expect(validProps.length).toBe(2)
    })

    it('does not flag valid animations', () => {
      const tokens = tokenize('Panel show fade 300')
      const unknownAnim = tokens.find(t => t.type === 'UNKNOWN_ANIMATION')

      expect(unknownAnim).toBeUndefined()

      const validAnim = tokens.find(t => t.type === 'ANIMATION')
      expect(validAnim).toBeDefined()
      expect(validAnim?.value).toBe('fade')
    })
  })

  describe('Parser Issue Collection', () => {
    it('collects unknown event issues with suggestions', () => {
      const result = parse('Button onclck toggle "Click"')

      expect(result.parseIssues.length).toBeGreaterThan(0)

      const eventIssue = result.parseIssues.find(i => i.type === 'unknown_event')
      expect(eventIssue).toBeDefined()
      expect(eventIssue?.value).toBe('onclck')
      expect(eventIssue?.suggestion).toContain('onclick')
    })

    it('collects unknown property issues with suggestions', () => {
      const result = parse('Box paddin 16 colr #FFF')

      const propIssues = result.parseIssues.filter(i => i.type === 'unknown_property')
      expect(propIssues.length).toBe(2)

      const padIssue = propIssues.find(i => i.value === 'paddin')
      expect(padIssue?.suggestion).toContain('pad')

      const colIssue = propIssues.find(i => i.value === 'colr')
      expect(colIssue?.suggestion).toContain('col')
    })

    it('collects unknown animation issues with suggestions', () => {
      const result = parse('Panel show slideup 300')

      const animIssue = result.parseIssues.find(i => i.type === 'unknown_animation')
      expect(animIssue).toBeDefined()
      expect(animIssue?.value).toBe('slideup')
      expect(animIssue?.suggestion).toContain('slide-up')
    })

    it('collects multiple issue types in one parse', () => {
      const result = parse(`
Box paddin 16
  Button onclck open Panel slideup 200 "Click"
`)

      expect(result.parseIssues.length).toBeGreaterThanOrEqual(3)

      const types = result.parseIssues.map(i => i.type)
      expect(types).toContain('unknown_property')
      expect(types).toContain('unknown_event')
      expect(types).toContain('unknown_animation')
    })

    it('includes correct line and column information', () => {
      const code = `Box pad 16
  Text colr #FFF "Hello"`
      const result = parse(code)

      const colrIssue = result.parseIssues.find(i => i.value === 'colr')
      expect(colrIssue).toBeDefined()
      expect(colrIssue?.line).toBe(1) // 0-indexed, second line
    })

    it('has no issues for valid code', () => {
      const result = parse(`
Box pad 16 bg #333 rad 8
  Text col white size 14 "Hello"
  Button onclick toggle "Click"
    show fade 200
`)

      expect(result.parseIssues).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('does not flag component names as unknown properties', () => {
      const result = parse('MyButton pad 16')

      // MyButton should not be flagged as unknown property
      const propIssues = result.parseIssues.filter(i => i.type === 'unknown_property')
      expect(propIssues).toHaveLength(0)
    })

    it('does not flag control keywords as unknown', () => {
      const result = parse(`
if $active
  Box bg #333
else
  Box bg #666
`)

      expect(result.parseIssues).toHaveLength(0)
    })

    it('handles similar but different valid words', () => {
      // 'open' is a valid action, not a typo for something
      const result = parse('Button onclick open Panel')
      const issues = result.parseIssues.filter(i => i.value === 'open')
      expect(issues).toHaveLength(0)
    })

    it('detects unsupported event patterns', () => {
      // onmouseover is not supported in Mirror DSL
      const tokens = tokenize('Box onmouseover show Tooltip')
      const unknownEvent = tokens.find(t => t.type === 'UNKNOWN_EVENT')

      expect(unknownEvent).toBeDefined()
      expect(unknownEvent?.value).toBe('onmouseover')
    })
  })
})
