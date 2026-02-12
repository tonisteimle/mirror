import * as Select from '@radix-ui/react-select'
import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const SelectBehavior: BehaviorHandler = {
  name: 'Select',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const triggerNodes = slots.get('Trigger') || []
    const contentNodes = slots.get('Options') || []

    // Get open state from registry - use node.name for action targeting
    const isOpen = registry.getState(node.name) === 'open'
    const [value, setValue] = useState<string>('')

    const handleOpenChange = (open: boolean) => {
      registry.setState(node.name, open ? 'open' : 'closed')
    }

    // Find all items across content/groups
    const getAllItems = (contentNode: ASTNode): { value: string; label: string }[] => {
      const items: { value: string; label: string }[] = []

      for (const child of contentNode.children) {
        if (child.name === 'Option') {
          items.push({
            value: child.id,
            label: child.content || ''
          })
        } else if (child.name === 'Group') {
          items.push(...getAllItems(child))
        }
      }

      return items
    }

    const allItems = contentNodes.flatMap(getAllItems)
    const selectedItem = allItems.find(item => item.value === value)

    return (
      <Select.Root
        value={value}
        onValueChange={setValue}
        open={isOpen}
        onOpenChange={handleOpenChange}
      >
        {triggerNodes.map((trigger) => (
          <Select.Trigger
            key={trigger.id}
            style={{
              // Reset button defaults
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              // User-defined styles
              ...getStylesFromNode(trigger),
              cursor: 'pointer'
            }}
          >
            <Select.Value placeholder={trigger.content || 'Select...'}>
              {selectedItem?.label}
            </Select.Value>
            <Select.Icon>
              <ChevronDown size={16} />
            </Select.Icon>
          </Select.Trigger>
        ))}

        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            style={{ zIndex: 1000 }}
          >
            <Select.Viewport>
              {contentNodes.map((content) => renderSelectContent(content, renderFn))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    )
  }
}

// Render select content (Groups, Items, Labels)
function renderSelectContent(
  contentNode: ASTNode,
  renderFn: RenderFn
): React.ReactNode {
  const contentStyle = getStylesFromNode(contentNode)

  return (
    <div key={contentNode.id} style={contentStyle}>
      {contentNode.children.map((child) => {
        if (child.name === 'Group') {
          return (
            <Select.Group key={child.id} style={getStylesFromNode(child)}>
              {child.children.map((groupChild) => {
                if (groupChild.name === 'Label') {
                  return (
                    <Select.Label
                      key={groupChild.id}
                      style={getStylesFromNode(groupChild)}
                    >
                      {groupChild.content}
                    </Select.Label>
                  )
                }

                if (groupChild.name === 'Option') {
                  return (
                    <Select.Item
                      key={groupChild.id}
                      value={groupChild.id}
                      style={getStylesFromNode(groupChild)}
                    >
                      <Select.ItemText>{groupChild.content}</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check size={14} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  )
                }

                return renderFn(groupChild, { skipLibraryHandling: true })
              })}
            </Select.Group>
          )
        }

        if (child.name === 'Option') {
          return (
            <Select.Item
              key={child.id}
              value={child.id}
              style={getStylesFromNode(child)}
            >
              <Select.ItemText>{child.content}</Select.ItemText>
              <Select.ItemIndicator>
                <Check size={14} />
              </Select.ItemIndicator>
            </Select.Item>
          )
        }

        if (child.name === 'Label') {
          return (
            <Select.Label
              key={child.id}
              style={getStylesFromNode(child)}
            >
              {child.content}
            </Select.Label>
          )
        }

        return renderFn(child, { skipLibraryHandling: true })
      })}
    </div>
  )
}

