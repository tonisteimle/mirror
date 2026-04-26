/**
 * API Emitter Module
 *
 * Emits public API, initialization, and auto-mount code.
 */

import type { IRNode } from '../../ir/types'
import type { JavaScriptBlock } from '../../parser/ast'

// ============================================
// TYPES
// ============================================

export interface APIEmitterContext {
  emit: (line: string) => void
  emitRaw: (line: string) => void
  getIndent: () => number
  indentIn: () => void
  indentOut: () => void
}

// ============================================
// NAMED NODES COLLECTION
// ============================================

/**
 * Collect all nodes with instanceName (for public API accessors)
 */
export function collectNamedNodes(nodes: IRNode[]): IRNode[] {
  const result: IRNode[] = []
  collectNamedNodesRecursive(nodes, result)
  return result
}

function collectNamedNodesRecursive(nodes: IRNode[], result: IRNode[]): void {
  for (const node of nodes) {
    if (node.instanceName) {
      result.push(node)
    }
    collectNamedNodesRecursive(node.children, result)
  }
}

// ============================================
// PUBLIC API EMISSION
// ============================================

/**
 * Emit the public API attached to _root
 */
export function emitPublicAPI(ctx: APIEmitterContext, namedNodes: IRNode[]): void {
  emitAPIComment(ctx)
  emitNodeAccessors(ctx, namedNodes)
  emitStateManagement(ctx)
  emitUpdateFunction(ctx)
  emitReturnRoot(ctx)
}

function emitAPIComment(ctx: APIEmitterContext): void {
  ctx.emit('// Attach API methods directly to _root for intuitive usage')
  ctx.emit('// createUI() returns the DOM node directly, with API methods attached')
  ctx.emit('')
}

function emitNodeAccessors(ctx: APIEmitterContext, namedNodes: IRNode[]): void {
  // De-duplicate by instanceName: when a user gives the same `name` to
  // multiple elements (which is unusual but valid), only emit one accessor.
  // Otherwise the second `Object.defineProperty` call throws "Cannot redefine
  // property" at runtime, crashing the entire UI.
  const seen = new Set<string>()
  for (const node of namedNodes) {
    if (!node.instanceName || seen.has(node.instanceName)) continue
    seen.add(node.instanceName)
    emitNodeAccessor(ctx, node)
  }
}

function emitNodeAccessor(ctx: APIEmitterContext, node: IRNode): void {
  // configurable: true allows the property to be redefined safely (e.g. when
  // re-mounting the UI in the same root, or in tests that compile twice).
  ctx.emit(`Object.defineProperty(_root, '${node.instanceName}', {`)
  ctx.indentIn()
  ctx.emit(`get() { return _runtime.wrap(_elements['${node.instanceName}']) },`)
  ctx.emit('enumerable: true,')
  ctx.emit('configurable: true')
  ctx.indentOut()
  ctx.emit('})')
}

function emitStateManagement(ctx: APIEmitterContext): void {
  ctx.emit('')
  ctx.emit('// State management')
  emitSetState(ctx)
  emitGetState(ctx)
}

function emitSetState(ctx: APIEmitterContext): void {
  ctx.emit('_root.setState = function(key, value) {')
  ctx.indentIn()
  ctx.emit('_state[key] = value')
  // Also update __mirrorData so that $get() (used by conditionals, text
  // bindings, each loops, etc.) sees the new value. Without this, setState
  // only affects local _state but $-references still read the old data.
  ctx.emit('if (typeof __mirrorData !== "undefined") __mirrorData[key] = value')
  ctx.emit('this.update()')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

function emitGetState(ctx: APIEmitterContext): void {
  ctx.emit('_root.getState = function(key) {')
  ctx.indentIn()
  // Read from __mirrorData (the authoritative store) with _state fallback.
  ctx.emit(
    'return (typeof __mirrorData !== "undefined" && key in __mirrorData) ? __mirrorData[key] : _state[key]'
  )
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

function emitUpdateFunction(ctx: APIEmitterContext): void {
  ctx.emit('_root.update = function() {')
  ctx.indentIn()
  emitEachLoopRerender(ctx)
  emitConditionalRerender(ctx)
  ctx.indentOut()
  ctx.emit('}')
}

function emitEachLoopRerender(ctx: APIEmitterContext): void {
  ctx.emit('// Re-render each loops based on state changes')
  ctx.emit("for (const el of _root.querySelectorAll('[data-each-container]')) {")
  ctx.indentIn()
  ctx.emit('if (el._eachConfig) {')
  ctx.indentIn()
  ctx.emit('const { collection, renderItem, filterFn } = el._eachConfig')
  ctx.emit('const items = _state[collection] || []')
  ctx.emit('const filtered = filterFn ? items.filter(filterFn) : items')
  ctx.emit('el.innerHTML = ""')
  ctx.emit('filtered.forEach((item, index) => el.appendChild(renderItem(item, index)))')
  ctx.indentOut()
  ctx.emit('}')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

function emitConditionalRerender(ctx: APIEmitterContext): void {
  ctx.emit('// Re-render conditionals based on state changes')
  ctx.emit("for (const el of _root.querySelectorAll('[data-conditional-id]')) {")
  ctx.indentIn()
  ctx.emit('if (el._conditionalConfig) {')
  ctx.indentIn()
  ctx.emit('const { condition, renderThen, renderElse } = el._conditionalConfig')
  ctx.emit('el.innerHTML = ""')
  ctx.emit('if (condition()) {')
  ctx.indentIn()
  ctx.emit('el.appendChild(renderThen())')
  ctx.indentOut()
  ctx.emit('} else if (renderElse) {')
  ctx.indentIn()
  ctx.emit('el.appendChild(renderElse())')
  ctx.indentOut()
  ctx.emit('}')
  ctx.indentOut()
  ctx.emit('}')
  ctx.indentOut()
  ctx.emit('}')
}

function emitReturnRoot(ctx: APIEmitterContext): void {
  ctx.emit('')
  ctx.emit('return _root')
}

// ============================================
// INITIALIZATION EMISSION
// ============================================

/**
 * Emit initialization code when JavaScript block is present
 */
export function emitInitialization(
  ctx: APIEmitterContext,
  namedNodes: IRNode[],
  javascript?: JavaScriptBlock
): void {
  emitInitHeader(ctx)
  emitCreateUIInstance(ctx)
  emitNamedInstanceProxies(ctx, namedNodes)
  emitGlobalUpdateFunction(ctx)
  emitUserJavaScript(ctx, javascript)
  emitMountToBody(ctx)
}

function emitInitHeader(ctx: APIEmitterContext): void {
  ctx.emit('// ============================================')
  ctx.emit('// Auto-initialization (Mirror + JavaScript)')
  ctx.emit('// ============================================')
  ctx.emit('')
}

function emitCreateUIInstance(ctx: APIEmitterContext): void {
  ctx.emit('const _ui = createUI()')
  ctx.emit('')
}

function emitNamedInstanceProxies(ctx: APIEmitterContext, namedNodes: IRNode[]): void {
  if (namedNodes.length === 0) return

  ctx.emit('// Named instance proxies')
  for (const node of namedNodes) {
    ctx.emit(`const ${node.instanceName} = _ui.${node.instanceName}`)
  }
  ctx.emit('')
}

function emitGlobalUpdateFunction(ctx: APIEmitterContext): void {
  ctx.emit('// Global update function')
  ctx.emit('function update() { _ui.update() }')
  ctx.emit('')
}

function emitUserJavaScript(ctx: APIEmitterContext, javascript?: JavaScriptBlock): void {
  ctx.emit('// User JavaScript')
  if (javascript) {
    for (const line of javascript.code.split('\n')) {
      ctx.emitRaw(line)
    }
  }
  ctx.emit('')
}

function emitMountToBody(ctx: APIEmitterContext): void {
  ctx.emit('// Mount to document')
  ctx.emit('document.body.appendChild(_ui.root)')
}

// ============================================
// AUTO-MOUNT EMISSION
// ============================================

/**
 * Emit auto-mount code when no JavaScript block is present
 */
export function emitAutoMount(ctx: APIEmitterContext): void {
  ctx.emit('')
  ctx.emit('// ============================================')
  ctx.emit('// Auto-mount (no JavaScript block)')
  ctx.emit('// ============================================')
  ctx.emit('')
  ctx.emit('const _ui = createUI()')
  ctx.emit('document.body.appendChild(_ui.root)')
}
