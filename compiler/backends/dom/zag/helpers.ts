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

/**
 * Container default styles that should NOT be applied to Zag components
 * These are automatically added by the IR transformer for Frame elements
 * but Zag components have their own default layout.
 */
const CONTAINER_DEFAULTS_TO_SKIP = new Set([
  'display:flex',
  'flex-direction:column',
  'flex-direction:row',
  'align-items:flex-start',
  'align-items:stretch',
  'width:fit-content',
  'min-width:0',
  'min-height:0',
  'box-sizing:border-box',
])

/**
 * Emit root element styles combining node.styles and Root slot styles
 * Filters out container defaults that shouldn't override Zag component styling.
 */
export function emitRootStyles(ctx: ZagEmitterContext, varName: string, node: IRZagNode): void {
  const nodeStyles = node.styles || []
  const rootSlotStyles = node.slots?.['Root']?.styles || []

  // Filter out container defaults from node.styles
  const filteredNodeStyles = nodeStyles.filter(style => {
    const styleKey = `${style.property}:${style.value}`
    return !CONTAINER_DEFAULTS_TO_SKIP.has(styleKey)
  })

  const allStyles = [...filteredNodeStyles, ...rootSlotStyles]

  if (allStyles.length === 0) return

  ctx.emit(`Object.assign(${varName}.style, {`)
  ctx.indentIn()
  for (const style of allStyles) {
    ctx.emit(`'${style.property}': '${style.value}',`)
  }
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
