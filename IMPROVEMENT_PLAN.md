# Mirror/Designer - Umfassender Verbesserungsplan

Basierend auf der Code-Analyse der Kerndateien. Dieser Plan ist in 7 Phasen unterteilt, von schnellen Gewinnen bis zu umfassenden Refactorings.

---

## Phase 1: Quick Wins (Niedriger Aufwand, hoher Impact)

**Geschaetzte Dauer**: 1-2 Tage

### 1.1 Magic Numbers in constants.ts auslagern

**Dateien zu erstellen/aendern**:
- NEU: `/src/constants.ts`
- AENDERN: `/src/App.tsx`
- AENDERN: `/src/hooks/useHistory.ts`
- AENDERN: `/src/components/PromptPanel.tsx`

**Aufgabendetails**:

```typescript
// /src/constants.ts

// UI Constraints
export const UI = {
  PANEL_MIN_WIDTH: 300,
  PANEL_MAX_WIDTH: 800,
  PANEL_DEFAULT_WIDTH: 420,
  HEADER_HEIGHT: 56,
  DEBOUNCE_DELAY_MS: 500,
  AUTOCOMPLETE_DELAY_MS: 300,
} as const

// History
export const HISTORY = {
  MAX_SIZE: 50,
  DEBOUNCE_MS: 500,
} as const

// Storage Keys
export const STORAGE_KEYS = {
  PROJECT: 'mirror-project',
  AUTOCOMPLETE: 'mirror-autocomplete',
  API_KEY: 'mirror-api-key',
} as const

// API
export const API = {
  MODEL: 'anthropic/claude-3.5-sonnet',
  MAX_TOKENS: 4096,
  ENDPOINT: '/api/openrouter/chat/completions',
} as const

// Default Token Values
export const DEFAULT_TOKENS = `// Farben
$primary: #3B82F6
...
` as const
```

**Betroffene Stellen in App.tsx**:
- Zeile 85: `panelWidth: 420` -> `PANEL_DEFAULT_WIDTH`
- Zeile 491: `'mirror-project'` -> `STORAGE_KEYS.PROJECT`
- Zeile 500/502: `500` (debounce) -> `UI.DEBOUNCE_DELAY_MS`
- Zeile 602: `300, 800` -> `PANEL_MIN_WIDTH, PANEL_MAX_WIDTH`

**Betroffene Stellen in useHistory.ts**:
- Zeile 17: `MAX_HISTORY_SIZE = 50` -> Import aus constants
- Zeile 68: `500` (debounce) -> `HISTORY.DEBOUNCE_MS`

**Verifizierung**:
- [ ] Alle Magic Numbers durch Konstanten ersetzt
- [ ] Anwendung funktioniert wie zuvor
- [ ] TypeScript kompiliert ohne Fehler

**Komplexitaet**: Niedrig

---

### 1.2 Import/Export Validierung mit Zod Schema

**Dateien zu erstellen/aendern**:
- NEU: `/src/schemas/project.ts`
- AENDERN: `/src/App.tsx` (handleImport, handleExport)

**Aufgabendetails**:

```typescript
// /src/schemas/project.ts
import { z } from 'zod'

export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  layoutCode: z.string(),
})

export const ProjectSchema = z.object({
  version: z.number().min(1).max(1),
  pages: z.array(PageSchema).min(1),
  currentPageId: z.string(),
  componentsCode: z.string(),
  tokensCode: z.string(),
})

export type Project = z.infer<typeof ProjectSchema>
export type Page = z.infer<typeof PageSchema>

export function validateProject(data: unknown): Project {
  return ProjectSchema.parse(data)
}

export function isValidProject(data: unknown): data is Project {
  return ProjectSchema.safeParse(data).success
}
```

**Aenderungen in App.tsx (handleImport)**:
```typescript
import { validateProject } from './schemas/project'

const handleImport = useCallback(() => {
  // ...existing file reading...
  reader.onload = (event) => {
    try {
      const rawData = JSON.parse(event.target?.result as string)
      const data = validateProject(rawData) // <-- Validierung

      if (data.pages.length > 0) {
        setPages(data.pages)
        // ...rest
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError({
          title: 'Ungueltiges Projektformat',
          message: 'Die Datei entspricht nicht dem erwarteten Format.',
          details: err.errors.map(e => e.message).join(', ')
        })
      } else {
        console.error('Failed to import project:', err)
      }
    }
  }
}, [])
```

**Verifizierung**:
- [ ] Import mit gueltigem Projekt funktioniert
- [ ] Import mit ungueltigem JSON zeigt Fehlerdialog
- [ ] Import mit fehlendem Feld zeigt spezifischen Fehler
- [ ] Export-Format entspricht Schema

**Komplexitaet**: Niedrig

---

### 1.3 API Key Eingabefeld mit localStorage

**Dateien zu erstellen/aendern**:
- NEU: `/src/components/ApiKeyInput.tsx`
- AENDERN: `/src/App.tsx` (Header-Bereich)
- AENDERN: `/src/lib/ai.ts`

**Aufgabendetails**:

```typescript
// /src/components/ApiKeyInput.tsx
import { useState, useEffect } from 'react'
import { colors } from '../theme'
import { STORAGE_KEYS } from '../constants'

interface ApiKeyInputProps {
  onApiKeyChange: (key: string) => void
}

export function ApiKeyInput({ onApiKeyChange }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.API_KEY)
    if (saved) {
      setApiKey(saved)
      onApiKeyChange(saved)
    }
  }, [onApiKeyChange])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey)
    onApiKeyChange(apiKey)
    setIsEditing(false)
  }

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'Nicht gesetzt'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {isEditing ? (
        <>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="OpenRouter API Key"
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: colors.surface,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              width: '200px',
            }}
          />
          <button onClick={handleSave} style={{ /* styles */ }}>
            Speichern
          </button>
        </>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            fontSize: '12px',
            color: apiKey ? colors.text : colors.warning,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg /* key icon */ />
          {maskedKey}
        </button>
      )}
    </div>
  )
}
```

**Aenderungen in ai.ts**:
```typescript
// Statt hardcoded env variable
let OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''

export function setApiKey(key: string) {
  OPENROUTER_API_KEY = key
}

export function hasApiKey(): boolean {
  return Boolean(OPENROUTER_API_KEY)
}
```

**Verifizierung**:
- [ ] API Key wird in localStorage gespeichert
- [ ] Maskierte Anzeige des Keys
- [ ] AI-Generierung funktioniert mit gespeichertem Key
- [ ] Fehlermeldung wenn kein Key gesetzt

**Komplexitaet**: Niedrig

---

## Phase 2: App.tsx Refactoring

**Geschaetzte Dauer**: 2-3 Tage

### 2.1 usePageManager Hook extrahieren

**Dateien zu erstellen/aendern**:
- NEU: `/src/hooks/usePageManager.ts`
- AENDERN: `/src/App.tsx`

**Aufgabendetails**:

```typescript
// /src/hooks/usePageManager.ts
import { useState, useCallback } from 'react'
import type { PageData } from '../components/PageSidebar'

interface UsePageManagerOptions {
  initialPages?: PageData[]
}

interface UsePageManagerReturn {
  pages: PageData[]
  currentPageId: string
  currentPage: PageData | undefined
  layoutCode: string
  setLayoutCode: (code: string) => void
  switchToPage: (pageId: string) => void
  addPage: () => void
  renamePage: (pageId: string, newName: string) => void
  deletePage: (pageId: string) => string[] | null
  reorderPages: (fromIndex: number, toIndex: number) => void
  navigateToPage: (pageName: string) => void
  getPageReferences: (pageName: string) => string[]
}

export function usePageManager(options: UsePageManagerOptions = {}): UsePageManagerReturn {
  const [pages, setPages] = useState<PageData[]>(
    options.initialPages || [{ id: 'home', name: 'Home', layoutCode: '' }]
  )
  const [currentPageId, setCurrentPageId] = useState(
    options.initialPages?.[0]?.id || 'home'
  )
  const [layoutCode, setLayoutCode] = useState('')

  // Alle Page-Management Callbacks aus App.tsx hierher verschieben:
  // - switchToPage (Zeilen 161-172)
  // - handleAddPage (Zeilen 174-189)
  // - handleRenamePage (Zeilen 191-195)
  // - getPageReferences (Zeilen 198-213)
  // - handleDeletePage (Zeilen 215-239)
  // - handleReorderPages (Zeilen 241-248)
  // - handlePageNavigate (Zeilen 250-272)

  const switchToPage = useCallback((pageId: string) => {
    setPages(prev => prev.map(p =>
      p.id === currentPageId ? { ...p, layoutCode } : p
    ))
    const page = pages.find(p => p.id === pageId)
    if (page) {
      setLayoutCode(page.layoutCode)
      setCurrentPageId(pageId)
    }
  }, [currentPageId, layoutCode, pages])

  // ... weitere Callbacks

  return {
    pages,
    currentPageId,
    currentPage: pages.find(p => p.id === currentPageId),
    layoutCode,
    setLayoutCode,
    switchToPage,
    addPage: handleAddPage,
    renamePage: handleRenamePage,
    deletePage: handleDeletePage,
    reorderPages: handleReorderPages,
    navigateToPage: handlePageNavigate,
    getPageReferences,
  }
}
```

**Aenderungen in App.tsx**:
```typescript
// Vorher: ~120 Zeilen Page-Management Code
// Nachher:
const pageManager = usePageManager()

// Verwendung:
<PageSidebar
  pages={pageManager.pages}
  currentPageId={pageManager.currentPageId}
  onSelectPage={pageManager.switchToPage}
  onAddPage={pageManager.addPage}
  onRenamePage={pageManager.renamePage}
  onDeletePage={pageManager.deletePage}
  onReorderPages={pageManager.reorderPages}
/>
```

**Verifizierung**:
- [ ] Seiten-Wechsel funktioniert
- [ ] Neue Seite erstellen funktioniert
- [ ] Seite umbenennen funktioniert
- [ ] Seite loeschen funktioniert (inkl. Referenz-Check)
- [ ] Seiten-Reihenfolge aendern funktioniert
- [ ] Page-Navigation via Preview funktioniert

**Komplexitaet**: Mittel

---

### 2.2 useProjectStorage Hook extrahieren

**Dateien zu erstellen/aendern**:
- NEU: `/src/hooks/useProjectStorage.ts`
- AENDERN: `/src/App.tsx`

**Aufgabendetails**:

```typescript
// /src/hooks/useProjectStorage.ts
import { useEffect, useRef, useCallback } from 'react'
import type { PageData } from '../components/PageSidebar'
import { validateProject } from '../schemas/project'
import { STORAGE_KEYS, UI } from '../constants'

interface ProjectState {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  componentsCode: string
  tokensCode: string
}

interface UseProjectStorageReturn {
  save: () => void
  exportProject: () => void
  importProject: () => Promise<ProjectState | null>
}

export function useProjectStorage(
  state: ProjectState,
  onError: (error: { title: string; message: string; details?: string }) => void
): UseProjectStorageReturn {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save mit Debounce (Zeilen 494-517 aus App.tsx)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const projectData = {
        pages: state.pages.map(p =>
          p.id === state.currentPageId ? { ...p, layoutCode: state.layoutCode } : p
        ),
        currentPageId: state.currentPageId,
        componentsCode: state.componentsCode,
        tokensCode: state.tokensCode,
      }
      localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectData))
    }, UI.DEBOUNCE_DELAY_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state])

  const exportProject = useCallback(() => {
    const projectData = {
      version: 1,
      pages: state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, layoutCode: state.layoutCode } : p
      ),
      currentPageId: state.currentPageId,
      componentsCode: state.componentsCode,
      tokensCode: state.tokensCode,
    }
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mirror-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [state])

  const importProject = useCallback((): Promise<ProjectState | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const rawData = JSON.parse(event.target?.result as string)
            const data = validateProject(rawData)

            resolve({
              pages: data.pages,
              currentPageId: data.currentPageId,
              layoutCode: data.pages.find(p => p.id === data.currentPageId)?.layoutCode || '',
              componentsCode: data.componentsCode,
              tokensCode: data.tokensCode,
            })
          } catch (err) {
            if (err instanceof Error) {
              onError({
                title: 'Import fehlgeschlagen',
                message: 'Die Datei konnte nicht importiert werden.',
                details: err.message,
              })
            }
            resolve(null)
          }
        }
        reader.readAsText(file)
      }
      input.click()
    })
  }, [onError])

  return {
    save: () => {}, // Manuelle Save-Funktion falls benoetigt
    exportProject,
    importProject,
  }
}
```

**Verifizierung**:
- [ ] Auto-Save funktioniert (Debounced)
- [ ] Export erstellt valide JSON-Datei
- [ ] Import laedt Projekt korrekt
- [ ] Import zeigt Fehler bei ungueltigem Format

**Komplexitaet**: Mittel

---

### 2.3 Editor und Sidebar Komponenten separieren

**Dateien zu erstellen/aendern**:
- NEU: `/src/components/EditorPanel.tsx`
- NEU: `/src/components/HeaderBar.tsx`
- AENDERN: `/src/App.tsx`

**Aufgabendetails**:

```typescript
// /src/components/EditorPanel.tsx
import { PromptPanel } from './PromptPanel'
import { colors } from '../theme'

interface EditorPanelProps {
  activeTab: 'layout' | 'components' | 'tokens'
  onTabChange: (tab: 'layout' | 'components' | 'tokens') => void
  layoutCode: string
  componentsCode: string
  tokensCode: string
  onLayoutChange: (code: string) => void
  onComponentsChange: (code: string) => void
  onTokensChange: (code: string) => void
  highlightLine?: number
  autoCompleteMode: 'always' | 'delay' | 'off'
  onClear: () => void
  onClean: () => void
  aiPrompt: string
  onAiPromptChange: (prompt: string) => void
  onAiGenerate: () => void
  isGenerating: boolean
}

export function EditorPanel({
  activeTab,
  onTabChange,
  layoutCode,
  componentsCode,
  tokensCode,
  onLayoutChange,
  onComponentsChange,
  onTokensChange,
  highlightLine,
  autoCompleteMode,
  onClear,
  onClean,
  aiPrompt,
  onAiPromptChange,
  onAiGenerate,
  isGenerating,
}: EditorPanelProps) {
  const currentCode = activeTab === 'layout' ? layoutCode
    : activeTab === 'components' ? componentsCode
    : tokensCode

  const currentOnChange = activeTab === 'layout' ? onLayoutChange
    : activeTab === 'components' ? onComponentsChange
    : onTokensChange

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onAiGenerate()
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: colors.panel,
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Tab Toggle - Zeilen 776-870 aus App.tsx */}
      <TabBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onClear={onClear}
        onClean={onClean}
      />

      {/* Editor */}
      <div style={{ flex: 1, overflow: 'hidden', paddingLeft: '4px' }}>
        <PromptPanel
          value={currentCode}
          onChange={currentOnChange}
          highlightLine={activeTab === 'layout' ? highlightLine : undefined}
          tab={activeTab === 'tokens' ? undefined : activeTab}
          getOtherTabCode={activeTab === 'tokens' ? undefined : () =>
            activeTab === 'layout' ? componentsCode : layoutCode
          }
          tokensCode={tokensCode}
          autoCompleteMode={autoCompleteMode}
        />
      </div>

      {/* AI Prompt Input - Zeilen 883-912 */}
      <AiPromptInput
        value={aiPrompt}
        onChange={onAiPromptChange}
        onSubmit={onAiGenerate}
        isGenerating={isGenerating}
      />
    </div>
  )
}
```

```typescript
// /src/components/HeaderBar.tsx
import { colors } from '../theme'

interface HeaderBarProps {
  autoCompleteMode: 'always' | 'delay' | 'off'
  onCycleAutoComplete: () => void
  onImport: () => void
  onExport: () => void
  onExportReact: () => void
}

export function HeaderBar({
  autoCompleteMode,
  onCycleAutoComplete,
  onImport,
  onExport,
  onExportReact,
}: HeaderBarProps) {
  return (
    <div style={{
      height: '56px',
      backgroundColor: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: '20px',
      paddingRight: '16px',
    }}>
      {/* Logo und Buttons - Zeilen 627-745 aus App.tsx */}
    </div>
  )
}
```

**Resultierende App.tsx Struktur**:
```typescript
function App() {
  // State und Hooks (~50 Zeilen statt ~200)
  const pageManager = usePageManager()
  const storage = useProjectStorage(...)
  const history = useHistory(...)

  // Wenige verbleibende Callbacks

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <HeaderBar {...headerProps} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <PageSidebar {...pageProps} />

        <EditorPanel {...editorProps} />

        <Resizer {...resizerProps} />

        <Preview {...previewProps} />
      </div>

      <ErrorDialog {...errorProps} />
    </div>
  )
}
```

**Verifizierung**:
- [ ] App.tsx reduziert auf ~200 Zeilen (von ~950)
- [ ] Alle Features funktionieren wie zuvor
- [ ] Komponenten sind unabhaengig testbar

**Komplexitaet**: Mittel-Hoch

---

## Phase 3: PromptPanel State Konsolidierung

**Geschaetzte Dauer**: 1-2 Tage

### 3.1 useState zu useReducer konsolidieren

**Dateien zu aendern**:
- `/src/components/PromptPanel.tsx`

**Aktuelle Situation** (11 useState-Aufrufe fuer Picker):
```typescript
// Zeilen 55-98
const [colorPickerOpen, setColorPickerOpen] = useState(false)
const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 })
const [currentColor, setCurrentColor] = useState<string | undefined>(undefined)
const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
const [commandPalettePosition, setCommandPalettePosition] = useState({ x: 0, y: 0 })
const [commandPaletteQuery, setCommandPaletteQuery] = useState('')
// ... 20+ weitere useState Aufrufe
```

**Loesung mit useReducer**:

```typescript
// /src/components/PromptPanel.tsx

type PickerType = 'color' | 'command' | 'font' | 'icon' | 'spacing' | 'shadow' | 'weight' | 'token' | 'property' | 'value'

interface PickerState {
  activePicker: PickerType | null
  position: { x: number; y: number }
  // Picker-spezifische Daten
  currentColor?: string
  commandQuery?: string
  spacingProperty?: 'pad' | 'mar' | 'gap'
  propertyQuery?: string
  propertyReplaceRange?: { from: number; to: number } | null
  valueProperty?: string
}

type PickerAction =
  | { type: 'OPEN_PICKER'; picker: PickerType; position: { x: number; y: number }; data?: Partial<PickerState> }
  | { type: 'CLOSE_PICKER' }
  | { type: 'CLOSE_ALL' }
  | { type: 'UPDATE_DATA'; data: Partial<PickerState> }

const initialPickerState: PickerState = {
  activePicker: null,
  position: { x: 0, y: 0 },
}

function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case 'OPEN_PICKER':
      return {
        ...initialPickerState,
        activePicker: action.picker,
        position: action.position,
        ...action.data,
      }
    case 'CLOSE_PICKER':
    case 'CLOSE_ALL':
      return initialPickerState
    case 'UPDATE_DATA':
      return { ...state, ...action.data }
    default:
      return state
  }
}

// In der Komponente:
export const PromptPanel = forwardRef<PromptPanelRef, PromptPanelProps>(
  function PromptPanel({ value, onChange, ... }, ref) {
    const [pickerState, dispatch] = useReducer(pickerReducer, initialPickerState)

    // Vereinfachte Open-Funktionen
    const openColorPicker = useCallback(() => {
      const view = editorRef.current
      if (!view) return

      const cursorPos = view.state.selection.main.head
      const coords = view.coordsAtPos(cursorPos)

      if (coords) {
        // Farbe unter Cursor finden...
        dispatch({
          type: 'OPEN_PICKER',
          picker: 'color',
          position: { x: coords.left, y: coords.bottom + 4 },
          data: { currentColor: foundColor }
        })
      }
    }, [])

    // Render Picker basierend auf aktivem Picker
    const renderActivePicker = () => {
      switch (pickerState.activePicker) {
        case 'color':
          return (
            <ColorPicker
              isOpen={true}
              onClose={() => dispatch({ type: 'CLOSE_PICKER' })}
              onSelect={insertColor}
              position={pickerState.position}
              initialColor={pickerState.currentColor}
              tokens={tokensCode}
              defaultToTokens={tab !== 'tokens'}
            />
          )
        case 'font':
          return <FontPicker ... />
        // ... weitere Picker
        default:
          return null
      }
    }

    return (
      <div>
        {/* Editor Content */}
        {renderActivePicker()}
      </div>
    )
  }
)
```

**Verifizierung**:
- [ ] Alle 11 Picker funktionieren wie zuvor
- [ ] Nur ein Picker kann gleichzeitig offen sein
- [ ] ESC schliesst aktiven Picker
- [ ] State-Updates sind atomar

**Komplexitaet**: Mittel

---

### 3.2 usePickerManager Hook erstellen

**Dateien zu erstellen**:
- NEU: `/src/hooks/usePickerManager.ts`

```typescript
// /src/hooks/usePickerManager.ts
import { useReducer, useCallback } from 'react'
import type { EditorView } from '@codemirror/view'

type PickerType = 'color' | 'command' | 'font' | 'icon' | 'spacing' | 'shadow' | 'weight' | 'token' | 'property' | 'value'

interface PickerConfig {
  type: PickerType
  position: { x: number; y: number }
  data: Record<string, unknown>
}

interface PickerManagerState {
  active: PickerConfig | null
}

export function usePickerManager(editorRef: React.RefObject<EditorView | null>) {
  const [state, dispatch] = useReducer(reducer, { active: null })

  const getPosition = useCallback(() => {
    const view = editorRef.current
    if (!view) return null

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return null

    return { x: coords.left, y: coords.bottom + 4 }
  }, [editorRef])

  const openPicker = useCallback(<T extends PickerType>(
    type: T,
    data?: Record<string, unknown>
  ) => {
    const position = getPosition()
    if (!position) return

    dispatch({
      type: 'OPEN',
      payload: { type, position, data: data || {} }
    })
  }, [getPosition])

  const closePicker = useCallback(() => {
    dispatch({ type: 'CLOSE' })
  }, [])

  const isOpen = useCallback((type: PickerType) => {
    return state.active?.type === type
  }, [state.active])

  return {
    active: state.active,
    openPicker,
    closePicker,
    isOpen,
    getPosition,
    // Convenience methods
    openColorPicker: (initialColor?: string) => openPicker('color', { initialColor }),
    openFontPicker: () => openPicker('font'),
    openIconPicker: () => openPicker('icon'),
    openSpacingPicker: (property: 'pad' | 'mar' | 'gap') => openPicker('spacing', { property }),
    openShadowPicker: () => openPicker('shadow'),
    openWeightPicker: () => openPicker('weight'),
    openTokenPicker: () => openPicker('token'),
    openPropertyPicker: (query?: string, replaceRange?: { from: number; to: number }) =>
      openPicker('property', { query, replaceRange }),
    openValuePicker: (property: string) => openPicker('value', { property }),
  }
}
```

**Verifizierung**:
- [ ] Hook ist unabhaengig testbar
- [ ] Alle Picker-Typen werden unterstuetzt
- [ ] Position wird korrekt berechnet

**Komplexitaet**: Mittel

---

## Phase 4: Generator Deduplizierung

**Geschaetzte Dauer**: 1 Tag

### 4.1 generateReactElement und generateReactElementWithoutLibrary zusammenfuehren

**Dateien zu aendern**:
- `/src/generator/react-generator.tsx`

**Aktuelle Situation**:
Die Funktionen `generateReactElement` (Zeilen 966-1098) und `generateReactElementWithoutLibrary` (Zeilen 855-952) haben ~80% duplizierten Code.

**Loesung - Gemeinsame Hilfsfunktion**:

```typescript
// /src/generator/react-generator.tsx

interface RenderNodeOptions extends GenerateOptions {
  skipLibraryHandling?: boolean
}

// Gemeinsame Rendering-Logik
function renderNode(
  node: ASTNode,
  options: RenderNodeOptions
): React.ReactNode {
  const { onHover, onClick, hoveredId, selectedId, inspectMode, skipLibraryHandling } = options

  if (node.name === '_text') {
    return <span key={node.id}>{node.content}</span>
  }

  // Library component handling (nur wenn nicht uebersprungen)
  if (!skipLibraryHandling && node._isLibrary) {
    return (
      <LibraryComponentRenderer
        key={node.id}
        node={node}
        options={options}
      />
    )
  }

  // Gemeinsame Style-Berechnung
  const hasChildren = node.children.length > 0
  const baseStyle = propertiesToStyle(node.properties, hasChildren)
  const style = modifiersToStyle(node.modifiers, baseStyle)

  // Highlight Styles fuer Inspect Mode
  const isHovered = inspectMode && hoveredId === node.id
  const isSelected = selectedId === node.id
  const highlightStyle: React.CSSProperties = {
    ...style,
    outline: isHovered ? '2px solid #3B82F6' : isSelected ? '2px solid #10B981' : undefined,
    outlineOffset: isHovered || isSelected ? '2px' : undefined,
    cursor: inspectMode ? 'pointer' : undefined,
  }

  // Icon und Image Handling
  const iconName = node.properties.icon as string | undefined
  const IconComponent = iconName ? getIcon(iconName) : null
  const iconSize = typeof node.properties.size === 'number' ? node.properties.size : 20
  const iconColor = typeof node.properties.col === 'string' ? node.properties.col : 'currentColor'

  const imageSrc = node.properties.src as string | undefined
  const imageAlt = (node.properties.alt as string) || node.content || ''
  const imageFit = (node.properties.fit as string) || 'cover'

  // Rekursive Kinder-Generierung
  const children = node.children.length > 0
    ? generateReactElementInternal(node.children, options)
    : (imageSrc ? null : node.content)

  // Event Handler
  const handleMouseEnter = inspectMode ? () => onHover?.(node.id) : undefined
  const handleMouseLeave = inspectMode ? () => onHover?.(null) : undefined
  const handleClick = inspectMode ? (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(node.id)
  } : undefined

  // Hover Styles
  const nodeHasHover = hasHoverStyles(node.properties)
  const hoverStyles = nodeHasHover ? extractHoverStyles(node.properties) : {}

  // Image Element
  const imageElement = imageSrc ? (
    <img
      src={imageSrc}
      alt={imageAlt}
      style={{
        width: '100%',
        height: '100%',
        objectFit: imageFit as 'cover' | 'contain' | 'fill' | 'none' | 'scale-down',
        borderRadius: 'inherit',
      }}
    />
  ) : null

  // Interaktive Komponente
  if (needsInteractiveComponent(node)) {
    return (
      <InteractiveComponent
        key={node.id}
        node={node}
        baseStyle={style}
        hoverStyle={hoverStyles}
        highlightStyle={highlightStyle}
        inspectMode={inspectMode}
        onInspectHover={handleMouseEnter}
        onInspectLeave={handleMouseLeave}
        onInspectClick={handleClick}
      >
        {imageElement}
        {IconComponent && <IconComponent size={iconSize} color={iconColor} />}
        {children}
      </InteractiveComponent>
    )
  }

  // Hoverable Element
  if (nodeHasHover) {
    return (
      <HoverableDiv
        key={node.id}
        dataId={node.id}
        className={node.name}
        baseStyle={highlightStyle}
        hoverStyle={hoverStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {imageElement}
        {IconComponent && <IconComponent size={iconSize} color={iconColor} />}
        {children}
      </HoverableDiv>
    )
  }

  // Standard Element
  return (
    <div
      key={node.id}
      data-id={node.id}
      className={node.name}
      style={highlightStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {imageElement}
      {IconComponent && <IconComponent size={iconSize} color={iconColor} />}
      {children}
    </div>
  )
}

// Interne Hilfsfunktion fuer rekursive Aufrufe
function generateReactElementInternal(
  nodes: ASTNode[],
  options: RenderNodeOptions
): React.ReactNode {
  return nodes.map(node => renderNode(node, options))
}

// Oeffentliche API (unveraendert)
export function generateReactElement(
  nodes: ASTNode[],
  options: GenerateOptions = {}
): React.ReactNode {
  return generateReactElementInternal(nodes, { ...options, skipLibraryHandling: false })
}

// Fuer Library-Komponenten (vermeidet Rekursion)
function generateReactElementWithoutLibrary(
  nodes: ASTNode[],
  options: GenerateOptions = {}
): React.ReactNode {
  return generateReactElementInternal(nodes, { ...options, skipLibraryHandling: true })
}
```

**Verifizierung**:
- [ ] ~100 Zeilen Code entfernt
- [ ] Alle Komponenten rendern korrekt
- [ ] Library-Komponenten funktionieren
- [ ] Inspect Mode funktioniert
- [ ] Hover-Effekte funktionieren

**Komplexitaet**: Mittel

---

## Phase 5: Parser Refactoring

**Geschaetzte Dauer**: 3-4 Tage

### 5.1 Parser in Module aufteilen

**Dateien zu erstellen**:
- NEU: `/src/parser/property-parser.ts`
- NEU: `/src/parser/layout-parser.ts`
- NEU: `/src/parser/state-parser.ts`
- AENDERN: `/src/parser/parser.ts`

**Aufgabendetails**:

```typescript
// /src/parser/property-parser.ts
import type { Token } from './lexer'
import type { ASTNode, StyleMixin } from './types'

interface PropertyParserContext {
  current: () => Token | undefined
  advance: () => Token
  designTokens: Map<string, string | number>
}

// Padding/Margin/Border Parsing (Zeilen 620-678 aus parser.ts)
export function parseSpacingProperty(
  propName: 'pad' | 'mar' | 'bor',
  ctx: PropertyParserContext,
  node: ASTNode
): void {
  const directions: string[] = []

  while (ctx.current()?.type === 'DIRECTION') {
    directions.push(...splitDirections(ctx.advance().value))
  }

  const values: number[] = []
  while (ctx.current()?.type === 'NUMBER') {
    values.push(parseInt(ctx.advance().value, 10))
    if (values.length === 1 && ctx.current()?.type === 'TOKEN_DEF') {
      const tokenName = ctx.advance().value
      ctx.designTokens.set(tokenName, values[0])
    }
  }

  // Token-Referenz
  if (values.length === 0 && ctx.current()?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)
    if (typeof tokenValue === 'number') {
      values.push(tokenValue)
    }
  }

  applySpacingValues(propName, directions, values, node.properties)
}

// Layout-Eigenschaften (hor, ver, cen) - Zeilen 679-705
export function parseLayoutProperty(
  propName: 'hor' | 'ver' | 'cen',
  ctx: PropertyParserContext,
  node: ASTNode
): void {
  if (propName === 'hor' || propName === 'ver') {
    node.properties[propName] = true

    const next = ctx.current()
    if (next?.type === 'DIRECTION') {
      node.properties['align_main'] = ctx.advance().value
    } else if (next?.type === 'PROPERTY' && (next.value === 'cen' || next.value === 'between')) {
      node.properties['align_main'] = ctx.advance().value
    }

    const cross = ctx.current()
    if (cross?.type === 'DIRECTION') {
      node.properties['align_cross'] = ctx.advance().value
    } else if (cross?.type === 'PROPERTY' && cross.value === 'cen') {
      node.properties['align_cross'] = ctx.advance().value
    }
  } else if (propName === 'cen') {
    node.properties['align_main'] = 'cen'
    if (ctx.current()?.type === 'PROPERTY' && ctx.current()!.value === 'cen') {
      ctx.advance()
      node.properties['align_cross'] = 'cen'
    }
  }
}

// Style-Gruppen Parsing (Zeilen 404-490)
export function parseStyleGroup(ctx: PropertyParserContext): StyleMixin {
  // ...
}

// Hilfsfunktionen
function applySpacingValues(
  prefix: string,
  directions: string[],
  values: number[],
  properties: Record<string, string | number | boolean>
): void {
  if (values.length === 0) return

  if (directions.length > 0) {
    for (const dir of directions) {
      properties[`${prefix}_${dir}`] = values[0]
    }
  } else if (values.length === 1) {
    properties[prefix] = values[0]
  } else if (values.length === 2) {
    properties[`${prefix}_u`] = values[0]
    properties[`${prefix}_d`] = values[0]
    properties[`${prefix}_l`] = values[1]
    properties[`${prefix}_r`] = values[1]
  } else if (values.length === 3) {
    properties[`${prefix}_u`] = values[0]
    properties[`${prefix}_l`] = values[1]
    properties[`${prefix}_r`] = values[1]
    properties[`${prefix}_d`] = values[2]
  } else if (values.length >= 4) {
    properties[`${prefix}_u`] = values[0]
    properties[`${prefix}_r`] = values[1]
    properties[`${prefix}_d`] = values[2]
    properties[`${prefix}_l`] = values[3]
  }
}
```

```typescript
// /src/parser/state-parser.ts
import type { Token } from './lexer'
import type { StateDefinition, VariableDeclaration, EventHandler, ActionStatement, Conditional, ConditionExpr } from './types'

interface StateParserContext {
  current: () => Token | undefined
  advance: () => Token
  lexerTokens: Token[]
  pos: number
}

// parseStateDefinition (Zeilen 129-196)
export function parseStateDefinition(
  ctx: StateParserContext,
  baseIndent: number
): StateDefinition | null {
  // ...
}

// parseVariableDeclaration (Zeilen 199-220)
export function parseVariableDeclaration(ctx: StateParserContext): VariableDeclaration | null {
  // ...
}

// parseAction (Zeilen 223-269)
export function parseAction(ctx: StateParserContext): ActionStatement | null {
  // ...
}

// parseCondition (Zeilen 272-304)
export function parseCondition(ctx: StateParserContext): ConditionExpr | null {
  // ...
}

// parseEventHandler (Zeilen 307-397)
export function parseEventHandler(
  ctx: StateParserContext,
  baseIndent: number
): EventHandler | null {
  // ...
}
```

```typescript
// /src/parser/layout-parser.ts
import type { ASTNode, SelectionCommand } from './types'

// parseSelectionCommand (Zeilen 1185-1313)
export function parseSelectionCommand(
  ctx: ParserContext,
  targetId: string
): SelectionCommand | null {
  // ...
}

// parseComponent (Zeilen 506-1182) - In kleinere Funktionen aufteilen
export function parseComponent(
  ctx: ParserContext,
  baseIndent: number,
  parentScope?: string,
  isExplicitDefinition: boolean = false,
  isChildOfDefinition: boolean = false
): ASTNode | null {
  // Hauptlogik bleibt, aber delegiert an Hilfsfunktionen
  const node = createBaseNode(ctx.current()!)

  if (hasFromKeyword(ctx)) {
    applyBaseComponent(ctx, node)
  }

  parseInlineProperties(ctx, node)
  parseInlineSlots(ctx, node)

  // ...
}
```

**Refaktorierte parser.ts Struktur**:
```typescript
// /src/parser/parser.ts
import { parseSpacingProperty, parseLayoutProperty, parseStyleGroup } from './property-parser'
import { parseStateDefinition, parseVariableDeclaration, parseEventHandler } from './state-parser'
import { parseSelectionCommand } from './layout-parser'

export function parse(input: string): ParseResult {
  const ctx = createParserContext(input)

  // ... reduzierte Hauptlogik die Module verwendet
}
```

**Verifizierung**:
- [ ] Alle Parser-Tests bestehen
- [ ] parser.ts auf ~400 Zeilen reduziert (von ~1585)
- [ ] Module sind einzeln testbar

**Komplexitaet**: Hoch

---

### 5.2 Tiefenlimit fuer rekursive Funktionen

**Dateien zu aendern**:
- `/src/parser/parser.ts`
- `/src/parser/parser-utils.ts`

**Aufgabendetails**:

```typescript
// /src/constants.ts (erweitern)
export const PARSER = {
  MAX_NESTING_DEPTH: 20,
  MAX_CHILDREN_PER_NODE: 100,
} as const

// /src/parser/parser.ts
import { PARSER } from '../constants'

function parseComponent(
  ctx: ParserContext,
  baseIndent: number,
  parentScope?: string,
  isExplicitDefinition: boolean = false,
  isChildOfDefinition: boolean = false,
  depth: number = 0  // NEU
): ASTNode | null {
  // Tiefenlimit pruefen
  if (depth > PARSER.MAX_NESTING_DEPTH) {
    ctx.errors.push(
      `Line ${ctx.current()?.line}: Maximum nesting depth (${PARSER.MAX_NESTING_DEPTH}) exceeded`
    )
    return null
  }

  // ... bestehende Logik

  // Rekursive Aufrufe mit erhöhter Tiefe
  const child = parseComponent(ctx, childIndent, componentName, false, false, depth + 1)
}

// /src/parser/parser-utils.ts
export function cloneChildrenWithNewIds(
  children: ASTNode[],
  generateId: (name: string) => string,
  depth: number = 0
): ASTNode[] {
  if (depth > PARSER.MAX_NESTING_DEPTH) {
    console.warn('cloneChildrenWithNewIds: Max depth exceeded')
    return []
  }

  return children.map(child => ({
    ...child,
    id: generateId(child.name),
    children: cloneChildrenWithNewIds(child.children, generateId, depth + 1)
  }))
}
```

**Verifizierung**:
- [ ] Tief verschachtelte DSL wird abgelehnt mit klarer Fehlermeldung
- [ ] Normale DSL wird weiterhin korrekt geparsed
- [ ] Keine Stack Overflow Fehler moeglich

**Komplexitaet**: Niedrig

---

## Phase 6: History Optimierung

**Geschaetzte Dauer**: 2 Tage

### 6.1 Delta-basierte Speicherung implementieren

**Dateien zu erstellen/aendern**:
- NEU: `/src/hooks/useDeltaHistory.ts`
- AENDERN: `/src/hooks/useHistory.ts` (optional ersetzen)

**Aufgabendetails**:

```typescript
// /src/hooks/useDeltaHistory.ts
import { useState, useCallback, useRef } from 'react'
import { diff_match_patch } from 'diff-match-patch'  // npm install diff-match-patch

export interface HistoryState {
  layoutCode: string
  componentsCode: string
}

interface DeltaEntry {
  layoutDelta: string[]  // Patches als JSON
  componentsDelta: string[]
  timestamp: number
}

interface FullState extends HistoryState {
  timestamp: number
}

const MAX_HISTORY_SIZE = 100  // Mehr Eintraege moeglich weil kleiner
const FULL_STATE_INTERVAL = 10  // Alle 10 Eintraege vollstaendiger Snapshot

export function useDeltaHistory(initialState: HistoryState) {
  const dmp = useRef(new diff_match_patch())

  // Aktueller vollstaendiger State
  const [currentState, setCurrentState] = useState<FullState>({
    ...initialState,
    timestamp: Date.now()
  })

  // History als Deltas + periodische Snapshots
  const [history, setHistory] = useState<(DeltaEntry | FullState)[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  // Letzter bekannter State fuer Diff-Berechnung
  const lastStateRef = useRef<HistoryState>(initialState)

  const pushState = useCallback((state: HistoryState) => {
    // Keine Aenderung?
    if (
      state.layoutCode === lastStateRef.current.layoutCode &&
      state.componentsCode === lastStateRef.current.componentsCode
    ) {
      return
    }

    const now = Date.now()
    const shouldStoreFullState = (currentIndex + 1) % FULL_STATE_INTERVAL === 0

    if (shouldStoreFullState) {
      // Vollstaendiger Snapshot
      const fullState: FullState = {
        ...state,
        timestamp: now
      }
      setHistory(prev => [...prev.slice(0, currentIndex + 1), fullState])
    } else {
      // Delta berechnen
      const layoutPatches = dmp.current.patch_make(
        lastStateRef.current.layoutCode,
        state.layoutCode
      )
      const componentsPatches = dmp.current.patch_make(
        lastStateRef.current.componentsCode,
        state.componentsCode
      )

      const delta: DeltaEntry = {
        layoutDelta: dmp.current.patch_toText(layoutPatches).split('\n'),
        componentsDelta: dmp.current.patch_toText(componentsPatches).split('\n'),
        timestamp: now
      }

      setHistory(prev => [...prev.slice(0, currentIndex + 1), delta].slice(-MAX_HISTORY_SIZE))
    }

    setCurrentIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1))
    lastStateRef.current = state
    setCurrentState({ ...state, timestamp: now })
  }, [currentIndex])

  const reconstructState = useCallback((targetIndex: number): HistoryState | null => {
    if (targetIndex < 0 || targetIndex >= history.length) return null

    // Finde den letzten vollstaendigen State vor/bei targetIndex
    let baseIndex = targetIndex
    let baseState: FullState | null = null

    for (let i = targetIndex; i >= 0; i--) {
      const entry = history[i]
      if ('layoutCode' in entry) {
        baseState = entry
        baseIndex = i
        break
      }
    }

    if (!baseState) {
      // Kein Basis-State gefunden, verwende Initial-State
      baseState = {
        ...initialState,
        timestamp: 0
      }
      baseIndex = -1
    }

    // Deltas anwenden
    let state = { ...baseState }
    for (let i = baseIndex + 1; i <= targetIndex; i++) {
      const entry = history[i]
      if ('layoutDelta' in entry) {
        const layoutPatches = dmp.current.patch_fromText(entry.layoutDelta.join('\n'))
        const [layoutCode] = dmp.current.patch_apply(layoutPatches, state.layoutCode)

        const componentsPatches = dmp.current.patch_fromText(entry.componentsDelta.join('\n'))
        const [componentsCode] = dmp.current.patch_apply(componentsPatches, state.componentsCode)

        state = { layoutCode, componentsCode, timestamp: entry.timestamp }
      } else {
        state = entry
      }
    }

    return state
  }, [history, initialState])

  const undo = useCallback((): HistoryState | null => {
    if (currentIndex <= 0) return null
    const newIndex = currentIndex - 1
    const state = reconstructState(newIndex)
    if (state) {
      setCurrentIndex(newIndex)
      setCurrentState({ ...state, timestamp: Date.now() })
      lastStateRef.current = state
    }
    return state
  }, [currentIndex, reconstructState])

  const redo = useCallback((): HistoryState | null => {
    if (currentIndex >= history.length - 1) return null
    const newIndex = currentIndex + 1
    const state = reconstructState(newIndex)
    if (state) {
      setCurrentIndex(newIndex)
      setCurrentState({ ...state, timestamp: Date.now() })
      lastStateRef.current = state
    }
    return state
  }, [currentIndex, history.length, reconstructState])

  // Speichernutzung berechnen
  const getMemoryUsage = useCallback((): number => {
    let bytes = 0
    for (const entry of history) {
      if ('layoutCode' in entry) {
        bytes += entry.layoutCode.length + entry.componentsCode.length
      } else {
        bytes += entry.layoutDelta.join('').length + entry.componentsDelta.join('').length
      }
    }
    return bytes
  }, [history])

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    pushState,
    undo,
    redo,
    clear: () => {
      setHistory([])
      setCurrentIndex(-1)
    },
    memoryUsage: getMemoryUsage(),
    historyLength: history.length,
  }
}
```

**Verifizierung**:
- [ ] Undo/Redo funktioniert korrekt
- [ ] Speicherverbrauch ist ~50-70% geringer bei vielen Aenderungen
- [ ] Periodische Snapshots verhindern Fehler-Akkumulation
- [ ] Performance ist akzeptabel (< 10ms pro Operation)

**Komplexitaet**: Hoch

---

### 6.2 Speicherlimit hinzufuegen

**Dateien zu aendern**:
- `/src/hooks/useHistory.ts` oder `/src/hooks/useDeltaHistory.ts`

```typescript
// /src/constants.ts (erweitern)
export const HISTORY = {
  MAX_SIZE: 50,
  MAX_MEMORY_BYTES: 5 * 1024 * 1024,  // 5 MB
  DEBOUNCE_MS: 500,
} as const

// In useHistory.ts
const pushState = useCallback((state: HistoryState) => {
  // ... bestehende Logik

  // Speicherlimit pruefen
  setHistory(prev => {
    let newHistory = [...prev.slice(0, idx + 1), state]

    // Groesse berechnen
    let totalBytes = 0
    for (const entry of newHistory) {
      totalBytes += entry.layoutCode.length + entry.componentsCode.length
    }

    // Aelteste Eintraege entfernen bis unter Limit
    while (totalBytes > HISTORY.MAX_MEMORY_BYTES && newHistory.length > 1) {
      const removed = newHistory.shift()!
      totalBytes -= removed.layoutCode.length + removed.componentsCode.length
    }

    return newHistory
  })
}, [])
```

**Verifizierung**:
- [ ] Speicher bleibt unter 5 MB
- [ ] Aelteste Eintraege werden entfernt
- [ ] Mindestens 1 Eintrag bleibt immer erhalten

**Komplexitaet**: Niedrig

---

## Phase 7: Dokumentation und Tests

**Geschaetzte Dauer**: 2-3 Tage

### 7.1 JSDoc fuer oeffentliche APIs

**Dateien zu aendern**:
- `/src/parser/parser.ts`
- `/src/generator/react-generator.tsx`
- `/src/lib/ai.ts`
- `/src/validation/index.ts`
- Alle neuen Hooks

**Beispiel-Dokumentation**:

```typescript
// /src/parser/parser.ts

/**
 * Parst eine Mirror DSL-Eingabe in einen Abstract Syntax Tree (AST).
 *
 * @param input - Der DSL-Quellcode als String
 * @returns ParseResult mit Nodes, Errors, Registry und Tokens
 *
 * @example
 * ```typescript
 * const result = parse(`
 *   Button: bg #3B82F6 pad 12 rad 8
 *     "Click me"
 * `)
 *
 * console.log(result.nodes[0].name) // "Button"
 * console.log(result.errors) // []
 * ```
 *
 * @remarks
 * - Komponenten-Namen muessen mit Grossbuchstaben beginnen
 * - Einrueckung erfolgt mit 2 Spaces
 * - Token-Variablen beginnen mit $
 */
export function parse(input: string): ParseResult {
  // ...
}

/**
 * Registrierte Komponenten-Templates
 */
export interface ComponentTemplate {
  /** CSS-aehnliche Modifier wie -primary, -ghost */
  modifiers: string[]
  /** Eigenschaften wie bg, pad, rad */
  properties: Record<string, string | number | boolean>
  /** Text-Inhalt der Komponente */
  content?: string
  /** Kind-Komponenten */
  children: ASTNode[]
  /** State-Definitionen fuer interaktive Komponenten */
  states?: StateDefinition[]
  /** Variablen-Deklarationen */
  variables?: VariableDeclaration[]
  /** Event-Handler */
  eventHandlers?: EventHandler[]
}

// /src/lib/ai.ts

/**
 * Generiert DSL-Code basierend auf einer natuerlichsprachlichen Beschreibung.
 *
 * @param userPrompt - Die Benutzer-Anfrage in natuerlicher Sprache
 * @param tokensCode - Aktuelle Token-Definitionen
 * @param componentsCode - Aktuelle Komponenten-Definitionen
 * @param layoutCode - Aktueller Layout-Code
 * @returns GeneratedCode mit tokens, components und layout Strings
 *
 * @throws Error wenn die API nicht erreichbar ist oder die Generierung fehlschlaegt
 *
 * @example
 * ```typescript
 * const result = await generateDSL(
 *   "Erstelle einen Button mit blauem Hintergrund",
 *   "$primary: #3B82F6",
 *   "",
 *   ""
 * )
 *
 * console.log(result.components) // "Button: bg $primary pad 12 rad 8"
 * ```
 */
export async function generateDSL(
  userPrompt: string,
  tokensCode: string,
  componentsCode: string,
  layoutCode: string
): Promise<GeneratedCode> {
  // ...
}
```

**Verifizierung**:
- [ ] Alle exportierten Funktionen haben JSDoc
- [ ] Beispiele in der Dokumentation sind korrekt
- [ ] TypeDoc kann die Dokumentation generieren

**Komplexitaet**: Mittel

---

### 7.2 Tests fuer AI-Integration

**Dateien zu erstellen**:
- NEU: `/src/__tests__/ai-integration.test.ts`

```typescript
// /src/__tests__/ai-integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateDSL, setApiKey, hasApiKey } from '../lib/ai'

describe('AI Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('API Key Management', () => {
    it('should report no API key when not set', () => {
      expect(hasApiKey()).toBe(false)
    })

    it('should report API key after setting', () => {
      setApiKey('test-key-123')
      expect(hasApiKey()).toBe(true)
    })
  })

  describe('generateDSL', () => {
    it('should parse response with all three sections', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: `--- TOKENS ---
$primary: #3B82F6

--- COMPONENTS ---
Button: bg $primary pad 12

--- LAYOUT ---
Button "Click"`
          }
        }]
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      setApiKey('test-key')
      const result = await generateDSL('Create a button', '', '', '')

      expect(result.tokens).toContain('$primary')
      expect(result.components).toContain('Button:')
      expect(result.layout).toContain('Button')
    })

    it('should handle missing sections gracefully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: `--- COMPONENTS ---
Button: bg #333`
          }
        }]
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      setApiKey('test-key')
      const result = await generateDSL('Create a button', '', '', '')

      expect(result.tokens).toBe('')
      expect(result.components).toContain('Button:')
      expect(result.layout).toBe('')
    })

    it('should throw on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429
      })

      setApiKey('test-key')
      await expect(generateDSL('Test', '', '', '')).rejects.toThrow('API Error: 429')
    })

    it('should apply validation corrections', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: `--- COMPONENTS ---
Button: background-color #3B82F6

--- LAYOUT ---
Button "Test"`
          }
        }]
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      setApiKey('test-key')
      const result = await generateDSL('Test', '', '', '')

      // ValidationService sollte "background-color" zu "bg" korrigieren
      expect(result.components).toContain('bg')
      expect(result.components).not.toContain('background-color')
      expect(result.wasValidated).toBe(true)
    })
  })
})
```

**Verifizierung**:
- [ ] Alle Tests bestehen
- [ ] Edge Cases sind abgedeckt
- [ ] Mocking funktioniert korrekt

**Komplexitaet**: Mittel

---

### 7.3 Tests fuer neue Hooks

**Dateien zu erstellen**:
- NEU: `/src/__tests__/usePageManager.test.ts`
- NEU: `/src/__tests__/useProjectStorage.test.ts`
- NEU: `/src/__tests__/usePickerManager.test.ts`

```typescript
// /src/__tests__/usePageManager.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { usePageManager } from '../hooks/usePageManager'

describe('usePageManager', () => {
  it('should initialize with default page', () => {
    const { result } = renderHook(() => usePageManager())

    expect(result.current.pages).toHaveLength(1)
    expect(result.current.pages[0].name).toBe('Home')
    expect(result.current.currentPageId).toBe('home')
  })

  it('should add a new page', () => {
    const { result } = renderHook(() => usePageManager())

    act(() => {
      result.current.addPage()
    })

    expect(result.current.pages).toHaveLength(2)
    expect(result.current.pages[1].name).toBe('Page 2')
  })

  it('should switch pages and preserve layout code', () => {
    const { result } = renderHook(() => usePageManager())

    // Layout auf erster Seite aendern
    act(() => {
      result.current.setLayoutCode('Button "Test"')
    })

    // Neue Seite erstellen
    act(() => {
      result.current.addPage()
    })

    // Zurueck zur ersten Seite
    act(() => {
      result.current.switchToPage('home')
    })

    expect(result.current.layoutCode).toBe('Button "Test"')
  })

  it('should detect page references when deleting', () => {
    const { result } = renderHook(() => usePageManager({
      initialPages: [
        { id: 'home', name: 'Home', layoutCode: 'page Settings' },
        { id: 'settings', name: 'Settings', layoutCode: '' }
      ]
    }))

    const references = result.current.deletePage('settings')

    expect(references).toEqual(['Home'])
    expect(result.current.pages).toHaveLength(2) // Nicht geloescht
  })

  it('should reorder pages', () => {
    const { result } = renderHook(() => usePageManager({
      initialPages: [
        { id: '1', name: 'Page 1', layoutCode: '' },
        { id: '2', name: 'Page 2', layoutCode: '' },
        { id: '3', name: 'Page 3', layoutCode: '' }
      ]
    }))

    act(() => {
      result.current.reorderPages(0, 2)
    })

    expect(result.current.pages[0].name).toBe('Page 2')
    expect(result.current.pages[1].name).toBe('Page 3')
    expect(result.current.pages[2].name).toBe('Page 1')
  })
})
```

**Verifizierung**:
- [ ] Alle Hook-Tests bestehen
- [ ] Zustandsuebergaenge sind korrekt
- [ ] Edge Cases sind abgedeckt

**Komplexitaet**: Mittel

---

## Zusammenfassung

| Phase | Aufwand | Impact | Prioritaet |
|-------|---------|--------|------------|
| 1. Quick Wins | 1-2 Tage | Hoch | Sofort |
| 2. App.tsx Refactoring | 2-3 Tage | Hoch | Hoch |
| 3. PromptPanel State | 1-2 Tage | Mittel | Mittel |
| 4. Generator Deduplizierung | 1 Tag | Mittel | Mittel |
| 5. Parser Refactoring | 3-4 Tage | Hoch | Hoch |
| 6. History Optimierung | 2 Tage | Mittel | Niedrig |
| 7. Dokumentation & Tests | 2-3 Tage | Hoch | Parallel |

**Empfohlene Reihenfolge**:
1. Phase 1 (Quick Wins) - Sofort umsetzen
2. Phase 2.1 + 2.2 (Hooks extrahieren) - Macht App.tsx wartbar
3. Phase 5.2 (Tiefenlimit) - Sicherheit
4. Phase 7 (Tests) - Parallel zu allen anderen Phasen
5. Phase 3 (PromptPanel) - Nach Phase 2
6. Phase 4 (Generator) - Unabhaengig
7. Phase 5.1 (Parser Module) - Groesstes Refactoring
8. Phase 6 (History) - Nice-to-have

**Gesamtdauer**: ~12-17 Arbeitstage

---

## Abhaengigkeiten

```
Phase 1 (constants.ts) ---> Alle anderen Phasen
Phase 1 (Zod Schema) -----> Phase 2.2 (useProjectStorage)
Phase 2.1 ----------------> Phase 2.3 (EditorPanel)
Phase 2.2 ----------------> Phase 2.3 (EditorPanel)
Phase 3.1 ----------------> Phase 3.2 (usePickerManager)
```

## Risiken

1. **Parser Refactoring (Phase 5.1)**: Hohe Komplexitaet, viele Abhaengigkeiten
   - Mitigation: Umfangreiche Tests vor dem Refactoring schreiben

2. **Delta History (Phase 6.1)**: Neue Abhaengigkeit (diff-match-patch)
   - Mitigation: Fallback auf einfache History behalten

3. **Breaking Changes in Hooks**: Signatur-Aenderungen
   - Mitigation: Wrapper-Funktionen fuer Rueckwaertskompatibilitaet
