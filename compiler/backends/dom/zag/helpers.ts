/**
 * Zag Emitter Helper Functions
 *
 * Shared utilities for all Zag component emitters.
 */

import type { IRZagNode, IRSlot } from '../../../ir/types'
import type { ZagEmitterContext } from '../zag-emitter-context'

export function emitSlotStyles(
  ctx: ZagEmitterContext,
  varName: string,
  slot: IRSlot | undefined
): void {
  if (!slot?.styles?.length) return
  ctx.emit(`${varName}.setAttribute('data-styled', 'true')`)
  ctx.emit(`Object.assign(${varName}.style, {`)
  ctx.indentIn()
  slot.styles.forEach(s => ctx.emit(`'${s.property}': '${s.value}',`))
  ctx.indentOut()
  ctx.emit('})')
}

export function emitComponentHeader(
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
  if (node.name) ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
}

/**
 * Emit the machine configuration
 */
export function emitMachineConfig(
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
export function emitRuntimeInit(ctx: ZagEmitterContext, varName: string, initFn: string): void {
  ctx.emit(`// Initialize ${initFn.replace('init', '').replace('Component', '')}`)
  ctx.emit(`if (typeof _runtime !== 'undefined' && _runtime.${initFn}) {`)
  ctx.indentIn()
  ctx.emit(`_runtime.${initFn}(${varName})`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')
}

/**
 * Format a field name into a human-readable label
 * e.g., "firstName" -> "First Name", "user_email" -> "User Email"
 */
export function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1') // camelCase to spaces
    .replace(/[_-]/g, ' ') // snake_case/kebab-case to spaces
    .replace(/\s+/g, ' ') // normalize spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
