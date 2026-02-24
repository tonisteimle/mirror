/**
 * @module component-parser/children-merger
 * @description Children Merging mit Flat-Access Support
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Merged Instance-Children mit Template-Children
 *
 * Wenn eine Komponente ein Template erbt, müssen die Children
 * intelligent gemerged werden:
 * - Existierende Slots werden überschrieben
 * - Neue Children werden hinzugefügt
 * - List Items (- prefix) werden immer hinzugefügt
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FLAT ACCESS PATTERN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @pattern Tief verschachtelte Slots können direkt referenziert werden
 *
 * @example Template
 *   Card: vertical padding 16
 *     Header: horizontal between
 *       Title: size 18 weight 600
 *       Badge: background #3B82F6
 *     Content: padding 8
 *
 * @example Instance (Flat Access)
 *   Card
 *     Title "My Card"           // Findet Title in Header
 *     Badge "NEW"               // Findet Badge in Header
 *     Content "Card content"    // Direktes Child
 *
 * @algorithm findChildDeep
 *   Sucht rekursiv in allen Children nach passendem Namen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MERGING-REGELN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @rule 1: Explicit Definition ohne Template-Children
 *   Einfach alle Instance-Children hinzufügen
 *
 * @rule 2: List Items (_isListItem = true)
 *   Immer hinzufügen (neue Instanzen, kein Override)
 *
 * @rule 3: Matching Template-Child gefunden
 *   - Properties mergen (Object.assign)
 *   - Content überschreiben (falls vorhanden)
 *   - Children rekursiv mergen
 *   - _isExplicitDefinition = false (Slot ist gefüllt)
 *
 * @rule 4: Kein Match gefunden
 *   Instance-Child direkt hinzufügen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REKURSIVES MERGING
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function mergeChildrenRecursive
 *   Merged Grandchildren rekursiv
 *
 * @special _text Children
 *   Text-Children werden ersetzt (nicht gemerged)
 *   Template-_text wird entfernt, Instance-_text wird hinzugefügt
 *
 * @used-by component-parser/index.ts für Template-Anwendung
 */

import type { ASTNode } from './types'
import { findChildDeep } from '../component-validation'

/**
 * Merge instance children with template children using flat access.
 *
 * @param node Target node to merge children into
 * @param instanceChildren Children from the instance
 * @param isExplicitDefinition Whether this is an explicit definition
 */
export function mergeInstanceChildren(
  node: ASTNode,
  instanceChildren: ASTNode[],
  isExplicitDefinition: boolean
): void {

  if (instanceChildren.length === 0) return

  const hasTemplateChildren = node.children.length > 0

  // For explicit definitions WITHOUT template children, just push
  // (this is a fresh definition, not inheriting from anything)
  if (isExplicitDefinition && !hasTemplateChildren) {
    node.children.push(...instanceChildren)
    return
  }

  // For explicit definitions WITH template children (inheritance via 'from'),
  // we need to merge, not push - otherwise we get duplicate children

  for (const instanceChild of instanceChildren) {
    if (instanceChild._isListItem) {
      node.children.push(instanceChild)
    } else if (hasTemplateChildren) {
      const templateChild = findChildDeep(node.children, instanceChild.name)
      if (templateChild) {
        Object.assign(templateChild.properties, instanceChild.properties)
        // When setting visible: true on a slot, also clear hidden from direct children
        // This allows patterns like: IconLeft { visible } to show the hidden Icon inside
        if (instanceChild.properties.visible === true && templateChild.children.length > 0) {
          for (const child of templateChild.children) {
            if (child.properties.hidden === true) {
              delete child.properties.hidden
            }
          }
        }
        if (instanceChild.content) {
          templateChild.content = instanceChild.content
        }
        // Merge eventHandlers from instance into template
        if (instanceChild.eventHandlers && instanceChild.eventHandlers.length > 0) {
          if (!templateChild.eventHandlers) {
            templateChild.eventHandlers = []
          }
          templateChild.eventHandlers.push(...instanceChild.eventHandlers)
        }
        if (instanceChild.children.length > 0) {
          mergeChildrenRecursive(templateChild, instanceChild)
        }
        // Mark slot as filled (no longer just a definition) if it has content or children
        if (instanceChild.content || instanceChild.children.length > 0) {
          templateChild._isExplicitDefinition = false
        }
      } else {
        node.children.push(instanceChild)
      }
    } else {
      node.children.push(instanceChild)
    }
  }
}

/**
 * Recursively merge children from instance into template.
 *
 * @param templateChild Template child node to merge into
 * @param instanceChild Instance child node to merge from
 */
export function mergeChildrenRecursive(templateChild: ASTNode, instanceChild: ASTNode): void {
  const instanceTextChildren = instanceChild.children.filter(c => c.name === '_text')
  const instanceOtherChildren = instanceChild.children.filter(c => c.name !== '_text')

  if (instanceTextChildren.length > 0) {
    templateChild.children = templateChild.children.filter(c => c.name !== '_text')
    templateChild.children.push(...instanceTextChildren)
  }

  for (const grandchild of instanceOtherChildren) {
    if (grandchild._isListItem) {
      templateChild.children.push(grandchild)
    } else {
      const templateGrandchild = findChildDeep(templateChild.children, grandchild.name)
      if (templateGrandchild) {
        Object.assign(templateGrandchild.properties, grandchild.properties)
        if (grandchild.content) {
          templateGrandchild.content = grandchild.content
        }
        // Merge eventHandlers from instance into template
        if (grandchild.eventHandlers && grandchild.eventHandlers.length > 0) {
          if (!templateGrandchild.eventHandlers) {
            templateGrandchild.eventHandlers = []
          }
          templateGrandchild.eventHandlers.push(...grandchild.eventHandlers)
        }
        if (grandchild.children.length > 0) {
          templateGrandchild.children = grandchild.children
        }
        // Mark slot as filled if it has content or children
        if (grandchild.content || grandchild.children.length > 0) {
          templateGrandchild._isExplicitDefinition = false
        }
      } else {
        templateChild.children.push(grandchild)
      }
    }
  }
}
