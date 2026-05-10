# Findings

Zentrales Dokument für Architektur- und Code-Probleme, die in Mirror auffallen.
Jeder Dev (oder Claude-Session) trägt hier ein, was sie/er findet — egal ob
sofort fixbar oder nur eine Notiz.

## Wie tragen wir ein?

Pro Befund ein Listeneintrag in der passenden Sektion:

```
- **Wo:** `file:line` oder kurzer Bereich
  **Was:** Ein Satz Beschreibung des Problems.
  **Status:** offen | erledigt (`commit-hash`) | abgewiesen (kurze Begründung)
  **Notiz:** _(optional, max 2–3 Zeilen Kontext)_
```

Wenn ein Eintrag mehr als ~3 Zeilen Kontext braucht, ist er kein Eintrag mehr,
sondern eine eigene Untersuchung — dann separates Dokument, von hier verlinken.

Keine Phasen, keine Status-Tabellen, keine Quality-Gates. Append-only.

---

## Offen

- **Wo:** ~32 verbleibende `import { X as XExtracted }` Aliase quer durch
  `compiler/ir/` und `compiler/backends/dom/`
  **Was:** Halbfertiger Refactor: extrahierte Pure-Funktionen werden via
  Alias re-importiert, weil die Wrapper-Klassenmethoden die gleichen Namen
  tragen. Ersetzbar durch Namespace-Imports (`import * as X from ...`) —
  Pattern in `compiler/ir/ops/instance-ops.ts` etabliert.
  **Status:** offen

- **Wo:** Studio dupliziert Compiler-Pfade
  - `studio/pickers/token/types.ts:parseTokens` — eigener Token-Parser
  - `studio/code-modifier/property-extractor.ts:302` — eigene `componentMap`
  - `studio/sync/component-line-parser.ts` — eigener Component-Parser
    **Was:** Drei Studio-Module re-implementieren Logik, die der Compiler
    bereits hat. Frage: warum kann Studio nicht den Compiler-Parser direkt
    benutzen? Vermutlich historisch (Studio war vor dem aktuellen Schema da).
    **Status:** offen
    **Notiz:** Architektur-Entscheidung nötig, kein einzelner Refactor.

- **Wo:** `compiler/parser/ops/parse-blocks.ts` (Slice 21 V-1/V-3/V-4)
  **Was:** Drei silent-failure-Pfade: undefined component → Frame-Fallback
  ohne Hinweis; nested-`Name:`-Definition wird zu Instance reinterpretiert
  und Definition geht verloren; self-recursion stoppt mit
  `data-component="Unknown"`. Validator E002 fängt nur den ersten Fall.
  **Status:** offen
  **Notiz:** Audit in `docs/refactoring/21-komponenten.md` Section 3 (V-1, V-4).

- **Wo:** Vitest 1 Test failing (von 15139, Stand 2026-05-10 09:42)
  **Was:** Identität unbekannt — Output war abgeschnitten als ich's gesehen
  habe. Re-run nötig mit verbose-reporter um den Test zu finden.
  **Status:** offen

- **Wo:** Dead-feature-Verdacht (zu prüfen vom Owner)
  **Was:** Slices wie Stacked-Overlay (8), Custom-Icons-Registry (51),
  Prose-Mode (66), Section-Header-Parsing (Slice 25 E002 Probe 22) — werden
  diese in echten Mirror-Projekten benutzt? Wenn nein, ersatzlos streichen
  spart Wartungsaufwand.
  **Status:** offen
  **Notiz:** Braucht Owner-Entscheidung, kein Refactor-Befund.

---

## Erledigt

Chronologisch absteigend (neueste zuerst).

### 2026-05-10 — `*Extracted` Aliase (Phase 1)

- **Wo:** `compiler/ir/index.ts`, `compiler/ir/transformers/validation.ts`
  **Was:** `addWarningExtracted` Alias war nur da wegen Namenskonflikt mit
  Klassenmethode. Funktion umbenannt zu `pushUniqueWarning` (beschreibt was
  sie tut), Alias weg.
  **Status:** erledigt (`d233dd4a`)

- **Wo:** `compiler/ir/ops/children-resolver.ts`
  **Was:** `mergeSlotPropertiesIntoFillerExtracted` Alias ohne Konflikt —
  reines Residuum. Direkt importiert.
  **Status:** erledigt (`ec9c3030`)

- **Wo:** `compiler/ir/ops/state-builder.ts`
  **Was:** Drei Aliase via Namespace-Imports ersetzt
  (`StateMachineTransformer`, `StateChildTransformer`, plus direkter
  `extractHTMLProperties`-Import).
  **Status:** erledigt (`1c9dd1d4`)

- **Wo:** `compiler/ir/ops/properties-ops.ts`
  **Was:** Fünf Aliase via Namespace-Imports
  (`PropertyTransformer`, `Validation`, `PropertySetExpander`).
  **Status:** erledigt (`4a74b385`)

- **Wo:** `compiler/ir/ops/instance-ops.ts`
  **Was:** Zehn Aliase via Namespace-Imports
  (`ChartTransformer`, `ComponentResolver`, `SlotUtils`, `StateStyles`,
  `InlineExtraction`, `ControlFlow`).
  **Status:** erledigt (`86ecc41b`)

- **Wo:** `compiler/ir/ops/zag-instance-builder.ts`,
  `compiler/backends/dom/ops/{emit-events,emit-state,emit-loops}.ts`
  **Was:** Acht Aliase quer durch vier Files via Namespace-Imports
  (`ZagTransformer`, `EventEmitter`, `StateMachineEmitter`, `ApiEmitter`,
  `LoopEmitter`).
  **Status:** erledigt (`4acde470`)

### 2026-05-10 — Token-Suffix-Drift (Slice 24 Iter-2)

- **Wo:** `studio/panels/property/utils/tokens.ts`,
  `studio/editor/triggers/token-extract-trigger.ts`,
  `compiler/parser/token-parser.ts`
  **Was:** Drei lokale `getTokenSuffix`/`stripDollar`/`PROPERTY_SUFFIXES`-
  Implementierungen wurden auf den kanonischen Helper
  `compiler/schema/token-suffixes.ts` konsolidiert. Konkreter Bug:
  Studio-Picker mappte `margin` auf Suffix `'m'`, der Compiler emittiert
  `name.mar:` — der Picker fand keine margin-Tokens.
  **Status:** erledigt (`b7b35b24`)

### 2026-05-10 — Picker-Schema-Lücke (Slice 78 Iter-2)

- **Wo:** `studio/pickers/token/types.ts`, `compiler/schema/token-suffixes.ts`
  **Was:** `getTokenTypesForProperty` war für 25 compiler-bekannte
  Property-Aliase blind (`c`, `p`, `m`, `mar`, `font-family`, `weight`,
  `ls`, `tracking`, `min-height`, `max-height`, …). Schema-Fallback
  hinzugefügt; `.weight` als COUNT_SUFFIXES klassifiziert (war in keiner
  Klassifizierung).
  **Status:** erledigt (in `aa341cdf` mitgebündelt)

---

## Notizen

- **Slice-Methodik archiviert (2026-05-10).** 88 Capability-Slices mit
  Audit-Doc + 9-Punkt-Quality-Gate hat Drift gefunden, aber Doku-Overhead
  skaliert linear mit Slice-Zahl. Bei Slice 21 war's zu 80 % Papierarbeit.
  Aktuelle Praxis: Findings hier eintragen, fixen, weiter. Slice-Audits
  bleiben in `docs/refactoring/` als historische Referenz, werden nicht
  aktiv weitergetrieben.

- **Tests sind Sicherheitsnetz, nicht Sauberkeits-Werkzeug.** Cross-Backend-
  Property-Tests fangen Drift, aber gut-getesteter Code kann immer noch
  schmutzig sein. Sauberkeit kommt aus kohärenten Abstraktionen, klaren
  Schichten und aggressivem Löschen — Werkzeuge dafür sind Findings-Doc,
  Schema-Drift-Grep und gelegentliche Architektur-Reviews.

- **`tools/probes/` als wiederverwendbares Werkzeug.** Re-runnable
  Schema-Drift- und Cross-Backend-Probes (committet, nicht in `/tmp`)
  überleben Sessions. Konvention: `tools/probes/slice-NN-*.ts` oder
  `tools/probes/<topic>.ts`.
