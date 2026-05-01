/**
 * Component Extract Operations — extractToComponentFile + helpers.
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment.
 */

import type {
  CodeModifier,
  ExtractToComponentResult,
  FilesAccess,
  CodeChange,
} from './code-modifier'
import { parseLine } from './line-property-parser'

/**
 * Extract an instance with inline properties to a component definition in components.mirror
 *
 * Takes a node that has inline properties and:
 * 1. Creates a component definition in components.mirror
 * 2. Adds "import components" to the current file if needed
 * 3. Simplifies the original line to just the instance (with text content if any)
 */
export function extractToComponentFile(
  this: CodeModifier,
  nodeId: string,
  filesAccess: FilesAccess,
  options: { componentFileName?: string } = {}
): ExtractToComponentResult {
  const componentFileName = options.componentFileName ?? 'components.mirror'

  // Get the node mapping
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) {
    return this.extractErrorResult(`Node not found: ${nodeId}`)
  }

  // Get the node's line
  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) {
    return this.extractErrorResult(`Line not found: ${nodeLine}`)
  }

  // Parse the line
  const parsedLine = parseLine(line)

  // Check if there are properties to extract
  if (parsedLine.properties.length === 0) {
    return this.extractErrorResult('No properties to extract')
  }

  // Get component name from the parsed line
  const componentMatch = parsedLine.componentPart.match(/^([A-Z][a-zA-Z0-9]*)/)
  if (!componentMatch) {
    return this.extractErrorResult('Could not determine component name')
  }
  const componentName = componentMatch[1]

  // Check for "named X" pattern to preserve it
  const namedMatch = line.match(/\bnamed\s+([A-Za-z][A-Za-z0-9]*)/i)
  const namedPart = namedMatch ? ` named ${namedMatch[1]}` : ''

  // Build the component definition line
  // Format: ComponentName: prop1 val, prop2 val
  const propsString = parsedLine.properties
    .map(p => (p.isBoolean ? p.name : `${p.name} ${p.value}`))
    .join(', ')
  const definitionLine = `${componentName}: ${propsString}`

  // Build the simplified instance line (just component name + optional named + optional text)
  let instanceLine = parsedLine.indent + componentName + namedPart
  if (parsedLine.textContent) {
    instanceLine += ` ${parsedLine.textContent}`
  }

  // Get or create components.mirror
  let componentFileContent = filesAccess.getFile(componentFileName) ?? ''

  // Add definition to components.mirror
  if (componentFileContent.length > 0 && !componentFileContent.endsWith('\n')) {
    componentFileContent += '\n'
  }
  componentFileContent += definitionLine + '\n'

  // Check if import is needed in current file
  const currentFile = filesAccess.getCurrentFile()
  let importAdded = false
  let currentSource = this.source

  // Get component file name without extension for import
  const importName = componentFileName.replace('.mirror', '')

  // Check if import already exists
  const importRegex = new RegExp(`^import\\s+${importName}\\s*$`, 'm')
  if (!importRegex.test(currentSource)) {
    // Add import at the beginning of the file
    currentSource = `import ${importName}\n` + currentSource
    importAdded = true
  }

  // Update lines array after potential import addition
  const currentLines = currentSource.split('\n')

  // Calculate the line number adjustment if import was added
  const lineOffset = importAdded ? 1 : 0
  const adjustedNodeLine = nodeLine + lineOffset

  // Replace the original line with simplified instance
  currentLines[adjustedNodeLine - 1] = instanceLine
  const newSource = currentLines.join('\n')

  // Calculate the change for the current file
  // If import was added, we need to describe the full change
  // Note: use this.source.length BEFORE persisting (old length for CodeMirror)
  const change: CodeChange = importAdded
    ? {
        from: 0,
        to: this.source.length,
        insert: newSource,
      }
    : {
        from: this.getCharacterOffset(nodeLine, 1),
        to: this.getCharacterOffset(nodeLine, line.length + 1),
        insert: instanceLine,
      }

  // Persist changes for subsequent operations
  this.source = newSource
  this.lines = currentLines

  return {
    success: true,
    currentFileChange: change,
    componentFileChange: {
      path: componentFileName,
      content: componentFileContent,
    },
    importAdded,
  }
}

/**
 * Create an error result for extract operation
 */
export function extractErrorResult(this: CodeModifier, error: string): ExtractToComponentResult {
  return {
    success: false,
    currentFileChange: { from: 0, to: 0, insert: '' },
    componentFileChange: { path: '', content: '' },
    importAdded: false,
    error,
  }
}
