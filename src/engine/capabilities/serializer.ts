/**
 * Serializer Capability
 *
 * Convert AST nodes back to Mirror DSL code.
 */

import type { ASTNode } from '../../parser/types'
import {
  exportToMirrorConfig,
  exportAllToMirrorConfig,
  type MirrorConfig,
} from '../../parser/mirror-export'
import {
  astToV2Mirror,
  astArrayToV2Mirror,
  importFromMirrorConfig,
  importAllFromMirrorConfig,
} from '../../parser/mirror-import'

/**
 * Convert AST nodes to Mirror DSL code (v2 syntax).
 */
export function toMirror(nodes: ASTNode[]): string {
  return astArrayToV2Mirror(nodes)
}

/**
 * Convert a single AST node to Mirror DSL code (v2 syntax).
 */
export function nodeToMirror(node: ASTNode, indent = 0): string {
  return astToV2Mirror(node, indent)
}

/**
 * Convert AST nodes to MirrorConfig format.
 */
export function toConfig(nodes: ASTNode[]): MirrorConfig[] {
  return exportAllToMirrorConfig(nodes)
}

/**
 * Convert a single AST node to MirrorConfig format.
 */
export function nodeToConfig(node: ASTNode): MirrorConfig {
  return exportToMirrorConfig(node)
}

/**
 * Convert MirrorConfig back to AST nodes.
 */
export function fromConfig(configs: MirrorConfig[]): ASTNode[] {
  return importAllFromMirrorConfig(configs)
}

/**
 * Convert a single MirrorConfig to AST node.
 */
export function configToNode(config: MirrorConfig): ASTNode {
  return importFromMirrorConfig(config)
}

/**
 * Convert AST nodes to JSON string.
 */
export function toJson(nodes: ASTNode[], pretty = true): string {
  const configs = toConfig(nodes)
  return JSON.stringify(configs, null, pretty ? 2 : undefined)
}

/**
 * Parse JSON string to AST nodes.
 */
export function fromJson(json: string): ASTNode[] {
  const configs: MirrorConfig[] = JSON.parse(json)
  return fromConfig(configs)
}
