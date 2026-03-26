/**
 * Code Executor - Webflow Style
 *
 * Bridges the drag-drop system to the CodeModifier.
 * Translates DropResults into actual code modifications.
 *
 * Supports: before, after, inside placements.
 * No absolute positioning.
 */

import type {
  DragSource,
  DropResult,
  ExecutionResult,
  CodeExecutor as ICodeExecutor,
} from '../types'
import type { CodeModifier } from '../../../src/studio/code-modifier'
import type { SourceMap } from '../../../src/ir/source-map'

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
      const currentSource = this.deps.getSource()
      const sourceMap = this.deps.getSourceMap()
      const modifier = this.deps.createModifier(currentSource, sourceMap)

      let modResult

      if (source.type === 'palette') {
        modResult = this.executePaletteDrop(modifier, source, result)
      } else {
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

    const properties = source.properties || ''

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
        return modifier.addChild(result.target.nodeId, componentName, {
          properties,
          textContent: source.textContent,
          position: result.insertionIndex ?? 'last',
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
