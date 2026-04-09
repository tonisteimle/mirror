/**
 * Zag Component Emitters
 *
 * Extracted from DOMGenerator for better maintainability.
 * Each emitter generates DOM manipulation code for a specific Zag component.
 *
 * TUTORIAL SET (10 components):
 * - Forms: Checkbox, Switch, RadioGroup, Slider, Select, DatePicker
 * - Navigation: Tabs, SideNav
 * - Overlays: Dialog, Tooltip
 *
 * MIGRATION STATUS:
 * - [x] Switch
 * - [x] Checkbox
 */

import type { IRZagNode, IRSlot, IRNode } from '../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from './zag-emitter-context'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Emit styles for a slot element
 */
function emitSlotStyles(ctx: ZagEmitterContext, varName: string, slot: IRSlot | undefined): void {
  if (slot?.styles && slot.styles.length > 0) {
    ctx.emit(`${varName}.setAttribute('data-styled', 'true')`)
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    for (const style of slot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
}

/**
 * Emit the common component header
 */
function emitComponentHeader(
  ctx: ZagEmitterContext,
  node: IRZagNode,
  varName: string,
  tagName: string,
  zagType: string
): void {
  ctx.emit(`// ${node.name || zagType} Component`)
  ctx.emit(`const ${varName} = document.createElement('${tagName}')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = '${zagType}'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }
}

/**
 * Emit the machine configuration
 */
function emitMachineConfig(
  ctx: ZagEmitterContext,
  varName: string,
  zagType: string,
  nodeId: string,
  machineConfig: Record<string, unknown>,
  extra?: string
): void {
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: '${zagType}',`)
  ctx.emit(`id: '${nodeId}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(machineConfig)},`)
  if (extra) {
    ctx.emit(extra)
  }
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')
}

/**
 * Emit runtime initialization
 */
function emitRuntimeInit(ctx: ZagEmitterContext, varName: string, initFn: string): void {
  ctx.emit(`// Initialize ${initFn.replace('init', '').replace('Component', '')}`)
  ctx.emit(`if (typeof _runtime !== 'undefined' && _runtime.${initFn}) {`)
  ctx.indentIn()
  ctx.emit(`_runtime.${initFn}(${varName})`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')
}

// =============================================================================
// Component Emitters (Tutorial Set)
// =============================================================================

/**
 * Emit Switch component (slots-only pattern)
 * Structure: label > [track > thumb] [labelText]
 */
function emitSwitchComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  // Header
  emitComponentHeader(ctx, node, varName, 'label', 'switch')

  // Machine configuration
  emitMachineConfig(ctx, varName, 'switch', node.id, node.machineConfig || {})

  // Create Track (the sliding background)
  const trackSlot = node.slots['Track']
  const trackVar = `${varName}_track`
  ctx.emit(`// Track (background)`)
  ctx.emit(`const ${trackVar} = document.createElement('span')`)
  ctx.emit(`${trackVar}.dataset.slot = 'Track'`)
  if (trackSlot?.styles && trackSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${trackVar}.style, {`)
    ctx.indentIn()
    for (const style of trackSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${trackVar})`)
  ctx.emit('')

  // Create Thumb (the sliding circle)
  const thumbSlot = node.slots['Thumb']
  const thumbVar = `${varName}_thumb`
  ctx.emit(`// Thumb (slider)`)
  ctx.emit(`const ${thumbVar} = document.createElement('span')`)
  ctx.emit(`${thumbVar}.dataset.slot = 'Thumb'`)
  if (thumbSlot?.styles && thumbSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${thumbVar}.style, {`)
    ctx.indentIn()
    for (const style of thumbSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${trackVar}.appendChild(${thumbVar})`)
  ctx.emit('')

  // Create Label (text)
  const labelText = (node.machineConfig?.label as string) || ''
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label text`)
    ctx.emit(`const ${labelVar} = document.createElement('span')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    if (labelSlot?.styles && labelSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${labelVar}.style, {`)
      ctx.indentIn()
      for (const style of labelSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Switch via runtime
  emitRuntimeInit(ctx, varName, 'initSwitchComponent')
}

/**
 * Emit Checkbox component
 * Structure: label > [hiddenInput] [control > indicator] [label]
 */
function emitCheckboxComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  // Header - checkbox root is a label for accessibility
  emitComponentHeader(ctx, node, varName, 'label', 'checkbox')

  // Machine configuration
  emitMachineConfig(ctx, varName, 'checkbox', node.id, node.machineConfig || {})

  // Apply root styles
  const rootSlot = node.slots['Root']
  if (rootSlot?.styles && rootSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    for (const style of rootSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }

  // Create HiddenInput (for form submission)
  const hiddenInputVar = `${varName}_hiddenInput`
  ctx.emit(`// HiddenInput (form submission)`)
  ctx.emit(`const ${hiddenInputVar} = document.createElement('input')`)
  ctx.emit(`${hiddenInputVar}.type = 'checkbox'`)
  ctx.emit(`${hiddenInputVar}.dataset.slot = 'HiddenInput'`)
  ctx.emit(`${hiddenInputVar}.style.position = 'absolute'`)
  ctx.emit(`${hiddenInputVar}.style.width = '1px'`)
  ctx.emit(`${hiddenInputVar}.style.height = '1px'`)
  ctx.emit(`${hiddenInputVar}.style.padding = '0'`)
  ctx.emit(`${hiddenInputVar}.style.margin = '-1px'`)
  ctx.emit(`${hiddenInputVar}.style.overflow = 'hidden'`)
  ctx.emit(`${hiddenInputVar}.style.clip = 'rect(0, 0, 0, 0)'`)
  ctx.emit(`${hiddenInputVar}.style.whiteSpace = 'nowrap'`)
  ctx.emit(`${hiddenInputVar}.style.border = '0'`)
  const formName = (node.machineConfig?.name as string) || ''
  if (formName) {
    ctx.emit(`${hiddenInputVar}.name = '${ctx.escapeString(formName)}'`)
  }
  ctx.emit(`${varName}.appendChild(${hiddenInputVar})`)
  ctx.emit('')

  // Create Control (the visual checkbox box)
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (visual checkbox)`)
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

  // Create Indicator (checkmark icon inside Control)
  const indicatorSlot = node.slots['Indicator']
  const indicatorVar = `${varName}_indicator`
  ctx.emit(`// Indicator (checkmark)`)
  ctx.emit(`const ${indicatorVar} = document.createElement('span')`)
  ctx.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
  const checkboxIcon = node.machineConfig?.icon || 'check'
  ctx.emit(`${indicatorVar}.dataset.icon = '${ctx.escapeString(String(checkboxIcon))}'`)
  if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${indicatorVar}.style, {`)
    ctx.indentIn()
    for (const style of indicatorSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${controlVar}.appendChild(${indicatorVar})`)
  ctx.emit('')

  // Create Label (text)
  const labelText = (node.machineConfig?.label as string) || ''
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label`)
    ctx.emit(`const ${labelVar} = document.createElement('span')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    if (labelSlot?.styles && labelSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${labelVar}.style, {`)
      ctx.indentIn()
      for (const style of labelSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Checkbox via runtime
  emitRuntimeInit(ctx, varName, 'initCheckboxComponent')
}

// =============================================================================
// Dispatcher
// =============================================================================

/**
 * Registry of Zag component emitters
 * Maps zagType to emitter function
 */
const emitterRegistry = new Map<string, ZagEmitterFn>([
  ['switch', emitSwitchComponent],
  ['checkbox', emitCheckboxComponent],
])

/**
 * Dispatch to the appropriate Zag component emitter
 * Returns true if handled, false if component should use generic handling
 */
export function dispatchZagEmitter(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): boolean {
  const emitter = emitterRegistry.get(node.zagType)
  if (emitter) {
    emitter(node, parentVar, ctx)
    return true
  }

  // Also check with normalized names
  const normalizedType = node.zagType.replace(/-/g, '')
  const normalizedEmitter = emitterRegistry.get(normalizedType)
  if (normalizedEmitter) {
    normalizedEmitter(node, parentVar, ctx)
    return true
  }

  return false
}

/**
 * Register a Zag component emitter
 */
export function registerZagEmitter(zagType: string, emitter: ZagEmitterFn): void {
  emitterRegistry.set(zagType, emitter)
}

// =============================================================================
// Exports
// =============================================================================

export {
  emitSlotStyles,
  emitComponentHeader,
  emitMachineConfig,
  emitRuntimeInit,
}
