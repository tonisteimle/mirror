/**
 * Zag Component Helpers
 *
 * Utilities for Zag component handling in the studio.
 * Each function is focused and < 10 lines.
 */

import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('Zag')

// ============================================
// TYPES
// ============================================

export interface ZagChild {
  isSlot?: boolean
  isItem?: boolean
  template: string
  properties?: string
  textContent?: string
  children?: ZagChild[]
}

export interface ZagDefinitionResult {
  exists: boolean
  definitionName?: string
  sourceFile?: string
}

export interface ZagDependencies {
  getAst: () => any
  getCurrentFile: () => string
  getFiles: () => Record<string, string>
  parseCode: (code: string) => any
  isMirrorFile: (filename: string) => boolean
  isComponentsFile: (filename: string) => boolean
  getEditor: () => any
  emitNotification: (type: 'success' | 'error' | 'info', message: string) => void
  updateFileList: () => void
}

// ============================================
// SLOT/ITEM DETECTION
// ============================================

export function isZagComponent(children: ZagChild[] | undefined): boolean {
  if (!children || children.length === 0) return false
  return children.some(child => child.isSlot === true)
}

export function getZagSlots(children: ZagChild[]): ZagChild[] {
  return children.filter(child => child.isSlot === true)
}

export function getZagItems(children: ZagChild[]): ZagChild[] {
  const items: ZagChild[] = []
  for (const child of children) {
    if (child.isItem) items.push(child)
    else if (child.isSlot && child.children) {
      items.push(...child.children.filter(c => c.isItem))
    }
  }
  return items
}

// ============================================
// DEFINITION SEARCH
// ============================================

export function findExistingZagDefinition(
  zagComponentName: string,
  deps: ZagDependencies
): ZagDefinitionResult {
  const currentResult = searchCurrentFile(zagComponentName, deps)
  if (currentResult.exists) return currentResult
  return searchAllFiles(zagComponentName, deps)
}

function searchCurrentFile(name: string, deps: ZagDependencies): ZagDefinitionResult {
  const ast = deps.getAst()
  if (!ast?.components) return { exists: false }

  for (const comp of ast.components) {
    // Match by name (for Pure components), primitive, or extends
    if (comp.name === name || comp.primitive === name || comp.extends === name) {
      return { exists: true, definitionName: comp.name, sourceFile: deps.getCurrentFile() }
    }
  }
  return { exists: false }
}

function searchAllFiles(name: string, deps: ZagDependencies): ZagDefinitionResult {
  const currentFile = deps.getCurrentFile()
  const allFiles = deps.getFiles()

  for (const [filename, content] of Object.entries(allFiles)) {
    if (filename === currentFile) continue
    if (!deps.isMirrorFile(filename)) continue
    if (!content?.trim()) continue

    const result = searchFileForDefinition(name, filename, content, deps)
    if (result.exists) return result
  }
  return { exists: false }
}

function searchFileForDefinition(
  name: string,
  filename: string,
  content: string,
  deps: ZagDependencies
): ZagDefinitionResult {
  try {
    const ast = deps.parseCode(content)
    if (!ast?.components) return { exists: false }

    for (const comp of ast.components) {
      // Match by name (for Pure components), primitive, or extends
      if (comp.name === name || comp.primitive === name || comp.extends === name) {
        return { exists: true, definitionName: comp.name, sourceFile: filename }
      }
    }
  } catch {
    // Skip files that fail to parse
  }
  return { exists: false }
}

// ============================================
// NAME GENERATION
// ============================================

export function generateZagComponentName(zagComponentName: string, deps: ZagDependencies): string {
  const existingNames = collectAllComponentNames(deps)
  return findUniqueName(zagComponentName, existingNames)
}

function collectAllComponentNames(deps: ZagDependencies): Set<string> {
  const names = new Set<string>()
  collectFromCurrentFile(deps, names)
  collectFromOtherFiles(deps, names)
  return names
}

function collectFromCurrentFile(deps: ZagDependencies, names: Set<string>): void {
  const ast = deps.getAst()
  if (!ast?.components) return
  for (const comp of ast.components) names.add(comp.name)
}

function collectFromOtherFiles(deps: ZagDependencies, names: Set<string>): void {
  const currentFile = deps.getCurrentFile()
  const allFiles = deps.getFiles()

  for (const [filename, content] of Object.entries(allFiles)) {
    if (filename === currentFile) continue
    if (!deps.isMirrorFile(filename)) continue
    if (!content?.trim()) continue
    collectFromFileContent(content, deps, names)
  }
}

function collectFromFileContent(content: string, deps: ZagDependencies, names: Set<string>): void {
  try {
    const ast = deps.parseCode(content)
    if (!ast?.components) return
    for (const comp of ast.components) names.add(comp.name)
  } catch {
    // Skip files that fail to parse
  }
}

function findUniqueName(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName)) return baseName

  const prefixes = ['My', 'Custom', 'App', 'Project']
  for (const prefix of prefixes) {
    const name = `${prefix}${baseName}`
    if (!existingNames.has(name)) return name
  }

  return findNumberedName(baseName, existingNames)
}

function findNumberedName(baseName: string, existingNames: Set<string>): string {
  const MAX_COUNTER = 1000
  for (let counter = 2; counter < MAX_COUNTER; counter++) {
    const name = `${baseName}${counter}`
    if (!existingNames.has(name)) return name
  }
  return `${baseName}${MAX_COUNTER}`
}

// ============================================
// CODE GENERATION
// ============================================

export function generateZagDefinitionCode(
  definitionName: string,
  zagComponentName: string,
  children: ZagChild[]
): string {
  const lines = [`${definitionName} as ${zagComponentName}:`]
  const slots = getZagSlots(children)
  for (const slot of slots) {
    addSlotLines(slot, lines)
  }
  return lines.join('\n')
}

function addSlotLines(slot: ZagChild, lines: string[]): void {
  lines.push(`  ${slot.template}:`)
  if (slot.properties) lines.push(`    ${slot.properties}`)
  if (slot.children) addNestedChildLines(slot.children, lines)
}

function addNestedChildLines(children: ZagChild[], lines: string[]): void {
  for (const nested of children) {
    if (nested.isItem) continue
    lines.push(buildNestedLine(nested))
  }
}

function buildNestedLine(nested: ZagChild): string {
  let line = `    ${nested.template}`
  if (nested.properties) line += ` ${nested.properties}`
  if (nested.textContent) line += ` "${nested.textContent}"`
  return line
}

export function generateZagInstanceCode(
  instanceName: string,
  properties: string | undefined,
  children: ZagChild[],
  indent = ''
): string {
  const lines = [buildInstanceLine(instanceName, properties, indent)]
  const items = getZagItems(children)
  for (const item of items) {
    lines.push(buildItemLine(item, indent))
  }
  return lines.join('\n')
}

function buildInstanceLine(name: string, properties: string | undefined, indent: string): string {
  return properties ? `${indent}${name} ${properties}` : `${indent}${name}`
}

function buildItemLine(item: ZagChild, indent: string): string {
  let line = `${indent}  ${item.template}`
  if (item.properties) line += ` ${item.properties}`
  if (item.textContent) line += ` "${item.textContent}"`
  return line
}

// ============================================
// FILE OPERATIONS
// ============================================

export async function findOrCreateComponentsFile(deps: ZagDependencies): Promise<string | null> {
  const existingFile = findExistingComFile(deps)
  if (existingFile) return existingFile
  return createNewComFile(deps)
}

function findExistingComFile(deps: ZagDependencies): string | null {
  const allFiles = deps.getFiles()
  const comFiles = Object.keys(allFiles).filter(f => deps.isComponentsFile(f))
  if (comFiles.length === 0) return null
  return comFiles.find(f => f.includes('components')) || comFiles[0]
}

async function createNewComFile(deps: ZagDependencies): Promise<string | null> {
  const currentFile = deps.getCurrentFile()
  if (!currentFile) {
    log.warn('[Zag] No current file, cannot determine directory')
    return null
  }

  const dir = currentFile.substring(0, currentFile.lastIndexOf('/') + 1)
  const newFilePath = dir + 'components.com'
  const initialContent = '// Component definitions\n'

  return writeNewComFile(newFilePath, initialContent, dir, deps)
}

async function writeNewComFile(
  filePath: string,
  content: string,
  dir: string,
  deps: ZagDependencies
): Promise<string | null> {
  const TauriBridge = (window as any).TauriBridge

  if (TauriBridge?.isTauri?.()) {
    return writeTauriComFile(filePath, content, dir)
  }
  return writeBrowserComFile(filePath, content, deps)
}

async function writeTauriComFile(
  filePath: string,
  content: string,
  dir: string
): Promise<string | null> {
  const TauriBridge = (window as any).TauriBridge,
    desktopFiles = (window as any).desktopFiles
  try {
    await TauriBridge.fs.writeFile(filePath, content)
    if (desktopFiles?.getFiles) desktopFiles.getFiles()[filePath] = content
    desktopFiles?.loadFolder?.(dir.slice(0, -1))
    log.debug('[Zag] Created new components file:', filePath)
    return filePath
  } catch (err) {
    log.error('[Zag] Failed to create components.com:', err)
    return null
  }
}

function writeBrowserComFile(
  filePath: string,
  content: string,
  deps: ZagDependencies
): string | null {
  deps.getFiles()[filePath] = content
  deps.updateFileList()
  log.debug('[Zag] Created new components file (browser):', filePath)
  return filePath
}

export async function addZagDefinitionToComponentsFile(
  definitionCode: string,
  filePath: string,
  deps: ZagDependencies
): Promise<boolean> {
  const content = buildUpdatedContent(definitionCode, filePath, deps)
  return writeDefinitionToFile(content, filePath, deps)
}

function buildUpdatedContent(code: string, filePath: string, deps: ZagDependencies): string {
  const allFiles = deps.getFiles()
  const existing = allFiles[filePath] || ''
  return existing.trim() ? existing.trimEnd() + '\n\n' + code + '\n' : code + '\n'
}

async function writeDefinitionToFile(
  content: string,
  filePath: string,
  deps: ZagDependencies
): Promise<boolean> {
  const TauriBridge = (window as any).TauriBridge

  if (TauriBridge?.isTauri?.()) {
    return writeTauriDefinition(content, filePath, deps)
  }
  return writeBrowserDefinition(content, filePath, deps)
}

async function writeTauriDefinition(
  content: string,
  filePath: string,
  deps: ZagDependencies
): Promise<boolean> {
  const TauriBridge = (window as any).TauriBridge
  const desktopFiles = (window as any).desktopFiles
  const filename = filePath.split('/').pop()

  try {
    await TauriBridge.fs.writeFile(filePath, content)
    if (desktopFiles?.getFiles) {
      desktopFiles.getFiles()[filePath] = content
    }
    deps.emitNotification('success', `Definition wurde zu ${filename} hinzugefügt`)
    return true
  } catch (err) {
    log.error('[Zag] Failed to write:', err)
    deps.emitNotification('error', `Konnte nicht zu ${filename} speichern`)
    return false
  }
}

function writeBrowserDefinition(content: string, filePath: string, deps: ZagDependencies): boolean {
  const filename = filePath.split('/').pop()
  deps.getFiles()[filePath] = content
  deps.emitNotification('success', `Definition wurde zu ${filename} hinzugefügt`)
  return true
}

// ============================================
// ADD TO CURRENT CODE
// ============================================

export function addZagDefinitionToCode(definitionCode: string, deps: ZagDependencies): boolean {
  const editor = deps.getEditor()
  if (!editor) return false

  const source = editor.state.doc.toString()
  const position = findInsertPosition(source, deps)
  const newSource = insertAtPosition(source, definitionCode, position)

  applyChange(editor, source, newSource)
  return true
}

function findInsertPosition(source: string, deps: ZagDependencies): number {
  const ast = deps.getAst()
  const lines = source.split('\n')

  if (ast?.components?.length > 0) {
    return findPositionAfterComponents(ast, lines)
  }
  if (ast?.tokens?.length > 0) {
    return findPositionAfterTokens(ast, lines)
  }
  return 0
}

function findPositionAfterComponents(ast: any, lines: string[]): number {
  const lastComponent = ast.components[ast.components.length - 1]
  let endLine = lastComponent.line

  for (let i = lastComponent.line; i < lines.length; i++) {
    const line = lines[i]
    if (isTopLevelLine(line)) {
      endLine = i
      break
    }
    endLine = i + 1
  }
  return lines.slice(0, endLine).join('\n').length
}

function findPositionAfterTokens(ast: any, lines: string[]): number {
  const lastToken = ast.tokens[ast.tokens.length - 1]
  return lines.slice(0, lastToken.line).join('\n').length
}

function isTopLevelLine(line: string): boolean {
  if (line.trim() === '') return true
  if (line.length === 0) return false
  return !line.startsWith(' ') && !line.startsWith('\t')
}

function insertAtPosition(source: string, code: string, position: number): string {
  const prefix = position > 0 ? '\n\n' : ''
  return source.slice(0, position) + prefix + code + '\n' + source.slice(position)
}

function applyChange(editor: any, oldSource: string, newSource: string): void {
  editor.dispatch({
    changes: { from: 0, to: oldSource.length, insert: newSource },
  })
}
