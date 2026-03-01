/**
 * Generate Core Components documentation from master-schema.ts
 *
 * This script reads the Core Components definitions from the master schema
 * and generates documentation in multiple formats:
 * - Adds section to reference.json
 * - Updates CLAUDE.md
 *
 * Usage:
 *   npx tsx scripts/generate-core-components-docs.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import {
  MIRROR_SCHEMA,
  getAllCoreComponentNames,
  getCoreComponentsByCategory,
  getAllCoreTokens,
  type CoreComponentDefinition,
} from '../src/dsl/master-schema'

// =============================================================================
// REFERENCE.JSON GENERATION
// =============================================================================

interface ReferenceSubsection {
  id: string
  title: string
  description?: string
  syntax?: string[]
  examples?: string[]
  table?: { headers: string[]; rows: string[][] }
}

interface ReferenceSection {
  id: string
  title: string
  description: string
  subsections: ReferenceSubsection[]
}

function generateComponentSubsection(comp: CoreComponentDefinition): ReferenceSubsection {
  const syntax: string[] = []
  const examples: string[] = []

  // Add slot syntax
  if (comp.slots.length > 0) {
    const slotNames = comp.slots.map(s => s.name).join('; ')
    syntax.push(`${comp.name} ${slotNames}`)
  } else {
    syntax.push(comp.name)
  }

  // Add state syntax if any
  if (comp.states.length > 0) {
    const stateNames = comp.states.map(s => s.name).join(', ')
    syntax.push(`${comp.name} ${stateNames.split(', ')[0]}, ...  // Mit State`)
  }

  // Add examples from schema
  examples.push(...comp.examples)

  // Build description with slots and states
  let description = comp.description

  if (comp.slots.length > 0) {
    description += '\n\n**Slots:**\n' + comp.slots.map(s => `- \`${s.name}\`: ${s.description}`).join('\n')
  }

  if (comp.states.length > 0) {
    description += '\n\n**States:**\n' + comp.states.map(s => `- \`${s.name}\`: ${s.description}`).join('\n')
  }

  if (comp.tokens && comp.tokens.length > 0) {
    description += '\n\n**Tokens:** ' + comp.tokens.map(t => `\`${t}\``).join(', ')
  }

  return {
    id: comp.name.toLowerCase(),
    title: comp.name,
    description,
    syntax,
    examples,
  }
}

function generateCoreComponentsSection(): ReferenceSection {
  const navComponents = getCoreComponentsByCategory('navigation')

  const subsections: ReferenceSubsection[] = []

  // Overview subsection
  subsections.push({
    id: 'core-components-overview',
    title: 'Overview',
    description: `Core Components sind eingebaute Komponenten-Templates, die Teil der Sprache sind.
Sie können direkt verwendet werden ohne Definition.
User können sie mit \`as\` instanziieren und mit \`from\` erweitern.
Theming erfolgt über Tokens.`,
    syntax: [
      'Nav                            // Direkt verwenden',
      'myNav as Nav                   // Als eigene Komponente',
      'BrandNav from Nav: bg #333     // Erweitern',
    ],
    examples: [
      `Nav
  NavItem Icon "home"; Label "Dashboard"
  NavItem active, Icon "settings"; Label "Settings"`,
    ],
  })

  // Navigation Components
  for (const comp of navComponents) {
    subsections.push(generateComponentSubsection(comp))
  }

  // Core Tokens subsection
  const tokens = getAllCoreTokens()
  const tokenRows: string[][] = []

  for (const [name, def] of Object.entries(tokens)) {
    tokenRows.push([`\`${name}\``, def.value, def.description])
  }

  subsections.push({
    id: 'core-tokens',
    title: 'Core Tokens',
    description: 'Tokens für Theming der Core Components. User kann diese überschreiben.',
    table: {
      headers: ['Token', 'Default', 'Beschreibung'],
      rows: tokenRows,
    },
    examples: [
      `// User überschreibt Tokens
$nav.bg: #1a1a2e
$nav.hover: #16213e
$nav.active: #0f3460
$nav.text: #e0e0e0

// Components nutzen automatisch die neuen Werte
Nav
  NavItem Icon "home"; Label "Home"`,
    ],
  })

  return {
    id: 'core-components',
    title: 'Core Components',
    description: 'Eingebaute Komponenten-Templates die Teil der Sprache sind. Navigation, Forms, Data, Feedback.',
    subsections,
  }
}

// =============================================================================
// CLAUDE.MD GENERATION
// =============================================================================

function generateClaudeMdSection(): string {
  const navComponents = getCoreComponentsByCategory('navigation')
  const tokens = getAllCoreTokens()

  let md = `## Core Components

Eingebaute Komponenten-Templates die Teil der Sprache sind.

### Navigation Components

| Component | Description | Slots | States |
|-----------|-------------|-------|--------|
`

  for (const comp of navComponents) {
    const slots = comp.slots.map(s => s.name).join(', ') || '-'
    const states = comp.states.map(s => s.name).join(', ') || '-'
    md += `| \`${comp.name}\` | ${comp.description.split('.')[0]} | ${slots} | ${states} |\n`
  }

  md += `
### Usage

\`\`\`mirror
// Direkt verwenden
Nav
  NavItem Icon "home"; Label "Dashboard"
  NavItem active, Icon "settings"; Label "Settings"

// Als eigene Komponente instanziieren
myNav as Nav, width 280

// Erweitern mit from
BrandNavItem from NavItem:
  Label col #3B82F6
\`\`\`

### Core Tokens

| Token | Default | Description |
|-------|---------|-------------|
`

  for (const [name, def] of Object.entries(tokens)) {
    if (name.startsWith('$nav.')) {
      md += `| \`${name}\` | ${def.value} | ${def.description} |\n`
    }
  }

  md += `
### Token Theming

\`\`\`mirror
// User überschreibt Tokens
$nav.bg: #1a1a2e
$nav.hover: #16213e

// Components nutzen automatisch die neuen Werte
Nav
  NavItem Icon "home"; Label "Home"
\`\`\`
`

  return md
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('Generating Core Components documentation...\n')

  // 1. Generate reference.json section
  const coreSection = generateCoreComponentsSection()
  console.log(`Generated section: ${coreSection.title}`)
  console.log(`  ${coreSection.subsections.length} subsections`)

  // Read existing reference.json
  const referencePath = './docs/reference.json'
  const reference = JSON.parse(readFileSync(referencePath, 'utf-8'))

  // Check if core-components section already exists
  const existingIndex = reference.sections.findIndex((s: ReferenceSection) => s.id === 'core-components')

  if (existingIndex >= 0) {
    // Replace existing section
    reference.sections[existingIndex] = coreSection
    console.log('  Replaced existing section')
  } else {
    // Insert after "komponenten" section or at position 2
    const insertIndex = reference.sections.findIndex((s: ReferenceSection) => s.id === 'komponenten')
    if (insertIndex >= 0) {
      reference.sections.splice(insertIndex + 1, 0, coreSection)
    } else {
      reference.sections.splice(2, 0, coreSection)
    }
    console.log('  Added new section')
  }

  // Update metadata
  reference.generatedAt = new Date().toISOString()
  reference.generatedFrom = [
    ...new Set([...(reference.generatedFrom || []), 'src/dsl/master-schema.ts']),
  ]

  // Write updated reference.json
  writeFileSync(referencePath, JSON.stringify(reference, null, 2))
  console.log(`\nUpdated ${referencePath}`)

  // 2. Generate CLAUDE.md section
  const claudeSection = generateClaudeMdSection()
  console.log(`\nGenerated CLAUDE.md section (${claudeSection.split('\n').length} lines)`)

  // Read existing CLAUDE.md
  const claudePath = './CLAUDE.md'
  let claudeMd = readFileSync(claudePath, 'utf-8')

  // Check if Core Components section exists
  const coreStartMarker = '## Core Components'
  const nextSectionPattern = /\n## (?!Core Components)/

  if (claudeMd.includes(coreStartMarker)) {
    // Replace existing section
    const startIndex = claudeMd.indexOf(coreStartMarker)
    const afterStart = claudeMd.slice(startIndex + coreStartMarker.length)
    const nextMatch = afterStart.match(nextSectionPattern)
    const endIndex = nextMatch ? startIndex + coreStartMarker.length + nextMatch.index! : claudeMd.length

    claudeMd = claudeMd.slice(0, startIndex) + claudeSection + claudeMd.slice(endIndex)
    console.log('  Replaced existing section in CLAUDE.md')
  } else {
    // Insert before Quick Reference
    const quickRefIndex = claudeMd.indexOf('## Quick Reference')
    if (quickRefIndex >= 0) {
      claudeMd = claudeMd.slice(0, quickRefIndex) + claudeSection + '\n' + claudeMd.slice(quickRefIndex)
    } else {
      claudeMd += '\n' + claudeSection
    }
    console.log('  Added new section to CLAUDE.md')
  }

  writeFileSync(claudePath, claudeMd)
  console.log(`Updated ${claudePath}`)

  console.log('\n✅ Core Components documentation generated!')
}

main()
