#!/usr/bin/env npx tsx
/**
 * Schema-Driven Documentation Generator
 *
 * Generiert Dokumentation aus src/schema/dsl.ts (Single Source of Truth)
 *
 * Usage:
 *   npm run generate        # Generiert und aktualisiert Dateien
 *   npm run generate:check  # Prüft ob Dateien aktuell sind (für CI)
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { DSL, SCHEMA, type PropertyDef } from '../compiler/schema/dsl'
import { ZAG_PRIMITIVES } from '../compiler/schema/zag-primitives'
import { ZAG_PROP_METADATA, type ZagPropMeta } from '../compiler/schema/zag-prop-metadata'
import { COMPOUND_PRIMITIVES } from '../compiler/schema/compound-primitives'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')

// ============================================================================
// Markdown Generators
// ============================================================================

function generatePrimitivesTable(): string {
  const lines = ['### Primitives', '', '| Primitive | HTML | Aliases |', '|-----------|------|---------|']

  for (const [name, def] of Object.entries(DSL.primitives)) {
    const aliases = def.aliases?.join(', ') || '-'
    lines.push(`| ${name} | \`<${def.html}>\` | ${aliases} |`)
  }

  return lines.join('\n')
}

function generateZagPrimitivesTable(): string {
  const lines = [
    '### Zag Primitives (Behavior Components)',
    '',
    '> Note: Select, Checkbox, Radio are now Zag components with full accessibility and keyboard navigation.',
    '',
    '| Component | Machine | Slots | Description |',
    '|-----------|---------|-------|-------------|'
  ]

  // Group by category
  const categories: Record<string, string[]> = {
    'Selection & Dropdowns': ['Select', 'Combobox', 'Listbox'],
    'Menus': ['Menu', 'ContextMenu', 'NestedMenu', 'NavigationMenu'],
    'Form Controls': ['Checkbox', 'Switch', 'RadioGroup', 'Slider', 'RangeSlider', 'AngleSlider', 'NumberInput', 'PinInput', 'PasswordInput', 'TagsInput', 'Editable', 'RatingGroup', 'SegmentedControl', 'ToggleGroup'],
    'Date & Time': ['DatePicker', 'DateInput', 'Timer'],
    'Overlays & Modals': ['Dialog', 'Tooltip', 'Popover', 'HoverCard', 'FloatingPanel', 'Tour', 'Presence'],
    'Navigation': ['Tabs', 'Accordion', 'Collapsible', 'Steps', 'Pagination', 'TreeView'],
    'Media & Files': ['Avatar', 'FileUpload', 'ImageCropper', 'Carousel', 'SignaturePad'],
    'Feedback & Status': ['Progress', 'CircularProgress', 'Toast', 'Marquee'],
    'Utility': ['Clipboard', 'QRCode', 'ScrollArea', 'Splitter'],
  }

  for (const [category, components] of Object.entries(categories)) {
    lines.push(`| **${category}** | | | |`)

    for (const compName of components) {
      const def = ZAG_PRIMITIVES[compName]
      if (!def) continue

      const slots = def.slots || []
      const slotPreview = slots.slice(0, 3).join(', ')
      const slotCount = slots.length > 3 ? ` +${slots.length - 3}` : ''

      lines.push(`| ${compName} | ${def.machine} | ${slotPreview}${slotCount} | ${def.description || ''} |`)
    }
  }

  return lines.join('\n')
}

function generateCompoundPrimitivesTable(): string {
  const lines = [
    '### Compound Primitives (Layout Components)',
    '',
    '> Pre-built layout components for rapid prototyping. Fully customizable.',
    '',
    '| Component | Slots | Nested Slots | Description |',
    '|-----------|-------|--------------|-------------|'
  ]

  for (const [name, def] of Object.entries(COMPOUND_PRIMITIVES)) {
    const slots = def.slots.join(', ')

    // Collect all nested slots
    const nestedSlots: string[] = []
    if (def.nestedSlots) {
      for (const children of Object.values(def.nestedSlots)) {
        nestedSlots.push(...children)
      }
    }
    const nestedPreview = [...new Set(nestedSlots)].slice(0, 4).join(', ')
    const nestedCount = nestedSlots.length > 4 ? ` +${nestedSlots.length - 4}` : ''

    lines.push(`| ${name} | ${slots} | ${nestedPreview}${nestedCount} | ${def.description || ''} |`)
  }

  return lines.join('\n')
}

function generatePropertiesTable(): string {
  const lines = ['### Properties', '', '| Property | Aliases | Werte |', '|----------|---------|-------|']

  for (const prop of Object.values(SCHEMA)) {
    const aliases = prop.aliases.length > 0 ? prop.aliases.join(', ') : '-'
    const values: string[] = []

    // Keywords
    if (prop.keywords) {
      const keywords = Object.keys(prop.keywords).filter(k => k !== '_standalone')
      if (keywords.length > 0) {
        values.push(...keywords)
      }
      if (prop.keywords._standalone) {
        values.push('*(standalone)*')
      }
    }

    // Numeric
    if (prop.numeric) {
      values.push('<number>')
    }

    // Color
    if (prop.color) {
      values.push('<color>')
    }

    // Token
    if (prop.token) {
      values.push('$token')
    }

    lines.push(`| ${prop.name} | ${aliases} | ${values.join(', ') || '-'} |`)
  }

  return lines.join('\n')
}

function generateEventsTable(): string {
  const lines = ['### Events', '', '| Event | DOM | Key? |', '|-------|-----|------|']

  for (const [name, def] of Object.entries(DSL.events)) {
    const key = def.acceptsKey ? '✓' : '-'
    lines.push(`| ${name} | ${def.dom} | ${key} |`)
  }

  return lines.join('\n')
}

function generateActionsTable(): string {
  const lines = ['### Actions', '', '| Action | Targets |', '|--------|---------|']

  for (const [name, def] of Object.entries(DSL.actions)) {
    const targets = def.targets?.join(', ') || '-'
    lines.push(`| ${name} | ${targets} |`)
  }

  return lines.join('\n')
}

function generateStatesSection(): string {
  const system = Object.entries(DSL.states)
    .filter(([_, def]) => def.system)
    .map(([name]) => name)

  const custom = Object.entries(DSL.states)
    .filter(([_, def]) => !def.system)
    .map(([name]) => name)

  return [
    '### States',
    '',
    `**System:** ${system.join(', ')}`,
    '',
    `**Custom:** ${custom.join(', ')}`,
  ].join('\n')
}

function generateKeysSection(): string {
  return [
    '### Keyboard Keys',
    '',
    DSL.keys.join(', '),
  ].join('\n')
}

function generateZagPropertiesSection(): string {
  const lines = [
    '### Zag Behavior Properties',
    '',
    '> Component-specific behavior properties for Zag components.',
    '',
  ]

  // Count total properties
  let totalProps = 0
  for (const props of Object.values(ZAG_PROP_METADATA)) {
    totalProps += Object.keys(props).length
  }
  lines.push(`*${Object.keys(ZAG_PROP_METADATA).length} components with ${totalProps} behavior properties total.*`)
  lines.push('')

  // Generate property summary by type
  const booleanProps = new Set<string>()
  const enumProps = new Set<string>()
  const numericProps = new Set<string>()
  const stringProps = new Set<string>()

  for (const [component, props] of Object.entries(ZAG_PROP_METADATA)) {
    for (const [propName, meta] of Object.entries(props)) {
      switch (meta.type) {
        case 'boolean':
          booleanProps.add(propName)
          break
        case 'enum':
          enumProps.add(propName)
          break
        case 'number':
          numericProps.add(propName)
          break
        case 'string':
          stringProps.add(propName)
          break
      }
    }
  }

  lines.push('**Boolean:** ' + Array.from(booleanProps).sort().join(', '))
  lines.push('')
  lines.push('**Enum:** ' + Array.from(enumProps).sort().join(', '))
  lines.push('')
  lines.push('**Number:** ' + Array.from(numericProps).sort().join(', '))
  lines.push('')
  lines.push('**String:** ' + Array.from(stringProps).sort().join(', '))

  return lines.join('\n')
}

function generateFullReference(): string {
  return [
    '## DSL Reference (auto-generated)',
    '',
    generatePrimitivesTable(),
    '',
    generateZagPrimitivesTable(),
    '',
    generateCompoundPrimitivesTable(),
    '',
    generatePropertiesTable(),
    '',
    generateZagPropertiesSection(),
    '',
    generateEventsTable(),
    '',
    generateActionsTable(),
    '',
    generateStatesSection(),
    '',
    generateKeysSection(),
  ].join('\n')
}

// ============================================================================
// File Updaters
// ============================================================================

function updateClaudeMd(content: string): boolean {
  const claudeMdPath = path.join(ROOT, 'CLAUDE.md')
  const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8')

  const startMarker = '<!-- GENERATED:DSL-PROPERTIES:START -->'
  const endMarker = '<!-- GENERATED:DSL-PROPERTIES:END -->'

  const startIdx = claudeMd.indexOf(startMarker)
  const endIdx = claudeMd.indexOf(endMarker)

  if (startIdx === -1 || endIdx === -1) {
    console.error('ERROR: GENERATED markers not found in CLAUDE.md')
    return false
  }

  const newContent = [
    claudeMd.substring(0, startIdx + startMarker.length),
    '',
    content,
    '',
    claudeMd.substring(endIdx),
  ].join('\n')

  if (claudeMd === newContent) {
    console.log('✓ CLAUDE.md is up to date')
    return true
  }

  fs.writeFileSync(claudeMdPath, newContent)
  console.log('✓ CLAUDE.md updated')
  return true
}

function updateGeneratedDocs(content: string): boolean {
  const docsDir = path.join(ROOT, 'docs', 'generated')

  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true })
  }

  const propsPath = path.join(docsDir, 'dsl-reference.md')
  const header = [
    '# DSL Reference',
    '',
    '> Auto-generated from `src/schema/dsl.ts`. Do not edit manually.',
    '> Run `npm run generate` to update.',
    '',
  ].join('\n')

  const fullContent = header + content

  if (fs.existsSync(propsPath)) {
    const existing = fs.readFileSync(propsPath, 'utf-8')
    if (existing === fullContent) {
      console.log('✓ docs/generated/dsl-reference.md is up to date')
      return true
    }
  }

  fs.writeFileSync(propsPath, fullContent)
  console.log('✓ docs/generated/dsl-reference.md updated')
  return true
}

// ============================================================================
// Statistics
// ============================================================================

function printStats(): void {
  const primitiveCount = Object.keys(DSL.primitives).length
  const zagCount = Object.keys(ZAG_PRIMITIVES).length
  const compoundCount = Object.keys(COMPOUND_PRIMITIVES).length
  const propertyCount = Object.keys(SCHEMA).length
  const aliasCount = Object.values(SCHEMA).reduce((sum, p) => sum + p.aliases.length, 0)
  const eventCount = Object.keys(DSL.events).length
  const actionCount = Object.keys(DSL.actions).length
  const stateCount = Object.keys(DSL.states).length
  const keyCount = DSL.keys.length

  // Zag behavior properties
  const zagComponentsWithProps = Object.keys(ZAG_PROP_METADATA).length
  let zagPropCount = 0
  for (const props of Object.values(ZAG_PROP_METADATA)) {
    zagPropCount += Object.keys(props).length
  }

  console.log('')
  console.log('Schema Statistics:')
  console.log(`  Primitives:      ${primitiveCount}`)
  console.log(`  Zag Components:  ${zagCount}`)
  console.log(`  Compound:        ${compoundCount}`)
  console.log(`  CSS Properties:  ${propertyCount} (+ ${aliasCount} aliases)`)
  console.log(`  Zag Properties:  ${zagPropCount} (across ${zagComponentsWithProps} components)`)
  console.log(`  Events:          ${eventCount}`)
  console.log(`  Actions:         ${actionCount}`)
  console.log(`  States:          ${stateCount}`)
  console.log(`  Keys:            ${keyCount}`)
  console.log('')
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const isCheck = process.argv.includes('--check')

  console.log('Generating documentation from schema...')
  console.log('')

  const reference = generateFullReference()

  // Read current files to compare
  const claudeMdPath = path.join(ROOT, 'CLAUDE.md')
  const docsPath = path.join(ROOT, 'docs', 'generated', 'dsl-reference.md')

  if (isCheck) {
    // Check mode: verify files are up to date
    let allGood = true

    const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8')
    const startMarker = '<!-- GENERATED:DSL-PROPERTIES:START -->'
    const endMarker = '<!-- GENERATED:DSL-PROPERTIES:END -->'
    const startIdx = claudeMd.indexOf(startMarker)
    const endIdx = claudeMd.indexOf(endMarker)

    if (startIdx !== -1 && endIdx !== -1) {
      const currentContent = claudeMd.substring(startIdx + startMarker.length, endIdx).trim()
      if (currentContent !== reference.trim()) {
        console.error('✗ CLAUDE.md is out of date!')
        allGood = false
      } else {
        console.log('✓ CLAUDE.md is up to date')
      }
    }

    if (fs.existsSync(docsPath)) {
      const docsContent = fs.readFileSync(docsPath, 'utf-8')
      if (!docsContent.includes(reference)) {
        console.error('✗ docs/generated/dsl-reference.md is out of date!')
        allGood = false
      } else {
        console.log('✓ docs/generated/dsl-reference.md is up to date')
      }
    }

    printStats()

    if (!allGood) {
      console.error('\nRun `npm run generate` to update documentation.')
      process.exit(1)
    }

    console.log('All generated files are up to date.')
  } else {
    // Generate mode: update files
    updateClaudeMd(reference)
    updateGeneratedDocs(reference)
    printStats()
    console.log('Done!')
  }
}

main()
