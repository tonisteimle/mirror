# Storage Abstraction Architecture

## Übersicht

Dieses Dokument beschreibt die Storage-Abstraktion für Mirror Studio. Das Ziel ist ein einheitliches Speichersystem, bei dem die UI nicht weiß, ob Daten lokal (Tauri), auf einem Server (PHP) oder im Browser (Demo-Modus) gespeichert werden.

---

## Motivation

### Aktuelle Probleme

1. **Enge Kopplung**: UI-Code enthält direkte Aufrufe zu `TauriBridge` und `fetch('/api/...')`
2. **Code-Duplizierung**: Gleiche Logik für verschiedene Backends mehrfach implementiert
3. **Schwer testbar**: Keine Möglichkeit, Storage in Tests zu mocken
4. **Inkonsistente API**: Unterschiedliche Methoden-Signaturen je nach Backend

### Ziele

1. **Vollständige Abstraktion** - UI kennt nur einen `storage` Service
2. **Einheitliche API** - Identische Methoden für alle Backends
3. **Automatische Backend-Wahl** - Erkennt automatisch das verfügbare Backend
4. **Erweiterbarkeit** - Neue Provider einfach hinzufügbar
5. **Testbarkeit** - DemoProvider für Unit-Tests verwendbar

---

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│  (Editor, FilePanel, ContextMenu, PropertyPanel)            │
│                                                             │
│  Kennt NUR: storage Service                                 │
│  Weiß NICHT: ob Tauri, PHP, oder Demo                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     StorageService                          │
│                                                             │
│  - Singleton, initialisiert beim App-Start                  │
│  - Wählt automatisch das richtige Backend                   │
│  - Einheitliche API für alle Operationen                    │
│  - Event-basierte Updates für reaktive UI                   │
│  - Caching für Performance                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   StorageProvider Interface                 │
│                                                             │
│  Definiert ALLE Operationen abstrakt                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐
     │   Tauri    │   │   Server   │   │   Demo     │
     │  Provider  │   │  Provider  │   │  Provider  │
     └────────────┘   └────────────┘   └────────────┘
           │               │                │
           ▼               ▼                ▼
      File System      PHP API         In-Memory
      (via Tauri)    (REST/JSON)     (+ localStorage)
```

---

## Dateistruktur

```
studio/
└── storage/
    ├── index.ts              # Export: storage Singleton
    ├── types.ts              # Alle TypeScript Interfaces
    ├── service.ts            # StorageService Klasse
    ├── events.ts             # Typisierter EventEmitter
    └── providers/
        ├── index.ts          # Provider-Factory & Auto-Detection
        ├── tauri.ts          # TauriProvider
        ├── server.ts         # ServerProvider
        └── demo.ts           # DemoProvider
```

---

## Interfaces

### StorageItem

Einheitliche Repräsentation von Dateien und Ordnern:

```typescript
interface StorageFile {
  name: string           // "button.mirror"
  path: string           // "components/button.mirror"
  type: 'file'
  updatedAt?: Date
}

interface StorageFolder {
  name: string           // "components"
  path: string           // "components"
  type: 'folder'
  children: StorageItem[]
}

type StorageItem = StorageFile | StorageFolder
```

### StorageProject

Projekt-Metadaten (hauptsächlich für Server-Modus):

```typescript
interface StorageProject {
  id: string             // Eindeutige ID
  name: string           // Anzeigename
  createdAt?: Date
  updatedAt?: Date
}
```

### StorageProvider

Das zentrale Interface, das jeder Provider implementiert:

```typescript
interface StorageProvider {
  // === Meta ===
  readonly type: 'tauri' | 'server' | 'demo'
  readonly supportsProjects: boolean
  readonly supportsNativeDialogs: boolean

  // === Projekt-Operationen ===
  listProjects(): Promise<StorageProject[]>
  createProject(name: string): Promise<StorageProject>
  deleteProject(id: string): Promise<void>
  openProject(id: string): Promise<void>
  closeProject(): Promise<void>

  // === Datei-Baum ===
  getTree(): Promise<StorageItem[]>

  // === Datei-Operationen ===
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  renameFile(oldPath: string, newPath: string): Promise<void>
  copyFile(sourcePath: string, targetPath: string): Promise<void>

  // === Ordner-Operationen ===
  createFolder(path: string): Promise<void>
  deleteFolder(path: string): Promise<void>
  renameFolder(oldPath: string, newPath: string): Promise<void>

  // === Native Dialoge (nur Tauri) ===
  openFolderDialog?(): Promise<string | null>
  openFileDialog?(): Promise<string | null>
}
```

---

## StorageService

Der zentrale Service, den die UI verwendet:

```typescript
class StorageService {
  private provider: StorageProvider
  private cache: Map<string, string>
  private tree: StorageItem[]
  private currentProject: StorageProject | null

  // === Events ===
  readonly events: StorageEvents

  // === Initialisierung ===
  async init(): Promise<void>

  // === Status ===
  get isInitialized(): boolean
  get providerType(): 'tauri' | 'server' | 'demo'
  get hasProject(): boolean
  get currentProjectName(): string | null

  // === Projekt-API ===
  async listProjects(): Promise<StorageProject[]>
  async createProject(name: string): Promise<StorageProject>
  async openProject(id: string): Promise<void>
  async closeProject(): Promise<void>

  // === Datei-API ===
  async readFile(path: string): Promise<string>
  async writeFile(path: string, content: string): Promise<void>
  async deleteFile(path: string): Promise<void>
  async renameFile(oldPath: string, newPath: string): Promise<void>
  async copyFile(sourcePath: string, targetPath: string): Promise<void>

  // === Ordner-API ===
  async createFolder(path: string): Promise<void>
  async deleteFolder(path: string): Promise<void>

  // === Baum-API ===
  getTree(): StorageItem[]
  async refreshTree(): Promise<StorageItem[]>

  // === Native Dialoge ===
  async openFolderDialog(): Promise<string | null>
  canOpenFolderDialog(): boolean
}
```

### Events

Der Service emittiert Events bei allen Änderungen:

```typescript
interface StorageEvents {
  'file:created': { path: string }
  'file:changed': { path: string, content: string }
  'file:deleted': { path: string }
  'file:renamed': { oldPath: string, newPath: string }
  'folder:created': { path: string }
  'folder:deleted': { path: string }
  'tree:changed': { tree: StorageItem[] }
  'project:opened': { project: StorageProject }
  'project:closed': {}
  'error': { error: Error, operation: string }
}
```

---

## Provider-Details

### TauriProvider

- **Backend**: Natives Dateisystem via Tauri
- **Projekt-Konzept**: Ein "Projekt" ist ein Ordner auf dem Dateisystem
- **Besonderheiten**:
  - `supportsProjects = false` (arbeitet mit Ordnern)
  - `supportsNativeDialogs = true`
  - `listProjects()` gibt kürzlich geöffnete Ordner zurück
  - `createProject()` öffnet Ordner-Dialog + erstellt Unterordner

```typescript
class TauriProvider implements StorageProvider {
  type = 'tauri' as const
  supportsProjects = false
  supportsNativeDialogs = true

  private basePath: string | null = null

  async openProject(id: string) {
    // id = Ordner-Pfad
    this.basePath = id
  }

  async readFile(path: string) {
    return TauriBridge.fs.readFile(`${this.basePath}/${path}`)
  }

  async openFolderDialog() {
    return TauriBridge.dialog.openFolder()
  }
}
```

### ServerProvider

- **Backend**: PHP REST API
- **Projekt-Konzept**: Echte Projekte in Datenbank
- **Besonderheiten**:
  - `supportsProjects = true`
  - `supportsNativeDialogs = false`
  - Alle Operationen via HTTP

```typescript
class ServerProvider implements StorageProvider {
  type = 'server' as const
  supportsProjects = true
  supportsNativeDialogs = false

  private projectId: string | null = null

  async listProjects() {
    return this.fetch('/api/projects')
  }

  async readFile(path: string) {
    const data = await this.fetch(`/api/projects/${this.projectId}/files/${encodeURIComponent(path)}`)
    return data.content
  }
}
```

### DemoProvider

- **Backend**: In-Memory + localStorage
- **Projekt-Konzept**: Keines (immer "Demo-Projekt")
- **Besonderheiten**:
  - `supportsProjects = false`
  - `supportsNativeDialogs = false`
  - Vordefinierte Demo-Dateien
  - Änderungen in localStorage persistiert (optional)

```typescript
class DemoProvider implements StorageProvider {
  type = 'demo' as const
  supportsProjects = false
  supportsNativeDialogs = false

  private files: Map<string, string>

  constructor() {
    this.files = new Map([
      ['index.mirror', DEMO_INDEX],
      ['tokens.mirror', DEMO_TOKENS],
      ['components/button.mirror', DEMO_BUTTON],
    ])
  }

  async readFile(path: string) {
    const content = this.files.get(path)
    if (!content) throw new Error(`File not found: ${path}`)
    return content
  }
}
```

---

## Auto-Detection

Die Provider-Wahl erfolgt automatisch beim App-Start:

```typescript
async function detectProvider(): Promise<StorageProvider> {
  // 1. Tauri verfügbar?
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    console.log('[Storage] Tauri detected')
    return new TauriProvider()
  }

  // 2. Server erreichbar?
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const res = await fetch('/api/health', { signal: controller.signal })
    clearTimeout(timeout)

    if (res.ok) {
      console.log('[Storage] Server detected')
      return new ServerProvider()
    }
  } catch {
    // Server nicht erreichbar
  }

  // 3. Fallback: Demo
  console.log('[Storage] Using demo mode')
  return new DemoProvider()
}
```

---

## Verwendung in der UI

### Initialisierung (bootstrap.ts)

```typescript
import { storage } from './storage'

async function bootstrap() {
  // Storage initialisieren (wählt automatisch Provider)
  await storage.init()

  console.log(`Storage ready: ${storage.providerType}`)

  // Rest der App initialisieren...
}
```

### FilePanel

```typescript
import { storage } from '../storage'

class FilePanel {
  constructor() {
    // Events abonnieren
    storage.events.on('tree:changed', ({ tree }) => {
      this.renderTree(tree)
    })

    storage.events.on('file:created', ({ path }) => {
      this.selectFile(path)
    })
  }

  async handleFileClick(path: string) {
    const content = await storage.readFile(path)
    editor.setValue(content)
  }

  async handleNewFile(name: string, folder: string) {
    const path = folder ? `${folder}/${name}` : name
    await storage.writeFile(path, `// ${name}\n`)
  }

  async handleDelete(path: string) {
    await storage.deleteFile(path)
  }
}
```

### Editor (Speichern)

```typescript
import { storage } from './storage'

async function saveCurrentFile() {
  if (!currentFilePath) return

  const content = editor.getValue()
  await storage.writeFile(currentFilePath, content)
}

// Auto-Save
editor.on('change', debounce(saveCurrentFile, 1000))
```

---

## Caching-Strategie

Der StorageService cached Dateiinhalte für Performance:

```typescript
class StorageService {
  private cache = new Map<string, { content: string, timestamp: number }>()
  private CACHE_TTL = 5000 // 5 Sekunden

  async readFile(path: string): Promise<string> {
    // Cache prüfen
    const cached = this.cache.get(path)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.content
    }

    // Vom Provider laden
    const content = await this.provider.readFile(path)

    // In Cache speichern
    this.cache.set(path, { content, timestamp: Date.now() })

    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.provider.writeFile(path, content)

    // Cache aktualisieren
    this.cache.set(path, { content, timestamp: Date.now() })

    // Event emittieren
    this.events.emit('file:changed', { path, content })
  }

  invalidateCache(path?: string) {
    if (path) {
      this.cache.delete(path)
    } else {
      this.cache.clear()
    }
  }
}
```

---

## Migration

### Phase 1: Neue Module erstellen

1. `studio/storage/types.ts` - Interfaces
2. `studio/storage/events.ts` - EventEmitter
3. `studio/storage/service.ts` - StorageService
4. `studio/storage/providers/demo.ts` - DemoProvider
5. `studio/storage/providers/server.ts` - ServerProvider
6. `studio/storage/providers/tauri.ts` - TauriProvider
7. `studio/storage/providers/index.ts` - Auto-Detection
8. `studio/storage/index.ts` - Export

### Phase 2: UI migrieren

1. `studio/bootstrap.ts` - `storage.init()` aufrufen
2. `studio/panels/files/` - Auf `storage` Service umstellen
3. `studio/desktop-files.js` - Auf `storage` Service umstellen
4. `studio/app.js` - Direkte API-Calls ersetzen

### Phase 3: Aufräumen

1. `studio/modules/file-manager/` - Entfernen (ersetzt durch `storage/`)
2. Verstreute `TauriBridge.fs.*` Calls - Entfernen
3. Direkte `fetch('/api/...')` Calls - Entfernen

---

## Fehlerbehandlung

Alle Provider-Operationen können Fehler werfen. Der Service fängt diese und emittiert ein `error` Event:

```typescript
class StorageService {
  async readFile(path: string): Promise<string> {
    try {
      return await this.provider.readFile(path)
    } catch (error) {
      this.events.emit('error', {
        error: error as Error,
        operation: `readFile(${path})`
      })
      throw error
    }
  }
}
```

UI kann auf Fehler reagieren:

```typescript
storage.events.on('error', ({ error, operation }) => {
  showToast(`Fehler bei ${operation}: ${error.message}`, 'error')
})
```

---

## Testbarkeit

Der DemoProvider ermöglicht einfaches Testen:

```typescript
// In Tests
import { StorageService } from './storage/service'
import { DemoProvider } from './storage/providers/demo'

describe('FilePanel', () => {
  let storage: StorageService

  beforeEach(() => {
    storage = new StorageService()
    storage.setProvider(new DemoProvider())
  })

  it('should load file content', async () => {
    const content = await storage.readFile('index.mirror')
    expect(content).toContain('Box')
  })
})
```

---

## Offene Fragen

### 1. Projekt-Wechsel in Tauri

Bei Tauri ist ein "Projekt" ein Ordner. Wie soll der Projekt-Wechsel funktionieren?

**Option A**: Neues Fenster öffnen (wie VS Code)
**Option B**: Im gleichen Fenster wechseln (wie Sublime)

**Empfehlung**: Option B - einfacher zu implementieren

### 2. localStorage im Demo-Modus

Sollen Änderungen im Demo-Modus in localStorage persistiert werden?

**Option A**: Ja - Änderungen überleben Page Reload
**Option B**: Nein - Immer frische Demo-Daten

**Empfehlung**: Option A - bessere UX beim Experimentieren

### 3. Konflikt-Handling

Was passiert, wenn eine Datei extern geändert wurde?

**Tauri**: Könnte File-Watcher implementieren
**Server**: Timestamps vergleichen vor Save

**Empfehlung**: Erstmal ignorieren (single-user), später nachrüsten

---

## Zusammenfassung

Die Storage-Abstraktion bietet:

- **Einheitliche API** für alle Backends
- **Automatische Backend-Erkennung**
- **Event-basierte Updates** für reaktive UI
- **Caching** für Performance
- **Testbarkeit** durch DemoProvider
- **Erweiterbarkeit** für zukünftige Backends

Die Migration erfolgt schrittweise, ohne die bestehende Funktionalität zu brechen.
