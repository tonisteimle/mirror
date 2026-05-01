/**
 * Zag Overlay Component Emitter
 *
 * DatePicker (the only Zag component still in use).
 *
 * All other overlay/form/nav/select components are now Pure-Mirror templates
 * (see studio/panels/components/component-templates.ts) — their Zag emitters
 * have been removed.
 */

import type { IRZagNode } from '../../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from '../base-emitter-context'
import { emitRootStyles, emitRuntimeInit } from './helpers'

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
 * Registry entries for overlay components (DatePicker only).
 */
export const overlayemittersRegistry: [string, ZagEmitterFn][] = [
  ['datepicker', emitDatePickerComponent],
  ['date-picker', emitDatePickerComponent],
]
