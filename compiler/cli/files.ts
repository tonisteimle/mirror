/**
 * CLI File Operations — read, write, list by extension.
 */

import * as fs from 'fs'
import * as path from 'path'
import { FILE_EXTENSIONS } from './types'

export function readFile(filePath: string): string {
  return fs.readFileSync(path.resolve(filePath), 'utf-8')
}

export function writeFile(filePath: string, content: string): void {
  const absolutePath = path.resolve(filePath)
  const dir = path.dirname(absolutePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(absolutePath, content, 'utf-8')
}

export function listFiles(dir: string, extensions: readonly string[]): string[] {
  const absoluteDir = path.resolve(dir)
  if (!fs.existsSync(absoluteDir)) return []
  return fs
    .readdirSync(absoluteDir)
    .filter(f => extensions.some(ext => f.endsWith(ext)))
    .map(f => path.join(absoluteDir, f))
}

export function listMirrorCodeFiles(dir: string): string[] {
  return listFiles(dir, [
    ...FILE_EXTENSIONS.layout,
    ...FILE_EXTENSIONS.tokens,
    ...FILE_EXTENSIONS.component,
  ])
}

export function listTokenFiles(dir: string): string[] {
  return listFiles(dir, FILE_EXTENSIONS.tokens)
}

export function listComponentFiles(dir: string): string[] {
  return listFiles(dir, FILE_EXTENSIONS.component)
}

export function listLayoutFiles(dir: string): string[] {
  return listFiles(dir, FILE_EXTENSIONS.layout)
}

export function listDataFiles(dir: string): string[] {
  return listFiles(dir, FILE_EXTENSIONS.data)
}
