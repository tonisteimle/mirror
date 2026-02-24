/**
 * React/JSX Parser for Mirror Transformation
 *
 * Parses the constrained React format into the MirrorDocument schema.
 * Uses regex-based parsing for the constrained subset (no need for full AST).
 *
 * For production, consider using @babel/parser with jsx plugin.
 */

import type {
  MirrorDocument,
  TokenDefinition,
  ComponentDefinition,
  ComponentInstance,
  Action,
  StateDefinition,
  EventHandlers,
  MirrorStyles,
  Conditional,
  Iterator,
  DataBinding,
  InlineConditional,
  SlotDefinition,
} from './schema'

// =============================================================================
// MAIN PARSER
// =============================================================================

export function parseReactCode(code: string): MirrorDocument {
  const doc: MirrorDocument = {
    tokens: { palette: [], semantic: [] },
    definitions: [],
    layout: [],
    variables: {},
  }

  // Clean code
  const cleanCode = stripComments(code)

  // Extract tokens
  parseTokens(cleanCode, doc)

  // Extract variables (const $name = value)
  parseVariables(cleanCode, doc)

  // Extract component definitions (mirror() and .extend())
  parseDefinitions(cleanCode, doc)

  // Extract App component (the layout)
  parseAppLayout(cleanCode, doc)

  return doc
}

// =============================================================================
// TOKEN PARSING
// =============================================================================

function parseTokens(code: string, doc: MirrorDocument): void {
  // Match: const $name = 'value' or const $name = value
  const tokenRegex = /const\s+(\$[\w.-]+)\s*=\s*(['"]?)([^'";\n]+)\2/g
  let match

  while ((match = tokenRegex.exec(code)) !== null) {
    const [, name, , value] = match
    const tokenName = name.substring(1) // Remove $

    // Determine if palette or semantic based on naming
    const isPalette = /^[a-z]+-\d+$/.test(tokenName) || /^#[0-9a-fA-F]+$/.test(value)
    const token: TokenDefinition = {
      name: tokenName,
      value: value.startsWith('$') ? { ref: value } : (isNaN(Number(value)) ? value : Number(value))
    }

    if (isPalette) {
      doc.tokens.palette.push(token)
    } else {
      doc.tokens.semantic.push(token)
    }
  }

  // Also parse tokens object
  const tokensObjMatch = code.match(/const\s+tokens\s*=\s*\{([^}]+)\}/)
  if (tokensObjMatch) {
    const tokensContent = tokensObjMatch[1]
    const tokenPairRegex = /['"]?(\$[\w.-]+)['"]?\s*:\s*(['"]?)([^'",$]+)\2/g
    let pairMatch

    while ((pairMatch = tokenPairRegex.exec(tokensContent)) !== null) {
      const [, name, , value] = pairMatch
      const tokenName = name.substring(1)
      const token: TokenDefinition = {
        name: tokenName,
        value: value.trim().startsWith('$') ? { ref: value.trim() } : (isNaN(Number(value)) ? value.trim() : Number(value))
      }

      // Semantic tokens have dots in name
      if (tokenName.includes('.')) {
        doc.tokens.semantic.push(token)
      } else {
        doc.tokens.palette.push(token)
      }
    }
  }
}

// =============================================================================
// VARIABLE PARSING
// =============================================================================

function parseVariables(code: string, doc: MirrorDocument): void {
  // Match: const $name = null/value (not tokens)
  const varRegex = /const\s+(\$\w+)\s*=\s*(null|true|false|\d+|'[^']*'|"[^"]*")/g
  let match

  while ((match = varRegex.exec(code)) !== null) {
    const [, name, value] = match
    let parsedValue: string | number | boolean | null = null

    if (value === 'null') parsedValue = null
    else if (value === 'true') parsedValue = true
    else if (value === 'false') parsedValue = false
    else if (!isNaN(Number(value))) parsedValue = Number(value)
    else parsedValue = value.replace(/^['"]|['"]$/g, '')

    doc.variables![name] = parsedValue
  }
}

// =============================================================================
// DEFINITION PARSING
// =============================================================================

function parseDefinitions(code: string, doc: MirrorDocument): void {
  // Match: const Name = mirror({ ... })
  const mirrorPattern = /const\s+(\w+)\s*=\s*mirror\s*\(\s*\{/g
  let match

  while ((match = mirrorPattern.exec(code)) !== null) {
    const name = match[1]
    const braceStart = match.index + match[0].length - 1
    const body = extractBalanced(code, braceStart, '{', '}')

    if (body) {
      const def = parseDefinitionBody(name, body)
      doc.definitions.push(def)
    }
  }

  // Match: const Name = Parent.extend({ ... })
  const extendPattern = /const\s+(\w+)\s*=\s*(\w+)\.extend\s*\(\s*\{/g

  while ((match = extendPattern.exec(code)) !== null) {
    const name = match[1]
    const parent = match[2]
    const braceStart = match.index + match[0].length - 1
    const body = extractBalanced(code, braceStart, '{', '}')

    if (body) {
      const def = parseDefinitionBody(name, body)
      def.extends = parent
      doc.definitions.push(def)
    }
  }
}

function parseDefinitionBody(name: string, body: string): ComponentDefinition {
  const def: ComponentDefinition = {
    name,
    styles: {},
  }

  // Parse tag
  const tagMatch = body.match(/tag:\s*['"](\w+)['"]/)
  if (tagMatch) {
    // Tag is informational, not directly used in Mirror
  }

  // Parse base styles
  const baseMatch = body.match(/base:\s*\{/)
  if (baseMatch && baseMatch.index !== undefined) {
    const baseStart = body.indexOf('{', baseMatch.index)
    const baseContent = extractBalanced(body, baseStart, '{', '}')
    if (baseContent) {
      def.styles = parseStyleObject(baseContent)
    }
  }

  // Parse states
  const statesMatch = body.match(/states:\s*\{/)
  if (statesMatch && statesMatch.index !== undefined) {
    const statesStart = body.indexOf('{', statesMatch.index)
    const statesContent = extractBalanced(body, statesStart, '{', '}')
    if (statesContent) {
      def.states = parseStatesObject(statesContent)
    }
  }

  // Parse slots
  const slotsMatch = body.match(/slots:\s*\[([^\]]+)\]/)
  if (slotsMatch) {
    const slotNames = slotsMatch[1].match(/['"](\w+)['"]/g) || []
    def.slots = slotNames.map(s => ({
      name: s.replace(/['"]/g, '')
    }))
  }

  // Parse events
  const eventsMatch = body.match(/events:\s*\{/)
  if (eventsMatch && eventsMatch.index !== undefined) {
    const eventsStart = body.indexOf('{', eventsMatch.index)
    const eventsContent = extractBalanced(body, eventsStart, '{', '}')
    if (eventsContent) {
      def.events = parseEventsObject(eventsContent)
    }
  }

  // Parse animations
  const showMatch = body.match(/show:\s*\{\s*type:\s*['"]([^'"]+)['"],\s*duration:\s*(\d+)\s*\}/)
  if (showMatch) {
    def.showAnimation = { type: showMatch[1], duration: Number(showMatch[2]) }
  }

  const hideMatch = body.match(/hide:\s*\{\s*type:\s*['"]([^'"]+)['"],\s*duration:\s*(\d+)\s*\}/)
  if (hideMatch) {
    def.hideAnimation = { type: hideMatch[1], duration: Number(hideMatch[2]) }
  }

  const animateMatch = body.match(/animate:\s*\{\s*type:\s*['"](\w+)['"],\s*duration:\s*(\d+)\s*\}/)
  if (animateMatch) {
    def.animate = {
      type: animateMatch[1] as 'spin' | 'pulse' | 'bounce',
      duration: Number(animateMatch[2])
    }
  }

  return def
}

// =============================================================================
// STYLE PARSING
// =============================================================================

function parseStyleObject(content: string): MirrorStyles {
  const styles: MirrorStyles = {}

  // Parse key-value pairs
  // Handles: key: value, key: 'string', key: [array], key: { object }
  const pairRegex = /(\w+):\s*(?:'([^']*)'|"([^"]*)"|(\[[^\]]*\])|(\{[^}]*\})|([^,}\n]+))/g
  let match

  while ((match = pairRegex.exec(content)) !== null) {
    const key = match[1] as keyof MirrorStyles
    const singleQuoted = match[2]
    const doubleQuoted = match[3]
    const array = match[4]
    const object = match[5]
    const plain = match[6]

    let value: unknown

    if (singleQuoted !== undefined) {
      value = singleQuoted
    } else if (doubleQuoted !== undefined) {
      value = doubleQuoted
    } else if (array) {
      try {
        value = JSON.parse(array)
      } catch {
        value = array
      }
    } else if (object) {
      // Nested object - skip for now
      continue
    } else if (plain) {
      const trimmed = plain.trim()
      if (trimmed === 'true') value = true
      else if (trimmed === 'false') value = false
      else if (!isNaN(Number(trimmed))) value = Number(trimmed)
      else value = trimmed
    }

    (styles as Record<string, unknown>)[key] = value
  }

  return styles
}

// =============================================================================
// STATES PARSING
// =============================================================================

function parseStatesObject(content: string): StateDefinition[] {
  const states: StateDefinition[] = []

  // Match: stateName: { ... }
  const stateRegex = /(\w+):\s*\{/g
  let match

  while ((match = stateRegex.exec(content)) !== null) {
    const stateName = match[1]
    const stateStart = content.indexOf('{', match.index)
    const stateContent = extractBalanced(content, stateStart, '{', '}')

    if (stateContent) {
      states.push({
        name: stateName,
        styles: parseStyleObject(stateContent)
      })
    }
  }

  return states
}

// =============================================================================
// EVENTS PARSING
// =============================================================================

function parseEventsObject(content: string): EventHandlers {
  const events: EventHandlers = {}

  // Match: eventName: { action: ... } or eventName: [...]
  const eventRegex = /(on\w+):\s*([\[{])/gi
  let match

  while ((match = eventRegex.exec(content)) !== null) {
    const eventName = match[1]
    const startChar = match[2]
    const startIndex = match.index + match[0].length - 1

    let actionContent: string | null
    if (startChar === '{') {
      actionContent = extractBalanced(content, startIndex, '{', '}')
    } else {
      actionContent = extractBalanced(content, startIndex, '[', ']')
    }

    if (actionContent) {
      const actions = parseActions(startChar === '[' ? actionContent : `{${actionContent}}`)
      if (actions) {
        (events as Record<string, Action | Action[]>)[eventName] = actions
      }
    }
  }

  return events
}

function parseActions(content: string): Action | Action[] | null {
  const actions: Action[] = []

  // Match action objects
  const actionRegex = /\{\s*action:\s*['"](\w+(?:-\w+)?)['"]/g
  let match

  while ((match = actionRegex.exec(content)) !== null) {
    const actionType = match[1]
    const actionStart = match.index
    const actionContent = extractBalanced(content, actionStart, '{', '}')

    if (actionContent) {
      const action = parseAction(actionType, actionContent)
      if (action) {
        actions.push(action)
      }
    }
  }

  if (actions.length === 0) return null
  if (actions.length === 1) return actions[0]
  return actions
}

function parseAction(actionType: string, content: string): Action | null {
  const action: Action = { action: actionType as Action['action'] }

  // Parse common properties
  const targetMatch = content.match(/target:\s*['"]([^'"]+)['"]/)
  if (targetMatch) action.target = targetMatch[1]

  const variableMatch = content.match(/variable:\s*['"]([^'"]+)['"]/)
  if (variableMatch) action.variable = variableMatch[1]

  const expressionMatch = content.match(/expression:\s*['"]([^'"]+)['"]/)
  if (expressionMatch) action.expression = expressionMatch[1]

  const toStateMatch = content.match(/toState:\s*['"]([^'"]+)['"]/)
  if (toStateMatch) action.toState = toStateMatch[1]

  const positionMatch = content.match(/position:\s*['"]([^'"]+)['"]/)
  if (positionMatch) action.position = positionMatch[1]

  const animationMatch = content.match(/animation:\s*['"]([^'"]+)['"]/)
  if (animationMatch) action.animation = animationMatch[1]

  const durationMatch = content.match(/duration:\s*(\d+)/)
  if (durationMatch) action.duration = Number(durationMatch[1])

  const messageMatch = content.match(/message:\s*['"]([^'"]+)['"]/)
  if (messageMatch) action.message = messageMatch[1]

  const functionMatch = content.match(/function:\s*['"]([^'"]+)['"]/)
  if (functionMatch) action.function = functionMatch[1]

  return action
}

// =============================================================================
// APP LAYOUT PARSING
// =============================================================================

function parseAppLayout(code: string, doc: MirrorDocument): void {
  // Match: const App = () => (...) or const App = () => { return (...) }
  let appMatch = code.match(/const\s+App\s*=\s*\(\)\s*=>\s*\(([\s\S]*?)\)\s*(?:;|\n|$)/)
  if (!appMatch) {
    appMatch = code.match(/const\s+App\s*=\s*\(\)\s*=>\s*\{[\s\S]*?return\s*\(([\s\S]*?)\)\s*\}/)
  }

  if (appMatch) {
    const jsxContent = appMatch[1].trim()
    const instances = parseJSXContent(jsxContent)
    doc.layout = instances
    return
  }

  // Fallback: If no App component found, try to parse bare JSX directly
  // This handles LLM output that returns JSX without an App wrapper
  const trimmedCode = code.trim()
  if (trimmedCode.startsWith('<')) {
    const instances = parseJSXContent(trimmedCode)
    doc.layout = instances
  }
  // Handle root-level expressions like {condition(...)} or {each(...)}
  else if (trimmedCode.startsWith('{')) {
    const instances = parseJSXContent(trimmedCode)
    doc.layout = instances
  }
}

// =============================================================================
// JSX PARSING
// =============================================================================

function parseJSXContent(jsx: string): (ComponentInstance | Conditional | Iterator)[] {
  const results: (ComponentInstance | Conditional | Iterator)[] = []
  let remaining = jsx.trim()

  while (remaining) {
    remaining = remaining.trim()
    if (!remaining) break

    // Check for conditional: {condition('...', ..., ...)}
    if (remaining.startsWith('{condition(')) {
      const result = parseConditional(remaining)
      if (result) {
        results.push(result.conditional)
        remaining = result.remaining
        continue
      }
    }

    // Check for each: {each('...', '...', ...)}
    if (remaining.startsWith('{each(')) {
      const result = parseIterator(remaining)
      if (result) {
        results.push(result.iterator)
        remaining = result.remaining
        continue
      }
    }

    // Check for JSX element
    if (remaining.startsWith('<')) {
      const result = parseJSXElement(remaining)
      if (result) {
        results.push(result.instance)
        remaining = result.remaining
        continue
      }
    }

    // Check for expression: {...}
    if (remaining.startsWith('{')) {
      const end = findMatchingBrace(remaining, 0)
      if (end > 0) {
        remaining = remaining.substring(end + 1)
        continue
      }
    }

    // Skip one character if stuck
    remaining = remaining.substring(1)
  }

  return results
}

function parseJSXElement(jsx: string): { instance: ComponentInstance; remaining: string } | null {
  const trimmed = jsx.trim()

  // Match opening tag: <ComponentName ...>
  const openMatch = trimmed.match(/^<(\w+)/)
  if (!openMatch) return null

  const componentName = openMatch[1]
  let pos = openMatch[0].length

  // Parse props until > or />
  const propsStart = pos
  let propsEnd = pos
  let isSelfClosing = false
  let depth = 0
  let inString = false
  let stringChar = ''

  while (pos < trimmed.length) {
    const char = trimmed[pos]
    const prevChar = pos > 0 ? trimmed[pos - 1] : ''

    // Track string state
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString) {
      if (char === '{') depth++
      if (char === '}') depth--

      if (depth === 0) {
        if (char === '>' && prevChar === '/') {
          isSelfClosing = true
          propsEnd = pos - 1
          pos++
          break
        }
        if (char === '>') {
          propsEnd = pos
          pos++
          break
        }
      }
    }

    pos++
  }

  const propsStr = trimmed.substring(propsStart, propsEnd).trim()
  const instance = createComponentInstance(componentName, propsStr)

  if (isSelfClosing) {
    return { instance, remaining: trimmed.substring(pos) }
  }

  // Find closing tag and parse children
  const closeTag = `</${componentName}>`
  const closeStart = findClosingTag(trimmed, pos, componentName)

  if (closeStart === -1) {
    return { instance, remaining: trimmed.substring(pos) }
  }

  const innerContent = trimmed.substring(pos, closeStart).trim()
  if (innerContent) {
    instance.children = parseJSXChildren(innerContent)
  }

  return { instance, remaining: trimmed.substring(closeStart + closeTag.length) }
}

function createComponentInstance(name: string, propsStr: string): ComponentInstance {
  const instance: ComponentInstance = {
    type: 'instance',
    component: name,
  }

  if (!propsStr) return instance

  // Parse name prop
  // For Icon component, name is the icon name, not a named instance
  const nameMatch = propsStr.match(/name\s*=\s*["']([^"']+)["']/)
  if (nameMatch) {
    if (name === 'Icon') {
      // For Icon, name is the icon identifier
      if (!instance.props) instance.props = {}
      instance.props.icon = nameMatch[1]
    } else {
      // For other components, name is for named instances
      instance.name = nameMatch[1]
    }
  }

  // Parse listItem prop
  if (/\blistItem\b/.test(propsStr)) {
    instance.isListItem = true
  }

  // Parse hidden prop (boolean)
  if (/\bhidden\b/.test(propsStr)) {
    if (!instance.props) instance.props = {}
    instance.props.hidden = true
  }

  // Parse disabled prop (boolean)
  if (/\bdisabled\b/.test(propsStr)) {
    if (!instance.props) instance.props = {}
    instance.props.disabled = true
  }

  // Parse material prop (boolean for Icon)
  if (/\bmaterial\b/.test(propsStr)) {
    if (!instance.props) instance.props = {}
    instance.props.material = true
  }

  // Parse style prop (merge with existing props, don't overwrite)
  const styleMatch = propsStr.match(/style\s*=\s*\{\{/)
  if (styleMatch && styleMatch.index !== undefined) {
    const styleStart = propsStr.indexOf('{{', styleMatch.index) + 1
    const styleContent = extractBalanced(propsStr, styleStart, '{', '}')
    if (styleContent) {
      const styleProps = parseStyleObject(styleContent)
      instance.props = { ...instance.props, ...styleProps }
    }
  }

  // Parse states prop
  const statesMatch = propsStr.match(/states\s*=\s*\{/)
  if (statesMatch && statesMatch.index !== undefined) {
    const statesStart = propsStr.indexOf('{', statesMatch.index)
    const statesContent = extractBalanced(propsStr, statesStart, '{', '}')
    if (statesContent) {
      instance.states = parseStatesArray(statesContent)
    }
  }

  // Parse event props (regular events, not keyboard)
  const regularEvents = ['onClick', 'onHover', 'onChange', 'onInput', 'onFocus', 'onBlur'] as const
  for (const eventProp of regularEvents) {
    const eventMatch = propsStr.match(new RegExp(`${eventProp}\\s*=\\s*\\{`))
    if (eventMatch && eventMatch.index !== undefined) {
      const eventStart = propsStr.indexOf('{', eventMatch.index)
      const eventContent = extractBalanced(propsStr, eventStart, '{', '}')
      if (eventContent) {
        const actions = parseActions(eventContent)
        if (actions) {
          if (!instance.events) instance.events = {}
          // Type-safe assignment for regular events
          switch (eventProp) {
            case 'onClick': instance.events.onClick = actions; break
            case 'onHover': instance.events.onHover = actions; break
            case 'onChange': instance.events.onChange = actions; break
            case 'onInput': instance.events.onInput = actions; break
            case 'onFocus': instance.events.onFocus = actions; break
            case 'onBlur': instance.events.onBlur = actions; break
          }
        }
      }
    }
  }

  // Parse data prop
  const dataMatch = propsStr.match(/data\s*=\s*["']([^"']+)["']/)
  if (dataMatch) {
    instance.data = { collection: dataMatch[1] }
  }

  // Parse placeholder, type, src, etc.
  const stringProps = ['placeholder', 'src', 'alt', 'href', 'icon'] as const
  for (const prop of stringProps) {
    const match = propsStr.match(new RegExp(`${prop}\\s*=\\s*["']([^"']+)["']`))
    if (match) {
      if (!instance.props) instance.props = {}
      instance.props[prop] = match[1]
    }
  }

  // Parse type separately (maps to inputType)
  const typeMatch = propsStr.match(/type\s*=\s*["']([^"']+)["']/)
  if (typeMatch) {
    if (!instance.props) instance.props = {}
    instance.props.inputType = typeMatch[1] as 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  }

  return instance
}

function parseStatesArray(content: string): StateDefinition[] {
  const states: StateDefinition[] = []

  // Match: state('name', { ... })
  const stateRegex = /state\s*\(\s*['"](\w+)['"]\s*,\s*\{/g
  let match

  while ((match = stateRegex.exec(content)) !== null) {
    const stateName = match[1]
    const stateStart = content.indexOf('{', match.index + match[0].length - 1)
    const stateContent = extractBalanced(content, stateStart, '{', '}')

    if (stateContent) {
      states.push({
        name: stateName,
        styles: parseStyleObject(stateContent)
      })
    }
  }

  return states
}

function parseJSXChildren(content: string): (ComponentInstance | Conditional | Iterator | string)[] {
  const children: (ComponentInstance | Conditional | Iterator | string)[] = []
  let remaining = content.trim()

  while (remaining) {
    remaining = remaining.trim()
    if (!remaining) break

    // Text content before next element
    if (!remaining.startsWith('<') && !remaining.startsWith('{')) {
      const nextTag = remaining.indexOf('<')
      const nextExpr = remaining.indexOf('{')
      const nextBoundary = Math.min(
        nextTag === -1 ? Infinity : nextTag,
        nextExpr === -1 ? Infinity : nextExpr
      )

      if (nextBoundary === Infinity) {
        // Rest is text
        const text = remaining.trim()
        if (text) children.push(text)
        break
      } else if (nextBoundary > 0) {
        const text = remaining.substring(0, nextBoundary).trim()
        if (text) children.push(text)
        remaining = remaining.substring(nextBoundary)
        continue
      }
    }

    // Check for conditional
    if (remaining.startsWith('{condition(')) {
      const result = parseConditional(remaining)
      if (result) {
        children.push(result.conditional)
        remaining = result.remaining
        continue
      }
    }

    // Check for each
    if (remaining.startsWith('{each(')) {
      const result = parseIterator(remaining)
      if (result) {
        children.push(result.iterator)
        remaining = result.remaining
        continue
      }
    }

    // Check for text expression: {'{$item.name}'}
    if (remaining.startsWith('{')) {
      const end = findMatchingBrace(remaining, 0)
      if (end > 0) {
        const expr = remaining.substring(1, end).trim()
        // Check if it's a variable reference
        if (expr.match(/^['"]?\{?\$[\w.]+\}?['"]?$/)) {
          children.push(expr.replace(/^['"]|['"]$/g, '').replace(/^\{|\}$/g, ''))
        }
        remaining = remaining.substring(end + 1)
        continue
      }
    }

    // Check for JSX element
    if (remaining.startsWith('<')) {
      const result = parseJSXElement(remaining)
      if (result) {
        children.push(result.instance)
        remaining = result.remaining
        continue
      }
    }

    // Skip character if stuck
    remaining = remaining.substring(1)
  }

  return children
}

// =============================================================================
// CONDITIONAL PARSING
// =============================================================================

function parseConditional(jsx: string): { conditional: Conditional; remaining: string } | null {
  // Match: {condition('$var', then, else)}
  if (!jsx.startsWith('{condition(')) return null

  const start = jsx.indexOf('(')
  const end = findMatchingParen(jsx, start)
  if (end === -1) return null

  const args = jsx.substring(start + 1, end)

  // Parse condition string
  const conditionMatch = args.match(/^['"]([^'"]+)['"]/)
  if (!conditionMatch) return null

  const condition = conditionMatch[1]
  let remaining = args.substring(conditionMatch[0].length).trim()

  if (remaining.startsWith(',')) remaining = remaining.substring(1).trim()

  // Parse then branch
  const thenResult = parseJSXElement(remaining)
  if (!thenResult) return null

  remaining = thenResult.remaining.trim()

  // Parse else branch (optional)
  let elseBranch: ComponentInstance | undefined
  if (remaining.startsWith(',')) {
    remaining = remaining.substring(1).trim()
    const elseResult = parseJSXElement(remaining)
    if (elseResult) {
      elseBranch = elseResult.instance
      remaining = elseResult.remaining
    }
  }

  const conditional: Conditional = {
    type: 'conditional',
    condition,
    then: thenResult.instance,
    else: elseBranch
  }

  // Skip closing brace
  const fullRemaining = jsx.substring(end + 2).trim()

  return { conditional, remaining: fullRemaining }
}

// =============================================================================
// ITERATOR PARSING
// =============================================================================

function parseIterator(jsx: string): { iterator: Iterator; remaining: string } | null {
  // Match: {each('$item', '$list', template)}
  if (!jsx.startsWith('{each(')) return null

  const start = jsx.indexOf('(')
  const end = findMatchingParen(jsx, start)
  if (end === -1) return null

  const args = jsx.substring(start + 1, end)

  // Parse item variable
  const itemMatch = args.match(/^['"](\$\w+)['"]/)
  if (!itemMatch) return null

  const itemVar = itemMatch[1]
  let remaining = args.substring(itemMatch[0].length).trim()

  if (remaining.startsWith(',')) remaining = remaining.substring(1).trim()

  // Parse list variable
  const listMatch = remaining.match(/^['"](\$\w+)['"]/)
  if (!listMatch) return null

  const listVar = listMatch[1]
  remaining = remaining.substring(listMatch[0].length).trim()

  if (remaining.startsWith(',')) remaining = remaining.substring(1).trim()

  // Strip optional parentheses around template: each('$x', '$y', (<Foo />))
  if (remaining.startsWith('(')) {
    remaining = remaining.substring(1).trim()
  }

  // Parse template
  const templateResult = parseJSXElement(remaining)
  if (!templateResult) return null

  const iterator: Iterator = {
    type: 'iterator',
    itemVar,
    listVar,
    template: templateResult.instance
  }

  const fullRemaining = jsx.substring(end + 2).trim()

  return { iterator, remaining: fullRemaining }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function stripComments(code: string): string {
  // Remove multi-line comments
  let result = code.replace(/\/\*[\s\S]*?\*\//g, '')

  // Remove single-line comments (but preserve URLs)
  result = result.split('\n').map(line => {
    let inString = false
    let stringChar = ''

    for (let i = 0; i < line.length - 1; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      const prevChar = i > 0 ? line[i - 1] : ''

      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
        }
      }

      if (!inString && char === '/' && nextChar === '/' && prevChar !== ':') {
        return line.substring(0, i).trimEnd()
      }
    }

    return line
  }).join('\n')

  return result
}

function extractBalanced(str: string, startIndex: number, openChar: string, closeChar: string): string | null {
  if (str[startIndex] !== openChar) return null

  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = startIndex; i < str.length; i++) {
    const char = str[i]
    const prevChar = i > 0 ? str[i - 1] : ''

    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString) {
      if (char === openChar) depth++
      if (char === closeChar) {
        depth--
        if (depth === 0) {
          return str.substring(startIndex + 1, i)
        }
      }
    }
  }

  return null
}

function findMatchingBrace(str: string, start: number): number {
  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = start; i < str.length; i++) {
    const char = str[i]
    const prevChar = i > 0 ? str[i - 1] : ''

    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString) {
      if (char === '{') depth++
      if (char === '}') {
        depth--
        if (depth === 0) return i
      }
    }
  }

  return -1
}

function findMatchingParen(str: string, start: number): number {
  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = start; i < str.length; i++) {
    const char = str[i]
    const prevChar = i > 0 ? str[i - 1] : ''

    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString) {
      if (char === '(') depth++
      if (char === ')') {
        depth--
        if (depth === 0) return i
      }
    }
  }

  return -1
}

function findClosingTag(str: string, start: number, tagName: string): number {
  const openPattern = new RegExp(`<${tagName}(?:\\s|>|/)`, 'g')
  const closePattern = new RegExp(`</${tagName}>`, 'g')

  let depth = 1
  let pos = start

  while (pos < str.length) {
    openPattern.lastIndex = pos
    closePattern.lastIndex = pos

    const openMatch = openPattern.exec(str)
    const closeMatch = closePattern.exec(str)

    if (!openMatch && !closeMatch) break

    const openIndex = openMatch ? openMatch.index : Infinity
    const closeIndex = closeMatch ? closeMatch.index : Infinity

    if (openIndex < closeIndex && openMatch) {
      // Check if self-closing
      const tagEnd = str.indexOf('>', openIndex)
      if (tagEnd > 0 && str[tagEnd - 1] !== '/') {
        depth++
      }
      pos = tagEnd + 1
    } else if (closeMatch) {
      depth--
      if (depth === 0) {
        return closeMatch.index
      }
      pos = closeMatch.index + closeMatch[0].length
    } else {
      break
    }
  }

  return -1
}

export default parseReactCode
