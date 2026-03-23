/**
 * Command Handler for Mirror Agent
 *
 * Processes LLM commands and applies them to the project.
 * Handles file-based operations like adding tokens/components to correct files.
 */

import type { LLMCommand, FileType } from './types'

// ============================================
// TYPES
// ============================================

export interface CommandHandlerConfig {
  /** Get current file name */
  getCurrentFile: () => string
  /** Get all files */
  getFiles: () => { name: string; type: FileType; code: string }[]
  /** Update file content */
  updateFile: (filename: string, content: string) => void
  /** Switch to file */
  switchToFile?: (filename: string) => void
  /** Apply code change to current file */
  applyCodeChange?: (change: { from: number; to: number; insert: string }) => void
  /** Execute property command via executor */
  executePropertyCommand?: (nodeId: string, property: string, value: string) => void
}

export interface CommandResult {
  success: boolean
  message?: string
  error?: string
  targetFile?: string
  change?: { from: number; to: number; insert: string }
}

// ============================================
// COMMAND HANDLER
// ============================================

export class AgentCommandHandler {
  private config: CommandHandlerConfig

  constructor(config: CommandHandlerConfig) {
    this.config = config
  }

  /**
   * Process a command and return result
   */
  async processCommand(command: LLMCommand): Promise<CommandResult> {
    switch (command.type) {
      case 'ADD_TOKEN':
        return this.handleAddToken(command)

      case 'ADD_COMPONENT':
        return this.handleAddComponent(command)

      case 'USE_COMPONENT':
        return this.handleUseComponent(command)

      case 'SET_PROPERTY':
        return this.handleSetProperty(command)

      case 'UPDATE_SOURCE':
        return this.handleUpdateSource(command)

      case 'REPLACE_ALL':
        return this.handleReplaceAll(command)

      default:
        console.log(`[CommandHandler] Unhandled command type: ${command.type}`)
        return { success: true, message: `Command ${command.type} logged` }
    }
  }

  // ============================================
  // TOKEN HANDLING
  // ============================================

  private handleAddToken(command: LLMCommand): CommandResult {
    const { tokenName, tokenValue } = command
    if (!tokenName || !tokenValue) {
      return { success: false, error: 'Missing token name or value' }
    }

    // Normalize token name (remove $ if present)
    const normalizedName = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName

    // Find tokens file
    const files = this.config.getFiles()
    const tokensFile = files.find(f => f.type === 'tokens') || files.find(f => f.name.includes('token'))

    const tokenLine = `$${normalizedName}: ${tokenValue}`

    if (tokensFile) {
      // Add to existing tokens file
      const newContent = this.addToFileEnd(tokensFile.code, tokenLine, 'token')
      this.config.updateFile(tokensFile.name, newContent)
      return {
        success: true,
        message: `Added token $${tokenName} to ${tokensFile.name}`,
        targetFile: tokensFile.name
      }
    } else {
      // Add to current file at top (before first component)
      const currentFile = this.config.getCurrentFile()
      const currentCode = files.find(f => f.name === currentFile)?.code || ''
      const insertPos = this.findTokenInsertPosition(currentCode)

      return {
        success: true,
        message: `Adding token $${tokenName} to current file`,
        change: { from: insertPos, to: insertPos, insert: tokenLine + '\n' }
      }
    }
  }

  // ============================================
  // COMPONENT HANDLING
  // ============================================

  private handleAddComponent(command: LLMCommand): CommandResult {
    const { componentName, componentDefinition } = command
    if (!componentName || !componentDefinition) {
      return { success: false, error: 'Missing component name or definition' }
    }

    // Find components file
    const files = this.config.getFiles()
    const componentsFile = files.find(f => f.type === 'components' || f.type === 'component') || files.find(f => f.name.includes('component'))

    if (componentsFile) {
      // Add to existing components file
      const newContent = this.addToFileEnd(componentsFile.code, componentDefinition, 'component')
      this.config.updateFile(componentsFile.name, newContent)
      return {
        success: true,
        message: `Added component ${componentName} to ${componentsFile.name}`,
        targetFile: componentsFile.name
      }
    } else {
      // Add to current file before first instance
      const currentFile = this.config.getCurrentFile()
      const currentCode = files.find(f => f.name === currentFile)?.code || ''
      const insertPos = this.findComponentInsertPosition(currentCode)

      return {
        success: true,
        message: `Adding component ${componentName} to current file`,
        change: { from: insertPos, to: insertPos, insert: '\n' + componentDefinition + '\n' }
      }
    }
  }

  // ============================================
  // COMPONENT INSTANCE HANDLING
  // ============================================

  private handleUseComponent(command: LLMCommand): CommandResult {
    const { component, parentId, properties } = command

    if (!component) {
      return { success: false, error: 'Missing component name' }
    }

    const instanceLine = properties || component

    // For now, append to current file
    // TODO: If parentId specified, insert as child
    const files = this.config.getFiles()
    const currentFile = this.config.getCurrentFile()
    const currentCode = files.find(f => f.name === currentFile)?.code || ''

    const insertPos = currentCode.length

    return {
      success: true,
      message: `Adding ${component} instance`,
      change: { from: insertPos, to: insertPos, insert: '\n' + instanceLine }
    }
  }

  // ============================================
  // PROPERTY HANDLING
  // ============================================

  private handleSetProperty(command: LLMCommand): CommandResult {
    const { nodeId, property, value } = command

    if (!nodeId || !property || value === undefined) {
      return { success: false, error: 'Missing nodeId, property, or value' }
    }

    if (this.config.executePropertyCommand) {
      this.config.executePropertyCommand(nodeId, property, String(value))
      return {
        success: true,
        message: `Set ${property} = ${value} on ${nodeId}`
      }
    }

    return { success: false, error: 'Property command executor not configured' }
  }

  // ============================================
  // SOURCE UPDATE HANDLING
  // ============================================

  private handleUpdateSource(command: LLMCommand): CommandResult {
    const { from, to, insert } = command

    if (from === undefined || to === undefined || insert === undefined) {
      return { success: false, error: 'Missing from, to, or insert' }
    }

    return {
      success: true,
      message: `Updating source (${from}-${to})`,
      change: { from, to, insert }
    }
  }

  // ============================================
  // REPLACE ALL HANDLING
  // ============================================

  private handleReplaceAll(command: LLMCommand): CommandResult {
    const { code } = command

    if (!code) {
      return { success: false, error: 'Missing code for replace all' }
    }

    // Get current file content to determine length
    const files = this.config.getFiles()
    const currentFile = this.config.getCurrentFile()
    const currentCode = files.find(f => f.name === currentFile)?.code || ''

    return {
      success: true,
      message: 'Replacing entire file content',
      change: { from: 0, to: currentCode.length, insert: code }
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Add content to end of file with proper spacing
   */
  private addToFileEnd(code: string, content: string, type: 'token' | 'component'): string {
    const lines = code.split('\n')

    // Find last line of same type
    let insertIndex = lines.length
    let needsLeadingNewline = false

    if (type === 'token') {
      // Find last token line (starts with $)
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('$')) {
          insertIndex = i + 1
          break
        }
      }
      // If no tokens found, insert at beginning
      if (insertIndex === lines.length) {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() && !lines[i].trim().startsWith('//')) {
            insertIndex = i
            break
          }
        }
      }
    } else if (type === 'component') {
      // Find last component definition (contains " as ")
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes(' as ') && lines[i].includes(':')) {
          // Find end of this component
          let j = i + 1
          while (j < lines.length && (lines[j].startsWith('  ') || lines[j].trim() === '')) {
            j++
          }
          insertIndex = j
          needsLeadingNewline = true  // Add blank line before new component
          break
        }
      }
    }

    // Insert content with proper spacing
    const toInsert = needsLeadingNewline ? '\n' + content : content
    lines.splice(insertIndex, 0, toInsert)

    return lines.join('\n')
  }

  /**
   * Find position to insert new token
   */
  private findTokenInsertPosition(code: string): number {
    const lines = code.split('\n')
    let pos = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      // Insert after comments and existing tokens
      if (line.startsWith('//') || line.startsWith('$') || line === '') {
        pos += lines[i].length + 1
        continue
      }
      // Stop at first component
      if (/^[A-Z]/.test(line)) {
        break
      }
      pos += lines[i].length + 1
    }

    return pos
  }

  /**
   * Find position to insert new component definition
   */
  private findComponentInsertPosition(code: string): number {
    const lines = code.split('\n')
    let pos = 0
    let lastDefinitionEnd = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Find component definitions (Name as Type:)
      if (line.includes(' as ') && line.includes(':')) {
        // Find end of this definition
        let j = i + 1
        while (j < lines.length && (lines[j].startsWith('  ') || lines[j].trim() === '')) {
          j++
        }
        // Calculate position after definition
        lastDefinitionEnd = 0
        for (let k = 0; k < j; k++) {
          lastDefinitionEnd += lines[k].length + 1
        }
      }
      pos += line.length + 1
    }

    // If we found definitions, insert after them
    // Otherwise insert after tokens
    return lastDefinitionEnd > 0 ? lastDefinitionEnd : this.findTokenInsertPosition(code)
  }
}

// ============================================
// FACTORY
// ============================================

export function createCommandHandler(config: CommandHandlerConfig): AgentCommandHandler {
  return new AgentCommandHandler(config)
}
