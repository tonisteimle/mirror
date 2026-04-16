/**
 * File Explorer Module
 *
 * Queries file structure and contents from the running Studio instance.
 * Useful for debugging token extraction, file loading, etc.
 */

import type { CDPSession } from './types'

export interface FileInfo {
  name: string
  type: string
  size: number
  preview: string // First 200 chars
}

export interface FileExplorerResult {
  files: FileInfo[]
  currentFile: string
  totalFiles: number
}

export interface TokenInfo {
  spacing: Record<string, Array<{ name: string; fullName: string; value: string }>>
  colors: Array<{ name: string; value: string }>
}

export interface ProjectSourceResult {
  source: string
  length: number
  lineCount: number
  preview: string // First 500 chars
}

export class FileExplorer {
  constructor(private cdp: CDPSession) {}

  /**
   * List all files in the project
   */
  async listFiles(): Promise<FileExplorerResult> {
    const result = await this.evaluate<FileExplorerResult>(`
      (() => {
        const files = window.files || {}
        const currentFile = window.currentFile || ''
        const getFileType = window.getFileType || (() => 'unknown')

        const fileInfos = Object.entries(files).map(([name, content]) => ({
          name,
          type: getFileType(name),
          size: content.length,
          preview: content.substring(0, 200)
        }))

        return {
          files: fileInfos,
          currentFile,
          totalFiles: fileInfos.length
        }
      })()
    `)
    return result
  }

  /**
   * Get content of a specific file
   */
  async getFileContent(filename: string): Promise<string | null> {
    const result = await this.evaluate<string | null>(`
      (() => {
        const files = window.files || {}
        return files['${filename}'] || null
      })()
    `)
    return result
  }

  /**
   * Get the combined project source (as used by token extraction)
   */
  async getAllProjectSource(): Promise<ProjectSourceResult> {
    const result = await this.evaluate<ProjectSourceResult>(`
      (() => {
        const getAllSource = window.getAllProjectSource
        if (!getAllSource) {
          return { source: '', length: 0, lineCount: 0, preview: '[getAllProjectSource not found]' }
        }
        const source = getAllSource()
        return {
          source,
          length: source.length,
          lineCount: source.split('\\n').length,
          preview: source.substring(0, 500)
        }
      })()
    `)
    return result
  }

  /**
   * Get extracted tokens (spacing and colors)
   */
  async getTokens(): Promise<TokenInfo> {
    const result = await this.evaluate<TokenInfo>(`
      (() => {
        const getAllSource = window.getAllProjectSource
        if (!getAllSource) {
          return { spacing: {}, colors: [] }
        }

        const source = getAllSource()
        const lines = source.split('\\n')

        // Extract spacing tokens
        const spacingTypes = ['pad', 'gap', 'rad', 'mar', 'fs']
        const spacing = {}

        for (const propType of spacingTypes) {
          const regex = new RegExp('^\\\\$?([a-zA-Z0-9_-]+)\\\\.' + propType + '\\\\s*:\\\\s*(\\\\d+)$')
          const tokens = []

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('//')) continue

            const match = trimmed.match(regex)
            if (match) {
              tokens.push({
                name: match[1],
                fullName: match[1] + '.' + propType,
                value: match[2]
              })
            }
          }

          spacing[propType] = tokens
        }

        // Extract color tokens
        const colorRegex = /\\$?([\\w.-]+):\\s*(#[0-9A-Fa-f]{3,8})/g
        const colors = []
        let match
        while ((match = colorRegex.exec(source)) !== null) {
          colors.push({
            name: match[1],
            value: match[2]
          })
        }

        return { spacing, colors }
      })()
    `)
    return result
  }

  /**
   * Get current editor state
   */
  async getEditorState(): Promise<{
    source: string
    cursorLine: number
    cursorColumn: number
    selection: string | null
  }> {
    const result = await this.evaluate<{
      source: string
      cursorLine: number
      cursorColumn: number
      selection: string | null
    }>(`
      (() => {
        const state = window.studio?.state?.get?.() || {}
        return {
          source: state.source || '',
          cursorLine: state.cursor?.line || 1,
          cursorColumn: state.cursor?.column || 1,
          selection: state.selection?.nodeId || null
        }
      })()
    `)
    return result
  }

  /**
   * Search for pattern in all files
   */
  async searchInFiles(
    pattern: string
  ): Promise<Array<{ file: string; line: number; content: string }>> {
    const result = await this.evaluate<Array<{ file: string; line: number; content: string }>>(`
      (() => {
        const files = window.files || {}
        const regex = new RegExp('${pattern.replace(/'/g, "\\'")}', 'gi')
        const matches = []

        for (const [filename, content] of Object.entries(files)) {
          const lines = content.split('\\n')
          lines.forEach((line, index) => {
            if (regex.test(line)) {
              matches.push({
                file: filename,
                line: index + 1,
                content: line.trim()
              })
            }
            regex.lastIndex = 0 // Reset regex
          })
        }

        return matches
      })()
    `)
    return result
  }

  /**
   * Debug token extraction for a specific property type
   */
  async debugTokenExtraction(propType: string): Promise<{
    source: string
    regex: string
    matches: string[]
    tokens: Array<{ name: string; value: string }>
  }> {
    const result = await this.evaluate<{
      source: string
      regex: string
      matches: string[]
      tokens: Array<{ name: string; value: string }>
    }>(`
      (() => {
        const getAllSource = window.getAllProjectSource
        if (!getAllSource) {
          return { source: '', regex: '', matches: [], tokens: [] }
        }

        const source = getAllSource()
        const regexStr = '^\\\\$?([a-zA-Z0-9_-]+)\\\\.${propType}\\\\s*:\\\\s*(\\\\d+)$'
        const regex = new RegExp(regexStr)

        const lines = source.split('\\n')
        const matches = []
        const tokens = []

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('//')) continue

          // Check if line contains the property type at all
          if (trimmed.includes('.${propType}')) {
            matches.push(trimmed)

            const match = trimmed.match(regex)
            if (match) {
              tokens.push({ name: match[1], value: match[2] })
            }
          }
        }

        return {
          source: source.substring(0, 1000),
          regex: regexStr,
          matches,
          tokens
        }
      })()
    `)
    return result
  }

  /**
   * Create a new project (resets to default demo project with tokens)
   * Handles any confirmation dialogs automatically
   */
  async createNewProject(): Promise<boolean> {
    const result = await this.evaluate<boolean>(`
      (async () => {
        // Check if storage service is available
        const storage = window.storageService || window.studio?.storage
        if (storage && storage.provider && storage.provider.resetToDefaults) {
          storage.provider.resetToDefaults()
          // Trigger reload
          if (window.location) {
            window.location.reload()
          }
          return true
        }

        // Alternative: Try via project toolbar
        const newBtn = document.querySelector('[data-action="new-project"]')
        if (newBtn) {
          newBtn.click()
          // Wait a bit for dialog
          await new Promise(r => setTimeout(r, 100))
          // Auto-confirm any dialog
          const confirmBtn = document.querySelector('.dialog-confirm, [data-action="confirm"], button:contains("OK"), button:contains("Ja")')
          if (confirmBtn) {
            confirmBtn.click()
          }
          return true
        }

        return false
      })()
    `)
    return result
  }

  /**
   * Load files into the project
   */
  async loadFiles(files: Record<string, string>): Promise<void> {
    await this.evaluate<void>(`
      (() => {
        const filesObj = ${JSON.stringify(files)}

        // Update window.files
        if (window.files) {
          Object.assign(window.files, filesObj)
        }

        // If using storage service
        const storage = window.storageService || window.studio?.storage
        if (storage && storage.provider) {
          for (const [path, content] of Object.entries(filesObj)) {
            storage.provider.writeFile(path, content)
          }
        }
      })()
    `)
  }

  /**
   * Switch to a specific file
   */
  async switchToFile(filename: string): Promise<void> {
    await this.evaluate<void>(`
      (() => {
        if (window.switchFile) {
          window.switchFile('${filename}')
        }
      })()
    `)
  }

  /**
   * Check what the property panel is receiving for tokens
   */
  async debugPropertyPanel(): Promise<{
    hasPanel: boolean
    hasStudioPanel: boolean
    hasController: boolean
    hasPorts: boolean
    spacingTokens: Array<{ name: string; value: string }>
    colorTokens: Array<{ name: string; value: string }>
    colorTokensAfterInvalidate?: Array<{ name: string; value: string }>
    manualColorTokens?: Array<{ name: string; value: string }>
    sourceLength: number
    sourcePreview: string
    getAllSourceResult: string
  }> {
    const result = await this.evaluate<{
      hasPanel: boolean
      hasStudioPanel: boolean
      hasController: boolean
      hasPorts: boolean
      spacingTokens: Array<{ name: string; value: string }>
      colorTokens: Array<{ name: string; value: string }>
      colorTokensAfterInvalidate?: Array<{ name: string; value: string }>
      manualColorTokens?: Array<{ name: string; value: string }>
      sourceLength: number
      sourcePreview: string
      getAllSourceResult: string
    }>(`
      (() => {
        const result = {
          hasPanel: false,
          hasStudioPanel: false,
          hasController: false,
          hasPorts: false,
          spacingTokens: [],
          colorTokens: [],
          colorTokensAfterInvalidate: [],
          sourceLength: 0,
          sourcePreview: '',
          getAllSourceResult: ''
        }

        // Check legacy panel
        result.hasPanel = typeof window.studioPropertyPanel !== 'undefined'

        // Check new architecture panel via studio
        const studioPanel = window.studio?.propertyPanel
        result.hasStudioPanel = !!studioPanel

        // Check if the panel controller is initialized
        if (studioPanel) {
          // The panel has a view, which has a controller
          const view = studioPanel.view
          const controller = view?.getController?.()
          result.hasController = !!controller
        }

        // Try to access ports via the panel's private 'ports' property
        // PropertyPanel has: private ports: PropertyPanelPorts
        const panel = studioPanel || window.studioPropertyPanel
        if (panel) {
          // Access private property (works in JS)
          const ports = panel.ports
          if (ports) {
            result.hasPorts = true
            if (ports.tokens) {
              try {
                // Get tokens WITHOUT explicit invalidation to test the fix
                result.spacingTokens = ports.tokens.getSpacingTokens('pad')
                result.colorTokens = ports.tokens.getColorTokens()

                // Second call after explicit invalidation (should be same if fix works)
                ports.tokens.invalidateCache()
                result.colorTokensAfterInvalidate = ports.tokens.getColorTokens()
              } catch (e) {
                result.getAllSourceResult = 'Error: ' + e.message
              }
            }
          }
        }

        // Check getAllProjectSource
        if (window.getAllProjectSource) {
          try {
            const source = window.getAllProjectSource()
            result.sourceLength = source.length
            result.sourcePreview = source.substring(0, 500)

            // Manual color token extraction test
            const colorRegex = /\\$?([\\w.-]+):\\s*(#[0-9A-Fa-f]{3,8})/g
            let match
            const manualColors = []
            while ((match = colorRegex.exec(source)) !== null) {
              manualColors.push({ name: match[1], value: match[2] })
            }
            result.manualColorTokens = manualColors
          } catch (e) {
            result.getAllSourceResult = 'getAllProjectSource error: ' + e.message
          }
        } else {
          result.getAllSourceResult = 'getAllProjectSource not found'
        }

        return result
      })()
    `)
    return result
  }

  /**
   * Check if token buttons are visible in the Property Panel UI
   */
  async checkTokensInUI(): Promise<{
    tokenButtonCount: number
    hasTokenGroup: boolean
    tokenButtonLabels: string[]
    tokenDetails: Array<{ text: string; title: string; dataset: string }>
    spacingSectionPreview: string
    viewTokensDebug: string
    sourceDebug: string
    selectedElement: string | null
    propPanelVisible: boolean
  }> {
    const result = await this.evaluate<{
      tokenButtonCount: number
      hasTokenGroup: boolean
      tokenButtonLabels: string[]
      tokenDetails: Array<{ text: string; title: string; dataset: string }>
      spacingSectionPreview: string
      viewTokensDebug: string
      sourceDebug: string
      selectedElement: string | null
      propPanelVisible: boolean
    }>(`
      (async () => {
        // Select an element (e.g., the Button)
        const preview = document.getElementById('preview')
        const button = preview?.querySelector('button')
        if (button) {
          button.click()
          await new Promise(r => setTimeout(r, 500))
        }

        // Check for token buttons in property panel
        const tokenBtns = document.querySelectorAll('.token-btn')
        const tokenGroup = document.querySelector('.token-group')
        const propPanel = document.getElementById('property-panel')
        const selectedId = window.studio?.state?.get?.()?.selection || null

        // Get token button details
        const tokenDetails = Array.from(tokenBtns).slice(0, 10).map(b => ({
          text: b.textContent || '',
          title: b.getAttribute('title') || '',
          dataset: JSON.stringify(b.dataset)
        }))

        // Check spacing section specifically
        const spacingSection = propPanel?.querySelector('.section-content[data-expand-container="spacing"]')
        const spacingSectionHtml = spacingSection ? spacingSection.innerHTML.substring(0, 500) : 'not found'

        // Direct check of what tokens the panel view would get
        let viewTokensDebug = 'unable to access'
        let sourceDebug = ''
        try {
          const panel = window.studio?.propertyPanel
          if (panel && panel.view && panel.view.ports && panel.view.ports.tokens) {
            const padTokens = panel.view.ports.tokens.getSpacingTokens('pad')
            viewTokensDebug = JSON.stringify(padTokens)
          }
          // Also check getAllProjectSource
          if (window.getAllProjectSource) {
            const src = window.getAllProjectSource()
            sourceDebug = 'length=' + src.length + ', hasPadTokens=' + src.includes('.pad:')
          }
        } catch (e) {
          viewTokensDebug = 'error: ' + e.message
        }

        return {
          tokenButtonCount: tokenBtns.length,
          hasTokenGroup: !!tokenGroup,
          tokenButtonLabels: Array.from(tokenBtns).slice(0, 10).map(b => b.textContent || ''),
          tokenDetails,
          spacingSectionPreview: spacingSectionHtml,
          viewTokensDebug,
          sourceDebug,
          selectedElement: selectedId,
          propPanelVisible: propPanel ? propPanel.offsetHeight > 0 : false
        }
      })()
    `)
    return result
  }

  /**
   * Print a summary report
   */
  async printReport(): Promise<void> {
    console.log('\n📁 FILE EXPLORER REPORT')
    console.log('═'.repeat(60))

    // Files
    const files = await this.listFiles()
    console.log(`\n📂 Files (${files.totalFiles} total, current: ${files.currentFile})`)
    console.log('─'.repeat(40))
    for (const file of files.files) {
      console.log(`  ${file.type.padEnd(10)} ${file.name} (${file.size} bytes)`)
    }

    // Project source
    const projectSource = await this.getAllProjectSource()
    console.log(`\n📄 Combined Project Source`)
    console.log('─'.repeat(40))
    console.log(`  Length: ${projectSource.length} chars, ${projectSource.lineCount} lines`)
    console.log(
      `  Preview:\n${projectSource.preview
        .split('\n')
        .map(l => '    ' + l)
        .join('\n')}`
    )

    // Tokens
    const tokens = await this.getTokens()
    console.log(`\n🎨 Tokens`)
    console.log('─'.repeat(40))

    for (const [type, list] of Object.entries(tokens.spacing)) {
      if (list.length > 0) {
        console.log(`  ${type}: ${list.map(t => `${t.name}=${t.value}`).join(', ')}`)
      }
    }

    if (tokens.colors.length > 0) {
      console.log(`  colors: ${tokens.colors.map(t => `${t.name}=${t.value}`).join(', ')}`)
    }

    if (Object.values(tokens.spacing).every(l => l.length === 0) && tokens.colors.length === 0) {
      console.log('  ⚠️  No tokens found!')
    }

    console.log('\n' + '═'.repeat(60))
  }

  private async evaluate<T>(expression: string): Promise<T> {
    const result = await this.cdp.send<{
      result: { value: T }
      exceptionDetails?: { text: string }
    }>('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text)
    }

    return result.result.value
  }
}
