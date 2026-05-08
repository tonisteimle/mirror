/**
 * Build Orchestrator
 *
 * Pipeline: input (file or dir) → compile → wrap in HTML → write.
 * Pure orchestration; arg parsing lives in `compiler/build-cli.ts`.
 */

import * as fs from 'fs'
import * as path from 'path'
import { transformSync } from 'esbuild'
import { compileFiles, compileProject } from './compile'
import { loadDefaultsCss } from './defaults-css'
import { writeFile } from './files'
import { buildHtmlDocument, deriveTitle, STANDALONE_BOOTSTRAP } from './html-template'
import type { CompileResult } from './types'

export interface BuildOptions {
  /** Input — a file, a directory (project mode), or multiple files. */
  input: string[]
  /** Explicit output path (file or directory). Overrides outDir + derivation. */
  out?: string
  /** Output directory when `out` is unset. Default: "dist". */
  outDir?: string
  /** HTML <title>. Default: derived from input. */
  title?: string
  /** HTML lang attribute. Default: "en". */
  lang?: string
  /** When true, omit Mirror's default CSS. Default: false. */
  noDefaultsCss?: boolean
  /** Emit CSS as a sibling .css file linked from HTML instead of inline. */
  externalCss?: boolean
  /** Emit JS as a sibling .js file linked from HTML instead of inline. */
  externalJs?: boolean
  /** Minify the JS output via esbuild. */
  minify?: boolean
  /** Verbose logging. */
  verbose?: boolean
}

export interface BuildResult {
  success: boolean
  outputPath?: string
  /** Sibling files written next to outputPath (.css and/or .js) when external. */
  siblingPaths?: string[]
  error?: string
  warnings: string[]
  stats: {
    inputFiles: number
    outputBytes: number
    compileTime: number
  }
}

interface ResolvedInput {
  files: string[]
  projectDir?: string
  /** Used to derive the output filename (always lowercase, no spaces). */
  derivedName: string
  /** Used to derive the HTML <title> (human-readable). */
  derivedTitle: string
}

function isDirectory(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isDirectory()
}

/**
 * Decide whether the input is a single file, multiple files, or a project
 * directory, and pick a name for derivation.
 */
function resolveInput(input: string[]): ResolvedInput {
  if (input.length === 0) {
    throw new Error('No input specified')
  }
  if (input.length === 1 && isDirectory(input[0])) {
    const dir = path.resolve(input[0])
    const dirBase = path.basename(dir) || 'project'
    return { files: [], projectDir: dir, derivedName: 'index', derivedTitle: dirBase }
  }
  // One or more files
  const files = input
  const primary = files[0]
  const base = path.basename(primary).replace(/\.[^.]+$/, '') || 'app'
  return { files, derivedName: base, derivedTitle: base }
}

/**
 * Resolve final output path from options + derived name.
 *   - If `out` is a directory or ends with `/`: write `<out>/<derived>.html`
 *   - If `out` ends with `.html`: use it verbatim
 *   - If `out` is otherwise set: treat as directory
 *   - Else: write `<outDir>/<derived>.html`
 */
function resolveOutputPath(opts: BuildOptions, derivedName: string): string {
  const outDir = opts.outDir ?? 'dist'

  if (opts.out) {
    if (opts.out.endsWith('.html')) {
      return path.resolve(opts.out)
    }
    if (opts.out.endsWith('/') || opts.out.endsWith(path.sep) || isDirectory(opts.out)) {
      return path.resolve(opts.out, `${derivedName}.html`)
    }
    // Treat as directory that doesn't exist yet
    return path.resolve(opts.out, `${derivedName}.html`)
  }

  return path.resolve(outDir, `${derivedName}.html`)
}

export function build(opts: BuildOptions): BuildResult {
  const startTime = Date.now()
  const warnings: string[] = []

  let resolved: ResolvedInput
  try {
    resolved = resolveInput(opts.input)
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      warnings,
      stats: { inputFiles: 0, outputBytes: 0, compileTime: Date.now() - startTime },
    }
  }

  const result: CompileResult = resolved.projectDir
    ? compileProject(resolved.projectDir, 'dom', !!opts.verbose)
    : compileFiles(resolved.files, 'dom', !!opts.verbose)

  warnings.push(...result.warnings)

  if (!result.success || !result.output) {
    return {
      success: false,
      error: result.error ?? 'Compilation failed',
      warnings,
      stats: {
        inputFiles: result.stats.inputFiles,
        outputBytes: 0,
        compileTime: Date.now() - startTime,
      },
    }
  }

  const outputPath = resolveOutputPath(opts, resolved.derivedName)
  const outputDir = path.dirname(outputPath)
  const stem = path.basename(outputPath).replace(/\.html$/, '')

  // Prepare JS — minify before deciding inline vs external so both paths
  // see the same bytes.
  const jsCode = opts.minify ? minifyJs(result.output) : result.output

  const siblingPaths: string[] = []
  let externalJsPath: string | undefined
  let externalCssPath: string | undefined

  if (opts.externalJs) {
    externalJsPath = `${stem}.js`
    const jsBundle = jsCode + STANDALONE_BOOTSTRAP
    const jsAbs = path.join(outputDir, externalJsPath)
    writeFile(jsAbs, opts.minify ? minifyJs(jsBundle) : jsBundle)
    siblingPaths.push(jsAbs)
  }

  const inlinedDefaultsCss = opts.noDefaultsCss ? false : loadDefaultsCss()

  if (opts.externalCss && inlinedDefaultsCss) {
    externalCssPath = `${stem}.css`
    const cssAbs = path.join(outputDir, externalCssPath)
    writeFile(cssAbs, typeof inlinedDefaultsCss === 'string' ? inlinedDefaultsCss : '')
    siblingPaths.push(cssAbs)
  }

  const html = buildHtmlDocument(jsCode, {
    title: opts.title ?? deriveTitle(resolved.derivedTitle + '.html'),
    lang: opts.lang ?? 'en',
    // When CSS is externalised, the html-template only emits the link tag —
    // pass false so it doesn't double up with an inline <style>.
    defaultsCss: opts.externalCss ? false : inlinedDefaultsCss,
    externalCssPath,
    externalJsPath,
  })

  writeFile(outputPath, html)

  return {
    success: true,
    outputPath,
    siblingPaths: siblingPaths.length > 0 ? siblingPaths : undefined,
    warnings,
    stats: {
      inputFiles: result.stats.inputFiles,
      outputBytes: Buffer.byteLength(html, 'utf-8'),
      compileTime: Date.now() - startTime,
    },
  }
}

function minifyJs(code: string): string {
  const result = transformSync(code, {
    minify: true,
    target: 'es2022',
    format: 'esm',
    legalComments: 'none',
  })
  return result.code
}
