/**
 * File Types Module
 *
 * Single source of truth for file type definitions.
 * Includes templates, icons, colors, and detection logic.
 */

// ============================================
// TYPES
// ============================================

export type FileTypeName = 'layout' | 'component' | 'tokens' | 'data' | 'javascript'

export interface FileTypeDefinition {
  label: string
  placeholder: string
  color: string
  extension?: string
  icon: string
  template: (name: string) => string
  detect: (lines: string[], content?: string) => boolean
}

// ============================================
// ICONS
// ============================================

const LAYOUT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <path d="M3 9h18"/>
  <path d="M9 21V9"/>
</svg>`

const COMPONENT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="3" width="7" height="7" rx="1"/>
  <rect x="14" y="3" width="7" height="7" rx="1"/>
  <rect x="3" y="14" width="7" height="7" rx="1"/>
  <rect x="14" y="14" width="7" height="7" rx="1"/>
</svg>`

const TOKENS_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="7" r="4"/>
  <circle cx="7" cy="15" r="4"/>
  <circle cx="17" cy="15" r="4"/>
</svg>`

const DATA_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <ellipse cx="12" cy="5" rx="9" ry="3"/>
  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
</svg>`

const JAVASCRIPT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M16 18l6-6-6-6"/>
  <path d="M8 6l-6 6 6 6"/>
</svg>`

// ============================================
// TEMPLATES
// ============================================

function layoutTemplate(name: string): string {
  return `// ${name} Layout
// UI Layout Seite

Box pad 24, gap 16, bg #0a0a0f
  Text "${name}", font-size 24, weight bold
  Text "Layout content here..."
`
}

function componentTemplate(name: string): string {
  return `// ${name} Components
// Komponenten-Definitionen

// Button Komponente
Button: pad 12 24, bg #5BA8F5, rad 8, cursor pointer
  state hover bg #2271C1

// Card Komponente
Card: pad 16, bg #1a1a23, rad 8
  Title:
  Content:
`
}

function tokensTemplate(name: string): string {
  return `// ${name} Design Tokens
// Farben, Abstände und Typografie

// Farb-Palette
grey-900.bg: #18181B
grey-800.bg: #27272A
grey-700.bg: #3F3F46

// Background Colors
accent.bg: #5BA8F5
surface.bg: #27272A
canvas.bg: #18181B

// Text Colors
text.col: #ffffff
muted.col: #a1a1aa

// Spacing (s=4, m=8, l=16)
s.pad: 4
m.pad: 8
l.pad: 16
s.gap: 4
m.gap: 8
l.gap: 16

// Radius (s=4, m=8, l=12)
s.rad: 4
m.rad: 8
l.rad: 12
`
}

function dataTemplate(name: string): string {
  return `// ${name} Data
// Daten und Collections

$users:
  - id 1, name "Max", role "admin"
  - id 2, name "Anna", role "user"
  - id 3, name "Tom", role "user"

$tasks:
  - id 1, title "Task 1", done false
  - id 2, title "Task 2", done true
`
}

function javascriptTemplate(name: string): string {
  const safeName = name.replace(/[^a-zA-Z]/g, '')
  return `// ${name} JavaScript
// Custom JavaScript Code

javascript
  function handle${safeName}() { console.log('${name} loaded') }
  window.${safeName} = { init: handle${safeName} }
end
`
}

// ============================================
// DETECTION
// ============================================

function detectLayout(): boolean {
  return false // Default type - only if nothing else matches
}

function detectComponent(lines: string[]): boolean {
  let hasDefinitions = false
  let hasInstances = false

  for (const line of lines) {
    if (/^[A-Z][a-zA-Z0-9]*\s*(as\s+[a-zA-Z]+\s*)?:/.test(line)) {
      hasDefinitions = true
    } else if (/^[A-Z][a-zA-Z0-9]*(\s|$)/.test(line) && !line.includes(':')) {
      hasInstances = true
    }
  }
  return hasDefinitions && !hasInstances
}

function detectTokens(lines: string[]): boolean {
  let hasTokens = false
  let hasInstances = false

  for (const line of lines) {
    if (/^\$?[a-z][a-zA-Z0-9.-]*:\s*(#[0-9A-Fa-f]+|\d+|"[^"]*"|\$)/.test(line)) {
      hasTokens = true
    }
    if (/^[A-Z][a-zA-Z0-9]*(\s|$)/.test(line) && !line.includes(':')) {
      hasInstances = true
    }
  }
  return hasTokens && !hasInstances
}

function detectData(lines: string[]): boolean {
  // Check for list items (- item)
  for (const line of lines) {
    if (/^\s*-\s+\w+/.test(line)) return true
  }

  // Check for YAML-like nested data (key: value pairs with child keys)
  // Example: sales:\n  Jan: 120
  let hasParentKey = false
  let hasChildKey = false
  for (const line of lines) {
    // Parent key: word followed by colon, but NOT component definition (no as, no properties)
    if (/^[a-z][a-z0-9_-]*:\s*$/.test(line)) {
      hasParentKey = true
    }
    // Child key-value: indented word followed by colon and value
    if (/^\s{2,}[A-Za-z][a-zA-Z0-9_-]*:\s*\d+/.test(line)) {
      hasChildKey = true
    }
  }

  return hasParentKey && hasChildKey
}

function detectJavaScript(_lines: string[], content?: string): boolean {
  return !!content && content.includes('javascript') && content.includes('end')
}

// ============================================
// FILE TYPES
// ============================================

export const FILE_TYPES: Record<FileTypeName, FileTypeDefinition> = {
  layout: {
    label: 'Layout',
    placeholder: 'home',
    color: '#5BA8F5',
    extension: '.mir',
    icon: LAYOUT_ICON,
    template: layoutTemplate,
    detect: detectLayout,
  },
  component: {
    label: 'Components',
    placeholder: 'buttons',
    color: '#8B5CF6',
    extension: '.com',
    icon: COMPONENT_ICON,
    template: componentTemplate,
    detect: detectComponent,
  },
  tokens: {
    label: 'Tokens',
    placeholder: 'theme',
    color: '#F59E0B',
    extension: '.tok',
    icon: TOKENS_ICON,
    template: tokensTemplate,
    detect: detectTokens,
  },
  data: {
    label: 'Data',
    placeholder: 'users',
    color: '#22C55E',
    icon: DATA_ICON,
    template: dataTemplate,
    detect: detectData,
  },
  javascript: {
    label: 'JavaScript',
    placeholder: 'utils',
    color: '#EC4899',
    icon: JAVASCRIPT_ICON,
    template: javascriptTemplate,
    detect: detectJavaScript,
  },
}

// ============================================
// DETECTION API
// ============================================

export function detectFileType(nameOrContent: string, content?: string): FileTypeName {
  let filename = ''
  let code = nameOrContent

  if (content !== undefined) {
    filename = nameOrContent
    code = content
  }

  // Check filename patterns first
  if (filename) {
    const lower = filename.toLowerCase()
    if (lower.includes('token')) return 'tokens'
    if (lower.includes('component')) return 'component'
    if (lower.endsWith('.data') || lower.includes('data.')) return 'data'
  }

  if (!code?.trim()) return 'layout'

  const lines = code
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//') && !l.startsWith('import'))

  if (lines.length === 0) return 'layout'

  // Check each type's detect function (order matters)
  const checkOrder: FileTypeName[] = ['javascript', 'data', 'tokens', 'component']
  for (const type of checkOrder) {
    if (FILE_TYPES[type].detect(lines, code)) return type
  }

  return 'layout'
}

// ============================================
// ICON API
// ============================================

export function getFileIcon(
  filename: string,
  getFileType: (f: string) => FileTypeName,
  withColor = true
): string {
  const type = getFileType(filename)
  const fileType = FILE_TYPES[type] || FILE_TYPES.layout
  if (withColor) {
    return fileType.icon.replace('stroke="currentColor"', `stroke="${fileType.color}"`)
  }
  return fileType.icon
}

export function getFileTypeColor(
  filename: string,
  getFileType: (f: string) => FileTypeName
): string {
  const type = getFileType(filename)
  return (FILE_TYPES[type] || FILE_TYPES.layout).color
}

export function getFileTemplate(type: FileTypeName, name: string): string {
  return FILE_TYPES[type]?.template(name) || FILE_TYPES.layout.template(name)
}

export function getFileExtension(type: FileTypeName): string {
  return FILE_TYPES[type]?.extension || '.mir'
}

// File-extension predicates (Mirror DSL source classification)
export { MIRROR_EXTENSIONS, isMirrorFile, isComponentsFile, isLayoutFile } from './extensions'
