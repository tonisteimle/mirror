/**
 * @module block-parser
 * @description Block-Syntax Parser - Parst Properties, States, Events innerhalb von Blöcken
 *
 * Wird sowohl für Indentation-basierte als auch Brace-basierte Syntax verwendet.
 * Die öffentlichen Beispiele zeigen v1 Syntax, interne Details dokumentieren beide.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX-REFERENZ (v1 Inline-Syntax)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Component property value
 *   Basis-Syntax für Komponenten
 *
 * @syntax Component property value, property2 value2
 *   Mehrere Properties durch Komma getrennt
 *
 * @syntax Component vertical, horizontal
 *   Boolean-Properties ohne Wert (implizit true)
 *
 * @syntax Component "Text-Inhalt"
 *   String-Content für Text-Komponenten
 *
 * @syntax Component
 *   Child
 *   Verschachtelte Kinder via Indentation
 *
 * @internal ═══════════════════════════════════════════════════════════════════
 * @internal Die folgenden Abschnitte sind interne Implementierungsdetails
 * @internal und werden nicht in die Referenz-Dokumentation aufgenommen.
 * @internal ═══════════════════════════════════════════════════════════════════
 *
 * @internal PROPERTIES
 * @internal @syntax property value - Property mit Wert (v1 Inline-Syntax)
 * @internal @syntax booleanProp - Boolean ohne Wert = true
 * @internal @syntax property: value - Property mit Colon (Block-Syntax)
 *
 * @internal SPACING (v1 Inline-Syntax)
 * @internal @syntax pad 16 - Alle Seiten
 * @internal @syntax pad 16 8 - CSS-Shorthand → pad_u/d/l/r
 * @internal @syntax pad l 16 - Directional → pad_l
 * @internal @directions l=left, r=right, u/t=top, d/b=bottom
 * @internal @normalization t→u, b→d (intern immer u/d/l/r)
 *
 * @internal STATES (v1 Indentation-Syntax)
 * @internal @syntax state hover \n   bg #555 - Expliziter State
 * @internal @syntax hover \n   bg #555 - Impliziter State
 * @internal @system-states hover, focus, active, disabled
 * @internal @behavior-states highlighted, selected, expanded, collapsed, valid, invalid
 *
 * @internal EVENTS (v1 Inline-Syntax)
 * @internal @syntax onclick toggle - Einfache Action
 * @internal @syntax onclick show Dialog - Action mit Target
 * @internal @events onclick, onhover, onfocus, onblur, onchange, oninput, onload
 * @internal @keyboard onkeydown, onkeyup
 *
 * @internal ACTIONS
 * @internal @action toggle, show, hide, open, close, page, change, highlight, select, etc.
 * @internal @positions below, above, left, right, center
 * @internal @animations fade, scale, slide-up, slide-down, slide-left, slide-right
 *
 * @internal PROPERTY-NORMALISIERUNG
 * @internal Long-Form → Short-Form: padding→pad, background→bg, etc.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseBlockContent(ctx, node, baseIndent) → void
 *   Parst Block-Inhalt (Properties, States, Events) innerhalb eines Blocks
 *   Hauptfunktion für Block-Parsing
 *
 * @function isBlockStart(ctx) → boolean
 *   Prüft ob aktuelles Token einen Block startet
 *   Verwendet für Brace-Syntax Detection
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, StateDefinition, EventHandler, ActionStatement, ActionType, Expression } from './types'
import {
  normalizePropertyToShort,
  normalizeDirection,
  SYSTEM_STATES,
  BEHAVIOR_STATES,
  ACTION_KEYWORDS,
  POSITION_KEYWORDS,
  ANIMATION_KEYWORDS,
  KEY_MODIFIERS
} from '../dsl/properties'
import { expandCSSShorthand, CSS_COLOR_KEYWORDS } from './parser-utils'
import { parseInlineSpans, resolveSpanStyle } from './sugar/handlers/string-handler'
import { parseInlineConditional } from './component-parser/inline-properties'
import { isImageComponent, isInputComponent, isTextareaComponent } from './sugar/component-type-matcher'
import { INTERNAL_NODES } from '../constants'
import { parseExpression } from './expression-parser'

/**
 * Check if the parser is at the end of input.
 */
function isAtEnd(ctx: ParserContext): boolean {
  const token = ctx.current()
  return !token || token.type === 'EOF'
}

/**
 * @doc parseValue
 * @brief Parst einen Wert vom aktuellen Token
 * @input Token: NUMBER, COLOR, STRING, TOKEN_REF, KEYWORD, COMPONENT_NAME, PROPERTY
 * @output number | string | boolean | { type: 'token', name: string } | undefined
 * @example NUMBER "16" → 16
 * @example COLOR "#FF0000" → "#FF0000"
 * @example STRING "Hello" → "Hello"
 * @example TOKEN_REF "$primary" → { type: 'token', name: '$primary' }
 * @example KEYWORD "true" → true
 */
function parseValue(ctx: ParserContext): unknown {
  const token = ctx.current()
  if (!token) return undefined

  switch (token.type) {
    case 'NUMBER':
      ctx.advance()
      // Preserve percentage values as strings, convert numbers to integers
      return token.value.includes('%') ? token.value : Number(token.value)
    case 'COLOR':
      ctx.advance()
      return token.value
    case 'STRING':
      ctx.advance()
      return token.value
    case 'TOKEN_REF':
      ctx.advance()
      return { type: 'token', name: token.value }
    case 'KEYWORD':
      ctx.advance()
      // Convert boolean keywords to actual booleans
      if (token.value === 'true') return true
      if (token.value === 'false') return false
      return token.value
    case 'COMPONENT_NAME':
      // Could be a keyword value like 'center', 'horizontal'
      ctx.advance()
      // Convert boolean values to actual booleans
      if (token.value === 'true') return true
      if (token.value === 'false') return false
      return token.value
    case 'PROPERTY':
      // Could be a boolean property or value like 'true', 'false'
      ctx.advance()
      // Convert boolean values to actual booleans
      if (token.value === 'true') return true
      if (token.value === 'false') return false
      return token.value
    default:
      return undefined
  }
}

/**
 * Check if a property is a spacing property (pad, mar, padding, margin).
 */
function isSpacingProperty(name: string): boolean {
  return name === 'pad' || name === 'mar' || name === 'padding' || name === 'margin'
}

/**
 * @doc parseBlockSpacingProperty
 * @brief Parst Spacing-Properties (padding/margin) mit CSS-Shorthand und Richtungen
 * @input propName: "padding" | "margin" | "pad" | "mar"
 * @output Schreibt in target: pad/mar oder pad_u/pad_r/pad_d/pad_l
 *
 * @syntax padding 16           → { pad: 16 }
 * @syntax padding 16 8         → { pad_u: 16, pad_d: 16, pad_l: 8, pad_r: 8 }
 * @syntax padding 16 8 12 4    → { pad_u: 16, pad_r: 8, pad_d: 12, pad_l: 4 }
 * @syntax padding l 16         → { pad_l: 16 }
 * @syntax padding l-r 16       → { pad_l: 16, pad_r: 16 }
 * @syntax padding t-b 16       → { pad_u: 16, pad_d: 16 }
 *
 * @normalization t→u, b→d (top→up, bottom→down)
 */
function parseBlockSpacingProperty(ctx: ParserContext, target: Record<string, unknown>, propName: string): void {
  const prefix = propName === 'padding' ? 'pad' : propName === 'margin' ? 'mar' : propName

  // Check for directional syntax: padding l 16, padding l-r 16, padding t-b 16
  if (ctx.current()?.type === 'DIRECTION') {
    const dirToken = ctx.advance()
    const direction = dirToken.value // e.g., 'l', 'r', 'u', 'd', 'l-r', 'u-d', 't-b'

    // Get the value
    const value = ctx.current()?.type === 'NUMBER'
      ? Number(ctx.advance().value)
      : parseValue(ctx)

    if (value === undefined) return

    // Handle combined directions (l-r, u-d, t-b, etc.)
    if (direction.includes('-')) {
      const parts = direction.split('-')
      for (const dir of parts) {
        const normalizedDir = normalizeDirection(dir)
        target[`${prefix}_${normalizedDir}`] = value
      }
    } else {
      const normalizedDir = normalizeDirection(direction)
      target[`${prefix}_${normalizedDir}`] = value
    }
    return
  }

  // Collect numeric values for CSS shorthand
  const values: number[] = []
  while (ctx.current() &&
         ctx.current()!.type === 'NUMBER' &&
         values.length < 4) {
    values.push(Number(ctx.advance().value))
  }

  if (values.length === 0) {
    // No values found - try parsing a single value (could be token ref etc.)
    const value = parseValue(ctx)
    if (typeof value === 'number') {
      target[prefix] = value
    } else if (value !== undefined) {
      // Token reference or other value
      target[prefix] = value
    }
    return
  }

  // Apply CSS shorthand expansion
  if (values.length === 1) {
    // Single value - all sides
    target[prefix] = values[0]
  } else {
    // Multiple values - expand to directional properties
    const expanded = expandCSSShorthand(values)
    target[`${prefix}_u`] = expanded.u
    target[`${prefix}_r`] = expanded.r
    target[`${prefix}_d`] = expanded.d
    target[`${prefix}_l`] = expanded.l
  }
}

/**
 * @doc parseBlockBorderProperty
 * @brief Parst Border-Properties mit Direction, Width, Style und Color
 * @input Cursor nach 'bor:' (Colon bereits konsumiert)
 * @output Schreibt in target: bor oder bor_d/bor_l/etc. mit optionalem _style/_color
 *
 * @syntax bor: 1                → { bor: 1 }
 * @syntax bor: 1 #333           → { bor: 1, bor_color: '#333' }
 * @syntax bor: b 2              → { bor_d: 2 }
 * @syntax bor: b 2 transparent  → { bor_d: 2, bor_d_color: 'transparent' }
 * @syntax bor: b 2 #F00         → { bor_d: 2, bor_d_color: '#F00' }
 * @syntax bor: 2 dashed #333    → { bor: 2, bor_style: 'dashed', bor_color: '#333' }
 *
 * @normalization t→u, b→d (top→up, bottom→down)
 */
function parseBlockBorderProperty(ctx: ParserContext, target: Record<string, unknown>): void {
  // Check for directional syntax: bor: b 2, bor: l-r 1
  const directions: string[] = []
  while (ctx.current()?.type === 'DIRECTION') {
    const dirToken = ctx.advance()
    const direction = dirToken.value
    // Handle combined directions (l-r, t-b, etc.)
    if (direction.includes('-')) {
      directions.push(...direction.split('-').map(normalizeDirection))
    } else {
      directions.push(normalizeDirection(direction))
    }
  }

  // Parse width (NUMBER or TOKEN_REF)
  let width: number | { type: string; name: string } | undefined
  if (ctx.current()?.type === 'NUMBER') {
    width = Number(ctx.advance().value)
  } else if (ctx.current()?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    width = { type: 'token', name: tokenName }
  }

  // Parse optional style (BORDER_STYLE like 'solid', 'dashed', 'dotted')
  let style: string | undefined
  if (ctx.current()?.type === 'BORDER_STYLE') {
    style = ctx.advance().value
  }

  // Parse optional color (COLOR, TOKEN_REF, or CSS color keyword)
  let color: string | { type: string; name: string } | undefined
  if (ctx.current()?.type === 'COLOR') {
    color = ctx.advance().value
  } else if (ctx.current()?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    color = { type: 'token', name: tokenName }
  } else if (ctx.current()?.type === 'COMPONENT_NAME') {
    // Check for CSS color keywords like 'transparent', 'white', etc.
    const value = ctx.current()!.value.toLowerCase()
    if (CSS_COLOR_KEYWORDS.has(value)) {
      color = ctx.advance().value
    }
  }

  // Apply to properties
  if (directions.length > 0) {
    for (const dir of directions) {
      if (width !== undefined) {
        target[`bor_${dir}`] = width
      }
      if (style) target[`bor_${dir}_style`] = style
      if (color) target[`bor_${dir}_color`] = color
    }
  } else {
    if (width !== undefined) target['bor'] = width
    if (style) target['bor_style'] = style
    if (color) target['bor_color'] = color
  }
}

/**
 * @doc parseBlockProperty
 * @brief Parst eine einzelne Property im Block
 * @input Token PROPERTY am Cursor
 * @output Schreibt in target mit normalisiertem Property-Namen
 *
 * @syntax property: value      → { prop: value }
 * @syntax property value       → { prop: value } (ohne Colon)
 * @syntax booleanProp,         → { prop: true }
 * @syntax booleanProp          → { prop: true } (wenn nächstes Token Delimiter)
 *
 * @normalization padding→pad, background→bg, etc. (siehe PROPERTY_SHORT_FORMS)
 * @special Spacing-Properties (pad/mar) → parseBlockSpacingProperty
 */
function parseBlockProperty(ctx: ParserContext, target: Record<string, unknown>): void {
  const propToken = ctx.current()
  if (!propToken || propToken.type !== 'PROPERTY') return

  const propName = normalizePropertyToShort(propToken.value)
  ctx.advance() // property name

  // Check for colon - if present, always expect a value
  const hasColon = ctx.current()?.type === 'COLON'
  if (hasColon) {
    ctx.advance() // consume colon
  }

  // Check for boolean property (no colon and no value - next token indicates new statement)
  const nextToken = ctx.current()
  if (!hasColon && (
      !nextToken ||
      nextToken.type === 'COMMA' ||
      nextToken.type === 'BRACE_CLOSE' ||
      nextToken.type === 'PROPERTY' ||
      nextToken.type === 'NEWLINE' ||
      nextToken.type === 'EVENT' ||
      nextToken.type === 'STATE' ||
      nextToken.type === 'COMPONENT_NAME')) {
    // Boolean property without value
    target[propName] = true
    return
  }

  // Special handling for spacing properties (CSS shorthand support)
  if (isSpacingProperty(propName)) {
    parseBlockSpacingProperty(ctx, target, propName)
    return
  }

  // Special handling for border property
  // Syntax: bor: [direction] width [style] [color]
  // Examples: bor: 1, bor: b 2, bor: b 2 #333, bor: 2 dashed #333
  if (propName === 'bor') {
    parseBlockBorderProperty(ctx, target)
    return
  }

  // Parse value
  const value = parseValue(ctx)
  if (value !== undefined) {
    target[propName] = value
  }
}

/**
 * @doc parseBlockTokenRef
 * @brief Parst einen Token-Referenz mit Type-Suffix
 * @input Token TOKEN_REF am Cursor (z.B. "$primary-color", "$card-padding")
 * @output Schreibt in target mit inferiertem Property-Namen
 *
 * @syntax $primary-color     → { bg: { type: 'token', name: 'primary-color' } }
 * @syntax $card-padding      → { pad: { type: 'token', name: 'card-padding' } }
 * @syntax $text-size         → { size: { type: 'token', name: 'text-size' } }
 *
 * @suffixes
 * -color, -col       → bg (background)
 * -background, -bg   → bg
 * -padding, -pad     → pad
 * -margin, -mar      → mar
 * -radius, -rad      → rad
 * -gap               → g
 * -size              → size
 * -border, -bor      → bor
 * -border-color, -boc → boc
 * -opacity, -opa     → o
 */
function parseBlockTokenRef(ctx: ParserContext, target: Record<string, unknown>): void {
  const token = ctx.current()
  if (!token || token.type !== 'TOKEN_REF') return

  const tokenName = token.value
  ctx.advance()

  // Infer property from suffix
  const propName = inferPropertyFromSuffix(tokenName)

  if (propName) {
    target[propName] = { type: 'token', name: tokenName }
  }
}

/**
 * Infer property name from token suffix
 * e.g., "primary-color" → "bg", "card-padding" → "pad"
 */
function inferPropertyFromSuffix(tokenName: string): string | null {
  // Check suffixes from longest to shortest to avoid partial matches
  const suffixMap: [string, string][] = [
    ['-border-color', 'boc'],
    ['-background', 'bg'],
    ['-opacity', 'o'],
    ['-padding', 'pad'],
    ['-margin', 'mar'],
    ['-radius', 'rad'],
    ['-border', 'bor'],
    ['-color', 'bg'],  // -color typically means background color
    ['-size', 'size'],
    ['-gap', 'g'],
    ['-col', 'bg'],
    ['-bg', 'bg'],
    ['-pad', 'pad'],
    ['-mar', 'mar'],
    ['-rad', 'rad'],
    ['-bor', 'bor'],
    ['-boc', 'boc'],
    ['-opa', 'o'],
  ]

  for (const [suffix, prop] of suffixMap) {
    if (tokenName.endsWith(suffix)) {
      return prop
    }
  }

  return null
}

/**
 * @doc parseBlockState
 * @brief Parst einen expliziten State-Block mit 'state' Keyword (Brace-Syntax)
 * @input Token STATE/KEYWORD("state") am Cursor, erwartet BRACE_OPEN
 * @output Fügt StateDefinition zu node.states hinzu
 *
 * @syntax-brace state hover { bg #555 }
 * @syntax-brace state active { col #FFF, bg #3B82F6 }
 *
 * @note Für v1 Indentation-Syntax siehe state-parser.ts parseStateDefinition
 *
 * @states System: hover, focus, active, disabled
 * @states Behavior: highlighted, selected, expanded, collapsed, valid, invalid
 */
function parseBlockState(ctx: ParserContext, node: ASTNode): void {
  ctx.advance() // consume 'state' keyword

  // Get state name
  const nameToken = ctx.current()
  if (!nameToken) return
  const stateName = nameToken.value
  ctx.advance()

  // Expect BRACE_OPEN
  if (ctx.current()?.type !== 'BRACE_OPEN') return
  ctx.advance()

  // Parse state properties and child overrides
  const stateProps: Record<string, unknown> = {}
  const stateChildren: ASTNode[] = []
  let stateContent: string | undefined

  while (!isAtEnd(ctx)) {
    const token = ctx.current()
    if (!token || token.type === 'BRACE_CLOSE') break

    // Skip newlines, commas, and indentation tokens
    if (token.type === 'NEWLINE' || token.type === 'COMMA' || token.type === 'INDENT') {
      ctx.advance()
      continue
    }

    // String content in state (e.g., state off { background: #333, "Light Mode" })
    if (token.type === 'STRING') {
      stateContent = token.value
      ctx.advance()
      continue
    }

    // Parse property
    if (token.type === 'PROPERTY') {
      parseBlockProperty(ctx, stateProps)
      continue
    }

    // Child override in state (e.g., state collapsed { Content { hidden } })
    if (token.type === 'COMPONENT_NAME' && ctx.peek(1)?.type === 'BRACE_OPEN') {
      const childOverride = parseStateChildOverride(ctx)
      if (childOverride) {
        stateChildren.push(childOverride)
      }
      continue
    }

    // Unknown token, skip
    ctx.advance()
  }

  // Consume closing brace
  if (ctx.current()?.type === 'BRACE_CLOSE') {
    ctx.advance()
  }

  // If state has content, store it as _content property
  if (stateContent) {
    stateProps._content = stateContent
  }

  // Add to node.states
  if (!node.states) node.states = []
  const state: StateDefinition = {
    name: stateName,
    properties: stateProps as StateDefinition['properties'],
    children: stateChildren
  }
  node.states.push(state)
}

/**
 * Parse a child override inside a state block.
 * e.g., Content hidden or Icon "chevron-up"
 */
function parseStateChildOverride(ctx: ParserContext): ASTNode | null {
  const nameToken = ctx.current()
  if (!nameToken || nameToken.type !== 'COMPONENT_NAME') return null
  const childName = nameToken.value
  ctx.advance() // consume component name

  // Expect BRACE_OPEN
  if (ctx.current()?.type !== 'BRACE_OPEN') return null
  ctx.advance()

  const childProps: Record<string, unknown> = {}
  let childContent: string | undefined

  while (!isAtEnd(ctx)) {
    const token = ctx.current()
    if (!token || token.type === 'BRACE_CLOSE') break

    // Skip newlines, commas, and indentation tokens
    if (token.type === 'NEWLINE' || token.type === 'COMMA' || token.type === 'INDENT') {
      ctx.advance()
      continue
    }

    // String content
    if (token.type === 'STRING') {
      childContent = token.value
      ctx.advance()
      continue
    }

    // Boolean property without value (e.g., hidden, visible)
    if (token.type === 'PROPERTY') {
      const propName = token.value
      ctx.advance()

      // Check if next is COLON (property with value) or not (boolean property)
      if (ctx.current()?.type === 'COLON') {
        ctx.advance() // consume colon
        const value = parseValue(ctx)
        if (value !== undefined) {
          const normalized = normalizePropertyToShort(propName)
          childProps[normalized] = value
        }
      } else {
        // Boolean property
        const normalized = normalizePropertyToShort(propName)
        childProps[normalized] = true
      }
      continue
    }

    // Unknown token, skip
    ctx.advance()
  }

  // Consume closing brace
  if (ctx.current()?.type === 'BRACE_CLOSE') {
    ctx.advance()
  }

  return {
    type: 'component',
    name: childName,
    id: ctx.generateId(childName),
    properties: childProps as ASTNode['properties'],
    content: childContent,
    children: []
  }
}

/**
 * Check if a name is a known state name (system or behavior state).
 */
function isStateName(name: string): boolean {
  return SYSTEM_STATES.has(name) || BEHAVIOR_STATES.has(name)
}

/**
 * @doc parseImplicitBlockState
 * @brief Parst impliziten State-Block ohne 'state' Keyword (Brace-Syntax)
 * @input Token COMPONENT_NAME mit bekanntem State-Namen + BRACE_OPEN
 * @output Fügt StateDefinition zu node.states hinzu
 *
 * @syntax-brace hover { bg #555 }
 * @syntax-brace active { col #FFF }
 * @syntax-brace disabled { o 0.5 }
 *
 * @note Für v1 Indentation-Syntax siehe state-parser.ts parseBehaviorStateDefinition
 *
 * @requires State-Name muss in SYSTEM_STATES oder BEHAVIOR_STATES sein
 */
function parseImplicitBlockState(ctx: ParserContext, node: ASTNode): void {
  const nameToken = ctx.current()
  if (!nameToken) return
  const stateName = nameToken.value
  ctx.advance() // consume state name

  // Expect BRACE_OPEN
  if (ctx.current()?.type !== 'BRACE_OPEN') return
  ctx.advance()

  // Parse state properties and child overrides
  const stateProps: Record<string, unknown> = {}
  const stateChildren: ASTNode[] = []

  while (!isAtEnd(ctx)) {
    const token = ctx.current()
    if (!token || token.type === 'BRACE_CLOSE') break

    // Skip newlines, commas, and indentation tokens
    if (token.type === 'NEWLINE' || token.type === 'COMMA' || token.type === 'INDENT') {
      ctx.advance()
      continue
    }

    // Parse property
    if (token.type === 'PROPERTY') {
      parseBlockProperty(ctx, stateProps)
      continue
    }

    // Child override in state (e.g., collapsed { Content { hidden } })
    if (token.type === 'COMPONENT_NAME' && ctx.peek(1)?.type === 'BRACE_OPEN') {
      const childOverride = parseStateChildOverride(ctx)
      if (childOverride) {
        stateChildren.push(childOverride)
      }
      continue
    }

    // Unknown token, skip
    ctx.advance()
  }

  // Consume closing brace
  if (ctx.current()?.type === 'BRACE_CLOSE') {
    ctx.advance()
  }

  // Add to node.states
  if (!node.states) node.states = []
  const state: StateDefinition = {
    name: stateName,
    properties: stateProps as StateDefinition['properties'],
    children: stateChildren
  }
  node.states.push(state)
}

/**
 * @doc parseBlockEvent
 * @brief Parst einen Event-Handler (inline innerhalb Brace-Block)
 * @input Token EVENT am Cursor
 * @output Fügt EventHandler zu node.eventHandlers hinzu
 *
 * @syntax onclick toggle
 * @syntax onclick show Dialog
 * @syntax onclick open Dialog center fade 200
 * @syntax onhover highlight self
 * @syntax onkeydown escape close
 *
 * @note Innerhalb Brace-Blocks: onclick toggle (ohne Colon nach Event)
 *       Für v1 Block-Events mit Indentation siehe state-parser.ts parseEventHandler
 *
 * @events onclick, onhover, onfocus, onblur, onchange, oninput, onload
 * @keyboard onkeydown KEY, onkeyup KEY
 */
function parseBlockEvent(ctx: ParserContext, node: ASTNode): void {
  const eventToken = ctx.current()
  if (!eventToken || eventToken.type !== 'EVENT') return

  const eventName = eventToken.value
  ctx.advance() // consume event name

  if (!node.eventHandlers) node.eventHandlers = []
  const handler: EventHandler = {
    event: eventName,
    actions: [],
    line: eventToken.line
  }

  // Check for key after onkeydown/onkeyup: onkeydown escape: close
  if ((eventName === 'onkeydown' || eventName === 'onkeyup') &&
      ctx.current()?.type === 'COMPONENT_NAME') {
    const possibleKey = ctx.current()!.value.toLowerCase()
    if (KEY_MODIFIERS.has(possibleKey)) {
      handler.key = ctx.advance().value.toLowerCase()
    }
  }

  // Skip optional colon
  if (ctx.current()?.type === 'COLON') {
    ctx.advance()
  }

  // Check for debounce modifier: oninput debounce 300: filter Results
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value.toLowerCase() === 'debounce') {
    ctx.advance() // consume 'debounce'
    if (ctx.current()?.type === 'NUMBER') {
      handler.debounce = parseInt(ctx.advance().value, 10)
    }
  }

  // Check for delay modifier: onblur delay 200: hide Results
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value.toLowerCase() === 'delay') {
    ctx.advance() // consume 'delay'
    if (ctx.current()?.type === 'NUMBER') {
      handler.delay = parseInt(ctx.advance().value, 10)
    }
  }

  // Parse action(s)
  handler.actions = parseBlockActions(ctx)

  node.eventHandlers.push(handler)
}

/**
 * Parse one or more actions until end of statement.
 */
function parseBlockActions(ctx: ParserContext): ActionStatement[] {
  const actions: ActionStatement[] = []

  while (!isAtEnd(ctx)) {
    const token = ctx.current()
    // Stop at statement terminators (but NOT comma - comma chains actions)
    if (!token ||
        token.type === 'BRACE_CLOSE' ||
        token.type === 'NEWLINE') {
      break
    }

    // Skip commas between actions (action chaining: show Panel, alert "msg")
    if (token.type === 'COMMA') {
      ctx.advance()
      continue
    }

    // Parse action - action keywords or component names that might be actions
    if (token.type === 'ANIMATION_ACTION' ||
        token.type === 'COMPONENT_NAME' ||
        token.type === 'KEYWORD') {
      const actionName = token.value.toLowerCase()
      // Check if it's a known action keyword
      if (ACTION_KEYWORDS.has(actionName) ||
          token.type === 'ANIMATION_ACTION' ||
          actionName === 'toggle') {
        const action = parseBlockAction(ctx)
        if (action) actions.push(action)
        continue
      }
      // If COMPONENT_NAME is not an action keyword, it's likely a child component
      // e.g., onclick: toggle-state, Title { } - Title is NOT an action
      // Break to let parseBlockContent handle it
      if (token.type === 'COMPONENT_NAME') {
        break
      }
    }

    // Stop at tokens that shouldn't be consumed by action parsing
    // STRING, PROPERTY, EVENT, STATE should be handled by parseBlockContent
    if (token.type === 'STRING' ||
        token.type === 'PROPERTY' ||
        token.type === 'EVENT' ||
        token.type === 'STATE' ||
        token.type === 'TOKEN_REF') {
      break
    }

    // Skip truly unknown tokens (like stray colons)
    ctx.advance()
  }

  return actions
}

/**
 * @doc parseBlockAction
 * @brief Parst eine einzelne Action
 * @input Token mit Action-Name am Cursor
 * @output ActionStatement oder null
 *
 * @syntax toggle                    → { type: 'toggle' }
 * @syntax show Dialog               → { type: 'show', target: 'Dialog' }
 * @syntax show(Dialog)              → { type: 'show', target: 'Dialog' }
 * @syntax open Dialog center        → { type: 'open', target: 'Dialog', position: 'center' }
 * @syntax open Dialog fade 200      → { type: 'open', target: 'Dialog', animation: 'fade', duration: 200 }
 * @syntax change self to active     → { type: 'change', target: 'self', toState: 'active' }
 *
 * @actions toggle, show, hide, open, close, page, change, assign, alert
 * @actions highlight, select, deselect, focus, filter, validate, reset
 * @positions below, above, left, right, center
 * @animations fade, scale, slide-up, slide-down, slide-left, slide-right
 */
function parseBlockAction(ctx: ParserContext): ActionStatement | null {
  const actionToken = ctx.current()
  if (!actionToken) return null

  const actionName = actionToken.value.toLowerCase()
  ctx.advance() // consume action name

  let target: string | undefined
  let position: 'below' | 'above' | 'left' | 'right' | 'center' | undefined
  let animation: string | undefined
  let duration: number | undefined
  let toState: string | undefined
  // Special handling for 'alert': alert "message"
  if (actionName === 'alert' && ctx.current()?.type === 'STRING') {
    const alertMessage = ctx.advance().value
    return {
      type: 'alert',
      target: alertMessage
    }
  }

  // Special handling for 'assign': assign $var to expr
  if (actionName === 'assign' && ctx.current()?.type === 'TOKEN_REF') {
    const assignTarget = ctx.advance().value
    let assignValue: Expression | string | undefined
    // Expect 'to' keyword
    if (ctx.current()?.value?.toLowerCase() === 'to') {
      ctx.advance() // consume 'to'
      // Parse the expression (handles $event.value, $count + 1, etc.)
      const expr = parseExpression(ctx)
      if (expr) {
        assignValue = expr
      } else {
        // Fallback: collect tokens as string
        const exprParts: string[] = []
        while (!isAtEnd(ctx)) {
          const token = ctx.current()
          if (!token ||
              token.type === 'COMMA' ||
              token.type === 'BRACE_CLOSE' ||
              token.type === 'NEWLINE') {
            break
          }
          exprParts.push(token.value)
          ctx.advance()
        }
        assignValue = exprParts.join(' ')
      }
    }
    return {
      type: 'assign',
      target: assignTarget,
      value: assignValue
    }
  }

  // Check for parenthesized target: show(Dialog) or alert("message")
  if (ctx.current()?.type === 'PAREN_OPEN') {
    ctx.advance() // consume (
    if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'KEYWORD') {
      target = ctx.advance().value
    } else if (ctx.current()?.type === 'STRING') {
      // Handle string arguments like alert("message")
      target = ctx.advance().value
    }
    if (ctx.current()?.type === 'PAREN_CLOSE') {
      ctx.advance() // consume )
    }
  }
  // Or space-separated target: show Dialog
  else if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'KEYWORD') {
    // Check if it's not a position/animation keyword first
    const nextValue = ctx.current()!.value.toLowerCase()
    if (!POSITION_KEYWORDS.has(nextValue) && !ANIMATION_KEYWORDS.has(nextValue)) {
      target = ctx.advance().value
    }
  }

  // For 'change' action: change self to active
  if (actionName === 'change' && ctx.current()?.value === 'to') {
    ctx.advance() // consume 'to'
    if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'KEYWORD') {
      toState = ctx.advance().value
    }
  }

  // Parse optional position (for open/show)
  // Note: 'center' is tokenized as PROPERTY, other position keywords as COMPONENT_NAME
  if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'KEYWORD' || ctx.current()?.type === 'PROPERTY') {
    const posValue = ctx.current()!.value.toLowerCase()
    if (POSITION_KEYWORDS.has(posValue)) {
      position = posValue as typeof position
      ctx.advance()
    }
  }

  // Parse optional animation
  if (ctx.current()?.type === 'ANIMATION' ||
      (ctx.current()?.type === 'COMPONENT_NAME' && ANIMATION_KEYWORDS.has(ctx.current()!.value.toLowerCase()))) {
    animation = ctx.advance().value
  }

  // Parse optional duration (number)
  if (ctx.current()?.type === 'NUMBER') {
    duration = Number(ctx.advance().value)
  }

  // Map action name to ActionType
  const actionType = mapActionNameToType(actionName)
  if (!actionType) return null

  const action: ActionStatement = {
    type: actionType
  }

  if (target) action.target = target
  if (toState) action.toState = toState
  if (position) action.position = position
  if (animation) action.animation = animation
  if (duration) action.duration = duration

  return action
}

/**
 * Map an action name string to an ActionType.
 */
function mapActionNameToType(name: string): ActionType | null {
  const mapping: Record<string, ActionType> = {
    'toggle': 'toggle',
    'open': 'open',
    'close': 'close',
    'show': 'show',
    'hide': 'hide',
    'page': 'page',
    'change': 'change',
    'assign': 'assign',
    'alert': 'alert',
    'highlight': 'highlight',
    'select': 'select',
    'deselect': 'deselect',
    'clear-selection': 'clear-selection',
    'filter': 'filter',
    'focus': 'focus',
    'activate': 'activate',
    'deactivate': 'deactivate',
    'deactivate-siblings': 'deactivate-siblings',
    'toggle-state': 'toggle-state',
    'validate': 'validate',
    'reset': 'reset'
  }
  return mapping[name] || null
}

/**
 * Parse a nested child component: ChildName prop value
 *
 * Delegates to the passed parseComponent callback to ensure proper
 * template registration and inheritance handling.
 */
function parseBlockChild(ctx: ParserContext, parseComponent: (ctx: ParserContext, indent: number) => ASTNode | null): ASTNode | null {
  // Use the passed parseComponent function to properly handle:
  // - Template registration (first usage defines)
  // - Template inheritance (subsequent usages inherit)
  // - Named instances, library components, etc.
  return parseComponent(ctx, 0)
}

/**
 * @doc parseBlockContent
 * @brief Parst den Inhalt eines Brace-Blocks { ... }
 * @input ctx am BRACE_OPEN (bereits konsumiert), node zum Befüllen
 * @output Befüllt node.properties, node.content, node.children, node.states, node.eventHandlers
 *
 * @syntax-brace Button { pad 12, bg #3B82F6, "Click" }
 * @syntax-brace Card { state hover { bg #555 } }
 * @syntax-brace Panel { onclick toggle }
 *
 * @handles STRING → node.content
 * @handles PROPERTY → parseBlockProperty
 * @handles STATE → parseBlockState
 * @handles EVENT → parseBlockEvent
 * @handles COMPONENT_NAME + isStateName + BRACE_OPEN → parseImplicitBlockState
 * @handles COMPONENT_NAME → parseBlockChild
 *
 * @note Diese Funktion parst Brace-Syntax.
 *       Für v1 siehe component-parser/inline-properties.ts
 *
 * @export Wird von component-parser verwendet
 */
export function parseBlockContent(
  ctx: ParserContext,
  node: ASTNode,
  parseComponent?: (ctx: ParserContext, indent: number) => ASTNode | null
): void {
  while (!isAtEnd(ctx)) {
    const token = ctx.current()
    if (!token || token.type === 'BRACE_CLOSE') break

    // Skip newlines, commas, and indentation tokens
    if (token.type === 'NEWLINE' || token.type === 'COMMA' || token.type === 'INDENT') {
      ctx.advance()
      continue
    }

    // Dimension shorthand: first 1-2 numbers become width/height
    // Example: Box 300 400 → width 300, height 400
    if (token.type === 'NUMBER' && node.properties.w === undefined) {
      node.properties.w = parseInt(ctx.advance().value, 10)
      // Check for second number (height)
      if (ctx.current()?.type === 'NUMBER') {
        node.properties.h = parseInt(ctx.advance().value, 10)
      }
      continue
    }

    // String content with inline span support
    // Syntax: "This is *important*:bold and *emphasized*:italic"
    // Note: Link strings become visible text (href must be explicit)
    if (token.type === 'STRING') {
      // Image primitive: string becomes src
      if (isImageComponent(node)) {
        node.properties.src = token.value
        ctx.advance()
        continue
      }

      // Input/Textarea primitive: string becomes placeholder
      if (isInputComponent(node) || isTextareaComponent(node)) {
        node.properties.placeholder = token.value
        ctx.advance()
        continue
      }

      // Parse inline spans from the string
      const spans = parseInlineSpans(token.value)

      // If no styled spans, just set content directly
      if (spans.length === 1 && !spans[0].style) {
        // Check for string concatenation: "text" + $variable
        const nextToken = ctx.peek(1)
        if (nextToken?.type === 'ARITHMETIC' && nextToken?.value === '+') {
          // Use parseExpression to get the full expression including concatenation
          const expr = parseExpression(ctx)
          if (expr) {
            node.contentExpression = expr
            continue
          }
        }
        // No concatenation - just set content directly
        node.content = token.value
        ctx.advance()
        continue
      }

      // Create _text children for each span
      for (const span of spans) {
        const spanProperties: Record<string, unknown> = span.style
          ? resolveSpanStyle(span.style, ctx)
          : {}

        const textNode: ASTNode = {
          type: 'component',
          name: INTERNAL_NODES.TEXT,
          id: ctx.generateId('text'),
          properties: spanProperties,
          content: span.text,
          children: [],
          line: token.line,
          column: token.column
        }
        node.children.push(textNode)
      }
      ctx.advance()
      continue
    }

    // Property
    if (token.type === 'PROPERTY') {
      parseBlockProperty(ctx, node.properties)
      continue
    }

    // Token reference with type suffix: $primary-color, $card-padding, etc.
    // The suffix infers the property: -color → color, -padding → padding, etc.
    if (token.type === 'TOKEN_REF') {
      parseBlockTokenRef(ctx, node.properties)
      continue
    }

    // State block with explicit 'state' keyword
    if (token.type === 'STATE' || (token.type === 'KEYWORD' && token.value === 'state')) {
      parseBlockState(ctx, node)
      continue
    }

    // Event handler: onclick, onhover, etc.
    if (token.type === 'EVENT') {
      parseBlockEvent(ctx, node)
      continue
    }

    // Inline conditional: if $cond then property: value else property: value2
    // This handles both property conditionals and content conditionals
    if (token.type === 'CONTROL' && token.value === 'if') {
      parseInlineConditional(ctx, node)
      continue
    }

    // Check for implicit state block: hover { }, active { }, etc.
    // Must be COMPONENT_NAME that is a state name followed by BRACE_OPEN
    if (token.type === 'COMPONENT_NAME' &&
        isStateName(token.value) &&
        ctx.peek(1)?.type === 'BRACE_OPEN') {
      parseImplicitBlockState(ctx, node)
      continue
    }

    // Active state indicator: Section { collapsed ... } sets activeState
    // Must be COMPONENT_NAME that matches a defined state on this component's template
    // and is NOT followed by BRACE_OPEN (which would be an implicit state block)
    if (token.type === 'COMPONENT_NAME' && ctx.peek(1)?.type !== 'BRACE_OPEN') {
      const template = ctx.registry.get(node.name)
      if (template?.states) {
        const matchingState = template.states.find(s => s.name === token.value && !s.category)
        if (matchingState) {
          node.activeState = token.value
          ctx.advance()
          continue
        }
      }
    }

    // List item: - Component creates new instance (not modifying existing)
    // Mark with _isListItem so validation doesn't flag duplicates
    if (token.type === 'LIST_ITEM') {
      ctx.advance() // consume '-'
      const child = parseBlockChild(ctx, parseComponent || (() => null))
      if (child) {
        child._isListItem = true
        node.children.push(child)
      }
      continue
    }

    // Nested component or slot definition
    if (token.type === 'COMPONENT_NAME' || token.type === 'COMPONENT_DEF') {
      const child = parseBlockChild(ctx, parseComponent || (() => null))
      if (child) {
        node.children.push(child)
      }
      continue
    }

    // Unknown token, skip
    ctx.advance()
  }
}

/**
 * Check if the current position has a brace block opening.
 */
export function isBlockStart(ctx: ParserContext): boolean {
  return ctx.current()?.type === 'BRACE_OPEN'
}
