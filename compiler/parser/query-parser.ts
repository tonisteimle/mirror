/**
 * Mirror Query Parser
 *
 * Parses .query files into structured QueryFile objects.
 *
 * Format:
 *   QueryName:
 *     each item in $collection where condition by field desc
 *       outputField: item.property
 *       computed: item.value > 5
 */

import {
  QueryFile,
  QueryDefinition,
  QueryField,
  QueryParseError,
} from './query-types'

// Regex patterns
const QUERY_START = /^([\w-]+):\s*$/
// Support hyphenated variable names: each my-item in $my-collection
const EACH_CLAUSE = /^each\s+([\w-]+)\s+in\s+(\$?[\w.-]+)(?:\s+where\s+(.+?))?(?:\s+by\s+([\w-]+)(?:\s+(asc|desc))?)?$/
const FIELD_DEF = /^([\w-]+):\s*(.+)$/

/**
 * Parse a single .query file
 *
 * @param source - File content
 * @param filename - Filename without extension (e.g., "views")
 * @returns Parsed QueryFile
 */
export function parseQueryFile(source: string, filename: string): QueryFile {
  const lines = source.split('\n')
  const queries: QueryDefinition[] = []
  const errors: QueryParseError[] = []

  let currentQuery: QueryDefinition | null = null
  let expectingEach = false
  let collectingFields = false

  function flushQuery() {
    if (currentQuery) {
      queries.push(currentQuery)
    }
    currentQuery = null
    expectingEach = false
    collectingFields = false
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines
    if (trimmed === '') {
      continue
    }

    // Skip comments
    if (trimmed.startsWith('//')) {
      continue
    }

    // Check for query start: "QueryName:" at column 0
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      const queryMatch = QUERY_START.exec(trimmed)
      if (queryMatch) {
        flushQuery()
        currentQuery = {
          name: queryMatch[1],
          collection: '',
          itemVar: '',
          fields: [],
          line: lineNum,
        }
        expectingEach = true
        continue
      }
    }

    // If we're expecting an each clause (indented line after query name)
    if (expectingEach && currentQuery) {
      const eachMatch = EACH_CLAUSE.exec(trimmed)
      if (eachMatch) {
        currentQuery.itemVar = eachMatch[1]
        currentQuery.collection = eachMatch[2]
        if (eachMatch[3]) {
          currentQuery.filter = eachMatch[3]
        }
        if (eachMatch[4]) {
          currentQuery.orderBy = eachMatch[4]
          currentQuery.orderDesc = eachMatch[5] === 'desc'
        }
        expectingEach = false
        collectingFields = true
        continue
      } else {
        errors.push({
          message: `Expected "each item in $collection" after query "${currentQuery.name}"`,
          line: lineNum,
          hint: 'Query body must start with: each itemVar in $collection',
        })
        flushQuery()
        continue
      }
    }

    // If we're collecting field definitions
    if (collectingFields && currentQuery) {
      // Check if this is still an indented line (part of the query)
      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        // This is a new top-level construct
        flushQuery()
        // Re-process this line
        i--
        continue
      }

      const fieldMatch = FIELD_DEF.exec(trimmed)
      if (fieldMatch) {
        currentQuery.fields.push({
          name: fieldMatch[1],
          expression: fieldMatch[2],
          line: lineNum,
        })
        continue
      } else if (trimmed) {
        errors.push({
          message: `Invalid field definition: "${trimmed}"`,
          line: lineNum,
          hint: 'Expected: fieldName: expression',
        })
      }
    }

    // Unknown content outside of query
    if (!currentQuery && trimmed) {
      errors.push({
        message: `Unexpected content: "${trimmed}"`,
        line: lineNum,
        hint: 'Define a query first: "QueryName:"',
      })
    }
  }

  // Flush final query
  flushQuery()

  return {
    filename,
    queries,
    errors,
  }
}

/**
 * Parse multiple .query files
 *
 * @param files - Array of {name, source} objects
 * @returns Array of parsed QueryFiles
 */
export function parseQueryFiles(
  files: Array<{ name: string; source: string }>
): QueryFile[] {
  return files.map(file => {
    // Extract filename without extension
    const filename = file.name.replace(/\.query$/, '')
    return parseQueryFile(file.source, filename)
  })
}

/**
 * Serialize a query definition to JavaScript code
 *
 * Generates a function that computes the derived collection:
 *   __queries.TaskBoard = function() {
 *     return $get('tasks').map(task => ({
 *       title: task.title,
 *       userName: task.assignee?.name
 *     }))
 *   }
 */
export function serializeQueryToJS(query: QueryDefinition): string {
  const lines: string[] = []

  // Start function
  lines.push(`__queries.${query.name} = function() {`)

  // Get collection
  const collectionName = query.collection.startsWith('$')
    ? query.collection.slice(1)
    : query.collection
  lines.push(`  let data = $get('${collectionName}')`)
  lines.push(`  if (!Array.isArray(data)) return []`)

  // Apply filter if present
  if (query.filter) {
    const filterExpr = transformExpression(query.filter, query.itemVar)
    lines.push(`  data = data.filter(${query.itemVar} => ${filterExpr})`)
  }

  // Apply sort if present
  if (query.orderBy) {
    const direction = query.orderDesc ? -1 : 1
    lines.push(`  data = data.slice().sort((a, b) => {`)
    lines.push(`    const av = a.${query.orderBy}, bv = b.${query.orderBy}`)
    lines.push(`    return av < bv ? ${-direction} : av > bv ? ${direction} : 0`)
    lines.push(`  })`)
  }

  // Map to output fields
  lines.push(`  return data.map(${query.itemVar} => ({`)
  for (const field of query.fields) {
    const expr = transformExpression(field.expression, query.itemVar)
    lines.push(`    ${field.name}: ${expr},`)
  }
  lines.push(`  }))`)

  lines.push(`}`)

  return lines.join('\n')
}

/**
 * Transform an expression for JavaScript output
 *
 * - Adds optional chaining for nested property access
 * - Handles $collection references
 */
function transformExpression(expr: string, itemVar: string): string {
  let result = expr

  // Replace $collection with $get('collection')
  result = result.replace(/\$([a-zA-Z][\w-]*)/g, (_, name) => {
    return `$get('${name}')`
  })

  // Add optional chaining for nested property access on itemVar
  // e.g., task.assignee.name → task.assignee?.name
  const nestedPattern = new RegExp(`${itemVar}\\.(\\w+)\\.(\\w+)`, 'g')
  result = result.replace(nestedPattern, `${itemVar}.$1?.$2`)

  return result
}

/**
 * Serialize all queries from multiple files
 */
export function serializeQueriesForJS(queryFiles: QueryFile[]): string {
  const allQueries = queryFiles.flatMap(qf => qf.queries)
  if (allQueries.length === 0) return ''

  const lines: string[] = []
  lines.push('// Computed queries from .query files')
  lines.push('const __queries = {}')

  for (const query of allQueries) {
    lines.push(serializeQueryToJS(query))
  }

  lines.push('')

  return lines.join('\n')
}
