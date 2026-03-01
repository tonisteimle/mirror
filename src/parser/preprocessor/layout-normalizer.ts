/**
 * @module parser/preprocessor/layout-normalizer
 * @description Converts inline syntax to canonical block syntax
 *
 * Transforms:
 *   Button pad 12, bg #333
 * To:
 *   Button
 *     padding 12
 *     background #333
 */

import type { Token } from './tokenizer'

/**
 * HTML primitives that support named instance syntax: Input Email "placeholder"
 * When a primitive is followed by a PascalCase name that is NOT itself a primitive,
 * the name becomes the instance name (not a child component)
 */
const HTML_PRIMITIVES = new Set(['Box', 'Text', 'Icon', 'Image', 'Input', 'Textarea', 'Link', 'Button', 'Segment', 'Select', 'Option'])

interface LayoutOptions {
  indentSize: number
  preserveComments: boolean
}

/**
 * Convert tokenized code to canonical block syntax
 */
export function convertToBlockSyntax(tokens: Token[], options: LayoutOptions): string {
  const lines: string[] = []
  let i = 0

  while (i < tokens.length) {
    const result = processLine(tokens, i, 0, options)
    lines.push(...result.lines)
    i = result.nextIndex
  }

  return lines.join('\n')
}

interface ProcessResult {
  lines: string[]
  nextIndex: number
}

/**
 * Process tokens starting at index, producing canonical lines
 */
function processLine(
  tokens: Token[],
  startIndex: number,
  baseIndent: number,
  options: LayoutOptions
): ProcessResult {
  const lines: string[] = []
  let i = startIndex

  // Skip leading newlines
  while (i < tokens.length && tokens[i].type === 'NEWLINE') {
    i++
  }

  if (i >= tokens.length) {
    return { lines, nextIndex: i }
  }

  const token = tokens[i]

  // Handle indent
  let currentIndent = baseIndent
  if (token.type === 'INDENT') {
    // Normalize indent to multiples of indentSize
    currentIndent = Math.floor(token.indent / 2) * options.indentSize
    i++
  }

  if (i >= tokens.length || tokens[i].type === 'NEWLINE') {
    return { lines, nextIndex: i + 1 }
  }

  const firstToken = tokens[i]

  // Handle comments
  if (firstToken.type === 'COMMENT') {
    lines.push(indent(currentIndent, options) + firstToken.value)
    i++
    // Skip newline after comment
    if (i < tokens.length && tokens[i].type === 'NEWLINE') {
      i++
    }
    return { lines, nextIndex: i }
  }

  // Handle token definition ($name: value)
  if (firstToken.type === 'TOKEN_DEF') {
    const defLine = collectUntilNewline(tokens, i)
    lines.push(indent(currentIndent, options) + defLine.text)
    return { lines, nextIndex: defLine.nextIndex }
  }

  // Handle component (definition or instance)
  if (firstToken.type === 'COMPONENT' || firstToken.type === 'COMPONENT_DEF') {
    const result = processComponent(tokens, i, currentIndent, options)
    lines.push(...result.lines)
    return { lines, nextIndex: result.nextIndex }
  }

  // Handle property at root level (shouldn't happen in valid code, but handle gracefully)
  if (firstToken.type === 'PROPERTY') {
    const propResult = processPropertyLine(tokens, i, currentIndent, options)
    lines.push(...propResult.lines)
    return { lines, nextIndex: propResult.nextIndex }
  }

  // Handle state blocks
  if (firstToken.type === 'STATE' || (firstToken.type === 'KEYWORD' && firstToken.value === 'state')) {
    const stateResult = processStateBlock(tokens, i, currentIndent, options)
    lines.push(...stateResult.lines)
    return { lines, nextIndex: stateResult.nextIndex }
  }

  // Handle events block
  if (firstToken.type === 'KEYWORD' && firstToken.value === 'events') {
    const eventsResult = processEventsBlock(tokens, i, currentIndent, options)
    lines.push(...eventsResult.lines)
    return { lines, nextIndex: eventsResult.nextIndex }
  }

  // Handle control flow (if, each)
  if (firstToken.type === 'CONTROL') {
    const controlResult = processControlBlock(tokens, i, currentIndent, options)
    lines.push(...controlResult.lines)
    return { lines, nextIndex: controlResult.nextIndex }
  }

  // Handle event handlers
  if (firstToken.type === 'EVENT') {
    const eventResult = processEventHandler(tokens, i, currentIndent, options)
    lines.push(...eventResult.lines)
    return { lines, nextIndex: eventResult.nextIndex }
  }

  // Fallback: collect until newline
  const fallback = collectUntilNewline(tokens, i)
  if (fallback.text.trim()) {
    lines.push(indent(currentIndent, options) + fallback.text)
  }
  return { lines, nextIndex: fallback.nextIndex }
}

/**
 * Process a component (definition or instance)
 */
function processComponent(
  tokens: Token[],
  startIndex: number,
  baseIndent: number,
  options: LayoutOptions
): ProcessResult {
  const lines: string[] = []
  let i = startIndex

  const componentToken = tokens[i]
  const isDefinition = componentToken.type === 'COMPONENT_DEF'
  const componentName = isDefinition
    ? componentToken.value.slice(0, -1) // Remove trailing :
    : componentToken.value

  // Track if this is an HTML primitive (for named instance detection)
  const isPrimitive = HTML_PRIMITIVES.has(componentName)

  i++

  // Check for inheritance patterns:
  // 1. Old syntax: ChildComponent: ParentComponent (COMPONENT_DEF followed by COMPONENT)
  // 2. New syntax: ChildComponent from ParentComponent: (COMPONENT followed by 'from' COMPONENT COLON)
  // 3. Old 'from' syntax: ChildComponent: from ParentComponent (COMPONENT_DEF followed by 'from')
  let inheritance = ''
  let namedInstance = ''
  let actuallyDefinition = isDefinition

  // Check for new 'from' syntax: DangerButton from Button:
  if (!isDefinition && i < tokens.length &&
      tokens[i].type === 'KEYWORD' && tokens[i].value === 'from' &&
      i + 1 < tokens.length && (tokens[i + 1].type === 'COMPONENT' || tokens[i + 1].type === 'COMPONENT_DEF')) {
    i++ // skip 'from'
    let parentName = tokens[i].value
    // Check if parent has colon (Button: means it's also defining a colon at end)
    if (tokens[i].type === 'COMPONENT_DEF') {
      parentName = parentName.slice(0, -1) // Remove trailing :
      actuallyDefinition = true
    }
    inheritance = ' from ' + parentName
    i++
    // Check for COLON after parent
    if (i < tokens.length && tokens[i].type === 'COLON') {
      actuallyDefinition = true
      i++ // skip ':'
    }
  }
  // Old syntax: ChildComponent: ParentComponent
  else if (isDefinition && i < tokens.length && tokens[i].type === 'COMPONENT') {
    inheritance = ' ' + tokens[i].value
    i++
  }
  // Old 'from' syntax: ChildComponent: from ParentComponent
  else if (isDefinition && i < tokens.length &&
           tokens[i].type === 'KEYWORD' && tokens[i].value === 'from' &&
           i + 1 < tokens.length && (tokens[i + 1].type === 'COMPONENT' || tokens[i + 1].type === 'COMPONENT_DEF')) {
    i++ // skip 'from'
    inheritance = ' from ' + tokens[i].value.replace(/:$/, '')
    i++
  }
  // Check for named instance pattern: Primitive Name (e.g., Input Email)
  // Only for instances (not definitions), when main component is a primitive
  // and the next token is a COMPONENT that is NOT itself a primitive
  else if (!isDefinition && isPrimitive && i < tokens.length &&
           (tokens[i].type === 'COMPONENT' || tokens[i].type === 'COMPONENT_DEF') &&
           !HTML_PRIMITIVES.has(tokens[i].value.replace(/:$/, ''))) {
    namedInstance = ' ' + tokens[i].value
    i++
  }

  // Collect inline items (properties and content) in order, plus child overrides
  // Using a single array preserves the order of properties vs strings
  // This is important for semantics like "Box 'Hello' size 18" where size applies to text child
  type InlineItem = { type: 'property'; tokens: Token[] } | { type: 'content'; token: Token } | { type: 'keyword'; tokens: Token[] }
  const inlineItems: InlineItem[] = []
  const inlineContent: Token[] = [] // Still needed for named/as keywords
  const childOverrides: { name: string; content: Token[] }[] = []

  while (i < tokens.length && tokens[i].type !== 'NEWLINE') {
    const token = tokens[i]

    if (token.type === 'COMMA') {
      // Start new property group
      i++
      continue
    }

    if (token.type === 'SEMICOLON') {
      // Semicolon separates child overrides - skip it
      i++
      continue
    }

    // Check for child override pattern: Component "content" or Component prop value
    // This happens when we see a Component in inline position (not inheritance)
    // Also handle KEYWORD tokens as potential child names (e.g., "header bg #333")
    // when followed by a PROPERTY token
    const isChildOverride = token.type === 'COMPONENT' ||
      (token.type === 'KEYWORD' && i + 1 < tokens.length && tokens[i + 1].type === 'PROPERTY')
    if (isChildOverride) {
      // This is a child override (Component followed by content)
      const childName = token.value
      const childContent: Token[] = []
      i++

      // Collect child content until semicolon, newline, or next component/keyword-as-child
      while (i < tokens.length &&
             tokens[i].type !== 'NEWLINE' &&
             tokens[i].type !== 'SEMICOLON' &&
             tokens[i].type !== 'COMPONENT' &&
             // Stop at KEYWORD followed by PROPERTY (another child override)
             !(tokens[i].type === 'KEYWORD' && i + 1 < tokens.length && tokens[i + 1].type === 'PROPERTY')) {
        childContent.push(tokens[i])
        i++
      }

      childOverrides.push({ name: childName, content: childContent })
      continue
    }

    if (token.type === 'PROPERTY') {
      // Collect property and its value
      const propTokens: Token[] = [token]
      const propName = token.value
      i++

      // Sizing keywords that can appear as values for dimension properties
      const sizingKeywords = new Set(['full', 'hug', 'min', 'max'])
      // Dimension properties that accept sizing keywords as values
      const dimensionProperties = new Set(['w', 'h', 'width', 'height', 'size', 'minw', 'maxw', 'minh', 'maxh', 'min-width', 'max-width', 'min-height', 'max-height'])
      const isSizingKeyword = sizingKeywords.has(propName)
      const isDimensionProperty = dimensionProperties.has(propName)

      // Special properties that can have COMPONENT/KEYWORD values after them
      // data Users, data Users where status == "active", etc.
      const complexProperties = new Set(['data'])
      const isComplexProperty = complexProperties.has(propName)

      // Properties that have sub-keywords that should not start new properties
      // e.g., "grid 2 rows 100 200" - rows is part of grid, not a new property
      const propertySubKeywords: Record<string, Set<string>> = {
        'grid': new Set(['rows'])
      }
      const allowedSubKeywords = propertySubKeywords[propName]

      // Structural keywords that start new syntax - stop collecting at these
      const structuralKeywords = new Set(['named', 'as', 'if', 'then', 'else', 'each', 'in', 'where'])

      // Check if a property token should be allowed to continue the current property
      const shouldAllowProperty = (nextToken: Token): boolean => {
        // Allow sizing keyword pairs: full hug, max min, etc.
        if (isSizingKeyword && sizingKeywords.has(nextToken.value)) return true
        // Allow dimension properties to accept sizing keywords (w full, h hug, etc.)
        if (isDimensionProperty && sizingKeywords.has(nextToken.value)) return true
        // Allow sub-keywords for specific properties (e.g., rows for grid)
        if (allowedSubKeywords && allowedSubKeywords.has(nextToken.value)) return true
        return false
      }

      // Collect property value (direction, corner, value, etc.)
      while (i < tokens.length &&
             tokens[i].type !== 'NEWLINE' &&
             tokens[i].type !== 'COMMA' &&
             tokens[i].type !== 'SEMICOLON' &&
             // Allow certain property tokens to continue the current property
             (tokens[i].type !== 'PROPERTY' || shouldAllowProperty(tokens[i])) &&
             tokens[i].type !== 'EVENT' &&
             tokens[i].type !== 'STATE' &&
             // For complex properties like 'data', allow COMPONENT tokens
             (isComplexProperty || tokens[i].type !== 'COMPONENT') &&
             // Stop at structural keywords, but allow value keywords (sm, md, cover, etc.)
             (tokens[i].type !== 'KEYWORD' || !structuralKeywords.has(tokens[i].value))) {
        propTokens.push(tokens[i])
        i++
        // After collecting a sizing keyword pair, stop (don't collect third)
        if (isSizingKeyword && propTokens.length === 2) break
      }

      inlineItems.push({ type: 'property', tokens: propTokens })
    } else if (token.type === 'STRING' || token.type === 'NUMBER' || token.type === 'COLOR' || token.type === 'TOKEN_REF' || token.type === 'COMPONENT_REF') {
      // Inline content without explicit property - preserve order
      inlineItems.push({ type: 'content', token })
      i++
    } else if (token.type === 'EVENT') {
      // Inline event handler - collect all tokens including comma-separated actions
      // Event handlers can have multiple actions: onclick select self, close Menu
      // Only stop when we see comma followed by PROPERTY/EVENT (new property starts)
      const eventTokens: Token[] = [token]
      i++
      while (i < tokens.length && tokens[i].type !== 'NEWLINE' && tokens[i].type !== 'SEMICOLON') {
        // Check if this comma separates from a new property
        if (tokens[i].type === 'COMMA') {
          // Look ahead to see if next non-comma token is a new property/event
          let lookAhead = i + 1
          while (lookAhead < tokens.length && tokens[lookAhead].type === 'COMMA') {
            lookAhead++
          }
          if (lookAhead < tokens.length &&
              (tokens[lookAhead].type === 'PROPERTY' || tokens[lookAhead].type === 'EVENT')) {
            // This comma separates properties, stop here
            break
          }
          // Otherwise, comma is part of event actions - include it
        }
        eventTokens.push(tokens[i])
        i++
      }
      inlineItems.push({ type: 'keyword', tokens: eventTokens })
    } else if (token.type === 'KEYWORD' && ['named', 'as'].includes(token.value)) {
      // Named instance or 'as' syntax
      inlineContent.push(token)
      i++
      if (i < tokens.length && (tokens[i].type === 'COMPONENT' || tokens[i].type === 'KEYWORD')) {
        inlineContent.push(tokens[i])
        i++
      }
    } else if (token.type === 'KEYWORD' && token.value === 'animate') {
      // Animation: animate pulse 1000
      const animateTokens: Token[] = [token]
      i++
      // Collect animation name (KEYWORD like pulse, spin, bounce)
      if (i < tokens.length && tokens[i].type === 'KEYWORD') {
        animateTokens.push(tokens[i])
        i++
      }
      // Collect optional duration (NUMBER)
      if (i < tokens.length && tokens[i].type === 'NUMBER') {
        animateTokens.push(tokens[i])
        i++
      }
      inlineItems.push({ type: 'keyword', tokens: animateTokens })
    } else if (token.type === 'COMMENT') {
      // Preserve inline comment
      inlineContent.push(token)
      i++
    } else if (token.type === 'CONTROL' && token.value === 'if') {
      // Inline conditional: if $cond then prop value else prop value
      // Collect entire conditional as one unit
      const conditionalTokens: Token[] = [token]
      i++
      // Collect until newline - the entire conditional stays together
      while (i < tokens.length && tokens[i].type !== 'NEWLINE') {
        conditionalTokens.push(tokens[i])
        i++
      }
      inlineItems.push({ type: 'keyword', tokens: conditionalTokens })
    } else {
      // Other tokens (keywords, etc.)
      inlineContent.push(token)
      i++
    }
  }

  // Build component line with all properties inline
  // Use actuallyDefinition which may have been set by 'from' syntax
  let componentLine = componentName + (actuallyDefinition ? ':' : '') + inheritance + namedInstance

  // Add STATE tokens (state activation like "NavItem active")
  // STATE tokens must come after component name for the parser to recognize them as state activation
  for (const token of inlineContent) {
    if (token.type === 'STATE') {
      componentLine += ' ' + token.value
    }
  }

  // Add named/as if present (from explicit 'named' keyword in inline content)
  const namedIdx = inlineContent.findIndex(t => t.type === 'KEYWORD' && t.value === 'named')
  if (namedIdx >= 0 && namedIdx + 1 < inlineContent.length) {
    componentLine += ' named ' + inlineContent[namedIdx + 1].value
  }

  const asIdx = inlineContent.findIndex(t => t.type === 'KEYWORD' && t.value === 'as')
  if (asIdx >= 0 && asIdx + 1 < inlineContent.length) {
    componentLine += ' as ' + inlineContent[asIdx + 1].value
  }

  // Add all inline items in original order (comma-separated)
  // This preserves semantics like "Box 'Hello' size 18" where size applies to text child
  const propParts: string[] = []
  for (const item of inlineItems) {
    if (item.type === 'property' || item.type === 'keyword') {
      const propLine = tokensToString(item.tokens)
      if (propLine.trim()) {
        propParts.push(propLine)
      }
    } else if (item.type === 'content') {
      if (item.token.type === 'STRING') {
        propParts.push(item.token.value)
      } else {
        propParts.push(item.token.value)
      }
    }
  }

  if (propParts.length > 0) {
    componentLine += ' ' + propParts.join(', ')
  }

  // Handle inline comments
  for (const token of inlineContent) {
    if (token.type === 'COMMENT') {
      componentLine += '  ' + token.value
    }
  }

  lines.push(indent(baseIndent, options) + componentLine)

  const propIndent = baseIndent + options.indentSize

  // Add child overrides (semicolon-separated child components)
  for (const child of childOverrides) {
    lines.push(indent(propIndent, options) + child.name)
    const childPropIndent = propIndent + options.indentSize

    // Group property tokens with their values
    let i = 0
    while (i < child.content.length) {
      const contentToken = child.content[i]

      if (contentToken.type === 'STRING') {
        // STRING token value already includes quotes, don't add more
        lines.push(indent(childPropIndent, options) + contentToken.value)
        i++
      } else if (contentToken.type === 'PROPERTY') {
        // Property on child - collect property and all its values on same line
        const propParts: string[] = [contentToken.value]
        i++
        // Collect property values (DIRECTION, NUMBER, COLOR, TOKEN_REF, KEYWORD, etc.)
        while (i < child.content.length) {
          const nextToken = child.content[i]
          if (nextToken.type === 'PROPERTY' || nextToken.type === 'STRING') {
            break // Start of next property or content
          }
          propParts.push(nextToken.value)
          i++
        }
        lines.push(indent(childPropIndent, options) + propParts.join(' '))
      } else if (contentToken.type === 'NUMBER' || contentToken.type === 'COLOR' || contentToken.type === 'TOKEN_REF') {
        // Implicit content (sugar - shouldn't usually happen after property collection)
        lines.push(indent(childPropIndent, options) + contentToken.value)
        i++
      } else {
        // Skip unknown tokens
        i++
      }
    }
  }

  // Skip newline
  if (i < tokens.length && tokens[i].type === 'NEWLINE') {
    i++
  }

  // Process children (indented content)
  while (i < tokens.length) {
    // Skip empty lines
    if (tokens[i].type === 'NEWLINE') {
      i++
      continue
    }

    // Check indent level
    const childIndent = tokens[i].type === 'INDENT' ? tokens[i].indent : 0
    const normalizedChildIndent = Math.floor(childIndent / 2) * options.indentSize

    // If same or less indent, we're done with children
    if (normalizedChildIndent <= baseIndent) {
      break
    }

    // Process child
    const childResult = processLine(tokens, i, normalizedChildIndent, options)
    lines.push(...childResult.lines)
    i = childResult.nextIndex
  }

  return { lines, nextIndex: i }
}

/**
 * Process a property line (property + value)
 */
function processPropertyLine(
  tokens: Token[],
  startIndex: number,
  baseIndent: number,
  options: LayoutOptions
): ProcessResult {
  const lines: string[] = []
  let i = startIndex

  // Process all comma-separated properties on this line
  while (i < tokens.length && tokens[i].type !== 'NEWLINE') {
    // Skip commas between properties
    if (tokens[i].type === 'COMMA') {
      i++
      continue
    }

    // Collect tokens for this property until newline or comma
    const propTokens: Token[] = []
    while (i < tokens.length && tokens[i].type !== 'NEWLINE' && tokens[i].type !== 'COMMA') {
      propTokens.push(tokens[i])
      i++
    }

    const line = tokensToString(propTokens)
    if (line.trim()) {
      lines.push(indent(baseIndent, options) + line)
    }
  }

  // Skip newline
  if (i < tokens.length && tokens[i].type === 'NEWLINE') {
    i++
  }

  return { lines, nextIndex: i }
}

/**
 * Process a state block (hover, focus, etc.)
 */
function processStateBlock(
  tokens: Token[],
  startIndex: number,
  baseIndent: number,
  options: LayoutOptions
): ProcessResult {
  const lines: string[] = []
  let i = startIndex

  // Build the state line, preserving 'state' keyword if present
  let stateLine = ''

  // Handle 'state' keyword if present
  if (tokens[i].type === 'KEYWORD' && tokens[i].value === 'state') {
    stateLine = 'state '
    i++
  }

  // State name - can be STATE, ACTION, KEYWORD, or PROPERTY (for words like 'disabled' that are both)
  if (i < tokens.length && (tokens[i].type === 'STATE' || tokens[i].type === 'ACTION' || tokens[i].type === 'KEYWORD' || tokens[i].type === 'PROPERTY')) {
    stateLine += tokens[i].value
    i++
  }

  if (stateLine) {
    lines.push(indent(baseIndent, options) + stateLine)
  }

  // Skip newline
  if (i < tokens.length && tokens[i].type === 'NEWLINE') {
    i++
  }

  // Process state content (indented)
  const stateIndent = baseIndent + options.indentSize
  while (i < tokens.length) {
    if (tokens[i].type === 'NEWLINE') {
      i++
      continue
    }

    const childIndent = tokens[i].type === 'INDENT' ? tokens[i].indent : 0
    if (childIndent <= baseIndent) {
      break
    }

    const childResult = processLine(tokens, i, stateIndent, options)
    lines.push(...childResult.lines)
    i = childResult.nextIndex
  }

  return { lines, nextIndex: i }
}

/**
 * Process an events block
 * Events block syntax:
 * events
 *   ComponentName event
 *     action target
 */
function processEventsBlock(
  tokens: Token[],
  startIndex: number,
  baseIndent: number,
  options: LayoutOptions
): ProcessResult {
  const lines: string[] = []
  let i = startIndex

  // 'events' keyword
  lines.push(indent(baseIndent, options) + 'events')
  i++

  // Skip newline
  if (i < tokens.length && tokens[i].type === 'NEWLINE') {
    i++
  }

  // Process events content - keep lines together instead of breaking them up
  while (i < tokens.length) {
    if (tokens[i].type === 'NEWLINE') {
      i++
      continue
    }

    // Check indent
    let childIndent = 0
    if (tokens[i].type === 'INDENT') {
      childIndent = tokens[i].indent
      i++
    }

    if (childIndent <= baseIndent) {
      // Rewind if we consumed an indent
      if (tokens[i - 1]?.type === 'INDENT') i--
      break
    }

    // Collect the entire line as-is (preserve events block syntax)
    const collected = collectUntilNewline(tokens, i)
    if (collected.text.trim()) {
      lines.push(indent(childIndent, options) + collected.text)
    }
    i = collected.nextIndex
  }

  return { lines, nextIndex: i }
}

/**
 * Process control flow (if, each)
 */
function processControlBlock(
  tokens: Token[],
  startIndex: number,
  baseIndent: number,
  options: LayoutOptions
): ProcessResult {
  const collected = collectUntilNewline(tokens, startIndex)
  const lines = [indent(baseIndent, options) + collected.text]
  let i = collected.nextIndex

  // Process indented content
  while (i < tokens.length) {
    if (tokens[i].type === 'NEWLINE') {
      i++
      continue
    }

    const childIndent = tokens[i].type === 'INDENT' ? tokens[i].indent : 0
    if (childIndent <= baseIndent) {
      break
    }

    const childResult = processLine(tokens, i, baseIndent + options.indentSize, options)
    lines.push(...childResult.lines)
    i = childResult.nextIndex
  }

  return { lines, nextIndex: i }
}

/**
 * Process event handler
 */
function processEventHandler(
  tokens: Token[],
  startIndex: number,
  baseIndent: number,
  options: LayoutOptions
): ProcessResult {
  const collected = collectUntilNewline(tokens, startIndex)
  const lines = [indent(baseIndent, options) + collected.text]
  let i = collected.nextIndex

  // Process indented actions
  while (i < tokens.length) {
    if (tokens[i].type === 'NEWLINE') {
      i++
      continue
    }

    const childIndent = tokens[i].type === 'INDENT' ? tokens[i].indent : 0
    if (childIndent <= baseIndent) {
      break
    }

    const childResult = processLine(tokens, i, baseIndent + options.indentSize, options)
    lines.push(...childResult.lines)
    i = childResult.nextIndex
  }

  return { lines, nextIndex: i }
}

/**
 * Collect all tokens until newline
 */
function collectUntilNewline(tokens: Token[], startIndex: number): { text: string; nextIndex: number } {
  const parts: string[] = []
  let i = startIndex

  while (i < tokens.length && tokens[i].type !== 'NEWLINE') {
    if (tokens[i].type !== 'INDENT') {
      parts.push(tokens[i].value)
    }
    i++
  }

  // Skip newline
  if (i < tokens.length && tokens[i].type === 'NEWLINE') {
    i++
  }

  return { text: parts.join(' '), nextIndex: i }
}

/**
 * Convert tokens to string
 */
function tokensToString(tokens: Token[]): string {
  return tokens
    .filter(t => t.type !== 'INDENT')
    .map(t => t.value)
    .join(' ')
}

/**
 * Create indent string
 */
function indent(level: number, options: LayoutOptions): string {
  return ' '.repeat(level)
}
