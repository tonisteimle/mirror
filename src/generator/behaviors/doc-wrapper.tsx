/**
 * Doc Wrapper Behavior
 *
 * Provides a styled container for documentation pages.
 * Wraps text and playground blocks with proper layout and styling.
 */

import React from 'react'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import type { ASTNode } from '../../parser/types'

/**
 * Doc Wrapper Behavior Handler
 *
 * Usage:
 *   doc
 *     text
 *       '$h1 Title'
 *     playground
 *       'Button "Click"'
 */
const DocWrapperBehavior: BehaviorHandler = {
  name: 'doc',

  render(
    node: ASTNode,
    children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ): React.ReactNode {
    // Container styles for doc pages (matches mirror-docu.html .container)
    const containerStyle: React.CSSProperties = {
      maxWidth: '720px',
      margin: '0 auto',
      padding: '48px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: '14px',
      color: '#777',
      lineHeight: 1.7,
    }

    // Use node.children directly to preserve original document order
    // (the children Map groups by name which loses ordering)
    const childrenToRender = node.children

    return (
      <article style={containerStyle} data-source-line={node.line}>
        {childrenToRender.map((child, index) => (
          <React.Fragment key={child.id || index}>
            {renderFn(child)}
          </React.Fragment>
        ))}
      </article>
    )
  }
}

// Export behavior handler - use named export for clarity
export { DocWrapperBehavior }
