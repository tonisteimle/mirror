/**
 * Generates CLAUDE.md tutorial section from HTML tutorial files
 *
 * Usage: npx ts-node scripts/generate-claude-tutorial.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TUTORIAL_DIR = join(__dirname, '../docs/tutorial')
const CLAUDE_MD = join(__dirname, '../CLAUDE.md')

// Tutorial files in order
const TUTORIAL_FILES = [
  '01-elemente.html',
  '02-komponenten.html',
  '03-tokens.html',
  '04-layout.html',
  '05-styling.html',
  '06-states.html',
  '07-animationen.html',
  '08-functions.html',
  '09-daten.html',
  '10-seiten.html',
  '11-eingabe.html',
  '12-navigation.html',
  '13-overlays.html',
  '14-tabellen.html',
  '15-charts.html',
]

function extractContent(html: string): string {
  const lines: string[] = []

  // Extract title from h1
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/s)
  if (h1Match) {
    lines.push(`## ${cleanText(h1Match[1])}`)
    lines.push('')
  }

  // Extract subtitle
  const subtitleMatch = html.match(/<p class="subtitle">(.*?)<\/p>/s)
  if (subtitleMatch) {
    lines.push(`*${cleanText(subtitleMatch[1])}*`)
    lines.push('')
  }

  // Extract intro paragraph
  const introMatch = html.match(/<p class="intro">(.*?)<\/p>/s)
  if (introMatch) {
    lines.push(cleanText(introMatch[1]))
    lines.push('')
  }

  // Process sections
  const sectionRegex = /<section>([\s\S]*?)<\/section>/g
  let sectionMatch

  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    const sectionContent = sectionMatch[1]
    lines.push(...processSection(sectionContent))
  }

  // Process summary if exists
  const summaryMatch = html.match(/<div class="summary">([\s\S]*?)<\/div>/s)
  if (summaryMatch) {
    lines.push('---')
    lines.push('')
    lines.push(...processSection(summaryMatch[1]))
  }

  return lines.join('\n')
}

function processSection(content: string): string[] {
  const lines: string[] = []

  // Extract h2
  const h2Match = content.match(/<h2[^>]*>(.*?)<\/h2>/s)
  if (h2Match) {
    lines.push(`### ${cleanText(h2Match[1])}`)
    lines.push('')
  }

  // Extract h3s and content between them
  const parts = content.split(/<h3[^>]*>/)

  // First part (before any h3)
  if (parts[0]) {
    lines.push(...extractParagraphsAndCode(parts[0]))
  }

  // Parts with h3
  for (let i = 1; i < parts.length; i++) {
    const h3EndMatch = parts[i].match(/(.*?)<\/h3>([\s\S]*)/)
    if (h3EndMatch) {
      lines.push(`#### ${cleanText(h3EndMatch[1])}`)
      lines.push('')
      lines.push(...extractParagraphsAndCode(h3EndMatch[2]))
    }
  }

  return lines
}

function extractParagraphsAndCode(content: string): string[] {
  const lines: string[] = []

  // Remove h2 tags (already processed)
  content = content.replace(/<h2[^>]*>.*?<\/h2>/gs, '')

  // Process in order: paragraphs, code blocks, tables, lists
  const elements: { index: number; type: string; content: string }[] = []

  // Find paragraphs
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g
  let match
  while ((match = pRegex.exec(content)) !== null) {
    // Skip if it's inside a playground
    if (!isInsidePlayground(content, match.index)) {
      elements.push({ index: match.index, type: 'p', content: match[1] })
    }
  }

  // Find playground textareas (code examples)
  const textareaRegex = /<textarea[^>]*>([\s\S]*?)<\/textarea>/g
  while ((match = textareaRegex.exec(content)) !== null) {
    elements.push({ index: match.index, type: 'code', content: match[1] })
  }

  // Find code blocks (non-playground)
  const codeBlockRegex = /<div class="code-block">\s*<pre>([\s\S]*?)<\/pre>\s*<\/div>/g
  while ((match = codeBlockRegex.exec(content)) !== null) {
    elements.push({ index: match.index, type: 'code', content: match[1] })
  }

  // Find tables
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/g
  while ((match = tableRegex.exec(content)) !== null) {
    elements.push({ index: match.index, type: 'table', content: match[0] })
  }

  // Find lists
  const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/g
  while ((match = ulRegex.exec(content)) !== null) {
    elements.push({ index: match.index, type: 'ul', content: match[1] })
  }

  // Find notes
  const noteRegex = /<(?:p|div) class="note"[^>]*>([\s\S]*?)<\/(?:p|div)>/g
  while ((match = noteRegex.exec(content)) !== null) {
    elements.push({ index: match.index, type: 'note', content: match[1] })
  }

  // Sort by index
  elements.sort((a, b) => a.index - b.index)

  // Convert to markdown
  for (const el of elements) {
    switch (el.type) {
      case 'p':
        const text = cleanText(el.content)
        if (text.trim()) {
          lines.push(text)
          lines.push('')
        }
        break
      case 'code':
        lines.push('```mirror')
        lines.push(cleanCode(el.content))
        lines.push('```')
        lines.push('')
        break
      case 'table':
        lines.push(convertTable(el.content))
        lines.push('')
        break
      case 'ul':
        lines.push(convertList(el.content))
        lines.push('')
        break
      case 'note':
        lines.push(`> **Hinweis:** ${cleanText(el.content)}`)
        lines.push('')
        break
    }
  }

  return lines
}

function isInsidePlayground(content: string, index: number): boolean {
  const before = content.substring(0, index)
  const playgroundOpens = (before.match(/<div class="playground"/g) || []).length
  const playgroundCloses = (before.match(/<\/div>\s*<\/div>\s*$/g) || []).length
  return playgroundOpens > playgroundCloses
}

function cleanText(html: string): string {
  return html
    // Convert code tags
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    // Convert strong/b
    .replace(/<(?:strong|b)>(.*?)<\/(?:strong|b)>/g, '**$1**')
    // Convert em/i
    .replace(/<(?:em|i)>(.*?)<\/(?:em|i)>/g, '*$1*')
    // Convert links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '$2')
    // Remove other tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rarr;/g, '→')
    .replace(/&larr;/g, '←')
    .trim()
}

function cleanCode(html: string): string {
  return html
    // Remove syntax highlighting spans
    .replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
    // Remove other tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function convertTable(html: string): string {
  const lines: string[] = []

  // Extract rows
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g
  const rows: string[][] = []
  let match

  while ((match = rowRegex.exec(html)) !== null) {
    const cells: string[] = []
    const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g
    let cellMatch
    while ((cellMatch = cellRegex.exec(match[1])) !== null) {
      cells.push(cleanText(cellMatch[1]))
    }
    if (cells.length > 0) {
      rows.push(cells)
    }
  }

  if (rows.length === 0) return ''

  // Determine column widths
  const colCount = Math.max(...rows.map(r => r.length))

  // Build markdown table
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Pad row to have all columns
    while (row.length < colCount) row.push('')
    lines.push('| ' + row.join(' | ') + ' |')

    // Add separator after header
    if (i === 0) {
      lines.push('| ' + row.map(() => '---').join(' | ') + ' |')
    }
  }

  return lines.join('\n')
}

function convertList(html: string): string {
  const lines: string[] = []
  const liRegex = /<li>([\s\S]*?)<\/li>/g
  let match

  while ((match = liRegex.exec(html)) !== null) {
    lines.push(`- ${cleanText(match[1])}`)
  }

  return lines.join('\n')
}

// Markers in CLAUDE.md
const START_MARKER = '<!-- GENERATED:TUTORIAL:START -->'
const END_MARKER = '<!-- GENERATED:TUTORIAL:END -->'

function main() {
  console.log('Generating tutorial from HTML files...\n')

  // Generate tutorial content
  const output: string[] = []

  output.push('## Mirror DSL Tutorial')
  output.push('')
  output.push('Das folgende Tutorial ist die vollständige Referenz für die Mirror DSL. Es wird automatisch aus den HTML-Tutorials generiert.')
  output.push('')

  for (const file of TUTORIAL_FILES) {
    const filePath = join(TUTORIAL_DIR, file)
    console.log(`Processing ${file}...`)

    try {
      const html = readFileSync(filePath, 'utf-8')
      const markdown = extractContent(html)
      output.push(markdown)
      output.push('')
      output.push('---')
      output.push('')
    } catch (err) {
      console.error(`  Error processing ${file}:`, err)
    }
  }

  const tutorialContent = output.join('\n')

  // Read CLAUDE.md
  console.log('\nUpdating CLAUDE.md...')
  const claudeMd = readFileSync(CLAUDE_MD, 'utf-8')

  // Find markers
  const startIndex = claudeMd.indexOf(START_MARKER)
  const endIndex = claudeMd.indexOf(END_MARKER)

  if (startIndex === -1 || endIndex === -1) {
    console.error('Error: Markers not found in CLAUDE.md!')
    console.error('Make sure CLAUDE.md contains:')
    console.error(`  ${START_MARKER}`)
    console.error(`  ${END_MARKER}`)
    process.exit(1)
  }

  // Replace content between markers
  const before = claudeMd.substring(0, startIndex + START_MARKER.length)
  const after = claudeMd.substring(endIndex)

  const newContent = before + '\n\n' + tutorialContent + '\n' + after

  writeFileSync(CLAUDE_MD, newContent)

  console.log(`\nDone! CLAUDE.md updated.`)
  console.log(`Tutorial length: ${tutorialContent.length} characters`)
}

main()
