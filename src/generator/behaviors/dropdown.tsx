/**
 * Dropdown Behavior Handler
 *
 * A fully styleable dropdown/select component with:
 * - Click to open/close
 * - Click outside to close
 * - Escape to close
 * - Arrow keys navigation
 * - Enter to select
 * - Hover highlighting
 *
 * Slots:
 * - Trigger: The button that opens the dropdown
 * - Menu: The dropdown container
 * - Item: Individual options (use with - prefix for instances)
 *
 * Usage:
 * ```mirror
 * Dropdown: width 200
 *   Trigger: padding 12, background #333, radius 8
 *     Icon "chevron-down"
 *   Menu: background #1E1E2E, radius 8, shadow md
 *   Item: padding 10 14
 *     state hover
 *       background #3B82F6
 *     state selected
 *       background #2563EB
 *
 * Dropdown "Choose..."
 *   - Item value "a" "Apple"
 *   - Item value "b" "Banana"
 * ```
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'
import { renderDynamicIcon } from '../components'

export const DropdownBehavior: BehaviorHandler = {
  name: 'Dropdown',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    return <DropdownComponent node={node} renderFn={renderFn} />
  }
}

interface DropdownProps {
  node: ASTNode
  renderFn: RenderFn
}

function DropdownComponent({ node, renderFn }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const slots = groupChildrenBySlot(node)

  // Get slot templates
  const triggerTemplate = slots.get('Trigger')?.[0]
  const menuTemplate = slots.get('Menu')?.[0]
  const itemTemplate = slots.get('Item')?.[0]

  // Get items (children that are Item instances with values, not templates)
  // Templates are children that define styling but have no value property
  const items = node.children.filter(child => {
    // List items (with - prefix) are always included
    if (child._isListItem) return true
    // Items with a value property are actual options
    if ((child.name === 'Item' || child.name.endsWith('Item')) && child.properties.value) return true
    return false
  })

  // Get placeholder from node content or property
  const placeholder = (node.properties.placeholder as string) || node.content || 'Select...'

  // Get selected item label
  const selectedItem = items.find(item =>
    (item.properties.value as string) === selectedValue
  )
  const displayText = selectedItem?.content || selectedValue || placeholder

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(i => Math.min(i + 1, items.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (items[highlightedIndex]) {
            const value = (items[highlightedIndex].properties.value as string) || items[highlightedIndex].content
            if (value) {
              setSelectedValue(value)
              setIsOpen(false)
            }
          }
          break
        case 'Home':
          e.preventDefault()
          setHighlightedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setHighlightedIndex(items.length - 1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, highlightedIndex, items])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !menuRef.current) return
    const highlighted = menuRef.current.querySelector('[data-highlighted="true"]')
    highlighted?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, highlightedIndex])

  // Toggle dropdown
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
    if (!isOpen) {
      setHighlightedIndex(0)
    }
  }, [isOpen])

  // Select item
  const selectItem = useCallback((value: string) => {
    setSelectedValue(value)
    setIsOpen(false)
  }, [])

  // Container styles
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    ...getStylesFromNode(node)
  }

  // Trigger styles (from template or defaults)
  // Layout properties come AFTER template styles to ensure flex layout works
  const triggerStyle: React.CSSProperties = {
    cursor: 'pointer',
    border: 'none',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
    ...(triggerTemplate ? getStylesFromNode(triggerTemplate) : {
      padding: '8px 12px',
      background: '#333',
      borderRadius: '6px',
    }),
    // These MUST come after template styles to ensure proper layout
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    width: '100%',
  }

  // Menu styles (from template or defaults)
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 1000,
    ...(menuTemplate ? getStylesFromNode(menuTemplate) : {
      background: '#1E1E2E',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      padding: '4px',
    })
  }

  // Get icon from trigger template
  const iconChild = triggerTemplate?.children.find(c =>
    c.name.toLowerCase() === 'icon' || c.name.toLowerCase().endsWith('icon')
  )
  const iconName = iconChild?.content || 'chevron-down'
  const iconSize = (iconChild?.properties['icon-size'] as number) ?? (iconChild?.properties.size as number) ?? 16
  const iconColor = (iconChild?.properties['icon-color'] as string) ?? (iconChild?.properties.ic as string) ?? (iconChild?.properties.col as string) ?? 'currentColor'
  const iconWeight = iconChild?.properties['icon-weight'] ?? iconChild?.properties.iw
  const iconWeightNum = typeof iconWeight === 'number' ? iconWeight : undefined
  const iconFill = iconChild?.properties.fill === true
  const iconLibrary = iconChild?.properties.material ? 'material' as const : 'lucide' as const

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      data-id={node.id}
      className={node.name}
      data-state={isOpen ? 'open' : 'closed'}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggle}
        style={triggerStyle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span style={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}>{displayText}</span>
        <span style={{
          flexShrink: 0,
          marginLeft: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          {renderDynamicIcon(iconName, iconSize, iconColor, iconLibrary, iconWeightNum, iconFill)}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          style={menuStyle}
        >
          {items.map((item, index) => {
            const value = (item.properties.value as string) || item.content || ''
            const label = item.content || value
            const isHighlighted = index === highlightedIndex
            const isSelected = value === selectedValue
            const isDisabled = item.properties.disabled === true

            // Item styles with state
            const itemBaseStyle = itemTemplate ? getStylesFromNode(itemTemplate) : {
              padding: '8px 12px',
              borderRadius: '4px',
            }

            // Get hover state from template
            const hoverState = itemTemplate?.states?.find(s => s.name === 'hover')
            const selectedState = itemTemplate?.states?.find(s => s.name === 'selected' || s.name === 'checked')

            let itemStyle: React.CSSProperties = {
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
              transition: 'background-color 0.15s',
              ...itemBaseStyle
            }

            // Apply hover state
            if (isHighlighted && hoverState) {
              itemStyle = { ...itemStyle, ...getStylesFromNode({ properties: hoverState.properties } as ASTNode) }
            } else if (isHighlighted) {
              itemStyle = { ...itemStyle, background: '#3B82F6' }
            }

            // Apply selected state
            if (isSelected && selectedState) {
              itemStyle = { ...itemStyle, ...getStylesFromNode({ properties: selectedState.properties } as ASTNode) }
            } else if (isSelected && !isHighlighted) {
              itemStyle = { ...itemStyle, background: '#2563EB' }
            }

            return (
              <div
                key={item.id || `item-${index}`}
                role="option"
                data-id={item.id}
                data-highlighted={isHighlighted || undefined}
                data-selected={isSelected || undefined}
                data-disabled={isDisabled || undefined}
                aria-selected={isSelected}
                aria-disabled={isDisabled}
                style={itemStyle}
                onClick={() => !isDisabled && selectItem(value)}
                onMouseEnter={() => !isDisabled && setHighlightedIndex(index)}
              >
                {label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
