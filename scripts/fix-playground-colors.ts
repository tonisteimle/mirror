/**
 * Fix col/bg usage in playground examples
 *
 * After refactoring:
 * - col = text color (always)
 * - bg = background color (always)
 *
 * Container components that had `col #xxx` for background need `bg #xxx`
 *
 * Usage: npx tsx scripts/fix-playground-colors.ts
 */

import * as fs from 'fs'

const inputFile = 'docs/mirror-docu.html'
const outputFile = 'docs/mirror-docu.html'

// Container components that should use bg for background
const CONTAINER_COMPONENTS = new Set([
  'Box', 'Card', 'Panel', 'Tile', 'Container', 'Section', 'Header', 'Footer',
  'Sidebar', 'Content', 'Main', 'Nav', 'Menu', 'Item', 'Row', 'Column', 'Col',
  'Grid', 'Stack', 'Flex', 'Actions', 'Dashboard', 'Button', 'Btn', 'PrimaryBtn',
  'SecondaryBtn', 'DangerBtn', 'GhostBtn', 'Primary-Button', 'Secondary-Button',
  'Danger-Button', 'Tab', 'TabContent', 'Tabs', 'Dialog', 'Modal', 'Popup',
  'Dropdown', 'Tooltip', 'Popover', 'Alert', 'Toast', 'Badge', 'Tag', 'Chip',
  'Avatar', 'Icon', 'Logo', 'Image', 'Divider', 'Separator', 'Spacer',
  'Form', 'Field', 'Input', 'Textarea', 'Select', 'Checkbox', 'Radio', 'Switch',
  'Slider', 'Progress', 'Spinner', 'Skeleton', 'Placeholder', 'Empty',
  'List', 'ListItem', 'Table', 'TableRow', 'TableCell', 'Accordion', 'AccordionItem',
  'Collapsible', 'Trigger', 'ContextMenu', 'HoverCard', 'RadioGroup',
  'FormField', 'SettingsDialog', 'DeleteConfirm', 'UserPreview', 'Details',
  'FileMenu', 'PlanSelector', 'SuccessToast', 'UserAvatar', 'SmallAvatar',
  'EmailField', 'Info', 'Track', 'Thumb', 'Range', 'Indicator', 'Close',
  'Action', 'Cancel', 'Description', 'Title', 'Label', 'Hint', 'Error',
  'Options', 'Option', 'Group', 'Fallback', 'Image'
])

// Text components that should keep col for text color
const TEXT_COMPONENTS = new Set([
  'Text', 'Label', 'Title', 'Heading', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'Paragraph', 'P', 'Span', 'Link', 'A', 'Value', 'Description', 'Caption',
  'Subtitle', 'Hint', 'Error', 'Message'
])

// Read the file
let html = fs.readFileSync(inputFile, 'utf-8')

// Function to decode HTML entities in data-code
function decodeEntities(str: string): string {
  return str
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

// Function to encode back to HTML entities
function encodeEntities(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
}

// Function to check if a component is a container
function isContainer(name: string): boolean {
  // Remove any variant suffixes like "PrimaryBtn" -> check both full and base
  const baseName = name.replace(/^(Primary|Secondary|Danger|Ghost|Small|Large|Medium)[-]?/i, '')
  return CONTAINER_COMPONENTS.has(name) || CONTAINER_COMPONENTS.has(baseName)
}

// Function to check if a component is text-based
function isTextComponent(name: string): boolean {
  return TEXT_COMPONENTS.has(name)
}

// Function to fix color usage in a single line of Mirror code
function fixLine(line: string): string {
  // Skip comments and empty lines
  if (line.trim().startsWith('//') || line.trim() === '') {
    return line
  }

  // Extract component name (first word after indentation)
  const match = line.match(/^(\s*)([A-Z][A-Za-z0-9_-]*)(.*)$/)
  if (!match) {
    return line
  }

  const [, indent, componentName, rest] = match

  // Special case: definitions with colon
  const isDefinition = rest.includes(':') && !rest.includes(':"') && !rest.includes(': "')
  const cleanName = componentName.replace(/:$/, '')

  // Check if this is a container component
  if (isContainer(cleanName) && !isTextComponent(cleanName)) {
    // Replace col #xxx with bg #xxx for background colors
    // But NOT col #fff or col #white which are likely text colors
    let newRest = rest

    // Pattern: col followed by a dark color (likely background)
    // Keep col for light colors (likely text on dark background)
    newRest = newRest.replace(
      /\bcol\s+(#[0-9a-fA-F]{3,8}|transparent|\$[a-zA-Z_-]+(?:-col)?)\b/g,
      (match, color) => {
        // If it's a light color (for text), keep col
        if (isLightColor(color)) {
          return match
        }
        // If it's a dark color or token, change to bg
        return `bg ${color}`
      }
    )

    return indent + componentName + newRest
  }

  return line
}

// Check if a color is "light" (likely used for text on dark background)
function isLightColor(color: string): boolean {
  if (color === 'transparent') return false
  if (color.startsWith('$')) {
    // Token - check suffix
    if (color.includes('-col')) return false // explicit color token
    if (color.includes('text') || color.includes('Text')) return true
    return false // default: treat as background
  }

  // Parse hex color
  const hex = color.replace('#', '')
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 180
  } else if (hex.length >= 6) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 180
  }

  return false
}

// Function to fix a complete Mirror code block
function fixMirrorCode(code: string): string {
  const lines = code.split('\n')
  return lines.map(fixLine).join('\n')
}

// Find and fix all data-code attributes
let fixCount = 0
const dataCodePattern = /data-code="([^"]*)"/g

html = html.replace(dataCodePattern, (match, encodedCode) => {
  const code = decodeEntities(encodedCode)
  const fixed = fixMirrorCode(code)

  if (fixed !== code) {
    fixCount++
    return `data-code="${encodeEntities(fixed)}"`
  }

  return match
})

// Write output
fs.writeFileSync(outputFile, html)

console.log(`Fixed ${fixCount} playground code blocks`)
console.log(`Output written to ${outputFile}`)
