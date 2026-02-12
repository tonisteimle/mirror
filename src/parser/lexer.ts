import {
  PROPERTIES,
  KEYWORDS,
  DIRECTIONS,
  isDirectionOrCombo,
  CONTROL_KEYWORDS,
  EVENT_KEYWORDS,
  STATE_KEYWORD,
  EVENTS_KEYWORD,
  BORDER_STYLES,
  ANIMATION_KEYWORDS,
  ANIMATION_ACTION_KEYWORDS
} from '../dsl/properties'

export type TokenType =
  | 'COMPONENT_NAME'  // button, card, header
  | 'COMPONENT_DEF'   // Button: at start of line (component/style definition)
  | 'MULTIPLE_DEF'    // Item*: in definition (repeatable element)
  | 'LIST_ITEM'       // - at start of line (new instance)
  | 'PROPERTY'        // h, w, pad, gap, hor, ver, col
  | 'DIRECTION'       // l, r, u, d or combos like l-r, u-d
  | 'NUMBER'          // 48, 200
  | 'STRING'          // "Label"
  | 'COLOR'           // #3B82F6
  | 'TOKEN_REF'       // $primary, $dark, $user.avatar (token/variable reference)
  | 'TOKEN_DEF'       // :name (inline token definition)
  | 'TOKEN_VAR_DEF'   // $primary: at start of line (token variable definition)
  | 'SELECTOR'        // :id at start of line (element selector)
  | 'KEYWORD'         // after, before, from (insertion keywords)
  | 'BORDER_STYLE'    // solid, dashed, dotted (for compound border)
  | 'PAREN_OPEN'      // (
  | 'PAREN_CLOSE'     // )
  | 'BRACKET_OPEN'    // [
  | 'BRACKET_CLOSE'   // ]
  | 'BRACE_OPEN'      // {
  | 'BRACE_CLOSE'     // }
  | 'COLON'           // : (in object literals)
  | 'COMMA'           // , (optional separator between properties)
  | 'NEWLINE'
  | 'INDENT'
  | 'ERROR'           // Lexer error (e.g., unterminated string)
  | 'EOF'
  // New token types for actions/states
  | 'EVENT'           // onclick, onhover, etc.
  | 'STATE'           // state keyword
  | 'EVENTS'          // events keyword (for centralized event block)
  | 'CONTROL'         // if, not, and, or, else, each, in
  | 'ANIMATION'       // slide-up, slide-down, fade, scale, spin, pulse, bounce
  | 'ANIMATION_ACTION' // show, hide, animate
  | 'ASSIGNMENT'      // =
  | 'OPERATOR'        // ==, !=, >, <, >=, <=
  | 'ARITHMETIC'      // +, -, *, /
  | 'JSON_VALUE'      // Complete JSON array/object value for data tokens

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  const lines = input.split('\n')

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]

    // Handle indentation
    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0

    if (indent > 0) {
      tokens.push({
        type: 'INDENT',
        value: String(indent),
        line: lineNum,
        column: 0
      })
    }

    let column = indent
    const content = line.slice(indent)

    if (content.trim() === '') {
      continue
    }

    // Skip comment lines: // comment
    if (content.trimStart().startsWith('//')) {
      continue
    }

    // Check for list item at start of line: - Item "value"
    const listItemMatch = content.match(/^-\s+/)
    if (listItemMatch) {
      tokens.push({ type: 'LIST_ITEM', value: '-', line: lineNum, column })
      column += listItemMatch[0].length
    }

    // Check for selector at start of line: :id
    const selectorMatch = content.match(/^:([a-zA-Z_][a-zA-Z0-9_]*)\s*/)
    if (selectorMatch) {
      tokens.push({ type: 'SELECTOR', value: selectorMatch[1], line: lineNum, column })
      column += selectorMatch[0].length
    }

    // Check for token variable definition at start of line: $primary: #3B82F6
    const tokenVarDefMatch = content.match(/^\$([a-zA-Z_][a-zA-Z0-9_-]*):\s*/)
    if (tokenVarDefMatch) {
      tokens.push({ type: 'TOKEN_VAR_DEF', value: tokenVarDefMatch[1], line: lineNum, column })
      column += tokenVarDefMatch[0].length

      // Check if the value starts with [ (JSON array) - collect until matching ]
      const restOfLine = content.slice(tokenVarDefMatch[0].length).trim()
      if (restOfLine.startsWith('[')) {
        // Collect JSON array value, potentially spanning multiple lines
        let jsonValue = restOfLine
        let bracketCount = 0
        let inString = false
        let foundEnd = false

        // Count brackets in current line
        for (const c of restOfLine) {
          if (c === '"' && jsonValue[jsonValue.length - 1] !== '\\') inString = !inString
          if (!inString) {
            if (c === '[') bracketCount++
            if (c === ']') bracketCount--
          }
        }
        foundEnd = bracketCount === 0

        // If not complete, continue to next lines
        let nextLine = lineNum + 1
        while (!foundEnd && nextLine < lines.length) {
          const nextLineContent = lines[nextLine].trim()
          jsonValue += '\n' + nextLineContent
          for (const c of nextLineContent) {
            if (c === '"' && jsonValue[jsonValue.length - 1] !== '\\') inString = !inString
            if (!inString) {
              if (c === '[') bracketCount++
              if (c === ']') bracketCount--
            }
          }
          foundEnd = bracketCount === 0
          nextLine++
        }

        tokens.push({ type: 'JSON_VALUE', value: jsonValue, line: lineNum, column })
        tokens.push({ type: 'NEWLINE', value: '\n', line: nextLine - 1, column: 0 })

        // Skip to the line after the JSON value
        lineNum = nextLine - 1
        continue
      }
    }

    // Check for component definition with inheritance: DangerButton from Button: col #EF4444
    // Also supports hyphenated names like Primary-Button from Button:
    const inheritDefMatch = !selectorMatch && !tokenVarDefMatch && !listItemMatch &&
      content.match(/^([A-Z][a-zA-Z0-9_-]*)\s+from\s+([A-Z][a-zA-Z0-9_-]*):\s*/)
    if (inheritDefMatch) {
      // Emit: COMPONENT_DEF, KEYWORD 'from', COMPONENT_NAME
      tokens.push({
        type: 'COMPONENT_DEF',
        value: inheritDefMatch[1],
        line: lineNum,
        column
      })
      const fromPos = column + inheritDefMatch[1].length + 1 // +1 for space
      tokens.push({
        type: 'KEYWORD',
        value: 'from',
        line: lineNum,
        column: fromPos
      })
      const basePos = fromPos + 5 // 'from '
      tokens.push({
        type: 'COMPONENT_NAME',
        value: inheritDefMatch[2],
        line: lineNum,
        column: basePos
      })
      column += inheritDefMatch[0].length
    }

    // Check for component/style definition at start of line: Button: ... or Item*: (repeatable)
    const componentDefMatch = !inheritDefMatch && !selectorMatch && !tokenVarDefMatch && !listItemMatch && content.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\*)?:\s*/)
    if (componentDefMatch && !PROPERTIES.has(componentDefMatch[1]) && !DIRECTIONS.has(componentDefMatch[1])) {
      const isMultiple = componentDefMatch[2] === '*'
      tokens.push({
        type: isMultiple ? 'MULTIPLE_DEF' : 'COMPONENT_DEF',
        value: componentDefMatch[1],
        line: lineNum,
        column
      })
      column += componentDefMatch[0].length
    }

    // Tokenize the rest of the line
    let pos = listItemMatch ? listItemMatch[0].length :
              (selectorMatch ? selectorMatch[0].length :
              (tokenVarDefMatch ? tokenVarDefMatch[0].length :
              (inheritDefMatch ? inheritDefMatch[0].length :
              (componentDefMatch ? componentDefMatch[0].length : 0))))
    while (pos < content.length) {
      const char = content[pos]

      // Skip whitespace
      if (char === ' ' || char === '\t') {
        pos++
        column++
        continue
      }

      // Inline comment: // rest of line is ignored
      if (char === '/' && content[pos + 1] === '/') {
        break // Skip rest of line
      }

      // Parentheses for style groups
      if (char === '(') {
        tokens.push({ type: 'PAREN_OPEN', value: '(', line: lineNum, column })
        pos++
        column++
        continue
      }

      if (char === ')') {
        tokens.push({ type: 'PAREN_CLOSE', value: ')', line: lineNum, column })
        pos++
        column++

        // Check for inline style definition :name after )
        if (content[pos] === ':' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
          pos++ // skip :
          let styleName = ''
          while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
            styleName += content[pos]
            pos++
          }
          tokens.push({ type: 'TOKEN_DEF', value: styleName, line: lineNum, column })
          column += styleName.length + 1
        }
        continue
      }

      // Comma separator (optional between properties)
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',', line: lineNum, column })
        pos++
        column++
        continue
      }

      // Token reference: $primary, $dark, $user.avatar, $default-pad (with dot notation and hyphens)
      if (char === '$' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
        let value = ''
        pos++ // skip $
        while (pos < content.length && /[a-zA-Z0-9_.\-]/.test(content[pos])) {
          value += content[pos]
          pos++
        }
        // Remove trailing dot or hyphen if any
        while (value.endsWith('.') || value.endsWith('-')) {
          value = value.slice(0, -1)
          pos--
        }
        tokens.push({ type: 'TOKEN_REF', value, line: lineNum, column })
        column += value.length + 1
        continue
      }

      // Arithmetic operators: +, -, *, /
      if (['+', '*', '/'].includes(char)) {
        tokens.push({ type: 'ARITHMETIC', value: char, line: lineNum, column })
        pos++
        column++
        continue
      }

      // Operators: ==, !=, >=, <=, >, <
      if (char === '=' || char === '!' || char === '>' || char === '<') {
        const nextChar = content[pos + 1] || ''

        if (char === '=' && nextChar === '=') {
          tokens.push({ type: 'OPERATOR', value: '==', line: lineNum, column })
          pos += 2
          column += 2
          continue
        }
        if (char === '!' && nextChar === '=') {
          tokens.push({ type: 'OPERATOR', value: '!=', line: lineNum, column })
          pos += 2
          column += 2
          continue
        }
        if (char === '>' && nextChar === '=') {
          tokens.push({ type: 'OPERATOR', value: '>=', line: lineNum, column })
          pos += 2
          column += 2
          continue
        }
        if (char === '<' && nextChar === '=') {
          tokens.push({ type: 'OPERATOR', value: '<=', line: lineNum, column })
          pos += 2
          column += 2
          continue
        }
        if (char === '>') {
          tokens.push({ type: 'OPERATOR', value: '>', line: lineNum, column })
          pos++
          column++
          continue
        }
        if (char === '<') {
          tokens.push({ type: 'OPERATOR', value: '<', line: lineNum, column })
          pos++
          column++
          continue
        }
        // Single = is assignment
        if (char === '=') {
          tokens.push({ type: 'ASSIGNMENT', value: '=', line: lineNum, column })
          pos++
          column++
          continue
        }
      }

      // Arithmetic minus: - followed by space or number (for expressions like $count - 1)
      // Also handle - followed by letter as regular minus (modifiers removed)
      if (char === '-' && (/[0-9\s$]/.test(content[pos + 1] || '') || pos + 1 >= content.length)) {
        tokens.push({ type: 'ARITHMETIC', value: '-', line: lineNum, column })
        pos++
        column++
        continue
      }

      // String: "..."
      if (char === '"') {
        let value = ''
        const startColumn = column
        pos++ // skip opening quote
        while (pos < content.length && content[pos] !== '"') {
          value += content[pos]
          pos++
        }
        if (pos >= content.length) {
          // Unterminated string - reached end of line without closing quote
          tokens.push({ type: 'ERROR', value: `Unterminated string: "${value}`, line: lineNum, column: startColumn })
          column += value.length + 1
        } else {
          pos++ // skip closing quote
          tokens.push({ type: 'STRING', value, line: lineNum, column: startColumn })
          column += value.length + 2
        }
        continue
      }

      // Color: #RRGGBB or #RGB, optionally followed by :tokenName
      if (char === '#') {
        let value = '#'
        pos++
        while (pos < content.length && /[0-9a-fA-F]/.test(content[pos])) {
          value += content[pos]
          pos++
        }
        tokens.push({ type: 'COLOR', value, line: lineNum, column })
        column += value.length

        // Check for inline token definition :name
        if (content[pos] === ':' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
          pos++ // skip :
          let tokenName = ''
          while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
            tokenName += content[pos]
            pos++
          }
          tokens.push({ type: 'TOKEN_DEF', value: tokenName, line: lineNum, column })
          column += tokenName.length + 1
        }
        continue
      }

      // Number (including decimals like 0.5 and percentages like 20%), optionally followed by :tokenName
      if (/[0-9]/.test(char)) {
        let value = ''
        while (pos < content.length && /[0-9]/.test(content[pos])) {
          value += content[pos]
          pos++
        }
        // Handle decimal point
        if (content[pos] === '.' && /[0-9]/.test(content[pos + 1] || '')) {
          value += content[pos] // add the '.'
          pos++
          while (pos < content.length && /[0-9]/.test(content[pos])) {
            value += content[pos]
            pos++
          }
        }
        // Handle percentage suffix
        if (content[pos] === '%') {
          value += content[pos]
          pos++
        }
        tokens.push({ type: 'NUMBER', value, line: lineNum, column })
        column += value.length

        // Check for inline token definition :name
        if (content[pos] === ':' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
          pos++ // skip :
          let tokenName = ''
          while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
            tokenName += content[pos]
            pos++
          }
          tokens.push({ type: 'TOKEN_DEF', value: tokenName, line: lineNum, column })
          column += tokenName.length + 1
        }
        continue
      }

      // Word (property, direction, keyword, or component name)
      if (/[a-zA-Z_]/.test(char)) {
        let value = ''
        while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
          value += content[pos]
          pos++
        }

        // Check for hyphenated properties like hor-cen, ver-cen
        // or hyphenated directions like l-r, u-d, u-d-l-r
        // or animation keywords like slide-up, slide-down
        // or hyphenated component names like Save-Area, Navigation-Area
        while (content[pos] === '-' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
          const restMatch = content.slice(pos + 1).match(/^[a-zA-Z0-9_]+/)
          if (restMatch) {
            const hyphenatedValue = value + '-' + restMatch[0]
            // Check if it's a valid property, direction combo, animation keyword,
            // or a PascalCase component name (starts with uppercase)
            const isPascalCase = /^[A-Z]/.test(value)
            if (PROPERTIES.has(hyphenatedValue) || isDirectionOrCombo(hyphenatedValue) || ANIMATION_KEYWORDS.has(hyphenatedValue) || isPascalCase) {
              value = hyphenatedValue
              pos += 1 + restMatch[0].length // skip hyphen + rest
            } else {
              break
            }
          } else {
            break
          }
        }

        // Check for component property access: ComponentName.property
        // (e.g., Email.value, Submit.disabled)
        // Only for PascalCase component names (start with uppercase)
        if (content[pos] === '.' && /[A-Z]/.test(value[0]) && /[a-zA-Z]/.test(content[pos + 1] || '')) {
          // Include the dot and property name
          value += content[pos] // add '.'
          pos++
          while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
            value += content[pos]
            pos++
          }
        }

        let type: TokenType
        if (PROPERTIES.has(value)) {
          type = 'PROPERTY'
        } else if (isDirectionOrCombo(value)) {
          type = 'DIRECTION'
        } else if (BORDER_STYLES.has(value)) {
          type = 'BORDER_STYLE'
        } else if (KEYWORDS.has(value)) {
          type = 'KEYWORD'
        } else if (value === STATE_KEYWORD) {
          type = 'STATE'
        } else if (value === EVENTS_KEYWORD) {
          type = 'EVENTS'
        } else if (EVENT_KEYWORDS.has(value)) {
          type = 'EVENT'
        } else if (CONTROL_KEYWORDS.has(value)) {
          type = 'CONTROL'
        } else if (ANIMATION_KEYWORDS.has(value)) {
          type = 'ANIMATION'
        } else if (ANIMATION_ACTION_KEYWORDS.has(value)) {
          type = 'ANIMATION_ACTION'
        } else {
          // NOTE: ACTION_KEYWORDS and POSITION_KEYWORDS are now tokenized as COMPONENT_NAME
          // to allow using words like 'toggle', 'page', 'center' as component names.
          // The parser checks for these keywords by value when needed.
          // Check for * suffix (repeatable element marker)
          if (content[pos] === '*') {
            type = 'MULTIPLE_DEF'
            pos++
            column++
          } else if (content[pos] === ':' && /^[A-Z]/.test(value) && content[pos + 1] !== ':') {
            // PascalCase name followed by colon = inline definition (e.g., Input Email:)
            // But not :: which could be something else
            type = 'COMPONENT_DEF'
            pos++ // consume the colon
            column++
          } else {
            type = 'COMPONENT_NAME'
          }
        }
        tokens.push({ type, value, line: lineNum, column })
        column += value.length
        continue
      }

      // Unknown character, skip
      pos++
      column++
    }

    tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum, column })
  }

  tokens.push({ type: 'EOF', value: '', line: lines.length, column: 0 })
  return tokens
}
