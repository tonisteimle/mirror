# Compiler Bugs - Gefunden beim Task-App Experiment

## Status: ⚠️ CRUD hinzugefügt, offene Parser-Bugs

## Neue Features

### CRUD Operations in Runtime ✅ HINZUGEFÜGT
**Datei:** `compiler/runtime/dom-runtime-string.ts`
**Feature:** Echte Datenmanipulation statt nur visueller States

Neue Funktionen im eingebetteten Runtime:
- `add(collectionName)` – Fügt neuen Eintrag zur Collection hinzu
- `remove(item)` – Entfernt Eintrag aus Collection (erkennt Collection automatisch via `_key`)
- `updateField(item, field, value)` – Aktualisiert einzelnes Feld
- `_refreshEachLoops(collectionName)` – Re-rendert alle each-Loops für eine Collection

**Verwendung:**
```mirror
// Neuen Task hinzufügen
PrimaryBtn add(tasks)

// Task löschen (item hat _key Property)
Icon "trash-2", remove(task)

// Checkbox Status ändern
Checkbox checked task.done
```

## Offene Bugs

### 8. Parser: Object Literals in Funktionsargumenten ⚠️ OFFEN
**Datei:** `compiler/parser/parser.ts`
**Problem:** Object Literals wie `{ title: "Test", done: false }` werden als Mirror States geparst

**Beispiel:**
```mirror
// Das schreiben wir:
PrimaryBtn add(tasks, { title: "Neuer Task", done: false })

// Parser interpretiert es als:
// - Funktion: add(tasks)
// - States: title: und done:
```

**AST Output:**
```json
{
  "functions": [{ "name": "add", "args": ["tasks"] }],
  "states": [
    { "name": "title", "styles": [...] },
    { "name": "done", "styles": [...] }
  ]
}
```

**Workaround:** `add()` ohne Werte aufrufen, Default-Werte in Runtime definieren
**Status:** Offen - Parser muss Object Literals in Funktionsargumenten erkennen

### 9. setupEditable nicht implementiert ⚠️ OFFEN
**Datei:** `compiler/runtime/dom-runtime-string.ts`
**Problem:** `editable` Property generiert Aufruf zu `setupEditable()`, das nicht existiert

**Fehler:** `_runtime.setupEditable is not a function`

**Workaround:** `editable` Property nicht verwenden
**Status:** Offen - Inline-Editing Feature muss implementiert werden

### 10. Zag Checkbox in Each-Templates ⚠️ OFFEN
**Problem:** Checkbox Zag-Komponente wird in each-Loop Templates nicht korrekt gerendert

**Beobachtung:** Andere Elemente (Text, Icon, Frame) funktionieren, aber Checkbox zeigt nichts

**Status:** Offen - Zag-Komponenten in Templates brauchen spezielle Behandlung

---

## Behobene Bugs

### 1. Conditionals in Each-Loops werden nicht generiert ✅ BEHOBEN
**Datei:** `compiler/parser/parser.ts` (Zeile ~4110)
**Problem:** Parser behandelte komplexe Bedingungen wie `$task.priority == "high"` als `visibleWhen` statt als `ConditionalNode`
**Fix:** Parser unterscheidet jetzt zwischen:
- Einfache State-Bedingungen (`if open`) → `visibleWhen`
- Komplexe Ausdrücke (`if $task.priority == "high"`) → `ConditionalNode`

**Datei:** `compiler/backends/dom.ts` (Zeile ~1193)
**Fix:** `emitEachTemplateNode` prüft auf `node.conditional` und generiert if-Statements

### 2. Fehlende Token-Definitionen im Beispiel ✅ BEHOBEN
**Datei:** `examples/task-app/simple.mirror`
**Problem:** `success.col`, `danger.col`, `warning.col` fehlten
**Fix:** Fehlende Token-Definitionen hinzugefügt

### 3. Ternäre Ausdrücke in Template-Styles ✅ BEHOBEN
**Datei:** `compiler/ir/index.ts` - `resolveValue`
**Problem:** Ausdrücke wie `$task.done ? #10b981 : #2d2640` wurden nicht aufgelöst
**Fix:** Handling für `kind: 'conditional'` hinzugefügt → generiert `__conditional:` Marker

**Datei:** `compiler/backends/dom.ts` - `resolveTemplateStyleValue`
**Fix:** Parst `__conditional:` Marker und generiert JavaScript Ternary

### 4. Arithmetic-Ausdrücke in Template-Styles ✅ BEHOBEN
**Datei:** `compiler/backends/dom.ts` - `resolveTemplateStyleValue` (Zeile ~1427)
**Problem:** `$project.progress + "%"` behielt den `$` Prefix
**Fix:** Ersetzt `$itemVar.prop` mit `itemVar.prop` bei Arithmetic-Ausdrücken

### 5. Icons in Templates ✅ BEHOBEN
**Datei:** `compiler/backends/dom.ts` - `emitEachTemplateNode` (Zeile ~1229)
**Problem:** Icons in each-Loops zeigten Icon-Namen als Text ("folder") statt SVG
**Fix:** Überspringt `textContent` für Icon-Primitives - Icons werden via `loadIcon` geladen

### 6. String-Concatenation in Templates ✅ BEHOBEN
**Datei:** `compiler/backends/dom.ts` - `resolveTemplateValue` (Zeile ~1386)
**Problem:** `"$project.completedCount" + "/" + "$project.tasksCount"` wurde als literaler String behandelt
**Fix:** Erkennt Concatenation-Ausdrücke mit `+` Operator und ersetzt `"$itemVar.prop"` mit `itemVar.prop`

### 7. Duplicate Variable Declarations ✅ BEHOBEN
**Datei:** `compiler/backends/dom/loop-emitter.ts` (Zeile ~45)
**Problem:** Mehrere `each` Loops über dieselbe Collection generierten `const tasksData` mehrfach
**Fix:** Variable-Namen enthalten jetzt `containerId` für Eindeutigkeit: `${containerId}_${collection}`

## Verifiziert

Die TaskFlow-App (425 Zeilen Mirror-Code) funktioniert:
- ✅ 4 Views: Dashboard, Tasks, Projekte, Team
- ✅ Navigation mit `exclusive()` und `navigate()`
- ✅ Conditionals in Loops (`if $task.priority == "high"`)
- ✅ String-Concatenation (`"$project.completedCount" + "/" + "$project.tasksCount"`)
- ✅ Alle Icons als SVGs (50+ Icons)
- ✅ Fortschrittsbalken mit dynamischer Breite
- ✅ Status-Dots basierend auf Member-Status
- ✅ `add()` funktioniert – fügt neue Einträge hinzu
- ✅ `remove()` funktioniert – löscht Einträge aus Collections
- ⚠️ Checkbox in Templates rendert nicht (Zag-Bug)
- ⚠️ `editable` nicht implementiert
