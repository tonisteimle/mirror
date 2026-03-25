/**
 * Code Executor
 *
 * Bridges the drag-drop system to the CodeModifier.
 * Translates DropResults into actual code modifications.
 */

import type {
  DragSource,
  DropResult,
  ExecutionResult,
  CodeExecutor as ICodeExecutor,
} from '../types'
import type { CodeModifier } from '../../../src/studio/code-modifier'
import type { SourceMap } from '../../../src/ir/source-map'
import { zoneToDSLProperties } from '../strategies/empty-flex'

/**
 * Dependencies for CodeExecutor
 */
export interface CodeExecutorDependencies {
  /** Get current source code */
  getSource: () => string

  /** Get current source map */
  getSourceMap: () => SourceMap

  /** Apply code change to editor */
  applyChange: (newSource: string) => void

  /** Recompile after changes */
  recompile: () => Promise<void>

  /** Create CodeModifier instance */
  createModifier: (source: string, sourceMap: SourceMap) => CodeModifier
}

export class CodeExecutor implements ICodeExecutor {
  private deps: CodeExecutorDependencies

  constructor(deps: CodeExecutorDependencies) {
    this.deps = deps
  }

  /**
   * Execute a drop operation
   */
  execute(source: DragSource, result: DropResult): ExecutionResult {
    try {
      // Get current source and source map
      const currentSource = this.deps.getSource()
      const sourceMap = this.deps.getSourceMap()
      const modifier = this.deps.createModifier(currentSource, sourceMap)

      let modResult

      if (source.type === 'palette') {
        // Palette drop: add new component
        modResult = this.executePaletteDrop(modifier, source, result)
      } else {
        // Canvas drop: move existing component
        modResult = this.executeCanvasDrop(modifier, source, result)
      }

      if (!modResult.success) {
        return {
          success: false,
          error: modResult.error,
        }
      }

      // Apply the change
      this.deps.applyChange(modResult.newSource)

      // Trigger recompile (async, don't await)
      this.deps.recompile().catch(err => {
        console.error('Recompile failed:', err)
      })

      return {
        success: true,
        newSource: modResult.newSource,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  /**
   * Execute a duplicate operation (Alt+drop)
   */
  duplicate(source: DragSource, result: DropResult): ExecutionResult {
    if (source.type !== 'canvas' || !source.nodeId) {
      return {
        success: false,
        error: 'Duplicate requires canvas source with nodeId',
      }
    }

    try {
      const currentSource = this.deps.getSource()
      const sourceMap = this.deps.getSourceMap()
      const modifier = this.deps.createModifier(currentSource, sourceMap)

      let modResult

      switch (result.placement) {
        case 'before':
        case 'after':
          modResult = modifier.duplicateNode(
            source.nodeId,
            result.targetId,
            result.placement
          )
          break

        case 'inside':
          modResult = modifier.duplicateNode(
            source.nodeId,
            result.target.nodeId,
            'inside'
          )
          break

        case 'absolute':
          // For absolute placement, duplicate then set position
          modResult = modifier.duplicateNode(
            source.nodeId,
            result.target.nodeId,
            'inside'
          )

          if (modResult.success && result.position) {
            // After duplicate, we need to find the new node and set position
            // This is tricky since we don't have the new nodeId
            // For now, we'll add position properties inline
            // This is a simplification - proper implementation would need recompile + lookup
          }
          break

        default:
          return {
            success: false,
            error: `Unknown placement: ${result.placement}`,
          }
      }

      if (!modResult.success) {
        return {
          success: false,
          error: modResult.error,
        }
      }

      // Apply the change
      this.deps.applyChange(modResult.newSource)

      // Trigger recompile
      this.deps.recompile().catch(err => {
        console.error('Recompile failed:', err)
      })

      return {
        success: true,
        newSource: modResult.newSource,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  /**
   * Execute palette drop (add new component)
   */
  private executePaletteDrop(
    modifier: CodeModifier,
    source: DragSource,
    result: DropResult
  ): { success: boolean; newSource?: string; error?: string } {
    const componentName = source.componentName
    if (!componentName) {
      return { success: false, error: 'No component name' }
    }

    // Build properties string
    let properties = source.properties || ''

    // Add position properties for absolute placement
    if (result.placement === 'absolute' && result.position) {
      const posProps = `x ${Math.round(result.position.x)}, y ${Math.round(result.position.y)}`
      properties = properties ? `${properties}, ${posProps}` : posProps
    }

    // Add alignment properties for zone placement
    if (result.zone) {
      const alignProps = zoneToDSLProperties(result.zone)
      if (alignProps) {
        properties = properties ? `${properties}, ${alignProps}` : alignProps
      }
    }

    switch (result.placement) {
      case 'before':
      case 'after':
        return modifier.addChildRelativeTo(
          result.targetId,
          componentName,
          result.placement,
          {
            properties,
            textContent: source.textContent,
          }
        )

      case 'inside':
        // Check for zone-based insertion (empty flex container)
        if (result.zone) {
          const zone = result.zone
          const semanticZone = `${zone.row === 'middle' ? 'center' : zone.row}-${zone.col}` as any
          return modifier.insertWithWrapper(
            result.target.nodeId,
            componentName,
            semanticZone,
            {
              properties,
              textContent: source.textContent,
              position: result.insertionIndex,
            }
          )
        }

        return modifier.addChild(result.target.nodeId, componentName, {
          properties,
          textContent: source.textContent,
          position: result.insertionIndex ?? 'last',
        })

      case 'absolute':
        return modifier.addChild(result.target.nodeId, componentName, {
          properties,
          textContent: source.textContent,
        })

      default:
        return { success: false, error: `Unknown placement: ${result.placement}` }
    }
  }

  /**
   * Execute canvas drop (move existing component)
   */
  private executeCanvasDrop(
    modifier: CodeModifier,
    source: DragSource,
    result: DropResult
  ): { success: boolean; newSource?: string; error?: string } {
    if (!source.nodeId) {
      return { success: false, error: 'No source nodeId' }
    }

    switch (result.placement) {
      case 'before':
      case 'after':
        return modifier.moveNode(
          source.nodeId,
          result.targetId,
          result.placement
        )

      case 'inside':
        return modifier.moveNode(
          source.nodeId,
          result.target.nodeId,
          'inside',
          result.insertionIndex
        )

      case 'absolute':
        // For absolute placement, we need to:
        // 1. Move the node inside the container
        // 2. Update x/y properties

        // First, move inside
        const moveResult = modifier.moveNode(
          source.nodeId,
          result.target.nodeId,
          'inside'
        )

        if (!moveResult.success) {
          return moveResult
        }

        // Then set position
        if (result.position) {
          // Update x position
          const xResult = modifier.updateProperty(
            source.nodeId,
            'x',
            String(Math.round(result.position.x))
          )

          if (!xResult.success) {
            return xResult
          }

          // Update y position
          const yResult = modifier.updateProperty(
            source.nodeId,
            'y',
            String(Math.round(result.position.y))
          )

          return yResult
        }

        return moveResult

      default:
        return { success: false, error: `Unknown placement: ${result.placement}` }
    }
  }
}

/**
 * Create a CodeExecutor instance
 */
export function createCodeExecutor(deps: CodeExecutorDependencies): CodeExecutor {
  return new CodeExecutor(deps)
}
