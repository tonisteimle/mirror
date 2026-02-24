/**
 * @module expression-parser
 * @description Expression & Value Parser - Parst Werte und Ausdrücke
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPRESSIONS-REFERENZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst Literal-Werte, Variable, Property-Access und Binary-Expressions
 *
 * @types
 *   - Literal Values: Numbers, Strings, Booleans, Colors
 *   - Variables: $varName, $obj.prop
 *   - Component Properties: Email.value, Submit.disabled
 *   - Binary Expressions: $count + 1, $x * 2, $y / 3
 *   - Unary Expressions: not $flag
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LITERAL-WERTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax NUMBER "42" → 42
 *   Ganzzahlen und Dezimalzahlen
 *   Beispiel: 16, 1.5, 0.5
 *
 * @syntax STRING "Hello" → "Hello"
 *   Text in Anführungszeichen
 *   Beispiel: "Click me", "Welcome"
 *
 * @syntax COLOR "#FF0000" → "#FF0000"
 *   Hex-Farben mit optionalem Alpha
 *   Beispiel: #3B82F6, #3B82F680
 *
 * @syntax BOOLEAN true/false → true/false
 *   Boolean-Werte
 *   Beispiel: true, false
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARIABLEN-REFERENZEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax $varName
 *   Einfache Variable
 *   Beispiel: $count, $isActive, $primary
 *   Type: { type: 'variable', name: 'count' }
 *
 * @syntax $obj.prop
 *   Property-Access auf Objekt
 *   Beispiel: $user.name, $task.done
 *   Type: { type: 'property_access', path: ['user', 'name'] }
 *
 * @syntax $obj.nested.prop
 *   Mehrfach verschachtelte Properties
 *   Beispiel: $data.items.length
 *   Type: { type: 'property_access', path: ['data', 'items', 'length'] }
 *
 * @token-suffix Auto-Inference
 *   $primary-color → Inferred as background color
 *   $heading-size → Inferred as font-size
 *   $card-padding → Inferred as padding
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPONENT-PROPERTY-ACCESS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax ComponentName.property
 *   Zugriff auf Component-Property zur Laufzeit
 *   Beispiel: Email.value, Submit.disabled, Panel.visible
 *   Type: { type: 'component_property', componentName: 'Email', propertyName: 'value' }
 *
 * @common-properties
 *   .value         Input/Textarea Wert
 *   .disabled      Button/Input disabled state
 *   .visible       Visibility state
 *   .checked       Checkbox/Switch state
 *   .focus         Focus state
 *   .open          Dialog/Overlay state
 *   .text          Text content
 *
 * @usage if Email.value page Dashboard
 * @usage Submit.disabled = true
 * @usage Panel.visible = false
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BINARY-EXPRESSIONS (Arithmetic)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @operators +, -, *, /
 *   Mathematische Operatoren
 *
 * @syntax $count + 1
 *   Addition
 *   Type: { type: 'binary', operator: '+', left: $count, right: 1 }
 *
 * @syntax $count - 1
 *   Subtraktion
 *
 * @syntax $price * 2
 *   Multiplikation
 *
 * @syntax $total / 100
 *   Division
 *
 * @example assign $count to $count + 1
 * @example assign $total to $price * $quantity
 * @example assign $average to $sum / $count
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UNARY-EXPRESSIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax not $flag
 *   Logische Negation
 *   Type: { type: 'unary', operator: 'not', operand: $flag }
 *
 * @example if not $isLoggedIn show LoginButton
 * @example if not $task.done show Reminder
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPRESSION-TYPEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type literal
 *   { type: 'literal', value: number | string | boolean }
 *   Konstanter Wert
 *
 * @type variable
 *   { type: 'variable', name: string }
 *   Einfache Variable $name
 *
 * @type property_access
 *   { type: 'property_access', path: string[] }
 *   Objekt-Property $obj.prop
 *
 * @type component_property
 *   { type: 'component_property', componentName: string, propertyName: string }
 *   Component-Property Email.value
 *
 * @type binary
 *   { type: 'binary', operator: '+' | '-' | '*' | '/', left: Expression, right: Expression }
 *   Binäre Operation $a + $b
 *
 * @type unary
 *   { type: 'unary', operator: 'not', operand: Expression }
 *   Unäre Operation not $flag
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERWENDUNG IN DSL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @context if-Conditions
 *   if $count > 0 then show Badge
 *   if Email.value page Dashboard
 *
 * @context assign-Actions
 *   assign $count to $count + 1
 *   assign $total to $price * $quantity
 *
 * @context Property-Values
 *   Button if $active then bg #3B82F6 else bg #333
 *   Badge if $count > 0 then #10B981 else #666
 *
 * @context Data-Binding
 *   Text $user.name
 *   Icon if $task.done then "check" else "circle"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ParserContext } from './parser-context'
import type { Expression } from './types'

/**
 * @doc parseValue
 * @brief Parst einen Literal-Wert vom aktuellen Token
 * @input Token: NUMBER, STRING, COLOR, TOKEN_REF, COMPONENT_NAME
 * @output number | string | boolean | null
 *
 * @syntax NUMBER "42" → 42
 *   Ganzzahlen: 16, 42, 100
 *   Dezimalzahlen: 1.5, 0.5, 2.75
 *   Verwendet parseFloat für Dezimal-Unterstützung
 *   Ganzzahlen werden als Integer zurückgegeben
 *
 * @syntax STRING "Hello" → "Hello"
 *   Text in Anführungszeichen
 *   Beispiel: "Click me", "Welcome to Mirror"
 *
 * @syntax COLOR "#FF0000" → "#FF0000"
 *   Hex-Farben (6 oder 8 Zeichen)
 *   Beispiel: #3B82F6, #3B82F680 (mit Alpha)
 *
 * @syntax TOKEN_REF "$primary" → "$primary"
 *   Variable-Reference als String
 *   Wird später vom Token-Resolver aufgelöst
 *   Beispiel: $count → "$count", $primary-color → "$primary-color"
 *
 * @syntax COMPONENT_NAME "true" → true
 * @syntax COMPONENT_NAME "false" → false
 *   Boolean-Keywords als Boolean-Werte
 *   Andere COMPONENT_NAMEs werden als String zurückgegeben
 *
 * @return Wert oder null wenn kein gültiger Token
 *
 * @used-by Property-Parser, Conditional-Parser, Action-Parser
 */
export function parseValue(ctx: ParserContext): string | number | boolean | null {
  const token = ctx.current()
  if (!token) return null

  if (token.type === 'NUMBER') {
    ctx.advance()
    // Use parseFloat to handle decimal numbers like 0.5
    const num = parseFloat(token.value)
    // Return as integer if it's a whole number, otherwise keep as float
    return Number.isInteger(num) ? Math.floor(num) : num
  }
  if (token.type === 'STRING') {
    ctx.advance()
    return token.value
  }
  if (token.type === 'COLOR') {
    ctx.advance()
    return token.value
  }
  if (token.type === 'TOKEN_REF') {
    // Token reference like $primary - resolve via context or return as reference
    ctx.advance()
    // Return as $name string - will be resolved by token resolver
    return `$${token.value}`
  }
  if (token.type === 'COMPONENT_NAME') {
    // Could be true, false, or a variable name
    if (token.value === 'true') {
      ctx.advance()
      return true
    }
    if (token.value === 'false') {
      ctx.advance()
      return false
    }
    // Variable reference - return as string
    ctx.advance()
    return token.value
  }
  return null
}

/**
 * @doc parseExpression
 * @brief Parst einen kompletten Expression (Variable, Binary, Unary, Literal, Component-Property)
 * @input Token-Stream am aktuellen Position
 * @output Expression-Object oder null
 *
 * ───────────────────────────────────────────────────────────────────────────
 * VARIABLE-EXPRESSIONS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * @syntax $varName
 *   Einfache Variable
 *   Input: TOKEN_REF "count"
 *   Output: { type: 'variable', name: 'count' }
 *
 * @syntax $obj.prop
 *   Property-Access (Split am Punkt)
 *   Input: TOKEN_REF "user.name"
 *   Output: { type: 'property_access', path: ['user', 'name'] }
 *
 * @syntax $obj.nested.prop
 *   Mehrfach verschachtelt
 *   Input: TOKEN_REF "data.items.length"
 *   Output: { type: 'property_access', path: ['data', 'items', 'length'] }
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BINARY-EXPRESSIONS (Arithmetic)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * @syntax $count + 1
 *   Input: TOKEN_REF "count", ARITHMETIC "+", NUMBER "1"
 *   Output: {
 *     type: 'binary',
 *     operator: '+',
 *     left: { type: 'variable', name: 'count' },
 *     right: { type: 'literal', value: 1 }
 *   }
 *
 * @operators +, -, *, /
 *   Addition, Subtraktion, Multiplikation, Division
 *
 * @recursion Right-Side ist parseExpression (rekursiv)
 *   Erlaubt: $a + $b, $a + 1, 42 + $x
 *
 * ───────────────────────────────────────────────────────────────────────────
 * UNARY-EXPRESSIONS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * @syntax not $flag
 *   Input: CONTROL "not", TOKEN_REF "flag"
 *   Output: {
 *     type: 'unary',
 *     operator: 'not',
 *     operand: { type: 'variable', name: 'flag' }
 *   }
 *
 * @example if not $isLoggedIn show LoginButton
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LITERAL-EXPRESSIONS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * @syntax 42
 *   Input: NUMBER "42"
 *   Output: { type: 'literal', value: 42 }
 *   Arithmetic-Support: 42 + 1, $x * 2
 *
 * @syntax "Hello"
 *   Input: STRING "Hello"
 *   Output: { type: 'literal', value: "Hello" }
 *
 * @syntax true / false
 *   Input: COMPONENT_NAME "true"
 *   Output: { type: 'literal', value: true }
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COMPONENT-PROPERTY-EXPRESSIONS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * @syntax Email.value
 *   Input: COMPONENT_NAME "Email.value"
 *   Split: ["Email", "value"]
 *   Output: {
 *     type: 'component_property',
 *     componentName: 'Email',
 *     propertyName: 'value'
 *   }
 *
 * @syntax Submit.disabled
 *   Component-Name + Property-Name
 *   Wird zur Laufzeit aufgelöst
 *
 * @common Email.value, Submit.disabled, Panel.visible, Checkbox.checked
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PARSE-REIHENFOLGE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1. Unary: not $flag
 * 2. Variables: $count → Variable oder Property-Access
 * 3. Arithmetic: Check nach Binary-Operator (+, -, *, /)
 * 4. Literals: Number, String, Boolean
 * 5. Component-Property: Email.value (enthält Punkt)
 *
 * @return Expression-Object oder null
 *
 * @used-by Conditional-Parser, Assign-Actions, Data-Binding
 */
export function parseExpression(ctx: ParserContext): Expression | null {
  const token = ctx.current()
  if (!token) return null

  // Handle 'not' operator (unary negation)
  if (token.type === 'CONTROL' && token.value === 'not') {
    ctx.advance() // consume 'not'
    const operand = parseExpression(ctx)
    if (operand) {
      return { type: 'unary', operator: 'not', operand }
    }
    return null
  }

  // Variable reference with optional property access
  if (token.type === 'TOKEN_REF') {
    const value = ctx.advance().value
    const parts = value.split('.')

    const expr: Expression = parts.length > 1
      ? { type: 'property_access', path: parts }
      : { type: 'variable', name: parts[0] }

    // Check for arithmetic operator
    if (ctx.current()?.type === 'ARITHMETIC') {
      const operator = ctx.advance().value as '+' | '-' | '*' | '/'
      const right = parseExpression(ctx)
      if (right) {
        return { type: 'binary', operator, left: expr, right }
      }
    }
    return expr
  }

  // Literal number
  if (token.type === 'NUMBER') {
    const value = parseInt(ctx.advance().value, 10)
    const expr: Expression = { type: 'literal', value }

    // Check for arithmetic operator
    if (ctx.current()?.type === 'ARITHMETIC') {
      const operator = ctx.advance().value as '+' | '-' | '*' | '/'
      const right = parseExpression(ctx)
      if (right) {
        return { type: 'binary', operator, left: expr, right }
      }
    }
    return expr
  }

  // Literal string (with optional concatenation)
  if (token.type === 'STRING') {
    const value = ctx.advance().value
    const expr: Expression = { type: 'literal', value }

    // Check for string concatenation with +
    if (ctx.current()?.type === 'ARITHMETIC' && ctx.current()?.value === '+') {
      const operator = ctx.advance().value as '+'
      const right = parseExpression(ctx)
      if (right) {
        return { type: 'binary', operator, left: expr, right }
      }
    }
    return expr
  }

  // Boolean literals
  if (token.type === 'COMPONENT_NAME' && (token.value === 'true' || token.value === 'false')) {
    return { type: 'literal', value: ctx.advance().value === 'true' }
  }

  // Component property access: ComponentName.property (e.g., Email.value)
  // This is handled at parse time by looking for a COMPONENT_NAME that contains a dot
  // The lexer doesn't split it, so we handle it here
  if (token.type === 'COMPONENT_NAME' && token.value.includes('.')) {
    const value = ctx.advance().value
    const [componentName, ...propertyParts] = value.split('.')
    const propertyName = propertyParts.join('.')
    return {
      type: 'component_property',
      componentName,
      propertyName
    }
  }

  return null
}
