/**
 * @module component-parser
 * @description Kern-Logik für Komponenten-Parsing
 *
 * Parst Komponenten-Definitionen und -Instanzen aus tokenisiertem DSL-Code.
 * Unterscheidet zwischen Definitionen (mit Colon) und Instanzen (ohne Colon).
 *
 * @syntax-patterns
 * | Pattern                        | Typ         | Beispiel                    |
 * |--------------------------------|-------------|----------------------------|
 * | Name: props                    | Definition  | Button: pad 12             |
 * | Name props                     | Instanz     | Button "Click"             |
 * | Child: Parent props            | Vererbung   | DangerBtn: Button bg red   |
 * | Child from Parent props        | Vererbung   | DangerBtn from Button      |
 * | Email: Input props             | Prim. Def.  | Email: Input type email    |
 * | Name as Library props          | Library     | Tabs as Dropdown w 200     |
 * | Name named Instance props      | Named Inst. | Panel named Main "Content" |
 *
 * @flow
 * parseComponent(ctx, baseIndent)
 *   │
 *   ├─► parseNamedInstance() → instanceName, componentType
 *   │
 *   ├─► applyLibraryDefaults() → States, Slots von Library
 *   │
 *   ├─► "from" Keyword? → applyTemplate() für Vererbung
 *   │
 *   ├─► isBlockStart()? ─► parseBlockContent()
 *   │        │
 *   │        └─► parseInlineProperties()
 *   │
 *   ├─► handleTemplateLogic() → Registry-Eintrag
 *   │
 *   ├─► parseChildren() → Kinder rekursiv parsen
 *   │
 *   └─► mergeInstanceChildren() → Flat Access, Slot-Merge
 *
 * @sub-modules
 * - types.ts: ASTNode, ComponentTemplate Typen
 * - constants.ts: HTML_PRIMITIVES, GENERIC_CONTAINERS
 * - named-instance-parser.ts: Named Instance Patterns
 * - library-defaults.ts: Library-Komponenten Defaults
 * - children-merger.ts: Kinder-Merge-Logik
 * - template-logic.ts: Template-Registrierung
 * - inline-properties.ts: Inline-Properties + Events
 *
 * @template-logic
 * 1. Definition (Name:) → Speichert in ctx.registry
 * 2. Erste Nutzung (Name) → Definiert implizit + rendert
 * 3. Weitere Nutzung → Erbt von Registry
 *
 * @flat-access
 * Ermöglicht direkten Zugriff auf verschachtelte Slots:
 * Card
 *   Title "Hello"    // → findet Card.Title, egal wie tief
 *
 * @primitive-inheritance
 * Primitive Komponenten (Input, Image, etc.) können erweitert werden:
 *   Email: Input type email, placeholder "you@example.com"
 *   → node.properties._primitiveType = 'Input'
 *   → node erbt Input-Verhalten, bekommt eigene Properties
 *
 * @layout-defaults
 * Strukturelle Komponenten erhalten automatische Layout-Properties:
 *   Card, Header, Footer, Sidebar → hor/ver, gap, padding
 *   Aktiviert via applyLayoutDefaultsToNode()
 *   Nur wenn keine expliziten Layout-Properties gesetzt
 *
 * @example
 * // Tokens: COMPONENT_NAME 'Button', BRACE_OPEN, PROPERTY 'pad', ...
 * parseComponent(ctx, 0)
 * // → ASTNode { name: 'Button', properties: { pad: 12 }, children: [] }
 */

import type { ParserContext } from '../parser-context'
import type { ASTNode } from './types'
import { cloneChildrenWithNewIds } from '../parser-context'
import { validateUniqueNames } from '../component-validation'
import { parseIterator } from '../iterator-parser'
import { parseChildren as parseChildrenImpl } from '../children-parser'
import { applyTemplate, createTemplateFromNode } from '../parser-utils'

// Import sub-modules
import { parseNamedInstance } from './named-instance-parser'
import { HTML_PRIMITIVES } from './constants'
import { applyLibraryDefaults } from './library-defaults'
import { mergeInstanceChildren } from './children-merger'
import { handleTemplateLogic, saveToTemplate } from './template-logic'
import { parseInlineProperties } from './inline-properties'
import { parseBlockContent, isBlockStart } from '../block-parser'

// Import layout defaults for structural components
import { applyLayoutDefaultsToNode, hasLayoutDefaults, hasLayoutSlot } from '../../library/layout-defaults'

// Re-export types for backwards compatibility
export * from './types'
export { HTML_PRIMITIVES, GENERIC_CONTAINERS, BUILT_IN_COMPONENTS } from './constants'
export { parseNamedInstance } from './named-instance-parser'
export { applyLibraryDefaults } from './library-defaults'
export { mergeInstanceChildren, mergeChildrenRecursive } from './children-merger'
export { handleTemplateLogic, copyTemplateExtras, saveToTemplate } from './template-logic'
export { parseInlineProperties, parseInlineEventHandler, parseInlineConditional, parseInlineConditionalProperties } from './inline-properties'

/**
 * @doc parseComponent
 * @brief Parst eine Komponenten-Definition oder -Instanz
 *
 * @syntax
 * // Definition (speichert in Registry, rendert nicht)
 * Button: pad 12, bg #3B82F6
 *
 * // Instanz (verwendet Registry, rendert)
 * Button "Click me"
 *
 * // Vererbung (Child: Parent props)
 * DangerButton: Button bg #EF4444
 *
 * // Named Instance
 * Panel named Dashboard "Content"
 *
 * // Named Primitive
 * Input Email: type email, "Email..."
 *
 * @input
 * - ctx: ParserContext - Aktueller Token muss COMPONENT_NAME/COMPONENT_DEF sein
 * - baseIndent: number - Basis-Einrückung für Kind-Erkennung
 * - parentScope?: string - Eltern-Scope für Registry-Keys (z.B. "Card.Header")
 * - isExplicitDefinition: boolean - Ob Colon vorhanden (Definition)
 * - isChildOfDefinition: boolean - Ob Kind einer Definition
 *
 * @output ASTNode | null
 * {
 *   type: 'component',
 *   name: string,           // Komponenten-Name
 *   id: string,             // Generierte ID
 *   instanceName?: string,  // Bei "named" Instanz
 *   properties: {},         // Geparste Properties
 *   children: [],           // Kinder-Nodes
 *   eventHandlers?: [],     // Inline-Events
 *   states?: [],            // State-Definitionen
 *   _isExplicitDefinition?: boolean
 * }
 *
 * @algorithm
 * 1. Consume COMPONENT_NAME/COMPONENT_DEF Token
 * 2. parseNamedInstance() → Erkennt "named", "as", Primitive-Pattern
 * 3. applyLibraryDefaults() → Wenn Library-Komponente
 * 4. Prüfe "from" Keyword → applyTemplate() für Vererbung
 * 5. isBlockStart()? → parseBlockContent()
 *    sonst → parseInlineProperties()
 * 6. handleTemplateLogic() → Registry-Eintrag
 * 7. parseChildren() → Rekursiv Kinder parsen
 * 8. mergeInstanceChildren() → Flat Access, Slot-Merge
 *
 * @example
 * // Input: Button pad 12, "Click"
 * // Output: { name: 'Button', properties: { pad: 12 }, children: [{ type: 'text', ... }] }
 */
export function parseComponent(
  ctx: ParserContext,
  baseIndent: number,
  parentScope?: string,
  isExplicitDefinition = false,
  isChildOfDefinition = false
): ASTNode | null {
  const token = ctx.current()
  if (!token || (token.type !== 'COMPONENT_NAME' && token.type !== 'COMPONENT_DEF')) {
    return null
  }

  const startToken = token
  let componentName = ctx.advance().value

  if (startToken.type === 'COMPONENT_DEF') {
    isExplicitDefinition = true
  }

  // Check for COLON after component name (e.g., "Header:" in block syntax)
  // In brace-syntax, the lexer emits COMPONENT_NAME + COLON + BRACE_OPEN as separate tokens
  if (ctx.current()?.type === 'COLON') {
    isExplicitDefinition = true
    ctx.advance() // consume the colon
  }

  // Note: ": Parent" inheritance syntax has been removed.
  // Use "Name as Parent:" instead. Example: DangerBtn as Button: bg #F00

  // Parse named instance patterns
  const namedResult = parseNamedInstance(ctx, componentName, isExplicitDefinition)
  componentName = namedResult.componentName
  isExplicitDefinition = namedResult.isExplicitDefinition
  const { instanceName, componentType, libraryType, customComponentType } = namedResult

  // Determine the scoped name for registry lookup/storage
  const scopedName = parentScope ? `${parentScope}.${componentName}` : componentName

  const node: ASTNode = {
    type: 'component',
    name: componentName,
    // Use instanceName as id if provided (for event targeting: "onclick toggle myPanel")
    id: instanceName || ctx.generateId(componentName),
    properties: {},
    children: [],
    line: startToken.line,
    column: startToken.column
  }

  // Set instance name if this is a named instance
  if (instanceName) {
    node.instanceName = instanceName
  }

  // Mark if this is an explicit definition (with colon)
  if (isExplicitDefinition) {
    node._isExplicitDefinition = true
  }

  // Mark the component type for rendering (if different from name)
  if (componentType) {
    node.properties._primitiveType = componentType
  }

  // Apply library component defaults (states, slot properties)
  applyLibraryDefaults(ctx, node, libraryType, parentScope, startToken)

  // Apply custom component type template: label as Standardtext
  // The node keeps its name ("label") but gets properties/children from "Standardtext"
  if (customComponentType && ctx.registry.has(customComponentType)) {
    applyTemplate(
      ctx.registry,
      node,
      customComponentType,
      customComponentType,
      (children) => cloneChildrenWithNewIds(children, ctx.generateId.bind(ctx))
    )
    // Store the original type for reference
    node._customComponentType = customComponentType
  }

  // Collect inline child slots (to be merged after template application)
  const inlineSlots: ASTNode[] = []

  // Note: "from" keyword has been removed. Use "Name as Type:" instead.

  // Initialize source span
  node._sourceSpan = {
    start: { line: startToken.line, column: startToken.column },
    end: { line: startToken.line, column: startToken.column }
  }

  // Track if we used block syntax (children already parsed inside braces)
  let usedBlockSyntax = false

  // Check for brace-based syntax
  if (isBlockStart(ctx)) {
    usedBlockSyntax = true
    ctx.advance() // consume {
    parseBlockContent(ctx, node, (innerCtx, _indent) => parseComponent(innerCtx, 0))
    if (ctx.current()?.type === 'BRACE_CLOSE') {
      const closeToken = ctx.current()!
      node._sourceSpan.end = { line: closeToken.line, column: closeToken.column + 1 }
      node.endLine = closeToken.line
      node.endColumn = closeToken.column + 1
      ctx.advance()
    }
  } else {
    // Inline syntax (without braces)
    parseInlineProperties(ctx, node, componentName, inlineSlots, baseIndent)
  }

  // Extract direct parent name from parentScope (e.g., "Card.Header" → "Card")
  const directParentName = parentScope?.split('.').pop()

  // Apply layout defaults for structural components (Header, Footer, Card, Table, etc.)
  // Defaults are applied UNDER user properties, so user props always win
  if (!node._isLibrary) {
    // Check if this is a SLOT of a layout parent (e.g., Header inside Card)
    const isLayoutSlot = directParentName && hasLayoutSlot(directParentName, componentName)

    // Check if this is a standalone layout component (e.g., Card at root level)
    const isStandaloneLayoutComponent = hasLayoutDefaults(componentName)

    // Apply defaults if:
    // 1. This is a slot of a layout parent (ALWAYS apply slot defaults, regardless of registry)
    // 2. OR this is a standalone layout component AND not yet in registry (first occurrence)
    if (isLayoutSlot || (isStandaloneLayoutComponent && !ctx.registry.has(componentName))) {
      // Store user-specified properties (these take precedence)
      const userProps = { ...node.properties }

      // Apply defaults - user props override defaults
      node.properties = applyLayoutDefaultsToNode(componentName, directParentName, userProps)
    }
  }

  // Check if this instance has its own properties
  const hasOwnProps = Object.keys(node.properties).length > 0

  // Handle template registration/application
  // Pass directParentName to skip template inheritance for layout slots
  handleTemplateLogic(ctx, node, scopedName, componentName, isExplicitDefinition, isChildOfDefinition, hasOwnProps, directParentName)

  // Register named instances as templates for reuse
  // e.g., Input Email "placeholder" -> registers Email as reusable template
  if (instanceName && !isExplicitDefinition) {
    ctx.registry.set(instanceName, createTemplateFromNode(node))
  }

  // Merge inline slots: merge properties with existing children or add new ones
  for (const slot of inlineSlots) {
    const existingIndex = node.children.findIndex(c => c.name === slot.name)
    if (existingIndex >= 0) {
      const existing = node.children[existingIndex]
      // Merge properties from inline slot into existing template child
      Object.assign(existing.properties, slot.properties)
      // When setting visible: true, clear hidden from direct children
      if (slot.properties.visible === true && existing.children.length > 0) {
        for (const child of existing.children) {
          if (child.properties.hidden === true) {
            delete child.properties.hidden
          }
        }
      }
      // Override content if provided
      if (slot.content) {
        existing.content = slot.content
      }
      // Merge children if provided
      if (slot.children.length > 0) {
        existing.children = slot.children
      }
    } else {
      node.children.push(slot)
    }
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse children (using dependency injection to avoid circular imports)
  // For block syntax, children are already parsed in parseBlockContent
  // Only parse indentation-based children for inline syntax (without braces)
  // When inside a definition block (isChildOfDefinition=true AND baseIndent=0),
  // don't parse indentation-based children because parseBlockContent handles siblings.
  // For indentation syntax (baseIndent>0), children CAN parse their grandchildren.
  let instanceChildren: ASTNode[] = []

  // Only skip children parsing for block definitions (baseIndent=0)
  const insideBlockDef = isChildOfDefinition && baseIndent === 0
  if (!usedBlockSyntax && !insideBlockDef) {
    // For library components with as syntax, use libraryType as parent scope for slot validation
    // Use scopedName so template lookups work correctly (e.g., Dropdown.Content instead of just Content)
    const parentScopeForChildren = libraryType || scopedName
    instanceChildren = parseChildrenImpl(
      ctx, node, baseIndent, parentScopeForChildren,
      parseComponent,
      (ctx, childIndent, compName, parseFn) => parseIterator(ctx, childIndent, compName, parseFn)
    )
  }

  // Merge instance children with template children using flat access
  mergeInstanceChildren(node, instanceChildren, isExplicitDefinition)

  // Save children to template (for both explicit and implicit definitions)
  saveToTemplate(ctx, node, scopedName, isExplicitDefinition)

  // Validate unique names for flat access (only for explicit definitions, skip library components)
  // Library components can have multiple slots with the same name (e.g., Tab, TabContent)
  if (isExplicitDefinition && node.children.length > 0 && !libraryType) {
    const nameErrors = validateUniqueNames(node.children, componentName)
    ctx.errors.push(...nameErrors)
  }

  // Track end position - use the previous token's position
  // (current token is already past the component)
  const prevToken = ctx.peek(-1)
  if (prevToken) {
    node.endLine = prevToken.line
    node.endColumn = prevToken.column + prevToken.value.length
  }

  return node
}
