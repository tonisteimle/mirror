/**
 * Fix literal newlines in data-code attributes
 *
 * Converts literal newlines to &#10; entities
 *
 * Usage: npx tsx scripts/fix-data-code-newlines.ts
 */

import * as fs from 'fs'

const inputFile = 'docs/mirror-docu.html'
const outputFile = 'docs/mirror-docu.html'

// Read the file
let html = fs.readFileSync(inputFile, 'utf-8')

// Find all data-code=" and then read until closing "
// We need to be careful because content can span multiple lines
let result = ''
let i = 0
let fixCount = 0

while (i < html.length) {
  const marker = 'data-code="'
  const markerIdx = html.indexOf(marker, i)

  if (markerIdx === -1) {
    // No more data-code attributes, append rest
    result += html.substring(i)
    break
  }

  // Append everything up to and including 'data-code="'
  result += html.substring(i, markerIdx + marker.length)
  i = markerIdx + marker.length

  // Now find the closing quote
  // We need to handle escaped quotes (&quot;) vs literal quotes
  let j = i
  while (j < html.length) {
    if (html[j] === '"') {
      // Found closing quote
      break
    }
    j++
  }

  // Extract content and fix newlines
  const content = html.substring(i, j)
  if (content.includes('\n') || content.includes('\r')) {
    fixCount++
    const fixed = content
      .replace(/\r\n/g, '&#10;')
      .replace(/\n/g, '&#10;')
      .replace(/\r/g, '&#13;')
    result += fixed
  } else {
    result += content
  }

  i = j
}

html = result

// Write output
fs.writeFileSync(outputFile, html)

console.log(`Fixed ${fixCount} data-code attributes with newlines`)
console.log(`Output written to ${outputFile}`)
