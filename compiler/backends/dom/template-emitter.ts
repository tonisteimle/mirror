/**
 * Template Emitter Module
 *
 * Handles emission of template nodes inside loops (each) and conditionals (if).
 * These nodes are rendered dynamically at runtime.
 */

import type { IRNode, IRStyle, IRProperty, IREach, IREvent, IRAction } from '../../ir/types'

// ============================================
// TYPES
// ============================================

export interface TemplateEmitterContext {
  emit: (line: string) => void
  getIndent: () => number
  indentIn: () => void
  indentOut: () => void
  sanitizeVarName: (id: string) => string
  escapeString: (str: string | number | boolean | undefined | null) => string
  escapeTemplateString: (str: string) => string
  resolveConditionVariables: (condition: string) => string
  resolveLoopCondition: (condition: string, itemVar: string, indexVar: string) => string
  emitEachLoop: (each: IREach, parentVar: string) => void
  emitStateMachine: (varName: string, node: IRNode) => void
  emitEventListener: (varName: string, event: IREvent) => void
  emitTemplateEventListener: (varName: string, event: IREvent, itemVar: string) => void
  emitAction: (action: IRAction, currentVar: string) => void
}

// ============================================
// CONDITIONAL TEMPLATE NODE
// ============================================

/**
 * Emit a template node inside a conditional block
 */
export function emitConditionalTemplateNode(
  ctx: TemplateEmitterContext,
  node: IRNode,
  parentVar: string
): void {
  if (handleNestedConditional(ctx, node, parentVar)) return
  if (handleEachInConditional(ctx, node, parentVar)) return
  const varName = ctx.sanitizeVarName(node.id) + '_cond'
  emitConditionalElement(ctx, node, varName)
  emitConditionalProperties(ctx, node, varName)
  emitConditionalStyles(ctx, node, varName)
  emitIcon(ctx, node, varName)
  emitConditionalEvents(ctx, node, varName)
  emitConditionalChildren(ctx, node, varName)
  ctx.emit(`${parentVar}.appendChild(${varName})`)
}

function handleNestedConditional(
  ctx: TemplateEmitterContext,
  node: IRNode,
  parentVar: string
): boolean {
  if (!node.conditional) return false

  const nestedId = ctx.sanitizeVarName(node.conditional.id)
  const resolvedCondition = ctx.resolveConditionVariables(node.conditional.condition)

  ctx.emit(`// Nested conditional`)
  ctx.emit(`const ${nestedId}_nested = document.createElement('div')`)
  ctx.emit(`if (${resolvedCondition}) {`)
  ctx.indentIn()

  for (const child of node.conditional.then) {
    emitConditionalTemplateNode(ctx, child, `${nestedId}_nested`)
  }

  ctx.indentOut()

  if (node.conditional.else && node.conditional.else.length > 0) {
    ctx.emit(`} else {`)
    ctx.indentIn()
    for (const child of node.conditional.else) {
      emitConditionalTemplateNode(ctx, child, `${nestedId}_nested`)
    }
    ctx.indentOut()
  }

  ctx.emit(`}`)
  ctx.emit(`${parentVar}.appendChild(${nestedId}_nested)`)
  return true
}

function handleEachInConditional(
  ctx: TemplateEmitterContext,
  node: IRNode,
  parentVar: string
): boolean {
  if (!node.each) return false
  ctx.emitEachLoop(node.each, parentVar)
  return true
}

function emitConditionalElement(ctx: TemplateEmitterContext, node: IRNode, varName: string): void {
  ctx.emit(`const ${varName} = document.createElement('${node.tag}')`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }
}

function emitConditionalProperties(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string
): void {
  for (const prop of node.properties) {
    emitConditionalProperty(ctx, prop, varName)
  }
}

function emitConditionalProperty(
  ctx: TemplateEmitterContext,
  prop: IRProperty,
  varName: string
): void {
  if (prop.name === 'textContent') {
    const value = typeof prop.value === 'string' ? `"${ctx.escapeString(prop.value)}"` : prop.value
    ctx.emit(`${varName}.textContent = ${value}`)
  } else if (prop.name === 'disabled' || prop.name === 'hidden') {
    ctx.emit(`${varName}.${prop.name} = ${prop.value}`)
  } else {
    const value =
      typeof prop.value === 'string' ? `"${ctx.escapeString(String(prop.value))}"` : prop.value
    ctx.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
  }
}

function emitConditionalStyles(ctx: TemplateEmitterContext, node: IRNode, varName: string): void {
  const baseStyles = node.styles.filter(s => !s.state)
  if (baseStyles.length === 0) return
  ctx.emit(`Object.assign(${varName}.style, {`)
  ctx.indentIn()
  baseStyles.forEach(s => ctx.emit(`'${s.property}': '${s.value}',`))
  ctx.indentOut()
  ctx.emit('})')
}

function emitIcon(ctx: TemplateEmitterContext, node: IRNode, varName: string): void {
  if (node.primitive !== 'icon') return
  const iconProp = node.properties.find(p => p.name === 'textContent')
  if (!iconProp || typeof iconProp.value !== 'string') return
  const cfg = extractIconConfig(node)
  ctx.emit(`${varName}.dataset.iconSize = '${cfg.size}'`)
  ctx.emit(`${varName}.dataset.iconColor = '${cfg.color}'`)
  ctx.emit(`${varName}.dataset.iconWeight = '${cfg.weight}'`)
  ctx.emit(`_runtime.loadIcon(${varName}, '${iconProp.value}')`)
}

function extractIconConfig(node: IRNode): { size: string; color: string; weight: string } {
  const sizeProp = node.properties.find(p => p.name === 'data-icon-size')
  const colorProp = node.properties.find(p => p.name === 'data-icon-color')
  const weightProp = node.properties.find(p => p.name === 'data-icon-weight')

  return {
    size: String(
      sizeProp?.value || node.styles.find(s => s.property === 'fontSize')?.value || '16'
    ).replace('px', ''),
    color: String(
      colorProp?.value || node.styles.find(s => s.property === 'color')?.value || 'currentColor'
    ),
    weight: String(
      weightProp?.value || node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
    ),
  }
}

function emitConditionalEvents(ctx: TemplateEmitterContext, node: IRNode, varName: string): void {
  for (const event of node.events) {
    const allActionsAreStateMachine = event.actions.every(a => a.isBuiltinStateFunction)
    if (allActionsAreStateMachine && node.stateMachine) continue
    ctx.emitEventListener(varName, event)
  }
}

function emitConditionalChildren(ctx: TemplateEmitterContext, node: IRNode, varName: string): void {
  for (const child of node.children) {
    emitConditionalTemplateNode(ctx, child, varName)
  }
}

// ============================================
// EACH TEMPLATE NODE
// ============================================

/**
 * Emit a template node inside an each loop
 */
export function emitEachTemplateNode(
  ctx: TemplateEmitterContext,
  node: IRNode,
  parentVar: string,
  itemVar: string,
  indexVar: string = 'index'
): void {
  if (handleConditionalInLoop(ctx, node, parentVar, itemVar, indexVar)) return
  if (handleVisibleWhenInLoop(ctx, node, parentVar, itemVar, indexVar)) return

  emitEachTemplateNodeContent(ctx, node, parentVar, itemVar, indexVar)
}

function handleConditionalInLoop(
  ctx: TemplateEmitterContext,
  node: IRNode,
  parentVar: string,
  itemVar: string,
  indexVar: string
): boolean {
  if (!node.conditional) return false

  const cond = node.conditional
  const condId = ctx.sanitizeVarName(cond.id)
  const resolvedCondition = ctx.resolveLoopCondition(cond.condition, itemVar, indexVar)

  ctx.emit(`// Conditional in loop`)
  ctx.emit(`const ${condId}_container = document.createElement('div')`)
  ctx.emit(`${condId}_container.style.display = 'contents';`)
  ctx.emit(`if (${resolvedCondition}) {`)
  ctx.indentIn()

  for (const child of cond.then) {
    emitEachTemplateNode(ctx, child, `${condId}_container`, itemVar, indexVar)
  }

  ctx.indentOut()

  if (cond.else && cond.else.length > 0) {
    ctx.emit(`} else {`)
    ctx.indentIn()
    for (const child of cond.else) {
      emitEachTemplateNode(ctx, child, `${condId}_container`, itemVar, indexVar)
    }
    ctx.indentOut()
  }

  ctx.emit(`}`)
  ctx.emit(`${parentVar}.appendChild(${condId}_container)`)
  return true
}

function handleVisibleWhenInLoop(
  ctx: TemplateEmitterContext,
  node: IRNode,
  parentVar: string,
  itemVar: string,
  indexVar: string
): boolean {
  if (!node.visibleWhen) return false

  const conditionWithoutNot = node.visibleWhen.startsWith('!')
    ? node.visibleWhen.slice(1)
    : node.visibleWhen
  const firstPart = conditionWithoutNot.split('.')[0]

  if (firstPart !== itemVar && firstPart !== indexVar) return false

  const resolvedCondition = ctx.resolveLoopCondition(node.visibleWhen, itemVar, indexVar)
  ctx.emit(`if (${resolvedCondition}) {`)
  ctx.indentIn()

  const nodeWithoutVisibleWhen = { ...node, visibleWhen: undefined }
  emitEachTemplateNodeContent(ctx, nodeWithoutVisibleWhen, parentVar, itemVar, indexVar)

  ctx.indentOut()
  ctx.emit(`}`)
  return true
}

// ============================================
// EACH TEMPLATE NODE CONTENT
// ============================================

/**
 * Emit the actual content of an each template node
 */
export function emitEachTemplateNodeContent(
  ctx: TemplateEmitterContext,
  node: IRNode,
  parentVar: string,
  itemVar: string,
  indexVar: string = 'index'
): void {
  const varName = ctx.sanitizeVarName(node.id) + '_tpl'

  emitTemplateElement(ctx, node, varName, indexVar, itemVar)
  emitTemplateProperties(ctx, node, varName, itemVar, indexVar)
  emitTemplateStyles(ctx, node, varName, itemVar)
  emitIcon(ctx, node, varName)
  emitTemplateStateMachine(ctx, node, varName)
  emitTemplateEvents(ctx, node, varName, itemVar)
  emitTemplateEditable(ctx, node, varName, itemVar)
  emitTemplateNestedEach(ctx, node, varName, itemVar, indexVar)
  emitTemplateChildren(ctx, node, varName, itemVar, indexVar)

  ctx.emit(`${parentVar}.appendChild(${varName})`)
}

function emitTemplateElement(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string,
  indexVar: string,
  itemVar: string
): void {
  ctx.emit(`const ${varName} = document.createElement('${node.tag}')`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}[' + ${indexVar} + ']'`)
  ctx.emit(`${varName}._loopItem = ${itemVar}`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }
}

function emitTemplateProperties(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string,
  itemVar: string,
  indexVar: string
): void {
  for (const prop of node.properties) {
    emitTemplateProperty(ctx, prop, varName, itemVar, indexVar)
  }
}

function emitTemplateProperty(
  ctx: TemplateEmitterContext,
  prop: IRProperty,
  varName: string,
  itemVar: string,
  indexVar: string
): void {
  if (prop.name === 'textContent')
    ctx.emit(`${varName}.textContent = ${resolveTemplateValue(ctx, prop.value, itemVar, indexVar)}`)
  else if (prop.name === 'disabled' || prop.name === 'hidden')
    ctx.emit(`${varName}.${prop.name} = ${prop.value}`)
  else
    ctx.emit(
      `${varName}.setAttribute('${prop.name}', ${resolveTemplateValue(ctx, prop.value, itemVar, indexVar)})`
    )
}

function emitTemplateStyles(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string,
  itemVar: string
): void {
  const baseStyles = node.styles.filter(s => !s.state)
  if (baseStyles.length === 0) return
  ctx.emit(`Object.assign(${varName}.style, {`)
  ctx.indentIn()
  for (const style of baseStyles)
    ctx.emit(`'${style.property}': ${resolveTemplateStyleValue(ctx, style.value, itemVar)},`)
  ctx.indentOut()
  ctx.emit('})')
}

function emitTemplateStateMachine(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string
): void {
  if (node.stateMachine) {
    ctx.emitStateMachine(varName, node)
  }
}

function emitTemplateEvents(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string,
  itemVar: string
): void {
  for (const event of node.events) {
    ctx.emitTemplateEventListener(varName, event, itemVar)
  }
}

function emitTemplateEditable(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string,
  itemVar: string
): void {
  const editableProp = node.properties.find(p => p.name === 'data-editable' && p.value === true)
  if (!editableProp) return

  const textContentProp = node.properties.find(p => p.name === 'textContent')
  if (!textContentProp || typeof textContentProp.value !== 'string') return

  const fieldMatch = textContentProp.value.match(/__loopVar:([^,\s]+)/)
  if (!fieldMatch) return

  const fullPath = fieldMatch[1]
  const parts = fullPath.split('.')
  if (parts.length >= 2) {
    const field = parts.slice(1).join('.')
    ctx.emit(`_runtime.setupEditable(${varName}, ${itemVar}, '${field}')`)
  }
}

function emitTemplateNestedEach(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string,
  itemVar: string,
  indexVar: string
): void {
  if (node.each) {
    emitNestedEachLoop(ctx, node.each, varName, itemVar, indexVar)
  }
}

function emitTemplateChildren(
  ctx: TemplateEmitterContext,
  node: IRNode,
  varName: string,
  itemVar: string,
  indexVar: string
): void {
  for (const child of node.children) {
    emitEachTemplateNode(ctx, child, varName, itemVar, indexVar)
  }
}

// ============================================
// NESTED EACH LOOP
// ============================================

/**
 * Emit a nested each loop inside a template
 */
export function emitNestedEachLoop(
  ctx: TemplateEmitterContext,
  each: IREach,
  parentVar: string,
  outerItemVar: string,
  outerIndexVar: string
): void {
  const containerId = ctx.sanitizeVarName(each.id)
  const innerItemVar = extractVarName(each.itemVar)
  const innerIndexVar = each.indexVar ? extractVarName(each.indexVar) : 'index'
  const rawCollection = extractVarName(each.collection)

  emitNestedEachContainer(ctx, containerId, each.id)
  const collectionExpr = buildCollectionExpression(rawCollection, outerItemVar)

  ctx.emit(`(${collectionExpr} || []).forEach((${innerItemVar}, ${innerIndexVar}) => {`)
  ctx.indentIn()

  emitNestedItemContainer(ctx, innerIndexVar)

  for (const templateNode of each.template) {
    emitEachTemplateNode(ctx, templateNode, 'itemContainer', innerItemVar, innerIndexVar)
  }

  ctx.emit(`${containerId}_container.appendChild(itemContainer)`)
  ctx.indentOut()
  ctx.emit('})')

  ctx.emit(`${parentVar}.appendChild(${containerId}_container)`)
}

function extractVarName(name: string): string {
  return name.startsWith('$') ? name.slice(1) : name
}

function emitNestedEachContainer(
  ctx: TemplateEmitterContext,
  containerId: string,
  eachId: string
): void {
  ctx.emit(`// Nested each loop`)
  ctx.emit(`const ${containerId}_container = document.createElement('div')`)
  ctx.emit(`${containerId}_container.dataset.eachContainer = '${eachId}'`)
  ctx.emit(`${containerId}_container.style.display = 'contents';`)
}

function buildCollectionExpression(rawCollection: string, outerItemVar: string): string {
  if (rawCollection.startsWith('[')) {
    return rawCollection
  }

  const firstPart = rawCollection.split('.')[0]
  if (firstPart === outerItemVar) {
    return rawCollection
  }

  return `$get('${rawCollection}') || []`
}

function emitNestedItemContainer(ctx: TemplateEmitterContext, innerIndexVar: string): void {
  ctx.emit(`const itemContainer = document.createElement('div')`)
  ctx.emit(`itemContainer.dataset.eachItem = ${innerIndexVar}`)
  ctx.emit(`itemContainer.style.display = 'contents';`)
}

// ============================================
// VALUE RESOLUTION
// ============================================

/**
 * Resolve a template value (handles loop variables, $$ escapes, etc.)
 */
export function resolveTemplateValue(
  ctx: TemplateEmitterContext,
  value: string | number | boolean,
  itemVar: string,
  indexVar: string = 'index'
): string {
  if (typeof value !== 'string') {
    return String(value)
  }

  if (value.includes('__loopVar:')) {
    return resolveLoopVarValue(value)
  }

  if (value.includes(`$$${itemVar}.`)) {
    return resolveDollarDollarValue(ctx, value, itemVar)
  }

  if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`)) {
    return value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
  }

  if (value === `$${itemVar}`) {
    return itemVar
  }

  if (value === `$${indexVar}`) {
    return indexVar
  }

  return `"${ctx.escapeString(String(value))}"`
}

function resolveLoopVarValue(value: string): string {
  let resolved = value.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
  resolved = resolved.replace(
    /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
    '$get("$1")'
  )
  return resolved
}

function resolveDollarDollarValue(
  ctx: TemplateEmitterContext,
  value: string,
  itemVar: string
): string {
  const exactMatch = value.match(new RegExp(`^\\$\\$${itemVar}\\.([a-zA-Z_][a-zA-Z0-9_.]*)$`))
  if (exactMatch) return `"$" + ${itemVar}.${exactMatch[1]}`
  const resolved = value.replace(
    new RegExp(`\\$\\$${itemVar}\\.([a-zA-Z_][a-zA-Z0-9_.]*)`, 'g'),
    `\$\${${itemVar}.$1}`
  )
  return `\`${ctx.escapeTemplateString(resolved)}\``
}

/**
 * Resolve a template style value
 */
export function resolveTemplateStyleValue(
  ctx: TemplateEmitterContext,
  value: string,
  itemVar: string
): string {
  if (value.includes('__conditional:')) return resolveConditionalExpression(ctx, value, itemVar)
  if (value.includes('__loopVar:')) {
    const r = value.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
    return r.includes(' ') ? `(${r})` : r
  }
  if (value === `$${itemVar}`) return itemVar
  if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`)) {
    return value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
  }
  return `'${value}'`
}

// ============================================
// CONDITIONAL EXPRESSION RESOLUTION
// ============================================

/**
 * Resolve __conditional: markers into JavaScript ternary expressions
 */
export function resolveConditionalExpression(
  ctx: TemplateEmitterContext,
  value: string,
  itemVar: string
): string {
  return parseConditional(ctx, value, itemVar)
}

function parseConditional(ctx: TemplateEmitterContext, str: string, itemVar: string): string {
  if (!str.startsWith('__conditional:')) {
    return resolveConditionalValue(ctx, str, itemVar)
  }

  const content = str.slice('__conditional:'.length)
  const questionPos = findQuestionMark(content)

  if (questionPos === -1) {
    return resolveConditionalValue(ctx, content, itemVar)
  }

  const condition = content.slice(0, questionPos)
  const rest = content.slice(questionPos + 1)
  const colonPos = findColon(rest)

  const thenValue = rest.slice(0, colonPos)
  const elseValue = rest.slice(colonPos + 1)

  const resolvedCondition = resolveLoopVarMarkers(condition)
  const resolvedThen = parseConditional(ctx, thenValue, itemVar)
  const resolvedElse = parseConditional(ctx, elseValue, itemVar)

  return `(${resolvedCondition} ? ${resolvedThen} : ${resolvedElse})`
}

function findQuestionMark(content: string): number {
  let depth = 0
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === '?' && depth === 0 && !content.slice(i - 1, i + 1).match(/[=!<>]=?\?/)) {
      return i
    }
  }
  return -1
}

function findColon(rest: string): number {
  let depth = 0
  let inConditional = false

  for (let i = 0; i < rest.length; i++) {
    const char = rest[i]
    if (rest.slice(i).startsWith('__conditional:')) {
      inConditional = true
    }
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ':' && depth === 0 && !inConditional) {
      return i
    }
    if (char === '?' && inConditional) {
      inConditional = false
    }
  }

  return rest.indexOf(':')
}

function resolveConditionalValue(
  ctx: TemplateEmitterContext,
  value: string,
  itemVar: string
): string {
  if (value.includes('__loopVar:')) {
    return resolveLoopVarMarkers(value)
  }

  if (value.includes(`$${itemVar}.`)) {
    return value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
  }

  if (value.startsWith('#')) {
    return `"${value}"`
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value
  }

  return `"${value}"`
}

function resolveLoopVarMarkers(str: string): string {
  return str.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
}

// ============================================
// TEMPLATE ACTION
// ============================================

/**
 * Emit a template action (used in loop context)
 */
export function emitTemplateAction(
  ctx: TemplateEmitterContext,
  action: IRAction,
  currentVar: string,
  itemVar: string
): void {
  const target = action.target || 'self'

  switch (action.type) {
    case 'toggle':
      ctx.emit(`_runtime.toggle(_elements['${target}'] || ${currentVar})`)
      break
    case 'select':
      ctx.emit(`_runtime.select(${currentVar})`)
      break
    case 'exclusive':
      ctx.emit(`_runtime.exclusive(${currentVar})`)
      break
    case 'assign':
      emitAssignAction(ctx, action, target, itemVar)
      break
    default:
      ctx.emitAction(action, currentVar)
  }
}

function emitAssignAction(
  ctx: TemplateEmitterContext,
  action: IRAction,
  target: string,
  itemVar: string
): void {
  if (!action.args || action.args[0] !== `$${itemVar}`) return

  const stateVar = target.startsWith('$') ? target.slice(1) : target
  ctx.emit(`_state['${stateVar}'] = ${itemVar}`)
  ctx.emit(`api.update()`)
}
