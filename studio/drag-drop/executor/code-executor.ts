/**
 * Code Executor
 *
 * Bridges the drag-drop system to the CodeModifier.
 * Translates DropResults into actual code modifications.
 *
 * Supports: before, after, inside, absolute placements.
 */

import type {
  DragSource,
  DropResult,
  ExecutionResult,
  CodeExecutor as ICodeExecutor,
} from '../types'
import type { CodeModifier } from '../../../compiler/studio/code-modifier'
import type { SourceMap } from '../../../compiler/ir/source-map'
import { getComponentTemplate, getFileType, addComponentToComFile } from '../../panels/components'

/**
 * Dependencies for CodeExecutor
 */
export interface CodeExecutorDependencies {
  /** Get current source code (editor only, without prelude) */
  getSource: () => string

  /** Get resolved source (prelude + current file) - matches SourceMap positions */
  getResolvedSource: () => string

  /** Get prelude character offset (to extract editor content after modification) */
  getPreludeOffset: () => number

  /** Get current source map (may be null before first compile) */
  getSourceMap: () => SourceMap | null

  /** Apply code change to editor */
  applyChange: (newSource: string) => void

  /** Recompile after changes */
  recompile: () => Promise<void>

  /** Create CodeModifier instance */
  createModifier: (source: string, sourceMap: SourceMap) => CodeModifier

  /** Get current filename for template selection (optional) */
  getCurrentFile?: () => string
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
    console.log('[CodeExecutor] execute called', { source, result })

    try {
      // Use resolved source (prelude + current file) to match SourceMap positions
      const resolvedSource = this.deps.getResolvedSource()
      const preludeOffset = this.deps.getPreludeOffset()
      const sourceMap = this.deps.getSourceMap()

      console.log('[CodeExecutor] sourceMap size:', sourceMap?.size ?? 'null')
      console.log('[CodeExecutor] targetId:', result.targetId)
      console.log('[CodeExecutor] placement:', result.placement)
      console.log('[CodeExecutor] resolvedSource length:', resolvedSource.length)
      console.log('[CodeExecutor] preludeOffset:', preludeOffset)

      if (!sourceMap) {
        return {
          success: false,
          error: 'SourceMap not available - compile first',
        }
      }

      const modifier = this.deps.createModifier(resolvedSource, sourceMap)

      let modResult

      if (source.type === 'palette') {
        console.log('[CodeExecutor] Executing palette drop')
        modResult = this.executePaletteDrop(modifier, source, result)
      } else {
        console.log('[CodeExecutor] Executing canvas drop')
        modResult = this.executeCanvasDrop(modifier, source, result)
      }

      console.log('[CodeExecutor] Modifier result:', modResult)

      if (!modResult.success) {
        return {
          success: false,
          error: modResult.error,
        }
      }

      // Extract editor content (after prelude) from modified source
      const newSource = modResult.newSource ?? ''
      const newEditorContent = preludeOffset > 0
        ? newSource.substring(preludeOffset)
        : newSource

      // Apply the change (editor content only)
      console.log('[CodeExecutor] Applying change, new editor content length:', newEditorContent.length)
      this.deps.applyChange(newEditorContent)

      // Trigger recompile (async, don't await)
      this.deps.recompile().catch(err => {
        console.error('[CodeExecutor] Recompile failed:', err)
      })

      return {
        success: true,
        newSource: newEditorContent,
      }
    } catch (err) {
      console.error('[CodeExecutor] Exception:', err)
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
      // Use resolved source (prelude + current file) to match SourceMap positions
      const resolvedSource = this.deps.getResolvedSource()
      const preludeOffset = this.deps.getPreludeOffset()
      const sourceMap = this.deps.getSourceMap()

      if (!sourceMap) {
        return {
          success: false,
          error: 'SourceMap not available - compile first',
        }
      }

      const modifier = this.deps.createModifier(resolvedSource, sourceMap)

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

      // Extract editor content (after prelude) from modified source
      const newEditorContent = preludeOffset > 0
        ? modResult.newSource.substring(preludeOffset)
        : modResult.newSource

      // Apply the change (editor content only)
      this.deps.applyChange(newEditorContent)

      // Trigger recompile
      this.deps.recompile().catch(err => {
        console.error('Recompile failed:', err)
      })

      return {
        success: true,
        newSource: newEditorContent,
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

    // Try to get template based on file type
    let template: string | undefined
    if (source.componentId && this.deps.getCurrentFile) {
      const filename = this.deps.getCurrentFile()
      const fileType = getFileType(filename)
      template = getComponentTemplate(source.componentId, fileType)

      // Auto-add to .com file when dropping on .mir file
      if (fileType === 'mir') {
        addComponentToComFile(source.componentId).catch(err => {
          console.warn('[CodeExecutor] Auto-add to .com failed:', err)
        })
      }
    }

    // Use template-based insertion if template exists
    if (template) {
      switch (result.placement) {
        case 'before':
        case 'after':
          return modifier.addChildWithTemplateRelativeTo(
            result.targetId,
            template,
            result.placement
          )

        case 'inside':
          return modifier.addChildWithTemplate(result.target.nodeId, template, {
            position: result.insertionIndex ?? 'last',
          })

        default:
          return { success: false, error: `Unknown placement: ${result.placement}` }
      }
    }

    // Fallback to property-based insertion
    let properties = source.properties || ''

    // For absolute positioning, add x/y properties
    if (result.placement === 'absolute' && result.position) {
      const posProps = `x ${result.position.x}, y ${result.position.y}`
      properties = properties ? `${properties}, ${posProps}` : posProps
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
        return modifier.addChild(result.target.nodeId, componentName, {
          properties,
          textContent: source.textContent,
          position: result.insertionIndex ?? 'last',
        })

      case 'absolute':
        // For absolute positioning, insert inside the positioned container
        return modifier.addChild(result.target.nodeId, componentName, {
          properties,
          textContent: source.textContent,
          position: 'last',
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
        // For absolute positioning, move into container
        // Note: Setting x/y properties after move is not supported yet because
        // the SourceMap becomes stale after moveNode(). The element will be
        // moved into the container, but x/y must be set via property panel.
        // TODO: Recompile after move to get updated SourceMap, then set x/y
        return modifier.moveNode(
          source.nodeId,
          result.target.nodeId,
          'inside'
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
