/**
 * Static Analyzer
 *
 * Extracts facts from Mirror AST for quality analysis.
 * No AI here - pure static analysis.
 */

import { parse } from '../parser'
import type { AST, Instance, Property, ComponentDefinition, TokenDefinition } from '../parser/ast'
import type {
  StaticAnalysis,
  ColorUsage,
  SpacingUsage,
  FontUsage,
  ComponentPattern,
  PropertyInLayout,
  DefinedToken,
  DefinedComponent,
  UnwrappedPrimitive,
} from './types'

// =============================================================================
// Color Detection
// =============================================================================

const HEX_COLOR_REGEX = /#[0-9a-fA-F]{3,8}\b/g
const RGB_REGEX = /rgba?\([^)]+\)/g
const NAMED_COLORS = new Set([
  'white',
  'black',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'pink',
  'gray',
  'grey',
  'transparent',
  'inherit',
  'currentColor',
])

function extractColors(value: string): string[] {
  const colors: string[] = []

  // Hex colors
  const hexMatches = value.match(HEX_COLOR_REGEX)
  if (hexMatches) colors.push(...hexMatches)

  // RGB/RGBA
  const rgbMatches = value.match(RGB_REGEX)
  if (rgbMatches) colors.push(...rgbMatches)

  // Named colors
  const words = value.split(/\s+/)
  for (const word of words) {
    if (NAMED_COLORS.has(word.toLowerCase())) {
      colors.push(word.toLowerCase())
    }
  }

  return colors
}

function isColorProperty(name: string): boolean {
  return [
    'bg',
    'background',
    'col',
    'color',
    'c',
    'boc',
    'border-color',
    'ic',
    'icon-color',
  ].includes(name)
}

// =============================================================================
// Spacing Detection
// =============================================================================

function isSpacingProperty(name: string): boolean {
  return [
    'pad',
    'padding',
    'p',
    'pad-x',
    'px',
    'pad-y',
    'py',
    'mar',
    'margin',
    'm',
    'mar-x',
    'mx',
    'mar-y',
    'my',
    'gap',
    'g',
    'gap-x',
    'gx',
    'gap-y',
    'gy',
  ].includes(name)
}

function extractSpacings(value: string): number[] {
  const numbers = value.match(/\d+/g)
  return numbers ? numbers.map(n => parseInt(n, 10)) : []
}

// =============================================================================
// Font Detection
// =============================================================================

function isFontProperty(name: string): boolean {
  return ['fs', 'font-size', 'weight', 'font', 'line'].includes(name)
}

// =============================================================================
// Pattern Hashing
// =============================================================================

function hashPattern(properties: Property[]): string {
  // Create a normalized representation of properties
  const sorted = [...properties]
    .map(p => {
      const values = p.values || []
      const valueType = values.length > 0 ? getValueType(values[0]) : 'none'
      return `${p.name}:${valueType}`
    })
    .sort()
    .join('|')

  // Simple hash
  let hash = 0
  for (let i = 0; i < sorted.length; i++) {
    hash = (hash << 5) - hash + sorted.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(16)
}

function getValueType(value: any): string {
  if (!value) return 'none'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value.kind === 'token') return 'token'
  if (value.kind === 'loopVar') return 'loopVar'
  if (value.kind === 'conditional') return 'conditional'
  return 'unknown'
}

// =============================================================================
// Main Analyzer
// =============================================================================

export class StaticAnalyzer {
  private colorMap: Map<string, { count: number; lines: number[] }> = new Map()
  private spacingMap: Map<string, { count: number; lines: number[]; property: string }> = new Map()
  private fontMap: Map<string, FontUsage> = new Map()
  private patternMap: Map<string, { lines: number[]; sample: string }> = new Map()
  private propertiesInLayout: PropertyInLayout[] = []

  private definedTokens: Map<string, DefinedToken> = new Map()
  private definedComponents: Map<string, DefinedComponent> = new Map()
  private tokenUsage: Map<string, number> = new Map()
  private componentUsage: Map<string, number> = new Map()

  // Track which primitives have component wrappers (e.g., Select -> FormSelect)
  private primitiveToComponent: Map<string, string> = new Map()
  private unwrappedPrimitives: UnwrappedPrimitive[] = []

  private totalElements = 0
  private currentLine = 1

  analyze(code: string): StaticAnalysis {
    // Reset state
    this.reset()

    // Parse
    const ast = parse(code)

    // Collect definitions first
    this.collectDefinitions(ast)

    // Analyze instances
    for (const instance of ast.instances) {
      this.analyzeInstance(instance as Instance, false)
    }

    // Analyze component bodies
    for (const comp of ast.components) {
      this.analyzeComponentDefinition(comp)
    }

    // Build result
    return this.buildResult(code)
  }

  private reset(): void {
    this.colorMap.clear()
    this.spacingMap.clear()
    this.fontMap.clear()
    this.patternMap.clear()
    this.propertiesInLayout = []
    this.definedTokens.clear()
    this.definedComponents.clear()
    this.tokenUsage.clear()
    this.componentUsage.clear()
    this.primitiveToComponent.clear()
    this.unwrappedPrimitives = []
    this.totalElements = 0
    this.currentLine = 1
  }

  private collectDefinitions(ast: AST): void {
    // Tokens - store both full name (primary.bg) and base name (primary)
    for (const token of ast.tokens) {
      const fullName = token.name
      const baseName = fullName.split('.')[0] // "primary.bg" → "primary"
      const value = (token as any).value || this.tokenValueToString(token)

      this.definedTokens.set(fullName, {
        name: fullName,
        value: String(value),
        line: token.line,
        usageCount: 0,
      })

      // Also track by base name for lookup
      if (!this.tokenBaseNames) this.tokenBaseNames = new Map()
      this.tokenBaseNames.set(baseName, fullName)
    }

    // Components
    for (const comp of ast.components) {
      const basePrimitive = (comp as any).basePrimitive || (comp as any).primitive
      this.definedComponents.set(comp.name, {
        name: comp.name,
        line: comp.line,
        usageCount: 0,
        basePrimitive,
      })

      // Track which primitives have component wrappers
      // e.g., FormSelect wraps Select -> primitiveToComponent.set("Select", "FormSelect")
      // Only track specific interactive primitives, not generic containers like Frame/Text
      const interactivePrimitives = new Set([
        'Select',
        'Input',
        'Textarea',
        'Button',
        'Checkbox',
        'Switch',
        'RadioGroup',
        'Slider',
        'DatePicker',
        'Dialog',
        'Tooltip',
        'Tabs',
      ])
      if (basePrimitive && interactivePrimitives.has(basePrimitive)) {
        // Only set if not already set (first component wins)
        if (!this.primitiveToComponent.has(basePrimitive)) {
          this.primitiveToComponent.set(basePrimitive, comp.name)
        }
      }
    }
  }

  private tokenBaseNames: Map<string, string> = new Map()

  private tokenValueToString(token: TokenDefinition): string {
    if (token.properties && token.properties.length > 0) {
      return token.properties
        .map(p => {
          const values = p.values || []
          const valueStr = values.map(v => this.valueToString(v)).join(' ')
          return `${p.name} ${valueStr}`
        })
        .join(', ')
    }
    return ''
  }

  private valueToString(value: any): string {
    if (!value) return ''
    // Handle direct literals
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    // Handle token references
    if (value.kind === 'token') return `$${value.name}`
    // Handle loop var references
    if (value.kind === 'loopVar') return `$${value.name}`
    // Handle old format (type-based)
    if (value.type === 'Literal') return String(value.value)
    if (value.type === 'TokenReference') return `$${value.name}`
    return ''
  }

  private trackTokenUsage(prop: Property): void {
    const values = prop.values || []

    // Handle bind property - tracks variable usage
    if (prop.name === 'bind') {
      for (const value of values) {
        if (typeof value === 'string') {
          this.trackVariableUsage(value)
        }
      }
      return
    }

    for (const value of values) {
      if (value && typeof value === 'object' && (value as any).kind === 'token') {
        const tokenName = (value as any).name
        this.trackTokenByName(tokenName, prop.name)
      }
    }
  }

  private trackTokenByName(tokenName: string, propertyName?: string): void {
    // Try to match with defined tokens
    // First try exact match
    if (this.definedTokens.has(tokenName)) {
      const count = this.tokenUsage.get(tokenName) || 0
      this.tokenUsage.set(tokenName, count + 1)
      return
    }

    // Map property names to expected token suffixes
    const propertySuffixMap: Record<string, string[]> = {
      bg: ['bg'],
      background: ['bg'],
      col: ['col', 'color'],
      color: ['col', 'color'],
      c: ['col', 'color'],
      boc: ['boc', 'border-color'],
      'border-color': ['boc', 'border-color'],
      ic: ['ic', 'icon-color'],
      'icon-color': ['ic', 'icon-color'],
      pad: ['pad', 'padding'],
      padding: ['pad', 'padding'],
      gap: ['gap'],
      rad: ['rad', 'radius'],
      radius: ['rad', 'radius'],
      fs: ['fs', 'font-size'],
      'font-size': ['fs', 'font-size'],
      is: ['is', 'icon-size'],
      'icon-size': ['is', 'icon-size'],
      w: ['w', 'width'],
      width: ['w', 'width'],
      h: ['h', 'height'],
      height: ['h', 'height'],
    }

    const expectedSuffixes = propertyName ? propertySuffixMap[propertyName] : undefined
    const entries = Array.from(this.definedTokens.entries())

    // If we have expected suffixes, try to match with those first
    if (expectedSuffixes) {
      for (const suffix of expectedSuffixes) {
        const expectedFullName = `${tokenName}.${suffix}`
        if (this.definedTokens.has(expectedFullName)) {
          const count = this.tokenUsage.get(expectedFullName) || 0
          this.tokenUsage.set(expectedFullName, count + 1)
          return
        }
      }
    }

    // Fallback: find by base name (first match)
    for (const [fullName, _token] of entries) {
      const baseName = fullName.split('.')[0]
      if (baseName === tokenName) {
        const count = this.tokenUsage.get(fullName) || 0
        this.tokenUsage.set(fullName, count + 1)
        return
      }
    }
  }

  private trackVariableUsage(varName: string): void {
    // Variables are stored as tokens in the AST (state variables, data)
    // Try to find and mark as used
    if (this.definedTokens.has(varName)) {
      const count = this.tokenUsage.get(varName) || 0
      this.tokenUsage.set(varName, count + 1)
    }
  }

  private analyzeInstance(instance: Instance, isInComponent: boolean): void {
    this.totalElements++
    const line = instance.line
    const instanceType = (instance as any).type

    // ZagComponents use 'name' instead of 'component'
    const compName = instanceType === 'ZagComponent' ? (instance as any).name : instance.component

    // Track component usage
    if (this.definedComponents.has(compName)) {
      const count = this.componentUsage.get(compName) || 0
      this.componentUsage.set(compName, count + 1)
    }

    // Check for unwrapped primitives (e.g., using Select when FormSelect exists)
    // Only check in layout, not inside component definitions
    if (!isInComponent && this.primitiveToComponent.has(compName)) {
      const suggestedComponent = this.primitiveToComponent.get(compName)!
      this.unwrappedPrimitives.push({
        primitive: compName,
        line,
        suggestedComponent,
      })
    }

    // Analyze properties
    const inlineProps: string[] = []

    for (const prop of instance.properties) {
      this.analyzeProperty(prop, line)

      // Track if property is inline in layout (not in component definition)
      if (!isInComponent && this.isStyleProperty(prop.name)) {
        inlineProps.push(prop.name)
      }

      // Track token usage - check both value formats
      this.trackTokenUsage(prop)
    }

    // Record properties in layout
    if (inlineProps.length > 0 && !isInComponent) {
      this.propertiesInLayout.push({
        line,
        component: compName,
        properties: inlineProps,
        isInline: true,
      })
    }

    // Track pattern
    if (instance.properties.length >= 2) {
      const hash = hashPattern(instance.properties)
      const existing = this.patternMap.get(hash)
      if (existing) {
        existing.lines.push(line)
      } else {
        this.patternMap.set(hash, {
          lines: [line],
          sample: this.instanceToSample(instance),
        })
      }
    }

    // Track direct bind property (for custom components like FormInput, FormSelect)
    const directBind = (instance as any).bind
    if (directBind && typeof directBind === 'string') {
      this.trackVariableUsage(directBind)
    }

    // Analyze states on instances
    for (const state of (instance as any).states || []) {
      for (const prop of state.properties || []) {
        this.analyzeProperty(prop, state.line || line)
        this.trackTokenUsage(prop)
      }
    }

    // For ZagComponents, also analyze slots and items
    if (instanceType === 'ZagComponent') {
      this.analyzeZagComponent(instance as any, isInComponent, line)
    }

    // Recurse into children (including Each loops and ZagComponents)
    for (const child of instance.children || []) {
      if ((child as any).type === 'Instance') {
        this.analyzeInstance(child as Instance, isInComponent)
      } else if ((child as any).type === 'ZagComponent') {
        this.analyzeInstance(child as Instance, isInComponent)
      } else if ((child as any).type === 'Each') {
        this.analyzeEachLoop(child as any, isInComponent)
      } else if ((child as any).type === 'Conditional') {
        this.analyzeConditional(child as any, isInComponent)
      }
    }

    // Traverse Zag component slots (Dialog, Select, Tabs, etc.)
    // This handles slots even for regular instances that might have them
    const slots = (instance as any).slots
    if (slots && typeof slots === 'object') {
      this.analyzeZagSlots(slots, isInComponent, line)
    }
  }

  private analyzeZagComponent(zag: any, isInComponent: boolean, line: number): void {
    // Analyze slots
    if (zag.slots && typeof zag.slots === 'object') {
      this.analyzeZagSlots(zag.slots, isInComponent, line)
    }

    // Analyze items (e.g., Option items in Select)
    for (const item of zag.items || []) {
      // Items may have properties with tokens
      for (const prop of item.properties || []) {
        this.analyzeProperty(prop, item.sourcePosition?.line || line)
        this.trackTokenUsage(prop)
      }
    }
  }

  private analyzeEachLoop(eachNode: any, isInComponent: boolean): void {
    // Track the collection variable (e.g., $entries)
    const collection = eachNode.collection
    if (collection && typeof collection === 'string' && collection.startsWith('$')) {
      const varName = collection.slice(1) // Remove $
      this.trackVariableUsage(varName)
    }
    // Recurse into each loop children
    for (const child of eachNode.children || []) {
      if ((child as any).type === 'Instance') {
        this.analyzeInstance(child as Instance, isInComponent)
      } else if ((child as any).type === 'ZagComponent') {
        this.analyzeInstance(child as Instance, isInComponent)
      } else if ((child as any).type === 'Each') {
        this.analyzeEachLoop(child, isInComponent)
      } else if ((child as any).type === 'Conditional') {
        this.analyzeConditional(child, isInComponent)
      }
    }
  }

  private analyzeConditional(condNode: any, isInComponent: boolean): void {
    // Analyze both branches
    for (const child of condNode.consequent || []) {
      if ((child as any).type === 'Instance') {
        this.analyzeInstance(child as Instance, isInComponent)
      } else if ((child as any).type === 'ZagComponent') {
        this.analyzeInstance(child as Instance, isInComponent)
      }
    }
    for (const child of condNode.alternate || []) {
      if ((child as any).type === 'Instance') {
        this.analyzeInstance(child as Instance, isInComponent)
      } else if ((child as any).type === 'ZagComponent') {
        this.analyzeInstance(child as Instance, isInComponent)
      }
    }
  }

  private analyzeZagSlots(slots: any, isInComponent: boolean, parentLine: number): void {
    if (!slots || typeof slots !== 'object') return
    for (const slotName of Object.keys(slots)) {
      const slot = slots[slotName]
      if (slot) {
        // Analyze slot properties
        for (const prop of slot.properties || []) {
          this.analyzeProperty(prop, slot.line || parentLine)
          this.trackTokenUsage(prop)
        }
        // Analyze slot children (can be Instance, ZagComponent, Each, Conditional)
        for (const child of slot.children || []) {
          if ((child as any).type === 'Instance') {
            this.analyzeInstance(child as Instance, isInComponent)
          } else if ((child as any).type === 'ZagComponent') {
            this.analyzeInstance(child as Instance, isInComponent)
          } else if ((child as any).type === 'Each') {
            this.analyzeEachLoop(child as any, isInComponent)
          } else if ((child as any).type === 'Conditional') {
            this.analyzeConditional(child as any, isInComponent)
          }
        }
        // Recurse into nested slots
        if (slot.slots) {
          this.analyzeZagSlots(slot.slots, isInComponent, slot.line || parentLine)
        }
      }
    }
  }

  private analyzeComponentDefinition(comp: ComponentDefinition): void {
    // Analyze the component's own properties
    for (const prop of comp.properties || []) {
      this.analyzeProperty(prop, comp.line)
      this.trackTokenUsage(prop)
    }

    // Analyze states (hover:, focus:, on:, etc.)
    for (const state of (comp as any).states || []) {
      for (const prop of state.properties || []) {
        this.analyzeProperty(prop, state.line || comp.line)
        this.trackTokenUsage(prop)
      }
    }

    // Analyze children
    for (const child of comp.children || []) {
      if ((child as any).type === 'Instance') {
        this.analyzeInstance(child as Instance, true)
      }
    }
  }

  private analyzeProperty(prop: Property, line: number): void {
    const name = prop.name
    const values = prop.values || []

    if (values.length === 0) return

    // Check if any value is a token reference
    const isToken = values.some(v => v && typeof v === 'object' && (v as any).kind === 'token')

    // Build combined value string
    const valueStr = values.map(v => this.valueToString(v)).join(' ')

    // Colors
    if (isColorProperty(name)) {
      const colors = extractColors(valueStr)
      for (const color of colors) {
        const existing = this.colorMap.get(color)
        if (existing) {
          existing.count++
          if (!existing.lines.includes(line)) existing.lines.push(line)
        } else {
          this.colorMap.set(color, { count: 1, lines: [line] })
        }
      }
    }

    // Spacings
    if (isSpacingProperty(name) && !isToken) {
      const spacings = extractSpacings(valueStr)
      for (const spacing of spacings) {
        const key = `${spacing}`
        const existing = this.spacingMap.get(key)
        if (existing) {
          existing.count++
          if (!existing.lines.includes(line)) existing.lines.push(line)
        } else {
          this.spacingMap.set(key, { count: 1, lines: [line], property: name })
        }
      }
    }

    // Fonts
    if (isFontProperty(name)) {
      const key = `${name}:${valueStr}`
      const existing = this.fontMap.get(key)
      if (existing) {
        existing.count++
        if (!existing.lines.includes(line)) existing.lines.push(line)
      } else {
        const usage: FontUsage = { count: 1, lines: [line] }
        if (name === 'fs' || name === 'font-size') {
          usage.size = parseInt(valueStr, 10) || undefined
        } else if (name === 'weight') {
          usage.weight = valueStr
        } else if (name === 'font') {
          usage.family = valueStr
        }
        this.fontMap.set(key, usage)
      }
    }
  }

  private isStyleProperty(name: string): boolean {
    return (
      isColorProperty(name) ||
      isSpacingProperty(name) ||
      isFontProperty(name) ||
      ['rad', 'radius', 'bor', 'border', 'shadow', 'opacity'].includes(name)
    )
  }

  private instanceToSample(instance: Instance): string {
    const instanceType = (instance as any).type
    const compName = instanceType === 'ZagComponent' ? (instance as any).name : instance.component
    const props = instance.properties
      .slice(0, 5)
      .map(p => {
        const values = p.values || []
        const valueStr = values.map(v => this.valueToString(v)).join(' ')
        return `${p.name} ${valueStr}`
      })
      .join(', ')
    return `${compName} ${props}${instance.properties.length > 5 ? ', ...' : ''}`
  }

  private buildResult(code: string): StaticAnalysis {
    const lines = code.split('\n').length

    // Build color usage list
    const colors: ColorUsage[] = Array.from(this.colorMap.entries()).map(([value, data]) => ({
      value,
      count: data.count,
      lines: data.lines,
      isToken: false, // Will be enhanced by AI
    }))

    // Build spacing usage list
    const spacings: SpacingUsage[] = Array.from(this.spacingMap.entries()).map(([value, data]) => ({
      value: parseInt(value, 10),
      property: data.property,
      count: data.count,
      lines: data.lines,
      isToken: false,
    }))

    // Build font usage list
    const fonts: FontUsage[] = Array.from(this.fontMap.values())

    // Build pattern list (only patterns that occur more than once)
    const patterns: ComponentPattern[] = Array.from(this.patternMap.entries())
      .filter(([_, data]) => data.lines.length > 1)
      .map(([hash, data]) => ({
        hash,
        lines: data.lines,
        sample: data.sample,
        count: data.lines.length,
      }))

    // Build defined tokens with usage counts
    const definedTokens: DefinedToken[] = Array.from(this.definedTokens.values()).map(token => ({
      ...token,
      usageCount: this.tokenUsage.get(token.name) || 0,
    }))

    // Build defined components with usage counts
    const definedComponents: DefinedComponent[] = Array.from(this.definedComponents.values()).map(
      comp => ({
        ...comp,
        usageCount: this.componentUsage.get(comp.name) || 0,
      })
    )

    return {
      colors,
      spacings,
      fonts,
      patterns,
      propertiesInLayout: this.propertiesInLayout,
      unwrappedPrimitives: this.unwrappedPrimitives,
      definedTokens,
      definedComponents,
      totalLines: lines,
      totalElements: this.totalElements,
      uniqueColors: colors.length,
      uniqueSpacings: spacings.length,
      uniqueFonts: fonts.length,
    }
  }
}

/**
 * Analyze Mirror code and return static analysis
 */
export function analyzeStatic(code: string): StaticAnalysis {
  const analyzer = new StaticAnalyzer()
  return analyzer.analyze(code)
}
