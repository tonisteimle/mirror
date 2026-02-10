# Mirror IDE - Konzept

## Vision

Mirror entwickelt sich von einer Web-App mit drei festen Tabs zu einer vollwertigen Desktop-IDE für UI-Prototyping - vergleichbar mit VS Code, aber spezialisiert auf die Mirror DSL.

---

## Architektur-Übersicht

```
┌─────────────────────────────────────┐
│         Mirror (React)              │  Frontend bleibt
├─────────────────────────────────────┤
│         Tauri Bridge                │  API für Kommunikation
├─────────────────────────────────────┤
│       Rust Backend                  │
│  • File System Access               │
│  • File Watcher                     │
│  • Native Dialogs                   │
└─────────────────────────────────────┘
```

---

## Kern-Entscheidungen

| Aspekt | Entscheidung |
|--------|--------------|
| Entry Point | `home.mir` - spezielle Datei, nicht löschbar |
| Default Files | `home.mir`, `tokens.mir`, `components.mir` |
| File Extension | `.mir` |
| Sidebar | Ein/ausblendbar, default ausgeblendet |
| Projekte | Ein Fenster, Projektwechsel via File → Open |
| Deployment | Desktop-App mit Tauri |
| Dependencies | Automatisch aufgelöst, kein Import nötig |
| Konflikte | Fehler anzeigen, User muss fixen |

---

## Projekt-Struktur

### Neues Projekt

Bei Erstellung eines neuen Projekts werden automatisch erstellt:

```
my-project/
├── home.mir          ← Entry Point, nicht löschbar
├── tokens.mir        ← Default Token-Definitionen
└── components.mir    ← Default Komponenten-Definitionen
```

### Beispiel-Inhalte

**home.mir:**
```
Card ver pad 24 gap 16 bg $bg-card rad 12
  Title "Welcome"
  Text "Start building your UI"
  PrimaryButton "Get Started"
```

**tokens.mir:**
```
// Colors
$primary: #3B82F6
$bg-card: #1E1E2E
$text: #FFFFFF
$text-muted: #888888

// Spacing
$space: 8
$radius: 8
```

**components.mir:**
```
Title: size 24 weight 600 col $text
Text: size 14 col $text-muted
PrimaryButton: pad 12 24 bg $primary rad $radius col white
```

---

## Dependency Resolution

### Automatisch, ohne Imports

Der Parser analysiert jedes File und findet:
- **Verwendet:** `$primary`, `PrimaryButton`, ...
- **Definiert:** `$danger: ...`, `Card: ...`, ...

### Beispiel

```
home.mir
    ↓ verwendet PrimaryButton
components.mir
    ↓ verwendet $primary
tokens.mir
```

### Lade-Reihenfolge

Wird automatisch berechnet (topologische Sortierung):
1. `tokens.mir` (keine Dependencies)
2. `components.mir` (braucht tokens)
3. `home.mir` (braucht components)

### Regeln

| Regel | Verhalten |
|-------|-----------|
| Globaler Namespace | Alle Definitionen aus allen Files landen im selben Namespace |
| Duplikate | Fehler anzeigen, User muss umbenennen |
| Zirkuläre Dependencies | Fehler anzeigen |
| Undefined Reference | Fehler anzeigen |

**Fehler-Beispiele:**
```
Error: "$primary" is defined in both "tokens.mir" and "theme.mir"
Error: Circular dependency: a.mir → b.mir → a.mir
Error: "$accent" is used but never defined
```

---

## UI-Konzept

### Default (Sidebar ausgeblendet)

```
┌─────────────────────────────────────────────────────────────────┐
│  File  Edit  View                                    [–] [□] [×]│
├─────────────────────────────────────────────────────────────────┤
│ [≡] [home.mir] [tokens.mir ×] [components.mir ×] [+]            │
├─────────────────────────────────────────────────────────────────┤
│                                    │                             │
│  Card ver pad 24                   │                             │
│    Title "Dashboard"               │         Preview             │
│    PrimaryButton "Save"            │                             │
│                                    │                             │
├────────────────────────────────────┴─────────────────────────────┤
│  ✓ Ready                                             home.mir   │
└─────────────────────────────────────────────────────────────────┘
```

### Mit Sidebar (eingeblendet)

```
┌─────────────────────────────────────────────────────────────────┐
│  File  Edit  View                                    [–] [□] [×]│
├─────────────────────────────────────────────────────────────────┤
│ [≡] [home.mir] [tokens.mir ×] [+]                               │
├──────────┬──────────────────────────────────────────────────────┤
│ PROJECT  │                          │                           │
│──────────│  Card ver pad 24         │                           │
│  home    │    Title "Dashboard"     │        Preview            │
│  tokens  │    PrimaryButton "Save"  │                           │
│  compo...│                          │                           │
│  buttons │                          │                           │
│  cards   │                          │                           │
└──────────┴──────────────────────────┴───────────────────────────┘
```

### UI-Elemente

| Element | Verhalten |
|---------|-----------|
| `[≡]` | Toggle Sidebar |
| `[×]` auf Tab | Tab schließen (außer home.mir) |
| `[+]` | Neues File erstellen |
| Sidebar | Zeigt alle .mir Files im Projekt |
| Preview | Rendert immer `home.mir` |

---

## Tauri Integration

### Warum Tauri?

| Aspekt | Tauri | Electron |
|--------|-------|----------|
| Bundle-Größe | ~3-10 MB | ~150 MB |
| RAM-Verbrauch | ~30-50 MB | ~150+ MB |
| Backend | Rust | Node.js |
| WebView | OS-native | Chromium |

### Backend-Commands (Rust)

```rust
#[tauri::command]
fn read_project(path: String) -> Result<Vec<MirFile>, Error> {
    // Scanne Ordner nach .mir Files
    // Lese Inhalte
    // Return Liste
}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), Error> {
    // Schreibe File
}

#[tauri::command]
fn create_file(project_path: String, name: String) -> Result<MirFile, Error> {
    // Erstelle neues .mir File
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), Error> {
    // Lösche File (nicht home.mir)
}

#[tauri::command]
fn watch_project(path: String) -> Result<(), Error> {
    // Starte File-Watcher
    // Emit Events bei Änderungen
}
```

### Frontend-Integration (React)

```typescript
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'

// Files laden
const files = await invoke<MirFile[]>('read_project', {
  path: '/Users/.../my-project'
})

// File speichern
await invoke('save_file', {
  path: '/Users/.../my-project/home.mir',
  content: 'Card ver pad 24...'
})

// Watch für externe Änderungen
await listen('file-changed', (event) => {
  // Reload file
})
```

---

## File-Handling

### Beim Öffnen eines Projekts

1. User wählt Ordner via Native Dialog
2. Tauri scannt alle `*.mir` Files
3. Frontend empfängt File-Liste
4. Parser analysiert alle Files
5. Dependency-Graph wird erstellt
6. `home.mir` wird angezeigt

### Auto-Save

- Nach 1 Sekunde Inaktivität
- Oder explizit via Cmd+S
- Visuelles Feedback (●) für ungespeicherte Änderungen

### File-Watcher

- Überwacht Projekt-Ordner
- Bei externer Änderung → Reload
- Bei Konflikt (lokal + extern geändert) → Dialog

---

## Menü-Struktur

```
File
├── New Project...        Cmd+Shift+N
├── Open Project...       Cmd+O
├── Save                  Cmd+S
├── Save All              Cmd+Shift+S
├── ─────────────
├── New File              Cmd+N
├── Close File            Cmd+W
├── ─────────────
├── Export as React...
└── Exit

Edit
├── Undo                  Cmd+Z
├── Redo                  Cmd+Shift+Z
├── ─────────────
├── Cut                   Cmd+X
├── Copy                  Cmd+C
├── Paste                 Cmd+V

View
├── Toggle Sidebar        Cmd+B
├── Toggle Preview        Cmd+P
├── ─────────────
├── Zoom In               Cmd++
├── Zoom Out              Cmd+-
└── Reset Zoom            Cmd+0
```

---

## Implementierungsplan

### Phase 1: Flexible Tabs (Web)
- [ ] Tab-System refactoren (schließbar, dynamisch)
- [ ] File-Abstraktion einführen (statt fixe Strings)
- [ ] Dependency Resolution implementieren
- [ ] Fehler-Handling für Konflikte

### Phase 2: Sidebar (Web)
- [ ] Sidebar-Komponente erstellen
- [ ] Toggle-Mechanismus
- [ ] File-Liste anzeigen

### Phase 3: Tauri Integration
- [ ] Tauri Setup
- [ ] Rust Backend Commands
- [ ] Native Dialogs (Open/Save)
- [ ] File-Watcher

### Phase 4: Polish
- [ ] Menüleiste
- [ ] Keyboard Shortcuts
- [ ] Auto-Save
- [ ] Ungespeichert-Indikator

---

## Technische Details

### MirFile Interface

```typescript
interface MirFile {
  name: string           // "tokens" (ohne .mir)
  path: string           // Absoluter Pfad
  content: string        // File-Inhalt
  isDirty: boolean       // Ungespeicherte Änderungen
  isHome: boolean        // true für home.mir
}

interface Project {
  path: string           // Projekt-Ordner
  files: MirFile[]       // Alle .mir Files
  activeFile: string     // Aktuell geöffnetes File
  openTabs: string[]     // Geöffnete Tabs (File-Namen)
}
```

### Dependency Graph

```typescript
interface DependencyGraph {
  // File → Dependencies
  dependencies: Map<string, Set<string>>

  // File → Dependents (wer braucht dieses File)
  dependents: Map<string, Set<string>>

  // Berechnete Lade-Reihenfolge
  loadOrder: string[]
}

function buildDependencyGraph(files: MirFile[]): DependencyGraph {
  // 1. Parse jedes File
  // 2. Sammle Definitionen und Referenzen
  // 3. Baue Graph
  // 4. Topologische Sortierung
  // 5. Zirkuläre Dependencies erkennen
}
```

---

## Zusammenfassung

Mirror wird zur spezialisierten IDE für UI-Prototyping:

- **Flexibles File-System** statt fester Tabs
- **Automatische Dependency Resolution** ohne Imports
- **Desktop-App mit Tauri** für lokale Files
- **Vertraute UX** wie VS Code
- **Fokus auf Einfachheit** - der Parser macht die Arbeit, nicht der User
