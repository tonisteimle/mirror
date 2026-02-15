/**
 * Validate mirror-docu.json against reference.json
 * Run with: npx tsx scripts/validate-docu.ts
 */

import { readFileSync, writeFileSync } from 'fs'

// ============================================================================
// VALIDATION RULES (extracted from reference.json)
// ============================================================================

// Valid properties with their short forms
const VALID_PROPERTIES: Record<string, string | null> = {
  // Layout
  horizontal: 'hor', hor: null, vertical: 'ver', ver: null,
  gap: null, between: null, wrap: null, grow: null, fill: null,
  shrink: null, stacked: null, grid: null,

  // Alignment
  'horizontal-left': 'hor-l', 'hor-l': null,
  'horizontal-center': 'hor-cen', 'hor-cen': null,
  'horizontal-right': 'hor-r', 'hor-r': null,
  'vertical-top': 'ver-t', 'ver-t': null,
  'vertical-center': 'ver-cen', 'ver-cen': null,
  'vertical-bottom': 'ver-b', 'ver-b': null,
  center: 'cen', cen: null,

  // Sizing
  width: 'w', w: null, height: 'h', h: null,
  'min-width': 'minw', minw: null, 'max-width': 'maxw', maxw: null,
  'min-height': 'minh', minh: null, 'max-height': 'maxh', maxh: null,
  full: null,

  // Spacing
  padding: 'pad', pad: null, margin: 'mar', mar: null,

  // Colors
  background: 'bg', bg: null, color: 'col', col: null,
  'border-color': 'boc', boc: null,

  // Border
  border: 'bor', bor: null, radius: 'rad', rad: null,

  // Typography
  size: null, weight: null, font: null, line: null, align: null,
  italic: null, underline: null, uppercase: null, lowercase: null, truncate: null,

  // Visual
  opacity: 'opa', opa: null, shadow: null, cursor: null, z: null,
  hidden: null, visible: null, disabled: null,

  // Scroll
  scroll: null, 'scroll-ver': null, 'scroll-hor': null, 'scroll-both': null,
  snap: null, clip: null,

  // Icons
  icon: null,

  // Image
  fit: null, src: null, alt: null,

  // Input
  type: null, placeholder: null, rows: null, value: null,

  // Hover properties
  'hover-background': 'hover-bg', 'hover-bg': null,
  'hover-color': 'hover-col', 'hover-col': null,
  'hover-border-color': 'hover-boc', 'hover-boc': null,
  'hover-border': 'hover-bor', 'hover-bor': null,
  'hover-radius': 'hover-rad', 'hover-rad': null,
  'hover-opacity': 'hover-opa', 'hover-opa': null,
  'hover-scale': null,
}

// Valid events
const VALID_EVENTS = [
  'onclick', 'onclick-outside', 'onhover', 'onchange', 'oninput',
  'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onload'
]

// Valid key modifiers
const VALID_KEYS = [
  'escape', 'enter', 'tab', 'space',
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
  'backspace', 'delete', 'home', 'end'
]

// Valid actions
const VALID_ACTIONS = [
  'show', 'hide', 'toggle', 'open', 'close',
  'change', 'toggle-state', 'activate', 'deactivate', 'deactivate-siblings',
  'highlight', 'select', 'deselect', 'clear-selection', 'filter',
  'page', 'assign', 'focus', 'validate', 'reset', 'alert'
]

// Valid targets
const VALID_TARGETS = [
  'self', 'next', 'prev', 'first', 'last',
  'highlighted', 'selected', 'self-and-before', 'all', 'none', 'to'
]

// Valid animations
const VALID_ANIMATIONS = [
  'fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'none'
]

// Valid positions
const VALID_POSITIONS = ['below', 'above', 'left', 'right', 'center']

// System states
const SYSTEM_STATES = ['hover', 'focus', 'active', 'disabled']

// Behavior states
const BEHAVIOR_STATES = [
  'highlighted', 'selected', 'active', 'inactive',
  'expanded', 'collapsed', 'default', 'on', 'off'
]

// HTML Primitives
const HTML_PRIMITIVES = ['Input', 'Textarea', 'Image', 'Link', 'Button', 'Checkbox', 'Switch', 'Select']

// Known limitations
const KNOWN_ISSUES = {
  'cursor: not-allowed': 'Nur einwortige cursor-Werte funktionieren (pointer, move, grab)',
  'animate spin': 'animate spin/pulse/bounce ist NICHT implementiert',
  'animate pulse': 'animate spin/pulse/bounce ist NICHT implementiert',
  'animate bounce': 'animate spin/pulse/bounce ist NICHT implementiert',
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  line?: number
  lineContent?: string
}

interface CodeBlockValidation {
  section: string
  subsection: string
  blockIndex: number
  code: string
  issues: ValidationIssue[]
}

interface ValidationResult {
  totalBlocks: number
  blocksWithIssues: number
  totalIssues: number
  errors: number
  warnings: number
  infos: number
  blocks: CodeBlockValidation[]
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateCodeBlock(code: string, section: string, subsection: string, blockIndex: number): CodeBlockValidation {
  const issues: ValidationIssue[] = []
  const lines = code.split('\n')

  lines.forEach((line, lineNum) => {
    const trimmedLine = line.trim()

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//')) return

    // Check for known issues
    for (const [pattern, message] of Object.entries(KNOWN_ISSUES)) {
      if (line.includes(pattern)) {
        issues.push({
          type: 'warning',
          message: message,
          line: lineNum + 1,
          lineContent: trimmedLine
        })
      }
    }

    // Check for semicolon chaining (NOT supported)
    if (/onclick.*;\s*(show|hide|toggle|assign)/.test(line)) {
      issues.push({
        type: 'error',
        message: 'Semicolon-Verkettung nicht unterstützt. Verwende Kommas oder events Block.',
        line: lineNum + 1,
        lineContent: trimmedLine
      })
    }

    // Check for bare colors (without property name)
    const bareColorMatch = line.match(/^(\s*)([A-Z][a-zA-Z]*)\s+#[0-9A-Fa-f]{3,8}(?!\s*("|,|\s+[a-z]))/)
    if (bareColorMatch && !line.includes('background') && !line.includes('bg') && !line.includes('color') && !line.includes('col') && !line.includes('border-color') && !line.includes('boc')) {
      // This might be a dimension shorthand or other valid usage, need more context
      // For now, just note it
      const afterComponent = line.substring(bareColorMatch.index! + bareColorMatch[0].length).trim()
      if (afterComponent.startsWith('"') || afterComponent.match(/^[a-z]/)) {
        // Likely using color without property - valid only in some contexts
      }
    }

    // Check for color without property name pattern (Component #HEX without bg/background)
    if (/^[A-Z][a-zA-Z]*\s+#[0-9A-Fa-f]{3,8}\s/.test(trimmedLine)) {
      // Check if it's NOT followed by a color property
      if (!trimmedLine.includes('background') && !trimmedLine.includes('bg ') &&
          !trimmedLine.includes('color ') && !trimmedLine.includes('col ') &&
          !trimmedLine.includes('border-color') && !trimmedLine.includes('boc ')) {
        issues.push({
          type: 'warning',
          message: 'Farbe ohne Property-Name (background/bg) - funktioniert möglicherweise nicht.',
          line: lineNum + 1,
          lineContent: trimmedLine
        })
      }
    }

    // Check for text on separate line (should be inline)
    if (/^\s+"[^"]*"\s*$/.test(line) && lineNum > 0) {
      const prevLine = lines[lineNum - 1].trim()
      if (prevLine && !prevLine.endsWith(':') && !prevLine.startsWith('-') &&
          !prevLine.startsWith('//') && !prevLine.includes('state ')) {
        issues.push({
          type: 'info',
          message: 'Text auf separater Zeile - besser inline am Zeilenende.',
          line: lineNum + 1,
          lineContent: trimmedLine
        })
      }
    }

    // Check for events after children (wrong order)
    // This requires context tracking - skip for now

    // Check for valid events
    for (const event of VALID_EVENTS) {
      if (line.includes(event)) {
        // Event found - check if action follows
        const eventMatch = new RegExp(`${event}\\s+([a-z-]+)`).exec(line)
        if (eventMatch) {
          const action = eventMatch[1]
          // Check for debounce/delay
          if (action !== 'debounce' && action !== 'delay' &&
              !VALID_ACTIONS.includes(action) && !VALID_KEYS.includes(action)) {
            issues.push({
              type: 'warning',
              message: `Unbekannte Action oder Modifier: "${action}"`,
              line: lineNum + 1,
              lineContent: trimmedLine
            })
          }
        }
      }
    }

    // Check for state blocks
    const stateMatch = /^\s*state\s+([a-zA-Z-]+)/.exec(line)
    if (stateMatch) {
      const stateName = stateMatch[1]
      if (!SYSTEM_STATES.includes(stateName) && !BEHAVIOR_STATES.includes(stateName)) {
        // Custom state - valid but note it
        issues.push({
          type: 'info',
          message: `Custom state definiert: "${stateName}"`,
          line: lineNum + 1,
          lineContent: trimmedLine
        })
      }
    }

    // Check for JSON arrays in tokens (NOT supported)
    if (/\$[a-zA-Z_]+:\s*\[/.test(line)) {
      issues.push({
        type: 'error',
        message: 'JSON-Arrays in Tokens nicht unterstützt. Verwende Data Tab Syntax.',
        line: lineNum + 1,
        lineContent: trimmedLine
      })
    }

    // Check for validate target reference
    if (line.includes('validate') || line.includes('reset')) {
      // These are valid form actions
    }

    // Check for inline spans format
    if (line.includes('*') && line.includes(':') && line.includes('"')) {
      // Inline span syntax - should be *text*:style
      const spanMatch = /\*([^*]+)\*:([a-zA-Z$]+)/.exec(line)
      if (!spanMatch) {
        // Malformed inline span?
      }
    }
  })

  return {
    section,
    subsection,
    blockIndex,
    code,
    issues
  }
}

// ============================================================================
// MAIN
// ============================================================================

interface ContentBlock {
  type: string
  code?: string
  task?: string
}

interface Subsection {
  id: string
  title: string
  content: ContentBlock[]
}

interface Section {
  id: string
  title: string
  lead?: string
  subsections: Subsection[]
}

interface Documentation {
  title: string
  sections: Section[]
}

const docuPath = './docs/mirror-docu.json'
const json = readFileSync(docuPath, 'utf-8')
const docu: Documentation = JSON.parse(json)

const result: ValidationResult = {
  totalBlocks: 0,
  blocksWithIssues: 0,
  totalIssues: 0,
  errors: 0,
  warnings: 0,
  infos: 0,
  blocks: []
}

// Process all sections and subsections
for (const section of docu.sections) {
  for (const subsection of section.subsections) {
    let blockIndex = 0
    for (const content of subsection.content) {
      // Handle code blocks
      if (content.type === 'code' && content.code) {
        result.totalBlocks++
        const validation = validateCodeBlock(
          content.code,
          section.title,
          subsection.title,
          blockIndex
        )

        if (validation.issues.length > 0) {
          result.blocksWithIssues++
          result.totalIssues += validation.issues.length

          for (const issue of validation.issues) {
            if (issue.type === 'error') result.errors++
            if (issue.type === 'warning') result.warnings++
            if (issue.type === 'info') result.infos++
          }

          result.blocks.push(validation)
        }
        blockIndex++
      }

      // Handle exercise blocks
      if (content.type === 'exercise' && content.code) {
        result.totalBlocks++
        const validation = validateCodeBlock(
          content.code,
          section.title,
          `${subsection.title} (Exercise)`,
          blockIndex
        )

        if (validation.issues.length > 0) {
          result.blocksWithIssues++
          result.totalIssues += validation.issues.length

          for (const issue of validation.issues) {
            if (issue.type === 'error') result.errors++
            if (issue.type === 'warning') result.warnings++
            if (issue.type === 'info') result.infos++
          }

          result.blocks.push(validation)
        }
        blockIndex++
      }
    }
  }
}

// Output results
console.log('\n=== Mirror Documentation Validation ===\n')
console.log(`Total Code Blocks: ${result.totalBlocks}`)
console.log(`Blocks with Issues: ${result.blocksWithIssues}`)
console.log(`Total Issues: ${result.totalIssues}`)
console.log(`  Errors: ${result.errors}`)
console.log(`  Warnings: ${result.warnings}`)
console.log(`  Info: ${result.infos}`)

if (result.blocks.length > 0) {
  console.log('\n=== Issues by Section ===\n')

  let currentSection = ''
  for (const block of result.blocks) {
    if (block.section !== currentSection) {
      currentSection = block.section
      console.log(`\n## ${currentSection}`)
    }

    console.log(`\n### ${block.subsection} (Block ${block.blockIndex + 1})`)
    console.log('```')
    console.log(block.code)
    console.log('```')

    for (const issue of block.issues) {
      const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'
      console.log(`${icon} Line ${issue.line}: ${issue.message}`)
      if (issue.lineContent) {
        console.log(`   → ${issue.lineContent}`)
      }
    }
  }
}

// Save results to JSON
const outputPath = './docs/validation-results.json'
writeFileSync(outputPath, JSON.stringify(result, null, 2))
console.log(`\nResults saved to ${outputPath}`)
