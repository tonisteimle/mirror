/**
 * @module data-parser
 * @description Data Parser - Parst Schema-Definitionen und Daten-Instanzen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst den Data-Tab mit Schema-Definitionen und Daten-Instanzen
 *
 * Der Data-Tab ermöglicht strukturierte Daten für Iteration und Binding.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Schema Definition
 *   TypeName:               ← Uppercase, endet mit :
 *     fieldName: fieldType  ← Eingerückt, field: type
 *
 * @syntax Data Instance
 *   - TypeName value1, value2, ...  ← - Prefix, Werte komma-getrennt
 *
 * @syntax Reference
 *   TypeName[index]         ← Referenz auf andere Instanz
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FIELD TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type text/string → String-Wert
 * @type number/int/integer/float → Numerischer Wert
 * @type boolean/bool → true/false
 * @type TypeName → Relation zu anderem Schema
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Schema + Instanzen
 *   Category:
 *     name: text
 *
 *   Task:
 *     title: text
 *     done: boolean
 *     category: Category
 *
 *   - Category "Arbeit"
 *   - Category "Privat"
 *
 *   - Task "Einkaufen", false, Category[0]
 *   - Task "Sport", true, Category[1]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OUTPUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @interface DataParseResult
 *   schemas: DataSchema[]    → Typ-Definitionen
 *   instances: DataInstance[] → Daten-Instanzen
 *   errors: string[]         → Parse-Fehler
 *
 * @interface DataSchema
 *   typeName: string         → z.B. "Task"
 *   fields: DataField[]      → Feld-Definitionen
 *
 * @interface DataInstance
 *   typeName: string         → z.B. "Task"
 *   _id: string              → Auto-generiert: "task-0"
 *   values: DataInstanceValue[]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseDataCode(code) → DataParseResult
 *   Parst Data-Tab Code in Schemas und Instanzen
 *
 * @function instancesToRecords(schemas, instances) → Map<string, DataRecord[]>
 *   Konvertiert zu Record-Format für Generator
 *   Collection-Namen werden pluralisiert: Task → tasks
 *
 * @function getCollectionName(typeName) → string
 *   Pluralisiert Type-Namen: Task→tasks, Category→categories
 *
 * @function hasSchemas(code) → boolean
 *   Prüft ob Code Schema-Definitionen enthält
 *
 * @function generateInstancesSyntax(schemas, count?) → string
 *   Generiert Sample-Daten-Syntax für AI
 *
 * @used-by Generator für Data-Binding und Iteration
 */

import type {
  DataSchema,
  DataField,
  DataFieldType,
  DataInstance,
  DataInstanceValue,
  DataInstanceReference,
  DataParseResult,
  DataRecord,
} from './types'

// Primitive field types
const PRIMITIVE_TYPES = ['text', 'string', 'number', 'int', 'integer', 'float', 'boolean', 'bool']

/**
 * Parse data tab code into schemas and instances.
 */
export function parseDataCode(code: string): DataParseResult {
  const schemas: DataSchema[] = []
  const instances: DataInstance[] = []
  const errors: string[] = []
  const lines = code.split('\n')

  let currentSchema: DataSchema | null = null
  const instanceCounts = new Map<string, number>() // Track instance count per type for ID generation

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    // Schema definition: TypeName:
    // Starts with uppercase, ends with colon, no indentation
    const schemaMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*):$/)
    if (schemaMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
      // Save previous schema if exists
      if (currentSchema) {
        schemas.push(currentSchema)
      }
      currentSchema = { typeName: schemaMatch[1], fields: [] }
      continue
    }

    // Field definition: indented, format: name: type
    if (currentSchema && (line.startsWith('  ') || line.startsWith('\t'))) {
      const fieldMatch = trimmed.match(/^(\w+):\s*(\w+)$/)
      if (fieldMatch) {
        const fieldName = fieldMatch[1]
        const fieldType = normalizeFieldType(fieldMatch[2])
        currentSchema.fields.push({ name: fieldName, type: fieldType })
        continue
      }
    }

    // Data instance: - TypeName value1 value2 ...
    const instanceMatch = trimmed.match(/^-\s+([A-Z][a-zA-Z0-9]*)(.*)$/)
    if (instanceMatch) {
      // Save any pending schema first
      if (currentSchema) {
        schemas.push(currentSchema)
        currentSchema = null
      }

      const typeName = instanceMatch[1]
      const valuesStr = instanceMatch[2].trim()

      // Find the schema for this type
      const schema = schemas.find(s => s.typeName === typeName)
      if (!schema) {
        errors.push(`Line ${i + 1}: Unknown type "${typeName}"`)
        continue
      }

      // Parse values
      const parsedValues = parseInstanceValues(valuesStr, schema.fields, errors, i + 1)

      // Generate ID
      const count = instanceCounts.get(typeName) || 0
      instanceCounts.set(typeName, count + 1)
      const _id = `${typeName.toLowerCase()}-${count}`

      instances.push({
        typeName,
        _id,
        values: parsedValues,
        line: i,
      })
      continue
    }
  }

  // Don't forget the last schema
  if (currentSchema) {
    schemas.push(currentSchema)
  }

  return { schemas, instances, errors }
}

/**
 * Normalize field type names.
 */
function normalizeFieldType(type: string): DataFieldType {
  const lower = type.toLowerCase()

  switch (lower) {
    case 'text':
    case 'string':
      return 'text'
    case 'number':
    case 'int':
    case 'integer':
    case 'float':
      return 'number'
    case 'boolean':
    case 'bool':
      return 'boolean'
    default:
      // Relation to another type - preserve original case
      return type
  }
}

/**
 * Parse instance values from a string.
 * Values are space-separated, strings are quoted.
 * References are TypeName[index].
 */
function parseInstanceValues(
  valuesStr: string,
  fields: DataField[],
  errors: string[],
  lineNum: number
): DataInstanceValue[] {
  const result: DataInstanceValue[] = []
  const tokens = tokenizeValues(valuesStr)

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const token = tokens[i]

    if (token === undefined) {
      // Missing value - use default
      result.push({
        fieldName: field.name,
        value: getDefaultValue(field.type),
      })
      continue
    }

    // Parse the value based on field type
    const value = parseValue(token, field.type, errors, lineNum)
    result.push({
      fieldName: field.name,
      value,
    })
  }

  return result
}

/**
 * Tokenize values string into individual tokens.
 * Handles quoted strings and comma-separated values.
 * Format: "value1", value2, "value3"
 */
function tokenizeValues(str: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''

  for (let i = 0; i < str.length; i++) {
    const char = str[i]

    if (inQuote) {
      if (char === quoteChar) {
        // End of quoted string - include quotes in token
        tokens.push(quoteChar + current + quoteChar)
        current = ''
        inQuote = false
      } else {
        current += char
      }
    } else {
      if (char === '"' || char === "'") {
        // Start of quoted string
        inQuote = true
        quoteChar = char
        current = ''
      } else if (char === ',') {
        // Comma separator - primary delimiter
        if (current.trim()) {
          tokens.push(current.trim())
        }
        current = ''
      } else if (char === ' ' || char === '\t') {
        // Space - only accumulate if we have content (trim leading spaces)
        if (current) {
          current += char
        }
      } else {
        current += char
      }
    }
  }

  // Add last token
  if (current.trim()) {
    tokens.push(current.trim())
  }

  return tokens
}

/**
 * Parse a single value token.
 */
function parseValue(
  token: string,
  fieldType: DataFieldType,
  errors: string[],
  lineNum: number
): string | number | boolean | DataInstanceReference {
  // Check for reference: TypeName[index]
  const refMatch = token.match(/^([A-Z][a-zA-Z0-9]*)\[(\d+)\]$/)
  if (refMatch) {
    return {
      type: 'reference',
      typeName: refMatch[1],
      index: parseInt(refMatch[2], 10),
    }
  }

  // Handle based on field type
  switch (fieldType) {
    case 'text':
      // Remove quotes if present
      if ((token.startsWith('"') && token.endsWith('"')) ||
          (token.startsWith("'") && token.endsWith("'"))) {
        return token.slice(1, -1)
      }
      return token

    case 'number': {
      const num = parseFloat(token)
      if (isNaN(num)) {
        errors.push(`Line ${lineNum}: Invalid number "${token}"`)
        return 0
      }
      return num
    }

    case 'boolean':
      if (token === 'true' || token === '1') return true
      if (token === 'false' || token === '0') return false
      errors.push(`Line ${lineNum}: Invalid boolean "${token}"`)
      return false

    default:
      // Relation type - should be a reference
      if (!refMatch) {
        errors.push(`Line ${lineNum}: Expected reference for relation field, got "${token}"`)
      }
      // Return as string fallback
      return token
  }
}

/**
 * Get default value for a field type.
 */
function getDefaultValue(fieldType: DataFieldType): string | number | boolean {
  switch (fieldType) {
    case 'text':
      return ''
    case 'number':
      return 0
    case 'boolean':
      return false
    default:
      // Relation - empty string as placeholder
      return ''
  }
}

/**
 * Convert parsed data to DataRecord map format for backwards compatibility.
 * Used by the generator to work with existing data binding code.
 */
export function instancesToRecords(
  schemas: DataSchema[],
  instances: DataInstance[]
): Map<string, DataRecord[]> {
  const result = new Map<string, DataRecord[]>()

  // Initialize empty arrays for each schema
  for (const schema of schemas) {
    const collectionName = getCollectionName(schema.typeName)
    result.set(collectionName, [])
  }

  // Track instances by type for reference resolution
  const instancesByType = new Map<string, DataInstance[]>()
  for (const instance of instances) {
    const list = instancesByType.get(instance.typeName) || []
    list.push(instance)
    instancesByType.set(instance.typeName, list)
  }

  // Convert instances to records
  for (const instance of instances) {
    const collectionName = getCollectionName(instance.typeName)
    const records = result.get(collectionName) || []

    const record: DataRecord = { _id: instance._id }

    for (const fieldValue of instance.values) {
      if (typeof fieldValue.value === 'object' && fieldValue.value.type === 'reference') {
        // Resolve reference to _id
        const ref = fieldValue.value as DataInstanceReference
        const refInstances = instancesByType.get(ref.typeName) || []
        const refInstance = refInstances[ref.index]
        record[fieldValue.fieldName] = refInstance?._id || ''
      } else {
        record[fieldValue.fieldName] = fieldValue.value
      }
    }

    records.push(record)
    result.set(collectionName, records)
  }

  return result
}

/**
 * Convert schema to plural collection name (for variable naming).
 * Task -> tasks, Category -> categories, Person -> people
 */
export function getCollectionName(typeName: string): string {
  const lower = typeName.toLowerCase()

  // Handle common irregular plurals
  if (lower.endsWith('y') && !lower.endsWith('ay') && !lower.endsWith('ey') && !lower.endsWith('oy') && !lower.endsWith('uy')) {
    return lower.slice(0, -1) + 'ies'
  }
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('ch') || lower.endsWith('sh')) {
    return lower + 'es'
  }
  if (lower === 'person') return 'people'
  if (lower === 'child') return 'children'

  return lower + 's'
}

/**
 * Check if the code has any schema definitions.
 */
export function hasSchemas(code: string): boolean {
  const lines = code.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue
    // Schema definition: TypeName: (no leading whitespace, like parseDataCode)
    if (!line.startsWith(' ') && !line.startsWith('\t') && /^[A-Z][a-zA-Z0-9]*:$/.test(trimmed)) {
      return true
    }
  }
  return false
}

/**
 * Generate Mirror syntax instances from schemas.
 * Used by AI generation to create sample data.
 */
export function generateInstancesSyntax(schemas: DataSchema[], count = 3): string {
  const lines: string[] = []
  const instancesByType = new Map<string, number>()

  // Generate instances for each schema
  for (const schema of schemas) {
    // Add comment for this type
    if (lines.length > 0) lines.push('')

    for (let i = 0; i < count; i++) {
      const values: string[] = []

      for (const field of schema.fields) {
        switch (field.type) {
          case 'text':
            values.push(`"${field.name} ${i + 1}"`)
            break
          case 'number':
            values.push(`${(i + 1) * 10}`)
            break
          case 'boolean':
            values.push(i % 2 === 0 ? 'true' : 'false')
            break
          default: {
            // Relation - reference first instance of that type
            const refIndex = Math.min(i, count - 1)
            values.push(`${field.type}[${refIndex}]`)
            break
          }
        }
      }

      lines.push(`- ${schema.typeName} ${values.join(', ')}`)
    }

    instancesByType.set(schema.typeName, count)
  }

  return lines.join('\n')
}
