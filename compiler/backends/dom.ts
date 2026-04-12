/**
 * Mirror DOM Backend
 *
 * Generates pure JavaScript DOM manipulation code.
 * Flagship backend - no framework dependencies.
 */

import type { AST, JavaScriptBlock, TokenDefinition } from '../parser/ast'
import { toIR } from '../ir'
import type { IR, IRNode, IRStyle, IREvent, IRAction, IREach, IRConditional, IRAnimation, IRZagNode, IRStateMachine, IRStateTransition, IRTable, IRTableColumn, IRItem, IRProperty, IRSlot, IRItemProperty } from '../ir/types'
import { isIRZagNode, isIRTable } from '../ir/types'
import { DOM_RUNTIME_CODE } from '../runtime/dom-runtime-string'
import { generateTheme, isThemeToken } from '../schema/theme-generator'
import type { DataFile } from '../parser/data-types'
import { dispatchZagEmitter } from './dom/zag-emitters'
import type { ZagEmitterContext } from './dom/zag-emitter-context'

// Extracted utilities
import { escapeJSString, sanitizeVarName, cssPropertyToJS, generateVarName } from './dom/utils'
import { ZAG_SLOT_NAMES, type GenerateDOMOptions } from './dom/types'
import type { EmitterContext, DeferredWhenWatcher } from './dom/emitter-context'
import { emitTable } from './dom/table-emitter'
import { emitStateMachine as emitStateMachineExtracted, emitDeferredWhenWatchers } from './dom/state-machine-emitter'
import type { StateMachineEmitterContext } from './dom/state-machine-emitter'
import { emitEachLoop as emitEachLoopExtracted, emitConditional as emitConditionalExtracted } from './dom/loop-emitter'
import type { LoopEmitterContext } from './dom/loop-emitter'
import { emitEventListener as emitEventListenerExtracted, emitTemplateEventListener as emitTemplateEventListenerExtracted, emitAction as emitActionExtracted, mapKeyName } from './dom/event-emitter'
import type { EventEmitterContext } from './dom/event-emitter'
import { emitTokens as emitTokensExtracted } from './dom/token-emitter'
import type { TokenEmitterContext } from './dom/token-emitter'

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
  private deferredWhenWatchers: Array<{ varName: string; transition: IRStateTransition; sm: IRStateMachine }> = []
  // Token lookup map for resolving token-to-token references
  private tokenMap: Map<string, string | number | boolean> = new Map()

  constructor(ir: IR, javascript?: JavaScriptBlock, astTokens: TokenDefinition[] = [], dataFiles?: DataFile[]) {
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
      setIndent: (level: number) => { this.indent = level },
      indentIn: () => { this.indent++ },
      indentOut: () => { this.indent-- },
      sanitizeVarName: (id: string) => this.sanitizeVarName(id),
      escapeString: (str) => this.escapeString(str),
      emitNode: (node: IRNode, parentVar: string) => this.emitNode(node, parentVar),
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
      setIndent: (level: number) => { this.indent = level },
      indentIn: () => { this.indent++ },
      indentOut: () => { this.indent-- },
      sanitizeVarName: (id: string) => this.sanitizeVarName(id),
      escapeString: (str) => this.escapeString(str),
      emitNode: (node: IRNode, parentVar: string) => this.emitNode(node, parentVar),
      emitStyles: (varName: string, styles) => {
        const baseStyles = styles.filter(s => !s.state)
        if (baseStyles.length > 0) {
          this.emit(`Object.assign(${varName}.style, {`)
          this.indent++
          for (const style of baseStyles) {
            this.emit(`'${style.property}': '${style.value}',`)
          }
          this.indent--
          this.emit('})')
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
      addDeferredWhenWatcher: (watcher) => this.deferredWhenWatchers.push(watcher),
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
      resolveContentValue: (value) => this.resolveContentValue(value as string | number | boolean),
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
    this.emitCreateUI()
    this.emitRuntime()
    this.emitAnimations()

    // If there's JavaScript, emit initialization with named instance exposure
    if (this.javascript) {
      this.emitInitialization()
    }

    return this.lines.join('\n')
  }

  private emitAnimations(): void {
    if (this.ir.animations.length === 0) return

    this.emit('// Register animations')
    for (const animation of this.ir.animations) {
      this.emitAnimationRegistration(animation)
    }
    this.emit('')
  }

  private emitAnimationRegistration(animation: IRAnimation): void {
    this.emit(`_runtime.registerAnimation({`)
    this.indent++
    this.emit(`name: "${animation.name}",`)
    this.emit(`easing: "${animation.easing}",`)
    if (animation.duration) {
      this.emit(`duration: ${animation.duration},`)
    }
    if (animation.roles && animation.roles.length > 0) {
      this.emit(`roles: ${JSON.stringify(animation.roles)},`)
    }
    this.emit(`keyframes: [`)
    this.indent++
    for (const keyframe of animation.keyframes) {
      this.emit(`{`)
      this.indent++
      this.emit(`time: ${keyframe.time},`)
      this.emit(`properties: [`)
      this.indent++
      for (const prop of keyframe.properties) {
        this.emit(`{ property: "${prop.property}", value: "${prop.value}"${prop.target ? `, target: "${prop.target}"` : ''} },`)
      }
      this.indent--
      this.emit(`],`)
      this.indent--
      this.emit(`},`)
    }
    this.indent--
    this.emit(`],`)
    this.indent--
    this.emit(`})`)
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
      indentIn: () => { this.indent++ },
      indentOut: () => { this.indent-- },
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

  private emitStyles(): void {
    this.emit('// Inject CSS styles')
    this.emit("const _style = document.createElement('style')")
    this.emit('_style.textContent = `')

    // Generate theme tokens from user-defined tokens
    // These are CSS custom properties used by Zag components
    const themeTokens = this.astTokens.filter(t => {
      const name = t.name.startsWith('$') ? t.name.slice(1) : t.name
      return isThemeToken(name)
    })

    if (themeTokens.length > 0) {
      const theme = generateTheme(themeTokens)
      // Emit the generated theme CSS (contains :root { ... })
      this.emitRaw(theme.css)
      this.emit('')
    }

    // Emit user-defined CSS variables (non-theme tokens)
    // Only simple tokens (with value) become CSS variables - data objects are skipped
    const customTokens = this.ir.tokens.filter(t => {
      if (t.value === undefined) return false // Skip data objects
      const name = t.name.startsWith('$') ? t.name.slice(1) : t.name
      return !isThemeToken(name)
    })

    if (customTokens.length > 0) {
      this.emit('/* User Tokens */')
      this.emit(':host, :root {')
      this.indent++
      for (const token of customTokens) {
        // Skip tokens without value (data objects)
        if (token.value === undefined) continue
        // Resolve token-to-token references (e.g., $primary.bg: $blue → #2271C1)
        let value = this.resolveTokenValueWithContext(token.value, token.name)
        // Strip $ prefix and convert dots to hyphens for valid CSS variable name
        const cssVarName = (token.name.startsWith('$') ? token.name.slice(1) : token.name)
          .replace(/\./g, '-')

        // Add px unit for numeric spacing/sizing tokens
        const needsPx = /\.(pad|gap|rad|radius|margin|size)$/.test(token.name)
        if (needsPx && typeof value === 'number') {
          value = `${value}px`
        } else if (needsPx && typeof value === 'string' && /^\d+$/.test(value)) {
          value = `${value}px`
        }

        this.emit(`--${cssVarName}: ${value};`)
      }
      this.indent--
      this.emit('}')
      this.emit('')
    }

    // Base reset
    this.emit('.mirror-root * {')
    this.emit('  box-sizing: border-box;')
    this.emit('}')

    // Animation keyframes for presets (pulse, bounce, shake, spin, etc.)
    this.emitAnimationKeyframes()

    // Emit CSS for system states (hover, focus, active, disabled)
    this.emitSystemStateCSS()

    this.emit('`')
    this.emit('_root.appendChild(_style)')
    this.emit('')
  }

  private emitAnimationKeyframes(): void {
    // Animation keyframes for built-in presets
    // These match the animation names used in IR (compiler/ir/index.ts)
    this.emit('')
    this.emit('/* Animation Keyframes */')

    // fade-in / fade-out
    this.emit('@keyframes mirror-fade-in { from { opacity: 0; } to { opacity: 1; } }')
    this.emit('@keyframes mirror-fade-out { from { opacity: 1; } to { opacity: 0; } }')

    // slide-in / slide-out (default: from left)
    this.emit('@keyframes mirror-slide-in { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }')
    this.emit('@keyframes mirror-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-20px); opacity: 0; } }')

    // scale-in / scale-out
    this.emit('@keyframes mirror-scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }')
    this.emit('@keyframes mirror-scale-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }')

    // bounce (attention-grabbing, loops)
    this.emit('@keyframes mirror-bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 60% { transform: translateY(-5px); } }')

    // pulse (attention-grabbing, loops)
    this.emit('@keyframes mirror-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }')

    // shake (error feedback)
    this.emit('@keyframes mirror-shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }')

    // spin (loading indicator, loops)
    this.emit('@keyframes mirror-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }')
  }

  private emitSystemStateCSS(): void {
    // Collect all system states from nodes
    const systemStates = ['hover', 'focus', 'active', 'disabled']

    for (const node of this.ir.nodes) {
      this.emitNodeStateCSS(node, systemStates)
    }
  }

  private emitNodeStateCSS(node: IRNode, systemStates: string[]): void {
    const stateStyles = node.styles.filter(s => s.state && systemStates.includes(s.state))

    if (stateStyles.length > 0) {
      const byState = this.groupByState(stateStyles)

      for (const [state, styles] of Object.entries(byState)) {
        const pseudoClass = state === 'disabled' ? '[disabled]' : `:${state}`
        this.emit('')
        this.emit(`[data-mirror-id="${node.id}"]${pseudoClass} {`)
        this.indent++
        for (const style of styles) {
          this.emit(`${style.property}: ${style.value} !important;`)
        }
        this.indent--
        this.emit('}')
      }
    }

    // Recurse into children
    for (const child of node.children) {
      this.emitNodeStateCSS(child, systemStates)
    }
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
    this.emit('')

    // Inject CSS (variables + system state styles)
    this.emitStyles()

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

  private emitNode(node: IRNode, parentVar: string, isMainRoot = false): void {
    // Skip definitions - they are not rendered, only instances are
    if (node.isDefinition) {
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

    // Handle Table components (extracted to table-emitter.ts)
    if (isIRTable(node)) {
      const ctx = this.createEmitterContext()
      emitTable(ctx, node, parentVar)
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

    this.emit(`// ${node.name || node.tag}`)
    this.emit(`const ${varName} = document.createElement('${node.tag}')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    // Mark main root element (cannot be moved via drag-drop)
    if (isMainRoot) {
      this.emit(`${varName}.dataset.mirrorRoot = 'true'`)
    }
    // Component name for breadcrumb navigation
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Instance name for external access and state references
    if (node.instanceName) {
      this.emit(`_elements['${node.instanceName}'] = ${varName}`)
      // Set data-mirror-name for watchStates to find this element by name
      this.emit(`${varName}.dataset.mirrorName = '${node.instanceName}'`)
    }

    // Detect if this is an icon or slot element (based on primitive type)
    const isIcon = node.primitive === 'icon'
    const isSlot = node.primitive === 'slot'
    let iconName: string | null = null

    // Set HTML properties
    for (const prop of node.properties) {
      if (prop.name === 'textContent') {
        // For icons, store the name for loading instead of setting textContent
        if (isIcon && typeof prop.value === 'string') {
          iconName = prop.value
        } else if (isSlot) {
          // Skip textContent for slots - we create a label element instead below
        } else {
          // Handle $-variables: $name → $get('name')
          const value = this.resolveContentValue(prop.value)
          this.emit(`${varName}.textContent = ${value}`)

          // Register text binding for reactive updates if value contains $get()
          // Extract binding paths from $get("path") calls
          const getMatches = value.match(/\$get\("([^"]+)"\)/g)
          if (getMatches) {
            // Store the expression template for re-evaluation
            // Note: value is already valid JavaScript (either $get("...") or a template literal)
            // so we don't need to escape it further
            this.emit(`${varName}._textTemplate = () => ${value}`)

            for (const match of getMatches) {
              const pathMatch = match.match(/\$get\("([^"]+)"\)/)
              if (pathMatch) {
                const bindingPath = pathMatch[1]
                this.emit(`_runtime.bindText(${varName}, "${bindingPath}")`)
              }
            }
          }
        }
      } else if (prop.name === 'disabled' || prop.name === 'hidden') {
        this.emit(`${varName}.${prop.name} = ${prop.value}`)
      } else {
        const value = typeof prop.value === 'string' ? `"${this.escapeString(String(prop.value))}"` : prop.value
        this.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
      }
    }

    // Load icon from CDN if this is an icon element
    if (isIcon && iconName) {
      this.emit(`// Icon default styles`)
      this.emit(`Object.assign(${varName}.style, {`)
      this.indent++
      this.emit(`'display': 'inline-flex',`)
      this.emit(`'align-items': 'center',`)
      this.emit(`'justify-content': 'center',`)
      this.emit(`'flex-shrink': '0',`)
      this.emit(`'line-height': '0',`)
      this.indent--
      this.emit(`})`)
      this.emit(`// Load Lucide icon`)
      this.emit(`_runtime.loadIcon(${varName}, "${this.escapeString(iconName)}")`)
    }

    // Handle Slot primitive - visual placeholder for drag & drop
    if (isSlot) {
      // Get slot label from textContent property
      const labelProp = node.properties.find(p => p.name === 'textContent')
      const slotLabel = labelProp ? String(labelProp.value) : 'Slot'

      this.emit(`// Slot placeholder`)
      this.emit(`${varName}.dataset.mirrorSlot = 'true'`)
      this.emit(`${varName}.dataset.slot = "${this.escapeString(slotLabel)}"`)
      this.emit(`${varName}.dataset.slotLabel = "${this.escapeString(slotLabel)}"`)
      this.emit(`${varName}.classList.add('mirror-slot')`)

      // Create label element
      this.emit(`const ${varName}_label = document.createElement('span')`)
      this.emit(`${varName}_label.className = 'mirror-slot-label'`)
      this.emit(`${varName}_label.textContent = "${this.escapeString(slotLabel)}"`)
      this.emit(`${varName}.appendChild(${varName}_label)`)
    }

    // Handle Chart primitive - create Chart.js chart
    const isChart = node.primitive === 'chart'
    if (isChart) {
      this.emit(`// Chart initialization`)
      this.emit(`${varName}.dataset.mirrorChart = 'true'`)

      // Extract chart config from properties
      const chartType = node.properties.find(p => p.name === 'chartType')?.value || 'line'
      const dataBinding = node.properties.find(p => p.name === 'data')?.value
      const xField = node.properties.find(p => p.name === 'xField')?.value
      const yField = node.properties.find(p => p.name === 'yField')?.value
      const colors = node.properties.find(p => p.name === 'colors')?.value
      const title = node.properties.find(p => p.name === 'title')?.value
      const legend = node.properties.find(p => p.name === 'legend')?.value
      const stacked = node.properties.find(p => p.name === 'stacked')?.value
      const fill = node.properties.find(p => p.name === 'fill')?.value
      const tension = node.properties.find(p => p.name === 'tension')?.value
      const grid = node.properties.find(p => p.name === 'grid')?.value
      const axes = node.properties.find(p => p.name === 'axes')?.value

      // Build chart config object
      this.emit(`const ${varName}_config = {`)
      this.indent++
      this.emit(`type: '${chartType}',`)

      // Resolve data - either from $variable or inline
      if (dataBinding && String(dataBinding).startsWith('$')) {
        const dataPath = String(dataBinding).slice(1) // Remove $
        this.emit(`data: $get('${dataPath}'),`)
      } else if (dataBinding) {
        this.emit(`data: ${JSON.stringify(dataBinding)},`)
      } else {
        this.emit(`data: [],`)
      }

      if (xField) this.emit(`xField: '${xField}',`)
      if (yField) this.emit(`yField: '${yField}',`)
      if (colors) this.emit(`colors: ${JSON.stringify(String(colors).split(','))},`)
      if (title) this.emit(`title: '${this.escapeString(String(title))}',`)
      if (legend !== undefined) this.emit(`legend: ${legend},`)
      if (stacked !== undefined) this.emit(`stacked: ${stacked},`)
      if (fill !== undefined) this.emit(`fill: ${fill},`)
      if (tension !== undefined) this.emit(`tension: ${tension},`)
      if (grid !== undefined) this.emit(`grid: ${grid},`)
      if (axes !== undefined) this.emit(`axes: ${axes},`)

      // Add chart slots configuration
      const chartSlots = node.properties.find(p => p.name === 'chartSlots')?.value
      if (chartSlots) {
        this.emit(`slots: ${chartSlots},`)
      }

      this.indent--
      this.emit(`}`)

      // Call runtime to create the chart
      this.emit(`_runtime.createChart(${varName}, ${varName}_config)`)
    }

    // Apply base styles
    const baseStyles = node.styles.filter(s => !s.state)
    if (baseStyles.length > 0) {
      this.emit(`Object.assign(${varName}.style, {`)
      this.indent++
      for (const style of baseStyles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Set data-layout for drop strategy detection
    // This is the primary way to identify layout type in the DOM
    if (node.layoutType) {
      this.emit(`${varName}.dataset.layout = '${node.layoutType}'`)
    }

    // Mark abs containers (fallback for older IR or when layoutType not set)
    // We detect this by checking if the element has position: relative but NOT flex/grid display
    // (flex containers also need position: relative for stacked layouts, so we need to be careful)
    const hasPositionRelative = baseStyles.some(s => s.property === 'position' && s.value === 'relative')
    const hasFlexDisplay = baseStyles.some(s => s.property === 'display' && (s.value === 'flex' || s.value === 'grid'))
    if (hasPositionRelative && !hasFlexDisplay && !node.layoutType) {
      this.emit(`${varName}.dataset.mirrorAbs = 'true'`)
    }

    // Store state styles for runtime (excluding CSS-handled system states)
    const cssStates = new Set(['hover', 'focus', 'active', 'disabled'])
    const behaviorStyles = node.styles.filter(s => s.state && !cssStates.has(s.state))
    if (behaviorStyles.length > 0) {
      this.emit(`${varName}._stateStyles = {`)
      this.indent++
      const byState = this.groupByState(behaviorStyles)
      for (const [state, styles] of Object.entries(byState)) {
        this.emit(`'${state}': {`)
        this.indent++
        for (const style of styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('},')
      }
      this.indent--
      this.emit('}')
    }

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
    if (node.visibleWhen) {
      this.emit(`${varName}._visibleWhen = '${node.visibleWhen}'`)
      this.emit(`// Initially hidden until parent state matches`)
      this.emit(`${varName}.style.display = 'none'`)
    }

    // Selection binding - for exclusive() to update a variable with selected content
    if (node.selection) {
      const selectionVar = node.selection.startsWith('$') ? node.selection.slice(1) : node.selection
      this.emit(`${varName}._selectionBinding = '${selectionVar}'`)
      // Set data-selection so runtime can find this container when exclusive() fires
      this.emit(`${varName}.dataset.selection = '${selectionVar}'`)
    }

    // Bind - track active exclusive() child content in a variable
    if (node.bind) {
      const bindVar = node.bind.startsWith('$') ? node.bind.slice(1) : node.bind
      // Set data-bind so runtime can find this container when exclusive() fires
      this.emit(`${varName}.dataset.bind = '${bindVar}'`)
    }

    // Component name (for navigation targets)
    if (node.name) {
      this.emit(`${varName}.dataset.component = '${node.name}'`)
      // Also set data-slot for known Zag slot names (e.g., CloseTrigger inside Dialog)
      // This allows the runtime to find these elements via [data-slot="CloseTrigger"]
      if (ZAG_SLOT_NAMES.has(node.name)) {
        this.emit(`${varName}.dataset.slot = '${node.name}'`)
      }
    }

    // Route (for navigation)
    if (node.route) {
      this.emit(`${varName}.dataset.route = '${node.route}'`)
    }

    // Keyboard navigation for form containers
    if (node.keyboardNav) {
      this.emit(`// Enable keyboard navigation (Enter to next, Escape to blur)`)
      this.emit(`_runtime.setupKeyboardNav(${varName})`)
    }

    // Add event listeners
    // Check if there are keyboard events and make element focusable
    const hasKeyboardEvents = node.events.some(e => e.key || e.name === 'keydown' || e.name === 'keyup')
    if (hasKeyboardEvents) {
      this.emit(`${varName}.setAttribute('tabindex', '0')`)
    }
    for (const event of node.events) {
      // Skip events that are fully handled by state machine transitions
      // These have only isBuiltinStateFunction actions (toggle, exclusive, cycle)
      const allActionsAreStateMachine = event.actions.every(a => a.isBuiltinStateFunction)
      if (allActionsAreStateMachine && node.stateMachine) {
        continue  // State machine will handle this event via transitions
      }
      this.emitEventListener(varName, event)
    }

    // Two-way data binding for input elements
    if (node.valueBinding) {
      const bindingPath = node.valueBinding
      this.emit(`// Two-way data binding: ${bindingPath}`)
      // Set initial value from data
      this.emit(`${varName}.value = $get("${bindingPath}") ?? ""`)
      // Add input event listener for updates
      this.emit(`${varName}.addEventListener('input', (e) => {`)
      this.indent++
      this.emit(`$set("${bindingPath}", e.target.value)`)
      this.indent--
      this.emit(`})`)
      // Register binding for reactive updates
      this.emit(`_runtime.bindValue(${varName}, "${bindingPath}")`)
    }

    // Recursively emit children
    // BUT: Skip default children if the node starts in a non-default state that has its own children
    // This implements Figma Variants behavior - each state can have completely different children
    const sm = node.stateMachine
    const effectiveInitial = node.initialState || sm?.initial || 'default'
    const initialStateHasChildren = sm?.states[effectiveInitial]?.children && sm.states[effectiveInitial].children!.length > 0
    const shouldSkipDefaultChildren = sm && effectiveInitial !== 'default' && initialStateHasChildren

    if (!shouldSkipDefaultChildren) {
      for (const child of node.children) {
        this.emitNode(child, varName)
      }
    }

    // Auto-set parent to relative if this element is absolute positioned
    // Only if parent doesn't already have position/layout set
    const hasPositionAbsolute = baseStyles.some(s => s.property === 'position' && s.value === 'absolute')
    if (hasPositionAbsolute && parentVar !== '_root') {
      this.emit(`// Auto-set parent to relative for absolute child`)
      this.emit(`if (${parentVar}.style.position !== 'relative' && ${parentVar}.style.position !== 'absolute' && ${parentVar}.style.position !== 'fixed') {`)
      this.indent++
      this.emit(`${parentVar}.style.position = 'relative'`)
      // Only set mirrorAbs if parent doesn't have explicit data-layout
      this.emit(`if (!${parentVar}.dataset.layout) ${parentVar}.dataset.mirrorAbs = 'true'`)
      this.indent--
      this.emit(`}`)
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')
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
      indentIn: () => { this.indent++ },
      indentOut: () => { this.indent-- },
      sanitizeVarName: (id: string) => this.sanitizeVarName(id),
      resolveConditionVariables: (condition: string) => this.resolveConditionVariables(condition),
      emitEachTemplateNode: (node: IRNode, parentVar: string, itemVar: string, indexVar: string) => {
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

    // Route to specialized emitters for complex components (legacy - being migrated)
    // tabs: migrated to zag-emitters.ts
    // switch: migrated to zag-emitters.ts
    // datepicker: migrated to zag-emitters.ts
    // date-input: migrated to zag-emitters.ts
    // number-input: migrated to zag-emitters.ts
    // tags-input: migrated to zag-emitters.ts
    // editable: migrated to zag-emitters.ts
    // checkbox: migrated to zag-emitters.ts
    // accordion: migrated to zag-emitters.ts
    if (node.zagType === 'listbox') {
      this.emitListboxComponent(node, parentVar)
      return
    }
    // select: migrated to zag-emitters.ts
    // radio-group: migrated to zag-emitters.ts
    // slider: migrated to zag-emitters.ts
    // pin-input: migrated to zag-emitters.ts
    // password-input: migrated to zag-emitters.ts
    // circular-progress: migrated to zag-emitters.ts
    // file-upload: migrated to zag-emitters.ts
    // carousel: migrated to zag-emitters.ts
    // steps: migrated to zag-emitters.ts
    // pagination: migrated to zag-emitters.ts
    // tree-view: migrated to zag-emitters.ts
    // sidenav: migrated to zag-emitters.ts
    // segmented-control: migrated to zag-emitters.ts
    // toggle-group: migrated to zag-emitters.ts
    // Group 5: Overlays
    // collapsible, tooltip, popover, hover-card, dialog: migrated to zag-emitters.ts
    if (node.zagType === 'form') {
      this.emitFormComponent(node, parentVar)
      return
    }

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
                this.emit(`${itemVar}.style.padding = '${padValues[0]}px ${padValues[1]}px ${padValues[2]}px ${padValues[3]}px'`)
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

  // emitTabsComponent: migrated to compiler/backends/dom/zag-emitters.ts
  // emitSwitchComponent: migrated to compiler/backends/dom/zag-emitters.ts
  // emitDatePickerComponent: migrated to compiler/backends/dom/zag-emitters.ts

  // emitDateInputComponent: migrated to compiler/backends/dom/zag-emitters.ts

  // emitNumberInputComponent: migrated to compiler/backends/dom/zag-emitters.ts

  // emitTagsInputComponent: migrated to compiler/backends/dom/zag-emitters.ts

  // emitEditableComponent: migrated to compiler/backends/dom/zag-emitters.ts

  // emitCheckboxComponent: migrated to compiler/backends/dom/zag-emitters.ts

  // emitAccordionComponent: migrated to compiler/backends/dom/zag-emitters.ts

  private emitListboxComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Listbox Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'listbox'`)
    this.emit(`${varName}.setAttribute('role', 'listbox')`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'listbox',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.emit(`items: ${JSON.stringify(node.items.map((item: IRItem) => ({
      value: item.value,
      label: item.label,
      disabled: item.disabled
    })))},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Apply root styles
    const rootSlot = node.slots['Root']
    if (rootSlot?.styles && rootSlot.styles.length > 0) {
      this.emit(`Object.assign(${varName}.style, {`)
      this.indent++
      for (const style of rootSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Create Label if provided
    const labelSlot = node.slots['Label']
    if (labelSlot && node.machineConfig.label) {
      const labelVar = `${varName}_label`
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(String(node.machineConfig.label))}'`)
      if (labelSlot.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
    }

    // Create Content container
    const contentVar = `${varName}_content`
    const contentSlot = node.slots['Content']
    this.emit(`const ${contentVar} = document.createElement('div')`)
    this.emit(`${contentVar}.dataset.slot = 'Content'`)
    if (contentSlot?.styles && contentSlot.styles.length > 0) {
      this.emit(`Object.assign(${contentVar}.style, {`)
      this.indent++
      for (const style of contentSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Create items
    const itemSlot = node.slots['Item']
    const textSlot = node.slots['ItemText']
    const indicatorSlot = node.slots['ItemIndicator']

    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i]
      const itemVar = `${varName}_item${i}`
      const itemValue = item.value || `item-${i}`

      // Item container
      this.emit(`// Listbox Item: ${item.label || itemValue}`)
      this.emit(`const ${itemVar} = document.createElement('div')`)
      this.emit(`${itemVar}.dataset.slot = 'Item'`)
      this.emit(`${itemVar}.dataset.value = '${this.escapeString(itemValue)}'`)
      this.emit(`${itemVar}.setAttribute('role', 'option')`)
      this.emit(`${itemVar}.setAttribute('tabindex', '${i === 0 ? "0" : "-1"}')`)
      if (item.disabled) {
        this.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
        this.emit(`${itemVar}.setAttribute('aria-disabled', 'true')`)
      }
      if (itemSlot?.styles && itemSlot.styles.length > 0) {
        this.emit(`Object.assign(${itemVar}.style, {`)
        this.indent++
        for (const style of itemSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }

      // Item indicator (checkmark for selected)
      const indicatorVar = `${itemVar}_indicator`
      this.emit(`const ${indicatorVar} = document.createElement('span')`)
      this.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
      // Icon can be customized per-item or globally via machineConfig
      const itemIcon = item.icon || node.machineConfig.icon || 'check'
      this.emit(`${indicatorVar}.dataset.icon = '${this.escapeString(String(itemIcon))}'`)
      if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
        this.emit(`Object.assign(${indicatorVar}.style, {`)
        this.indent++
        for (const style of indicatorSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${itemVar}.appendChild(${indicatorVar})`)

      // Item text
      const textVar = `${itemVar}_text`
      this.emit(`const ${textVar} = document.createElement('span')`)
      this.emit(`${textVar}.dataset.slot = 'ItemText'`)
      this.emit(`${textVar}.textContent = '${this.escapeString(item.label || itemValue)}'`)
      if (textSlot?.styles && textSlot.styles.length > 0) {
        this.emit(`Object.assign(${textVar}.style, {`)
        this.indent++
        for (const style of textSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${itemVar}.appendChild(${textVar})`)

      // Render item children if any
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          this.emitNode(child, itemVar)
        }
      }

      this.emit(`${contentVar}.appendChild(${itemVar})`)
      this.emit('')
    }

    this.emit(`${varName}.appendChild(${contentVar})`)

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Listbox via runtime
    this.emit(`// Initialize Listbox`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initListboxComponent) {`)
    this.indent++
    this.emit(`_runtime.initListboxComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  // emitSelectComponent: migrated to compiler/backends/dom/zag-emitters.ts
  // emitRadioGroupComponent: migrated to compiler/backends/dom/zag-emitters.ts
  // emitSliderComponent: migrated to compiler/backends/dom/zag-emitters.ts

  // emitPinInputComponent: migrated to zag-emitters.ts
  // emitPasswordInputComponent: migrated to zag-emitters.ts
  // emitStepsComponent: migrated to zag-emitters.ts
  // emitPaginationComponent: migrated to zag-emitters.ts

  // emitTreeViewComponent: migrated to zag-emitters.ts
  // emitSideNavComponent: migrated to compiler/backends/dom/zag-emitters.ts
  // emitSideNavItems: migrated to compiler/backends/dom/zag-emitters.ts

  // emitSegmentedControlComponent: migrated to zag-emitters.ts
  // emitToggleGroupComponent: migrated to zag-emitters.ts

  // =========================================================================
  // GROUP 5: OVERLAYS - All migrated to zag-emitters.ts
  // =========================================================================
  // emitCollapsibleComponent: migrated to zag-emitters.ts
  // emitTooltipComponent: migrated to zag-emitters.ts
  // emitPopoverComponent: migrated to zag-emitters.ts
  // emitHoverCardComponent: migrated to zag-emitters.ts
  // emitDialogComponent: migrated to zag-emitters.ts

  private emitFormComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)
    const collectionName = (node.machineConfig?.collection as string) || ''
    const normalizedCollection = collectionName.startsWith('$') ? collectionName.slice(1) : collectionName

    this.emit(`// Form Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('form')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'form'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }
    if (normalizedCollection) {
      this.emit(`${varName}.dataset.collection = '${normalizedCollection}'`)
    }
    this.emit('')

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'form',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`collection: '${normalizedCollection}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Apply form styles
    const rootSlot = node.slots['Root']
    if (rootSlot?.styles && rootSlot.styles.length > 0) {
      this.emit(`Object.assign(${varName}.style, {`)
      this.indent++
      for (const style of rootSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
      this.emit('')
    }

    // Process Field items
    const items = node.items || []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const fieldName = (item.name as string) || `field_${i}`
      const fieldLabel = (item.label as string) || this.formatFieldLabel(fieldName)
      const fieldPlaceholder = (item.placeholder as string) || ''
      const fieldType = (item.display as string) || 'text'
      const isMultiline = item.multiline === true
      const isRequired = item.required === true

      const fieldVar = `${varName}_field_${i}`
      const labelVar = `${fieldVar}_label`
      const inputVar = `${fieldVar}_input`

      this.emit(`// Field: ${fieldName}`)
      this.emit(`const ${fieldVar} = document.createElement('div')`)
      this.emit(`${fieldVar}.dataset.slot = 'Field'`)
      this.emit(`${fieldVar}.dataset.fieldName = '${this.escapeString(fieldName)}'`)

      // Apply field slot styles if defined
      const fieldSlot = node.slots['Field']
      if (fieldSlot?.styles && fieldSlot.styles.length > 0) {
        this.emit(`Object.assign(${fieldVar}.style, {`)
        this.indent++
        for (const style of fieldSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }

      // Label
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'FieldLabel'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(fieldLabel)}'`)
      this.emit(`${labelVar}.htmlFor = '${node.id}_${fieldName}'`)
      this.emit(`${fieldVar}.appendChild(${labelVar})`)

      // Input element
      if (isMultiline) {
        this.emit(`const ${inputVar} = document.createElement('textarea')`)
      } else if (fieldType === 'checkbox' || fieldType === 'switch') {
        this.emit(`const ${inputVar} = document.createElement('input')`)
        this.emit(`${inputVar}.type = 'checkbox'`)
      } else if (fieldType === 'number' || fieldType === 'slider') {
        this.emit(`const ${inputVar} = document.createElement('input')`)
        this.emit(`${inputVar}.type = 'number'`)
      } else {
        this.emit(`const ${inputVar} = document.createElement('input')`)
        this.emit(`${inputVar}.type = 'text'`)
      }

      this.emit(`${inputVar}.id = '${node.id}_${fieldName}'`)
      this.emit(`${inputVar}.name = '${this.escapeString(fieldName)}'`)
      this.emit(`${inputVar}.dataset.slot = 'FieldInput'`)
      if (fieldPlaceholder) {
        this.emit(`${inputVar}.placeholder = '${this.escapeString(fieldPlaceholder)}'`)
      }
      if (isRequired) {
        this.emit(`${inputVar}.required = true`)
      }

      // Apply FieldInput slot styles
      const inputSlot = node.slots['FieldInput']
      if (inputSlot?.styles && inputSlot.styles.length > 0) {
        this.emit(`Object.assign(${inputVar}.style, {`)
        this.indent++
        for (const style of inputSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }

      this.emit(`${fieldVar}.appendChild(${inputVar})`)

      // Error span
      const errorVar = `${fieldVar}_error`
      this.emit(`const ${errorVar} = document.createElement('span')`)
      this.emit(`${errorVar}.dataset.slot = 'FieldError'`)
      this.emit(`${errorVar}.style.display = 'none'`)
      this.emit(`${fieldVar}.appendChild(${errorVar})`)

      this.emit(`${varName}.appendChild(${fieldVar})`)
      this.emit('')
    }

    // Actions slot
    const actionsSlot = node.slots['Actions']
    if (actionsSlot) {
      const actionsVar = `${varName}_actions`
      this.emit(`// Actions`)
      this.emit(`const ${actionsVar} = document.createElement('div')`)
      this.emit(`${actionsVar}.dataset.slot = 'Actions'`)
      if (actionsSlot.styles && actionsSlot.styles.length > 0) {
        this.emit(`Object.assign(${actionsVar}.style, {`)
        this.indent++
        for (const style of actionsSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }

      // Emit Actions slot children
      const actionsChildren = actionsSlot.children || []
      for (const child of actionsChildren) {
        this.emitNode(child as IRNode, actionsVar)
      }

      this.emit(`${varName}.appendChild(${actionsVar})`)
      this.emit('')
    }

    // Prevent default form submission
    this.emit(`${varName}.addEventListener('submit', function(e) { e.preventDefault() })`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Form via runtime
    this.emit(`// Initialize Form`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initFormComponent) {`)
    this.indent++
    this.emit(`_runtime.initFormComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private formatFieldLabel(name: string): string {
    // Convert camelCase or snake_case to Title Case
    return name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
  }

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
        const value = typeof prop.value === 'string' ? `"${this.escapeString(prop.value)}"` : prop.value
        this.emit(`${varName}.textContent = ${value}`)
      } else if (prop.name === 'disabled' || prop.name === 'hidden') {
        this.emit(`${varName}.${prop.name} = ${prop.value}`)
      } else {
        const value = typeof prop.value === 'string' ? `"${this.escapeString(String(prop.value))}"` : prop.value
        this.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
      }
    }

    // Apply base styles
    const baseStyles = node.styles.filter(s => !s.state)
    if (baseStyles.length > 0) {
      this.emit(`Object.assign(${varName}.style, {`)
      this.indent++
      for (const style of baseStyles) {
        this.emit(`'${style.property}': '${style.value}',`)
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
        const iconSize = iconSizeProp?.value || node.styles.find(s => s.property === 'fontSize')?.value || '16'
        const iconColor = iconColorProp?.value || node.styles.find(s => s.property === 'color')?.value || 'currentColor'
        const iconWeight = iconWeightProp?.value || node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
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
        continue  // State machine will handle this event via transitions
      }
      this.emitEventListener(varName, event)
    }

    // Recursively emit children
    for (const child of node.children) {
      this.emitConditionalTemplateNode(child, varName)
    }

    this.emit(`${parentVar}.appendChild(${varName})`)
  }

  private emitEachTemplateNode(node: IRNode, parentVar: string, itemVar: string, indexVar: string = 'index'): void {
    const varName = this.sanitizeVarName(node.id) + '_tpl'

    this.emit(`const ${varName} = document.createElement('${node.tag}')`)
    // Index appended for uniqueness: node-5[0], node-5[1], etc.
    this.emit(`${varName}.dataset.mirrorId = '${node.id}[' + ${indexVar} + ']'`)
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
        const iconSize = iconSizeProp?.value || node.styles.find(s => s.property === 'fontSize')?.value || '16'
        const iconColor = iconColorProp?.value || node.styles.find(s => s.property === 'color')?.value || 'currentColor'
        const iconWeight = iconWeightProp?.value || node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
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
  private emitNestedEachLoop(each: IREach, parentVar: string, outerItemVar: string, outerIndexVar: string): void {
    const containerId = this.sanitizeVarName(each.id)
    const innerItemVar = each.itemVar.startsWith('$') ? each.itemVar.slice(1) : each.itemVar
    const innerIndexVar = each.indexVar ? (each.indexVar.startsWith('$') ? each.indexVar.slice(1) : each.indexVar) : 'index'
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

  private resolveTemplateValue(value: string | number | boolean, itemVar: string, indexVar: string = 'index'): string {
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
        resolved = resolved.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g, '$get("$1")')
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
   * Emit template event listener for loop items
   * Delegates to extracted event-emitter.ts
   */
  private emitTemplateEventListener(varName: string, event: IREvent, itemVar: string): void {
    const ctx = this.createEventEmitterContext()
    emitTemplateEventListenerExtracted(
      ctx,
      varName,
      event,
      itemVar,
      (action, currentVar, item) => this.emitTemplateAction(action, currentVar, item)
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
    emitEventListenerExtracted(
      ctx,
      varName,
      event,
      (action, currentVar) => this.emitAction(action, currentVar)
    )
  }

  /**
   * Emit action call
   * Delegates to extracted event-emitter.ts
   */
  private emitAction(action: IRAction, currentVar: string): void {
    // Function call syntax: toggle(), exclusive(), show(Menu), animate(FadeIn), customFn()
    if (action.isFunctionCall) {
      if (action.isBuiltinStateFunction) {
        // Built-in state functions: toggle(), cycle() (alias), exclusive()
        switch (action.type) {
          case 'toggle':
          case 'cycle':  // cycle() is now an alias for toggle()
            // toggle() handles both binary (1 state) and cycle (2+ states)
            if (action.args && action.args.length > 0) {
              const states = action.args.map(s => `'${s}'`).join(', ')
              this.emit(`_runtime.stateMachineToggle(${currentVar}, [${states}])`)
            } else {
              this.emit(`_runtime.stateMachineToggle(${currentVar})`)
            }
            break
          case 'exclusive':
            // exclusive() - deselect siblings and transition to first custom state
            this.emit(`_runtime.exclusiveTransition(${currentVar}, Object.keys(${currentVar}._stateMachine?.states || {}).find(s => s !== 'default') || 'active')`)
            break
        }
      } else {
        // Known runtime functions or custom functions
        const fnName = action.type
        switch (fnName) {
          case 'show':
            if (action.args && action.args.length > 0) {
              this.emit(`_runtime.show(_elements['${action.args[0]}'])`)
            } else {
              this.emit(`_runtime.show(${currentVar})`)
            }
            break
          case 'hide':
            if (action.args && action.args.length > 0) {
              this.emit(`_runtime.hide(_elements['${action.args[0]}'])`)
            } else {
              this.emit(`_runtime.hide(${currentVar})`)
            }
            break
          case 'close':
            if (action.args && action.args.length > 0) {
              this.emit(`_runtime.close(_elements['${action.args[0]}'])`)
            } else {
              this.emit(`_runtime.close(${currentVar})`)
            }
            break
          case 'select':
            if (action.args?.[0] === 'highlighted') {
              this.emit(`_runtime.selectHighlighted(${currentVar})`)
            } else if (action.args && action.args.length > 0) {
              this.emit(`_runtime.select(_elements['${action.args[0]}'])`)
            } else {
              this.emit(`_runtime.select(${currentVar})`)
            }
            break
          case 'deselect':
            if (action.args && action.args.length > 0) {
              this.emit(`_runtime.deselect(_elements['${action.args[0]}'])`)
            } else {
              this.emit(`_runtime.deselect(${currentVar})`)
            }
            break
          case 'highlight':
            if (action.args?.[0] === 'next') {
              this.emit(`_runtime.highlightNext(${currentVar})`)
            } else if (action.args?.[0] === 'prev') {
              this.emit(`_runtime.highlightPrev(${currentVar})`)
            } else if (action.args?.[0] === 'first') {
              this.emit(`_runtime.highlightFirst(${currentVar})`)
            } else if (action.args?.[0] === 'last') {
              this.emit(`_runtime.highlightLast(${currentVar})`)
            } else if (action.args && action.args.length > 0) {
              this.emit(`_runtime.highlight(_elements['${action.args[0]}'])`)
            } else {
              this.emit(`_runtime.highlight(${currentVar})`)
            }
            break
          case 'activate':
            if (action.args && action.args.length > 0) {
              this.emit(`_runtime.activate(_elements['${action.args[0]}'])`)
            } else {
              this.emit(`_runtime.activate(${currentVar})`)
            }
            break
          case 'deactivate':
            if (action.args && action.args.length > 0) {
              this.emit(`_runtime.deactivate(_elements['${action.args[0]}'])`)
            } else {
              this.emit(`_runtime.deactivate(${currentVar})`)
            }
            break
          case 'navigate':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              const isPageRoute = /^[a-z]/.test(target)
              if (isPageRoute) {
                this.emit(`_runtime.navigateToPage('${target}', ${currentVar})`)
              } else {
                this.emit(`_runtime.navigate('${target}', ${currentVar})`)
              }
            }
            break
          case 'animate':
            if (action.args && action.args.length > 0) {
              const animationName = action.args[0]
              if (action.args.length > 1) {
                // Multiple targets or stagger
                const restArgs = action.args.slice(1)
                const staggerMatch = restArgs.find(a => a.startsWith('stagger'))
                if (staggerMatch) {
                  const staggerValue = staggerMatch.replace('stagger', '').trim() || '100'
                  const elemTargets = restArgs.filter(a => !a.startsWith('stagger')).map(t => `_elements['${t}']`).join(', ')
                  this.emit(`_runtime.animate('${animationName}', [${elemTargets}], { stagger: ${staggerValue} })`)
                } else {
                  const targets = restArgs.map(t => `_elements['${t}']`).join(', ')
                  this.emit(`_runtime.animate('${animationName}', [${targets}])`)
                }
              } else {
                this.emit(`_runtime.animate('${animationName}', ${currentVar})`)
              }
            }
            break
          case 'setState':
            if (action.args && action.args.length >= 2) {
              this.emit(`_runtime.setState(_elements['${action.args[0]}'], '${action.args[1]}')`)
            } else if (action.args && action.args.length === 1) {
              this.emit(`_runtime.setState(${currentVar}, '${action.args[0]}')`)
            }
            break
          // Overlay & Positioning actions
          case 'showBelow':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              const offset = action.args[1] || '4'
              this.emit(`_runtime.showBelow(_elements['${target}'] || '${target}', ${currentVar}, ${offset})`)
            }
            break
          case 'showAbove':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              const offset = action.args[1] || '4'
              this.emit(`_runtime.showAbove(_elements['${target}'] || '${target}', ${currentVar}, ${offset})`)
            }
            break
          case 'showLeft':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              const offset = action.args[1] || '4'
              this.emit(`_runtime.showLeft(_elements['${target}'] || '${target}', ${currentVar}, ${offset})`)
            }
            break
          case 'showRight':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              const offset = action.args[1] || '4'
              this.emit(`_runtime.showRight(_elements['${target}'] || '${target}', ${currentVar}, ${offset})`)
            }
            break
          case 'showAt':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              const position = action.args[1] || 'below'
              this.emit(`_runtime.showAt(_elements['${target}'] || '${target}', ${currentVar}, '${position}')`)
            }
            break
          case 'showModal':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              const backdrop = action.args[1] !== 'false'
              this.emit(`_runtime.showModal(_elements['${target}'] || '${target}', ${backdrop})`)
            }
            break
          case 'dismiss':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.dismiss(_elements['${target}'] || '${target}')`)
            } else {
              this.emit(`_runtime.dismiss(${currentVar})`)
            }
            break
          // Scroll actions
          case 'scrollTo':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.scrollTo(_elements['${target}'] || '${target}')`)
            }
            break
          case 'scrollBy':
            if (action.args && action.args.length >= 3) {
              const container = action.args[0]
              const x = action.args[1] || '0'
              const y = action.args[2] || '0'
              this.emit(`_runtime.scrollBy(_elements['${container}'] || '${container}', ${x}, ${y})`)
            } else if (action.args && action.args.length === 2) {
              // Assume vertical scroll only: scrollBy(container, y)
              const container = action.args[0]
              const y = action.args[1] || '0'
              this.emit(`_runtime.scrollBy(_elements['${container}'] || '${container}', 0, ${y})`)
            }
            break
          case 'scrollToTop':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.scrollToTop(_elements['${target}'] || '${target}')`)
            } else {
              this.emit(`_runtime.scrollToTop()`)
            }
            break
          case 'scrollToBottom':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.scrollToBottom(_elements['${target}'] || '${target}')`)
            } else {
              this.emit(`_runtime.scrollToBottom()`)
            }
            break
          // Value & Counter actions
          case 'increment':
            if (action.args && action.args.length > 0) {
              const tokenName = action.args[0]
              // Check for options like min, max, step
              const opts: string[] = []
              if (action.args.length > 1) {
                // Parse options from args like "max:10" or "min:0"
                for (let i = 1; i < action.args.length; i++) {
                  const arg = action.args[i]
                  if (arg.includes(':')) {
                    const [key, val] = arg.split(':')
                    opts.push(`${key}: ${val}`)
                  }
                }
              }
              if (opts.length > 0) {
                this.emit(`_runtime.increment('${tokenName}', { ${opts.join(', ')} })`)
              } else {
                this.emit(`_runtime.increment('${tokenName}')`)
              }
            }
            break
          case 'decrement':
            if (action.args && action.args.length > 0) {
              const tokenName = action.args[0]
              const opts: string[] = []
              if (action.args.length > 1) {
                for (let i = 1; i < action.args.length; i++) {
                  const arg = action.args[i]
                  if (arg.includes(':')) {
                    const [key, val] = arg.split(':')
                    opts.push(`${key}: ${val}`)
                  }
                }
              }
              if (opts.length > 0) {
                this.emit(`_runtime.decrement('${tokenName}', { ${opts.join(', ')} })`)
              } else {
                this.emit(`_runtime.decrement('${tokenName}')`)
              }
            }
            break
          case 'set':
            if (action.args && action.args.length >= 2) {
              const tokenName = action.args[0]
              const value = action.args[1]
              // Check if value is a number
              if (!isNaN(Number(value))) {
                this.emit(`_runtime.set('${tokenName}', ${value})`)
              } else {
                this.emit(`_runtime.set('${tokenName}', '${value}')`)
              }
            }
            break
          case 'get':
            if (action.args && action.args.length > 0) {
              const tokenName = action.args[0]
              this.emit(`_runtime.get('${tokenName}')`)
            }
            break
          case 'copy':
            if (action.args && action.args.length > 0) {
              const textArg = action.args[0]
              // Check if it's a token reference ($name)
              if (textArg.startsWith('$')) {
                this.emit(`_runtime.copy(_runtime.get('${textArg}'), ${currentVar})`)
              } else {
                this.emit(`_runtime.copy('${textArg}', ${currentVar})`)
              }
            }
            break
          case 'reset':
            if (action.args && action.args.length > 0) {
              const tokenName = action.args[0]
              if (action.args.length > 1) {
                const initialValue = action.args[1]
                if (!isNaN(Number(initialValue))) {
                  this.emit(`_runtime.reset('${tokenName}', ${initialValue})`)
                } else {
                  this.emit(`_runtime.reset('${tokenName}', '${initialValue}')`)
                }
              } else {
                this.emit(`_runtime.reset('${tokenName}')`)
              }
            }
            break
          // Feedback functions
          case 'toast':
            if (action.args && action.args.length > 0) {
              const message = action.args[0]
              if (action.args.length > 1) {
                // toast("message", type) or toast("message", type, position)
                const type = action.args[1] || 'info'
                const position = action.args[2] || 'bottom'
                this.emit(`_runtime.toast('${message}', { type: '${type}', position: '${position}' })`)
              } else {
                this.emit(`_runtime.toast('${message}')`)
              }
            }
            break
          // Input control
          case 'focus':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.focus(_elements['${target}'])`)
            } else {
              this.emit(`_runtime.focus(${currentVar})`)
            }
            break
          case 'blur':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.blur(_elements['${target}'])`)
            } else {
              this.emit(`_runtime.blur(${currentVar})`)
            }
            break
          case 'clear':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.clear(_elements['${target}'])`)
            } else {
              this.emit(`_runtime.clear(${currentVar})`)
            }
            break
          case 'selectText':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.selectText(_elements['${target}'])`)
            } else {
              this.emit(`_runtime.selectText(${currentVar})`)
            }
            break
          case 'setError':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              const message = action.args[1] || ''
              if (message) {
                this.emit(`_runtime.setError(_elements['${target}'], '${message}')`)
              } else {
                this.emit(`_runtime.setError(_elements['${target}'])`)
              }
            } else {
              this.emit(`_runtime.setError(${currentVar})`)
            }
            break
          case 'clearError':
            if (action.args && action.args.length > 0) {
              const target = action.args[0]
              this.emit(`_runtime.clearError(_elements['${target}'])`)
            } else {
              this.emit(`_runtime.clearError(${currentVar})`)
            }
            break
          // Browser navigation
          case 'back':
            this.emit(`_runtime.back()`)
            break
          case 'forward':
            this.emit(`_runtime.forward()`)
            break
          case 'openUrl':
            if (action.args && action.args.length > 0) {
              const url = action.args[0]
              const newTab = action.args.length > 1 ? action.args[1] === 'true' : true
              this.emit(`_runtime.openUrl('${url}', { newTab: ${newTab} })`)
            }
            break
          default:
            // Custom function: inject element as first parameter
            if (action.args && action.args.length > 0) {
              const args = action.args.map(a => `'${a}'`).join(', ')
              this.emit(`if (typeof ${fnName} === 'function') ${fnName}(${currentVar}, ${args})`)
            } else {
              this.emit(`if (typeof ${fnName} === 'function') ${fnName}(${currentVar})`)
            }
        }
      }
      return
    }

    // Multi-element trigger: ElementName state (e.g., Menu open, Backdrop visible)
    // Detected by PascalCase action type (first char uppercase) with a target
    const isElementTransition = /^[A-Z]/.test(action.type) && action.target
    if (isElementTransition) {
      this.emit(`_runtime.transitionTo(_elements['${action.type}'], '${action.target}')`)
    } else {
      // Unknown action without function call syntax
      this.emit(`// Warning: Action '${action.type}' requires function call syntax, e.g., ${action.type}()`)
    }
  }

  private emitPublicAPI(): void {
    this.emit('// Public API')
    this.emit('const api = {')
    this.indent++

    this.emit('root: _root,')
    this.emit('')

    // Generate accessors for named instances
    const namedNodes = this.collectNamedNodes(this.ir.nodes)
    for (const node of namedNodes) {
      this.emit(`get ${node.instanceName}() {`)
      this.indent++
      this.emit(`return _runtime.wrap(_elements['${node.instanceName}'])`)
      this.indent--
      this.emit('},')
    }

    this.emit('')
    this.emit('// State management')
    this.emit('setState(key, value) {')
    this.indent++
    this.emit('_state[key] = value')
    this.emit('this.update()')
    this.indent--
    this.emit('},')
    this.emit('')

    this.emit('getState(key) {')
    this.indent++
    this.emit('return _state[key]')
    this.indent--
    this.emit('},')
    this.emit('')

    this.emit('update() {')
    this.indent++
    this.emit('// Re-render each loops based on state changes')
    this.emit("for (const el of _root.querySelectorAll('[data-each-container]')) {")
    this.indent++
    this.emit('if (el._eachConfig) {')
    this.indent++
    this.emit('const { collection, renderItem, filterFn } = el._eachConfig')
    this.emit('const items = _state[collection] || []')
    this.emit('const filtered = filterFn ? items.filter(filterFn) : items')
    this.emit('el.innerHTML = ""')
    this.emit('filtered.forEach((item, index) => el.appendChild(renderItem(item, index)))')
    this.indent--
    this.emit('}')
    this.indent--
    this.emit('}')
    this.emit('')
    this.emit('// Re-render conditionals based on state changes')
    this.emit("for (const el of _root.querySelectorAll('[data-conditional-id]')) {")
    this.indent++
    this.emit('if (el._conditionalConfig) {')
    this.indent++
    this.emit('const { condition, renderThen, renderElse } = el._conditionalConfig')
    this.emit('el.innerHTML = ""')
    this.emit('if (condition()) {')
    this.indent++
    this.emit('el.appendChild(renderThen())')
    this.indent--
    this.emit('} else if (renderElse) {')
    this.indent++
    this.emit('el.appendChild(renderElse())')
    this.indent--
    this.emit('}')
    this.indent--
    this.emit('}')
    this.indent--
    this.emit('}')
    this.indent--
    this.emit('},')

    this.indent--
    this.emit('}')
    this.emit('')
    this.emit('return api')
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
        const tokenKey = (token.name.startsWith('$') ? token.name.slice(1) : token.name)
          .replace(/\./g, '-')
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
        return varName  // Return unquoted - it's a JS variable reference
      }

      // Check if this is a computed expression from the IR
      // Expressions from IR look like: "Hello " + $name or $count * $price
      // They have: quoted strings AND/OR $-variables with operators between them
      // Plain strings look like: Tokens + Komponenten (no quotes, no $)
      const hasOperators = value.includes(' + ') || value.includes(' - ') || value.includes(' * ') || value.includes(' / ')
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
    let result = expr.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, (match, varName) => {
      return varName
    })
    // Then, replace $varName or $var.name.deep patterns (but not $12.4k or $100)
    // Also handles aggregation method calls: $tasks.sum(hours), $items.sum(data.stats.value)
    // The pattern inside parentheses allows dots for nested paths like data.stats.value
    result = result.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\([a-zA-Z0-9_.,\s]*\))?)/g, (match, varName) => {
      return `$get("${varName}")`
    })
    return result
  }

  /**
   * Escape a string for use in JavaScript string literals.
   * Handles backslashes, quotes, newlines, carriage returns, tabs, and other control characters.
   */
  private escapeString(str: string | number | boolean | undefined | null): string {
    const s = String(str ?? '')
    return s
      .replace(/\\/g, '\\\\')   // Backslashes first
      .replace(/"/g, '\\"')     // Double quotes
      .replace(/\n/g, '\\n')    // Newlines
      .replace(/\r/g, '\\r')    // Carriage returns
      .replace(/\t/g, '\\t')    // Tabs
      .replace(/\u2028/g, '\\u2028')  // Line separator
      .replace(/\u2029/g, '\\u2029')  // Paragraph separator
  }

  /**
   * Escape a template string (for backtick literals)
   * Escapes backticks and backslashes, but preserves ${...} interpolations
   */
  private escapeTemplateString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\n/g, '\\n')
  }

  /**
   * Create an EventEmitterContext for delegation to extracted event-emitter functions
   */
  private createEventEmitterContext(): EventEmitterContext {
    return {
      emit: (line: string) => this.emit(line),
      indentIn: () => { this.indent++ },
      indentOut: () => { this.indent-- },
      escapeString: (str) => this.escapeString(str),
    }
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
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
      'this', 'typeof', 'instanceof', 'new', 'delete', 'void',
      'if', 'else', 'return', 'function', 'var', 'let', 'const'
    ])

    // First handle __loopVar: markers (from loop variables)
    let result = condition.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')

    // Then handle $-prefixed variables (already explicit)
    result = result.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g, '$get("$1")')

    // Now handle bare identifiers (not already wrapped, not in quotes, not reserved)
    // This regex finds identifiers with optional dot notation
    // We use a function to check if it's reserved
    result = result.replace(/(?<!["\w$])([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?!["\w(])/g, (match, identifier) => {
      // Don't wrap if it's a reserved word
      const firstPart = identifier.split('.')[0]
      if (reserved.has(firstPart)) {
        return match
      }
      // Don't wrap if it's already wrapped in $get
      return `$get("${identifier}")`
    })

    return result
  }

  /**
   * Map DSL key names to JavaScript key event values
   * Delegates to extracted event-emitter.ts
   */
  private mapKeyNameMethod(key: string): string {
    return mapKeyName(key)
  }

  /**
   * Emit state machine configuration and event listeners
   * Delegates to extracted state-machine-emitter.ts
   */
  private emitStateMachine(varName: string, node: IRNode): void {
    const ctx: StateMachineEmitterContext = {
      emit: (line: string) => this.emit(line),
      indentIn: () => { this.indent++ },
      indentOut: () => { this.indent-- },
      escapeString: (str: string) => this.escapeString(str),
      addDeferredWhenWatcher: (watcher: DeferredWhenWatcher) => {
        this.deferredWhenWatchers.push(watcher)
      },
    }
    emitStateMachineExtracted(ctx, varName, node)
  }

  /**
   * Emit all deferred when watchers after DOM is fully built
   * Delegates to extracted state-machine-emitter.ts
   */
  private emitDeferredWhenWatchersMethod(): void {
    const ctx: StateMachineEmitterContext = {
      emit: (line: string) => this.emit(line),
      indentIn: () => { this.indent++ },
      indentOut: () => { this.indent-- },
      escapeString: (str: string) => this.escapeString(str),
      addDeferredWhenWatcher: (watcher: DeferredWhenWatcher) => {
        this.deferredWhenWatchers.push(watcher)
      },
    }
    emitDeferredWhenWatchers(ctx, this.deferredWhenWatchers)
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
    const result: IRNode[] = []
    for (const node of nodes) {
      if (node.instanceName) {
        result.push(node)
      }
      result.push(...this.collectNamedNodes(node.children))
    }
    return result
  }

  private emitInitialization(): void {
    const namedNodes = this.collectNamedNodes(this.ir.nodes)

    this.emit('// ============================================')
    this.emit('// Auto-initialization (Mirror + JavaScript)')
    this.emit('// ============================================')
    this.emit('')

    // Create UI instance
    this.emit('const _ui = createUI()')
    this.emit('')

    // Expose named instances as global variables
    if (namedNodes.length > 0) {
      this.emit('// Named instance proxies')
      for (const node of namedNodes) {
        this.emit(`const ${node.instanceName} = _ui.${node.instanceName}`)
      }
      this.emit('')
    }

    // Global update function
    this.emit('// Global update function')
    this.emit('function update() { _ui.update() }')
    this.emit('')

    // User JavaScript
    this.emit('// User JavaScript')
    if (this.javascript) {
      // Emit the JavaScript code as-is, preserving formatting
      for (const line of this.javascript.code.split('\n')) {
        this.emitRaw(line)
      }
    }
    this.emit('')

    // Auto-mount to body
    this.emit('// Mount to document')
    this.emit('document.body.appendChild(_ui.root)')
  }
}
