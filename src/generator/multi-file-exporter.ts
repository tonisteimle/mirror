/**
 * Multi-File React Exporter
 *
 * Generates a complete React project structure from Mirror code:
 * - /components/*.tsx - Individual component files
 * - /styles/tokens.ts - Design tokens as TypeScript constants
 * - App.tsx - Main application using the components
 */

import type { ASTNode } from '../parser/parser'
import { INTERNAL_NODES } from '../constants'
import { propertiesToStyle } from '../utils/style-converter'
import { sanitizeTextContent } from '../utils/sanitize'

// =============================================================================
// Types
// =============================================================================

export interface ExportedFile {
  path: string
  content: string
}

export interface ExportResult {
  files: ExportedFile[]
}

interface ParsedToken {
  name: string
  value: string | number
  type: 'color' | 'spacing' | 'size' | 'radius' | 'other'
}

interface ParsedComponent {
  name: string
  properties: Record<string, unknown>
  children: ASTNode[]
  slots: string[]
}

// =============================================================================
// Token Parser
// =============================================================================

function parseTokens(tokensCode: string): ParsedToken[] {
  const tokens: ParsedToken[] = []
  const lines = tokensCode.split('\n')

  for (const line of lines) {
    const match = line.match(/^\s*\$([a-zA-Z][a-zA-Z0-9-]*)\s*:\s*(.+?)\s*$/)
    if (match) {
      const name = match[1]
      const rawValue = match[2]

      // Determine type
      let type: ParsedToken['type'] = 'other'
      let value: string | number = rawValue

      if (rawValue.startsWith('#') || rawValue.match(/^(rgb|hsl)/i)) {
        type = 'color'
      } else if (name.includes('spacing') || name.includes('gap') || name.includes('pad') || name.includes('mar')) {
        type = 'spacing'
        value = parseInt(rawValue, 10) || rawValue
      } else if (name.includes('radius') || name.includes('rad')) {
        type = 'radius'
        value = parseInt(rawValue, 10) || rawValue
      } else if (name.includes('size')) {
        type = 'size'
        value = parseInt(rawValue, 10) || rawValue
      } else if (!isNaN(Number(rawValue))) {
        value = Number(rawValue)
      }

      tokens.push({ name, value, type })
    }
  }

  return tokens
}

function generateTokensFile(tokens: ParsedToken[]): string {
  const lines: string[] = []

  lines.push('/**')
  lines.push(' * Design Tokens')
  lines.push(' * Generated from Mirror DSL')
  lines.push(' */')
  lines.push('')

  // Group by type
  const colors = tokens.filter(t => t.type === 'color')
  const spacing = tokens.filter(t => t.type === 'spacing')
  const radii = tokens.filter(t => t.type === 'radius')
  const sizes = tokens.filter(t => t.type === 'size')
  const other = tokens.filter(t => t.type === 'other')

  if (colors.length > 0) {
    lines.push('export const colors = {')
    for (const t of colors) {
      lines.push(`  ${camelCase(t.name)}: '${t.value}',`)
    }
    lines.push('} as const')
    lines.push('')
  }

  if (spacing.length > 0) {
    lines.push('export const spacing = {')
    for (const t of spacing) {
      lines.push(`  ${camelCase(t.name)}: ${t.value},`)
    }
    lines.push('} as const')
    lines.push('')
  }

  if (radii.length > 0) {
    lines.push('export const radii = {')
    for (const t of radii) {
      lines.push(`  ${camelCase(t.name)}: ${t.value},`)
    }
    lines.push('} as const')
    lines.push('')
  }

  if (sizes.length > 0) {
    lines.push('export const sizes = {')
    for (const t of sizes) {
      lines.push(`  ${camelCase(t.name)}: ${t.value},`)
    }
    lines.push('} as const')
    lines.push('')
  }

  if (other.length > 0) {
    lines.push('export const tokens = {')
    for (const t of other) {
      const value = typeof t.value === 'string' ? `'${t.value}'` : t.value
      lines.push(`  ${camelCase(t.name)}: ${value},`)
    }
    lines.push('} as const')
    lines.push('')
  }

  // Export combined theme
  lines.push('export const theme = {')
  if (colors.length > 0) lines.push('  colors,')
  if (spacing.length > 0) lines.push('  spacing,')
  if (radii.length > 0) lines.push('  radii,')
  if (sizes.length > 0) lines.push('  sizes,')
  if (other.length > 0) lines.push('  ...tokens,')
  lines.push('} as const')
  lines.push('')

  return lines.join('\n')
}

// =============================================================================
// Component Parser
// =============================================================================

function parseComponents(componentsCode: string, layoutNodes: ASTNode[]): ParsedComponent[] {
  const components: ParsedComponent[] = []
  const lines = componentsCode.split('\n')

  let currentComponent: ParsedComponent | null = null
  let currentIndent = 0

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('//')) continue

    // Component definition: Name: properties or Name from Parent: properties
    const defMatch = line.match(/^([A-Z][a-zA-Z0-9]*)(?:\s+from\s+[A-Z][a-zA-Z0-9]*)?\s*:\s*(.*)$/)
    if (defMatch) {
      if (currentComponent) {
        components.push(currentComponent)
      }
      currentComponent = {
        name: defMatch[1],
        properties: parseInlineProperties(defMatch[2]),
        children: [],
        slots: []
      }
      currentIndent = 0
      continue
    }

    // Slot definition (indented component name with colon)
    if (currentComponent) {
      const slotMatch = line.match(/^(\s+)([A-Z][a-zA-Z0-9]*)\s*:\s*(.*)$/)
      if (slotMatch) {
        currentComponent.slots.push(slotMatch[2])
      }
    }
  }

  if (currentComponent) {
    components.push(currentComponent)
  }

  return components
}

function parseInlineProperties(propsStr: string): Record<string, unknown> {
  const props: Record<string, unknown> = {}

  // Simple property parsing - this is a simplified version
  const parts = propsStr.split(/,\s*/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // property value or just property (boolean)
    const match = trimmed.match(/^([a-z][a-z0-9-]*)\s+(.+)$/)
    if (match) {
      const [, prop, value] = match
      // Parse value
      if (value.startsWith('#')) {
        props[prop] = value
      } else if (value.startsWith('$')) {
        props[prop] = value // Token reference
      } else if (!isNaN(Number(value))) {
        props[prop] = Number(value)
      } else if (value.startsWith('"') && value.endsWith('"')) {
        props[prop] = value.slice(1, -1)
      } else {
        props[prop] = value
      }
    } else {
      // Boolean property
      props[trimmed] = true
    }
  }

  return props
}

function generateComponentFile(component: ParsedComponent, tokens: ParsedToken[]): string {
  const lines: string[] = []

  lines.push(`import React from 'react'`)

  // Check if we need to import tokens
  const needsTokens = Object.values(component.properties).some(
    v => typeof v === 'string' && v.startsWith('$')
  )
  if (needsTokens) {
    lines.push(`import { colors, spacing, radii } from '../styles/tokens'`)
  }

  lines.push('')

  // Generate props interface if there are slots
  if (component.slots.length > 0) {
    lines.push(`interface ${component.name}Props {`)
    lines.push(`  children?: React.ReactNode`)
    for (const slot of component.slots) {
      lines.push(`  ${lowerFirst(slot)}?: React.ReactNode`)
    }
    lines.push(`}`)
    lines.push('')
  } else {
    lines.push(`interface ${component.name}Props {`)
    lines.push(`  children?: React.ReactNode`)
    lines.push(`}`)
    lines.push('')
  }

  // Generate component
  lines.push(`export function ${component.name}({ children${component.slots.length > 0 ? ', ' + component.slots.map(s => lowerFirst(s)).join(', ') : ''} }: ${component.name}Props) {`)

  // Generate style object
  const style = generateStyleObject(component.properties, tokens)

  lines.push(`  return (`)
  lines.push(`    <div style={${style}}>`)

  // Render slots
  for (const slot of component.slots) {
    lines.push(`      {${lowerFirst(slot)} && <div className="${slot}">{${lowerFirst(slot)}}</div>}`)
  }

  lines.push(`      {children}`)
  lines.push(`    </div>`)
  lines.push(`  )`)
  lines.push(`}`)
  lines.push('')

  return lines.join('\n')
}

function generateStyleObject(properties: Record<string, unknown>, tokens: ParsedToken[]): string {
  const styleProps: string[] = []

  // Map Mirror properties to CSS
  const propMap: Record<string, string> = {
    'vertical': "display: 'flex', flexDirection: 'column'",
    'horizontal': "display: 'flex', flexDirection: 'row'",
    'center': "display: 'flex', justifyContent: 'center', alignItems: 'center'",
    'between': "justifyContent: 'space-between'",
    'wrap': "flexWrap: 'wrap'",
  }

  for (const [prop, value] of Object.entries(properties)) {
    // Boolean properties
    if (value === true && propMap[prop]) {
      styleProps.push(propMap[prop])
      continue
    }

    // Value properties
    let cssValue: string
    if (typeof value === 'string' && value.startsWith('$')) {
      // Token reference - convert to JS access
      const tokenName = value.slice(1)
      const token = tokens.find(t => t.name === tokenName)
      if (token) {
        if (token.type === 'color') {
          cssValue = `colors.${camelCase(tokenName)}`
        } else if (token.type === 'spacing') {
          cssValue = `spacing.${camelCase(tokenName)}`
        } else if (token.type === 'radius') {
          cssValue = `radii.${camelCase(tokenName)}`
        } else {
          cssValue = `'${token.value}'`
        }
      } else {
        cssValue = `'${value}'`
      }
    } else if (typeof value === 'string') {
      cssValue = `'${value}'`
    } else {
      cssValue = String(value)
    }

    // Map property names
    switch (prop) {
      case 'gap':
        styleProps.push(`gap: ${cssValue}`)
        break
      case 'padding':
      case 'pad':
        styleProps.push(`padding: ${cssValue}`)
        break
      case 'margin':
      case 'mar':
        styleProps.push(`margin: ${cssValue}`)
        break
      case 'background':
      case 'bg':
        styleProps.push(`backgroundColor: ${cssValue}`)
        break
      case 'color':
      case 'col':
        styleProps.push(`color: ${cssValue}`)
        break
      case 'radius':
      case 'rad':
        styleProps.push(`borderRadius: ${cssValue}`)
        break
      case 'width':
      case 'w':
        styleProps.push(`width: ${cssValue}`)
        break
      case 'height':
      case 'h':
        styleProps.push(`height: ${cssValue}`)
        break
      case 'font-size':
      case 'size':  // legacy
        styleProps.push(`fontSize: ${cssValue}`)
        break
      case 'icon-size':
        styleProps.push(`fontSize: ${cssValue}`)  // icons use fontSize
        break
      case 'weight':
        styleProps.push(`fontWeight: ${cssValue}`)
        break
    }
  }

  if (styleProps.length === 0) {
    return '{}'
  }

  return `{ ${styleProps.join(', ')} }`
}

// =============================================================================
// Layout Generator
// =============================================================================

function generateAppFile(
  layoutNodes: ASTNode[],
  components: ParsedComponent[],
  tokens: ParsedToken[]
): string {
  const lines: string[] = []
  const usedComponents = new Set<string>()

  // Collect used components
  collectUsedComponents(layoutNodes, usedComponents)

  // Imports
  lines.push(`import React from 'react'`)

  // Import components
  const componentNames = components.map(c => c.name)
  for (const name of usedComponents) {
    if (componentNames.includes(name)) {
      lines.push(`import { ${name} } from './components/${name}'`)
    }
  }

  // Import tokens if needed
  lines.push(`import { colors, spacing } from './styles/tokens'`)
  lines.push('')

  // Generate App component
  lines.push('export default function App() {')
  lines.push('  return (')
  lines.push('    <div style={{ minHeight: "100vh", backgroundColor: colors.bg || "#1E1E2E" }}>')

  // Generate JSX for layout
  for (const node of layoutNodes) {
    lines.push(generateNodeJSX(node, '      ', components, tokens))
  }

  lines.push('    </div>')
  lines.push('  )')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

function collectUsedComponents(nodes: ASTNode[], used: Set<string>): void {
  for (const node of nodes) {
    if (node.name && node.name[0] === node.name[0].toUpperCase() && !node.name.startsWith('_')) {
      used.add(node.name)
    }
    if (node.children) {
      collectUsedComponents(node.children, used)
    }
  }
}

function generateNodeJSX(
  node: ASTNode,
  indent: string,
  components: ParsedComponent[],
  tokens: ParsedToken[]
): string {
  // Text node
  if (node.name === INTERNAL_NODES.TEXT) {
    const text = sanitizeTextContent(node.content || '')
    return `${indent}{"${text}"}`
  }

  const isComponent = components.some(c => c.name === node.name)
  const tag = isComponent ? node.name : 'div'

  // Generate style
  const style = propertiesToStyle(node.properties, node.children.length > 0, node.name)
  const styleStr = Object.keys(style).length > 0
    ? ` style={${JSON.stringify(style)}}`
    : ''

  // Self-closing if no children and no content
  if (node.children.length === 0 && !node.content) {
    return `${indent}<${tag}${styleStr} />`
  }

  const lines: string[] = []
  lines.push(`${indent}<${tag}${styleStr}>`)

  // Add content
  if (node.content) {
    lines.push(`${indent}  {"${sanitizeTextContent(node.content)}"}`)
  }

  // Add children
  for (const child of node.children) {
    lines.push(generateNodeJSX(child, indent + '  ', components, tokens))
  }

  lines.push(`${indent}</${tag}>`)

  return lines.join('\n')
}

// =============================================================================
// Main Export Function
// =============================================================================

export function generateMultiFileExport(
  layoutNodes: ASTNode[],
  componentsCode: string,
  tokensCode: string
): ExportResult {
  const files: ExportedFile[] = []

  // Parse tokens
  const tokens = parseTokens(tokensCode)

  // Parse components
  const components = parseComponents(componentsCode, layoutNodes)

  // Generate tokens file
  if (tokens.length > 0) {
    files.push({
      path: 'styles/tokens.ts',
      content: generateTokensFile(tokens)
    })
  } else {
    // Generate empty tokens file
    files.push({
      path: 'styles/tokens.ts',
      content: `// Design Tokens\nexport const colors = {} as const\nexport const spacing = {} as const\nexport const radii = {} as const\nexport const sizes = {} as const\nexport const theme = { colors, spacing, radii, sizes } as const\n`
    })
  }

  // Generate component files
  for (const component of components) {
    files.push({
      path: `components/${component.name}.tsx`,
      content: generateComponentFile(component, tokens)
    })
  }

  // Generate components index
  if (components.length > 0) {
    const indexContent = components
      .map(c => `export { ${c.name} } from './${c.name}'`)
      .join('\n') + '\n'
    files.push({
      path: 'components/index.ts',
      content: indexContent
    })
  }

  // Generate App.tsx
  files.push({
    path: 'App.tsx',
    content: generateAppFile(layoutNodes, components, tokens)
  })

  // Generate package.json
  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: 'mirror-export',
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview'
      },
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.0.0',
        'typescript': '^5.0.0',
        'vite': '^5.0.0'
      }
    }, null, 2)
  })

  // Generate vite.config.ts
  files.push({
    path: 'vite.config.ts',
    content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`
  })

  // Generate tsconfig.json
  files.push({
    path: 'tsconfig.json',
    content: JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true
      },
      include: ['**/*.ts', '**/*.tsx']
    }, null, 2)
  })

  // Generate index.html
  files.push({
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mirror Export</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
`
  })

  // Generate main.tsx
  files.push({
    path: 'main.tsx',
    content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`
  })

  return { files }
}

// =============================================================================
// Utility Functions
// =============================================================================

function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

function lowerFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}
