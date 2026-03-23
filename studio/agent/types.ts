/**
 * Mirror Agent Types
 *
 * Types for the AI-powered Mirror DSL assistant.
 */

// ============================================
// AGENT CONFIGURATION
// ============================================

/** File type classification for Mirror projects */
export type FileType = 'tokens' | 'components' | 'component' | 'layout' | 'unknown'

/** Information about a project file */
export interface FileInfo {
  name: string
  type: FileType
  code: string
}

export interface MirrorAgentConfig {
  /** API Key */
  apiKey: string

  /** Base URL for API (for OpenRouter support) */
  baseUrl?: string

  /** Model to use (default: claude-sonnet-4-20250514) */
  model?: string

  /** Maximum iterations for the agent loop */
  maxIterations?: number

  /** Get current code (current file only) */
  getCode: () => string

  /** Get current file name */
  getCurrentFile?: () => string

  /** Get all project files with their types */
  getFiles?: () => FileInfo[]

  /** Get code from all files concatenated */
  getAllCode?: () => string

  /** Get cursor position */
  getCursor?: () => { line: number; column: number }

  /** Get selection */
  getSelection?: () => { from: number; to: number; text: string } | null

  /** Available design tokens */
  tokens?: Record<string, string>

  /** Defined components */
  components?: string[]

  // Visual context (optional)

  /** Get preview element for visual analysis */
  getPreviewElement?: () => HTMLElement | null

  /** Get element by node ID */
  getElementByNodeId?: (nodeId: string) => HTMLElement | null

  /** Highlight element in preview */
  highlightElement?: (nodeId: string, color?: string) => void

  /** Clear all highlights */
  clearHighlights?: () => void
}

// ============================================
// TOOL TYPES
// ============================================

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
  default?: any
  enum?: string[]
}

export interface Tool {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
  execute: (params: any, ctx: ToolContext) => Promise<ToolResult>
}

export interface ToolContext {
  /** Get current file code */
  getCode: () => string
  /** Get current file name */
  getCurrentFile: () => string
  /** Get all project files */
  getFiles: () => FileInfo[]
  /** Get all code concatenated */
  getAllCode: () => string
  /** Get available tokens */
  getTokens: () => Record<string, string>
  /** Get defined components */
  getComponents: () => string[]
  // Visual context (optional)
  getPreviewElement?: () => HTMLElement | null
  getElementByNodeId?: (nodeId: string) => HTMLElement | null
  highlightElement?: (nodeId: string, color?: string) => void
  clearHighlights?: () => void
}

export interface ToolResult {
  success?: boolean
  error?: string
  data?: any
  commands?: LLMCommand[]
}

// ============================================
// COMMAND TYPES (for code modifications)
// ============================================

export type LLMCommandType =
  | 'SET_PROPERTY'
  | 'REMOVE_PROPERTY'
  | 'INSERT_COMPONENT'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'UPDATE_SOURCE'
  | 'REPLACE_ALL'
  | 'BATCH'
  // Smart integration commands (target correct file)
  | 'ADD_TOKEN'
  | 'ADD_COMPONENT'
  | 'USE_COMPONENT'

export interface LLMCommand {
  type: LLMCommandType
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
  commands?: LLMCommand[]
  // For ADD_TOKEN
  tokenName?: string
  tokenValue?: string
  // For ADD_COMPONENT / USE_COMPONENT
  componentName?: string
  componentDefinition?: string
  targetFile?: string
  // For REPLACE_ALL
  code?: string
}

// ============================================
// AGENT EVENTS (for streaming UI updates)
// ============================================

export type AgentEventType =
  | 'thinking'
  | 'text'
  | 'tool_start'
  | 'tool_end'
  | 'command'
  | 'error'
  | 'done'

export interface AgentEvent {
  type: AgentEventType
  content?: string
  tool?: string
  input?: any
  result?: ToolResult
  command?: LLMCommand
  error?: string
}

// ============================================
// ELEMENT INFO (for tool results)
// ============================================

export interface ElementInfo {
  type: string
  line: number
  endLine: number
  properties: Record<string, string>
  children: { type: string; line: number }[]
  code: string
  nodeId?: string
}

// ============================================
// CHAT TYPES
// ============================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  commands?: LLMCommand[]
  timestamp: Date
}

export interface ToolCall {
  id: string
  tool: string
  input: any
  result?: ToolResult
  status: 'pending' | 'running' | 'done' | 'error'
}

// ============================================
// FIXER TYPES (Multi-File Code Generation)
// ============================================

/** Context collected from the project for the Fixer */
export interface FixerContext {
  // Project files by type
  files: {
    tokens: Record<string, string>      // filename -> content (all .tok files)
    components: Record<string, string>  // filename -> content (all .com files)
    current: {
      path: string                      // current file path
      content: string                   // current file content
    }
  }

  // Cursor position in current file
  cursor: {
    line: number
    column: number
    offset: number
  }

  // Selection (if any)
  selection: {
    from: number
    to: number
    text: string
  } | null

  // AST context (semantic understanding)
  ast: {
    currentNode: {
      type: string          // 'Instance' | 'Component' | 'Property'
      name: string          // e.g. 'Card'
      line: number
    } | null
    parentNode: {
      type: string
      name: string
      line: number
    } | null
    siblings: string[]      // Names of sibling nodes
    depth: number           // Indentation depth (0 = root)
  }

  // Conversation history
  history: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
  }>

  // Current user prompt
  prompt: string
}

/** Single file change in a FixerResponse */
export interface FixerChange {
  file: string                          // 'tokens.tok', 'components.com', 'index.mir', or new file
  action: 'create' | 'insert' | 'append' | 'replace'
  position?: { line: number }           // for 'insert' action
  code: string
}

/** Response from the Fixer (multi-file changes) */
export interface FixerResponse {
  changes: FixerChange[]
  explanation?: string
}

/** Extracted token/component info for quick lookup */
export interface ProjectContext {
  tokenNames: string[]                  // ['$primary', '$surface', ...]
  tokenValues: Record<string, string>   // { '$primary': '#3b82f6', ... }
  componentNames: string[]              // ['Card', 'PrimaryButton', ...]
  componentDefinitions: Record<string, string>  // { 'Card': 'Card as Box:\n  ...' }
}
