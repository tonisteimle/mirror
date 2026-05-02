/**
 * Mirror DOM Backend
 *
 * Generates pure JavaScript DOM manipulation code.
 * Flagship backend - no framework dependencies.
 */

import type { AST, JavaScriptBlock, TokenDefinition } from '../parser/ast'
import { toIR } from '../ir'
import type { IR, IRNode, IRStateMachine, IRStateTransition } from '../ir/types'
import { isIRZagNode } from '../ir/types'
import type { DataFile } from '../parser/data-types'
import type { ZagEmitterContext } from './dom/base-emitter-context'

// Extracted utilities
import { cssPropertyToJS } from './dom/utils'
import { ZAG_SLOT_NAMES, type GenerateDOMOptions } from './dom/types'
import type { EmitterContext, DeferredWhenWatcher } from './dom/base-emitter-context'
import type { StateMachineEmitterContext } from './dom/state-machine-emitter'
import type { LoopEmitterContext } from './dom/loop-emitter'
import type { EventEmitterContext } from './dom/event-emitter'
import type { TokenEmitterContext } from './dom/token-emitter'

// New extracted modules
import type { AnimationEmitterContext } from './dom/animation-emitter'
import {
  emitElementCreation,
  emitProperties,
  emitIconSetup,
  emitSlotSetup,
  emitBaseStyles,
  emitContainerType,
  emitLayoutType,
  emitStateStyles,
  emitVisibleWhen,
  emitSelectionBinding,
  emitBindAttribute,
  emitComponentAttributes,
  emitRouteAttribute,
  emitKeyboardNav,
  emitLoopFocus,
  emitTypeahead,
  emitTriggerText,
  emitMask,
  emitValueBinding,
  emitAbsolutePositioning,
  emitAbsContainerMarker,
  emitAppendToParent,
} from './dom/node-emitter'
import type { NodeEmitterContext } from './dom/node-emitter'
import { emitInitialization as emitInitializationExtracted } from './dom/api-emitter'
import type { APIEmitterContext } from './dom/api-emitter'
import { emitChartSetup } from './dom/chart-emitter'
import type { ChartEmitterContext } from './dom/chart-emitter'
import { emitStyles as emitStylesExtracted } from './dom/style-emitter'
import type { StyleEmitterContext } from './dom/style-emitter'

// Re-export types for external consumers
export type { GenerateDOMOptions } from './dom/types'

/**
 * Generate DOM manipulation JavaScript code from Mirror AST
 *
 * Output: ES module with factory function
 *
 * @example
 * ```javascript
 * import { createUI } from "./app.mirror.js"
 *
 * const ui = createUI()
 * ui.header.text = "Hello"
 * ui.saveBtn.onclick = () => { ... }
 * document.body.appendChild(ui.root)
 * ```
 */
export function generateDOM(ast: AST, options?: GenerateDOMOptions): string {
  const ir = toIR(ast)
  const generator = new DOMGenerator(ir, ast.javascript, ast.tokens, options?.dataFiles)
  return generator.generate()
}

import * as emit_loops from './dom/ops/emit-loops'
import * as emit_zag from './dom/ops/emit-zag'
import * as resolve_templates from './dom/ops/resolve-templates'
import * as emit_events from './dom/ops/emit-events'
import * as emit_state from './dom/ops/emit-state'
import * as emit_static from './dom/ops/emit-static'
import * as resolve_utils from './dom/ops/resolve-utils'

export class DOMGenerator {
  ir: IR
  javascript?: JavaScriptBlock
  astTokens: TokenDefinition[]
  dataFiles?: DataFile[]
  indent = 0
  lines: string[] = []
  // Deferred when watchers - emitted after DOM is built
  deferredWhenWatchers: Array<{
    varName: string
    transition: IRStateTransition
    sm: IRStateMachine
  }> = []
  // Token lookup map for resolving token-to-token references
  tokenMap: Map<string, string | number | boolean> = new Map()

  constructor(
    ir: IR,
    javascript?: JavaScriptBlock,
    astTokens: TokenDefinition[] = [],
    dataFiles?: DataFile[]
  ) {
    this.ir = ir
    this.javascript = javascript
    this.astTokens = astTokens
    this.dataFiles = dataFiles
    // Build token lookup map (skip tokens without values, e.g., data objects)
    for (const token of astTokens) {
      if (token.value !== undefined) {
        this.tokenMap.set(token.name, token.value)
      }
    }
  }

  // === Bound ops methods (extracted to ./dom/ops/*.ts) ===
  // emit-loops.ts
  emitEachLoop = emit_loops.emitEachLoop
  emitConditional = emit_loops.emitConditional
  emitConditionalTemplateNode = emit_loops.emitConditionalTemplateNode
  emitEachTemplateNode = emit_loops.emitEachTemplateNode
  emitEachTemplateNodeContent = emit_loops.emitEachTemplateNodeContent
  emitNestedEachLoop = emit_loops.emitNestedEachLoop
  // emit-zag.ts
  emitZagComponent = emit_zag.emitZagComponent
  emitZagItems = emit_zag.emitZagItems
  // resolve-templates.ts
  resolveTemplateValue = resolve_templates.resolveTemplateValue
  resolveTemplateStyleValue = resolve_templates.resolveTemplateStyleValue
  resolveConditionalExpression = resolve_templates.resolveConditionalExpression
  resolveConditionalValue = resolve_templates.resolveConditionalValue
  resolveLoopVarMarkers = resolve_templates.resolveLoopVarMarkers
  resolveStyleValueForTopLevel = resolve_templates.resolveStyleValueForTopLevel
  parseTopLevelConditional = resolve_templates.parseTopLevelConditional
  resolveTopLevelCondition = resolve_templates.resolveTopLevelCondition
  resolveTopLevelValue = resolve_templates.resolveTopLevelValue
  // emit-events.ts
  emitTemplateEventListener = emit_events.emitTemplateEventListener
  emitTemplateAction = emit_events.emitTemplateAction
  emitEventListener = emit_events.emitEventListener
  emitAction = emit_events.emitAction
  // emit-state.ts
  mapKeyNameMethod = emit_state.mapKeyNameMethod
  emitStateMachine = emit_state.emitStateMachine
  emitDeferredWhenWatchersMethod = emit_state.emitDeferredWhenWatchersMethod
  groupByState = emit_state.groupByState
  collectNamedNodes = emit_state.collectNamedNodes
  // emit-static.ts
  emitCustomIcons = emit_static.emitCustomIcons
  emitAnimations = emit_static.emitAnimations
  emitHeader = emit_static.emitHeader
  emitTokens = emit_static.emitTokens
  emitPublicAPI = emit_static.emitPublicAPI
  emitRuntime = emit_static.emitRuntime
  // resolve-utils.ts
  sanitizeVarName = resolve_utils.sanitizeVarName
  resolveContentValue = resolve_utils.resolveContentValue
  resolveExpressionVariables = resolve_utils.resolveExpressionVariables
  escapeString = resolve_utils.escapeString
  escapeTemplateString = resolve_utils.escapeTemplateString
  resolveLoopCondition = resolve_utils.resolveLoopCondition
  resolveConditionVariables = resolve_utils.resolveConditionVariables

  /**
   * Create a ZagEmitterContext that delegates to this generator's methods.
   * This allows Zag emitters to be extracted into separate files while
   * still having access to the generator's functionality.
   */
  createZagEmitterContext(): ZagEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      getIndent: () => this.indent,
      setIndent: (level: number) => {
        this.indent = level
      },
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
      sanitizeVarName: (id: string) => this.sanitizeVarName(id),
      escapeString: str => this.escapeString(str),
      emitNode: (node: IRNode, parentVar: string) => this.emitNode(node, parentVar),
    }
  }

  /**
   * Create EmitterContext for extracted emitter modules (table, loops, etc.)
   */
  createEmitterContext(): EmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      emitRaw: (line: string) => this.lines.push(line),
      getIndent: () => this.indent,
      setIndent: (level: number) => {
        this.indent = level
      },
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
      sanitizeVarName: (id: string) => this.sanitizeVarName(id),
      escapeString: str => this.escapeString(str),
      emitNode: (node: IRNode, parentVar: string) => this.emitNode(node, parentVar),
      emitStyles: (varName: string, styles) => {
        const baseStyles = styles.filter(s => !s.state)
        if (baseStyles.length === 0) return

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
      },
      emitSlotStyles: (varName: string, slot) => {
        if (slot?.styles && slot.styles.length > 0) {
          this.emit(`${varName}.setAttribute('data-styled', 'true')`)
          this.emit(`Object.assign(${varName}.style, {`)
          this.indent++
          for (const style of slot.styles) {
            this.emit(`'${style.property}': '${style.value}',`)
          }
          this.indent--
          this.emit('})')
        }
      },
      getDeferredWhenWatchers: () => this.deferredWhenWatchers,
      addDeferredWhenWatcher: watcher => this.deferredWhenWatchers.push(watcher),
      emitStateMachine: (varName: string, node: IRNode) => this.emitStateMachine(varName, node),
      emitEachLoop: (each, parentVar: string) => this.emitEachLoop(each, parentVar),
      emitConditional: (cond, parentVar: string) => this.emitConditional(cond, parentVar),
      emitEachTemplateNode: (node: IRNode, parentVar: string, itemVar: string, indexVar?: string) =>
        this.emitEachTemplateNode(node, parentVar, itemVar, indexVar || 'index'),
      emitConditionalTemplateNode: (node: IRNode, parentVar: string) =>
        this.emitConditionalTemplateNode(node, parentVar),
      resolveTemplateValue: (value, itemVar: string, indexVar: string) =>
        this.resolveTemplateValue(value as string | number | boolean, itemVar, indexVar),
      resolveTemplateStyleValue: (value: string, itemVar: string) =>
        this.resolveTemplateStyleValue(value, itemVar),
      resolveConditionVariables: (condition: string) => this.resolveConditionVariables(condition),
      resolveContentValue: value => this.resolveContentValue(value as string | number | boolean),
    }
  }

  /**
   * Resolve a token value, following token-to-token references.
   * Uses the context (suffix) from the target token name to find the right source token.
   * E.g., $primary.bg: $blue → looks for $blue.bg and resolves to #2271C1
   *
   * @param value The token value to resolve
   * @param targetName The name of the token being defined (for suffix context)
   * @param visited Set of visited token names (for cycle detection)
   */
  resolveTokenValueWithContext(
    value: string | number | boolean,
    targetName: string,
    visited: Set<string> = new Set()
  ): string | number | boolean {
    if (typeof value !== 'string') return value
    if (!value.startsWith('$')) return value

    // Prevent infinite loops
    if (visited.has(value)) return value
    visited.add(value)

    // Extract suffix from target name (e.g., $primary.bg → .bg)
    const targetSuffix = targetName.includes('.') ? '.' + targetName.split('.').pop() : ''

    // Try exact match first (e.g., $blue.bg)
    if (this.tokenMap.has(value)) {
      const resolved = this.tokenMap.get(value)!
      return this.resolveTokenValueWithContext(resolved, targetName, visited)
    }

    // Try with suffix from target context
    // E.g., $primary.bg: $blue → look for $blue.bg
    if (targetSuffix) {
      const withSuffix = value + targetSuffix
      if (this.tokenMap.has(withSuffix)) {
        const resolved = this.tokenMap.get(withSuffix)!
        return this.resolveTokenValueWithContext(resolved, targetName, visited)
      }
    }

    // Try common suffixes as fallback
    for (const suffix of ['.bg', '.col', '.rad', '.pad', '.gap']) {
      const withSuffix = value + suffix
      if (this.tokenMap.has(withSuffix)) {
        const resolved = this.tokenMap.get(withSuffix)!
        return this.resolveTokenValueWithContext(resolved, targetName, visited)
      }
    }

    // Not a token reference, return as-is
    return value
  }

  generate(): string {
    this.emitHeader()
    this.emitTokens()
    // Custom icon registrations call `_runtime.registerIcon(...)` at top
    // level, so they must run AFTER the runtime const is declared. Order
    // before this fix caused TDZ in standalone-execution contexts (Bug #34).
    this.emitCreateUI()
    this.emitRuntime()
    this.emitCustomIcons()
    this.emitAnimations()

    // If there's JavaScript, emit initialization with named instance exposure
    if (this.javascript) {
      this.emitInitialization()
    }

    return this.lines.join('\n')
  }

  createAnimationEmitterContext(): AnimationEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
    }
  }

  emit(line: string): void {
    const indentation = '  '.repeat(this.indent)
    this.lines.push(indentation + line)
  }

  emitRaw(line: string): void {
    this.lines.push(line)
  }

  /**
   * Create a TokenEmitterContext that delegates to this generator's methods.
   */
  createTokenEmitterContext(): TokenEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
    }
  }

  emitCreateUI(): void {
    this.emit('export function createUI(data = {}) {')
    this.indent++

    this.emit('const _elements = {}')
    this.emit('const _state = { ...data }')
    this.emit('const _listeners = new Map()')
    this.emit('')

    // Generate root container
    this.emit('// Root container')
    this.emit("const _root = document.createElement('div')")
    this.emit("_root.className = 'mirror-root'")
    this.emit("_root.dataset.mirrorRoot = 'true'")

    // Apply canvas styles to root
    if (this.ir.canvas) {
      this.emitCanvasStyles('_root')
    }
    this.emit('')

    // Inject CSS (variables + system state styles)
    emitStylesExtracted(this.createStyleEmitterContext())

    // Generate each node (first node is the main root)
    let isFirstNode = true
    for (const node of this.ir.nodes) {
      this.emitNode(node, '_root', isFirstNode)
      isFirstNode = false
    }

    // Emit deferred when watchers after DOM is fully built
    this.emitDeferredWhenWatchersMethod()

    this.emit('')
    this.emitPublicAPI()

    this.indent--
    this.emit('}')
    this.emit('')
  }

  /**
   * Emit canvas styles to root element
   * Applies base styling and CSS variables for inherited properties
   */
  emitCanvasStyles(varName: string): void {
    if (!this.ir.canvas?.styles.length) return

    this.emit(`Object.assign(${varName}.style, {`)
    this.indent++
    for (const style of this.ir.canvas.styles) {
      const jsProperty = cssPropertyToJS(style.property)
      this.emit(`'${jsProperty}': '${style.value}',`)
    }
    this.indent--
    this.emit('})')

    // Set CSS variables for inherited properties (color, font-family, font-size)
    const inheritableProps = ['color', 'font-family', 'font-size']
    for (const style of this.ir.canvas.styles) {
      if (inheritableProps.includes(style.property)) {
        this.emit(`${varName}.style.setProperty('--mirror-${style.property}', '${style.value}')`)
      }
    }
  }

  emitNode(node: IRNode, parentVar: string, isMainRoot = false): void {
    // Skip definitions - they are not rendered, only instances are
    // Exception: Zag slot names (like CloseTrigger) should always be rendered
    // even when marked as definitions (because they're slot instantiations, not component definitions)
    if (node.isDefinition && node.name && !ZAG_SLOT_NAMES.has(node.name)) {
      return
    }

    // Handle Zag components
    if (isIRZagNode(node)) {
      // Also check Zag component isDefinition
      if (node.isDefinition) {
        return
      }
      this.emitZagComponent(node, parentVar)
      return
    }

    // Handle each loop nodes
    if (node.each) {
      this.emitEachLoop(node.each, parentVar)
      return
    }

    // Handle conditional nodes
    if (node.conditional) {
      this.emitConditional(node.conditional, parentVar)
      return
    }

    const varName = this.sanitizeVarName(node.id)
    const nodeCtx = this.createNodeEmitterContext()

    // Create element and register it
    emitElementCreation(nodeCtx, node, varName, isMainRoot)

    // Set HTML properties (returns icon/slot info for further processing)
    const { isIcon, iconName, isSlot } = emitProperties(nodeCtx, node, varName)

    // Load icon from CDN if this is an icon element
    if (isIcon && iconName) {
      emitIconSetup(nodeCtx, varName, iconName)
    }

    // Handle Slot primitive - visual placeholder for drag & drop
    if (isSlot) {
      emitSlotSetup(nodeCtx, node, varName)
    }

    // Handle Chart primitive - create Chart.js chart
    emitChartSetup(this.createChartEmitterContext(), node, varName)

    // Apply base styles (excluding state-specific and size-state styles)
    const baseStyles = emitBaseStyles(nodeCtx, node, varName)

    // Set container-type for size-states (CSS Container Queries)
    emitContainerType(nodeCtx, node, varName)

    // Set data-layout for drop strategy detection
    emitLayoutType(nodeCtx, node, varName)

    // Mark abs containers (fallback for older IR or when layoutType not set)
    emitAbsContainerMarker(nodeCtx, node, varName, baseStyles)

    // Store state styles for runtime (excluding CSS-handled system states)
    emitStateStyles(nodeCtx, node, varName)

    // State machine configuration (interaction model)
    // Note: stateMachine handling includes initialState support
    if (node.stateMachine) {
      this.emitStateMachine(varName, node)
    } else if (node.initialState) {
      // Initial state for elements without state machine (legacy path)
      this.emit(`${varName}.dataset.state = '${node.initialState}'`)
      this.emit(`${varName}._initialState = '${node.initialState}'`)
      // Apply initial state styles
      this.emit(`if (${varName}._stateStyles && ${varName}._stateStyles['${node.initialState}']) {`)
      this.indent++
      this.emit(`Object.assign(${varName}.style, ${varName}._stateStyles['${node.initialState}'])`)
      this.indent--
      this.emit(`}`)
    }

    // Visible when state condition
    emitVisibleWhen(nodeCtx, node, varName)

    // Selection binding - for exclusive() to update a variable with selected content
    emitSelectionBinding(nodeCtx, node, varName)

    // Bind - track active exclusive() child content in a variable
    emitBindAttribute(nodeCtx, node, varName)

    // Component name (for navigation targets)
    emitComponentAttributes(nodeCtx, node, varName, ZAG_SLOT_NAMES)

    // Route (for navigation)
    emitRouteAttribute(nodeCtx, node, varName)

    // Keyboard navigation for form containers
    emitKeyboardNav(nodeCtx, node, varName)

    // Loop focus (wrap around at start/end of list)
    emitLoopFocus(nodeCtx, node, varName)

    // Typeahead navigation (typing jumps to matching item)
    emitTypeahead(nodeCtx, node, varName)

    // Trigger text binding (shows selected value)
    emitTriggerText(nodeCtx, node, varName)

    // Add event listeners
    // Check if there are keyboard events and make element focusable
    const hasKeyboardEvents = node.events.some(
      e => e.key || e.name === 'keydown' || e.name === 'keyup'
    )
    if (hasKeyboardEvents) {
      this.emit(`${varName}.setAttribute('tabindex', '0')`)
    }
    for (const event of node.events) {
      // Skip events that are fully handled by state machine transitions
      // These have only isBuiltinStateFunction actions (toggle, exclusive, cycle)
      const allActionsAreStateMachine = event.actions.every(a => a.isBuiltinStateFunction)
      if (allActionsAreStateMachine && node.stateMachine) {
        continue // State machine will handle this event via transitions
      }
      this.emitEventListener(varName, event)
    }

    // Input mask (apply before value binding so initial value gets formatted)
    emitMask(nodeCtx, node, varName)

    // Two-way data binding for input elements
    emitValueBinding(nodeCtx, node, varName)

    // Recursively emit children
    // BUT: Skip default children if the node starts in a non-default state that has its own children
    // This implements Figma Variants behavior - each state can have completely different children
    const sm = node.stateMachine
    const effectiveInitial = node.initialState || sm?.initial || 'default'
    const initialStateHasChildren =
      sm?.states[effectiveInitial]?.children && sm.states[effectiveInitial].children!.length > 0
    const shouldSkipDefaultChildren =
      sm && effectiveInitial !== 'default' && initialStateHasChildren

    if (!shouldSkipDefaultChildren) {
      for (const child of node.children) {
        this.emitNode(child, varName)
      }
    }

    // Auto-set parent to relative if this element is absolute positioned
    emitAbsolutePositioning(nodeCtx, baseStyles, varName, parentVar)

    // Append to parent
    emitAppendToParent(nodeCtx, varName, parentVar)
  }

  // emitEachLoop: migrated to compiler/backends/dom/loop-emitter.ts

  // emitConditional: migrated to compiler/backends/dom/loop-emitter.ts

  /**
   * Create a LoopEmitterContext for the extracted loop emitter functions
   */
  createLoopEmitterContext(): LoopEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
      sanitizeVarName: (id: string) => this.sanitizeVarName(id),
      resolveConditionVariables: (condition: string) => this.resolveConditionVariables(condition),
      emitEachTemplateNode: (
        node: IRNode,
        parentVar: string,
        itemVar: string,
        indexVar: string
      ) => {
        this.emitEachTemplateNode(node, parentVar, itemVar, indexVar)
      },
      emitConditionalTemplateNode: (node: IRNode, parentVar: string) => {
        this.emitConditionalTemplateNode(node, parentVar)
      },
    }
  }

  createAPIEmitterContext(): APIEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      emitRaw: (line: string) => this.emitRaw(line),
      getIndent: () => this.indent,
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
    }
  }

  createChartEmitterContext(): ChartEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
      escapeString: str => this.escapeString(str),
    }
  }

  createNodeEmitterContext(): NodeEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      getIndent: () => this.indent,
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
      sanitizeVarName: (id: string) => this.sanitizeVarName(id),
      escapeString: str => this.escapeString(str),
      resolveContentValue: value => this.resolveContentValue(value),
      resolveStyleValue: value => this.resolveStyleValueForTopLevel(String(value)),
    }
  }

  createStyleEmitterContext(): StyleEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      emitRaw: (line: string) => this.emitRaw(line),
      getIndent: () => this.indent,
      setIndent: (level: number) => {
        this.indent = level
      },
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
      resolveTokenValueWithContext: (value, targetName) =>
        this.resolveTokenValueWithContext(value, targetName),
      getTokenMap: () => this.tokenMap,
      getIRTokens: () => this.ir.tokens,
      getIRNodes: () => this.ir.nodes,
      getASTTokens: () => this.astTokens,
    }
  }

  /**
   * Create an EventEmitterContext for delegation to extracted event-emitter functions
   */
  createEventEmitterContext(): EventEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
      escapeString: str => this.escapeString(str),
    }
  }

  createStateMachineContext(): StateMachineEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      indentIn: () => {
        this.indent++
      },
      indentOut: () => {
        this.indent--
      },
      escapeString: (str: string) => this.escapeString(str),
      addDeferredWhenWatcher: (w: DeferredWhenWatcher) => {
        this.deferredWhenWatchers.push(w)
      },
    }
  }

  emitInitialization(): void {
    const ctx = this.createAPIEmitterContext()
    const namedNodes = this.collectNamedNodes(this.ir.nodes)
    emitInitializationExtracted(ctx, namedNodes, this.javascript)
  }
}
