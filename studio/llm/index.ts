/**
 * LLM Module - LLM Integration
 */

import { state, executor, SetPropertyCommand, RemovePropertyCommand, InsertComponentCommand, DeleteNodeCommand, MoveNodeCommand, UpdateSourceCommand, BatchCommand, type Command } from '../core'

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

  private createCommand(payload: LLMCommandPayload): Command | null {
    switch (payload.type) {
      case 'SET_PROPERTY':
        return new SetPropertyCommand({ nodeId: payload.nodeId!, property: payload.property!, value: String(payload.value) })
      case 'REMOVE_PROPERTY':
        return new RemovePropertyCommand({ nodeId: payload.nodeId!, property: payload.property! })
      case 'INSERT_COMPONENT':
        return new InsertComponentCommand({ parentId: payload.parentId!, component: payload.component!, position: payload.position, properties: payload.properties })
      case 'DELETE_NODE':
        return new DeleteNodeCommand({ nodeId: payload.nodeId! })
      case 'MOVE_NODE':
        return new MoveNodeCommand({ nodeId: payload.nodeId!, targetId: payload.targetId!, position: payload.placement || 'inside' })
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
