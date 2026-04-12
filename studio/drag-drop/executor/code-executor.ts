/**
 * Code Executor
 *
 * Bridges the drag-drop system to the CodeModifier.
 * Translates DropResults into actual code modifications.
 *
 * Supports: before, after, inside, absolute placements.
 */

// Debug logging - disabled in production
const DEBUG = false
const debug = DEBUG
  ? (...args: unknown[]) => console.log('[CodeExecutor]', ...args)
  : () => {}

import type {
  DragSource,
  DropResult,
  ExecutionResult,
  CodeExecutor as ICodeExecutor,
} from '../types'
import type { CodeModifier, SourceMap } from '../../../compiler'
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
    debug('execute called', { source, result })

    try {
      // Use resolved source (prelude + current file) to match SourceMap positions
      const resolvedSource = this.deps.getResolvedSource()
      const preludeOffset = this.deps.getPreludeOffset()
      const sourceMap = this.deps.getSourceMap()

      debug('sourceMap size:', sourceMap?.size ?? 'null')
      debug('targetId:', result.targetId)
      debug('placement:', result.placement)
      debug('resolvedSource length:', resolvedSource.length)
      debug('preludeOffset:', preludeOffset)

      if (!sourceMap) {
        return {
          success: false,
          error: 'SourceMap not available - compile first',
        }
      }

      const modifier = this.deps.createModifier(resolvedSource, sourceMap)

      let modResult

      if (source.type === 'palette') {
        debug('Executing palette drop')
        modResult = this.executePaletteDrop(modifier, source, result)
      } else {
        debug('Executing canvas drop')
        modResult = this.executeCanvasDrop(modifier, source, result)
      }

      debug('Modifier result:', modResult)

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
      debug('Applying change, new editor content length:', newEditorContent.length)
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
        console.error('[CodeExecutor] Recompile failed:', err)
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
      // For absolute positioning, inject x/y into the template's first line
      let adjustedTemplate = template
      if (result.placement === 'absolute' && result.position) {
        const posProps = `x ${result.position.x}, y ${result.position.y}`
        // Insert position props after the first element name
        const firstLineEnd = template.indexOf('\n')
        const firstLine = firstLineEnd >= 0 ? template.substring(0, firstLineEnd) : template
        const rest = firstLineEnd >= 0 ? template.substring(firstLineEnd) : ''

        // Check if first line already has properties (contains comma or space after name)
        const hasProps = firstLine.includes(',') || /^\w+\s+\S/.test(firstLine)
        if (hasProps) {
          // Insert after existing props on first line
          adjustedTemplate = firstLine + ', ' + posProps + rest
        } else {
          // Add props after element name
          adjustedTemplate = firstLine + ' ' + posProps + rest
        }
      }

      switch (result.placement) {
        case 'before':
        case 'after':
          return modifier.addChildWithTemplateRelativeTo(
            result.targetId,
            adjustedTemplate,
            result.placement
          )

        case 'inside':
          return modifier.addChildWithTemplate(result.target.nodeId, adjustedTemplate, {
            position: result.insertionIndex ?? 'last',
          })

        case 'absolute':
          // For absolute positioning, insert inside the positioned container
          return modifier.addChildWithTemplate(result.target.nodeId, adjustedTemplate, {
            position: 'last',
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
        // For absolute positioning, move into container with x/y properties
        const positionProps = result.position
          ? `x ${result.position.x}, y ${result.position.y}`
          : undefined
        return modifier.moveNode(
          source.nodeId,
          result.target.nodeId,
          'inside',
          undefined,
          positionProps ? { properties: positionProps } : undefined
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
