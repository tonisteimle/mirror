/**
 * Fix common design issues in mirror-docu.json
 * Run with: npx tsx scripts/fix-design-issues.ts
 */

import { readFileSync, writeFileSync } from 'fs'

const docuPath = './docs/mirror-docu.json'
const content = readFileSync(docuPath, 'utf-8')

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
  version: string
  generatedAt: string
  sections: Section[]
}

const docu: Documentation = JSON.parse(content)
let codeChanges = 0

function fixCode(code: string): string {
  let fixed = code

  // Fix bare colors at start of line: "Component #HEX" -> "Component background #HEX"
  // But not if already has background/bg/color
  const lines = fixed.split('\n')
  const fixedLines = lines.map(line => {
    // Skip comments
    if (line.trim().startsWith('//')) return line

    // Fix: "Component #HEX " at start of line (after optional indent)
    let newLine = line.replace(
      /^(\s*)([A-Z][a-zA-Z-]*)\s+#([0-9A-Fa-f]{3,8})(\s|,|$)/,
      (match, indent, comp, hex, after) => {
        // Don't fix if it's in a context where background is already set
        if (line.includes('background') || line.includes(' bg ')) return match
        return `${indent}${comp} background #${hex}${after}`
      }
    )

    // Fix: ", #HEX," pattern to ", background #HEX,"
    newLine = newLine.replace(
      /,\s*#([0-9A-Fa-f]{3,8}),/g,
      (match, hex) => {
        if (line.includes('background') || line.includes(' bg ') || line.includes('border')) return match
        return `, background #${hex},`
      }
    )

    // Fix: "Row gap" without horizontal
    newLine = newLine.replace(/^(\s*)Row\s+gap\s+/gm, '$1Row horizontal gap ')
    newLine = newLine.replace(/^(\s*)Row,\s*gap\s+/gm, '$1Row horizontal gap ')

    return newLine
  })

  return fixedLines.join('\n')
}

for (const section of docu.sections) {
  for (const subsection of section.subsections) {
    for (const content of subsection.content) {
      if ((content.type === 'code' || content.type === 'exercise') && content.code) {
        const before = content.code
        content.code = fixCode(content.code)
        if (content.code !== before) {
          codeChanges++
          console.log(`Fixed: ${section.title} > ${subsection.title}`)
        }
      }
    }
  }
}

writeFileSync(docuPath, JSON.stringify(docu, null, 2))
console.log(`\nTotal: Fixed ${codeChanges} code blocks`)
