/**
 * MirrorEngine Types
 *
 * UI-unabhängige Interfaces für den kompletten Mirror DSL Roundtrip:
 * Parse → Transform → Serialize → Validate
 */

import type { ASTNode, ParseResult, ComponentTemplate, TokenValue } from '../parser/types'
import type { MirrorConfig } from '../parser/mirror-export'
import type { SelfHealingResult, CodeIssue } from '../lib/self-healing'

// Re-export for convenience
export type { ASTNode, ParseResult, ComponentTemplate, TokenValue, MirrorConfig }

// ============================================================================
// Engine Configuration
// ============================================================================

export interface EngineConfig {
  /** API key for LLM generation (OpenRouter) */
  apiKey?: string
  /** Default language for LLM prompts */
  language?: 'en' | 'de'
  /** Max self-healing attempts for LLM generation */
  maxHealingAttempts?: number
  /** Skip certain validation types */
  skipValidation?: Array<'property' | 'library' | 'reference' | 'event' | 'action' | 'animation' | 'type' | 'state'>
}

// ============================================================================
// Parse Results
// ============================================================================

export interface ParsedCode {
  /** Parsed AST nodes */
  nodes: ASTNode[]
  /** Component registry (definitions) */
  registry: Map<string, ComponentTemplate>
  /** Token definitions */
  tokens: Map<string, TokenValue>
  /** Whether parsing was successful */
  valid: boolean
  /** Parse errors */
  errors: string[]
  /** Original source code */
  source: string
  /** Full parse result (for advanced usage) */
  _parseResult: ParseResult
}

// ============================================================================
// Generation Results
// ============================================================================

export interface GeneratedCode {
  /** Generated Mirror DSL code */
  code: string
  /** Whether generation and validation succeeded */
  valid: boolean
  /** Parsed result (if valid) */
  parsed?: ParsedCode
  /** Number of self-healing attempts */
  healingAttempts: number
  /** Validation issues found */
  issues: CodeIssue[]
  /** Error message (if failed) */
  error?: string
}

export interface GeneratorOptions {
  /** Max self-healing attempts */
  maxAttempts?: number
  /** Language for prompts */
  language?: 'en' | 'de'
  /** Progress callback */
  onProgress?: (status: 'generating' | 'validating' | 'correcting', attempt: number) => void
}

// ============================================================================
// Transformation
// ============================================================================

export interface PropertyOptions {
  /** Target component (name or id) */
  target: string
  /** Properties to set */
  set: Record<string, unknown>
  /** Whether to apply to all matching nodes (default: first only) */
  all?: boolean
}

export interface ChildOptions {
  /** Parent component (name or id) */
  parent: string
  /** Child to add (for add operation) */
  child?: Partial<ASTNode> | ChildDefinition
  /** Index to add/remove at (default: end for add, required for remove) */
  index?: number
}

export interface ChildDefinition {
  /** Component name/type */
  name: string
  /** Text content */
  content?: string
  /** Properties */
  properties?: Record<string, unknown>
  /** Nested children */
  children?: ChildDefinition[]
}

export interface TransformResult {
  /** Transformed AST nodes */
  nodes: ASTNode[]
  /** Whether transformation succeeded */
  valid: boolean
  /** Serialized code (if valid) */
  code?: string
  /** Errors during transformation */
  errors: string[]
}

// ============================================================================
// Serialization Options
// ============================================================================

export interface SerializeOptions {
  /** Use v2 syntax (default: auto-detect from source) */
  v2?: boolean
  /** Pretty print with indentation */
  pretty?: boolean
}

// ============================================================================
// Node Search
// ============================================================================

export interface FindOptions {
  /** Search by component name */
  name?: string
  /** Search by instance name */
  instanceName?: string
  /** Search by id */
  id?: string
  /** Return all matches (default: first only) */
  all?: boolean
}
