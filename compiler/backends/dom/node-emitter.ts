/**
 * Node Emitter Module
 *
 * DOM element creation and property emission.
 * Extracts focused helpers from the monolithic emitNode method.
 */

import type { IRNode, IRStyle, IRProperty } from '../../ir/types'

// ============================================
// TYPES
// ============================================

export interface NodeEmitterContext {
  emit: (line: string) => void
  getIndent: () => number
  indentIn: () => void
  indentOut: () => void
  sanitizeVarName: (id: string) => string
  escapeString: (str: string | number | boolean | undefined | null) => string
  resolveContentValue: (value: string | number | boolean) => string
}

// ============================================
// ELEMENT CREATION
// ============================================

/**
 * Emit basic element creation code
 */
export function emitElementCreation(
  ctx: NodeEmitterContext,
  node: IRNode,
  varName: string,
  isMainRoot: boolean
): void {
  emitElementComment(ctx, node)
  emitCreateElement(ctx, node, varName)
  emitElementRegistration(ctx, node, varName)
  emitMainRootMarker(ctx, varName, isMainRoot)
  emitComponentNameMarker(ctx, node, varName)
  emitInstanceNameRegistration(ctx, node, varName)
}

function emitElementComment(ctx: NodeEmitterContext, node: IRNode): void {
  ctx.emit(`// ${node.name || node.tag}`)
}

function emitCreateElement(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  ctx.emit(`const ${varName} = document.createElement('${node.tag}')`)
}

function emitElementRegistration(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
}

function emitMainRootMarker(ctx: NodeEmitterContext, varName: string, isMainRoot: boolean): void {
  if (isMainRoot) {
    ctx.emit(`${varName}.dataset.mirrorRoot = 'true'`)
  }
}

function emitComponentNameMarker(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }
}

function emitInstanceNameRegistration(
  ctx: NodeEmitterContext,
  node: IRNode,
  varName: string
): void {
  if (!node.instanceName) return
  ctx.emit(`_elements['${node.instanceName}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorName = '${node.instanceName}'`)
}

// ============================================
// PROPERTY EMISSION
// ============================================

/**
 * Emit property assignments for an element
 */
export function emitProperties(
  ctx: NodeEmitterContext,
  node: IRNode,
  varName: string
): { isIcon: boolean; iconName: string | null; isSlot: boolean } {
  const isIcon = node.primitive === 'icon'
  const isSlot = node.primitive === 'slot'
  let iconName: string | null = null

  for (const prop of node.properties) {
    if (prop.name === 'textContent') {
      iconName = emitTextContent(ctx, prop, varName, isIcon, isSlot)
    } else if (isDisabledOrHidden(prop.name)) {
      emitBooleanProperty(ctx, prop, varName)
    } else {
      emitAttribute(ctx, prop, varName)
    }
  }

  return { isIcon, iconName, isSlot }
}

function isDisabledOrHidden(name: string): boolean {
  return name === 'disabled' || name === 'hidden'
}

function emitTextContent(
  ctx: NodeEmitterContext,
  prop: IRProperty,
  varName: string,
  isIcon: boolean,
  isSlot: boolean
): string | null {
  if (isIcon && typeof prop.value === 'string') return prop.value
  if (isSlot) return null
  emitTextContentAssignment(ctx, prop, varName)
  return null
}

function emitTextContentAssignment(
  ctx: NodeEmitterContext,
  prop: IRProperty,
  varName: string
): void {
  const value = ctx.resolveContentValue(prop.value)
  ctx.emit(`${varName}.textContent = ${value}`)
  emitTextBindings(ctx, value, varName)
}

function emitTextBindings(ctx: NodeEmitterContext, value: string, varName: string): void {
  const getMatches = value.match(/\$get\("([^"]+)"\)/g)
  if (!getMatches) return

  ctx.emit(`${varName}._textTemplate = () => ${value}`)
  for (const match of getMatches) {
    const pathMatch = match.match(/\$get\("([^"]+)"\)/)
    if (pathMatch) {
      ctx.emit(`_runtime.bindText(${varName}, "${pathMatch[1]}")`)
    }
  }
}

function emitBooleanProperty(ctx: NodeEmitterContext, prop: IRProperty, varName: string): void {
  ctx.emit(`${varName}.${prop.name} = ${prop.value}`)
}

function emitAttribute(ctx: NodeEmitterContext, prop: IRProperty, varName: string): void {
  const value = formatAttributeValue(ctx, prop.value)
  ctx.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
}

function formatAttributeValue(ctx: NodeEmitterContext, value: string | number | boolean): string {
  if (typeof value === 'string') {
    return `"${ctx.escapeString(value)}"`
  }
  return String(value)
}

// ============================================
// ICON EMISSION
// ============================================

/**
 * Emit icon loading code
 */
export function emitIconSetup(ctx: NodeEmitterContext, varName: string, iconName: string): void {
  emitIconDefaultStyles(ctx, varName)
  emitIconLoading(ctx, varName, iconName)
}

function emitIconDefaultStyles(ctx: NodeEmitterContext, varName: string): void {
  ctx.emit(`// Icon default styles`)
  ctx.emit(`Object.assign(${varName}.style, {`)
  ctx.indentIn()
  ctx.emit(`'display': 'inline-flex',`)
  ctx.emit(`'align-items': 'center',`)
  ctx.emit(`'justify-content': 'center',`)
  ctx.emit(`'flex-shrink': '0',`)
  ctx.emit(`'line-height': '0',`)
  ctx.indentOut()
  ctx.emit(`})`)
}

function emitIconLoading(ctx: NodeEmitterContext, varName: string, iconName: string): void {
  ctx.emit(`// Load Lucide icon`)
  ctx.emit(`_runtime.loadIcon(${varName}, "${ctx.escapeString(iconName)}")`)
}

// ============================================
// SLOT EMISSION
// ============================================

/**
 * Emit slot placeholder code
 */
export function emitSlotSetup(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  const slotLabel = extractSlotLabel(node)
  emitSlotDataAttributes(ctx, varName, slotLabel)
  emitSlotLabelElement(ctx, varName, slotLabel)
}

function extractSlotLabel(node: IRNode): string {
  const labelProp = node.properties.find(p => p.name === 'textContent')
  return labelProp ? String(labelProp.value) : 'Slot'
}

function emitSlotDataAttributes(ctx: NodeEmitterContext, varName: string, slotLabel: string): void {
  ctx.emit(`// Slot placeholder`)
  ctx.emit(`${varName}.dataset.mirrorSlot = 'true'`)
  ctx.emit(`${varName}.dataset.slot = "${ctx.escapeString(slotLabel)}"`)
  ctx.emit(`${varName}.dataset.slotLabel = "${ctx.escapeString(slotLabel)}"`)
  ctx.emit(`${varName}.classList.add('mirror-slot')`)
}

function emitSlotLabelElement(ctx: NodeEmitterContext, varName: string, slotLabel: string): void {
  ctx.emit(`const ${varName}_label = document.createElement('span')`)
  ctx.emit(`${varName}_label.className = 'mirror-slot-label'`)
  ctx.emit(`${varName}_label.textContent = "${ctx.escapeString(slotLabel)}"`)
  ctx.emit(`${varName}.appendChild(${varName}_label)`)
}

// ============================================
// STYLE EMISSION
// ============================================

/**
 * Emit base styles (excluding state and size-state styles)
 */
export function emitBaseStyles(ctx: NodeEmitterContext, node: IRNode, varName: string): IRStyle[] {
  const baseStyles = node.styles.filter(s => !s.state && !s.sizeState)
  if (baseStyles.length === 0) return baseStyles
  ctx.emit(`Object.assign(${varName}.style, {`)
  ctx.indentIn()
  for (const style of baseStyles) ctx.emit(`'${style.property}': '${style.value}',`)
  ctx.indentOut()
  ctx.emit('})')
  return baseStyles
}

/**
 * Emit container type for size-states
 */
export function emitContainerType(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (node.needsContainer) {
    ctx.emit(`${varName}.style.containerType = 'inline-size'`)
  }
}

/**
 * Emit layout type data attribute
 */
export function emitLayoutType(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (node.layoutType) {
    ctx.emit(`${varName}.dataset.layout = '${node.layoutType}'`)
  }
}

// ============================================
// STATE STYLES
// ============================================

/**
 * Emit state styles for runtime
 */
export function emitStateStyles(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  const cssStates = new Set(['hover', 'focus', 'active', 'disabled'])
  const behaviorStyles = node.styles.filter(s => s.state && !cssStates.has(s.state))

  if (behaviorStyles.length === 0) return

  ctx.emit(`${varName}._stateStyles = {`)
  ctx.indentIn()

  const byState = groupByState(behaviorStyles)
  for (const [state, styles] of Object.entries(byState)) {
    emitStateStyleGroup(ctx, state, styles)
  }

  ctx.indentOut()
  ctx.emit('}')
}

function groupByState(styles: IRStyle[]): Record<string, IRStyle[]> {
  const result: Record<string, IRStyle[]> = {}
  for (const style of styles) {
    const state = style.state || 'default'
    if (!result[state]) result[state] = []
    result[state].push(style)
  }
  return result
}

function emitStateStyleGroup(ctx: NodeEmitterContext, state: string, styles: IRStyle[]): void {
  ctx.emit(`'${state}': {`)
  ctx.indentIn()
  for (const style of styles) {
    ctx.emit(`'${style.property}': '${style.value}',`)
  }
  ctx.indentOut()
  ctx.emit('},')
}

// ============================================
// VISIBILITY & BINDING
// ============================================

/**
 * Emit visible when condition
 */
export function emitVisibleWhen(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (!node.visibleWhen) return

  ctx.emit(`${varName}._visibleWhen = '${node.visibleWhen}'`)
  ctx.emit(`// Initially hidden until condition is met`)
  ctx.emit(`${varName}.style.display = 'none'`)
  emitVisibilityBindings(ctx, node.visibleWhen, varName)
}

function emitVisibilityBindings(
  ctx: NodeEmitterContext,
  visibleWhen: string,
  varName: string
): void {
  const dataMatches = visibleWhen.match(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g)
  if (!dataMatches) return

  for (const match of dataMatches) {
    const basePath = match.slice(1).split('.')[0]
    ctx.emit(`_runtime.bindVisibility(${varName}, '${basePath}')`)
  }
}

/**
 * Emit selection binding
 */
export function emitSelectionBinding(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (!node.selection) return

  const selectionVar = node.selection.startsWith('$') ? node.selection.slice(1) : node.selection
  ctx.emit(`${varName}._selectionBinding = '${selectionVar}'`)
  ctx.emit(`${varName}.dataset.selection = '${selectionVar}'`)
}

/**
 * Emit bind for exclusive tracking
 */
export function emitBindAttribute(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (!node.bind) return

  const bindVar = node.bind.startsWith('$') ? node.bind.slice(1) : node.bind
  ctx.emit(`${varName}.dataset.bind = '${bindVar}'`)
}

// ============================================
// COMPONENT & ROUTE
// ============================================

/**
 * Emit component name and route attributes
 */
export function emitComponentAttributes(
  ctx: NodeEmitterContext,
  node: IRNode,
  varName: string,
  zagSlotNames: Set<string>
): void {
  if (!node.name) return

  ctx.emit(`${varName}.dataset.component = '${node.name}'`)
  if (zagSlotNames.has(node.name)) {
    ctx.emit(`${varName}.dataset.slot = '${node.name}'`)
  }
}

/**
 * Emit route data attribute
 */
export function emitRouteAttribute(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (node.route) {
    ctx.emit(`${varName}.dataset.route = '${node.route}'`)
  }
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================

/**
 * Emit keyboard navigation setup
 */
export function emitKeyboardNav(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (!node.keyboardNav) return

  ctx.emit(`// Enable keyboard navigation (Enter to next, Escape to blur)`)
  ctx.emit(`_runtime.setupKeyboardNav(${varName})`)
}

// ============================================
// TWO-WAY DATA BINDING
// ============================================

/**
 * Emit two-way data binding for input elements
 */
export function emitValueBinding(ctx: NodeEmitterContext, node: IRNode, varName: string): void {
  if (!node.valueBinding) return

  const bindingPath = node.valueBinding
  ctx.emit(`// Two-way data binding: ${bindingPath}`)
  ctx.emit(`${varName}.value = $get("${bindingPath}") ?? ""`)
  emitInputEventListener(ctx, varName, bindingPath)
  ctx.emit(`_runtime.bindValue(${varName}, "${bindingPath}")`)
}

function emitInputEventListener(
  ctx: NodeEmitterContext,
  varName: string,
  bindingPath: string
): void {
  ctx.emit(`${varName}.addEventListener('input', (e) => {`)
  ctx.indentIn()
  ctx.emit(`$set("${bindingPath}", e.target.value)`)
  ctx.indentOut()
  ctx.emit(`})`)
}

// ============================================
// ABSOLUTE POSITIONING
// ============================================

/**
 * Emit parent positioning for absolute children
 */
export function emitAbsolutePositioning(
  ctx: NodeEmitterContext,
  baseStyles: IRStyle[],
  varName: string,
  parentVar: string
): void {
  const hasPositionAbsolute = baseStyles.some(
    s => s.property === 'position' && s.value === 'absolute'
  )
  if (!hasPositionAbsolute || parentVar === '_root') return

  ctx.emit(`// Auto-set parent to relative for absolute child`)
  ctx.emit(
    `if (${parentVar}.style.position !== 'relative' && ` +
      `${parentVar}.style.position !== 'absolute' && ` +
      `${parentVar}.style.position !== 'fixed') {`
  )
  ctx.indentIn()
  ctx.emit(`${parentVar}.style.position = 'relative'`)
  ctx.emit(`if (!${parentVar}.dataset.layout) ${parentVar}.dataset.mirrorAbs = 'true'`)
  ctx.indentOut()
  ctx.emit(`}`)
}

/**
 * Emit absolute container marker
 */
export function emitAbsContainerMarker(
  ctx: NodeEmitterContext,
  node: IRNode,
  varName: string,
  baseStyles: IRStyle[]
): void {
  const hasPositionRelative = baseStyles.some(
    s => s.property === 'position' && s.value === 'relative'
  )
  const hasFlexDisplay = baseStyles.some(
    s => s.property === 'display' && (s.value === 'flex' || s.value === 'grid')
  )
  if (hasPositionRelative && !hasFlexDisplay && !node.layoutType)
    ctx.emit(`${varName}.dataset.mirrorAbs = 'true'`)
}

// ============================================
// APPEND TO PARENT
// ============================================

/**
 * Emit append to parent
 */
export function emitAppendToParent(
  ctx: NodeEmitterContext,
  varName: string,
  parentVar: string
): void {
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')
}
