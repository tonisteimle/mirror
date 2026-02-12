import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const NavigationMenuBehavior: BehaviorHandler = {
  name: 'NavigationMenu',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const listNodes = slots.get('List') || []
    const style = getStylesFromNode(node)

    return (
      <NavigationMenu.Root style={style}>
        {listNodes.map(list => (
          <NavigationMenu.List
            key={list.id}
            style={{
              ...getStylesFromNode(list),
              display: 'flex',
              listStyle: 'none',
              margin: 0,
              padding: 0
            }}
          >
            {list.children.filter(c => c.name === 'Item').map(item =>
              renderNavItem(item, renderFn)
            )}
          </NavigationMenu.List>
        ))}

        <NavigationMenu.Viewport
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            zIndex: 1000
          }}
        />
      </NavigationMenu.Root>
    )
  }
}

function renderNavItem(itemNode: ASTNode, renderFn: RenderFn): React.ReactNode {
  const triggerNode = itemNode.children.find(c => c.name === 'Trigger')
  const contentNode = itemNode.children.find(c => c.name === 'Content')
  const linkNode = itemNode.children.find(c => c.name === 'Link')

  // Simple link without dropdown
  if (linkNode && !contentNode) {
    return (
      <NavigationMenu.Item key={itemNode.id}>
        <NavigationMenu.Link
          style={{
            ...getStylesFromNode(linkNode),
            cursor: 'pointer',
            textDecoration: 'none'
          }}
        >
          {linkNode.content || linkNode.children.map(c =>
            renderFn(c, { skipLibraryHandling: true })
          )}
        </NavigationMenu.Link>
      </NavigationMenu.Item>
    )
  }

  // Dropdown menu
  return (
    <NavigationMenu.Item key={itemNode.id}>
      {triggerNode && (
        <NavigationMenu.Trigger
          style={{
            // Reset button defaults
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            font: 'inherit',
            // User-defined styles
            ...getStylesFromNode(triggerNode),
            cursor: 'pointer'
          }}
        >
          {triggerNode.content || triggerNode.children.map(c =>
            renderFn(c, { skipLibraryHandling: true })
          )}
        </NavigationMenu.Trigger>
      )}

      {contentNode && (
        <NavigationMenu.Content
          style={{
            ...getStylesFromNode(contentNode),
            position: 'absolute'
          }}
        >
          {contentNode.children.map(child => {
            if (child.name === 'Link') {
              return (
                <NavigationMenu.Link
                  key={child.id}
                  style={{
                    ...getStylesFromNode(child),
                    display: 'block',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                >
                  {child.content || child.children.map(c =>
                    renderFn(c, { skipLibraryHandling: true })
                  )}
                </NavigationMenu.Link>
              )
            }
            return renderFn(child, { skipLibraryHandling: true })
          })}
        </NavigationMenu.Content>
      )}
    </NavigationMenu.Item>
  )
}
