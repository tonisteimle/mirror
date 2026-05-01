/**
 * IRTransformer ops — instance-ops
 *
 * Extracted from compiler/ir/index.ts. Functions take `this: IRTransformer`
 * and are bound on the class via class-field assignment.
 */

import type { ComponentDefinition, Instance, Property, Each, Slot, Text } from '../../parser/ast'
import { isZagComponent, isSlot, isText, hasContent } from '../../parser/ast'
import type {
  IRNode,
  IRStyle,
  IREvent,
  SourcePosition,
  PropertySourceMap,
  IRWarning,
} from '../types'
import { calculateSourcePosition } from '../source-map'
import { getPrimitiveDefaults } from '../../schema/primitives'
import { isZagPrimitive } from '../../schema/zag-primitives'
import { isChartPrimitive } from '../../schema/chart-primitives'
import { transformChart as transformChartExtracted } from '../transformers/chart-transformer'
import type { ParentLayoutContext } from '../transformers/transformer-context'
import {
  applyAbsolutePositioningToChildren,
  applyGridContextToChildren,
} from '../transformers/layout-transformer'
import { transformEvents } from '../transformers/event-transformer'
import {
  convertDefaultsToProperties,
  determineLayoutType,
  mergeProperties,
  extractValueBinding,
} from '../transformers/property-utils-transformer'
import {
  resolveValue as resolveValueExtracted,
  extractHTMLProperties as extractHTMLPropertiesExtracted,
} from '../transformers/value-resolver'
import {
  resolveComponent as resolveComponentExtracted,
  type ComponentResolverContext,
} from '../transformers/component-resolver'
import { childOverridesToInstances as childOverridesToInstancesExtracted } from '../transformers/slot-utils'
import {
  transformStates as transformStatesExtracted,
  applyStateChildOverrides as applyStateChildOverridesExtracted,
  type StateStylesContext,
  type StateTransformResult,
} from '../transformers/state-styles-transformer'
import {
  extractInlineStatesAndEvents as extractInlineStatesAndEventsExtracted,
  type InlineExtractionContext,
} from '../transformers/inline-extraction'
import {
  transformEach as transformEachExtracted,
  transformConditional as transformConditionalExtracted,
  type ConditionalBlock,
  type ControlFlowContext,
} from '../transformers/control-flow-transformer'
import type { IRTransformer } from '../index'

export function createEmptyNode(
  this: IRTransformer,
  instance: { line?: number; column?: number } | null | undefined
): IRNode {
  return {
    id: this.generateId(),
    tag: 'div',
    primitive: 'box',
    name: 'Unknown',
    properties: [],
    styles: [],
    events: [],
    children: [],
    sourcePosition: instance?.line
      ? {
          line: instance.line,
          column: instance.column ?? 0,
          endLine: instance.line,
          endColumn: instance.column ?? 0,
        }
      : undefined,
  }
}

/**
 * Transform a Slot AST node into an IR node (visual placeholder)
 */
export function transformSlotPrimitive(this: IRTransformer, slot: Slot, parentId?: string): IRNode {
  const nodeId = slot.nodeId || this.generateId()

  // Transform slot properties (w, h, etc.) to styles
  const styles: IRNode['styles'] = []
  if (slot.properties) {
    const baseStyles = this.transformProperties(slot.properties, 'slot')
    styles.push(...baseStyles)
  }

  // Source position for SourceMap
  const sourcePosition =
    slot.line !== undefined && slot.column !== undefined
      ? { line: slot.line, column: slot.column, endLine: slot.line, endColumn: slot.column }
      : undefined

  // Add to source map builder (required for replaceSlot to work)
  if (this.includeSourceMap && sourcePosition) {
    this.sourceMapBuilder.addNode(nodeId, 'Slot', sourcePosition, {
      isDefinition: false,
      parentId,
    })
  }

  return {
    id: nodeId,
    tag: 'div',
    primitive: 'slot',
    properties: [{ name: 'textContent', value: slot.name }],
    styles,
    events: [],
    children: [],
    sourcePosition,
  }
}

/**
 * Transform a Chart primitive (Line, Bar, Pie, etc.) into an IRNode
 *
 * Chart primitives create a container div that the runtime fills with a Chart.js canvas.
 * Properties like w, h, colors, title, legend, etc. are passed to the runtime.
 */
export function transformChartPrimitive(
  this: IRTransformer,
  instance: Instance,
  resolvedComponent: ComponentDefinition | null,
  primitive: string,
  parentLayoutContext?: ParentLayoutContext
): IRNode {
  return transformChartExtracted(
    this.createTransformerContext(),
    instance,
    resolvedComponent,
    primitive,
    mergeProperties,
    parentLayoutContext
  )
}

/**
 * Transforms a single AST Instance node into an IRNode.
 *
 * Pipeline (order matters — each step depends on previous ones):
 *
 *   1. Special-type dispatch (Each / Conditional / Zag / Chart) — handled
 *      early because these have their own transformers and bypass the
 *      Instance pipeline entirely.
 *   2. Cycle detection — guards against `MyComp as MyComp` infinite recursion.
 *      Only applies to user-defined components (componentMap), not primitives.
 *   3. Property merge: primitive defaults < component defaults < expanded
 *      instance properties. Expansion handles `Btn $primary, ...` style
 *      mixin references before the merge.
 *   4. Width/height descendant scan (`hasWidthFullInDescendants`) — used in
 *      step 5 to decide whether the parent uses fit-content or expands.
 *      Recursive over component refs because mixins can bring `w full` in.
 *   5. transformProperties → CSS styles, parent-context-aware (grid x/y
 *      vs flex direction etc.).
 *   6. Root-element fix: at the document root, flex-based `w full` /
 *      `h full` don't apply (no flex parent), so we strip the flex props
 *      and emit explicit `width: 100%` / `height: 100%`.
 *   7. State-style transformation from BOTH component definition and
 *      inline instance states. Returns `hasSizeStates` so we can emit
 *      `container-type: inline-size` later.
 *   8. Event transformation (component + instance) THEN state-machine
 *      build — state machine needs both states and events together to
 *      decide which states are reachable via transitions.
 *   9. Inline state/event extraction from children — children like
 *      `Btn.open: visible` are state declarations, not real children.
 *  10. childOverrides → instances for slot filling (component-level slot
 *      defaults can be overridden at instance time).
 *  11. NodeId generation BEFORE child resolution — children need parentId
 *      to register themselves correctly in the SourceMap.
 *  12. Layout context for children: grid (with column count) / absolute
 *      (relative parent) / flex (with direction). Drives child styling.
 *  13. Cycle-stack push → resolveChildren → pop. The push/pop pair must
 *      bracket the recursion (see step 2's check).
 *  14. Merge dropdown-feature properties (visibleWhen, initialState,
 *      selection, bind, route) — instance overrides component.
 *  15. State-machine `initial` override from instance + Figma-variant
 *      state-children pattern (children of one state become 'default'
 *      state's children for round-trip toggling).
 *  16. Route → synthetic click/navigate event.
 *  17. SourceMap entries (only if tracking enabled) — built AFTER nodeId
 *      so node + property positions can reference the right ID.
 *  18. State-conditional childOverrides applied to resolved children.
 *  19. Layout post-pass: auto-absolute positioning + grid-flex cleanup
 *      modify already-resolved children based on this node's layout.
 *
 * Notes for editors:
 *   - Steps 7 and 8 must run before 11 (children resolution): inline
 *     states/events extracted from children (step 9) need to be merged
 *     into the state machine.
 *   - Step 17 (SourceMap) can run any time after nodeId; it has no
 *     ordering dependency with steps 12–19 except needing the node to
 *     exist.
 *   - The `hasWidthFullInDescendants` heuristic (step 4) is performance-
 *     sensitive on deep trees but needed because Mirror's `w full` is
 *     parent-relative; without the lookahead, parent and children would
 *     race for available width.
 */
export function transformInstance(
  this: IRTransformer,
  instance: Instance | Each | any,
  parentId?: string,
  isEachTemplate?: boolean,
  isConditional?: boolean,
  parentLayoutContext?: ParentLayoutContext
): IRNode {
  // Handle Each loops
  if (instance.type === 'Each') {
    return this.transformEach(instance as Each)
  }

  // Handle Conditionals
  if (instance.type === 'Conditional') {
    return this.transformConditional(instance)
  }

  // Guard against missing component name
  if (!instance.component) {
    this.addWarning({
      type: 'invalid-instance',
      message: 'Instance missing component name',
      position: instance.position,
    })
    return this.createEmptyNode(instance)
  }

  // Cycle detection (Bug #21): only kicks in for user-defined components
  // (in componentMap). Primitives like Frame-in-Frame are NOT recursion —
  // they're just nested boxes. The check has to be after componentMap
  // lookup, see below.
  const component = this.componentMap.get(instance.component)
  if (component && this.componentInstantiationStack.includes(instance.component)) {
    this.addWarning({
      type: 'recursive-component',
      message: `Component '${instance.component}' references itself recursively (cycle: ${[...this.componentInstantiationStack, instance.component].join(' → ')}). Recursion stopped — Mirror does not support self-referential components.`,
      position: instance.position,
    })
    return this.createEmptyNode(instance)
  }
  const resolverCtx: ComponentResolverContext = {
    componentMap: this.componentMap,
    addWarning: warning => this.addWarning(warning as IRWarning),
  }
  const resolvedComponent = component ? resolveComponentExtracted(component, resolverCtx) : null

  // Determine primitive for defaults and layout context
  const primitive = resolvedComponent?.primitive || instance.component.toLowerCase()

  // Handle Zag primitives (Select, Accordion, etc.)
  // Check both direct usage (e.g., "Select") and inheritance (e.g., "MySelect as Select:")
  if (isZagPrimitive(instance.component) || isZagPrimitive(primitive)) {
    // Build a synthetic ZagNode from the instance + resolved component
    const zagNode = this.buildZagNodeFromInstance(instance, resolvedComponent, primitive)
    return this.transformZagComponent(zagNode, parentLayoutContext)
  }

  // Handle Chart primitives (Line, Bar, Pie, etc.)
  if (isChartPrimitive(instance.component) || isChartPrimitive(primitive)) {
    return this.transformChartPrimitive(instance, resolvedComponent, primitive, parentLayoutContext)
  }

  // Get primitive defaults and convert to Property format
  const primitiveDefaults = convertDefaultsToProperties(getPrimitiveDefaults(primitive))

  // Determine HTML tag
  const tag = this.getTag(instance.component, resolvedComponent)

  // Expand component references in instance properties BEFORE merging
  // This handles syntax like: Input placeholder "...", InputField
  // where InputField is a component whose properties should be applied
  const expandedInstanceProps = this.expandPropertySets(instance.properties)

  // Merge properties: Primitive Defaults < Component Defaults < Expanded Instance Properties
  let properties = mergeProperties(
    primitiveDefaults,
    mergeProperties(resolvedComponent?.properties || [], expandedInstanceProps)
  )

  // Check if any descendants have w full (recursive check)
  // If so, parent should NOT use fit-content (children need space to expand into)
  // This also checks component references (like InputField) that might bring in w full
  const hasWidthFullInDescendants = (children: any[]): boolean => {
    for (const child of children) {
      // Check direct properties for w full
      if (child.properties) {
        const hasDirectWidthFull = child.properties.some(
          (p: Property) => (p.name === 'w' || p.name === 'width') && p.values[0] === 'full'
        )
        if (hasDirectWidthFull) return true

        // Check component references used as style mixins (e.g., InputField)
        // These are properties with PascalCase names and empty values
        for (const p of child.properties) {
          if (p.values.length === 0 && p.name.length > 0) {
            const firstChar = p.name[0]
            if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
              // This is a PascalCase property - check if it's a component with w full
              const referencedComponent = this.componentMap.get(p.name)
              if (referencedComponent) {
                const hasComponentWidthFull = referencedComponent.properties.some(
                  (cp: Property) =>
                    (cp.name === 'w' || cp.name === 'width') && cp.values[0] === 'full'
                )
                if (hasComponentWidthFull) return true
              }
            }
          }
        }
      }

      // Check if child's base component has w full (e.g., MyInput as Input: w full)
      if (child.component) {
        const childComponent = this.componentMap.get(child.component)
        if (childComponent) {
          const hasComponentWidthFull = childComponent.properties.some(
            (p: Property) => (p.name === 'w' || p.name === 'width') && p.values[0] === 'full'
          )
          if (hasComponentWidthFull) return true
        }
      }

      // Recursively check children's children
      if (child.children && child.children.length > 0) {
        // Only recurse if this child doesn't have explicit width (otherwise it constrains its children)
        const childHasExplicitWidth = child.properties?.some(
          (p: Property) => (p.name === 'w' || p.name === 'width') && p.values[0] !== 'full'
        )
        if (!childHasExplicitWidth && hasWidthFullInDescendants(child.children)) {
          return true
        }
      }
    }
    return false
  }

  const childHasWidthFull = hasWidthFullInDescendants(instance.children || [])

  // Transform to styles (with intelligent layout merging)
  // Pass parent layout context for context-aware property handling (e.g., x/y in grid)
  const childrenInfo = childHasWidthFull ? { hasWidthFull: true } : undefined
  const styles = this.transformProperties(properties, primitive, parentLayoutContext, childrenInfo)

  // For root elements (no parent), convert flex-based "full" to explicit 100%
  // This is needed because "w full, h full" becomes flex styles which don't work at root level
  if (!parentId) {
    const hasExplicitWidth = properties.some(p => p.name === 'w' || p.name === 'width')
    const hasExplicitHeight = properties.some(p => p.name === 'h' || p.name === 'height')

    if (hasExplicitWidth || hasExplicitHeight) {
      // Remove flex-based styles and add explicit dimensions
      // BUT keep explicit min-width/min-height values (only remove the automatic '0' values)
      const filteredStyles = styles.filter(s => {
        if (s.property === 'flex') return false
        if (s.property === 'align-self') return false
        // Only remove min-width: 0 / min-height: 0, keep explicit values
        if (s.property === 'min-width' && s.value === '0') return false
        if (s.property === 'min-height' && s.value === '0') return false
        return true
      })
      styles.length = 0
      styles.push(...filteredStyles)

      if (hasExplicitWidth && !styles.some(s => s.property === 'width')) {
        styles.push({ property: 'width', value: '100%' })
      }
      if (hasExplicitHeight && !styles.some(s => s.property === 'height')) {
        styles.push({ property: 'height', value: '100%' })
      }
    }
  }

  // Create context for state transformation (includes custom size-state thresholds)
  const stateCtx: StateStylesContext = {
    propertyToCSS: prop => this.propertyToCSS(prop),
    customSizeStates: this.customSizeStateNames,
  }

  // Add state styles from component definition
  const stateResult: StateTransformResult = resolvedComponent?.states
    ? transformStatesExtracted(resolvedComponent.states, stateCtx)
    : { styles: [], hasSizeStates: false }

  // Add state styles from instance inline states (e.g., "Frame bg #333 hover: bg light")
  const instanceStateResult: StateTransformResult = instance.states?.length
    ? transformStatesExtracted(instance.states, stateCtx)
    : { styles: [], hasSizeStates: false }

  // Check if this node uses size-states (needs container-type: inline-size)
  const needsContainer = stateResult.hasSizeStates || instanceStateResult.hasSizeStates

  // Transform events from component definition FIRST (needed for state machine check)
  const events = resolvedComponent?.events ? transformEvents(resolvedComponent.events) : []

  // Transform events from instance inline events (e.g., "Input onkeydown enter: submit")
  const instanceEvents = instance.events?.length ? transformEvents(instance.events) : []

  // Combine all events to check for state machine functions
  const allEvents = [...events, ...instanceEvents]

  // Build state machine from states with triggers OR if there are state machine events
  const allStates = [...(resolvedComponent?.states || []), ...(instance.states || [])]
  const stateMachine = this.buildStateMachine(allStates, allEvents)

  // Extract inline states and events from instance children
  const { inlineStateStyles, inlineEvents, remainingChildren } = this.extractInlineStatesAndEvents(
    instance.children || []
  )

  // Convert childOverrides to instance children for slot filling
  const childOverrideInstances = childOverridesToInstancesExtracted(instance.childOverrides || [])

  // Generate node ID FIRST so we can pass it to children as their parentId
  const nodeId = this.generateId()

  // Determine layout context for children
  // If this element is a grid container, children get grid context for x/y/w/h
  // For flex containers, track direction so w full / h full can use appropriate strategy
  const isGridContainer = styles.some(s => s.property === 'display' && s.value === 'grid')
  const isAbsoluteContainer = styles.some(s => s.property === 'position' && s.value === 'relative')
  const isHorizontal = properties.some(p => p.name === 'hor' || p.name === 'horizontal')
  let childLayoutContext: ParentLayoutContext | undefined
  if (isGridContainer) {
    // Extract grid columns count if it's a simple repeat(N, 1fr)
    const gridColsStyle = styles.find(s => s.property === 'grid-template-columns')
    let gridColumns: number | undefined
    if (gridColsStyle) {
      const match = gridColsStyle.value.match(/repeat\((\d+),/)
      if (match) {
        gridColumns = parseInt(match[1], 10)
      }
    }
    childLayoutContext = { type: 'grid', gridColumns }
  } else if (isAbsoluteContainer) {
    childLayoutContext = { type: 'absolute' }
  } else {
    // Flex container (default) - track direction for w full / h full
    childLayoutContext = { type: 'flex', flexDirection: isHorizontal ? 'row' : 'column' }
  }

  // Push this component onto the cycle-detection stack before resolving
  // children. (Bug #21: TreeNode → TreeNode would otherwise recurse.)
  // Only track user-defined components — primitives (Frame, Text, …)
  // don't have a self-referential cycle problem; they're just HTML
  // wrappers that nest naturally.
  const trackedForCycle = component != null
  if (trackedForCycle) {
    this.componentInstantiationStack.push(instance.component)
  }

  // Transform children with slot filling (excluding inline states/events)
  // Include both regular children and childOverrides as slot fillers
  // Pass nodeId as parentId so children know their parent in the sourceMap
  const children = this.resolveChildren(
    resolvedComponent?.children || [],
    [...remainingChildren, ...childOverrideInstances],
    nodeId,
    childLayoutContext
  )

  // Pop the cycle-detection stack now that children are resolved.
  if (trackedForCycle) {
    this.componentInstantiationStack.pop()
  }

  // Merge dropdown features from component definition and instance
  // Instance values override component definition values
  const visibleWhen = instance.visibleWhen || resolvedComponent?.visibleWhen
  const initialState = instance.initialState || resolvedComponent?.initialState
  const selection = instance.selection || resolvedComponent?.selection
  const bind = instance.bind || resolvedComponent?.bind
  const route = instance.route || resolvedComponent?.route

  // If instance specifies an initialState, update the state machine's initial state
  // This allows "Btn on" to start in the "on" state instead of "default"
  if (initialState && stateMachine && stateMachine.states[initialState]) {
    stateMachine.initial = initialState
  }

  // If any state has children (Figma Variants pattern), add element's children as default state children
  // This enables proper swapping when toggling: on -> default should restore original children
  if (stateMachine && children.length > 0) {
    const anyStateHasChildren = Object.values(stateMachine.states).some(
      s => s.children && s.children.length > 0
    )
    if (
      anyStateHasChildren &&
      stateMachine.states['default'] &&
      !stateMachine.states['default'].children
    ) {
      stateMachine.states['default'].children = children
    }
  }

  // If this node has a route, add a click event with navigate action
  if (route) {
    events.push({
      name: 'click',
      actions: [{ type: 'navigate', target: route }],
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
    this.sourceMapBuilder.addNode(nodeId, instance.component, sourcePosition, {
      instanceName: instance.name || undefined,
      isDefinition: false,
      isEachTemplate,
      isConditional,
      parentId,
    })

    // Add property positions to the node mapping
    for (const propMap of propertySourceMaps) {
      this.sourceMapBuilder.addPropertyPosition(nodeId, propMap.name, propMap.position)
    }
  }

  // Apply state childOverrides to children
  // This adds state-conditional styles to matching child nodes
  if (resolvedComponent?.states) {
    applyStateChildOverridesExtracted(children, resolvedComponent.states, stateCtx)
  }

  // Auto-absolute: If parent has position: relative, all children get position: absolute
  // This also converts flex-based sizing/alignment to CSS position properties
  applyAbsolutePositioningToChildren(children, styles)

  // Grid container: Remove flex-based styles from children
  // In grid, flex: 1 1 0% has no effect - grid cells fill automatically
  applyGridContextToChildren(children, styles)

  // Determine layout type for drop strategy detection
  const layoutType = determineLayoutType(properties)

  // Extract instanceName from 'name' property if not set via 'named' keyword
  // This allows `name MenuBtn` syntax to work for state references like `MenuBtn.open:`
  const nameProp = properties.find(p => p.name === 'name')
  const instanceNameFromProp = nameProp
    ? resolveValueExtracted(nameProp.values, this.tokenSet)
    : undefined
  const resolvedInstanceName = instance.name || instanceNameFromProp || undefined

  // Extract valueBinding for two-way data binding (for input and textarea)
  // Note: Select is a Zag component and handles bind internally via zag-transformer
  // 'bind' property can be used for two-way binding without explicit 'value'
  const primitiveLower = primitive.toLowerCase()
  const isInputElement = primitiveLower === 'input' || primitiveLower === 'textarea'
  let valueBinding = isInputElement ? extractValueBinding(properties) : undefined
  // If no valueBinding from 'value' prop, but 'bind' is set, use 'bind' for two-way binding
  // This allows simplified syntax: `Input bind varName` instead of `Input value $varName, bind varName`
  if (!valueBinding && bind && isInputElement) {
    valueBinding = bind.startsWith('$') ? bind.slice(1) : bind
  }

  // Extract mask for input elements
  let mask: string | undefined
  if (primitiveLower === 'input') {
    const maskProp = properties.find(p => p.name === 'mask')
    if (maskProp && maskProp.values[0]) {
      mask = String(maskProp.values[0])
      properties = properties.filter(p => p.name !== 'mask')
    }
  }

  // Check for keyboard-nav property (enables form keyboard navigation)
  const hasKeyboardNav = properties.some(p => p.name === 'keyboard-nav' || p.name === 'keynav')

  // Check for loop-focus property (enables focus looping at start/end)
  const hasLoopFocus = properties.some(p => p.name === 'loop-focus' || p.name === 'loopfocus')

  // Check for typeahead property (enables typeahead navigation)
  const hasTypeahead = properties.some(p => p.name === 'typeahead')

  // Check for trigger-text property (updates trigger text on selection)
  const hasTriggerText = properties.some(p => p.name === 'trigger-text' || p.name === 'triggertext')

  return {
    id: nodeId,
    tag,
    primitive,
    name: instance.component,
    instanceName: resolvedInstanceName,
    properties: extractHTMLPropertiesExtracted(properties, this.tokenSet, primitive),
    styles: [...styles, ...stateResult.styles, ...instanceStateResult.styles, ...inlineStateStyles],
    events: [...events, ...instanceEvents, ...inlineEvents],
    children,
    visibleWhen,
    initialState,
    selection,
    bind,
    route,
    stateMachine,
    sourcePosition,
    propertySourceMaps,
    layoutType,
    isDefinition: instance.isDefinition ?? false,
    valueBinding,
    mask,
    keyboardNav: hasKeyboardNav || undefined,
    loopFocus: hasLoopFocus || undefined,
    typeahead: hasTypeahead || undefined,
    triggerText: hasTriggerText || undefined,
    needsContainer: needsContainer || undefined,
  }
}

export function transformEach(this: IRTransformer, each: Each): IRNode {
  const ctx: ControlFlowContext = {
    generateId: () => this.generateId(),
    transformInstance: (inst, pid, isEach, isCond) =>
      this.transformInstance(inst, pid, isEach, isCond),
    includeSourceMap: this.includeSourceMap,
    addToSourceMap: this.includeSourceMap
      ? (nodeId, name, pos, opts) => this.sourceMapBuilder.addNode(nodeId, name, pos, opts)
      : undefined,
  }
  return transformEachExtracted(each, ctx)
}

export function transformConditional(this: IRTransformer, cond: ConditionalBlock): IRNode {
  const ctx: ControlFlowContext = {
    generateId: () => this.generateId(),
    transformInstance: (inst, pid, isEach, isCond) =>
      this.transformInstance(inst, pid, isEach, isCond),
    includeSourceMap: this.includeSourceMap,
    addToSourceMap: this.includeSourceMap
      ? (nodeId, name, pos, opts) => this.sourceMapBuilder.addNode(nodeId, name, pos, opts)
      : undefined,
  }
  return transformConditionalExtracted(cond, ctx)
}

export function transformChild(
  this: IRTransformer,
  child: Instance | Text | Slot,
  parentId?: string,
  parentLayoutContext?: ParentLayoutContext
): IRNode {
  if (isSlot(child)) {
    return this.transformSlotPrimitive(child, parentId)
  }
  if (isText(child) || hasContent(child)) {
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
  // Handle ZagComponent children (e.g., Select: inside a Box)
  if (isZagComponent(child)) {
    return this.transformZagComponent(child, parentLayoutContext, parentId)
  }
  return this.transformInstance(child as Instance, parentId, false, false, parentLayoutContext)
}

/**
 * Extract inline states and events from instance children.
 * Delegates to extracted inline-extraction.ts
 */
export function extractInlineStatesAndEvents(
  this: IRTransformer,
  children: (Instance | Text)[]
): {
  inlineStateStyles: IRStyle[]
  inlineEvents: IREvent[]
  remainingChildren: (Instance | Text)[]
} {
  const ctx: InlineExtractionContext = {
    propertyToCSS: prop => this.propertyToCSS(prop),
  }
  return extractInlineStatesAndEventsExtracted(children, ctx)
}
