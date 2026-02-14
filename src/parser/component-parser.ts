/**
 * Component Parser Module
 *
 * Re-exports from the refactored component-parser directory.
 * This file maintains backward compatibility with existing imports.
 *
 * The implementation has been refactored into smaller modules:
 * - component-parser/index.ts: Main parseComponent function
 * - component-parser/types.ts: Type definitions
 * - component-parser/constants.ts: Constants
 * - component-parser/named-instance-parser.ts: Named instance parsing
 * - component-parser/library-defaults.ts: Library component defaults
 * - component-parser/children-merger.ts: Children merging logic
 * - component-parser/template-logic.ts: Template handling
 * - component-parser/inline-properties.ts: Inline properties/events parsing
 */

// Re-export everything from the new module structure
export {
  // Main function
  parseComponent,
  // Types
  type NamedInstanceResult,
  type InlinePropertyContext,
  type TemplateExtras,
  type ASTNode,
  type ComponentTemplate,
  type DSLProperties,
  type ConditionExpr,
  type EventHandler,
  type Token,
  // Constants
  HTML_PRIMITIVES,
  GENERIC_CONTAINERS,
  // Named instance parsing
  parseNamedInstance,
  // Library defaults
  applyLibraryDefaults,
  // Children merging
  mergeInstanceChildren,
  mergeChildrenRecursive,
  // Template logic
  handleTemplateLogic,
  copyTemplateExtras,
  saveToTemplate,
  // Inline properties
  parseInlineProperties,
  parseInlineEventHandler,
  parseInlineConditional,
  parseInlineConditionalProperties
} from './component-parser/index'
