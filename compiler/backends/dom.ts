/**
 * Mirror DOM Backend
 *
 * Generates pure JavaScript DOM manipulation code.
 * Flagship backend - no framework dependencies.
 */

import type { AST, JavaScriptBlock, TokenDefinition } from '../parser/ast'
import { toIR } from '../ir'
import type { IR, IRNode, IRStyle, IREvent, IRAction, IREach, IRConditional, IRAnimation, IRZagNode, IRStateMachine, IRStateTransition, IRTable, IRTableColumn } from '../ir/types'
import { isIRZagNode, isIRTable } from '../ir/types'
import { getTypeRenderer, getTypeRendererStyles, getValueFormatter } from '../schema/type-renderers'
import type { InferredDataType } from '../schema/table-types'
import { DOM_RUNTIME_CODE } from '../runtime/dom-runtime-string'
import { generateTheme, isThemeToken } from '../schema/theme-generator'
import type { DataFile } from '../parser/data-types'
import { mergeDataFiles, serializeDataForJS } from '../parser/data-parser'
import type { QueryFile } from '../parser/query-types'
import { serializeQueriesForJS } from '../parser/query-parser'

/**
 * Escape a string for safe inclusion in JavaScript code
 * Handles quotes, backslashes, newlines, and other special characters
 */
function escapeJSString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')   // backslash first!
    .replace(/'/g, "\\'")     // single quotes
    .replace(/"/g, '\\"')     // double quotes
    .replace(/\n/g, '\\n')    // newlines
    .replace(/\r/g, '\\r')    // carriage returns
    .replace(/\t/g, '\\t')    // tabs
}

/**
 * Options for DOM code generation
 */
export interface GenerateDOMOptions {
  /** Parsed .data files to include in output */
  dataFiles?: DataFile[]
  /** Parsed .query files to include in output */
  queryFiles?: QueryFile[]
}

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
  const generator = new DOMGenerator(ir, ast.javascript, ast.tokens, options?.dataFiles, options?.queryFiles)
  return generator.generate()
}

class DOMGenerator {
  private ir: IR
  private javascript?: JavaScriptBlock
  private astTokens: TokenDefinition[]
  private dataFiles?: DataFile[]
  private queryFiles?: QueryFile[]
  private indent = 0
  private lines: string[] = []
  // Deferred when watchers - emitted after DOM is built
  private deferredWhenWatchers: Array<{ varName: string; transition: IRStateTransition; sm: IRStateMachine }> = []
  // Token lookup map for resolving token-to-token references
  private tokenMap: Map<string, string | number> = new Map()

  constructor(ir: IR, javascript?: JavaScriptBlock, astTokens: TokenDefinition[] = [], dataFiles?: DataFile[], queryFiles?: QueryFile[]) {
    this.ir = ir
    this.javascript = javascript
    this.astTokens = astTokens
    this.dataFiles = dataFiles
    this.queryFiles = queryFiles
    // Build token lookup map (skip tokens without values, e.g., data objects)
    for (const token of astTokens) {
      if (token.value !== undefined) {
        this.tokenMap.set(token.name, token.value)
      }
    }
  }

  /**
   * Resolve a token value, following token-to-token references.
   * Uses the context (suffix) from the target token name to find the right source token.
   * E.g., $primary.bg: $blue → looks for $blue.bg and resolves to #2563eb
   *
   * @param value The token value to resolve
   * @param targetName The name of the token being defined (for suffix context)
   * @param visited Set of visited token names (for cycle detection)
   */
  private resolveTokenValueWithContext(
    value: string | number,
    targetName: string,
    visited: Set<string> = new Set()
  ): string | number {
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

  private emitTokens(): void {
    // Always emit __mirrorData and $get helper for $-variable support
    this.emit('// Mirror Data Context (Tokens + Data Files)')
    this.emit('// Exposed to window for debugging and two-way binding')
    this.emit('const __mirrorData = window.__mirrorData = {')
    this.indent++

    // Emit design tokens
    for (const token of this.ir.tokens) {
      const value = typeof token.value === 'string' ? `"${escapeJSString(token.value)}"` : token.value
      // Strip $ prefix, keep dots for object access
      const tokenKey = token.name.startsWith('$') ? token.name.slice(1) : token.name
      this.emit(`"${tokenKey}": ${value},`)
    }

    // Emit data files (from .data parser)
    if (this.dataFiles && this.dataFiles.length > 0) {
      const mergedData = mergeDataFiles(this.dataFiles)
      const dataJS = serializeDataForJS(mergedData)
      // Each line of dataJS needs to be emitted
      for (const line of dataJS.split('\n')) {
        this.emit(line)
      }
    }

    this.indent--
    this.emit('}')
    this.emit('')

    // Collection store for CRUD operations ($tasks.current, etc.)
    this.emit('// Collection Store for reactive CRUD')
    this.emit('const __collections = window.__collections = {}')
    this.emit('function $collection(name) {')
    this.indent++
    this.emit('const n = name.startsWith("$") ? name.slice(1) : name')
    this.emit('if (!__collections[n]) {')
    this.indent++
    this.emit('const items = __mirrorData[n] || []')
    this.emit('const itemsArray = Array.isArray(items) ? items : Object.values(items)')
    this.emit('__collections[n] = {')
    this.indent++
    this.emit('items: itemsArray,')
    this.emit('_current: null,')
    this.emit('_subscribers: new Set(),')
    this.emit('get current() { return this._current },')
    this.emit('set current(item) {')
    this.indent++
    this.emit('if (this._current === item) return')
    this.emit('this._current = item')
    this.emit('this._subscribers.forEach(fn => fn())')
    this.indent--
    this.emit('},')
    this.emit('subscribe(fn) { this._subscribers.add(fn); return () => this._subscribers.delete(fn) },')
    this.emit('add(item) {')
    this.indent++
    this.emit('const newItem = { id: item.id || Date.now().toString(36), ...item }')
    this.emit('this.items.push(newItem)')
    this.emit('this._subscribers.forEach(fn => fn())')
    this.emit('return newItem')
    this.indent--
    this.emit('},')
    this.emit('remove(item) {')
    this.indent++
    this.emit('const idx = this.items.indexOf(item)')
    this.emit('if (idx > -1) this.items.splice(idx, 1)')
    this.emit('if (this._current === item) this._current = null')
    this.emit('this._subscribers.forEach(fn => fn())')
    this.indent--
    this.emit('},')
    this.emit('update(item, changes) {')
    this.indent++
    this.emit('Object.assign(item, changes)')
    this.emit('this._subscribers.forEach(fn => fn())')
    this.indent--
    this.emit('}')
    this.indent--
    this.emit('}')
    this.indent--
    this.emit('}')
    this.emit('return __collections[n]')
    this.indent--
    this.emit('}')
    this.emit('')

    // Reference resolver: resolves { __ref: true, collection, entry } objects
    this.emit('// Reference resolver for data relations')
    this.emit('function $resolveRef(value) {')
    this.indent++
    this.emit('if (value && typeof value === "object" && value.__ref) {')
    this.indent++
    this.emit('const resolved = __mirrorData[value.collection]?.[value.entry]')
    this.emit('return resolved !== undefined ? resolved : value')
    this.indent--
    this.emit('}')
    this.emit('if (Array.isArray(value)) {')
    this.indent++
    this.emit('return value.map(v => $resolveRef(v))')
    this.indent--
    this.emit('}')
    this.emit('return value')
    this.indent--
    this.emit('}')
    this.emit('')

    // Aggregation helpers for collection methods
    this.emit('// Aggregation methods for collections')
    this.emit('// Helper to get nested property value: "data.stats.value" -> obj.data.stats.value')
    this.emit('const $getField = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj)')
    this.emit('const $agg = {')
    this.indent++
    this.emit('count: (arr) => Array.isArray(arr) ? arr.length : 0,')
    this.emit('sum: (arr, field) => Array.isArray(arr) ? arr.reduce((s, i) => s + (Number($getField(i, field)) || 0), 0) : 0,')
    this.emit('avg: (arr, field) => { const a = Array.isArray(arr) ? arr : []; return a.length ? $agg.sum(a, field) / a.length : 0 },')
    this.emit('min: (arr, field) => Array.isArray(arr) && arr.length ? Math.min(...arr.map(i => Number($getField(i, field)) || 0)) : 0,')
    this.emit('max: (arr, field) => Array.isArray(arr) && arr.length ? Math.max(...arr.map(i => Number($getField(i, field)) || 0)) : 0,')
    this.emit('first: (arr) => Array.isArray(arr) ? arr[0] : undefined,')
    this.emit('last: (arr) => Array.isArray(arr) ? arr[arr.length - 1] : undefined,')
    this.indent--
    this.emit('}')
    this.emit('')

    // Collection methods (from .data files)
    this.emitMethods()

    // Computed queries (from .query files)
    this.emitQueries()

    // $get helper: lookup in __mirrorData, then globalThis
    this.emit('// $-variable accessor with aggregation support')
    this.emit('function $get(name) {')
    this.indent++

    // Check for aggregation method pattern: collection.method or collection.method(field)
    // Also handles post-accessors: items.first.name, items.last.email
    this.emit('// Check for aggregation pattern: collection.count, collection.sum(field), items.first.name')
    this.emit('const aggMatch = name.match(/^(.+)\\.(count|sum|avg|min|max|first|last)(?:\\(([^)]+)\\))?(\\..+)?$/)')
    this.emit('if (aggMatch) {')
    this.indent++
    this.emit('const [, collectionPath, method, field, postAccessor] = aggMatch')
    this.emit('const collection = $get(collectionPath)')
    this.emit('if (Array.isArray(collection)) {')
    this.indent++
    this.emit('let result = field ? $agg[method](collection, field) : $agg[method](collection)')
    this.emit('// Handle post-accessor like .name after .first')
    this.emit('if (postAccessor && result != null) {')
    this.indent++
    this.emit('const accessParts = postAccessor.slice(1).split(".")')
    this.emit('for (const part of accessParts) {')
    this.indent++
    this.emit('if (result == null) break')
    this.emit('result = result[part]')
    this.indent--
    this.emit('}')
    this.indent--
    this.emit('}')
    this.emit('return result')
    this.indent--
    this.emit('}')
    this.emit('return 0')
    this.indent--
    this.emit('}')
    this.emit('')

    // Check for .current pattern: $tasks.current → $collection('tasks').current
    this.emit('// Check for .current pattern (CRUD selection)')
    this.emit('const currentMatch = name.match(/^([^.]+)\\.current(\\..*)?$/)')
    this.emit('if (currentMatch) {')
    this.indent++
    this.emit('const [, collectionName, postAccessor] = currentMatch')
    this.emit('const coll = $collection(collectionName)')
    this.emit('let result = coll.current')
    this.emit('if (postAccessor && result != null) {')
    this.indent++
    this.emit('const accessParts = postAccessor.slice(1).split(".")')
    this.emit('for (const part of accessParts) {')
    this.indent++
    this.emit('if (result == null) break')
    this.emit('result = result[part]')
    this.indent--
    this.emit('}')
    this.indent--
    this.emit('}')
    this.emit('return result')
    this.indent--
    this.emit('}')
    this.emit('')

    // First try full key (for tokens like "user.profile.name")
    this.emit('if (name in __mirrorData) return $resolveRef(__mirrorData[name])')
    // Then try nested access
    this.emit('const parts = name.split(".")')
    this.emit('let val = __mirrorData[parts[0]] ?? globalThis[parts[0]]')
    this.emit('for (let i = 1; i < parts.length && val != null; i++) {')
    this.indent++
    this.emit('val = $resolveRef(val[parts[i]])')
    this.indent--
    this.emit('}')
    this.emit('return val')
    this.indent--
    this.emit('}')
    this.emit('')

    // $set helper: update __mirrorData and notify bindings (two-way binding)
    this.emit('// $-variable mutator (two-way binding)')
    this.emit('function $set(path, value) {')
    this.indent++
    // First check if full path exists as key (for tokens like "user.profile.name")
    this.emit('if (path in __mirrorData) {')
    this.indent++
    this.emit('__mirrorData[path] = value')
    this.indent--
    this.emit('} else {')
    this.indent++
    // Nested access for actual nested objects
    this.emit('const parts = path.split(".")')
    this.emit('let obj = __mirrorData')
    this.emit('for (let i = 0; i < parts.length - 1; i++) {')
    this.indent++
    this.emit('if (obj[parts[i]] === undefined) obj[parts[i]] = {}')
    this.emit('obj = obj[parts[i]]')
    this.indent--
    this.emit('}')
    this.emit('obj[parts[parts.length - 1]] = value')
    this.indent--
    this.emit('}')
    this.emit('// Notify runtime of data change for reactive updates')
    this.emit('if (_runtime && _runtime.notifyDataChange) _runtime.notifyDataChange(path, value)')
    this.indent--
    this.emit('}')
    this.emit('')

    // Legacy tokens object for CSS variable generation
    if (this.ir.tokens.length > 0) {
      this.emit('// Design Tokens (for CSS variables)')
      this.emit('const tokens = __mirrorData')
      this.emit('')
    }
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
    const customTokens = this.ir.tokens.filter(t => {
      const name = t.name.startsWith('$') ? t.name.slice(1) : t.name
      return !isThemeToken(name)
    })

    if (customTokens.length > 0) {
      this.emit('/* User Tokens */')
      this.emit(':host, :root {')
      this.indent++
      for (const token of customTokens) {
        // Resolve token-to-token references (e.g., $primary.bg: $blue → #2563eb)
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

    // Emit CSS for system states (hover, focus, active, disabled)
    this.emitSystemStateCSS()

    this.emit('`')
    this.emit('_root.appendChild(_style)')
    this.emit('')
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

  /**
   * Generate JavaScript methods from .data file method definitions
   *
   * Methods are compiled to functions attached to __methods namespace:
   *   __methods.projects.Total = function(project) { ... }
   */
  private emitMethods(): void {
    if (!this.dataFiles || this.dataFiles.length === 0) return

    // Collect all methods from all data files (methods array may be undefined for legacy DataFile objects)
    const allMethods = this.dataFiles.flatMap(df => df.methods || [])
    if (allMethods.length === 0) return

    this.emit('// Collection methods from .data files')
    this.emit('const __methods = {}')

    // Group methods by namespace
    const byNamespace = new Map<string, typeof allMethods>()
    for (const method of allMethods) {
      const existing = byNamespace.get(method.namespace) || []
      existing.push(method)
      byNamespace.set(method.namespace, existing)
    }

    // Emit each namespace
    for (const [namespace, methods] of byNamespace) {
      this.emit(`__methods.${namespace} = {}`)

      for (const method of methods) {
        const params = method.params.join(', ')
        this.emit(`__methods.${namespace}.${method.name} = function(${params}) {`)
        this.indent++

        // Compile the raw body to JavaScript
        // For now, emit it as-is (simple statements)
        const bodyLines = method.rawBody.split('\n')
        for (const line of bodyLines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          // Simple transformations for common patterns
          const jsLine = this.compileMethodBodyLine(trimmed)
          this.emit(jsLine)
        }

        this.indent--
        this.emit('}')
      }
    }
    this.emit('')
  }

  /**
   * Compile a single line of method body to JavaScript
   *
   * Simple transformations:
   * - return X → return X
   * - $collection → $get('collection')
   * - collection.method(field) → $agg.method(collection, field)
   */
  private compileMethodBodyLine(line: string): string {
    let result = line

    // Replace $collection with $get('collection')
    result = result.replace(/\$([a-zA-Z][\w-]*)/g, (_, name) => {
      return `$get('${name}')`
    })

    // Replace .count, .sum(field), etc. with $agg calls
    // This is a simplified version - the $get function handles this at runtime
    // So we just need to ensure the syntax is valid JavaScript

    return result
  }

  /**
   * Generate computed queries from .query files
   *
   * Queries are serialized as functions that return derived collections:
   *   __queries.TaskBoard = function() { return $get('tasks').map(...) }
   */
  private emitQueries(): void {
    if (!this.queryFiles || this.queryFiles.length === 0) return

    const queriesJS = serializeQueriesForJS(this.queryFiles)
    if (!queriesJS) return

    // Emit each line of the serialized queries
    for (const line of queriesJS.split('\n')) {
      this.emit(line)
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
    this.emitDeferredWhenWatchers()

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
      if ((node as any).isDefinition) {
        return
      }
      this.emitZagComponent(node, parentVar)
      return
    }

    // Handle Table components
    if (isIRTable(node)) {
      this.emitTable(node, parentVar)
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
            // Escape backticks and ${} in the template
            const escapedValue = value.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
            this.emit(`${varName}._textTemplate = () => ${escapedValue}`)

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
      this.emit(`${varName}.dataset.slotLabel = "${this.escapeString(slotLabel)}"`)
      this.emit(`${varName}.classList.add('mirror-slot')`)

      // Create label element
      this.emit(`const ${varName}_label = document.createElement('span')`)
      this.emit(`${varName}_label.className = 'mirror-slot-label'`)
      this.emit(`${varName}_label.textContent = "${this.escapeString(slotLabel)}"`)
      this.emit(`${varName}.appendChild(${varName}_label)`)
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

    // Selection binding
    if (node.selection) {
      const selectionVar = node.selection.startsWith('$') ? node.selection.slice(1) : node.selection
      this.emit(`${varName}._selectionBinding = '${selectionVar}'`)
    }

    // Component name (for navigation targets)
    if (node.name) {
      this.emit(`${varName}.dataset.component = '${node.name}'`)
    }

    // Route (for navigation)
    if (node.route) {
      this.emit(`${varName}.dataset.route = '${node.route}'`)
    }

    // Add event listeners
    // Check if there are keyboard events and make element focusable
    const hasKeyboardEvents = node.events.some(e => e.key || e.name === 'keydown' || e.name === 'keyup')
    if (hasKeyboardEvents) {
      this.emit(`${varName}.setAttribute('tabindex', '0')`)
    }
    for (const event of node.events) {
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

  private emitEachLoop(each: IREach, parentVar: string): void {
    const containerId = this.sanitizeVarName(each.id)
    // Strip $ prefix for valid JavaScript variable names
    const itemVar = each.itemVar.startsWith('$') ? each.itemVar.slice(1) : each.itemVar
    const indexVar = each.indexVar ? (each.indexVar.startsWith('$') ? each.indexVar.slice(1) : each.indexVar) : 'index'
    const rawCollection = each.collection.startsWith('$') ? each.collection.slice(1) : each.collection

    // Check if collection is an inline array literal
    const isInlineArray = rawCollection.startsWith('[')
    // Sanitize collection name for valid JS variable (replace dots with underscores)
    const collectionVarName = isInlineArray ? `${containerId}_inlineData` : rawCollection.replace(/\./g, '_')

    this.emit(`// Each loop: ${itemVar}${each.indexVar ? ', ' + indexVar : ''} in ${isInlineArray ? '[...]' : rawCollection}`)
    this.emit(`const ${containerId}_container = document.createElement('div')`)
    this.emit(`${containerId}_container.dataset.eachContainer = '${each.id}'`)
    this.emit(`${containerId}_container.style.display = 'contents';`)
    this.emit('')

    // Store template factory for runtime updates
    this.emit(`_elements['${each.id}'] = ${containerId}_container`)
    this.emit(`${containerId}_container._eachConfig = {`)
    this.indent++
    this.emit(`itemVar: '${itemVar}',`)
    this.emit(`collection: ${isInlineArray ? rawCollection : `'${rawCollection}'`},`)
    if (each.filter) {
      this.emit(`filter: ${JSON.stringify(each.filter)},`)
    }
    if (each.orderBy) {
      this.emit(`orderBy: ${JSON.stringify(each.orderBy)},`)
      this.emit(`orderDesc: ${each.orderDesc ? 'true' : 'false'},`)
    }
    this.emit(`renderItem: (${itemVar}, ${indexVar}) => {`)
    this.indent++

    // Create a container for each item (display: contents makes it layout-transparent)
    this.emit(`const itemContainer = document.createElement('div')`)
    this.emit(`itemContainer.dataset.eachItem = ${indexVar}`)
    this.emit(`itemContainer.style.display = 'contents';`)

    // Render template nodes
    for (const templateNode of each.template) {
      this.emitEachTemplateNode(templateNode, 'itemContainer', itemVar, indexVar)
    }

    this.emit(`return itemContainer`)
    this.indent--
    this.emit('},')
    this.indent--
    this.emit('}')
    this.emit('')

    // Initial render with data
    this.emit(`// Initial render`)
    if (isInlineArray) {
      // Inline array: use the literal directly
      this.emit(`const ${collectionVarName} = ${rawCollection}`)
    } else {
      // Named collection: use $get() for __mirrorData/globalThis lookup
      this.emit(`const ${collectionVarName}Data = $get('${rawCollection}') || []`)
    }

    let processedVarName = isInlineArray ? collectionVarName : `${collectionVarName}Data`

    // Apply filter if present
    if (each.filter) {
      this.emit(`let ${collectionVarName}Filtered = ${processedVarName}.filter(${itemVar} => ${each.filter})`)
      processedVarName = `${collectionVarName}Filtered`
    }

    // Apply sorting if present
    if (each.orderBy) {
      const sortedVarName = `${collectionVarName}Sorted`
      const sortDir = each.orderDesc ? -1 : 1
      this.emit(`const ${sortedVarName} = [...${processedVarName}].sort((a, b) => {`)
      this.indent++
      this.emit(`const aVal = a.${each.orderBy}`)
      this.emit(`const bVal = b.${each.orderBy}`)
      this.emit(`if (aVal < bVal) return ${-sortDir}`)
      this.emit(`if (aVal > bVal) return ${sortDir}`)
      this.emit(`return 0`)
      this.indent--
      this.emit(`})`)
      processedVarName = sortedVarName
    }

    this.emit(`${processedVarName}.forEach((${itemVar}, ${indexVar}) => {`)
    this.indent++
    this.emit(`${containerId}_container.appendChild(${containerId}_container._eachConfig.renderItem(${itemVar}, ${indexVar}))`)
    this.indent--
    this.emit('})')
    this.emit('')

    this.emit(`${parentVar}.appendChild(${containerId}_container)`)
    this.emit('')
  }

  private emitConditional(cond: IRConditional, parentVar: string): void {
    const containerId = this.sanitizeVarName(cond.id)
    // Transform variable references in condition to $get() calls
    const resolvedCondition = this.resolveConditionVariables(cond.condition)

    this.emit(`// Conditional`)
    this.emit(`const ${containerId}_container = document.createElement('div')`)
    this.emit(`${containerId}_container.dataset.conditionalId = '${cond.id}'`)
    this.emit(`${containerId}_container.style.display = 'contents';`)
    this.emit(`_elements['${cond.id}'] = ${containerId}_container`)
    this.emit('')

    // Store conditional config for reactive updates
    this.emit(`${containerId}_container._conditionalConfig = {`)
    this.indent++
    this.emit(`condition: () => ${resolvedCondition},`)
    this.emit(`renderThen: () => {`)
    this.indent++
    this.emit(`const fragment = document.createDocumentFragment()`)
    for (const node of cond.then) {
      this.emitConditionalTemplateNode(node, 'fragment')
    }
    this.emit(`return fragment`)
    this.indent--
    this.emit(`},`)
    if (cond.else && cond.else.length > 0) {
      this.emit(`renderElse: () => {`)
      this.indent++
      this.emit(`const fragment = document.createDocumentFragment()`)
      for (const node of cond.else) {
        this.emitConditionalTemplateNode(node, 'fragment')
      }
      this.emit(`return fragment`)
      this.indent--
      this.emit(`},`)
    }
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Initial render based on condition
    this.emit(`// Initial conditional render`)
    this.emit(`if (${resolvedCondition}) {`)
    this.indent++
    this.emit(`${containerId}_container.appendChild(${containerId}_container._conditionalConfig.renderThen())`)
    this.indent--
    if (cond.else && cond.else.length > 0) {
      this.emit(`} else {`)
      this.indent++
      this.emit(`${containerId}_container.appendChild(${containerId}_container._conditionalConfig.renderElse())`)
      this.indent--
    }
    this.emit(`}`)
    this.emit('')

    this.emit(`${parentVar}.appendChild(${containerId}_container)`)
    this.emit('')
  }

  // ============================================================================
  // Table Component Generation
  // ============================================================================

  /**
   * Generate code for a Table component
   *
   * Tables are data-driven and auto-generate columns from data schema.
   * They support filtering, sorting, grouping, selection, and aggregations.
   */
  private emitTable(node: IRTable, parentVar: string): void {
    const tableVar = this.sanitizeVarName(node.id)
    const dataVar = `${tableVar}_data`
    const collectionName = node.dataSource.replace(/^\$/, '')

    this.emit(`// Table: ${node.dataSource}`)
    this.emit(`const ${tableVar} = document.createElement('div')`)
    this.emit(`${tableVar}.className = 'mirror-table'`)
    this.emit(`${tableVar}.dataset.mirrorId = '${node.id}'`)
    this.emit(`_elements['${node.id}'] = ${tableVar}`)

    // Apply default table styles
    this.emit(`Object.assign(${tableVar}.style, {`)
    this.indent++
    this.emit(`display: 'flex',`)
    this.emit(`flexDirection: 'column',`)
    this.emit(`background: 'var(--surface, #1a1a1a)',`)
    this.emit(`borderRadius: '8px',`)
    this.emit(`overflow: 'hidden',`)
    this.indent--
    this.emit(`})`)
    this.emit('')

    // Load data
    this.emit(`// Load data from collection`)
    this.emit(`let ${dataVar} = $get("${collectionName}") || []`)
    this.emit(`if (!Array.isArray(${dataVar})) ${dataVar} = Object.values(${dataVar})`)
    this.emit('')

    // Apply filter (where clause)
    if (node.filter) {
      this.emit(`// Apply filter: where ${node.filter}`)
      this.emit(`${dataVar} = ${dataVar}.filter(row => ${node.filter})`)
      this.emit('')
    }

    // Apply sorting (by clause)
    if (node.orderBy) {
      this.emit(`// Apply sort: by ${node.orderBy}${node.orderDesc ? ' desc' : ''}`)
      this.emit(`${dataVar} = ${dataVar}.slice().sort((a, b) => {`)
      this.indent++
      this.emit(`const av = a.${node.orderBy}, bv = b.${node.orderBy}`)
      this.emit(`const cmp = av < bv ? -1 : av > bv ? 1 : 0`)
      this.emit(`return ${node.orderDesc ? '-cmp' : 'cmp'}`)
      this.indent--
      this.emit(`})`)
      this.emit('')
    }

    // Generate header
    this.emitTableHeader(tableVar, node)
    this.emit('')

    // Generate rows (with grouping if needed)
    if (node.groupBy) {
      this.emitTableGroupedRows(tableVar, dataVar, node)
    } else {
      this.emitTableRows(tableVar, dataVar, node)
    }
    this.emit('')

    // Generate footer if aggregations exist
    const hasAggregations = node.columns.some(c => c.aggregation)
    if (hasAggregations || node.footerSlot) {
      this.emitTableFooter(tableVar, dataVar, node)
      this.emit('')
    }

    // Selection handling
    if (node.selectionMode) {
      this.emitTableSelection(tableVar, dataVar, node)
      this.emit('')
    }

    this.emit(`${parentVar}.appendChild(${tableVar})`)
    this.emit('')
  }

  /**
   * Generate table header row
   */
  private emitTableHeader(tableVar: string, node: IRTable): void {
    const headerVar = `${tableVar}_header`

    this.emit(`// Table header`)
    this.emit(`const ${headerVar} = document.createElement('div')`)
    this.emit(`${headerVar}.className = 'mirror-table-header'`)
    this.emit(`Object.assign(${headerVar}.style, {`)
    this.indent++
    this.emit(`display: 'flex',`)
    this.emit(`background: 'var(--surface-elevated, #252525)',`)
    this.emit(`padding: '12px',`)
    this.emit(`borderBottom: '1px solid var(--border, #333)',`)
    this.indent--
    this.emit(`})`)

    // Generate header cells for each visible column
    for (const col of node.columns.filter(c => !c.hidden)) {
      const cellVar = `${tableVar}_hc_${this.sanitizeVarName(col.field)}`
      this.emit(`const ${cellVar} = document.createElement('div')`)
      this.emit(`${cellVar}.className = 'mirror-table-header-cell'`)
      this.emit(`${cellVar}.textContent = "${col.label}"`)
      this.emit(`${cellVar}.dataset.field = "${col.field}"`)

      // Header cell styles
      this.emit(`Object.assign(${cellVar}.style, {`)
      this.indent++
      this.emit(`flex: '1',`)
      this.emit(`fontWeight: '500',`)
      this.emit(`color: 'var(--text-muted, #888)',`)
      this.emit(`fontSize: '11px',`)
      this.emit(`textTransform: 'uppercase',`)
      if (col.width) {
        this.emit(`width: '${col.width}px',`)
        this.emit(`flex: 'none',`)
      }
      if (col.align === 'right') {
        this.emit(`textAlign: 'right',`)
      } else if (col.align === 'center') {
        this.emit(`textAlign: 'center',`)
      }
      this.indent--
      this.emit(`})`)

      // Sortable column
      if (col.sortable) {
        this.emit(`${cellVar}.dataset.sortable = 'true'`)
        this.emit(`${cellVar}.style.cursor = 'pointer'`)
      }

      this.emit(`${headerVar}.appendChild(${cellVar})`)
    }

    this.emit(`${tableVar}.appendChild(${headerVar})`)
  }

  /**
   * Generate table body with rows
   */
  private emitTableRows(tableVar: string, dataVar: string, node: IRTable): void {
    this.emit(`// Table body`)
    this.emit(`const ${tableVar}_body = document.createElement('div')`)
    this.emit(`${tableVar}_body.className = 'mirror-table-body'`)

    this.emit(`${dataVar}.forEach((row, index) => {`)
    this.indent++
    this.emitTableRow(tableVar, 'row', 'index', node, dataVar)
    this.emit(`${tableVar}_body.appendChild(${tableVar}_row)`)
    this.indent--
    this.emit(`})`)

    this.emit(`${tableVar}.appendChild(${tableVar}_body)`)
  }

  /**
   * Generate a single table row
   */
  private emitTableRow(tableVar: string, rowVar: string, indexVar: string, node: IRTable, dataVar?: string): void {
    this.emit(`const ${tableVar}_row = document.createElement('div')`)
    this.emit(`${tableVar}_row.className = 'mirror-table-row'`)
    this.emit(`${tableVar}_row.dataset.index = ${indexVar}`)
    this.emit(`Object.assign(${tableVar}_row.style, {`)
    this.indent++
    this.emit(`display: 'flex',`)
    this.emit(`padding: '12px',`)
    this.emit(`borderBottom: '1px solid var(--border-subtle, #222)',`)
    this.emit(`cursor: 'pointer',`)
    this.indent--
    this.emit(`})`)

    // Hover effect
    this.emit(`${tableVar}_row.addEventListener('mouseenter', () => {`)
    this.indent++
    this.emit(`${tableVar}_row.style.background = 'var(--surface-hover, #252525)'`)
    this.indent--
    this.emit(`})`)
    this.emit(`${tableVar}_row.addEventListener('mouseleave', () => {`)
    this.indent++
    this.emit(`if (!${tableVar}_row.classList.contains('selected')) {`)
    this.indent++
    this.emit(`${tableVar}_row.style.background = ''`)
    this.indent--
    this.emit(`}`)
    this.indent--
    this.emit(`})`)

    // Check for custom row template (Row: slot)
    if (node.rowSlot && node.rowSlot.length > 0) {
      // Render custom row template with row variable context
      for (const templateNode of node.rowSlot) {
        this.emitTableRowSlotNode(templateNode, `${tableVar}_row`, rowVar, indexVar, dataVar)
      }
    } else {
      // Generate cells for each visible column
      for (const col of node.columns.filter(c => !c.hidden)) {
        this.emitTableCell(tableVar, rowVar, col)
      }
    }
  }

  /**
   * Emit a node inside a table row template with row variable context
   * Similar to emitEachTemplateNode but for table rows with two-way binding support
   */
  private emitTableRowSlotNode(
    node: IRNode,
    parentVar: string,
    rowVar: string,
    indexVar: string,
    dataVar?: string
  ): void {
    const varName = this.sanitizeVarName(node.id) + '_tpl'

    this.emit(`const ${varName} = document.createElement('${node.tag}')`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}[' + ${indexVar} + ']'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Set HTML properties (with row variable binding)
    for (const prop of node.properties) {
      if (prop.name === 'textContent') {
        const value = this.resolveRowTemplateValue(prop.value, rowVar, indexVar)
        this.emit(`${varName}.textContent = ${value}`)
      } else if (prop.name === 'value' && (node.primitive === 'input' || node.primitive === 'textarea')) {
        // Handle two-way binding for row.field
        const value = this.resolveRowTemplateValue(prop.value, rowVar, indexVar)
        this.emit(`${varName}.value = ${value} ?? ''`)
        // Two-way binding: update data array on input
        if (dataVar && typeof prop.value === 'string' && prop.value.includes('__loopVar:')) {
          // Extract the field path from __loopVar:row.field
          const match = prop.value.match(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]+)/)
          if (match) {
            const fieldPath = match[1] // e.g., "row.title" -> we need just "title"
            const field = fieldPath.startsWith(`${rowVar}.`) ? fieldPath.slice(rowVar.length + 1) : fieldPath
            this.emit(`${varName}.addEventListener('input', (e) => {`)
            this.indent++
            this.emit(`${dataVar}[${indexVar}].${field} = e.target.value`)
            this.indent--
            this.emit(`})`)
          }
        }
      } else if (prop.name === 'disabled' || prop.name === 'hidden') {
        this.emit(`${varName}.${prop.name} = ${prop.value}`)
      } else {
        const value = this.resolveRowTemplateValue(prop.value, rowVar, indexVar)
        this.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
      }
    }

    // Apply base styles
    const baseStyles = node.styles.filter(s => !s.state)
    if (baseStyles.length > 0) {
      this.emit(`Object.assign(${varName}.style, {`)
      this.indent++
      for (const style of baseStyles) {
        const value = this.resolveRowTemplateStyleValue(style.value, rowVar)
        this.emit(`'${style.property}': ${value},`)
      }
      this.indent--
      this.emit('})')
    }

    // Handle icon loading
    if (node.primitive === 'icon') {
      const iconProp = node.properties.find(p => p.name === 'textContent')
      if (iconProp && typeof iconProp.value === 'string') {
        const iconName = iconProp.value
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

    // Setup state machine for template nodes
    if (node.stateMachine) {
      this.emitStateMachine(varName, node)
    }

    // Add event listeners
    for (const event of node.events) {
      this.emitTemplateEventListener(varName, event, rowVar)
    }

    // Recursively emit children
    for (const child of node.children) {
      this.emitTableRowSlotNode(child, varName, rowVar, indexVar, dataVar)
    }

    this.emit(`${parentVar}.appendChild(${varName})`)
  }

  /**
   * Resolve a template value with row variable context
   */
  private resolveRowTemplateValue(value: string | number | boolean, rowVar: string, indexVar: string = 'index'): string {
    if (typeof value === 'string') {
      // Check for __loopVar: markers (set by IR for loop variable references)
      if (value.includes('__loopVar:')) {
        let resolved = value.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
        resolved = resolved.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g, '$get("$1")')
        return resolved
      }

      // Check if value contains row variable reference like $row.title
      if (value.includes(`$${rowVar}.`) || value.includes(`\${${rowVar}.`)) {
        const resolved = value.replace(new RegExp(`\\$${rowVar}\\.`, 'g'), `${rowVar}.`)
        return resolved
      }
      // Check for plain row reference $row -> row
      if (value === `$${rowVar}`) {
        return rowVar
      }
      // Check for plain index reference $index -> index
      if (value === `$${indexVar}`) {
        return indexVar
      }
      return `"${this.escapeString(String(value))}"`
    }
    return String(value)
  }

  /**
   * Resolve a style value with row variable context
   */
  private resolveRowTemplateStyleValue(value: string, rowVar: string): string {
    if (value.includes(`$${rowVar}.`) || value.includes(`\${${rowVar}.`)) {
      const resolved = value.replace(new RegExp(`\\$${rowVar}\\.`, 'g'), `${rowVar}.`)
      return resolved
    }
    return `'${value}'`
  }

  /**
   * Generate a table cell with type-specific rendering
   */
  private emitTableCell(tableVar: string, rowVar: string, col: IRTableColumn): void {
    const cellVar = `${tableVar}_cell_${this.sanitizeVarName(col.field)}`

    this.emit(`const ${cellVar} = document.createElement('div')`)
    this.emit(`${cellVar}.className = 'mirror-table-cell'`)

    // Cell styles
    this.emit(`Object.assign(${cellVar}.style, {`)
    this.indent++
    this.emit(`flex: '1',`)
    this.emit(`color: 'var(--text, white)',`)
    if (col.width) {
      this.emit(`width: '${col.width}px',`)
      this.emit(`flex: 'none',`)
    }
    // Apply type-specific styles
    const rendererStyles = getTypeRendererStyles(col.inferredType)
    for (const [prop, value] of Object.entries(rendererStyles)) {
      // Convert CSS property to camelCase
      const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      this.emit(`${camelProp}: '${value}',`)
    }
    this.indent--
    this.emit(`})`)

    // Custom cell template
    if (col.customCell && col.customCell.length > 0) {
      // TODO: Render custom cell template
      this.emit(`// Custom cell template for ${col.field}`)
      this.emit(`${cellVar}.textContent = ${rowVar}.${col.field}`)
    } else {
      // Type-specific value rendering
      const valueExpr = getValueFormatter(col.inferredType, `${rowVar}.${col.field}`, {
        prefix: col.prefix,
        suffix: col.suffix,
      })

      switch (col.inferredType) {
        case 'boolean':
          this.emit(`${cellVar}.innerHTML = ${rowVar}.${col.field} ? '✓' : '✗'`)
          this.emit(`${cellVar}.style.textAlign = 'center'`)
          this.emit(`${cellVar}.style.color = ${rowVar}.${col.field} ? 'var(--success, #10b981)' : 'var(--muted, #666)'`)
          break

        case 'date':
          this.emit(`try {`)
          this.indent++
          this.emit(`${cellVar}.textContent = new Date(${rowVar}.${col.field}).toLocaleDateString('de-DE')`)
          this.indent--
          this.emit(`} catch { ${cellVar}.textContent = ${rowVar}.${col.field} || '' }`)
          break

        case 'relation':
          this.emit(`${cellVar}.textContent = ${rowVar}.${col.field}?.name ?? ${rowVar}.${col.field} ?? ''`)
          this.emit(`${cellVar}.style.color = 'var(--primary, #2563eb)'`)
          break

        case 'array':
          this.emit(`${cellVar}.textContent = Array.isArray(${rowVar}.${col.field}) ? ${rowVar}.${col.field}.join(', ') : ''`)
          break

        case 'number':
          if (col.prefix || col.suffix) {
            this.emit(`${cellVar}.textContent = ${valueExpr}`)
          } else {
            this.emit(`${cellVar}.textContent = ${rowVar}.${col.field}`)
          }
          break

        default:
          if (col.prefix || col.suffix) {
            this.emit(`${cellVar}.textContent = ${valueExpr}`)
          } else {
            this.emit(`${cellVar}.textContent = String(${rowVar}.${col.field} ?? '')`)
          }
      }
    }

    this.emit(`${tableVar}_row.appendChild(${cellVar})`)
  }

  /**
   * Generate grouped table rows
   */
  private emitTableGroupedRows(tableVar: string, dataVar: string, node: IRTable): void {
    this.emit(`// Group by ${node.groupBy}`)
    this.emit(`const ${tableVar}_groups = new Map()`)
    this.emit(`${dataVar}.forEach(row => {`)
    this.indent++
    this.emit(`const key = row.${node.groupBy}`)
    this.emit(`if (!${tableVar}_groups.has(key)) ${tableVar}_groups.set(key, [])`)
    this.emit(`${tableVar}_groups.get(key).push(row)`)
    this.indent--
    this.emit(`})`)
    this.emit('')

    this.emit(`const ${tableVar}_body = document.createElement('div')`)
    this.emit(`${tableVar}_body.className = 'mirror-table-body'`)
    this.emit('')

    this.emit(`${tableVar}_groups.forEach((items, key) => {`)
    this.indent++

    // Group header
    this.emit(`// Group header`)
    this.emit(`const groupHeader = document.createElement('div')`)
    this.emit(`groupHeader.className = 'mirror-table-group-header'`)
    this.emit(`Object.assign(groupHeader.style, {`)
    this.indent++
    this.emit(`display: 'flex',`)
    this.emit(`justifyContent: 'space-between',`)
    this.emit(`padding: '12px',`)
    this.emit(`background: 'var(--surface-elevated, #252525)',`)
    this.emit(`borderBottom: '1px solid var(--border, #333)',`)
    this.indent--
    this.emit(`})`)
    this.emit(`groupHeader.innerHTML = \`<span style="font-weight:500;color:var(--text,white)">\${key?.name ?? key}</span><span style="color:var(--text-muted,#888);font-size:12px">\${items.length}</span>\``)
    this.emit(`${tableVar}_body.appendChild(groupHeader)`)
    this.emit('')

    // Group items
    this.emit(`items.forEach((row, index) => {`)
    this.indent++
    this.emitTableRow(tableVar, 'row', 'index', node, 'items')
    this.emit(`${tableVar}_body.appendChild(${tableVar}_row)`)
    this.indent--
    this.emit(`})`)

    this.indent--
    this.emit(`})`)

    this.emit(`${tableVar}.appendChild(${tableVar}_body)`)
  }

  /**
   * Generate table footer with aggregations
   */
  private emitTableFooter(tableVar: string, dataVar: string, node: IRTable): void {
    this.emit(`// Table footer`)
    this.emit(`const ${tableVar}_footer = document.createElement('div')`)
    this.emit(`${tableVar}_footer.className = 'mirror-table-footer'`)
    this.emit(`Object.assign(${tableVar}_footer.style, {`)
    this.indent++
    this.emit(`display: 'flex',`)
    this.emit(`padding: '12px',`)
    this.emit(`background: 'var(--surface-elevated, #252525)',`)
    this.emit(`borderTop: '1px solid var(--border, #333)',`)
    this.indent--
    this.emit(`})`)

    // Generate footer cells for each visible column
    for (const col of node.columns.filter(c => !c.hidden)) {
      const cellVar = `${tableVar}_fc_${this.sanitizeVarName(col.field)}`
      this.emit(`const ${cellVar} = document.createElement('div')`)
      this.emit(`${cellVar}.className = 'mirror-table-footer-cell'`)

      this.emit(`Object.assign(${cellVar}.style, {`)
      this.indent++
      this.emit(`flex: '1',`)
      this.emit(`fontWeight: '500',`)
      this.emit(`color: 'var(--text, white)',`)
      if (col.width) {
        this.emit(`width: '${col.width}px',`)
        this.emit(`flex: 'none',`)
      }
      if (col.align === 'right') {
        this.emit(`textAlign: 'right',`)
      } else if (col.align === 'center') {
        this.emit(`textAlign: 'center',`)
      }
      this.indent--
      this.emit(`})`)

      if (col.aggregation) {
        switch (col.aggregation) {
          case 'sum':
            this.emit(`${cellVar}.textContent = ${dataVar}.reduce((s, r) => s + (r.${col.field} || 0), 0)${col.suffix ? ` + "${col.suffix}"` : ''}`)
            break
          case 'avg':
            this.emit(`${cellVar}.textContent = (${dataVar}.reduce((s, r) => s + (r.${col.field} || 0), 0) / ${dataVar}.length).toFixed(1)${col.suffix ? ` + "${col.suffix}"` : ''}`)
            break
          case 'count':
            this.emit(`${cellVar}.textContent = ${dataVar}.length`)
            break
        }
      }

      this.emit(`${tableVar}_footer.appendChild(${cellVar})`)
    }

    this.emit(`${tableVar}.appendChild(${tableVar}_footer)`)
  }

  /**
   * Generate selection handling for table
   */
  private emitTableSelection(tableVar: string, dataVar: string, node: IRTable): void {
    this.emit(`// Selection handling: ${node.selectionMode}`)

    if (node.selectionMode === 'single') {
      this.emit(`${tableVar}.addEventListener('click', (e) => {`)
      this.indent++
      this.emit(`const row = e.target.closest('.mirror-table-row')`)
      this.emit(`if (!row) return`)
      this.emit(`${tableVar}.querySelectorAll('.mirror-table-row').forEach(r => {`)
      this.indent++
      this.emit(`r.classList.remove('selected')`)
      this.emit(`r.style.background = ''`)
      this.indent--
      this.emit(`})`)
      this.emit(`row.classList.add('selected')`)
      this.emit(`row.style.background = 'var(--primary-alpha, rgba(37, 99, 235, 0.15))'`)
      this.emit(`const index = parseInt(row.dataset.index)`)
      this.emit(`window.$selected = ${dataVar}[index]`)
      this.emit(`_runtime.notifyChange('$selected')`)
      this.indent--
      this.emit(`})`)
    } else {
      // Multi-selection
      this.emit(`window.$selection = window.$selection || []`)
      this.emit(`${tableVar}.addEventListener('click', (e) => {`)
      this.indent++
      this.emit(`const row = e.target.closest('.mirror-table-row')`)
      this.emit(`if (!row) return`)
      this.emit(`const index = parseInt(row.dataset.index)`)
      this.emit(`const item = ${dataVar}[index]`)
      this.emit(`if (row.classList.contains('selected')) {`)
      this.indent++
      this.emit(`row.classList.remove('selected')`)
      this.emit(`row.style.background = ''`)
      this.emit(`window.$selection = window.$selection.filter(i => i !== item)`)
      this.indent--
      this.emit(`} else {`)
      this.indent++
      this.emit(`row.classList.add('selected')`)
      this.emit(`row.style.background = 'var(--primary-alpha, rgba(37, 99, 235, 0.15))'`)
      this.emit(`window.$selection.push(item)`)
      this.indent--
      this.emit(`}`)
      this.emit(`_runtime.notifyChange('$selection')`)
      this.indent--
      this.emit(`})`)
    }
  }

  private emitZagComponent(node: IRZagNode, parentVar: string): void {
    // Route to specialized emitters for complex components
    if (node.zagType === 'tabs') {
      this.emitTabsComponent(node, parentVar)
      return
    }
    if (node.zagType === 'switch') {
      this.emitSwitchComponent(node, parentVar)
      return
    }
    if (node.zagType === 'datepicker' || node.zagType === 'date-picker') {
      this.emitDatePickerComponent(node, parentVar)
      return
    }
    if (node.zagType === 'number-input' || node.zagType === 'numberinput') {
      this.emitNumberInputComponent(node, parentVar)
      return
    }
    if (node.zagType === 'tags-input' || node.zagType === 'tagsinput') {
      this.emitTagsInputComponent(node, parentVar)
      return
    }
    if (node.zagType === 'editable') {
      this.emitEditableComponent(node, parentVar)
      return
    }
    if (node.zagType === 'checkbox') {
      this.emitCheckboxComponent(node, parentVar)
      return
    }
    if (node.zagType === 'accordion') {
      this.emitAccordionComponent(node, parentVar)
      return
    }
    if (node.zagType === 'listbox') {
      this.emitListboxComponent(node, parentVar)
      return
    }
    if (node.zagType === 'select') {
      this.emitSelectComponent(node, parentVar)
      return
    }
    if (node.zagType === 'radio-group' || node.zagType === 'radiogroup') {
      this.emitRadioGroupComponent(node, parentVar)
      return
    }
    if (node.zagType === 'slider') {
      this.emitSliderComponent(node, parentVar)
      return
    }
    if (node.zagType === 'pin-input' || node.zagType === 'pininput') {
      this.emitPinInputComponent(node, parentVar)
      return
    }
    if (node.zagType === 'password-input' || node.zagType === 'passwordinput') {
      this.emitPasswordInputComponent(node, parentVar)
      return
    }
    if (node.zagType === 'progress') {
      this.emitProgressComponent(node, parentVar)
      return
    }
    if (node.zagType === 'circular-progress' || node.zagType === 'circularprogress') {
      this.emitCircularProgressComponent(node, parentVar)
      return
    }
    if (node.zagType === 'avatar') {
      this.emitAvatarComponent(node, parentVar)
      return
    }
    if (node.zagType === 'file-upload' || node.zagType === 'fileupload') {
      this.emitFileUploadComponent(node, parentVar)
      return
    }
    if (node.zagType === 'carousel') {
      this.emitCarouselComponent(node, parentVar)
      return
    }
    if (node.zagType === 'steps' || node.zagType === 'stepper') {
      this.emitStepsComponent(node, parentVar)
      return
    }
    if (node.zagType === 'pagination') {
      this.emitPaginationComponent(node, parentVar)
      return
    }
    if (node.zagType === 'tree-view' || node.zagType === 'treeview') {
      this.emitTreeViewComponent(node, parentVar)
      return
    }
    if (node.zagType === 'sidenav' || node.zagType === 'side-nav') {
      this.emitSideNavComponent(node, parentVar)
      return
    }
    if (node.zagType === 'segmented-control' || node.zagType === 'segmentedcontrol') {
      this.emitSegmentedControlComponent(node, parentVar)
      return
    }
    if (node.zagType === 'toggle-group' || node.zagType === 'togglegroup') {
      this.emitToggleGroupComponent(node, parentVar)
      return
    }
    // Group 5: Overlays
    if (node.zagType === 'collapsible') {
      this.emitCollapsibleComponent(node, parentVar)
      return
    }
    if (node.zagType === 'tooltip') {
      this.emitTooltipComponent(node, parentVar)
      return
    }
    if (node.zagType === 'popover') {
      this.emitPopoverComponent(node, parentVar)
      return
    }
    if (node.zagType === 'hover-card' || node.zagType === 'hovercard') {
      this.emitHoverCardComponent(node, parentVar)
      return
    }
    if (node.zagType === 'dialog') {
      this.emitDialogComponent(node, parentVar)
      return
    }
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
    items: any[],
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
          const hasLayoutProp = item.properties?.some((p: any) =>
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

  /**
   * Emit Tabs component with content-items pattern
   * Structure: Root > List (contains Triggers + Indicator) + Content panels
   */
  private emitTabsComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Tabs Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'tabs'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'tabs',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.emit(`items: ${JSON.stringify(node.items.map((item: any) => ({
      value: item.value,
      label: item.label,
      disabled: item.disabled
    })))},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Create List slot (contains triggers)
    const listVar = `${varName}_list`
    const listSlot = node.slots['List']
    this.emit(`// List slot (tab bar)`)
    this.emit(`const ${listVar} = document.createElement('div')`)
    this.emit(`${listVar}.dataset.slot = 'List'`)
    this.emit(`${listVar}.setAttribute('role', 'tablist')`)
    if (listSlot?.styles && listSlot.styles.length > 0) {
      this.emit(`${listVar}.setAttribute('data-styled', 'true')`)
      this.emit(`Object.assign(${listVar}.style, {`)
      this.indent++
      for (const style of listSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${listVar})`)
    this.emit('')

    // Create Trigger for each item (inside List)
    const triggerSlot = node.slots['Trigger']
    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i] as any
      const triggerVar = `${varName}_trigger${i}`
      this.emit(`// Tab trigger: ${item.label}`)
      this.emit(`const ${triggerVar} = document.createElement('button')`)
      this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
      this.emit(`${triggerVar}.dataset.value = '${this.escapeString(item.value)}'`)
      this.emit(`${triggerVar}.setAttribute('role', 'tab')`)
      this.emit(`${triggerVar}.setAttribute('type', 'button')`)
      this.emit(`${triggerVar}.textContent = '${this.escapeString(item.label)}'`)
      if (item.disabled) {
        this.emit(`${triggerVar}.disabled = true`)
        this.emit(`${triggerVar}.setAttribute('data-disabled', 'true')`)
      }
      if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
        this.emit(`${triggerVar}.setAttribute('data-styled', 'true')`)
        this.emit(`Object.assign(${triggerVar}.style, {`)
        this.indent++
        for (const style of triggerSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${listVar}.appendChild(${triggerVar})`)
      this.emit('')
    }

    // Create Indicator (inside List, after triggers)
    const indicatorSlot = node.slots['Indicator']
    const indicatorVar = `${varName}_indicator`
    this.emit(`// Tab indicator`)
    this.emit(`const ${indicatorVar} = document.createElement('div')`)
    this.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
    if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
      this.emit(`${indicatorVar}.setAttribute('data-styled', 'true')`)
      this.emit(`Object.assign(${indicatorVar}.style, {`)
      this.indent++
      for (const style of indicatorSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    // Render custom indicator children if present
    if (indicatorSlot?.children && indicatorSlot.children.length > 0) {
      this.emit(`${indicatorVar}.setAttribute('data-custom-indicator', 'true')`)
      for (const child of indicatorSlot.children) {
        this.emitNode(child, indicatorVar)
      }
    }
    this.emit(`${listVar}.appendChild(${indicatorVar})`)
    this.emit('')

    // Create Content panel for each item (after List)
    const contentSlot = node.slots['Content']
    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i] as any
      const contentVar = `${varName}_content${i}`
      this.emit(`// Tab content: ${item.label}`)
      this.emit(`const ${contentVar} = document.createElement('div')`)
      this.emit(`${contentVar}.dataset.slot = 'Content'`)
      this.emit(`${contentVar}.dataset.value = '${this.escapeString(item.value)}'`)
      this.emit(`${contentVar}.setAttribute('role', 'tabpanel')`)
      this.emit(`${contentVar}.setAttribute('tabindex', '0')`)
      if (contentSlot?.styles && contentSlot.styles.length > 0) {
        this.emit(`${contentVar}.setAttribute('data-styled', 'true')`)
        this.emit(`Object.assign(${contentVar}.style, {`)
        this.indent++
        for (const style of contentSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      // Render children content or load from file
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          this.emitNode(child, contentVar)
        }
      } else if (item.loadFromFile) {
        // Mark for lazy loading from external file
        this.emit(`${contentVar}.dataset.loadFromFile = '${this.escapeString(item.loadFromFile)}'`)
      }
      this.emit(`${varName}.appendChild(${contentVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Tabs via runtime
    this.emit(`// Initialize Tabs`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initTabsComponent) {`)
    this.indent++
    this.emit(`_runtime.initTabsComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  /**
   * Emit Switch component (slots-only pattern)
   * Structure: label > [track > thumb] [labelText]
   */
  private emitSwitchComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Switch Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('label')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'switch'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'switch',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Create Track (the sliding background)
    const trackSlot = node.slots['Track']
    const trackVar = `${varName}_track`
    this.emit(`// Track (background)`)
    this.emit(`const ${trackVar} = document.createElement('span')`)
    this.emit(`${trackVar}.dataset.slot = 'Track'`)
    if (trackSlot?.styles && trackSlot.styles.length > 0) {
      this.emit(`Object.assign(${trackVar}.style, {`)
      this.indent++
      for (const style of trackSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${trackVar})`)
    this.emit('')

    // Create Thumb (the sliding circle)
    const thumbSlot = node.slots['Thumb']
    const thumbVar = `${varName}_thumb`
    this.emit(`// Thumb (slider)`)
    this.emit(`const ${thumbVar} = document.createElement('span')`)
    this.emit(`${thumbVar}.dataset.slot = 'Thumb'`)
    if (thumbSlot?.styles && thumbSlot.styles.length > 0) {
      this.emit(`Object.assign(${thumbVar}.style, {`)
      this.indent++
      for (const style of thumbSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${trackVar}.appendChild(${thumbVar})`)
    this.emit('')

    // Create Label (text)
    const labelText = (node.machineConfig?.label as string) || ''
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label text`)
      this.emit(`const ${labelVar} = document.createElement('span')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Switch via runtime
    this.emit(`// Initialize Switch`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initSwitchComponent) {`)
    this.indent++
    this.emit(`_runtime.initSwitchComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitDatePickerComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// DatePicker Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'datepicker'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'datepicker',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Create Control (wrapper for Input + Trigger)
    const controlSlot = node.slots['Control']
    const controlVar = `${varName}_control`
    this.emit(`// Control (Input + Trigger wrapper)`)
    this.emit(`const ${controlVar} = document.createElement('div')`)
    this.emit(`${controlVar}.dataset.slot = 'Control'`)
    if (controlSlot?.styles && controlSlot.styles.length > 0) {
      this.emit(`Object.assign(${controlVar}.style, {`)
      this.indent++
      for (const style of controlSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${controlVar})`)
    this.emit('')

    // Create Input
    const inputSlot = node.slots['Input']
    const inputVar = `${varName}_input`
    this.emit(`// Input`)
    this.emit(`const ${inputVar} = document.createElement('input')`)
    this.emit(`${inputVar}.type = 'text'`)
    this.emit(`${inputVar}.dataset.slot = 'Input'`)
    const placeholder = (node.machineConfig?.placeholder as string) || 'Select date...'
    this.emit(`${inputVar}.placeholder = '${this.escapeString(placeholder)}'`)
    if (inputSlot?.styles && inputSlot.styles.length > 0) {
      this.emit(`Object.assign(${inputVar}.style, {`)
      this.indent++
      for (const style of inputSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${inputVar})`)
    this.emit('')

    // Create Trigger (calendar icon button)
    const triggerSlot = node.slots['Trigger']
    const triggerVar = `${varName}_trigger`
    this.emit(`// Trigger (calendar button)`)
    this.emit(`const ${triggerVar} = document.createElement('button')`)
    this.emit(`${triggerVar}.type = 'button'`)
    this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    this.emit(`${triggerVar}.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'`)
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${triggerVar}.style, {`)
      this.indent++
      for (const style of triggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${triggerVar})`)
    this.emit('')

    // Create Content (calendar popup - will be populated by runtime)
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content (calendar popup)`)
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
    this.emit(`${varName}.appendChild(${contentVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize DatePicker via runtime
    this.emit(`// Initialize DatePicker`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initDatePickerComponent) {`)
    this.indent++
    this.emit(`_runtime.initDatePickerComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  /**
   * Emit NumberInput component
   * Structure: Root > Control (DecrementTrigger + Input + IncrementTrigger)
   */
  private emitNumberInputComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// NumberInput Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'numberinput'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'numberinput',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Create Label if present
    const labelText = (node.machineConfig?.label as string) || ''
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create Control (wrapper)
    const controlSlot = node.slots['Control']
    const controlVar = `${varName}_control`
    this.emit(`// Control (wrapper)`)
    this.emit(`const ${controlVar} = document.createElement('div')`)
    this.emit(`${controlVar}.dataset.slot = 'Control'`)
    if (controlSlot?.styles && controlSlot.styles.length > 0) {
      this.emit(`Object.assign(${controlVar}.style, {`)
      this.indent++
      for (const style of controlSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${controlVar})`)
    this.emit('')

    // Create Decrement Trigger
    const decrementSlot = node.slots['DecrementTrigger']
    const decrementVar = `${varName}_decrement`
    this.emit(`// Decrement Trigger`)
    this.emit(`const ${decrementVar} = document.createElement('button')`)
    this.emit(`${decrementVar}.type = 'button'`)
    this.emit(`${decrementVar}.dataset.slot = 'DecrementTrigger'`)
    this.emit(`${decrementVar}.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>'`)
    this.emit(`${decrementVar}.setAttribute('aria-label', 'Decrease value')`)
    if (decrementSlot?.styles && decrementSlot.styles.length > 0) {
      this.emit(`Object.assign(${decrementVar}.style, {`)
      this.indent++
      for (const style of decrementSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${decrementVar})`)
    this.emit('')

    // Create Input
    const inputSlot = node.slots['Input']
    const inputVar = `${varName}_input`
    this.emit(`// Input`)
    this.emit(`const ${inputVar} = document.createElement('input')`)
    this.emit(`${inputVar}.type = 'text'`)
    this.emit(`${inputVar}.inputMode = 'decimal'`)
    this.emit(`${inputVar}.dataset.slot = 'Input'`)
    const placeholder = (node.machineConfig?.placeholder as string) || ''
    if (placeholder) {
      this.emit(`${inputVar}.placeholder = '${this.escapeString(placeholder)}'`)
    }
    if (inputSlot?.styles && inputSlot.styles.length > 0) {
      this.emit(`Object.assign(${inputVar}.style, {`)
      this.indent++
      for (const style of inputSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${inputVar})`)
    this.emit('')

    // Create Increment Trigger
    const incrementSlot = node.slots['IncrementTrigger']
    const incrementVar = `${varName}_increment`
    this.emit(`// Increment Trigger`)
    this.emit(`const ${incrementVar} = document.createElement('button')`)
    this.emit(`${incrementVar}.type = 'button'`)
    this.emit(`${incrementVar}.dataset.slot = 'IncrementTrigger'`)
    this.emit(`${incrementVar}.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'`)
    this.emit(`${incrementVar}.setAttribute('aria-label', 'Increase value')`)
    if (incrementSlot?.styles && incrementSlot.styles.length > 0) {
      this.emit(`Object.assign(${incrementVar}.style, {`)
      this.indent++
      for (const style of incrementSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${incrementVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize NumberInput via runtime
    this.emit(`// Initialize NumberInput`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initNumberInputComponent) {`)
    this.indent++
    this.emit(`_runtime.initNumberInputComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  /**
   * Emit TagsInput component
   * Structure: Root > Control (Tags + Input) + HiddenInput
   */
  private emitTagsInputComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// TagsInput Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'tagsinput'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'tagsinput',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Create Label if present
    const labelText = (node.machineConfig?.label as string) || ''
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create Control (wrapper for tags + input)
    const controlSlot = node.slots['Control']
    const controlVar = `${varName}_control`
    this.emit(`// Control (tags container)`)
    this.emit(`const ${controlVar} = document.createElement('div')`)
    this.emit(`${controlVar}.dataset.slot = 'Control'`)
    if (controlSlot?.styles && controlSlot.styles.length > 0) {
      this.emit(`Object.assign(${controlVar}.style, {`)
      this.indent++
      for (const style of controlSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${controlVar})`)
    this.emit('')

    // Create Input
    const inputSlot = node.slots['Input']
    const inputVar = `${varName}_input`
    this.emit(`// Input`)
    this.emit(`const ${inputVar} = document.createElement('input')`)
    this.emit(`${inputVar}.type = 'text'`)
    this.emit(`${inputVar}.dataset.slot = 'Input'`)
    const placeholder = (node.machineConfig?.placeholder as string) || 'Add tag...'
    this.emit(`${inputVar}.placeholder = '${this.escapeString(placeholder)}'`)
    if (inputSlot?.styles && inputSlot.styles.length > 0) {
      this.emit(`Object.assign(${inputVar}.style, {`)
      this.indent++
      for (const style of inputSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${inputVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize TagsInput via runtime
    this.emit(`// Initialize TagsInput`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initTagsInputComponent) {`)
    this.indent++
    this.emit(`_runtime.initTagsInputComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  /**
   * Emit Editable component
   * Structure: Root > Area (Preview + Input) + Control (EditTrigger + SubmitTrigger + CancelTrigger)
   */
  private emitEditableComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Editable Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'editable'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'editable',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Create Area (contains Preview and Input)
    const areaSlot = node.slots['Area']
    const areaVar = `${varName}_area`
    this.emit(`// Area (Preview + Input container)`)
    this.emit(`const ${areaVar} = document.createElement('div')`)
    this.emit(`${areaVar}.dataset.slot = 'Area'`)
    if (areaSlot?.styles && areaSlot.styles.length > 0) {
      this.emit(`Object.assign(${areaVar}.style, {`)
      this.indent++
      for (const style of areaSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${areaVar})`)
    this.emit('')

    // Create Preview
    const previewSlot = node.slots['Preview']
    const previewVar = `${varName}_preview`
    this.emit(`// Preview (display text)`)
    this.emit(`const ${previewVar} = document.createElement('span')`)
    this.emit(`${previewVar}.dataset.slot = 'Preview'`)
    const defaultValue = (node.machineConfig?.defaultValue as string) || (node.machineConfig?.value as string) || ''
    const placeholder = (node.machineConfig?.placeholder as string) || 'Click to edit...'
    this.emit(`${previewVar}.textContent = '${this.escapeString(defaultValue || placeholder)}'`)
    if (previewSlot?.styles && previewSlot.styles.length > 0) {
      this.emit(`Object.assign(${previewVar}.style, {`)
      this.indent++
      for (const style of previewSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${areaVar}.appendChild(${previewVar})`)
    this.emit('')

    // Create Input (hidden initially)
    const inputSlot = node.slots['Input']
    const inputVar = `${varName}_input`
    this.emit(`// Input (edit mode)`)
    this.emit(`const ${inputVar} = document.createElement('input')`)
    this.emit(`${inputVar}.type = 'text'`)
    this.emit(`${inputVar}.dataset.slot = 'Input'`)
    this.emit(`${inputVar}.value = '${this.escapeString(defaultValue)}'`)
    this.emit(`${inputVar}.placeholder = '${this.escapeString(placeholder)}'`)
    if (inputSlot?.styles && inputSlot.styles.length > 0) {
      this.emit(`Object.assign(${inputVar}.style, {`)
      this.indent++
      for (const style of inputSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${areaVar}.appendChild(${inputVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Editable via runtime
    this.emit(`// Initialize Editable`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initEditableComponent) {`)
    this.indent++
    this.emit(`_runtime.initEditableComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitCheckboxComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Checkbox Component: ${node.name}`)
    // Root is a label element for accessibility
    this.emit(`const ${varName} = document.createElement('label')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'checkbox'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'checkbox',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create HiddenInput (for form submission)
    const hiddenInputVar = `${varName}_hiddenInput`
    this.emit(`// HiddenInput (form submission)`)
    this.emit(`const ${hiddenInputVar} = document.createElement('input')`)
    this.emit(`${hiddenInputVar}.type = 'checkbox'`)
    this.emit(`${hiddenInputVar}.dataset.slot = 'HiddenInput'`)
    this.emit(`${hiddenInputVar}.style.position = 'absolute'`)
    this.emit(`${hiddenInputVar}.style.width = '1px'`)
    this.emit(`${hiddenInputVar}.style.height = '1px'`)
    this.emit(`${hiddenInputVar}.style.padding = '0'`)
    this.emit(`${hiddenInputVar}.style.margin = '-1px'`)
    this.emit(`${hiddenInputVar}.style.overflow = 'hidden'`)
    this.emit(`${hiddenInputVar}.style.clip = 'rect(0, 0, 0, 0)'`)
    this.emit(`${hiddenInputVar}.style.whiteSpace = 'nowrap'`)
    this.emit(`${hiddenInputVar}.style.border = '0'`)
    const formName = (node.machineConfig?.name as string) || ''
    if (formName) {
      this.emit(`${hiddenInputVar}.name = '${this.escapeString(formName)}'`)
    }
    this.emit(`${varName}.appendChild(${hiddenInputVar})`)
    this.emit('')

    // Create Control (the visual checkbox box)
    const controlSlot = node.slots['Control']
    const controlVar = `${varName}_control`
    this.emit(`// Control (visual checkbox)`)
    this.emit(`const ${controlVar} = document.createElement('div')`)
    this.emit(`${controlVar}.dataset.slot = 'Control'`)
    if (controlSlot?.styles && controlSlot.styles.length > 0) {
      this.emit(`Object.assign(${controlVar}.style, {`)
      this.indent++
      for (const style of controlSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${controlVar})`)
    this.emit('')

    // Create Indicator (checkmark icon inside Control)
    const indicatorSlot = node.slots['Indicator']
    const indicatorVar = `${varName}_indicator`
    this.emit(`// Indicator (checkmark)`)
    this.emit(`const ${indicatorVar} = document.createElement('span')`)
    this.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
    // Icon can be customized via machineConfig
    const checkboxIcon = node.machineConfig.icon || 'check'
    this.emit(`${indicatorVar}.dataset.icon = '${this.escapeString(String(checkboxIcon))}'`)
    if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
      this.emit(`Object.assign(${indicatorVar}.style, {`)
      this.indent++
      for (const style of indicatorSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${indicatorVar})`)
    this.emit('')

    // Create Label (text)
    const labelText = (node.machineConfig?.label as string) || ''
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('span')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Checkbox via runtime
    this.emit(`// Initialize Checkbox`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initCheckboxComponent) {`)
    this.indent++
    this.emit(`_runtime.initCheckboxComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitAccordionComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Accordion Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'accordion'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'accordion',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.emit(`items: ${JSON.stringify(node.items.map((item: any) => ({
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

    // Create Item containers for each accordion item
    const itemSlot = node.slots['Item']
    const triggerSlot = node.slots['ItemTrigger']
    const contentSlot = node.slots['ItemContent']
    const indicatorSlot = node.slots['ItemIndicator']

    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i] as any
      const itemVar = `${varName}_item${i}`
      const itemValue = item.value || `item-${i}`

      // Item container
      this.emit(`// Accordion Item: ${item.label || itemValue}`)
      this.emit(`const ${itemVar} = document.createElement('div')`)
      this.emit(`${itemVar}.dataset.slot = 'Item'`)
      this.emit(`${itemVar}.dataset.value = '${this.escapeString(itemValue)}'`)
      if (item.disabled) {
        this.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
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

      // ItemTrigger (header/button)
      const triggerVar = `${itemVar}_trigger`
      this.emit(`const ${triggerVar} = document.createElement('button')`)
      this.emit(`${triggerVar}.type = 'button'`)
      this.emit(`${triggerVar}.dataset.slot = 'ItemTrigger'`)
      this.emit(`${triggerVar}.dataset.value = '${this.escapeString(itemValue)}'`)
      this.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
      if (item.disabled) {
        this.emit(`${triggerVar}.disabled = true`)
      }
      if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
        this.emit(`Object.assign(${triggerVar}.style, {`)
        this.indent++
        for (const style of triggerSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }

      // Trigger text
      const triggerTextVar = `${triggerVar}_text`
      this.emit(`const ${triggerTextVar} = document.createElement('span')`)
      this.emit(`${triggerTextVar}.textContent = '${this.escapeString(item.label || itemValue)}'`)
      this.emit(`${triggerVar}.appendChild(${triggerTextVar})`)

      // ItemIndicator (icon loaded via runtime)
      const indicatorVar = `${itemVar}_indicator`
      const accordionIcon = node.machineConfig.icon || 'chevron-down'
      this.emit(`const ${indicatorVar} = document.createElement('span')`)
      this.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
      this.emit(`${indicatorVar}.dataset.icon = '${this.escapeString(String(accordionIcon))}'`)
      if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
        this.emit(`Object.assign(${indicatorVar}.style, {`)
        this.indent++
        for (const style of indicatorSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${triggerVar}.appendChild(${indicatorVar})`)

      this.emit(`${itemVar}.appendChild(${triggerVar})`)

      // ItemContent (collapsible body)
      const contentVar = `${itemVar}_content`
      this.emit(`const ${contentVar} = document.createElement('div')`)
      this.emit(`${contentVar}.dataset.slot = 'ItemContent'`)
      this.emit(`${contentVar}.dataset.value = '${this.escapeString(itemValue)}'`)
      this.emit(`${contentVar}.setAttribute('role', 'region')`)
      if (contentSlot?.styles && contentSlot.styles.length > 0) {
        this.emit(`Object.assign(${contentVar}.style, {`)
        this.indent++
        for (const style of contentSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }

      // Render item children inside content
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          this.emitNode(child, contentVar)
        }
      }

      this.emit(`${itemVar}.appendChild(${contentVar})`)
      this.emit(`${varName}.appendChild(${itemVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Accordion via runtime
    this.emit(`// Initialize Accordion`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initAccordionComponent) {`)
    this.indent++
    this.emit(`_runtime.initAccordionComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

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
    this.emit(`items: ${JSON.stringify(node.items.map((item: any) => ({
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
      const item = node.items[i] as any
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

  private emitSelectComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Select Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'select'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'select',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.emit(`items: ${JSON.stringify(node.items.map((item: any) => ({
      value: item.value,
      label: item.label,
      disabled: item.disabled,
      icon: item.icon
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

    // Create Trigger
    const triggerSlot = node.slots['Trigger']
    const triggerVar = `${varName}_trigger`
    const placeholder = node.machineConfig.placeholder || 'Select...'
    this.emit(`// Trigger`)
    this.emit(`const ${triggerVar} = document.createElement('button')`)
    this.emit(`${triggerVar}.type = 'button'`)
    this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    this.emit(`${triggerVar}.setAttribute('role', 'combobox')`)
    this.emit(`${triggerVar}.setAttribute('aria-haspopup', 'listbox')`)
    this.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${triggerVar}.style, {`)
      this.indent++
      for (const style of triggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Trigger text (value display)
    const triggerTextVar = `${triggerVar}_text`
    this.emit(`const ${triggerTextVar} = document.createElement('span')`)
    this.emit(`${triggerTextVar}.dataset.slot = 'TriggerText'`)
    this.emit(`${triggerTextVar}.textContent = '${this.escapeString(String(placeholder))}'`)
    this.emit(`${triggerVar}.appendChild(${triggerTextVar})`)

    // Trigger arrow icon
    const triggerArrowVar = `${triggerVar}_arrow`
    this.emit(`const ${triggerArrowVar} = document.createElement('span')`)
    this.emit(`${triggerArrowVar}.dataset.slot = 'TriggerArrow'`)
    this.emit(`${triggerArrowVar}.dataset.icon = 'chevron-down'`)
    this.emit(`${triggerVar}.appendChild(${triggerArrowVar})`)

    this.emit(`${varName}.appendChild(${triggerVar})`)
    this.emit('')

    // Create Content (dropdown)
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content (dropdown)`)
    this.emit(`const ${contentVar} = document.createElement('div')`)
    this.emit(`${contentVar}.dataset.slot = 'Content'`)
    this.emit(`${contentVar}.setAttribute('role', 'listbox')`)
    if (contentSlot?.styles && contentSlot.styles.length > 0) {
      this.emit(`Object.assign(${contentVar}.style, {`)
      this.indent++
      for (const style of contentSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit('')

    // Create Items
    const itemSlot = node.slots['Item']
    const indicatorSlot = node.slots['ItemIndicator']
    const selectIcon = node.machineConfig.icon || 'check'

    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i] as any
      const itemVar = `${varName}_item${i}`
      const itemValue = item.value || item.label || `item-${i}`
      const itemLabel = item.label || itemValue

      this.emit(`// Item: ${itemLabel}`)
      this.emit(`const ${itemVar} = document.createElement('div')`)
      this.emit(`${itemVar}.dataset.slot = 'Item'`)
      this.emit(`${itemVar}.dataset.value = '${this.escapeString(String(itemValue))}'`)
      this.emit(`${itemVar}.setAttribute('role', 'option')`)
      if (item.disabled) {
        this.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
      }
      // Set icon for this item (item-specific or global)
      const itemIcon = item.icon || selectIcon
      this.emit(`${itemVar}.dataset.icon = '${this.escapeString(String(itemIcon))}'`)

      if (itemSlot?.styles && itemSlot.styles.length > 0) {
        this.emit(`Object.assign(${itemVar}.style, {`)
        this.indent++
        for (const style of itemSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }

      // Item text
      const itemTextVar = `${itemVar}_text`
      this.emit(`const ${itemTextVar} = document.createElement('span')`)
      this.emit(`${itemTextVar}.dataset.slot = 'ItemText'`)
      this.emit(`${itemTextVar}.textContent = '${this.escapeString(String(itemLabel))}'`)
      this.emit(`${itemVar}.appendChild(${itemTextVar})`)

      // Item indicator (checkmark)
      const indicatorVar = `${itemVar}_indicator`
      this.emit(`const ${indicatorVar} = document.createElement('span')`)
      this.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
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

      this.emit(`${contentVar}.appendChild(${itemVar})`)
      this.emit('')
    }

    this.emit(`${varName}.appendChild(${contentVar})`)

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Select via runtime
    this.emit(`// Initialize Select`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initSelectComponent) {`)
    this.indent++
    this.emit(`_runtime.initSelectComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitRadioGroupComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// RadioGroup Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'radio-group'`)
    this.emit(`${varName}.setAttribute('role', 'radiogroup')`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'radio-group',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.emit(`items: ${JSON.stringify(node.items.map((item: any) => ({
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

    // Create Label if exists
    const labelText = node.machineConfig.label as string
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Group Label`)
      this.emit(`const ${labelVar} = document.createElement('span')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create Items
    const itemSlot = node.slots['Item']
    const controlSlot = node.slots['ItemControl']
    const textSlot = node.slots['ItemText']

    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i] as any
      const itemVar = `${varName}_item${i}`
      const itemValue = item.value || item.label || `item-${i}`
      const itemLabel = item.label || itemValue

      this.emit(`// Radio Item: ${itemLabel}`)
      this.emit(`const ${itemVar} = document.createElement('label')`)
      this.emit(`${itemVar}.dataset.slot = 'Item'`)
      this.emit(`${itemVar}.dataset.value = '${this.escapeString(String(itemValue))}'`)
      if (item.disabled) {
        this.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
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

      // ItemControl (the radio circle)
      const controlVar = `${itemVar}_control`
      this.emit(`const ${controlVar} = document.createElement('div')`)
      this.emit(`${controlVar}.dataset.slot = 'ItemControl'`)
      this.emit(`${controlVar}.setAttribute('role', 'radio')`)
      this.emit(`${controlVar}.setAttribute('aria-checked', 'false')`)
      if (controlSlot?.styles && controlSlot.styles.length > 0) {
        this.emit(`Object.assign(${controlVar}.style, {`)
        this.indent++
        for (const style of controlSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${itemVar}.appendChild(${controlVar})`)

      // ItemText
      const textVar = `${itemVar}_text`
      this.emit(`const ${textVar} = document.createElement('span')`)
      this.emit(`${textVar}.dataset.slot = 'ItemText'`)
      this.emit(`${textVar}.textContent = '${this.escapeString(String(itemLabel))}'`)
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

      this.emit(`${varName}.appendChild(${itemVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize RadioGroup via runtime
    this.emit(`// Initialize RadioGroup`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initRadioGroupComponent) {`)
    this.indent++
    this.emit(`_runtime.initRadioGroupComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitSliderComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Slider Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'slider'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'slider',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Label if exists
    const labelText = node.machineConfig.label as string
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create Track
    const trackSlot = node.slots['Track']
    const trackVar = `${varName}_track`
    this.emit(`// Track`)
    this.emit(`const ${trackVar} = document.createElement('div')`)
    this.emit(`${trackVar}.dataset.slot = 'Track'`)
    if (trackSlot?.styles && trackSlot.styles.length > 0) {
      this.emit(`Object.assign(${trackVar}.style, {`)
      this.indent++
      for (const style of trackSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Create Range (filled portion)
    const rangeSlot = node.slots['Range']
    const rangeVar = `${varName}_range`
    this.emit(`// Range (filled portion)`)
    this.emit(`const ${rangeVar} = document.createElement('div')`)
    this.emit(`${rangeVar}.dataset.slot = 'Range'`)
    if (rangeSlot?.styles && rangeSlot.styles.length > 0) {
      this.emit(`Object.assign(${rangeVar}.style, {`)
      this.indent++
      for (const style of rangeSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${trackVar}.appendChild(${rangeVar})`)

    // Create Thumb
    const thumbSlot = node.slots['Thumb']
    const thumbVar = `${varName}_thumb`
    this.emit(`// Thumb`)
    this.emit(`const ${thumbVar} = document.createElement('div')`)
    this.emit(`${thumbVar}.dataset.slot = 'Thumb'`)
    this.emit(`${thumbVar}.setAttribute('role', 'slider')`)
    this.emit(`${thumbVar}.setAttribute('tabindex', '0')`)
    if (thumbSlot?.styles && thumbSlot.styles.length > 0) {
      this.emit(`Object.assign(${thumbVar}.style, {`)
      this.indent++
      for (const style of thumbSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${trackVar}.appendChild(${thumbVar})`)

    this.emit(`${varName}.appendChild(${trackVar})`)
    this.emit('')

    // Create ValueText if needed
    const valueTextSlot = node.slots['ValueText']
    if (valueTextSlot) {
      const valueTextVar = `${varName}_valueText`
      this.emit(`// ValueText`)
      this.emit(`const ${valueTextVar} = document.createElement('span')`)
      this.emit(`${valueTextVar}.dataset.slot = 'ValueText'`)
      if (valueTextSlot.styles && valueTextSlot.styles.length > 0) {
        this.emit(`Object.assign(${valueTextVar}.style, {`)
        this.indent++
        for (const style of valueTextSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${valueTextVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Slider via runtime
    this.emit(`// Initialize Slider`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initSliderComponent) {`)
    this.indent++
    this.emit(`_runtime.initSliderComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitPinInputComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// PinInput Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'pin-input'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'pin-input',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Label if exists
    const labelText = node.machineConfig.label as string
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create Control container
    const controlSlot = node.slots['Control']
    const controlVar = `${varName}_control`
    this.emit(`// Control (input container)`)
    this.emit(`const ${controlVar} = document.createElement('div')`)
    this.emit(`${controlVar}.dataset.slot = 'Control'`)
    if (controlSlot?.styles && controlSlot.styles.length > 0) {
      this.emit(`Object.assign(${controlVar}.style, {`)
      this.indent++
      for (const style of controlSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Create input fields based on length
    const length = (node.machineConfig.length as number) || 4
    const inputSlot = node.slots['Input']
    this.emit(`// Input fields`)
    this.emit(`for (let i = 0; i < ${length}; i++) {`)
    this.indent++
    this.emit(`const input = document.createElement('input')`)
    this.emit(`input.dataset.slot = 'Input'`)
    this.emit(`input.dataset.index = String(i)`)
    this.emit(`input.type = 'text'`)
    this.emit(`input.maxLength = 1`)
    this.emit(`input.inputMode = 'numeric'`)
    this.emit(`input.autocomplete = 'one-time-code'`)
    if (inputSlot?.styles && inputSlot.styles.length > 0) {
      this.emit(`Object.assign(input.style, {`)
      this.indent++
      for (const style of inputSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(input)`)
    this.indent--
    this.emit(`}`)

    this.emit(`${varName}.appendChild(${controlVar})`)
    this.emit('')

    // Create hidden input for form submission
    const hiddenInputVar = `${varName}_hiddenInput`
    this.emit(`// Hidden input for form submission`)
    this.emit(`const ${hiddenInputVar} = document.createElement('input')`)
    this.emit(`${hiddenInputVar}.type = 'hidden'`)
    this.emit(`${hiddenInputVar}.dataset.slot = 'HiddenInput'`)
    const name = node.machineConfig.name as string
    if (name) {
      this.emit(`${hiddenInputVar}.name = '${this.escapeString(name)}'`)
    }
    this.emit(`${varName}.appendChild(${hiddenInputVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize PinInput via runtime
    this.emit(`// Initialize PinInput`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initPinInputComponent) {`)
    this.indent++
    this.emit(`_runtime.initPinInputComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitPasswordInputComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// PasswordInput Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'password-input'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'password-input',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Label if exists
    const labelText = node.machineConfig.label as string
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create Control container
    const controlSlot = node.slots['Control']
    const controlVar = `${varName}_control`
    this.emit(`// Control (input container)`)
    this.emit(`const ${controlVar} = document.createElement('div')`)
    this.emit(`${controlVar}.dataset.slot = 'Control'`)
    if (controlSlot?.styles && controlSlot.styles.length > 0) {
      this.emit(`Object.assign(${controlVar}.style, {`)
      this.indent++
      for (const style of controlSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Create Input
    const inputSlot = node.slots['Input']
    const inputVar = `${varName}_input`
    this.emit(`// Input`)
    this.emit(`const ${inputVar} = document.createElement('input')`)
    this.emit(`${inputVar}.type = 'password'`)
    this.emit(`${inputVar}.dataset.slot = 'Input'`)
    const placeholder = node.machineConfig.placeholder as string
    if (placeholder) {
      this.emit(`${inputVar}.placeholder = '${this.escapeString(placeholder)}'`)
    }
    if (inputSlot?.styles && inputSlot.styles.length > 0) {
      this.emit(`Object.assign(${inputVar}.style, {`)
      this.indent++
      for (const style of inputSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${inputVar})`)

    // Create VisibilityTrigger
    const visibilitySlot = node.slots['VisibilityTrigger']
    const visibilityVar = `${varName}_visibility`
    this.emit(`// VisibilityTrigger`)
    this.emit(`const ${visibilityVar} = document.createElement('button')`)
    this.emit(`${visibilityVar}.type = 'button'`)
    this.emit(`${visibilityVar}.dataset.slot = 'VisibilityTrigger'`)
    this.emit(`${visibilityVar}.setAttribute('aria-label', 'Toggle password visibility')`)
    if (visibilitySlot?.styles && visibilitySlot.styles.length > 0) {
      this.emit(`Object.assign(${visibilityVar}.style, {`)
      this.indent++
      for (const style of visibilitySlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${visibilityVar})`)

    this.emit(`${varName}.appendChild(${controlVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize PasswordInput via runtime
    this.emit(`// Initialize PasswordInput`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initPasswordInputComponent) {`)
    this.indent++
    this.emit(`_runtime.initPasswordInputComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitProgressComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Progress Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'progress'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'progress',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Label if exists
    const labelText = node.machineConfig.label as string
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create Track
    const trackSlot = node.slots['Track']
    const trackVar = `${varName}_track`
    this.emit(`// Track`)
    this.emit(`const ${trackVar} = document.createElement('div')`)
    this.emit(`${trackVar}.dataset.slot = 'Track'`)
    if (trackSlot?.styles && trackSlot.styles.length > 0) {
      this.emit(`Object.assign(${trackVar}.style, {`)
      this.indent++
      for (const style of trackSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Create Range (filled portion)
    const rangeSlot = node.slots['Range']
    const rangeVar = `${varName}_range`
    this.emit(`// Range (filled portion)`)
    this.emit(`const ${rangeVar} = document.createElement('div')`)
    this.emit(`${rangeVar}.dataset.slot = 'Range'`)
    if (rangeSlot?.styles && rangeSlot.styles.length > 0) {
      this.emit(`Object.assign(${rangeVar}.style, {`)
      this.indent++
      for (const style of rangeSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${trackVar}.appendChild(${rangeVar})`)

    this.emit(`${varName}.appendChild(${trackVar})`)
    this.emit('')

    // Create ValueText if slot is defined
    const valueTextSlot = node.slots['ValueText']
    if (valueTextSlot) {
      const valueTextVar = `${varName}_valueText`
      this.emit(`// ValueText`)
      this.emit(`const ${valueTextVar} = document.createElement('span')`)
      this.emit(`${valueTextVar}.dataset.slot = 'ValueText'`)
      if (valueTextSlot.styles && valueTextSlot.styles.length > 0) {
        this.emit(`Object.assign(${valueTextVar}.style, {`)
        this.indent++
        for (const style of valueTextSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${valueTextVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Progress via runtime
    this.emit(`// Initialize Progress`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initProgressComponent) {`)
    this.indent++
    this.emit(`_runtime.initProgressComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitCircularProgressComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// CircularProgress Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'circular-progress'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'circular-progress',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Label if exists
    const labelText = node.machineConfig.label as string
    if (labelText) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(labelText)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create SVG Circle container
    const circleSlot = node.slots['Circle']
    const circleVar = `${varName}_circle`
    this.emit(`// Circle (SVG container)`)
    this.emit(`const ${circleVar} = document.createElementNS('http://www.w3.org/2000/svg', 'svg')`)
    this.emit(`${circleVar}.dataset.slot = 'Circle'`)
    this.emit(`${circleVar}.setAttribute('viewBox', '0 0 100 100')`)
    if (circleSlot?.styles && circleSlot.styles.length > 0) {
      this.emit(`Object.assign(${circleVar}.style, {`)
      this.indent++
      for (const style of circleSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    // Create CircleTrack
    const circleTrackSlot = node.slots['CircleTrack']
    const circleTrackVar = `${varName}_circleTrack`
    this.emit(`// CircleTrack`)
    this.emit(`const ${circleTrackVar} = document.createElementNS('http://www.w3.org/2000/svg', 'circle')`)
    this.emit(`${circleTrackVar}.dataset.slot = 'CircleTrack'`)
    this.emit(`${circleTrackVar}.setAttribute('cx', '50')`)
    this.emit(`${circleTrackVar}.setAttribute('cy', '50')`)
    this.emit(`${circleTrackVar}.setAttribute('r', '42')`)
    this.emit(`${circleTrackVar}.setAttribute('fill', 'none')`)
    if (circleTrackSlot?.styles && circleTrackSlot.styles.length > 0) {
      this.emit(`Object.assign(${circleTrackVar}.style, {`)
      this.indent++
      for (const style of circleTrackSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${circleVar}.appendChild(${circleTrackVar})`)

    // Create CircleRange
    const circleRangeSlot = node.slots['CircleRange']
    const circleRangeVar = `${varName}_circleRange`
    this.emit(`// CircleRange`)
    this.emit(`const ${circleRangeVar} = document.createElementNS('http://www.w3.org/2000/svg', 'circle')`)
    this.emit(`${circleRangeVar}.dataset.slot = 'CircleRange'`)
    this.emit(`${circleRangeVar}.setAttribute('cx', '50')`)
    this.emit(`${circleRangeVar}.setAttribute('cy', '50')`)
    this.emit(`${circleRangeVar}.setAttribute('r', '42')`)
    this.emit(`${circleRangeVar}.setAttribute('fill', 'none')`)
    if (circleRangeSlot?.styles && circleRangeSlot.styles.length > 0) {
      this.emit(`Object.assign(${circleRangeVar}.style, {`)
      this.indent++
      for (const style of circleRangeSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${circleVar}.appendChild(${circleRangeVar})`)

    this.emit(`${varName}.appendChild(${circleVar})`)
    this.emit('')

    // Create ValueText if slot is defined
    const valueTextSlot = node.slots['ValueText']
    if (valueTextSlot) {
      const valueTextVar = `${varName}_valueText`
      this.emit(`// ValueText`)
      this.emit(`const ${valueTextVar} = document.createElement('span')`)
      this.emit(`${valueTextVar}.dataset.slot = 'ValueText'`)
      if (valueTextSlot.styles && valueTextSlot.styles.length > 0) {
        this.emit(`Object.assign(${valueTextVar}.style, {`)
        this.indent++
        for (const style of valueTextSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${valueTextVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize CircularProgress via runtime
    this.emit(`// Initialize CircularProgress`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initCircularProgressComponent) {`)
    this.indent++
    this.emit(`_runtime.initCircularProgressComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitAvatarComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Avatar Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'avatar'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'avatar',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Image
    const imageSlot = node.slots['Image']
    const imageVar = `${varName}_image`
    this.emit(`// Image`)
    this.emit(`const ${imageVar} = document.createElement('img')`)
    this.emit(`${imageVar}.dataset.slot = 'Image'`)
    const src = node.machineConfig.src as string
    if (src) {
      this.emit(`${imageVar}.src = '${this.escapeString(src)}'`)
    }
    const name = node.machineConfig.name as string
    if (name) {
      this.emit(`${imageVar}.alt = '${this.escapeString(name)}'`)
    }
    if (imageSlot?.styles && imageSlot.styles.length > 0) {
      this.emit(`Object.assign(${imageVar}.style, {`)
      this.indent++
      for (const style of imageSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${imageVar})`)
    this.emit('')

    // Create Fallback
    const fallbackSlot = node.slots['Fallback']
    const fallbackVar = `${varName}_fallback`
    this.emit(`// Fallback`)
    this.emit(`const ${fallbackVar} = document.createElement('span')`)
    this.emit(`${fallbackVar}.dataset.slot = 'Fallback'`)
    if (fallbackSlot?.styles && fallbackSlot.styles.length > 0) {
      this.emit(`Object.assign(${fallbackVar}.style, {`)
      this.indent++
      for (const style of fallbackSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${fallbackVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Avatar via runtime
    this.emit(`// Initialize Avatar`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initAvatarComponent) {`)
    this.indent++
    this.emit(`_runtime.initAvatarComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitFileUploadComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// FileUpload Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'file-upload'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'file-upload',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Label (optional)
    const label = node.machineConfig.label as string
    if (label) {
      const labelSlot = node.slots['Label']
      const labelVar = `${varName}_label`
      this.emit(`// Label`)
      this.emit(`const ${labelVar} = document.createElement('label')`)
      this.emit(`${labelVar}.dataset.slot = 'Label'`)
      this.emit(`${labelVar}.textContent = '${this.escapeString(label)}'`)
      if (labelSlot?.styles && labelSlot.styles.length > 0) {
        this.emit(`Object.assign(${labelVar}.style, {`)
        this.indent++
        for (const style of labelSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${varName}.appendChild(${labelVar})`)
      this.emit('')
    }

    // Create Dropzone
    const dropzoneSlot = node.slots['Dropzone']
    const dropzoneVar = `${varName}_dropzone`
    this.emit(`// Dropzone`)
    this.emit(`const ${dropzoneVar} = document.createElement('div')`)
    this.emit(`${dropzoneVar}.dataset.slot = 'Dropzone'`)
    if (dropzoneSlot?.styles && dropzoneSlot.styles.length > 0) {
      this.emit(`Object.assign(${dropzoneVar}.style, {`)
      this.indent++
      for (const style of dropzoneSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${dropzoneVar})`)
    this.emit('')

    // Create HiddenInput
    const hiddenInputVar = `${varName}_input`
    this.emit(`// HiddenInput`)
    this.emit(`const ${hiddenInputVar} = document.createElement('input')`)
    this.emit(`${hiddenInputVar}.type = 'file'`)
    this.emit(`${hiddenInputVar}.dataset.slot = 'HiddenInput'`)
    this.emit(`${dropzoneVar}.appendChild(${hiddenInputVar})`)
    this.emit('')

    // Create Trigger
    const triggerSlot = node.slots['Trigger']
    const triggerVar = `${varName}_trigger`
    this.emit(`// Trigger`)
    this.emit(`const ${triggerVar} = document.createElement('button')`)
    this.emit(`${triggerVar}.type = 'button'`)
    this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${triggerVar}.style, {`)
      this.indent++
      for (const style of triggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${dropzoneVar}.appendChild(${triggerVar})`)
    this.emit('')

    // Create DropzoneContent (icon + text)
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content`)
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
    this.emit(`${dropzoneVar}.appendChild(${contentVar})`)
    this.emit('')

    // Create ItemGroup
    const itemGroupSlot = node.slots['ItemGroup']
    const itemGroupVar = `${varName}_itemgroup`
    this.emit(`// ItemGroup`)
    this.emit(`const ${itemGroupVar} = document.createElement('div')`)
    this.emit(`${itemGroupVar}.dataset.slot = 'ItemGroup'`)
    if (itemGroupSlot?.styles && itemGroupSlot.styles.length > 0) {
      this.emit(`Object.assign(${itemGroupVar}.style, {`)
      this.indent++
      for (const style of itemGroupSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${itemGroupVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize FileUpload via runtime
    this.emit(`// Initialize FileUpload`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initFileUploadComponent) {`)
    this.indent++
    this.emit(`_runtime.initFileUploadComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitCarouselComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Carousel Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'carousel'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'carousel',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Viewport
    const viewportSlot = node.slots['Viewport']
    const viewportVar = `${varName}_viewport`
    this.emit(`// Viewport`)
    this.emit(`const ${viewportVar} = document.createElement('div')`)
    this.emit(`${viewportVar}.dataset.slot = 'Viewport'`)
    if (viewportSlot?.styles && viewportSlot.styles.length > 0) {
      this.emit(`Object.assign(${viewportVar}.style, {`)
      this.indent++
      for (const style of viewportSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${viewportVar})`)
    this.emit('')

    // Create ItemGroup
    const itemGroupSlot = node.slots['ItemGroup']
    const itemGroupVar = `${varName}_itemgroup`
    this.emit(`// ItemGroup`)
    this.emit(`const ${itemGroupVar} = document.createElement('div')`)
    this.emit(`${itemGroupVar}.dataset.slot = 'ItemGroup'`)
    if (itemGroupSlot?.styles && itemGroupSlot.styles.length > 0) {
      this.emit(`Object.assign(${itemGroupVar}.style, {`)
      this.indent++
      for (const style of itemGroupSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${viewportVar}.appendChild(${itemGroupVar})`)
    this.emit('')

    // Create Control
    const controlSlot = node.slots['Control']
    const controlVar = `${varName}_control`
    this.emit(`// Control`)
    this.emit(`const ${controlVar} = document.createElement('div')`)
    this.emit(`${controlVar}.dataset.slot = 'Control'`)
    if (controlSlot?.styles && controlSlot.styles.length > 0) {
      this.emit(`Object.assign(${controlVar}.style, {`)
      this.indent++
      for (const style of controlSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${controlVar})`)
    this.emit('')

    // Create PrevTrigger
    const prevTriggerSlot = node.slots['PrevTrigger']
    const prevTriggerVar = `${varName}_prev`
    this.emit(`// PrevTrigger`)
    this.emit(`const ${prevTriggerVar} = document.createElement('button')`)
    this.emit(`${prevTriggerVar}.type = 'button'`)
    this.emit(`${prevTriggerVar}.dataset.slot = 'PrevTrigger'`)
    if (prevTriggerSlot?.styles && prevTriggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${prevTriggerVar}.style, {`)
      this.indent++
      for (const style of prevTriggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${prevTriggerVar})`)
    this.emit('')

    // Create IndicatorGroup
    const indicatorGroupSlot = node.slots['IndicatorGroup']
    const indicatorGroupVar = `${varName}_indicators`
    this.emit(`// IndicatorGroup`)
    this.emit(`const ${indicatorGroupVar} = document.createElement('div')`)
    this.emit(`${indicatorGroupVar}.dataset.slot = 'IndicatorGroup'`)
    if (indicatorGroupSlot?.styles && indicatorGroupSlot.styles.length > 0) {
      this.emit(`Object.assign(${indicatorGroupVar}.style, {`)
      this.indent++
      for (const style of indicatorGroupSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${indicatorGroupVar})`)
    this.emit('')

    // Create NextTrigger
    const nextTriggerSlot = node.slots['NextTrigger']
    const nextTriggerVar = `${varName}_next`
    this.emit(`// NextTrigger`)
    this.emit(`const ${nextTriggerVar} = document.createElement('button')`)
    this.emit(`${nextTriggerVar}.type = 'button'`)
    this.emit(`${nextTriggerVar}.dataset.slot = 'NextTrigger'`)
    if (nextTriggerSlot?.styles && nextTriggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${nextTriggerVar}.style, {`)
      this.indent++
      for (const style of nextTriggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${controlVar}.appendChild(${nextTriggerVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Carousel via runtime
    this.emit(`// Initialize Carousel`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initCarouselComponent) {`)
    this.indent++
    this.emit(`_runtime.initCarouselComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitStepsComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Steps Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'steps'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'steps',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create List
    const listSlot = node.slots['List']
    const listVar = `${varName}_list`
    this.emit(`// List`)
    this.emit(`const ${listVar} = document.createElement('div')`)
    this.emit(`${listVar}.dataset.slot = 'List'`)
    if (listSlot?.styles && listSlot.styles.length > 0) {
      this.emit(`Object.assign(${listVar}.style, {`)
      this.indent++
      for (const style of listSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${listVar})`)
    this.emit('')

    // Create Content container
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content`)
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
    this.emit(`${varName}.appendChild(${contentVar})`)
    this.emit('')

    // Create navigation buttons container
    const navSlot = node.slots['Navigation']
    const navVar = `${varName}_nav`
    this.emit(`// Navigation`)
    this.emit(`const ${navVar} = document.createElement('div')`)
    this.emit(`${navVar}.dataset.slot = 'Navigation'`)
    if (navSlot?.styles && navSlot.styles.length > 0) {
      this.emit(`Object.assign(${navVar}.style, {`)
      this.indent++
      for (const style of navSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${navVar})`)
    this.emit('')

    // Create PrevTrigger
    const prevTriggerSlot = node.slots['PrevTrigger']
    const prevTriggerVar = `${varName}_prev`
    this.emit(`// PrevTrigger`)
    this.emit(`const ${prevTriggerVar} = document.createElement('button')`)
    this.emit(`${prevTriggerVar}.type = 'button'`)
    this.emit(`${prevTriggerVar}.dataset.slot = 'PrevTrigger'`)
    if (prevTriggerSlot?.styles && prevTriggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${prevTriggerVar}.style, {`)
      this.indent++
      for (const style of prevTriggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${navVar}.appendChild(${prevTriggerVar})`)
    this.emit('')

    // Create NextTrigger
    const nextTriggerSlot = node.slots['NextTrigger']
    const nextTriggerVar = `${varName}_next`
    this.emit(`// NextTrigger`)
    this.emit(`const ${nextTriggerVar} = document.createElement('button')`)
    this.emit(`${nextTriggerVar}.type = 'button'`)
    this.emit(`${nextTriggerVar}.dataset.slot = 'NextTrigger'`)
    if (nextTriggerSlot?.styles && nextTriggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${nextTriggerVar}.style, {`)
      this.indent++
      for (const style of nextTriggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${navVar}.appendChild(${nextTriggerVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Steps via runtime
    this.emit(`// Initialize Steps`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initStepsComponent) {`)
    this.indent++
    this.emit(`_runtime.initStepsComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitPaginationComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Pagination Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('nav')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'pagination'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'pagination',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create PrevTrigger
    const prevTriggerSlot = node.slots['PrevTrigger']
    const prevTriggerVar = `${varName}_prev`
    this.emit(`// PrevTrigger`)
    this.emit(`const ${prevTriggerVar} = document.createElement('button')`)
    this.emit(`${prevTriggerVar}.type = 'button'`)
    this.emit(`${prevTriggerVar}.dataset.slot = 'PrevTrigger'`)
    if (prevTriggerSlot?.styles && prevTriggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${prevTriggerVar}.style, {`)
      this.indent++
      for (const style of prevTriggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${prevTriggerVar})`)
    this.emit('')

    // Create ItemGroup
    const itemGroupSlot = node.slots['ItemGroup']
    const itemGroupVar = `${varName}_items`
    this.emit(`// ItemGroup`)
    this.emit(`const ${itemGroupVar} = document.createElement('div')`)
    this.emit(`${itemGroupVar}.dataset.slot = 'ItemGroup'`)
    if (itemGroupSlot?.styles && itemGroupSlot.styles.length > 0) {
      this.emit(`Object.assign(${itemGroupVar}.style, {`)
      this.indent++
      for (const style of itemGroupSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${itemGroupVar})`)
    this.emit('')

    // Create NextTrigger
    const nextTriggerSlot = node.slots['NextTrigger']
    const nextTriggerVar = `${varName}_next`
    this.emit(`// NextTrigger`)
    this.emit(`const ${nextTriggerVar} = document.createElement('button')`)
    this.emit(`${nextTriggerVar}.type = 'button'`)
    this.emit(`${nextTriggerVar}.dataset.slot = 'NextTrigger'`)
    if (nextTriggerSlot?.styles && nextTriggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${nextTriggerVar}.style, {`)
      this.indent++
      for (const style of nextTriggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${nextTriggerVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Pagination via runtime
    this.emit(`// Initialize Pagination`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initPaginationComponent) {`)
    this.indent++
    this.emit(`_runtime.initPaginationComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitTreeViewComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// TreeView Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'tree-view'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'tree-view',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Create Tree element (ul)
    const treeSlot = node.slots['Tree']
    const treeVar = `${varName}_tree`
    this.emit(`// Tree`)
    this.emit(`const ${treeVar} = document.createElement('ul')`)
    this.emit(`${treeVar}.dataset.slot = 'Tree'`)
    this.emit(`${treeVar}.setAttribute('role', 'tree')`)
    if (treeSlot?.styles && treeSlot.styles.length > 0) {
      this.emit(`Object.assign(${treeVar}.style, {`)
      this.indent++
      for (const style of treeSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${treeVar})`)
    this.emit('')

    // Store slot styles for runtime use
    this.emit(`${varName}._slotStyles = {`)
    this.indent++
    for (const slotName of ['Branch', 'BranchTrigger', 'BranchContent', 'BranchIndicator', 'Item', 'ItemText']) {
      const slot = node.slots[slotName]
      if (slot?.styles && slot.styles.length > 0) {
        this.emit(`'${slotName}': {`)
        this.indent++
        for (const style of slot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit(`},`)
      }
    }
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize TreeView via runtime
    this.emit(`// Initialize TreeView`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initTreeViewComponent) {`)
    this.indent++
    this.emit(`_runtime.initTreeViewComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  /**
   * Emit SideNav component (nav-items pattern)
   * Structure: nav > [header?] [item-list > items/groups] [footer?]
   */
  private emitSideNavComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// SideNav Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('nav')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'sidenav'`)
    this.emit(`${varName}.setAttribute('role', 'navigation')`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Check collapsed mode
    const isCollapsed = node.machineConfig.collapsed === true

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'sidenav',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.emit(`items: ${JSON.stringify(node.items.map((item: any) => ({
      value: item.value,
      label: item.label,
      icon: item.icon,
      badge: item.badge,
      arrow: item.arrow,
      shows: item.shows,
      disabled: item.disabled,
      isGroup: item.isGroup,
      collapsible: item.collapsible,
      defaultOpen: item.defaultOpen,
      items: item.items,
    })))},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Apply root styles
    const rootSlot = node.slots['Root']
    if (rootSlot?.styles && rootSlot.styles.length > 0) {
      this.emit(`${varName}.setAttribute('data-styled', 'true')`)
      this.emit(`Object.assign(${varName}.style, {`)
      this.indent++
      for (const style of rootSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }

    if (isCollapsed) {
      this.emit(`${varName}.setAttribute('data-collapsed', 'true')`)
    }

    // Header slot (optional)
    const headerSlot = node.slots['Header']
    if (headerSlot && (headerSlot.children?.length > 0 || headerSlot.styles?.length > 0)) {
      const headerVar = `${varName}_header`
      this.emit(`// Header`)
      this.emit(`const ${headerVar} = document.createElement('div')`)
      this.emit(`${headerVar}.dataset.slot = 'Header'`)
      if (headerSlot.styles && headerSlot.styles.length > 0) {
        this.emit(`${headerVar}.setAttribute('data-styled', 'true')`)
        this.emit(`Object.assign(${headerVar}.style, {`)
        this.indent++
        for (const style of headerSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      // Render header children
      if (headerSlot.children && headerSlot.children.length > 0) {
        for (const child of headerSlot.children) {
          this.emitNode(child as IRNode, headerVar)
        }
      }
      this.emit(`${varName}.appendChild(${headerVar})`)
      this.emit('')
    }

    // ItemList container
    const itemListVar = `${varName}_itemlist`
    const itemListSlot = node.slots['ItemList']
    this.emit(`// ItemList`)
    this.emit(`const ${itemListVar} = document.createElement('div')`)
    this.emit(`${itemListVar}.dataset.slot = 'ItemList'`)
    this.emit(`${itemListVar}.setAttribute('role', 'menubar')`)
    if (itemListSlot?.styles && itemListSlot.styles.length > 0) {
      this.emit(`${itemListVar}.setAttribute('data-styled', 'true')`)
      this.emit(`Object.assign(${itemListVar}.style, {`)
      this.indent++
      for (const style of itemListSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${itemListVar})`)
    this.emit('')

    // Store slot styles for runtime use
    this.emit(`${varName}._slotStyles = {`)
    this.indent++
    for (const slotName of ['Item', 'ItemIcon', 'ItemLabel', 'ItemBadge', 'ItemArrow', 'Group', 'GroupLabel', 'GroupArrow', 'GroupContent']) {
      const slot = node.slots[slotName]
      if (slot?.styles && slot.styles.length > 0) {
        this.emit(`'${slotName}': {`)
        this.indent++
        for (const style of slot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit(`},`)
      }
    }
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Emit items (NavItems and NavGroups)
    this.emitSideNavItems(node.items, varName, itemListVar, isCollapsed)

    // Footer slot (optional)
    const footerSlot = node.slots['Footer']
    if (footerSlot && (footerSlot.children?.length > 0 || footerSlot.styles?.length > 0)) {
      const footerVar = `${varName}_footer`
      this.emit(`// Footer`)
      this.emit(`const ${footerVar} = document.createElement('div')`)
      this.emit(`${footerVar}.dataset.slot = 'Footer'`)
      if (footerSlot.styles && footerSlot.styles.length > 0) {
        this.emit(`${footerVar}.setAttribute('data-styled', 'true')`)
        this.emit(`Object.assign(${footerVar}.style, {`)
        this.indent++
        for (const style of footerSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      // Render footer children
      if (footerSlot.children && footerSlot.children.length > 0) {
        for (const child of footerSlot.children) {
          this.emitNode(child as IRNode, footerVar)
        }
      }
      this.emit(`${varName}.appendChild(${footerVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize SideNav via runtime
    this.emit(`// Initialize SideNav`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initSideNavComponent) {`)
    this.indent++
    this.emit(`_runtime.initSideNavComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  /**
   * Emit SideNav items (NavItems and NavGroups)
   */
  private emitSideNavItems(
    items: any[],
    rootVar: string,
    parentVar: string,
    collapsed: boolean,
    indexOffset: number = 0
  ): void {
    let itemIndex = indexOffset

    for (const item of items) {
      if (item.isGroup) {
        // Render NavGroup
        const groupVar = `${rootVar}_group${itemIndex}`
        this.emit(`// NavGroup: ${item.label || 'Unnamed'}`)
        this.emit(`const ${groupVar} = document.createElement('div')`)
        this.emit(`${groupVar}.dataset.slot = 'Group'`)
        this.emit(`${groupVar}.setAttribute('role', 'group')`)
        if (item.collapsible) {
          this.emit(`${groupVar}.setAttribute('data-collapsible', 'true')`)
          const isOpen = item.defaultOpen !== false
          this.emit(`${groupVar}.setAttribute('data-state', '${isOpen ? 'open' : 'closed'}')`)
        }
        this.emit(`${parentVar}.appendChild(${groupVar})`)
        this.emit('')

        // Group Label
        const labelVar = `${groupVar}_label`
        this.emit(`const ${labelVar} = document.createElement('div')`)
        this.emit(`${labelVar}.dataset.slot = 'GroupLabel'`)
        if (item.collapsible) {
          this.emit(`${labelVar}.setAttribute('role', 'button')`)
          this.emit(`${labelVar}.setAttribute('tabindex', '0')`)
          this.emit(`${labelVar}.style.cursor = 'pointer'`)
        }
        this.emit(`${labelVar}.textContent = '${this.escapeString(item.label || '')}'`)
        this.emit(`${groupVar}.appendChild(${labelVar})`)
        this.emit('')

        // Group Arrow (if collapsible)
        if (item.collapsible) {
          const arrowVar = `${groupVar}_arrow`
          this.emit(`const ${arrowVar} = document.createElement('span')`)
          this.emit(`${arrowVar}.dataset.slot = 'GroupArrow'`)
          this.emit(`${labelVar}.appendChild(${arrowVar})`)
          this.emit('')
        }

        // Group Content
        const contentVar = `${groupVar}_content`
        this.emit(`const ${contentVar} = document.createElement('div')`)
        this.emit(`${contentVar}.dataset.slot = 'GroupContent'`)
        this.emit(`${groupVar}.appendChild(${contentVar})`)
        this.emit('')

        // Render group items
        if (item.items && item.items.length > 0) {
          this.emitSideNavItems(item.items, rootVar, contentVar, collapsed, itemIndex * 100)
        }

        itemIndex++
      } else {
        // Render NavItem
        const itemVar = `${rootVar}_item${itemIndex}`
        this.emit(`// NavItem: ${item.label || item.value}`)
        this.emit(`const ${itemVar} = document.createElement('a')`)
        this.emit(`${itemVar}.dataset.slot = 'Item'`)
        this.emit(`${itemVar}.dataset.value = '${this.escapeString(item.value || '')}'`)
        this.emit(`${itemVar}.setAttribute('role', 'menuitem')`)
        this.emit(`${itemVar}.setAttribute('tabindex', '0')`)
        if (item.shows) {
          this.emit(`${itemVar}.dataset.shows = '${this.escapeString(item.shows)}'`)
        } else if (item.loadFromFile) {
          // Mark for lazy loading from external file
          this.emit(`${itemVar}.dataset.loadFromFile = '${this.escapeString(item.loadFromFile)}'`)
        }
        if (item.disabled) {
          this.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
          this.emit(`${itemVar}.setAttribute('aria-disabled', 'true')`)
        }
        this.emit(`${parentVar}.appendChild(${itemVar})`)
        this.emit('')

        // Icon
        if (item.icon) {
          const iconVar = `${itemVar}_icon`
          this.emit(`const ${iconVar} = document.createElement('span')`)
          this.emit(`${iconVar}.dataset.slot = 'ItemIcon'`)
          this.emit(`${iconVar}.dataset.icon = '${this.escapeString(item.icon)}'`)
          this.emit(`${itemVar}.appendChild(${iconVar})`)
          this.emit('')
        }

        // Label (only show if not collapsed)
        if (!collapsed && item.label) {
          const labelVar = `${itemVar}_label`
          this.emit(`const ${labelVar} = document.createElement('span')`)
          this.emit(`${labelVar}.dataset.slot = 'ItemLabel'`)
          this.emit(`${labelVar}.textContent = '${this.escapeString(item.label)}'`)
          this.emit(`${itemVar}.appendChild(${labelVar})`)
          this.emit('')
        }

        // Badge
        if (!collapsed && item.badge) {
          const badgeVar = `${itemVar}_badge`
          this.emit(`const ${badgeVar} = document.createElement('span')`)
          this.emit(`${badgeVar}.dataset.slot = 'ItemBadge'`)
          this.emit(`${badgeVar}.textContent = '${this.escapeString(item.badge)}'`)
          this.emit(`${itemVar}.appendChild(${badgeVar})`)
          this.emit('')
        }

        // Arrow
        if (!collapsed && item.arrow) {
          const arrowVar = `${itemVar}_arrow`
          this.emit(`const ${arrowVar} = document.createElement('span')`)
          this.emit(`${arrowVar}.dataset.slot = 'ItemArrow'`)
          this.emit(`${itemVar}.appendChild(${arrowVar})`)
          this.emit('')
        }

        itemIndex++
      }
    }
  }

  private emitSegmentedControlComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// SegmentedControl Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'segmented-control'`)
    this.emit(`${varName}.setAttribute('role', 'radiogroup')`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'segmented-control',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.emit(`items: ${JSON.stringify(node.items.map((item: any) => ({
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

    // Create Indicator (slides behind active item)
    const indicatorSlot = node.slots['Indicator']
    const indicatorVar = `${varName}_indicator`
    this.emit(`// Indicator`)
    this.emit(`const ${indicatorVar} = document.createElement('div')`)
    this.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
    if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
      this.emit(`Object.assign(${indicatorVar}.style, {`)
      this.indent++
      for (const style of indicatorSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${indicatorVar})`)
    this.emit('')

    // Create Items
    const itemSlot = node.slots['Item']
    const textSlot = node.slots['ItemText']

    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i] as any
      const itemVar = `${varName}_item${i}`
      const itemValue = item.value || item.label || `item-${i}`
      const itemLabel = item.label || itemValue

      this.emit(`// Segment Item: ${itemLabel}`)
      this.emit(`const ${itemVar} = document.createElement('label')`)
      this.emit(`${itemVar}.dataset.slot = 'Item'`)
      this.emit(`${itemVar}.dataset.value = '${this.escapeString(String(itemValue))}'`)
      if (item.disabled) {
        this.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
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

      // ItemText
      const textVar = `${itemVar}_text`
      this.emit(`const ${textVar} = document.createElement('span')`)
      this.emit(`${textVar}.dataset.slot = 'ItemText'`)
      this.emit(`${textVar}.textContent = '${this.escapeString(String(itemLabel))}'`)
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

      this.emit(`${varName}.appendChild(${itemVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize SegmentedControl via runtime
    this.emit(`// Initialize SegmentedControl`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initSegmentedControlComponent) {`)
    this.indent++
    this.emit(`_runtime.initSegmentedControlComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitToggleGroupComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// ToggleGroup Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'toggle-group'`)
    this.emit(`${varName}.setAttribute('role', 'group')`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'toggle-group',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.emit(`items: ${JSON.stringify(node.items.map((item: any) => ({
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

    // Create Items
    const itemSlot = node.slots['Item']

    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i] as any
      const itemVar = `${varName}_item${i}`
      const itemValue = item.value || item.label || `item-${i}`
      const itemLabel = item.label || itemValue

      this.emit(`// Toggle Item: ${itemLabel}`)
      this.emit(`const ${itemVar} = document.createElement('button')`)
      this.emit(`${itemVar}.dataset.slot = 'Item'`)
      this.emit(`${itemVar}.dataset.value = '${this.escapeString(String(itemValue))}'`)
      this.emit(`${itemVar}.setAttribute('type', 'button')`)
      this.emit(`${itemVar}.textContent = '${this.escapeString(String(itemLabel))}'`)
      if (item.disabled) {
        this.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
        this.emit(`${itemVar}.disabled = true`)
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

      this.emit(`${varName}.appendChild(${itemVar})`)
      this.emit('')
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize ToggleGroup via runtime
    this.emit(`// Initialize ToggleGroup`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initToggleGroupComponent) {`)
    this.indent++
    this.emit(`_runtime.initToggleGroupComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  // =========================================================================
  // GROUP 5: OVERLAYS
  // =========================================================================

  private emitCollapsibleComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Collapsible Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'collapsible'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'collapsible',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
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

    // Trigger container
    const triggerSlot = node.slots['Trigger']
    const triggerVar = `${varName}_trigger`
    this.emit(`// Trigger`)
    this.emit(`const ${triggerVar} = document.createElement('div')`)
    this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    this.emit(`${triggerVar}.setAttribute('role', 'button')`)
    this.emit(`${triggerVar}.setAttribute('tabindex', '0')`)
    this.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
    this.emit(`${triggerVar}.style.cursor = 'pointer'`)
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${triggerVar}.style, {`)
      this.indent++
      for (const style of triggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    // Emit trigger children
    if (triggerSlot?.children && triggerSlot.children.length > 0) {
      for (const child of triggerSlot.children) {
        this.emitNode(child as IRNode, triggerVar)
      }
    } else {
      // Fallback text if no children
      const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Toggle'
      this.emit(`${triggerVar}.textContent = '${this.escapeString(String(triggerLabel))}'`)
    }
    this.emit(`${varName}.appendChild(${triggerVar})`)
    this.emit('')

    // Content container
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content`)
    this.emit(`const ${contentVar} = document.createElement('div')`)
    this.emit(`${contentVar}.dataset.slot = 'Content'`)
    this.emit(`${contentVar}.setAttribute('role', 'region')`)
    if (contentSlot?.styles && contentSlot.styles.length > 0) {
      this.emit(`Object.assign(${contentVar}.style, {`)
      this.indent++
      for (const style of contentSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${contentVar})`)
    this.emit('')

    // Emit content children
    if (contentSlot?.children && contentSlot.children.length > 0) {
      for (const child of contentSlot.children) {
        this.emitNode(child as IRNode, contentVar)
      }
    } else if (node.children && node.children.length > 0) {
      // Fallback to node.children if no slot children
      for (const child of node.children) {
        this.emitNode(child as IRNode, contentVar)
      }
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Collapsible via runtime
    this.emit(`// Initialize Collapsible`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initCollapsibleComponent) {`)
    this.indent++
    this.emit(`_runtime.initCollapsibleComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitTooltipComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Tooltip Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'tooltip'`)
    this.emit(`${varName}.style.display = 'inline-block'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'tooltip',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Trigger element
    const triggerSlot = node.slots['Trigger']
    const triggerVar = `${varName}_trigger`
    this.emit(`// Trigger`)
    this.emit(`const ${triggerVar} = document.createElement('button')`)
    this.emit(`${triggerVar}.type = 'button'`)
    this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${triggerVar}.style, {`)
      this.indent++
      for (const style of triggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Hover me'
    this.emit(`${triggerVar}.textContent = '${this.escapeString(String(triggerLabel))}'`)
    this.emit(`${varName}.appendChild(${triggerVar})`)
    this.emit('')

    // Content (tooltip popup)
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content (tooltip popup)`)
    this.emit(`const ${contentVar} = document.createElement('div')`)
    this.emit(`${contentVar}.dataset.slot = 'Content'`)
    this.emit(`${contentVar}.setAttribute('role', 'tooltip')`)
    if (contentSlot?.styles && contentSlot.styles.length > 0) {
      this.emit(`Object.assign(${contentVar}.style, {`)
      this.indent++
      for (const style of contentSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    // Check if we have slot children to emit, otherwise use text content
    const contentSlotChildren = node.slots['Content']?.children || []
    if (contentSlotChildren.length > 0) {
      // Emit Content slot children (children defined inside Content: in DSL)
      for (const child of contentSlotChildren) {
        this.emitNode(child as IRNode, contentVar)
      }
    } else {
      // Fallback to simple text content from machineConfig
      const tooltipText = node.machineConfig.content || node.machineConfig.text || 'Tooltip content'
      this.emit(`${contentVar}.textContent = '${this.escapeString(String(tooltipText))}'`)
    }
    this.emit(`${varName}.appendChild(${contentVar})`)
    this.emit('')

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Tooltip via runtime
    this.emit(`// Initialize Tooltip`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initTooltipComponent) {`)
    this.indent++
    this.emit(`_runtime.initTooltipComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitPopoverComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Popover Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'popover'`)
    this.emit(`${varName}.style.display = 'inline-block'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'popover',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Trigger button
    const triggerSlot = node.slots['Trigger']
    const triggerVar = `${varName}_trigger`
    this.emit(`// Trigger`)
    this.emit(`const ${triggerVar} = document.createElement('button')`)
    this.emit(`${triggerVar}.type = 'button'`)
    this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    this.emit(`${triggerVar}.setAttribute('aria-haspopup', 'dialog')`)
    this.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${triggerVar}.style, {`)
      this.indent++
      for (const style of triggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Open Popover'
    this.emit(`${triggerVar}.textContent = '${this.escapeString(String(triggerLabel))}'`)
    this.emit(`${varName}.appendChild(${triggerVar})`)
    this.emit('')

    // Content container
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content (popover panel)`)
    this.emit(`const ${contentVar} = document.createElement('div')`)
    this.emit(`${contentVar}.dataset.slot = 'Content'`)
    this.emit(`${contentVar}.setAttribute('role', 'dialog')`)
    if (contentSlot?.styles && contentSlot.styles.length > 0) {
      this.emit(`Object.assign(${contentVar}.style, {`)
      this.indent++
      for (const style of contentSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${contentVar})`)
    this.emit('')

    // Title (optional)
    const titleSlot = node.slots['Title']
    if (node.machineConfig.title) {
      const titleVar = `${varName}_title`
      this.emit(`// Title`)
      this.emit(`const ${titleVar} = document.createElement('h3')`)
      this.emit(`${titleVar}.dataset.slot = 'Title'`)
      this.emit(`${titleVar}.textContent = '${this.escapeString(String(node.machineConfig.title))}'`)
      if (titleSlot?.styles && titleSlot.styles.length > 0) {
        this.emit(`Object.assign(${titleVar}.style, {`)
        this.indent++
        for (const style of titleSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${contentVar}.appendChild(${titleVar})`)
      this.emit('')
    }

    // Description (optional)
    const descSlot = node.slots['Description']
    if (node.machineConfig.description) {
      const descVar = `${varName}_desc`
      this.emit(`// Description`)
      this.emit(`const ${descVar} = document.createElement('p')`)
      this.emit(`${descVar}.dataset.slot = 'Description'`)
      this.emit(`${descVar}.textContent = '${this.escapeString(String(node.machineConfig.description))}'`)
      if (descSlot?.styles && descSlot.styles.length > 0) {
        this.emit(`Object.assign(${descVar}.style, {`)
        this.indent++
        for (const style of descSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${contentVar}.appendChild(${descVar})`)
      this.emit('')
    }

    // CloseTrigger (optional)
    const closeSlot = node.slots['CloseTrigger']
    const closeVar = `${varName}_close`
    this.emit(`// Close trigger`)
    this.emit(`const ${closeVar} = document.createElement('button')`)
    this.emit(`${closeVar}.type = 'button'`)
    this.emit(`${closeVar}.dataset.slot = 'CloseTrigger'`)
    this.emit(`${closeVar}.textContent = '×'`)
    this.emit(`${closeVar}.setAttribute('aria-label', 'Close')`)
    if (closeSlot?.styles && closeSlot.styles.length > 0) {
      this.emit(`Object.assign(${closeVar}.style, {`)
      this.indent++
      for (const style of closeSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${contentVar}.appendChild(${closeVar})`)
    this.emit('')

    // Emit Content slot children (children defined inside Content: in DSL)
    const contentSlotChildren = node.slots['Content']?.children || []
    if (contentSlotChildren.length > 0) {
      for (const child of contentSlotChildren) {
        this.emitNode(child as IRNode, contentVar)
      }
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Popover via runtime
    this.emit(`// Initialize Popover`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initPopoverComponent) {`)
    this.indent++
    this.emit(`_runtime.initPopoverComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitHoverCardComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// HoverCard Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'hover-card'`)
    this.emit(`${varName}.style.display = 'inline-block'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'hover-card',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Trigger element (usually a link)
    const triggerSlot = node.slots['Trigger']
    const triggerVar = `${varName}_trigger`
    this.emit(`// Trigger`)
    this.emit(`const ${triggerVar} = document.createElement('a')`)
    this.emit(`${triggerVar}.href = '#'`)
    this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${triggerVar}.style, {`)
      this.indent++
      for (const style of triggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Hover me'
    this.emit(`${triggerVar}.textContent = '${this.escapeString(String(triggerLabel))}'`)
    this.emit(`${varName}.appendChild(${triggerVar})`)
    this.emit('')

    // Content (hover card popup)
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content (hover card)`)
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
    this.emit(`${varName}.appendChild(${contentVar})`)
    this.emit('')

    // Emit Content slot children (children defined inside Content: in DSL)
    const contentSlotChildren = node.slots['Content']?.children || []
    if (contentSlotChildren.length > 0) {
      for (const child of contentSlotChildren) {
        this.emitNode(child as IRNode, contentVar)
      }
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize HoverCard via runtime
    this.emit(`// Initialize HoverCard`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initHoverCardComponent) {`)
    this.indent++
    this.emit(`_runtime.initHoverCardComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

  private emitDialogComponent(node: IRZagNode, parentVar: string): void {
    const varName = this.sanitizeVarName(node.id)

    this.emit(`// Dialog Component: ${node.name}`)
    this.emit(`const ${varName} = document.createElement('div')`)
    this.emit(`_elements['${node.id}'] = ${varName}`)
    this.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
    this.emit(`${varName}.dataset.zagComponent = 'dialog'`)
    this.emit(`${varName}.style.display = 'inline-block'`)
    if (node.name) {
      this.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
    }

    // Emit machine configuration
    this.emit(`${varName}._zagConfig = {`)
    this.indent++
    this.emit(`type: 'dialog',`)
    this.emit(`id: '${node.id}',`)
    this.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
    this.indent--
    this.emit(`}`)
    this.emit('')

    // Trigger button
    const triggerSlot = node.slots['Trigger']
    const triggerVar = `${varName}_trigger`
    this.emit(`// Trigger`)
    this.emit(`const ${triggerVar} = document.createElement('button')`)
    this.emit(`${triggerVar}.type = 'button'`)
    this.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    this.emit(`${triggerVar}.setAttribute('aria-haspopup', 'dialog')`)
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      this.emit(`Object.assign(${triggerVar}.style, {`)
      this.indent++
      for (const style of triggerSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Open Dialog'
    this.emit(`${triggerVar}.textContent = '${this.escapeString(String(triggerLabel))}'`)
    this.emit(`${varName}.appendChild(${triggerVar})`)
    this.emit('')

    // Backdrop
    const backdropSlot = node.slots['Backdrop']
    const backdropVar = `${varName}_backdrop`
    this.emit(`// Backdrop`)
    this.emit(`const ${backdropVar} = document.createElement('div')`)
    this.emit(`${backdropVar}.dataset.slot = 'Backdrop'`)
    if (backdropSlot?.styles && backdropSlot.styles.length > 0) {
      this.emit(`Object.assign(${backdropVar}.style, {`)
      this.indent++
      for (const style of backdropSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${backdropVar})`)
    this.emit('')

    // Content container (the modal)
    const contentSlot = node.slots['Content']
    const contentVar = `${varName}_content`
    this.emit(`// Content (modal)`)
    this.emit(`const ${contentVar} = document.createElement('div')`)
    this.emit(`${contentVar}.dataset.slot = 'Content'`)
    this.emit(`${contentVar}.setAttribute('role', 'dialog')`)
    this.emit(`${contentVar}.setAttribute('aria-modal', 'true')`)
    if (contentSlot?.styles && contentSlot.styles.length > 0) {
      this.emit(`Object.assign(${contentVar}.style, {`)
      this.indent++
      for (const style of contentSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${varName}.appendChild(${contentVar})`)
    this.emit('')

    // Title
    const titleSlot = node.slots['Title']
    if (node.machineConfig.title) {
      const titleVar = `${varName}_title`
      this.emit(`// Title`)
      this.emit(`const ${titleVar} = document.createElement('h2')`)
      this.emit(`${titleVar}.dataset.slot = 'Title'`)
      this.emit(`${titleVar}.textContent = '${this.escapeString(String(node.machineConfig.title))}'`)
      if (titleSlot?.styles && titleSlot.styles.length > 0) {
        this.emit(`Object.assign(${titleVar}.style, {`)
        this.indent++
        for (const style of titleSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${contentVar}.appendChild(${titleVar})`)
      this.emit('')
    }

    // Description
    const descSlot = node.slots['Description']
    if (node.machineConfig.description) {
      const descVar = `${varName}_desc`
      this.emit(`// Description`)
      this.emit(`const ${descVar} = document.createElement('p')`)
      this.emit(`${descVar}.dataset.slot = 'Description'`)
      this.emit(`${descVar}.textContent = '${this.escapeString(String(node.machineConfig.description))}'`)
      if (descSlot?.styles && descSlot.styles.length > 0) {
        this.emit(`Object.assign(${descVar}.style, {`)
        this.indent++
        for (const style of descSlot.styles) {
          this.emit(`'${style.property}': '${style.value}',`)
        }
        this.indent--
        this.emit('})')
      }
      this.emit(`${contentVar}.appendChild(${descVar})`)
      this.emit('')
    }

    // CloseTrigger
    const closeSlot = node.slots['CloseTrigger']
    const closeVar = `${varName}_close`
    this.emit(`// Close trigger`)
    this.emit(`const ${closeVar} = document.createElement('button')`)
    this.emit(`${closeVar}.type = 'button'`)
    this.emit(`${closeVar}.dataset.slot = 'CloseTrigger'`)
    this.emit(`${closeVar}.textContent = '×'`)
    this.emit(`${closeVar}.setAttribute('aria-label', 'Close')`)
    if (closeSlot?.styles && closeSlot.styles.length > 0) {
      this.emit(`Object.assign(${closeVar}.style, {`)
      this.indent++
      for (const style of closeSlot.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit('})')
    }
    this.emit(`${contentVar}.appendChild(${closeVar})`)
    this.emit('')

    // Emit Content slot children (children defined inside Content: in DSL)
    const contentSlotChildren = node.slots['Content']?.children || []
    if (contentSlotChildren.length > 0) {
      for (const child of contentSlotChildren) {
        this.emitNode(child as IRNode, contentVar)
      }
    }

    // Append to parent
    this.emit(`${parentVar}.appendChild(${varName})`)
    this.emit('')

    // Initialize Dialog via runtime
    this.emit(`// Initialize Dialog`)
    this.emit(`if (typeof _runtime !== 'undefined' && _runtime.initDialogComponent) {`)
    this.indent++
    this.emit(`_runtime.initDialogComponent(${varName})`)
    this.indent--
    this.emit(`}`)
    this.emit('')
  }

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
    // Check if value contains item variable reference
    if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`)) {
      const resolved = value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
      return resolved
    }
    return `'${value}'`
  }

  private emitTemplateEventListener(varName: string, event: IREvent, itemVar: string): void {
    const eventName = event.name

    this.emit(`${varName}.addEventListener('${eventName}', (e) => {`)
    this.indent++
    for (const action of event.actions) {
      this.emitTemplateAction(action, varName, itemVar)
    }
    this.indent--
    this.emit('})')
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
        this.emit(`// TODO: Template action '${action.type}' not implemented`)
    }
  }

  private emitEventListener(varName: string, event: IREvent): void {
    const eventName = event.name

    // Handle enter/exit events with IntersectionObserver
    if (eventName === 'enter' || eventName === 'exit') {
      this.emitEnterExitObserver(varName, event, eventName === 'enter')
      return
    }

    // Handle hover event specially - needs both mouseenter and mouseleave
    if (eventName === 'mouseenter') {
      const hasHighlight = event.actions.some(a => a.type === 'highlight')
      if (hasHighlight) {
        this.emit(`${varName}.addEventListener('mouseenter', (e) => {`)
        this.indent++
        for (const action of event.actions) {
          this.emitAction(action, varName)
        }
        this.indent--
        this.emit('})')
        // Add mouseleave to clear highlight
        this.emit(`${varName}.addEventListener('mouseleave', (e) => {`)
        this.indent++
        this.emit(`_runtime.unhighlight(${varName})`)
        this.indent--
        this.emit('})')
        return
      }
    }

    // Handle click-outside event specially
    if (eventName === 'click-outside') {
      this.emit(`// Click outside handler`)
      this.emit(`const ${varName}_clickOutsideHandler = (e) => {`)
      this.indent++
      this.emit(`if (!${varName}.contains(e.target)) {`)
      this.indent++
      for (const action of event.actions) {
        this.emitAction(action, varName)
      }
      this.indent--
      this.emit('}')
      this.indent--
      this.emit('}')
      this.emit(`document.addEventListener('click', ${varName}_clickOutsideHandler)`)
      this.emit(`${varName}._clickOutsideHandler = ${varName}_clickOutsideHandler`)
      return
    }

    // Handle keyboard events with specific keys
    if (event.key) {
      this.emit(`${varName}.addEventListener('${eventName}', (e) => {`)
      this.indent++
      this.emit(`if (e.key === '${this.mapKeyName(event.key)}') {`)
      this.indent++
      for (const action of event.actions) {
        this.emitAction(action, varName)
      }
      this.indent--
      this.emit('}')
      this.indent--
      this.emit('})')
    } else {
      this.emit(`${varName}.addEventListener('${eventName}', (e) => {`)
      this.indent++
      for (const action of event.actions) {
        this.emitAction(action, varName)
      }
      this.indent--
      this.emit('})')
    }
  }

  private emitEnterExitObserver(varName: string, event: IREvent, isEnter: boolean): void {
    // Generate a unique callback function for this observer
    const callbackName = `${varName}_${isEnter ? 'enter' : 'exit'}`

    this.emit(`// ${isEnter ? 'Enter' : 'Exit'} viewport observer`)
    this.emit(`const ${callbackName}Callback = () => {`)
    this.indent++
    for (const action of event.actions) {
      this.emitAction(action, varName)
    }
    this.indent--
    this.emit(`}`)

    if (isEnter) {
      // Store enter callback for observer setup
      this.emit(`${varName}._enterCallback = ${callbackName}Callback`)
    } else {
      // Store exit callback for observer setup
      this.emit(`${varName}._exitCallback = ${callbackName}Callback`)
    }

    // Set up observer (only once when we have at least one callback)
    this.emit(`if (!${varName}._enterExitObserver) {`)
    this.indent++
    this.emit(`_runtime.setupEnterExitObserver(${varName}, ${varName}._enterCallback, ${varName}._exitCallback)`)
    this.indent--
    this.emit(`}`)
  }

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
          case 'focus':
            if (action.args && action.args.length > 0) {
              this.emit(`_elements['${action.args[0]}']?.focus()`)
            } else {
              this.emit(`${currentVar}.focus()`)
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
    this.emit('const { collection, renderItem, filter } = el._eachConfig')
    this.emit('const items = _state[collection] || []')
    this.emit('const filtered = filter ? items.filter(item => eval(filter)) : items')
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

  private sanitizeVarName(id: string): string {
    return id.replace(/-/g, '_')
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

      // Check for simple $-variable reference (must start with letter or underscore after $)
      // $name, $user.name → variable
      // $12.4k, $100 → literal (currency/number)
      if (value.startsWith('$') && !value.startsWith('$get(') && /^\$[a-zA-Z_]/.test(value)) {
        const varName = value.slice(1) // Remove $ prefix
        return `$get("${varName}")`
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

  private escapeString(str: string | number | boolean | undefined | null): string {
    const s = String(str ?? '')
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
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

  private mapKeyName(key: string): string {
    const mapping: Record<string, string> = {
      'escape': 'Escape',
      'enter': 'Enter',
      'tab': 'Tab',
      'space': ' ',
      'arrow-up': 'ArrowUp',
      'arrow-down': 'ArrowDown',
      'arrow-left': 'ArrowLeft',
      'arrow-right': 'ArrowRight',
      'backspace': 'Backspace',
      'delete': 'Delete',
    }
    return mapping[key] || key
  }

  /**
   * Emit state machine configuration and event listeners
   *
   * Generates:
   * - State machine config on element (_stateMachine)
   * - Event listeners for transitions
   * - Initial state setup
   */
  private emitStateMachine(varName: string, node: IRNode): void {
    const sm = node.stateMachine!
    // Use instance's initialState if set, otherwise use state machine's initial
    const effectiveInitial = node.initialState || sm.initial

    // Store state machine config
    this.emit(`${varName}._stateMachine = {`)
    this.indent++
    this.emit(`initial: '${effectiveInitial}',`)
    this.emit(`current: '${effectiveInitial}',`)

    // States with their styles and animations
    this.emit(`states: {`)
    this.indent++
    for (const [name, state] of Object.entries(sm.states)) {
      this.emit(`'${name}': {`)
      this.indent++
      this.emit(`styles: {`)
      this.indent++
      for (const style of state.styles) {
        this.emit(`'${style.property}': '${style.value}',`)
      }
      this.indent--
      this.emit(`},`)
      // Enter animation
      if (state.enter) {
        this.emit(`enter: ${this.serializeAnimation(state.enter)},`)
      }
      // Exit animation
      if (state.exit) {
        this.emit(`exit: ${this.serializeAnimation(state.exit)},`)
      }
      // State children (like Figma Variants)
      if (state.children && state.children.length > 0) {
        this.emit(`children: () => {`)
        this.indent++
        this.emit(`const _stateChildren = []`)
        for (let i = 0; i < state.children.length; i++) {
          this.emitStateChild(state.children[i], i)
        }
        this.emit(`return _stateChildren`)
        this.indent--
        this.emit(`},`)
      }
      this.indent--
      this.emit(`},`)
    }
    this.indent--
    this.emit(`},`)

    // Transitions
    this.emit(`transitions: [`)
    this.indent++
    for (const t of sm.transitions) {
      const keyPart = t.key ? `, key: '${t.key}'` : ''
      const modPart = t.modifier ? `, modifier: '${t.modifier}'` : ''
      const animPart = t.animation ? `, animation: ${this.serializeAnimation(t.animation)}` : ''
      this.emit(`{ to: '${t.to}', trigger: '${t.trigger}'${keyPart}${modPart}${animPart} },`)
    }
    this.indent--
    this.emit(`],`)

    this.indent--
    this.emit(`}`)

    // Save base display value for visibility states (before it gets set to 'none')
    if (sm.states['visible']) {
      // For hidden elements with 'visible' state, the base display is 'flex' (default for frames)
      this.emit(`${varName}._baseDisplay = 'flex'`)
    }

    // Capture _baseStyles BEFORE applying initial state styles
    // This is critical for exclusive() - we need the actual base styles (e.g. gray background),
    // not the initial state styles (e.g. blue background for active state)
    // Collect all unique style properties from all states
    const allStyleProps = new Set<string>()
    for (const state of Object.values(sm.states)) {
      for (const style of state.styles) {
        allStyleProps.add(style.property)
      }
    }

    if (allStyleProps.size > 0) {
      this.emit(`${varName}._baseStyles = {`)
      this.indent++
      for (const prop of allStyleProps) {
        this.emit(`'${prop}': ${varName}.style['${prop}'] || '',`)
      }
      this.indent--
      this.emit(`}`)
    }

    // Set initial state
    this.emit(`${varName}.dataset.state = '${effectiveInitial}'`)

    // Apply initial state styles
    this.emit(`Object.assign(${varName}.style, ${varName}._stateMachine.states['${effectiveInitial}'].styles)`)

    // Apply initial state children if present (like Figma Variants)
    // Only call the factory if the initial state is NOT 'default'
    // When initial state is 'default', the children are rendered normally (not via factory)
    const initialStateDef = sm.states[effectiveInitial]
    if (effectiveInitial !== 'default' && initialStateDef?.children && initialStateDef.children.length > 0) {
      this.emit(`// Render initial state children`)
      this.emit(`{`)
      this.indent++
      this.emit(`const _initStateChildren = ${varName}._stateMachine.states['${effectiveInitial}'].children()`)
      this.emit(`for (const child of _initStateChildren) {`)
      this.indent++
      this.emit(`${varName}.appendChild(child)`)
      this.indent--
      this.emit(`}`)
      this.indent--
      this.emit(`}`)
    }

    // Generate event listeners for transitions
    this.emitStateMachineListeners(varName, sm)
  }

  /**
   * Emit event listeners for state machine transitions
   */
  private emitStateMachineListeners(varName: string, sm: IRStateMachine): void {
    // Separate trigger-based and when-based transitions
    const triggerTransitions = sm.transitions.filter(t => t.trigger)
    const whenTransitions = sm.transitions.filter(t => t.when)

    // Group trigger transitions by trigger type
    const byTrigger = new Map<string, IRStateTransition[]>()
    for (const t of triggerTransitions) {
      const key = t.key ? `${t.trigger}:${t.key}` : t.trigger
      if (!byTrigger.has(key)) byTrigger.set(key, [])
      byTrigger.get(key)!.push(t)
    }

    for (const [triggerKey, transitions] of byTrigger) {
      const [trigger, key] = triggerKey.split(':')
      const domEvent = trigger.replace(/^on/, '') // onclick -> click

      this.emit(`${varName}.addEventListener('${domEvent}', (e) => {`)
      this.indent++

      // For keyboard events, check the key
      if (key) {
        this.emit(`if (e.key.toLowerCase() !== '${key}') return`)
      }

      this.emit(`const sm = ${varName}._stateMachine`)
      this.emit(`const current = sm.current`)

      // Handle each transition
      for (const t of transitions) {
        // Build animation argument if present
        const animArg = t.animation ? `, ${this.serializeAnimation(t.animation)}` : ''

        if (t.modifier === 'toggle') {
          // Toggle: if already in this state, go back to initial
          this.emit(`if (current === '${t.to}') {`)
          this.indent++
          this.emit(`_runtime.transitionTo(${varName}, sm.initial)`)
          this.indent--
          this.emit(`} else {`)
          this.indent++
          this.emit(`_runtime.transitionTo(${varName}, '${t.to}'${animArg})`)
          this.indent--
          this.emit(`}`)
        } else if (t.modifier === 'exclusive') {
          // Exclusive: deselect siblings first
          this.emit(`_runtime.exclusiveTransition(${varName}, '${t.to}'${animArg})`)
        } else {
          // Normal transition
          this.emit(`_runtime.transitionTo(${varName}, '${t.to}'${animArg})`)
        }
      }

      this.indent--
      this.emit(`})`)
    }

    // Defer 'when' dependency watchers until after DOM is built
    for (const t of whenTransitions) {
      this.deferredWhenWatchers.push({ varName, transition: t, sm })
    }
  }

  /**
   * Emit code to create a state child element (for states with children)
   * Creates element inline within the children factory function
   */
  private emitStateChild(node: IRNode, index: number): void {
    const varName = `_sc${index}`

    this.emit(`const ${varName} = document.createElement('${node.tag}')`)

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
    for (const style of baseStyles) {
      if (style.value.includes("'")) {
        this.emit(`${varName}.style['${style.property}'] = "${style.value}"`)
      } else {
        this.emit(`${varName}.style['${style.property}'] = '${style.value}'`)
      }
    }

    // Handle icon loading (special case for Icon primitive)
    if (node.primitive === 'icon') {
      const iconProp = node.properties.find(p => p.name === 'textContent')
      if (iconProp && typeof iconProp.value === 'string') {
        const iconName = iconProp.value
        // Store icon properties for loading
        const iconSize = node.styles.find(s => s.property === 'fontSize')?.value || '16'
        const iconColor = node.styles.find(s => s.property === 'color')?.value || 'currentColor'
        const iconWeight = node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
        this.emit(`${varName}.dataset.iconSize = '${iconSize.replace('px', '')}'`)
        this.emit(`${varName}.dataset.iconColor = '${iconColor}'`)
        this.emit(`${varName}.dataset.iconWeight = '${iconWeight}'`)
        this.emit(`_runtime.loadIcon(${varName}, '${iconName}')`)
      }
    }

    // Recursively add children
    for (let i = 0; i < node.children.length; i++) {
      const childVarName = `_sc${index}_c${i}`
      this.emitStateChildNested(node.children[i], childVarName, varName)
    }

    this.emit(`_stateChildren.push(${varName})`)
  }

  /**
   * Emit nested children for state child elements
   */
  private emitStateChildNested(node: IRNode, varName: string, parentVar: string): void {
    this.emit(`const ${varName} = document.createElement('${node.tag}')`)

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
    for (const style of baseStyles) {
      if (style.value.includes("'")) {
        this.emit(`${varName}.style['${style.property}'] = "${style.value}"`)
      } else {
        this.emit(`${varName}.style['${style.property}'] = '${style.value}'`)
      }
    }

    // Handle icon loading
    if (node.primitive === 'icon') {
      const iconProp = node.properties.find(p => p.name === 'textContent')
      if (iconProp && typeof iconProp.value === 'string') {
        const iconName = iconProp.value
        const iconSize = node.styles.find(s => s.property === 'fontSize')?.value || '16'
        const iconColor = node.styles.find(s => s.property === 'color')?.value || 'currentColor'
        const iconWeight = node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
        this.emit(`${varName}.dataset.iconSize = '${iconSize.replace('px', '')}'`)
        this.emit(`${varName}.dataset.iconColor = '${iconColor}'`)
        this.emit(`${varName}.dataset.iconWeight = '${iconWeight}'`)
        this.emit(`_runtime.loadIcon(${varName}, '${iconName}')`)
      }
    }

    // Recursively add nested children
    for (let i = 0; i < node.children.length; i++) {
      const childVarName = `${varName}_c${i}`
      this.emitStateChildNested(node.children[i], childVarName, varName)
    }

    this.emit(`${parentVar}.appendChild(${varName})`)
  }

  /**
   * Emit all deferred when watchers after DOM is fully built
   * This ensures that target elements can be found via querySelector
   */
  private emitDeferredWhenWatchers(): void {
    if (this.deferredWhenWatchers.length === 0) return

    this.emit('')
    this.emit('// Setup when dependencies (after DOM is built)')
    for (const { varName, transition, sm } of this.deferredWhenWatchers) {
      this.emitWhenWatcher(varName, transition, sm)
    }
  }

  /**
   * Emit a state watcher for 'when' dependencies
   * Example: visible when Menu open or Sidebar open:
   */
  private emitWhenWatcher(varName: string, transition: IRStateTransition, sm: IRStateMachine): void {
    if (!transition.when) return

    // Collect all target elements from the dependency chain
    const targets: Array<{ target: string; state: string }> = []
    let dep = transition.when
    let condition = dep.condition || 'or' // Default to 'or' for single condition
    while (dep) {
      targets.push({ target: dep.target, state: dep.state })
      if (dep.condition) condition = dep.condition
      dep = dep.next as typeof dep
    }

    // Generate the check function
    this.emit(`// When dependency: ${transition.to} when ${targets.map(t => `${t.target} ${t.state}`).join(` ${condition} `)}`)
    this.emit(`_runtime.watchStates(${varName}, '${transition.to}', '${sm.initial}', '${condition}', [`)
    this.indent++
    for (const t of targets) {
      this.emit(`{ target: '${t.target}', state: '${t.state}' },`)
    }
    this.indent--
    this.emit(`])`)
  }

  /**
   * Serialize an IRStateAnimation to a JavaScript object literal
   */
  private serializeAnimation(anim: import('../ir/types').IRStateAnimation): string {
    const parts: string[] = []
    if (anim.preset) parts.push(`preset: '${anim.preset}'`)
    if (anim.duration !== undefined) parts.push(`duration: ${anim.duration}`)
    if (anim.easing) parts.push(`easing: '${anim.easing}'`)
    if (anim.delay !== undefined) parts.push(`delay: ${anim.delay}`)
    return `{ ${parts.join(', ')} }`
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
