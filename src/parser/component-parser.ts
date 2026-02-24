/**
 * @module component-parser (re-export)
 * @description Re-Export Barrel für modulares Component-Parser-System
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Backward-Compatible Re-Exports aus component-parser/ Untermodulen
 *
 * Die Component-Parser-Implementierung wurde in spezialisierte Module aufgeteilt.
 * Dieses Barrel re-exportiert alle öffentlichen APIs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SUB-MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @submodule component-parser/index.ts
 *   parseComponent - Haupt-Parsing-Funktion
 *
 * @submodule component-parser/types.ts
 *   ASTNode, ComponentTemplate, DSLProperties, ConditionExpr, EventHandler
 *   NamedInstanceResult, InlinePropertyContext, TemplateExtras
 *
 * @submodule component-parser/constants.ts
 *   HTML_PRIMITIVES, GENERIC_CONTAINERS
 *
 * @submodule component-parser/named-instance-parser.ts
 *   parseNamedInstance - "named", "as", Primitive-Pattern
 *
 * @submodule component-parser/library-defaults.ts
 *   applyLibraryDefaults - Library-Komponenten States/Slots
 *
 * @submodule component-parser/children-merger.ts
 *   mergeInstanceChildren, mergeChildrenRecursive - Flat Access Merge
 *
 * @submodule component-parser/template-logic.ts
 *   handleTemplateLogic, copyTemplateExtras, saveToTemplate
 *
 * @submodule component-parser/inline-properties.ts
 *   parseInlineProperties, parseInlineEventHandler
 *   parseInlineConditional, parseInlineConditionalProperties
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @export parseComponent - Parst Component-Definition oder -Instanz
 * @export parseNamedInstance - Erkennt Named Instance Patterns
 * @export applyLibraryDefaults - Wendet Library-Defaults an
 * @export mergeInstanceChildren - Merged Instanz-Kinder mit Template
 * @export handleTemplateLogic - Registry-Verwaltung
 * @export parseInlineProperties - Inline-Properties + Events
 *
 * @types ASTNode, ComponentTemplate, DSLProperties
 * @types ConditionExpr, EventHandler, Token
 * @types NamedInstanceResult, InlinePropertyContext, TemplateExtras
 *
 * @constants HTML_PRIMITIVES, GENERIC_CONTAINERS
 *
 * @used-by parser.ts, children-parser.ts
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
