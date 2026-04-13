/**
 * Zag Nav Component Emitters
 *
 * Tabs, SideNav, ToggleGroup, SegmentedControl
 */

import type { IRZagNode, IRSlot, IRNode, IRItem } from '../../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from '../zag-emitter-context'
import { emitSlotStyles, emitComponentHeader, emitMachineConfig, emitRuntimeInit } from './helpers'

export function emitTabsComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Tabs Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'tabs'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'tabs',`)
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

  // Create List slot (contains triggers)
  const listVar = `${varName}_list`
  const listSlot = node.slots['List']
  ctx.emit(`// List slot (tab bar)`)
  ctx.emit(`const ${listVar} = document.createElement('div')`)
  ctx.emit(`${listVar}.dataset.slot = 'List'`)
  ctx.emit(`${listVar}.setAttribute('role', 'tablist')`)
  if (listSlot?.styles && listSlot.styles.length > 0) {
    ctx.emit(`${listVar}.setAttribute('data-styled', 'true')`)
    ctx.emit(`Object.assign(${listVar}.style, {`)
    ctx.indentIn()
    for (const style of listSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${listVar})`)
  ctx.emit('')

  // Create Trigger for each item (inside List)
  const triggerSlot = node.slots['Trigger']
  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const triggerVar = `${varName}_trigger${i}`
    ctx.emit(`// Tab trigger: ${item.label}`)
    ctx.emit(`const ${triggerVar} = document.createElement('button')`)
    ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    ctx.emit(`${triggerVar}.dataset.value = '${ctx.escapeString(item.value)}'`)
    ctx.emit(`${triggerVar}.setAttribute('role', 'tab')`)
    ctx.emit(`${triggerVar}.setAttribute('type', 'button')`)
    ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(item.label)}'`)
    if (item.disabled) {
      ctx.emit(`${triggerVar}.disabled = true`)
      ctx.emit(`${triggerVar}.setAttribute('data-disabled', 'true')`)
    }
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      ctx.emit(`${triggerVar}.setAttribute('data-styled', 'true')`)
      ctx.emit(`Object.assign(${triggerVar}.style, {`)
      ctx.indentIn()
      for (const style of triggerSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${listVar}.appendChild(${triggerVar})`)
    ctx.emit('')
  }

  // Create Indicator (inside List, after triggers)
  const indicatorSlot = node.slots['Indicator']
  const indicatorVar = `${varName}_indicator`
  ctx.emit(`// Tab indicator`)
  ctx.emit(`const ${indicatorVar} = document.createElement('div')`)
  ctx.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
  if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
    ctx.emit(`${indicatorVar}.setAttribute('data-styled', 'true')`)
    ctx.emit(`Object.assign(${indicatorVar}.style, {`)
    ctx.indentIn()
    for (const style of indicatorSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  // Render custom indicator children if present
  if (indicatorSlot?.children && indicatorSlot.children.length > 0) {
    ctx.emit(`${indicatorVar}.setAttribute('data-custom-indicator', 'true')`)
    for (const child of indicatorSlot.children) {
      ctx.emitNode(child, indicatorVar)
    }
  }
  ctx.emit(`${listVar}.appendChild(${indicatorVar})`)
  ctx.emit('')

  // Create Content panel for each item (after List)
  const contentSlot = node.slots['Content']
  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const contentVar = `${varName}_content${i}`
    ctx.emit(`// Tab content: ${item.label}`)
    ctx.emit(`const ${contentVar} = document.createElement('div')`)
    ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
    ctx.emit(`${contentVar}.dataset.value = '${ctx.escapeString(item.value)}'`)
    ctx.emit(`${contentVar}.setAttribute('role', 'tabpanel')`)
    ctx.emit(`${contentVar}.setAttribute('tabindex', '0')`)
    if (contentSlot?.styles && contentSlot.styles.length > 0) {
      ctx.emit(`${contentVar}.setAttribute('data-styled', 'true')`)
      ctx.emit(`Object.assign(${contentVar}.style, {`)
      ctx.indentIn()
      for (const style of contentSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    // Render children content or load from file
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        ctx.emitNode(child, contentVar)
      }
    } else if (item.shows) {
      // "show X [from Y]" syntax
      ctx.emit(`${contentVar}.dataset.shows = '${ctx.escapeString(item.shows)}'`)
      if (item.showsFrom) {
        ctx.emit(`${contentVar}.dataset.showsFrom = '${ctx.escapeString(item.showsFrom)}'`)
      }
    } else if (item.loadFromFile) {
      // Legacy: Mark for lazy loading from external file
      ctx.emit(`${contentVar}.dataset.loadFromFile = '${ctx.escapeString(item.loadFromFile)}'`)
    }
    ctx.emit(`${varName}.appendChild(${contentVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Tabs via runtime
  emitRuntimeInit(ctx, varName, 'initTabsComponent')
}

function emitSideNavItems(
  ctx: ZagEmitterContext,
  items: IRItem[],
  rootVar: string,
  parentVar: string,
  collapsed: boolean,
  indexOffset: number = 0
): void {
  let itemIndex = indexOffset

  for (const item of items) {
    if (item.isGroup) {
      // Render NavGroup
      const groupVar = `${rootVar}_group${itemIndex}`
      ctx.emit(`// NavGroup: ${item.label || 'Unnamed'}`)
      ctx.emit(`const ${groupVar} = document.createElement('div')`)
      ctx.emit(`${groupVar}.dataset.slot = 'Group'`)
      ctx.emit(`${groupVar}.setAttribute('role', 'group')`)
      if (item.collapsible) {
        ctx.emit(`${groupVar}.setAttribute('data-collapsible', 'true')`)
        const isOpen = item.defaultOpen !== false
        ctx.emit(`${groupVar}.setAttribute('data-state', '${isOpen ? 'open' : 'closed'}')`)
      }
      ctx.emit(`${parentVar}.appendChild(${groupVar})`)
      ctx.emit('')

      // Group Label
      const labelVar = `${groupVar}_label`
      ctx.emit(`const ${labelVar} = document.createElement('div')`)
      ctx.emit(`${labelVar}.dataset.slot = 'GroupLabel'`)
      if (item.collapsible) {
        ctx.emit(`${labelVar}.setAttribute('role', 'button')`)
        ctx.emit(`${labelVar}.setAttribute('tabindex', '0')`)
        ctx.emit(`${labelVar}.style.cursor = 'pointer'`)
      }
      ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(item.label || '')}'`)
      ctx.emit(`${groupVar}.appendChild(${labelVar})`)
      ctx.emit('')

      // Group Arrow (if collapsible)
      if (item.collapsible) {
        const arrowVar = `${groupVar}_arrow`
        ctx.emit(`const ${arrowVar} = document.createElement('span')`)
        ctx.emit(`${arrowVar}.dataset.slot = 'GroupArrow'`)
        ctx.emit(`${labelVar}.appendChild(${arrowVar})`)
        ctx.emit('')
      }

      // Group Content
      const contentVar = `${groupVar}_content`
      ctx.emit(`const ${contentVar} = document.createElement('div')`)
      ctx.emit(`${contentVar}.dataset.slot = 'GroupContent'`)
      ctx.emit(`${groupVar}.appendChild(${contentVar})`)
      ctx.emit('')

      // Render group items
      if (item.items && item.items.length > 0) {
        emitSideNavItems(ctx, item.items, rootVar, contentVar, collapsed, itemIndex * 100)
      }

      itemIndex++
    } else {
      // Render NavItem
      const itemVar = `${rootVar}_item${itemIndex}`
      ctx.emit(`// NavItem: ${item.label || item.value}`)
      ctx.emit(`const ${itemVar} = document.createElement('a')`)
      ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
      ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(item.value || '')}'`)
      ctx.emit(`${itemVar}.setAttribute('role', 'menuitem')`)
      ctx.emit(`${itemVar}.setAttribute('tabindex', '0')`)
      if (item.shows) {
        ctx.emit(`${itemVar}.dataset.shows = '${ctx.escapeString(item.shows)}'`)
        if (item.showsFrom) {
          ctx.emit(`${itemVar}.dataset.showsFrom = '${ctx.escapeString(item.showsFrom)}'`)
        }
      } else if (item.loadFromFile) {
        // Legacy: Mark for lazy loading from external file
        ctx.emit(`${itemVar}.dataset.loadFromFile = '${ctx.escapeString(item.loadFromFile)}'`)
      }
      if (item.disabled) {
        ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
        ctx.emit(`${itemVar}.setAttribute('aria-disabled', 'true')`)
      }
      ctx.emit(`${parentVar}.appendChild(${itemVar})`)
      ctx.emit('')

      // Icon
      if (item.icon) {
        const iconVar = `${itemVar}_icon`
        ctx.emit(`const ${iconVar} = document.createElement('span')`)
        ctx.emit(`${iconVar}.dataset.slot = 'ItemIcon'`)
        ctx.emit(`${iconVar}.dataset.icon = '${ctx.escapeString(item.icon)}'`)
        ctx.emit(`${itemVar}.appendChild(${iconVar})`)
        ctx.emit('')
      }

      // Label (only show if not collapsed)
      if (!collapsed && item.label) {
        const labelVar = `${itemVar}_label`
        ctx.emit(`const ${labelVar} = document.createElement('span')`)
        ctx.emit(`${labelVar}.dataset.slot = 'ItemLabel'`)
        ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(item.label)}'`)
        ctx.emit(`${itemVar}.appendChild(${labelVar})`)
        ctx.emit('')
      }

      // Badge
      if (!collapsed && item.badge) {
        const badgeVar = `${itemVar}_badge`
        ctx.emit(`const ${badgeVar} = document.createElement('span')`)
        ctx.emit(`${badgeVar}.dataset.slot = 'ItemBadge'`)
        ctx.emit(`${badgeVar}.textContent = '${ctx.escapeString(item.badge)}'`)
        ctx.emit(`${itemVar}.appendChild(${badgeVar})`)
        ctx.emit('')
      }

      // Arrow
      if (!collapsed && item.arrow) {
        const arrowVar = `${itemVar}_arrow`
        ctx.emit(`const ${arrowVar} = document.createElement('span')`)
        ctx.emit(`${arrowVar}.dataset.slot = 'ItemArrow'`)
        ctx.emit(`${itemVar}.appendChild(${arrowVar})`)
        ctx.emit('')
      }

      itemIndex++
    }
  }
}

export function emitSideNavComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// SideNav Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('nav')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'sidenav'`)
  ctx.emit(`${varName}.setAttribute('role', 'navigation')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Check collapsed mode
  const isCollapsed = node.machineConfig.collapsed === true

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'sidenav',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(
    `items: ${JSON.stringify(
      node.items.map((item: IRItem) => ({
        value: item.value,
        label: item.label,
        icon: item.icon,
        badge: item.badge,
        arrow: item.arrow,
        shows: item.shows,
        disabled: item.disabled,
        isGroup: item.isGroup,
        collapsible: item.collapsible,
        defaultOpen: item.defaultOpen,
        items: item.items,
      }))
    )},`
  )
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  if (isCollapsed) {
    ctx.emit(`${varName}.setAttribute('data-collapsed', 'true')`)
  }

  // Header slot (optional)
  const headerSlot = node.slots['Header']
  if (headerSlot && (headerSlot.children?.length > 0 || headerSlot.styles?.length > 0)) {
    const headerVar = `${varName}_header`
    ctx.emit(`// Header`)
    ctx.emit(`const ${headerVar} = document.createElement('div')`)
    ctx.emit(`${headerVar}.dataset.slot = 'Header'`)
    emitSlotStyles(ctx, headerVar, headerSlot)
    // Render header children
    if (headerSlot.children && headerSlot.children.length > 0) {
      for (const child of headerSlot.children) {
        ctx.emitNode(child as IRNode, headerVar)
      }
    }
    ctx.emit(`${varName}.appendChild(${headerVar})`)
    ctx.emit('')
  }

  // ItemList container
  const itemListVar = `${varName}_itemlist`
  const itemListSlot = node.slots['ItemList']
  ctx.emit(`// ItemList`)
  ctx.emit(`const ${itemListVar} = document.createElement('div')`)
  ctx.emit(`${itemListVar}.dataset.slot = 'ItemList'`)
  ctx.emit(`${itemListVar}.setAttribute('role', 'menubar')`)
  emitSlotStyles(ctx, itemListVar, itemListSlot)
  ctx.emit(`${varName}.appendChild(${itemListVar})`)
  ctx.emit('')

  // Store slot styles for runtime use
  ctx.emit(`${varName}._slotStyles = {`)
  ctx.indentIn()
  for (const slotName of [
    'Item',
    'ItemIcon',
    'ItemLabel',
    'ItemBadge',
    'ItemArrow',
    'Group',
    'GroupLabel',
    'GroupArrow',
    'GroupContent',
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

  // Emit items (NavItems and NavGroups)
  emitSideNavItems(ctx, node.items, varName, itemListVar, isCollapsed)

  // Footer slot (optional)
  const footerSlot = node.slots['Footer']
  if (footerSlot && (footerSlot.children?.length > 0 || footerSlot.styles?.length > 0)) {
    const footerVar = `${varName}_footer`
    ctx.emit(`// Footer`)
    ctx.emit(`const ${footerVar} = document.createElement('div')`)
    ctx.emit(`${footerVar}.dataset.slot = 'Footer'`)
    emitSlotStyles(ctx, footerVar, footerSlot)
    // Render footer children
    if (footerSlot.children && footerSlot.children.length > 0) {
      for (const child of footerSlot.children) {
        ctx.emitNode(child as IRNode, footerVar)
      }
    }
    ctx.emit(`${varName}.appendChild(${footerVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize SideNav via runtime
  emitRuntimeInit(ctx, varName, 'initSideNavComponent')
}

export function emitToggleGroupComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// ToggleGroup Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'toggle-group'`)
  ctx.emit(`${varName}.setAttribute('role', 'group')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'toggle-group',`)
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
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Items
  const itemSlot = node.slots['Item']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || item.label || `item-${i}`
    const itemLabel = item.label || itemValue

    ctx.emit(`// Toggle Item: ${itemLabel}`)
    ctx.emit(`const ${itemVar} = document.createElement('button')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(String(itemValue))}'`)
    ctx.emit(`${itemVar}.setAttribute('type', 'button')`)
    ctx.emit(`${itemVar}.textContent = '${ctx.escapeString(String(itemLabel))}'`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
      ctx.emit(`${itemVar}.disabled = true`)
    }
    emitSlotStyles(ctx, itemVar, itemSlot)

    ctx.emit(`${varName}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize ToggleGroup via runtime
  emitRuntimeInit(ctx, varName, 'initToggleGroupComponent')
}

export function emitSegmentedControlComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// SegmentedControl Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'segmented-control'`)
  ctx.emit(`${varName}.setAttribute('role', 'radiogroup')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'segmented-control',`)
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
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Indicator (slides behind active item)
  const indicatorSlot = node.slots['Indicator']
  const indicatorVar = `${varName}_indicator`
  ctx.emit(`// Indicator`)
  ctx.emit(`const ${indicatorVar} = document.createElement('div')`)
  ctx.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
  emitSlotStyles(ctx, indicatorVar, indicatorSlot)
  ctx.emit(`${varName}.appendChild(${indicatorVar})`)
  ctx.emit('')

  // Create Items
  const itemSlot = node.slots['Item']
  const textSlot = node.slots['ItemText']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || item.label || `item-${i}`
    const itemLabel = item.label || itemValue

    ctx.emit(`// Segment Item: ${itemLabel}`)
    ctx.emit(`const ${itemVar} = document.createElement('label')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(String(itemValue))}'`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
    }
    emitSlotStyles(ctx, itemVar, itemSlot)

    // ItemText
    const textVar = `${itemVar}_text`
    ctx.emit(`const ${textVar} = document.createElement('span')`)
    ctx.emit(`${textVar}.dataset.slot = 'ItemText'`)
    ctx.emit(`${textVar}.textContent = '${ctx.escapeString(String(itemLabel))}'`)
    emitSlotStyles(ctx, textVar, textSlot)
    ctx.emit(`${itemVar}.appendChild(${textVar})`)

    ctx.emit(`${varName}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize SegmentedControl via runtime
  emitRuntimeInit(ctx, varName, 'initSegmentedControlComponent')
}

/**
 * Registry entries for nav components
 */
export const navemittersRegistry: [string, ZagEmitterFn][] = [
  ['tabs', emitTabsComponent],
  ['sidenav', emitSideNavComponent],
  ['side-nav', emitSideNavComponent],
  ['toggle-group', emitToggleGroupComponent],
  ['togglegroup', emitToggleGroupComponent],
  ['segmented-control', emitSegmentedControlComponent],
  ['segmentedcontrol', emitSegmentedControlComponent],
]
