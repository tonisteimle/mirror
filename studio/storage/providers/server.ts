/**
 * Server Storage Provider
 *
 * Speichert Dateien über PHP REST API.
 */

import type { StorageProvider, StorageProject, StorageItem } from '../types'

// =============================================================================
// API Base URL Helper
// =============================================================================

/**
 * Ermittelt die korrekte API-Basis-URL
 *
 * Prüft in dieser Reihenfolge:
 * 1. window.MIRROR_API_BASE (explizite Konfiguration)
 * 2. data-api-base Attribut auf <script> Tag
 * 3. Automatische Erkennung basierend auf aktuellem Pfad
 *
 * Beispiele für automatische Erkennung:
 * - Seite: /mirror/index.html → API: /mirror/api
 * - Seite: /index.html → API: /api
 * - Seite: /app/studio/ → API: /app/studio/api
 */
function getDefaultApiBase(): string {
  if (typeof window === 'undefined') {
    return '/api'
  }

  // 1. Explizite Konfiguration
  const globalConfig = (window as unknown as { MIRROR_API_BASE?: string }).MIRROR_API_BASE
  if (globalConfig) {
    return globalConfig
  }

  // 2. data-api-base auf Script-Tag
  const scriptTag = document.querySelector('script[data-api-base]')
  if (scriptTag) {
    const apiBase = scriptTag.getAttribute('data-api-base')
    if (apiBase) return apiBase
  }

  // 3. Automatische Erkennung
  const pathname = window.location.pathname

  // Entferne den Dateinamen (z.B. index.html) und Query-Parameter
  let basePath = pathname

  // Entferne Dateiendung wenn vorhanden
  if (basePath.includes('.')) {
    basePath = basePath.substring(0, basePath.lastIndexOf('/'))
  }

  // Entferne trailing slash
  basePath = basePath.replace(/\/$/, '')

  // z.B. /mirror → /mirror/api
  return basePath + '/api'
}

// =============================================================================
// Server Provider
// =============================================================================

export class ServerProvider implements StorageProvider {
  readonly type = 'server' as const
  readonly supportsProjects = true
  readonly supportsNativeDialogs = false

  private apiBase: string
  private projectId: string | null = null

  constructor(apiBase?: string) {
    this.apiBase = apiBase ?? getDefaultApiBase()
  }

  // ===========================================================================
  // API Helper
  // ===========================================================================

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    let response: Response

    try {
      response = await fetch(`${this.apiBase}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })
    } catch (networkError) {
      // Network error (offline, DNS failure, CORS, etc.)
      throw new Error(`Network error: Unable to connect to server. Please check your connection.`)
    }

    // Get response text first (safer than direct JSON parse)
    const responseText = await response.text()

    if (!response.ok) {
      // Try to extract error message from JSON response
      let errorMessage = responseText
      try {
        const errorJson = JSON.parse(responseText)
        errorMessage = errorJson.error || errorJson.message || responseText
      } catch {
        // Response is not JSON, use raw text
      }

      // Provide user-friendly error messages based on status
      switch (response.status) {
        case 401:
          throw new Error('Session expired. Please refresh the page.')
        case 403:
          throw new Error('Access denied. You do not have permission for this action.')
        case 404:
          throw new Error(`Not found: ${errorMessage}`)
        case 500:
          throw new Error(`Server error: ${errorMessage}`)
        default:
          throw new Error(`API Error ${response.status}: ${errorMessage}`)
      }
    }

    // Parse JSON response safely
    if (!responseText) {
      return {} as T // Empty response
    }

    try {
      return JSON.parse(responseText) as T
    } catch (parseError) {
      throw new Error(`Invalid server response: Expected JSON but received: ${responseText.substring(0, 100)}...`)
    }
  }

  // ===========================================================================
  // Projekt-Operationen
  // ===========================================================================

  async listProjects(): Promise<StorageProject[]> {
    const data = await this.fetch<Array<{
      id: string
      name: string
      created_at?: string
      updated_at?: string
    }>>('/projects')

    return data.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at ? new Date(p.created_at) : undefined,
      updatedAt: p.updated_at ? new Date(p.updated_at) : undefined
    }))
  }

  async createProject(name: string): Promise<StorageProject> {
    const data = await this.fetch<{
      id: string
      name: string
      created_at?: string
    }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name })
    })

    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: new Date()
    }
  }

  async deleteProject(id: string): Promise<void> {
    await this.fetch(`/projects/${id}`, { method: 'DELETE' })
  }

  async openProject(id: string): Promise<void> {
    this.projectId = id
  }

  async closeProject(): Promise<void> {
    this.projectId = null
  }

  // ===========================================================================
  // Datei-Baum
  // ===========================================================================

  async getTree(): Promise<StorageItem[]> {
    this.ensureProjectOpen()

    const data = await this.fetch<StorageItem[]>(`/projects/${this.projectId}/files`)
    return data
  }

  // ===========================================================================
  // Datei-Operationen
  // ===========================================================================

  async readFile(path: string): Promise<string> {
    this.ensureProjectOpen()

    const data = await this.fetch<{ content: string }>(
      `/projects/${this.projectId}/files/${encodeURIComponent(path)}`
    )
    return data.content
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.ensureProjectOpen()

    await this.fetch(`/projects/${this.projectId}/files/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    })
  }

  async deleteFile(path: string): Promise<void> {
    this.ensureProjectOpen()

    await this.fetch(`/projects/${this.projectId}/files/${encodeURIComponent(path)}`, {
      method: 'DELETE'
    })
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    this.ensureProjectOpen()

    await this.fetch(`/projects/${this.projectId}/files/${encodeURIComponent(oldPath)}/rename`, {
      method: 'POST',
      body: JSON.stringify({ newPath })
    })
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    this.ensureProjectOpen()

    await this.fetch(`/projects/${this.projectId}/files/${encodeURIComponent(sourcePath)}/copy`, {
      method: 'POST',
      body: JSON.stringify({ targetPath })
    })
  }

  // ===========================================================================
  // Ordner-Operationen
  // ===========================================================================

  async createFolder(path: string): Promise<void> {
    this.ensureProjectOpen()

    // Split path into name and parent
    const parts = path.split('/')
    const name = parts.pop()!
    const parent = parts.length > 0 ? parts.join('/') : undefined

    await this.fetch(`/projects/${this.projectId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, parent })
    })
  }

  async deleteFolder(path: string): Promise<void> {
    this.ensureProjectOpen()

    await this.fetch(`/projects/${this.projectId}/folders/${encodeURIComponent(path)}`, {
      method: 'DELETE'
    })
  }

  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    this.ensureProjectOpen()

    // Extract just the new name from the new path
    const newName = newPath.split('/').pop()!

    await this.fetch(`/projects/${this.projectId}/folders/${encodeURIComponent(oldPath)}/rename`, {
      method: 'POST',
      body: JSON.stringify({ newName })
    })
  }

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    this.ensureProjectOpen()

    await this.fetch(`/projects/${this.projectId}/move`, {
      method: 'POST',
      body: JSON.stringify({ sourcePath, targetFolder })
    })
  }

  // ===========================================================================
  // Hilfsfunktionen
  // ===========================================================================

  private ensureProjectOpen(): void {
    if (!this.projectId) {
      throw new Error('No project open')
    }
  }

  /**
   * Aktuelles Projekt (für externe Verwendung)
   */
  getProjectId(): string | null {
    return this.projectId
  }
}

/**
 * Prüft ob der Server erreichbar ist
 */
export async function isServerAvailable(apiBase?: string, timeout: number = 2000): Promise<boolean> {
  try {
    const base = apiBase ?? getDefaultApiBase()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${base}/health`, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}
