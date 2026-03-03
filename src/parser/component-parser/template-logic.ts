/**
 * @module component-parser/template-logic
 * @description Template Registrierung und Anwendungs-Logik
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Verwaltet Templates (Definitionen) und deren Anwendung auf Instanzen
 *
 * Templates sind wiederverwendbare Komponenten-Definitionen:
 * - Explizit mit Colon: Button: padding 12
 * - Implizit durch erste Verwendung: Button #blue "Click"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMPLATE REGISTRIERUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Explizite Definition
 *   Button: padding 12 background #3B82F6 radius 8
 *   → ctx.registry.set('Button', template)
 *
 * @syntax Implizite Definition (erste Verwendung mit Props)
 *   Button #blue "Click"
 *   → Wird als Template registriert
 *   Button "Other"
 *   → Erbt #blue von implizitem Template
 *
 * @exception Generic Containers
 *   Box, Container, etc. erstellen KEINE impliziten Templates
 *   Jede Box-Instanz ist unabhängig
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMPLATE ANWENDUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @algorithm handleTemplateLogic
 * 1. Falls explizite Definition: Template speichern
 * 2. Falls Instanz: Template anwenden
 *    a. Properties mergen (Template zuerst, dann Override)
 *    b. Content nur setzen wenn nicht spezifiziert
 *    c. Children klonen mit neuen IDs
 *    d. _text Children intelligent handhaben
 *    e. Extras kopieren (states, events, etc.)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXTRAS KOPIEREN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function copyTemplateExtras
 *   Kopiert von Template zu Node:
 *   - states (mit Deep-Copy)
 *   - variables
 *   - eventHandlers
 *   - _isLibrary, _libraryType
 *   - showAnimation, hideAnimation, continuousAnimation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMPLATE SPEICHERN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function saveToTemplate
 *   Speichert Node-Daten zurück ins Template:
 *   - Children (für vollständige Definitionen)
 *   - Event handlers
 *   - States
 *   - Variables
 *   - Animations
 *
 * @condition Nur für definierende Instanz
 *   Explizite Definitionen: Immer
 *   Implizite: Nur wenn Template noch keine Children hat
 *
 * @used-by component-parser/index.ts für gesamte Template-Verarbeitung
 */

import type { ParserContext } from '../parser-context'
import type { ASTNode, ComponentTemplate } from './types'
import { cloneChildrenWithNewIds } from '../parser-context'
import { createTemplateFromNode } from '../parser-utils'
import { GENERIC_CONTAINERS } from './constants'
import { hasLayoutSlot } from '../../library/layout-defaults'

/**
 * Recursively resolve list item templates.
 * List items (with _isListItem flag) need to inherit properties, states, and eventHandlers
 * from their component templates in the registry.
 *
 * @param children Children to process
 * @param registry Component template registry
 */
function resolveListItemTemplates(
  children: ASTNode[],
  registry: Map<string, ComponentTemplate>
): void {
  for (const child of children) {
    // If this is a list item, resolve its template
    if (child._isListItem) {
      const template = registry.get(child.name)
      if (template) {
        // Inherit properties (template first, then child overrides)
        child.properties = { ...template.properties, ...child.properties }
        // Copy states if child doesn't have any
        if (template.states && template.states.length > 0 && (!child.states || child.states.length === 0)) {
          child.states = template.states.map(s => ({ ...s, properties: { ...s.properties } }))
        }
        // Copy eventHandlers if child doesn't have any
        if (template.eventHandlers && template.eventHandlers.length > 0 && (!child.eventHandlers || child.eventHandlers.length === 0)) {
          child.eventHandlers = template.eventHandlers.map(h => ({ ...h, actions: [...h.actions] }))
        }
      }
    }
    // Recursively process nested children
    if (child.children && child.children.length > 0) {
      resolveListItemTemplates(child.children, registry)
    }
  }
}

/**
 * Recursively merge inline children into template children.
 *
 * @param templateChild Template child to merge into
 * @param inlineChild Inline child to merge from
 */
function mergeInlineChildren(templateChild: ASTNode, inlineChild: ASTNode): void {
  for (const grandchild of inlineChild.children) {
    const templateGrandchild = templateChild.children.find(c => c.name === grandchild.name)
    if (templateGrandchild) {
      // Merge properties
      Object.assign(templateGrandchild.properties, grandchild.properties)
      // Override content if present
      if (grandchild.content) {
        templateGrandchild.content = grandchild.content
      }
      // Recursively merge deeper children
      if (grandchild.children.length > 0) {
        mergeInlineChildren(templateGrandchild, grandchild)
      }
      // Merge eventHandlers from grandchild
      if (grandchild.eventHandlers && grandchild.eventHandlers.length > 0) {
        if (!templateGrandchild.eventHandlers) {
          templateGrandchild.eventHandlers = []
        }
        templateGrandchild.eventHandlers.push(...grandchild.eventHandlers)
      }
    } else {
      // No match, add the grandchild
      templateChild.children.push(grandchild)
    }
  }
}

/**
 * Copy states, variables, event handlers, and library type from template to node.
 *
 * @param template Source template
 * @param node Target node
 */
export function copyTemplateExtras(
  template: ComponentTemplate,
  node: ASTNode
): void {
  if (template.states && template.states.length > 0) {
    node.states = template.states.map(s => ({ ...s, properties: { ...s.properties } }))
  }
  if (template.variables && template.variables.length > 0) {
    node.variables = template.variables.map(v => ({ ...v }))
  }
  // Only copy event handlers if node doesn't have its own
  // (node's own handlers from inline parsing take precedence)
  if (template.eventHandlers && template.eventHandlers.length > 0 && (!node.eventHandlers || node.eventHandlers.length === 0)) {
    node.eventHandlers = template.eventHandlers.map(h => ({ ...h, actions: [...h.actions] }))
  }
  // Copy library type (for 'as Text' etc.)
  if (template._isLibrary) {
    node._isLibrary = template._isLibrary
  }
  if (template._libraryType) {
    node._libraryType = template._libraryType
  }
  // Copy animation definitions
  if (template.showAnimation) {
    node.showAnimation = { ...template.showAnimation }
  }
  if (template.hideAnimation) {
    node.hideAnimation = { ...template.hideAnimation }
  }
  if (template.continuousAnimation) {
    node.continuousAnimation = { ...template.continuousAnimation }
  }
}

/**
 * Handle template registration and application logic.
 *
 * @param ctx Parser context
 * @param node Target node
 * @param scopedName Scoped name for registry lookup
 * @param componentName Component name
 * @param isExplicitDefinition Whether this is an explicit definition
 * @param isChildOfDefinition Whether this is a child of a definition
 * @param hasOwnProps Whether the node has its own properties
 * @param parentName Optional direct parent name for layout slot detection
 */
export function handleTemplateLogic(
  ctx: ParserContext,
  node: ASTNode,
  scopedName: string,
  componentName: string,
  isExplicitDefinition: boolean,
  isChildOfDefinition: boolean,
  hasOwnProps: boolean,
  parentName?: string
): void {
  if (isExplicitDefinition) {
    // Explicit definition: save as template
    ctx.registry.set(scopedName, createTemplateFromNode(node))
  } else {
    // Instance: apply template first, then override with local props
    // User-defined templates ALWAYS take priority over layout slot defaults
    // This allows users to customize Item, Header, etc. even when used inside layout components
    const template = ctx.registry.get(scopedName) || ctx.registry.get(componentName)
    if (template) {
      // Save ALL inline children before applying template (parsed from block syntax)
      const inlineChildren = [...node.children]

      // Merge: template first, then node's own values override
      node.properties = { ...template.properties, ...node.properties }

      // Only apply template content if no content was specified
      if (!node.content && template.content) {
        node.content = template.content
      }

      // Clone template children with new IDs
      // Skip _text children if node has contentExpression (dynamic content takes precedence)
      if (template.children.length > 0) {
        const childrenToClone = node.contentExpression
          ? template.children.filter(c => c.name !== '_text')
          : template.children
        node.children = cloneChildrenWithNewIds(childrenToClone, ctx.generateId.bind(ctx))

        // Resolve list item templates recursively
        // This ensures list items (- Component) inherit properties, states, and eventHandlers
        // from their component definitions, even if defined after first use
        resolveListItemTemplates(node.children, ctx.registry)

        // Merge inline children with cloned template children
        for (const inlineChild of inlineChildren) {
          // List items (with - prefix) should NOT be merged - they're new instances
          // They should inherit styling from matching template slot, but be added as separate children
          if (inlineChild._isListItem) {
            // Find matching template slot for styling inheritance
            // First try to find in parent's children (slot template pattern)
            let templateSlot = node.children.find(c => c.name === inlineChild.name && !c._isListItem)

            // If not found in children, look up in registry (top-level component definition)
            if (!templateSlot) {
              const templateFromRegistry = ctx.registry.get(inlineChild.name)
              if (templateFromRegistry) {
                // Create a temporary "slot" from the registry template
                templateSlot = {
                  type: 'component',
                  name: inlineChild.name,
                  id: '',
                  properties: templateFromRegistry.properties,
                  children: templateFromRegistry.children || [],
                  states: templateFromRegistry.states,
                  eventHandlers: templateFromRegistry.eventHandlers,
                } as ASTNode
              }
            }

            if (templateSlot) {
              // Inherit template slot properties (slot template provides styling)
              inlineChild.properties = { ...templateSlot.properties, ...inlineChild.properties }
              // Copy states from template slot
              if (templateSlot.states) {
                inlineChild.states = templateSlot.states.map(s => ({ ...s, properties: { ...s.properties } }))
              }
              // Copy eventHandlers from template slot (for onclick, onhover, etc.)
              if (templateSlot.eventHandlers && templateSlot.eventHandlers.length > 0) {
                inlineChild.eventHandlers = templateSlot.eventHandlers.map(h => ({ ...h, actions: [...h.actions] }))
              }
            }
            // Always add list items as new children
            node.children.push(inlineChild)
            continue
          }

          const templateChild = node.children.find(c => c.name === inlineChild.name)
          if (templateChild) {
            // Merge properties: template first, then inline overrides
            Object.assign(templateChild.properties, inlineChild.properties)
            // When setting visible: true on a slot, clear hidden from its direct children
            // This allows patterns like: IconLeft { visible } to show the hidden Icon inside
            if (inlineChild.properties.visible === true && templateChild.children.length > 0) {
              for (const child of templateChild.children) {
                if (child.properties.hidden === true) {
                  delete child.properties.hidden
                }
              }
            }
            // Override content if inline child has it
            if (inlineChild.content) {
              templateChild.content = inlineChild.content
            }
            // Recursively merge children if inline child has them
            if (inlineChild.children.length > 0) {
              mergeInlineChildren(templateChild, inlineChild)
            }
            // Merge eventHandlers from inline child
            if (inlineChild.eventHandlers && inlineChild.eventHandlers.length > 0) {
              if (!templateChild.eventHandlers) {
                templateChild.eventHandlers = []
              }
              templateChild.eventHandlers.push(...inlineChild.eventHandlers)
            }
            // Mark as filled (not just a definition)
            templateChild._isExplicitDefinition = false
          } else {
            // No matching template child, add the inline child
            node.children.push(inlineChild)
          }
        }
      } else if (inlineChildren.length > 0) {
        // Template has no children, just use inline children
        node.children = inlineChildren
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
    // Also update template if existing one is empty (e.g., "Item:" with no properties)
    const isGenericContainer = GENERIC_CONTAINERS.includes(node.name)
    const templateIsEmpty = template && Object.keys(template.properties).length === 0 && template.children.length === 0
    if (hasOwnProps && (!template || templateIsEmpty) && !isChildOfDefinition && !isGenericContainer) {
      const newTemplate = createTemplateFromNode(node)
      ctx.registry.set(scopedName, newTemplate)
      // Also register globally for cross-scope inheritance (e.g., Button in different parents)
      if (scopedName !== componentName && !ctx.registry.has(componentName)) {
        ctx.registry.set(componentName, newTemplate)
      }
    }
  }
}

/**
 * Save children and other node data to template after parsing.
 *
 * @param ctx Parser context
 * @param node The parsed node
 * @param scopedName Scoped name for registry lookup
 * @param isExplicitDefinition Whether this is an explicit definition
 */
export function saveToTemplate(
  ctx: ParserContext,
  node: ASTNode,
  scopedName: string,
  isExplicitDefinition: boolean
): void {
  const template = ctx.registry.get(scopedName)
  if (!template) return

  // Check if this is the defining instance (not an inheriting one)
  // For explicit definitions, always save. For implicit, only if template has no children yet.
  const isDefiningInstance = isExplicitDefinition || template.children.length === 0
  if (!isDefiningInstance) return

  // Save children
  if (node.children.length > 0) {
    template.children = node.children.map(child => ({
      ...child,
      id: '' // Clear ID for template - will be regenerated on instantiation
    }))
  }

  // V7: Save component-local event handlers to template
  if (node.eventHandlers && node.eventHandlers.length > 0) {
    template.eventHandlers = node.eventHandlers.map(h => ({
      ...h,
      actions: [...h.actions]
    }))
  }

  // V7: Save component-local states to template
  if (node.states && node.states.length > 0) {
    template.states = node.states.map(s => ({
      ...s,
      properties: { ...s.properties }
    }))
  }

  // V7: Save component-local variables to template
  if (node.variables && node.variables.length > 0) {
    template.variables = node.variables.map(v => ({ ...v }))
  }

  // V8: Save animation definitions to template
  if (node.showAnimation) {
    template.showAnimation = { ...node.showAnimation }
  }
  if (node.hideAnimation) {
    template.hideAnimation = { ...node.hideAnimation }
  }
  if (node.continuousAnimation) {
    template.continuousAnimation = { ...node.continuousAnimation }
  }
}
