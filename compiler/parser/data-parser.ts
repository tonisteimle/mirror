/**
 * Mirror Data Parser
 *
 * Parses .data files into structured DataFile objects.
 *
 * Format:
 *   entry-name:
 *   key: value
 *   count: 42
 *   tags: [a, b, c]
 *
 *   @blockname
 *   Markdown content here.
 */

import {
  DataFile,
  DataEntry,
  DataAttribute,
  DataMarkdownBlock,
  DataParseError,
  DataValue,
  DataReference,
  DataReferenceArray,
  MethodDefinition,
  isDataReference,
  isDataReferenceArray,
} from './data-types'

// Regex patterns
const ENTRY_START = /^([\w-]+):\s*$/
const ATTRIBUTE = /^([\w-]+):\s*(.+)$/
const BLOCK_START = /^@([\w-]+)\s*$/
const ARRAY_VALUE = /^\[(.+)\]$/
const EXTERNAL_REF = /^@([\w-]+)$/
// Data reference: $collection.entry (e.g., $users.toni)
// Collection and entry must start with a letter (not a number) to distinguish from $19.99
const DATA_REFERENCE = /^\$([a-zA-Z][\w-]*)\.([\w-]+)$/
// Function definition: function namespace.name(params)
const FUNCTION_DEF = /^function\s+([\w-]+)\.([\w-]+)\s*\(([^)]*)\)\s*$/

/**
 * Parse a single .data file
 *
 * @param source - File content
 * @param filename - Filename without extension (e.g., "posts")
 * @returns Parsed DataFile
 */
export function parseDataFile(source: string, filename: string): DataFile {
  const lines = source.split('\n')
  const entries: DataEntry[] = []
  const methods: MethodDefinition[] = []
  const errors: DataParseError[] = []

  let currentEntry: DataEntry | null = null
  let currentBlock: DataMarkdownBlock | null = null
  let currentFunction: MethodDefinition | null = null
  let functionBodyLines: string[] = []
  let blockLines: string[] = []
  let inAttributeSection = true // Attributes must come before blocks
  let skipUntilNextEntry = false // Skip content after failed block start

  function flushBlock() {
    if (currentBlock && currentEntry) {
      // Remove trailing empty lines
      while (blockLines.length > 0 && blockLines[blockLines.length - 1].trim() === '') {
        blockLines.pop()
      }
      currentBlock.content = blockLines.join('\n')
      currentEntry.blocks.push(currentBlock)
    }
    currentBlock = null
    blockLines = []
  }

  function flushEntry() {
    flushBlock()
    if (currentEntry) {
      entries.push(currentEntry)
    }
    currentEntry = null
    inAttributeSection = true
  }

  function flushFunction() {
    if (currentFunction) {
      // Remove trailing empty lines from body
      while (
        functionBodyLines.length > 0 &&
        functionBodyLines[functionBodyLines.length - 1].trim() === ''
      ) {
        functionBodyLines.pop()
      }
      currentFunction.rawBody = functionBodyLines.join('\n')
      methods.push(currentFunction)
    }
    currentFunction = null
    functionBodyLines = []
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines (but collect them in blocks and functions)
    if (trimmed === '') {
      if (currentBlock) {
        blockLines.push('')
      } else if (currentFunction) {
        functionBodyLines.push('')
      }
      continue
    }

    // Skip comments
    if (trimmed.startsWith('//')) {
      continue
    }

    // Check for function definition: function namespace.name(params)
    const funcMatch = FUNCTION_DEF.exec(trimmed)
    if (funcMatch) {
      flushEntry()
      flushFunction()
      const params = funcMatch[3]
        .split(',')
        .map(p => p.trim())
        .filter(p => p)
      currentFunction = {
        namespace: funcMatch[1],
        name: funcMatch[2],
        params,
        rawBody: '',
        line: lineNum,
      }
      continue
    }

    // If we're in a function, collect body lines (indented lines)
    if (currentFunction) {
      // Function body ends when we see a non-indented line (except comments)
      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        // This is a new top-level construct, flush the function
        flushFunction()
        // Re-process this line
        i--
        continue
      }
      // Collect indented line as function body (keep indentation)
      functionBodyLines.push(line)
      continue
    }

    // Check for entry start: "name:" alone on a line
    const entryMatch = ENTRY_START.exec(trimmed)
    if (entryMatch) {
      flushEntry()
      skipUntilNextEntry = false
      currentEntry = {
        name: entryMatch[1],
        attributes: [],
        blocks: [],
        line: lineNum,
      }
      continue
    }

    // Skip content after failed block start (until next entry)
    if (skipUntilNextEntry) {
      continue
    }

    // Check for block start: "@blockname"
    const blockMatch = BLOCK_START.exec(trimmed)
    if (blockMatch) {
      if (!currentEntry) {
        errors.push({
          message: `Block "@${blockMatch[1]}" found outside of entry`,
          line: lineNum,
          hint: 'Define an entry first: "entry-name:"',
        })
        skipUntilNextEntry = true // Skip following content lines
        continue
      }

      flushBlock()
      inAttributeSection = false
      currentBlock = {
        name: blockMatch[1],
        content: '',
        line: lineNum,
      }
      continue
    }

    // If we're in a block, collect content
    // But first check if this looks like an attribute (error condition)
    if (currentBlock) {
      // Check if line looks like an attribute (starts at column 0)
      const attrInBlock = ATTRIBUTE.exec(trimmed)
      if (attrInBlock && !line.startsWith(' ') && !line.startsWith('\t')) {
        // This looks like an attribute, but we're in a block
        errors.push({
          message: `Attribute "${attrInBlock[1]}" found after block definitions`,
          line: lineNum,
          hint: 'All attributes must come before @block definitions',
        })
        continue
      }
      blockLines.push(line)
      continue
    }

    // Check for attribute: "key: value"
    const attrMatch = ATTRIBUTE.exec(trimmed)
    if (attrMatch) {
      if (!currentEntry) {
        errors.push({
          message: `Attribute "${attrMatch[1]}" found outside of entry`,
          line: lineNum,
          hint: 'Define an entry first: "entry-name:"',
        })
        continue
      }

      if (!inAttributeSection) {
        errors.push({
          message: `Attribute "${attrMatch[1]}" found after block definitions`,
          line: lineNum,
          hint: 'All attributes must come before @block definitions',
        })
        continue
      }

      const key = attrMatch[1]
      const rawValue = attrMatch[2].trim()
      const value = parseValue(rawValue)

      currentEntry.attributes.push({
        key,
        value,
        line: lineNum,
      })
      continue
    }

    // Check for simple list item: identifier without colon (e.g., "rot" in a colors list)
    const simpleItemMatch = /^[\w-]+$/.exec(trimmed)
    if (simpleItemMatch && currentEntry && inAttributeSection) {
      currentEntry.attributes.push({
        key: trimmed,
        value: trimmed, // key IS the value for simple list items
        line: lineNum,
      })
      continue
    }

    // Unknown line
    if (currentEntry) {
      errors.push({
        message: `Unexpected content: "${trimmed}"`,
        line: lineNum,
        hint: 'Expected "key: value", simple list item, or "@blockname"',
      })
    } else {
      errors.push({
        message: `Content outside of entry: "${trimmed}"`,
        line: lineNum,
        hint: 'Define an entry first: "entry-name:"',
      })
    }
  }

  // Flush final entry and function
  flushEntry()
  flushFunction()

  return {
    filename,
    entries,
    methods,
    errors,
  }
}

/**
 * Parse a single data reference like "$users.toni"
 */
function parseReference(value: string): DataReference | null {
  const match = DATA_REFERENCE.exec(value.trim())
  if (match) {
    return {
      kind: 'reference',
      collection: match[1],
      entry: match[2],
    }
  }
  return null
}

function parseReferences(raw: string): DataValue {
  const parts = raw.split(',').map(s => s.trim())
  const refs = parts.map(parseReference)
  if (refs.some(r => !r)) return raw
  const validRefs = refs as DataReference[]
  if (validRefs.length === 1) return validRefs[0]
  return { kind: 'referenceArray', references: validRefs }
}

/**
 * Parse a raw attribute value into typed DataValue
 */
function parseValue(raw: string): DataValue {
  // Check for data references: $collection.entry or $a.x, $b.y
  if (raw.includes('$') && raw.includes('.')) {
    const result = parseReferences(raw)
    if (result !== raw) {
      return result
    }
  }

  // Check for external reference: @filename
  const refMatch = EXTERNAL_REF.exec(raw)
  if (refMatch) {
    return raw // Keep as string reference, resolved later
  }

  // Check for array: [a, b, c]
  const arrayMatch = ARRAY_VALUE.exec(raw)
  if (arrayMatch) {
    return arrayMatch[1].split(',').map(s => s.trim())
  }

  // Check for boolean
  if (raw === 'true') return true
  if (raw === 'false') return false

  // Check for number
  const num = Number(raw)
  if (!isNaN(num) && raw !== '') {
    return num
  }

  // Default: string (no quotes needed)
  return raw
}

/**
 * Parse multiple .data files
 *
 * @param files - Array of {name, source} objects
 * @returns Array of parsed DataFiles
 */
export function parseDataFiles(files: Array<{ name: string; source: string }>): DataFile[] {
  return files.map(file => {
    // Extract filename without extension
    const filename = file.name.replace(/\.data$/, '')
    return parseDataFile(file.source, filename)
  })
}

/**
 * Merge multiple DataFiles into a single data object for runtime
 *
 * Structure: { filename: { entryName: { attr1, attr2, block1, block2 } } }
 */
export function mergeDataFiles(
  files: DataFile[]
): Record<string, Record<string, Record<string, DataValue | string>>> {
  const result: Record<string, Record<string, Record<string, DataValue | string>>> = {}

  for (const file of files) {
    const fileData: Record<string, Record<string, DataValue | string>> = {}

    for (const entry of file.entries) {
      const entryData: Record<string, DataValue | string> = {}

      // Add attributes
      for (const attr of entry.attributes) {
        if (attr.value !== undefined) {
          entryData[attr.key] = attr.value
        }
      }

      // Add blocks
      for (const block of entry.blocks) {
        entryData[block.name] = block.content
      }

      fileData[entry.name] = entryData
    }

    result[file.filename] = fileData
  }

  return result
}

/**
 * Serialize merged data for JavaScript output
 */
export function serializeDataForJS(
  data: Record<string, Record<string, Record<string, DataValue | string>>>
): string {
  const lines: string[] = []

  for (const [filename, entries] of Object.entries(data)) {
    lines.push(`"${filename}": {`)

    for (const [entryName, attrs] of Object.entries(entries)) {
      lines.push(`  "${entryName}": {`)

      for (const [key, value] of Object.entries(attrs)) {
        const serialized = serializeValue(value)
        lines.push(`    "${key}": ${serialized},`)
      }

      lines.push('  },')
    }

    lines.push('},')
  }

  return lines.join('\n')
}

/**
 * Serialize a reference to JavaScript code that resolves at runtime
 */
function serializeReference(ref: DataReference): string {
  // Serialize as a getter that resolves the reference at runtime
  // This allows lazy evaluation when the data is accessed
  return `{ __ref: true, collection: "${ref.collection}", entry: "${ref.entry}" }`
}

/**
 * Serialize a single value for JavaScript output
 */
function serializeValue(value: DataValue | string): string {
  // Handle references
  if (isDataReference(value)) {
    return serializeReference(value)
  }

  // Handle reference arrays
  if (isDataReferenceArray(value)) {
    const refs = value.references.map(ref => serializeReference(ref))
    return `[${refs.join(', ')}]`
  }

  if (typeof value === 'string') {
    // Escape special characters and use backticks for multi-line
    if (value.includes('\n')) {
      return '`' + value.replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`'
    }
    return JSON.stringify(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  return 'null'
}
