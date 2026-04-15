/**
 * Component Auto-Add Service
 *
 * Automatically adds components to .com files when dropped on .mir files.
 * See docs/features/component-auto-add.md for full specification.
 */

import { storage } from '../../storage'
import { COMPONENT_TEMPLATES } from './component-templates'
import type { StorageItem } from '../../storage'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('ComponentAutoAdd')

/**
 * Check if a component is already defined in any .com file
 *
 * Matches:
 * - Direct definition: `Select:` or `Select from @zag/select`
 * - Derived definition: `MySelection as Select:`
 */
export async function isComponentDefined(componentName: string): Promise<boolean> {
  const comFiles = await getComFiles()
  for (const filePath of comFiles) {
    try {
      if (hasComponentDefinition(await storage.readFile(filePath), componentName)) return true
    } catch (err) {
      log.warn(`Failed to read ${filePath}:`, err)
    }
  }
  return false
}

/**
 * Check if content contains a definition for the component
 */
function hasComponentDefinition(content: string, componentName: string): boolean {
  // Escape special regex characters in component name
  const escaped = componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Direct definition: `Select:` at start of line
  const directDefRegex = new RegExp(`^${escaped}:`, 'm')
  if (directDefRegex.test(content)) return true

  // Import: `Select from @zag/...`
  const importRegex = new RegExp(`^${escaped}\\s+from\\s+@`, 'm')
  if (importRegex.test(content)) return true

  // Derived: `... as Select:`
  const derivedRegex = new RegExp(`as\\s+${escaped}:`, 'm')
  if (derivedRegex.test(content)) return true

  return false
}

/**
 * Add a component to the appropriate .com file
 *
 * @param componentId - The component ID (e.g., 'zag-select')
 * @returns true if added, false if already exists or failed
 */
export async function addComponentToComFile(componentId: string): Promise<boolean> {
  // Get the com template
  const templates = COMPONENT_TEMPLATES[componentId]
  if (!templates?.com) {
    log.warn(`No com template for ${componentId}`)
    return false
  }

  // Extract component name from template (first word of first line)
  const componentName = templates.com.split(/[\s\n]/)[0]
  if (!componentName) {
    log.warn(`Could not extract component name from template`)
    return false
  }

  // Check if already defined
  if (await isComponentDefined(componentName)) {
    log.info(`${componentName} already defined, skipping`)
    return false
  }

  // Find or create .com file
  const comFilePath = await getOrCreateComFile()

  // Read current content
  let currentContent = ''
  try {
    currentContent = await storage.readFile(comFilePath)
  } catch {
    // File might be new/empty
  }

  // Append component
  const separator = currentContent.trim() ? '\n\n' : ''
  const newContent = currentContent + separator + templates.com

  // Write back
  await storage.writeFile(comFilePath, newContent)

  log.info(`Added ${componentName} to ${comFilePath}`)
  return true
}

/**
 * Get all .com files in the project
 */
async function getComFiles(): Promise<string[]> {
  const collect = (items: StorageItem[]): string[] =>
    items.flatMap(item => {
      if (item.type === 'file' && item.name.endsWith('.com')) return [item.path]
      if (item.type === 'folder') return collect(item.children)
      return []
    })
  return collect(storage.getTree())
}

/**
 * Get or create the appropriate .com file
 *
 * Logic:
 * - No .com file exists → create 'components.com'
 * - One .com file exists → use it
 * - Multiple .com files → prefer 'components.com', else use first one
 */
async function getOrCreateComFile(): Promise<string> {
  const comFiles = await getComFiles()

  if (comFiles.length === 0) {
    // Create new components.com
    await storage.writeFile('components.com', '// Components\n')
    return 'components.com'
  }

  if (comFiles.length === 1) {
    return comFiles[0]
  }

  // Multiple files - prefer components.com
  const componentsFile = comFiles.find(f => f === 'components.com' || f.endsWith('/components.com'))

  return componentsFile ?? comFiles[0]
}
