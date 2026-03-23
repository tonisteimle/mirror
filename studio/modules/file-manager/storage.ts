/**
 * Storage Adapters - LocalStorage and API
 */

import type { Project, FileStore } from './types'

export interface StorageAdapter {
  loadProject(id: string): Promise<{ files: Record<string, string>; project: Project } | null>
  saveProject(project: Project, files: Record<string, string>): Promise<void>
  listProjects(): Promise<Project[]>
  deleteProject(id: string): Promise<void>
  createProject(name: string): Promise<Project>
}

// LocalStorage adapter
export function createLocalStorageAdapter(): StorageAdapter {
  const STORAGE_KEY = 'mirror-studio'

  function getStorageData(): { projects: Project[]; files: Record<string, Record<string, string>> } {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        return JSON.parse(data, (key, value) => {
          if (key === 'created' || key === 'modified') {
            return new Date(value)
          }
          return value
        })
      }
    } catch (error) {
      console.error('[Storage] Failed to parse storage data:', error)
    }
    return { projects: [], files: {} }
  }

  function setStorageData(data: { projects: Project[]; files: Record<string, Record<string, string>> }): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('[Storage] Failed to save storage data:', error)
    }
  }

  return {
    async loadProject(id: string) {
      const data = getStorageData()
      const project = data.projects.find(p => p.id === id)
      if (!project) return null

      return {
        project,
        files: data.files[id] || {},
      }
    },

    async saveProject(project: Project, files: Record<string, string>) {
      const data = getStorageData()
      const index = data.projects.findIndex(p => p.id === project.id)

      project.modified = new Date()

      if (index >= 0) {
        data.projects[index] = project
      } else {
        data.projects.push(project)
      }

      data.files[project.id] = files
      setStorageData(data)
    },

    async listProjects() {
      const data = getStorageData()
      return data.projects
    },

    async deleteProject(id: string) {
      const data = getStorageData()
      data.projects = data.projects.filter(p => p.id !== id)
      delete data.files[id]
      setStorageData(data)
    },

    async createProject(name: string) {
      const project: Project = {
        id: `project-${Date.now()}`,
        name,
        files: [],
        created: new Date(),
        modified: new Date(),
      }

      const data = getStorageData()
      data.projects.push(project)
      data.files[project.id] = {}
      setStorageData(data)

      return project
    },
  }
}

// Re-export Tauri adapter
export { createTauriStorageAdapter, isTauri, openFolderDialog } from './tauri-storage'

// API adapter for remote storage
export function createApiStorageAdapter(endpoint: string): StorageAdapter {
  async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${endpoint}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  return {
    async loadProject(id: string) {
      try {
        return await apiCall<{ files: Record<string, string>; project: Project }>(`/projects/${id}`)
      } catch {
        return null
      }
    },

    async saveProject(project: Project, files: Record<string, string>) {
      await apiCall(`/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({ project, files }),
      })
    },

    async listProjects() {
      return apiCall<Project[]>('/projects')
    },

    async deleteProject(id: string) {
      await apiCall(`/projects/${id}`, { method: 'DELETE' })
    },

    async createProject(name: string) {
      return apiCall<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
    },
  }
}
