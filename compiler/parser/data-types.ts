/**
 * Mirror Data File Types
 *
 * AST types for .data files that contain structured data and markdown content.
 *
 * .data files use a line-based format:
 *   - Entry: `name:` (name + colon alone on a line)
 *   - Attribute: `key: value` (key-value pair)
 *   - Markdown Block: `@blockname` starts a markdown section
 *
 * Example:
 *   my-post:
 *   title: Hello World
 *   count: 42
 *
 *   @intro
 *   This is **markdown** content.
 */

/**
 * Parsed .data file with all entries
 */
export interface DataFile {
  /** Filename without extension (e.g., "posts" from "posts.data") */
  filename: string
  /** All entries in this file */
  entries: DataEntry[]
  /** Method definitions attached to this collection */
  methods: MethodDefinition[]
  /** Parse errors */
  errors: DataParseError[]
}

/**
 * A single entry in a .data file (e.g., "my-post:")
 */
export interface DataEntry {
  /** Entry name (e.g., "my-post") */
  name: string
  /** Key-value attributes */
  attributes: DataAttribute[]
  /** Markdown content blocks */
  blocks: DataMarkdownBlock[]
  /** Source line for error reporting */
  line: number
}

/**
 * A key-value attribute (e.g., "title: Hello World")
 */
export interface DataAttribute {
  /** Attribute key */
  key: string
  /** Attribute value - can be string, number, boolean, or array */
  value: DataValue
  /** Source line for error reporting */
  line: number
}

/**
 * A reference to another data entry (e.g., "$users.toni")
 * Used for relations between data entries.
 */
export interface DataReference {
  /** Discriminator for type checking */
  kind: 'reference'
  /** Collection name (e.g., "users" from "$users.toni") */
  collection: string
  /** Entry name (e.g., "toni" from "$users.toni") */
  entry: string
}

/**
 * An array of references (e.g., "$users.toni, $users.anna")
 */
export interface DataReferenceArray {
  /** Discriminator for type checking */
  kind: 'referenceArray'
  /** Array of references */
  references: DataReference[]
}

/**
 * Possible attribute values
 */
export type DataValue = string | number | boolean | string[] | DataReference | DataReferenceArray

/**
 * A markdown content block (e.g., "@intro" section)
 */
export interface DataMarkdownBlock {
  /** Block name (e.g., "intro" from "@intro") */
  name: string
  /** Raw markdown content */
  content: string
  /** Source line for error reporting */
  line: number
}

/**
 * Parse error in a .data file
 */
export interface DataParseError {
  /** Error message */
  message: string
  /** Line number (1-indexed) */
  line: number
  /** Optional hint for fixing */
  hint?: string
}

/**
 * A method definition attached to a collection
 *
 * Example:
 *   function projects.Gesamtaufwand(project)
 *     tasks = $tasks where project == project
 *     return tasks.sum(aufwand)
 */
export interface MethodDefinition {
  /** Collection namespace (e.g., "projects") */
  namespace: string
  /** Method name (e.g., "Gesamtaufwand") */
  name: string
  /** Parameter names (e.g., ["project"]) */
  params: string[]
  /** Raw body code as string (to be compiled to JS) */
  rawBody: string
  /** Source line for error reporting */
  line: number
}

/**
 * Type guard: Check if value is an array
 */
export function isDataArray(value: DataValue): value is string[] {
  return Array.isArray(value)
}

/**
 * Type guard: Check if value is a number
 */
export function isDataNumber(value: DataValue): value is number {
  return typeof value === 'number'
}

/**
 * Type guard: Check if value is a boolean
 */
export function isDataBoolean(value: DataValue): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Type guard: Check if value is a string
 */
export function isDataString(value: DataValue): value is string {
  return typeof value === 'string'
}

/**
 * Type guard: Check if value is a reference
 */
export function isDataReference(value: DataValue): value is DataReference {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'reference'
}

/**
 * Type guard: Check if value is a reference array
 */
export function isDataReferenceArray(value: DataValue): value is DataReferenceArray {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'referenceArray'
}
