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
import { isLibraryComponent, isLibrarySlot, getLibraryComponent } from '../library/registry'
import { parseStyleGroup, applyMixin } from './style-parser'
import { findChildDeep, validateUniqueNames } from './component-validation'
import { parseInlineChildSlot } from './slot-parser'
import { parsePropertyValue } from './property-parser'
import { parseIterator } from './iterator-parser'
import { parseChildren as parseChildrenImpl } from './children-parser'
import { getDefaultSugarRegistry } from './sugar'
import type { SugarContext } from './sugar'

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

  // Check for named instance pattern: ComponentType InstanceName
  // e.g., Input Email → type: Input, instanceName: Email
  // Only apply for HTML primitives to avoid breaking inline child slots
  let componentType: string | undefined
  let instanceName: string | undefined

  // Only apply named instance logic for HTML primitives
  // For custom components, the second name is treated as an inline child slot
  if (HTML_PRIMITIVES.includes(componentName)) {
    componentType = componentName
    // Check if next token is a PascalCase component name (potential instance name)
    // Can be either COMPONENT_NAME (e.g., Input Email) or COMPONENT_DEF (e.g., Input Email:)
    const nextToken = ctx.current()
    if ((nextToken?.type === 'COMPONENT_NAME' || nextToken?.type === 'COMPONENT_DEF') && /^[A-Z]/.test(nextToken.value)) {
      // If it's a COMPONENT_DEF, this is an explicit definition (e.g., Input Email:)
      if (nextToken.type === 'COMPONENT_DEF') {
        isExplicitDefinition = true
      }
      instanceName = ctx.advance().value  // The second name is the instance
      componentName = instanceName  // Use instance name as the component name
    }
  }

  // Determine the scoped name for registry lookup/storage
  const scopedName = parentScope ? `${parentScope}.${componentName}` : componentName

  const node: ASTNode = {
    type: 'component',
    name: componentName,
    id: ctx.generateId(componentName),
    modifiers: [],
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
  if (isLibraryComponent(componentName)) {
    node._isLibrary = true
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

    // Get base component name
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const baseComponentName = ctx.advance().value

      // Apply base component template if it exists
      if (ctx.registry.has(baseComponentName)) {
        const baseTemplate = ctx.registry.get(baseComponentName)!
        node.modifiers = [...baseTemplate.modifiers]
        node.properties = { ...baseTemplate.properties }
        if (baseTemplate.content) {
          node.content = baseTemplate.content
        }
        if (baseTemplate.children.length > 0) {
          node.children = cloneChildrenWithNewIds(baseTemplate.children, ctx.generateId.bind(ctx))
        }
      }
    }
  }

  // Parse modifiers, properties, and content on the same line
  parseInlineProperties(ctx, node, componentName, inlineSlots)

  // Check if this instance has its own properties/modifiers
  const hasOwnProps = node.modifiers.length > 0 || Object.keys(node.properties).length > 0

  // Handle template registration/application
  handleTemplateLogic(ctx, node, scopedName, componentName, isExplicitDefinition, isChildOfDefinition, hasOwnProps)

  // Register named instances as templates for reuse
  // e.g., Input Email "placeholder" → registers Email as reusable template
  if (instanceName && !isExplicitDefinition) {
    ctx.registry.set(instanceName, {
      modifiers: [...node.modifiers],
      properties: { ...node.properties },
      content: node.content,
      children: []
    })
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
  const instanceChildren = parseChildrenImpl(
    ctx, node, baseIndent, componentName,
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
            templateChild.modifiers = [...new Set([...templateChild.modifiers, ...instanceChild.modifiers])]
            Object.assign(templateChild.properties, instanceChild.properties)
            if (instanceChild.content) {
              templateChild.content = instanceChild.content
            }
            // Merge children (e.g., _text nodes from inline strings)
            if (instanceChild.children.length > 0) {
              templateChild.children.push(...instanceChild.children)
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

  // Only explicit definitions (with :) should save children to template
  if (isExplicitDefinition && node.children.length > 0) {
    const template = ctx.registry.get(scopedName)
    if (template) {
      template.children = node.children.map(child => ({
        ...child,
        id: '' // Clear ID for template - will be regenerated on instantiation
      }))
    }

    // Validate unique names for flat access
    const nameErrors = validateUniqueNames(node.children, componentName)
    ctx.errors.push(...nameErrors)
  }

  return node
}

/**
 * Parse inline properties, modifiers, and content on the same line as the component.
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

    // Explicit property/modifier handling
    if (token.type === 'MODIFIER') {
      node.modifiers.push(ctx.advance().value)
      continue
    }

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

    // Unknown token type - exit the loop
    break
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
    // Explicit definition: save as template (use scoped name for children)
    ctx.registry.set(scopedName, {
      modifiers: [...node.modifiers],
      properties: { ...node.properties },
      content: node.content,
      children: [] // Children will be added after parsing
    })
  } else {
    // Instance (not a definition): apply template first, then override with local props
    const template = ctx.registry.get(scopedName) || ctx.registry.get(componentName)
    if (template) {
      // Start with template values
      const templateModifiers = [...template.modifiers]
      const templateProperties = { ...template.properties }

      // Merge: template first, then node's own values override
      node.modifiers = [...new Set([...templateModifiers, ...node.modifiers])]
      node.properties = { ...templateProperties, ...node.properties }

      // Only apply template content if no content was specified
      if (!node.content && template.content) {
        node.content = template.content
      }
      // Clone template children with new IDs (instance children will be added later)
      if (template.children.length > 0) {
        node.children = cloneChildrenWithNewIds(template.children, ctx.generateId.bind(ctx))
      }

      // V2: Apply template states, variables, eventHandlers
      if (template.states && template.states.length > 0) {
        node.states = template.states.map(s => ({ ...s, properties: { ...s.properties } }))
      }
      if (template.variables && template.variables.length > 0) {
        node.variables = template.variables.map(v => ({ ...v }))
      }
      if (template.eventHandlers && template.eventHandlers.length > 0) {
        node.eventHandlers = template.eventHandlers.map(h => ({
          ...h,
          actions: [...h.actions]
        }))
      }
    }

    // Children of a definition with their own props should be registered in scoped registry
    if (isChildOfDefinition && hasOwnProps) {
      ctx.registry.set(scopedName, {
        modifiers: [...node.modifiers],
        properties: { ...node.properties },
        content: node.content,
        children: []
      })
    }
  }
}
