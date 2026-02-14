/**
 * Mirror File Format Parser and Serializer
 *
 * Handles reading and writing .mirror project files with the following structure:
 *
 * [data]
 * Task:
 *   title: text
 * - Task "Example", false
 *
 * [tokens]
 * $primary: #3B82F6
 *
 * [components]
 * Button: pad 12 bg $primary
 *
 * [page: Home]
 * App ver gap 16
 *   Button "Click"
 *
 * [page: Settings]
 * Settings ver
 */

// =============================================================================
// Types
// =============================================================================

export interface MirrorPage {
  id: string
  name: string
  layoutCode: string
}

export interface MirrorProject {
  version: number
  dataCode: string
  tokensCode: string
  componentsCode: string
  pages: MirrorPage[]
  currentPageId: string
}

export interface ParseResult {
  success: boolean
  project?: MirrorProject
  error?: string
}

// =============================================================================
// Constants
// =============================================================================

const SECTION_REGEX = /^\[(\w+)(?::\s*(.+))?\]\s*$/
const CURRENT_VERSION = 1

// Valid section names
type SectionType = 'data' | 'tokens' | 'components' | 'page'

// =============================================================================
// Parser
// =============================================================================

/**
 * Parse a .mirror file into a MirrorProject structure.
 */
export function parseMirrorFile(content: string): ParseResult {
  try {
    const lines = content.split('\n')
    const sections: Array<{ type: SectionType; name?: string; content: string[] }> = []
    let currentSection: { type: SectionType; name?: string; content: string[] } | null = null

    for (const line of lines) {
      const sectionMatch = line.match(SECTION_REGEX)

      if (sectionMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection)
        }

        const sectionType = sectionMatch[1].toLowerCase() as SectionType
        const sectionName = sectionMatch[2]?.trim()

        // Validate section type
        if (!['data', 'tokens', 'components', 'page'].includes(sectionType)) {
          return {
            success: false,
            error: `Unknown section type: [${sectionMatch[1]}]`
          }
        }

        currentSection = {
          type: sectionType,
          name: sectionName,
          content: []
        }
      } else if (currentSection) {
        currentSection.content.push(line)
      }
      // Lines before first section are ignored (could be comments or blank)
    }

    // Don't forget the last section
    if (currentSection) {
      sections.push(currentSection)
    }

    // Build project from sections
    const project: MirrorProject = {
      version: CURRENT_VERSION,
      dataCode: '',
      tokensCode: '',
      componentsCode: '',
      pages: [],
      currentPageId: ''
    }

    for (const section of sections) {
      const content = trimSectionContent(section.content)

      switch (section.type) {
        case 'data':
          project.dataCode = content
          break
        case 'tokens':
          project.tokensCode = content
          break
        case 'components':
          project.componentsCode = content
          break
        case 'page': {
          if (!section.name) {
            return {
              success: false,
              error: 'Page section requires a name: [page: PageName]'
            }
          }
          const pageId = generatePageId(section.name)
          project.pages.push({
            id: pageId,
            name: section.name,
            layoutCode: content
          })
          // First page becomes current by default
          if (!project.currentPageId) {
            project.currentPageId = pageId
          }
          break
        }
      }
    }

    // Ensure at least one page exists
    if (project.pages.length === 0) {
      project.pages.push({
        id: 'page-1',
        name: 'Main',
        layoutCode: ''
      })
      project.currentPageId = 'page-1'
    }

    return { success: true, project }

  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown parsing error'
    }
  }
}

/**
 * Trim leading/trailing empty lines from section content.
 */
function trimSectionContent(lines: string[]): string {
  // Remove leading empty lines
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift()
  }
  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }
  return lines.join('\n')
}

/**
 * Generate a page ID from the page name.
 */
function generatePageId(name: string): string {
  return 'page-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// =============================================================================
// Serializer
// =============================================================================

/**
 * Serialize a MirrorProject to .mirror file format.
 */
export function serializeMirrorFile(project: MirrorProject): string {
  const sections: string[] = []

  // [data] section
  if (project.dataCode.trim()) {
    sections.push('[data]')
    sections.push(project.dataCode.trim())
    sections.push('')
  }

  // [tokens] section
  if (project.tokensCode.trim()) {
    sections.push('[tokens]')
    sections.push(project.tokensCode.trim())
    sections.push('')
  }

  // [components] section
  if (project.componentsCode.trim()) {
    sections.push('[components]')
    sections.push(project.componentsCode.trim())
    sections.push('')
  }

  // [page: Name] sections
  for (const page of project.pages) {
    sections.push(`[page: ${page.name}]`)
    if (page.layoutCode.trim()) {
      sections.push(page.layoutCode.trim())
    }
    sections.push('')
  }

  return sections.join('\n').trim() + '\n'
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if content looks like a .mirror file (has section headers).
 */
export function isMirrorFormat(content: string): boolean {
  return SECTION_REGEX.test(content.trim().split('\n')[0] || '')
    || content.includes('[data]')
    || content.includes('[tokens]')
    || content.includes('[components]')
    || content.includes('[page:')
}

/**
 * Check if content looks like the old JSON format.
 */
export function isJsonFormat(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.startsWith('{') && trimmed.endsWith('}')
}

/**
 * Convert old JSON project format to MirrorProject.
 */
export function convertJsonToMirrorProject(json: {
  version?: number
  pages?: Array<{ id: string; name: string; layoutCode: string }>
  currentPageId?: string
  componentsCode?: string
  tokensCode?: string
  dataCode?: string
}): MirrorProject {
  return {
    version: json.version || CURRENT_VERSION,
    dataCode: json.dataCode || '',
    tokensCode: json.tokensCode || '',
    componentsCode: json.componentsCode || '',
    pages: json.pages || [{ id: 'page-1', name: 'Main', layoutCode: '' }],
    currentPageId: json.currentPageId || json.pages?.[0]?.id || 'page-1'
  }
}

/**
 * Parse a file that could be either .mirror or JSON format.
 * Returns a MirrorProject in either case.
 */
export function parseProjectFile(content: string): ParseResult {
  // Try JSON first (for backwards compatibility)
  if (isJsonFormat(content)) {
    try {
      const json = JSON.parse(content)
      const project = convertJsonToMirrorProject(json)
      return { success: true, project }
    } catch {
      // Fall through to .mirror parsing
    }
  }

  // Try .mirror format
  return parseMirrorFile(content)
}
