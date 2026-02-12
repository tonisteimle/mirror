import * as Toolbar from '@radix-ui/react-toolbar'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const ToolbarBehavior: BehaviorHandler = {
  name: 'Toolbar',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const style = getStylesFromNode(node)

    return (
      <Toolbar.Root style={style}>
        {node.children.map(child => {
          if (child.name === 'Group') {
            return (
              <div key={child.id} style={{ ...getStylesFromNode(child), display: 'flex' }}>
                {child.children.map(groupChild => renderToolbarItem(groupChild, renderFn))}
              </div>
            )
          }

          if (child.name === 'Separator') {
            return (
              <Toolbar.Separator
                key={child.id}
                style={getStylesFromNode(child)}
              />
            )
          }

          return renderToolbarItem(child, renderFn)
        })}
      </Toolbar.Root>
    )
  }
}

function renderToolbarItem(child: ASTNode, renderFn: RenderFn): React.ReactNode {
  if (child.name === 'Button') {
    return (
      <Toolbar.Button
        key={child.id}
        style={{
          // Reset button defaults
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          font: 'inherit',
          // User-defined styles
          ...getStylesFromNode(child),
          cursor: 'pointer'
        }}
      >
        {child.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
      </Toolbar.Button>
    )
  }

  if (child.name === 'Toggle') {
    return (
      <Toolbar.ToggleGroup type="single" key={child.id}>
        <Toolbar.ToggleItem
          value={child.id}
          style={{
            // Reset button defaults
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            font: 'inherit',
            // User-defined styles
            ...getStylesFromNode(child),
            cursor: 'pointer'
          }}
        >
          {child.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
        </Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>
    )
  }

  if (child.name === 'Separator') {
    return (
      <Toolbar.Separator
        key={child.id}
        style={getStylesFromNode(child)}
      />
    )
  }

  return renderFn(child, { skipLibraryHandling: true })
}
