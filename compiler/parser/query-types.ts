/**
 * Mirror Query File Types
 *
 * AST types for .query files that define derived/computed collections.
 *
 * .query files use a declarative format:
 *   QueryName:
 *     each item in $collection
 *       field: item.property
 *       computed: item.value > 5
 *
 * Example:
 *   TaskBoard:
 *     each task in $tasks
 *       title: task.title
 *       userName: task.assignee.name
 *       isUrgent: task.priority > 5
 */

/**
 * Parsed .query file with all query definitions
 */
export interface QueryFile {
  /** Filename without extension (e.g., "views" from "views.query") */
  filename: string
  /** All query definitions in this file */
  queries: QueryDefinition[]
  /** Parse errors */
  errors: QueryParseError[]
}

/**
 * A single query definition
 */
export interface QueryDefinition {
  /** Query name (e.g., "TaskBoard") */
  name: string
  /** Source collection (e.g., "$tasks") */
  collection: string
  /** Iterator variable name (e.g., "task") */
  itemVar: string
  /** Optional filter condition */
  filter?: string
  /** Optional sort field */
  orderBy?: string
  /** Sort direction */
  orderDesc?: boolean
  /** Output field mappings */
  fields: QueryField[]
  /** Source line for error reporting */
  line: number
}

/**
 * A field mapping in a query
 */
export interface QueryField {
  /** Output field name */
  name: string
  /** Expression to compute the value */
  expression: string
  /** Source line for error reporting */
  line: number
}

/**
 * Parse error in a .query file
 */
export interface QueryParseError {
  /** Error message */
  message: string
  /** Line number (1-indexed) */
  line: number
  /** Optional hint for fixing */
  hint?: string
}
