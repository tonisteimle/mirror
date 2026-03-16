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
  storage: 'local' | 'api'
  apiEndpoint?: string
  autoSave?: boolean
  autoSaveInterval?: number
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
