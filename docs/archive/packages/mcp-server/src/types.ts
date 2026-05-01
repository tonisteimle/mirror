/**
 * Mirror Studio State - sent via WebSocket
 */
export interface MirrorStudioState {
  /** Current file path */
  filePath: string | null
  /** Current file content */
  fileContent: string | null
  /** Selected element info */
  selection: SelectionInfo | null
  /** Defined tokens */
  tokens: TokenInfo[]
  /** Defined components */
  components: ComponentInfo[]
  /** Current errors */
  errors: ErrorInfo[]
}

export interface SelectionInfo {
  /** Line number (1-indexed) */
  line: number
  /** Column number */
  column: number
  /** Element type (Frame, Button, etc.) */
  elementType: string | null
  /** Element name if it's a component instance */
  elementName: string | null
  /** Text content if any */
  content: string | null
  /** Properties on this element */
  properties: Record<string, string>
  /** States defined on this element */
  states: string[]
}

export interface TokenInfo {
  /** Token name with suffix ($primary.bg) */
  name: string
  /** Token value */
  value: string
  /** Line where defined */
  line: number
}

export interface ComponentInfo {
  /** Component name */
  name: string
  /** What it extends (Button, Frame, or parent component) */
  extends: string | null
  /** Slot names if any */
  slots: string[]
  /** Line where defined */
  line: number
}

export interface ErrorInfo {
  /** Line number */
  line: number
  /** Column number */
  column: number
  /** Error message */
  message: string
  /** Severity */
  severity: 'error' | 'warning'
}

/**
 * Messages from MCP Server to Mirror Studio
 */
export type MCPToStudioMessage =
  | { type: 'request-state' }
  | { type: 'select-element'; line: number }
  | { type: 'ping' }

/**
 * Messages from Mirror Studio to MCP Server
 */
export type StudioToMCPMessage =
  | { type: 'state'; state: MirrorStudioState }
  | { type: 'state-update'; partial: Partial<MirrorStudioState> }
  | { type: 'pong' }
