#!/usr/bin/env npx tsx
/**
 * Tutorial Test Extractor
 *
 * Extracts Mirror DSL examples from tutorial HTML files and generates JSON
 * for test generation.
 *
 * Usage: npm run tutorial:extract
 * Output: tools/tutorial-extracted.json
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Types
// =============================================================================

interface ExtractedFeatures {
  hasToggle: boolean
  hasExclusive: boolean
  hasHover: boolean
  hasAnimation: boolean
  hasChart: boolean
  hasZag: boolean
  hasData: boolean
  hasEach: boolean
  hasIf: boolean
  hasTokens: boolean
  hasComponent: boolean
  primitives: string[]
  properties: string[]
  zagComponents: string[]
}

interface ExtractedExample {
  id: string // "01-elemente-01"
  chapter: string // "01-elemente"
  chapterTitle: string // "Elemente & Hierarchie"
  section: string // Section heading
  index: number // Position within chapter (1-based)
  code: string // Mirror DSL Code
  codeHash: string // SHA256 for change detection
  lineCount: number // Number of lines
  features: ExtractedFeatures
}

interface ExtractionResult {
  extractedAt: string
  totalExamples: number
  chapters: {
    file: string
    title: string
    exampleCount: number
  }[]
  examples: ExtractedExample[]
}

// =============================================================================
// Constants
// =============================================================================

const TUTORIAL_DIR = path.join(__dirname, '../docs/tutorial')
const OUTPUT_FILE = path.join(__dirname, 'tutorial-extracted.json')

// Known primitives from DSL
const PRIMITIVES = [
  'Frame',
  'Box',
  'Text',
  'Button',
  'Input',
  'Textarea',
  'Label',
  'Image',
  'Img',
  'Icon',
  'Link',
  'Slot',
  'Divider',
  'Spacer',
  'Header',
  'Nav',
  'Main',
  'Section',
  'Article',
  'Aside',
  'Footer',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]

// Known Zag components
const ZAG_COMPONENTS = [
  'Dialog',
  'Tooltip',
  'Tabs',
  'Tab',
  'Select',
  'Option',
  'Checkbox',
  'Switch',
  'RadioGroup',
  'RadioItem',
  'Slider',
  'DatePicker',
  'Menu',
  'MenuItem',
  'Accordion',
  'AccordionItem',
  'Popover',
  'Toast',
  'Progress',
  'Pagination',
  'Breadcrumb',
  'Avatar',
  'Badge',
  'Carousel',
  'Collapsible',
  'ContextMenu',
  'Drawer',
  'DropdownMenu',
  'HoverCard',
  'Menubar',
  'NavigationMenu',
  'Sheet',
  'Sidebar',
  'Sidenav',
  'SideNav',
  'NavItem',
  'Table',
  'Row',
  'Column',
]

// Known properties
const PROPERTIES = [
  'bg',
  'col',
  'pad',
  'mar',
  'w',
  'h',
  'rad',
  'fs',
  'weight',
  'gap',
  'hor',
  'ver',
  'center',
  'spread',
  'wrap',
  'grid',
  'stacked',
  'grow',
  'shrink',
  'tl',
  'tc',
  'tr',
  'cl',
  'cr',
  'bl',
  'bc',
  'br',
  'minw',
  'maxw',
  'minh',
  'maxh',
  'pad-x',
  'pad-y',
  'pad-t',
  'pad-r',
  'pad-b',
  'pad-l',
  'mar-x',
  'mar-y',
  'mar-t',
  'mar-r',
  'mar-b',
  'mar-l',
  'bor',
  'boc',
  'shadow',
  'opacity',
  'blur',
  'cursor',
  'hidden',
  'visible',
  'scroll',
  'clip',
  'ic',
  'is',
  'iw',
  'fill',
  'italic',
  'underline',
  'uppercase',
  'truncate',
  'font',
  'line',
  'x',
  'y',
  'z',
  'absolute',
  'fixed',
  'relative',
  'rotate',
  'scale',
  'anim',
  'ver-center',
  'hor-center',
  'src',
  'href',
  'placeholder',
  'checked',
  'disabled',
  'name',
  'value',
  'type',
  'aspect',
]

// =============================================================================
// HTML Parsing Helpers
// =============================================================================

function extractTitle(html: string): string {
  const match = html.match(/<title>Mirror\s*[–-]\s*(.+?)<\/title>/i)
  return match ? match[1].trim() : 'Unknown'
}

function extractPlaygrounds(html: string): string[] {
  const playgrounds: string[] = []
  const regex =
    /<div class="playground"[^>]*data-playground[^>]*>[\s\S]*?<textarea>([\s\S]*?)<\/textarea>/gi

  let match
  while ((match = regex.exec(html)) !== null) {
    const code = decodeHtmlEntities(match[1].trim())
    if (code) {
      playgrounds.push(code)
    }
  }

  return playgrounds
}

function extractSections(html: string): Map<number, string> {
  const sections = new Map<number, string>()
  const regex = /<section>[\s\S]*?<h2>([^<]+)<\/h2>[\s\S]*?(?:<\/section>|$)/gi

  let match
  let playgroundIndex = 0
  const lastPos = 0

  // First pass: find all section headings and their positions
  const sectionPositions: Array<{ heading: string; start: number; end: number }> = []
  while ((match = regex.exec(html)) !== null) {
    if (sectionPositions.length > 0) {
      sectionPositions[sectionPositions.length - 1].end = match.index
    }
    sectionPositions.push({
      heading: match[1].trim(),
      start: match.index,
      end: html.length,
    })
  }

  // Second pass: count playgrounds before each section
  const playgroundRegex = /<div class="playground"[^>]*data-playground/gi
  const currentSection = 0
  let playgroundMatch

  while ((playgroundMatch = playgroundRegex.exec(html)) !== null) {
    // Find which section this playground belongs to
    for (let i = sectionPositions.length - 1; i >= 0; i--) {
      if (playgroundMatch.index >= sectionPositions[i].start) {
        sections.set(playgroundIndex, sectionPositions[i].heading)
        break
      }
    }
    if (!sections.has(playgroundIndex)) {
      sections.set(playgroundIndex, 'Introduction')
    }
    playgroundIndex++
  }

  return sections
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// =============================================================================
// Feature Detection
// =============================================================================

function analyzeCode(code: string): ExtractedFeatures {
  const lines = code.split('\n')
  const features: ExtractedFeatures = {
    hasToggle: false,
    hasExclusive: false,
    hasHover: false,
    hasAnimation: false,
    hasChart: false,
    hasZag: false,
    hasData: false,
    hasEach: false,
    hasIf: false,
    hasTokens: false,
    hasComponent: false,
    primitives: [],
    properties: [],
    zagComponents: [],
  }

  // Check for toggle() and exclusive()
  features.hasToggle = /toggle\s*\(/.test(code)
  features.hasExclusive = /exclusive\s*\(/.test(code)

  // Check for hover state
  features.hasHover = /^\s*hover\s*:/m.test(code) || /hover\s+\d+(\.\d+)?s/m.test(code)

  // Check for animations
  features.hasAnimation = /\banim\s+\w+/.test(code)

  // Check for charts
  features.hasChart = /\b(Line|Bar|Pie|Donut|Area)\s+\$/.test(code)

  // Check for data features
  features.hasData = /^\s*\w+:\s*$/m.test(code) || /\$\w+/.test(code)
  features.hasEach = /\beach\s+\w+\s+in\s+\$/.test(code)
  features.hasIf = /^\s*if\s+/m.test(code)

  // Check for tokens
  features.hasTokens = /^\s*\w+\.\w+:\s*[^:]+$/m.test(code) || /\bg\s+\$\w+/.test(code)

  // Check for component definitions (Name: or Name as Base:)
  // Matches "Name: properties" at the start of a line (with capital letter start)
  const hasComponentDef = /^\s*[A-Z]\w*\s*:/m.test(code)
  const hasInheritance = /^\s*[A-Z]\w*\s+as\s+[A-Z]\w*\s*:/m.test(code)
  features.hasComponent = hasComponentDef || hasInheritance

  // Find used primitives
  const usedPrimitives = new Set<string>()
  for (const primitive of PRIMITIVES) {
    const regex = new RegExp(`\\b${primitive}\\b`, 'g')
    if (regex.test(code)) {
      usedPrimitives.add(primitive)
    }
  }
  features.primitives = Array.from(usedPrimitives)

  // Find used Zag components - only at line start (as primitives, not in text)
  const usedZag = new Set<string>()
  for (const comp of ZAG_COMPONENTS) {
    // Match at start of line, possibly indented, followed by space or newline
    // This avoids matching "Sidebar" in Text "Sidebar"
    const regex = new RegExp(`^\\s*${comp}(?:\\s|$|\\n)`, 'm')
    if (regex.test(code)) {
      usedZag.add(comp)
      features.hasZag = true
    }
  }
  features.zagComponents = Array.from(usedZag)

  // Find used properties
  const usedProps = new Set<string>()
  for (const prop of PROPERTIES) {
    // Property patterns: prop value, prop, prop-x
    const regex = new RegExp(`\\b${prop}\\b`, 'g')
    if (regex.test(code)) {
      usedProps.add(prop)
    }
  }
  features.properties = Array.from(usedProps)

  return features
}

// =============================================================================
// Main Extraction
// =============================================================================

function extractFromFile(filePath: string, chapterIndex: number): ExtractedExample[] {
  const html = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath, '.html')
  const title = extractTitle(html)
  const playgrounds = extractPlaygrounds(html)
  const sections = extractSections(html)

  const examples: ExtractedExample[] = []

  playgrounds.forEach((code, index) => {
    const id = `${fileName}-${String(index + 1).padStart(2, '0')}`
    const section = sections.get(index) || 'General'
    const hash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 12)

    examples.push({
      id,
      chapter: fileName,
      chapterTitle: title,
      section,
      index: index + 1,
      code,
      codeHash: hash,
      lineCount: code.split('\n').length,
      features: analyzeCode(code),
    })
  })

  return examples
}

function extract(): ExtractionResult {
  // Find all tutorial HTML files
  const files = fs
    .readdirSync(TUTORIAL_DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => /^\d{2}-/.test(f)) // Only numbered chapters
    .sort()

  console.log(`Found ${files.length} tutorial chapters`)

  const allExamples: ExtractedExample[] = []
  const chapters: ExtractionResult['chapters'] = []

  files.forEach((file, index) => {
    const filePath = path.join(TUTORIAL_DIR, file)
    const examples = extractFromFile(filePath, index)

    allExamples.push(...examples)
    chapters.push({
      file,
      title: examples[0]?.chapterTitle || 'Unknown',
      exampleCount: examples.length,
    })

    console.log(`  ${file}: ${examples.length} examples`)
  })

  return {
    extractedAt: new Date().toISOString(),
    totalExamples: allExamples.length,
    chapters,
    examples: allExamples,
  }
}

// =============================================================================
// CLI Entry Point
// =============================================================================

function main() {
  console.log('🔍 Extracting tutorial examples...\n')

  const result = extract()

  // Write JSON output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))

  console.log(
    `\n✅ Extracted ${result.totalExamples} examples from ${result.chapters.length} chapters`
  )
  console.log(`   Output: ${OUTPUT_FILE}`)

  // Summary statistics
  const withToggle = result.examples.filter(e => e.features.hasToggle).length
  const withHover = result.examples.filter(e => e.features.hasHover).length
  const withZag = result.examples.filter(e => e.features.hasZag).length
  const withAnimation = result.examples.filter(e => e.features.hasAnimation).length
  const withChart = result.examples.filter(e => e.features.hasChart).length
  const withData = result.examples.filter(e => e.features.hasData).length

  console.log(`\n📊 Feature Summary:`)
  console.log(`   Toggle/Exclusive: ${withToggle}`)
  console.log(`   Hover states: ${withHover}`)
  console.log(`   Zag components: ${withZag}`)
  console.log(`   Animations: ${withAnimation}`)
  console.log(`   Charts: ${withChart}`)
  console.log(`   Data binding: ${withData}`)
}

main()
