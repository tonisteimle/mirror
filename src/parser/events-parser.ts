/**
 * @module events-parser
 * @description Centralized Events Block Parser - Parst das zentralisierte events{} Block
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX-REFERENZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax events
 * @syntax   ComponentName event
 * @syntax     action
 *   Zentralisierter Events-Block für alle Event-Handler
 *   Beispiel:
 *     events
 *       Email onchange
 *         Error.visible = false
 *       Submit onclick
 *         page Dashboard
 *
 * @purpose Trennung von Layout und Behavior
 *   - Layout/Struktur im Haupt-Code
 *   - Alle Event-Handler zentral im events{} Block
 *   - Referenziert benannte Instanzen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EVENT HANDLER SYNTAX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax ComponentName onclick
 * @syntax   action Target
 *   Basis Event-Handler auf benannte Instanz
 *   Beispiel:
 *     SaveBtn onclick
 *       show SuccessMsg
 *
 * @syntax ComponentName onkeydown KEY
 * @syntax   action
 *   Event mit Keyboard-Modifier
 *   Beispiel:
 *     SearchInput onkeydown escape
 *       close Dropdown
 *     SearchInput onkeydown enter
 *       submit Form
 *
 * @syntax ComponentName onclick-outside
 * @syntax   action
 *   Special Events (onclick-outside)
 *   Beispiel:
 *     Menu onclick-outside
 *       close self
 *
 * @events Standard Events
 *   onclick, onhover, onfocus, onblur, onchange, oninput, onload
 *
 * @events Keyboard Events
 *   onkeydown KEY, onkeyup KEY
 *   Keys: escape, enter, tab, space, arrow-up, arrow-down, arrow-left, arrow-right,
 *         backspace, delete, home, end
 *
 * @events Special Events
 *   onclick-outside (Click außerhalb der Komponente)
 *   onfill, oncomplete, onempty (für Segment Input)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PROPERTY ASSIGNMENTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Component.property = value
 *   Direkte Property-Zuweisung
 *   Beispiel:
 *     Email.value = "test@example.com"
 *     Submit.disabled = true
 *     Error.visible = false
 *
 * @syntax Component.property = $variable
 *   Token-Referenz als Wert
 *   Beispiel:
 *     Counter.text = $count
 *
 * @syntax Component.property = Expression
 *   Expression als Wert
 *   Beispiel:
 *     Counter.text = $count + 1
 *     Panel.opacity = 0.5
 *
 * @properties Unterstützte Properties
 *   .value          Input/Textarea Wert
 *   .visible        Sichtbarkeit (true/false)
 *   .disabled       Deaktiviert-Status (true/false)
 *   .text           Text-Inhalt
 *   .label          Button/Label Text
 *   .opacity        Transparenz (0-1)
 *   .checked        Checkbox/Switch Status (true/false)
 *   .open/.close    Dialog/Overlay Status
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CONDITIONALS IN EVENTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax if condition
 * @syntax   action
 *   Einfache Conditional
 *   Beispiel:
 *     if Email.value
 *       page Dashboard
 *
 * @syntax if condition
 * @syntax   thenAction
 * @syntax else
 * @syntax   elseAction
 *   Conditional mit else-Block
 *   Beispiel:
 *     if Email.value and Password.value
 *       Submit.label = "Logging in..."
 *       page Dashboard
 *     else
 *       Error.visible = true
 *
 * @operators Comparison Operators
 *   ==, !=, >, <, >=, <=
 *   Beispiel: if $count > 5
 *
 * @operators Logical Operators
 *   and, or, not
 *   Beispiel: if Email.value and not Password.value
 *
 * @operators Arithmetic Operators
 *   +, -, *, /
 *   Beispiel: if $count + 1 > 10
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MULTIPLE ACTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax ComponentName event
 * @syntax   action1
 * @syntax   action2
 * @syntax   action3
 *   Mehrere Actions durch Indentation
 *   Beispiel:
 *     SaveBtn onclick
 *       SaveBtn.disabled = true
 *       SaveBtn.label = "Saving..."
 *       show Spinner
 *       hide Form
 *
 * @indent 2 Spaces pro Level
 *   Basis-Indent (ComponentName event): 2 spaces
 *   Actions: 4 spaces
 *   Nested conditions: 6 spaces
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTION KEYWORDS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @action toggle            Toggle-State wechseln
 * @action show Target       Element anzeigen
 * @action hide Target       Element verstecken
 * @action open Target       Overlay/Dialog öffnen (mit Position/Animation)
 * @action close             Overlay/Dialog schließen
 * @action page Target       Zu Seite wechseln
 * @action assign $var to X  Variable zuweisen
 * @action alert "msg"       Alert anzeigen
 * @action highlight X       Element hervorheben
 * @action select X          Element auswählen
 * @action deselect X        Auswahl aufheben
 * @action clear-selection   Alle Auswahlen aufheben
 * @action filter X          Liste filtern
 * @action focus X           Fokus setzen
 * @action activate X        Element aktivieren
 * @action deactivate X      Element deaktivieren
 * @action deactivate-siblings   Geschwister deaktivieren
 * @action toggle-state      State togglen
 * @action validate X        Formular validieren
 * @action reset X           Formular zurücksetzen
 * @action change self to X  State ändern
 *
 * @positions below, above, left, right, center
 * @animations fade, scale, slide-up, slide-down, slide-left, slide-right
 * @targets self, next, prev, first, last, highlighted, selected
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VOLLSTÄNDIGES BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * // Layout/Struktur
 * LoginForm vertical gap 16
 *   Input Email: "Enter email" type email
 *   Input Password: "Password" type password
 *   Button Submit: background #3B82F6 "Login"
 *   Text Error: hidden color #EF4444 "Invalid credentials"
 *
 * // Behavior (zentralisiert)
 * events
 *   Email onchange
 *     Error.visible = false
 *
 *   Password onchange
 *     Error.visible = false
 *
 *   Submit onclick
 *     if Email.value and Password.value
 *       Submit.disabled = true
 *       Submit.label = "Logging in..."
 *       page Dashboard
 *     else
 *       Error.visible = true
 *       Error.text = "Please fill in all fields"
 *
 *   Email onkeydown enter
 *     focus Password
 *
 *   Password onkeydown enter
 *     if Email.value and Password.value
 *       page Dashboard
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ParserContext } from './parser-context'
import type {
  CentralizedEventHandler,
  ActionStatement,
  Conditional
} from './types'
import { parseExpression } from './expression-parser'
import { parseCondition } from './condition-parser'
import { parseAction } from './state-parser'
import { ACTION_KEYWORDS, KEY_MODIFIERS } from '../dsl/properties'

/**
 * @doc parseEventsBlock
 * @brief Parst den zentralisierten events{} Block
 * @input Token EVENTS am Cursor
 * @output Array von CentralizedEventHandler
 *
 * @syntax events
 * @syntax   ComponentName event
 * @syntax     action
 *
 * @example
 *   events
 *     Email onchange
 *       Error.visible = false
 *     Submit onclick
 *       if Email.value and Password.value
 *         page Dashboard
 *
 * @structure
 *   1. Consume EVENTS token
 *   2. Skip NEWLINE
 *   3. Parse indented event handlers (parseCentralizedEventHandler)
 *   4. Stop bei Indent = 0 oder EOF
 *
 * @export Wird von parser.ts verwendet
 */
export function parseEventsBlock(ctx: ParserContext): CentralizedEventHandler[] {
  const handlers: CentralizedEventHandler[] = []

  // Current token should be EVENTS
  if (ctx.current()?.type !== 'EVENTS') return handlers
  ctx.advance() // consume 'events'

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse event handlers (indented lines)
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > 0) {
        ctx.advance() // consume indent

        // Parse: ComponentName event
        // e.g., Email onchange, Submit onclick
        if (ctx.current()?.type === 'COMPONENT_NAME') {
          const handler = parseCentralizedEventHandler(ctx, indent)
          if (handler) {
            handlers.push(handler)
          }
        }

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else {
      // No indent - done with events block
      break
    }
  }

  return handlers
}

/**
 * @doc parseCentralizedEventHandler
 * @brief Parst einen einzelnen Event-Handler im events{} Block
 * @input Token COMPONENT_NAME am Cursor + baseIndent
 * @output CentralizedEventHandler oder null
 *
 * @syntax ComponentName event [modifier]
 *   Gefolgt von indentierten Actions
 *
 * @example Button onclick
 * @example Input onkeydown escape
 * @example Menu onclick-outside
 *
 * @structure
 *   1. Parse ComponentName (targetInstance)
 *   2. Parse EVENT token (onclick, onchange, etc.)
 *   3. Optional: Parse KEY modifier (escape, enter, etc.)
 *   4. Skip NEWLINE
 *   5. Parse indented actions block
 *      - Property assignments (parsePropertyAssignment)
 *      - Conditionals (parseConditionalBlock)
 *      - Action keywords (parseAction)
 *
 * @modifiers Key Modifiers für onkeydown/onkeyup
 *   escape, enter, tab, space, arrow-up, arrow-down, arrow-left, arrow-right,
 *   backspace, delete, home, end
 */
function parseCentralizedEventHandler(ctx: ParserContext, baseIndent: number): CentralizedEventHandler | null {
  const targetLine = ctx.current()!.line
  const targetInstance = ctx.advance().value // ComponentName

  // Next should be an event keyword (onclick, onchange, onkeydown, onclick-outside, etc.)
  if (ctx.current()?.type !== 'EVENT') {
    return null
  }
  const eventName = ctx.advance().value

  const handler: CentralizedEventHandler = {
    targetInstance,
    event: eventName,
    actions: [],
    line: targetLine
  }

  // Check for key after onkeydown/onkeyup: onkeydown escape
  if ((eventName === 'onkeydown' || eventName === 'onkeyup') && ctx.current()?.type === 'COMPONENT_NAME') {
    const possibleKey = ctx.current()!.value.toLowerCase()
    if (KEY_MODIFIERS.has(possibleKey)) {
      handler.key = ctx.advance().value.toLowerCase()
    }
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse actions in block (indented lines)
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > baseIndent) {
        ctx.advance() // consume indent

        // Check for conditional: if ...
        if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
          const conditional = parseConditionalBlock(ctx, indent)
          if (conditional) {
            handler.actions.push(conditional)
          }
        } else {
          // Property assignment or action keyword
          const action = parseEventAction(ctx)
          if (action) {
            handler.actions.push(action)
          }
        }

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        // Less indent - done with handler
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else {
      break
    }
  }

  return handler
}

/**
 * @doc parseEventAction
 * @brief Parst eine einzelne Action im events{} Block
 * @input Token am Cursor (COMPONENT_NAME oder ANIMATION_ACTION)
 * @output ActionStatement oder null
 *
 * @syntax Component.property = value    → Property Assignment
 * @syntax action Target                 → Action Keyword
 *
 * @example Email.value = "test"         → parsePropertyAssignment
 * @example show Dialog                  → parseAction
 * @example page Dashboard               → parseAction
 *
 * @detection
 *   1. Check COMPONENT_NAME + ASSIGNMENT → Property Assignment
 *   2. Check ACTION_KEYWORDS → Action Keyword
 *   3. Sonst null
 */
function parseEventAction(ctx: ParserContext): ActionStatement | null {
  // Check for property assignment: Component.property = value
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.peek(1)?.type === 'ASSIGNMENT') {
    return parsePropertyAssignment(ctx)
  }
  // Check for action keyword: open, close, toggle, etc.
  // Note: Most action keywords are tokenized as COMPONENT_NAME, but show/hide/animate
  // are tokenized as ANIMATION_ACTION (they're in ANIMATION_ACTION_KEYWORDS)
  const token = ctx.current()
  if (token && ACTION_KEYWORDS.has(token.value)) {
    if (token.type === 'COMPONENT_NAME' || token.type === 'ANIMATION_ACTION') {
      return parseAction(ctx)
    }
  }
  return null
}

/**
 * @doc parseActionsBlock
 * @brief Parst einen Block von Actions (indentiert)
 * @input ctx am INDENT token + baseIndent
 * @output Array von ActionStatement
 *
 * @structure
 *   1. Check INDENT > baseIndent
 *   2. Consume INDENT
 *   3. Parse action (parseEventAction)
 *   4. Skip NEWLINE
 *   5. Repeat bis indent <= baseIndent
 *
 * @usage
 *   - Wird von parseConditionalBlock verwendet (then/else blocks)
 *   - Sammelt alle Actions bei gleichem Indent-Level
 */
function parseActionsBlock(ctx: ParserContext, baseIndent: number): ActionStatement[] {
  const actions: ActionStatement[] = []

  while (ctx.current()?.type === 'INDENT') {
    const actionIndent = parseInt(ctx.current()!.value, 10)
    if (actionIndent > baseIndent) {
      ctx.advance() // consume indent

      const action = parseEventAction(ctx)
      if (action) {
        actions.push(action)
      }

      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  return actions
}

/**
 * @doc parseConditionalBlock
 * @brief Parst einen Conditional-Block im events{} Block
 * @input Token CONTROL('if') am Cursor + baseIndent
 * @output Conditional oder null
 *
 * @syntax if condition
 * @syntax   thenAction
 * @syntax else
 * @syntax   elseAction
 *
 * @example
 *   if Email.value and Password.value
 *     Submit.disabled = true
 *     page Dashboard
 *   else
 *     Error.visible = true
 *
 * @structure
 *   1. Consume 'if'
 *   2. Parse condition (parseCondition)
 *   3. Skip NEWLINE
 *   4. Parse then-actions (parseActionsBlock)
 *   5. Optional: Check for 'else' at same indent
 *      - Consume 'else'
 *      - Skip NEWLINE
 *      - Parse else-actions (parseActionsBlock)
 *
 * @operators Condition Operators
 *   Comparison: ==, !=, >, <, >=, <=
 *   Logical: and, or, not
 *   Arithmetic: +, -, *, /
 */
function parseConditionalBlock(ctx: ParserContext, baseIndent: number): Conditional | null {
  ctx.advance() // consume 'if'
  const condition = parseCondition(ctx)
  if (!condition) return null

  const conditional: Conditional = {
    condition,
    thenActions: [],
    line: ctx.current()?.line
  }

  // Skip newline after condition
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse then-actions
  conditional.thenActions = parseActionsBlock(ctx, baseIndent)

  // Check for 'else'
  if (ctx.current()?.type === 'INDENT') {
    const elseIndent = parseInt(ctx.current()!.value, 10)
    if (elseIndent === baseIndent) {
      const savedPos = ctx.pos
      ctx.advance() // consume indent

      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance() // consume 'else'

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }

        // Parse else-actions
        conditional.elseActions = parseActionsBlock(ctx, baseIndent)
      } else {
        ctx.pos = savedPos // rewind
      }
    }
  }

  return conditional
}

/**
 * @doc parsePropertyAssignment
 * @brief Parst eine Property-Zuweisung
 * @input Token COMPONENT_NAME am Cursor
 * @output ActionStatement mit type 'set_property' oder null
 *
 * @syntax Component.property = value
 * @syntax Component.property = $token
 * @syntax Component.property = expression
 *
 * @example Email.value = "test@example.com"
 * @example Submit.disabled = true
 * @example Counter.text = $count + 1
 * @example Panel.opacity = 0.5
 *
 * @structure
 *   1. Parse COMPONENT_NAME (Component.property oder nur Component)
 *   2. Check + consume ASSIGNMENT (=)
 *   3. Parse expression (parseExpression)
 *      - STRING, NUMBER, COLOR, TOKEN_REF
 *      - Boolean (true/false)
 *      - Arithmetic expression ($count + 1)
 *   4. Return ActionStatement mit type 'set_property'
 *
 * @note Property name wird später aus componentName extrahiert (bei Dot-Notation)
 */
function parsePropertyAssignment(ctx: ParserContext): ActionStatement | null {
  const line = ctx.current()!.line
  const componentName = ctx.advance().value // Component name

  // Consume the '='
  if (ctx.current()?.type !== 'ASSIGNMENT') {
    return null
  }
  ctx.advance()

  // Parse the value expression
  const expr = parseExpression(ctx)

  return {
    type: 'set_property',
    componentName,
    propertyName: undefined, // Will be extracted from componentName if it contains a dot
    value: expr ?? undefined,
    line
  }
}
