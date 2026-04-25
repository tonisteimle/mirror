/**
 * Zag Emitter Helper Functions
 *
 * Shared utilities for the DatePicker emitter (the only remaining Zag
 * component after the 2026-04-25 cleanup).
 */

import type { IRZagNode } from '../../../ir/types'
import type { ZagEmitterContext } from '../zag-emitter-context'

/**
 * Container default styles that should NOT be applied to Zag components.
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
 * Emit root element styles combining node.styles and Root slot styles.
 * Filters out container defaults that shouldn't override Zag component styling.
 */
export function emitRootStyles(ctx: ZagEmitterContext, varName: string, node: IRZagNode): void {
  const nodeStyles = node.styles || []
  const rootSlotStyles = node.slots?.['Root']?.styles || []

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

/**
 * Emit runtime initialization for a Zag component.
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
