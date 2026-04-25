/**
 * Mirror DOM Backend
 *
 * Generates pure JavaScript DOM manipulation code.
 * Flagship backend - no framework dependencies.
 */

import type { AST, JavaScriptBlock, TokenDefinition } from '../parser/ast'
import { toIR } from '../ir'
import type {
  IR,
  IRCanvas,
  IRNode,
  IRStyle,
  IREvent,
  IRAction,
  IREach,
  IRConditional,
  IRAnimation,
  IRZagNode,
  IRStateMachine,
  IRStateTransition,
  IRItem,
  IRProperty,
  IRSlot,
  IRItemProperty,
} from '../ir/types'
import { isIRZagNode } from '../ir/types'
import { DOM_RUNTIME_CODE } from '../runtime/dom-runtime-string'
import type { DataFile } from '../parser/data-types'
import { dispatchZagEmitter } from './dom/zag-emitters'
import type { ZagEmitterContext } from './dom/zag-emitter-context'

// Extracted utilities
import { escapeJSString, sanitizeVarName, cssPropertyToJS, generateVarName } from './dom/utils'
import { ZAG_SLOT_NAMES, type GenerateDOMOptions } from './dom/types'
import type { EmitterContext, DeferredWhenWatcher } from './dom/emitter-context'
import {
  emitStateMachine as emitStateMachineExtracted,
  emitDeferredWhenWatchers,
} from './dom/state-machine-emitter'
import type { StateMachineEmitterContext } from './dom/state-machine-emitter'
import {
  emitEachLoop as emitEachLoopExtracted,
  emitConditional as emitConditionalExtracted,
} from './dom/loop-emitter'
import type { LoopEmitterContext } from './dom/loop-emitter'
import {
  emitEventListener as emitEventListenerExtracted,
  emitTemplateEventListener as emitTemplateEventListenerExtracted,
  emitAction as emitActionExtracted,
  mapKeyName,
} from './dom/event-emitter'
import type { EventEmitterContext } from './dom/event-emitter'
import { emitTokens as emitTokensExtracted } from './dom/token-emitter'
import type { TokenEmitterContext } from './dom/token-emitter'

// New extracted modules
import { emitAnimations as emitAnimationsExtracted } from './dom/animation-emitter'
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
import {
  collectNamedNodes as collectNamedNodesExtracted,
  emitPublicAPI as emitPublicAPIExtracted,
  emitInitialization as emitInitializationExtracted,
  emitAutoMount as emitAutoMountExtracted,
} from './dom/api-emitter'
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

class DOMGenerator {
  private ir: IR
  private javascript?: JavaScriptBlock
  private astTokens: TokenDefinition[]
  private dataFiles?: DataFile[]
  private indent = 0
  private lines: string[] = []
  // Deferred when watchers - emitted after DOM is built
  private deferredWhenWatchers: Array<{
    varName: string
    transition: IRStateTransition
    sm: IRStateMachine
  }> = []
  // Token lookup map for resolving token-to-token references
  private tokenMap: Map<string, string | number | boolean> = new Map()

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

  /**
   * Create a ZagEmitterContext that delegates to this generator's methods.
   * This allows Zag emitters to be extracted into separate files while
   * still having access to the generator's functionality.
   */
  private createZagEmitterContext(): ZagEmitterContext {
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
  private createEmitterContext(): EmitterContext {
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
  private resolveTokenValueWithContext(
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
    this.emitCustomIcons()
    this.emitCreateUI()
    this.emitRuntime()
    this.emitAnimations()

    // If there's JavaScript, emit initialization with named instance exposure
    if (this.javascript) {
      this.emitInitialization()
    }

    return this.lines.join('\n')
  }

  /**
   * Emit custom icon registrations
   * Icons defined with $icons: are registered before UI creation
   */
  private emitCustomIcons(): void {
    if (!this.ir.icons || this.ir.icons.length === 0) return

    this.emit('')
    this.emit('// Custom Icons')
    for (const icon of this.ir.icons) {
      const viewBox = icon.viewBox || '0 0 24 24'
      // Escape any quotes in the path data
      const escapedPath = icon.path.replace(/"/g, '\\"')
      this.emit(`_runtime.registerIcon('${icon.name}', "${escapedPath}", '${viewBox}')`)
    }
  }

  private emitAnimations(): void {
    const ctx = this.createAnimationEmitterContext()
    emitAnimationsExtracted(ctx, this.ir.animations)
  }

  private createAnimationEmitterContext(): AnimationEmitterContext {
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

  private emit(line: string): void {
    const indentation = '  '.repeat(this.indent)
    this.lines.push(indentation + line)
  }

  private emitRaw(line: string): void {
    this.lines.push(line)
  }

  private emitHeader(): void {
    this.emit('// Generated by Mirror Compiler (DOM Backend)')
    this.emit('// Do not edit manually')
    this.emit('')
  }

  /**
   * Create a TokenEmitterContext that delegates to this generator's methods.
   */
  private createTokenEmitterContext(): TokenEmitterContext {
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

  private emitTokens(): void {
    // Delegate to extracted token emitter
    const ctx = this.createTokenEmitterContext()
    emitTokensExtracted(ctx, {
      tokens: this.ir.tokens,
      dataFiles: this.dataFiles,
    })
  }

  private emitCreateUI(): void {
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
  private emitCanvasStyles(varName: string): void {
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

  private emitNode(node: IRNode, parentVar: string, isMainRoot = false): void {
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
  private emitEachLoop(each: IREach, parentVar: string): void {
    const ctx = this.createLoopEmitterContext()
    emitEachLoopExtracted(ctx, each, parentVar)
  }

  // emitConditional: migrated to compiler/backends/dom/loop-emitter.ts
  private emitConditional(cond: IRConditional, parentVar: string): void {
    const ctx = this.createLoopEmitterContext()
    emitConditionalExtracted(ctx, cond, parentVar)
  }

  /**
   * Create a LoopEmitterContext for the extracted loop emitter functions
   */
  private createLoopEmitterContext(): LoopEmitterContext {
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

  private emitZagComponent(node: IRZagNode, parentVar: string): void {
    // Try extracted emitters first (gradual migration)
    const ctx = this.createZagEmitterContext()
    if (dispatchZagEmitter(node, parentVar, ctx)) {
      return
    }

    // Fallback: Generic Zag component handler for unknown types
    // All 25 specialized emitters are in zag-emitters.ts

    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Zag Component: ${node.name} (${node.zagType})`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = '${node.zagType}'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: '${node.zagType}',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)

    // Emit slot definitions
    this.emit(`slots: {`)
    this.indent++
    for (const [slotName, slot] of Object.entries(node.slots)) {
      this.emit(`'${slotName}': {`)
      this.indent++
      this.emit(`apiMethod: '${slot.apiMethod}',`)
      this.emit(`element: '${slot.element}',`)
      this.emit(`portal: ${slot.portal || false},`)
      this.emit(`styles: ${JSON.stringify(slot.styles)},`)
      this.indent--
      this.emit(`},`)
    }
    this.indent--
    this.emit(`},`)

    // Emit items
    this.emit(`items: ${JSON.stringify(node.items)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Create slot elements
    for (const [slotName, slot] of Object.entries(node.slots)) {
      const slotVar = `${varName}_${slotName.toLowerCase()}`
      this.emit(`// Slot: ${slotName}`)
      this.emit(`const ${slotVar} = document.createElement('${slot.element}')`)
      this.emit(`${slotVar}.dataset.slot = '${slotName}'`)
      this.emit(`${slotVar}.dataset.mirrorSlot = '${node.id}-${slotName}'`)

      // Apply base styles and mark as styled to prevent runtime defaults
      if (slot.styles.length > 0) {
        this.emit(`${slotVar}.setAttribute('data-styled', 'true')`)
        this.emit(`Object.assign(${slotVar}.style, {`)
        this.indent++
        for (const style of slot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }

      // Append to root
      // Note: Even portal elements are appended initially - the runtime
      // can relocate them to a portal container if needed
      this.emit(`${varName}.appendChild(${slotVar})`)
      this.emit('')
    }

    // Create item elements for Content slot
    if (node.items.length > 0) {
      const contentSlotVar = `${varName}_content`
      this.emit(`// Items`)
      this.emitZagItems(node.items, varName, contentSlotVar)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Zag component via runtime
    this.emit(`// Initialize Zag machine`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initZagComponent) {`)
    this.indent++
    this.emit(`_runtime.initZagComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  /**
   * Emit Zag items (including groups)
   */
  private emitZagItems(
    items: IRItem[],
    varNamePrefix: string,
    parentVar: string,
    indexOffset: number = 0
  ): void {
    let itemIndex = indexOffset
    for (const item of items) {
      if (item.isGroup) {
        // Render Group
        const groupVar = `${varNamePrefix}_group${itemIndex}`
        this.emit(`// Group: ${item.label || 'Unnamed'}`)
        this.emit(`const ${groupVar} = document.createElement('div')`)
        this.emit(`${groupVar}.dataset.slot = 'Group'`)
        this.emit(`${groupVar}.setAttribute('role', 'group')`)

        // Render GroupLabel if present
        if (item.label) {
          const labelVar = `${groupVar}_label`
          this.emit(`const ${labelVar} = document.createElement('span')`)
          this.emit(`${labelVar}.dataset.slot = 'GroupLabel'`)
          this.emit(`${labelVar}.textContent = '${this.escapeString(item.label)}'`)
          this.emit(`${groupVar}.appendChild(${labelVar})`)
        }

        // Render group items
        if (item.items && item.items.length > 0) {
          this.emitZagItems(item.items, `${groupVar}_item`, groupVar, 0)
        }

        this.emit(`${parentVar}.appendChild(${groupVar})`)
        itemIndex++
      } else {
        // Render regular Item
        const itemVar = `${varNamePrefix}_item${itemIndex}`
        this.emit(`const ${itemVar} = document.createElement('div')`)
        this.emit(`${itemVar}.dataset.mirrorItem = '${item.value}'`)
        if (item.disabled) {
          this.emit(`${itemVar}.dataset.disabled = 'true'`)
        }
        // Apply item layout properties if present
        if (item.properties && item.properties.length > 0) {
          for (const prop of item.properties) {
            const propName = prop.name
            // Handle layout properties
            if (propName === 'ver' || propName === 'vertical') {
              this.emit(`${itemVar}.style.display = 'flex'`)
              this.emit(`${itemVar}.style.flexDirection = 'column'`)
              this.emit(`${itemVar}.style.alignItems = 'flex-start'`)
            } else if (propName === 'hor' || propName === 'horizontal') {
              this.emit(`${itemVar}.style.display = 'flex'`)
              this.emit(`${itemVar}.style.flexDirection = 'row'`)
              this.emit(`${itemVar}.style.alignItems = 'center'`)
            } else if (propName === 'gap' || propName === 'g') {
              const gapValue = prop.values[0]
              this.emit(`${itemVar}.style.gap = '${gapValue}px'`)
            } else if (propName === 'pad' || propName === 'p' || propName === 'padding') {
              const padValues = prop.values
              if (padValues.length === 1) {
                this.emit(`${itemVar}.style.padding = '${padValues[0]}px'`)
              } else if (padValues.length === 2) {
                this.emit(`${itemVar}.style.padding = '${padValues[0]}px ${padValues[1]}px'`)
              } else if (padValues.length === 4) {
                this.emit(
                  `${itemVar}.style.padding = '${padValues[0]}px ${padValues[1]}px ${padValues[2]}px ${padValues[3]}px'`
                )
              }
            } else if (propName === 'spread') {
              this.emit(`${itemVar}.style.display = 'flex'`)
              this.emit(`${itemVar}.style.justifyContent = 'space-between'`)
            } else if (propName === 'center') {
              this.emit(`${itemVar}.style.display = 'flex'`)
              this.emit(`${itemVar}.style.alignItems = 'center'`)
              this.emit(`${itemVar}.style.justifyContent = 'center'`)
            }
          }
        }
        // Render children if present, otherwise use label as text
        if (item.children && item.children.length > 0) {
          // Default to horizontal layout with centered alignment if no explicit layout
          const hasLayoutProp = item.properties?.some((p: IRItemProperty) =>
            ['ver', 'hor', 'vertical', 'horizontal', 'spread', 'center'].includes(p.name)
          )
          if (!hasLayoutProp) {
            this.emit(`${itemVar}.style.display = 'flex'`)
            this.emit(`${itemVar}.style.alignItems = 'center'`)
            this.emit(`${itemVar}.style.gap = '8px'`)
          }
          for (const child of item.children) {
            this.emitNode(child, itemVar)
          }
        } else {
          this.emit(`${itemVar}.textContent = '${this.escapeString(item.label)}'`)
        }
        this.emit(`${parentVar}.appendChild(${itemVar})`)
        itemIndex++
      }
    }
  }

  // =========================================================================
  // MIGRATED TO zag-emitters.ts (25 components):
  // Switch, Checkbox, RadioGroup, Slider, Tabs, Select, Tooltip, Dialog,
  // SideNav, Popover, HoverCard, Collapsible, DatePicker, ToggleGroup,
  // SegmentedControl, TreeView, PasswordInput, PinInput, Editable,
  // TagsInput, NumberInput, DateInput, Accordion, Listbox, Form
  // =========================================================================

  private emitConditionalTemplateNode(node: IRNode, parentVar: string): void {
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
          const value =
            typeof prop.value === 'string' ? `"${this.escapeString(prop.value)}"` : prop.value
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

  private emitEachTemplateNode(
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
      // Check if the visibleWhen references the loop variable
      // Strip leading ! for negated conditions
      const conditionWithoutNot = node.visibleWhen.startsWith('!')
        ? node.visibleWhen.slice(1)
        : node.visibleWhen
      const firstPart = conditionWithoutNot.split('.')[0]
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
  private emitEachTemplateNodeContent(
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
  private emitNestedEachLoop(
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
    const rawCollection = each.collection.startsWith('$')
      ? each.collection.slice(1)
      : each.collection

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

    this.emit(`(${collectionExpr} || []).forEach((${innerItemVar}, ${innerIndexVar}) => {`)
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

  private resolveTemplateValue(
    value: string | number | boolean,
    itemVar: string,
    indexVar: string = 'index'
  ): string {
    if (typeof value === 'string') {
      // Check for __loopVar: markers (set by IR for loop variable references)
      // Use regex replacement for ALL occurrences (handles multiple markers in expressions)
      if (value.includes('__loopVar:')) {
        // e.g., "__loopVar:user.name" -> user.name (unquoted)
        // e.g., "__loopVar:index + 1" -> index + 1
        // e.g., "__loopVar:team.name + __loopVar:team.members.length" -> team.name + team.members.length
        // Replace __loopVar:name with just name (including array indexing and nested properties)
        let resolved = value.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
        // Also handle $-variables in expressions
        resolved = resolved.replace(
          /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
          '$get("$1")'
        )
        return resolved
      }

      // Check for $$ escape followed by item variable reference like $$product.price
      // This should produce: "$" + product.price (literal $ + loop var value)
      if (value.includes(`$$${itemVar}.`)) {
        // Check if value is ONLY $$itemVar.property (no other text)
        const exactMatch = value.match(new RegExp(`^\\$\\$${itemVar}\\.([a-zA-Z_][a-zA-Z0-9_.]*)$`))
        if (exactMatch) {
          // Simple case: "$$product.price" -> "$" + product.price
          return `"$" + ${itemVar}.${exactMatch[1]}`
        }
        // Complex case: "Price: $$product.price" -> template literal with interpolation
        // Convert $$product.price to ${product.price} within a template literal
        const resolved = value.replace(
          new RegExp(`\\$\\$${itemVar}\\.([a-zA-Z_][a-zA-Z0-9_.]*)`, 'g'),
          `\$\${${itemVar}.$1}`
        )
        return `\`${this.escapeTemplateString(resolved)}\``
      }

      // Check if value contains item variable reference like $task.title
      if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`)) {
        // Convert $task.title to task.title
        const resolved = value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
        return resolved
      }
      // Check for plain item reference $task -> task
      if (value === `$${itemVar}`) {
        return itemVar
      }
      // Check for plain index reference $index -> index
      if (value === `$${indexVar}`) {
        return indexVar
      }
      return `"${this.escapeString(String(value))}"`
    }
    return String(value)
  }

  private resolveTemplateStyleValue(value: string, itemVar: string): string {
    // Handle __conditional: markers (ternary expressions from IR)
    // Format: __conditional:condition?thenValue:elseValue
    if (value.includes('__conditional:')) {
      return this.resolveConditionalExpression(value, itemVar)
    }

    // Handle __loopVar: markers
    if (value.includes('__loopVar:')) {
      const resolved = value.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
      // Wrap in parentheses if it's an expression
      if (resolved.includes(' ')) {
        return `(${resolved})`
      }
      return resolved
    }

    // Check if value is exactly the item variable (e.g., $color -> color)
    if (value === `$${itemVar}`) {
      return itemVar
    }
    // Check if value contains item variable reference with property access
    if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`)) {
      const resolved = value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
      return resolved
    }
    return `'${value}'`
  }

  /**
   * Resolve __conditional: markers into proper JavaScript ternary expressions
   * Handles nested conditionals (chained ternary)
   */
  private resolveConditionalExpression(value: string, itemVar: string): string {
    // Parse __conditional:condition?then:else pattern
    // Note: 'else' part may itself be another __conditional (nested ternary)
    const parseConditional = (str: string): string => {
      if (!str.startsWith('__conditional:')) {
        // Not a conditional - resolve as a value
        return this.resolveConditionalValue(str, itemVar)
      }

      // Remove __conditional: prefix
      const content = str.slice('__conditional:'.length)

      // Find the ? that separates condition from then/else
      // Need to be careful with nested conditionals
      let questionPos = -1
      let depth = 0
      for (let i = 0; i < content.length; i++) {
        const char = content[i]
        if (char === '(') depth++
        else if (char === ')') depth--
        else if (char === '?' && depth === 0 && !content.slice(i - 1, i + 1).match(/[=!<>]=?\?/)) {
          // Found ? not part of === or !== etc
          questionPos = i
          break
        }
      }

      if (questionPos === -1) {
        // No valid ternary found, return as-is
        return this.resolveConditionalValue(content, itemVar)
      }

      const condition = content.slice(0, questionPos)
      const rest = content.slice(questionPos + 1)

      // Find the : that separates then from else
      // Need to handle nested __conditional: in else part
      let colonPos = -1
      depth = 0
      let inConditional = false
      for (let i = 0; i < rest.length; i++) {
        const char = rest[i]
        if (rest.slice(i).startsWith('__conditional:')) {
          inConditional = true
        }
        if (char === '(') depth++
        else if (char === ')') depth--
        else if (char === ':' && depth === 0 && !inConditional) {
          colonPos = i
          break
        }
        // Reset inConditional after seeing a ? in nested conditional
        if (char === '?' && inConditional) {
          inConditional = false
        }
      }

      if (colonPos === -1) {
        // Fallback: split at first : not in nested conditional
        colonPos = rest.indexOf(':')
      }

      const thenValue = rest.slice(0, colonPos)
      const elseValue = rest.slice(colonPos + 1)

      // Resolve the condition (replace __loopVar: markers)
      const resolvedCondition = this.resolveLoopVarMarkers(condition)

      // Recursively parse then/else (may be nested conditionals)
      const resolvedThen = parseConditional(thenValue)
      const resolvedElse = parseConditional(elseValue)

      return `(${resolvedCondition} ? ${resolvedThen} : ${resolvedElse})`
    }

    return parseConditional(value)
  }

  /**
   * Resolve a single value in a conditional (color, string, etc.)
   */
  private resolveConditionalValue(value: string, itemVar: string): string {
    // Handle __loopVar: markers
    if (value.includes('__loopVar:')) {
      return this.resolveLoopVarMarkers(value)
    }

    // Handle item variable reference
    if (value.includes(`$${itemVar}.`)) {
      return value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
    }

    // Check if it's a color (hex)
    if (value.startsWith('#')) {
      return `"${value}"`
    }

    // Check if it's a number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return value
    }

    // Default: wrap in quotes
    return `"${value}"`
  }

  /**
   * Replace __loopVar: markers with actual variable references
   */
  private resolveLoopVarMarkers(str: string): string {
    return str.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
  }

  /**
   * Resolve a style value for non-loop context (top-level nodes)
   * Handles __conditional: markers by converting them to $get()-based ternary expressions
   */
  private resolveStyleValueForTopLevel(value: string): { code: string; needsEval: boolean } {
    if (!value.includes('__conditional:')) {
      return { code: `'${value}'`, needsEval: false }
    }

    // Parse and convert conditional to $get()-based ternary
    const resolvedCode = this.parseTopLevelConditional(value)
    return { code: resolvedCode, needsEval: true }
  }

  private parseTopLevelConditional(str: string): string {
    if (!str.startsWith('__conditional:')) {
      return this.resolveTopLevelValue(str)
    }

    const content = str.slice('__conditional:'.length)

    // Find the ? that separates condition from then/else
    let questionPos = -1
    let depth = 0
    for (let i = 0; i < content.length; i++) {
      const char = content[i]
      if (char === '(') depth++
      else if (char === ')') depth--
      else if (
        char === '?' &&
        depth === 0 &&
        !content.slice(Math.max(0, i - 1), i + 1).match(/[=!<>]=?\?/)
      ) {
        questionPos = i
        break
      }
    }

    if (questionPos === -1) {
      return this.resolveTopLevelValue(content)
    }

    const condition = content.slice(0, questionPos).trim()
    const rest = content.slice(questionPos + 1)

    // Find the : that separates then from else
    let colonPos = -1
    depth = 0
    let inConditional = false
    for (let i = 0; i < rest.length; i++) {
      const char = rest[i]
      if (rest.slice(i).startsWith('__conditional:')) {
        inConditional = true
      }
      if (char === '(') depth++
      else if (char === ')') depth--
      else if (char === ':' && depth === 0 && !inConditional) {
        colonPos = i
        break
      }
      if (char === '?' && inConditional) {
        inConditional = false
      }
    }

    if (colonPos === -1) {
      return this.resolveTopLevelValue(content)
    }

    const thenValue = rest.slice(0, colonPos).trim()
    const elseValue = rest.slice(colonPos + 1).trim()

    // Resolve condition: bare identifiers become $get("identifier")
    const resolvedCondition = this.resolveTopLevelCondition(condition)

    // Recursively parse then/else
    const resolvedThen = this.parseTopLevelConditional(thenValue)
    const resolvedElse = this.parseTopLevelConditional(elseValue)

    return `(${resolvedCondition} ? ${resolvedThen} : ${resolvedElse})`
  }

  private resolveTopLevelCondition(condition: string): string {
    // Replace bare identifiers with $get("identifier")
    const reserved = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'])
    return condition.replace(
      /(?<!["\w$.])\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b(?!["\w(])/g,
      (match, identifier) => {
        const firstPart = identifier.split('.')[0]
        if (reserved.has(firstPart)) return match
        return `$get("${identifier}")`
      }
    )
  }

  private resolveTopLevelValue(value: string): string {
    // Handle hex colors
    if (value.startsWith('#')) {
      return `"${value}"`
    }
    // Handle numbers
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return value
    }
    // Handle named colors and other values
    return `"${value}"`
  }

  /**
   * Emit template event listener for loop items
   * Delegates to extracted event-emitter.ts
   */
  private emitTemplateEventListener(varName: string, event: IREvent, itemVar: string): void {
    const ctx = this.createEventEmitterContext()
    emitTemplateEventListenerExtracted(ctx, varName, event, itemVar, (action, currentVar, item) =>
      this.emitTemplateAction(action, currentVar, item)
    )
  }

  private emitTemplateAction(action: IRAction, currentVar: string, itemVar: string): void {
    const target = action.target || 'self'

    switch (action.type) {
      case 'toggle':
        this.emit(`_runtime.toggle(_elements['${target}'] || ${currentVar})`)
        break
      case 'select':
        this.emit(`_runtime.select(${currentVar})`)
        break
      case 'exclusive':
        // Exclusive selection - deselect siblings, select this one
        this.emit(`_runtime.exclusive(${currentVar})`)
        break
      case 'assign':
        // Handle assign $selected to $item
        if (action.args && action.args[0] === `$${itemVar}`) {
          const stateVar = target.startsWith('$') ? target.slice(1) : target
          this.emit(`_state['${stateVar}'] = ${itemVar}`)
          this.emit(`api.update()`)
        }
        break
      default:
        // For unrecognized actions in template context, try emitting as regular action
        // This handles custom functions and other action types
        this.emitAction(action, currentVar)
    }
  }

  /**
   * Emit standard event listener
   * Delegates to extracted event-emitter.ts
   */
  private emitEventListener(varName: string, event: IREvent): void {
    const ctx = this.createEventEmitterContext()
    emitEventListenerExtracted(ctx, varName, event, (action, currentVar) =>
      this.emitAction(action, currentVar)
    )
  }

  /**
   * Emit action call
   * Delegates to extracted event-emitter.ts
   */
  private emitAction(action: IRAction, currentVar: string): void {
    const ctx = this.createEventEmitterContext()
    emitActionExtracted(ctx, action, currentVar)
  }

  private emitPublicAPI(): void {
    const ctx = this.createAPIEmitterContext()
    const namedNodes = this.collectNamedNodes(this.ir.nodes)
    emitPublicAPIExtracted(ctx, namedNodes)
  }

  private createAPIEmitterContext(): APIEmitterContext {
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

  private createChartEmitterContext(): ChartEmitterContext {
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

  private createNodeEmitterContext(): NodeEmitterContext {
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

  private createStyleEmitterContext(): StyleEmitterContext {
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

  private emitRuntime(): void {
    // Emit the pre-built runtime code from separate module
    // This replaces ~778 lines of inline code generation
    this.emitRaw(DOM_RUNTIME_CODE)
    this.emit('')

    // Register tokens in runtime for value functions (increment, decrement, set, reset)
    if (this.ir.tokens.length > 0) {
      this.emit('// Register tokens in runtime')
      for (const token of this.ir.tokens) {
        const tokenKey = (token.name.startsWith('$') ? token.name.slice(1) : token.name).replace(
          /\./g,
          '-'
        )
        // Handle numeric values - check if the string represents a number
        let value: string
        if (typeof token.value === 'number') {
          value = String(token.value)
        } else if (typeof token.value === 'string') {
          // Check if it's a numeric string
          const numVal = Number(token.value)
          if (!isNaN(numVal) && token.value.trim() !== '') {
            value = String(numVal)
          } else {
            value = `'${this.escapeString(token.value)}'`
          }
        } else {
          value = String(token.value)
        }
        this.emit(`_runtime.registerToken('$${tokenKey}', ${value})`)
      }
      this.emit('')
    }
  }

  /**
   * Sanitize an ID to create a valid JavaScript variable name.
   * Delegates to the extracted utility function.
   */
  private sanitizeVarName(id: string): string {
    return sanitizeVarName(id)
  }

  /**
   * Resolve content value for textContent, handling $-variables and loop variables
   * $name → $get('name')
   * $12.4k → "$12.4k" (literal, starts with digit)
   * __loopVar:user.name → user.name (unquoted, JS variable)
   * "literal" → "literal"
   * "Hello " + $name → "Hello " + $get("name") (expressions)
   */
  private resolveContentValue(value: string | number | boolean): string {
    if (typeof value === 'string') {
      // Check for loop variable reference (marked by IR)
      if (value.startsWith('__loopVar:')) {
        const varName = value.slice('__loopVar:'.length)
        return varName // Return unquoted - it's a JS variable reference
      }

      // Check for conditional expression (marked by IR)
      // Format: __conditional:condition?thenValue:elseValue
      if (value.includes('__conditional:')) {
        return this.parseTopLevelConditional(value)
      }

      // Check if this is a computed expression from the IR
      // Expressions from IR look like: "Hello " + $name or $count * $price
      // They have: quoted strings AND/OR $-variables with operators between them
      // Plain strings look like: Tokens + Komponenten (no quotes, no $)
      const hasOperators =
        value.includes(' + ') ||
        value.includes(' - ') ||
        value.includes(' * ') ||
        value.includes(' / ')
      const hasQuotedParts = /^"[^"]*"/.test(value) || /" [+\-*/] /.test(value)
      const hasDollarVars = /\$[a-zA-Z_]/.test(value)
      const hasLoopVarMarkers = value.includes('__loopVar:')

      if (hasOperators && (hasQuotedParts || hasDollarVars || hasLoopVarMarkers)) {
        // This is a computed expression - replace $varName with $get("varName")
        // and __loopVar:name with just name
        return this.resolveExpressionVariables(value)
      }

      // Check for simple $-variable reference (ONLY the variable, nothing else)
      // $name, $user.name → variable
      // $discount% → needs interpolation (has suffix)
      // $12.4k, $100 → literal (currency/number)
      const simpleVarMatch = value.match(/^\$([a-zA-Z_][a-zA-Z0-9_.]*)$/)
      if (simpleVarMatch && !value.startsWith('$get(')) {
        return `$get("${simpleVarMatch[1]}")`
      }

      // String interpolation: "Hello $firstName" or "$discount%" → template literal
      // Handle $$ as escape for literal $ sign followed by variable value
      if (/\$[a-zA-Z_][a-zA-Z0-9_.]*/.test(value)) {
        const GET_PLACEHOLDER = '\x00GET\x00'
        let processed = value

        // First, handle $$varName pattern: literal $ + variable value
        // e.g., "$$price" → "$${__GET__("price")}" (placeholder to avoid re-matching)
        processed = processed.replace(
          /\$\$([a-zA-Z_][a-zA-Z0-9_.]*)/g,
          (match, varName) => `\$\${${GET_PLACEHOLDER}("${varName}")}`
        )

        // Then, convert remaining $varName to ${$get("varName")}
        // Uses negative lookahead to skip $get( which shouldn't be re-processed
        processed = processed.replace(
          /\$(?!get\()([a-zA-Z_][a-zA-Z0-9_.]*)/g,
          (match, varName) => `\${$get("${varName}")}`
        )

        // Restore placeholder
        processed = processed.replace(new RegExp(GET_PLACEHOLDER, 'g'), '$get')

        return `\`${this.escapeTemplateString(processed)}\``
      }

      // Handle $$ in strings without other variables (e.g., "$$100")
      if (value.includes('$$')) {
        return `"${this.escapeString(value.replace(/\$\$/g, '$'))}"`
      }

      // Regular string literal
      return `"${this.escapeString(value)}"`
    }
    // Number or boolean
    return String(value)
  }

  /**
   * Replace $varName patterns in an expression with $get("varName")
   * and __loopVar:name patterns with just name (unquoted variable reference)
   * e.g., "Hello " + $name → "Hello " + $get("name")
   * e.g., $count * $price → $get("count") * $get("price")
   * e.g., __loopVar:index + 1 → index + 1
   */
  private resolveExpressionVariables(expr: string): string {
    // First, replace __loopVar:name with just name (unquoted)
    // Handles user.name[0] with array indexing
    let result = expr.replace(
      /__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g,
      (match, varName) => {
        return varName
      }
    )
    // Then, replace $varName or $var.name.deep patterns (but not $12.4k or $100)
    // Also handles aggregation method calls: $tasks.sum(hours), $items.sum(data.stats.value)
    // The pattern inside parentheses allows dots for nested paths like data.stats.value
    result = result.replace(
      /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\([a-zA-Z0-9_.,\s]*\))?)/g,
      (match, varName) => {
        return `$get("${varName}")`
      }
    )
    return result
  }

  /**
   * Escape a string for use in JavaScript string literals.
   * Handles backslashes, quotes, newlines, carriage returns, tabs, and other control characters.
   */
  private escapeString(str: string | number | boolean | undefined | null): string {
    const s = String(str ?? '')
    return s
      .replace(/\\/g, '\\\\') // Backslashes first
      .replace(/"/g, '\\"') // Double quotes
      .replace(/\n/g, '\\n') // Newlines
      .replace(/\r/g, '\\r') // Carriage returns
      .replace(/\t/g, '\\t') // Tabs
      .replace(/\u2028/g, '\\u2028') // Line separator
      .replace(/\u2029/g, '\\u2029') // Paragraph separator
  }

  /**
   * Escape a template string (for backtick literals)
   * Escapes backticks and backslashes, but preserves ${...} interpolations
   */
  private escapeTemplateString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\n/g, '\\n')
  }

  /**
   * Create an EventEmitterContext for delegation to extracted event-emitter functions
   */
  private createEventEmitterContext(): EventEmitterContext {
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

  /**
   * Resolve condition for loop context: loop variables (itemVar, indexVar) stay as-is
   * because they are local JavaScript variables. Only $-prefixed data variables get $get().
   * e.g., "entry.billable" stays as "entry.billable" (local var)
   * e.g., "$config.showAll" becomes "$get('config.showAll')"
   */
  private resolveLoopCondition(condition: string, itemVar: string, indexVar: string): string {
    let result = condition

    // Handle $-prefixed data variables - wrap in $get()
    result = result.replace(
      /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
      '$get("$1")'
    )

    // Loop variables (itemVar, indexVar) and their properties are local JS variables,
    // so they stay as-is (e.g., "entry.billable" remains "entry.billable")
    return result
  }

  /**
   * Transform condition expression to use $get() for variable lookups
   * e.g., "loggedIn" → "$get("loggedIn")"
   * e.g., "isAdmin && hasPermission" → "$get("isAdmin") && $get("hasPermission")"
   * e.g., "count > 0" → "$get("count") > 0"
   * e.g., "!disabled" → "!$get("disabled")"
   * e.g., "user.role === \"admin\"" → "$get("user.role") === "admin""
   */
  private resolveConditionVariables(condition: string): string {
    // JS keywords and literals that should NOT be wrapped in $get()
    const reserved = new Set([
      'true',
      'false',
      'null',
      'undefined',
      'NaN',
      'Infinity',
      'this',
      'typeof',
      'instanceof',
      'new',
      'delete',
      'void',
      'if',
      'else',
      'return',
      'function',
      'var',
      'let',
      'const',
    ])

    // First, collect all loop variable references marked with __loopVar:
    // These should NOT be wrapped in $get() - they are function parameters
    const loopVars = new Set<string>()
    condition.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*)/g, (_, varName) => {
      // Add the base variable name (e.g., "entry" from "entry.project")
      const baseName = varName.split('.')[0]
      loopVars.add(baseName)
      return ''
    })

    // Handle __loopVar: markers - strip the prefix but keep the variable name
    let result = condition.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')

    // Convert Mirror logical operators (and/or) to JavaScript (&&/||)
    result = result.replace(/\s+and\s+/g, ' && ').replace(/\s+or\s+/g, ' || ')

    // Then handle $-prefixed variables (already explicit)
    // Only capture the variable name, not method calls (stop at parenthesis)
    // $variable.property → $get("variable.property")
    // $variable.method() → $get("variable").method() (method is handled separately)
    result = result.replace(
      /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*?)(?=\s*\(|$|[^a-zA-Z0-9_.])/g,
      (match, varPath) => {
        // Check if next char is '(' - means this is followed by method call
        // In that case, only capture up to the last dot before method
        const parts = varPath.split('.')
        if (parts.length > 1) {
          // Check if the last part is likely a method (followed by parenthesis in original)
          // Since we can't easily look ahead, we check common method names
          const methodNames = new Set([
            'toLowerCase',
            'toUpperCase',
            'includes',
            'startsWith',
            'endsWith',
            'trim',
            'split',
            'join',
            'map',
            'filter',
            'find',
            'some',
            'every',
            'reduce',
            'toString',
            'valueOf',
          ])
          const lastPart = parts[parts.length - 1]
          if (methodNames.has(lastPart)) {
            // Last part is a method - only wrap up to the property before it
            const varOnly = parts.slice(0, -1).join('.')
            return `$get("${varOnly}").${lastPart}`
          }
        }
        return `$get("${varPath}")`
      }
    )

    // Now handle bare identifiers (not already wrapped, not in quotes, not reserved)
    // This regex finds identifiers with optional dot notation
    // We use a function to check if it's reserved or a loop variable
    // The lookbehind excludes: " (in string), \w (part of word), $ (variable), . (method call), ) (after function call)
    result = result.replace(
      /(?<!["\w$.)])([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?!["\w(])/g,
      (match, identifier) => {
        const firstPart = identifier.split('.')[0]
        // Don't wrap if it's a reserved word
        if (reserved.has(firstPart)) {
          return match
        }
        // Don't wrap if it's a loop variable (marked with __loopVar:)
        if (loopVars.has(firstPart)) {
          return match
        }
        // Don't wrap if it's already wrapped in $get
        return `$get("${identifier}")`
      }
    )

    return result
  }

  /**
   * Map DSL key names to JavaScript key event values
   * Delegates to extracted event-emitter.ts
   */
  private mapKeyNameMethod(key: string): string {
    return mapKeyName(key)
  }

  private createStateMachineContext(): StateMachineEmitterContext {
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

  private emitStateMachine(varName: string, node: IRNode): void {
    emitStateMachineExtracted(this.createStateMachineContext(), varName, node)
  }

  private emitDeferredWhenWatchersMethod(): void {
    emitDeferredWhenWatchers(this.createStateMachineContext(), this.deferredWhenWatchers)
  }

  private groupByState(styles: IRStyle[]): Record<string, IRStyle[]> {
    const result: Record<string, IRStyle[]> = {}
    for (const style of styles) {
      const state = style.state || 'default'
      if (!result[state]) result[state] = []
      result[state].push(style)
    }
    return result
  }

  private collectNamedNodes(nodes: IRNode[]): IRNode[] {
    return collectNamedNodesExtracted(nodes)
  }

  private emitInitialization(): void {
    const ctx = this.createAPIEmitterContext()
    const namedNodes = this.collectNamedNodes(this.ir.nodes)
    emitInitializationExtracted(ctx, namedNodes, this.javascript)
  }
}
