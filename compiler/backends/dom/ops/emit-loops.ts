/**
 * DOMGenerator ops — emit-loops
 *
 * Extracted from compiler/backends/dom.ts. Functions take `this: DOMGenerator`
 * and are bound on the class via class-field assignment.
 */

import type { IRNode, IREach, IRConditional } from '../../../ir/types'
import {
  emitEachLoop as emitEachLoopExtracted,
  emitConditional as emitConditionalExtracted,
} from '../../dom/loop-emitter'
import type { DOMGenerator } from '../../dom'

export function emitEachLoop(this: DOMGenerator, each: IREach, parentVar: string): void {
  const ctx = this.createLoopEmitterContext()
  emitEachLoopExtracted(ctx, each, parentVar)
}

export function emitConditional(this: DOMGenerator, cond: IRConditional, parentVar: string): void {
  const ctx = this.createLoopEmitterContext()
  emitConditionalExtracted(ctx, cond, parentVar)
}

export function emitConditionalTemplateNode(
  this: DOMGenerator,
  node: IRNode,
  parentVar: string
): void {
  // Handle nested conditionals
  if (node.conditional) {
    const nestedId = this.sanitizeVarName(node.conditional.id)
    const resolvedCondition = this.resolveConditionVariables(node.conditional.condition)
    this.emit(`// Nested conditional`)
    this.emit(`const ${nestedId}_nested = document.createElement('div')`)
    this.emit(`if (${resolvedCondition}) {`)
    this.indent++
    for (const child of node.conditional.then) {
      this.emitConditionalTemplateNode(child, `${nestedId}_nested`)
    }
    this.indent--
    if (node.conditional.else && node.conditional.else.length > 0) {
      this.emit(`} else {`)
      this.indent++
      for (const child of node.conditional.else) {
        this.emitConditionalTemplateNode(child, `${nestedId}_nested`)
      }
      this.indent--
    }
    this.emit(`}`)
    this.emit(`${parentVar}.appendChild(${nestedId}_nested)`)
    return
  }

  // Handle each loops inside conditionals
  if (node.each) {
    this.emitEachLoop(node.each, parentVar)
    return
  }

  const varName = this.sanitizeVarName(node.id) + '_cond'

  this.emit(`const ${varName} = document.createElement('${node.tag}')`)
  this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  if (node.name) {
    this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Set HTML properties
  for (const prop of node.properties) {
    if (prop.name === 'textContent') {
      const propValue = String(prop.value)
      // Handle conditional text content: __conditional:condition?thenValue:elseValue
      if (propValue.includes('__conditional:')) {
        const resolved = this.parseTopLevelConditional(propValue)
        this.emit(`${varName}.textContent = ${resolved}`)
      } else {
        // Use resolveContentValue to interpolate $variables
        // (e.g. "$count Punkte" → `${$get("count")} Punkte`)
        const value = this.resolveContentValue(prop.value)
        this.emit(`${varName}.textContent = ${value}`)
      }
    } else if (prop.name === 'disabled' || prop.name === 'hidden') {
      this.emit(`${varName}.${prop.name} = ${prop.value}`)
    } else {
      const value =
        typeof prop.value === 'string' ? `"${this.escapeString(String(prop.value))}"` : prop.value
      this.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
    }
  }

  // Apply base styles
  const baseStyles = node.styles.filter(s => !s.state)
  if (baseStyles.length > 0) {
    // Separate static and conditional styles
    const staticStyles: Array<{ property: string; value: string }> = []
    const conditionalStyles: Array<{ property: string; code: string }> = []

    for (const style of baseStyles) {
      const resolved = this.resolveStyleValueForTopLevel(String(style.value))
      if (resolved.needsEval) {
        conditionalStyles.push({ property: style.property, code: resolved.code })
      } else {
        staticStyles.push({ property: style.property, value: String(style.value) })
      }
    }

    // Emit static styles with Object.assign
    if (staticStyles.length > 0) {
      this.emit(`Object.assign(${varName}.style, {`)
      this.indent++
      for (const style of staticStyles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Emit conditional styles as separate assignments
    for (const cond of conditionalStyles) {
      this.emit(`${varName}.style['${cond.property}'] = ${cond.code}`)
    }
  }

  // Handle icon loading (special case for Icon primitive)
  if (node.primitive === 'icon') {
    const iconProp = node.properties.find(p => p.name === 'textContent')
    if (iconProp && typeof iconProp.value === 'string') {
      const iconName = iconProp.value
      // Icon properties are stored as data-icon-* attributes in IR
      const iconSizeProp = node.properties.find(p => p.name === 'data-icon-size')
      const iconColorProp = node.properties.find(p => p.name === 'data-icon-color')
      const iconWeightProp = node.properties.find(p => p.name === 'data-icon-weight')
      const iconSize =
        iconSizeProp?.value || node.styles.find(s => s.property === 'fontSize')?.value || '16'
      const iconColor =
        iconColorProp?.value ||
        node.styles.find(s => s.property === 'color')?.value ||
        'currentColor'
      const iconWeight =
        iconWeightProp?.value || node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
      this.emit(`${varName}.dataset.iconSize = '${String(iconSize).replace('px', '')}'`)
      this.emit(`${varName}.dataset.iconColor = '${iconColor}'`)
      this.emit(`${varName}.dataset.iconWeight = '${iconWeight}'`)
      this.emit(`_runtime.loadIcon(${varName}, '${iconName}')`)
    }
  }

  // Add event listeners
  for (const event of node.events) {
    // Skip events that are fully handled by state machine transitions
    const allActionsAreStateMachine = event.actions.every(a => a.isBuiltinStateFunction)
    if (allActionsAreStateMachine && node.stateMachine) {
      continue // State machine will handle this event via transitions
    }
    this.emitEventListener(varName, event)
  }

  // Recursively emit children
  for (const child of node.children) {
    this.emitConditionalTemplateNode(child, varName)
  }

  this.emit(`${parentVar}.appendChild(${varName})`)
}

export function emitEachTemplateNode(
  this: DOMGenerator,
  node: IRNode,
  parentVar: string,
  itemVar: string,
  indexVar: string = 'index'
): void {
  // Handle conditionals inside loops - use loop variables directly
  if (node.conditional) {
    const cond = node.conditional
    const condId = this.sanitizeVarName(cond.id)
    // Resolve condition for loop context: loop variables stay as-is (local JS vars),
    // only $-prefixed data variables get wrapped in $get()
    const resolvedCondition = this.resolveLoopCondition(cond.condition, itemVar, indexVar)

    this.emit(`// Conditional in loop`)
    this.emit(`const ${condId}_container = document.createElement('div')`)
    this.emit(`${condId}_container.style.display = 'contents';`)
    this.emit(`if (${resolvedCondition}) {`)
    this.indent++
    for (const child of cond.then) {
      this.emitEachTemplateNode(child, `${condId}_container`, itemVar, indexVar)
    }
    this.indent--
    if (cond.else && cond.else.length > 0) {
      this.emit(`} else {`)
      this.indent++
      for (const child of cond.else) {
        this.emitEachTemplateNode(child, `${condId}_container`, itemVar, indexVar)
      }
      this.indent--
    }
    this.emit(`}`)
    this.emit(`${parentVar}.appendChild(${condId}_container)`)
    return
  }

  // Handle visibleWhen inside loops - use inline if statement with loop variables
  // When a node has visibleWhen referencing a loop variable (e.g., "entry.billable" or "!entry.billable"),
  // wrap the node creation in an if statement instead of using _visibleWhen runtime binding
  if (node.visibleWhen) {
    // Bug #28 fix: an else-branch from `if/else` becomes
    // `visibleWhen: "!(task.done)"` (with parens). Strip both leading `!`
    // and any wrapping parentheses before deriving the first identifier
    // path — otherwise firstPart was `(task` and didn't match itemVar.
    const conditionWithoutNot = node.visibleWhen.replace(/^!\(?/, '').replace(/\)$/, '')
    const firstPart = conditionWithoutNot.split('.')[0].trim()
    if (firstPart === itemVar || firstPart === indexVar) {
      // Loop variable reference - emit inline if statement
      const resolvedCondition = this.resolveLoopCondition(node.visibleWhen, itemVar, indexVar)
      this.emit(`if (${resolvedCondition}) {`)
      this.indent++
      // Create a copy of the node without visibleWhen to avoid infinite recursion
      const nodeWithoutVisibleWhen = { ...node, visibleWhen: undefined }
      this.emitEachTemplateNodeContent(nodeWithoutVisibleWhen, parentVar, itemVar, indexVar)
      this.indent--
      this.emit(`}`)
      return
    }
    // If visibleWhen doesn't reference loop variable, fall through to normal handling
    // The _visibleWhen runtime binding will handle it
  }

  this.emitEachTemplateNodeContent(node, parentVar, itemVar, indexVar)
}

/**
 * Emit the actual content of an each template node.
 * Separated from emitEachTemplateNode to allow conditional wrapping.
 */
export function emitEachTemplateNodeContent(
  this: DOMGenerator,
  node: IRNode,
  parentVar: string,
  itemVar: string,
  indexVar: string = 'index'
): void {
  const varName = this.sanitizeVarName(node.id) + '_tpl'

  this.emit(`const ${varName} = document.createElement('${node.tag}')`)
  // Index appended for uniqueness: node-5[0], node-5[1], etc.
  this.emit(`${varName}.dataset.mirrorId = '${node.id}[' + ${indexVar} + ']'`)
  // Store the loop item on the element for bind/exclusive() to access
  this.emit(`${varName}._loopItem = ${itemVar}`)
  if (node.name) {
    this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Bug #30 fix: per-item bind on loop-template nodes (e.g.
  // `Input bind item.value`). The container-level bind is handled in
  // loop-emitter.ts; here we emit the per-item bind on the actual element.
  if (node.bind) {
    const bindVar = node.bind.startsWith('$') ? node.bind.slice(1) : node.bind
    const firstPart = bindVar.split('.')[0]
    if (firstPart === itemVar) {
      // Per-item bind: data-bind keeps the loop-var path so the runtime
      // can mutate the loop-item property; initial value comes from
      // the item itself.
      this.emit(`${varName}.dataset.bind = '${bindVar}'`)
      // For input-like elements set the initial value
      if (node.tag === 'input' || node.tag === 'textarea') {
        this.emit(`${varName}.value = ${bindVar}`)
      }
    }
  }

  // Set HTML properties (with data binding)
  for (const prop of node.properties) {
    if (prop.name === 'textContent') {
      const value = this.resolveTemplateValue(prop.value, itemVar, indexVar)
      this.emit(`${varName}.textContent = ${value}`)
    } else if (prop.name === 'disabled' || prop.name === 'hidden') {
      this.emit(`${varName}.${prop.name} = ${prop.value}`)
    } else {
      const value = this.resolveTemplateValue(prop.value, itemVar, indexVar)
      this.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
    }
  }

  // Apply base styles
  const baseStyles = node.styles.filter(s => !s.state)
  if (baseStyles.length > 0) {
    this.emit(`Object.assign(${varName}.style, {`)
    this.indent++
    for (const style of baseStyles) {
      const value = this.resolveTemplateStyleValue(style.value, itemVar)
      this.emit(`'${style.property}': ${value},`)
    }
    this.indent--
    this.emit('})')
  }

  // Handle icon loading (special case for Icon primitive)
  if (node.primitive === 'icon') {
    const iconProp = node.properties.find(p => p.name === 'textContent')
    if (iconProp && typeof iconProp.value === 'string') {
      const iconName = iconProp.value
      // Icon properties are stored as data-icon-* attributes in IR
      const iconSizeProp = node.properties.find(p => p.name === 'data-icon-size')
      const iconColorProp = node.properties.find(p => p.name === 'data-icon-color')
      const iconWeightProp = node.properties.find(p => p.name === 'data-icon-weight')
      const iconSize =
        iconSizeProp?.value || node.styles.find(s => s.property === 'fontSize')?.value || '16'
      const iconColor =
        iconColorProp?.value ||
        node.styles.find(s => s.property === 'color')?.value ||
        'currentColor'
      const iconWeight =
        iconWeightProp?.value || node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
      this.emit(`${varName}.dataset.iconSize = '${String(iconSize).replace('px', '')}'`)
      this.emit(`${varName}.dataset.iconColor = '${iconColor}'`)
      this.emit(`${varName}.dataset.iconWeight = '${iconWeight}'`)
      this.emit(`_runtime.loadIcon(${varName}, '${iconName}')`)
    }
  }

  // Setup state machine for template nodes (required for toggle, exclusive, etc.)
  if (node.stateMachine) {
    this.emitStateMachine(varName, node)
  }

  // Add event listeners
  for (const event of node.events) {
    this.emitTemplateEventListener(varName, event, itemVar)
  }

  // Handle editable property - generates setupEditable call for in-place editing
  const editableProp = node.properties.find(p => p.name === 'data-editable' && p.value === true)
  if (editableProp) {
    // Find the field being edited from textContent (e.g., "todo.text" → "text")
    const textContentProp = node.properties.find(p => p.name === 'textContent')
    if (textContentProp && typeof textContentProp.value === 'string') {
      const fieldMatch = textContentProp.value.match(/__loopVar:([^,\s]+)/)
      if (fieldMatch) {
        const fullPath = fieldMatch[1]
        // Extract field name from itemVar.field (e.g., "todo.text" → "text")
        const parts = fullPath.split('.')
        if (parts.length >= 2) {
          const field = parts.slice(1).join('.')
          this.emit(`_runtime.setupEditable(${varName}, ${itemVar}, '${field}')`)
        }
      }
    }
  }

  // Handle nested each loop if present
  if (node.each) {
    this.emitNestedEachLoop(node.each, varName, itemVar, indexVar)
  }

  // Recursively emit children
  for (const child of node.children) {
    this.emitEachTemplateNode(child, varName, itemVar, indexVar)
  }

  this.emit(`${parentVar}.appendChild(${varName})`)
}

/**
 * Emit a nested each loop inside a template (for nested loops like `each item in category.items`)
 */
export function emitNestedEachLoop(
  this: DOMGenerator,
  each: IREach,
  parentVar: string,
  outerItemVar: string,
  outerIndexVar: string
): void {
  const containerId = this.sanitizeVarName(each.id)
  const innerItemVar = each.itemVar.startsWith('$') ? each.itemVar.slice(1) : each.itemVar
  const innerIndexVar = each.indexVar
    ? each.indexVar.startsWith('$')
      ? each.indexVar.slice(1)
      : each.indexVar
    : 'index'
  const rawCollection = each.collection.startsWith('$') ? each.collection.slice(1) : each.collection

  this.emit(`// Nested each loop: ${innerItemVar} in ${rawCollection}`)
  this.emit(`const ${containerId}_container = document.createElement('div')`)
  this.emit(`${containerId}_container.dataset.eachContainer = '${each.id}'`)
  this.emit(`${containerId}_container.style.display = 'contents';`)

  // For nested loops, the collection references an outer loop variable directly
  // e.g., category.items where category is the outer loop variable
  const isInlineArray = rawCollection.startsWith('[')

  // Determine the collection expression
  let collectionExpr: string
  if (isInlineArray) {
    collectionExpr = rawCollection
  } else {
    // Check if collection references the outer loop variable (e.g., category.items)
    const firstPart = rawCollection.split('.')[0]
    if (firstPart === outerItemVar) {
      // Direct reference to outer loop variable's property
      collectionExpr = rawCollection
    } else {
      // Use $get for global data
      collectionExpr = `$get('${rawCollection}') || []`
    }
  }

  // Object→Array conversion: Object collections (e.g., `users:\n  max:\n    ...`)
  // must be normalized to arrays before .forEach. Without this, nested-each
  // crashes on `forEach is not a function` for object-shaped collections.
  this.emit(
    `((d => Array.isArray(d) ? d : (d && typeof d === 'object' ? Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v) : []))(${collectionExpr})).forEach((${innerItemVar}, ${innerIndexVar}) => {`
  )
  this.indent++

  // Create container for each item (display: contents makes it layout-transparent)
  this.emit(`const itemContainer = document.createElement('div')`)
  this.emit(`itemContainer.dataset.eachItem = ${innerIndexVar}`)
  this.emit(`itemContainer.style.display = 'contents';`)

  // Render template nodes
  for (const templateNode of each.template) {
    this.emitEachTemplateNode(templateNode, 'itemContainer', innerItemVar, innerIndexVar)
  }

  this.emit(`${containerId}_container.appendChild(itemContainer)`)
  this.indent--
  this.emit('})')

  this.emit(`${parentVar}.appendChild(${containerId}_container)`)
}
