/**
 * HTML Document Template
 *
 * Wraps compiled Mirror JS into a standalone HTML document. Used by
 * `mirror-compile -o foo.html` and (later) `mirror-build`.
 *
 * Self-contained by default: script and CSS are inlined so the output is a
 * single deployable file. Pass `external.*` paths to emit <link>/<script src>
 * references instead.
 */

import { escapeHtml } from '../utils/escape-html'

export interface HtmlOptions {
  /** Document <title>. Default: "Mirror App". */
  title?: string
  /** HTML lang attribute. Default: "en". */
  lang?: string
  /**
   * Default CSS handling:
   *   true     — caller supplies CSS via `defaultsCssContent`
   *   false    — no default CSS, only minimal margin/padding reset
   *   string   — inline this CSS verbatim (caller pre-loaded the file)
   * Default: false (preserves legacy `mirror-compile -o foo.html` behavior).
   */
  defaultsCss?: boolean | string
  /** When set, output `<link rel="stylesheet" href="...">` instead of inline. */
  externalCssPath?: string
  /** When set, output `<script type="module" src="...">` instead of inline. */
  externalJsPath?: string
}

const MINIMAL_RESET = 'html, body { margin: 0; padding: 0; }'

/**
 * Snippet that mounts the compiled app into <body>. Appended to the inline
 * <script> by `buildHtmlDocument`, and appended to the external JS bundle
 * by callers (build.ts) when `externalJsPath` is used — without this, the
 * external bundle defines `createUI()` but never invokes it.
 */
export const STANDALONE_BOOTSTRAP = `
// Auto-initialize for standalone HTML
const _ui = createUI()
document.body.appendChild(_ui)
`

function buildStyleTag(opts: HtmlOptions): string {
  if (opts.externalCssPath) {
    return `<link rel="stylesheet" href="${escapeHtml(opts.externalCssPath)}">`
  }
  const css =
    typeof opts.defaultsCss === 'string' ? opts.defaultsCss + '\n' + MINIMAL_RESET : MINIMAL_RESET
  return `<style>${css}</style>`
}

function buildScriptTag(compiledCode: string, opts: HtmlOptions): string {
  if (opts.externalJsPath) {
    return `<script type="module" src="${escapeHtml(opts.externalJsPath)}"></script>`
  }
  return `<script type="module">\n${compiledCode}${STANDALONE_BOOTSTRAP}</script>`
}

/**
 * Build a complete HTML document around compiled Mirror JS.
 */
export function buildHtmlDocument(compiledCode: string, opts: HtmlOptions = {}): string {
  const title = escapeHtml(opts.title ?? 'Mirror App')
  const lang = escapeHtml(opts.lang ?? 'en')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${buildStyleTag(opts)}
</head>
<body>
${buildScriptTag(compiledCode, opts)}
</body>
</html>`
}

/**
 * Derive a human-readable title from a file path.
 *   "dist/hotel-checkin.html" → "Hotel Checkin"
 *   "app.html"                → "App"
 */
export function deriveTitle(outputPath: string): string {
  const base = outputPath.split(/[/\\]/).pop() || outputPath
  const stem = base.replace(/\.[^.]+$/, '')
  return (
    stem
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1))
      .join(' ') || 'Mirror App'
  )
}
