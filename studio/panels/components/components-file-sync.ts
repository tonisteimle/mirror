/**
 * Components File Sync - Bidirectional sync between .com files and Basic tab
 *
 * Parses .com files to extract user-defined components and provides
 * methods to add components from the All tab to the project.
 */

import type { ComponentItem, ComponentSection } from './types'
import { BASIC_COMPONENTS } from './layout-presets'

export interface ComponentsFileSyncConfig {
  /** Get the content of the components file (.com) */
  getFileContent: () => string | null
  /** Set the content of the components file (.com) */
  setFileContent: (content: string) => void
  /** Called when components change in the file */
  onComponentsChanged?: (sections: ComponentSection[]) => void
}

/**
 * Parsed section from .com file
 */
interface ParsedSection {
  name: string
  startLine: number
  components: ParsedComponent[]
}

/**
 * Parsed component from .com file
 */
interface ParsedComponent {
  name: string
  startLine: number
  endLine: number
  code: string
  isImport: boolean // from @zag/xxx
  importSource?: string
}

/**
 * Components File Sync class
 */
export class ComponentsFileSync {
  private config: ComponentsFileSyncConfig
  private cachedSections: ComponentSection[] = []
  private cachedParsedSections: ParsedSection[] = []

  constructor(config: ComponentsFileSyncConfig) {
    this.config = config
  }

  /**
   * Parse the components file and return ComponentSection[] for the Basic tab
   */
  parseComponentsFile(): ComponentSection[] {
    const content = this.config.getFileContent()
    if (!content) return []

    const lines = content.split('\n')
    const sections: ParsedSection[] = []
    let currentSection: ParsedSection | null = null
    let currentComponent: ParsedComponent | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Skip empty lines and comments (unless they're section headers)
      if (!trimmed) {
        if (currentComponent) {
          currentComponent.endLine = i - 1
          currentComponent = null
        }
        continue
      }

      // Section header: --- Name ---
      const sectionMatch = trimmed.match(/^---\s*(.+?)\s*---$/)
      if (sectionMatch) {
        if (currentComponent) {
          currentComponent.endLine = i - 1
          currentComponent = null
        }
        currentSection = {
          name: sectionMatch[1],
          startLine: i,
          components: [],
        }
        sections.push(currentSection)
        continue
      }

      // Skip comments
      if (trimmed.startsWith('//')) continue

      // Component definition: Name as Base: or Name:
      const componentDefMatch = trimmed.match(
        /^([A-Z][a-zA-Z0-9-]*)(?:\s+as\s+([A-Z][a-zA-Z0-9-]*))?:$/
      )
      if (componentDefMatch) {
        if (currentComponent) {
          currentComponent.endLine = i - 1
        }

        currentComponent = {
          name: componentDefMatch[1],
          startLine: i,
          endLine: i,
          code: line,
          isImport: false,
        }

        // If no current section, create default
        if (!currentSection) {
          currentSection = {
            name: 'Components',
            startLine: 0,
            components: [],
          }
          sections.push(currentSection)
        }
        currentSection.components.push(currentComponent)
        continue
      }

      // Import: Name from @zag/xxx
      const importMatch = trimmed.match(/^([A-Z][a-zA-Z0-9-]*)\s+from\s+(@zag\/[a-z-]+)$/)
      if (importMatch) {
        if (currentComponent) {
          currentComponent.endLine = i - 1
        }

        currentComponent = {
          name: importMatch[1],
          startLine: i,
          endLine: i,
          code: line,
          isImport: true,
          importSource: importMatch[2],
        }

        if (!currentSection) {
          currentSection = {
            name: 'Imports',
            startLine: 0,
            components: [],
          }
          sections.push(currentSection)
        }
        currentSection.components.push(currentComponent)
        continue
      }

      // Component body line (indented)
      if (currentComponent && (line.startsWith('  ') || line.startsWith('\t'))) {
        currentComponent.code += '\n' + line
        currentComponent.endLine = i
      }
    }

    // Finalize last component
    if (currentComponent) {
      currentComponent.endLine = lines.length - 1
    }

    this.cachedParsedSections = sections
    this.cachedSections = this.convertToComponentSections(sections)
    return this.cachedSections
  }

  /**
   * Convert parsed sections to ComponentSection[] for the panel
   */
  private convertToComponentSections(parsedSections: ParsedSection[]): ComponentSection[] {
    return parsedSections.map(section => ({
      name: section.name,
      isExpanded: true,
      items: section.components.map(comp => this.createComponentItem(comp)),
    }))
  }

  /**
   * Create a ComponentItem from a parsed component
   */
  private createComponentItem(comp: ParsedComponent): ComponentItem {
    const builtIn = BASIC_COMPONENTS.find(c => c.template.toLowerCase() === comp.name.toLowerCase())
    return {
      id: `user-${comp.name.toLowerCase()}`,
      name: comp.name,
      category: 'User',
      template: comp.name,
      icon: builtIn?.icon || 'custom',
      isUserDefined: true,
      description: comp.isImport ? `Imported from ${comp.importSource}` : 'User-defined component',
    }
  }

  /**
   * Add a component to the components file
   * @param name Component name
   * @param code Component code to add (or generates import for Zag components)
   * @param sectionName Optional section to add to
   */
  addComponent(name: string, code?: string, sectionName?: string): boolean {
    const currentContent = this.config.getFileContent() || ''

    // Check if component already exists
    if (this.hasComponent(name)) {
      return false
    }

    // Find the matching Zag component if no code provided
    let componentCode = code
    if (!componentCode) {
      const zagComponent = BASIC_COMPONENTS.find(c => c.template === name || c.name === name)
      if (zagComponent) {
        // Generate import statement for Zag components
        const zagName = zagComponent.template.toLowerCase()
        componentCode = `${zagComponent.template} from @zag/${zagName}`
      } else {
        // Generate basic component template
        componentCode = `${name}:\n  // Add properties here`
      }
    }

    // Add to appropriate section or append at end
    let newContent: string
    if (sectionName) {
      const sectionRegex = new RegExp(`(---\\s*${sectionName}\\s*---)`)
      if (sectionRegex.test(currentContent)) {
        // Add after section header
        newContent = currentContent.replace(sectionRegex, `$1\n\n${componentCode}`)
      } else {
        // Create new section
        newContent = currentContent + `\n\n--- ${sectionName} ---\n\n${componentCode}`
      }
    } else {
      // Just append at end
      const separator = currentContent.trim() ? '\n\n' : ''
      newContent = currentContent + separator + componentCode
    }

    this.config.setFileContent(newContent)
    this.parseComponentsFile()
    this.config.onComponentsChanged?.(this.cachedSections)

    return true
  }

  /**
   * Remove a component from the components file
   */
  removeComponent(name: string): boolean {
    const currentContent = this.config.getFileContent()
    if (!currentContent) return false

    // Find the component in parsed sections
    let foundComponent: ParsedComponent | null = null
    for (const section of this.cachedParsedSections) {
      const comp = section.components.find(c => c.name === name)
      if (comp) {
        foundComponent = comp
        break
      }
    }

    if (!foundComponent) return false

    // Remove the component lines
    const lines = currentContent.split('\n')
    lines.splice(foundComponent.startLine, foundComponent.endLine - foundComponent.startLine + 1)

    // Clean up double empty lines
    const newContent = lines.join('\n').replace(/\n{3,}/g, '\n\n')

    this.config.setFileContent(newContent)
    this.parseComponentsFile()
    this.config.onComponentsChanged?.(this.cachedSections)

    return true
  }

  /**
   * Check if a component exists in the file
   */
  hasComponent(name: string): boolean {
    return this.cachedParsedSections.some(section =>
      section.components.some(comp => comp.name === name)
    )
  }

  /**
   * Get all component names
   */
  getComponentNames(): string[] {
    return this.cachedParsedSections.flatMap(section => section.components.map(comp => comp.name))
  }

  /**
   * Get cached sections (call parseComponentsFile first)
   */
  getSections(): ComponentSection[] {
    return this.cachedSections
  }
}

/**
 * Create a ComponentsFileSync instance
 */
export function createComponentsFileSync(config: ComponentsFileSyncConfig): ComponentsFileSync {
  return new ComponentsFileSync(config)
}
