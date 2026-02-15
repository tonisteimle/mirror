/**
 * JSON Lexer Tests
 *
 * Unit tests for parseJsonArray() function.
 * Tests JSON array parsing for data token values.
 */
import { describe, it, expect } from 'vitest'
import { parseJsonArray } from '../../../parser/lexer/json-lexer'
import { tokenize } from '../../../parser/lexer'

describe('json-lexer', () => {
  // ==========================================================================
  // parseJsonArray - Direct Unit Tests
  // ==========================================================================
  describe('parseJsonArray', () => {
    describe('single-line arrays', () => {
      it('parses empty array', () => {
        const result = parseJsonArray('[]', 0, 0, ['[]'])
        expect(result.token.type).toBe('JSON_VALUE')
        expect(result.token.value).toBe('[]')
      })

      it('parses array with numbers', () => {
        const result = parseJsonArray('[1, 2, 3]', 0, 0, ['[1, 2, 3]'])
        expect(result.token.value).toBe('[1, 2, 3]')
      })

      it('parses array with strings', () => {
        const result = parseJsonArray('["a", "b", "c"]', 0, 0, ['["a", "b", "c"]'])
        expect(result.token.value).toBe('["a", "b", "c"]')
      })

      it('parses array with objects', () => {
        const json = '[{ "name": "John" }, { "name": "Jane" }]'
        const result = parseJsonArray(json, 0, 0, [json])
        expect(result.token.value).toBe(json)
      })

      it('parses nested arrays', () => {
        const json = '[[1, 2], [3, 4], [5, 6]]'
        const result = parseJsonArray(json, 0, 0, [json])
        expect(result.token.value).toBe(json)
      })
    })

    describe('multiline arrays', () => {
      it('parses two-line array', () => {
        const lines = [
          '[{ "title": "Task 1" },',
          '{ "title": "Task 2" }]'
        ]
        const result = parseJsonArray(lines[0], 0, 0, lines)
        expect(result.token.value).toContain('Task 1')
        expect(result.token.value).toContain('Task 2')
        expect(result.newLineNum).toBe(1)
      })

      it('parses three-line array', () => {
        const lines = [
          '[',
          '  { "title": "Task 1" },',
          '  { "title": "Task 2" }',
          ']'
        ]
        const result = parseJsonArray(lines[0], 0, 0, lines)
        expect(result.newLineNum).toBe(3)
      })

      it('preserves line breaks in value', () => {
        const lines = ['[1,', '2,', '3]']
        const result = parseJsonArray(lines[0], 0, 0, lines)
        expect(result.token.value).toContain('\n')
      })

      it('handles indented continuation lines', () => {
        const lines = [
          '$tasks: [',
          '  { "title": "A" },',
          '  { "title": "B" }',
          ']'
        ]
        // Extract just the array part
        const arrayStart = lines[0].indexOf('[')
        const arrayContent = lines[0].slice(arrayStart)
        const result = parseJsonArray(arrayContent, 0, arrayStart, lines)
        expect(result.token.value).toContain('{ "title": "A" }')
      })
    })

    describe('bracket counting', () => {
      it('handles nested brackets correctly', () => {
        const json = '[[[1]]]'
        const result = parseJsonArray(json, 0, 0, [json])
        expect(result.token.value).toBe('[[[1]]]')
      })

      it('handles unbalanced nested arrays across lines', () => {
        const lines = ['[[1, 2],', '[3, 4]]']
        const result = parseJsonArray(lines[0], 0, 0, lines)
        expect(result.newLineNum).toBe(1)
      })

      it('does not count brackets inside strings', () => {
        const json = '["[not a bracket]"]'
        const result = parseJsonArray(json, 0, 0, [json])
        expect(result.token.value).toBe('["[not a bracket]"]')
      })

      it('handles brackets in string values across lines', () => {
        const lines = [
          '[{ "text": "[bracket" },',
          '{ "text": "bracket]" }]'
        ]
        const result = parseJsonArray(lines[0], 0, 0, lines)
        expect(result.newLineNum).toBe(1)
      })
    })

    describe('string handling', () => {
      it('handles escaped quotes in strings', () => {
        const json = '["He said \\"hello\\""]'
        const result = parseJsonArray(json, 0, 0, [json])
        expect(result.token.value).toBe(json)
      })

      it('handles backslash before quote', () => {
        const json = '["path\\\\name"]'
        const result = parseJsonArray(json, 0, 0, [json])
        expect(result.token.value).toBe(json)
      })

      it('tracks string state correctly across objects', () => {
        const json = '[{ "a": "1" }, { "b": "2" }]'
        const result = parseJsonArray(json, 0, 0, [json])
        expect(result.token.value).toBe(json)
      })
    })

    describe('position tracking', () => {
      it('records correct line number', () => {
        const result = parseJsonArray('[1]', 5, 10, ['prefix [1]'])
        expect(result.token.line).toBe(5)
      })

      it('records correct column', () => {
        const result = parseJsonArray('[1]', 5, 10, ['prefix [1]'])
        expect(result.token.column).toBe(10)
      })

      it('returns newLineNum for single-line array', () => {
        const result = parseJsonArray('[1, 2, 3]', 0, 0, ['[1, 2, 3]'])
        expect(result.newLineNum).toBe(0) // newLineNum is last line index
      })
    })

    describe('complex data structures', () => {
      it('parses task list structure', () => {
        const lines = [
          '[{ "title": "Task 1", "done": true },',
          '{ "title": "Task 2", "done": false }]'
        ]
        const result = parseJsonArray(lines[0], 0, 0, lines)
        expect(result.token.value).toContain('"done": true')
        expect(result.token.value).toContain('"done": false')
      })

      it('parses menu items structure', () => {
        const lines = [
          '[',
          '  { "id": 1, "label": "Home", "icon": "home" },',
          '  { "id": 2, "label": "Settings", "icon": "settings" }',
          ']'
        ]
        const result = parseJsonArray(lines[0], 0, 0, lines)
        expect(result.token.value).toContain('"icon": "home"')
        expect(result.token.value).toContain('"icon": "settings"')
      })

      it('parses deeply nested structure', () => {
        const json = '[{ "items": [{ "sub": [1, 2] }] }]'
        const result = parseJsonArray(json, 0, 0, [json])
        expect(result.token.value).toBe(json)
      })
    })
  })

  // ==========================================================================
  // Integration Tests via tokenize()
  // ==========================================================================
  describe('integration with tokenize', () => {
    describe('token variable definitions with arrays', () => {
      it('tokenizes simple array definition', () => {
        const tokens = tokenize('$items: [1, 2, 3]')
        const tokenDef = tokens.find(t => t.type === 'TOKEN_VAR_DEF')
        const jsonValue = tokens.find(t => t.type === 'JSON_VALUE')
        expect(tokenDef!.value).toBe('items')
        expect(jsonValue!.value).toBe('[1, 2, 3]')
      })

      it('tokenizes object array definition', () => {
        const tokens = tokenize('$tasks: [{ "title": "Task" }]')
        const jsonValue = tokens.find(t => t.type === 'JSON_VALUE')
        expect(jsonValue!.value).toContain('"title": "Task"')
      })

      it('tokenizes multiline array definition', () => {
        const code = `$tasks: [
  { "title": "Task 1" },
  { "title": "Task 2" }
]`
        const tokens = tokenize(code)
        const tokenDef = tokens.find(t => t.type === 'TOKEN_VAR_DEF')
        const jsonValue = tokens.find(t => t.type === 'JSON_VALUE')
        expect(tokenDef!.value).toBe('tasks')
        expect(jsonValue!.value).toContain('Task 1')
        expect(jsonValue!.value).toContain('Task 2')
      })

      it('continues parsing after multiline array', () => {
        const code = `$tasks: [
  { "title": "Task" }
]
Button "Click"`
        const tokens = tokenize(code)
        const buttonToken = tokens.find(t => t.type === 'COMPONENT_NAME' && t.value === 'Button')
        const stringToken = tokens.find(t => t.type === 'STRING')
        expect(buttonToken).toBeDefined()
        expect(stringToken!.value).toBe('Click')
      })
    })

    describe('multiple array definitions', () => {
      it('tokenizes multiple arrays in file', () => {
        const code = `$list1: [1, 2, 3]
$list2: ["a", "b", "c"]`
        const tokens = tokenize(code)
        const jsonValues = tokens.filter(t => t.type === 'JSON_VALUE')
        expect(jsonValues).toHaveLength(2)
        expect(jsonValues[0].value).toBe('[1, 2, 3]')
        expect(jsonValues[1].value).toBe('["a", "b", "c"]')
      })
    })

    describe('edge cases', () => {
      it('handles empty array', () => {
        const tokens = tokenize('$empty: []')
        const jsonValue = tokens.find(t => t.type === 'JSON_VALUE')
        expect(jsonValue!.value).toBe('[]')
      })

      it('handles array with trailing comma content', () => {
        const code = `$items: [
  1,
  2,
]`
        const tokens = tokenize(code)
        const jsonValue = tokens.find(t => t.type === 'JSON_VALUE')
        // Note: Lexer doesn't validate JSON, just collects balanced brackets
        expect(jsonValue).toBeDefined()
      })
    })
  })
})
