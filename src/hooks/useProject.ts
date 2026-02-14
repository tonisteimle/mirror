import { useEffect, useRef, useCallback } from 'react'
import type { PageData } from '../components/PageSidebar'
import type { ASTNode } from '../parser/parser'
import { generateReactCode } from '../generator/react-exporter'
import { logger } from '../services/logger'
import {
  serializeMirrorFile,
  parseProjectFile,
  type MirrorProject
} from '../lib/mirror-file'

const STORAGE_KEY = 'mirror-project'

interface ProjectData {
  version?: number
  pages: PageData[]
  currentPageId: string
  dataCode?: string
  componentsCode: string
  tokensCode: string
}

interface UseProjectProps {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  dataCode: string
  componentsCode: string
  tokensCode: string
  setPages: (pages: PageData[]) => void
  setCurrentPageId: (id: string) => void
  setLayoutCode: (code: string) => void
  setDataCode: (code: string) => void
  setComponentsCode: (code: string) => void
  setTokensCode: (code: string) => void
  getCurrentPagesWithLayout: () => PageData[]
  parseResult: { nodes: ASTNode[] }
}

export interface UseProjectReturn {
  exportProject: () => void
  importProject: () => void
  exportReact: () => void
}

export function useProject({
  pages,
  currentPageId,
  layoutCode,
  dataCode,
  componentsCode,
  tokensCode,
  setPages,
  setCurrentPageId,
  setLayoutCode,
  setDataCode,
  setComponentsCode,
  setTokensCode,
  getCurrentPagesWithLayout,
  parseResult,
}: UseProjectProps): UseProjectReturn {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitializedRef = useRef(false)

  // Auto-save to localStorage with debounce
  useEffect(() => {
    // Skip first render to allow loading from localStorage
    if (!isInitializedRef.current) {
      return
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const projectData: ProjectData = {
        pages: getCurrentPagesWithLayout(),
        currentPageId,
        dataCode,
        componentsCode,
        tokensCode,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData))
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [pages, currentPageId, layoutCode, dataCode, componentsCode, tokensCode, getCurrentPagesWithLayout])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data: ProjectData = JSON.parse(saved)
        if (data.pages?.length > 0) {
          setPages(data.pages)
          setCurrentPageId(data.currentPageId || data.pages[0].id)
          const currentPage = data.pages.find(p => p.id === (data.currentPageId || data.pages[0].id))
          setLayoutCode(currentPage?.layoutCode || '')
          if (data.dataCode) setDataCode(data.dataCode)
          if (data.componentsCode) setComponentsCode(data.componentsCode)
          if (data.tokensCode) setTokensCode(data.tokensCode)
        }
      } catch (e) {
        logger.storage.error('Failed to load project', e)
      }
    }
    isInitializedRef.current = true
  }, [])

  // Export project to .mirror file
  const exportProject = useCallback(() => {
    const mirrorProject: MirrorProject = {
      version: 1,
      dataCode,
      tokensCode,
      componentsCode,
      pages: getCurrentPagesWithLayout().map(p => ({
        id: p.id,
        name: p.name,
        layoutCode: p.layoutCode
      })),
      currentPageId,
    }

    const content = serializeMirrorFile(mirrorProject)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project.mirror'
    a.click()
    URL.revokeObjectURL(url)
  }, [getCurrentPagesWithLayout, currentPageId, dataCode, componentsCode, tokensCode])

  // Import project from file (supports .mirror and .json)
  const importProject = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mirror,.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const result = parseProjectFile(content)

        if (result.success && result.project) {
          const project = result.project
          setPages(project.pages)
          setCurrentPageId(project.currentPageId || project.pages[0]?.id || 'page-1')
          const currentPage = project.pages.find(p => p.id === project.currentPageId)
          setLayoutCode(currentPage?.layoutCode || '')
          setDataCode(project.dataCode)
          setComponentsCode(project.componentsCode)
          setTokensCode(project.tokensCode)
        } else {
          logger.storage.error('Failed to import project', result.error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [setPages, setCurrentPageId, setLayoutCode, setDataCode, setComponentsCode, setTokensCode])

  const exportReact = useCallback(() => {
    const reactCode = generateReactCode(parseResult.nodes)
    const blob = new Blob([reactCode], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'App.tsx'
    a.click()
    URL.revokeObjectURL(url)
  }, [parseResult.nodes])

  return {
    exportProject,
    importProject,
    exportReact,
  }
}
