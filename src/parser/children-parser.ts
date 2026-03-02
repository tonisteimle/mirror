/**
 * @module children-parser
 * @description Children-Parser - Parst Kinder-Hierarchie durch Einrueckung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX-REFERENZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Component\n  Child
 *   Basis-Hierarchie durch 2-Leerzeichen-Einrueckung
 *
 * @syntax Component\n  Child\n    Grandchild
 *   Beliebig tiefe Verschachtelung
 *
 * @syntax Component\n  - Item "text"
 *   Liste: Neue Instanzen mit - Prefix
 *
 * @syntax Component named Name
 *   Benannte Instanz fuer Referenzierung in Events
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KINDER-HIERARCHIE (Einrueckung)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Parent\n  Child
 *   2-Leerzeichen-Einrueckung = Kind-Beziehung
 *   Beispiel:
 *     Card
 *       Header "Title"
 *       Content "Body"
 *
 * @syntax Parent\n  Child1\n  Child2
 *   Geschwister auf gleicher Einrueckung
 *   Beispiel:
 *     Menu
 *       Item "Profile"
 *       Item "Settings"
 *
 * @syntax Parent\n  Child\n    Grandchild
 *   Beliebig tiefe Verschachtelung
 *   Beispiel:
 *     Layout
 *       Header
 *         Logo
 *       Body
 *         Sidebar
 *           Nav
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LISTEN-ITEMS (Neue Instanzen)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax - Component "text"
 *   Minus-Prefix = Neue Instanz (nicht modifizieren)
 *   Beispiel:
 *     Menu: vertical
 *       Item: padding 12, background #333
 *     Menu
 *       - Item "Profile"
 *       - Item "Settings"
 *       - Item color #EF4444 "Logout"
 *
 * @syntax - "text"
 *   Bare String in Liste = Wrapped in Default-Slot
 *   Beispiel:
 *     Menu with Item: slot
 *     Menu
 *       - "Dashboard"   → wird zu: - Item "Dashboard"
 *       - "Profile"     → wird zu: - Item "Profile"
 *
 * @behavior Liste-Items erben Properties vom Template, koennen aber ueberschreiben
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BENANNTE INSTANZEN (Named)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Component named Name
 *   Benannte Instanz fuer Referenzierung in Events
 *   Beispiel:
 *     Button named SaveBtn "Save"
 *     Button named CancelBtn "Cancel"
 *     events
 *       SaveBtn onclick show SuccessMsg
 *       CancelBtn onclick hide Form
 *
 * @syntax - Component named Name "text"
 *   Benanntes Listen-Item
 *   Beispiel:
 *     Menu
 *       - Item named DashboardItem "Dashboard"
 *     events
 *       DashboardItem onclick page Dashboard
 *
 * @required Name muss eindeutig im Scope sein
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ITERATOREN (each)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax each $item in $list
 *   Schleife ueber Collection
 *   Beispiel:
 *     $tasks: [{ title: "Task 1", done: true }, { title: "Task 2", done: false }]
 *     each $task in $tasks
 *       Card
 *         Text $task.title
 *         Icon if $task.done then "check" else "circle"
 *
 * @syntax each $x in $items.nested.path
 *   Collection mit Pfad
 *   Beispiel:
 *     each $user in $data.users.active
 *       UserCard $user.name
 *
 * @iteration Erzeugt ITERATOR-Node mit iteration: { itemVar, collectionVar, collectionPath }
 *
 * @children Template-Children werden fuer jedes Item gerendert
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DATA BINDING (Filter)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Component data Collection where field == value
 *   Data-Binding mit Filter
 *   Beispiel:
 *     TaskList data Tasks where done == false
 *       Card $item.title
 *
 * @syntax Component data Collection
 *   Ohne Filter - alle Items
 *   Beispiel:
 *     UserList data Users
 *       UserCard $item.name
 *
 * @binding Setzt node.dataBinding: { collection, filter }
 *
 * @variable $item ist implizit verfuegbar in Template
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEXT-INHALTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Component "text"
 *   Inline-Text am Ende der Zeile
 *   Beispiel: Button "Click me"
 *
 * @syntax Component\n  "text"
 *   Text als Kind (eigene Zeile)
 *   Beispiel:
 *     Button
 *       "Click me"
 *
 * @syntax Component\n  "Bold" weight 600 "Normal"
 *   Strings mit Properties (Inline-Styling)
 *   Beispiel:
 *     Text
 *       "Welcome" weight 700 size 24
 *       "Subtitle" size 16 color #666
 *
 * @syntax Component\n  '...'
 *   Multiline-String (Doc-Mode)
 *   Beispiel:
 *     text
 *       '# Heading
 *
 *        $p Paragraph with **bold** text.'
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STATES & EVENTS (als Kinder)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Component\n  state hover\n    property value
 *   State-Definition als Kind
 *   Beispiel:
 *     Button
 *       state hover
 *         background #555
 *       state active
 *         background #3B82F6
 *
 * @syntax Component\n  hover\n    property value
 *   Impliziter State (ohne 'state' Keyword)
 *   Beispiel:
 *     Button
 *       hover
 *         background #555
 *
 * @syntax Component\n  onclick action
 *   Event-Handler als Kind
 *   Beispiel:
 *     Button
 *       onclick toggle
 *
 * @syntax Component\n  show fade 300\n  hide scale 200
 *   Animation-Actions (show/hide/animate)
 *   Beispiel:
 *     Dialog
 *       show fade slide-up 300
 *       hide fade 150
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CONDITIONALS (if/else)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax if $cond\n  Child
 *   Bedingte Kinder
 *   Beispiel:
 *     if $isLoggedIn
 *       Avatar
 *     else
 *       Button "Login"
 *
 * @syntax if $cond\n  property value\nelse\n  property value
 *   Bedingte Properties
 *   Beispiel:
 *     Button
 *       if $active
 *         background #3B82F6
 *       else
 *         background #333
 *
 * @conditional Erzeugt CONDITIONAL-Node mit condition, children, elseChildren
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARIABLEN-DEKLARATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax $name = value
 *   Variable innerhalb Component
 *   Beispiel:
 *     App
 *       $count = 0
 *       Button onclick assign $count to $count + 1
 *       Text "Count: {$count}"
 *
 * @scope Variablen sind im Component-Scope und Kinder verfuegbar
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DOC-MODE (Multiline-Strings)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax text\n  '...'
 *   Doc-Mode Content mit Markdown
 *   Beispiel:
 *     text
 *       '# Welcome
 *
 *        $p This is **Mirror** documentation.
 *        $p Visit [our site](https://example.com).'
 *
 * @syntax playground\n  '...'
 *   Live Code Example
 *   Beispiel:
 *     playground
 *       'Button background #2271c1, padding 12 24, radius 8, "Click me"'
 *
 * @breakout Multiline-Strings koennen an beliebiger Einrueckung starten (Editor-Width)
 *
 * @properties Setzt node.properties._docContent = content
 *
 * @marks node._isLibrary = true, node._libraryType = "text"|"playground"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPENDENCY INJECTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @pattern Verwendet Function-Injection um zirkulaere Dependencies zu vermeiden
 *
 * @parameter parseComponentFn: ComponentParserFn
 *   Injizierte Funktion zum Parsen von Kind-Komponenten
 *
 * @parameter parseIteratorFn: IteratorParserFn
 *   Injizierte Funktion zum Parsen von Iteratoren
 *
 * @reason parser.ts und component-parser nutzen children-parser,
 *         children-parser braucht parseComponent() aus component-parser
 *         → Injection loest zirkulaere Abhaengigkeit
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, ConditionExpr, DSLProperties } from './types'
import { parseStateDefinition, parseVariableDeclaration, parseEventHandler, parseAnimationAction, parseBehaviorStateDefinition, parseKeysBlock } from './state-parser'
import { parseCondition } from './condition-parser'
import { createTextNode } from './parser-utils'
import { isTokenSequence } from './types'
import { INTERNAL_NODES } from '../constants'
import { BEHAVIOR_STATE_KEYWORDS, SYSTEM_STATES } from '../dsl/properties'
import { parseInlineConditionalProperties } from './component-parser/inline-properties'

/**
 * Type for the component parser function (dependency injection).
 */
export type ComponentParserFn = (
  ctx: ParserContext,
  baseIndent: number,
  parentScope?: string
) => ASTNode | null

/**
 * Type for the iterator parser function (dependency injection).
 */
export type IteratorParserFn = (
  ctx: ParserContext,
  childIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
) => ASTNode

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HAUPT-FUNKTION: parseChildren
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @doc parseChildren
 * @brief Parst alle Kinder eines Components (eingerueckte Zeilen)
 * @input ctx: ParserContext, node: Parent-Node, baseIndent: Basis-Einrueckung
 * @output ASTNode[] - Array von Kind-Nodes
 *
 * @handles INDENT > baseIndent → Kind
 * @handles MULTILINE_STRING → Doc-Mode Content (_docContent)
 * @handles STRING → Text-Nodes mit Properties
 * @handles STATE → State-Definitionen
 * @handles BEHAVIOR_STATE → highlight/select/hover/focus States
 * @handles EVENT → Event-Handlers
 * @handles ANIMATION_ACTION → show/hide/animate
 * @handles TOKEN_REF + ASSIGNMENT → Variable-Deklaration
 * @handles CONTROL "if" → Conditional-Block
 * @handles CONTROL "each" → Iterator-Block
 * @handles LIST_ITEM → Liste-Items (- prefix)
 * @handles COMPONENT_NAME → Kind-Komponenten
 *
 * @injection parseComponentFn zum Parsen von Kind-Komponenten
 * @injection parseIteratorFn zum Parsen von Iteratoren
 *
 * @example
 *   Card
 *     Header "Title"          ← STRING → Text-Node
 *     - Item "Profile"        ← LIST_ITEM → List-Item
 *     if $active              ← CONTROL "if" → Conditional
 *       Icon "check"
 *     each $task in $tasks    ← CONTROL "each" → Iterator
 *       Task $task.title
 */
export function parseChildren(
  ctx: ParserContext,
  node: ASTNode,
  baseIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn,
  parseIteratorFn: IteratorParserFn
): ASTNode[] {
  const instanceChildren: ASTNode[] = []

  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const childIndent = parseInt(token.value, 10)

      if (childIndent > baseIndent) {
        ctx.advance() // consume indent

        // Check for multiline string (doc-mode content)
        // Used for text and playground blocks: '...'
        if (ctx.current()?.type === 'MULTILINE_STRING') {
          const content = ctx.advance().value
          // Store as _docContent property on the parent node
          node.properties._docContent = content
          // Mark as library component for doc-mode rendering
          if (node.name === 'text' || node.name === 'playground') {
            node._isLibrary = true
            node._libraryType = node.name
          }
          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
          continue
        }

        // Check if it's strings with properties (inline text styling)
        // Handles: "Normal" "bold" weight 600 "normal again"
        if (ctx.current()?.type === 'STRING') {
          // Process all consecutive strings with their properties
          while (ctx.current()?.type === 'STRING') {
            const stringToken = ctx.current()!
            const textNode = createTextNode(
              ctx.advance().value,
              ctx.generateId.bind(ctx),
              stringToken.line,
              stringToken.column
            )

            // Parse properties after this string (stop at next STRING or NEWLINE)
            while (
              ctx.current() &&
              ctx.current()!.type !== 'NEWLINE' &&
              ctx.current()!.type !== 'EOF' &&
              ctx.current()!.type !== 'STRING'
            ) {
              const afterToken = ctx.current()!
              if (afterToken.type === 'PROPERTY') {
                const propName = ctx.advance().value
                // Parse property value
                const valueToken = ctx.current()
                if (valueToken?.type === 'NUMBER') {
                  textNode.properties[propName] = parseInt(ctx.advance().value, 10)
                } else if (valueToken?.type === 'COLOR') {
                  textNode.properties[propName] = ctx.advance().value
                } else if (valueToken?.type === 'TOKEN_REF') {
                  const tokenName = ctx.advance().value
                  const tokenValue = ctx.designTokens.get(tokenName)
                  if (tokenValue !== undefined && !isTokenSequence(tokenValue)) {
                    textNode.properties[propName] = tokenValue
                  }
                } else if (valueToken?.type === 'STRING') {
                  textNode.properties[propName] = ctx.advance().value
                } else {
                  // Boolean property (no value)
                  textNode.properties[propName] = true
                }
              } else if (afterToken.type === 'COLOR') {
                // Bare color → text color
                textNode.properties['col'] = ctx.advance().value
              } else if (afterToken.type === 'NUMBER') {
                // Bare number → font size
                textNode.properties['size'] = parseInt(ctx.advance().value, 10)
              } else if (afterToken.type === 'TOKEN_REF') {
                // Bare token ref → could be color or size
                const tokenName = ctx.advance().value
                const tokenValue = ctx.designTokens.get(tokenName)
                if (typeof tokenValue === 'string') {
                  textNode.properties['col'] = tokenValue
                } else if (typeof tokenValue === 'number') {
                  textNode.properties['size'] = tokenValue
                }
              } else {
                // Unknown token - stop parsing properties
                break
              }
            }

            instanceChildren.push(textNode)
          }

          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
        }
        // Check for state definition
        else if (ctx.current()?.type === 'STATE') {
          const stateDef = parseStateDefinition(ctx, childIndent)
          if (stateDef) {
            if (!node.states) node.states = []
            node.states.push(stateDef)
          }
        }
        // Check for behavior state block (highlight, select) or system state (hover, focus, active, disabled)
        // These are state blocks where the keyword IS the state name
        else if (
          ctx.current()?.type === 'COMPONENT_NAME' &&
          (BEHAVIOR_STATE_KEYWORDS.has(ctx.current()!.value) || SYSTEM_STATES.has(ctx.current()!.value)) &&
          ctx.peek(1)?.type === 'NEWLINE'
        ) {
          const stateDef = parseBehaviorStateDefinition(ctx, childIndent)
          if (stateDef) {
            if (!node.states) node.states = []
            node.states.push(stateDef)
          }
        }
        // Check for event handler
        else if (ctx.current()?.type === 'EVENT') {
          const handler = parseEventHandler(ctx, childIndent)
          if (handler) {
            if (!node.eventHandlers) node.eventHandlers = []
            node.eventHandlers.push(handler)
          }
        }
        // Keys block: grouped keyboard event handlers
        else if (ctx.current()?.type === 'KEYS') {
          const handlers = parseKeysBlock(ctx, childIndent)
          if (handlers.length > 0) {
            if (!node.eventHandlers) node.eventHandlers = []
            node.eventHandlers.push(...handlers)
          }
        }
        // Check for animation action (show/hide/animate)
        else if (ctx.current()?.type === 'ANIMATION_ACTION') {
          const animDef = parseAnimationAction(ctx)
          if (animDef) {
            if (animDef.type === 'show') {
              node.showAnimation = animDef
            } else if (animDef.type === 'hide') {
              node.hideAnimation = animDef
            } else if (animDef.type === 'animate') {
              node.continuousAnimation = animDef
            }
          }
          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
        }
        // Check for variable declaration ($name = value)
        else if (ctx.current()?.type === 'TOKEN_REF' && ctx.peek(1)?.type === 'ASSIGNMENT') {
          const varDecl = parseVariableDeclaration(ctx)
          if (varDecl) {
            if (!node.variables) node.variables = []
            node.variables.push(varDecl)
          }
          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
        }
        // Check for 'if' conditional
        else if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
          const condChild = parseConditional(ctx, node, childIndent, componentName, parseComponentFn)
          if (condChild) {
            instanceChildren.push(condChild)
          }
        }
        // Check for 'each' iterator
        else if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'each') {
          const iterChild = parseIteratorFn(ctx, childIndent, componentName, parseComponentFn)
          if (iterChild) {
            instanceChildren.push(iterChild)
          }
        }
        // Check for list item (- prefix for new instance)
        else if (ctx.current()?.type === 'LIST_ITEM') {
          ctx.advance() // consume '-'
          if (ctx.current()?.type === 'COMPONENT_NAME') {
            const child = parseComponentFn(ctx, childIndent, componentName)
            if (child) {
              child._isListItem = true
              instanceChildren.push(child)
            }
          }
          // Bare strings in list items - wrap in default slot
          // e.g., Menu with Item: slot → `- "Dashboard"` becomes `- Item "Dashboard"`
          else if (ctx.current()?.type === 'STRING') {
            const stringToken = ctx.current()!
            const stringValue = ctx.advance().value

            // Find the default item slot from parent's template
            const template = ctx.registry.get(componentName)
            const defaultSlot = template?.children?.[0]

            if (defaultSlot && defaultSlot.name !== '_text') {
              // Create a node using the slot template
              const slotNode: ASTNode = {
                type: 'component',
                name: defaultSlot.name,
                id: ctx.generateId(defaultSlot.name),
                properties: { ...defaultSlot.properties },
                children: [],
                content: stringValue,
                line: stringToken.line,
                column: stringToken.column,
                _isListItem: true
              }

              // Copy states from slot template
              if (defaultSlot.states && defaultSlot.states.length > 0) {
                slotNode.states = defaultSlot.states.map(s => ({
                  ...s,
                  properties: { ...s.properties }
                }))
              }

              // Copy event handlers from slot template
              if (defaultSlot.eventHandlers && defaultSlot.eventHandlers.length > 0) {
                slotNode.eventHandlers = defaultSlot.eventHandlers.map(h => ({
                  ...h,
                  actions: [...h.actions]
                }))
              }

              instanceChildren.push(slotNode)
            } else {
              // No slot defined - create a simple text node
              const textNode = createTextNode(
                stringValue,
                ctx.generateId.bind(ctx),
                stringToken.line,
                stringToken.column
              )
              textNode._isListItem = true
              instanceChildren.push(textNode)
            }

            if (ctx.current()?.type === 'NEWLINE') {
              ctx.advance()
            }
          }
        }
        else if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'COMPONENT_DEF') {
          // Handle both instances (COMPONENT_NAME) and definitions (COMPONENT_DEF) as children
          const child = parseComponentFn(ctx, childIndent, componentName)
          if (child) {
            instanceChildren.push(child)
          }
        }
        else {
          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
        }
      } else {
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else if (token.type === 'COMPONENT_NAME') {
      break
    } else if (token.type === 'STRING') {
      const stringToken = ctx.current()!
      const textNode = createTextNode(
        ctx.advance().value,
        ctx.generateId.bind(ctx),
        stringToken.line,
        stringToken.column
      )
      instanceChildren.push(textNode)

      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  // Doc-mode "breakout": Allow multiline strings to start at any indentation
  // This handles the case where content-heavy text blocks can use the full editor width
  // Example:
  //   doc
  //     section
  //       text
  //   '...'   ← This unindented string belongs to the text component above
  if ((node.name === 'text' || node.name === 'playground') && !node.properties._docContent) {
    // Save position to restore if no multiline string found
    const savedPos = ctx.pos

    // Skip any newlines and indentation
    while (ctx.current() && (ctx.current()!.type === 'NEWLINE' || ctx.current()!.type === 'INDENT')) {
      ctx.advance()
    }

    // Check for multiline string at any indentation level
    if (ctx.current()?.type === 'MULTILINE_STRING') {
      node.properties._docContent = ctx.advance().value
      node._isLibrary = true
      node._libraryType = node.name

      // Consume trailing newline if present
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      // No multiline string found - restore position
      ctx.pos = savedPos
    }
  }

  return instanceChildren
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONDITIONALS (if/else)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @doc parseConditional
 * @brief Parst einen Conditional-Block (if/else)
 * @input ctx am CONTROL "if" Token
 * @output Conditional-Node oder null (bei Property-Conditional)
 *
 * @detection Property-Conditional: if nächstes Token nach INDENT = PROPERTY
 * @detection Child-Conditional: sonst (COMPONENT_NAME, STRING, CONTROL)
 *
 * @syntax Property-Conditional:
 *   Button
 *     if $active
 *       background #3B82F6
 *     else
 *       background #333
 *   → Schreibt in node.conditionalProperties
 *
 * @syntax Child-Conditional:
 *   if $isLoggedIn
 *     Avatar
 *   else
 *     Button "Login"
 *   → Erzeugt CONDITIONAL-Node mit children + elseChildren
 *
 * @delegates parseConditionalProperties für Property-Conditionals
 * @delegates parseConditionalChildren für Child-Conditionals
 */
function parseConditional(
  ctx: ParserContext,
  node: ASTNode,
  childIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
): ASTNode | null {
  const ifLine = ctx.current()!.line
  ctx.advance() // consume 'if'
  const condition = parseCondition(ctx)

  // Check for inline conditional on child line: if $cond then prop value else prop value
  // This is when 'then' follows immediately (no NEWLINE between condition and 'then')
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'then') {
    if (condition) {
      parseInlineConditionalOnChildLine(ctx, node, condition)
    }
    // Consume the rest of the line
    if (ctx.current()?.type === 'NEWLINE') {
      ctx.advance()
    }
    return null
  }

  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  let isPropertyConditional = false
  if (ctx.current()?.type === 'INDENT') {
    const peekIndent = parseInt(ctx.current()!.value, 10)
    if (peekIndent > childIndent) {
      const nextTokenType = ctx.peek(1)?.type
      isPropertyConditional = nextTokenType === 'PROPERTY'
    }
  }

  if (isPropertyConditional && condition) {
    parseConditionalProperties(ctx, node, condition, childIndent)
    return null
  } else {
    return parseConditionalChildren(ctx, condition, ifLine, childIndent, componentName, parseComponentFn)
  }
}

/**
 * @doc parseInlineConditionalOnChildLine
 * @brief Parst inline conditional auf einer Kind-Zeile
 * @input ctx am CONTROL 'then' Token, condition bereits geparst
 * @output Schreibt in node.conditionalProperties
 *
 * @syntax if $cond then prop value else prop value
 *   Beispiel (als Kind-Zeile mit Einrückung):
 *     Checkbox
 *       if $showDone then bg #2271c1 else bg #333
 *
 * Reuses parseInlineConditionalProperties from inline-properties.ts
 */
function parseInlineConditionalOnChildLine(
  ctx: ParserContext,
  node: ASTNode,
  condition: ConditionExpr
): void {
  // Consume 'then'
  ctx.advance()

  // Parse then properties
  const thenProperties = parseInlineConditionalProperties(ctx)

  let elseProperties: DSLProperties | undefined

  // Check for 'else'
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
    ctx.advance() // consume 'else'
    elseProperties = parseInlineConditionalProperties(ctx)
  }

  // Add to conditionalProperties
  if (!node.conditionalProperties) node.conditionalProperties = []
  node.conditionalProperties.push({
    condition,
    thenProperties,
    elseProperties
  })
}

/**
 * @doc parseSimplePropertyValue
 * @brief Parst einen einfachen Property-Wert
 * @input ctx am aktuellen Token (NUMBER, COLOR, TOKEN_REF, COMPONENT_NAME)
 * @output number | string | boolean
 *
 * @syntax NUMBER → number
 * @syntax COLOR → string
 * @syntax TOKEN_REF → resolved value aus designTokens
 * @syntax COMPONENT_NAME → string (keyword)
 * @default true (boolean properties)
 */
function parseSimplePropertyValue(
  ctx: ParserContext
): string | number | boolean {
  const next = ctx.current()
  if (next?.type === 'NUMBER') {
    return parseInt(ctx.advance().value, 10)
  } else if (next?.type === 'COLOR') {
    return ctx.advance().value
  } else if (next?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)
    if (tokenValue !== undefined && !isTokenSequence(tokenValue)) {
      return tokenValue
    }
    return true
  } else if (next?.type === 'COMPONENT_NAME') {
    return ctx.advance().value
  }
  return true
}

/**
 * @doc parsePropertiesBlock
 * @brief Parst einen Block von Properties (fuer then/else Zweige)
 * @input ctx am INDENT Token, childIndent: Basis-Einrueckung
 * @output Record<string, string | number | boolean>
 *
 * @syntax Mehrere Properties eingerueckt:
 *   if $active
 *     background #3B82F6
 *     color #FFF
 *     padding 16
 *
 * @stops wenn Einrueckung <= childIndent (Ende des Blocks)
 */
function parsePropertiesBlock(
  ctx: ParserContext,
  childIndent: number
): Record<string, string | number | boolean> {
  const properties: Record<string, string | number | boolean> = {}

  while (ctx.current()?.type === 'INDENT') {
    const propIndent = parseInt(ctx.current()!.value, 10)
    if (propIndent > childIndent) {
      ctx.advance()
      while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
        if (ctx.current()!.type === 'PROPERTY') {
          const propName = ctx.advance().value
          properties[propName] = parseSimplePropertyValue(ctx)
        } else {
          break
        }
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  return properties
}

/**
 * @doc parseConditionalProperties
 * @brief Parst bedingte Properties und speichert in node.conditionalProperties
 * @input ctx am eingerueckten Property-Block, condition: Parsed Condition
 * @output Schreibt in node.conditionalProperties
 *
 * @syntax
 *   Button
 *     if $active
 *       background #3B82F6    ← then-Block
 *       color #FFF
 *     else
 *       background #333       ← else-Block
 *       color #999
 *
 * @structure
 *   node.conditionalProperties = [{
 *     condition: ConditionExpr,
 *     thenProperties: { background: "#3B82F6", color: "#FFF" },
 *     elseProperties: { background: "#333", color: "#999" }
 *   }]
 */
function parseConditionalProperties(
  ctx: ParserContext,
  node: ASTNode,
  condition: ConditionExpr,
  childIndent: number
): void {
  const thenProperties = parsePropertiesBlock(ctx, childIndent)
  let elseProperties: DSLProperties | undefined

  // Check for 'else' block
  if (ctx.current()?.type === 'INDENT') {
    const elseIndent = parseInt(ctx.current()!.value, 10)
    if (elseIndent === childIndent) {
      const savedPos = ctx.pos
      ctx.advance()
      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance()

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }

        elseProperties = parsePropertiesBlock(ctx, childIndent)
      } else {
        ctx.pos = savedPos
      }
    }
  }

  if (!node.conditionalProperties) node.conditionalProperties = []
  node.conditionalProperties.push({
    condition,
    thenProperties,
    elseProperties
  })
}

/**
 * @doc parseConditionalBlockChild
 * @brief Parst ein Kind innerhalb eines Conditional-Blocks
 * @input ctx am aktuellen Token, innerIndent: Einrueckung des then/else Blocks
 * @output ASTNode oder null
 *
 * @handles CONTROL "if" → Nested Conditional
 * @handles STRING → Text-Node
 * @handles COMPONENT_NAME → Kind-Component
 *
 * @recursion Unterstuetzt verschachtelte if/else Bloecke
 *
 * @example
 *   if $loggedIn
 *     if $isPremium        ← Nested if
 *       PremiumBadge
 *     else
 *       FreeBadge
 */
function parseConditionalBlockChild(
  ctx: ParserContext,
  innerIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
): ASTNode | null {
  // Check for nested 'if' conditional
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
    const ifLine = ctx.current()!.line
    ctx.advance() // consume 'if'
    const nestedCondition = parseCondition(ctx)

    if (ctx.current()?.type === 'NEWLINE') {
      ctx.advance()
    }

    return parseConditionalChildren(ctx, nestedCondition, ifLine, innerIndent, componentName, parseComponentFn)
  }

  // Check for string content
  if (ctx.current()?.type === 'STRING') {
    const stringToken = ctx.current()!
    const textNode = createTextNode(
      ctx.advance().value,
      ctx.generateId.bind(ctx),
      stringToken.line,
      stringToken.column
    )
    return textNode
  }

  // Parse component
  if (ctx.current()?.type === 'COMPONENT_NAME') {
    return parseComponentFn(ctx, innerIndent, componentName)
  }

  return null
}

/**
 * @doc parseConditionalChildren
 * @brief Parst Child-Conditional (if/else mit Component-Kindern)
 * @input ctx nach CONTROL "if", condition: Parsed Condition
 * @output CONDITIONAL-Node mit children + elseChildren
 *
 * @syntax
 *   if $isLoggedIn
 *     Avatar          ← then-child
 *     Text $user.name ← then-child
 *   else
 *     Button "Login"  ← else-child
 *
 * @node-structure
 *   {
 *     type: 'component',
 *     name: INTERNAL_NODES.CONDITIONAL,
 *     condition: ConditionExpr,
 *     children: [...],      // then-children
 *     elseChildren: [...]   // else-children (optional)
 *   }
 *
 * @rendering Beim Rendern wird basierend auf condition children ODER elseChildren gerendert
 */
function parseConditionalChildren(
  ctx: ParserContext,
  condition: ConditionExpr | null,
  ifLine: number,
  childIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
): ASTNode {
  const condNode: ASTNode = {
    type: 'component',
    name: INTERNAL_NODES.CONDITIONAL,
    id: ctx.generateId('cond'),
    properties: {},
    children: [],
    condition: condition || undefined,
    line: ifLine
  }

  while (ctx.current()?.type === 'INDENT') {
    const thenIndent = parseInt(ctx.current()!.value, 10)
    if (thenIndent > childIndent) {
      ctx.advance()
      const thenChild = parseConditionalBlockChild(ctx, thenIndent, componentName, parseComponentFn)
      if (thenChild) {
        condNode.children.push(thenChild)
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  if (ctx.current()?.type === 'INDENT') {
    const elseIndent = parseInt(ctx.current()!.value, 10)
    if (elseIndent === childIndent) {
      const savedPos = ctx.pos
      ctx.advance()
      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance()
        condNode.elseChildren = []

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }

        while (ctx.current()?.type === 'INDENT') {
          const elseChildIndent = parseInt(ctx.current()!.value, 10)
          if (elseChildIndent > childIndent) {
            ctx.advance()
            const elseChild = parseConditionalBlockChild(ctx, elseChildIndent, componentName, parseComponentFn)
            if (elseChild) {
              condNode.elseChildren.push(elseChild)
            }
            if (ctx.current()?.type === 'NEWLINE') {
              ctx.advance()
            }
          } else {
            break
          }
        }
      } else {
        ctx.pos = savedPos
      }
    }
  }

  return condNode
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP-LEVEL PARSING (Root-Ebene)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @doc parseTopLevelConditional
 * @brief Parst Conditional-Block auf Root-Ebene (ohne Parent-Einrueckung)
 * @input ctx am CONTROL "if" Token
 * @output CONDITIONAL-Node
 *
 * @syntax
 *   if $darkMode
 *     ThemeProvider theme "dark"
 *   else
 *     ThemeProvider theme "light"
 *
 * @difference Root-Level: else kommt direkt als CONTROL (ohne INDENT davor)
 * @difference Child-Level: else kommt mit INDENT auf gleicher Stufe wie if
 *
 * @exported Wird von parser.ts verwendet fuer Root-Conditionals
 */
export function parseTopLevelConditional(
  ctx: ParserContext,
  parseComponentFn: ComponentParserFn
): ASTNode | null {
  const ifLine = ctx.current()!.line
  ctx.advance() // consume 'if'
  const condition = parseCondition(ctx)

  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Create conditional node
  const condNode: ASTNode = {
    type: 'component',
    name: INTERNAL_NODES.CONDITIONAL,
    id: ctx.generateId('cond'),
    properties: {},
    children: [],
    condition: condition || undefined,
    line: ifLine
  }

  // Parse 'then' children (indent > 0)
  while (ctx.current()?.type === 'INDENT') {
    const thenIndent = parseInt(ctx.current()!.value, 10)
    if (thenIndent > 0) {
      ctx.advance() // consume indent
      const thenChild = parseComponentFn(ctx, thenIndent, '')
      if (thenChild) {
        condNode.children.push(thenChild)
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  // At top level, 'else' comes without INDENT (directly as CONTROL token)
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
    ctx.advance() // consume 'else'
    condNode.elseChildren = []

    if (ctx.current()?.type === 'NEWLINE') {
      ctx.advance()
    }

    // Parse 'else' children (indent > 0)
    while (ctx.current()?.type === 'INDENT') {
      const elseIndent = parseInt(ctx.current()!.value, 10)
      if (elseIndent > 0) {
        ctx.advance() // consume indent
        const elseChild = parseComponentFn(ctx, elseIndent, '')
        if (elseChild) {
          condNode.elseChildren.push(elseChild)
        }
        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        break
      }
    }
  }

  return condNode
}

/**
 * @doc parseTopLevelIterator
 * @brief Parst Iterator-Block auf Root-Ebene (ohne Parent-Einrueckung)
 * @input ctx am CONTROL "each" Token
 * @output ITERATOR-Node
 *
 * @syntax each $item in $collection
 *   Schleife ueber Collection
 *   Beispiel:
 *     $users: [{ name: "Alice" }, { name: "Bob" }]
 *     each $user in $users
 *       UserCard $user.name
 *
 * @syntax each $item in $data.nested.path
 *   Collection mit verschachteltem Pfad
 *   Beispiel:
 *     each $task in $project.tasks.active
 *       Task $task.title
 *
 * @node-structure
 *   {
 *     type: 'component',
 *     name: INTERNAL_NODES.ITERATOR,
 *     iteration: {
 *       itemVar: '$item',
 *       collectionVar: '$collection',
 *       collectionPath: ['$collection', 'nested', 'path']  // optional
 *     },
 *     children: [...]  // Template-Children, werden fuer jedes Item gerendert
 *   }
 *
 * @exported Wird von parser.ts verwendet fuer Root-Iterators
 */
export function parseTopLevelIterator(
  ctx: ParserContext,
  parseComponentFn: ComponentParserFn
): ASTNode {
  const eachLine = ctx.current()!.line
  ctx.advance() // consume 'each'

  // Parse: each $item in $items
  let itemVar = ''
  if (ctx.current()?.type === 'TOKEN_REF') {
    itemVar = ctx.advance().value
  }

  // Consume 'in'
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'in') {
    ctx.advance()
  }

  // Parse collection
  let collectionVar = ''
  let collectionPath: string[] | undefined
  if (ctx.current()?.type === 'TOKEN_REF') {
    const collectionValue = ctx.advance().value
    const parts = collectionValue.split('.')
    collectionVar = parts[0]
    if (parts.length > 1) {
      collectionPath = parts
    }
  }

  const iterNode: ASTNode = {
    type: 'component',
    name: INTERNAL_NODES.ITERATOR,
    id: ctx.generateId('iter'),
    properties: {},
    children: [],
    iteration: {
      itemVar,
      collectionVar,
      collectionPath
    },
    line: eachLine
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse template children (indent > 0 at top level)
  while (ctx.current()?.type === 'INDENT') {
    const templateIndent = parseInt(ctx.current()!.value, 10)
    if (templateIndent > 0) {
      ctx.advance() // consume indent
      const templateChild = parseComponentFn(ctx, templateIndent, '')
      if (templateChild) {
        iterNode.children.push(templateChild)
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  return iterNode
}
