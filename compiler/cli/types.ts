/**
 * CLI Types & File Extensions
 *
 * Shared between args, discovery, compile and watch modules.
 */

export const FILE_EXTENSIONS = {
  layout: ['.mir', '.mirror'],
  tokens: ['.tok', '.tokens'],
  component: ['.com', '.components'],
  data: ['.yaml', '.yml', '.data'], // .data for backwards compatibility
} as const

export type MirrorFileType = 'layout' | 'tokens' | 'component' | 'data' | 'unknown'

export interface CLIOptions {
  input: string[]
  output?: string
  backend: 'dom' | 'react'
  project?: string
  watch: boolean
  verbose: boolean
  minify: boolean
  sourceMap: boolean
  help: boolean
  version: boolean
}

export interface CompileResult {
  success: boolean
  output?: string
  error?: string
  warnings: string[]
  stats: {
    inputFiles: number
    inputLines: number
    outputLines: number
    compileTime: number
  }
}

export function getFileType(filename: string): MirrorFileType {
  for (const [type, extensions] of Object.entries(FILE_EXTENSIONS)) {
    if (extensions.some(ext => filename.endsWith(ext))) {
      return type as MirrorFileType
    }
  }
  return 'unknown'
}

export function isMirrorCodeFile(filename: string): boolean {
  const codeExtensions = [
    ...FILE_EXTENSIONS.layout,
    ...FILE_EXTENSIONS.tokens,
    ...FILE_EXTENSIONS.component,
  ]
  return codeExtensions.some(ext => filename.endsWith(ext))
}

export function isDataFile(filename: string): boolean {
  return FILE_EXTENSIONS.data.some(ext => filename.endsWith(ext))
}

export function getAllMirrorExtensions(): string[] {
  return Object.values(FILE_EXTENSIONS).flat()
}
