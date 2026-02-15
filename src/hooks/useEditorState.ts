import { useState, useEffect, useMemo } from 'react'
import { STORAGE_KEYS } from '../constants'
import type { EditorTab } from '../components/EditorPanel'
import type { DataSchema, DataInstance, DataRecord } from '../parser/types'
import { parseDataCode, instancesToRecords } from '../parser/data-parser'

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
  // NL Mode: Natural Language translation on Enter
  nlModeEnabled: boolean
  setNlModeEnabled: (enabled: boolean) => void
  // Picker Mode: Autocomplete pickers enabled/disabled
  pickerModeEnabled: boolean
  setPickerModeEnabled: (enabled: boolean) => void
  // Deep Thinking Mode: Use Opus 4.5 with full context
  deepThinkingEnabled: boolean
  setDeepThinkingEnabled: (enabled: boolean) => void
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
  const [tokensCode, setTokensCode] = useState('')
  const [componentsCode, setComponentsCode] = useState('')
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

  // NL Mode state (persisted in localStorage)
  const [nlModeEnabled, setNlModeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NL_MODE)
    return saved === 'true'
  })

  // Persist NL mode setting
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NL_MODE, String(nlModeEnabled))
  }, [nlModeEnabled])

  // Picker Mode state (persisted in localStorage) - defaults to true
  const [pickerModeEnabled, setPickerModeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PICKER_MODE)
    // Default to true if not set
    return saved !== 'false'
  })

  // Persist picker mode setting
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PICKER_MODE, String(pickerModeEnabled))
  }, [pickerModeEnabled])

  // Deep Thinking Mode state (persisted in localStorage) - defaults to false
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEEP_THINKING_MODE)
    return saved === 'true'
  })

  // Persist deep thinking mode setting
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEEP_THINKING_MODE, String(deepThinkingEnabled))
  }, [deepThinkingEnabled])

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
    nlModeEnabled,
    setNlModeEnabled,
    pickerModeEnabled,
    setPickerModeEnabled,
    deepThinkingEnabled,
    setDeepThinkingEnabled,
    dataCode,
    setDataCode,
    dataSchemas: parsedData.schemas,
    dataInstances: parsedData.instances,
    dataRecords,
  }
}
