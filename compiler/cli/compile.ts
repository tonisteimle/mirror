/**
 * Compilation — single-files vs project-mode pipelines.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from '../parser'
import { generateDOM } from '../backends/dom'
import { generateReact } from '../backends/react'
import { parseDataFile } from '../parser/data-parser'
import type { DataFile } from '../parser/data-types'
import { c } from './output'
import {
  FILE_EXTENSIONS,
  getFileType,
  isMirrorCodeFile,
  isDataFile,
  getAllMirrorExtensions,
  type CompileResult,
} from './types'
import {
  readFile,
  listMirrorCodeFiles,
  listTokenFiles,
  listComponentFiles,
  listLayoutFiles,
  listDataFiles,
} from './files'

export function compileFiles(
  files: string[],
  backend: 'dom' | 'react',
  verbose: boolean
): CompileResult {
  const startTime = Date.now()
  const warnings: string[] = []

  try {
    let combinedCode = ''
    let totalLines = 0
    const dataFiles: DataFile[] = []

    for (const file of files) {
      if (verbose) {
        console.error(c(`  Reading ${file} (${getFileType(file)})...`, 'dim'))
      }

      const content = readFile(file)
      totalLines += content.split('\n').length

      if (isDataFile(file)) {
        const basename = path.basename(file)
        const ext = FILE_EXTENSIONS.data.find(e => basename.endsWith(e)) || ''
        const name = basename.slice(0, -ext.length)
        dataFiles.push(parseDataFile(content, name))
      } else if (isMirrorCodeFile(file)) {
        if (combinedCode) combinedCode += '\n\n'
        combinedCode += `// === ${path.basename(file)} ===\n`
        combinedCode += content
      }
    }

    if (!combinedCode.trim()) {
      return {
        success: false,
        error: 'No Mirror code found in input files',
        warnings,
        stats: {
          inputFiles: files.length,
          inputLines: totalLines,
          outputLines: 0,
          compileTime: Date.now() - startTime,
        },
      }
    }

    if (verbose) console.error(c('  Parsing...', 'dim'))
    const ast = parse(combinedCode)

    if (ast.errors && ast.errors.length > 0) {
      for (const err of ast.errors) {
        warnings.push(`Parse warning at line ${err.line}: ${err.message}`)
      }
    }

    if (verbose) console.error(c(`  Generating ${backend.toUpperCase()}...`, 'dim'))

    const output =
      backend === 'react'
        ? generateReact(ast)
        : generateDOM(ast, { dataFiles: dataFiles.length > 0 ? dataFiles : undefined })

    return {
      success: true,
      output,
      warnings,
      stats: {
        inputFiles: files.length,
        inputLines: totalLines,
        outputLines: output.split('\n').length,
        compileTime: Date.now() - startTime,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      warnings,
      stats: {
        inputFiles: files.length,
        inputLines: 0,
        outputLines: 0,
        compileTime: Date.now() - startTime,
      },
    }
  }
}

/**
 * Discover files in `projectDir` in dependency order:
 *   data → tokens → components → layouts → screens → root
 */
function discoverProjectFiles(absoluteProjectDir: string): string[] {
  const files: string[] = []

  const addFile = (filePath: string): void => {
    const absolutePath = path.resolve(filePath)
    if (!files.includes(absolutePath)) files.push(absolutePath)
  }

  const addFiles = (filePaths: string[]): void => filePaths.forEach(addFile)

  const findRootFile = (baseName: string, extensions: readonly string[]): string | null => {
    for (const ext of extensions) {
      const filePath = path.join(absoluteProjectDir, baseName + ext)
      if (fs.existsSync(filePath) && !files.includes(filePath)) return filePath
    }
    return null
  }

  // 1. Data files
  addFiles(listDataFiles(path.join(absoluteProjectDir, 'data')))
  const rootData = findRootFile('data', FILE_EXTENSIONS.data)
  if (rootData) addFile(rootData)

  // 2. Tokens
  addFiles(listTokenFiles(path.join(absoluteProjectDir, 'tokens')))
  const rootTokens = findRootFile('tokens', [...FILE_EXTENSIONS.tokens, ...FILE_EXTENSIONS.layout])
  if (rootTokens) addFile(rootTokens)

  // 3. Components
  addFiles(listComponentFiles(path.join(absoluteProjectDir, 'components')))
  const rootComponents = findRootFile('components', [
    ...FILE_EXTENSIONS.component,
    ...FILE_EXTENSIONS.layout,
  ])
  if (rootComponents) addFile(rootComponents)

  // 4. Layouts + 5. Screens
  addFiles(listLayoutFiles(path.join(absoluteProjectDir, 'layouts')))
  addFiles(listLayoutFiles(path.join(absoluteProjectDir, 'screens')))

  // 6. Root layout + 7. Other code at root
  addFiles(listLayoutFiles(absoluteProjectDir))
  addFiles(listMirrorCodeFiles(absoluteProjectDir))

  return files
}

export function compileProject(
  projectDir: string,
  backend: 'dom' | 'react',
  verbose: boolean
): CompileResult {
  const startTime = Date.now()
  const absoluteProjectDir = path.resolve(projectDir)

  if (verbose) console.error(c(`Compiling project: ${projectDir}`, 'cyan'))

  const files = discoverProjectFiles(absoluteProjectDir)

  if (files.length === 0) {
    return {
      success: false,
      error: `No Mirror files found in ${projectDir}\nSupported extensions: ${getAllMirrorExtensions().join(', ')}`,
      warnings: [],
      stats: {
        inputFiles: 0,
        inputLines: 0,
        outputLines: 0,
        compileTime: Date.now() - startTime,
      },
    }
  }

  if (verbose) {
    console.error(c(`  Found ${files.length} files:`, 'dim'))
    for (const file of files) {
      console.error(c(`    - ${path.relative(projectDir, file)}`, 'dim'))
    }
  }

  return compileFiles(files, backend, verbose)
}
