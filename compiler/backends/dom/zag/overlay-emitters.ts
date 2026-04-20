/**
 * Zag Overlay Component Emitters
 *
 * Tooltip, Dialog, Popover, HoverCard, Collapsible, DatePicker
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

export function emitTooltipComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Tooltip Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'tooltip'`)
  ctx.emit(`${varName}.style.display = 'inline-block'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  emitMachineConfig(ctx, varName, 'tooltip', node.id, node.machineConfig || {})

  // Trigger element
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)

  // Check if trigger slot has children
  const hasTriggerChildren = triggerSlot?.children && triggerSlot.children.length > 0

  // Check if first child is already a clickable element (Button, Link)
  const firstChild = triggerSlot?.children?.[0] as IRNode | undefined
  const firstChildIsClickable =
    firstChild &&
    (firstChild.primitive === 'Button' ||
      firstChild.primitive === 'Link' ||
      firstChild.primitive === 'button' ||
      firstChild.primitive === 'a')

  if (hasTriggerChildren && firstChildIsClickable) {
    // Child is already a button/link - use neutral span wrapper
    ctx.emit(`const ${triggerVar} = document.createElement('span')`)
    ctx.emit(`${triggerVar}.style.display = 'inline-block'`)
  } else {
    // No children or children are not buttons - use button element
    ctx.emit(`const ${triggerVar} = document.createElement('button')`)
    ctx.emit(`${triggerVar}.type = 'button'`)
  }

  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)

  // Emit children if present, otherwise fallback text
  if (hasTriggerChildren) {
    for (const child of triggerSlot!.children!) {
      ctx.emitNode(child as IRNode, triggerVar)
    }
  } else {
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Hover me'
    ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  }

  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Content (tooltip popup)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (tooltip popup)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'tooltip')`)
  emitSlotStyles(ctx, contentVar, contentSlot)

  // Check if we have slot children to emit, otherwise use text content
  const contentSlotChildren = node.slots['Content']?.children || []
  if (contentSlotChildren.length > 0) {
    // Emit Content slot children (children defined inside Content: in DSL)
    for (const child of contentSlotChildren) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  } else {
    // Fallback to simple text content from machineConfig
    const tooltipText = node.machineConfig.content || node.machineConfig.text || 'Tooltip content'
    ctx.emit(`${contentVar}.textContent = '${ctx.escapeString(String(tooltipText))}'`)
  }
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Tooltip via runtime
  emitRuntimeInit(ctx, varName, 'initTooltipComponent')
}

export function emitDialogComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Dialog Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'dialog'`)
  ctx.emit(`${varName}.style.display = 'inline-block'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  emitMachineConfig(ctx, varName, 'dialog', node.id, node.machineConfig || {})

  // Trigger button
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)

  // Check if trigger slot has children
  const hasTriggerChildren = triggerSlot?.children && triggerSlot.children.length > 0

  // Check if first child is already a clickable element (Button, Link)
  const firstChild = triggerSlot?.children?.[0] as IRNode | undefined
  const firstChildIsClickable =
    firstChild &&
    (firstChild.primitive === 'Button' ||
      firstChild.primitive === 'Link' ||
      firstChild.primitive === 'button' ||
      firstChild.primitive === 'a')

  if (hasTriggerChildren && firstChildIsClickable) {
    // Child is already a button/link - use neutral span wrapper to avoid nested buttons
    ctx.emit(`const ${triggerVar} = document.createElement('span')`)
    ctx.emit(`${triggerVar}.style.display = 'inline-block'`)
  } else {
    // No children or children are not buttons - use button element
    ctx.emit(`const ${triggerVar} = document.createElement('button')`)
    ctx.emit(`${triggerVar}.type = 'button'`)
  }

  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.setAttribute('aria-haspopup', 'dialog')`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)

  // Emit children if present, otherwise fallback text
  if (hasTriggerChildren) {
    for (const child of triggerSlot!.children!) {
      ctx.emitNode(child as IRNode, triggerVar)
    }
  } else {
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Open Dialog'
    ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  }

  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Backdrop
  const backdropSlot = node.slots['Backdrop']
  const backdropVar = `${varName}_backdrop`
  ctx.emit(`// Backdrop`)
  ctx.emit(`const ${backdropVar} = document.createElement('div')`)
  ctx.emit(`${backdropVar}.dataset.slot = 'Backdrop'`)
  emitSlotStyles(ctx, backdropVar, backdropSlot)
  ctx.emit(`${varName}.appendChild(${backdropVar})`)
  ctx.emit('')

  // Content container (the modal)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (modal)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'dialog')`)
  ctx.emit(`${contentVar}.setAttribute('aria-modal', 'true')`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Title
  const titleSlot = node.slots['Title']
  if (node.machineConfig.title) {
    const titleVar = `${varName}_title`
    ctx.emit(`// Title`)
    ctx.emit(`const ${titleVar} = document.createElement('h2')`)
    ctx.emit(`${titleVar}.dataset.slot = 'Title'`)
    ctx.emit(`${titleVar}.textContent = '${ctx.escapeString(String(node.machineConfig.title))}'`)
    emitSlotStyles(ctx, titleVar, titleSlot)
    ctx.emit(`${contentVar}.appendChild(${titleVar})`)
    ctx.emit('')
  }

  // Description
  const descSlot = node.slots['Description']
  if (node.machineConfig.description) {
    const descVar = `${varName}_desc`
    ctx.emit(`// Description`)
    ctx.emit(`const ${descVar} = document.createElement('p')`)
    ctx.emit(`${descVar}.dataset.slot = 'Description'`)
    ctx.emit(
      `${descVar}.textContent = '${ctx.escapeString(String(node.machineConfig.description))}'`
    )
    emitSlotStyles(ctx, descVar, descSlot)
    ctx.emit(`${contentVar}.appendChild(${descVar})`)
    ctx.emit('')
  }

  // Emit Content slot children (children defined inside Content: in DSL)
  const contentSlotChildren = node.slots['Content']?.children || []
  const hasCloseIconProp = node.machineConfig?.closeIcon === true

  // Track the first child's var name - this is typically the user's styled Frame
  let firstChildVarName: string | null = null

  if (contentSlotChildren.length > 0) {
    for (let i = 0; i < contentSlotChildren.length; i++) {
      const child = contentSlotChildren[i] as IRNode
      ctx.emitNode(child, contentVar)
      // Capture first child's variable name for closeIcon positioning
      if (i === 0 && hasCloseIconProp) {
        firstChildVarName = ctx.sanitizeVarName(child.id)
      }
    }
  }

  // closeIcon prop: auto-generated X icon in top-right corner of the styled content
  // We append to the first child (user's Frame) since that has the visual styling
  if (hasCloseIconProp && firstChildVarName) {
    const closeIconVar = `${varName}_closeIcon`
    ctx.emit(`// Close icon (auto-generated via closeIcon prop)`)
    ctx.emit(`${firstChildVarName}.style.position = 'relative'`)
    ctx.emit(`const ${closeIconVar} = document.createElement('button')`)
    ctx.emit(`${closeIconVar}.type = 'button'`)
    ctx.emit(`${closeIconVar}.dataset.slot = 'CloseTrigger'`)
    ctx.emit(`${closeIconVar}.setAttribute('aria-label', 'Close')`)
    // Styling: positioned top-right, circular hover effect
    ctx.emit(`Object.assign(${closeIconVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`'position': 'absolute',`)
    ctx.emit(`'top': '12px',`)
    ctx.emit(`'right': '12px',`)
    ctx.emit(`'width': '28px',`)
    ctx.emit(`'height': '28px',`)
    ctx.emit(`'display': 'flex',`)
    ctx.emit(`'align-items': 'center',`)
    ctx.emit(`'justify-content': 'center',`)
    ctx.emit(`'border': 'none',`)
    ctx.emit(`'background': 'transparent',`)
    ctx.emit(`'border-radius': '4px',`)
    ctx.emit(`'cursor': 'pointer',`)
    ctx.emit(`'transition': 'background 0.15s',`)
    ctx.emit(`'z-index': '1',`)
    ctx.indentOut()
    ctx.emit(`})`)
    // Hover effect
    ctx.emit(
      `${closeIconVar}.onmouseenter = () => ${closeIconVar}.style.background = 'rgba(255,255,255,0.1)'`
    )
    ctx.emit(
      `${closeIconVar}.onmouseleave = () => ${closeIconVar}.style.background = 'transparent'`
    )
    // X icon SVG (inline for immediate rendering)
    ctx.emit(
      `${closeIconVar}.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'`
    )
    ctx.emit(`${firstChildVarName}.appendChild(${closeIconVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Dialog via runtime
  emitRuntimeInit(ctx, varName, 'initDialogComponent')
}

export function emitPopoverComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Popover Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'popover'`)
  ctx.emit(`${varName}.style.display = 'inline-block'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Machine configuration
  emitMachineConfig(ctx, varName, 'popover', node.id, node.machineConfig || {})

  // Trigger button
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)

  // Check if trigger slot has children
  const hasTriggerChildren = triggerSlot?.children && triggerSlot.children.length > 0

  // Check if first child is already a clickable element (Button, Link)
  const firstChild = triggerSlot?.children?.[0] as IRNode | undefined
  const firstChildIsClickable =
    firstChild &&
    (firstChild.primitive === 'Button' ||
      firstChild.primitive === 'Link' ||
      firstChild.primitive === 'button' ||
      firstChild.primitive === 'a')

  if (hasTriggerChildren && firstChildIsClickable) {
    // Child is already a button/link - use neutral span wrapper
    ctx.emit(`const ${triggerVar} = document.createElement('span')`)
    ctx.emit(`${triggerVar}.style.display = 'inline-block'`)
  } else {
    // No children or children are not buttons - use button element
    ctx.emit(`const ${triggerVar} = document.createElement('button')`)
    ctx.emit(`${triggerVar}.type = 'button'`)
  }

  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.setAttribute('aria-haspopup', 'dialog')`)
  ctx.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)

  // Emit children if present, otherwise fallback text
  if (hasTriggerChildren) {
    for (const child of triggerSlot!.children!) {
      ctx.emitNode(child as IRNode, triggerVar)
    }
  } else {
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Open Popover'
    ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  }

  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Content container
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (popover panel)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'dialog')`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Title (optional)
  const titleSlot = node.slots['Title']
  if (node.machineConfig.title) {
    const titleVar = `${varName}_title`
    ctx.emit(`// Title`)
    ctx.emit(`const ${titleVar} = document.createElement('h3')`)
    ctx.emit(`${titleVar}.dataset.slot = 'Title'`)
    ctx.emit(`${titleVar}.textContent = '${ctx.escapeString(String(node.machineConfig.title))}'`)
    emitSlotStyles(ctx, titleVar, titleSlot)
    ctx.emit(`${contentVar}.appendChild(${titleVar})`)
    ctx.emit('')
  }

  // Description (optional)
  const descSlot = node.slots['Description']
  if (node.machineConfig.description) {
    const descVar = `${varName}_desc`
    ctx.emit(`// Description`)
    ctx.emit(`const ${descVar} = document.createElement('p')`)
    ctx.emit(`${descVar}.dataset.slot = 'Description'`)
    ctx.emit(
      `${descVar}.textContent = '${ctx.escapeString(String(node.machineConfig.description))}'`
    )
    emitSlotStyles(ctx, descVar, descSlot)
    ctx.emit(`${contentVar}.appendChild(${descVar})`)
    ctx.emit('')
  }

  // CloseTrigger - only created if explicitly defined as slot
  const closeSlot = node.slots['CloseTrigger']
  if (closeSlot && closeSlot.children && closeSlot.children.length > 0) {
    const closeVar = `${varName}_close`
    ctx.emit(`// Close trigger (user-defined)`)
    ctx.emit(`const ${closeVar} = document.createElement('div')`)
    ctx.emit(`${closeVar}.dataset.slot = 'CloseTrigger'`)
    emitSlotStyles(ctx, closeVar, closeSlot)
    for (const child of closeSlot.children) {
      ctx.emitNode(child as IRNode, closeVar)
    }
    ctx.emit(`${contentVar}.appendChild(${closeVar})`)
    ctx.emit('')
  }

  // Emit Content slot children
  const contentSlotChildren = node.slots['Content']?.children || []
  if (contentSlotChildren.length > 0) {
    for (const child of contentSlotChildren) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Popover via runtime
  emitRuntimeInit(ctx, varName, 'initPopoverComponent')
}

export function emitHoverCardComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// HoverCard Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'hover-card'`)
  ctx.emit(`${varName}.style.display = 'inline-block'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Machine configuration
  emitMachineConfig(ctx, varName, 'hover-card', node.id, node.machineConfig || {})

  // Trigger element
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('a')`)
  ctx.emit(`${triggerVar}.href = '#'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)
  const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Hover me'
  ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Content (hover card popup)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (hover card)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Emit Content slot children
  const contentSlotChildren = node.slots['Content']?.children || []
  if (contentSlotChildren.length > 0) {
    for (const child of contentSlotChildren) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize HoverCard via runtime
  emitRuntimeInit(ctx, varName, 'initHoverCardComponent')
}

export function emitCollapsibleComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  // Header
  emitComponentHeader(ctx, node, varName, 'div', 'collapsible')

  // Machine configuration
  emitMachineConfig(ctx, varName, 'collapsible', node.id, node.machineConfig || {})

  // Apply root styles
  emitRootStyles(ctx, varName, node)

  // Trigger
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('div')`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.setAttribute('role', 'button')`)
  ctx.emit(`${triggerVar}.setAttribute('tabindex', '0')`)
  ctx.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
  ctx.emit(`${triggerVar}.style.cursor = 'pointer'`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)

  // Emit trigger children
  if (triggerSlot?.children && triggerSlot.children.length > 0) {
    for (const child of triggerSlot.children) {
      ctx.emitNode(child as IRNode, triggerVar)
    }
  } else {
    // Fallback text if no children
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Toggle'
    ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  }
  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Content container
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'region')`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Emit content children
  if (contentSlot?.children && contentSlot.children.length > 0) {
    for (const child of contentSlot.children) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  } else if (node.children && node.children.length > 0) {
    // Fallback to node.children if no slot children
    for (const child of node.children) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Collapsible via runtime
  emitRuntimeInit(ctx, varName, 'initCollapsibleComponent')
}

export function emitDatePickerComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// DatePicker Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'datepicker'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'datepicker',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles (combines node.styles and Root slot styles)
  emitRootStyles(ctx, varName, node)

  // Create Control (wrapper for Input + Trigger)
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (Input + Trigger wrapper)`)
  ctx.emit(`const ${controlVar} = document.createElement('div')`)
  ctx.emit(`${controlVar}.dataset.slot = 'Control'`)
  if (controlSlot?.styles && controlSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${controlVar}.style, {`)
    ctx.indentIn()
    for (const style of controlSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${controlVar})`)
  ctx.emit('')

  // Create Input
  const inputSlot = node.slots['Input']
  const inputVar = `${varName}_input`
  ctx.emit(`// Input`)
  ctx.emit(`const ${inputVar} = document.createElement('input')`)
  ctx.emit(`${inputVar}.type = 'text'`)
  ctx.emit(`${inputVar}.dataset.slot = 'Input'`)
  const placeholder = (node.machineConfig?.placeholder as string) || 'Select date...'
  ctx.emit(`${inputVar}.placeholder = '${ctx.escapeString(placeholder)}'`)
  if (inputSlot?.styles && inputSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${inputVar}.style, {`)
    ctx.indentIn()
    for (const style of inputSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${controlVar}.appendChild(${inputVar})`)
  ctx.emit('')

  // Create Trigger (calendar icon button)
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger (calendar button)`)
  ctx.emit(`const ${triggerVar} = document.createElement('button')`)
  ctx.emit(`${triggerVar}.type = 'button'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(
    `${triggerVar}.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'`
  )
  if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${triggerVar}.style, {`)
    ctx.indentIn()
    for (const style of triggerSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${controlVar}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Create Content (calendar popup - will be populated by runtime)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (calendar popup)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  if (contentSlot?.styles && contentSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${contentVar}.style, {`)
    ctx.indentIn()
    for (const style of contentSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize DatePicker via runtime
  emitRuntimeInit(ctx, varName, 'initDatePickerComponent')
}

/**
 * Registry entries for overlay components
 */
export const overlayemittersRegistry: [string, ZagEmitterFn][] = [
  ['tooltip', emitTooltipComponent],
  ['dialog', emitDialogComponent],
  ['popover', emitPopoverComponent],
  ['hover-card', emitHoverCardComponent],
  ['hovercard', emitHoverCardComponent],
  ['collapsible', emitCollapsibleComponent],
  ['datepicker', emitDatePickerComponent],
  ['date-picker', emitDatePickerComponent],
]
