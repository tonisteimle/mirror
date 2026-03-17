#!/usr/bin/env npx ts-node

/**
 * Schema Generator
 *
 * Generiert aus src/schema/dsl.ts:
 * - docs/generated/properties.md
 * - docs/generated/dsl-reference.md
 * - studio/autocomplete/generated.ts
 * - src/__tests__/generated/schema.test.ts
 * - CLAUDE.md (DSL Properties section)
 *
 * Usage: npm run generate
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import {
  DSL,
  SCHEMA,
  PropertyDef,
  getPropertiesByCategory,
  getAllPropertyNames,
  getAllEvents,
  getAllActions,
  getAllStates,
  getSystemStates,
  getCustomStates,
} from '../src/schema/dsl'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')

// ============================================================================
// Documentation Generator - Properties
// ============================================================================

function generatePropertiesDocs(): string {
  const lines: string[] = [
    '# Mirror DSL Properties',
    '',
    '> **Auto-generated** aus `src/schema/dsl.ts` – nicht manuell editieren!',
    '',
    '## Übersicht',
    '',
  ]

  // TOC by category
  const categories = ['sizing', 'layout', 'spacing', 'color', 'border', 'typography', 'position', 'transform', 'effect'] as const
  for (const cat of categories) {
    const props = getPropertiesByCategory(cat)
    if (props.length === 0) continue

    lines.push(`- [${capitalize(cat)}](#${cat})`)
  }

  lines.push('', '---', '')

  // Properties by category
  for (const cat of categories) {
    const props = getPropertiesByCategory(cat)
    if (props.length === 0) continue

    lines.push(`## ${capitalize(cat)}`, '')

    for (const prop of props) {
      lines.push(...generatePropertyDoc(prop))
    }
  }

  return lines.join('\n')
}

function generatePropertyDoc(prop: PropertyDef): string[] {
  const lines: string[] = []

  // Header
  const aliases = prop.aliases.length > 0 ? ` (\`${prop.aliases.join('`, `')}\`)` : ''
  lines.push(`### ${prop.name}${aliases}`, '')
  lines.push(prop.description, '')

  // Values table
  lines.push('| Wert | Beschreibung | CSS |')
  lines.push('|------|--------------|-----|')

  // Keywords
  if (prop.keywords) {
    for (const [key, val] of Object.entries(prop.keywords)) {
      if (key === '_standalone') {
        const cssStr = val.css.map((c) => `\`${c.property}: ${c.value}\``).join(', ')
        lines.push(`| *(standalone)* | ${val.description} | ${cssStr} |`)
      } else {
        const cssStr = val.css.map((c) => `\`${c.property}: ${c.value}\``).join(', ')
        lines.push(`| \`${key}\` | ${val.description} | ${cssStr} |`)
      }
    }
  }

  // Numeric
  if (prop.numeric) {
    const unit = prop.numeric.unit || ''
    lines.push(`| \`<number>\` | ${prop.numeric.description} | \`${prop.name}: N${unit}\` |`)
  }

  // Color
  if (prop.color) {
    lines.push(`| \`<color>\` | ${prop.color.description} | \`${prop.name}: <color>\` |`)
  }

  // Token
  if (prop.token) {
    lines.push(`| \`$token\` | Design Token | *(Token-Wert)* |`)
  }

  // Examples
  const examples = collectExamples(prop)
  if (examples.length > 0) {
    lines.push('', '**Beispiele:**', '```mirror')
    for (const ex of examples) {
      lines.push(ex)
    }
    lines.push('```')
  }

  lines.push('')
  return lines
}

function collectExamples(prop: PropertyDef): string[] {
  const examples: string[] = []

  if (prop.keywords) {
    for (const val of Object.values(prop.keywords)) {
      if (val.example) examples.push(val.example)
    }
  }

  if (prop.numeric?.example) {
    examples.push(prop.numeric.example)
  }

  return examples
}

// ============================================================================
// Documentation Generator - Full DSL Reference
// ============================================================================

function generateDslReferenceDocs(): string {
  const lines: string[] = [
    '# Mirror DSL Reference',
    '',
    '> **Auto-generated** aus `src/schema/dsl.ts` – nicht manuell editieren!',
    '',
    '## Table of Contents',
    '',
    '- [Keywords](#keywords)',
    '- [Primitives](#primitives)',
    '- [Properties](#properties)',
    '- [Events](#events)',
    '- [Actions](#actions)',
    '- [States](#states)',
    '- [Keyboard Keys](#keyboard-keys)',
    '',
    '---',
    '',
  ]

  // Keywords
  lines.push('## Keywords', '')
  lines.push('Reserved keywords that cannot be used as identifiers:', '')
  lines.push('```')
  lines.push(DSL.keywords.reserved.join(', '))
  lines.push('```', '')

  // Primitives
  lines.push('## Primitives', '')
  lines.push('Built-in component types:', '')
  lines.push('| Primitive | HTML Tag | Description |')
  lines.push('|-----------|----------|-------------|')
  for (const [name, def] of Object.entries(DSL.primitives)) {
    const aliases = def.aliases ? ` (${def.aliases.join(', ')})` : ''
    lines.push(`| ${name}${aliases} | \`<${def.html}>\` | ${def.description} |`)
  }
  lines.push('')

  // Properties (summary)
  lines.push('## Properties', '')
  lines.push(`See [properties.md](./properties.md) for detailed property documentation.`, '')
  lines.push(`Total: ${Object.keys(SCHEMA).length} properties`, '')

  // Events
  lines.push('## Events', '')
  lines.push('| Event | DOM Event | Description |')
  lines.push('|-------|-----------|-------------|')
  for (const [name, def] of Object.entries(DSL.events)) {
    const keyNote = def.acceptsKey ? ' (accepts key modifier)' : ''
    lines.push(`| ${name} | ${def.dom} | ${def.description}${keyNote} |`)
  }
  lines.push('')

  // Actions
  lines.push('## Actions', '')
  lines.push('| Action | Description | Targets |')
  lines.push('|--------|-------------|---------|')
  for (const [name, def] of Object.entries(DSL.actions)) {
    const targets = def.targets ? def.targets.join(', ') : '-'
    lines.push(`| ${name} | ${def.description} | ${targets} |`)
  }
  lines.push('')

  // States
  lines.push('## States', '')
  lines.push('### System States (CSS pseudo-classes)', '')
  lines.push('| State | Description |')
  lines.push('|-------|-------------|')
  for (const name of getSystemStates()) {
    const def = DSL.states[name]
    lines.push(`| ${name} | ${def.description} |`)
  }
  lines.push('')

  lines.push('### Custom States (data-state attribute)', '')
  lines.push('| State | Description |')
  lines.push('|-------|-------------|')
  for (const name of getCustomStates()) {
    const def = DSL.states[name]
    lines.push(`| ${name} | ${def.description} |`)
  }
  lines.push('')

  // Keyboard Keys
  lines.push('## Keyboard Keys', '')
  lines.push('Valid keys for `onkeydown` events:', '')
  lines.push('```')
  lines.push(DSL.keys.join(', '))
  lines.push('```', '')

  return lines.join('\n')
}

// ============================================================================
// Autocomplete Generator
// ============================================================================

function generateAutocomplete(): string {
  const lines: string[] = [
    '/**',
    ' * Autocomplete Completions',
    ' *',
    ' * Auto-generated aus src/schema/dsl.ts – nicht manuell editieren!',
    ' */',
    '',
    '// ============================================================================',
    '// Keywords',
    '// ============================================================================',
    '',
    'export const RESERVED_KEYWORDS: string[] = [',
  ]

  for (const kw of DSL.keywords.reserved) {
    lines.push(`  '${kw}',`)
  }
  lines.push(']', '')

  // Primitives
  lines.push('// ============================================================================')
  lines.push('// Primitives')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const PRIMITIVES: string[] = [')
  for (const name of Object.keys(DSL.primitives)) {
    lines.push(`  '${name}',`)
  }
  lines.push(']', '')

  // Property aliases
  lines.push('// ============================================================================')
  lines.push('// Property Aliases')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const PROPERTY_ALIASES: Record<string, string> = {')

  for (const prop of Object.values(SCHEMA)) {
    for (const alias of prop.aliases) {
      lines.push(`  '${alias}': '${prop.name}',`)
    }
  }
  lines.push('}', '')

  // Keywords per property
  lines.push('// ============================================================================')
  lines.push('// Keywords per Property')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const PROPERTY_KEYWORDS: Record<string, string[]> = {')

  for (const [key, prop] of Object.entries(SCHEMA)) {
    if (prop.keywords) {
      const keywords = Object.keys(prop.keywords).filter((k) => k !== '_standalone')
      if (keywords.length > 0) {
        lines.push(`  '${key}': [${keywords.map((k) => `'${k}'`).join(', ')}],`)
      }
    }
  }
  lines.push('}', '')

  // All property names
  lines.push('// ============================================================================')
  lines.push('// All Properties')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const ALL_PROPERTIES: string[] = [')

  const allNames = getAllPropertyNames()
  for (const name of allNames) {
    lines.push(`  '${name}',`)
  }
  lines.push(']', '')

  // Color properties
  lines.push('// ============================================================================')
  lines.push('// Color Properties')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const COLOR_PROPERTIES: string[] = [')
  for (const prop of Object.values(SCHEMA)) {
    if (prop.color) {
      lines.push(`  '${prop.name}',`)
      for (const alias of prop.aliases) {
        lines.push(`  '${alias}',`)
      }
    }
  }
  lines.push(']', '')

  // Token properties
  lines.push('// ============================================================================')
  lines.push('// Token Properties')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const TOKEN_PROPERTIES: string[] = [')
  for (const prop of Object.values(SCHEMA)) {
    if (prop.token) {
      lines.push(`  '${prop.name}',`)
      for (const alias of prop.aliases) {
        lines.push(`  '${alias}',`)
      }
    }
  }
  lines.push(']', '')

  // Events
  lines.push('// ============================================================================')
  lines.push('// Events')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const EVENTS: string[] = [')
  for (const event of getAllEvents()) {
    lines.push(`  '${event}',`)
  }
  lines.push(']', '')

  // Actions
  lines.push('// ============================================================================')
  lines.push('// Actions')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const ACTIONS: string[] = [')
  for (const action of getAllActions()) {
    lines.push(`  '${action}',`)
  }
  lines.push(']', '')

  // States
  lines.push('// ============================================================================')
  lines.push('// States')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const STATES: string[] = [')
  for (const state of getAllStates()) {
    lines.push(`  '${state}',`)
  }
  lines.push(']', '')

  lines.push('export const SYSTEM_STATES: string[] = [')
  for (const state of getSystemStates()) {
    lines.push(`  '${state}',`)
  }
  lines.push(']', '')

  lines.push('export const CUSTOM_STATES: string[] = [')
  for (const state of getCustomStates()) {
    lines.push(`  '${state}',`)
  }
  lines.push(']', '')

  // Keyboard keys
  lines.push('// ============================================================================')
  lines.push('// Keyboard Keys')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('export const KEYBOARD_KEYS: string[] = [')
  for (const key of DSL.keys) {
    lines.push(`  '${key}',`)
  }
  lines.push(']')

  return lines.join('\n')
}

// ============================================================================
// Test Generator
// ============================================================================

function generateTests(): string {
  const lines: string[] = [
    '/**',
    ' * Schema Validation Tests',
    ' *',
    ' * Auto-generated aus src/schema/dsl.ts – nicht manuell editieren!',
    ' * Diese Tests validieren, dass die Schema-Definition korrekt ist.',
    ' */',
    '',
    "import { describe, it, expect } from 'vitest'",
    "import {",
    "  DSL,",
    "  SCHEMA,",
    "  findProperty,",
    "  getKeywordsForProperty,",
    "  isReservedKeyword,",
    "  isPrimitive,",
    "  getAllPropertyNames,",
    "  getAllEvents,",
    "  getAllActions,",
    "  getAllStates,",
    "} from '../../schema/dsl'",
    '',
    "describe('DSL Schema', () => {",
    '',
  ]

  // Basic schema tests
  lines.push("  describe('Schema Structure', () => {")
  lines.push("    it('has required properties', () => {")
  lines.push("      expect(SCHEMA.width).toBeDefined()")
  lines.push("      expect(SCHEMA.height).toBeDefined()")
  lines.push("      expect(SCHEMA.background).toBeDefined()")
  lines.push("      expect(SCHEMA.padding).toBeDefined()")
  lines.push('    })')
  lines.push('')
  lines.push("    it('all properties have name and category', () => {")
  lines.push('      for (const [key, prop] of Object.entries(SCHEMA)) {')
  lines.push('        expect(prop.name, `${key} should have name`).toBeDefined()')
  lines.push('        expect(prop.category, `${key} should have category`).toBeDefined()')
  lines.push('      }')
  lines.push('    })')
  lines.push('  })')
  lines.push('')

  // Keywords tests
  lines.push("  describe('Keywords', () => {")
  lines.push("    it('has reserved keywords', () => {")
  lines.push("      expect(DSL.keywords.reserved.length).toBeGreaterThan(0)")
  lines.push("    })")
  lines.push('')
  lines.push("    it('isReservedKeyword works', () => {")
  lines.push("      expect(isReservedKeyword('as')).toBe(true)")
  lines.push("      expect(isReservedKeyword('extends')).toBe(true)")
  lines.push("      expect(isReservedKeyword('notakeyword')).toBe(false)")
  lines.push('    })')
  lines.push('  })')
  lines.push('')

  // Primitives tests
  lines.push("  describe('Primitives', () => {")
  lines.push("    it('has required primitives', () => {")
  lines.push("      expect(DSL.primitives.Box).toBeDefined()")
  lines.push("      expect(DSL.primitives.Text).toBeDefined()")
  lines.push("      expect(DSL.primitives.Button).toBeDefined()")
  lines.push('    })')
  lines.push('')
  lines.push("    it('isPrimitive works', () => {")
  lines.push("      expect(isPrimitive('Box')).toBe(true)")
  lines.push("      expect(isPrimitive('box')).toBe(true)")
  lines.push("      expect(isPrimitive('NotAPrimitive')).toBe(false)")
  lines.push('    })')
  lines.push('  })')
  lines.push('')

  // Alias tests
  lines.push("  describe('Property Aliases', () => {")
  for (const prop of Object.values(SCHEMA)) {
    for (const alias of prop.aliases) {
      lines.push(`    it('${alias} resolves to ${prop.name}', () => {`)
      lines.push(`      expect(findProperty('${alias}')?.name).toBe('${prop.name}')`)
      lines.push('    })')
      lines.push('')
    }
  }
  lines.push('  })')
  lines.push('')

  // Keyword tests
  lines.push("  describe('Property Keywords', () => {")
  for (const [key, prop] of Object.entries(SCHEMA)) {
    if (prop.keywords) {
      const keywords = Object.keys(prop.keywords).filter((k) => k !== '_standalone')
      if (keywords.length > 0) {
        lines.push(`    it('${key} has keywords: ${keywords.join(', ')}', () => {`)
        lines.push(`      const keywords = getKeywordsForProperty('${key}')`)
        for (const kw of keywords) {
          lines.push(`      expect(keywords).toContain('${kw}')`)
        }
        lines.push('    })')
        lines.push('')
      }
    }
  }
  lines.push('  })')
  lines.push('')

  // Events tests
  lines.push("  describe('Events', () => {")
  lines.push("    it('has required events', () => {")
  lines.push("      const events = getAllEvents()")
  lines.push("      expect(events).toContain('onclick')")
  lines.push("      expect(events).toContain('onhover')")
  lines.push("      expect(events).toContain('onkeydown')")
  lines.push('    })')
  lines.push('  })')
  lines.push('')

  // Actions tests
  lines.push("  describe('Actions', () => {")
  lines.push("    it('has required actions', () => {")
  lines.push("      const actions = getAllActions()")
  lines.push("      expect(actions).toContain('show')")
  lines.push("      expect(actions).toContain('hide')")
  lines.push("      expect(actions).toContain('toggle')")
  lines.push('    })')
  lines.push('  })')
  lines.push('')

  // States tests
  lines.push("  describe('States', () => {")
  lines.push("    it('has system states', () => {")
  lines.push("      const states = getAllStates()")
  lines.push("      expect(states).toContain('hover')")
  lines.push("      expect(states).toContain('focus')")
  lines.push("      expect(states).toContain('active')")
  lines.push('    })')
  lines.push('')
  lines.push("    it('has custom states', () => {")
  lines.push("      const states = getAllStates()")
  lines.push("      expect(states).toContain('selected')")
  lines.push("      expect(states).toContain('open')")
  lines.push('    })')
  lines.push('  })')

  lines.push('})')

  return lines.join('\n')
}

// ============================================================================
// CLAUDE.md Section Generator
// ============================================================================

function generateClaudeSection(): string {
  const lines: string[] = [
    '## DSL Reference (auto-generated)',
    '',
    '### Primitives',
    '',
    '| Primitive | HTML | Aliases |',
    '|-----------|------|---------|',
  ]

  // Primitives
  for (const [name, def] of Object.entries(DSL.primitives)) {
    const aliases = def.aliases ? def.aliases.join(', ') : '-'
    lines.push(`| ${name} | \`<${def.html}>\` | ${aliases} |`)
  }

  // Properties
  lines.push('', '### Properties', '', '| Property | Aliases | Werte |', '|----------|---------|-------|')

  for (const prop of Object.values(SCHEMA)) {
    const aliases = prop.aliases.length > 0 ? prop.aliases.join(', ') : '-'
    const values: string[] = []

    if (prop.keywords) {
      const kws = Object.keys(prop.keywords).filter((k) => k !== '_standalone')
      if (kws.length > 0) values.push(...kws)
      if (prop.keywords._standalone) values.push('*(standalone)*')
    }
    if (prop.numeric) values.push('<number>')
    if (prop.color) values.push('<color>')
    if (prop.token) values.push('$token')

    lines.push(`| ${prop.name} | ${aliases} | ${values.join(', ')} |`)
  }

  // Events
  lines.push('', '### Events', '', '| Event | DOM | Key? |', '|-------|-----|------|')
  for (const [name, def] of Object.entries(DSL.events)) {
    const acceptsKey = def.acceptsKey ? '✓' : '-'
    lines.push(`| ${name} | ${def.dom} | ${acceptsKey} |`)
  }

  // Actions
  lines.push('', '### Actions', '', '| Action | Targets |', '|--------|---------|')
  for (const [name, def] of Object.entries(DSL.actions)) {
    const targets = def.targets ? def.targets.join(', ') : '-'
    lines.push(`| ${name} | ${targets} |`)
  }

  // States
  lines.push('', '### States', '', '**System:** ' + getSystemStates().join(', '))
  lines.push('', '**Custom:** ' + getCustomStates().join(', '))

  // Keys
  lines.push('', '### Keyboard Keys', '', DSL.keys.join(', '))

  return lines.join('\n')
}

// ============================================================================
// reference.html Generator
// ============================================================================

function generateReferenceHtml(): string {
  const categories = ['sizing', 'layout', 'spacing', 'color', 'border', 'typography', 'position', 'transform', 'effect'] as const

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirror DSL Reference</title>
  <style>
    :root {
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --border: #30363d;
      --accent: #58a6ff;
      --accent-subtle: #388bfd26;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); margin-bottom: 2rem; }
    .stats { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 2rem; }
    .stat {
      background: var(--bg-secondary);
      padding: 1rem 1.5rem;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .stat-value { font-size: 1.5rem; font-weight: 600; color: var(--accent); }
    .stat-label { font-size: 0.875rem; color: var(--text-muted); }
    nav {
      background: var(--bg-secondary);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    nav a {
      color: var(--accent);
      text-decoration: none;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    nav a:hover { background: var(--accent-subtle); }
    section { margin-bottom: 3rem; }
    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }
    h3 { font-size: 1.125rem; margin: 1.5rem 0 0.75rem; color: var(--text-muted); }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--text-muted); font-weight: 500; }
    tr:hover { background: var(--accent-subtle); }
    code {
      background: var(--bg-secondary);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-family: 'SF Mono', Consolas, monospace;
      font-size: 0.8125rem;
    }
    .tag {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-right: 0.25rem;
      background: var(--accent-subtle);
      color: var(--accent);
    }
    .category { text-transform: capitalize; }
    .search-box {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      margin-bottom: 1.5rem;
    }
    .search-box:focus { outline: none; border-color: var(--accent); }
    .hidden { display: none; }
    footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Mirror DSL Reference</h1>
    <p class="subtitle">Auto-generated from <code>src/schema/dsl.ts</code></p>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${Object.keys(DSL.primitives).length}</div>
        <div class="stat-label">Primitives</div>
      </div>
      <div class="stat">
        <div class="stat-value">${Object.keys(SCHEMA).length}</div>
        <div class="stat-label">Properties</div>
      </div>
      <div class="stat">
        <div class="stat-value">${Object.keys(DSL.events).length}</div>
        <div class="stat-label">Events</div>
      </div>
      <div class="stat">
        <div class="stat-value">${Object.keys(DSL.actions).length}</div>
        <div class="stat-label">Actions</div>
      </div>
      <div class="stat">
        <div class="stat-value">${Object.keys(DSL.states).length}</div>
        <div class="stat-label">States</div>
      </div>
    </div>

    <input type="text" class="search-box" placeholder="Search properties, events, actions..." id="search">

    <nav>
      <a href="#primitives">Primitives</a>
      <a href="#properties">Properties</a>
      <a href="#events">Events</a>
      <a href="#actions">Actions</a>
      <a href="#states">States</a>
      <a href="#keys">Keys</a>
    </nav>

    <section id="primitives">
      <h2>Primitives</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>HTML Tag</th><th>Aliases</th><th>Description</th></tr>
        </thead>
        <tbody>
${Object.entries(DSL.primitives).map(([name, def]) => `          <tr data-search="${name.toLowerCase()} ${def.aliases?.join(' ') || ''}">
            <td><strong>${name}</strong></td>
            <td><code>&lt;${def.html}&gt;</code></td>
            <td>${def.aliases?.map(a => `<code>${a}</code>`).join(', ') || '-'}</td>
            <td>${def.description}</td>
          </tr>`).join('\n')}
        </tbody>
      </table>
    </section>

    <section id="properties">
      <h2>Properties</h2>
${categories.map(cat => {
  const props = getPropertiesByCategory(cat)
  if (props.length === 0) return ''
  return `      <h3 class="category">${cat}</h3>
      <table>
        <thead>
          <tr><th>Property</th><th>Aliases</th><th>Values</th><th>Description</th></tr>
        </thead>
        <tbody>
${props.map(prop => {
  const aliases = prop.aliases.length > 0 ? prop.aliases.map(a => `<code>${a}</code>`).join(', ') : '-'
  const values: string[] = []
  if (prop.keywords) {
    const kws = Object.keys(prop.keywords).filter(k => k !== '_standalone')
    if (kws.length > 0) values.push(...kws.map(k => `<code>${k}</code>`))
    if (prop.keywords._standalone) values.push('<span class="tag">standalone</span>')
  }
  if (prop.numeric) values.push('<span class="tag">number</span>')
  if (prop.color) values.push('<span class="tag">color</span>')
  if (prop.token) values.push('<span class="tag">$token</span>')
  return `          <tr data-search="${prop.name.toLowerCase()} ${prop.aliases.join(' ')} ${cat}">
            <td><strong>${prop.name}</strong></td>
            <td>${aliases}</td>
            <td>${values.join(' ')}</td>
            <td>${prop.description}</td>
          </tr>`
}).join('\n')}
        </tbody>
      </table>`
}).join('\n')}
    </section>

    <section id="events">
      <h2>Events</h2>
      <table>
        <thead>
          <tr><th>Event</th><th>DOM Event</th><th>Key Modifier</th><th>Description</th></tr>
        </thead>
        <tbody>
${Object.entries(DSL.events).map(([name, def]) => `          <tr data-search="${name.toLowerCase()} ${def.dom}">
            <td><strong>${name}</strong></td>
            <td><code>${def.dom}</code></td>
            <td>${def.acceptsKey ? '✓' : '-'}</td>
            <td>${def.description}</td>
          </tr>`).join('\n')}
        </tbody>
      </table>
    </section>

    <section id="actions">
      <h2>Actions</h2>
      <table>
        <thead>
          <tr><th>Action</th><th>Targets</th><th>Description</th></tr>
        </thead>
        <tbody>
${Object.entries(DSL.actions).map(([name, def]) => `          <tr data-search="${name.toLowerCase()}">
            <td><strong>${name}</strong></td>
            <td>${def.targets ? def.targets.map(t => `<code>${t}</code>`).join(', ') : '-'}</td>
            <td>${def.description}</td>
          </tr>`).join('\n')}
        </tbody>
      </table>
    </section>

    <section id="states">
      <h2>States</h2>
      <h3>System States (CSS pseudo-classes)</h3>
      <table>
        <thead>
          <tr><th>State</th><th>Description</th></tr>
        </thead>
        <tbody>
${getSystemStates().map(name => {
  const def = DSL.states[name]
  return `          <tr data-search="${name}">
            <td><strong>${name}</strong></td>
            <td>${def.description}</td>
          </tr>`
}).join('\n')}
        </tbody>
      </table>

      <h3>Custom States (data-state attribute)</h3>
      <table>
        <thead>
          <tr><th>State</th><th>Description</th></tr>
        </thead>
        <tbody>
${getCustomStates().map(name => {
  const def = DSL.states[name]
  return `          <tr data-search="${name}">
            <td><strong>${name}</strong></td>
            <td>${def.description}</td>
          </tr>`
}).join('\n')}
        </tbody>
      </table>
    </section>

    <section id="keys">
      <h2>Keyboard Keys</h2>
      <p>Valid keys for <code>onkeydown</code> events:</p>
      <p style="margin-top: 1rem;">
${DSL.keys.map(k => `<code>${k}</code>`).join(' ')}
      </p>
    </section>

    <footer>
      Generated on ${new Date().toISOString().split('T')[0]} &bull;
      Schema version: ${Object.keys(SCHEMA).length} properties
    </footer>
  </div>

  <script>
    const search = document.getElementById('search');
    const rows = document.querySelectorAll('tr[data-search]');

    search.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      rows.forEach(row => {
        const text = row.dataset.search || '';
        row.classList.toggle('hidden', query && !text.includes(query));
      });
    });
  </script>
</body>
</html>`
}

// ============================================================================
// CLAUDE.md Updater
// ============================================================================

const CLAUDE_MARKER_START = '<!-- GENERATED:DSL-PROPERTIES:START -->'
const CLAUDE_MARKER_END = '<!-- GENERATED:DSL-PROPERTIES:END -->'

function updateClaudeMd(): boolean {
  const claudePath = path.join(ROOT, 'CLAUDE.md')

  if (!fs.existsSync(claudePath)) {
    console.log('⚠️  CLAUDE.md not found')
    return false
  }

  let content = fs.readFileSync(claudePath, 'utf-8')

  // Check if markers exist
  if (!content.includes(CLAUDE_MARKER_START)) {
    console.log('⚠️  CLAUDE.md missing markers. Add these where you want the generated section:')
    console.log(`   ${CLAUDE_MARKER_START}`)
    console.log(`   ${CLAUDE_MARKER_END}`)
    return false
  }

  // Generate new section
  const generatedSection = [
    CLAUDE_MARKER_START,
    '',
    generateClaudeSection(),
    '',
    CLAUDE_MARKER_END,
  ].join('\n')

  // Replace between markers
  const regex = new RegExp(
    `${escapeRegex(CLAUDE_MARKER_START)}[\\s\\S]*?${escapeRegex(CLAUDE_MARKER_END)}`,
    'g'
  )

  content = content.replace(regex, generatedSection)
  fs.writeFileSync(claudePath, content)

  return true
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============================================================================
// Statistics
// ============================================================================

function printStatistics(): void {
  console.log('\n📊 Schema Statistics:')
  console.log(`   Keywords:    ${DSL.keywords.reserved.length}`)
  console.log(`   Primitives:  ${Object.keys(DSL.primitives).length}`)
  console.log(`   Properties:  ${Object.keys(SCHEMA).length}`)
  console.log(`   Events:      ${Object.keys(DSL.events).length}`)
  console.log(`   Actions:     ${Object.keys(DSL.actions).length}`)
  console.log(`   States:      ${Object.keys(DSL.states).length}`)
  console.log(`   Keys:        ${DSL.keys.length}`)
  console.log(`   ─────────────────────`)
  console.log(`   Total:       ${
    DSL.keywords.reserved.length +
    Object.keys(DSL.primitives).length +
    Object.keys(SCHEMA).length +
    Object.keys(DSL.events).length +
    Object.keys(DSL.actions).length +
    Object.keys(DSL.states).length +
    DSL.keys.length
  } elements`)
}

// ============================================================================
// Main
// ============================================================================

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function main() {
  console.log('🔄 Generating from schema...\n')

  // 1. Generate properties docs
  const docsDir = path.join(ROOT, 'docs/generated')
  ensureDir(docsDir)
  const propsDocs = generatePropertiesDocs()
  fs.writeFileSync(path.join(docsDir, 'properties.md'), propsDocs)
  console.log('✅ docs/generated/properties.md')

  // 2. Generate DSL reference docs
  const dslRefDocs = generateDslReferenceDocs()
  fs.writeFileSync(path.join(docsDir, 'dsl-reference.md'), dslRefDocs)
  console.log('✅ docs/generated/dsl-reference.md')

  // 3. Generate autocomplete
  const autocompleteDir = path.join(ROOT, 'studio/autocomplete')
  ensureDir(autocompleteDir)
  const autocomplete = generateAutocomplete()
  fs.writeFileSync(path.join(autocompleteDir, 'generated.ts'), autocomplete)
  console.log('✅ studio/autocomplete/generated.ts')

  // 4. Generate tests
  const testsDir = path.join(ROOT, 'src/__tests__/generated')
  ensureDir(testsDir)
  const tests = generateTests()
  fs.writeFileSync(path.join(testsDir, 'schema.test.ts'), tests)
  console.log('✅ src/__tests__/generated/schema.test.ts')

  // 5. Update CLAUDE.md
  if (updateClaudeMd()) {
    console.log('✅ CLAUDE.md (DSL Reference section)')
  }

  // 6. Generate reference.html
  const referenceHtml = generateReferenceHtml()
  fs.writeFileSync(path.join(docsDir, 'reference.html'), referenceHtml)
  console.log('✅ docs/generated/reference.html')

  // Print statistics
  printStatistics()

  console.log('\n✨ Done!')
}

main()
