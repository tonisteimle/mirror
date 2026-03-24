# Storage Audit

## Zusammenfassung

Es existieren **zwei parallele Systeme** für File-Management, die teilweise überlappen:

| System | Dateien | Verwendet von |
|--------|---------|---------------|
| **file-manager/** (TypeScript) | `studio/modules/file-manager/` | Nicht aktiv genutzt |
| **desktop-files.js** (JavaScript) | `studio/desktop-files.js` | Aktiv - app.js |

---

## 1. file-manager/ Modul (TypeScript)

**Pfad:** `studio/modules/file-manager/`

### Dateien

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `types.ts` | 60 | Interfaces: FileStore, Project, FileManagerOptions |
| `index.ts` | 300 | FileManager Factory + Singleton |
| `storage.ts` | 156 | StorageAdapter: Local, API, Tauri re-export |
| `tauri-storage.ts` | 199 | TauriStorageAdapter |
| `file-store.ts` | 85 | Einfacher State-Store |
| `file-operations.ts` | 179 | CRUD für In-Memory-Files |

### API

```typescript
interface FileManager {
  // File CRUD
  createFile(name, type?, content?): void
  deleteFile(name): void
  renameFile(oldName, newName): void
  duplicateFile(name, newName): void
  getContent(name): string | null
  setContent(name, content): void

  // Project
  loadProject(id): Promise<boolean>
  saveProject(): Promise<void>
  createProject(name): Promise<Project>
  deleteProject(id): Promise<void>
  listProjects(): Promise<Project[]>

  // Events
  on(event, callback): () => void
}
```

### StorageAdapter Interface

```typescript
interface StorageAdapter {
  loadProject(id): Promise<{ files, project } | null>
  saveProject(project, files): Promise<void>
  listProjects(): Promise<Project[]>
  deleteProject(id): Promise<void>
  createProject(name): Promise<Project>
}
```

### Status: **NICHT AKTIV GENUTZT**

- Gut strukturiert mit TypeScript
- Hat 3 Storage-Adapter (Local, API, Tauri)
- Wird von `app.js` **nicht verwendet**
- `panels/files/index.ts` existiert, aber UI verwendet `desktop-files.js`

---

## 2. desktop-files.js (JavaScript)

**Pfad:** `studio/desktop-files.js`

### Umfang

- **1224 Zeilen** JavaScript
- Komplettes File-Management + UI-Rendering
- Direkte TauriBridge-Aufrufe

### State

```javascript
let currentFolder = null  // Absolute path oder 'demo'
let fileTree = []         // Rekursive Baumstruktur
let currentFile = null    // Aktuell ausgewählte Datei
let files = {}            // filename → content Cache
let contextMenu = null
let draggedItem = null
```

### API

```javascript
// Initialisierung
initDesktopFiles({ onFileSelect, onFileChange })

// Ordner
openFolder()              // Dialog → loadFolder
loadFolder(path)          // Rekursiv laden

// Dateien
selectFile(path)          // Laden + Callback
saveFile(path, content)   // Speichern
createFile(name, parent)  // Erstellen
renameItem(old, new)      // Umbenennen
duplicateFile(path)       // Duplizieren
deleteItem(path, isFolder)// Löschen
moveItem(source, target)  // Drag & Drop

// Getter
getCurrentFolder()
getCurrentFile()
getFiles()
getFileContent(path)
```

### Demo-Modus

```javascript
const DEMO_FILES = {
  'index.mir': `App bg #18181b...`,
  'components.com': `// Component Definitions...`,
  'tokens.tok': `// Design Tokens...`
}
```

Bei `!isTauri()` werden Demo-Dateien geladen (In-Memory).

### UI-Rendering

- Eigenes HTML-Template für File-Tree
- Context-Menu (Rechtsklick)
- Inline-Rename
- Drag & Drop zwischen Ordnern
- SVG-Icons pro Dateityp

### Status: **AKTIV GENUTZT**

- Von `app.js` initialisiert
- Direkte TauriBridge-Aufrufe (`window.TauriBridge.fs.*`)
- Kein TypeScript, keine Types
- Mischt UI und Business-Logik

---

## 3. TauriBridge

**Pfad:** `studio/tauri-bridge.js`

### Module

```javascript
window.TauriBridge = {
  isTauri,
  fs: TauriFS,        // File System
  project: TauriProject,
  agent: TauriAgent,
  dialog: TauriDialog,
  menu: TauriMenu,
  window: TauriWindow
}
```

### TauriFS API

```javascript
TauriFS = {
  readFile(path): string
  writeFile(path, content): void
  listDirectory(path): { path, files }
  createDirectory(path): void
  deletePath(path): void
  renamePath(from, to): void
  pathExists(path): boolean
  getFileInfo(path): FileInfo
}
```

### TauriDialog API

```javascript
TauriDialog = {
  openFolder(): string | null
  openFile(filters): string | null
  saveFile(defaultPath): string | null
  message(message, options): void
  confirm(message, options): boolean
}
```

---

## 4. panels/files/index.ts

**Pfad:** `studio/panels/files/index.ts`

### Status: **VERALTET / UNGENUTZT**

- 349 Zeilen TypeScript
- Verwendet `FileMetadata` aus `file-manager`
- **Wird nicht verwendet** - `desktop-files.js` macht alles

---

## 5. app.js Verwendung

### Initialisierung

```javascript
import { initDesktopFiles, openFolder, selectFile, saveFile, ... } from './desktop-files.js'

// Später:
initDesktopFiles({
  onFileSelect: (path, content) => {
    currentFile = path
    editor.dispatch({ ... })
  },
  onFileChange: (path, content) => {
    files[path] = content
  }
})
```

### Speichern

```javascript
// Auto-Save Debounce
function scheduleAutoSave() {
  saveFile(currentFile, editor.getValue())
}
```

### Prelude-Building

```javascript
function buildPrelude() {
  // Sammelt alle .tok und .com Dateien
  // Konkateniert zu Prelude-String
}
```

---

## Probleme

### 1. Doppelte Implementierung

- `file-manager/` TypeScript-Module existieren, werden aber nicht genutzt
- `desktop-files.js` ist der aktive Code
- Keine klare Trennung von Concerns

### 2. Enge Kopplung

```javascript
// In desktop-files.js:
const bridge = window.TauriBridge
await bridge.fs.readFile(filePath)
await bridge.fs.writeFile(filePath, content)
```

- Direkte `TauriBridge`-Aufrufe überall verstreut
- Keine Abstraktion für verschiedene Backends
- Demo-Modus mit `if (!isTauri())` durchgesetzt

### 3. UI + Business-Logik vermischt

`desktop-files.js` enthält:
- State-Management (files, fileTree, currentFile)
- File-Operationen (CRUD)
- UI-Rendering (renderFileTree, renderTreeItems)
- Event-Handling (Context-Menu, Drag & Drop)
- DOM-Manipulation

### 4. Keine Events

- Keine Event-basierte Architektur
- Callbacks über `window._desktopFiles.onFileSelect`
- Kein zentraler Event-Bus für File-Änderungen

### 5. Kein Server-Backend

- `file-manager/storage.ts` hat `createApiStorageAdapter`
- Aber `desktop-files.js` hat **keinen** Server-Support
- Server-Modus müsste komplett neu implementiert werden

---

## Was migriert werden muss

### Behalten (TauriBridge)

`tauri-bridge.js` ist gut strukturiert und sollte **intern** von TauriProvider genutzt werden.

### Ersetzen (desktop-files.js)

Alle 1224 Zeilen müssen durch das neue Storage-System ersetzt werden:

| Alt (desktop-files.js) | Neu (StorageService) |
|------------------------|---------------------|
| `openFolder()` | `storage.openProject()` |
| `loadFolder(path)` | `storage.openProject(id)` |
| `selectFile(path)` | `storage.readFile(path)` |
| `saveFile(path, content)` | `storage.writeFile(path, content)` |
| `createFile(name, parent)` | `storage.writeFile(path, '')` |
| `renameItem(old, new)` | `storage.renameFile(old, new)` |
| `deleteItem(path)` | `storage.deleteFile(path)` |
| `moveItem(source, target)` | `storage.moveItem(source, target)` |
| `getCurrentFile()` | State in UI |
| `getFiles()` | `storage.getTree()` |

### Entfernen (file-manager/)

Nach Migration kann `studio/modules/file-manager/` komplett entfernt werden.

### UI separieren

- File-Tree-Rendering in eigene Komponente
- Context-Menu als separate Komponente
- Drag & Drop Handler

---

## Migration Steps

### Phase 1: Storage Layer

1. `studio/storage/types.ts` - Interfaces
2. `studio/storage/events.ts` - EventEmitter
3. `studio/storage/service.ts` - StorageService
4. `studio/storage/providers/demo.ts`
5. `studio/storage/providers/tauri.ts` (nutzt TauriBridge)
6. `studio/storage/providers/server.ts`
7. `studio/storage/index.ts`

### Phase 2: UI Components

1. `studio/components/file-tree/` - Baum-Rendering
2. `studio/components/context-menu/` - Rechtsklick-Menü
3. Integration in bestehende Panels

### Phase 3: app.js Migration

1. `storage.init()` beim Start
2. File-Select über `storage.readFile()`
3. Auto-Save über `storage.writeFile()`
4. Prelude-Building über `storage.getTree()`

### Phase 4: Cleanup

1. `desktop-files.js` entfernen
2. `modules/file-manager/` entfernen
3. `panels/files/index.ts` entfernen

---

## Zeitschätzung

| Phase | Aufwand |
|-------|---------|
| Storage Layer | Mittel |
| UI Components | Mittel |
| app.js Migration | Hoch (viele Abhängigkeiten) |
| Cleanup | Gering |

---

## Risiken

1. **app.js ist komplex** - 2000+ Zeilen mit vielen Abhängigkeiten
2. **Prelude-Building** muss weiterhin funktionieren
3. **Auto-Save** muss zuverlässig bleiben
4. **Tauri-spezifische Features** (Fenster-Titel, Recent Projects)

---

## Empfehlung

**Schrittweise Migration:**

1. StorageService **parallel** zu `desktop-files.js` implementieren
2. Neue UI-Komponenten erstellen
3. `app.js` schrittweise umstellen
4. Am Ende alte Dateien entfernen

Das ermöglicht Testen und Fallback auf alten Code falls nötig.
