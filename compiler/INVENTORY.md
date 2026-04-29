# Compiler Inventur

**Stand:** 2026-04-28
**Zweck:** Status pro Datei im `compiler/` — was aktiv, was tot, was unklar. Grundlage für Phase 1 (mechanische Putze) und Phase 3 (`compiler/studio/` aufräumen).

**Kein Code geändert** — nur Lesen und Notieren.

---

## Überraschungen während der Inventur (lies das zuerst)

1. **14 Sub-Verzeichnisse in `compiler/`** — `CLAUDE.md` dokumentiert nur 7. Stale documentation: `converters/`, `compiler/`, `llm/`, `prelude/`, `quality/`, `testing/`, `utils/` fehlen.
2. **`compiler/compiler/`** — rekursives Verzeichnis. Bizarr, sollte untersucht werden.
3. **`code-modifier.ts` ist als `@deprecated` markiert, aber von 18+ Dateien aktiv genutzt.** `CodeModifierV2` (die "neue" Version) hat genau **einen Caller**: ihr eigenes Test-File. Die V2-Migration wurde begonnen, **nie abgeschlossen** — und die Deprecation-Kommentare lügen.
4. **`llm-integration.ts` (13 KB) — auskommentiert, ungenutzt, aber Datei existiert noch.** Klassischer toter Code.
5. **Drei Token-Parser sind alle aktiv** (nicht "Legacy vs. neu") — die Namen sind irreführend.

---

## 1. iCloud-Doubletten (Phase 1: löschen)

Alle **10 Dateien** im `compiler/` mit `* 2.<ext>`-Suffix. Das sind iCloud-Sync-Artefakte (Repo liegt unter "Mobile Documents"). Datums-Metadaten zeigen: die `* 2`-Files sind **älter** als die Originale → alte Snapshots, sicher löschbar nach Diff-Check.

| Datei                                    | Größe  | Original                      | Status        |
| ---------------------------------------- | ------ | ----------------------------- | ------------- |
| `compiler/positional-resolver 2.ts`      | 18 KB  | `positional-resolver.ts`      | TOT — löschen |
| `compiler/backends/dom 2.ts`             | ?      | `backends/dom.ts`             | TOT — löschen |
| `compiler/backends/framework 2.ts`       | ?      | `backends/framework.ts`       | TOT — löschen |
| `compiler/backends/react 2.ts`           | ?      | `backends/react.ts`           | TOT — löschen |
| `compiler/testing/index 2.ts`            | 1.3 KB | `testing/index.ts`            | TOT — löschen |
| `compiler/testing/render 2.ts`           | 6.6 KB | `testing/render.ts`           | TOT — löschen |
| `compiler/testing/static-table 2.mirror` | 0.2 KB | `testing/static-table.mirror` | TOT — löschen |
| `compiler/testing/style-validator 2.ts`  | 15 KB  | `testing/style-validator.ts`  | TOT — löschen |
| `compiler/testing/types 2.ts`            | 5.4 KB | `testing/types.ts`            | TOT — löschen |
| `compiler/testing/vitest-helpers 2.ts`   | 6.3 KB | `testing/vitest-helpers.ts`   | TOT — löschen |

**Empfehlung Phase 1:** vor Löschen pro Paar `diff` laufen lassen — falls überraschenderweise Inhalt abweicht, separat anschauen.

---

## 2. `compiler/studio/` — Detail-Inventur

### 2a. Code-Modifier-Cluster (das große Durcheinander)

| Datei                                     | Größe  | Status                          | Begründung                                                                                                                              |
| ----------------------------------------- | ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `code-modifier.ts`                        | 91 KB  | **AKTIV** (trotz `@deprecated`) | 18+ Caller in `studio/`, `tests/`, `tools/`. Die als "deprecated" markierte Version ist die produktiv genutzte.                         |
| `code-modifier-v2.ts`                     | 27 KB  | **TOT IN PRAXIS**               | Einziger Caller: `code-modifier-index.ts` (Re-Export) + `tests/studio/code-modifier/code-modifier-v2.test.ts`. Kein produktiver Aufruf. |
| `code-modifier-index.ts`                  | 1.6 KB | **HALB-AKTIV**                  | Re-exportiert sowohl V1 als V2. V2-Pfad ist Sackgasse.                                                                                  |
| `code-modifier-ports.ts`                  | 6 KB   | **TOT IN PRAXIS**               | Interfaces für V2-Ports. Nur von V2 selbst und Adapter-Files genutzt.                                                                   |
| `robust-modifier.ts`                      | 15 KB  | **AKTIV**                       | Wrapper um `CodeModifier` für atomare Updates. Genutzt via `studio/app.js` (`MirrorLang.createRobustModifier`) und `studio/drop/`.      |
| `adapters/code-modifier-adapters.ts`      | 7 KB   | **TOT IN PRAXIS**               | Production-Adapter für V2. Nicht aufgerufen.                                                                                            |
| `adapters/mock-code-modifier-adapters.ts` | 15 KB  | **AKTIV (Test-only)**           | Mock-Adapter, nur in V2-Test verwendet. Stirbt mit V2.                                                                                  |
| `adapters/index.ts`                       | 1.2 KB | Re-Export                       | Stirbt mit V2-Cluster.                                                                                                                  |

**Diagnose:** Es gab einen Anlauf für eine "Hexagonal Architecture"-Variante (`CodeModifierV2` + Ports + Adapters). Der Anlauf wurde **nie zu Ende gebracht** — kein produktiver Code wurde migriert. V2 ist seit Monaten Toter Code, aber als "Recommended" markiert. Die Deprecation-Marker auf V1 sind irreführend und sollten entfernt werden.

**Entscheidung nötig (du):** V2 komplett löschen, oder doch fertig migrieren?

- **Option A — V2 löschen** (klarer, schneller): `code-modifier-v2.ts`, `code-modifier-ports.ts`, `code-modifier-index.ts`, `adapters/`-Verzeichnis, V2-Test alle weg. Deprecation-Marker auf V1 entfernen. ~50 KB tote Last weg.
- **Option B — V2 fertigmachen** (sauberer langfristig, aber großer Aufwand): alle 18+ Caller von V1 auf V2 migrieren, dann V1 löschen. **Wochen Arbeit.**

Mein Rat: **Option A** für jetzt, später ggf. neuer Anlauf mit klarem Zeitplan. Toter Code ist schlimmer als alter Code.

### 2b. Andere Studio-Module

| Datei                       | Größe  | Caller                                                               | Status                                                                                                                                        |
| --------------------------- | ------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `selection-manager.ts`      | 5.5 KB | nur Re-Export in `compiler/studio/index.ts` (markiert `@deprecated`) | **VERDÄCHTIG** — keine direkten Caller gefunden, aber re-exportiert. Studio nutzt `studio/core/StateSelectionAdapter`. Wahrscheinlich tot.    |
| `property-extractor.ts`     | 32 KB  | `studio/app.js` (via `MirrorLang.PropertyExtractor`)                 | AKTIV                                                                                                                                         |
| `component-icon-matcher.ts` | 31 KB  | nur Re-Export — keine direkten Caller in Sources gefunden            | **VERDÄCHTIG** — externer Konsumer?                                                                                                           |
| `coordinate-transformer.ts` | —      | gelöscht 2026-04-29 (Phase 3 Iter 1)                                 | TOT — Klasse nie instanziiert; nur `setGridSettingsProvider` aktiv aufgerufen, hatte aber Null-Effekt (Provider nur von toter Klasse gelesen) |
| `spatial-cache.ts`          | 3.6 KB | nur Test (`tests/studio/modifier-spatial-cache.test.ts`)             | **VERDÄCHTIG** — von Test geprüft aber von keinem Produktivcode genutzt?                                                                      |
| `z-index-manager.ts`        | 6 KB   | nur in sich selbst — kein externer Caller                            | **VERDÄCHTIG / TOT**                                                                                                                          |
| `line-property-parser.ts`   | 14 KB  | `code-modifier.ts`, `robust-modifier.ts` + Tests                     | AKTIV                                                                                                                                         |
| `llm-integration.ts`        | 13 KB  | **auskommentiert in `index.ts`** (Z. 97-108)                         | **TOT** — explizit disabled, nicht mehr aufgerufen                                                                                            |
| `services/smart-sizing.ts`  | 4.5 KB | nur Re-Export                                                        | **VERDÄCHTIG**                                                                                                                                |
| `utils/layout-detection.ts` | 6.3 KB | nur Re-Export                                                        | **VERDÄCHTIG**                                                                                                                                |
| `index.ts`                  | 4.2 KB | Public API von `compiler/studio/`                                    | AKTIV (Re-Export-Hub)                                                                                                                         |

**Wichtige Beobachtung:** Viele Module werden über `compiler/studio/index.ts` re-exportiert, aber niemand importiert sie. Das könnte heißen:

- (a) Sie werden von externen Konsumenten (`packages/mirror-lang`?) genutzt
- (b) Sie sind tot, und niemand merkt's wegen Re-Export

**Empfehlung Phase 3:** Pro "VERDÄCHTIG"-Eintrag konkret prüfen: gibt es Konsumenten in `packages/`, `dist/`, oder als globale `MirrorLang.*` in `studio/app.js`? Das beantwortet die Frage final.

---

## 3. Token-Parser im Parser

| Methode                             | Lines         | Aufrufe            | Status                        |
| ----------------------------------- | ------------- | ------------------ | ----------------------------- |
| `parseTokenWithSuffixSingleToken()` | parser.ts:629 | parser.ts:312, 358 | AKTIV                         |
| `parseTokenWithSuffix()`            | parser.ts:665 | parser.ts:327      | AKTIV                         |
| `parseLegacyTokenDefinition()`      | parser.ts:741 | parser.ts:479      | **AKTIV** (Name irreführend!) |

**Diagnose:** Alle drei sind in Nutzung, handhaben verschiedene Token-Syntax-Fälle. **Name-Lüge:** `parseLegacyTokenDefinition` impliziert "veraltet", ist aber produktiv. Sollte umbenannt werden zu z.B. `parseShortTokenDefinition` oder was es tatsächlich tut. Kein Löschen, nur Rename + Doku.

---

## 4. Top-Level `compiler/`

| Datei                             | Status                                 |
| --------------------------------- | -------------------------------------- |
| `compiler/cli.ts`                 | AKTIV (CLI Entry Point)                |
| `compiler/index.ts`               | AKTIV (Library Entry Point)            |
| `compiler/preprocessor.ts`        | AKTIV (vermutlich)                     |
| `compiler/positional-resolver.ts` | AKTIV (in Nutzung, hat tote Doublette) |
| `compiler/CLEANUP.md`             | Plan-Dokument (von uns angelegt)       |

---

## 5. Sub-Verzeichnisse `compiler/`

| Verzeichnis             | In CLAUDE.md? | Status                                                                                                                                                                                                                                                           |
| ----------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parser/`               | ja            | AKTIV — größter Brocken (Phase 5)                                                                                                                                                                                                                                |
| `ir/`                   | ja            | AKTIV — sauber                                                                                                                                                                                                                                                   |
| `backends/`             | ja            | AKTIV — modular gut                                                                                                                                                                                                                                              |
| `runtime/`              | ja            | AKTIV                                                                                                                                                                                                                                                            |
| `validator/`            | ja            | AKTIV — **keine Unit-Tests** (Phase 2)                                                                                                                                                                                                                           |
| `schema/`               | ja            | AKTIV                                                                                                                                                                                                                                                            |
| `studio/`               | ja            | AKTIV — fragmentiert (Phase 3)                                                                                                                                                                                                                                   |
| `testing/`              | **nein**      | AKTIV — Test-Utilities, importiert von `tests/compiler/validation/*.test.ts`. Doku-Lücke in CLAUDE.md. Hat 5 iCloud-Doubletten (s.o.).                                                                                                                           |
| `utils/`                | nein          | AKTIV — nur `logger.ts`. Trivial.                                                                                                                                                                                                                                |
| `compiler/` (rekursiv!) | nein          | **VERMUTLICH TOT** — enthält `zag/` (5 Files: detector, slots, transformer, types, index). **Null Importer**. Vermutlich abgelöst durch `compiler/ir/transformers/zag-transformer.ts` (laut Code-Kommentar dort). **Phase 1: nach Verifizierung löschen.**       |
| `converters/`           | nein          | **TOT** — `react-to-mirror.ts` (14 KB). Einziger Caller: das tote `compiler/studio/llm-integration.ts`. Stirbt mit dem LLM-Cluster.                                                                                                                              |
| `llm/`                  | nein          | AKTIV (als Build-Asset) — `mirror-tutorial.generated.ts` (146 KB, generiert!) wird von `scripts/generate-claude-tutorial.ts` befüllt. **System-Prompt für AI-Assistance**. Nicht zur Laufzeit, sondern zur Build-Zeit.                                           |
| `prelude/`              | nein          | AKTIV (vermutlich) — `table.com` (608 B), Mirror-Prelude für Table-Komponente. Wird vom Compiler dynamisch geladen.                                                                                                                                              |
| `quality/`              | nein          | **ORPHAN TOOLING** — Standalone-CLI: `npx tsx compiler/quality/cli.ts <file.mir>` (Static-Analyzer + Claude-Analyzer). **Nicht in `package.json`-Scripts**. Funktioniert noch, aber niemand nutzt es. Entscheidung nötig: dokumentieren, scripten, oder löschen? |
| `dist/`                 | nein          | Build-Output. **Korrekt gitignored** (`dist` in `.gitignore`). Lokal vorhanden (1.5 MB), nicht getrackt. Lassen wo es ist.                                                                                                                                       |

### Neue Funde — was Phase 1 zusätzlich löschen kann

**Klar tot (sofort löschen nach Diff/Import-Check):**

- `compiler/compiler/zag/` komplettes Verzeichnis (5 Files, ~20 KB) — nach Verifizierung dass `compiler/ir/transformers/zag-transformer.ts` der aktive Pfad ist
- `compiler/converters/react-to-mirror.ts` (14 KB) — stirbt mit `llm-integration.ts`

**Entscheidung nötig:**

- `compiler/quality/` (5 Files, ~57 KB) — nutzbares Code-Quality-Tool, aber niemand ruft es auf. Entweder in `package.json` als `npm run quality` einbinden + dokumentieren, oder löschen.

---

## Zusammenfassung — was Phase 1 löschen kann (sicher)

**Sofort, nach Diff-Check:**

- 10 iCloud-Doubletten → `git rm` mit Test-Lauf danach

**Nach deiner Entscheidung zu V2 (Option A empfohlen):**

- `compiler/studio/code-modifier-v2.ts` (27 KB)
- `compiler/studio/code-modifier-ports.ts` (6 KB)
- `compiler/studio/code-modifier-index.ts` (1.6 KB) (oder behalten und V1 re-exportieren)
- `compiler/studio/adapters/` komplett (3 Files, 23 KB)
- `tests/studio/code-modifier/code-modifier-v2.test.ts`
- `@deprecated`-Marker in `code-modifier.ts` und `compiler/studio/index.ts` entfernen

**Tot — als Cluster zusammen:**

- `compiler/studio/llm-integration.ts` (auskommentiert)
- `compiler/converters/react-to-mirror.ts` (nur von obigem genutzt)

**Tot — Standalone:**

- `compiler/compiler/zag/` (5 Files, keine Importer, vermutlich abgelöst)

**Verdächtig (Phase 3 prüfen):**

- `compiler/studio/selection-manager.ts` — nur via Re-Export, markiert deprecated
- `compiler/studio/z-index-manager.ts` — kein externer Caller
- weitere "VERDÄCHTIG"-Einträge aus Tabelle 2b

---

## Phase 1 — abgeschlossen 2026-04-28

**Entscheidungen (autonom getroffen):**

1. V2-Cluster → **gelöscht** (Option A). Toter Code ist teurer als alter Code.
2. `compiler/quality/` → **gelöscht**. Niemand nutzte es; falls je gebraucht: git history.
3. `compiler/compiler/zag/` → **gelöscht** nach Verifizierung.

**Tatsächlich gelöscht:**

- 10 iCloud-Doubletten (`* 2.ts/.mirror`) in `compiler/backends/`, `compiler/testing/`, `compiler/positional-resolver 2.ts`
- 6 V2-Cluster-Files in `compiler/studio/` (code-modifier-v2, -ports, -index, adapters/×3) + leeres `adapters/`-Dir
- 1 V2-Test (`tests/studio/code-modifier/code-modifier-v2.test.ts`) + leeres Test-Dir
- `compiler/studio/llm-integration.ts` + `compiler/converters/react-to-mirror.ts` + leeres `converters/`-Dir
- `compiler/compiler/zag/` (5 Files) + leeres `compiler/compiler/`-Dir
- `compiler/quality/` (5 Files)
- **Total: 21 Files + 4 Verzeichnisse weg**

**Code-Edits:**

- `compiler/studio/index.ts`: V2-Re-Export-Block entfernt, llm-integration-Kommentarblock entfernt, `@deprecated`-Marker auf V1 entfernt
- `compiler/studio/code-modifier.ts`: `@deprecated`-Marker auf Klasse entfernt
- `compiler/index.ts`: `export * from './compiler/zag'` entfernt (Zeile war Pre-Flight übersehen!)

**Test-Ergebnis:** 370 Test-Files, 10920 Tests grün ✓

**Pre-Flight-Lehre:** Mein erster Verifizierungs-Sweep hat den Re-Export in `compiler/index.ts:41` übersehen, weil ich nur nach absoluten Pfaden gesucht habe (`compiler/compiler`), nicht nach relativen (`./compiler/zag`). Tests haben es gefangen. → Bei zukünftigen Löschungen: nach relativen Pfaden mit `from ['"]\./` grep nicht vergessen.

---

## Was bleibt für Phase 3 (`compiler/studio/`)

**Verdächtig, aber nicht eindeutig tot:**

- `selection-manager.ts` — markiert deprecated, aber im Public-Bundle (`MirrorLang.SelectionManager`), hat Test. Klärung: ist `MirrorLang.SelectionManager` öffentlich versprochen oder bundle-Müll?
- `z-index-manager.ts`, `coordinate-transformer.ts`, `spatial-cache.ts`, `component-icon-matcher.ts`, `services/smart-sizing.ts`, `utils/layout-detection.ts` — alle nur via Re-Export sichtbar, keine direkten Caller in Sources gefunden. Externe Konsumenten (`packages/mirror-lang`, globals via `MirrorLang.*` in `studio/app.js`) müssen geprüft werden.
