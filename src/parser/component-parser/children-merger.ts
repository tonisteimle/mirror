/**
 * Children Merger Module
 *
 * Handles merging of instance children with template children using flat access.
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

  if (isExplicitDefinition) {
    node.children.push(...instanceChildren)
    return
  }

  const hasTemplateChildren = node.children.length > 0

  for (const instanceChild of instanceChildren) {
    if (instanceChild._isListItem) {
      node.children.push(instanceChild)
    } else if (hasTemplateChildren) {
      const templateChild = findChildDeep(node.children, instanceChild.name)
      if (templateChild) {
        Object.assign(templateChild.properties, instanceChild.properties)
        if (instanceChild.content) {
          templateChild.content = instanceChild.content
        }
        if (instanceChild.children.length > 0) {
          mergeChildrenRecursive(templateChild, instanceChild)
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
        if (grandchild.children.length > 0) {
          templateGrandchild.children = grandchild.children
        }
      } else {
        templateChild.children.push(grandchild)
      }
    }
  }
}
