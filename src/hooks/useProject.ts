import { useEffect, useRef, useCallback } from 'react'
import type { PageData } from '../components/PageSidebar'
import type { ASTNode } from '../parser/parser'
import { generateReactCode } from '../generator/react-exporter'

const STORAGE_KEY = 'mirror-project'

interface ProjectData {
  version?: number
  pages: PageData[]
  currentPageId: string
  componentsCode: string
  tokensCode: string
}

interface UseProjectProps {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  componentsCode: string
  tokensCode: string
  setPages: (pages: PageData[]) => void
  setCurrentPageId: (id: string) => void
  setLayoutCode: (code: string) => void
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
  componentsCode,
  tokensCode,
  setPages,
  setCurrentPageId,
  setLayoutCode,
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
  }, [pages, currentPageId, layoutCode, componentsCode, tokensCode, getCurrentPagesWithLayout])

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
          if (data.componentsCode) setComponentsCode(data.componentsCode)
          if (data.tokensCode) setTokensCode(data.tokensCode)
        }
      } catch (e) {
        console.error('Failed to load project:', e)
      }
    }
    isInitializedRef.current = true
  }, [])

  const exportProject = useCallback(() => {
    const projectData: ProjectData = {
      version: 1,
      pages: getCurrentPagesWithLayout(),
      currentPageId,
      componentsCode,
      tokensCode,
    }
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mirror-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [getCurrentPagesWithLayout, currentPageId, componentsCode, tokensCode])

  const importProject = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data: ProjectData = JSON.parse(event.target?.result as string)
          if (data.pages?.length > 0) {
            setPages(data.pages)
            setCurrentPageId(data.currentPageId || data.pages[0].id)
            const currentPage = data.pages.find(p => p.id === (data.currentPageId || data.pages[0].id))
            setLayoutCode(currentPage?.layoutCode || '')
            if (data.componentsCode) setComponentsCode(data.componentsCode)
            if (data.tokensCode) setTokensCode(data.tokensCode)
          }
        } catch (err) {
          console.error('Failed to import project:', err)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [setPages, setCurrentPageId, setLayoutCode, setComponentsCode, setTokensCode])

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
