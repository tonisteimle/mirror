/**
 * File Manager Types
 */

export type FileType = 'tokens' | 'component' | 'layout'

export interface FileMetadata {
  name: string
  type: FileType
  created: Date
  modified: Date
  size: number
}

export interface Project {
  id: string
  name: string
  files: string[]
  created: Date
  modified: Date
}

export interface FileStore {
  files: Record<string, string>           // filename → content
  metadata: Record<string, FileMetadata>  // filename → metadata
  currentFile: string | null
  projects: Project[]
  currentProject: Project | null
  isDirty: Record<string, boolean>        // filename → hasUnsavedChanges
}

export interface FileManagerOptions {
  storage: 'local' | 'api' | 'tauri' | StorageAdapter
  apiEndpoint?: string
  projectPath?: string  // For Tauri: initial project path
  autoSave?: boolean
  autoSaveInterval?: number
}

// Forward declaration - actual type is in storage.ts
interface StorageAdapter {
  loadProject(id: string): Promise<{ files: Record<string, string>; project: Project } | null>
  saveProject(project: Project, files: Record<string, string>): Promise<void>
  listProjects(): Promise<Project[]>
  deleteProject(id: string): Promise<void>
  createProject(name: string): Promise<Project>
}

export interface FileManagerEvents {
  'file:created': { filename: string; type: FileType }
  'file:deleted': { filename: string }
  'file:renamed': { oldName: string; newName: string }
  'file:selected': { filename: string }
  'file:saved': { filename: string }
  'file:changed': { filename: string; content: string }
  'project:loaded': { project: Project }
  'project:saved': { project: Project }
  'project:created': { project: Project }
}
