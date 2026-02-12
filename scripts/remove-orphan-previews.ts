/**
 * Remove orphaned preview divs that break the layout
 *
 * Usage: npx tsx scripts/remove-orphan-previews.ts
 */

import * as fs from 'fs'

const inputFile = 'docs/mirror-docu.html'
const outputFile = 'docs/mirror-docu.html'

// Read the file
let html = fs.readFileSync(inputFile, 'utf-8')

// Remove orphaned preview divs (not inside mirror-editor)
// Pattern: <div class="preview...">...</div>
// We need to match the entire div including nested content

let removeCount = 0

// Use a function to find and remove preview divs
function removePreviewDivs(html: string): string {
  const previewStart = /<div class="preview[^"]*"[^>]*>/g
  let result = ''
  let lastIndex = 0
  let match

  while ((match = previewStart.exec(html)) !== null) {
    const startIndex = match.index

    // Check if this is inside a mirror-editor (skip if so)
    const before = html.substring(Math.max(0, startIndex - 200), startIndex)
    if (before.includes('mirror-editor')) {
      continue
    }

    // Find the matching closing </div>
    let depth = 1
    let i = startIndex + match[0].length

    while (i < html.length && depth > 0) {
      if (html.substring(i, i + 4) === '<div') {
        depth++
        i += 4
      } else if (html.substring(i, i + 6) === '</div>') {
        depth--
        if (depth === 0) {
          // Found the closing tag
          const endIndex = i + 6

          // Append everything before this div
          result += html.substring(lastIndex, startIndex)
          lastIndex = endIndex
          removeCount++
          break
        }
        i += 6
      } else {
        i++
      }
    }
  }

  // Append the rest
  result += html.substring(lastIndex)
  return result
}

html = removePreviewDivs(html)

// Write output
fs.writeFileSync(outputFile, html)

console.log(`Removed ${removeCount} orphaned preview divs`)
console.log(`Output written to ${outputFile}`)
