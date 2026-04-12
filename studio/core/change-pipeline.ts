/**
 * Change Pipeline - Explizite Schritte für Code-Änderungen
 *
 * Jeder Schritt ist:
 * - Explizit benannt
 * - Einzeln testbar
 * - Debugbar (Fehler zeigt welcher Step fehlschlug)
 *
 * Die Pipeline ist die EINZIGE Stelle wo diese Komplexität existiert.
 */

import { state, actions } from './state'
import { events } from './events'
import { CodeModifier, createCodeModifier } from '../../compiler/studio/code-modifier'
import type { SourceMap } from '../../compiler/ir/source-map'
import type { ChangeIntent } from './change-types'
import { calculateDistribution, detectDistributionDirection, type Rect } from '../../studio/preview/distribution'

// ============================================================================
// CONTEXT - Fließt durch die Pipeline
// ============================================================================

export interface PipelineContext {
  // Input
  intent: ChangeIntent

  // Step 1: State
  source?: string
  resolvedSource?: string
  preludeOffset?: number
  sourceMap?: SourceMap | null

  // Step 2: Modifier
  modifier?: CodeModifier

  // Step 3: Execution
  modificationResult?: {
    success: boolean
    newSource: string
    error?: string
    newNodeId?: string
  }

  // Step 4: Editor Content
  newEditorContent?: string

  // Error tracking
  error?: string
  failedStep?: string
}

// ============================================================================
// STEP INTERFACE
// ============================================================================

export interface PipelineStep {
  name: string
  execute(ctx: PipelineContext): PipelineContext | null  // null = abort
}

// ============================================================================
// PIPELINE STEPS
// ============================================================================

/**
 * Step 1: Read current state
 */
export const readStateStep: PipelineStep = {
  name: 'readState',
  execute(ctx) {
    const currentState = state.get()

    ctx.source = currentState.source
    ctx.resolvedSource = currentState.resolvedSource
    ctx.preludeOffset = currentState.preludeOffset
    ctx.sourceMap = currentState.sourceMap

    return ctx
  },
}

/**
 * Step 2: Validate SourceMap exists
 */
export const validateSourceMapStep: PipelineStep = {
  name: 'validateSourceMap',
  execute(ctx) {
    if (!ctx.sourceMap) {
      ctx.error = 'No SourceMap available'
      ctx.failedStep = 'validateSourceMap'
      return null
    }

    if (!ctx.resolvedSource) {
      ctx.error = 'No source code available'
      ctx.failedStep = 'validateSourceMap'
      return null
    }

    return ctx
  },
}

/**
 * Step 3: Validate node exists (for intents that require it)
 */
export const validateNodeStep: PipelineStep = {
  name: 'validateNode',
  execute(ctx) {
    // Skip for intents that don't have a single nodeId
    if (ctx.intent.type === 'addChild' ||
        ctx.intent.type === 'moveNode' ||
        ctx.intent.type === 'groupNodes' ||
        ctx.intent.type === 'duplicateNode' ||
        ctx.intent.type === 'distribute' ||
        ctx.intent.type === 'multiMove' ||
        ctx.intent.type === 'multiResize') {
      return ctx
    }

    const nodeId = (ctx.intent as any).nodeId
    if (!nodeId) {
      ctx.error = 'No nodeId in intent'
      ctx.failedStep = 'validateNode'
      return null
    }

    const node = ctx.sourceMap!.getNodeById(nodeId)
    if (!node) {
      ctx.error = `Node not found: ${nodeId}`
      ctx.failedStep = 'validateNode'
      return null
    }

    return ctx
  },
}

/**
 * Step 4: Create CodeModifier
 */
export const createModifierStep: PipelineStep = {
  name: 'createModifier',
  execute(ctx) {
    ctx.modifier = createCodeModifier(ctx.resolvedSource!, ctx.sourceMap!)
    return ctx
  },
}

/**
 * Step 5: Execute the intent on the modifier
 * This is where the actual code modification happens
 */
export const executeIntentStep: PipelineStep = {
  name: 'executeIntent',
  execute(ctx) {
    const result = executeIntent(ctx.modifier!, ctx.intent, ctx.sourceMap!)

    ctx.modificationResult = result

    if (!result.success) {
      ctx.error = result.error ?? 'Unknown modification error'
      ctx.failedStep = 'executeIntent'
      return null
    }

    return ctx
  },
}

/**
 * Step 6: Extract editor content (remove prelude)
 */
export const extractEditorContentStep: PipelineStep = {
  name: 'extractEditorContent',
  execute(ctx) {
    const newSource = ctx.modificationResult!.newSource
    const preludeOffset = ctx.preludeOffset ?? 0

    ctx.newEditorContent = preludeOffset > 0
      ? newSource.substring(preludeOffset)
      : newSource

    return ctx
  },
}

/**
 * Step 7: Apply to editor
 */
export const applyToEditorStep: PipelineStep = {
  name: 'applyToEditor',
  execute(ctx) {
    actions.setSource(ctx.newEditorContent!, 'command')
    return ctx
  },
}

/**
 * Step 8: Emit change event (for undo/redo tracking)
 */
export const emitChangeEventStep: PipelineStep = {
  name: 'emitChangeEvent',
  execute(ctx) {
    events.emit('change:applied', {
      intent: ctx.intent,
      oldSource: ctx.source!,
      newSource: ctx.newEditorContent!,
    })
    return ctx
  },
}

// ============================================================================
// DEFAULT PIPELINE
// ============================================================================

export const defaultPipeline: PipelineStep[] = [
  readStateStep,
  validateSourceMapStep,
  validateNodeStep,
  createModifierStep,
  executeIntentStep,
  extractEditorContentStep,
  applyToEditorStep,
  emitChangeEventStep,
]

// ============================================================================
// PIPELINE RUNNER
// ============================================================================

export interface PipelineResult {
  success: boolean
  error?: string
  failedStep?: string
  context: PipelineContext
}

/**
 * Run the pipeline with an intent
 */
export function runPipeline(
  intent: ChangeIntent,
  pipeline: PipelineStep[] = defaultPipeline
): PipelineResult {
  let ctx: PipelineContext = { intent }

  for (const step of pipeline) {
    try {
      const result = step.execute(ctx)

      if (result === null) {
        // Step aborted the pipeline
        return {
          success: false,
          error: ctx.error ?? `Pipeline aborted at: ${step.name}`,
          failedStep: ctx.failedStep ?? step.name,
          context: ctx,
        }
      }

      ctx = result
    } catch (err) {
      // Step threw an exception
      const error = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        error: `Exception in ${step.name}: ${error}`,
        failedStep: step.name,
        context: ctx,
      }
    }
  }

  return {
    success: true,
    context: ctx,
  }
}

// ============================================================================
// INTENT EXECUTOR
// ============================================================================

import type {
  SetPropertyIntent,
  IncrementPropertyIntent,
  RemovePropertyIntent,
  SetDirectionIntent,
  ToggleDirectionIntent,
  SetAlignmentIntent,
  SetSizeIntent,
  DeleteNodeIntent,
  AddChildIntent,
  MoveNodeIntent,
  GroupNodesIntent,
  UngroupIntent,
  DuplicateNodeIntent,
  UpdateTextIntent,
  DistributeIntent,
  MultiMoveIntent,
  MultiResizeIntent,
} from './change-types'
import {
  calculateBoundingBoxFromDOM,
  calculateMovedPositions,
  calculateResizedPositions,
} from '../preview/multi-selection-bounds'

const SPACING_STEPS = [0, 4, 8, 12, 16, 24, 32, 48, 64]

function getNextStep(current: number, direction: 1 | -1): number {
  const currentIndex = SPACING_STEPS.findIndex(s => s >= current)
  const idx = currentIndex === -1 ? 0 : currentIndex
  const newIndex = Math.max(0, Math.min(SPACING_STEPS.length - 1, idx + direction))
  return SPACING_STEPS[newIndex]
}

function executeIntent(
  modifier: CodeModifier,
  intent: ChangeIntent,
  sourceMap: SourceMap
): { success: boolean; newSource: string; error?: string } {
  switch (intent.type) {
    case 'setProperty': {
      const result = modifier.updateProperty(intent.nodeId, intent.property, intent.value)
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'incrementProperty': {
      const node = sourceMap.getNodeById(intent.nodeId)
      if (!node) {
        return { success: false, newSource: modifier.getSource(), error: `Node not found: ${intent.nodeId}` }
      }

      let propertyName = intent.property
      if (intent.side) {
        propertyName = `${intent.property}-${intent.side}`
      }

      // Get current value (default to 0)
      const currentValue = getPropertyValue(node, propertyName) ?? 0
      const newValue = getNextStep(currentValue, intent.direction)

      const result = modifier.updateProperty(intent.nodeId, propertyName, String(newValue))
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'removeProperty': {
      const result = modifier.removeProperty(intent.nodeId, intent.property)
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'setDirection': {
      // Remove opposite direction first
      const opposite = intent.direction === 'horizontal' ? 'ver' : 'hor'
      modifier.removeProperty(intent.nodeId, opposite)

      const prop = intent.direction === 'horizontal' ? 'hor' : 'ver'
      const result = modifier.updateProperty(intent.nodeId, prop, '')
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'toggleDirection': {
      const node = sourceMap.getNodeById(intent.nodeId)
      if (!node) {
        return { success: false, newSource: modifier.getSource(), error: `Node not found: ${intent.nodeId}` }
      }

      const isHorizontal = hasProperty(node, 'hor') || hasProperty(node, 'horizontal')
      const newDirection = isHorizontal ? 'vertical' : 'horizontal'

      // Remove old direction
      modifier.removeProperty(intent.nodeId, isHorizontal ? 'hor' : 'ver')

      const prop = newDirection === 'horizontal' ? 'hor' : 'ver'
      const result = modifier.updateProperty(intent.nodeId, prop, '')
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'setAlignment': {
      // Remove other alignment properties first
      const alignProps = ['left', 'center', 'right', 'top', 'bottom', 'spread']
      for (const prop of alignProps) {
        if (prop !== intent.alignment) {
          modifier.removeProperty(intent.nodeId, prop)
        }
      }

      const result = modifier.updateProperty(intent.nodeId, intent.alignment, '')
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'setSize': {
      const prop = intent.axis === 'height' ? 'h' : 'w'
      const result = modifier.updateProperty(intent.nodeId, prop, intent.size)
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'deleteNode': {
      const result = modifier.removeNode(intent.nodeId)
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'addChild': {
      const result = modifier.addChild(intent.parentId, intent.componentName, {
        position: intent.position ?? 'last',
        properties: intent.properties,
        textContent: intent.textContent,
      })
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'moveNode': {
      const result = modifier.moveNode(
        intent.sourceId,
        intent.targetId,
        intent.placement,
        intent.insertionIndex
      )
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'groupNodes': {
      const result = modifier.wrapNodes(intent.nodeIds, intent.wrapperName ?? 'Box')
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'ungroup': {
      const result = modifier.unwrapNode(intent.nodeId)
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'duplicateNode': {
      const result = modifier.duplicateNode(intent.sourceId, intent.targetId, intent.placement)
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'updateText': {
      const result = modifier.updateTextContent(intent.nodeId, intent.text)
      return { success: result.success, newSource: result.newSource, error: result.error }
    }

    case 'distribute': {
      // Need at least 2 nodes to distribute
      if (intent.nodeIds.length < 2) {
        return { success: false, newSource: modifier.getSource(), error: 'Need at least 2 nodes to distribute' }
      }

      // Get layout info for all nodes from the DOM
      const layoutInfo = new Map<string, Rect>()
      for (const nodeId of intent.nodeIds) {
        const element = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement
        if (element) {
          const rect = element.getBoundingClientRect()
          const parent = element.parentElement
          const parentRect = parent?.getBoundingClientRect() || { left: 0, top: 0 }
          layoutInfo.set(nodeId, {
            x: rect.left - parentRect.left,
            y: rect.top - parentRect.top,
            width: rect.width,
            height: rect.height,
          })
        }
      }

      if (layoutInfo.size < 2) {
        return { success: false, newSource: modifier.getSource(), error: 'Could not find enough elements in DOM' }
      }

      // Determine distribution direction
      let distributionType: 'horizontal' | 'vertical'
      if (intent.direction === 'auto') {
        distributionType = detectDistributionDirection(intent.nodeIds, layoutInfo) || 'horizontal'
      } else {
        distributionType = intent.direction
      }

      // Calculate new positions
      const newPositions = calculateDistribution(intent.nodeIds, distributionType, layoutInfo)

      if (newPositions.length === 0) {
        return { success: false, newSource: modifier.getSource(), error: 'Failed to calculate distribution' }
      }

      // Apply new positions to each node
      let source = modifier.getSource()
      for (const pos of newPositions) {
        const xResult = modifier.updateProperty(pos.nodeId, 'x', String(pos.x))
        if (xResult.success) {
          source = xResult.newSource
          const yResult = modifier.updateProperty(pos.nodeId, 'y', String(pos.y))
          if (yResult.success) {
            source = yResult.newSource
          }
        }
      }

      return { success: true, newSource: source }
    }

    case 'multiMove': {
      // Need at least 1 node to move
      if (intent.nodeIds.length === 0) {
        return { success: false, newSource: modifier.getSource(), error: 'No nodes to move' }
      }

      // Get bounding box from DOM
      const boundingBox = calculateBoundingBoxFromDOM(intent.nodeIds)
      if (!boundingBox) {
        return { success: false, newSource: modifier.getSource(), error: 'Could not calculate bounding box' }
      }

      // Calculate new positions
      const newPositions = calculateMovedPositions(boundingBox, intent.deltaX, intent.deltaY)

      // Apply new positions to each node
      let source = modifier.getSource()
      for (const [nodeId, pos] of newPositions) {
        const xResult = modifier.updateProperty(nodeId, 'x', String(pos.x))
        if (xResult.success) {
          source = xResult.newSource
          const yResult = modifier.updateProperty(nodeId, 'y', String(pos.y))
          if (yResult.success) {
            source = yResult.newSource
          }
        }
      }

      return { success: true, newSource: source }
    }

    case 'multiResize': {
      // Need at least 1 node to resize
      if (intent.nodeIds.length === 0) {
        return { success: false, newSource: modifier.getSource(), error: 'No nodes to resize' }
      }

      // Get bounding box from DOM
      const boundingBox = calculateBoundingBoxFromDOM(intent.nodeIds)
      if (!boundingBox) {
        return { success: false, newSource: modifier.getSource(), error: 'Could not calculate bounding box' }
      }

      // Calculate new dimensions
      const newWidth = boundingBox.width * intent.scaleX
      const newHeight = boundingBox.height * intent.scaleY

      // Calculate new positions and sizes
      const newPositions = calculateResizedPositions(
        boundingBox,
        newWidth,
        newHeight,
        intent.anchor || 'top-left'
      )

      // Apply new positions and sizes to each node
      let source = modifier.getSource()
      for (const [nodeId, pos] of newPositions) {
        // Update position
        const xResult = modifier.updateProperty(nodeId, 'x', String(pos.x))
        if (xResult.success) {
          source = xResult.newSource
        }
        const yResult = modifier.updateProperty(nodeId, 'y', String(pos.y))
        if (yResult.success) {
          source = yResult.newSource
        }
        // Update size
        const wResult = modifier.updateProperty(nodeId, 'w', String(pos.width))
        if (wResult.success) {
          source = wResult.newSource
        }
        const hResult = modifier.updateProperty(nodeId, 'h', String(pos.height))
        if (hResult.success) {
          source = hResult.newSource
        }
      }

      return { success: true, newSource: source }
    }

    default:
      return {
        success: false,
        newSource: modifier.getSource(),
        error: `Unknown intent type: ${(intent as any).type}`,
      }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getPropertyValue(node: any, property: string): number | null {
  if (node.properties && property in node.properties) {
    const val = node.properties[property]
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const num = parseInt(val, 10)
      if (!isNaN(num)) return num
    }
  }
  return null
}

function hasProperty(node: any, property: string): boolean {
  return node.properties && property in node.properties
}
