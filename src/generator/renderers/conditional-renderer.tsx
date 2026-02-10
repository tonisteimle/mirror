/**
 * Conditional Renderer
 *
 * Renders conditional nodes (_conditional) based on runtime variable evaluation.
 * Supports if/else branches through node.children and node.elseChildren.
 */

import React, { Fragment } from 'react'
import type { ASTNode } from '../../parser/types'
import { useRuntimeVariables } from '../runtime-context'
import { evaluateCondition } from '../utils'
import type { GenerateOptions, RenderChildrenFn } from './types'

interface ConditionalRendererProps {
  node: ASTNode
  options: GenerateOptions
  renderChildren: RenderChildrenFn
}

/**
 * Renders a conditional node, evaluating the condition against runtime variables
 * and rendering either the if-branch or else-branch children.
 */
export function ConditionalRenderer({ node, options, renderChildren }: ConditionalRendererProps) {
  const { variables } = useRuntimeVariables()
  const shouldRender = node.condition ? evaluateCondition(node.condition, variables) : true
  const childrenToRender = shouldRender ? node.children : (node.elseChildren || [])

  return (
    <Fragment key={node.id}>
      {childrenToRender.map(child => renderChildren([child], options))}
    </Fragment>
  )
}
