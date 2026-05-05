# Mirror MVP-Reduktion — Rückbauplan

> Status: Plan, noch nicht umgesetzt.

## Ziel

Eine einzige `.mir`-Datei statt Multi-File-Projekten. In-File-Reihenfolge: Tokens → Components → Canvas / Screens. **Alles andere bleibt unverändert** — Property-Panel, Pickers, Visual-Editing, Sync, Tree, Settings, Components-Panel etc. funktionieren wie zuvor.

## Methode: Soft-Deactivation

Code bleibt im Repo, nur nicht mehr aktiv. Reaktivierung in Minuten möglich. Module-Verzeichnisse (`studio/file-tree/`, `studio/file-types/`, `studio/panels/explorer/`, `studio/compile/`) werden **nicht gelöscht**.

CLI-Multi-File-Modus (`compiler/cli.ts --project`) bleibt unangetastet — Power-User-Feature.

---

## Feature 1 — Multi-File-Infrastruktur deaktivieren

Betrifft: File-Explorer-Panel (linke Sidebar), Project-Toolbar, File-Tree, Activity-Bar-Item „Files".

### 1.1 `studio/index.html`

| Zeile | Was                                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| 34    | View-Menu-Item `data-panel="files"` löschen                                                                             |
| 50–56 | `<div class="sidebar" id="explorer-panel">` Block (mit `#project-toolbar-container` und `#file-tree-container`) löschen |
| 58    | `<div class="divider" id="sidebar-divider"></div>` löschen                                                              |

### 1.2 `studio/bootstrap.ts`

| Zeile   | Was                                                                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 52      | Import `ActivityBar, createActivityBar, ACTIVITY_BAR_ICONS from './panels/explorer'` — bleibt bestehen, weil die Activity-Bar selbst weiterläuft (nur das `files`-Item entfällt).                    |
| 88–89   | Felder `explorerPanelContainer` und `fileTreeContainer` aus `BootstrapConfig` entfernen (oder als deprecated markieren — Soft-Variante: stehen lassen, sie werden einfach nicht mehr durchgereicht). |
| 743–744 | Mapping `panelElements.files = document.getElementById('explorer-panel') …` löschen.                                                                                                                 |
| 861     | Activity-Bar-Items-Array: Eintrag `{ id: 'files', icon: ACTIVITY_BAR_ICONS.files, tooltip: 'Files' }` löschen.                                                                                       |

### 1.3 `studio/app.ts`

| Zeile     | Was                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1948–1949 | `explorerPanelContainer` und `fileTreeContainer` Lookups löschen.                                                                                                   |
| 1958–1961 | Playground-Mode-Hide für `explorerPanelContainer` löschen (Block existiert nicht mehr).                                                                             |
| 1972–1973 | `explorerPanelContainer` und `fileTreeContainer` aus dem `initNewStudio({…})`-Aufruf entfernen.                                                                     |
| 2411–2412 | `initPanelDividers({…})` — `sidebar` und `sidebarDivider` Felder auf `null` setzen oder entfernen (siehe `studio/ui/panel-dividers.ts` für die erwartete Signatur). |

### 1.4 `studio/core/state-types.ts`

| Zeile | Was                                                                                                                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 82    | `files: boolean` aus `PanelVisibility`-Interface löschen — und gleiche Bereinigung in `studio/core/state.ts` (Defaults), Settings-Persistenz und allen `panelVisibility.files`-Lesestellen (grep `panelVisibility.files`). |

> Alternativ Soft-Variante: Feld stehen lassen, default `false` setzen. Spart Folge-Edits, kostet nur ein totes Feld.

### 1.5 `studio/styles.css`

| Zeile | Was                                                      |
| ----- | -------------------------------------------------------- |
| 4     | `@import url('./styles/file-tree.css');` auskommentieren |
| 6     | `@import url('./styles/explorer.css');` auskommentieren  |

### 1.6 `studio/desktop-files.ts`

Die Tauri-File-Bridge rendert in `#file-tree-container`. Ohne Container schlägt der `getElementById`-Lookup auf `null` zurück und die Funktionen bleiben no-ops. **Nichts ändern** — nur Smoke-Test, dass keine Konsolenfehler kommen.

### 1.7 Module-Verzeichnisse

`studio/file-tree/`, `studio/file-types/`, `studio/panels/explorer/` — **nicht löschen**. `studio/index.ts` re-exportiert weiterhin `./file-types` (wird intern von `detectFileType` etc. genutzt) und `./panels/explorer` (Activity-Bar bleibt).

---

## Feature 2 — Design-System-Preview-Panel deaktivieren

Betrifft: Mittleres Panel zwischen Code-Editor und Preview, das Token-Swatches und Component-Definitionen rendert.

### 2.1 `studio/index.html`

| Zeile   | Was                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 37      | View-Menu-Item `data-panel="design-system"` löschen                                                                                                  |
| 102–109 | `<div class="design-system-panel" id="design-system-panel">` Block (mit `#design-system-panel-tokens` und `#design-system-panel-components`) löschen |
| 111     | `<div class="divider" id="design-system-divider"></div>` löschen                                                                                     |

### 2.2 `studio/bootstrap.ts`

| Zeile   | Was                                                                                                                                                                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 53      | Import `TokenRenderer from './compile/token-renderer'` löschen.                                                                                                                                                                                                               |
| 86      | Feld `tokensPanelContainer?: HTMLElement` aus `BootstrapConfig` entfernen.                                                                                                                                                                                                    |
| 398–436 | Kompletten Tokens-Sidebar-Init-Block löschen (`if (config.tokensPanelContainer) { … }` plus den nachfolgenden `if (tokensPanelContainer && config.getFiles) { … }` mit `TokenRenderer`, `parseTokensFromFiles`, `eventUnsubscribes.push(events.on('compile:completed', …))`). |
| 747     | `panelElements['design-system'] = document.getElementById('design-system-panel')` löschen.                                                                                                                                                                                    |
| 863     | Activity-Bar-Items-Array: Eintrag `{ id: 'design-system', icon: ACTIVITY_BAR_ICONS.designSystem, tooltip: 'Design System' }` löschen.                                                                                                                                         |

> Außerdem: `studio.tokensRenderer = renderer` Zuweisung verschwindet mit dem Block — falls `tokensRenderer` als StudioInstance-Feld deklariert ist (siehe `studio/core/types.ts` o.ä.), entweder Feld optional lassen oder ebenfalls entfernen.

### 2.3 `studio/app.ts`

| Zeile     | Was                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 76        | Import `TokenRenderer` aus `'.'` — bleibt (wird in `getTokenRenderer()` für die normale `.mir`-DOM-Pipeline genutzt).                                                                                              |
| 77        | Import `ComponentRenderer` aus `'.'` — bleibt analog.                                                                                                                                                              |
| 935–963   | `tokenRenderer` / `componentRenderer` Lazy-Init bleibt (wird für `fileType === 'tokens'` / `'component'` Preview genutzt; entfällt erst in Schritt 2.5).                                                           |
| 965–1007  | Design-System-Sidebar-Block (`designSystemTokenRenderer`, `designSystemComponentRenderer`, `getDesignSystemTokenRenderer()`, `getDesignSystemComponentRenderer()`, `refreshDesignSystemPanel()`) komplett löschen. |
| 1326      | Aufruf `refreshDesignSystemPanel()` in der Compile-Pipeline löschen.                                                                                                                                               |
| 1956      | `const tokensPanelContainer = document.getElementById('tokens-panel-container')` löschen.                                                                                                                          |
| 1981      | `tokensPanelContainer: …` aus dem `initNewStudio({…})`-Aufruf entfernen.                                                                                                                                           |
| 2415–2416 | `initPanelDividers({…})` — `designSystemPanel` und `designSystemDivider` Felder auf `null` setzen oder entfernen.                                                                                                  |

### 2.4 `studio/core/state-types.ts`

| Zeile | Was                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 85    | `'design-system': boolean` aus `PanelVisibility`-Interface löschen — plus Defaults in `state.ts`, Settings-Persistenz und alle Lesestellen. |
| 96    | `designSystem: number` aus `PanelSizes`-Interface löschen (analog Bereinigung in `state.ts` und `panel-dividers.ts`).                       |

> Soft-Variante wie in 1.4: Felder stehen lassen, defaults so, dass nichts passiert.

### 2.5 `studio/app.ts` — Token-/Component-Preview-Modi

In der Compile-Pipeline (rund um Zeile 1329–1343) gibt es einen Switch `if (fileType === 'tokens') { getTokenRenderer().render(…) } else if (fileType === 'component') { getComponentRenderer().render(…) } else { … DOM-Render }`.

Da im Single-File-Modus nur noch `.mir`-Dateien existieren (`fileType === 'layout'`), sind die `tokens`- und `component`-Branches toter Code:

| Zeile     | Was                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1329–1342 | `if/else if` Branches für `fileType === 'tokens'` und `fileType === 'component'` löschen. Direkt zum `else`-Branch (DOM-Render) durchfallen lassen.                                       |
| 935–963   | Damit werden auch `tokenRenderer`, `componentRenderer`, `getTokenRenderer()`, `getComponentRenderer()` zu totem Code — kann gelöscht oder als ungenutzt markiert bleiben (Soft-Variante). |

### 2.6 `studio/styles.css`

| Zeile   | Was                                                                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 481–503 | CSS-Block `.design-system-panel { … }` (inkl. `.design-system-panel.panel-hidden`, `#design-system-panel-tokens`, `#design-system-panel-components`, `#design-system-panel-tokens:not(:empty)`) löschen. |

### 2.7 Module-Verzeichnis

`studio/compile/` — **nicht löschen**. `token-renderer.ts`, `component-renderer.ts`, `yaml-parser.ts`, `preview-renderer.ts` etc. werden zwar nicht mehr aufgerufen, sind aber durch den Barrel `studio/compile/index.ts` und Re-Exports in `studio/index.ts` weiterhin importiert. Auch `prelude-builder.ts`, `collect-prelude.ts`, `tokens-source.ts`, `all-project-source.ts`, `studio-updater.ts`, `code-generator.ts`, `compile-service.ts`, `auto-create-files.ts` bleiben aktiv (werden aus app.ts genutzt).

---

## Storage / Boot-Defaults

`studio/storage/` (Provider, Service, project-actions) bleibt strukturell bestehen — der File-Service kann nach wie vor mehrere Files halten, wir öffnen einfach nur eines. Ein einzelner Single-File-Default zum Boot:

- `studio/storage/index.ts` (oder wo der Initial-State gesetzt wird): Default-Files-Map auf `{ 'app.mir': '<starter>' }` reduzieren — keine `tokens.tok` / `components.com` Auto-Create.
- `studio/storage/project-actions.ts`: Multi-File-Aktionen (Datei anlegen, umbenennen, löschen) bleiben im Code; nur die UI dafür (File-Tree) ist weg, also UI-seitig nicht mehr aufrufbar.

---

## Verifikation („Done wenn")

- Studio öffnet eine `.mir`-Datei direkt — kein File-Picker, kein Explorer.
- Activity-Bar zeigt: Components / Code / Preview / Property (+ Settings unten). Keine `Files`, kein `Design System`.
- Nur der `.mir`-DOM-Preview-Modus ist aktiv (keine Token-/Component-Preview-Modi mehr).
- Alle nicht-betroffenen Features (Property-Panel, Pickers, Visual-Editing, Tree, Sync, Inline-Edit, Components-Panel, Settings) funktionieren unverändert.
- Browser-Konsole: keine Fehler/Warnungen aus den entfernten Pfaden.
- CLI-Multi-File-Modus (`mirror-compile --project`) bleibt funktional.

## Danach

AI-Pipeline implementieren — siehe `docs/ai-generation-pipeline.md`.
