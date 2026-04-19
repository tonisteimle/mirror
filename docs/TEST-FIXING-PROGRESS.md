# Test-Fixing Progress Report

**Datum**: 2026-04-19
**Branch**: cleanup/project-cleanup

## Ausgangssituation

- **Gesamtanzahl Tests**: ~325 Browser-Tests (zu Beginn)
- **Fehlgeschlagene Tests zu Beginn**: ~97 Tests
- **Ziel**: Alle Tests zum Laufen bringen

## Endergebnis

**Alle 1385 Browser-Tests bestehen jetzt.**

## Abgeschlossene Fixes

### 1. Keyboard Shortcuts (H, V, F Keys)

- **Problem**: Tests für Layout-Shortcuts schlugen fehl
- **Fix**: Keyboard handling korrigiert
- **Status**: ✅ Gefixt

### 2. Zag Resize Handle Tests

- **Problem**: Resize-Handles nicht korrekt erkannt
- **Fix**: Handle-Selektoren angepasst
- **Status**: ✅ Gefixt

### 3. SyncCoordinatorV2 Multiselection

- **Problem**: Editor-Multiselection wurde nicht an Preview übertragen
- **Fixes**:
  - `handleEditorSelection()` Methode hinzugefügt
  - `setMultiSelection()` zu StateStorePort hinzugefügt
  - `clearMultiSelection()` zu StateStorePort hinzugefügt
- **Status**: ✅ Gefixt

### 4. Test Timing für Cursor Sync

- **Problem**: Tests zu schnell, cursorDebounce (150ms) nicht berücksichtigt
- **Fix**: Test delay von 100ms auf 200ms erhöht
- **Status**: ✅ Gefixt

### 5. \_\_compileTestCode fehlende SourceMap-Aktualisierung

- **Problem**: `__compileTestCode` in app.js erstellte eine neue SourceMap, aber aktualisierte nicht den SyncCoordinator
- **Root Cause**: `studio.sync?.setSourceMap(sourceMap)` fehlte in `__compileTestCode`
- **Symptom**: `handleEditorSelection` fand keine Nodes (`getNodeAtLine` gab null zurück)
- **Fix**: Hinzugefügt in app.js:
  ```javascript
  studio.sync?.setSourceMap(sourceMap)
  studio.preview?.setSourceMap(sourceMap)
  ```
- **Status**: ✅ Gefixt

### 6. Test-Erwartung für Parent-Child Filtering

- **Problem**: Test erwartete multiSelection bei einzelnem Element
- **Root Cause**: Wenn nach Filterung nur 1 Element übrig bleibt, wird reguläre Selection statt Multiselection verwendet
- **Fix**: Test angepasst um reguläre Selection zu prüfen statt Multiselection
- **Status**: ✅ Gefixt

### 7. selectLines focus() vor dispatch()

- **Problem**: selectLines rief focus() vor dispatch() auf, was zwei UpdateListener-Events verursachte
- **Fix**: focus()-Aufrufe entfernt, da dispatch() auch ohne Focus funktioniert
- **Status**: ✅ Gefixt

### 8. \_\_compileTestCode fehlende LineOffset-Aktualisierung

- **Problem**: `__compileTestCode` setzte `currentPreludeOffset = 0`, aber aktualisierte nicht `studio.sync.lineOffset.setOffset(0)`
- **Fix**: Hinzugefügt in app.js:
  ```javascript
  if (studio?.sync?.lineOffset) {
    studio.sync.lineOffset.setOffset(0)
  }
  ```
- **Status**: ✅ Gefixt

### 9. Single Line Selection Test Robustheit

- **Problem**: Test "Single line selection uses regular selection" scheiterte sporadisch
- **Root Cause**: Test setzte Cursor, ohne dass eine Zustandsänderung erkannt wurde
- **Fix**: Test angepasst, um zuerst zu Zeile 1, dann zu Zeile 2 zu wechseln
- **Status**: ✅ Gefixt

### 10. window.files Initialisierung

- **Problem**: `FilesPanelAPIImpl.create()` modifizierte ein temporäres `{}` Objekt wenn `window.files` undefined war
- **Fix**: Hinzugefügt in panel-api.ts:
  ```typescript
  if (!(window as any).files) {
    ;(window as any).files = {}
  }
  ```
- **Status**: ✅ Gefixt

### 11. Project Test Isolation

- **Problem**: "Project: Create token file" Test scheiterte wenn vorherige Tests Dateien hinterließen
- **Root Cause**: Test nahm an, dass `tokens.tok` nicht existiert
- **Fix**: Cleanup vor dem Test hinzugefügt:
  ```typescript
  // Clean up any pre-existing file from previous test runs
  await files.delete('tokens.tok')
  await api.utils.delay(50)
  ```
- **Status**: ✅ Gefixt

## Technische Details

### Relevante Dateien

- `studio/sync/sync-coordinator-v2.ts` - Multiselection handling
- `studio/test-api/test-runner.ts` - Test utilities inkl. selectLines()
- `studio/test-api/suites/interactions/editor-multiselect.test.ts` - Multiselect Tests
- `studio/test-api/suites/project/index.ts` - Project Tests
- `studio/test-api/panel-api.ts` - Panel API inkl. Files API
- `studio/app.js` - Editor setup und Extensions

### Debug-Globals (für Browser-Konsole)

- `window.__selectLinesDebug` - Debug-Info von selectLines()
- `window.__updateDebugHistory` - Selection-Changes im Update-Listener
- `window.editor.__originalDispatch` - Original dispatch-Funktion

## Wichtige Erkenntnisse

### 1. Tests nach Änderungen neu bauen

Tests sind in das Studio gebundelt (`npm run build:studio`). Änderungen an Test-Dateien erfordern einen Rebuild, bevor sie wirksam werden.

### 2. Test-Isolation ist kritisch

Tests sollten immer ihren eigenen Zustand aufräumen UND nicht auf sauberen Zustand angewiesen sein. "Clean before" und "clean after" ist sicherer.

### 3. LineOffset und SourceMap synchron halten

Wenn `__compileTestCode` ohne Prelude kompiliert, müssen sowohl SourceMap als auch LineOffset auf 0 gesetzt werden, damit Cursor-Sync funktioniert.

## Nächste Prioritäten

1. **CI Integration**
   - Tests in CI-Pipeline einbinden
   - Flaky Tests identifizieren falls vorhanden

2. **Wartung**
   - Neue Features mit Tests abdecken
   - Test-Performance optimieren (uiBuilder-Tests sind langsam)

## Zusammenfassung

### Ausgangslage

- ~97 fehlgeschlagene Tests von ~325 Browser-Tests

### Behobene Root-Cause Issues

1. `__compileTestCode` aktualisierte weder SourceMap noch LineOffset
2. Test-Erwartungen für Edge-Cases waren inkorrekt
3. `selectLines` verursachte durch `focus()` doppelte Update-Events
4. `window.files` wurde nicht initialisiert
5. Project Tests hatten keine Test-Isolation

### Ergebnis

**Alle 1385 Browser-Tests bestehen jetzt.**

Die Test-Suite wurde während der Debugging-Session erheblich erweitert (von ~325 auf 1385 Tests).

---

_Letzte Aktualisierung: 2026-04-19_
