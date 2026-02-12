/**
 * Convert static <pre> blocks to interactive mirror-editor playgrounds
 *
 * Usage: npx tsx scripts/convert-pre-to-editor.ts
 */

import * as fs from 'fs'

const inputFile = 'docs/mirror-docu.html'
const outputFile = 'docs/mirror-docu.html'

// Read the file
let html = fs.readFileSync(inputFile, 'utf-8')

// Function to strip HTML tags and decode entities
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')  // Remove HTML tags
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

// Function to escape for data-code attribute
function escapeForAttribute(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
}

// Function to estimate preview height based on code content
function estimatePreviewHeight(code: string): number {
  const lines = code.split('\n').length
  const hasChildren = code.includes('\n  ')

  // Base height
  let height = 60

  // Add height for nested content
  if (hasChildren) {
    height = Math.max(80, lines * 25)
  }

  // Cap at reasonable maximum
  return Math.min(height, 300)
}

// Find all <pre>...</pre> blocks that are NOT inside mirror-editor
const preRegex = /<pre>([^]*?)<\/pre>/g

let match
let replacements: Array<{start: number, end: number, replacement: string}> = []

while ((match = preRegex.exec(html)) !== null) {
  const fullMatch = match[0]
  const innerHtml = match[1]
  const startIndex = match.index
  const endIndex = startIndex + fullMatch.length

  // Skip if this is already inside a mirror-editor (check context)
  const before = html.substring(Math.max(0, startIndex - 100), startIndex)
  if (before.includes('mirror-editor')) {
    continue
  }

  // Extract plain code
  const code = stripHtml(innerHtml)

  // Skip empty or very short code
  if (code.length < 5) {
    continue
  }

  // Estimate preview height
  const height = estimatePreviewHeight(code)

  // Create replacement
  const escapedCode = escapeForAttribute(code)
  const replacement = `<div class="mirror-editor" data-code="${escapedCode}" data-preview-height="${height}"></div>`

  replacements.push({ start: startIndex, end: endIndex, replacement })
}

// Apply replacements in reverse order to preserve indices
replacements.sort((a, b) => b.start - a.start)

for (const r of replacements) {
  html = html.substring(0, r.start) + r.replacement + html.substring(r.end)
}

// Remove static preview divs that come right after mirror-editor divs
// Pattern: mirror-editor div followed by optional whitespace and <div class="preview">...</div>
html = html.replace(
  /(<div class="mirror-editor"[^>]*><\/div>)\s*<div class="preview">[^]*?<\/div>/g,
  '$1'
)

// Write output
fs.writeFileSync(outputFile, html)

console.log(`Converted ${replacements.length} <pre> blocks to mirror-editor`)
console.log(`Output written to ${outputFile}`)
