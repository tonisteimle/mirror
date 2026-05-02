/**
 * DOMGenerator ops — emit-zag
 *
 * Extracted from compiler/backends/dom.ts. Functions take `this: DOMGenerator`
 * and are bound on the class via class-field assignment.
 */

import type { IRZagNode, IRItem, IRItemProperty } from '../../../ir/types'
import { dispatchZagEmitter } from '../../dom/zag'
import type { DOMGenerator } from '../../dom'

export function emitZagComponent(this: DOMGenerator, node: IRZagNode, parentVar: string): void {
  // Try extracted emitters first (gradual migration)
  const ctx = this.createZagEmitterContext()
  if (dispatchZagEmitter(node, parentVar, ctx)) {
    return
  }

  // Fallback: Generic Zag component handler for unknown types
  // (specialized emitters live in compiler/backends/dom/zag/)

  const varName = this.sanitizeVarName(node.id)

  this.emit(`// Zag Component: ${node.name} (${node.zagType})`)
  this.emit(`const ${varName} = document.createElement('div')`)
  this.emit(`_elements['${node.id}'] = ${varName}`)
  this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  this.emit(`${varName}.dataset.zagComponent = '${node.zagType}'`)
  if (node.name) {
    this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  this.emit(`${varName}._zagConfig = {`)
  this.indent++
  this.emit(`type: '${node.zagType}',`)
  this.emit(`id: '${node.id}',`)
  this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)

  // Emit slot definitions
  this.emit(`slots: {`)
  this.indent++
  for (const [slotName, slot] of Object.entries(node.slots)) {
    this.emit(`'${slotName}': {`)
    this.indent++
    this.emit(`apiMethod: '${slot.apiMethod}',`)
    this.emit(`element: '${slot.element}',`)
    this.emit(`portal: ${slot.portal || false},`)
    this.emit(`styles: ${JSON.stringify(slot.styles)},`)
    this.indent--
    this.emit(`},`)
  }
  this.indent--
  this.emit(`},`)

  // Emit items
  this.emit(`items: ${JSON.stringify(node.items)},`)
  this.indent--
  this.emit(`}`)
  this.emit('')

  // Create slot elements
  for (const [slotName, slot] of Object.entries(node.slots)) {
    const slotVar = `${varName}_${slotName.toLowerCase()}`
    this.emit(`// Slot: ${slotName}`)
    this.emit(`const ${slotVar} = document.createElement('${slot.element}')`)
    this.emit(`${slotVar}.dataset.slot = '${slotName}'`)
    this.emit(`${slotVar}.dataset.mirrorSlot = '${node.id}-${slotName}'`)

    // Apply base styles and mark as styled to prevent runtime defaults
    if (slot.styles.length > 0) {
      this.emit(`${slotVar}.setAttribute('data-styled', 'true')`)
      this.emit(`Object.assign(${slotVar}.style, {`)
      this.indent++
      for (const style of slot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Append to root
    // Note: Even portal elements are appended initially - the runtime
    // can relocate them to a portal container if needed
    this.emit(`${varName}.appendChild(${slotVar})`)
    this.emit('')
  }

  // Create item elements for Content slot
  if (node.items.length > 0) {
    const contentSlotVar = `${varName}_content`
    this.emit(`// Items`)
    this.emitZagItems(node.items, varName, contentSlotVar)
    this.emit('')
  }

  // Append to parent
  this.emit(`${parentVar}.appendChild(${varName})`)
  this.emit('')

  // Initialize Zag component via runtime
  this.emit(`// Initialize Zag machine`)
  this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initZagComponent) {`)
  this.indent++
  this.emit(`_runtime.initZagComponent(${varName})`)
  this.indent--
  this.emit(`}`)
  this.emit('')
}

/**
 * Emit Zag items (including groups)
 */
export function emitZagItems(
  this: DOMGenerator,
  items: IRItem[],
  varNamePrefix: string,
  parentVar: string,
  indexOffset: number = 0
): void {
  let itemIndex = indexOffset
  for (const item of items) {
    if (item.isGroup) {
      // Render Group
      const groupVar = `${varNamePrefix}_group${itemIndex}`
      this.emit(`// Group: ${item.label || 'Unnamed'}`)
      this.emit(`const ${groupVar} = document.createElement('div')`)
      this.emit(`${groupVar}.dataset.slot = 'Group'`)
      this.emit(`${groupVar}.setAttribute('role', 'group')`)

      // Render GroupLabel if present
      if (item.label) {
        const labelVar = `${groupVar}_label`
        this.emit(`const ${labelVar} = document.createElement('span')`)
        this.emit(`${labelVar}.dataset.slot = 'GroupLabel'`)
        this.emit(`${labelVar}.textContent = '${this.escapeString(item.label)}'`)
        this.emit(`${groupVar}.appendChild(${labelVar})`)
      }

      // Render group items
      if (item.items && item.items.length > 0) {
        this.emitZagItems(item.items, `${groupVar}_item`, groupVar, 0)
      }

      this.emit(`${parentVar}.appendChild(${groupVar})`)
      itemIndex++
    } else {
      // Render regular Item
      const itemVar = `${varNamePrefix}_item${itemIndex}`
      this.emit(`const ${itemVar} = document.createElement('div')`)
      this.emit(`${itemVar}.dataset.mirrorItem = '${item.value}'`)
      if (item.disabled) {
        this.emit(`${itemVar}.dataset.disabled = 'true'`)
      }
      // Apply item layout properties if present
      if (item.properties && item.properties.length > 0) {
        for (const prop of item.properties) {
          const propName = prop.name
          // Handle layout properties
          if (propName === 'ver' || propName === 'vertical') {
            this.emit(`${itemVar}.style.display = 'flex'`)
            this.emit(`${itemVar}.style.flexDirection = 'column'`)
            this.emit(`${itemVar}.style.alignItems = 'flex-start'`)
          } else if (propName === 'hor' || propName === 'horizontal') {
            this.emit(`${itemVar}.style.display = 'flex'`)
            this.emit(`${itemVar}.style.flexDirection = 'row'`)
            this.emit(`${itemVar}.style.alignItems = 'center'`)
          } else if (propName === 'gap' || propName === 'g') {
            const gapValue = prop.values[0]
            this.emit(`${itemVar}.style.gap = '${gapValue}px'`)
          } else if (propName === 'pad' || propName === 'p' || propName === 'padding') {
            const padValues = prop.values
            if (padValues.length === 1) {
              this.emit(`${itemVar}.style.padding = '${padValues[0]}px'`)
            } else if (padValues.length === 2) {
              this.emit(`${itemVar}.style.padding = '${padValues[0]}px ${padValues[1]}px'`)
            } else if (padValues.length === 4) {
              this.emit(
                `${itemVar}.style.padding = '${padValues[0]}px ${padValues[1]}px ${padValues[2]}px ${padValues[3]}px'`
              )
            }
          } else if (propName === 'spread') {
            this.emit(`${itemVar}.style.display = 'flex'`)
            this.emit(`${itemVar}.style.justifyContent = 'space-between'`)
          } else if (propName === 'center') {
            this.emit(`${itemVar}.style.display = 'flex'`)
            this.emit(`${itemVar}.style.alignItems = 'center'`)
            this.emit(`${itemVar}.style.justifyContent = 'center'`)
          }
        }
      }
      // Render children if present, otherwise use label as text
      if (item.children && item.children.length > 0) {
        // Default to horizontal layout with centered alignment if no explicit layout
        const hasLayoutProp = item.properties?.some((p: IRItemProperty) =>
          ['ver', 'hor', 'vertical', 'horizontal', 'spread', 'center'].includes(p.name)
        )
        if (!hasLayoutProp) {
          this.emit(`${itemVar}.style.display = 'flex'`)
          this.emit(`${itemVar}.style.alignItems = 'center'`)
          this.emit(`${itemVar}.style.gap = '8px'`)
        }
        for (const child of item.children) {
          this.emitNode(child, itemVar)
        }
      } else {
        this.emit(`${itemVar}.textContent = '${this.escapeString(item.label)}'`)
      }
      this.emit(`${parentVar}.appendChild(${itemVar})`)
      itemIndex++
    }
  }
}
