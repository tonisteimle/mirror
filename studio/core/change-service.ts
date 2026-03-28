/**
 * ChangeService - Single entry point for all code modifications
 *
 * Kapselt die gesamte Komplexität:
 * - Source-Code Zugriff (Editor + Resolved)
 * - SourceMap Lookup
 * - Prelude-Handling
 * - Modifier-Orchestrierung
 * - Editor-Update
 * - Recompile
 * - Fehlerbehandlung
 *
 * Von außen: Ein Intent rein, Erfolg/Fehler raus.
 *
 * Intern: Verwendet die Pipeline aus change-pipeline.ts
 */

import { runPipeline, defaultPipeline, type PipelineStep } from './change-pipeline'
import type { ChangeIntent, ChangeResult } from './change-types'

// Re-export types for backwards compatibility
export type {
  ChangeIntent,
  ChangeResult,
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
} from './change-types'

// ============================================================================
// CHANGE SERVICE
// ============================================================================

export class ChangeService {
  private pipeline: PipelineStep[]

  constructor(pipeline: PipelineStep[] = defaultPipeline) {
    this.pipeline = pipeline
  }

  /**
   * Apply a change intent
   *
   * This is the ONLY entry point for code modifications.
   * All complexity is handled by the Pipeline.
   */
  async apply(intent: ChangeIntent): Promise<ChangeResult> {
    const result = runPipeline(intent, this.pipeline)

    if (!result.success) {
      console.error(`[ChangeService] Pipeline failed at step "${result.failedStep}": ${result.error}`)
      return {
        success: false,
        error: result.error,
      }
    }

    return {
      success: true,
      newNodeId: result.context.modificationResult?.newNodeId,
    }
  }

  /**
   * Use a custom pipeline (for testing)
   */
  withPipeline(pipeline: PipelineStep[]): ChangeService {
    return new ChangeService(pipeline)
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const changeService = new ChangeService()

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Apply a change - convenience wrapper
 *
 * Usage:
 *   await change({ type: 'setProperty', nodeId, property: 'pad', value: '16' })
 *   await change({ type: 'incrementProperty', nodeId, property: 'pad', direction: 1 })
 *   await change({ type: 'toggleDirection', nodeId })
 */
export async function change(intent: ChangeIntent): Promise<ChangeResult> {
  return changeService.apply(intent)
}
