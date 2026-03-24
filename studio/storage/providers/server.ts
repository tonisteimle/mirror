/**
 * Server Storage Provider
 *
 * Speichert Dateien über PHP REST API.
 */

import type { StorageProvider, StorageProject, StorageItem } from '../types'

// =============================================================================
// Server Provider
// =============================================================================

export class ServerProvider implements StorageProvider {
  readonly type = 'server' as const
  readonly supportsProjects = true
  readonly supportsNativeDialogs = false

  private apiBase: string
  private projectId: string | null = null

  constructor(apiBase: string = '/api') {
    this.apiBase = apiBase
  }

  // ===========================================================================
  // API Helper
  // ===========================================================================

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error ${response.status}: ${error}`)
    }

    return response.json()
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

    await this.fetch(`/projects/${this.projectId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ path })
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

    await this.fetch(`/projects/${this.projectId}/folders/${encodeURIComponent(oldPath)}/rename`, {
      method: 'POST',
      body: JSON.stringify({ newPath })
    })
  }

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    this.ensureProjectOpen()

    await this.fetch(`/projects/${this.projectId}/files/${encodeURIComponent(sourcePath)}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetFolder })
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
export async function isServerAvailable(apiBase: string = '/api', timeout: number = 2000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${apiBase}/health`, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}
