/**
 * LLM Module - LLM Integration
 *
 * Bridge between LLM-generated commands and the command executor.
 * Supports both real nodeIds and line-based selectors (line-N format).
 */

import { state, executor, SetPropertyCommand, RemovePropertyCommand, InsertComponentCommand, DeleteNodeCommand, MoveNodeCommand, UpdateSourceCommand, BatchCommand, type Command } from '../core'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('LLMBridge')

export interface LLMCommandPayload {
  type: string
  nodeId?: string
  property?: string
  value?: string | number | boolean
  parentId?: string
  component?: string
  position?: 'first' | 'last' | number
  properties?: string
  targetId?: string
  placement?: 'before' | 'after' | 'inside'
  from?: number
  to?: number
  insert?: string
  commands?: LLMCommandPayload[]
}

export interface LLMResponse {
  commands: LLMCommandPayload[]
  explanation?: string
  error?: string
}

export class LLMBridge {
  executeResponse(response: LLMResponse): { success: boolean; error?: string } {
    if (response.error) return { success: false, error: response.error }

    const commands: Command[] = []
    for (const payload of response.commands) {
      const command = this.createCommand(payload)
      if (command) commands.push(command)
    }

    if (commands.length > 1) {
      executor.execute(new BatchCommand({ commands }))
    } else if (commands.length === 1) {
      executor.execute(commands[0])
    }
    return { success: true }
  }

  executeJSON(jsonString: string): { success: boolean; error?: string } {
    try {
      const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
      const cleanJson = jsonMatch ? jsonMatch[1].trim() : jsonString.trim()
      const response = JSON.parse(cleanJson) as LLMResponse
      return this.executeResponse(response)
    } catch {
      return { success: false, error: 'Failed to parse JSON' }
    }
  }

  /**
   * Resolve a nodeId that might be in line-N format to a real nodeId.
   * Supports:
   * - "line-3" -> nodeId at line 3
   * - "node-5" -> unchanged (real nodeId)
   */
  private resolveNodeId(nodeId: string | undefined): string | null {
    if (!nodeId) return null

    // Check for line-N format
    const lineMatch = nodeId.match(/^line-(\d+)$/)
    if (lineMatch) {
      const lineNumber = parseInt(lineMatch[1], 10)
      const sourceMap = state.get().sourceMap
      if (sourceMap) {
        const node = sourceMap.getNodeAtLine(lineNumber)
        if (node) {
          return node.nodeId
        }
        log.warn(`No node found at line ${lineNumber}`)
        return null
      }
      log.warn(`No sourceMap available for line resolution`)
      return null
    }

    // Return as-is (assumed to be a real nodeId)
    return nodeId
  }

  private createCommand(payload: LLMCommandPayload): Command | null {
    // Resolve line-based nodeIds to real nodeIds
    const nodeId = this.resolveNodeId(payload.nodeId)
    const parentId = this.resolveNodeId(payload.parentId)
    const targetId = this.resolveNodeId(payload.targetId)

    switch (payload.type) {
      case 'SET_PROPERTY':
        if (!nodeId) return null
        return new SetPropertyCommand({ nodeId, property: payload.property!, value: String(payload.value) })
      case 'REMOVE_PROPERTY':
        if (!nodeId) return null
        return new RemovePropertyCommand({ nodeId, property: payload.property! })
      case 'INSERT_COMPONENT':
        if (!parentId) return null
        return new InsertComponentCommand({ parentId, component: payload.component!, position: payload.position, properties: payload.properties })
      case 'DELETE_NODE':
        if (!nodeId) return null
        return new DeleteNodeCommand({ nodeId })
      case 'MOVE_NODE':
        if (!nodeId || !targetId) return null
        return new MoveNodeCommand({ nodeId, targetId, position: payload.placement || 'inside' })
      case 'UPDATE_SOURCE':
        return new UpdateSourceCommand({ from: payload.from!, to: payload.to!, insert: payload.insert! })
      case 'BATCH':
        const cmds = (payload.commands || []).map(c => this.createCommand(c)).filter((c): c is Command => c !== null)
        return new BatchCommand({ commands: cmds })
      default:
        return null
    }
  }
}

export function getLLMBridge(): LLMBridge {
  return new LLMBridge()
}

export function getContextBuilder() {
  return {
    buildContext: () => ({
      source: state.get().source,
      selectedNodeId: state.get().selection.nodeId,
    }),
  }
}

export function getEditPrompt(userRequest: string): string {
  return `Edit request: ${userRequest}\nCurrent source:\n${state.get().source}`
}
