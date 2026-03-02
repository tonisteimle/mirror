import { useState, useEffect, useMemo, useCallback } from 'react'
import { STORAGE_KEYS } from '../constants'
import type { EditorTab } from '../components/EditorPanel'
import type { DataSchema, DataInstance, DataRecord } from '../parser/types'
import { parseDataCode, instancesToRecords } from '../parser/data-parser'
import { defaultComponentsCode, defaultTokensCode } from './useEditor'

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
  // Note: pickerModeEnabled, expandShorthand are managed by useAppState
  // Data tab state (unified code for schema + instances)
  dataCode: string
  setDataCode: (code: string) => void
  // Parsed data (derived from dataCode)
  dataSchemas: DataSchema[]
  dataInstances: DataInstance[]
  // Data records for backwards compatibility with generator
  dataRecords: Map<string, DataRecord[]>
}

export function useEditorState(): UseEditorStateReturn {
  const [activeTab, setActiveTab] = useState<EditorTab>('layout')
  const [tokensCode, setTokensCode] = useState(defaultTokensCode)
  const [componentsCode, setComponentsCode] = useState(defaultComponentsCode)
  const [highlightLine, setHighlightLine] = useState<number | undefined>(undefined)

  // Data tab state - unified code containing both schema and instances
  const [dataCode, setDataCode] = useState('')

  // Parse data code to get schemas and instances
  const parsedData = useMemo(() => {
    if (!dataCode.trim()) {
      return { schemas: [], instances: [], errors: [] }
    }
    return parseDataCode(dataCode)
  }, [dataCode])

  // Convert instances to records for backwards compatibility
  const dataRecords = useMemo(() => {
    return instancesToRecords(parsedData.schemas, parsedData.instances)
  }, [parsedData.schemas, parsedData.instances])

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
    dataCode,
    setDataCode,
    dataSchemas: parsedData.schemas,
    dataInstances: parsedData.instances,
    dataRecords,
  }
}
