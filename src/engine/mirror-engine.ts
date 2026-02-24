/**
 * MirrorEngine
 *
 * UI-unabhängige Engine für den kompletten Mirror DSL Roundtrip:
 * Parse → Transform → Serialize → Validate
 *
 * Designed for:
 * - Automated testing
 * - Programmatic code manipulation
 * - LLM-based code generation
 * - Headless/server-side usage
 */

import type {
  EngineConfig,
  ParsedCode,
  GeneratedCode,
  GeneratorOptions,
  PropertyOptions,
  ChildOptions,
  TransformResult,
  FindOptions,
} from './types'
import type { ASTNode } from '../parser/types'
import type { MirrorConfig } from '../parser/mirror-export'

// Capabilities
import { parseCode, type ParserOptions } from './capabilities/parser'
import {
  setProperty as transformSetProperty,
  addChild as transformAddChild,
  removeChild as transformRemoveChild,
  findNode as transformFindNode,
  findNodes as transformFindNodes,
  cloneNodes,
} from './capabilities/transformer'
import {
  toMirror,
  toConfig,
  fromConfig,
  toJson,
  fromJson,
} from './capabilities/serializer'
import {
  generateCode,
  configureApiKey,
  isApiKeyConfigured,
} from './capabilities/generator'
import { validateCode, validateNodes } from './capabilities/validator'

export class MirrorEngine {
  private config: EngineConfig

  constructor(config?: EngineConfig) {
    this.config = config ?? {}

    // Configure API key if provided
    if (this.config.apiKey) {
      configureApiKey(this.config.apiKey)
    }
  }

  // ==========================================================================
  // Parsing
  // ==========================================================================

  /**
   * Parse Mirror DSL code into AST.
   */
  parse(code: string, options?: ParserOptions): ParsedCode {
    return parseCode(code, {
      ...options,
      skipValidation: options?.skipValidation ?? this.config.skipValidation,
    })
  }

  /**
   * Validate Mirror DSL code.
   */
  validate(code: string): { valid: boolean; errors: string[]; warnings: string[] } {
    return validateCode(code)
  }

  /**
   * Validate AST nodes.
   */
  validateNodes(nodes: ASTNode[]): { valid: boolean; errors: string[]; warnings: string[] } {
    return validateNodes(nodes)
  }

  // ==========================================================================
  // Generation (LLM)
  // ==========================================================================

  /**
   * Generate Mirror DSL code from natural language prompt.
   */
  async generate(prompt: string, options?: GeneratorOptions): Promise<GeneratedCode> {
    return generateCode(prompt, {
      ...options,
      maxAttempts: options?.maxAttempts ?? this.config.maxHealingAttempts,
      language: options?.language ?? this.config.language,
    })
  }

  /**
   * Check if LLM generation is available.
   */
  hasApiKey(): boolean {
    return isApiKeyConfigured()
  }

  /**
   * Configure API key for LLM generation.
   */
  setApiKey(key: string): void {
    this.config.apiKey = key
    configureApiKey(key)
  }

  // ==========================================================================
  // Transformation
  // ==========================================================================

  /**
   * Set properties on a component.
   */
  setProperty(nodes: ASTNode[], options: PropertyOptions): TransformResult {
    const result = transformSetProperty(nodes, options)

    if (result.modified === 0) {
      return {
        nodes: result.nodes,
        valid: false,
        errors: [`Target "${options.target}" not found`],
      }
    }

    // Validate the result
    const validation = validateNodes(result.nodes)
    const code = validation.valid ? toMirror(result.nodes) : undefined

    return {
      nodes: result.nodes,
      valid: validation.valid,
      code,
      errors: validation.errors,
    }
  }

  /**
   * Add a child to a component.
   */
  addChild(nodes: ASTNode[], options: ChildOptions): TransformResult {
    const result = transformAddChild(nodes, options)

    if (!result.added) {
      return {
        nodes: result.nodes,
        valid: false,
        errors: [`Parent "${options.parent}" not found or child not specified`],
      }
    }

    // Validate the result
    const validation = validateNodes(result.nodes)
    const code = validation.valid ? toMirror(result.nodes) : undefined

    return {
      nodes: result.nodes,
      valid: validation.valid,
      code,
      errors: validation.errors,
    }
  }

  /**
   * Remove a child from a component.
   */
  removeChild(nodes: ASTNode[], options: ChildOptions): TransformResult {
    const result = transformRemoveChild(nodes, options)

    if (!result.removed) {
      return {
        nodes: result.nodes,
        valid: false,
        errors: [`Parent "${options.parent}" not found or invalid index`],
      }
    }

    // Validate the result
    const validation = validateNodes(result.nodes)
    const code = validation.valid ? toMirror(result.nodes) : undefined

    return {
      nodes: result.nodes,
      valid: validation.valid,
      code,
      errors: validation.errors,
    }
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Convert AST nodes to Mirror DSL code.
   */
  toMirror(nodes: ASTNode[]): string {
    return toMirror(nodes)
  }

  /**
   * Convert AST nodes to MirrorConfig format.
   */
  toConfig(nodes: ASTNode[]): MirrorConfig[] {
    return toConfig(nodes)
  }

  /**
   * Convert MirrorConfig back to AST nodes.
   */
  fromConfig(configs: MirrorConfig[]): ASTNode[] {
    return fromConfig(configs)
  }

  /**
   * Convert AST nodes to JSON string.
   */
  toJson(nodes: ASTNode[], pretty = true): string {
    return toJson(nodes, pretty)
  }

  /**
   * Parse JSON string to AST nodes.
   */
  fromJson(json: string): ASTNode[] {
    return fromJson(json)
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Find a node by name, instanceName, or id.
   */
  findNode(nodes: ASTNode[], target: string): ASTNode | null
  findNode(nodes: ASTNode[], options: FindOptions): ASTNode | ASTNode[] | null
  findNode(
    nodes: ASTNode[],
    targetOrOptions: string | FindOptions
  ): ASTNode | ASTNode[] | null {
    if (typeof targetOrOptions === 'string') {
      return transformFindNode(nodes, targetOrOptions)
    }

    const opts = targetOrOptions
    const target = opts.name ?? opts.instanceName ?? opts.id

    if (!target) {
      return null
    }

    if (opts.all) {
      return transformFindNodes(nodes, target, true)
    }

    return transformFindNode(nodes, target)
  }

  /**
   * Deep clone AST nodes.
   */
  cloneNodes(nodes: ASTNode[]): ASTNode[] {
    return cloneNodes(nodes)
  }
}
