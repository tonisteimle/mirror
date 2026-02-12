import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '../constants'
import type { EditorTab } from '../components/EditorPanel'

export type AutoCompleteMode = 'always' | 'delay' | 'off'

export interface UseEditorStateReturn {
  activeTab: EditorTab
  setActiveTab: (tab: EditorTab) => void
  tokensCode: string
  setTokensCode: (code: string) => void
  componentsCode: string
  setComponentsCode: (code: string) => void
  highlightLine: number | undefined
  setHighlightLine: (line: number | undefined) => void
  autoCompleteMode: AutoCompleteMode
  setAutoCompleteMode: (mode: AutoCompleteMode) => void
}

export function useEditorState(): UseEditorStateReturn {
  const [activeTab, setActiveTab] = useState<EditorTab>('layout')
  const [tokensCode, setTokensCode] = useState('')
  const [componentsCode, setComponentsCode] = useState('')
  const [highlightLine, setHighlightLine] = useState<number | undefined>(undefined)

  // AutoComplete setting: 'always' | 'delay' | 'off' (persisted in localStorage)
  const [autoCompleteMode, setAutoCompleteMode] = useState<AutoCompleteMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTOCOMPLETE)
    if (saved === 'always' || saved === 'delay' || saved === 'off') return saved
    return 'always' // Default
  })

  // Persist autocomplete setting
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTOCOMPLETE, autoCompleteMode)
  }, [autoCompleteMode])

  return {
    activeTab,
    setActiveTab,
    tokensCode,
    setTokensCode,
    componentsCode,
    setComponentsCode,
    highlightLine,
    setHighlightLine,
    autoCompleteMode,
    setAutoCompleteMode,
  }
}
