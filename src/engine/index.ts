/**
 * MirrorEngine
 *
 * UI-unabhängige Engine für Mirror DSL Parsing, Transformation und Generation.
 *
 * @example
 * ```typescript
 * import { MirrorEngine } from './engine'
 *
 * const engine = new MirrorEngine()
 *
 * // Parse code
 * const parsed = engine.parse('Card padding 16 "Hello"')
 * console.log(parsed.valid) // true
 *
 * // Transform
 * const result = engine.setProperty(parsed.nodes, {
 *   target: 'Card',
 *   set: { background: '#333' }
 * })
 * console.log(result.code) // Card padding 16 background #333 "Hello"
 *
 * // Generate with LLM
 * engine.setApiKey('sk-...')
 * const generated = await engine.generate('Create a login form')
 * console.log(generated.code)
 * ```
 */

export { MirrorEngine } from './mirror-engine'

// Types
export type {
  EngineConfig,
  ParsedCode,
  GeneratedCode,
  GeneratorOptions,
  PropertyOptions,
  ChildOptions,
  ChildDefinition,
  TransformResult,
  SerializeOptions,
  FindOptions,
  ASTNode,
  ParseResult,
  ComponentTemplate,
  TokenValue,
  MirrorConfig,
} from './types'

// Capabilities (for advanced usage)
export { parseCode, isValidCode, getParseErrors } from './capabilities/parser'
export {
  setProperty,
  addChild,
  removeChild,
  findNode,
  findNodes,
  cloneNodes,
} from './capabilities/transformer'
export {
  toMirror,
  nodeToMirror,
  toConfig,
  nodeToConfig,
  fromConfig,
  configToNode,
  toJson,
  fromJson,
} from './capabilities/serializer'
export {
  generateCode,
  configureApiKey,
  isApiKeyConfigured,
} from './capabilities/generator'
export {
  validateCode,
  validateNodes,
  validateParsed,
  isValid,
} from './capabilities/validator'
