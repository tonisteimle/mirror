# Aufgabe: Clean Code Analyse

## Ziel

Identifiziere die 10 größten "Clean Code"-Problemstellen im Mirror-Projekt und erstelle eine priorisierte Refactoring-Liste.

## Hintergrund

Das Projekt ist organisch gewachsen. Neuere Module (z.B. das Drag & Drop System) sind sauber strukturiert, ältere Teile (z.B. `app.js`) nicht. Wir wollen inkrementell verbessern, nicht alles auf einmal umschreiben.

## Referenz: So soll guter Code aussehen

Die folgenden Dateien zeigen, wie Clean Code im Projekt aussehen soll. Nutze sie als Maßstab:

### Beispiel 1: `studio/preview/drag/drag-controller.ts`

- **Zeilen pro Methode:** 5-15 Zeilen
- **Single Responsibility:** Koordiniert nur, delegiert an Spezialisten
- **Klare Namensgebung:** `startDrag()`, `updatePosition()`, `drop()`, `cancel()`

```typescript
// Beispiel: Jede Methode macht genau eine Sache
private clearTarget(): void {
  this.indicator.hide()
  this.lastTarget = null
}

private storeTarget(containerId: string, insertionIndex: number): void {
  this.lastTarget = { containerId, insertionIndex }
}
```

### Beispiel 2: `studio/preview/drag/layout-cache.ts`

- **116 Zeilen total** für eine vollständige Klasse
- **Private Hilfsmethoden:** `cacheAllRects()`, `buildChildrenMap()`, `addToParent()`
- **Öffentliche API:** Nur 4 public Methoden

### Beispiel 3: `studio/preview/drag/hit-detector.ts`

- **Fokussierte Verantwortung:** Nur Hit-Detection, nichts anderes
- **Lesbare Logik:** Bedingungen in benannte Methoden extrahiert

## Suchkriterien

### 1. Große Funktionen (>50 Zeilen)

```bash
# Hilfreicher Befehl zum Finden
grep -n "^function\|^  function\|^\s*\w\+\s*(" studio/**/*.js studio/**/*.ts | head -100
```

Achte besonders auf:

- Funktionen mit vielen `if/else` Verschachtelungen
- Funktionen mit mehreren `// Comment` Abschnitten (Zeichen für mehrere Verantwortlichkeiten)
- Funktionen die sowohl DOM-Manipulation als auch Business-Logik machen

### 2. Große Dateien (>500 Zeilen)

```bash
wc -l studio/**/*.js studio/**/*.ts compiler/**/*.ts | sort -rn | head -20
```

### 3. Vermischte Zuständigkeiten

Warnsignale:

- Event-Handler die direkt DOM manipulieren UND State ändern UND API-Calls machen
- Dateien die `import` aus vielen verschiedenen Bereichen haben
- Funktionen mit Parametern wie `(event, state, editor, compiler, ...)`

## Bekannte Problemstellen (Startpunkt)

| Datei                       | Problem                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `studio/app.js`             | Monolithische Datei, `handleStudioDrop()` = 299 Zeilen     |
| `studio/app.js`             | `setupNotificationHandlers()` mischt verschiedene Concerns |
| `compiler/parser/parser.ts` | Möglicherweise zu groß                                     |

## Output-Format

Erstelle eine Tabelle in `docs/REFACTORING-PRIORITIES.md`:

```markdown
# Refactoring Prioritäten

| #   | Datei         | Funktion/Bereich | Zeilen | Problem                                                                                   | Vorgeschlagene Lösung                                                                    | Priorität |
| --- | ------------- | ---------------- | ------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------- |
| 1   | studio/app.js | handleStudioDrop | 299    | Macht 5+ Dinge: Validation, Source-Type-Handling, Code-Gen, Editor-Update, Undo-Recording | Aufteilen in: validateDrop(), handlePaletteDrop(), handleCanvasDrop(), applyDropChange() | Hoch      |
| 2   | ...           | ...              | ...    | ...                                                                                       | ...                                                                                      | ...       |
```

## Priorisierungskriterien

**Hoch:**

- Wird häufig geändert (prüfe Git-History: `git log --oneline -20 -- <datei>`)
- Verursacht regelmäßig Bugs
- Blockiert Feature-Entwicklung

**Mittel:**

- Groß aber stabil
- Selten angefasst
- Funktioniert, ist aber schwer zu verstehen

**Niedrig:**

- Einmal geschrieben, nie geändert
- Isoliert (keine Abhängigkeiten)

## Nicht im Scope

- `node_modules/`
- `dist/`
- Test-Dateien (die dürfen länger sein)
- Generierte Dateien

## Zeitrahmen

Geschätzt 2-3 Stunden für die Analyse.

## Ergebnis

1. `docs/REFACTORING-PRIORITIES.md` mit der priorisierten Liste
2. Kurze Zusammenfassung: Was sind die 3 dringendsten Refactorings?
