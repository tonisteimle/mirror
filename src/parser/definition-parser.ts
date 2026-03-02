/**
 * @module definition-parser
 * @description Definition Parser - Parst Komponenten- und Token-Definitionen
 *
 * Verarbeitet alle Definition-Syntax-Varianten und speichert Templates
 * in ctx.registry und ctx.designTokens.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KOMPONENTEN-DEFINITIONEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Button: pad 12, bg #3B82F6
 *   Inline-Definition
 *   → ctx.registry.set('Button', template)
 *
 * @syntax DangerButton: Button bg #EF4444
 *   Definition mit Vererbung
 *   → Kopiert Button-Template, überschreibt background
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN-DEFINITIONEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax $primary: #3B82F6
 *   Einfache Token-Definition (Farbe)
 *   → ctx.designTokens.set('primary', '#3B82F6')
 *
 * @syntax $spacing: 16
 *   Numerische Token-Definition
 *   → ctx.designTokens.set('spacing', 16)
 *
 * @syntax $default-pad: l-r 4
 *   Komplexe Sequence-Definition
 *   → ctx.designTokens.set('default-pad', { type: 'sequence', tokens: [...] })
 *
 * @syntax $lg-pad: $base-pad 8
 *   Token mit verschachtelten Token-Referenzen
 *   → ctx.designTokens.set('lg-pad', { type: 'sequence', tokens: [...] })
 *
 * @syntax $data: [{ title: "Task 1" }, { title: "Task 2" }]
 *   JSON-Array-Definition
 *   → ctx.designTokens.set('data', parsed JSON)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMPLATE-STRUKTUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type ComponentTemplate
 *   properties: Record<string, unknown>   // CSS-Properties
 *   children: ASTNode[]                   // Kind-Slots
 *   content?: string                      // Text-Inhalt
 *   states?: StateDefinition[]            // State-Definitionen
 *   eventHandlers?: EventHandler[]        // Event-Handler
 *   showAnimation?: AnimationDefinition   // Show-Animation
 *   hideAnimation?: AnimationDefinition   // Hide-Animation
 *   continuousAnimation?: AnimationDefinition // Kontinuierliche Animation
 *   extends?: string                      // Basis-Komponente (für Roundtrip)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNKTIONEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseInlineDefinition (für brace-syntax)
 *   Parst Definition: Button: { pad 12 } (brace-syntax)
 *   Input: COMPONENT_NAME + COLON + BRACE_OPEN am Cursor
 *   Output: Registriert Template in ctx.registry
 *   Note: Inline (Button: pad 12) wird von parseComponentDefinition behandelt
 *
 * @function parseTokenDefinition
 *   Parst Token-Definition: $primary: #3B82F6
 *   Input: TOKEN_VAR_DEF am Cursor
 *   Output: Registriert Token in ctx.designTokens
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIELE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Inline-Definition
 *   Button: pad 12, bg #3B82F6
 *     hover
 *       bg #2563EB
 *
 * @example Vererbung
 *   DangerButton: Button bg #EF4444
 *   Note: Basis-Komponente (Button) muss VOR erbender definiert sein!
 *
 * @example Vererbung mit Child-Overrides (Semicolon-Syntax)
 *   Button:
 *     icon "check", hidden
 *     label "Click"
 *   Icon-Button: Button icon visible; label hidden
 *   → Überschreibt icon.hidden=false und label.hidden=true
 *
 * @example Token mit Suffix-Inferenz
 *   $primary-color: #3B82F6    // → bg Property
 *   $base-padding: 16          // → pad Property
 *   $btn-radius: 8             // → rad Property
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PROPERTY-SYNTAX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax size hug 32
 *   Kombinierte Dimension-Property
 *   → w: 'min', h: 32 (width=fit-content, height=32px)
 *
 * @syntax size 100 200
 *   → w: 100, h: 200 (width=100px, height=200px)
 *
 * @syntax size full
 *   → w: 'max', h: 'max' (100% + flex-grow)
 *
 * @syntax text-size 16 | ts 16 | font-size 16 | fs 16
 *   Schriftgröße (für Text-Komponenten)
 *   → text-size: 16 (intern normalisiert)
 *
 * @syntax icon-size 20 | is 20
 *   Icon-Größe (für Icon-Komponenten)
 *   → icon-size: 20
 *
 * @syntax pad left 8 right 12
 *   Padding mit ausgeschriebenen Richtungen
 *   → pad_l: 8, pad_r: 12
 *
 * @syntax pad top 8 bottom 24
 *   → pad_u: 8, pad_d: 24
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, ComponentTemplate } from './types'
import { CSS_COLOR_KEYWORDS, splitDirections, applySpacingToProperties } from './parser-utils'
import { parseStateDefinition, parseStateCategoryDefinition, parseVariableDeclaration, parseEventHandler, parseBehaviorStateDefinition, parseAnimationAction, parseAction, parseKeysBlock } from './state-parser'
import { ACTION_KEYWORDS, KEY_MODIFIERS, DIRECTION_SHORT_FORMS } from '../dsl/properties'
import { BEHAVIOR_STATE_KEYWORDS, PROPERTY_KEYWORD_VALUES, SYSTEM_STATES } from '../dsl/properties'
import { parseComponent } from './component-parser'
import { HTML_PRIMITIVES } from './component-parser/constants'
import { parseLayoutProperty, parseCenterProperty } from './property-parser'
import { createTextNode } from './parser-utils'
import { parseBlockContent } from './block-parser'
import { inferPropertyFromTokenName } from './property-inference'

/**
 * Merge two component templates.
 * Later template properties override earlier ones, but events/states/children are merged.
 *
 * @param existing - The existing template in the registry
 * @param incoming - The new template being defined
 * @returns Merged template
 */
function mergeTemplates(existing: ComponentTemplate, incoming: ComponentTemplate): ComponentTemplate {
  const merged: ComponentTemplate = {
    // Properties from incoming override existing
    properties: { ...existing.properties, ...incoming.properties },
    // Children are merged (append new children)
    children: [...(existing.children || []), ...(incoming.children || [])]
  }

  // Merge content (incoming wins if present)
  if (incoming.content !== undefined) {
    merged.content = incoming.content
  } else if (existing.content !== undefined) {
    merged.content = existing.content
  }

  // Merge states (incoming overrides existing states with same name)
  if (existing.states || incoming.states) {
    const existingStates = existing.states || []
    const incomingStates = incoming.states || []

    // Create a map of incoming state names for quick lookup
    const incomingStateNames = new Set(incomingStates.map(s => s.name))

    // Keep existing states that aren't overridden by incoming states
    const keptExisting = existingStates.filter(s => !incomingStateNames.has(s.name))

    // Combine: kept existing + all incoming
    merged.states = [...keptExisting, ...incomingStates]
  }

  // Merge event handlers (append)
  if (existing.eventHandlers || incoming.eventHandlers) {
    merged.eventHandlers = [
      ...(existing.eventHandlers || []),
      ...(incoming.eventHandlers || [])
    ]
  }

  // Animations (incoming wins)
  if (incoming.showAnimation || existing.showAnimation) {
    merged.showAnimation = incoming.showAnimation || existing.showAnimation
  }
  if (incoming.hideAnimation || existing.hideAnimation) {
    merged.hideAnimation = incoming.hideAnimation || existing.hideAnimation
  }
  if (incoming.continuousAnimation || existing.continuousAnimation) {
    merged.continuousAnimation = incoming.continuousAnimation || existing.continuousAnimation
  }

  // Preserve extends if present
  if (incoming.extends || existing.extends) {
    merged.extends = incoming.extends || existing.extends
  }

  // Preserve library flags
  if (incoming._isLibrary || existing._isLibrary) {
    merged._isLibrary = incoming._isLibrary || existing._isLibrary
  }
  if (incoming._libraryType || existing._libraryType) {
    merged._libraryType = incoming._libraryType || existing._libraryType
  }

  return merged
}

/**
 * Register or merge a template into the registry.
 * If a template already exists, merge the new template into it.
 */
function registerTemplate(ctx: ParserContext, name: string, template: ComponentTemplate): void {
  const existing = ctx.registry.get(name)
  if (existing) {
    ctx.registry.set(name, mergeTemplates(existing as ComponentTemplate, template))
  } else {
    ctx.registry.set(name, template)
  }
}

/**
 * Parse a component definition: Button: pad 12 or DangerButton: Button bg red
 *
 * Syntax uses colon after name and comma-separated properties:
 * - Definition: `Button: pad 12, bg #3B82F6`
 * - Definition with inheritance: `DangerButton: Button bg #EF4444`
 *
 * The colon distinguishes definitions from instances:
 * - `Button: pad 12` = Definition (registers template, doesn't render)
 * - `Button "Click"` = Instance (uses template, renders)
 */
export function parseInlineDefinition(ctx: ParserContext): void {
  const componentName = ctx.advance().value // COMPONENT_NAME
  ctx.advance() // COLON

  const template: ComponentTemplate = {
    properties: {},
    children: []
  }

  // Check for inheritance: DangerButton: Button { }
  let baseComponentName: string | undefined
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.peek(1)?.type === 'BRACE_OPEN') {
    baseComponentName = ctx.advance().value

    // Track inheritance for roundtrip
    template.extends = baseComponentName

    // Apply base component template if it exists
    if (ctx.registry.has(baseComponentName)) {
      const baseTemplate = ctx.registry.get(baseComponentName)!
      template.properties = { ...baseTemplate.properties }
      if (baseTemplate.content) {
        template.content = baseTemplate.content
      }
      if (baseTemplate.children.length > 0) {
        // Deep clone children to prevent mutation of base template
        template.children = baseTemplate.children.map(child => ({
          ...child,
          properties: { ...child.properties },
          children: child.children.map(c => ({ ...c, properties: { ...c.properties } }))
        }))
      }
      if (baseTemplate.states) {
        template.states = baseTemplate.states.map(state => ({ ...state }))
      }
      if (baseTemplate.eventHandlers) {
        template.eventHandlers = baseTemplate.eventHandlers.map(handler => ({ ...handler }))
      }
    }
  }

  // Expect BRACE_OPEN
  if (ctx.current()?.type !== 'BRACE_OPEN') {
    return
  }
  ctx.advance() // consume {

  // Parse block content using block-parser
  // Create a temporary node to collect the parsed content
  const tempNode: ASTNode = {
    type: 'component',
    name: componentName,
    id: '',
    properties: { ...template.properties },
    children: [...template.children],
    line: 0,
    column: 0
  }

  // Copy over inherited states and event handlers
  if (template.states) tempNode.states = [...template.states]
  if (template.eventHandlers) tempNode.eventHandlers = [...template.eventHandlers]

  // Parse block content using block-parser
  parseBlockContent(ctx, tempNode, (_ctx: ParserContext, _indent: number) => {
    // Nested components in brace definitions
    return parseComponent(_ctx, 0, componentName, false, true)
  })

  // Consume closing brace
  if (ctx.current()?.type === 'BRACE_CLOSE') {
    ctx.advance()
  }

  // Transfer parsed content to template
  template.properties = tempNode.properties as typeof template.properties
  template.children = tempNode.children as typeof template.children
  if (tempNode.content) template.content = tempNode.content
  if (tempNode.states) template.states = tempNode.states
  if (tempNode.eventHandlers) template.eventHandlers = tempNode.eventHandlers
  if (tempNode.showAnimation) template.showAnimation = tempNode.showAnimation
  if (tempNode.hideAnimation) template.hideAnimation = tempNode.hideAnimation
  if (tempNode.continuousAnimation) template.continuousAnimation = tempNode.continuousAnimation

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Register the template
  registerTemplate(ctx, componentName, template)
}

/**
 * Parse a library component definition (brace-syntax).
 *
 * Library components have special behavior handlers (Dropdown, Dialog, Accordion, etc.)
 * The 'as' syntax allows custom naming while using library behavior.
 *
 * Pattern: COMPONENT_NAME + 'as' + LIBRARY_TYPE + COLON + BRACE_OPEN
 * Example: OptionsMenu as Dropdown: { width 200
 *   Trigger
 *   Menu
 * }
 */
export function parseLibraryDefinition(ctx: ParserContext): void {
  const componentName = ctx.advance().value // COMPONENT_NAME (e.g., "OptionsMenu")
  ctx.advance() // 'as' keyword
  const libraryType = ctx.advance().value // COMPONENT_NAME (e.g., "Dropdown")
  ctx.advance() // COLON

  const template: ComponentTemplate = {
    properties: {},
    children: [],
    _isLibrary: true,
    _libraryType: libraryType
  }

  // Expect BRACE_OPEN
  if (ctx.current()?.type !== 'BRACE_OPEN') {
    return
  }
  ctx.advance() // consume {

  // Create a temporary node to collect the parsed content
  const tempNode: ASTNode = {
    type: 'component',
    name: componentName,
    id: '',
    properties: {},
    children: [],
    line: 0,
    column: 0,
    _isLibrary: true,
    _libraryType: libraryType
  }

  // Parse block content using block-parser
  parseBlockContent(ctx, tempNode, (_ctx: ParserContext, _indent: number) => {
    // Nested components in brace definitions
    return parseComponent(_ctx, 0, componentName, false, true)
  })

  // Consume closing brace
  if (ctx.current()?.type === 'BRACE_CLOSE') {
    ctx.advance()
  }

  // Transfer parsed content to template
  template.properties = tempNode.properties as typeof template.properties
  template.children = tempNode.children as typeof template.children
  if (tempNode.content) template.content = tempNode.content
  if (tempNode.states) template.states = tempNode.states
  if (tempNode.eventHandlers) template.eventHandlers = tempNode.eventHandlers
  if (tempNode.showAnimation) template.showAnimation = tempNode.showAnimation
  if (tempNode.hideAnimation) template.hideAnimation = tempNode.hideAnimation
  if (tempNode.continuousAnimation) template.continuousAnimation = tempNode.continuousAnimation

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Register the template
  registerTemplate(ctx, componentName, template)
}

/**
 * Parse a library component definition (inline syntax, no braces).
 *
 * Pattern: COMPONENT_NAME + 'as' + COMPONENT_DEF (e.g., "Tooltip:")
 * Example: HelpTip as Tooltip:
 *   Trigger
 *     Button "?"
 *   Content: pad 8, bg #333
 */
export function parseLibraryDefinitionV1(ctx: ParserContext): void {
  const componentName = ctx.advance().value // COMPONENT_NAME (e.g., "HelpTip")
  ctx.advance() // 'as' keyword
  const libraryTypeWithColon = ctx.advance().value // COMPONENT_DEF (e.g., "Tooltip:")
  const libraryType = libraryTypeWithColon.replace(/:$/, '') // Remove trailing colon

  const template: ComponentTemplate = {
    properties: {},
    children: [],
    _isLibrary: true,
    _libraryType: libraryType
  }

  // Parse inline properties on same line
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    // Handle property name-value pairs
    if (token.type === 'PROPERTY') {
      const propName = ctx.advance().value
      // Handle spread → between alias
      if (propName === 'spread') {
        template.properties['between'] = true
      } else if (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF' && ctx.current()!.type !== 'COMMA') {
        const propValue = ctx.advance().value
        template.properties[propName] = isNaN(Number(propValue)) ? propValue : Number(propValue)
      } else {
        // Boolean property (no value)
        template.properties[propName] = true
      }
    } else if (token.type === 'NUMBER') {
      // Dimension shorthand: width, height
      const num = Number(ctx.advance().value)
      if (!template.properties.w) {
        template.properties.w = num
      } else if (!template.properties.h) {
        template.properties.h = num
      }
    } else if (token.type === 'COMMA') {
      ctx.advance()
    } else {
      ctx.advance()
    }
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse indentation-based children
  const baseIndent = ctx.current()?.type === 'INDENT' ? Number(ctx.current()!.value) : 0
  if (baseIndent > 0) {
    while (ctx.current() && ctx.current()!.type === 'INDENT') {
      const currentIndent = Number(ctx.current()!.value)
      if (currentIndent < baseIndent) break

      ctx.advance() // consume INDENT

      // Parse child component using standard component parser
      const childToken = ctx.current()
      if (childToken && (childToken.type === 'COMPONENT_NAME' || childToken.type === 'COMPONENT_DEF')) {
        const child = parseComponent(ctx, currentIndent, componentName, childToken.type === 'COMPONENT_DEF', true)
        if (child) {
          template.children.push(child)
        }
      }
    }
  }

  // Register the template
  registerTemplate(ctx, componentName, template)
}

/**
 * Parse a component definition: Button: hor cen gap 8 "Label"
 */
export function parseComponentDefinition(ctx: ParserContext): void {
  const componentName = ctx.advance().value
  const template: ComponentTemplate = {
    properties: {},
    children: []
  }

  // Track if we're inheriting from a base component
  let isInheriting = false

  // Check for inline inheritance: DangerButton: Button bg #EF4444
  // If the next token is a COMPONENT_NAME that exists in the registry, it's inheritance
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.registry.has(ctx.current()!.value)) {
    const baseComponentName = ctx.advance().value
    isInheriting = true
    template.extends = baseComponentName

    // Apply base component template
    const baseTemplate = ctx.registry.get(baseComponentName)!
    template.properties = { ...baseTemplate.properties }
    if (baseTemplate.content) {
      template.content = baseTemplate.content
    }
    if (baseTemplate.children.length > 0) {
      // Deep clone children to prevent mutation of base template
      template.children = baseTemplate.children.map(child => ({
        ...child,
        properties: { ...child.properties },
        children: child.children.map(c => ({ ...c, properties: { ...c.properties } }))
      }))
    }
    if (baseTemplate.states) {
      template.states = baseTemplate.states.map(state => ({ ...state, properties: { ...state.properties } }))
    }
    if (baseTemplate.eventHandlers) {
      template.eventHandlers = baseTemplate.eventHandlers.map(handler => ({ ...handler }))
    }
  }
  // Check for primitive inheritance: InputBase: Input pad 8
  // If the next token is a COMPONENT_NAME that is an HTML primitive
  else if (ctx.current()?.type === 'COMPONENT_NAME' && HTML_PRIMITIVES.includes(ctx.current()!.value)) {
    const primitiveType = ctx.advance().value
    template.properties._primitiveType = primitiveType
  }
  // Check for "from" keyword: PrimaryButton: from Button col #EF4444
  else if (ctx.current()?.type === 'KEYWORD' && ctx.current()?.value === 'from') {
    ctx.advance() // consume 'from'
    isInheriting = true

    // Get base component name
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const baseComponentName = ctx.advance().value

      // Apply base component template if it exists
      if (ctx.registry.has(baseComponentName)) {
        const baseTemplate = ctx.registry.get(baseComponentName)!
        template.properties = { ...baseTemplate.properties }
        if (baseTemplate.content) {
          template.content = baseTemplate.content
        }
        if (baseTemplate.children.length > 0) {
          // Deep clone children to prevent mutation of base template
          template.children = baseTemplate.children.map(child => ({
            ...child,
            properties: { ...child.properties },
            children: child.children.map(c => ({ ...c, properties: { ...c.properties } }))
          }))
        }
      }
    }
  }

  // Parse properties, modifiers, content on same line
  parseDefinitionInlineProperties(ctx, template)

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse template children (indented lines)
  // Pass isInheriting to enable merging for inherited children
  parseDefinitionChildren(ctx, template, componentName, isInheriting)

  registerTemplate(ctx, componentName, template)
}

/**
 * Parse a component definition with inheritance using "from" syntax:
 * Icon-Button from Button: pad l 12 r 12
 *   icon visible, pad 0
 *   label hidden
 *
 * Token sequence: COMPONENT_NAME + KEYWORD("from") + COMPONENT_NAME + COLON + properties
 */
export function parseInheritanceDefinition(ctx: ParserContext): void {
  const componentName = ctx.advance().value // COMPONENT_NAME (e.g., "Icon-Button")
  ctx.advance() // KEYWORD "from"
  const baseComponentName = ctx.advance().value // COMPONENT_NAME (e.g., "Button")
  ctx.advance() // COLON

  const template: ComponentTemplate = {
    properties: {},
    children: [],
    extends: baseComponentName
  }

  // Apply base component template if it exists
  if (ctx.registry.has(baseComponentName)) {
    const baseTemplate = ctx.registry.get(baseComponentName)!
    template.properties = { ...baseTemplate.properties }
    if (baseTemplate.content) {
      template.content = baseTemplate.content
    }
    if (baseTemplate.children.length > 0) {
      // Deep clone children to prevent mutation of base template
      template.children = baseTemplate.children.map(child => ({
        ...child,
        properties: { ...child.properties },
        children: child.children.map(c => ({ ...c, properties: { ...c.properties } }))
      }))
    }
    if (baseTemplate.states) {
      template.states = baseTemplate.states.map(state => ({ ...state, properties: { ...state.properties } }))
    }
    if (baseTemplate.eventHandlers) {
      template.eventHandlers = baseTemplate.eventHandlers.map(handler => ({ ...handler }))
    }
  }

  // Parse properties, modifiers, content on same line
  parseDefinitionInlineProperties(ctx, template)

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse template children (indented lines)
  // Pass isInheriting=true to enable merging for inherited children
  parseDefinitionChildren(ctx, template, componentName, true)

  registerTemplate(ctx, componentName, template)
}

/**
 * Parse inline properties for a component definition.
 *
 * Supports semicolon-separated child overrides:
 * IconButton from Button: bg #333; icon visible; label hidden
 *
 * After `;`, if the next token is a lowercase name matching a child in the template,
 * the following properties are applied to that child.
 */
function parseDefinitionInlineProperties(ctx: ParserContext, template: ComponentTemplate): void {
  // Track current target: null = self, string = child name
  let currentTarget: string | null = null

  // Helper to check if a name matches an inherited child
  const matchesInheritedChild = (name: string): boolean => {
    return template.children.some(c => c.name.toLowerCase() === name.toLowerCase())
  }

  // Check if FIRST token is a child name (for inherited templates)
  // This handles: IconButton from Button: icon visible
  // where `icon` should target the inherited icon child
  if (template.children.length > 0) {
    const first = ctx.current()
    if (first?.type === 'COMPONENT_NAME' && matchesInheritedChild(first.value)) {
      currentTarget = first.value
      ctx.advance() // consume child name
    }
  }

  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    // Skip optional comma separators
    if (token.type === 'COMMA') {
      ctx.advance()
      continue
    }

    // Semicolon: check if next token is a child name for override
    if (token.type === 'SEMICOLON') {
      ctx.advance()
      // Check if next token is a child name (lowercase COMPONENT_NAME that exists in template.children)
      const next = ctx.current()
      if (next?.type === 'COMPONENT_NAME' && matchesInheritedChild(next.value)) {
        currentTarget = next.value
        ctx.advance() // consume child name
        continue
      }
      // Not a child name - continue parsing as own properties
      currentTarget = null
      continue
    }

    // If we have a current target (child), apply properties to that child
    if (currentTarget !== null) {
      const child = template.children.find(c => c.name.toLowerCase() === currentTarget!.toLowerCase())
      if (child) {
        parseChildOverrideProperty(ctx, child)
      } else {
        ctx.advance() // Skip if child not found
      }
      continue
    }

    if (token.type === 'PROPERTY') {
      const propName = ctx.advance().value
      // Skip optional colon after property name (brace-syntax: prop: value)
      if (ctx.current()?.type === 'COLON') {
        ctx.advance()
      }

      // Handle pad/mar with directions or CSS shorthand
      if (propName === 'pad' || propName === 'mar') {
        // Parse directions and values, supporting both short (l, r, t, b) and long (left, right, top, bottom) forms
        // Syntax: pad left 8 right 12 OR pad l 8 r 12 OR pad 8 16 (CSS shorthand)

        // Helper to check if token is a long direction name
        // Note: left/right/top/bottom are tokenized as PROPERTY (alignment keywords)
        const isLongDirection = (token: { type: string; value: string } | undefined): boolean => {
          return (token?.type === 'COMPONENT_NAME' || token?.type === 'PROPERTY') && token.value in DIRECTION_SHORT_FORMS
        }

        // Helper to get direction from token
        const getDirection = (token: { type: string; value: string }): string[] => {
          if (token.type === 'DIRECTION') {
            return splitDirections(token.value)
          } else if (isLongDirection(token)) {
            return [DIRECTION_SHORT_FORMS[token.value]]
          }
          return []
        }

        // Check first token to determine parsing mode
        const firstToken = ctx.current()

        if (firstToken?.type === 'NUMBER' || firstToken?.type === 'TOKEN_REF') {
          // CSS shorthand mode: pad 8 or pad 8 16 or pad 8 16 8 16
          const values: number[] = []
          while (ctx.current()?.type === 'NUMBER' || ctx.current()?.type === 'TOKEN_REF') {
            if (ctx.current()?.type === 'NUMBER') {
              values.push(parseInt(ctx.advance().value, 10))
            } else {
              const tokenName = ctx.advance().value
              const tokenValue = ctx.designTokens.get(tokenName)
              if (typeof tokenValue === 'number') {
                values.push(tokenValue)
              }
            }
          }
          applySpacingToProperties(template.properties, propName, values, [])
        } else {
          // Direction-value pairs mode: pad left 8 right 12
          while (ctx.current() && ctx.current()!.type !== 'COMMA' && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
            const token = ctx.current()!
            const dirs = getDirection(token)

            if (dirs.length > 0) {
              ctx.advance() // consume direction
              // Get the value for this direction
              if (ctx.current()?.type === 'NUMBER') {
                const value = parseInt(ctx.advance().value, 10)
                for (const dir of dirs) {
                  template.properties[`${propName}_${dir}`] = value
                }
              } else if (ctx.current()?.type === 'TOKEN_REF') {
                const tokenName = ctx.advance().value
                const tokenValue = ctx.designTokens.get(tokenName)
                if (typeof tokenValue === 'number') {
                  for (const dir of dirs) {
                    template.properties[`${propName}_${dir}`] = tokenValue
                  }
                }
              }
            } else {
              // Not a direction - stop parsing
              break
            }
          }
        }
      } else if (propName === 'bor') {
        // Handle border: direction + width + style + color
        // Syntax: bor: [direction] width [style] [color]
        // Examples: bor: 1, bor: b 2, bor: b 2 #333, bor: 2 dashed #333
        const directions: string[] = []
        while (ctx.current()?.type === 'DIRECTION') {
          directions.push(...splitDirections(ctx.advance().value))
        }

        let width: number | { type: string; name: string } | undefined
        let style: string | undefined
        let color: string | { type: string; name: string } | undefined

        // Parse width (NUMBER or TOKEN_REF)
        if (ctx.current()?.type === 'NUMBER') {
          width = parseInt(ctx.advance().value, 10)
        } else if (ctx.current()?.type === 'TOKEN_REF') {
          const tokenName = ctx.advance().value
          width = { type: 'token', name: tokenName }
        }

        // Parse optional style (BORDER_STYLE)
        if (ctx.current()?.type === 'BORDER_STYLE') {
          style = ctx.advance().value
        }

        // Parse optional color (COLOR, TOKEN_REF, or CSS color keyword)
        if (ctx.current()?.type === 'COLOR') {
          color = ctx.advance().value
        } else if (ctx.current()?.type === 'TOKEN_REF') {
          const tokenName = ctx.advance().value
          color = { type: 'token', name: tokenName }
        } else if (ctx.current()?.type === 'COMPONENT_NAME' && CSS_COLOR_KEYWORDS.has(ctx.current()!.value.toLowerCase())) {
          color = ctx.advance().value
        }

        // Apply to properties
        // Note: width/color can be token refs ({type: 'token', name: string}) resolved later
        if (directions.length > 0) {
          for (const dir of directions) {
            if (width !== undefined) {
              ;(template.properties as Record<string, unknown>)[`bor_${dir}`] = width
            }
            if (style) template.properties[`bor_${dir}_style`] = style
            if (color) (template.properties as Record<string, unknown>)[`bor_${dir}_color`] = color
          }
        } else {
          if (width !== undefined) (template.properties as Record<string, unknown>)['bor'] = width
          if (style) template.properties['bor_style'] = style
          if (color) (template.properties as Record<string, unknown>)['bor_color'] = color
        }
      } else if (propName === 'hor' || propName === 'ver') {
        parseLayoutProperty(ctx, template, propName)
      } else if (propName === 'cen') {
        parseCenterProperty(ctx, template)
      } else if (propName === 'font') {
        if (ctx.current()?.type === 'STRING') {
          template.properties['font'] = ctx.advance().value
        }
      } else if (propName === 'weight') {
        // Special handling for weight: accepts NUMBER or 'bold' keyword
        const next = ctx.current()
        if (next?.type === 'NUMBER') {
          template.properties['weight'] = parseInt(ctx.advance().value, 10)
        } else if (next?.type === 'COMPONENT_NAME' && next.value === 'bold') {
          ctx.advance()
          template.properties['weight'] = 700  // Convert 'bold' to numeric weight
        } else if (next?.type === 'TOKEN_REF') {
          const tokenName = ctx.advance().value
          const tokenValue = ctx.designTokens.get(tokenName)
          if (typeof tokenValue === 'number') {
            template.properties['weight'] = tokenValue
          }
        } else {
          template.properties['weight'] = 700  // Default bold weight
        }
      } else if (propName === 'w-min') {
        template.properties['w'] = 'min'
      } else if (propName === 'w-max') {
        template.properties['w'] = 'max'
      } else if (propName === 'h-min') {
        template.properties['h'] = 'min'
      } else if (propName === 'h-max') {
        template.properties['h'] = 'max'
      } else if (propName === 'size') {
        // Combined dimension property: size hug 32 → w: min, h: 32
        // Supports: size hug, size full, size 100 200, size hug 32
        // Keywords: hug/min → fit-content, full/max → 100% + flex-grow
        const sizingKeywords = ['hug', 'full', 'min', 'max']
        const first = ctx.current()

        // Parse width
        let widthValue: string | number | undefined
        if (first?.type === 'NUMBER') {
          widthValue = parseInt(ctx.advance().value, 10)
        } else if (first?.type === 'PROPERTY' && sizingKeywords.includes(first.value)) {
          ctx.advance()
          widthValue = (first.value === 'hug' || first.value === 'min') ? 'min' : 'max'
        }

        if (widthValue !== undefined) {
          template.properties['w'] = widthValue

          // Parse height
          const next = ctx.current()
          if (next?.type === 'NUMBER') {
            template.properties['h'] = parseInt(ctx.advance().value, 10)
          } else if (next?.type === 'PROPERTY' && sizingKeywords.includes(next.value)) {
            ctx.advance()
            template.properties['h'] = (next.value === 'hug' || next.value === 'min') ? 'min' : 'max'
          } else {
            // Single value: apply to both
            template.properties['h'] = widthValue
          }
        }
      } else if (propName === 'spread') {
        // spread → between (space-between distribution)
        template.properties['between'] = true
      } else if (propName === 'font-size' || propName === 'fs') {
        // Typography: font-size 16 or fs 16 → font-size: 16
        // Used for text components (Text, label, etc.)
        if (ctx.current()?.type === 'NUMBER') {
          template.properties['font-size'] = parseInt(ctx.advance().value, 10)
        }
      } else if (propName === 'icon-size' || propName === 'is') {
        // Icon sizing: icon-size 20 or is 20 → icon-size: 20
        // Used for Icon components (renders as CSS font-size for icon fonts)
        if (ctx.current()?.type === 'NUMBER') {
          template.properties['icon-size'] = parseInt(ctx.advance().value, 10)
        }
      } else {
        const next = ctx.current()
        if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
          template.properties[propName] = next.type === 'NUMBER'
            ? parseInt(ctx.advance().value, 10)
            : ctx.advance().value
        } else if (next?.type === 'TOKEN_REF') {
          // Token reference like $bg-card
          const tokenName = ctx.advance().value
          const tokenValue = ctx.designTokens.get(tokenName)
          if (tokenValue !== undefined && typeof tokenValue !== 'object') {
            template.properties[propName] = tokenValue
          } else {
            // Store as reference for runtime resolution
            template.properties[propName] = `$${tokenName}`
          }
        } else if (next?.type === 'COMPONENT_NAME' && CSS_COLOR_KEYWORDS.has(next.value.toLowerCase())) {
          // CSS color keyword like 'transparent', 'white', etc.
          template.properties[propName] = ctx.advance().value
        } else if (next && (next.type === 'COMPONENT_NAME' || next.type === 'PROPERTY') && PROPERTY_KEYWORD_VALUES.has(next.value.toLowerCase())) {
          // Property keyword value like 'sm', 'md', 'lg' for shadow, 'pointer' for cursor, etc.
          template.properties[propName] = ctx.advance().value
        } else {
          template.properties[propName] = true
        }
      }
    } else if (token.type === 'COLOR') {
      // Bare color → col property (shorthand syntax)
      template.properties['col'] = ctx.advance().value
    } else if (token.type === 'TOKEN_REF') {
      // Bare token reference → try to infer property from token name suffix
      const tokenName = ctx.advance().value
      const tokenValue = ctx.designTokens.get(tokenName)
      const inferredProp = inferPropertyFromTokenName(tokenName)

      if (inferredProp && tokenValue !== undefined) {
        // Apply the token value to the inferred property
        if (typeof tokenValue === 'number' || typeof tokenValue === 'string') {
          template.properties[inferredProp] = tokenValue
        } else {
          // Store as reference for runtime resolution
          template.properties[inferredProp] = `$${tokenName}`
        }
      }
      // Otherwise skip (token might be for other purposes or not yet defined)
    } else if (token.type === 'STRING') {
      const stringToken = token
      const stringValue = ctx.advance().value
      // Create _text child node for the string content
      const textNode = createTextNode(
        stringValue,
        null, // Empty ID - will be generated on instantiation
        stringToken.line,
        stringToken.column
      )
      // Parse properties after the string - they belong to the text node
      while (ctx.current() &&
             ctx.current()!.type !== 'NEWLINE' &&
             ctx.current()!.type !== 'EOF') {
        const afterToken = ctx.current()!
        if (afterToken.type === 'PROPERTY') {
          const propName = ctx.advance().value
          if (ctx.current()?.type === 'NUMBER') {
            textNode.properties[propName] = parseInt(ctx.advance().value, 10)
          } else if (ctx.current()?.type === 'STRING') {
            textNode.properties[propName] = ctx.advance().value
          } else if (ctx.current()?.type === 'COLOR') {
            textNode.properties[propName] = ctx.advance().value
          } else if (ctx.current()?.type === 'TOKEN_REF') {
            textNode.properties[propName] = ctx.advance().value
          } else {
            textNode.properties[propName] = true
          }
        } else if (afterToken.type === 'COLOR') {
          // Bare color after string → text color
          textNode.properties['col'] = ctx.advance().value
        } else if (afterToken.type === 'NUMBER') {
          // Bare number after string → font size
          textNode.properties['size'] = parseInt(ctx.advance().value, 10)
        } else if (afterToken.type === 'TOKEN_REF') {
          // Bare token ref after string → could be color or size
          const tokenName = ctx.advance().value
          const tokenValue = ctx.designTokens.get(tokenName)
          if (typeof tokenValue === 'string') {
            textNode.properties['col'] = tokenValue
          } else if (typeof tokenValue === 'number') {
            textNode.properties['size'] = tokenValue
          }
        } else {
          break
        }
      }
      template.children.push(textNode)
    } else if (token.type === 'EVENT') {
      // Inline event handler: onclick toggle, onhover show Tooltip, etc.
      const eventLine = token.line
      const eventName = ctx.advance().value

      const handler: import('./types').EventHandler = {
        event: eventName,
        actions: [],
        line: eventLine
      }

      // Check for key after onkeydown/onkeyup
      if ((eventName === 'onkeydown' || eventName === 'onkeyup') && ctx.current()?.type === 'COMPONENT_NAME') {
        const possibleKey = ctx.current()!.value.toLowerCase()
        if (KEY_MODIFIERS.has(possibleKey)) {
          handler.key = ctx.advance().value.toLowerCase()
        }
      }

      // Parse inline action
      const current = ctx.current()
      if (current?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(current.value)) {
        const action = parseAction(ctx)
        if (action) handler.actions.push(action)
      }

      // Add handler to template
      if (!template.eventHandlers) template.eventHandlers = []
      template.eventHandlers.push(handler)
    } else if (token.type === 'COMPONENT_NAME' && token.value.toLowerCase() === 'icon') {
      // Handle 'icon' as inline child element (like text)
      const iconToken = ctx.advance()
      const iconNode: import('./types').ASTNode = {
        type: 'component',
        name: 'icon',
        id: '', // Will be generated on instantiation
        properties: {},
        children: [],
        line: iconToken.line,
        column: iconToken.column,
        content: ''
      }
      // Next token should be a STRING with the icon name
      if (ctx.current()?.type === 'STRING') {
        iconNode.content = ctx.advance().value
      }
      // Parse any properties after (like size 20)
      while (ctx.current() &&
             ctx.current()!.type !== 'NEWLINE' &&
             ctx.current()!.type !== 'EOF' &&
             ctx.current()!.type !== 'COMMA') {
        const propToken = ctx.current()!
        if (propToken.type === 'PROPERTY') {
          const propName = ctx.advance().value
          if (ctx.current()?.type === 'NUMBER') {
            iconNode.properties[propName] = parseInt(ctx.advance().value, 10)
          } else if (ctx.current()?.type === 'COLOR') {
            iconNode.properties[propName] = ctx.advance().value
          } else if (ctx.current()?.type === 'TOKEN_REF') {
            iconNode.properties[propName] = ctx.advance().value
          } else {
            iconNode.properties[propName] = true
          }
        } else {
          break
        }
      }
      template.children.push(iconNode)
    } else {
      break
    }
  }
}

/**
 * Parse a single property for a child override (after semicolon).
 * Handles: visible, hidden, and property-value pairs.
 */
function parseChildOverrideProperty(ctx: ParserContext, child: ASTNode): void {
  const token = ctx.current()
  if (!token) return

  // Handle PROPERTY tokens (pad, bg, col, etc.)
  if (token.type === 'PROPERTY') {
    const propName = ctx.advance().value

    // Boolean properties like 'visible', 'hidden'
    if (propName === 'visible') {
      child.properties['hidden'] = false
      return
    }
    if (propName === 'hidden') {
      child.properties['hidden'] = true
      return
    }

    // Property with value
    const next = ctx.current()
    if (next?.type === 'NUMBER') {
      child.properties[propName] = parseInt(ctx.advance().value, 10)
    } else if (next?.type === 'COLOR') {
      child.properties[propName] = ctx.advance().value
    } else if (next?.type === 'STRING') {
      child.properties[propName] = ctx.advance().value
    } else if (next?.type === 'TOKEN_REF') {
      child.properties[propName] = `$${ctx.advance().value}`
    } else if (next?.type === 'COMPONENT_NAME' && CSS_COLOR_KEYWORDS.has(next.value.toLowerCase())) {
      child.properties[propName] = ctx.advance().value
    } else {
      // Boolean property
      child.properties[propName] = true
    }
    return
  }

  // Handle COMPONENT_NAME tokens that might be boolean properties (visible, hidden)
  if (token.type === 'COMPONENT_NAME') {
    const name = token.value.toLowerCase()
    if (name === 'visible') {
      ctx.advance()
      child.properties['hidden'] = false
      return
    }
    if (name === 'hidden') {
      ctx.advance()
      child.properties['hidden'] = true
      return
    }
  }

  // Handle COLOR tokens (bare color → col property)
  if (token.type === 'COLOR') {
    child.properties['col'] = ctx.advance().value
    return
  }

  // Handle NUMBER tokens (context-dependent, skip for now)
  if (token.type === 'NUMBER') {
    ctx.advance()
    return
  }

  // Skip other tokens
  ctx.advance()
}

/**
 * Parse children of a component definition.
 * @param isInheriting - If true, merge children with same name (for 'from' inheritance)
 */
function parseDefinitionChildren(ctx: ParserContext, template: ComponentTemplate, componentName: string, isInheriting = false): void {
  while (ctx.current() && ctx.current()!.type === 'INDENT') {
    const childIndent = parseInt(ctx.current()!.value, 10)
    if (childIndent > 0) {
      ctx.advance() // consume indent

      if (ctx.current()?.type === 'STRING') {
        // Text child
        const stringToken = ctx.current()!
        const textNode = createTextNode(
          ctx.advance().value,
          null, // Empty ID - will be generated on instantiation
          stringToken.line,
          stringToken.column
        )
        template.children.push(textNode)
      }
      // Check for state definition
      // Try category definition first (state categoryName \n nested states)
      else if (ctx.current()?.type === 'STATE') {
        const categoryResult = parseStateCategoryDefinition(ctx, childIndent)
        if (categoryResult) {
          // Category definition parsed successfully
          if (!template.states) template.states = []
          template.states.push(...categoryResult.states)
          if (!template.eventHandlers) template.eventHandlers = []
          template.eventHandlers.push(...categoryResult.eventHandlers)
        } else {
          // Not a category - try regular state definition
          const stateDef = parseStateDefinition(ctx, childIndent)
          if (stateDef) {
            if (!template.states) template.states = []
            template.states.push(stateDef)
          }
        }
      }
      // Check for behavior state block (highlight, select) or system state (hover, focus, active, disabled)
      // These are state blocks where the keyword IS the state name
      // e.g., `highlight` followed by newline and indented properties
      else if (
        ctx.current()?.type === 'COMPONENT_NAME' &&
        (BEHAVIOR_STATE_KEYWORDS.has(ctx.current()!.value) || SYSTEM_STATES.has(ctx.current()!.value)) &&
        ctx.peek(1)?.type === 'NEWLINE'
      ) {
        const stateDef = parseBehaviorStateDefinition(ctx, childIndent)
        if (stateDef) {
          if (!template.states) template.states = []
          template.states.push(stateDef)
        }
      }
      // Check for event handler
      else if (ctx.current()?.type === 'EVENT') {
        const handler = parseEventHandler(ctx, childIndent)
        if (handler) {
          if (!template.eventHandlers) template.eventHandlers = []
          template.eventHandlers.push(handler)
        }
      }
      // Keys block: grouped keyboard event handlers
      else if (ctx.current()?.type === 'KEYS') {
        const handlers = parseKeysBlock(ctx, childIndent)
        if (handlers.length > 0) {
          if (!template.eventHandlers) template.eventHandlers = []
          template.eventHandlers.push(...handlers)
        }
      }
      // Check for variable declaration ($name = value)
      else if (ctx.current()?.type === 'TOKEN_REF' && ctx.peek(1)?.type === 'ASSIGNMENT') {
        const varDecl = parseVariableDeclaration(ctx)
        if (varDecl) {
          if (!template.variables) template.variables = []
          template.variables.push(varDecl)
        }
        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      }
      // Property override (e.g., indented `background #E2E8F0, color #1E293B` in inherited definition)
      else if (ctx.current()?.type === 'PROPERTY') {
        // Parse all properties on this line (comma-separated)
        while (ctx.current()?.type === 'PROPERTY' || ctx.current()?.type === 'COMMA') {
          if (ctx.current()?.type === 'COMMA') {
            ctx.advance()
            continue
          }
          const propName = ctx.advance().value
          const next = ctx.current()
          if (next?.type === 'NUMBER') {
            template.properties[propName] = parseInt(ctx.advance().value, 10)
          } else if (next?.type === 'COLOR') {
            template.properties[propName] = ctx.advance().value
          } else if (next?.type === 'STRING') {
            template.properties[propName] = ctx.advance().value
          } else if (next?.type === 'TOKEN_REF') {
            const tokenName = ctx.advance().value
            const tokenValue = ctx.designTokens.get(tokenName)
            if (tokenValue !== undefined && typeof tokenValue !== 'object') {
              template.properties[propName] = tokenValue
            } else {
              template.properties[propName] = `$${tokenName}`
            }
          } else if (next?.type === 'COMPONENT_NAME' && CSS_COLOR_KEYWORDS.has(next.value.toLowerCase())) {
            template.properties[propName] = ctx.advance().value
          } else {
            template.properties[propName] = true
          }
        }
      }
      // Check for animation action (show/hide/animate)
      else if (ctx.current()?.type === 'ANIMATION_ACTION') {
        const animDef = parseAnimationAction(ctx)
        if (animDef) {
          if (animDef.type === 'show') {
            template.showAnimation = animDef
          } else if (animDef.type === 'hide') {
            template.hideAnimation = animDef
          } else if (animDef.type === 'animate') {
            template.continuousAnimation = animDef
          }
        }
        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      }
      // Check for list item (- prefix for new instance)
      else if (ctx.current()?.type === 'LIST_ITEM') {
        ctx.advance() // consume '-'
        if (ctx.current()?.type === 'COMPONENT_NAME') {
          const child = parseComponent(ctx, childIndent, componentName, false, true)
          if (child) {
            child._isListItem = true
            template.children.push(child)
          }
        }
      }
      else if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'COMPONENT_DEF') {
        // Component child - parse it with parent scope
        // Children are instances (not definitions), but they ARE part of a definition
        // so they should register in scoped registry if they have props
        // Note: COMPONENT_DEF handles cases like "Item:" which defines a slot template
        const isChildDef = ctx.current()?.type === 'COMPONENT_DEF'
        const child = parseComponent(ctx, childIndent, componentName, isChildDef, true)
        if (child) {
          // When inheriting (from), merge children with same name to allow overriding
          // When not inheriting, always push (allows multiple children with same name)
          if (isInheriting) {
            const existingIndex = template.children.findIndex(c => c.name === child.name)
            if (existingIndex >= 0) {
              // Merge: existing properties + new properties (new wins)
              Object.assign(template.children[existingIndex].properties, child.properties)
              // If child has content, override
              if (child.content) {
                template.children[existingIndex].content = child.content
              }
              // If child has children, use those (replacement)
              if (child.children.length > 0) {
                template.children[existingIndex].children = child.children
              }
            } else {
              template.children.push(child)
            }
          } else {
            template.children.push(child)
          }
        }
      }

      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }
}

/**
 * Parse a token variable definition: $primary: #3B82F6
 *
 * Now supports:
 * - Simple values: $size: 16, $color: #FF0000
 * - Complex sequences: $default-pad: l-r 4
 * - Nested tokens: $lg-pad: $base-pad 8
 * - Token-Scope: $dropdown: \n bg $elevated.bg
 */
export function parseTokenDefinition(ctx: ParserContext): void {
  const tokenName = ctx.advance().value

  // Check for Token-Scope syntax: $scope: followed by NEWLINE and indented tokens
  // Example:
  //   $dropdown:
  //     bg $elevated.bg
  //     item.hover $surface.bg
  if (ctx.current()?.type === 'NEWLINE') {
    // Peek ahead to check for indent (scope block)
    const afterNewline = ctx.peek(1)
    if (afterNewline?.type === 'INDENT') {
      // This is a scope block - parse indented token definitions
      ctx.advance() // consume NEWLINE
      parseTokenScopeBlock(ctx, tokenName)
      return
    }
  }

  // Collect all tokens until end of line (regular token definition)
  const valueTokens: import('./lexer').Token[] = []

  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    valueTokens.push(ctx.advance())
  }

  // Determine how to store the value
  if (valueTokens.length === 0) {
    // No value - skip
  } else if (valueTokens.length === 1) {
    // Single token - store as simple value for backwards compatibility
    const token = valueTokens[0]
    if (token.type === 'JSON_VALUE') {
      // Parse JSON array/object value
      try {
        const jsonValue = JSON.parse(token.value)
        ctx.designTokens.set(tokenName, jsonValue)
      } catch {
        // If JSON parsing fails, store as string
        ctx.designTokens.set(tokenName, token.value)
      }
    } else if (token.type === 'COLOR') {
      ctx.designTokens.set(tokenName, token.value)
    } else if (token.type === 'NUMBER') {
      ctx.designTokens.set(tokenName, parseInt(token.value, 10))
    } else if (token.type === 'STRING') {
      ctx.designTokens.set(tokenName, token.value)
    } else if (token.type === 'TOKEN_REF') {
      // Single token reference - resolve immediately if referenced token is a simple value
      const referencedValue = ctx.designTokens.get(token.value)
      if (referencedValue !== undefined && typeof referencedValue !== 'object') {
        // Referenced token is a simple value (number, string, color) - copy directly
        ctx.designTokens.set(tokenName, referencedValue)
      } else {
        // Forward reference or complex value - store as sequence for later resolution
        ctx.designTokens.set(tokenName, { type: 'sequence', tokens: valueTokens })
      }
    } else if (token.type === 'COMPONENT_NAME') {
      // Check for boolean values first (true/false are lexed as COMPONENT_NAME)
      // Store as string since TokenValue doesn't include boolean
      if (token.value === 'true' || token.value === 'false') {
        ctx.designTokens.set(tokenName, token.value)
      } else {
        // CSS value like font name
        ctx.designTokens.set(tokenName, token.value)
      }
    } else {
      // Store as sequence for other single tokens (MODIFIER, DIRECTION, etc.)
      ctx.designTokens.set(tokenName, { type: 'sequence', tokens: valueTokens })
    }
  } else {
    // Multiple tokens - store as sequence
    ctx.designTokens.set(tokenName, { type: 'sequence', tokens: valueTokens })
  }

  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }
}

/**
 * Parse a token scope block: indented token definitions with a shared prefix.
 *
 * Syntax:
 *   $dropdown:
 *     bg $elevated.bg
 *     item.hover $surface.bg
 *     item.selected $primary.bg
 *
 * This is syntactic sugar for:
 *   $dropdown.bg: $elevated.bg
 *   $dropdown.item.hover: $surface.bg
 *   $dropdown.item.selected: $primary.bg
 */
function parseTokenScopeBlock(ctx: ParserContext, scopeName: string): void {
  while (ctx.current()?.type === 'INDENT') {
    const indent = parseInt(ctx.current()!.value, 10)
    if (indent > 0) {
      ctx.advance() // consume INDENT

      // Expect property name (e.g., "bg", "item.hover")
      // This could be tokenized as PROPERTY, COMPONENT_NAME, or UNKNOWN_PROPERTY
      // Handle compound names like "item.hover" which gets lexed as "item" + "hover"
      const nameToken = ctx.current()
      if (nameToken?.type === 'PROPERTY' ||
          nameToken?.type === 'COMPONENT_NAME' ||
          nameToken?.type === 'UNKNOWN_PROPERTY') {
        let localName = ctx.advance().value

        // Check for compound name: if followed by COMPONENT_NAME before a value token,
        // concatenate with dot (handles item.hover → item + hover)
        while (ctx.current()?.type === 'COMPONENT_NAME' ||
               ctx.current()?.type === 'UNKNOWN_PROPERTY' ||
               ctx.current()?.type === 'PROPERTY') {
          // Only continue if this looks like a name part (not a value)
          const nextToken = ctx.current()!
          // Check if the next-next token is a value type - if so, this is still part of the name
          const afterNext = ctx.peek(1)
          if (afterNext?.type === 'COLOR' || afterNext?.type === 'NUMBER' ||
              afterNext?.type === 'STRING' || afterNext?.type === 'TOKEN_REF' ||
              afterNext?.type === 'NEWLINE' || afterNext?.type === 'EOF') {
            // Current token is the last part of the name
            localName += '.' + ctx.advance().value
            break
          } else if (nextToken.type === 'COMPONENT_NAME' || nextToken.type === 'UNKNOWN_PROPERTY') {
            // Continue collecting name parts
            localName += '.' + ctx.advance().value
          } else {
            break
          }
        }

        const fullTokenName = `${scopeName}.${localName}`

        // Collect value tokens until end of line
        const valueTokens: import('./lexer').Token[] = []
        while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
          valueTokens.push(ctx.advance())
        }

        // Store the token value
        if (valueTokens.length === 1) {
          const token = valueTokens[0]
          if (token.type === 'COLOR') {
            ctx.designTokens.set(fullTokenName, token.value)
          } else if (token.type === 'NUMBER') {
            ctx.designTokens.set(fullTokenName, parseInt(token.value, 10))
          } else if (token.type === 'STRING') {
            ctx.designTokens.set(fullTokenName, token.value)
          } else if (token.type === 'TOKEN_REF') {
            const referencedValue = ctx.designTokens.get(token.value)
            if (referencedValue !== undefined && typeof referencedValue !== 'object') {
              ctx.designTokens.set(fullTokenName, referencedValue)
            } else {
              ctx.designTokens.set(fullTokenName, { type: 'sequence', tokens: valueTokens })
            }
          } else {
            ctx.designTokens.set(fullTokenName, { type: 'sequence', tokens: valueTokens })
          }
        } else if (valueTokens.length > 1) {
          ctx.designTokens.set(fullTokenName, { type: 'sequence', tokens: valueTokens })
        }
      }

      // Consume NEWLINE
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }
}
