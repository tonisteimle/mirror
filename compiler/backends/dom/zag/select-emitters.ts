/**
 * Zag Select Component Emitters
 *
 * Select, TreeView, Listbox, Accordion
 */

import type { IRZagNode, IRSlot, IRNode, IRItem } from '../../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from '../zag-emitter-context'
import {
  emitSlotStyles,
  emitRootStyles,
  emitComponentHeader,
  emitMachineConfig,
  emitRuntimeInit,
} from './helpers'

export function emitSelectComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Select Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'select'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  // Handle bind attribute for two-way data binding
  if (node.bind) {
    const bindVar = node.bind.startsWith('$') ? node.bind.slice(1) : node.bind
    ctx.emit(`${varName}.dataset.bind = '${bindVar}'`)
  }

  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'select',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(
    `items: ${JSON.stringify(
      node.items.map((item: IRItem) => ({
        value: item.value,
        label: item.label,
        disabled: item.disabled,
        icon: item.icon,
      }))
    )},`
  )
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitRootStyles(ctx, varName, node)

  // Create Trigger
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  const placeholder = node.machineConfig.placeholder || 'Select...'
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('button')`)
  ctx.emit(`${triggerVar}.type = 'button'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.setAttribute('role', 'combobox')`)
  ctx.emit(`${triggerVar}.setAttribute('aria-haspopup', 'listbox')`)
  ctx.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)

  // Trigger text (value display)
  const triggerTextVar = `${triggerVar}_text`
  ctx.emit(`const ${triggerTextVar} = document.createElement('span')`)
  ctx.emit(`${triggerTextVar}.dataset.slot = 'TriggerText'`)
  ctx.emit(`${triggerTextVar}.textContent = '${ctx.escapeString(String(placeholder))}'`)
  ctx.emit(`${triggerVar}.appendChild(${triggerTextVar})`)

  // Trigger arrow icon
  const triggerArrowVar = `${triggerVar}_arrow`
  ctx.emit(`const ${triggerArrowVar} = document.createElement('span')`)
  ctx.emit(`${triggerArrowVar}.dataset.slot = 'TriggerArrow'`)
  ctx.emit(`${triggerArrowVar}.dataset.icon = 'chevron-down'`)
  ctx.emit(`${triggerVar}.appendChild(${triggerArrowVar})`)

  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Create Content (dropdown)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (dropdown)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'listbox')`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit('')

  // Create Items
  const itemSlot = node.slots['Item']
  const indicatorSlot = node.slots['ItemIndicator']
  const selectIcon = node.machineConfig.icon || 'check'

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    // Use nullish coalescing to preserve empty string values
    const itemValue = item.value ?? item.label ?? `item-${i}`
    const itemLabel = item.label ?? itemValue

    ctx.emit(`// Item: ${itemLabel}`)
    ctx.emit(`const ${itemVar} = document.createElement('div')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(String(itemValue))}'`)
    ctx.emit(`${itemVar}.setAttribute('role', 'option')`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
    }
    // Set icon for this item (item-specific or global)
    const itemIcon = item.icon || selectIcon
    ctx.emit(`${itemVar}.dataset.icon = '${ctx.escapeString(String(itemIcon))}'`)

    emitSlotStyles(ctx, itemVar, itemSlot)

    // Item text
    const itemTextVar = `${itemVar}_text`
    ctx.emit(`const ${itemTextVar} = document.createElement('span')`)
    ctx.emit(`${itemTextVar}.dataset.slot = 'ItemText'`)
    ctx.emit(`${itemTextVar}.textContent = '${ctx.escapeString(String(itemLabel))}'`)
    ctx.emit(`${itemVar}.appendChild(${itemTextVar})`)

    // Item indicator (checkmark)
    const indicatorVar = `${itemVar}_indicator`
    ctx.emit(`const ${indicatorVar} = document.createElement('span')`)
    ctx.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
    emitSlotStyles(ctx, indicatorVar, indicatorSlot)
    ctx.emit(`${itemVar}.appendChild(${indicatorVar})`)

    ctx.emit(`${contentVar}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  ctx.emit(`${varName}.appendChild(${contentVar})`)

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Select via runtime
  emitRuntimeInit(ctx, varName, 'initSelectComponent')
}

export function emitTreeViewComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// TreeView Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'tree-view'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'tree-view',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitRootStyles(ctx, varName, node)

  // Create Tree element (ul)
  const treeSlot = node.slots['Tree']
  const treeVar = `${varName}_tree`
  ctx.emit(`// Tree`)
  ctx.emit(`const ${treeVar} = document.createElement('ul')`)
  ctx.emit(`${treeVar}.dataset.slot = 'Tree'`)
  ctx.emit(`${treeVar}.setAttribute('role', 'tree')`)
  emitSlotStyles(ctx, treeVar, treeSlot)
  ctx.emit(`${varName}.appendChild(${treeVar})`)
  ctx.emit('')

  // Store slot styles for runtime use
  ctx.emit(`${varName}._slotStyles = {`)
  ctx.indentIn()
  for (const slotName of [
    'Branch',
    'BranchTrigger',
    'BranchContent',
    'BranchIndicator',
    'Item',
    'ItemText',
  ]) {
    const slot = node.slots[slotName]
    if (slot?.styles && slot.styles.length > 0) {
      ctx.emit(`'${slotName}': {`)
      ctx.indentIn()
      for (const style of slot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit(`},`)
    }
  }
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize TreeView via runtime
  emitRuntimeInit(ctx, varName, 'initTreeViewComponent')
}

export function emitListboxComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Listbox Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'listbox'`)
  ctx.emit(`${varName}.setAttribute('role', 'listbox')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  emitMachineConfig(ctx, varName, 'listbox', node.id, node.machineConfig || {})

  // Apply root styles
  emitRootStyles(ctx, varName, node)

  // Create Label if provided
  const labelSlot = node.slots['Label']
  if (labelSlot && node.machineConfig.label) {
    const labelVar = `${varName}_label`
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(String(node.machineConfig.label))}'`)
    emitSlotStyles(ctx, labelVar, labelSlot)
    ctx.emit(`${varName}.appendChild(${labelVar})`)
  }

  // Create Content container
  const contentVar = `${varName}_content`
  const contentSlot = node.slots['Content']
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  emitSlotStyles(ctx, contentVar, contentSlot)

  // Create items
  const itemSlot = node.slots['Item']
  const textSlot = node.slots['ItemText']
  const indicatorSlot = node.slots['ItemIndicator']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || `item-${i}`

    // Item container
    ctx.emit(`// Listbox Item: ${item.label || itemValue}`)
    ctx.emit(`const ${itemVar} = document.createElement('div')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(itemValue)}'`)
    ctx.emit(`${itemVar}.setAttribute('role', 'option')`)
    ctx.emit(`${itemVar}.setAttribute('tabindex', '${i === 0 ? '0' : '-1'}')`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
      ctx.emit(`${itemVar}.setAttribute('aria-disabled', 'true')`)
    }
    emitSlotStyles(ctx, itemVar, itemSlot)

    // Item indicator (checkmark for selected)
    const indicatorVar = `${itemVar}_indicator`
    ctx.emit(`const ${indicatorVar} = document.createElement('span')`)
    ctx.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
    // Icon can be customized per-item or globally via machineConfig
    const itemIcon = item.icon || node.machineConfig.icon || 'check'
    ctx.emit(`${indicatorVar}.dataset.icon = '${ctx.escapeString(String(itemIcon))}'`)
    emitSlotStyles(ctx, indicatorVar, indicatorSlot)
    ctx.emit(`${itemVar}.appendChild(${indicatorVar})`)

    // Item text
    const textVar = `${itemVar}_text`
    ctx.emit(`const ${textVar} = document.createElement('span')`)
    ctx.emit(`${textVar}.dataset.slot = 'ItemText'`)
    ctx.emit(`${textVar}.textContent = '${ctx.escapeString(item.label || itemValue)}'`)
    emitSlotStyles(ctx, textVar, textSlot)
    ctx.emit(`${itemVar}.appendChild(${textVar})`)

    // Render item children if any
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        ctx.emitNode(child, itemVar)
      }
    }

    ctx.emit(`${contentVar}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  ctx.emit(`${varName}.appendChild(${contentVar})`)

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Listbox via runtime
  emitRuntimeInit(ctx, varName, 'initListboxComponent')
}

export function emitAccordionComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Accordion Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'accordion'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'accordion',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(
    `items: ${JSON.stringify(
      node.items.map((item: IRItem) => ({
        value: item.value,
        label: item.label,
        disabled: item.disabled,
      }))
    )},`
  )
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitRootStyles(ctx, varName, node)

  // Create Item containers for each accordion item
  const itemSlot = node.slots['Item']
  const triggerSlot = node.slots['ItemTrigger']
  const contentSlot = node.slots['ItemContent']
  const indicatorSlot = node.slots['ItemIndicator']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || `item-${i}`

    // Item container
    ctx.emit(`// Accordion Item: ${item.label || itemValue}`)
    ctx.emit(`const ${itemVar} = document.createElement('div')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(itemValue)}'`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
    }
    emitSlotStyles(ctx, itemVar, itemSlot)

    // ItemTrigger (header/button)
    const triggerVar = `${itemVar}_trigger`
    ctx.emit(`const ${triggerVar} = document.createElement('button')`)
    ctx.emit(`${triggerVar}.type = 'button'`)
    ctx.emit(`${triggerVar}.dataset.slot = 'ItemTrigger'`)
    ctx.emit(`${triggerVar}.dataset.value = '${ctx.escapeString(itemValue)}'`)
    ctx.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
    if (item.disabled) {
      ctx.emit(`${triggerVar}.disabled = true`)
    }
    emitSlotStyles(ctx, triggerVar, triggerSlot)

    // Trigger text
    const triggerTextVar = `${triggerVar}_text`
    ctx.emit(`const ${triggerTextVar} = document.createElement('span')`)
    ctx.emit(`${triggerTextVar}.textContent = '${ctx.escapeString(item.label || itemValue)}'`)
    ctx.emit(`${triggerVar}.appendChild(${triggerTextVar})`)

    // ItemIndicator (icon loaded via runtime)
    const indicatorVar = `${itemVar}_indicator`
    const accordionIcon = node.machineConfig.icon || 'chevron-down'
    ctx.emit(`const ${indicatorVar} = document.createElement('span')`)
    ctx.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
    ctx.emit(`${indicatorVar}.dataset.icon = '${ctx.escapeString(String(accordionIcon))}'`)
    emitSlotStyles(ctx, indicatorVar, indicatorSlot)
    ctx.emit(`${triggerVar}.appendChild(${indicatorVar})`)

    ctx.emit(`${itemVar}.appendChild(${triggerVar})`)

    // ItemContent (collapsible body)
    const contentVar = `${itemVar}_content`
    ctx.emit(`const ${contentVar} = document.createElement('div')`)
    ctx.emit(`${contentVar}.dataset.slot = 'ItemContent'`)
    ctx.emit(`${contentVar}.dataset.value = '${ctx.escapeString(itemValue)}'`)
    ctx.emit(`${contentVar}.setAttribute('role', 'region')`)
    emitSlotStyles(ctx, contentVar, contentSlot)

    // Render item children inside content
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        ctx.emitNode(child, contentVar)
      }
    }

    ctx.emit(`${itemVar}.appendChild(${contentVar})`)
    ctx.emit(`${varName}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Accordion via runtime
  emitRuntimeInit(ctx, varName, 'initAccordionComponent')
}

/**
 * Registry entries for select components
 */
export const selectemittersRegistry: [string, ZagEmitterFn][] = [
  ['select', emitSelectComponent],
  ['tree-view', emitTreeViewComponent],
  ['treeview', emitTreeViewComponent],
  ['listbox', emitListboxComponent],
  ['accordion', emitAccordionComponent],
]
