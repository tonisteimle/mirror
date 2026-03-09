/**
 * Mirror IR Generator
 *
 * Transforms AST to Intermediate Representation.
 */

import type {
  AST,
  ComponentDefinition,
  Instance,
  Property,
  State,
  Event,
  Action,
  Each,
  Slot,
  Text,
  ChildOverride,
  AnimationDefinition,
  AnimationKeyframe,
  AnimationKeyframeProperty,
} from '../parser/ast'
import type { IR, IRNode, IRStyle, IREvent, IRAction, IRProperty, IREach, IRConditional, SourcePosition, PropertySourceMap, IRAnimation, IRAnimationKeyframe, IRAnimationProperty } from './types'
import { SourceMap, SourceMapBuilder, calculateSourcePosition } from '../studio/source-map'

export type { IR } from './types'
export { SourceMap, SourceMapBuilder } from '../studio/source-map'

/**
 * Result of IR transformation including source map
 */
export interface IRResult {
  ir: IR
  sourceMap: SourceMap
}

/**
 * Transform AST to IR
 * @param ast The AST to transform
 * @param includeSourceMap Whether to build source map (default: false for backward compat)
 */
export function toIR(ast: AST): IR
export function toIR(ast: AST, includeSourceMap: true): IRResult
export function toIR(ast: AST, includeSourceMap?: boolean): IR | IRResult {
  const transformer = new IRTransformer(ast, includeSourceMap || false)
  const ir = transformer.transform()

  if (includeSourceMap) {
    return {
      ir,
      sourceMap: transformer.getSourceMap(),
    }
  }

  return ir
}

/**
 * Layout properties that affect flex container behavior
 */
interface LayoutContext {
  direction: 'row' | 'column' | null
  justifyContent: string | null
  alignItems: string | null
  flexWrap: string | null
  gap: string | null
  isGrid: boolean
  gridColumns: string | null
}

/**
 * Alignment property names
 */
const ALIGNMENT_PROPERTIES = new Set([
  'left', 'right', 'top', 'bottom',
  'hor-center', 'ver-center', 'center', 'cen',
  'spread',
])

/**
 * Direction property names
 */
const DIRECTION_PROPERTIES = new Set([
  'horizontal', 'hor', 'vertical', 'ver',
])

class IRTransformer {
  private ast: AST
  private componentMap: Map<string, ComponentDefinition> = new Map()
  private tokenSet: Set<string> = new Set()
  private nodeIdCounter = 0
  private includeSourceMap: boolean
  private sourceMapBuilder: SourceMapBuilder

  constructor(ast: AST, includeSourceMap: boolean = false) {
    this.ast = ast
    this.includeSourceMap = includeSourceMap
    this.sourceMapBuilder = new SourceMapBuilder()

    // Build component lookup map (including nested component definitions)
    for (const comp of ast.components) {
      this.registerComponent(comp)
    }
    // Build token lookup set
    for (const token of ast.tokens) {
      this.tokenSet.add(token.name)
    }
  }

  /**
   * Get the built source map
   */
  getSourceMap(): SourceMap {
    return this.sourceMapBuilder.build()
  }

  /**
   * Recursively register a component and all its nested component definitions
   */
  private registerComponent(comp: ComponentDefinition): void {
    this.componentMap.set(comp.name, comp)
    // Recursively register nested component definitions
    for (const child of comp.children) {
      if ((child as any).type === 'Component') {
        this.registerComponent(child as unknown as ComponentDefinition)
      }
    }
  }

  transform(): IR {
    // Transform tokens
    const tokens = this.ast.tokens.map(t => ({
      name: t.name,
      type: t.tokenType,
      value: t.value,
    }))

    // Transform instances to IR nodes
    const nodes = this.ast.instances.map(inst => this.transformInstance(inst))

    // Transform animations
    const animations = this.ast.animations.map(anim => this.transformAnimation(anim))

    return { nodes, tokens, animations }
  }

  /**
   * Transform an animation definition from AST to IR
   */
  private transformAnimation(anim: AnimationDefinition): IRAnimation {
    return {
      name: anim.name,
      easing: anim.easing || 'ease',
      duration: anim.duration,
      roles: anim.roles,
      keyframes: anim.keyframes.map(kf => this.transformAnimationKeyframe(kf)),
    }
  }

  /**
   * Transform an animation keyframe from AST to IR
   */
  private transformAnimationKeyframe(kf: AnimationKeyframe): IRAnimationKeyframe {
    return {
      time: kf.time,
      properties: kf.properties.map(prop => this.transformAnimationProperty(prop)),
    }
  }

  /**
   * Transform an animation property from AST to IR
   *
   * Maps Mirror property names to CSS properties and formats values.
   */
  private transformAnimationProperty(prop: AnimationKeyframeProperty): IRAnimationProperty {
    // Map Mirror property names to CSS properties
    const propertyMap: Record<string, string> = {
      'opacity': 'opacity',
      'y-offset': 'transform',
      'x-offset': 'transform',
      'scale': 'transform',
      'rotate': 'transform',
      'background': 'background',
      'bg': 'background',
      'color': 'color',
      'col': 'color',
      'width': 'width',
      'height': 'height',
      'border-radius': 'border-radius',
      'rad': 'border-radius',
    }

    const cssProperty = propertyMap[prop.name] || prop.name
    let cssValue = String(prop.value)

    // Format transform values
    if (prop.name === 'y-offset') {
      cssValue = `translateY(${prop.value}px)`
    } else if (prop.name === 'x-offset') {
      cssValue = `translateX(${prop.value}px)`
    } else if (prop.name === 'scale') {
      cssValue = `scale(${prop.value})`
    } else if (prop.name === 'rotate') {
      cssValue = `rotate(${prop.value}deg)`
    } else if (['width', 'height', 'border-radius', 'rad'].includes(prop.name) && typeof prop.value === 'number') {
      cssValue = `${prop.value}px`
    }

    return {
      target: prop.target,
      property: cssProperty,
      value: cssValue,
      easing: prop.easing,
    }
  }

  private generateId(): string {
    return `node-${++this.nodeIdCounter}`
  }

  private transformInstance(
    instance: Instance | Each | any,
    parentId?: string,
    isEachTemplate?: boolean,
    isConditional?: boolean
  ): IRNode {
    // Handle Each loops
    if (instance.type === 'Each') {
      return this.transformEach(instance as Each)
    }

    // Handle Conditionals
    if (instance.type === 'Conditional') {
      return this.transformConditional(instance)
    }

    // Resolve component definition
    const component = this.componentMap.get(instance.component)
    const resolvedComponent = component ? this.resolveComponent(component) : null

    // Determine HTML tag
    const tag = this.getTag(instance.component, resolvedComponent)

    // Merge properties (component defaults + instance overrides)
    const properties = this.mergeProperties(
      resolvedComponent?.properties || [],
      instance.properties
    )

    // Determine primitive for layout context
    const primitive = resolvedComponent?.primitive || instance.component.toLowerCase()

    // Transform to styles (with intelligent layout merging)
    const styles = this.transformProperties(properties, primitive)

    // Add state styles from component definition
    const stateStyles = resolvedComponent?.states
      ? this.transformStates(resolvedComponent.states)
      : []

    // Transform events from component definition
    const events = resolvedComponent?.events
      ? this.transformEvents(resolvedComponent.events)
      : []

    // Extract inline states and events from instance children
    const { inlineStateStyles, inlineEvents, remainingChildren } =
      this.extractInlineStatesAndEvents(instance.children || [])

    // Convert childOverrides to instance children for slot filling
    const childOverrideInstances = this.childOverridesToInstances(instance.childOverrides || [])

    // Transform children with slot filling (excluding inline states/events)
    // Include both regular children and childOverrides as slot fillers
    const children = this.resolveChildren(
      resolvedComponent?.children || [],
      [...remainingChildren, ...childOverrideInstances]
    )

    // Merge dropdown features from component definition and instance
    // Instance values override component definition values
    const visibleWhen = (instance as any).visibleWhen || (resolvedComponent as any)?.visibleWhen
    const initialState = (instance as any).initialState || (resolvedComponent as any)?.initialState
    const selection = (instance as any).selection || (resolvedComponent as any)?.selection
    const route = (instance as any).route || (resolvedComponent as any)?.route

    // Generate node ID first so we can reference it
    const nodeId = this.generateId()

    // If this node has a route, add a click event with navigate action
    if (route) {
      events.push({
        name: 'click',
        actions: [{ type: 'navigate', target: route }]
      })
    }

    // Build source position if tracking is enabled
    let sourcePosition: SourcePosition | undefined
    let propertySourceMaps: PropertySourceMap[] | undefined

    if (this.includeSourceMap) {
      // Calculate source position from instance's AST position
      sourcePosition = calculateSourcePosition(instance.line, instance.column)

      // Track property positions
      propertySourceMaps = []
      for (const prop of instance.properties) {
        const propPosition = calculateSourcePosition(prop.line, prop.column)
        propertySourceMaps.push({
          name: prop.name,
          position: propPosition,
        })
      }

      // Add to source map builder
      this.sourceMapBuilder.addNode(
        nodeId,
        instance.component,
        sourcePosition,
        {
          instanceName: instance.name || undefined,
          isDefinition: false,
          isEachTemplate,
          isConditional,
          parentId,
        }
      )

      // Add property positions to the node mapping
      for (const propMap of propertySourceMaps) {
        this.sourceMapBuilder.addPropertyPosition(nodeId, propMap.name, propMap.position)
      }
    }

    // Apply state childOverrides to children
    // This adds state-conditional styles to matching child nodes
    if (resolvedComponent?.states) {
      this.applyStateChildOverrides(children, resolvedComponent.states)
    }

    return {
      id: nodeId,
      tag,
      primitive,
      name: instance.component,
      instanceName: instance.name || undefined,
      properties: this.extractHTMLProperties(properties),
      styles: [...styles, ...stateStyles, ...inlineStateStyles],
      events: [...events, ...inlineEvents],
      children,
      visibleWhen,
      initialState,
      selection,
      route,
      sourcePosition,
      propertySourceMaps,
    }
  }

  private transformEach(each: Each): IRNode {
    const nodeId = this.generateId()
    const eachData: IREach = {
      id: nodeId,
      itemVar: each.item,
      collection: each.collection,
      filter: each.filter,
      template: each.children.map(child => this.transformInstance(child, nodeId, true)),
    }

    // Track source position for each loop
    let sourcePosition: SourcePosition | undefined
    if (this.includeSourceMap) {
      sourcePosition = calculateSourcePosition(each.line, each.column)
      this.sourceMapBuilder.addNode(
        nodeId,
        'Each',
        sourcePosition,
        { isDefinition: false, isEachTemplate: true }
      )
    }

    return {
      id: nodeId,
      tag: 'div',
      name: 'Each',
      properties: [],
      styles: [],
      events: [],
      children: [],
      each: eachData,
      sourcePosition,
    }
  }

  private transformConditional(cond: any): IRNode {
    const nodeId = this.generateId()
    const conditionalData: IRConditional = {
      id: nodeId,
      condition: cond.condition,
      then: cond.then.map((child: any) => this.transformInstance(child, nodeId, false, true)),
      else: cond.else?.length > 0
        ? cond.else.map((child: any) => this.transformInstance(child, nodeId, false, true))
        : undefined,
    }

    // Track source position for conditional
    let sourcePosition: SourcePosition | undefined
    if (this.includeSourceMap) {
      sourcePosition = calculateSourcePosition(cond.line, cond.column)
      this.sourceMapBuilder.addNode(
        nodeId,
        'Conditional',
        sourcePosition,
        { isDefinition: false, isConditional: true }
      )
    }

    return {
      id: nodeId,
      tag: 'div',
      name: 'Conditional',
      properties: [],
      styles: [],
      events: [],
      children: [],
      conditional: conditionalData,
      sourcePosition,
    }
  }

  /**
   * Resolve children with slot filling
   *
   * Component slots (Title:, Content:) can be filled by instance children.
   * If instance provides a child matching the slot name, it replaces the slot.
   * Otherwise, the slot's default content is used (or empty if none).
   */
  private resolveChildren(
    componentChildren: (Instance | Slot)[],
    instanceChildren: (Instance | Text)[]
  ): IRNode[] {
    // Build map of instance children by component name (slot fillers)
    const slotFillers = new Map<string, (Instance | Text)[]>()
    const nonSlotChildren: (Instance | Text)[] = []

    for (const child of instanceChildren) {
      const childType = (child as any).type
      if (childType === 'Instance') {
        const instance = child as Instance
        if (!slotFillers.has(instance.component)) {
          slotFillers.set(instance.component, [])
        }
        slotFillers.get(instance.component)!.push(instance)
      } else if (childType === 'Component') {
        // Skip Component children - they are template definitions, not actual content
        // They will be processed when we iterate componentChildren
        continue
      } else {
        // Text or other non-slot children
        nonSlotChildren.push(child)
      }
    }

    const result: IRNode[] = []

    // Identify which Component children are template definitions vs fillable slots
    // If a Component has sibling Instances using it, it's a template (not a slot)
    const templateNames = new Set<string>()
    for (const child of componentChildren) {
      const childType = (child as any).type
      if (childType === 'Instance') {
        const inst = child as Instance
        templateNames.add(inst.component)
      }
    }

    // Process component's slot children
    if (componentChildren.length > 0) {
      for (const slot of componentChildren) {
        // Handle both Instance slots (Title:) and Component slots (Title as frame:)
        const slotType = (slot as any).type
        if (slotType === 'Instance' || slotType === 'Component') {
          const slotDef = slot as any
          const slotName = slotDef.component || slotDef.name

          // Skip Component definitions that are templates (have sibling instances using them)
          if (slotType === 'Component' && templateNames.has(slotName)) {
            // This is a template definition, not a fillable slot - skip it
            // The instances using this template will be processed below
            continue
          }

          // Get slot's visibility condition and initial state
          const slotVisibleWhen = slotDef.visibleWhen
          const slotInitialState = slotDef.initialState

          // Check if instance provided content for this slot
          const fillers = slotFillers.get(slotName)
          if (fillers && fillers.length > 0) {
            // Use instance's content instead of slot default
            // But inherit visibility conditions from slot definition
            for (const filler of fillers) {
              const node = this.transformChild(filler)
              // Transfer slot's visibleWhen to filler if slot has one
              if (slotVisibleWhen && !node.visibleWhen) {
                node.visibleWhen = slotVisibleWhen
              }
              if (slotInitialState && !node.initialState) {
                node.initialState = slotInitialState
              }
              result.push(node)
            }
            // Mark as used
            slotFillers.delete(slotName)
          } else {
            // Use slot's default content (the slot definition itself)
            // For Component type, create an instance-like object
            if (slotType === 'Component') {
              const compSlot = slot as unknown as ComponentDefinition
              const pseudoInstance: Instance = {
                type: 'Instance',
                component: compSlot.name,
                name: null,
                properties: compSlot.properties,
                // Don't pass children here - they come from the component definition
                // via resolveChildren's componentChildren parameter
                children: [],
                line: compSlot.line,
                column: compSlot.column,
              }
              ;(pseudoInstance as any).visibleWhen = slotVisibleWhen
              ;(pseudoInstance as any).initialState = slotInitialState
              result.push(this.transformInstance(pseudoInstance))
            } else {
              result.push(this.transformInstance(slot as Instance))
            }
          }
        } else if (slot.type === 'Slot') {
          // Named slot placeholder - check for filler
          const slotObj = slot as Slot
          const fillers = slotFillers.get(slotObj.name)
          if (fillers && fillers.length > 0) {
            for (const filler of fillers) {
              result.push(this.transformChild(filler))
            }
            slotFillers.delete(slotObj.name)
          }
          // If no filler, slot placeholder is not rendered (empty slot)
        }
      }
    }

    // Add remaining instance children that didn't match any slot
    // (these are additional children, not slot fillers)
    for (const [_name, fillers] of slotFillers) {
      for (const filler of fillers) {
        result.push(this.transformChild(filler))
      }
    }

    // Add non-slot children (text nodes)
    for (const child of nonSlotChildren) {
      result.push(this.transformChild(child))
    }

    return result
  }

  /**
   * Convert childOverrides to Instance objects for slot filling
   *
   * childOverrides syntax: NavItem Icon "home"; Label "Home"
   * Each override becomes a pseudo-Instance that fills the corresponding slot
   */
  private childOverridesToInstances(overrides: ChildOverride[]): Instance[] {
    return overrides.map(override => ({
      type: 'Instance' as const,
      component: override.childName,
      name: null,
      properties: override.properties,
      children: [],
      line: override.properties[0]?.line || 0,
      column: override.properties[0]?.column || 0,
    }))
  }

  private transformChild(child: Instance | Text): IRNode {
    if (child.type === 'Text' || (child as any).content !== undefined) {
      const text = child as Text
      return {
        id: this.generateId(),
        tag: 'span',
        name: 'Text',
        properties: [{ name: 'textContent', value: text.content }],
        styles: [],
        events: [],
        children: [],
      }
    }
    return this.transformInstance(child as Instance)
  }

  /**
   * Extract inline states and events from instance children.
   *
   * The parser treats inline constructs like:
   * - `state hover bg #333` as a child Instance with component="state"
   * - `onclick toggle` as a child Instance with component="onclick"
   *
   * This method identifies and extracts them, returning:
   * - inlineStateStyles: IRStyle[] with state attribute
   * - inlineEvents: IREvent[]
   * - remainingChildren: actual UI children
   */
  private extractInlineStatesAndEvents(children: (Instance | Text)[]): {
    inlineStateStyles: IRStyle[]
    inlineEvents: IREvent[]
    remainingChildren: (Instance | Text)[]
  } {
    const inlineStateStyles: IRStyle[] = []
    const inlineEvents: IREvent[] = []
    const remainingChildren: (Instance | Text)[] = []

    for (const child of children) {
      // Only process Instance type
      if ((child as any).type !== 'Instance') {
        remainingChildren.push(child)
        continue
      }

      const inst = child as Instance
      const component = inst.component.toLowerCase()

      // Check for inline state: "state hover bg #333"
      if (component === 'state') {
        // First property should be the state name, rest are styles
        const props = inst.properties
        if (props.length > 0) {
          // First value of first property is the state name
          const stateNameProp = props[0]
          const stateName = stateNameProp.name

          // Rest of the properties are the styles for this state
          const stateProps = props.slice(1)
          for (const prop of stateProps) {
            const cssStyles = this.propertyToCSS(prop)
            for (const style of cssStyles) {
              inlineStateStyles.push({ ...style, state: stateName })
            }
          }
        }
        continue
      }

      // Check for inline event: "onclick toggle" or "onhover highlight"
      if (component.startsWith('on')) {
        const eventName = this.mapEventName(component)
        const actions: IRAction[] = []

        // Parse actions from properties
        for (const prop of inst.properties) {
          // Action name is the property name, target is the first value
          actions.push({
            type: prop.name,
            target: prop.values.length > 0 ? String(prop.values[0]) : undefined,
            args: prop.values.slice(1).map(v => String(v)),
          })
        }

        if (actions.length > 0) {
          inlineEvents.push({
            name: eventName,
            actions,
          })
        }
        continue
      }

      // Not a state or event, keep as regular child
      remainingChildren.push(child)
    }

    return { inlineStateStyles, inlineEvents, remainingChildren }
  }

  /**
   * Resolve component inheritance chain
   */
  private resolveComponent(component: ComponentDefinition): ComponentDefinition {
    if (!component.extends) {
      return component
    }

    const parent = this.componentMap.get(component.extends)
    if (!parent) {
      return component
    }

    const resolvedParent = this.resolveComponent(parent)

    // Merge parent + child (child overrides)
    return {
      ...component,
      primitive: component.primitive || resolvedParent.primitive,
      properties: this.mergeProperties(resolvedParent.properties, component.properties),
      states: [...resolvedParent.states, ...component.states],
      events: [...resolvedParent.events, ...component.events],
      children: [...resolvedParent.children, ...component.children],
    }
  }

  /**
   * Merge properties (later values override earlier)
   */
  private mergeProperties(base: Property[], overrides: Property[]): Property[] {
    const map = new Map<string, Property>()
    for (const prop of base) {
      map.set(prop.name, prop)
    }
    for (const prop of overrides) {
      map.set(prop.name, prop)
    }
    return Array.from(map.values())
  }

  /**
   * Get HTML tag for component
   */
  private getTag(componentName: string, resolved: ComponentDefinition | null): string {
    const primitive = resolved?.primitive || componentName.toLowerCase()

    const mapping: Record<string, string> = {
      // Layout primitives
      frame: 'div',
      box: 'div',
      text: 'span',

      // Form elements
      button: 'button',
      input: 'input',
      textarea: 'textarea',

      // Media
      image: 'img',
      link: 'a',
      icon: 'span',

      // Semantic structure
      header: 'header',
      nav: 'nav',
      main: 'main',
      section: 'section',
      article: 'article',
      aside: 'aside',
      footer: 'footer',

      // Headings
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
    }

    return mapping[primitive.toLowerCase()] || 'div'
  }

  /**
   * Transform Mirror properties to CSS styles
   *
   * This method uses intelligent layout merging to handle flexbox properties correctly.
   * It collects all layout-related properties first, then generates consistent CSS.
   */
  private transformProperties(properties: Property[], primitive: string = 'frame'): IRStyle[] {
    const styles: IRStyle[] = []
    const layoutContext: LayoutContext = {
      direction: null,
      justifyContent: null,
      alignItems: null,
      flexWrap: null,
      gap: null,
      isGrid: false,
      gridColumns: null,
    }

    // First pass: collect layout properties into context
    for (const prop of properties) {
      const name = prop.name
      // Boolean property: either [true] or [] (empty values)
      const isBoolean = (prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0

      // Direction properties
      if ((name === 'horizontal' || name === 'hor') && isBoolean) {
        layoutContext.direction = 'row'
        continue
      }
      if ((name === 'vertical' || name === 'ver') && isBoolean) {
        layoutContext.direction = 'column'
        continue
      }

      // Alignment properties (handle based on direction later)
      if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) {
        this.applyAlignmentToContext(name, layoutContext)
        continue
      }

      // align property with values: align top left, align center
      if (name === 'align' && !isBoolean) {
        for (const val of prop.values) {
          const alignValue = String(val).toLowerCase()
          if (ALIGNMENT_PROPERTIES.has(alignValue)) {
            this.applyAlignmentToContext(alignValue, layoutContext)
          }
        }
        continue
      }

      // Wrap
      if (name === 'wrap' && isBoolean) {
        layoutContext.flexWrap = 'wrap'
        continue
      }

      // Gap
      if ((name === 'gap' || name === 'g') && !isBoolean) {
        layoutContext.gap = this.formatCSSValue(name, this.resolveValue(prop.values, name))
        continue
      }

      // Grid (takes precedence over flex)
      if (name === 'grid') {
        layoutContext.isGrid = true
        layoutContext.gridColumns = this.resolveGridColumns(prop)
        continue
      }
    }

    // Generate layout styles from context
    const layoutStyles = this.generateLayoutStyles(layoutContext, primitive)
    styles.push(...layoutStyles)

    // Second pass: process non-layout properties
    for (const prop of properties) {
      const name = prop.name
      const isBoolean = (prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0

      // Skip layout properties (already handled)
      if (DIRECTION_PROPERTIES.has(name) && isBoolean) continue
      if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) continue
      if (name === 'align' && !isBoolean) continue  // align top left → flex alignment
      if (name === 'wrap' && isBoolean) continue
      if ((name === 'gap' || name === 'g') && !isBoolean) continue
      if (name === 'grid') continue

      const cssStyles = this.propertyToCSS(prop, primitive)
      styles.push(...cssStyles)
    }

    return styles
  }

  /**
   * Apply alignment property to layout context
   */
  private applyAlignmentToContext(name: string, ctx: LayoutContext): void {
    switch (name) {
      case 'center':
      case 'cen':
        ctx.justifyContent = 'center'
        ctx.alignItems = 'center'
        break
      case 'spread':
        ctx.justifyContent = 'space-between'
        break
      case 'left':
        // Horizontal alignment - affects cross-axis in column, main-axis in row
        ctx.alignItems = ctx.alignItems || 'flex-start' // will be remapped based on direction
        // Mark as horizontal alignment
        ;(ctx as any)._hAlign = 'start'
        break
      case 'right':
        ;(ctx as any)._hAlign = 'end'
        break
      case 'hor-center':
        ;(ctx as any)._hAlign = 'center'
        break
      case 'top':
        // Vertical alignment
        ;(ctx as any)._vAlign = 'start'
        break
      case 'bottom':
        ;(ctx as any)._vAlign = 'end'
        break
      case 'ver-center':
        ;(ctx as any)._vAlign = 'center'
        break
    }
  }

  /**
   * Generate final layout styles from context
   *
   * Key insight: In flexbox, alignment properties mean different CSS depending on direction.
   * - In column: left/right → align-items, top/bottom → justify-content
   * - In row: left/right → justify-content, top/bottom → align-items
   */
  private generateLayoutStyles(ctx: LayoutContext, primitive: string): IRStyle[] {
    const styles: IRStyle[] = []

    // Grid takes precedence
    if (ctx.isGrid) {
      styles.push({ property: 'display', value: 'grid' })
      if (ctx.gridColumns) {
        styles.push({ property: 'grid-template-columns', value: ctx.gridColumns })
      }
      if (ctx.gap) {
        styles.push({ property: 'gap', value: ctx.gap })
      }
      return styles
    }

    // Determine final direction
    const direction = ctx.direction || (primitive === 'frame' ? 'column' : null)

    // If no layout properties were set and not a frame, skip flex styles
    const hasLayoutProps = direction || ctx.justifyContent || ctx.alignItems ||
                          (ctx as any)._hAlign || (ctx as any)._vAlign || ctx.flexWrap

    if (!hasLayoutProps && primitive !== 'frame') {
      if (ctx.gap) {
        // Gap without flex context - just return gap
        styles.push({ property: 'gap', value: ctx.gap })
      }
      return styles
    }

    // Add flex display
    styles.push({ property: 'display', value: 'flex' })

    // Add direction (default column for frame)
    const finalDirection = direction || 'column'
    styles.push({ property: 'flex-direction', value: finalDirection })

    // Map horizontal/vertical alignment to justify-content/align-items based on direction
    const hAlign = (ctx as any)._hAlign as 'start' | 'end' | 'center' | undefined
    const vAlign = (ctx as any)._vAlign as 'start' | 'end' | 'center' | undefined

    const alignValue = (align: 'start' | 'end' | 'center'): string => {
      if (align === 'start') return 'flex-start'
      if (align === 'end') return 'flex-end'
      return 'center'
    }

    if (finalDirection === 'column') {
      // Column: horizontal → align-items, vertical → justify-content
      if (hAlign) {
        ctx.alignItems = alignValue(hAlign)
      }
      if (vAlign) {
        ctx.justifyContent = alignValue(vAlign)
      }
    } else {
      // Row: horizontal → justify-content, vertical → align-items
      if (hAlign) {
        ctx.justifyContent = alignValue(hAlign)
      }
      if (vAlign) {
        ctx.alignItems = alignValue(vAlign)
      }
    }

    // Add justify-content if set
    if (ctx.justifyContent) {
      styles.push({ property: 'justify-content', value: ctx.justifyContent })
    }

    // Add align-items if set
    if (ctx.alignItems) {
      styles.push({ property: 'align-items', value: ctx.alignItems })
    }

    // Add flex-wrap
    if (ctx.flexWrap) {
      styles.push({ property: 'flex-wrap', value: ctx.flexWrap })
    }

    // Add gap
    if (ctx.gap) {
      styles.push({ property: 'gap', value: ctx.gap })
    }

    return styles
  }

  /**
   * Resolve grid column specification
   */
  private resolveGridColumns(prop: Property): string | null {
    const values = prop.values

    // grid 3 → repeat(3, 1fr)
    if (values.length === 1 && /^\d+$/.test(String(values[0]))) {
      return `repeat(${values[0]}, 1fr)`
    }

    // grid auto 250 → auto-fill, minmax(250px, 1fr)
    if (values.length === 2 && values[0] === 'auto') {
      const minWidth = /^\d+$/.test(String(values[1])) ? `${values[1]}px` : values[1]
      return `repeat(auto-fill, minmax(${minWidth}, 1fr))`
    }

    // grid 30% 70% → explicit columns
    if (values.length >= 2) {
      return values.map(v => {
        const str = String(v)
        if (/^\d+$/.test(str)) return `${str}px`
        if (str.endsWith('%')) return str
        return str
      }).join(' ')
    }

    return null
  }

  /**
   * Transform states to CSS styles with state attribute
   */
  private transformStates(states: State[]): IRStyle[] {
    const styles: IRStyle[] = []

    for (const state of states) {
      for (const prop of state.properties) {
        const cssStyles = this.propertyToCSS(prop)
        for (const style of cssStyles) {
          styles.push({ ...style, state: state.name })
        }
      }
      // Note: childOverrides are handled separately in applyStateChildOverrides
    }

    return styles
  }

  /**
   * Apply state childOverrides to children
   *
   * When a state has childOverrides like:
   *   state filled
   *     Value col #fff
   *
   * This adds state-conditional styles to the matching child node.
   */
  private applyStateChildOverrides(children: IRNode[], states: State[]): void {
    for (const state of states) {
      for (const override of state.childOverrides) {
        // Find matching child by name
        const matchingChild = children.find(
          child => child.name === override.childName
        )

        if (matchingChild) {
          // Convert override properties to CSS styles with state condition
          for (const prop of override.properties) {
            const cssStyles = this.propertyToCSS(prop)
            for (const style of cssStyles) {
              matchingChild.styles.push({
                ...style,
                state: state.name,
              })
            }
          }
        }
      }
    }
  }

  /**
   * Convert Mirror property to CSS
   */
  private propertyToCSS(prop: Property, primitive: string = 'frame'): IRStyle[] {
    const name = prop.name
    const value = this.resolveValue(prop.values, name)
    const values = prop.values

    // Handle boolean properties (value is true OR empty values array)
    if ((prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0) {
      return this.booleanPropertyToCSS(name)
    }

    // Handle size property - context-dependent
    // For text/icon: size = font-size
    // For frame/box: size = width/height
    if (name === 'size') {
      // Text and Icon primitives: size means font-size
      if (primitive === 'text' || primitive === 'icon') {
        const val = String(values[0])
        const px = /^\d+$/.test(val) ? `${val}px` : val
        return [{ property: 'font-size', value: px }]
      }

      // Box/Frame primitives: size means width/height
      if (values.length === 1) {
        const val = String(values[0])
        if (val === 'hug') {
          return [
            { property: 'width', value: 'fit-content' },
            { property: 'height', value: 'fit-content' },
          ]
        }
        if (val === 'full') {
          return [
            { property: 'width', value: '100%' },
            { property: 'height', value: '100%' },
            { property: 'flex-grow', value: '1' },
          ]
        }
        // Single value = square
        const px = /^\d+$/.test(val) ? `${val}px` : val
        return [
          { property: 'width', value: px },
          { property: 'height', value: px },
        ]
      }
      if (values.length >= 2) {
        const w = String(values[0])
        const h = String(values[1])
        return [
          { property: 'width', value: /^\d+$/.test(w) ? `${w}px` : w },
          { property: 'height', value: /^\d+$/.test(h) ? `${h}px` : h },
        ]
      }
    }

    // Handle directional padding: pad left 20, pad top 8 bottom 24, pad x 16, pad left right 8
    if ((name === 'pad' || name === 'padding' || name === 'p') && values.length >= 2) {
      const directions = ['left', 'right', 'top', 'bottom', 'down', 'l', 'r', 't', 'b', 'x', 'y', 'horizontal', 'vertical', 'hor', 'ver']
      if (directions.includes(String(values[0]))) {
        return this.parseDirectionalSpacing('padding', values)
      }
    }

    // Handle directional margin: margin left 8, margin top 16 bottom 24, margin x 16
    if ((name === 'margin' || name === 'm') && values.length >= 2) {
      const directions = ['left', 'right', 'top', 'bottom', 'down', 'l', 'r', 't', 'b', 'x', 'y', 'horizontal', 'vertical', 'hor', 'ver']
      if (directions.includes(String(values[0]))) {
        return this.parseDirectionalSpacing('margin', values)
      }
    }

    // Handle directional border: bor t 1 #333, bor left right 1 #333, bor x 2 #666
    if ((name === 'bor' || name === 'border') && values.length >= 2) {
      const dirMap: Record<string, string[]> = {
        't': ['border-top'], 'top': ['border-top'],
        'b': ['border-bottom'], 'bottom': ['border-bottom'], 'down': ['border-bottom'],
        'l': ['border-left'], 'left': ['border-left'],
        'r': ['border-right'], 'right': ['border-right'],
        'x': ['border-left', 'border-right'],
        'y': ['border-top', 'border-bottom'],
        'horizontal': ['border-left', 'border-right'], 'hor': ['border-left', 'border-right'],
        'vertical': ['border-top', 'border-bottom'], 'ver': ['border-top', 'border-bottom'],
      }
      const firstVal = String(values[0])
      if (dirMap[firstVal]) {
        // Collect all direction tokens
        const borderProps: string[] = []
        let i = 0
        while (i < values.length && dirMap[String(values[i])]) {
          borderProps.push(...dirMap[String(values[i])])
          i++
        }
        // Rest are the border values (width, style, color)
        const restValues = values.slice(i)
        const borderValue = this.formatBorderValue(restValues)
        // Apply to all directions (deduplicated)
        const uniqueProps = [...new Set(borderProps)]
        return uniqueProps.map(prop => ({ property: prop, value: borderValue }))
      }
    }

    // Handle corner-specific radius: rad tl 8, rad t 8, rad 8 8 0 0
    if ((name === 'rad' || name === 'radius') && values.length >= 1) {
      const cornerMap: Record<string, string[]> = {
        'tl': ['border-top-left-radius'],
        'tr': ['border-top-right-radius'],
        'bl': ['border-bottom-left-radius'],
        'br': ['border-bottom-right-radius'],
        't': ['border-top-left-radius', 'border-top-right-radius'],
        'b': ['border-bottom-left-radius', 'border-bottom-right-radius'],
        'l': ['border-top-left-radius', 'border-bottom-left-radius'],
        'r': ['border-top-right-radius', 'border-bottom-right-radius'],
      }
      const firstVal = String(values[0])
      if (cornerMap[firstVal] && values.length >= 2) {
        const props = cornerMap[firstVal]
        const val = String(values[1])
        const px = /^\d+$/.test(val) ? `${val}px` : val
        return props.map(p => ({ property: p, value: px }))
      }
    }

    // Handle rotate: rotate 45
    if (name === 'rotate' || name === 'rot') {
      const deg = String(values[0])
      return [{ property: 'transform', value: `rotate(${deg}deg)` }]
    }

    // Handle translate: translate 10 20
    if (name === 'translate') {
      const x = String(values[0])
      const y = values.length >= 2 ? String(values[1]) : '0'
      const xPx = /^-?\d+$/.test(x) ? `${x}px` : x
      const yPx = /^-?\d+$/.test(y) ? `${y}px` : y
      return [{ property: 'transform', value: `translate(${xPx}, ${yPx})` }]
    }

    // Handle inline hover properties: hover-bg, hover-col, etc.
    if (name.startsWith('hover-')) {
      const baseProp = name.replace('hover-', '')
      const propMap: Record<string, string> = {
        'bg': 'background',
        'col': 'color',
        'opacity': 'opacity',
        'opa': 'opacity',
        'scale': 'transform',
        'bor': 'border',
        'border': 'border',
        'boc': 'border-color',
        'border-color': 'border-color',
        'rad': 'border-radius',
        'radius': 'border-radius',
      }
      const cssProp = propMap[baseProp] || baseProp
      let cssValue = value
      if (baseProp === 'scale') {
        cssValue = `scale(${value})`
      } else if (['bg', 'col', 'bor', 'border', 'boc', 'border-color', 'rad', 'radius'].includes(baseProp)) {
        cssValue = this.formatCSSValue(baseProp, value)
      }
      return [{ property: cssProp, value: cssValue, state: 'hover' }]
    }

    // Property mapping
    const mapping: Record<string, string | string[]> = {
      // Layout
      horizontal: ['display', 'flex-direction'],
      hor: ['display', 'flex-direction'],
      vertical: ['display', 'flex-direction'],
      ver: ['display', 'flex-direction'],
      center: ['justify-content', 'align-items'],
      cen: ['justify-content', 'align-items'],
      gap: 'gap',
      g: 'gap',
      spread: 'justify-content',
      wrap: 'flex-wrap',
      stacked: 'position',
      grid: 'display',

      // Sizing
      width: 'width',
      w: 'width',
      height: 'height',
      h: 'height',
      'min-width': 'min-width',
      minw: 'min-width',
      'max-width': 'max-width',
      maxw: 'max-width',
      'min-height': 'min-height',
      minh: 'min-height',
      'max-height': 'max-height',
      maxh: 'max-height',

      // Spacing
      padding: 'padding',
      pad: 'padding',
      p: 'padding',
      margin: 'margin',
      m: 'margin',

      // Colors
      color: 'color',
      col: 'color',
      c: 'color',
      background: 'background',
      bg: 'background',
      'border-color': 'border-color',
      boc: 'border-color',

      // Border
      border: 'border',
      bor: 'border',
      radius: 'border-radius',
      rad: 'border-radius',

      // Typography
      'font-size': 'font-size',
      fs: 'font-size',
      weight: 'font-weight',
      line: 'line-height',
      font: 'font-family',
      'text-align': 'text-align',

      // Visual
      opacity: 'opacity',
      o: 'opacity',
      shadow: 'box-shadow',
      cursor: 'cursor',
      z: 'z-index',

      // Scroll
      scroll: 'overflow-y',
      'scroll-ver': 'overflow-y',
      'scroll-hor': 'overflow-x',
      'scroll-both': 'overflow',
      clip: 'overflow',
    }

    const cssProperty = mapping[name]

    if (!cssProperty) {
      // Skip non-CSS properties (content, data, etc.)
      return []
    }

    // Handle special cases
    if (name === 'horizontal' || name === 'hor') {
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'row' },
      ]
    }

    if (name === 'vertical' || name === 'ver') {
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'column' },
      ]
    }

    if (name === 'center' || name === 'cen') {
      return [
        { property: 'display', value: 'flex' },
        { property: 'justify-content', value: 'center' },
        { property: 'align-items', value: 'center' },
      ]
    }

    if (name === 'spread') {
      return [
        { property: 'display', value: 'flex' },
        { property: 'justify-content', value: 'space-between' },
      ]
    }

    if (name === 'wrap') {
      return [{ property: 'flex-wrap', value: 'wrap' }]
    }

    if (name === 'stacked') {
      return [{ property: 'position', value: 'relative' }]
    }

    if (name === 'scroll' || name === 'scroll-ver') {
      return [{ property: 'overflow-y', value: 'auto' }]
    }

    if (name === 'scroll-hor') {
      return [{ property: 'overflow-x', value: 'auto' }]
    }

    if (name === 'scroll-both') {
      return [{ property: 'overflow', value: 'auto' }]
    }

    if (name === 'clip') {
      return [{ property: 'overflow', value: 'hidden' }]
    }

    // Handle grid
    if (name === 'grid') {
      const values = prop.values

      // grid 3 → repeat(3, 1fr)
      if (values.length === 1 && /^\d+$/.test(String(values[0]))) {
        return [
          { property: 'display', value: 'grid' },
          { property: 'grid-template-columns', value: `repeat(${values[0]}, 1fr)` },
        ]
      }

      // grid auto 250 → auto-fill, minmax(250px, 1fr)
      if (values.length === 2 && values[0] === 'auto') {
        const minWidth = /^\d+$/.test(String(values[1])) ? `${values[1]}px` : values[1]
        return [
          { property: 'display', value: 'grid' },
          { property: 'grid-template-columns', value: `repeat(auto-fill, minmax(${minWidth}, 1fr))` },
        ]
      }

      // grid 30% 70% → explicit columns
      if (values.length >= 2) {
        const columns = values.map(v => {
          const str = String(v)
          if (/^\d+$/.test(str)) return `${str}px`
          if (str.endsWith('%')) return str
          return str
        }).join(' ')
        return [
          { property: 'display', value: 'grid' },
          { property: 'grid-template-columns', value: columns },
        ]
      }

      return [{ property: 'display', value: 'grid' }]
    }

    // Handle width/height special values
    if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && value === 'full') {
      return [
        { property: name === 'width' || name === 'w' ? 'width' : 'height', value: '100%' },
        { property: 'flex-grow', value: '1' },
      ]
    }

    if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && value === 'hug') {
      return [{ property: name === 'width' || name === 'w' ? 'width' : 'height', value: 'fit-content' }]
    }

    // Handle shadow presets
    if (name === 'shadow') {
      const shadows: Record<string, string> = {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
      }
      return [{ property: 'box-shadow', value: shadows[value] || value }]
    }

    // Default: direct mapping
    const cssValue = this.formatCSSValue(name, value)
    return [{ property: cssProperty as string, value: cssValue }]
  }

  /**
   * Format value for CSS
   */
  private formatCSSValue(property: string, value: string): string {
    // Properties that need px units for numeric values
    const needsPx = [
      'padding', 'pad', 'p',
      'margin', 'm',
      'gap', 'g',
      'width', 'w', 'height', 'h',
      'min-width', 'minw', 'max-width', 'maxw',
      'min-height', 'minh', 'max-height', 'maxh',
      'font-size', 'fs',
      'radius', 'rad',
      'border-radius',
      'border', 'bor',
    ]

    if (needsPx.includes(property)) {
      // Handle multi-value properties (e.g., "8 16" → "8px 16px")
      return value.split(' ').map(v => {
        if (/^\d+$/.test(v)) {
          return `${v}px`
        }
        return v
      }).join(' ')
    }

    return value
  }

  /**
   * Parse directional spacing (padding/margin)
   * Supports:
   * - pad left 20                    → padding-left: 20px
   * - pad top 8 bottom 24            → padding-top: 8px, padding-bottom: 24px
   * - pad left right 8               → padding-left: 8px, padding-right: 8px
   * - margin top bottom left 4       → margin-top/bottom/left: 4px
   * - pad x 16                       → padding-left: 16px, padding-right: 16px
   * - pad y 8                        → padding-top: 8px, padding-bottom: 8px
   */
  private parseDirectionalSpacing(property: string, values: any[]): IRStyle[] {
    const styles: IRStyle[] = []

    // Direction aliases and shortcuts
    const directionMap: Record<string, string[]> = {
      'left': ['left'],
      'right': ['right'],
      'top': ['top'],
      'bottom': ['bottom'],
      'down': ['bottom'],  // Alias
      'l': ['left'],
      'r': ['right'],
      't': ['top'],
      'b': ['bottom'],
      'x': ['left', 'right'],      // Horizontal shortcut
      'y': ['top', 'bottom'],      // Vertical shortcut
      'horizontal': ['left', 'right'],
      'vertical': ['top', 'bottom'],
      'hor': ['left', 'right'],
      'ver': ['top', 'bottom'],
    }

    let i = 0
    while (i < values.length) {
      const val = String(values[i])

      // Check if this is a direction
      if (directionMap[val]) {
        // Collect all consecutive directions
        const directions: string[] = []
        while (i < values.length && directionMap[String(values[i])]) {
          directions.push(...directionMap[String(values[i])])
          i++
        }

        // Next value should be the actual value
        if (i < values.length) {
          const numVal = String(values[i])
          const px = /^-?\d+$/.test(numVal) ? `${numVal}px` : numVal

          // Apply value to all collected directions (deduplicated)
          const uniqueDirs = [...new Set(directions)]
          for (const dir of uniqueDirs) {
            styles.push({ property: `${property}-${dir}`, value: px })
          }
          i++
        }
      } else {
        i++
      }
    }
    return styles
  }

  /**
   * Format border value: 1 #333 → 1px solid #333, 2 dashed #666 → 2px dashed #666
   */
  private formatBorderValue(values: any[]): string {
    const parts: string[] = []
    let hasStyle = false
    const styles = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none']

    for (const v of values) {
      const str = String(v)
      if (/^\d+$/.test(str)) {
        parts.push(`${str}px`)
      } else if (styles.includes(str)) {
        hasStyle = true
        parts.push(str)
      } else {
        parts.push(str)
      }
    }

    // If no explicit style, add 'solid' after width
    if (!hasStyle && parts.length > 0 && parts[0].endsWith('px')) {
      parts.splice(1, 0, 'solid')
    }

    return parts.join(' ')
  }

  /**
   * Map from property name to token suffix for auto-completion
   * e.g., pad $md -> $md.pad if $md.pad exists
   */
  private static PROPERTY_TO_TOKEN_SUFFIX: Record<string, string> = {
    // Spacing
    'pad': '.pad', 'padding': '.pad', 'p': '.pad',
    'margin': '.margin', 'm': '.margin',
    'gap': '.gap', 'g': '.gap',
    // Sizing
    'rad': '.rad', 'radius': '.rad',
    // Colors
    'bg': '.bg', 'background': '.bg',
    'col': '.col', 'color': '.col', 'c': '.col',
    'boc': '.boc', 'border-color': '.boc',
    // Typography
    'fs': '.font.size', 'font-size': '.font.size',
  }

  /**
   * Resolve property values to string
   * @param values The property values to resolve
   * @param propertyName Optional property name for context-aware token resolution
   */
  private resolveValue(values: any[], propertyName?: string): string {
    return values
      .map(v => {
        // Explicit token reference object
        if (typeof v === 'object' && v.kind === 'token') {
          const tokenName = v.name
          const resolvedName = this.resolveTokenWithContext(tokenName, propertyName)
          // Convert dots to hyphens for valid CSS variable name
          const cssVarName = resolvedName.replace(/\./g, '-')
          return `var(--${cssVarName})`
        }
        // String that matches a token name
        if (typeof v === 'string' && this.tokenSet.has(v)) {
          // Convert dots to hyphens for valid CSS variable name
          const cssVarName = v.replace(/\./g, '-')
          return `var(--${cssVarName})`
        }
        return String(v)
      })
      .join(' ')
  }

  /**
   * Try to resolve a short token name using property context
   * e.g., 'md' with property 'pad' -> 'md.pad' if '$md.pad' exists in tokens
   */
  private resolveTokenWithContext(tokenName: string, propertyName?: string): string {
    // If token already exists as-is, use it
    if (this.tokenSet.has('$' + tokenName)) {
      return tokenName
    }

    // Try to add property-specific suffix
    if (propertyName) {
      const suffix = IRTransformer.PROPERTY_TO_TOKEN_SUFFIX[propertyName]
      if (suffix) {
        const extendedName = tokenName + suffix
        if (this.tokenSet.has('$' + extendedName)) {
          return extendedName
        }
      }
    }

    // Fall back to original name
    return tokenName
  }

  /**
   * Extract HTML properties (non-CSS)
   */
  private extractHTMLProperties(properties: Property[]): IRProperty[] {
    const htmlProps: IRProperty[] = []

    for (const prop of properties) {
      if (prop.name === 'content') {
        htmlProps.push({ name: 'textContent', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'href') {
        htmlProps.push({ name: 'href', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'src') {
        htmlProps.push({ name: 'src', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'placeholder') {
        htmlProps.push({ name: 'placeholder', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'disabled') {
        htmlProps.push({ name: 'disabled', value: true })
      }
      if (prop.name === 'hidden') {
        htmlProps.push({ name: 'hidden', value: true })
      }
      // Icon properties - pass through as data attributes for runtime handling
      if (prop.name === 'icon-size' || prop.name === 'is') {
        htmlProps.push({ name: 'data-icon-size', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'icon-color' || prop.name === 'ic') {
        htmlProps.push({ name: 'data-icon-color', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'icon-weight' || prop.name === 'iw') {
        htmlProps.push({ name: 'data-icon-weight', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'fill') {
        htmlProps.push({ name: 'data-icon-fill', value: true })
      }
      if (prop.name === 'material') {
        htmlProps.push({ name: 'data-icon-material', value: true })
      }
    }

    return htmlProps
  }

  /**
   * Transform events to IR
   */
  private transformEvents(events: Event[]): IREvent[] {
    return events.map(event => ({
      name: this.mapEventName(event.name),
      key: event.key,
      actions: event.actions.map(action => this.transformAction(action)),
      modifiers: event.modifiers,
    }))
  }

  /**
   * Map Mirror event names to DOM event names
   */
  private mapEventName(name: string): string {
    const mapping: Record<string, string> = {
      onclick: 'click',
      onhover: 'mouseenter',
      onchange: 'change',
      oninput: 'input',
      onfocus: 'focus',
      onblur: 'blur',
      onkeydown: 'keydown',
      onkeyup: 'keyup',
      onenter: 'enter',   // Viewport enter (IntersectionObserver)
      onexit: 'exit',     // Viewport exit (IntersectionObserver)
    }
    return mapping[name] || name.replace(/^on/, '')
  }

  /**
   * Transform action to IR
   */
  private transformAction(action: Action): IRAction {
    return {
      type: action.name,
      target: action.target,
      args: action.args,
    }
  }

  /**
   * Convert boolean property to CSS
   */
  private booleanPropertyToCSS(name: string): IRStyle[] {
    switch (name) {
      case 'horizontal':
      case 'hor':
        return [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'row' },
        ]
      case 'vertical':
      case 'ver':
        return [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
        ]
      case 'center':
      case 'cen':
        return [
          { property: 'display', value: 'flex' },
          { property: 'justify-content', value: 'center' },
          { property: 'align-items', value: 'center' },
        ]
      case 'spread':
        return [
          { property: 'display', value: 'flex' },
          { property: 'justify-content', value: 'space-between' },
        ]
      case 'wrap':
        return [{ property: 'flex-wrap', value: 'wrap' }]
      case 'stacked':
        return [{ property: 'position', value: 'relative' }]
      case 'hidden':
        return [{ property: 'display', value: 'none' }]
      case 'visible':
        return [{ property: 'visibility', value: 'visible' }]
      case 'disabled':
        return [{ property: 'pointer-events', value: 'none' }, { property: 'opacity', value: '0.5' }]
      case 'scroll':
      case 'scroll-ver':
        return [{ property: 'overflow-y', value: 'auto' }]
      case 'scroll-hor':
        return [{ property: 'overflow-x', value: 'auto' }]
      case 'scroll-both':
        return [{ property: 'overflow', value: 'auto' }]
      case 'clip':
        return [{ property: 'overflow', value: 'hidden' }]
      case 'truncate':
        return [
          { property: 'overflow', value: 'hidden' },
          { property: 'text-overflow', value: 'ellipsis' },
          { property: 'white-space', value: 'nowrap' },
        ]
      case 'italic':
        return [{ property: 'font-style', value: 'italic' }]
      case 'underline':
        return [{ property: 'text-decoration', value: 'underline' }]
      case 'uppercase':
        return [{ property: 'text-transform', value: 'uppercase' }]
      case 'lowercase':
        return [{ property: 'text-transform', value: 'lowercase' }]
      // Alignment: Using column layout defaults (frame default)
      // In column: left/right → align-items, top/bottom → justify-content
      case 'left':
        return [
          { property: 'align-items', value: 'flex-start' },
        ]
      case 'right':
        return [
          { property: 'align-items', value: 'flex-end' },
        ]
      case 'top':
        return [
          { property: 'justify-content', value: 'flex-start' },
        ]
      case 'bottom':
        return [
          { property: 'justify-content', value: 'flex-end' },
        ]
      case 'hor-center':
        return [
          { property: 'align-items', value: 'center' },
        ]
      case 'ver-center':
        return [
          { property: 'justify-content', value: 'center' },
        ]
      default:
        return []
    }
  }
}
