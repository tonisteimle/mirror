/**
 * @module state-parser
 * @description State & Event Parser - Parst States, Events, Actions und Animationen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX-REFERENZ: STATES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax state hover
 *   State-Definition (explizit mit 'state' Keyword)
 *   Beispiel: state hover \n INDENT bg #555
 *
 * @syntax hover
 *   Impliziter State (ohne 'state' Keyword) - nur für bekannte States
 *   Beispiel: hover \n INDENT bg #555
 *
 * @syntax state selection (State-Kategorie)
 *   State-Kategorie mit verschachtelten States.
 *   Erkennung: Nach NEWLINE+INDENT folgt COMPONENT_NAME (nicht PROPERTY).
 *   Jeder nested state bekommt category: "selection" zugewiesen.
 *   Beispiel:
 *     state selection
 *       not-selected          ← nested state mit category="selection"
 *         bg transparent
 *       selected              ← nested state mit category="selection"
 *         bg #3B82F6
 *   Verwendung: Button selection selected (setzt activeStatesByCategory)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYSTEM-STATES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @state hover        Maus über Element
 * @state focus        Element hat Fokus
 * @state active       Element ist aktiv (z.B. gedrückt)
 * @state disabled     Element ist deaktiviert
 *
 * @trigger Automatisch vom Browser bei Interaktion
 * @usage Button \n INDENT state hover \n INDENT INDENT bg #3B82F6
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEHAVIOR-STATES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @state highlighted  Element ist hervorgehoben (via highlight-action)
 * @state selected     Element ist ausgewählt (via select-action)
 * @state expanded     Element ist ausgeklappt
 * @state collapsed    Element ist eingeklappt
 * @state valid        Formular/Eingabe ist valide
 * @state invalid      Formular/Eingabe ist invalide
 * @state active       Element ist aktiv
 * @state inactive     Element ist inaktiv
 *
 * @trigger Via Actions (highlight, select, activate, etc.)
 * @usage Item \n INDENT state highlighted \n INDENT INDENT bg #333 \n INDENT onhover highlight self
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX-REFERENZ: EVENTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax onclick toggle
 *   Einfache Action auf einer Zeile
 *
 * @syntax onclick
 *   Event mit Block-Actions (indentiert)
 *   Beispiel:
 *     onclick
 *       show Dialog
 *       hide Panel
 *
 * @syntax onclick activate self, deactivate-siblings
 *   Comma-Chaining für mehrere Actions auf einer Zeile
 *
 * @syntax onkeydown escape close self
 *   Key-Modifier für Tastatur-Events
 *
 * @syntax oninput debounce 300 filter Results
 *   Timing-Modifier (debounce/delay)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EVENTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @event onclick           Click-Event
 * @event onclick-outside   Click außerhalb des Elements
 * @event onhover           Hover-Event (Maus über Element)
 * @event onfocus           Focus-Event (Element erhält Fokus)
 * @event onblur            Blur-Event (Element verliert Fokus)
 * @event onchange          Change-Event (Wert geändert)
 * @event oninput           Input-Event (während Tippen)
 * @event onload            Load-Event (Component geladen)
 * @event onkeydown KEY     Taste gedrückt (mit Key-Modifier)
 * @event onkeyup KEY       Taste losgelassen (mit Key-Modifier)
 * @event onfill            Segment vollständig gefüllt
 * @event oncomplete        Alle Segmente gefüllt
 * @event onempty           Segment geleert
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KEY-MODIFIERS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @key escape         Escape-Taste
 * @key enter          Enter-Taste
 * @key tab            Tab-Taste
 * @key space          Leertaste
 * @key arrow-up       Pfeil nach oben
 * @key arrow-down     Pfeil nach unten
 * @key arrow-left     Pfeil nach links
 * @key arrow-right    Pfeil nach rechts
 * @key backspace      Backspace-Taste
 * @key delete         Delete-Taste
 * @key home           Home-Taste
 * @key end            End-Taste
 *
 * @usage onkeydown escape close self
 * @usage onkeydown enter submit form
 * @usage onkeydown arrow-down highlight next
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TIMING-MODIFIERS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @modifier debounce N    Verzögert Ausführung bis N ms nach letztem Event
 * @modifier delay N       Verzögert Ausführung um N ms
 *
 * @usage oninput debounce 300 filter Results    → Wartet 300ms nach Eingabe
 * @usage onblur delay 200 hide Results          → Versteckt nach 200ms
 * @usage onkeydown escape debounce 100 close    → Kombinierbar mit Key-Modifier
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX-REFERENZ: ACTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax toggle                    Toggle-State wechseln
 * @syntax show Target               Element anzeigen
 * @syntax hide Target               Element verstecken
 * @syntax open Target               Overlay/Dialog öffnen
 * @syntax open Target pos           Mit Position (below/above/left/right/center)
 * @syntax open Target fade 200      Mit Animation und Duration
 * @syntax close                     Overlay/Dialog schließen
 * @syntax page Target               Zu Seite wechseln
 * @syntax change self to state      State ändern
 * @syntax assign $var to expr       Variable zuweisen
 * @syntax alert "message"           Alert anzeigen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEHAVIOR-ACTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @action highlight X              Element hervorheben (aktiviert 'highlighted' state)
 * @action highlight next           Nächstes Element hervorheben
 * @action highlight prev           Vorheriges Element hervorheben
 * @action highlight next in List   Nächstes in Container hervorheben
 * @action select X                 Element auswählen (aktiviert 'selected' state)
 * @action deselect X               Auswahl aufheben
 * @action clear-selection          Alle Auswahlen aufheben
 * @action filter X                 Liste filtern
 * @action focus X                  Fokus setzen
 * @action focus next               Nächstes Element fokussieren
 * @action activate X               Element aktivieren (aktiviert 'active' state)
 * @action deactivate X             Element deaktivieren
 * @action deactivate-siblings      Geschwister-Elemente deaktivieren
 * @action toggle-state             State-Toggle (z.B. für expanded/collapsed)
 * @action validate X               Formular validieren
 * @action reset X                  Formular zurücksetzen
 *
 * @targets self, next, prev, first, last, first-empty, highlighted, selected, all, none
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POSITIONS (für open/close)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @position below    Unterhalb des Auslösers
 * @position above    Oberhalb des Auslösers
 * @position left     Links vom Auslöser
 * @position right    Rechts vom Auslöser
 * @position center   Zentriert im Viewport
 *
 * @usage onclick open Dialog center fade 200
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ANIMATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @animation fade           Ein-/Ausblenden (opacity)
 * @animation scale          Skalieren (transform: scale)
 * @animation slide-up       Einblenden von unten
 * @animation slide-down     Einblenden von oben
 * @animation slide-left     Einblenden von rechts
 * @animation slide-right    Einblenden von links
 * @animation spin           Kontinuierliche Rotation
 * @animation pulse          Pulsieren (opacity)
 * @animation bounce         Hüpfen (transform)
 * @animation none           Keine Animation
 *
 * @usage-show Panel \n INDENT show fade slide-up 300    → Show-Animationen
 * @usage-hide Panel \n INDENT hide fade 150             → Hide-Animationen
 * @usage-continuous Icon \n INDENT animate spin 1000    → Kontinuierliche Animationen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARIABLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax $name = value     Variable deklarieren
 * @syntax $name = expr      Variable mit Expression deklarieren
 *
 * @usage $count = 0
 * @usage $isActive = true
 * @usage $total = $a + $b
 *
 * @note Variablen verwenden immer $ Prefix für Konsistenz mit Token-Referenzen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INLINE-ASSIGNMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax $varName = value  Inline-Zuweisung in Events
 *
 * @usage onclick \n INDENT $count = $count + 1
 * @usage onchange \n INDENT $active = true
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example State-Definition mit System-State
 *   Button
 *     state hover
 *       bg #3B82F6
 *       col #FFF
 *
 * @example State-Kategorie mit Behavior-States
 *   Item
 *     state selection
 *       not-selected
 *         bg transparent
 *       selected
 *         bg #3B82F6
 *     onclick toggle-state
 *
 * @example Event mit Block-Actions
 *   Button
 *     onclick
 *       show Dialog
 *       hide Panel
 *
 * @example Event mit Comma-Chaining
 *   Button onclick activate self, deactivate-siblings
 *
 * @example Key-Modifier
 *   Input
 *     onkeydown escape close Dropdown
 *     onkeydown enter submit Form
 *
 * @example Timing-Modifier
 *   Input
 *     oninput debounce 300 filter Results
 *     onblur delay 200 hide Dropdown
 *
 * @example Behavior-Actions
 *   Item
 *     state highlighted
 *       bg #333
 *     onhover highlight self
 *     onclick select self
 *
 * @example Open mit Position und Animation
 *   Button onclick open Dialog center fade 200
 *
 * @example Variable-Declaration und Assignment
 *   $count = 0
 *   Button
 *     onclick
 *       $count = $count + 1
 *       alert $count
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseStateDefinition(ctx, baseIndent) → StateDefinition | null
 *   Parst eine State-Definition (system oder behavior state)
 *
 * @function parseStateCategoryDefinition(ctx, baseIndent) → {states, eventHandlers} | null
 *   Parst eine State-Kategorie mit verschachtelten States (z.B. selection)
 *
 * @function parseBehaviorStateDefinition(ctx, baseIndent) → StateDefinition | null
 *   Parst eine Behavior-State-Definition (highlighted, selected, etc.)
 *
 * @function parseEventHandler(ctx, baseIndent) → EventHandler | null
 *   Parst einen Event-Handler (onclick, onhover, etc.)
 *
 * @function parseAction(ctx) → ActionStatement | null
 *   Parst eine einzelne Action (show, hide, toggle, etc.)
 *
 * @function parseAnimationAction(ctx) → AnimationDefinition | null
 *   Parst Animation-Definitionen (fade, slide-up, etc.)
 *
 * @function parseVariableDeclaration(ctx) → VariableDeclaration | null
 *   Parst Variable-Deklarationen ($name = value)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ParserContext } from './parser-context'
import type {
  StateDefinition,
  VariableDeclaration,
  EventHandler,
  ActionStatement,
  Conditional,
  AnimationDefinition
} from './types'
import { isActionType } from './types'
import { parseValue, parseExpression } from './expression-parser'
import { parseCondition } from './condition-parser'
import { ACTION_KEYWORDS, ANIMATION_KEYWORDS, POSITION_KEYWORDS, BEHAVIOR_TARGETS, KEY_MODIFIERS } from '../dsl/properties'

// Helper to check if a token is an action keyword
function isActionKeyword(ctx: ParserContext): boolean {
  const token = ctx.current()
  // ACTION_KEYWORDS are tokenized as COMPONENT_NAME
  // show/hide are also valid actions but tokenized as ANIMATION_ACTION
  return (token?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(token.value)) ||
         (token?.type === 'ANIMATION_ACTION' && (token.value === 'show' || token.value === 'hide'))
}

// Helper to check if a token is a position keyword
// Position keywords can be tokenized as COMPONENT_NAME or PROPERTY (e.g., 'center' is also a flex property)
function isPositionKeyword(ctx: ParserContext): boolean {
  const token = ctx.current()
  return (token?.type === 'COMPONENT_NAME' || token?.type === 'PROPERTY') && POSITION_KEYWORDS.has(token.value)
}

/**
 * Parse a state category definition: state categoryName \n nestedStates...
 * Returns an array of StateDefinition objects, each with the category field set.
 *
 * Syntax:
 *   state selection
 *     not-selected
 *       background transparent
 *     selected
 *       background #3B82F6
 *     onclick toggle-state
 *
 * Each nested state gets category: "selection" assigned.
 * Event handlers inside the category block are returned separately.
 */
export function parseStateCategoryDefinition(
  ctx: ParserContext,
  baseIndent: number
): { states: StateDefinition[], eventHandlers: import('./types').EventHandler[] } | null {
  // Current token should be STATE
  if (ctx.current()?.type !== 'STATE') return null

  // Peek ahead to determine if this is a category block
  // Category block: state categoryName \n INDENT stateName \n INDENT INDENT properties
  // Regular state: state stateName \n INDENT properties (PROPERTY token after indent)
  //
  // The key difference:
  // - Category: after newline+indent, next token is a COMPONENT_NAME (nested state name)
  // - Flat state: after newline+indent, next token is a PROPERTY (state properties)
  const nameToken = ctx.peek(1)
  if (nameToken?.type !== 'COMPONENT_NAME') {
    return null
  }

  const afterNameToken = ctx.peek(2)
  if (afterNameToken?.type !== 'NEWLINE') {
    // Not a category block - properties follow the name, let parseStateDefinition handle it
    return null
  }

  // Check what comes after NEWLINE + INDENT
  // If it's a PROPERTY token, this is a flat state definition, not a category
  const indentToken = ctx.peek(3)
  if (indentToken?.type !== 'INDENT') {
    // No indent after newline - let parseStateDefinition handle it
    return null
  }

  const afterIndentToken = ctx.peek(4)
  if (afterIndentToken?.type === 'PROPERTY') {
    // After the indent we have a property - this is a flat state definition
    // e.g., state off \n INDENT bg #333
    return null
  }

  // If after indent we have COMPONENT_NAME, it could be a nested state name
  // e.g., state selection \n INDENT selected \n INDENT INDENT bg #3B82F6
  if (afterIndentToken?.type !== 'COMPONENT_NAME' &&
      afterIndentToken?.type !== 'EVENT' &&
      afterIndentToken?.type !== 'UNKNOWN_PROPERTY') {
    // Not a recognizable pattern for category
    return null
  }

  // Now we're sure it's a category block, consume the tokens
  ctx.advance() // consume 'state'
  const categoryName = ctx.advance().value // consume category name

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  const states: StateDefinition[] = []
  const eventHandlers: import('./types').EventHandler[] = []

  // Parse nested states (indented lines)
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > baseIndent) {
        ctx.advance() // consume indent

        // Check for event handler within category block
        if (ctx.current()?.type === 'EVENT') {
          const handler = parseEventHandler(ctx, indent)
          if (handler) {
            eventHandlers.push(handler)
          }
          continue
        }

        // Check for nested state name (COMPONENT_NAME, PROPERTY, or UNKNOWN_PROPERTY)
        const nestedToken = ctx.current()
        if (nestedToken?.type === 'COMPONENT_NAME' ||
            nestedToken?.type === 'PROPERTY' ||
            nestedToken?.type === 'UNKNOWN_PROPERTY') {
          const stateName = ctx.advance().value
          const nestedStateLine = nestedToken.line

          const stateDef: StateDefinition = {
            name: stateName,
            category: categoryName,
            properties: {},
            children: [],
            line: nestedStateLine
          }

          // Skip newline after state name
          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }

          // Parse state properties (deeper indent)
          while (ctx.current() && ctx.current()!.type !== 'EOF') {
            const propToken = ctx.current()!

            if (propToken.type === 'INDENT') {
              const propIndent = parseInt(propToken.value, 10)
              if (propIndent > indent) {
                ctx.advance() // consume indent

                // Parse property on this line
                if (ctx.current()?.type === 'PROPERTY') {
                  const propName = ctx.advance().value

                  // Handle directional properties
                  if (ctx.current()?.type === 'DIRECTION') {
                    const directions: string[] = []
                    while (ctx.current()?.type === 'DIRECTION') {
                      const dir = ctx.advance().value
                      if (dir.includes('-')) {
                        directions.push(...dir.split('-'))
                      } else {
                        directions.push(dir)
                      }
                    }
                    const val = parseValue(ctx)
                    if (val !== null) {
                      for (const dir of directions) {
                        stateDef.properties[`${propName}-${dir}`] = val
                      }
                    }
                  } else {
                    const val = parseValue(ctx)
                    if (val !== null) {
                      stateDef.properties[propName] = val
                    } else {
                      stateDef.properties[propName] = true
                    }
                  }
                }

                if (ctx.current()?.type === 'NEWLINE') {
                  ctx.advance()
                }
              } else {
                // Less indent - done with this state's properties
                break
              }
            } else if (propToken.type === 'NEWLINE') {
              ctx.advance()
            } else {
              break
            }
          }

          states.push(stateDef)
        }

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        // Less indent - done with category block
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else {
      break
    }
  }

  return { states, eventHandlers }
}

/**
 * Parse a state definition: state name \n properties...
 */
export function parseStateDefinition(ctx: ParserContext, baseIndent: number): StateDefinition | null {
  // Current token should be STATE
  if (ctx.current()?.type !== 'STATE') return null
  const stateLine = ctx.current()!.line
  ctx.advance() // consume 'state'

  // Next should be the state name
  // Accept COMPONENT_NAME, PROPERTY, or UNKNOWN_PROPERTY tokens
  // (UNKNOWN_PROPERTY handles cases like 'pending' which is close to 'padding' in Levenshtein distance)
  const currentToken = ctx.current()
  if (currentToken?.type !== 'COMPONENT_NAME' && currentToken?.type !== 'PROPERTY' && currentToken?.type !== 'UNKNOWN_PROPERTY') {
    return null
  }
  const stateName = ctx.advance().value

  const stateDef: StateDefinition = {
    name: stateName,
    properties: {},
    children: [],
    line: stateLine
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse state properties (indented lines)
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > baseIndent) {
        ctx.advance() // consume indent

        // Parse ALL properties on this line (multiple properties like: bg #3B82F6 col #FFF)
        while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
          if (ctx.current()?.type === 'PROPERTY') {
            const propName = ctx.advance().value

            // Handle directional properties: mar l 0, pad t-b 8, etc.
            if (ctx.current()?.type === 'DIRECTION') {
              const directions: string[] = []
              while (ctx.current()?.type === 'DIRECTION') {
                // Split combined directions like 'l-r' into ['l', 'r']
                const dir = ctx.advance().value
                if (dir.includes('-')) {
                  directions.push(...dir.split('-'))
                } else {
                  directions.push(dir)
                }
              }
              // Get the value for these directions
              const val = parseValue(ctx)
              if (val !== null) {
                for (const dir of directions) {
                  stateDef.properties[`${propName}-${dir}`] = val
                }
              }
            } else {
              // Regular property with value
              const val = parseValue(ctx)
              if (val !== null) {
                stateDef.properties[propName] = val
              } else {
                stateDef.properties[propName] = true
              }
            }
          } else if (ctx.current()?.type === 'STRING') {
            // Direct string content for this state (e.g., "Light Mode")
            stateDef.properties['_content'] = ctx.advance().value
          } else if (ctx.current()?.type === 'COMPONENT_NAME') {
            // Could be a child component or content
            ctx.advance() // consume component name
            if (ctx.current()?.type === 'STRING') {
              // It's content for this state
              stateDef.properties['_content'] = ctx.advance().value
            }
          } else if (ctx.current()?.type === 'COMMA') {
            // Skip comma separators between properties
            ctx.advance()
          } else {
            // Unknown token, stop parsing this line
            break
          }
        }

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        // Less indent - done with this state
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else {
      // No indent - done with this state
      break
    }
  }

  return stateDef
}

/**
 * Parse a behavior state definition: highlight \n properties...
 * The keyword IS the state name (no separate name token).
 * This creates a direct 1:1 mapping between action and state name.
 */
export function parseBehaviorStateDefinition(ctx: ParserContext, baseIndent: number): StateDefinition | null {
  // Current token should be COMPONENT_NAME with a behavior state keyword value
  const currentToken = ctx.current()
  if (currentToken?.type !== 'COMPONENT_NAME') return null

  const stateName = ctx.advance().value // The keyword IS the state name
  const stateLine = currentToken.line

  const stateDef: StateDefinition = {
    name: stateName,
    properties: {},
    children: [],
    line: stateLine
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse state properties (indented lines) - same logic as parseStateDefinition
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > baseIndent) {
        ctx.advance() // consume indent

        // Parse property on this line
        if (ctx.current()?.type === 'PROPERTY') {
          const propName = ctx.advance().value

          // Handle directional properties: mar l 0, pad t-b 8, etc.
          if (ctx.current()?.type === 'DIRECTION') {
            const directions: string[] = []
            while (ctx.current()?.type === 'DIRECTION') {
              // Split combined directions like 'l-r' into ['l', 'r']
              const dir = ctx.advance().value
              if (dir.includes('-')) {
                directions.push(...dir.split('-'))
              } else {
                directions.push(dir)
              }
            }
            // Get the value for these directions
            const val = parseValue(ctx)
            if (val !== null) {
              for (const dir of directions) {
                stateDef.properties[`${propName}-${dir}`] = val
              }
            }
          } else {
            // Regular property with value
            const val = parseValue(ctx)
            if (val !== null) {
              stateDef.properties[propName] = val
            } else {
              stateDef.properties[propName] = true
            }
          }
        }

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        // Less indent - done with this state
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else {
      // No indent - done with this state
      break
    }
  }

  return stateDef
}

/**
 * Parse a variable declaration: $name = value
 * Variables always use $ prefix for consistency with token references.
 */
export function parseVariableDeclaration(ctx: ParserContext): VariableDeclaration | null {
  // Current should be TOKEN_REF ($variableName)
  if (ctx.current()?.type !== 'TOKEN_REF') return null

  const varName = ctx.current()!.value
  const varLine = ctx.current()!.line

  // Peek ahead to see if next is ASSIGNMENT
  if (ctx.peek(1)?.type !== 'ASSIGNMENT') return null

  ctx.advance() // consume $variable
  ctx.advance() // consume '='

  const value = parseValue(ctx)
  if (value === null) return null

  return {
    name: varName,
    value: value,
    line: varLine
  }
}

/**
 * Parse inline assignment action: $varName = value
 */
function parseInlineAssignment(ctx: ParserContext): ActionStatement | null {
  const token = ctx.current()
  if (!token || token.type !== 'TOKEN_REF') return null

  const name = token.value
  if (ctx.peek(1)?.type !== 'ASSIGNMENT') return null

  const actionLine = token.line
  ctx.advance() // consume $name
  ctx.advance() // consume '='
  const expr = parseExpression(ctx)

  return {
    type: 'assign',
    target: name,
    value: expr ?? undefined,
    line: actionLine
  }
}

/**
 * Parse 'change X to Y' action details.
 */
function parseChangeDetails(ctx: ParserContext, action: ActionStatement): void {
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'to') {
    ctx.advance() // consume 'to'
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      action.toState = ctx.advance().value
    }
  }
}

/**
 * Parse 'assign X to expr' action details.
 */
function parseAssignDetails(ctx: ParserContext, action: ActionStatement): void {
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'to') {
    ctx.advance() // consume 'to'
    const expr = parseExpression(ctx)
    if (expr) {
      action.value = expr
    }
  }
}

/**
 * Parse position, animation, and duration for open/close actions.
 */
function parseOpenCloseDetails(ctx: ParserContext, action: ActionStatement): void {
  if (!ctx.current()) return

  // Position keyword (below, above, left, right, center)
  if (isPositionKeyword(ctx)) {
    action.position = ctx.advance().value as ActionStatement['position']
  }

  // Animation keyword (slide-up, fade, scale, etc.)
  if (ctx.current()?.type === 'ANIMATION') {
    action.animation = ctx.advance().value
    if (ctx.current()?.type === 'NUMBER') {
      action.duration = parseInt(ctx.advance().value, 10)
    }
  } else if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'PROPERTY') {
    const maybeAnimation = ctx.current()!.value
    if (ANIMATION_KEYWORDS.has(maybeAnimation)) {
      action.animation = ctx.advance().value
      if (ctx.current()?.type === 'NUMBER') {
        action.duration = parseInt(ctx.advance().value, 10)
      }
    }
  }
}

/**
 * Parse an action: open X, close X, change X to Y, toggle X, assign $var to expr
 */
export function parseAction(ctx: ParserContext): ActionStatement | null {
  const token = ctx.current()
  if (!token) return null

  // Handle inline assignment: $varName = value
  if (token.type === 'TOKEN_REF') {
    return parseInlineAssignment(ctx)
  }

  // Check if it's an action keyword (now tokenized as COMPONENT_NAME)
  if (!isActionKeyword(ctx)) return null

  const actionLine = token.line
  const actionToken = ctx.advance()
  const actionValue = actionToken.value

  // Validate action type using type guard
  if (!isActionType(actionValue)) {
    ctx.addWarning(
      'P001',
      `Unknown action type "${actionValue}"`,
      actionToken,
      `Valid actions: open, close, toggle, change, show, hide, assign, highlight, select, etc.`
    )
    return null
  }

  const action: ActionStatement = {
    type: actionValue,
    line: actionLine
  }

  // Parse target
  if (actionValue === 'assign') {
    if (ctx.current()?.type === 'TOKEN_REF' || ctx.current()?.type === 'COMPONENT_NAME') {
      action.target = ctx.advance().value
    }
  } else if (actionValue === 'alert') {
    // Alert accepts a string message - store in target
    if (ctx.current()?.type === 'STRING') {
      action.target = ctx.advance().value
    } else if (ctx.current()?.type === 'COMPONENT_NAME') {
      action.target = ctx.advance().value
    }
  } else if (actionValue === 'call') {
    // Call action accepts function name as target
    // Syntax: call functionName or call functionName, "argument" or call functionName, $variable
    // Function names can be tokenized as COMPONENT_NAME, PROPERTY, or UNKNOWN_ANIMATION depending on the name
    const funcToken = ctx.current()
    if (funcToken?.type === 'COMPONENT_NAME' || funcToken?.type === 'PROPERTY' || funcToken?.type === 'UNKNOWN_ANIMATION') {
      action.target = ctx.advance().value
      // Check for comma and optional argument
      if (ctx.current()?.type === 'COMMA') {
        ctx.advance() // consume comma
        // Parse argument (string, token ref, or component name)
        if (ctx.current()?.type === 'STRING') {
          action.value = ctx.advance().value
        } else if (ctx.current()?.type === 'TOKEN_REF') {
          action.value = { type: 'variable', name: ctx.advance().value }
        } else if (ctx.current()?.type === 'COMPONENT_NAME') {
          action.value = ctx.advance().value
        }
      }
    }
  } else if (actionValue === 'highlight' || actionValue === 'select' || actionValue === 'filter' || actionValue === 'deselect') {
    // Behavior actions accept COMPONENT_NAME, ANIMATION ('none'), or PROPERTY tokens as targets
    // 'none' is tokenized as ANIMATION, 'all' as COMPONENT_NAME
    const token = ctx.current()
    if (token?.type === 'COMPONENT_NAME' || token?.type === 'ANIMATION' || token?.type === 'PROPERTY') {
      // Only consume if it's a valid behavior target
      if (BEHAVIOR_TARGETS.has(token.value) || /^[A-Z]/.test(token.value)) {
        action.target = ctx.advance().value
      }
    }
  } else if (actionValue === 'activate' || actionValue === 'deactivate' || actionValue === 'validate' || actionValue === 'reset') {
    // These actions accept self or component names as targets
    const token = ctx.current()
    if (token?.type === 'COMPONENT_NAME' || token?.type === 'PROPERTY') {
      // Accept 'self' or component names
      if (token.value === 'self' || /^[A-Z]/.test(token.value)) {
        action.target = ctx.advance().value
      }
    }
  } else if (actionValue === 'deactivate-siblings' || actionValue === 'clear-selection') {
    // These actions don't need a target (implicit self/siblings)
    // But check for optional 'all' target for clear-selection
    const token = ctx.current()
    if (token?.type === 'COMPONENT_NAME' && token.value === 'all') {
      action.target = ctx.advance().value
    }
  } else if (actionValue === 'toggle-state') {
    // toggle-state accepts optional target: self, component name
    const token = ctx.current()
    if (token?.type === 'COMPONENT_NAME' || token?.type === 'PROPERTY') {
      if (token.value === 'self' || /^[A-Z]/.test(token.value)) {
        action.target = ctx.advance().value
      }
    }
  } else if (ctx.current()?.type === 'COMPONENT_NAME') {
    action.target = ctx.advance().value
  }

  // Parse action-specific details
  switch (actionValue) {
    case 'change':
      parseChangeDetails(ctx, action)
      break
    case 'assign':
      parseAssignDetails(ctx, action)
      break
    case 'open':
    case 'close':
      parseOpenCloseDetails(ctx, action)
      break
    case 'highlight':
    case 'select':
    case 'filter':
    case 'deselect':
    case 'activate':
    case 'deactivate':
    case 'focus':
      parseBehaviorActionDetails(ctx, action)
      break
    // Actions without additional details
    case 'deactivate-siblings':
    case 'clear-selection':
    case 'toggle-state':
    case 'validate':
    case 'reset':
      // No additional parsing needed
      break
  }

  return action
}

/**
 * Parse behavior action details: highlight next in dropdown, select self, filter dropdown
 */
function parseBehaviorActionDetails(ctx: ParserContext, action: ActionStatement): void {
  // Check for 'in' keyword: highlight next in dropdown
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'in') {
    ctx.advance() // consume 'in'
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      action.inContainer = ctx.advance().value
    }
  }
}

/**
 * Parse an event handler: onclick \n actions...
 * Also supports key modifiers: onkeydown escape close self
 */
export function parseEventHandler(ctx: ParserContext, baseIndent: number): EventHandler | null {
  if (ctx.current()?.type !== 'EVENT') return null

  const eventLine = ctx.current()!.line
  const eventName = ctx.advance().value // onclick, onhover, onkeydown, onclick-outside, etc.

  const handler: EventHandler = {
    event: eventName,
    actions: [],
    line: eventLine
  }

  // Check for key after onkeydown/onkeyup: onkeydown escape close self
  if ((eventName === 'onkeydown' || eventName === 'onkeyup') && ctx.current()?.type === 'COMPONENT_NAME') {
    const possibleKey = ctx.current()!.value.toLowerCase()
    if (KEY_MODIFIERS.has(possibleKey)) {
      handler.key = ctx.advance().value.toLowerCase()
    }
  }

  // Check for debounce modifier: oninput debounce 300: filter Results
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'debounce') {
    ctx.advance() // consume 'debounce'
    if (ctx.current()?.type === 'NUMBER') {
      handler.debounce = parseInt(ctx.advance().value, 10)
    }
  }

  // Check for delay modifier: onblur delay 200: hide Results
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'delay') {
    ctx.advance() // consume 'delay'
    if (ctx.current()?.type === 'NUMBER') {
      handler.delay = parseInt(ctx.advance().value, 10)
    }
  }

  // Consume optional colon after timing modifiers (debounce 300: action)
  if (ctx.current()?.type === 'COLON') {
    ctx.advance()
  }

  // Check for inline actions on same line (supports comma-chaining)
  // Example: onclick activate self, deactivate-siblings
  while (isActionKeyword(ctx)) {
    const action = parseAction(ctx)
    if (action) handler.actions.push(action)

    // Check for comma to continue parsing more actions
    if (ctx.current()?.type === 'COMMA') {
      ctx.advance() // consume comma
      // Continue loop to parse next action
    } else {
      break // No more actions on this line
    }
  }

  // Skip any remaining tokens on the line (e.g., extra arguments after assign)
  // This handles cases like: onclick assign targetName Value
  // where "Value" is leftover after parsing the assign action
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    ctx.advance()
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
          ctx.advance() // consume 'if'
          const condition = parseCondition(ctx)
          if (condition) {
            const conditional: Conditional = {
              condition,
              thenActions: [],
              line: ctx.current()?.line
            }

            // Skip newline after condition
            if (ctx.current()?.type === 'NEWLINE') {
              ctx.advance()
            }

            // Parse then-actions (deeper indent)
            while (ctx.current()?.type === 'INDENT') {
              const actionIndent = parseInt(ctx.current()!.value, 10)
              if (actionIndent > indent) {
                ctx.advance() // consume indent
                const action = parseAction(ctx)
                if (action) {
                  conditional.thenActions.push(action)
                }
                if (ctx.current()?.type === 'NEWLINE') {
                  ctx.advance()
                }
              } else {
                break
              }
            }

            handler.actions.push(conditional)
          }
        } else {
          // Regular action
          const action = parseAction(ctx)
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
 * Parse an animation action: show fade slide-up 300, hide fade 200, animate spin 1000
 *
 * Syntax:
 *   show [animation...] [duration]
 *   hide [animation...] [duration]
 *   animate [animation] [duration]
 */
export function parseAnimationAction(ctx: ParserContext): AnimationDefinition | null {
  const token = ctx.current()
  if (!token || token.type !== 'ANIMATION_ACTION') return null

  const actionLine = token.line
  const actionType = ctx.advance().value as 'show' | 'hide' | 'animate'

  const animDef: AnimationDefinition = {
    type: actionType,
    animations: [],
    line: actionLine
  }

  // Parse animation names and duration
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const current = ctx.current()!

    if (current.type === 'ANIMATION') {
      // Animation keyword (fade, slide-up, spin, etc.)
      animDef.animations.push(ctx.advance().value)
    } else if (current.type === 'COMPONENT_NAME' && ANIMATION_KEYWORDS.has(current.value)) {
      // Animation might be tokenized as COMPONENT_NAME
      animDef.animations.push(ctx.advance().value)
    } else if (current.type === 'NUMBER') {
      // Duration in ms
      animDef.duration = parseInt(ctx.advance().value, 10)
      break // Duration is always last
    } else {
      // Unknown token, stop parsing
      break
    }
  }

  // Default duration if not specified
  if (animDef.duration === undefined) {
    animDef.duration = actionType === 'animate' ? 1000 : 300
  }

  return animDef
}
