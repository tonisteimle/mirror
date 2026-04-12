/**
 * Loop Emitter
 *
 * Extracted from DOMGenerator for better maintainability.
 * Handles generation of loop and conditional code for Mirror components.
 *
 * - emitEachLoop: Generates code for `each item in collection` loops
 * - emitConditional: Generates code for `if/else` conditionals
 */

import type { IRNode, IREach, IRConditional } from '../../ir/types'
import type { LoopEmitterContext } from './base-emitter-context'

// Re-export for backwards compatibility
export type { LoopEmitterContext } from './base-emitter-context'

// =============================================================================
// Each Loop Emitter
// =============================================================================

/**
 * Emit an each loop for iterating over collections
 *
 * Generates:
 * - Container element with display: contents
 * - _eachConfig with renderItem factory function
 * - Initial render with data binding
 * - Support for filter and orderBy
 */
export function emitEachLoop(
  ctx: LoopEmitterContext,
  each: IREach,
  parentVar: string
): void {
  const containerId = ctx.sanitizeVarName(each.id)
  // Strip $ prefix for valid JavaScript variable names
  const itemVar = each.itemVar.startsWith('$') ? each.itemVar.slice(1) : each.itemVar
  const indexVar = each.indexVar ? (each.indexVar.startsWith('$') ? each.indexVar.slice(1) : each.indexVar) : 'index'
  const rawCollection = each.collection.startsWith('$') ? each.collection.slice(1) : each.collection

  // Check if collection is an inline array literal
  const isInlineArray = rawCollection.startsWith('[')
  // Sanitize collection name for valid JS variable (replace dots with underscores)
  const collectionVarName = isInlineArray ? `${containerId}_inlineData` : rawCollection.replace(/\./g, '_')

  ctx.emit(`// Each loop: ${itemVar}${each.indexVar ? ', ' + indexVar : ''} in ${isInlineArray ? '[...]' : rawCollection}`)
  ctx.emit(`const ${containerId}_container = document.createElement('div')`)
  ctx.emit(`${containerId}_container.dataset.eachContainer = '${each.id}'`)
  ctx.emit(`${containerId}_container.style.display = 'contents';`)

  // Check if any template node has bind - set data-bind on container so runtime can find it
  const bindNode = each.template.find(node => node.bind)
  if (bindNode) {
    const bindVar = bindNode.bind!.startsWith('$') ? bindNode.bind!.slice(1) : bindNode.bind!
    ctx.emit(`${containerId}_container.dataset.bind = '${bindVar}'`)
  }
  ctx.emit('')

  // Store template factory for runtime updates
  ctx.emit(`_elements['${each.id}'] = ${containerId}_container`)
  ctx.emit(`${containerId}_container._eachConfig = {`)
  ctx.indentIn()
  ctx.emit(`itemVar: '${itemVar}',`)
  ctx.emit(`collection: ${isInlineArray ? rawCollection : `'${rawCollection}'`},`)
  if (each.filter) {
    // Store as function to avoid eval() at runtime
    ctx.emit(`filterFn: (${itemVar}) => ${each.filter},`)
  }
  if (each.orderBy) {
    ctx.emit(`orderBy: ${JSON.stringify(each.orderBy)},`)
    ctx.emit(`orderDesc: ${each.orderDesc ? 'true' : 'false'},`)
  }
  ctx.emit(`renderItem: (${itemVar}, ${indexVar}) => {`)
  ctx.indentIn()

  // Create a container for each item (display: contents makes it layout-transparent)
  ctx.emit(`const itemContainer = document.createElement('div')`)
  ctx.emit(`itemContainer.dataset.eachItem = ${indexVar}`)
  ctx.emit(`itemContainer.style.display = 'contents';`)

  // Render template nodes
  for (const templateNode of each.template) {
    ctx.emitEachTemplateNode(templateNode, 'itemContainer', itemVar, indexVar)
  }

  ctx.emit(`return itemContainer`)
  ctx.indentOut()
  ctx.emit('},')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')

  // Initial render with data
  ctx.emit(`// Initial render`)
  if (isInlineArray) {
    // Inline array: use the literal directly
    ctx.emit(`const ${collectionVarName} = ${rawCollection}`)
  } else {
    // Named collection: use $get() for __mirrorData/globalThis lookup
    // Convert objects to arrays using Object.entries() for entry-format data
    // - For simple lists (key === value): returns the value directly
    // - For objects: injects _key so the entry name is accessible
    ctx.emit(`const ${collectionVarName}Data = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('${rawCollection}'))`)
  }

  let processedVarName = isInlineArray ? collectionVarName : `${collectionVarName}Data`

  // Apply filter if present
  if (each.filter) {
    ctx.emit(`let ${collectionVarName}Filtered = ${processedVarName}.filter(${itemVar} => ${each.filter})`)
    processedVarName = `${collectionVarName}Filtered`
  }

  // Apply sorting if present
  if (each.orderBy) {
    const sortedVarName = `${collectionVarName}Sorted`
    const sortDir = each.orderDesc ? -1 : 1
    ctx.emit(`const ${sortedVarName} = [...${processedVarName}].sort((a, b) => {`)
    ctx.indentIn()
    ctx.emit(`const aVal = a.${each.orderBy}`)
    ctx.emit(`const bVal = b.${each.orderBy}`)
    ctx.emit(`if (aVal < bVal) return ${-sortDir}`)
    ctx.emit(`if (aVal > bVal) return ${sortDir}`)
    ctx.emit(`return 0`)
    ctx.indentOut()
    ctx.emit(`})`)
    processedVarName = sortedVarName
  }

  ctx.emit(`${processedVarName}.forEach((${itemVar}, ${indexVar}) => {`)
  ctx.indentIn()
  ctx.emit(`${containerId}_container.appendChild(${containerId}_container._eachConfig.renderItem(${itemVar}, ${indexVar}))`)
  ctx.indentOut()
  ctx.emit('})')
  ctx.emit('')

  ctx.emit(`${parentVar}.appendChild(${containerId}_container)`)
  ctx.emit('')
}

// =============================================================================
// Conditional Emitter
// =============================================================================

/**
 * Emit a conditional (if/else) block
 *
 * Generates:
 * - Container element with display: contents
 * - _conditionalConfig with renderThen/renderElse factories
 * - Initial render based on condition evaluation
 */
export function emitConditional(
  ctx: LoopEmitterContext,
  cond: IRConditional,
  parentVar: string
): void {
  const containerId = ctx.sanitizeVarName(cond.id)
  // Transform variable references in condition to $get() calls
  const resolvedCondition = ctx.resolveConditionVariables(cond.condition)

  ctx.emit(`// Conditional`)
  ctx.emit(`const ${containerId}_container = document.createElement('div')`)
  ctx.emit(`${containerId}_container.dataset.conditionalId = '${cond.id}'`)
  ctx.emit(`${containerId}_container.style.display = 'contents';`)
  ctx.emit(`_elements['${cond.id}'] = ${containerId}_container`)
  ctx.emit('')

  // Store conditional config for reactive updates
  ctx.emit(`${containerId}_container._conditionalConfig = {`)
  ctx.indentIn()
  ctx.emit(`condition: () => ${resolvedCondition},`)
  ctx.emit(`renderThen: () => {`)
  ctx.indentIn()
  ctx.emit(`const fragment = document.createDocumentFragment()`)
  for (const node of cond.then) {
    ctx.emitConditionalTemplateNode(node, 'fragment')
  }
  ctx.emit(`return fragment`)
  ctx.indentOut()
  ctx.emit(`},`)
  if (cond.else && cond.else.length > 0) {
    ctx.emit(`renderElse: () => {`)
    ctx.indentIn()
    ctx.emit(`const fragment = document.createDocumentFragment()`)
    for (const node of cond.else) {
      ctx.emitConditionalTemplateNode(node, 'fragment')
    }
    ctx.emit(`return fragment`)
    ctx.indentOut()
    ctx.emit(`},`)
  }
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Initial render based on condition
  ctx.emit(`// Initial conditional render`)
  ctx.emit(`if (${resolvedCondition}) {`)
  ctx.indentIn()
  ctx.emit(`${containerId}_container.appendChild(${containerId}_container._conditionalConfig.renderThen())`)
  ctx.indentOut()
  if (cond.else && cond.else.length > 0) {
    ctx.emit(`} else {`)
    ctx.indentIn()
    ctx.emit(`${containerId}_container.appendChild(${containerId}_container._conditionalConfig.renderElse())`)
    ctx.indentOut()
  }
  ctx.emit(`}`)
  ctx.emit('')

  ctx.emit(`${parentVar}.appendChild(${containerId}_container)`)
  ctx.emit('')
}
