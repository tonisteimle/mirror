/**
 * LLM Output Post-Processor
 *
 * Handles the deterministic post-processing of LLM-generated Mirror code:
 * 1. Separates component definitions from instances
 * 2. Places definitions at the appropriate location (components tab or file start)
 * 3. Applies correct indentation to instances
 */

export interface ProcessedLLMOutput {
  /** Component definitions to add (e.g., "Tabs:\n  Tab:") */
  definitions: string
  /** Instance code to insert at cursor position */
  instanceCode: string
  /** Whether the output contained definitions */
  hasDefinitions: boolean
}

export interface SeparatedOutput {
  /** Token definitions ($name: value) */
  tokenDefinitions: string
  /** Component definitions (Name:) */
  componentDefinitions: string
  /** Instance code */
  instanceCode: string
  /** Whether the output contained any definitions */
  hasDefinitions: boolean
}

/**
 * Separate component/token definitions from instances in LLM output.
 *
 * Definitions include:
 * - Token definitions: "$name: value" (single line)
 * - Component definitions: "ComponentName:" (PascalCase + colon, multi-line block)
 *
 * @param code The raw LLM output
 * @returns Separated definitions and instance code
 */
export function separateDefinitionsAndInstances(code: string): ProcessedLLMOutput {
  const lines = code.split('\n')
  const definitions: string[] = []
  const instances: string[] = []

  let inDefinition = false
  let definitionIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines - add to current section
    if (!trimmed) {
      if (inDefinition) {
        definitions.push(line)
      } else if (instances.length > 0) {
        instances.push(line)
      }
      continue
    }

    // Skip comments - add to definitions if we're at the start
    if (trimmed.startsWith('//')) {
      if (instances.length === 0) {
        definitions.push(line)
      } else {
        instances.push(line)
      }
      continue
    }

    // Get line indentation
    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0

    // Check if this is a token definition ($name: value)
    const isTokenDefinition = /^\$[\w.-]+:\s*.+$/.test(trimmed)
    if (isTokenDefinition && indent === 0) {
      definitions.push(line)
      inDefinition = false // Token defs are single-line
      continue
    }

    // Check if this is a component definition start (PascalCase + colon at root level)
    // e.g., "Tabs:", "MyButton:", "FormField:"
    const isDefinitionStart = /^[A-Z][a-zA-Z0-9]*:\s*$/.test(trimmed) ||
                              /^[A-Z][a-zA-Z0-9]*:\s+\S/.test(trimmed)

    if (isDefinitionStart && indent === 0) {
      // Start of a new definition block
      inDefinition = true
      definitionIndent = indent
      definitions.push(line)
    } else if (inDefinition) {
      // Check if we're still inside the definition (more indented)
      if (indent > definitionIndent || !trimmed) {
        definitions.push(line)
      } else {
        // Back to root level - end of definition
        inDefinition = false
        // Check if this new line is also a definition
        if (isDefinitionStart && indent === 0) {
          inDefinition = true
          definitionIndent = indent
          definitions.push(line)
        } else if (isTokenDefinition && indent === 0) {
          definitions.push(line)
        } else {
          instances.push(line)
        }
      }
    } else {
      instances.push(line)
    }
  }

  // Clean up trailing empty lines
  while (definitions.length > 0 && !definitions[definitions.length - 1].trim()) {
    definitions.pop()
  }
  while (instances.length > 0 && !instances[instances.length - 1].trim()) {
    instances.pop()
  }

  return {
    definitions: definitions.join('\n'),
    instanceCode: instances.join('\n'),
    hasDefinitions: definitions.length > 0,
  }
}

/**
 * Apply base indentation to all lines of code.
 * Preserves relative indentation within the code.
 *
 * @param code The code to indent
 * @param baseIndent The base indentation string (e.g., "            ")
 * @returns Code with base indentation applied to all non-empty lines
 */
export function applyIndentation(code: string, baseIndent: string): string {
  if (!code.trim() || !baseIndent) return code

  const lines = code.split('\n')
  return lines.map(line => {
    // Skip empty lines
    if (!line.trim()) return line
    // Add base indent, preserving any relative indent
    return baseIndent + line
  }).join('\n')
}

/**
 * Find the position to insert component definitions in the layout code.
 * Definitions should go after any existing definitions but before instances.
 *
 * @param layoutCode The current layout code
 * @returns The line index where definitions should be inserted
 */
export function findDefinitionInsertPosition(layoutCode: string): number {
  const lines = layoutCode.split('\n')
  let lastDefinitionEnd = -1
  let inDefinition = false
  let definitionIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    // Skip token definitions ($name: value)
    if (trimmed.startsWith('$')) continue

    // Skip section headers (--- Header ---)
    if (trimmed.startsWith('---') && trimmed.endsWith('---')) continue

    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0

    // Check if this is a component definition
    const isDefinition = /^[A-Z][a-zA-Z0-9]*:/.test(trimmed)

    if (isDefinition && indent === 0) {
      inDefinition = true
      definitionIndent = indent
    } else if (inDefinition) {
      if (indent > definitionIndent) {
        // Still in definition
        lastDefinitionEnd = i
      } else {
        // Definition ended
        inDefinition = false
        lastDefinitionEnd = i - 1

        // Check if new line is also a definition
        if (isDefinition && indent === 0) {
          inDefinition = true
          definitionIndent = indent
        } else {
          // Found first non-definition at root level
          break
        }
      }
    } else if (!isDefinition && indent === 0 && /^[A-Z]/.test(trimmed)) {
      // First instance at root level - insert before this
      break
    }
  }

  // Return position after last definition (or 0 if no definitions)
  return lastDefinitionEnd >= 0 ? lastDefinitionEnd + 1 : 0
}

/**
 * Find the position to insert token definitions in the layout code.
 * Tokens should always be at the very start of the file (after any comments).
 *
 * @param layoutCode The current layout code
 * @returns The line index where tokens should be inserted
 */
export function findTokenInsertPosition(layoutCode: string): number {
  const lines = layoutCode.split('\n')
  let lastTokenLine = -1

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Skip empty lines
    if (!trimmed) continue

    // Skip comments at the start
    if (trimmed.startsWith('//')) continue

    // Skip section headers (--- Header ---)
    if (trimmed.startsWith('---') && trimmed.endsWith('---')) continue

    // Token definition ($name: value)
    if (trimmed.startsWith('$')) {
      lastTokenLine = i
      continue
    }

    // First non-token, non-comment line - stop here
    break
  }

  // Return position after last token, or 0 if no tokens
  return lastTokenLine >= 0 ? lastTokenLine + 1 : 0
}

/**
 * Separate token definitions, component definitions, and instances from LLM output.
 *
 * @param code The raw LLM output
 * @returns Separated token definitions, component definitions, and instance code
 */
export function separateWithTokens(code: string): SeparatedOutput {
  const lines = code.split('\n')
  const tokenDefs: string[] = []
  const componentDefs: string[] = []
  const instances: string[] = []

  let inDefinition = false
  let definitionIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines - add to current section
    if (!trimmed) {
      if (inDefinition) {
        componentDefs.push(line)
      } else if (instances.length > 0) {
        instances.push(line)
      } else if (componentDefs.length > 0) {
        componentDefs.push(line)
      } else if (tokenDefs.length > 0) {
        tokenDefs.push(line)
      }
      continue
    }

    // Skip comments - add to appropriate section
    if (trimmed.startsWith('//')) {
      if (inDefinition) {
        componentDefs.push(line)
      } else if (instances.length === 0 && componentDefs.length === 0) {
        tokenDefs.push(line)
      } else if (instances.length === 0) {
        componentDefs.push(line)
      } else {
        instances.push(line)
      }
      continue
    }

    // Get line indentation
    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0

    // Token definition ($name: value) at root level
    const isTokenDefinition = /^\$[\w.-]+:\s*.+$/.test(trimmed)
    if (isTokenDefinition && indent === 0) {
      tokenDefs.push(line)
      inDefinition = false
      continue
    }

    // Component definition (PascalCase + colon at root level)
    const isDefinitionStart = /^[A-Z][a-zA-Z0-9]*:\s*$/.test(trimmed) ||
                              /^[A-Z][a-zA-Z0-9]*:\s+\S/.test(trimmed)

    if (isDefinitionStart && indent === 0) {
      inDefinition = true
      definitionIndent = indent
      componentDefs.push(line)
    } else if (inDefinition) {
      if (indent > definitionIndent || !trimmed) {
        componentDefs.push(line)
      } else {
        // Back to root level - end of definition
        inDefinition = false
        if (isDefinitionStart && indent === 0) {
          inDefinition = true
          definitionIndent = indent
          componentDefs.push(line)
        } else if (isTokenDefinition && indent === 0) {
          tokenDefs.push(line)
        } else {
          instances.push(line)
        }
      }
    } else {
      instances.push(line)
    }
  }

  // Clean up trailing empty lines
  while (tokenDefs.length > 0 && !tokenDefs[tokenDefs.length - 1].trim()) {
    tokenDefs.pop()
  }
  while (componentDefs.length > 0 && !componentDefs[componentDefs.length - 1].trim()) {
    componentDefs.pop()
  }
  while (instances.length > 0 && !instances[instances.length - 1].trim()) {
    instances.pop()
  }

  return {
    tokenDefinitions: tokenDefs.join('\n'),
    componentDefinitions: componentDefs.join('\n'),
    instanceCode: instances.join('\n'),
    hasDefinitions: tokenDefs.length > 0 || componentDefs.length > 0,
  }
}

/**
 * Process LLM output and prepare it for insertion into the editor.
 *
 * @param llmOutput The raw LLM output
 * @param baseIndent The indentation at the cursor position
 * @param layoutCode The current layout code (for finding definition insert position)
 * @returns Object with definitions to prepend and instance code for cursor position
 */
export function processLLMOutput(
  llmOutput: string,
  baseIndent: string,
  layoutCode: string
): {
  /** Code to insert at cursor position (indented instances) */
  cursorCode: string
  /** Code to prepend at file start (definitions) */
  prependCode: string
  /** Line index where to insert prepend code */
  prependPosition: number
  /** Token definitions to insert at file start */
  tokenCode: string
  /** Line index where to insert token definitions */
  tokenPosition: number
} {
  const { tokenDefinitions, componentDefinitions, instanceCode, hasDefinitions } = separateWithTokens(llmOutput)

  // Apply indentation to instance code
  const indentedInstances = applyIndentation(instanceCode, baseIndent)

  if (!hasDefinitions) {
    // No definitions - just return indented instance code
    return {
      cursorCode: indentedInstances || applyIndentation(llmOutput, baseIndent),
      prependCode: '',
      prependPosition: 0,
      tokenCode: '',
      tokenPosition: 0,
    }
  }

  // Find where to insert component definitions (after existing defs, before instances)
  const prependPosition = findDefinitionInsertPosition(layoutCode)

  // Find where to insert token definitions (at file start, after existing tokens)
  const tokenPosition = findTokenInsertPosition(layoutCode)

  return {
    cursorCode: indentedInstances,
    prependCode: componentDefinitions ? componentDefinitions + '\n\n' : '',
    prependPosition,
    tokenCode: tokenDefinitions ? tokenDefinitions + '\n\n' : '',
    tokenPosition,
  }
}
