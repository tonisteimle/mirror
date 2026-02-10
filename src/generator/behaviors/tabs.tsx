import * as Tabs from '@radix-ui/react-tabs'
import { useState } from 'react'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const TabsBehavior: BehaviorHandler = {
  name: 'Tabs',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const listNodes = slots.get('List') || []
    const panelNodes = slots.get('Panel') || []

    // Get tabs from List children
    const tabNodes = listNodes.flatMap(list =>
      list.children.filter(c => c.name === 'Tab')
    )

    // Default to first tab
    const [activeTab, setActiveTab] = useState(tabNodes[0]?.id || '')

    return (
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        {listNodes.map((list) => (
          <Tabs.List key={list.id} style={getStylesFromNode(list)}>
            {list.children.filter(c => c.name === 'Tab').map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                style={{
                  ...getStylesFromNode(tab),
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent'
                }}
              >
                {tab.content || tab.children.map(child =>
                  renderFn(child, { skipLibraryHandling: true })
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        ))}

        {panelNodes.map((panel, index) => {
          const correspondingTab = tabNodes[index]
          if (!correspondingTab) return null

          return (
            <Tabs.Content
              key={panel.id}
              value={correspondingTab.id}
              style={getStylesFromNode(panel)}
            >
              {panel.content || panel.children.map(child =>
                renderFn(child, { skipLibraryHandling: true })
              )}
            </Tabs.Content>
          )
        })}
      </Tabs.Root>
    )
  }
}

