# Editor-Preview-Sync Status

## Übersicht

| Aspekt | Status |
|--------|--------|
| Requirements | ✅ Dokumentiert |
| Architektur | ✅ Dokumentiert |
| Phase 1 | ✅ Implementiert |
| Phase 2 | ✅ Implementiert |
| Phase 3 | ✅ Implementiert |

## Implementierte Schritte

1. [x] `SourceMap.getNodeAtLine()` implementieren
2. [x] `EditorSyncManager` Klasse erstellen
3. [x] Editor updateListener für selectionSet hinzufügen
4. [x] Integration in app.js

## Test-Ergebnis (2026-03-08)

- ✅ Editor → Preview: Klick auf Zeile 2 (Text) selektiert Text-Element in Preview
- ✅ Preview → Property Panel: Klick auf Element zeigt Properties
- ✅ Breadcrumb zeigt Hierarchie (Box › Text)
- ✅ Performance: Keine merkbare Verzögerung im Editor

## Abhängigkeiten

- SourceMap (existiert)
- SelectionManager (existiert)
- CodeMirror EditorView (existiert)

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/studio/source-map.ts` | + `getNodeAtLine()`, + `getNodesStartingAtLine()` |
| `src/studio/editor-sync-manager.ts` | NEUE DATEI |
| `src/studio/index.ts` | + Export EditorSyncManager |
| `studio/app.js` | + updateListener, + scrollEditorToLine, + studioEditorSyncManager |

## Offene Fragen (für spätere Iteration)

- [ ] Soll Zeile im Editor visuell hervorgehoben werden (nicht nur scrollen)?
- [ ] Verhalten bei Multi-Cursor?
- [ ] Verhalten wenn Element über mehrere Zeilen geht?
