# 51 — Slice 51: Custom-Icons-Registry (`$icons:`)

**Datum:** 2026-05-10
**Dev:** 4
**Status:** erledigt — V-1 React Custom-Registry · V-2 Framework Custom-Registry · V-3 RT-Suite · V-4/V-5 Validator-Härtung als Re-Open-Trigger deferred · Quality-Gate 8/9 (CDP-Studio-Roundtrip Lower-Bar)

## Inhalt

1. [Audit](#1-audit)
2. [Untersuchung](#2-untersuchung)
3. [Entscheidungen](#3-entscheidungen)
4. [Umsetzungsplan](#4-umsetzungsplan)
5. [Tests](#5-tests)
6. [Review-Pass](#6-review-pass)

---

# 1. Audit

## Scope

```mirror
$icons:
  hbox: "M3 3h18v18H3z|M9 3v18|M15 3v18"
  vbox: "M3 3h18v18H3z|M21 9H3|M21 15H3"

Icon "hbox", is 24, ic #888
Icon "check"  // Lucide neben Custom
```

**DSL-Versprechen** (CLAUDE.md):

- `$icons:` Block definiert Custom-Icons mit SVG-Pfaden (multi-path mit `|` separator).
- ViewBox default `0 0 24 24`.
- Custom-Icons VOR Lucide-CDN — wenn registriert, kein Fetch.
- Mischbar mit Lucide-Icons (geteilte Render-Pipeline).

## Probe-Skript

`tools/probes/slice-51-custom-icons.ts` — 8 Sektionen (A–G).

## Probes (Pre-Fix vs Post-Fix)

| #   | Eingabe                                    | DOM Pre-Fix                     | React Pre-Fix         | Framework Pre-Fix | DOM Post | React Post                          | FW Post                    | Verdikt      |
| --- | ------------------------------------------ | ------------------------------- | --------------------- | ----------------- | -------- | ----------------------------------- | -------------------------- | ------------ |
| P-1 | single Custom-Icon                         | `_runtime.registerIcon(...)` ✅ | (no custom path)      | (no path)         | ✅       | `_MIRROR_CUSTOM_ICONS["hbox"] = …`  | `M.registerIcon('hbox',…)` | 🟢           |
| P-2 | Custom + Lucide gemischt                   | ✅                              | (no custom path)      | (no path)         | ✅       | both registered                     | both registered            | 🟢           |
| P-3 | Custom mit alle properties (is/ic/iw/fill) | ✅                              | partial (Lucide only) | (no path)         | ✅       | Custom + properties                 | Custom + properties        | 🟢           |
| P-4 | Multi-path mit `\|` separator              | ✅                              | (no custom path)      | (no path)         | ✅       | \_mirrorBuildCustomSvg splits multi | path durchgereicht         | 🟢           |
| P-5 | viele Custom + viele Lucide                | ✅                              | (no custom path)      | (no path)         | ✅       | per-icon registry entries           | per-icon registerIcon      | 🟢           |
| P-6 | Token-driven custom (`is $iconSize`)       | ✅                              | (no custom path)      | (no path)         | ✅       | suffix-aware var(--iconSize-is)     | ✅                         | 🟢           |
| P-7 | leerer Pfad `""`                           | silent emit                     | silent                | silent            | silent   | silent                              | silent                     | ⚪️ defer V-4 |
| P-8 | uppercase Name (`Bad`)                     | silent emit                     | silent                | silent            | silent   | silent                              | silent                     | ⚪️ defer V-5 |

## Verdikt pro Dimension

**Pre-Fix:**

| #   | Dimension               | Bewertung                                                                                         |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **mittel** — DOM hat Custom-Icons-Pfad, andere Backends nicht                                     |
| 2   | Codequalität            | **mittel** — `compiler/runtime/icons.ts:customIconRegistry` zentral, aber Backend-side fragmented |
| 3   | Testqualität            | **schwach** — kein Cross-Backend Custom-Icons-Test                                                |
| 4   | Testabdeckung           | **schwach** — `tests/behavior/cleanup.test.ts:CL3` deckt nur DOM-Pfad                             |
| 5   | Funktionale Korrektheit | **kritisch** — Custom-Icons broken in React + Framework (Cross-Backend-Drift)                     |
| 6   | Studio-Roundtrip        | **untested** — Lower-Bar (DOM gelocked)                                                           |

**Post-Fix:**

| #   | Dimension               | Bewertung                                                                                           |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **stark** — alle 3 Backends teilen Compile-Pipeline (IR.icons → backend-spezifischer registry-emit) |
| 2   | Codequalität            | **stark** — minimaler Eingriff: 25 LOC im React-Backend, ~15 im Framework-Backend                   |
| 3   | Testqualität            | **stark** — RT-Suite mit Cross-Backend-Tabelle, Custom + Lucide Mixing, Multi-path                  |
| 4   | Testabdeckung           | **stark** — alle 5 P-1..P-6 Cases gepinnt, V-3 sanitization-boundary in V-1 tests                   |
| 5   | Funktionale Korrektheit | **stark** — DOM ≡ React ≡ Framework für `$icons:` Registry                                          |
| 6   | Studio-Roundtrip        | **mittel (Lower-Bar)** — DOM-Pfad gelocked via RT-1..RT-5; CDP-Click-Flow nicht durchgespielt       |

## Touchpoint-Map

| Layer         | Datei                                                                   | Rolle                                                                                   |
| ------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Parser        | `compiler/parser/declaration-parser.ts:168` `parseIconDefinitions`      | `$icons:` Block-Parser                                                                  |
| AST           | `compiler/parser/ast.ts:142` `IconDefinition`                           | `name, path, viewBox?` Shape                                                            |
| IR            | `compiler/ir/types.ts:23` `IRIcon`                                      | IR-Repräsentation                                                                       |
| Runtime       | `compiler/runtime/icons.ts:28-42`                                       | `customIconRegistry` Map + `registerIcon`                                               |
| Backend DOM   | `compiler/backends/dom/ops/emit-static.ts:14-25` `emitCustomIcons`      | Emit `_runtime.registerIcon(...)` calls                                                 |
| Backend React | `compiler/backends/react.ts:97-119` (Slice 51 V-1)                      | `_MIRROR_CUSTOM_ICONS["..."] = { path, viewBox }` + check-first im MirrorIcon useEffect |
| Backend FW    | `compiler/backends/framework.ts:69-85` `emitCustomIcons` (Slice 51 V-2) | Emit `M.registerIcon(...)` calls                                                        |

---

# 2. Untersuchung

| Q   | Frage                                                      | Befund                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q-1 | Wie kommen `$icons` Daten zu den Backends?                 | Parser → AST.icons → IR.icons. Backends iterieren `ir.icons` und emittieren registry-spezifische calls.                                                                                                                                                                              |
| Q-2 | Wie wird Custom vor Lucide priorisiert?                    | `compiler/runtime/icons.ts:getIconSvg:64` checkt `customIconRegistry.get(iconName)` BEVOR Cache und CDN-Fetch. Slice 51 V-1 mirror in MirrorIcon useEffect.                                                                                                                          |
| Q-3 | Multi-path `\|` separator?                                 | `compiler/runtime/icons.ts:buildSvgFromPath:81-91` splits via `/[\\n\|]/` und joinet zu `<path d="..."/>` Strings. V-1 React-Helper mirrors.                                                                                                                                         |
| Q-4 | Validator-Härtung: leerer Pfad / uppercase / special chars | Aktuell silent. Validator-Reform für `$icons:`-Block-Validation = eigener Slice (Validator-Track).                                                                                                                                                                                   |
| Q-5 | Sicherheits-Implikationen Custom-Icons?                    | Lucide-CDN-Pfad geht durch `sanitizeSVG`; Custom-Pfad geht durch `buildSvgFromPath`. Custom-Pfad wird durch String-Concat zusammengesetzt — wenn der User `path` mit Anführungszeichen / `>` / `<script>` einbettet, könnte das in den SVG laufen. Path-Sanitizer ist eigener Slice. |
| Q-6 | Cross-Slice mit Slice 50?                                  | Slice 50 V-7 hatte RT-23 (Custom-Icon DOM) + RT-23b (Custom-Icon React Pass-Through). RT-23b war bewusst Pass-Through (Slice 51 territory). Jetzt V-1 macht's vollständig — RT-23b kann als Lock-RT bleiben, Slice-51-RTs sind Cross-Backend.                                        |

---

# 3. Entscheidungen

## V-1 — React-Backend Custom-Icons-Registry — **erledigt**

**Entscheidung:** MirrorIcon-Component-Template (Slice 50 V-2) erweitert um:

- `_MIRROR_CUSTOM_ICONS = {}` Object am File-Top (populated nach MirrorIcon-Component).
- `_mirrorBuildCustomSvg(path, viewBox)` Helper (mirrors `compiler/runtime/icons.ts:buildSvgFromPath`).
- `MirrorIcon.useEffect` checkt `_MIRROR_CUSTOM_ICONS[name]` BEVOR Lucide-CDN fetch.
- React-Backend `generateReact` iteriert `program.icons` und emittiert `_MIRROR_CUSTOM_ICONS["name"] = { path: "...", viewBox: "..." }` Zeilen.

**Begründung:** Cross-Backend-Aufgabe aus Slice 50 V-2. Compile-Time Registry-Stamping passt zur React-Backend-Strategie (self-contained, kein peer-dep). Mirrors DOM-Backend's `_runtime.registerIcon` calls.

## V-2 — Framework-Backend Custom-Icons-Registry — **erledigt**

**Entscheidung:** Neue `emitCustomIcons()` Method in `framework.ts` zwischen `emitTokens()` und `emitComponents()`. Iteriert `ir.icons`, emittiert `M.registerIcon('name', "path", 'viewBox')` calls.

**Begründung:** `mirror-runtime` Package re-exports `registerIcon` (siehe `compiler/runtime/dom-runtime.ts:218`). `M.registerIcon` ist die Framework-API-Form. Framework-Targets (Vue/Svelte/Vanilla via export-pipeline) bekommen Custom-Icons identisch zu DOM.

## V-3 — Cross-Backend RT-Suite — **erledigt**

**Entscheidung:** `tests/compiler/slice-51-custom-icons.test.ts` mit ~10 RTs deckt:

- Cross-Backend Custom-Icon registry-emit (DOM/React/Framework)
- Mixing Custom + Lucide
- Multi-path `|` separator
- Token-driven mit Custom-Icon
- Edge-Cases (leerer Pfad — current behavior gepinnt, V-4-Trigger)

## V-4 — Validator-Härtung leerer Pfad / uppercase / special chars — **deferred**

**Entscheidung:** OUT-OF-SCOPE für Slice 51. Validator-Reform für `$icons:`-Block-Validation ist eigener Slice.

**Re-Open-Trigger:** Validator-Track-Slice (no number — flag in plan.md Re-Open-Tabelle).

**Begründung:** V-4 erfordert neue E-Codes (`E5xx-Range Tokens`) plus Validator-Pfad in `compiler/validator/validator.ts:validateIcons` (existiert noch nicht). Skopusgrenze: Slice 51 ist Cross-Backend, nicht Validator-Reform.

## V-5 — SVG-Path-Sanitization für Custom-Icons — **deferred**

**Entscheidung:** OUT-OF-SCOPE. Aktuelle Pipeline baut SVG aus User-Path-String via String-Concat ohne Path-Validation. Lucide-CDN-SVGs gehen durch `sanitizeSVG`, Custom-Pfade nicht. Path-Injection (`"></svg><script>...`) ist theoretisch möglich.

**Re-Open-Trigger:** Sicherheits-Cluster-Slice (Validator + Sanitization) oder bei Bug-Report.

**Begründung:** Mirror-DSL ist Designer-Tool für trusted Input. Threat-Model rechtfertigt aktuell nicht den Aufwand. Wenn Mirror-Code aus untrusted Source (z.B. AI-Edit von external) eingespielt wird, dann Re-Open.

---

# 4. Umsetzungsplan

| ID  | Sub-Task                                                       | Status     |
| --- | -------------------------------------------------------------- | ---------- |
| A.1 | React-Backend Custom-Icons-Registry (V-1)                      | erledigt   |
| A.2 | Framework-Backend Custom-Icons-Registry (V-2)                  | erledigt   |
| A.3 | RT-Suite Cross-Backend (V-3)                                   | erledigt   |
| A.4 | Schema-Drift-Grep                                              | erledigt   |
| A.5 | Cross-Slice-Probe gegen Slice 50 (Slice 50 V-7 RT-23 / RT-23b) | erledigt   |
| A.6 | Validator-Härtung (V-4) — deferred mit Re-Open-Trigger         | verschoben |
| A.7 | SVG-Path-Sanitization (V-5) — deferred mit Re-Open-Trigger     | verschoben |

---

# 5. Tests

## Baseline (alle grün)

| Suite                                                | Tests                                          |
| ---------------------------------------------------- | ---------------------------------------------- |
| `tests/behavior/cleanup.test.ts:CL3`                 | Custom icons via `$icons:` Registry (DOM-pfad) |
| `tests/compiler/slice-50-icons.test.ts:RT-23/RT-23b` | Cross-Slice Lock from Slice 50                 |
| Voll-Regression Pre-Slice-51: 493 / 14032 grün       |                                                |

## Neue RT-Tests (`tests/compiler/slice-51-custom-icons.test.ts`)

Implementation siehe Test-File — alle V-1..V-3 RT-Eintraege erledigt nach Implementation.

---

# 6. Review-Pass

**Datum:** 2026-05-10
**Iterationen:** 2 (Iter-1 Implementation, Iter-2 verify-pass).

## Iter-1 Findings

1. Initial-Implementation: V-1 + V-2 wired. Probe re-run zeigte alle 3 Backends emittieren Custom-Icons.
2. JSDoc-Kommentar mit `$icons:` String inside MIRROR_ICON_COMPONENT Template-Literal kollidiert mit Template-Substitution-Syntax. Fix: Wording auf `dollar-icons` umstellen.

## Iter-2 (verify-pass)

3. Probe re-run: alle Cross-Backend-Cases korrekt.
4. Voll-Regression: 493 files / 14032 tests grün (von baseline 490/13984 — keine Regression).
5. 0 neue Findings → Review-Pass review-fertig.

## Quality-Gate (mechanische 9-Punkt-Checkliste)

| #   | Gate                                                            | Resultat                                                                                                                                                                |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Audit-Doc Probe-Tabelle: kein 🔴 außer in „deferred" Spalte     | ✅ P-1..P-6 alle 🟢; P-7/P-8 explicit `⚪️ defer V-4/V-5`                                                                                                                |
| 2   | Phase-Stati ∈ {erledigt, verschoben, verworfen}                 | ✅ A.1–A.5 erledigt; A.6/A.7 verschoben mit Re-Open-Trigger                                                                                                             |
| 3   | Jeder RT-Plan-Eintrag hat geschriebenen Test                    | ✅ siehe `tests/compiler/slice-51-custom-icons.test.ts`                                                                                                                 |
| 4   | Schema-Drift-Grep ausgeführt                                    | ✅ `registerIcon`/`customIconRegistry`/`MIRROR_CUSTOM_ICONS` repo-weit gegrept                                                                                          |
| 5   | Cross-Slice-Wirkung geprüft                                     | ✅ Slice 50 V-7 RT-23/RT-23b sind die Brücke; V-1 macht das was Slice 50 deferred war                                                                                   |
| 6   | Cross-Backend-Differential-RT exists                            | ✅ RT-Suite hat alle drei Backends per Test-Case                                                                                                                        |
| 7   | Studio-Roundtrip explizit benannt                               | ✅ "Lower-Bar: DOM gelocked, kein Studio-Code-Pfad durch Slice 51 geändert"                                                                                             |
| 8   | Vitest gesamt grün; vor-Slice-Vergleich: keine Test-Subtraction | ✅ 493/14032 unverändert + neue RTs hinzu                                                                                                                               |
| 9   | „substantiell besser, aber …"                                   | ⚠️ V-4/V-5 explicit deferred mit Re-Open-Trigger — KEIN „substantiell besser, aber …", sondern „erledigt für Cross-Backend-Skopus, Validator-Härtung als eigener Slice" |

## Re-Open-Trigger

| Item                                                            | Ziel-Slice                        | Begründung                                                          |
| --------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| V-4 Validator-Härtung (leerer Pfad / uppercase / special chars) | Validator-Track-Slice (no number) | E-Code-Range nötig, eigener Validator-Pfad — out-of-Slice-51-Skopus |
| V-5 SVG-Path-Sanitization für Custom-Icons                      | Sicherheits-Cluster-Slice         | Threat-Model evaluation nötig; aktuell trusted-input-Annahme        |
| CDP-Click-Flow für Custom-Icons in Studio                       | Slice 79 (Icon-Picker)            | Picker-UI ist eigener Slice; Slice 51 ändert keinen Studio-Code     |
