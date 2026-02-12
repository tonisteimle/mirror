/**
 * Component Parser Module
 *
 * The core component parsing logic.
 * Parses component definitions and instances with:
 * - Modifiers, properties, and content
 * - Child components
 * - Library component integration
 * - Template inheritance (from keyword)
 * - Conditional rendering (if/else)
 * - Iteration (each)
 */

import type { ParserContext } from './parser-context'
import type { ASTNode } from './types'
import { cloneChildrenWithNewIds } from './parser-context'
import { ACTION_KEYWORDS } from '../dsl/properties'
import { isLibraryComponent, isLibrarySlot, getLibraryComponent } from '../library/registry'
import { parseStyleGroup, applyMixin } from './style-parser'
import { findChildDeep, validateUniqueNames } from './component-validation'
import { parseInlineChildSlot } from './slot-parser'
import { parsePropertyValue } from './property-parser'
import { parseIterator } from './iterator-parser'
import { parseChildren as parseChildrenImpl } from './children-parser'
import { getDefaultSugarRegistry } from './sugar'
import { applyTemplate, createTemplateFromNode } from './parser-utils'
import { parseCondition } from './condition-parser'
import { parseAction } from './state-parser'
import type { SugarContext } from './sugar'
import type { ConditionExpr, DSLProperties, EventHandler } from './types'

/**
 * Parse a component definition or instance.
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

  // If we started with COMPONENT_DEF, this is an explicit definition
  if (startToken.type === 'COMPONENT_DEF') {
    isExplicitDefinition = true
  }

  // HTML Primitive keywords that need special handling for named instances
  const HTML_PRIMITIVES = ['Image', 'Input', 'Textarea', 'Link', 'Button']

  // Check for named instance patterns:
  // NEW: Email as Input: → name: Email, primitiveType: Input
  // OLD: Input Email: → name: Email, primitiveType: Input (for backwards compatibility)
  let componentType: string | undefined
  let instanceName: string | undefined

  // Check for NEW syntax: Name as PrimitiveType or Name as LibraryType
  // e.g., Email as Input: or SettingsDialog as Dialog:
  const asToken = ctx.current()
  let libraryType: string | undefined
  if (asToken?.type === 'KEYWORD' && asToken.value === 'as') {
    ctx.advance() // consume 'as'
    const primitiveToken = ctx.current()
    if (primitiveToken && (primitiveToken.type === 'COMPONENT_NAME' || primitiveToken.type === 'COMPONENT_DEF')) {
      const primitiveValue = ctx.advance().value
      if (HTML_PRIMITIVES.includes(primitiveValue)) {
        instanceName = componentName  // The first name is the instance
        componentType = primitiveValue  // The second name is the primitive type
        // componentName stays as the instance name (Email, not Input)
        // Check if primitive was defined with colon (e.g., Email as Input:)
        if (primitiveToken.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
      } else if (isLibraryComponent(primitiveValue)) {
        // Library component with as syntax: SettingsDialog as Dialog:
        instanceName = componentName  // The first name is the instance
        libraryType = primitiveValue  // The second name is the library type
        // Check if library was defined with colon (e.g., SettingsDialog as Dialog:)
        if (primitiveToken.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
      }
    }
  }
  // Check for named instance syntax
  // Syntax: Component named Name: → componentName stays, instanceName = Name
  // For HTML primitives: Input named Email: → componentType = Input, instanceName = Email
  else {
    const nextToken = ctx.current()

    // Check for 'named' keyword: Button named Save: or Input named Email:
    if (nextToken?.type === 'KEYWORD' && nextToken.value === 'named') {
      ctx.advance() // consume 'named'
      const nameToken = ctx.current()
      if ((nameToken?.type === 'COMPONENT_NAME' || nameToken?.type === 'COMPONENT_DEF') && /^[A-Z]/.test(nameToken.value)) {
        if (nameToken.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
        instanceName = ctx.advance().value  // The name after 'named' is the instance

        // For HTML primitives, set componentType and update componentName
        if (HTML_PRIMITIVES.includes(componentName)) {
          componentType = componentName
          componentName = instanceName  // Use instance name as the component name
        }
        // For regular components, keep componentName, just set instanceName
      }
    }
    // OLD syntax for HTML primitives: Input Email: (for backwards compatibility)
    else if (HTML_PRIMITIVES.includes(componentName)) {
      componentType = componentName
      if ((nextToken?.type === 'COMPONENT_NAME' || nextToken?.type === 'COMPONENT_DEF') && /^[A-Z]/.test(nextToken.value)) {
        if (nextToken.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
        instanceName = ctx.advance().value  // The second name is the instance
        componentName = instanceName  // Use instance name as the component name
      }
    }
  }

  // Determine the scoped name for registry lookup/storage
  const scopedName = parentScope ? `${parentScope}.${componentName}` : componentName

  const node: ASTNode = {
    type: 'component',
    name: componentName,
    id: ctx.generateId(componentName),
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

  // Check if this is a library component (Dropdown, Dialog, etc.)
  // Library components must use 'as' syntax: MyDialog as Dialog:
  if (libraryType) {
    // Library component with as syntax: SettingsDialog as Dialog:
    node._isLibrary = true
    node._libraryType = libraryType
    // Apply default states from library definition
    const libDef = getLibraryComponent(libraryType)
    if (libDef && libDef.defaultStates.length > 0) {
      node.states = libDef.defaultStates.map((stateName, index) => ({
        name: stateName,
        properties: index === 0 ? {} as Record<string, string | number | boolean> : { display: 'none' as string },
        children: []
      }))
    }
  } else if (isLibraryComponent(componentName)) {
    // Direct library component usage (Dialog, Tabs, etc.) - warning but allowed for backwards compatibility
    ctx.addWarning(
      'P010',
      `Library component "${componentName}" should be used with 'as' syntax`,
      startToken,
      `Example: MyComponent as ${componentName}:`
    )
    // Still mark as library so we can continue parsing (graceful degradation)
    node._isLibrary = true
    node._libraryType = componentName
    // Apply default states from library definition
    const libDef = getLibraryComponent(componentName)
    if (libDef && libDef.defaultStates.length > 0) {
      node.states = libDef.defaultStates.map((stateName, index) => ({
        name: stateName,
        properties: index === 0 ? {} as Record<string, string | number | boolean> : { display: 'none' as string },
        children: []
      }))
    }
  }

  // Check if this is a slot of a library component
  if (parentScope && isLibraryComponent(parentScope)) {
    if (isLibrarySlot(parentScope, componentName)) {
      node._libraryParent = parentScope
      // Apply default slot properties from library definition
      const libDef = getLibraryComponent(parentScope)
      const slotDef = libDef?.slots.find(s => s.name === componentName)
      if (slotDef) {
        node.properties = { ...slotDef.defaultProps, ...node.properties }
      }
    } else {
      // Warning: unknown slot for library component
      ctx.errors.push(`Warning: Line ${startToken.line + 1}: "${componentName}" is not a valid slot for ${parentScope}. Valid slots: ${getLibraryComponent(parentScope)?.slots.map(s => s.name).join(', ')}`)
    }
  }

  // Collect inline child slots (to be merged after template application)
  const inlineSlots: ASTNode[] = []

  // Check for "from" keyword: NewComponent from BaseComponent ...
  if (ctx.current()?.type === 'KEYWORD' && ctx.current()?.value === 'from') {
    ctx.advance() // consume 'from'

    // Get base component name and apply its template
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const baseComponentName = ctx.advance().value
      applyTemplate(
        ctx.registry,
        node,
        baseComponentName,
        baseComponentName,
        (children) => cloneChildrenWithNewIds(children, ctx.generateId.bind(ctx))
      )
    }
  }

  // Parse properties and content on the same line
  parseInlineProperties(ctx, node, componentName, inlineSlots)

  // Check if this instance has its own properties
  const hasOwnProps = Object.keys(node.properties).length > 0

  // Handle template registration/application
  handleTemplateLogic(ctx, node, scopedName, componentName, isExplicitDefinition, isChildOfDefinition, hasOwnProps)

  // Register named instances as templates for reuse
  // e.g., Input Email "placeholder" → registers Email as reusable template
  if (instanceName && !isExplicitDefinition) {
    ctx.registry.set(instanceName, createTemplateFromNode(node))
  }

  // Merge inline slots: replace matching children or add new ones
  for (const slot of inlineSlots) {
    const existingIndex = node.children.findIndex(c => c.name === slot.name)
    if (existingIndex >= 0) {
      node.children[existingIndex] = slot
    } else {
      node.children.push(slot)
    }
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse children (using dependency injection to avoid circular imports)
  // For library components with as syntax, use libraryType as parent scope for slot validation
  const parentScopeForChildren = libraryType || componentName
  const instanceChildren = parseChildrenImpl(
    ctx, node, baseIndent, parentScopeForChildren,
    parseComponent,
    (ctx, childIndent, compName, parseFn) => parseIterator(ctx, childIndent, compName, parseFn)
  )

  // Handle instance children
  if (instanceChildren.length > 0) {
    if (isExplicitDefinition) {
      // For definitions, just add all children
      node.children.push(...instanceChildren)
    } else {
      // Check if node has template children (populated from registry)
      const hasTemplateChildren = node.children.length > 0

      // For instances: use flat access to find and modify elements
      for (const instanceChild of instanceChildren) {
        if (instanceChild._isListItem) {
          // List items (- prefix) are always added as new instances
          node.children.push(instanceChild)
        } else if (hasTemplateChildren) {
          // Flat access: recursively find element by name in TEMPLATE children
          const templateChild = findChildDeep(node.children, instanceChild.name)
          if (templateChild) {
            // Modify in-place: merge properties into the found element
            Object.assign(templateChild.properties, instanceChild.properties)
            if (instanceChild.content) {
              templateChild.content = instanceChild.content
            }
            // Handle children: merge by name using flat access
            if (instanceChild.children.length > 0) {
              // Check if instance has _text children (from inline strings like "16")
              const instanceTextChildren = instanceChild.children.filter(c => c.name === '_text')
              const instanceOtherChildren = instanceChild.children.filter(c => c.name !== '_text')

              if (instanceTextChildren.length > 0) {
                // Replace template's _text children with instance's _text children
                templateChild.children = templateChild.children.filter(c => c.name !== '_text')
                templateChild.children.push(...instanceTextChildren)
              }

              // Merge non-_text children using flat access (same logic as parent)
              for (const grandchild of instanceOtherChildren) {
                const templateGrandchild = findChildDeep(templateChild.children, grandchild.name)
                if (templateGrandchild) {
                  // Merge properties into template grandchild
                  Object.assign(templateGrandchild.properties, grandchild.properties)
                  if (grandchild.content) {
                    templateGrandchild.content = grandchild.content
                  }
                  // Recursively handle grandchild's children (replace with instance's)
                  if (grandchild.children.length > 0) {
                    templateGrandchild.children = grandchild.children
                  }
                } else {
                  // Grandchild not in template - add as new
                  templateChild.children.push(grandchild)
                }
              }
            }
            // Element stays in its original position in the hierarchy
          } else {
            // Element not found in template - add as new child
            node.children.push(instanceChild)
          }
        } else {
          // No template children - just add all children directly
          node.children.push(instanceChild)
        }
      }
    }
  }

  // Save children to template (for both explicit and implicit definitions)
  const template = ctx.registry.get(scopedName)
  if (template && node.children.length > 0) {
    // Check if this is the defining instance (not an inheriting one)
    // For explicit definitions, always save. For implicit, only if template has no children yet.
    const isDefiningInstance = isExplicitDefinition || template.children.length === 0
    if (isDefiningInstance) {
      template.children = node.children.map(child => ({
        ...child,
        id: '' // Clear ID for template - will be regenerated on instantiation
      }))
    }
  }

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

/**
 * Parse inline properties and content on the same line as the component.
 * Uses the sugar registry for handling implicit property assignments.
 */
function parseInlineProperties(
  ctx: ParserContext,
  node: ASTNode,
  componentName: string,
  inlineSlots: ASTNode[]
): void {
  const sugarRegistry = getDefaultSugarRegistry()

  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    // Skip optional comma separators
    if (token.type === 'COMMA') {
      ctx.advance()
      continue
    }

    // Style group: (hor cen gap 8):styleName
    if (token.type === 'PAREN_OPEN') {
      ctx.advance() // skip (
      const mixin = parseStyleGroup(ctx)
      if (ctx.current()?.type === 'PAREN_CLOSE') {
        ctx.advance() // skip )
      }
      // Check for inline style definition :name
      if (ctx.current()?.type === 'TOKEN_DEF') {
        const styleName = ctx.advance().value
        ctx.styleMixins.set(styleName, mixin)
      }
      // Apply mixin to current node
      applyMixin(node, mixin)
      continue
    }

    // Check if it's a style reference (component name that exists in styleMixins)
    if (token.type === 'COMPONENT_NAME' && ctx.styleMixins.has(token.value)) {
      const styleName = ctx.advance().value
      const mixin = ctx.styleMixins.get(styleName)!
      applyMixin(node, mixin)
      continue
    }

    // Explicit property handling
    if (token.type === 'PROPERTY') {
      parsePropertyValue(ctx, node)
      continue
    }

    // Inline child slot handling
    if (token.type === 'COMPONENT_NAME') {
      const childNode = parseInlineChildSlot(ctx, componentName)
      if (childNode) {
        inlineSlots.push(childNode)
      }
      continue
    }

    // Try sugar handlers for implicit property assignments
    // (STRING, NUMBER, COLOR, TOKEN_REF)
    if (sugarRegistry.hasHandlerFor(token.type)) {
      const sugarContext: SugarContext = {
        ctx,
        node,
        componentName,
        token
      }
      const result = sugarRegistry.handle(sugarContext)
      if (result.handled) {
        continue
      }
    }

    // Inline conditional properties: if $cond then prop value else prop value
    if (token.type === 'CONTROL' && token.value === 'if') {
      parseInlineConditional(ctx, node)
      continue
    }

    // Inline event handler: onclick assign $var to value
    if (token.type === 'EVENT') {
      const handler = parseInlineEventHandler(ctx)
      if (handler) {
        if (!node.eventHandlers) node.eventHandlers = []
        node.eventHandlers.push(handler)
      }
      continue
    }

    // Unknown token type - exit the loop
    break
  }
}

/**
 * Parse an inline event handler: onclick assign $var to value
 * Also supports conditional actions: onclick if $x page Dashboard else open LoginDialog
 */
function parseInlineEventHandler(ctx: ParserContext): EventHandler | null {
  if (ctx.current()?.type !== 'EVENT') return null

  const eventLine = ctx.current()!.line
  const eventName = ctx.advance().value // onclick, onhover, etc.

  const handler: EventHandler = {
    event: eventName,
    actions: [],
    line: eventLine
  }

  // Check for conditional action: onclick if $x then action1 else action2
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
    ctx.advance() // consume 'if'
    const condition = parseCondition(ctx)

    if (condition) {
      const conditional: import('./types').Conditional = {
        condition,
        thenActions: [],
        line: eventLine
      }

      // Parse then action (action keyword or after 'then')
      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'then') {
        ctx.advance() // consume 'then'
      }

      // Parse action for then branch
      const current = ctx.current()
      if (current?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(current.value)) {
        const action = parseAction(ctx)
        if (action) conditional.thenActions.push(action)
      } else if (current?.type === 'ANIMATION_ACTION') {
        const action = parseAction(ctx)
        if (action) conditional.thenActions.push(action)
      }

      // Check for 'else'
      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance() // consume 'else'
        conditional.elseActions = []

        const elseToken = ctx.current()
        if (elseToken?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(elseToken.value)) {
          const action = parseAction(ctx)
          if (action) conditional.elseActions.push(action)
        } else if (elseToken?.type === 'ANIMATION_ACTION') {
          const action = parseAction(ctx)
          if (action) conditional.elseActions.push(action)
        }
      }

      handler.actions.push(conditional)
    }
  } else {
    // Parse inline action (if any)
    const current = ctx.current()
    if (current?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(current.value)) {
      const action = parseAction(ctx)
      if (action) handler.actions.push(action)
    } else if (current?.type === 'ANIMATION_ACTION') {
      // Support show/hide as inline actions
      const action = parseAction(ctx)
      if (action) handler.actions.push(action)
    }
  }

  return handler
}

/**
 * Parse inline conditional properties: if $cond then prop value [else prop value]
 * Example: if $collapsed then w 64 else w 240
 */
function parseInlineConditional(ctx: ParserContext, node: ASTNode): void {
  ctx.advance() // consume 'if'

  const condition = parseCondition(ctx)
  const currentToken = ctx.current()
  if (!condition) {
    if (currentToken) ctx.addWarning('P002', 'Expected condition after "if"', currentToken)
    return
  }

  // Consume 'then'
  if (currentToken?.type !== 'CONTROL' || currentToken?.value !== 'then') {
    if (currentToken) ctx.addWarning('P003', 'Expected "then" after condition', currentToken)
    return
  }
  ctx.advance() // consume 'then'

  // Parse then properties until 'else' or end of conditional context
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
 * Parse properties for inline conditional (then/else blocks).
 * Captures ALL property-value pairs until 'else', 'if', newline, or EOF.
 *
 * Example: if $cond then col #3B82F6 bor 2 else col #1A1A1A bor 0
 * - then branch: { col: '#3B82F6', bor: 2 }
 * - else branch: { col: '#1A1A1A', bor: 0 }
 */
function parseInlineConditionalProperties(ctx: ParserContext): DSLProperties {
  const properties: DSLProperties = {}

  while (ctx.current()) {
    const token = ctx.current()!

    if (token.type === 'NEWLINE' || token.type === 'EOF') {
      break
    }

    // Stop at 'else' or another 'if' - these mark the end of the current block
    if (token.type === 'CONTROL' && (token.value === 'else' || token.value === 'if')) {
      break
    }

    // Handle PROPERTY tokens (w, h, col, pad, etc.)
    if (token.type === 'PROPERTY') {
      const propName = ctx.advance().value
      const valueToken = ctx.current()

      if (valueToken && valueToken.type !== 'CONTROL' &&
          valueToken.type !== 'NEWLINE' && valueToken.type !== 'EOF') {
        if (valueToken.type === 'NUMBER') {
          properties[propName] = parseInt(ctx.advance().value, 10)
        } else if (valueToken.type === 'COLOR') {
          properties[propName] = ctx.advance().value
        } else if (valueToken.type === 'STRING') {
          properties[propName] = ctx.advance().value
        } else if (valueToken.type === 'TOKEN_REF') {
          const tokenName = ctx.advance().value
          const tokenValue = ctx.designTokens.get(tokenName)
          if (tokenValue !== undefined) {
            properties[propName] = tokenValue as string | number | boolean
          } else {
            // Keep as reference for runtime resolution
            properties[propName] = `$${tokenName}`
          }
        } else if (valueToken.type === 'COMPONENT_NAME') {
          // Could be a color keyword like 'transparent'
          properties[propName] = ctx.advance().value
        } else if (valueToken.type === 'PROPERTY') {
          // Next is another property, so this one is boolean
          properties[propName] = true
        } else {
          // Boolean property
          properties[propName] = true
        }
      } else {
        properties[propName] = true
      }
      continue
    }

    // Unknown token, break
    break
  }

  return properties
}

/**
 * Copy states, variables, event handlers, and library type from template to node.
 */
function copyTemplateExtras(
  template: import('./types').ComponentTemplate,
  node: ASTNode
): void {
  if (template.states && template.states.length > 0) {
    node.states = template.states.map(s => ({ ...s, properties: { ...s.properties } }))
  }
  if (template.variables && template.variables.length > 0) {
    node.variables = template.variables.map(v => ({ ...v }))
  }
  if (template.eventHandlers && template.eventHandlers.length > 0) {
    node.eventHandlers = template.eventHandlers.map(h => ({ ...h, actions: [...h.actions] }))
  }
  // Copy library type (for 'as Text' etc.)
  if (template._isLibrary) {
    node._isLibrary = template._isLibrary
  }
  if (template._libraryType) {
    node._libraryType = template._libraryType
  }
}

/**
 * Handle template registration and application logic.
 */
function handleTemplateLogic(
  ctx: ParserContext,
  node: ASTNode,
  scopedName: string,
  componentName: string,
  isExplicitDefinition: boolean,
  isChildOfDefinition: boolean,
  hasOwnProps: boolean
): void {
  if (isExplicitDefinition) {
    // Explicit definition: save as template
    ctx.registry.set(scopedName, createTemplateFromNode(node))
  } else {
    // Instance: apply template first, then override with local props
    const template = ctx.registry.get(scopedName) || ctx.registry.get(componentName)
    if (template) {
      // Save inline _text child before applying template (created from inline string)
      const inlineTextChild = node.children.find(c => c.name === '_text')

      // Merge: template first, then node's own values override
      node.properties = { ...template.properties, ...node.properties }

      // Only apply template content if no content was specified
      if (!node.content && template.content) {
        node.content = template.content
      }

      // Clone template children with new IDs
      if (template.children.length > 0) {
        node.children = cloneChildrenWithNewIds(template.children, ctx.generateId.bind(ctx))

        // If we had an inline _text child, use it instead of the template's _text
        if (inlineTextChild) {
          const templateTextIndex = node.children.findIndex(c => c.name === '_text')
          if (templateTextIndex >= 0) {
            // Replace template's _text with inline _text (preserves template text properties like color)
            const templateText = node.children[templateTextIndex]
            node.children[templateTextIndex] = {
              ...templateText,
              ...inlineTextChild,
              // Merge properties: template first, then inline overrides
              properties: { ...templateText.properties, ...inlineTextChild.properties }
            }
          } else {
            // Template had no _text, add the inline one
            node.children.push(inlineTextChild)
          }
        }
      }

      // Copy states, variables, eventHandlers
      copyTemplateExtras(template, node)
    }

    // Children of a definition with their own props should be registered
    if (isChildOfDefinition && hasOwnProps) {
      ctx.registry.set(scopedName, createTemplateFromNode(node))
    }

    // Implicit inheritance: first usage with properties becomes the template
    // This allows: Button #blue "Click"  ->  Button "Other" (inherits #blue)
    // EXCLUDE generic containers like Box - they should NOT inherit implicitly
    const GENERIC_CONTAINERS = ['Box', 'Container', 'Wrapper', 'Group', 'Row', 'Column', 'Stack', 'View']
    const isGenericContainer = GENERIC_CONTAINERS.includes(node.name)
    if (hasOwnProps && !template && !isChildOfDefinition && !isGenericContainer) {
      ctx.registry.set(scopedName, createTemplateFromNode(node))
    }
  }
}
