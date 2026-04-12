/**
 * CodeModifier Ports (Hexagonal Architecture)
 *
 * Port interfaces that abstract external dependencies for testability.
 * These enable testing CodeModifier without real SourceMap instances.
 *
 * Architecture:
 * ```
 * CodeModifier (pure code transformation logic)
 *        |
 *        +-- SourceMapPort (node lookups, children, positions)
 *        +-- LineParserPort (line parsing, property manipulation)
 *        +-- TemplatePort (template indentation adjustment)
 * ```
 */

// ============================================
// Types
// ============================================

/**
 * Position in source code (1-indexed line, 1-indexed column)
 */
export interface SourcePosition {
  line: number
  column: number
}

/**
 * Position with optional end position
 */
export interface PositionRange {
  line: number
  column: number
  endLine?: number
  endColumn?: number
}

/**
 * Node mapping from SourceMap
 */
export interface NodeMapping {
  nodeId: string
  componentName: string
  position: PositionRange
}

/**
 * Parsed property from a line
 */
export interface ParsedProperty {
  name: string
  value: string
  rawName: string  // Original name as written (might be alias)
  start: number    // Start index in line
  end: number      // End index in line
}

/**
 * Parsed line structure
 */
export interface ParsedLine {
  indent: string
  elementName: string
  textContent: string | null
  properties: ParsedProperty[]
  originalLine: string
}

// ============================================
// SourceMap Port
// ============================================

/**
 * SourceMapPort abstracts SourceMap access.
 * Enables testing without real SourceMap instances.
 */
export interface SourceMapPort {
  /**
   * Get node mapping by ID
   */
  getNodeById(nodeId: string): NodeMapping | null

  /**
   * Get all children of a node
   */
  getChildren(parentId: string): NodeMapping[]

  /**
   * Check if targetId is a descendant of ancestorId
   */
  isDescendantOf(targetId: string, ancestorId: string): boolean
}

// ============================================
// Line Parser Port
// ============================================

/**
 * LineParserPort abstracts line parsing utilities.
 * Enables testing with mock implementations.
 */
export interface LineParserPort {
  /**
   * Parse a line into structured format
   */
  parseLine(line: string): ParsedLine

  /**
   * Find a property in a parsed line (alias-aware)
   */
  findProperty(parsedLine: ParsedLine, propName: string): ParsedProperty | null

  /**
   * Update a property value in a line
   */
  updateProperty(parsedLine: ParsedLine, propName: string, newValue: string): string

  /**
   * Add a property to a line
   */
  addProperty(parsedLine: ParsedLine, propName: string, value: string): string

  /**
   * Remove a property from a line
   */
  removeProperty(parsedLine: ParsedLine, propName: string): string

  /**
   * Get canonical property name (resolve aliases)
   */
  getCanonicalName(propName: string): string

  /**
   * Check if two property names refer to the same property
   */
  isSameProperty(name1: string, name2: string): boolean
}

// ============================================
// Template Port
// ============================================

/**
 * TemplatePort abstracts template utilities.
 */
export interface TemplatePort {
  /**
   * Adjust indentation of a multi-line template
   */
  adjustIndentation(template: string, targetIndent: string): string
}

// ============================================
// Document Port
// ============================================

/**
 * DocumentPort abstracts document manipulation.
 * Provides line-based access to source code.
 */
export interface DocumentPort {
  /**
   * Get the full source code
   */
  getSource(): string

  /**
   * Get all lines (readonly)
   */
  getLines(): readonly string[]

  /**
   * Get a specific line (1-indexed)
   */
  getLine(lineNumber: number): string | null

  /**
   * Get the number of lines
   */
  getLineCount(): number

  /**
   * Get character offset for a position
   */
  getCharacterOffset(line: number, column: number): number

  /**
   * Get indentation of a line
   */
  getLineIndent(line: string): string

  /**
   * Apply a change and return new source
   */
  applyChange(from: number, to: number, insert: string): string

  /**
   * Set the full source code (optional - for rollback support)
   */
  setSource?(source: string): void
}

// ============================================
// Combined Ports
// ============================================

/**
 * All ports required by CodeModifier.
 */
export interface CodeModifierPorts {
  sourceMap: SourceMapPort
  lineParser: LineParserPort
  template: TemplatePort
  document: DocumentPort
}

// ============================================
// Result Types
// ============================================

/**
 * Result of a code modification
 */
export interface CodeChange {
  from: number       // Start position (character offset)
  to: number         // End position (character offset)
  insert: string     // Text to insert
}

/**
 * Result of a code modification operation
 */
export interface ModificationResult {
  success: boolean
  newSource: string
  change: CodeChange
  error?: string
  /** True if the operation succeeded but made no changes */
  noChange?: boolean
}

/**
 * Options for property modification
 */
export interface ModifyPropertyOptions {
  /** Preserve token references (don't expand $tokens) */
  preserveTokens?: boolean
}

/**
 * Options for adding a child component
 */
export interface AddChildOptions {
  /** Position to insert: 'first', 'last', or numeric index */
  position?: 'first' | 'last' | number
  /** Properties to add to the new component */
  properties?: string
  /** Text content for the component */
  textContent?: string
}

// ============================================
// Cleanup Function Type
// ============================================

export type CleanupFn = () => void
