# Mirror v2 Vision

> Mirror als natives UI-Literal für JavaScript

## 1. Kernidee

Mirror wird zur eigenständigen UI-Sprache, die JavaScript erweitert - nicht ersetzt.

**Heute:** Mirror generiert React-Komponenten, gebunden an ein Framework.

**Neu:** Mirror wird zu einem universellen UI-Format, das JavaScript als Partner hat.

```javascript
import ui from "./app.mirror"

ui.saveButton.onclick = () => {
    ui.status.text = "Saving..."
    save(ui.form.values)
}

ui.render("#root")
```

### Die drei Säulen

| Säule | Bedeutung |
|-------|-----------|
| **Deklarativ** | UI-Struktur in .mirror Dateien, rein beschreibend |
| **Reaktiv** | Änderungen propagieren automatisch zum DOM |
| **Adressierbar** | Jeder Node ist via Dot-Notation erreichbar |

### Analogie

So wie JSON ein Daten-Literal für JavaScript ist, wird Mirror ein UI-Literal.

```javascript
const data = { name: "John" }     // Daten-Literal (JSON)
const ui = mirror { ... }          // UI-Literal (Mirror)
```

---

## 2. Architektur

```
┌─────────────────────────────────────────────────────┐
│                    Mirror IDE                        │
│              (optional, visuelles Tool)              │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │    .mirror    │  ← Textdateien (versionierbar)
                  │    Dateien    │
                  └───────┬───────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                    Precompiler                       │
│  ┌─────────┐    ┌──────────┐    ┌────────────────┐  │
│  │ Parser  │ →  │    IR    │ →  │    Backend     │  │
│  └─────────┘    └──────────┘    └────────────────┘  │
└─────────────────────────┬───────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
       ┌────────┐    ┌────────┐    ┌────────┐
       │  DOM   │    │ React  │    │ Static │
       │ (pure) │    │        │    │  HTML  │
       └────────┘    └────────┘    └────────┘
```

### Komponenten

**Parser**
- Liest .mirror Syntax
- Validiert Struktur
- Existiert bereits (v1)

**Intermediate Representation (IR)**
- Framework-unabhängiger AST
- Saubere Datenstruktur
- Grundlage für alle Backends
- **NEU in v2**

**Backends**
- DOM (Flaggschiff): Pure JavaScript, zero dependencies
- React: Für Adoption in bestehenden Projekten
- Static HTML: Für SSG/SSR

### Workflows

| Nutzer | Workflow |
|--------|----------|
| Designer | Mirror IDE → .mirror → Preview |
| Entwickler | VS Code + .mirror → Precompiler → App |
| Purist | vim + .mirror → Precompiler → App |

Alle arbeiten mit denselben `.mirror` Dateien.

---

## 3. Syntax & Integration

### 3.1 Dateiformat

```mirror
// app.mirror

$primary: #3B82F6

Button: pad 12, bg $primary, rad 8
    state hover bg #2563EB

App
    header "My App"
    content pad 16
        input placeholder "Name..."
        saveButton Button "Save"
    status text "Ready"
```

### 3.2 JavaScript importiert Mirror

```javascript
// app.js
import ui from "./app.mirror"

// Zugriff via Dot-Notation
console.log(ui.header.text)        // "My App"
ui.status.text = "Loading..."      // Reaktiv - UI updated

// Tiefe Zugriffe
ui.content.input.value             // Input-Wert lesen
ui.content.input.placeholder = "Enter name..."
```

### 3.3 Events via Namenskonvention

```javascript
// Konvention: nodeName_eventName
ui.saveButton.onclick = () => {
    const name = ui.content.input.value
    ui.status.text = `Saving ${name}...`
}

ui.input.onchange = (e) => {
    ui.saveButton.disabled = e.value.length === 0
}

ui.input.onkeydown.enter = () => {
    ui.saveButton.click()
}
```

Keine manuelle Verkabelung. Der Name IST die Verbindung.

### 3.4 Rendern

```javascript
// In ein Element rendern
ui.render("#root")

// Oder in document.body
ui.render()

// Später: Updates sind automatisch
ui.header.text = "New Title"  // DOM updated sofort
```

### 3.5 Listen

```mirror
// list.mirror
todoList
    - item "First"
    - item "Second"
    - item "Third"
```

```javascript
import ui from "./list.mirror"

// Array-Zugriff
ui.item[0].text                    // "First"
ui.item[1].text = "Modified"       // Reaktiv

// Events mit Index
ui.item.onclick = (item, index) => {
    console.log(`Clicked item ${index}: ${item.text}`)
}

// Hinzufügen
ui.todoList.add(mirror`- item "Fourth"`)

// Entfernen
ui.item[0].remove()
```

### 3.6 Bedingungen und Schleifen

```javascript
import ui from "./app.mirror"
import { tasks } from "./data.js"

// Daten injizieren
ui.taskList.data = tasks

// Oder dynamisch filtern
ui.showCompleted.onchange = () => {
    ui.taskList.filter = task =>
        ui.showCompleted.checked || !task.done
}
```

---

## 4. Vollständiges Beispiel

### app.mirror

```mirror
// Tokens
$bg: #1a1a23
$surface: #252530
$primary: #3B82F6
$text: #E4E4E7
$muted: #71717A

// Komponenten
TodoItem: hor, ver-cen, gap 12, pad 12, bg $surface, rad 8
    checkbox
    label width full
    deleteBtn opacity 0, hover-opacity 1
        Icon "trash-2", size 16, col $muted

// App
App bg $bg, pad 24, gap 16, min-height 100vh
    header
        title "My Tasks", font-size 24, col $text
        subtitle col $muted
            "0 remaining"

    inputRow hor, gap 8
        newTask Input, width full, pad 12, bg $surface
            Placeholder "Add a task..."
        addBtn Button, pad 12 24, bg $primary
            "Add"

    taskList ver, gap 8
        // Wird dynamisch befüllt
```

### app.js

```javascript
import ui from "./app.mirror"

let tasks = []

// Task hinzufügen
ui.addBtn.onclick = () => {
    const text = ui.newTask.value.trim()
    if (!text) return

    tasks.push({ id: Date.now(), text, done: false })
    ui.newTask.value = ""
    renderTasks()
}

ui.newTask.onkeydown.enter = () => {
    ui.addBtn.click()
}

// Task-Events (delegiert)
ui.TodoItem.checkbox.onchange = (item, index) => {
    tasks[index].done = item.checkbox.checked
    updateCount()
}

ui.TodoItem.deleteBtn.onclick = (item, index) => {
    tasks.splice(index, 1)
    renderTasks()
}

// Rendern
function renderTasks() {
    ui.taskList.children = tasks.map(task =>
        mirror`
            TodoItem
                checkbox checked ${task.done}
                label "${task.text}"
        `
    )
    updateCount()
}

function updateCount() {
    const remaining = tasks.filter(t => !t.done).length
    ui.subtitle.text = `${remaining} remaining`
}

// Start
ui.render("#root")
```

---

## 5. Was sich ändert

### Für Nutzer

| Heute (v1) | Neu (v2) |
|------------|----------|
| Mirror → React | Mirror → Pure JS (oder React) |
| IDE erforderlich | IDE optional |
| Preview in IDE | Echte Apps im Browser |
| Eingebettet in Tool | Standalone Dateien |

### Für das Projekt

| Aspekt | Änderung |
|--------|----------|
| Compiler | Neu mit IR-Architektur |
| Output | DOM-Manipulation statt React |
| Testing | Test-first, comprehensive |
| Dateien | .mirror als eigenes Format |
| IDE | Wird zu optionalem Editor |

### Was bleibt

- Mirror-Syntax (100% kompatibel)
- Komponenten-Definitionen
- States, Events, Tokens
- Vererbung, Slots

---

## 6. Roadmap

### Phase 1: Foundation
- [ ] IR-Spezifikation definieren
- [ ] Neuer Parser → IR
- [ ] Test-Suite aufbauen
- [ ] DOM-Backend (minimal)

### Phase 2: Core Features
- [ ] Reaktivität (Proxy-basiert)
- [ ] Event-Konvention implementieren
- [ ] .mirror Import in JS
- [ ] render() API

### Phase 3: Vollständigkeit
- [ ] Alle Mirror-Features portieren
- [ ] States, Animationen
- [ ] Keyboard-Events
- [ ] Listen & Iteration

### Phase 4: Ecosystem
- [ ] VS Code Extension
- [ ] React-Backend (für Migration)
- [ ] Dokumentation
- [ ] Beispiel-Apps

---

## 7. Offene Fragen

1. **Bundling**: Wie integriert sich .mirror mit Vite/esbuild/webpack?

2. **TypeScript**: Auto-generierte .d.ts aus .mirror Dateien?

3. **Hot Reload**: .mirror Änderungen live im Browser?

4. **Scoping**: Mehrere .mirror Dateien, Namenskonflikte?

5. **Server-Side**: Node.js Support für SSR?

---

## 8. Warum jetzt?

- Die Syntax ist ausgereift (Jahre der Iteration)
- Der Markt sucht Alternativen zu React-Komplexität
- Pure JS + Web Components sind wieder relevant
- AI-Tooling macht DSLs zugänglicher

Mirror v2 ist kein Neustart. Es ist die Befreiung der Syntax aus dem IDE-Gefängnis in die echte Welt.

---

*Draft v0.1 - März 2026*
