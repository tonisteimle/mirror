/**
 * Watch Mode — fs.watch with debounced recompile.
 */

import * as fs from 'fs'
import * as path from 'path'
import { c } from './output'
import { getAllMirrorExtensions } from './types'

/** Debounce — delays execution until no calls for `delay` ms. */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

export function watchFiles(
  files: string[],
  projectDir: string | undefined,
  compile: () => void
): void {
  console.error(c('\nWatching for changes... (Ctrl+C to stop)', 'cyan'))

  const debouncedCompile = debounce(() => compile(), 150)

  let pendingChanges: string[] = []

  const handleChange = (filename: string) => {
    if (!pendingChanges.includes(filename)) pendingChanges.push(filename)
    debouncedCompile()
    setTimeout(() => {
      if (pendingChanges.length > 0) {
        const fileList =
          pendingChanges.length <= 3
            ? pendingChanges.join(', ')
            : `${pendingChanges.slice(0, 2).join(', ')} +${pendingChanges.length - 2} more`
        console.error(
          c(`\n[${new Date().toLocaleTimeString()}] Change detected: ${fileList}`, 'yellow')
        )
        pendingChanges = []
      }
    }, 50)
  }

  const watchPaths = projectDir ? [projectDir] : files

  for (const watchPath of watchPaths) {
    const absolutePath = path.resolve(watchPath)

    if (fs.statSync(absolutePath).isDirectory()) {
      const allExtensions = getAllMirrorExtensions()
      fs.watch(absolutePath, { recursive: true }, (_eventType, filename) => {
        if (filename && allExtensions.some(ext => filename.endsWith(ext))) {
          handleChange(filename)
        }
      })
    } else {
      fs.watch(absolutePath, eventType => {
        if (eventType === 'change') handleChange(path.basename(absolutePath))
      })
    }
  }
}
