# Undo/Redo Konzept

## 1. Problemstellung

### Aktuelle Situation

Das Mirror Studio hat **drei verschiedene Eingabe-Kanäle**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Mirror Studio                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Code Editor   │  Property Panel │     Canvas Preview      │
│                 │                 │                         │
│  ✅ Undo works  │  ❌ Undo broken │  ❌ Undo broken         │
│                 │                 │                         │
│  Direkte Text-  │  Farben, Größen │  Drag & Drop,           │
│  eingabe        │  Abstände, etc. │  Element-Auswahl        │
└─────────────────┴─────────────────┴─────────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  CodeMirror     │
                 │  Editor State   │
                 │  + History      │
                 └─────────────────┘
```

**Problem:** Nur direkte Tastatureingaben im Editor werden von CodeMirror's History erfasst.

### Warum Property Panel Änderungen nicht undo-bar sind

```javascript
// So wird es aktuell gemacht:
editor.dispatch({
  changes: { from: 10, to: 20, insert: 'bg #fff' }
})

// CodeMirror denkt: "Das ist eine programmatische Änderung,
// keine User-Aktion → nicht in History aufnehmen"
```

### Warum es wichtig ist

| Szenario | Erwartung | Realität |
|----------|-----------|----------|
| Farbe im Panel ändern → Cmd+Z | Alte Farbe zurück | Nichts passiert |
| Element verschieben → Cmd+Z | Element zurück | Nichts passiert |
| Element löschen → Cmd+Z | Element wieder da | Nichts passiert |
| Text tippen → Cmd+Z | Text weg | ✅ Funktioniert |

---

## 2. Architektur-Entscheidung

### Option A: Eigenes History-System

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Property     │───▶│ Custom       │───▶│ CodeMirror   │
│ Panel        │    │ HistoryStack │    │ Editor       │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                    ┌──────┴──────┐
                    │ Actions:    │
                    │ - push()    │
                    │ - undo()    │
                    │ - redo()    │
                    └─────────────┘
```

**Vorteile:**
- Volle Kontrolle
- Kann beliebige Aktionen speichern (nicht nur Text-Änderungen)
- Unabhängig von CodeMirror

**Nachteile:**
- Zwei History-Systeme = Konflikte
- Aufwendig zu implementieren
- Editor-History und Custom-History synchronisieren?

### Option B: CodeMirror History nutzen ✅

```
┌──────────────┐    ┌──────────────┐
│ Property     │───▶│ CodeMirror   │
│ Panel        │    │ Editor       │
└──────────────┘    │ + history()  │
       │            └──────────────┘
       │                   │
       └───────────────────┘
         Mit userEvent
         Annotation
```

**Vorteile:**
- Ein System für alles
- Bereits implementiert und getestet
- Cmd+Z/Cmd+Shift+Z funktionieren automatisch
- Minimale Änderungen nötig

**Nachteile:**
- Nur Text-basierte Änderungen
- Kein Undo für reine UI-States (Selection, Scroll-Position)

### Entscheidung: Option B

Da alle Änderungen im Mirror Studio letztendlich **Text-Änderungen im Code** sind, ist CodeMirror's History ausreichend.

---

## 3. Konzept-Details

### 3.1 Change Flow (aktuell)

```
User klickt Farbe
       │
       ▼
┌──────────────────┐
│ PropertyPanel    │
│ handleColorClick │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ CodeModifier     │
│ updateProperty() │
└────────┬─────────┘
         │ Returns: { from, to, insert }
         ▼
┌──────────────────┐
│ app.js           │
│ handleStudio     │
│ CodeChange()     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ editor.dispatch  │  ← Hier fehlt userEvent!
│ ({ changes })    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ CodeMirror       │
│ State Update     │
│ (OHNE History)   │  ← Deshalb kein Undo
└──────────────────┘
```

### 3.2 Change Flow (neu)

```
User klickt Farbe
       │
       ▼
┌──────────────────┐
│ PropertyPanel    │
│ handleColorClick │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ CodeModifier     │
│ updateProperty() │
└────────┬─────────┘
         │ Returns: { from, to, insert }
         ▼
┌──────────────────┐
│ app.js           │
│ handleStudio     │
│ CodeChange()     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│ editor.dispatch({                │
│   changes,                       │
│   annotations: [                 │
│     Transaction.userEvent.of()   │  ← NEU!
│   ]                              │
│ })                               │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────┐
│ CodeMirror       │
│ State Update     │
│ + History Entry  │  ← Jetzt mit Undo!
└──────────────────┘
```

### 3.3 User Event Types

Verschiedene Event-Typen für Debugging und potentielle Gruppierung:

```javascript
const USER_EVENTS = {
  // Property Panel
  PROPERTY_CHANGE: 'input.property',
  COLOR_PICK: 'input.color',

  // Canvas
  DRAG_DROP: 'input.drop',
  MOVE: 'input.move',

  // Deletion
  DELETE_ELEMENT: 'delete.element',
  DELETE_PROPERTY: 'delete.property',

  // Bulk Operations
  PASTE: 'input.paste',
  DUPLICATE: 'input.duplicate'
}
```

---

## 4. Edge Cases

### 4.1 Schnelle aufeinanderfolgende Änderungen

**Problem:** User ändert Padding schnell von 10 → 20 → 30 → 40
**Erwartung:** Ein Undo geht zu 30, dann 20, dann 10

**Lösung:** CodeMirror gruppiert automatisch Änderungen die < 500ms auseinander liegen NICHT. Jede Änderung ist ein eigener History-Eintrag.

### 4.2 Prelude Offset

**Problem:** CodeModifier arbeitet auf merged source (Prelude + File), Editor nur auf File.

**Lösung:** Bereits implementiert via `currentPreludeOffset`:

```javascript
const adjustedChange = {
  from: result.change.from - currentPreludeOffset,
  to: result.change.to - currentPreludeOffset,
  insert: result.change.insert
}
```

### 4.3 Selection nach Undo

**Problem:** Nach Undo ist das Element vielleicht nicht mehr selektiert.

**Lösung:** Nach jedem Undo/Redo `compile()` aufrufen, das aktualisiert auch die Selection:

```javascript
// CodeMirror ruft bei Undo automatisch die Editor-Listener auf
// → compile() wird getriggert
// → Preview wird aktualisiert
// → Selection bleibt erhalten (falls Element noch existiert)
```

### 4.4 Undo nach Element-Löschung

**Problem:** Element gelöscht, dann Undo - Element kommt zurück, aber Selection?

**Lösung:**
1. Undo stellt den Code wieder her
2. compile() wird aufgerufen
3. SourceMap wird neu gebaut
4. Element existiert wieder mit gleicher nodeId
5. SelectionManager kann Element wieder finden

### 4.5 Cross-File Änderungen

**Problem:** `extractToComponentFile()` ändert zwei Dateien gleichzeitig.

**Lösung:** Für Phase 1 nicht unterstützt. Später:
- Entweder beide Dateien in einem Tab
- Oder separates Undo pro Datei

---

## 5. Implementierungs-Phasen

### Phase 1: Basic Undo (MVP)

**Scope:**
- Property Panel Änderungen undo-bar
- Color Picker Änderungen undo-bar
- Einzelne Änderungen

**Aufwand:** ~1 Stunde

**Änderungen:**
```javascript
// Eine Zeile pro dispatch():
annotations: Transaction.userEvent.of('input.property')
```

### Phase 2: Alle Änderungen

**Scope:**
- Drag & Drop undo-bar
- Element löschen undo-bar
- Move operations undo-bar

**Aufwand:** ~2 Stunden

**Änderungen:**
- Alle `editor.dispatch()` Aufrufe finden
- userEvent Annotation hinzufügen

### Phase 3: Gruppierte Änderungen

**Scope:**
- Mehrere zusammengehörige Änderungen als eine Undo-Einheit
- Z.B. Drag + Reindent als ein Undo

**Aufwand:** ~3 Stunden

**Änderungen:**
```javascript
// Mehrere Changes in einem dispatch:
editor.dispatch({
  changes: [change1, change2, change3],
  annotations: Transaction.userEvent.of('input.grouped')
})
```

### Phase 4: UI & Polish

**Scope:**
- Undo/Redo Buttons in Toolbar
- Visuelles Feedback
- Keyboard Shortcut Hints

**Aufwand:** ~2 Stunden

---

## 6. Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| History wird zu groß | Niedrig | Niedrig | CodeMirror limitiert automatisch |
| Undo bricht Kompilierung | Mittel | Mittel | compile() nach jedem dispatch |
| Sync-Probleme Editor↔Preview | Mittel | Hoch | Immer über dispatch() gehen |
| userEvent API ändert sich | Niedrig | Mittel | CodeMirror ist stabil |

---

## 7. Nicht im Scope

Folgende Features sind **nicht** Teil dieses Konzepts:

- **Undo für Selection-Änderungen** (welches Element selektiert ist)
- **Undo für Scroll-Position**
- **Undo für Panel-States** (welche Sections offen sind)
- **Undo für Zoom-Level**
- **Cross-File Undo** (Änderungen die mehrere Dateien betreffen)
- **Collaborative Undo** (mehrere User gleichzeitig)

Diese sind reine UI-States und haben keinen Einfluss auf den Code.

---

## 8. Fazit

Die Lösung ist minimal-invasiv:

1. **Eine Annotation** zu jedem `editor.dispatch()` hinzufügen
2. **Kein neues System** bauen
3. **Bestehende CodeMirror-Infrastruktur** nutzen
4. **Sofort testbar** nach Implementierung

Der größte Aufwand liegt im **Finden aller dispatch()-Aufrufe** und dem **Testen aller Szenarien**.
