/**
 * Tauri File System Storage Adapter
 *
 * Uses native file system via Tauri bridge for desktop app.
 * Loads/saves .mirror files directly from disk.
 */

import type { Project, FileType } from './types'
import type { StorageAdapter } from './storage'

// Get TauriBridge from window (injected by tauri-bridge.js)
function getTauriBridge(): any {
  return (window as any).TauriBridge
}

/**
 * Infer file type from filename
 */
function inferFileType(filename: string): FileType {
  const name = filename.toLowerCase()
  if (name.includes('token')) return 'tokens'
  if (name.includes('component')) return 'component'
  return 'layout'
}

/**
 * Get basename from path
 */
function basename(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

/**
 * Create a Tauri file system storage adapter
 *
 * @param basePath - Optional base path for relative project paths
 */
export function createTauriStorageAdapter(basePath?: string): StorageAdapter {
  const bridge = getTauriBridge()

  if (!bridge?.fs) {
    throw new Error('TauriBridge not available - not running in Tauri')
  }

  // Track current project path for saving
  let currentProjectPath: string | null = null

  return {
    /**
     * Load a project from a directory path
     * The id is the absolute path to the project folder
     */
    async loadProject(id: string): Promise<{ files: Record<string, string>; project: Project } | null> {
      try {
        const projectPath = id
        currentProjectPath = projectPath

        // List all files in directory
        const entries = await bridge.fs.listDirectory(projectPath)

        // Load all .mirror files
        const files: Record<string, string> = {}
        for (const entry of entries) {
          if (entry.name.endsWith('.mirror') && !entry.is_dir) {
            const filePath = `${projectPath}/${entry.name}`
            const content = await bridge.fs.readFile(filePath)
            files[entry.name] = content
          }
        }

        // Create project metadata
        const project: Project = {
          id: projectPath,
          name: basename(projectPath),
          files: Object.keys(files),
          created: new Date(),
          modified: new Date(),
        }

        return { files, project }
      } catch (error) {
        console.error('[TauriStorage] Failed to load project:', error)
        return null
      }
    },

    /**
     * Save project files to disk
     */
    async saveProject(project: Project, files: Record<string, string>): Promise<void> {
      const projectPath = project.id || currentProjectPath
      if (!projectPath) {
        throw new Error('No project path set')
      }

      try {
        // Save each file
        for (const [filename, content] of Object.entries(files)) {
          const filePath = `${projectPath}/${filename}`
          await bridge.fs.writeFile(filePath, content)
        }

        console.log('[TauriStorage] Project saved:', projectPath)
      } catch (error) {
        console.error('[TauriStorage] Failed to save project:', error)
        throw error
      }
    },

    /**
     * List recent projects
     * Uses Tauri's recent projects tracking
     */
    async listProjects(): Promise<Project[]> {
      try {
        const recentPaths = await bridge.project.getRecentProjects()

        return recentPaths.map((path: string) => ({
          id: path,
          name: basename(path),
          files: [],
          created: new Date(),
          modified: new Date(),
        }))
      } catch (error) {
        console.error('[TauriStorage] Failed to list projects:', error)
        return []
      }
    },

    /**
     * Delete a project (not implemented for file system)
     */
    async deleteProject(id: string): Promise<void> {
      // For safety, we don't delete folders from the file system
      // User should use Finder/Explorer for that
      console.warn('[TauriStorage] deleteProject not implemented for safety reasons')
    },

    /**
     * Create a new project folder
     */
    async createProject(name: string): Promise<Project> {
      // Open folder dialog to choose location
      const dialog = (window as any).TauriBridge?.dialog
      if (!dialog) {
        throw new Error('TauriBridge dialog not available')
      }

      const selectedPath = await dialog.openFolder()
      if (!selectedPath) {
        throw new Error('No folder selected')
      }

      // Create project folder with name
      const projectPath = `${selectedPath}/${name}`
      await bridge.fs.createDirectory(projectPath)

      // Create default index.mirror file
      const defaultContent = `// ${name}

Box w full, h full, center
  Text "Welcome to ${name}"
`
      await bridge.fs.writeFile(`${projectPath}/index.mirror`, defaultContent)

      const project: Project = {
        id: projectPath,
        name,
        files: ['index.mirror'],
        created: new Date(),
        modified: new Date(),
      }

      currentProjectPath = projectPath
      return project
    },
  }
}

/**
 * Check if running in Tauri
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined
}

/**
 * Open folder dialog and return selected path
 */
export async function openFolderDialog(): Promise<string | null> {
  const bridge = getTauriBridge()
  if (!bridge?.dialog) {
    throw new Error('TauriBridge dialog not available')
  }
  return bridge.dialog.openFolder()
}
