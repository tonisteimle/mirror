/**
 * Iterator Renderer
 *
 * Renders iterator nodes (_iterator) by looping over a collection.
 * Each iteration provides the current item in a scoped RuntimeVariableContext.
 */

import React, { Fragment } from 'react'
import type { ASTNode } from '../../parser/types'
import { RuntimeVariableContext, useRuntimeVariables } from '../runtime-context'
import { getNestedValue } from '../utils'
import type { GenerateOptions, RenderChildrenFn } from './types'

interface IteratorRendererProps {
  node: ASTNode
  options: GenerateOptions
  renderChildren: RenderChildrenFn
}

/**
 * Renders an iterator node by mapping over a collection and providing
 * each item in a scoped variable context.
 */
export function IteratorRenderer({ node, options, renderChildren }: IteratorRendererProps) {
  const { variables, setVariable } = useRuntimeVariables()

  if (!node.iteration) return null

  const { itemVar, collectionVar, collectionPath } = node.iteration

  // Resolve collection from variables (supports nested paths like $data.items)
  let collection: unknown[]
  if (collectionPath && collectionPath.length > 0) {
    collection = getNestedValue(variables, collectionPath) as unknown[]
  } else {
    collection = variables[collectionVar] as unknown[]
  }

  if (!Array.isArray(collection)) collection = []

  return (
    <Fragment key={node.id}>
      {collection.map((item, index) => {
        // Create scoped context with current iteration item
        const itemContext = { ...variables, [itemVar]: item }
        return (
          <RuntimeVariableContext.Provider
            key={`${node.id}-${index}`}
            value={{ variables: itemContext, setVariable }}
          >
            {node.children.map(child => renderChildren([child], options))}
          </RuntimeVariableContext.Provider>
        )
      })}
    </Fragment>
  )
}
