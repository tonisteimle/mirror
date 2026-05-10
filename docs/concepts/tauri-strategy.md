# Konzept: Tauri-Desktop-Strategie

> Status: Entscheidungs-Vorlage · 2026-05-10 · Owner-Decision pending
>
> **Zweck:** den Schwebezustand „Tauri-Code existiert, ist aber nicht
> nutzbar" auflösen. Drei klar geschnittene Optionen, mit dem
> Engineer-View der Trade-offs für jede.

## Aktueller Zustand (was im Code steckt)

| Schicht                                          | Zustand                                                                                                                                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/` (Rust)                              | Voll funktionsfähig: `open_project`, `create_project`, `get_recent_projects`, `open_folder_in_explorer`, `open_in_browser` als Commands; `tauri.conf.json` mit Sandbox + CSP; Build-Pipeline (`tauri build`) verifizierbar.            |
| `studio/tauri-bridge.ts`                         | Voll funktionsfähig: exposed `TauriProject.openProject(path)`, `TauriProject.createProject(name, path)`, `TauriDialog`, `TauriMenu`, `TauriWindow`, `TauriAgent` (Claude-CLI). Dynamisches ESM-CDN-Loading der `@tauri-apps/*`-Module. |
| `studio/storage/project-actions.ts` Menu-Actions | **Stub-Zustand**: `tauriNewProject` / `tauriImportProject` / `tauriExportProject` loggen `log.warn` und no-oppen. Nur `tauriLoadDemo` ist real (schreibt DEFAULT_PROJECT in Storage).                                                  |
| Studio-File-Explorer                             | Zeigt Files aus `window.desktopFiles` (gefüttert vom Rust-Backend). Funktioniert.                                                                                                                                                      |
| Project-Lifecycle (Open/New/Import/Export)       | Im Browser komplett verdrahtet (localStorage + ZIP-CDN). Im Tauri-Build broken — User klickt „Neues Projekt", nichts passiert.                                                                                                         |

**Konkrete User-Konsequenz heute:** wer die Desktop-App startet,
kommt mit `tauriLoadDemo` weiter, aber alle anderen Menu-Actions
sind tot. Erste-Sekunde-Erfahrung: Menü tut nichts, Vertrauen weg.

## Drei Optionen

### A. Commit — Tauri ist primary distribution channel

**Investition:** ~150–250 LOC Engineering + ~1 Woche UX/QA.

Konkret:

- `tauriNewProject` → `TauriDialog.open(directory: true)` für Pfad-
  Auswahl, dann `TauriProject.createProject(name, path)`, dann
  `loadProject(path)`. Native Folder-Picker, kein DOM-Hack.
- `tauriImportProject` → analog, mit `TauriProject.openProject(path)`.
- `tauriExportProject` → entweder echtes `TauriDialog.save()` für
  „Speichern unter" (sauber, aber redundant da Tauri auto-saves) oder
  bewusst no-op mit Toast „Projekt wird automatisch gespeichert".
- Recent-Projects-Menü via `TauriProject.getRecentProjects()` (Code
  schon da, UI fehlt).
- Auto-Update-Mechanismus (Tauri-Updater) für Production.
- Code-Signing für macOS + Windows (Distributions-Voraussetzung).

**Kosten:** Update-Server-Infrastruktur. Code-Signing-Zertifikate
(~100€/Jahr Apple, ~200€/Jahr für EV-Cert Windows). CI-Pipeline für
Multi-Platform-Builds (macOS-Runner, Windows-Runner, Linux).
Maintenance-Verpflichtung für die Native-Layer (Tauri-Versions-
Updates, Permission-Audits).

**Wert:** echte Desktop-App. File-System-Zugriff ohne Browser-Hacks.
Schneller Cold-Start. Offline-Fähigkeit. Native Look & Feel.
Spec-Bundle-Erzeugung mit `claude` direkt aus der App via
`TauriAgent`.

**Wann sinnvoll:** wenn Mirror's primärer Distributions-Kanal
„Tool-Download" sein soll (Designer downloaden, installieren,
arbeiten lokal). Wenn Spec-Bundle + AI-Agent im selben Prozess
laufen soll (heute braucht User `claude` als CLI separat).

### B. Archive — Browser-only, Desktop später

**Investition:** ~30 min Engineering + saubere README-Aktualisierung.

Konkret:

- `src-tauri/` → `docs/archive/src-tauri/` mit ARCHIVE.md das den
  Stand erklärt + den Re-Activation-Pfad dokumentiert.
- `studio/tauri-bridge.ts` → entweder mit-archivieren oder als
  no-op-Stub belassen (alle Calls werfen oder loggen).
- `tauriNewProject` & co aus `project-actions.ts` raus (Browser-Pfad
  ist immer aktiv, isTauri()-Check entfällt).
- README-Section „Desktop-App" raus oder als „roadmap" markieren.
- Tauri-spezifische Tests (`tauri-bridge.test.ts`,
  Tauri-Branches in `storage-project-actions.test.ts`) entweder
  archivieren oder als regression-prevention für Re-Activation
  behalten.
- `package.json` Dependencies: `@tauri-apps/cli` etc. in
  `optionalDependencies` oder ganz raus.

**Kosten:** Tauri-Re-Aktivierung wird teurer (zurückportieren,
Tauri-Version bumpen, Permission-Modell aktualisieren).
Distributions-Kanal-Ambivalenz bleibt — User-Frage „läuft das
auch lokal?" muss klar mit „heute nur Browser" beantwortet werden.

**Wert:** Klarheit. Eine Code-Path, ein Test-Stack, ein
Distributions-Modell. Studio entwickelt sich frei, ohne Tauri-
Constraints im Hinterkopf. Kein Schrödinger-Menü mehr.

**Wann sinnvoll:** wenn Mirror's primäre Distribution Browser-basiert
ist (mirror.app o.ä.) und Desktop ein „nice to have for later" ist.
Wenn die Engineering-Kapazität für Native-Maintenance heute fehlt.

### C. Defer — Stub-Zustand mit klarem Hinweis halten

**Investition:** ~10 min — Toasts statt silent log.warn.

Konkret:

- Die drei Stub-Functions zeigen einen sichtbaren Toast „Diese Aktion
  ist im Desktop-Build noch nicht implementiert. Nutze die Browser-
  Version unter mirror.app." statt nur ins Log zu schreiben.
- Menü-Items deaktiviert mit Tooltip „Coming soon (Q4)".
- Roadmap-Eintrag in README.

**Kosten:** Worst-of-both. Code bleibt, Maintenance bleibt, User-
Erfahrung bleibt schlecht (eingegrauter Menüpunkt schreit „kaputt").
Investitionen sammeln sich an, ohne dass jemals ein Cut passiert.
Drei Monate später ist die Frage immer noch offen.

**Wert:** sehr begrenzt. Hauptsächlich: Engineering-Kapazität für
andere Slices freihalten + ein realistisches Q3-Re-Visit-Datum
setzen.

**Wann sinnvoll:** wenn Tauri-Decision wirklich noch in Diskussion
ist und ein klares Re-Visit-Datum kommittiert werden kann (max. 6
Monate). Sonst ist es A oder B.

## Empfehlung des Engineers

**B oder A, nicht C.**

Aus dem reinen Engineering-View ist B billiger und macht die
Codebasis sauberer (eine Code-Path, ein Test-Stack). Aus dem
Produkt-View hängt es davon ab, was Mirror tatsächlich sein will:

- Wenn Mirror primär ein **Tool für Designer** ist (Studio-zentriert,
  Tutorial-Vollausbau-Plan), dann macht ein nativer Desktop-Build
  Sinn (A) — Designer downloaden Tools, sie öffnen sie nicht im
  Browser-Tab.
- Wenn Mirror primär ein **Compiler/CLI für Entwickler** ist
  (Spec-Bundle-Pipeline-zentriert, Export zu React/Vue/Svelte), dann
  ist Studio ein Tool im Browser-Tab das nebenbei ein Designer
  bedienen kann (B) — keine Native-App nötig.

Die Konzept-Doku `studio-tutorial.md` und die Spec-Bundle-
Architektur ziehen heute **beide gleichzeitig**. Diese Spannung ist
auch das Hauptthema in `docs/concepts/positioning.md` (separates
Dokument). Tauri-Entscheidung ist deren konkretes Ableitungs-
Ergebnis: Designer-First → A, Compiler-First → B.

## Decision-Trigger

Die Tauri-Entscheidung blockt nichts akut, aber sie blockt:

1. **Erstes Public-Release** (welches Format wird verteilt?)
2. **Tutorial-Vollausbau** (Videos zeigen Browser oder Desktop?
   Können nicht beides sein, ohne Aufnahme-Aufwand zu verdoppeln.)
3. **Onboarding-Doku im README** (Install-Schritte unterscheiden sich
   massiv).

Ohne Entscheidung schleicht jede dieser drei in suboptimaler Form
voraus.

**Vorschlag:** Entscheidung bis 2026-06-15. Wenn bis dahin offen,
default zu **B (Archive)** — die billigere Option mit dem
einfacheren Re-Open-Pfad bei späterem Bedarf. Daraus folgender
PR-Plan:

- 2026-06-15 +0 PR „Tauri archived per tauri-strategy.md"
- 2026-06-15 +5 Studio-Tests rein Browser-only, alle Tauri-Branches
  und `isTauri()`-Forks aus dem Production-Code raus.
- 2026-Q4 Re-evaluate based on User-Demand, ggf. A umsetzen.

## Wichtige Dateien (Referenz)

| Datei                                              | Rolle                           |
| -------------------------------------------------- | ------------------------------- |
| `src-tauri/`                                       | Rust-Side (~10 Files, ~500 LOC) |
| `src-tauri/src/commands/project.rs`                | open_project / create_project   |
| `studio/tauri-bridge.ts`                           | TS-Side Bridge (~440 LOC)       |
| `studio/storage/project-actions.ts:630-665`        | Die vier Stubs                  |
| `studio/desktop-files.ts`                          | File-Explorer Tauri-Integration |
| `tests/studio/storage-project-actions.test.ts:503` | Tauri-Branch-Tests              |
| `docs/findings.md` (`__TAURI_BRIDGE__`)            | Bisherige Findings + Cleanup    |
