/**
 * Analyze code examples for design quality
 * Run with: npx tsx scripts/analyze-design-quality.ts
 */

import { readFileSync } from 'fs'

interface DesignIssue {
  type: 'missing-gap' | 'missing-layout' | 'missing-padding' | 'poor-color' | 'missing-radius' | 'bare-color' | 'no-hover'
  message: string
  suggestion?: string
}

interface CodeAnalysis {
  section: string
  subsection: string
  blockIndex: number
  code: string
  issues: DesignIssue[]
}

// Design quality checks
function analyzeDesignQuality(code: string): DesignIssue[] {
  const issues: DesignIssue[] = []
  const lines = code.split('\n')

  // Check for containers without gap
  const hasMultipleChildren = lines.filter(l => l.match(/^\s{2}[A-Z]/) && !l.includes('state ')).length > 1
  const hasGap = code.includes('gap ')

  if (hasMultipleChildren && !hasGap) {
    issues.push({
      type: 'missing-gap',
      message: 'Container mit mehreren Kindern ohne gap',
      suggestion: 'Füge gap 8 oder gap 12 hinzu'
    })
  }

  // Check for Row/horizontal containers without explicit horizontal
  lines.forEach((line, i) => {
    if (line.match(/^Row\s/) && !line.includes('horizontal') && !line.includes('hor')) {
      issues.push({
        type: 'missing-layout',
        message: `Row ohne explicit horizontal (Zeile ${i + 1})`,
        suggestion: 'Row horizontal gap 12'
      })
    }
  })

  // Check for bare colors (Component #HEX without background/bg)
  lines.forEach((line, i) => {
    // Match: ComponentName #HEX where there's no background/bg before the color
    if (line.match(/^[A-Z][a-zA-Z]*\s+#[0-9A-Fa-f]{3,8}/) &&
        !line.includes('background') && !line.includes('bg ') &&
        !line.includes('color ') && !line.includes('col ')) {
      issues.push({
        type: 'bare-color',
        message: `Farbe ohne Property-Name (Zeile ${i + 1})`,
        suggestion: 'Verwende background #HEX oder color #HEX'
      })
    }
    // Also check inside lines
    if (line.match(/,\s*#[0-9A-Fa-f]{3,8}/) &&
        !line.includes('background') && !line.includes('bg ') &&
        !line.includes('border')) {
      issues.push({
        type: 'bare-color',
        message: `Komma-separierte Farbe ohne Property (Zeile ${i + 1})`,
        suggestion: 'Verwende background #HEX'
      })
    }
  })

  // Check for clickable elements without hover state
  const hasOnclick = code.includes('onclick')
  const hasHover = code.includes('hover') || code.includes('hover-')
  const hasCursor = code.includes('cursor pointer')

  if (hasOnclick && !hasHover && !hasCursor) {
    issues.push({
      type: 'no-hover',
      message: 'Klickbares Element ohne hover-Effekt oder cursor pointer',
      suggestion: 'Füge cursor pointer oder hover-background hinzu'
    })
  }

  // Check for buttons without sufficient padding
  lines.forEach((line, i) => {
    if (line.match(/Button/) && !line.includes('padding') && !line.includes('pad ') && !line.includes(':')) {
      // Only flag if it's not a definition and not inheriting
      if (!code.includes('Button:') || lines.indexOf(line) < code.indexOf('Button:')) {
        issues.push({
          type: 'missing-padding',
          message: `Button ohne padding (Zeile ${i + 1})`,
          suggestion: 'Button padding 8 16 oder padding 12 24'
        })
      }
    }
  })

  // Check for cards/panels without radius
  lines.forEach((line, i) => {
    if ((line.match(/Card|Panel|Box|Tile/) && line.includes('background')) &&
        !line.includes('radius') && !line.includes('rad ')) {
      issues.push({
        type: 'missing-radius',
        message: `Container mit Hintergrund ohne radius (Zeile ${i + 1})`,
        suggestion: 'Füge radius 8 oder radius 12 hinzu'
      })
    }
  })

  return issues
}

// Load and analyze
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

const analyses: CodeAnalysis[] = []
let totalBlocks = 0
let blocksWithIssues = 0

for (const section of docu.sections) {
  for (const subsection of section.subsections) {
    let blockIndex = 0
    for (const content of subsection.content) {
      if ((content.type === 'code' || content.type === 'exercise') && content.code) {
        totalBlocks++
        const issues = analyzeDesignQuality(content.code)

        if (issues.length > 0) {
          blocksWithIssues++
          analyses.push({
            section: section.title,
            subsection: subsection.title,
            blockIndex,
            code: content.code,
            issues
          })
        }
        blockIndex++
      }
    }
  }
}

// Output results
console.log('\n=== Design Quality Analysis ===\n')
console.log(`Total Code Blocks: ${totalBlocks}`)
console.log(`Blocks with Design Issues: ${blocksWithIssues}`)

// Count by issue type
const issueCounts: Record<string, number> = {}
for (const analysis of analyses) {
  for (const issue of analysis.issues) {
    issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1
  }
}

console.log('\nIssues by Type:')
for (const [type, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`)
}

console.log('\n=== Details ===\n')

let currentSection = ''
for (const analysis of analyses) {
  if (analysis.section !== currentSection) {
    currentSection = analysis.section
    console.log(`\n## ${currentSection}`)
  }

  console.log(`\n### ${analysis.subsection} (Block ${analysis.blockIndex + 1})`)
  console.log('```')
  console.log(analysis.code.substring(0, 200) + (analysis.code.length > 200 ? '...' : ''))
  console.log('```')

  for (const issue of analysis.issues) {
    console.log(`⚠️ ${issue.message}`)
    if (issue.suggestion) {
      console.log(`   → ${issue.suggestion}`)
    }
  }
}
