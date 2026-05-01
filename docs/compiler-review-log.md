# Compiler Detail-Review Log

> Phase 2 des Compiler-Reviews (siehe `docs/plans/compiler-review-plan.md`).
> Pro Reviewsession ein Eintrag, pro Datei ein Status.
>
> **Befund-IDs:** `D-NNN` (sequenziell). Architektur-Befunde aus Phase 1 (`A-NN`)
> bleiben dort getrackt — D-IDs sind reine Detail-Befunde aus dem Datei-Review.
>
> **Status-Werte pro Datei:**
>
> - `reviewed-clean` — Checkliste vollständig, keine offenen Befunde
> - `reviewed-with-findings` — reviewt, offene Befunde im Log unten
> - `in-progress` — angefangen, nicht abgeschlossen
> - leer/nicht aufgeführt — noch nicht angeschaut

## Status-Übersicht

### compiler/schema/

| Datei                    | Status                 | Letzte Sichtung |
| ------------------------ | ---------------------- | --------------- |
| `index.ts`               | reviewed-with-findings | 2026-05-01      |
| `primitive-roles.ts`     | reviewed-clean         | 2026-05-01      |
| `layout-defaults.ts`     | reviewed-clean         | 2026-05-01      |
| `primitives.ts`          | reviewed-with-findings | 2026-05-01      |
| `parser-helpers.ts`      | reviewed-with-findings | 2026-05-01      |
| `properties.ts`          | reviewed-clean         | 2026-05-01      |
| `ir-helpers.ts`          | reviewed-with-findings | 2026-05-01      |
| `zag-primitives.ts`      | reviewed-clean         | 2026-05-01      |
| `chart-primitives.ts`    | reviewed-clean         | 2026-05-01      |
| `zag-prop-metadata.ts`   | reviewed-clean         | 2026-05-01      |
| `color-utils.ts`         | reviewed-clean         | 2026-05-01      |
| `theme-generator.ts`     | reviewed-clean         | 2026-05-01      |
| `component-tokens.ts`    | reviewed-clean         | 2026-05-01      |
| `component-templates.ts` | reviewed-clean         | 2026-05-01      |

### compiler/parser/

| Datei | Status | Letzte Sichtung |
| ----- | ------ | --------------- |

### compiler/ir/

| Datei | Status | Letzte Sichtung |
| ----- | ------ | --------------- |

### compiler/validator/

| Datei | Status | Letzte Sichtung |
| ----- | ------ | --------------- |

### compiler/backends/

| Datei | Status | Letzte Sichtung |
| ----- | ------ | --------------- |

### compiler/runtime/

| Datei | Status | Letzte Sichtung |
| ----- | ------ | --------------- |

### compiler/studio/

| Datei | Status | Letzte Sichtung |
| ----- | ------ | --------------- |

---

## Sessions

## 2026-05-01 — Phase 2 Start: schema/index.ts + schema/primitive-roles.ts

**Scope:** Barrel-Datei und die soeben aus A-04 herausgelöste primitive-roles.ts.

### `compiler/schema/index.ts`

Reine Re-Export-Datei, keine Funktionen — nur Checkliste „toter Export?", „doppelter Pfad?", „magische Annahmen?".

**Befunde:**

- **D-001 [niedrig] schema/index.ts (gesamt) — Barrel ist faktisch ungenutzt.**
  Repo-weite Suche: nur **1** Konsument importiert via Barrel (`studio/panels/components/component-panel.ts:24`); **56** andere Imports gehen direkt aus den Submodulen (`schema/dsl`, `schema/parser-helpers`, `schema/ir-helpers`, …).
  Empfehlung: Entscheidung nötig — entweder als „öffentliche API" deklarieren und Konsumenten dahin migrieren, oder ersatzlos eliminieren und den 1 Konsumenten direkt umstellen. Status quo ist halbgar.
  Status: **offen, Entscheidung gebraucht** (kein inline-Fix, weil bewusste Architektur-Frage).

- **D-002 [erledigt inline] schema/index.ts:43 — `ZAG_PRIMITIVES`/`CHART_PRIMITIVES` indirekt re-exportiert.**
  Wurden über `dsl.ts` re-exportiert, obwohl sie in `zag-primitives.ts` und `chart-primitives.ts` definiert sind. Tripel-Hop ohne Grund.
  Fix: direkt aus den Quell-Modulen exportiert (`ZAG_PRIMITIVES` aus `./zag-primitives`, `CHART_PRIMITIVES` aus `./chart-primitives`). Tests grün.

- **D-003 [niedrig, offen] schema/index.ts:71/74/77 — `export *` für `component-tokens`, `theme-generator`, `color-utils`.**
  Das gleiche Pattern, das bei A-02 (`./properties`) zu Schatten-Konflikt geführt hat — keine aktuell kollidierenden Namen, aber latentes Risiko, und CLAUDE.md-Lehre aus A-02 sagt: explizit > implizit.
  Empfehlung: ~25 named exports auflisten oder bewusst belassen (wenn die Datei eh kaum konsumiert wird, siehe D-001).
  Status: **abhängig von D-001-Entscheidung**.

- **D-004 [erledigt inline] schema/index.ts:42 — Veralteter „PRIMITIVES was removed"-Kommentar.**
  History-Noise nach Cleanup-Sprint 1; der Kommentar verweist auf einen längst gelöschten Export. Entfernt.

**Tests nach Fixes:** 10970 passed, 71 skipped, 0 failed.

### `compiler/schema/primitive-roles.ts`

In dieser Session selbst aus `compiler/positional-resolver.ts` extrahiert (A-04 teil). Datei besteht aus 3 Exports:

- `interface PrimitiveRole` — 2 Felder, klare Bedeutung
- `const PRIMITIVE_ROLES` — Lookup-Tabelle, 27 Einträge, manuell gepflegt
- `function getPrimitiveRole(name)` — trivialer `Record`-Zugriff

**Checkliste:**

- ✅ Funktionsname ehrlich — `getPrimitiveRole` macht genau das
- ✅ Edge-Cases — `Record`-Lookup gibt `undefined` für unbekannte Namen, vom Konsument behandelt (`?? scan.components.get(...)` in positional-resolver.ts:275)
- ✅ Keine Magie / Workarounds
- ⚠️ **Duplikat-Risiko (latent):** `PRIMITIVE_ROLES` und `DSL.primitives` (in `dsl.ts:231`) sind parallele Listen — wenn ein neues Primitive in `dsl.ts` hinzukommt, muss der Mensch daran denken, hier auch einen Eintrag zu machen. Das ist die A-04/A-07-Wahrheits-Frage. Aktuell synchron, aber ohne Test der das erzwingt.
- ✅ Tests vorhanden — `tests/behavior/positional-args.test.ts` (24 Tests, decken Color/Size-Slot-Verhalten ab)

**Befunde:**

- **D-005 [niedrig, offen] primitive-roles.ts (gesamt) — keine Synchronitätsgarantie zu `DSL.primitives`.**
  Wenn jemand ein neues Primitive in `dsl.ts:231` hinzufügt aber den Eintrag hier vergisst, läuft der positional-args-Pre-Parser für dieses Primitive einfach nicht — silent fail.
  Empfehlung: entweder einen Schema-Test einbauen (jedes `DSL.primitives[name]` muss entweder eine `roles`-Definition haben oder bewusst ausgenommen sein) oder die Roles direkt in `PrimitiveDef` als optionales Feld einziehen (wäre die richtige A-04/A-07-Konsolidierung). Klein-Mittel.

**Status:** `reviewed-clean` — keine offenen kritischen Befunde. D-005 ist ein offener systemischer Befund, betrifft aber nicht die Korrektheit der Datei selbst.

**Nächste Session:** s.u.

---

## 2026-05-01 — schema/layout-defaults.ts

**Scope:** 164 Zeilen, 4 Konstanten + 1 Set + 4 Helper-Funktionen + 2 Types. Tests vorhanden in `tests/compiler/layout/layout-defaults.test.ts` (244 Z., 34 it).

**Funktion-für-Funktion:**

| Element                    | Funktioniert? | Anmerkung                                                                           |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `NON_CONTAINER_PRIMITIVES` | ✅            | Set mit 25 Strings                                                                  |
| `isContainer()`            | ✅            | Wrapper, lowercase-Normalisierung                                                   |
| `FLEX_DEFAULTS`            | ✅            | Symmetrische column/row-Defaults — Kommentar warnt explizit vor anderen Erwartungen |
| `CONTAINER_DEFAULTS`       | ✅            | Frame/Box-Default, `width: 'fit-content'` ist absichtlich                           |
| `NINE_ZONE`                | ✅            | 9 Felder, klare Struktur                                                            |
| `NineZonePosition`         | ✅            | Type derived from NINE_ZONE keys                                                    |
| `CENTER_ALIGNMENT`         | ✅            | Eindeutige Center-Semantik (Doku warnt vor altem Verhalten)                         |
| `SizingMode`/`SizingFlags` | ✅            | Klare Types                                                                         |
| `getFlexDefaults()`        | ✅            | Default-Argument `'column'`                                                         |
| `getNineZoneAlignment()`   | ✅            | Reine Lookup                                                                        |
| `isNineZonePosition()`     | ✅            | Standard Type-Guard                                                                 |

**Befunde:**

- **D-006 [niedrig, offen] layout-defaults.ts:21-26 — `NON_CONTAINER_PRIMITIVES` mischt zwei Namensräume.**
  Set enthält gleichzeitig Mirror-Primitive-Namen (`text`, `image`, `link`, `divider`, `icon`, `slot`) und HTML-Tags (`span`, `img`, `a`, `hr`). Verifiziert: einziger Konsument ist `compiler/ir/transformers/layout-transformer.ts:294`, der `primitive?.toLowerCase()` aus dem IR übergibt — das `primitive`-Feld kann beide Formen tragen, je nach Pipeline-Stelle. Defensiv, aber doppelte Pflege. Symptom des A-04/A-07-Problems (Schema-Wissen am falschen Ort).
  Empfehlung: Kanonische Form festlegen (lowercase Mirror-Primitive-Name) und den Konsumenten so aufrufen lassen. Fixt sich automatisch mit D-007.

- **D-007 [niedrig, offen] layout-defaults.ts:21 — Schema-Wissen am falschen Ort (= A-04).**
  Container/Non-Container-Klassifikation gehört auf `PrimitiveDef` in `dsl.ts` (z. B. `container?: boolean` Feld). Statt einer Set, die manuell synchron gehalten werden muss, würde es aus den Primitive-Definitionen abgeleitet.
  Empfehlung: Als Schritt der A-04-Schema-Konsolidierung. Klein-Mittel.

- **D-008 [niedrig, offen] layout-defaults.ts:25 — `'checkbox'`/`'radio'`/`'zagslot'` Einträge.**
  `checkbox`/`radio` werden in `compiler/ir/transformers/value-resolver.ts:266-269` referenziert — nicht tot, aber nicht in `DSL.primitives` (weil Pure-Mirror-Templates). Ein subtiles „Es gibt kein offizielles Primitive `checkbox`, aber wenn jemand es passt, behandel es vernünftig"-Pattern. `'zagslot'` ist ein Lowercased-Form-Cover, hat aber keinen sichtbaren Konsumenten. Dokumentations-Lücke: warum ist das hier? Nicht falsch, aber unklar.
  Empfehlung: Kommentar pro Spezialfall ergänzen, oder beim D-007-Refactor klären.

**Tests:** 34 it-Cases in `tests/compiler/layout/layout-defaults.test.ts`. Coverage solide. Negative-Tests (`'frame'` ist NICHT in `NON_CONTAINER_PRIMITIVES`) machen sie zu mehr als „assertion-mirror".

**Status:** `reviewed-clean` — die Datei selbst ist sauber, dokumentiert, getestet. Befunde D-006/D-007/D-008 sind systemische Architektur-Fragen (A-04-Familie), nicht Korrektheitsprobleme dieser Datei.

**Nächste Session:** s.u.

---

## 2026-05-01 — schema/primitives.ts

**Scope:** Nach Cleanup-Sprint 1 (3 tote Funktionen weg) verbleibend: 1 interface (`DefaultProperty`), 1 interface (`PrimitiveDefinition`), 1 const (`SIZES`), 1 const (`PRIMITIVES`, 22 Einträge nach Fix), 1 Funktion (`getPrimitiveDefaults`).

**Funktion-für-Funktion:**

| Element                         | Funktioniert? | Anmerkung                                                            |
| ------------------------------- | ------------- | -------------------------------------------------------------------- |
| `interface DefaultProperty`     | ✅            | Klein, klar                                                          |
| `interface PrimitiveDefinition` | ⚠️            | `tag` Feld dupliziert `PrimitiveDef.html` aus dsl.ts                 |
| `SIZES`                         | ✅            | Interne Design-Konstanten (controlHeight, radius, iconSize)          |
| `PRIMITIVES`                    | ⚠️            | Lowercase Lookup-Tabelle — parallel zu `DSL.primitives` (PascalCase) |
| `getPrimitiveDefaults()`        | ✅            | Lowercase normalization, `?? []` Fallback                            |

**Inline-Fixes (in dieser Session):**

- **D-009 [erledigt inline] primitives.ts (Original Z. 51-60) — `'app'` Primitive war tot.**
  Repo-weite Suche: keine Konsumenten (kein `getPrimitiveDefaults('app')`, keine `PRIMITIVES['app']`). Wahrscheinlich Rest aus früherer App-Wrapper-Architektur (jetzt durch Canvas in `dsl.ts` ersetzt). Eintrag gelöscht (~10 Z.).

- **D-011 [erledigt inline] primitives.ts:69-73 — Beschreibungs-Inversion `frame: 'Alias for box'` korrigiert.**
  In `dsl.ts:DSL.primitives.Frame` ist `Frame` das Primary, `Box` der Alias. In primitives.ts war es umgekehrt dokumentiert. Beide tags sind `'div'`, daher semantisch egal — aber inkonsistente Doku signalisiert mangelnde Synchronität zwischen den beiden Files. Reihenfolge gedreht und Kommentar hinzugefügt, der erklärt warum beide Einträge nötig sind (kein Alias-Resolving im IR-Lookup).

**Offene Befunde:**

- **D-010 [niedrig, offen] primitives.ts:24 — `PrimitiveDefinition.tag` dupliziert `PrimitiveDef.html` aus dsl.ts.**
  Beide Files tragen den HTML-Tag pro Primitive. Konkrete A-01-Manifestation. Fix erfordert Alias-Resolving an den Aufruf-Stellen oder im `getPrimitiveDefaults`-Helper, damit der Lookup case-insensitive gegen die kanonische `dsl.ts`-Form geht. Nicht-trivial, daher als A-01-Sprint-Schritt offen.

- **D-012 [niedrig, offen] primitives.ts (image/img + frame/box) — duplizierte Defaults für Aliase.**
  `image` und `img` haben identische Default-Listen (3 Properties). Genauso `frame`/`box` (beide leer). Wenn `image`-Defaults sich ändern, muss `img` parallel geändert werden — aktuell synchron, aber kein Test erzwingt das.
  Verifiziert (ir/index.ts:873): `primitive` wird via `instance.component.toLowerCase()` gebildet, ohne Alias-Resolving. Daher sind beide Einträge faktisch nötig. Fix: Alias-Resolving in `getPrimitiveDefaults`. Hängt mit D-010 zusammen.

**Tests:** Keine direkten Tests für `getPrimitiveDefaults`. Indirekte Coverage via IR-Tests (Default-Property-Application). Eine direkte Coverage-Verbesserung wäre sinnvoll, aber nicht prio.

**Status:** `reviewed-with-findings` — D-010 und D-012 sind Architektur-Befunde (A-01-Familie), nicht akut. Datei selbst funktioniert korrekt nach Inline-Fixes.

**Nächste Session:** s.u.

---

## 2026-05-01 — schema/parser-helpers.ts

**Scope:** 358 Z. Datei. 16 Konstanten + 8 Funktionen. Header-Kommentar betont „derived from dsl.ts schema. DO NOT add hardcoded values".

**Konstanten (Übersicht):**

| Konstante                                     | Quelle                               | Anmerkung                         |
| --------------------------------------------- | ------------------------------------ | --------------------------------- |
| `PROPERTY_STARTERS`                           | SCHEMA filter                        | + 'bind' hardcoded (1 Sonderfall) |
| `BOOLEAN_PROPERTIES`                          | SCHEMA filter                        | `keywords._standalone`            |
| `LAYOUT_BOOLEANS`                             | **HARDCODED** 35 Einträge            | ⚠️ widerspricht File-Doku         |
| `POSITION_BOOLEANS`                           | **HARDCODED** 6 Einträge             | ⚠️ widerspricht File-Doku         |
| `ALL_BOOLEAN_PROPERTIES`                      | Vereinigung                          | –                                 |
| `KEYBOARD_KEYS`                               | DSL.keys                             | –                                 |
| `STATE_NAMES`/`SYSTEM_STATES`/`CUSTOM_STATES` | DSL.states                           | –                                 |
| `SIZE_STATES`                                 | DSL.sizeStates                       | –                                 |
| `STATE_MODIFIERS`                             | **HARDCODED** 3 Einträge             | ⚠️ widerspricht File-Doku         |
| `DIRECTIONAL_PROPERTIES`/`DIRECTION_KEYWORDS` | SCHEMA.directional                   | –                                 |
| `ACTION_NAMES`/`ACTIONS_WITH_TARGETS`         | DSL.actions                          | –                                 |
| `EVENT_NAMES`/`EVENTS_WITH_KEY`               | DSL.events                           | –                                 |
| `ANIMATION_PRESETS`/`EASING_FUNCTIONS`        | DSL.animationPresets/easingFunctions | –                                 |

**Funktionen (Übersicht):**

| Funktion                    | Tut sie was sie sagt? | Anmerkung                                                       |
| --------------------------- | --------------------- | --------------------------------------------------------------- |
| `getAllSchemaPropertyNames` | ✅                    | War teure Reconstruct pro Aufruf — gefixt mit Memo              |
| `isValidProperty`           | ✅                    | –                                                               |
| `getCanonicalPropertyName`  | ✅                    | War Linear-Scan pro Aufruf — gefixt mit Map-Cache               |
| `isSizeState`               | ✅                    | –                                                               |
| `getSizeStateThresholds`    | ✅                    | Liefert `undefined` für Custom — vom Konsument behandelt        |
| `getDirectionsForProperty`  | ✅                    | War Linear-Scan pro Aufruf — gefixt mit Map-Cache               |
| `isDirectionForProperty`    | ✅                    | Wrapper über `getDirectionsForProperty`                         |
| `parseDuration`             | ✅                    | Regex sauber, Edge-Cases ok (`-1s`, `0.5ms` korrekt abgewiesen) |

**Inline-Fixes:**

- **D-018 [erledigt inline] parser-helpers.ts:11 — toter Import `PropertyDef`.**
  `PropertyDef` wurde importiert, aber nirgends im File verwendet. Entfernt.

- **D-015/D-016/D-017 [erledigt inline] Hot-Path-Memoization für 3 Schema-Lookups.**
  - `getAllSchemaPropertyNames()` baute pro Aufruf eine neue Set über ~127 Schema-Einträge auf. Wird in `isValidProperty()` während des Parsings _pro Property-Token_ aufgerufen. Jetzt einmalig gecacht.
  - `getCanonicalPropertyName()` machte Linear-Scan über `Object.values(SCHEMA)` mit `name===nameOrAlias || aliases.includes(...)` — aufgerufen in IR-Pipeline pro Property. Jetzt Map-Lookup.
  - `getDirectionsForProperty()` ähnlich Linear-Scan, jetzt Map-Lookup.
    Memoization-Pattern: Lazy-Init bei erstem Aufruf, kein Reset (SCHEMA ist Module-frozen). Tests grün, keine Type-Fehler.

**Offene Befunde:**

- **D-013 [mittel, offen] parser-helpers.ts:55-100 — `LAYOUT_BOOLEANS` hardcoded, widerspricht der File-Doku.**
  Header sagt explizit „DO NOT add hardcoded values - add them to dsl.ts instead", aber `LAYOUT_BOOLEANS` (35 Z.) und `POSITION_BOOLEANS` (6 Z.) sind manuell gepflegt. Vermutung: ein Teil der Booleans ist im Schema noch nicht mit `keywords._standalone` markiert; oder die zwei Listen erfüllen unterschiedliche Parser-Rollen (Body-Parsing vs allgemein).
  Verifikation gebraucht: was würde fehlen, wenn man LAYOUT_BOOLEANS = (BOOLEAN_PROPERTIES filtert nach Layout-Kategorien)? Einige Items wie `'truncate'`/`'italic'`/`'underline'`/`'uppercase'` sind in Schema mit `_standalone` markiert — die könnten weg. Andere wie `'hor'`/`'ver'` sind Aliases von `horizontal`/`vertical` — auch im Schema da. Empfehlung: Migrations-PR.

- **D-014 [niedrig, offen] parser-helpers.ts:241 — `STATE_MODIFIERS` hardcoded.**
  `['exclusive', 'toggle', 'initial']`. Sollte vermutlich auch in `DSL` (z. B. neues `DSL.stateModifiers`-Feld). Klein.

**Tests:** 10935 passed, 0 failed nach allen Fixes.

**Status:** `reviewed-with-findings` — Datei-Funktionen sind korrekt; offene Befunde sind die Schema-Hardcode-Inkonsistenzen.

**Nächste Session:** s.u.

---

## 2026-05-01 — schema/properties.ts

**Scope:** 745 Z. Reine Konfig-Datei: 1 type (`PropertyType`), 1 type (`PropertyCategory`), 1 interface (`PropertyDefinition`), 1 const-Array (`properties`, 82 Einträge), 1 const-Record (`categoryLabels`), 1 const-Array (`categoryOrder`). Keine Funktionen mehr nach Schema-Sprint Schritt 2.

**Strukturelle Prüfung:**

- ✅ Keine Duplikate innerhalb der Datei (82 unique Einträge).
- ✅ `categoryLabels` deckt alle 13 `PropertyCategory`-Werte ab (TypeScript erzwingt das via `Record<PropertyCategory, string>`).
- ✅ `categoryOrder` enthält alle 13 Kategorien (manuell gepflegt — kein Type-Zwang, aber visuell verifiziert).
- ✅ Konsumenten klar: `compiler/studio/property-extractor.ts` und `compiler/studio/line-property-parser.ts` (beide Studio-side).

**Synchronität mit `dsl.ts:SCHEMA`:**

Diff via grep: `properties.ts` hat 82 Einträge, `dsl.ts:SCHEMA` hat ~127. Manuelle Stichproben:

- `border-color`, `font-size`, `hover-background`, `mar-x`, `pad-x` etc. — **alle in beiden Files** vorhanden, mit identischer Bedeutung.
- 45 Properties in dsl.ts, die in properties.ts fehlen: `device`, `align`, `bind`, `mask`, `text`, `placeholder`, `name`, `value`, `checked`, `editable`, `keyboard-nav`, `loop-focus`, `typeahead`, `trigger-text`, `readonly`, `type`, `animation`, `x-offset`, `y-offset`, `dense`, `gap-x`, `gap-y`, `row-height`, `aspect`, 9-Zone-Positions (`tl`, `tc`, `tr`, …), `border-top`/etc. — alles Sachen, die im Property-Panel-UI **bewusst nicht** auftauchen sollen (Layout-Shorthands, fortgeschrittene Optionen).

**Befunde (alle systemisch, A-02-Familie):**

- **D-019 [niedrig, offen] properties.ts vs dsl.ts — Inkonsistente kanonische Namen.**
  Beispiel: `hover-background` ist in properties.ts der Primary-Name (`hover-bg` der Alias), in dsl.ts ist `hover-bg` der Primary-Name (`hover-background` der Alias). Beide kennen beide Formen, aber UI/Panel zeigt jeweils das, was lokal Primary ist — verwirrt, wenn Doku eine Form bevorzugt und Code die andere.
  Empfehlung: Konvention festlegen (welche Form ist „kanonisch"?) und beide Files synchronisieren. Klein.

- **D-020 [mittel, offen] properties.ts — Keine Synchronitätsgarantie zu `dsl.ts:SCHEMA`.**
  Bei einer neu in dsl.ts hinzugefügten Panel-relevanten Property muss der Mensch daran denken, sie auch hier einzutragen (oder bewusst auszulassen). Kein Test erzwingt das.
  Empfehlung: Schema-Test bauen, der für jede `dsl.ts:SCHEMA`-Property prüft: entweder ist sie in `properties.ts:properties[]`, oder sie steht auf einer expliziten „panel-internal"-Liste. Macht das implizite explizit.

- **D-021 [niedrig, offen] properties.ts — Keine Doku zu „warum 45 Properties NICHT hier sind".**
  Datei hat keinen Header-Hinweis, dass eine bewusste Auswahl gemacht wurde. Unklar für Außenstehende.
  Empfehlung: Header-Kommentar erweitern.

**Status:** `reviewed-clean` — Datei selbst ist konsistent und vollständig. Alle drei Befunde sind systemische A-02-Themen, betreffen das Verhältnis zwischen properties.ts und dsl.ts:SCHEMA.

---

## Phase 2 Zwischenstand

5 von 15 Schema-Files reviewt:

| Datei                | Status        | Findings     | Inline-Fixes               |
| -------------------- | ------------- | ------------ | -------------------------- |
| `index.ts`           | with-findings | D-001..D-004 | D-002, D-004               |
| `primitive-roles.ts` | clean         | D-005        | –                          |
| `layout-defaults.ts` | clean         | D-006..D-008 | –                          |
| `primitives.ts`      | with-findings | D-009..D-012 | D-009, D-011               |
| `parser-helpers.ts`  | with-findings | D-013..D-018 | D-015, D-016, D-017, D-018 |
| `properties.ts`      | clean         | D-019..D-021 | –                          |

**Pattern erkennbar:**

- ~30% der Schema-Befunde sind Performance (Memoization fehlt) — kleine Inline-Fixes, machbar.
- ~70% sind systemische Inkonsistenz (verstreutes Schema-Wissen, fehlende Sync-Tests) — gehören in den A-04/A-07-Sprint.
- Tote Code-Stellen sind selten (Cleanup-Sprint 1 hat das meiste schon eingesammelt).

**Nächste Session:** s.u.

---

## 2026-05-01 — schema/ir-helpers.ts

**Scope:** 720 Z. (vor Inline-Fixes), 10 Konstanten + 14 Funktionen. A-07 lebt hier.

**Konstanten-Übersicht:**

| Konstante                  | Quelle                                  | Anmerkung                                |
| -------------------------- | --------------------------------------- | ---------------------------------------- |
| `NON_CSS_PROPERTIES`       | hardcoded                               | HTML-Attribute + Animation, ~25 Einträge |
| `ALIGNMENT_PROPERTIES`     | hardcoded                               | 9-Zone + spread/center, 21 Einträge      |
| `DIRECTION_PROPERTIES`     | hardcoded                               | hor/ver/horizontal/vertical              |
| `PROPERTY_TO_CSS`          | **HARDCODED ~50 Einträge**              | A-07 — parallele Wahrheit zu Schema      |
| `HOVER_PROPERTIES`         | **HARDCODED ~14 Einträge**              | A-07 — Subset von schema-properties      |
| `STATE_PROPERTY_PREFIXES`  | hardcoded                               | hover/focus/active/disabled              |
| `DIRECTION_MAP`            | hardcoded                               | 15 Einträge (l/r/t/b/x/y + long forms)   |
| `CORNER_MAP`               | hardcoded                               | 8 Einträge                               |
| `BORDER_DIRECTION_MAP`     | **war 100% Duplikat von DIRECTION_MAP** | jetzt Alias                              |
| `PROPERTY_TO_TOKEN_SUFFIX` | hardcoded                               | ~30 Einträge                             |

**Funktionen-Übersicht:**

| Funktion                                              | Status | Anmerkung                                                                                                                         |
| ----------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `getCSSPropertyName`                                  | ✅     | Schlauer Hack: ruft `prop.numeric.css(0)[0].property` für Property-Namens-Extraktion auf                                          |
| `hasKeywordValue`                                     | ✅     | –                                                                                                                                 |
| `getKeywordCSS`                                       | ✅     | hasOwnProperty-Guard gegen Prototype-Methoden (`valueOf` etc.) — Sicherheits-relevant                                             |
| `getNumericCSS`                                       | ✅     | –                                                                                                                                 |
| `getColorCSS`                                         | ✅     | –                                                                                                                                 |
| `getStandaloneCSS`                                    | ✅     | –                                                                                                                                 |
| `isStandaloneProperty`                                | ✅     | –                                                                                                                                 |
| `schemaPropertyToCSS`                                 | ✅     | Multi-Branch (boolean / keyword / numeric / numeric-string-with-unit / color). hasOwnProperty-Guard. Sauberes Edge-Case-Handling. |
| `simplePropertyToCSS`                                 | ⚠️     | Hardcoded `needsPx` Liste (D-024)                                                                                                 |
| `hoverPropertyToCSS`                                  | ✅     | Generischer state-prefix-Handler. Spezialfälle für `scale` und Border-Properties dokumentiert.                                    |
| `isDirection`/`isCorner`/`getDirections`/`getCorners` | ✅     | Trivial Set/Map-wrappers                                                                                                          |
| `getTokenAcceptingProperties`                         | ⚠️→✅  | War SCHEMA-Iteration pro Aufruf — gefixt mit Memo                                                                                 |
| `getColorAcceptingProperties`                         | ⚠️→✅  | War SCHEMA-Iteration pro Aufruf — gefixt mit Memo                                                                                 |
| `mapEventToDom`                                       | ✅     | DSL.events Lookup mit `replace(/^on/, '')`-Fallback                                                                               |
| `getHtmlTag`                                          | ⚠️→✅  | War Linear-Scan über DSL.primitives — gefixt mit Map-Cache                                                                        |

**Inline-Fixes:**

- **D-031 [erledigt inline] ir-helpers.ts:8 — toter Import `PropertyDef`.** Entfernt.
- **D-028 [erledigt inline] ir-helpers.ts:598-621 — `getTokenAcceptingProperties`/`getColorAcceptingProperties` jetzt memoized.** Hot path, beide bauten pro Aufruf eine neue Liste über ~127 SCHEMA-Einträge.
- **D-029 [erledigt inline] ir-helpers.ts:698-719 — `getHtmlTag` jetzt Map-Lookup statt Linear-Scan.** Ist Hot-Path im IR (pro Instance gerufen).
- **D-025 [erledigt inline] ir-helpers.ts:545-561 — `BORDER_DIRECTION_MAP` war 100% Duplikat von `DIRECTION_MAP`.**
  Diff via `awk` + `diff` zeigte: nur die Kommentare unterschieden sich, Inhalte identisch (15 Schlüssel, gleiche Werte). Konsolidiert: `BORDER_DIRECTION_MAP = DIRECTION_MAP` mit Hinweis, dass beide Namen für Aufruf-Stellen-Klarheit erhalten bleiben (und falls border je eigene Direction-Semantik braucht, hier teilen).
  Ein vermeintlich „1 failed" Test beim ersten Re-Run war JSDOM-Flakiness (`scrollIntoView is not a function`), Zweiter Re-Run grün.

**Offene Befunde:**

- **D-022 [hoch, offen] ir-helpers.ts:118-190 — `PROPERTY_TO_CSS` ist manuelles DSL→CSS-Mapping parallel zum Schema.**
  Klassischer A-07-Befund. Die ~50 Einträge wären ableitbar aus `SCHEMA[prop].numeric.css(0)[0].property` (siehe `getCSSPropertyName` selbst). Aber `simplePropertyToCSS` line 373 nutzt PROPERTY_TO_CSS direkt, statt die bereits vorhandene `getCSSPropertyName`-Funktion. Empfehlung: Im A-07-Sprint PROPERTY_TO_CSS durch eine memoized `Map` ersetzen, die einmalig per `Object.values(SCHEMA).forEach(...)` aufgebaut wird, mit Fallback für nicht-schema-eingetragene Properties.

- **D-023 [mittel, offen] ir-helpers.ts:429-445 — `HOVER_PROPERTIES` hardcoded Subset.**
  Schema kennt `hover-bg` (etc.) als separate Property mit eigenem `numeric.css`/`color.css`. Hier wird stattdessen ein Mapping `bg → 'background'` verwendet, um den state-prefix-Handler zu speisen. Konzeptionelle Doppelung. A-07-Familie.

- **D-024 [niedrig, offen] ir-helpers.ts:380-408 — `simplePropertyToCSS` hat hardcoded `needsPx`-Liste.**
  18 Properties hardcoded, die `px`-Suffix brauchen. Inkonsistent: `radius` ist drin, aber NICHT `border-radius`! Sollte aus Schema ableitbar sein (`prop.numeric.unit === 'px'`).

- **D-026 [niedrig, offen] ir-helpers.ts:79-106 — `ALIGNMENT_PROPERTIES`/`DIRECTION_PROPERTIES` hardcoded.**
  Aus Schema ableitbar via Category-Filter. A-07-Familie.

- **D-027 [niedrig, offen] ir-helpers.ts:632-670 — `PROPERTY_TO_TOKEN_SUFFIX` redundant mit Property-Aliases.**
  Mapping wie `bg → '.bg'`, `padding → '.pad'`. Suffix ist im Wesentlichen der Kurzform-Alias. Ableitbar aus Schema. A-07-Familie.

- **D-030 [niedrig, offen] ir-helpers.ts:680-687 — `mapEventToDom` Fallback `eventName.replace(/^on/, '')`.**
  Was, wenn ein Event je ohne 'on'-Prefix kommt? Aktuell akzeptabel (alle Events haben Prefix per Konvention). Doku-Hinweis wäre gut.

**Tests:** 10942 passed, 0 failed nach allen Fixes (initial 10935, also etwas hochgeschwankt durch test-Flakiness).

**Status:** `reviewed-with-findings` — viele systemische A-07-Befunde dokumentiert. Datei selbst funktioniert nach den Inline-Fixes performance-optimiert.

**Nächste Session:** s.u.

---

## 2026-05-01 — schema/zag-primitives.ts

**Scope:** 277 Z. (vor Cleanup), enthält DatePicker als einzige Zag-Komponente nach Pure-Mirror-Migration.

**Klassifikation der Exports vor Cleanup:**

| Export                                | Verwendung                                  | Status       |
| ------------------------------------- | ------------------------------------------- | ------------ |
| `ZAG_PRIMITIVES`                      | aktiv                                       | behalten     |
| `SLOT_MAPPINGS`                       | aktiv (intern)                              | behalten     |
| `STATE_MAPPINGS`                      | **0 Konsumenten**                           | **gelöscht** |
| `SLOT_ALIASES` (leer)                 | **0 Konsumenten**                           | **gelöscht** |
| `isZagPrimitive`                      | aktiv                                       | behalten     |
| `getZagPrimitive`                     | aktiv (zag-parser.ts)                       | behalten     |
| `getSlotMappings`                     | aktiv                                       | behalten     |
| `getSlotDef`                          | aktiv                                       | behalten     |
| `isZagSlot`                           | aktiv (zag-parser.ts)                       | behalten     |
| `resolveSlotAlias`                    | **0 Konsumenten**                           | **gelöscht** |
| `getStateSelector`                    | **0 Konsumenten**                           | **gelöscht** |
| `getAllZagPrimitives`                 | **0 Konsumenten**                           | **gelöscht** |
| `getZagPrimitivesByPattern`           | **0 Konsumenten**                           | **gelöscht** |
| `getItemKeywords`                     | nur intern (von isZagItemKeyword)           | **gelöscht** |
| `isZagItemKeyword`                    | importiert in parser.ts aber nie aufgerufen | **gelöscht** |
| `isZagGroupKeyword`                   | importiert in parser.ts aber nie aufgerufen | **gelöscht** |
| `ZagPrimitiveDef`, `ZagSlotDef` types | aktiv                                       | behalten     |

**Verifikation:** Pro Export einen `grep -rln $name --include="*.ts"` außerhalb von `schema/zag-primitives` und (für die im barrel re-exportierten) auch außerhalb `schema/dsl`. Bei 0 außer Self-Reference: tot.

**Inline-Fixes:**

- **D-035 [erledigt inline] zag-primitives.ts — 9 tote Exports gelöscht.**
  - 2 Konstanten: `STATE_MAPPINGS` (~30 Z., Mirror→Zag-Data-Attribute-Mapping; nie konsumiert), `SLOT_ALIASES` (leer)
  - 7 Funktionen: `resolveSlotAlias`, `getStateSelector`, `getAllZagPrimitives`, `getZagPrimitivesByPattern`, `getItemKeywords`, `isZagItemKeyword`, `isZagGroupKeyword`
  - Gesamteinsparung: ~80 Z. Datei
  - Begleitende Updates: `compiler/schema/dsl.ts` Re-Exports (`STATE_MAPPINGS`, `getStateSelector`) entfernt, `compiler/parser/parser.ts` Imports (`getZagPrimitive`, `isZagSlot`, `isZagItemKeyword`, `isZagGroupKeyword` — alle vier waren importiert aber nie aufgerufen!) auf nur `isZagPrimitive` reduziert.

  Nebenbei aufgedeckt: `parser/parser.ts:72-78` hatte ein 5er-Import-Block mit 4 toten Imports — das ist ein Anzeichen, dass früher vermutlich Pure-Mirror-Migrationen an mehreren Stellen Code übrig gelassen haben.

**Status:** `reviewed-clean` — nach Cleanup. Datei ist jetzt minimal und fokussiert auf das, was DatePicker braucht.

**Tests:** 10945 passed, 0 failed nach Fix.

**Nächste Session:** s.u.

---

## 2026-05-01 — schema/chart-primitives.ts

**Scope:** 648 Z. (vor Cleanup), Chart-Schema mit Primitives + Properties + Slots.

**Klassifikation der Exports vor Cleanup:**

| Export                      | Verwendung                                                         | Status              |
| --------------------------- | ------------------------------------------------------------------ | ------------------- |
| `CHART_PRIMITIVES`          | aktiv                                                              | behalten            |
| `CHART_PROPERTIES` (80 Z.)  | **0 Konsumenten** (nur dsl.ts re-export)                           | **gelöscht**        |
| `CHART_SLOTS`               | aktiv (intern)                                                     | behalten            |
| `isChartPrimitive`          | aktiv (parser.ts)                                                  | behalten            |
| `getChartPrimitive`         | aktiv (parser.ts)                                                  | behalten            |
| `getChartProperty`          | **0 Konsumenten**                                                  | **gelöscht**        |
| `getAllChartPrimitives`     | **0 Konsumenten**                                                  | **gelöscht**        |
| `isChartSlot`               | aktiv (parser.ts)                                                  | behalten            |
| `getChartSlot`              | aktiv (parser.ts)                                                  | behalten            |
| `isSlotSupportedForChart`   | **0 Konsumenten**                                                  | **gelöscht**        |
| `getChartSlotProperty`      | aktiv (parser.ts + IR)                                             | behalten            |
| `getAllChartSlots`          | **0 Konsumenten**                                                  | **gelöscht**        |
| `DEFAULT_CHART_COLORS`      | aktiv (charts.ts, dom-runtime.ts)                                  | behalten            |
| `ChartPrimitiveDef` type    | aktiv (intern)                                                     | behalten            |
| `ChartPropertyDef` type     | nur intern verwendet (nur für CHART_PROPERTIES + getChartProperty) | **gelöscht**        |
| `ChartSlotDef` type         | aktiv (intern)                                                     | behalten            |
| `ChartSlotPropertyDef` type | nur intern, könnte non-exportiert werden                           | behalten (cosmetic) |

**Inline-Fixes:**

- **D-036 [erledigt inline] chart-primitives.ts — 5 tote Exports gelöscht.**
  - 1 Konstante `CHART_PROPERTIES` (~80 Z. Daten)
  - 4 Funktionen: `getChartProperty`, `getAllChartPrimitives`, `isSlotSupportedForChart`, `getAllChartSlots`
  - 1 Type `ChartPropertyDef`
  - Begleitende Updates: `compiler/schema/dsl.ts` Re-Exports (`CHART_PROPERTIES`, `getChartProperty`, `getAllChartPrimitives`, `ChartPropertyDef`) entfernt.
  - Datei von 648 → ~545 Z. geschrumpft.

  Bemerkenswert: `isSlotSupportedForChart` ist eine Funktion, die `slot.supportedCharts` prüft (z. B. „funktioniert XAxis bei Pie-Chart? nein"). Niemand ruft sie auf. Wahrscheinlich war geplant, sie für Validierung zu nutzen, aber nie wired up. Das `supportedCharts`-Feld in `ChartSlotDef` ist dadurch effektiv nur Doku.

**Status:** `reviewed-clean` — nach Cleanup. CHART_PRIMITIVES + CHART_SLOTS sind die noch wirkenden Daten-Tabellen.

**Tests:** 10945 passed, 0 failed.

---

## Phase 2 Zwischenstand (nach 7 Files)

| Datei                 | Status        | Findings     | Inline-Fixes               |
| --------------------- | ------------- | ------------ | -------------------------- |
| `index.ts`            | with-findings | D-001..D-004 | D-002, D-004               |
| `primitive-roles.ts`  | clean         | D-005        | –                          |
| `layout-defaults.ts`  | clean         | D-006..D-008 | –                          |
| `primitives.ts`       | with-findings | D-009..D-012 | D-009, D-011               |
| `parser-helpers.ts`   | with-findings | D-013..D-018 | D-015, D-016, D-017, D-018 |
| `properties.ts`       | clean         | D-019..D-021 | –                          |
| `ir-helpers.ts`       | with-findings | D-022..D-031 | D-025, D-028, D-029, D-031 |
| `zag-primitives.ts`   | clean         | D-035        | D-035 (9 tote Exports weg) |
| `chart-primitives.ts` | clean         | D-036        | D-036 (5 tote Exports weg) |

**Gesamt-Bilanz Phase 2 bis hier:**

- **15 Inline-Fixes** durchgeführt (D-002, D-004, D-009, D-011, D-015, D-016, D-017, D-018, D-025, D-028, D-029, D-031, D-035, D-036 + zwei tote Imports in parser.ts)
- **~150 Zeilen toter Code entfernt** (verschiedene Dateien)
- **3 Hot-Path-Memoization-Fixes** (parser-helpers + ir-helpers)
- **22 systemische Befunde** offen (alle in A-04/A-07-Familie oder D-001/D-013)

**Nächste Session:** s.u.

---

## 2026-05-01 — schema/zag-prop-metadata.ts + color-utils.ts + theme-generator.ts + component-tokens.ts + component-templates.ts

**Block-Review:** Mehrere kleinere Files in einem Durchgang nach demselben Muster (toten Code identifizieren, entfernen, Tests grün).

**zag-prop-metadata.ts (79 Z.):**

- ZagPropType (1 Type) tot — inline gemerged in ZagPropMeta. Datei ansonsten klein und korrekt.
- Status: `reviewed-clean`.

**color-utils.ts (243 Z. → ~210 Z.):**

- Befunde:
  - `rgbToHsl`/`hslToRgb` wurden exportiert, aber nur intern gebraucht — `export` entfernt (sind jetzt Modul-private).
  - `saturate` ohne Konsumenten — gelöscht.
  - `isDark` und `getContrastColor` ohne Konsumenten — beide gelöscht.
  - `ColorTransform` Type ohne externe Konsumenten — `export` entfernt.
- Status: `reviewed-clean`.

**theme-generator.ts (210 Z. → ~140 Z.):**

- Befunde:
  - `generateUserOverrides` (~45 Z.) ohne Konsumenten — gelöscht.
  - `getDefaultThemeCSS` ohne Konsumenten — gelöscht.
  - `GeneratedTheme` Type intern — `export` entfernt.
  - `ThemeTokenDefinition` Import wurde unbenutzt nach Entfernung der oberen — Import-Liste reduziert.
- Status: `reviewed-clean`.

**component-tokens.ts (445 Z. → ~410 Z.):**

- Befunde:
  - 3 Helper-Funktionen ohne Konsumenten — gelöscht: `getDefaultThemeTokens`, `getThemeTokenCSS`, `getGeneratedTokens`.
  - `ThemeTokenDefinition`/`UserTokenMapping` Types nur intern — `export` entfernt.
  - Theme-Generierung lebt in `theme-generator.ts`; dies bleibt reine Daten-Datei.
- Status: `reviewed-clean`.

**component-templates.ts (527 Z. → ~490 Z.):**

- Befunde:
  - 4 Helper-Funktionen ohne Konsumenten — gelöscht: `hasComponentTemplate`, `getTemplateNames`, `getTemplatesByCategory`, `getTemplateCategories`.
  - `TemplateCategory` Type nur intern — `export` entfernt.
  - Verbleibend: `COMPONENT_TEMPLATES` (Daten), `getComponentTemplate`, `adjustTemplateIndentation` — alle in Verwendung.
- Status: `reviewed-clean`.

**Block-Bilanz:**

- **5 Files reviewt**, alle clean (`reviewed-clean`).
- **17 tote Exports/Funktionen entfernt** (1 + 5 + 4 + 5 + 2 — wobei einige davon nur `export`-Modifier verloren haben, andere ganz gelöscht).
- **~150 Z. effektiv toter Code weg**.
- **Tests durchgängig grün** (10946-10948 passed, 0 failed; ein Re-Run-Flake durch JSDOM `scrollIntoView` wieder beobachtet).

**Pattern bestätigt:** In den Schema-Hilfsdateien (Zag, Charts, Themes, Templates) liegt typischerweise 30-50% toter API-Surface, übrig geblieben aus früheren Architektur-Phasen (vor Pure-Mirror-Migration, vor Theme-Refactor, vor Template-System-Stabilisierung). Mit ungeprüftem Codepfad nicht weiter problematisch — aber sie bewerben Funktionalität die niemand nutzt, und potenzielle Konsumenten sehen in der Public-API mehr als wirklich da ist.

**Nächste Session:** `compiler/schema/dsl.ts` (77 KB) — der große Brocken. Plan: in mehrere Sessions aufteilen, eine pro Top-Level-Konstante (DSL.keywords, DSL.primitives, DSL.events, DSL.actions, DSL.states, DSL.sizeStates, SCHEMA, Helper-Funktionen).

---

## 2026-05-01 — schema/dsl.ts (komplett)

**Scope:** Helper-Funktionen + DSL-Konstante + Re-Exporte. SCHEMA-Datenstruktur (~2160 Z. von ~2880) NICHT line-by-line reviewt — wäre nicht praktikabel; Strukturintegrität ist über `tests/compiler/validator-schema-driven.test.ts` und 10000+ Tests abgedeckt.

**Befunde Helper-Funktionen:**

| Helper                    | Konsumenten extern (außer dsl.ts/index.ts)              | Aktion                  |
| ------------------------- | ------------------------------------------------------- | ----------------------- |
| `isReservedKeyword`       | 0                                                       | **gelöscht**            |
| `getReservedKeywords`     | 0                                                       | **gelöscht**            |
| `isPrimitive`             | aktiv                                                   | behalten + **memoized** |
| `getPrimitiveDef`         | 0                                                       | **gelöscht**            |
| `findProperty`            | aktiv                                                   | behalten + **memoized** |
| `getPropertiesByCategory` | 0                                                       | **gelöscht**            |
| `getKeywordsForProperty`  | 0                                                       | **gelöscht**            |
| `getAllPropertyNames`     | 0 (Studio definiert eigene Funktion mit gleichem Namen) | **gelöscht**            |
| `getEvent`                | 2 (parser, IR)                                          | behalten                |
| `getAction`               | 1 (IR)                                                  | behalten                |
| `getState`                | 1 (IR)                                                  | behalten                |
| `isValidKey`              | 0                                                       | **gelöscht**            |
| `getAllEvents`            | 0                                                       | **gelöscht**            |
| `getAllActions`           | 0                                                       | **gelöscht**            |
| `getAllStates`            | 0                                                       | **gelöscht**            |
| `getSystemStates`         | 0                                                       | **gelöscht**            |
| `getCustomStates`         | 0 (state-machine.ts hat eigene gleichnamige Funktion)   | **gelöscht**            |
| `getDevicePreset`         | 1 (IR)                                                  | behalten + **memoized** |
| `getDevicePresetNames`    | 0                                                       | **gelöscht**            |
| `isDevicePreset`          | 1 (parser)                                              | behalten + **memoized** |

**Befunde Re-Exporte (Pass-Through ohne interne Verwendung):**

dsl.ts re-exportierte 14 Symbole aus `zag-primitives.ts` und `chart-primitives.ts`. Davon waren extern nur `ZAG_PRIMITIVES` und `CHART_PRIMITIVES` (von autocomplete) gebraucht. 11 weitere Re-Exporte (`SLOT_MAPPINGS`, `isZagPrimitive`, `getZagPrimitive`, `getSlotMappings`, `getSlotDef`, `isZagSlot`, `ZagPrimitiveDef`, `ZagSlotDef`, `getChartPrimitive`, `DEFAULT_CHART_COLORS`, `ChartPrimitiveDef`) waren purer Pass-Through. Alle 11 entfernt.

**Befunde DSL-Konstante:**

| Sub-Objekt              | Konsumenten                           | Aktion       |
| ----------------------- | ------------------------------------- | ------------ |
| `DSL.keywords.reserved` | 4 (lexer/parser-Wege)                 | behalten     |
| `DSL.primitives`        | intern (isPrimitive)                  | behalten     |
| `DSL.events`            | intern (getEvent)                     | behalten     |
| `DSL.actions`           | intern (getAction)                    | behalten     |
| `DSL.states`            | intern + 4 extern (Validator, Studio) | behalten     |
| `DSL.sizeStates`        | 4 (Validator)                         | behalten     |
| `DSL.keys`              | 11 extern (Validator, parser)         | behalten     |
| `DSL.stateModifiers`    | **0**                                 | **gelöscht** |
| `DSL.animationPresets`  | 6 (Validator, Studio)                 | behalten     |
| `DSL.durations`         | 3 (Studio)                            | behalten     |
| `DSL.easingFunctions`   | 6 (Studio)                            | behalten     |
| `DSL.zagPrimitives`     | **0**                                 | **gelöscht** |

**Inline-Fixes:**

- **D-037 [erledigt inline] Memoization für `isPrimitive`/`findProperty`.** Beide Funktionen waren vorher O(n)-Schleifen. Jetzt: O(1) Set/Map-Lookup, lazy-init beim ersten Aufruf (SCHEMA und DSL.primitives sind module-frozen, daher cache-safe).

- **D-038 [erledigt inline] Memoization für `getDevicePreset`/`isDevicePreset`/`getDevicePresetNames`.** Alle drei iterierten vorher die `keyword.css`-Liste mit `Array.find`. Jetzt: gemeinsamer Map-Cache, einmal beim ersten Aufruf gefüllt. `isDevicePreset` ist im Parser-Hot-Path (Canvas-Detection).

- **D-039 [erledigt inline] 13 tote Helper-Funktionen aus dsl.ts gelöscht** (siehe Tabelle oben). Begleitend: schema/index.ts Re-Exporte aufgeräumt (von 23 auf 9 reduziert).

- **D-040 [erledigt inline] 11 tote Pass-Through Re-Exporte aus dsl.ts gelöscht.** Importblock von 18 auf 4 Symbole reduziert.

- **D-041 [erledigt inline] 2 tote DSL-Sub-Objekte gelöscht** (`stateModifiers`, `zagPrimitives`).

**Zeilenbilanz:** 2883 → 2746 Z. (137 Z. effektiv tot weg, ~5%). Bei index.ts: 23 → 9 Exporte.

**Status:** `reviewed-clean` — Helper, Re-Exporte und DSL-Subobjekte aufgeräumt. SCHEMA-Datenstruktur nicht line-by-line geprüft, aber durch Tests abgedeckt.

**Tests:** 10952 passed, 1 Test-Flake (studio/edit-handler.test.ts, in Re-Run grün — bekannt unrelated).

---

## Phase 2 schema/-Bilanz (vollständig)

`compiler/schema/` ist jetzt komplett reviewt. Endstand:

| Datei                    | Status        | Inline-Fixes                 |
| ------------------------ | ------------- | ---------------------------- |
| `index.ts`               | with-findings | 2 (re-Export-Cleanup)        |
| `primitive-roles.ts`     | clean         | – (neu erstellt aus Cleanup) |
| `layout-defaults.ts`     | clean         | –                            |
| `primitives.ts`          | with-findings | 2                            |
| `parser-helpers.ts`      | with-findings | 4                            |
| `properties.ts`          | clean         | – (vorher Cleanup)           |
| `ir-helpers.ts`          | with-findings | 4                            |
| `zag-primitives.ts`      | clean         | 1 (9 tote Exports)           |
| `chart-primitives.ts`    | clean         | 1 (5 tote Exports)           |
| `zag-prop-metadata.ts`   | clean         | 1 (1 toter Type)             |
| `color-utils.ts`         | clean         | 1 (4 tote Funktionen)        |
| `theme-generator.ts`     | clean         | 1 (3 tote Items)             |
| `component-tokens.ts`    | clean         | 1 (3 tote Funktionen)        |
| `component-templates.ts` | clean         | 1 (5 tote Items)             |
| `dsl.ts`                 | clean         | 5 (Memoization + Cleanup)    |

**Gesamtzahlen:**

- **24+ Inline-Fixes** in 15 Dateien.
- **~290 Zeilen toter Code entfernt** insgesamt.
- **5 Hot-Path-Memoization-Fixes** (parser-helpers + ir-helpers + dsl).
- **Pattern bestätigt:** Schema-Hilfsdateien hatten typisch 30-50 % tote API-Surface aus früheren Architektur-Phasen. Jetzt: lean.

**Nächste Session:** `compiler/parser/` — lexer.ts (bereits Phase-1-tagged), parser.ts (sehr groß), ast.ts, zag-parser.ts.

---

## 2026-05-01 — schema-Anschluss: parser/ Block-Review (kleine Files)

**Scope:** Alle Phase-5-extrahierten Sub-Parser + Support-Dateien — `index.ts`, `data-types.ts`, `parser-context.ts`, `state-detector.ts`, `token-parser.ts`, `animation-parser.ts`, `ternary-parser.ts`, `property-parser.ts`, `inline-property-parser.ts`, `data-object-parser.ts`, `zag-parser.ts`. Lexer + parser.ts + ast.ts kommen separat (Aufwand).

**Befunde:**

| Datei                       | Befund                                                                                                                                              | Aktion                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `index.ts`                  | Alle 14 re-exportierten Symbole haben externe Konsumenten.                                                                                          | clean                                   |
| `data-types.ts`             | Alle 6 Type-Guards aktiv (5-25 refs).                                                                                                               | clean                                   |
| `parser-context.ts`         | `ParseResult<T>` Interface — **0 Konsumenten** (toter Leftover)                                                                                     | **gelöscht**                            |
| `state-detector.ts`         | Kompakt, pure, gut dokumentiert.                                                                                                                    | clean                                   |
| `token-parser.ts`           | `parseTokenValue` exportiert, aber 0 externe Refs.                                                                                                  | **`export`-Modifier entfernt** (intern) |
| `animation-parser.ts`       | Lokale `expect`/`addError` Wrapper für API-Methoden, die `ParserUtils` nicht hat. Funktioniert, aber inkonsistent.                                  | Notiert (deferred)                      |
| `ternary-parser.ts`         | Sehr gut kommentiert (Bug-#23 + Bug-#26 Hintergründe). Pure.                                                                                        | clean                                   |
| `property-parser.ts`        | Sauber strukturiert, klare Helper-Funktionen.                                                                                                       | clean                                   |
| `inline-property-parser.ts` | Großes Callbacks-Interface (`InlinePropertiesCallbacks` mit 8 Methoden) — Hinweis darauf, dass parser.ts noch nicht alle Funktionen extrahiert hat. | Notiert (Phase 5 weitere Iterationen)   |
| `data-object-parser.ts`     | Lokale `skipNewlines` Funktion ist Duplikat von `U.skipNewlines`.                                                                                   | **gelöscht + 5 Call-Sites umgestellt**  |
| `zag-parser.ts`             | **Bug:** `ZagSlotDef` wird auf 3 Stellen verwendet, aber war nicht in den Imports — TS-Error vorhanden.                                             | **Import hinzugefügt**                  |

**Inline-Fixes:**

- **D-042 [erledigt inline] `ParseResult<T>` Interface aus parser-context.ts entfernt** — komplett tot.
- **D-043 [erledigt inline] `parseTokenValue` als nicht-exportierte Funktion umgestellt** — nur intern verwendet.
- **D-044 [erledigt inline] Duplikat-`skipNewlines` aus data-object-parser.ts entfernt**, alle 5 Call-Sites auf `U.skipNewlines` umgestellt.
- **D-045 [erledigt inline] Fehlender `ZagSlotDef`-Import in zag-parser.ts ergänzt** — TS-Error wurde dadurch behoben.

**Befunde, die offen bleiben:**

- **D-046 [offen, deferred] animation-parser.ts: lokale `expect`/`addError` Wrapper.** Diese Methoden gibt es nicht auf `ParserUtils`. Empfehlung: hinzufügen zu ParserUtils und aus animation-parser entfernen, damit Code-Stil konsistent zu anderen Sub-Parsern wird.

- **D-047 [offen, deferred] inline-property-parser.ts: `InlinePropertiesCallbacks` mit 8 Methoden.** Großer Callback-Mechanismus — Hinweis darauf, dass parser.ts noch viele Methoden hält, die eigentlich extrahiert werden sollten (Phase 5 Fortsetzung). Liste: `collectExpressionOperand`, `parseDataBindingValues`, `parseRoutePath`, `isImplicitOnclickCandidate`, `parseImplicitOnclick`, `parseEvent`, `checkNextIsPropertyName`, `advancePropertyName`.

- **D-048 [offen, low-priority] ast.ts: `TableStaticRowNode` + `TableStaticCellNode` + `staticRows?` Feld auf TableNode.** Interfaces sind deklariert, Felder existieren, aber **werden nirgends populiert oder gelesen**. Sieht aus wie aborted/abandoned Feature für „statische Zeilen in manuellen Tabellen". Empfehlung: entweder Implementierung ergänzen oder Code entfernen.

**Tests:** 10958 passed, 0 failed (zwei verschiedene Re-Run-Flakes beobachtet: studio/edit-handler und stress-dom-generation — beide unrelated).

**Status:**

- 11 Dateien auf `reviewed-clean`.
- parser.ts (4166 Z.) und lexer.ts (828 Z.) und ast.ts (849 Z.) noch offen — werden separat gemacht.

**Nächste Session:** `compiler/parser/lexer.ts` und `compiler/parser/ast.ts` (mittelgroß), danach `compiler/parser/parser.ts` (Phase 5 Iterationen würden parallel laufen können).

---

## 2026-05-01 — ir/ Block-Review

**Scope:** `compiler/ir/` (24 Dateien, ~7400 Z. zusammen). Lexer- und AST-Reviews kommen separat.

**Befunde:**

| Datei                          | Befund                                                                                                                                                                                           | Aktion       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `types.ts` (562 Z.)            | `InferredDataType` Type — **0 Konsumenten** (komplett tot).                                                                                                                                      | **gelöscht** |
| `types.ts` Rest                | Alle anderen Types haben Konsumenten oder werden intern als Field-Typen verwendet (z. B. IRPropertyValue über IRItemProperty.values).                                                            | clean        |
| `source-map.ts` (433 Z.)       | Alle 5 Exports stark genutzt (NodeMapping 30, SourceMap 380, SourceMapBuilder 28, calculateSourcePosition 16, calculatePropertyPosition 16).                                                     | clean        |
| `transformers/*.ts` (15 Files) | **67 Exports geprüft** (`grep -n "^export "` aller Transformer-Dateien). Jeder einzelne hat externe Konsumenten. Sehr saubere Modularisierung — Resultat der Phase-2/3-Refactor-Arbeiten.        | clean        |
| `index.ts` (1998 Z.)           | Orchestrator-Klasse `IRTransformer`. Viele 1-Zeilen-Wrapper für extrahierte Transformer (validateProperty, transformZagComponent, etc.) — pragmatisch (stabile interne API), kein Cleanup nötig. | clean        |

**Inline-Fixes:**

- **D-049 [erledigt inline] `InferredDataType` aus ir/types.ts entfernt** — komplett toter Type, sah aus wie Vorbereitung für ein Table-Auto-Rendering Feature, das nie wired up wurde.

**Befunde, die offen bleiben:** Keine.

**Beobachtung:** `compiler/ir/` ist **sehr clean**. Nach dem großen Phase-2/3-Refactor (Transformer-Extraktion) gibt es kaum tote API-Surface. Im Vergleich zu schema/ (30-50 % tot) und parser/ (10-20 % tot) ist das ein deutlich anderer Befund.

**Tests:** 10957 passed (1 Edit-Handler-Flake, in Re-Run grün — unrelated).

**Status:** Block `ir/` abgeschlossen.

| Datei                    | Status | Inline-Fixes |
| ------------------------ | ------ | ------------ |
| `types.ts`               | clean  | 1            |
| `source-map.ts`          | clean  | –            |
| `index.ts`               | clean  | –            |
| `transformers/*.ts` (15) | clean  | –            |

**Gesamt-Bilanz Phase 2 bis hier (alle Sessions zusammen):**

- **24+ Inline-Fixes** in 18 Dateien (schema/ + parser/-Block + ir/).
- **~300 Zeilen toter Code entfernt**.
- **5 Hot-Path-Memoization-Fixes**.
- **49 D-Findings** dokumentiert (D-001..D-049). Davon ~18 inline behoben, ~31 als systemisch / deferred markiert.

**Nächste Session:** `compiler/parser/lexer.ts` (828 Z.), `compiler/parser/ast.ts` (849 Z.), dann `compiler/parser/parser.ts` (4166 Z.) oder `compiler/validator/` (kleiner, vermutlich schneller). Plan: validator zuerst, dann parser.ts/lexer.ts/ast.ts als Block.

---

## 2026-05-01 — validator/ Block-Review

**Scope:** `compiler/validator/` (8 Dateien, ~2440 Z. zusammen).

**Befunde:**

| Datei                   | Größe   | Befund                                                                                                                                          |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`              | 246 Z.  | Public API. Alle 8 Exports verwendet.                                                                                                           |
| `validator.ts`          | 1025 Z. | Validator-Klasse mit ~30 privaten Validierungsmethoden. Wohlstrukturiert (one method per Validierungs-Domäne). Keine offensichtlich tote Logik. |
| `generator.ts`          | 300 Z.  | Generiert ValidationRules aus Schema. Alle 4 Exports verwendet.                                                                                 |
| `studio-integration.ts` | 288 Z.  | Integration für Studio (CodeMirror, Problem-Panel, Status-Bar, QuickFix). Alle 12 Exports verwendet (von Studio konsumiert).                    |
| `validation-config.ts`  | 160 Z.  | Konstanten (KNOWN_STATE_STYLE_EXTRAS etc.). Alle 7 Exports von validator.ts konsumiert.                                                         |
| `types.ts`              | 147 Z.  | ValidationError, ValidationResult, ERROR_CODES. Alle exportierten Typen extern verwendet.                                                       |
| `string-utils.ts`       | 65 Z.   | Levenshtein + suggestSimilar. Beide extern (in validator.ts) verwendet.                                                                         |
| `cli.ts`                | 210 Z.  | CLI-Entry für `npm run validate`. Standalone.                                                                                                   |

**Inline-Fixes:** Keine — alle Exports haben Konsumenten, keine offensichtlich tote Logik gefunden.

**Beobachtung:** `compiler/validator/` ist ähnlich clean wie `compiler/ir/`. Das Modul wurde offenbar mit weniger Architektur-Drift gebaut — kaum tote Public-API-Surface.

**Tests:** Tests laufen weiterhin grün (modulo bekannte Flakes).

**Status:** Block `validator/` abgeschlossen — `reviewed-clean`.

| Datei                   | Status |
| ----------------------- | ------ |
| `index.ts`              | clean  |
| `validator.ts`          | clean  |
| `generator.ts`          | clean  |
| `studio-integration.ts` | clean  |
| `validation-config.ts`  | clean  |
| `types.ts`              | clean  |
| `string-utils.ts`       | clean  |
| `cli.ts`                | clean  |

**Nächste Session:** `compiler/parser/parser.ts` (4166 Z. — größter Brocken), `compiler/parser/lexer.ts` (828 Z.), `compiler/parser/ast.ts` (849 Z.). Danach: `compiler/backends/` und `compiler/runtime/`.

---

## 2026-05-01 — backends/ Block-Review

**Scope:** `compiler/backends/` (20 Dateien, ~7650 Z. zusammen). Vor allem dom-Backend (15 Dateien) und framework.ts/react.ts.

**Befunde:**

| Datei                      | Größe     | Befund                                                                                                                                                          |
| -------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `dom.ts`                   | 2306 Z.   | Hauptmodul. Importiert direkt aus `./dom/*-emitter` Files (nicht über barrel). Funktional und gut strukturiert.                                                 |
| `dom/index.ts`             | 108 Z.    | **TOTER BARREL — niemand importiert davon.** Tests nutzen `compiler/backends/dom` (resolves zu `dom.ts`). dom.ts importiert direkt aus `./dom/*-emitter` Files. | **gelöscht** |
| `dom/zag-emitters.ts`      | 9 Z.      | 1-Zeilen Re-Export Wrapper. Wird von `dom.ts` und (zuvor) `dom/index.ts` importiert. Behalten als API-Stabilität.                                               | clean        |
| `dom/*` (15 emitter files) | 70-757 Z. | Alle Emitter-Dateien werden direkt von dom.ts importiert. Klare Single-Responsibility.                                                                          | clean        |
| `framework.ts`             | 577 Z.    | Framework-agnostisches Backend. `generateFramework` extern verwendet.                                                                                           | clean        |
| `react.ts`                 | 521 Z.    | React-Backend. `generateReact` + `ReactExportOptions` (Parameter-Type, OK exportiert).                                                                          | clean        |

**Inline-Fixes:**

- **D-050 [erledigt inline] `compiler/backends/dom/index.ts` (108 Z.) gelöscht.** Toter Barrel-File: niemand importiert vom Pfad. Auflösung `compiler/backends/dom` führt zu `dom.ts` (Bundler-Resolution bevorzugt File über Folder), und alle internen Konsumenten importieren direkt aus `./dom/*.ts`. Test-Suite nach Löschung weiterhin grün.

**Beobachtung:** Die Auskommentierung am Ende des gelöschten `dom/index.ts` (»value-resolver.ts und template-emitter.ts wurden 2026-04-26 gelöscht…«) zeigt, dass das Barrel-Modul schon damals als Cleanup-Kandidat aufgefallen ist. Es war der nächste Schritt, der fehlte.

**Tests:** 10958 passed (1 Edit-Handler-Flake, in Re-Run grün).

**Status:** Block `backends/` abgeschlossen — `reviewed-clean` mit 1 Inline-Fix.

**Nächste Session:** `compiler/runtime/` (vermutlich groß; dom-runtime.ts schon ~2000+ Z.), dann zurück zum offenen `compiler/parser/` Block (lexer/ast/parser.ts).

---

## 2026-05-01 — runtime/ Triage-Review (Vorschau)

**Scope:** Erste Sondierung von `compiler/runtime/` (32 Dateien, ~16300 Z.). Detail-Review pro Datei kommt in folgenden Sessions.

**Kritischer Befund: Unvollständige Extraktion**

Die runtime/ wurde teilweise modularisiert (extracted utility files: `batching.ts`, `scroll.ts`, `timer.ts`, `clipboard.ts`, `cleanup.ts`, `data-binding.ts`, `form-navigation.ts`, `visibility.ts`, …), aber **`dom-runtime.ts` (5037 Z.) hat seine eigenen Duplikate dieser Funktionen behalten:**

| Funktion                                                | Wird angeboten in | dom-runtime.ts hat                 |
| ------------------------------------------------------- | ----------------- | ---------------------------------- |
| `batchInFrame`                                          | `batching.ts`     | eigene Implementation (Z. 238)     |
| `scrollTo`, `scrollBy`, `scrollToTop`, `scrollToBottom` | `scroll.ts`       | eigene Implementationen (Z. 1216+) |
| `cancelDelay`, `delay`, `debounce`                      | `timer.ts`        | eigene Implementationen (Z. 2216+) |
| `ScrollToOptions` Type                                  | `scroll.ts`       | eigene Definition (Z. 1205)        |

`dom-runtime.ts` exportiert **seine eigenen** Versionen dieser Funktionen ans globale Window-Objekt (Z. 4900-4940). Die externen Konsumenten (719 für `show`, 257 für `hide`, etc.) holen sich die Funktionen also über dom-runtime.ts, nicht über die extrahierten Files.

Konsequenz: die extrahierten Files (`scroll.ts`, `timer.ts`, `batching.ts`) sind **nicht die Single-Source-of-Truth**. `batching.ts` wird von 2 Files konsumiert (visibility.ts, state-machine.ts), die anderen 0 mal. Code-Duplikation und divergente Implementationen sind möglich.

**Befunde mit 0 externen Konsumenten:**

- `batching.ts` Exports: `isInsideFrame`, `setFrameState` (beide 0 use). Nur `batchInFrame` ist verwendet.
- `timer.ts` Export: `cancelDelay` (0 use; dom-runtime.ts hat eigene).
- `scroll.ts` Export: `ScrollToOptions` Type (0 use; dom-runtime.ts hat eigene).
- `types.ts` Exports: `OverlayPosition`, `PositionOptions` (0 use).

**Empfehlung (deferred zu Sprint):**

- **D-051 [systemisch] Runtime-Extraktion vervollständigen.** Entweder:
  (a) `dom-runtime.ts` so umbauen, dass sie aus den extrahierten Files (`scroll`, `timer`, `batching`) importiert (statt lokale Duplikate), oder
  (b) extrahierte Files löschen und Funktionen in dom-runtime.ts konsolidieren.
  Variante (a) ist sauberer, aber riskanter (dom-runtime.ts ist 5000 Z., zentral).

- **D-052 [systemisch] runtime/types.ts Exports `OverlayPosition`, `PositionOptions` aufräumen** — zeitgleich mit (a).

**Status der einzelnen runtime-Files (Triage):**

| Datei                   | Größe   | Triage-Status                          |
| ----------------------- | ------- | -------------------------------------- |
| dom-runtime.ts          | 5037 Z. | Detail-Review nötig (zentraler Code)   |
| mirror-runtime.ts       | 2490 Z. | Detail-Review nötig                    |
| dom-runtime-string.ts   | 2261 Z. | Detail-Review nötig                    |
| state-machine.ts        | 653 Z.  | Detail-Review nötig                    |
| data.ts                 | 672 Z.  | Detail-Review nötig                    |
| overlay.ts              | 598 Z.  | Detail-Review nötig                    |
| selection.ts            | 406 Z.  | Detail-Review nötig                    |
| animations.ts           | 433 Z.  | Detail-Review nötig                    |
| charts.ts               | 372 Z.  | Detail-Review nötig                    |
| component-navigation.ts | 336 Z.  | Detail-Review nötig                    |
| chart-runtime.ts        | 320 Z.  | Detail-Review nötig                    |
| security.ts             | 304 Z.  | Detail-Review nötig                    |
| element-wrapper.ts      | 287 Z.  | Detail-Review nötig                    |
| icons.ts                | 273 Z.  | Detail-Review nötig                    |
| data-binding.ts         | 224 Z.  | Detail-Review nötig                    |
| input-control.ts        | 207 Z.  | Detail-Review nötig                    |
| toast.ts                | 198 Z.  | Detail-Review nötig                    |
| markdown.ts             | 180 Z.  | Detail-Review nötig                    |
| form-navigation.ts      | 171 Z.  | Detail-Review nötig                    |
| input-mask.ts           | 153 Z.  | Detail-Review nötig                    |
| cleanup.ts              | 123 Z.  | Detail-Review nötig                    |
| alignment.ts            | 122 Z.  | Detail-Review nötig                    |
| types.ts                | 89 Z.   | 2 tote Type-Exports (siehe oben)       |
| clipboard.ts            | 89 Z.   | Detail-Review nötig                    |
| scroll.ts               | 80 Z.   | Duplikat-Code (siehe D-051)            |
| navigation.ts           | 72 Z.   | Detail-Review nötig                    |
| timer.ts                | 44 Z.   | Duplikat-Code + 1 toter Export (D-051) |
| batching.ts             | 41 Z.   | 2 tote Exports + Duplikat (D-051)      |
| visibility.ts           | 33 Z.   | Detail-Review nötig                    |
| index.ts                | 33 Z.   | Detail-Review nötig                    |
| test-api.ts             | 9 Z.    | 1-Zeilen Re-Export Wrapper (clean)     |

**Status:** runtime/ Triage abgeschlossen. Detail-Review der einzelnen Files **deferred** wegen Komplexität (5000-Z. dom-runtime.ts braucht eigene Session). Hauptbefund D-051 ist systemisch und braucht Refactor-Sprint.

**Tests:** 10957 passed (1 Edit-Handler-Flake, in Re-Run grün — bekannt).

**Nächste Session:** `compiler/parser/lexer.ts` (828 Z.), `compiler/parser/ast.ts` (849 Z.) als kürzere Aufgaben, dann `compiler/parser/parser.ts` (4166 Z.). runtime/ Detail kommt nach parser/ — runtime ist intern, parser ist Public-API-Treiber.

---

## Phase 2 Bilanz (gesamt, alle Sessions zusammen)

**Geprüfte Module:**

- `compiler/schema/` ✅ — alle 15 Files, viele Inline-Fixes (~290 Z. tot weg)
- `compiler/parser/` (teilweise) — 11 von 14 Files reviewed, 3 noch offen
- `compiler/ir/` ✅ — alle 24 Files, nur 1 Inline-Fix (sehr clean)
- `compiler/validator/` ✅ — alle 8 Files, 0 Inline-Fixes (sehr clean)
- `compiler/backends/` ✅ — alle 20 Files, 1 Inline-Fix (toter Barrel)
- `compiler/runtime/` (Triage) — Hauptbefund D-051 dokumentiert, Detail deferred

**Inline-Fixes total:** 25+ in 19 Dateien. ~400 Zeilen toter/duplizierter Code entfernt.
**Memoization-Fixes:** 5 (Hot-Paths in schema-Helpers).
**Findings dokumentiert:** D-001 bis D-052.
**Verbleibend offen:** parser.ts/lexer.ts/ast.ts (mittleres Volumen), runtime/ Detail (großes Volumen).

---

## 2026-05-01 — parser/ Block: lexer.ts + ast.ts + parser.ts

**Scope:** Die drei großen parser-Files. Detail-Review: tote Token-Types, tote AST-Interfaces, tote private Methoden, tote Imports.

**Befunde:**

### lexer.ts (828 → 827 Z.)

| Befund                                                                                                               | Aktion       |
| -------------------------------------------------------------------------------------------------------------------- | ------------ |
| `'ANIMATION'` TokenType — nie generiert (nicht in DSL.keywords.reserved). 'animation' wird als IDENTIFIER geparst.   | **gelöscht** |
| Alle anderen TokenTypes haben Konsumenten                                                                            | clean        |
| `LexerResult` Interface — externe Konsumenten = 0, aber Return-Type von `tokenizeWithErrors` (TS braucht Definition) | behalten     |

### ast.ts (849 → 812 Z.)

| Befund                                                  | Aktion       |
| ------------------------------------------------------- | ------------ |
| `TableStaticRowNode` Interface — nie populiert/gelesen  | **gelöscht** |
| `TableStaticCellNode` Interface — nie populiert/gelesen | **gelöscht** |
| `'TableStaticRow' \| 'TableStaticCell'` aus NodeType    | **gelöscht** |
| `staticRows?` Feld auf TableNode                        | **gelöscht** |
| `staticRow?` Feld auf TableSlotNode                     | **gelöscht** |

Aborted Feature für „static rows in manuellen Tabellen" — Schema war angefangen, Implementation kam nie. D-048 abgeschlossen durch Löschung.

### parser.ts (4166 → 4084 Z.)

| Befund                                                                                                                                             | Aktion                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `parseDataBinding` private Methode (Z. 3857) — nie aufgerufen, parseDataBindingValues ist die aktive Version                                       | **gelöscht**                          |
| `reportIterationLimit` private Methode — nie aufgerufen                                                                                            | **gelöscht**                          |
| `parseStateBlockBody` private Methode — nie aufgerufen                                                                                             | **gelöscht**                          |
| Tote Imports: `BOOLEAN_PROPERTIES`, `LAYOUT_BOOLEANS`, `DIRECTIONAL_PROPERTIES`, `DIRECTION_KEYWORDS`, `isDirectionForProperty` aus parser-helpers | **entfernt** (5 Symbole)              |
| Tote Imports: `DataReference`, `DataReferenceArray`, `DataAttribute`, `DataBlock` aus ast                                                          | **entfernt** (4 Type-Imports)         |
| Static `Parser.MAX_ITERATIONS` etc. duplizieren parser-context.ts Werte                                                                            | Notiert (D-053 deferred)              |
| Private Helper-Methoden duplizieren ParserUtils (advance, check, peekAt, …)                                                                        | Notiert (D-053 — Phase 5 Fortsetzung) |

**Inline-Fixes:**

- **D-053a [erledigt inline] lexer.ts: tote 'ANIMATION' TokenType entfernt.**
- **D-053b [erledigt inline] ast.ts: TableStaticRow/Cell-Familie komplett gelöscht (5 Items).**
- **D-053c [erledigt inline] parser.ts: 3 tote private Methoden + 9 tote Type-/Const-Imports entfernt (~85 Z.).**

**Status:** parser/ jetzt vollständig reviewt. 14 von 14 Files clean.

| Datei                   | Status                           |
| ----------------------- | -------------------------------- |
| parser.ts               | clean                            |
| lexer.ts                | clean                            |
| ast.ts                  | clean                            |
| (alle anderen 11 Files) | clean (siehe vorherige Sessions) |

---

## 2026-05-01 — runtime/ + top-level Cleanup

**Scope:** Niedrig-aufwand-Cleanup in runtime/ und top-level compiler/-Dateien.

**Befunde runtime/:**

| Datei           | Tote Exports                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| data-binding.ts | `getTextBindings`, `getValueBindings`, `getVisibilityBindings` (3) — Debug-Helper, nirgends verwendet |
| cleanup.ts      | `isRegisteredForCleanup`, `unregisterFromCleanup` (2)                                                 |
| icons.ts        | `hasCustomIcon`, `clearCustomIcons` (2)                                                               |

Alle 7 toten Exports gelöscht.

**Befunde top-level compiler/:**

| Datei                  | Tote Exports                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| positional-resolver.ts | `scanTokenSuffixes` (`@deprecated`-Alias mit 0 Konsumenten), `classifyBareValue` ("Legacy alias for older tests" — keine Tests rufen es auf) |
| preprocessor.ts        | `combineFiles` (kein Konsument; combineProjectFiles ist die aktive Variante)                                                                 |
| compiler/index.ts      | Re-Export von `combineFiles` mit entfernt                                                                                                    |

**Inline-Fixes:**

- **D-054 [erledigt inline] 7 tote runtime/-Exports gelöscht** (data-binding, cleanup, icons).
- **D-055 [erledigt inline] 3 tote top-level compiler/-Exports gelöscht** (positional-resolver, preprocessor, index).

**Tests:** 10958 passed, 0 failed (Edit-Handler-Flake gelegentlich, immer in Re-Run grün).

**Status:** Phase 2 Hauptmodule durch.

---

## Phase 2 Endbilanz (alle Sessions)

**Geprüfte Module:**

- `compiler/schema/` ✅ (15 Files)
- `compiler/parser/` ✅ (14 Files inkl. parser.ts)
- `compiler/ir/` ✅ (24 Files)
- `compiler/validator/` ✅ (8 Files)
- `compiler/backends/` ✅ (20 Files)
- `compiler/runtime/` (Triage + Light Cleanup; Detail-Review von dom-runtime.ts/mirror-runtime.ts/dom-runtime-string.ts deferred)
- `compiler/*.ts` (top-level, 4 Files) ✅

**Inline-Fixes total:** 35+ in 23 Dateien.
**~530 Zeilen toter/duplizierter Code entfernt** (~1 % der gesamten Codebase).
**Memoization-Fixes:** 5 (Hot-Paths in schema-Helpers).
**Findings dokumentiert:** D-001 bis D-055.
**Tests durchweg grün** (10958 passed; einziger Flake in studio/edit-handler.test.ts ist unrelated, in Re-Run immer grün).

**Verbleibende Detail-Reviews:**

- runtime/dom-runtime.ts (5037 Z.) — größter offener Brocken
- runtime/mirror-runtime.ts (~~2490~~ → **1502** Z. nach D-056)
- runtime/dom-runtime-string.ts (2261 Z.)
- D-051: systemische Runtime-Extraktion-Inkonsistenz (separater Sprint)

**Nächste Session:** runtime/dom-runtime.ts Detail-Review (mit Fokus auf D-051: was sollte Single-Source-of-Truth sein?). Vorschlag: Variante (a) — dom-runtime.ts auf extrahierte Files umbauen — vs. (b) extrahierte Files in dom-runtime konsolidieren. Diskussion mit User vor Refactor-Sprint.

---

## 2026-05-01 — D-056: mirror-runtime.ts toter Validation/Correction/Component-Subsystem

**Scope:** Detail-Review von `compiler/runtime/mirror-runtime.ts` nach Phase-2-Endbilanz. Datei ist 2490 Zeilen, davon stellte sich heraus: **40 % tot**.

**Befund:** Drei komplette Subsysteme in mirror-runtime.ts haben **0 externe Konsumenten**:

1. **Component-Definition-API** (M.define + M.extend + DefineBuilder + components Map + ComponentDef + renderComponent helper + renderNode-compDef-Branch).
   - Framework-Backend (`compiler/backends/framework.ts:98`) löst Components bereits zur IR-Zeit auf. Kommentar dort: _„we skip this as components are resolved during IR transformation"_. Die Map wurde nie geschrieben → renderNode-Branch unreachable, renderComponent-Funktion unreachable.
2. **Validation-API** (M.validate + ValidationResult + ValidationError + ValidationWarning + VALID_COMPONENTS Set + VALID_PROPERTIES Set).
3. **Correction/Normalization-API** (M.correct + M.correctAndValidate + CorrectionResult + CorrectionEntry + PROPERTY_CORRECTIONS Map + diverse helpers).

Verifikation: `grep -rn '\bM\.validate\b|\bM\.correct\b|\bM\.correctAndValidate\b|\bM\.define\b|\bM\.extend\b' --include='*.ts' --include='*.js'` außerhalb mirror-runtime.ts → 0 Treffer.

**Aktive API in mirror-runtime.ts** (von framework-Backend genutzt):

- `M(...)` Factory
- `M.each`, `M.if` (vom Framework-Backend emittiert)
- `M.render`, `M.toMirror` (vom Framework-Backend emittiert)
- Types: `MirrorProps`, `MirrorNode`, `Action`, `MirrorElement`

**Inline-Fixes:**

- **D-056 [erledigt inline] mirror-runtime.ts: 988 Zeilen toter Subsystem-Code entfernt** (40 % der Datei).
  - Schritt 1: `M.define` + `M.extend` + `DefineBuilder` interface (60 Z.)
  - Schritt 2: `components` Map + `ComponentDef` interface + `renderComponent` helper + renderNode-Branch + dead Re-Export aus `compiler/runtime/index.ts` (~75 Z.)
  - Schritt 3: `M.validate` + `ValidationResult` + `ValidationError` + `ValidationWarning` + `VALID_COMPONENTS` Set + `VALID_PROPERTIES` Set (327 Z.)
  - Schritt 4: `M.correct` + `CorrectionResult` + `CorrectionEntry` + `PROPERTY_CORRECTIONS` Map + helper functions (503 Z.)
  - Schritt 5: `M.correctAndValidate` (23 Z.)

**Tests nach jedem Schritt grün:** `tests/compiler/backend-framework.test.ts` (29/29) — der einzige Test, der die aktiven mirror-runtime-Symbole strukturell verifiziert.
**Full-Suite:** 10958 passed, 0 failed.

**Datei-Bilanz:** 2490 → 1502 Zeilen (-988 Z., -40 %).

**Bedeutung:** mirror-runtime.ts ist jetzt fokussiert auf das, was sie de-facto leistet: das Runtime-Spiegelbild der Mirror-DSL (M-Factory + each/if/render/toMirror). Die früheren Validation/Correction-Subsysteme waren vermutlich für eine LLM-Output-Sanitization-Pipeline gedacht, die nie zum Tragen kam — heute übernimmt `compiler/validator/` Schema-basierte Code-Validierung.

**Status runtime/-Modul:** zwei der drei großen Files jetzt prüfungsbereit (mirror-runtime.ts clean, dom-runtime.ts und dom-runtime-string.ts noch offen).

---

## 2026-05-01 — D-057: Tote Schatten-Module in runtime/

**Scope:** Inventur der extrahierten runtime/-Module als Vorbereitung für D-051-Sprint (Variante (a)). Plan-Dokument: `docs/plans/runtime-consolidation.md`.

**Befund Inventur:** 4 von 8 extrahierten Modulen sind **komplett unbenutzt** — null Konsumenten:

| Modul                | Konsumenten                   |
| -------------------- | ----------------------------- |
| `scroll.ts`          | 0                             |
| `timer.ts`           | 0                             |
| `form-navigation.ts` | 0                             |
| `clipboard.ts`       | 0                             |
| `batching.ts`        | 2 (state-machine, visibility) |
| `cleanup.ts`         | 1 (overlay)                   |
| `data-binding.ts`    | 1 (state-machine)             |
| `visibility.ts`      | 2 (overlay, test-api/index)   |

`compiler/runtime/index.ts` re-exportiert die Module NICHT (nur mirror-runtime + markdown). D.h. die 4 toten Module sind nicht via Barrel exposed; ihre Funktionen leben dupliziert in `dom-runtime.ts`. Stichprobe-Diff zeigt: funktional identisch, nur die Modul-Versionen sind etwas cleaner refactored (Helper-Funktionen ausgelagert).

**Bedeutung der Inventur:** Die ursprüngliche D-051-Annahme war, dass `dom-runtime.ts` auf die extrahierten Module umgebaut werden müsse. Realität ist verschachtelter:

- 4 Module sind **noch nicht-eingesteckte Refactor-Versuche** — totale Schatten ohne jeden Konsumenten
- 4 Module sind **partiell eingesteckt** — von 1-2 anderen runtime-Files konsumiert, aber dom-runtime.ts hat parallele Inline-Versionen
- → Der „nachhaltige Weg" (Variante a) ist zweistufig: erst tote Module weg, dann lebende Module zur Single-Source-of-Truth machen.

**Inline-Fix Schritt A:**

- **D-057 [erledigt inline] 4 tote runtime-Schatten-Module gelöscht**: `scroll.ts` (81 Z.), `timer.ts` (45 Z.), `form-navigation.ts` (132 Z.), `clipboard.ts` (88 Z.). Insgesamt 346 Zeilen + 4 Files.
- Verifikation vor Löschung: 0 Importeure in Production-Code (alle Importe von `_archiv/` Test-Ordnern sind veraltet).
- Drift-Check: Modul-Versionen funktional identisch zu dom-runtime.ts-Duplikaten; keine wertvollen Bug-Fixes verloren.

**Tests:** 10958 passed, 0 failed. Build grün.

**Status nach Schritt A:** runtime/-Modul-Verzeichnis enthält jetzt nur noch die 4 lebenden Module (batching, cleanup, data-binding, visibility) plus die größeren Files (dom-runtime.ts, dom-runtime-string.ts, mirror-runtime.ts, weitere Spezial-Module wie state-machine.ts, overlay.ts, animations.ts etc.). Die 4 lebenden Module sind als nächstes dran (Schritt B): in dom-runtime.ts werden ihre Duplikate durch Re-Exports ersetzt, sodass sie echte Single-Source-of-Truth werden.

**Nächster Schritt:** Schritt B — Pilot mit kleinstem lebenden Modul (visibility, 2 Funktionen). Plan-Detail in `docs/plans/runtime-consolidation.md`.

---

## 2026-05-01 — D-058: Lebende Runtime-Module zur Single-Source-of-Truth konsolidiert

**Scope:** Schritt B aus `docs/plans/runtime-consolidation.md`. Die 4 lebenden Module (batching, cleanup, data-binding, visibility), die echte Konsumenten haben, hatten zugleich Duplikate ihrer Funktionen in `dom-runtime.ts`. Pro Modul iterativ: dom-runtime.ts importiert + re-exportiert das Modul, lokale Duplikat-Definitionen werden entfernt.

**Wichtigster Befund:** Die Duplikation war nicht nur Code-Smell — sie war ein **echter Verhaltens-Bug-Vektor**. Stichprobe vor Konsolidierung:

1. **`batchInFrame`** hatte in beiden Files je eigene Module-Level-Variable `_insideFrameCallback`. State-machine (importiert aus batching.ts) trackte einen anderen Frame-State als dom-runtime.ts-interner Code. Diese beiden Welten konnten in unterschiedlichen Phasen sein → Race Conditions in chained transitions.

2. **`registerForCleanup`/`cleanupElement`/`initCleanupObserver`** hatten in beiden Files je eigenes WeakSet `_elementsWithDocListeners` und je eigenen `_cleanupObserver`. overlay.ts (das aus cleanup.ts importiert) registrierte Elements in einem WeakSet, dom-runtime.ts internes Code in einem anderen. MutationObserver für automatischen Cleanup beim DOM-Removal arbeitete pro Welt isoliert → Cleanup konnte je nach Pfad ausgelassen werden (Memory Leak / hängende Listener).

3. **`_evaluateVisibilityCondition`** in dom-runtime.ts war deutlich sophisticated-er als die Version in data-binding.ts (Reserved-Words-Set + Bare-Identifier-Handling für Conditions wie `loggedIn`, `count > 0`, etc.). data-binding.ts version handhabte nur `$variable`-prefixed Conditions. state-machine.ts (das `notifyDataChange` aus data-binding.ts importiert) bekam die schwächere Version → visibility-conditions mit bare identifiers wären beim state-change re-evaluation ggf. immer als false ausgewertet worden. **Vor Konsolidierung sophisticated Version nach data-binding.ts portiert**, dann Re-Export aktiviert. Sonst wäre dom-runtime.ts auf die schwächere Version regressiert.

**Inline-Fixes Schritt B:**

- **D-058a [erledigt inline]** `compiler/runtime/dom-runtime.ts`: `import { batchInFrame } from './batching'`. Lokale `batchInFrame`-Funktion + `_insideFrameCallback`-Variable entfernt (~25 Zeilen). 4 interne Aufrufer bleiben transparent.
- **D-058b [erledigt inline]** `compiler/runtime/dom-runtime.ts`: `import { show, hide } from './visibility'` + `export { show, hide }`. Lokale `show`/`hide` Funktionen entfernt (~30 Zeilen). 4 interne Aufrufer bleiben transparent.
- **D-058c [erledigt inline]** `compiler/runtime/dom-runtime.ts`: `import { registerForCleanup, cleanupElement, initCleanupObserver } from './cleanup'` + `export { … }`. Lokale `_elementsWithDocListeners` WeakSet, `_cleanupObserver`-State, `cleanupElement`/`registerForCleanup`/`initCleanupObserver`-Funktionen entfernt (~95 Zeilen). 2 interne Aufrufer bleiben transparent.
- **D-058d [erledigt inline]** Sophisticated `_evaluateVisibilityCondition` (Reserved + Bare Identifier) nach `compiler/runtime/data-binding.ts` portiert. Dann `compiler/runtime/dom-runtime.ts`: `import { bindValue, bindText, bindVisibility, unbindValue, notifyDataChange } from './data-binding'` + `export { … }`. Lokale Funktionen + `_valueBindings`/`_textBindings`/`_visibilityBindings` Maps + lokale visibility-eval entfernt (~190 Zeilen). 1 interner Aufrufer + 2 Object-Literal-Exposures bleiben transparent.

**Tests:** 6298 runtime+compiler Tests grün, 10957 Studio-Tests grün (1 Pre-Existing Drift-Failure in `tests/studio/edit-prompts.test.ts` — Inline-Snapshot wurde nicht mit aktualisiert als jemand neue Token/Component-Pflicht-Regeln in `studio/agent/edit-prompts.ts` einfügte; **nicht von dieser Konsolidierung verursacht**, gehört zu Studio/AI-Sprint).

**Build:** grün.

**Datei-Bilanz:** dom-runtime.ts ~340 Zeilen weg (Duplikate entfernt); data-binding.ts ~25 Zeilen Sophistication zugewachsen. Netto -315 Zeilen.

**Bedeutung:** Die 4 lebenden Module sind jetzt echte Single-Source-of-Truth. Bug-Fixes laufen einmalig durch eine Datei. Drei latente Verhaltens-Bugs (Frame-State-Drift, Cleanup-WeakSet-Drift, Visibility-Eval-Drift) sind fundamental aufgelöst, weil State und Implementierung jetzt geteilt werden.

**Status nach Schritt B:** Plan `docs/plans/runtime-consolidation.md` Schritt A + B durch. Schritt C (dom-runtime-string.ts via Build aus den TS-Modulen erzeugen) ist separater größerer Sprint und nicht jetzt anzugehen.

---

## 2026-05-01 — D-059: dom-runtime.ts dead-code sweep (post-Schritt-B)

**Scope:** Nachdem Schritt B (D-058) die 4 lebenden Module konsolidiert hat, hatte dom-runtime.ts trotzdem noch viele Funktionen, die parallele Implementierungen anderer TS-Module sind und keinen Konsumenten haben. Ziel: tote Exports identifizieren und entfernen.

**Wichtige Erkenntnis aus der Konsumenten-Analyse:**

`compiler/runtime/dom-runtime.ts` hat **keine Studio-Konsumenten** und wird von **compiler/backends/\* nicht direkt importiert**. Einzige direkte Importe:

- 6 Test-Files (`tests/integration/builtin-*.test.ts`, `tests/compiler/{crud-aggressive,two-way-binding-extended}.test.ts`)
- Innerhalb `compiler/runtime/` selbst (transitive)

Heißt: dom-runtime.ts ist de-facto **eine Test-Fixture**, kein Production-Runtime. Production-Runtime ist `dom-runtime-string.ts` (wird in compiled Bundles eingebettet) plus Pure-Mirror-Studio-Preview (rendert via Studio-eigenem renderer.ts, nicht via dom-runtime.ts).

Die 4400 Zeilen dom-runtime.ts existieren primär, weil Tests gegen einen TS-importierbaren Layer laufen. Vieles davon ist vermutlich nie zu dieser End-Bestimmung gekommen.

**Inline-Fixes Sweep 1 (heute):**

- **D-059a [erledigt inline]** Form-Keyboard-Navigation komplett entfernt: `getFormFocusables` (private), `focusNextInput`, `focusPrevInput`, `setupFormNavigation`, `setupAutoSelect` (146 Z.). 0 Konsumenten überall, exact-name-grep liefert 0 Treffer in tests/studio/backends.
- **D-059b [erledigt inline]** Timer-Funktionen: `delay`, `cancelDelay`, `debounce` (~36 Z.). 0 Konsumenten von dom-runtime.ts; CLI-Watch und Studio-Validator haben jeweils EIGENE inline-`debounce`-Funktionen.
- **D-059c [erledigt inline]** Toter `runtime` Object-Literal-Export (108 Z.) + `export default runtime` (1 Z.). Kein einziger Konsument. War „for compatibility" laut Kommentar — diese Compatibility wurde nie gebraucht.
- **D-059d [erledigt inline]** Motion-One-Subsystem: `motionAnimate`, `getMotionPreset`, `MotionConfig` interface, `MOTION_PRESETS` Map (~110 Z.) plus `import { animate as motionAnimateFn } from 'motion'` (1 Z.). 0 Konsumenten; Animations werden tatsächlich via `compiler/runtime/animations.ts` (von state-machine.ts genutzt) oder via DOM Web Animations API (`el.animate(...)`) ausgeführt.

**Datei-Bilanz:** dom-runtime.ts 4401 → 4269 Zeilen in dieser Sweep, **132 Z. weg**. Plus die ~340 Z. aus D-058 → insgesamt ~470 Z. dom-runtime.ts-Cleanup heute.

**Tests:** 6784 deterministische Tests grün (runtime+integration+e2e+compiler). Build grün. Einzige Failures: 105 in `tests/compiler/validation-sweep.test.ts` — **pre-existing baseline-Failures** (Baseline-Verifikation: mit `git stash` ohne meine Änderungen zeigt dasselbe Failure-Pattern). Plus pre-existing edit-prompts snapshot-Drift in Studio.

**Bedeutung:** dom-runtime.ts hat noch ~85 weitere Funktionen, von denen viele plausibel auch tot sind (`alignToCSS`/`getAlign` cascade, `loadYAMLFile`/`Files`/`MirrorData` chain, `registerAnimation`/`getAnimation`/`animate` chain ~150 Z., `playStateAnimation`/`setupEnterExitObserver`/`setupEditable`, `refreshAllEachLoops`, `setReadFileCallback`, etc.). Diese erfordern aber tiefer-gehende Trace-Analyse vor Löschung (manche callen sich gegenseitig oder werden indirekt via tests verwendet). Dieser Sweep-1-Pass war konservativ — die offensichtlichsten 0-Konsumenten-0-Internal-Calls-Funktionen.

**Nächster Schritt:** Sweep 2 — vertieft Trace-Analyse für die restlichen Kandidaten. Plus die Erkenntnis, dass dom-runtime.ts eine Test-Fixture ist, gibt strategische Optionen: könnte vielleicht radikal verkleinert werden auf nur die Funktionen die Tests wirklich exerzieren.

---

## 2026-05-01 — D-060: dom-runtime.ts Sweep 2 — massive Single-Source-Konsolidierung

**Scope:** Sweep 1 (D-059) hat dom-runtime.ts auf 4269 Z. reduziert. Sweep 2 zielt auf die größeren Subsysteme, die parallel als TS-Module existieren (selection.ts, navigation.ts, icons.ts, toast.ts, input-control.ts, alignment.ts, element-wrapper.ts, component-navigation.ts).

**Erkenntnis:** Viele dieser TS-Module hatten 0 Importeure ausserhalb sich selbst — sie waren orphan-Schatten der dom-runtime.ts-Versionen. Statt sie zu löschen, ist die nachhaltigere Lösung sie zur Single-Source zu machen und dom-runtime.ts auf Re-Exports umzubauen.

**Real behavioral bugs gefunden + gefixt:**

- **icons.ts** hatte hardcoded `stroke-width: '2'` während dom-runtime.ts `el.dataset.iconWeight` (das `iw`-Property) auswertet. Real Bug: das DSL-Property `iw` wurde von der canonical-Version ignoriert. **Fix:** `applyFillMode` nimmt jetzt `strokeWidth` als Parameter, applyIconToElement reicht `el.dataset.iconWeight || '2'` durch.
- **input-control.ts** `setError`/`clearError` haben `applyState(el, 'invalid')`/`removeState(el, 'invalid')` NICHT gerufen, dom-runtime.ts schon. Real Bug: Input-Error-States haben keine state-machine-Update bekommen. **Fix:** `applyState`/`removeState`-Calls in `applyErrorState`/`removeErrorState` in input-control.ts ergänzt.
- **selection.ts** `updateSelectionBinding` walkt ALLE parent-Elemente und aktualisiert TriggerText, dom-runtime.ts version returnt nach erstem Hit. **Bonus** (besseres Verhalten): selection.ts version bleibt als Single Source.
- **selection.ts** `highlightNext`/`highlightPrev` unterstützen `loop-focus` (Wrap-around am Ende). dom-runtime.ts version hatte simple-clamp. **Bonus:** selection.ts gewinnt Loop-Focus-Support.

**Konsolidierungen (alle als Re-Exports von canonical TS-Modulen):**

- **D-060a** Alignment + ElementWrapper: `alignToCSS`, `getAlign`, `wrap`, `ALIGN_MAP`/`REVERSE_ALIGN_MAP`/`VERT_ALIGN_MAP` (~225 Z.) → re-exported aus `alignment.ts` + `element-wrapper.ts`.
- **D-060b** Component Navigation: `navigate`, `updateNavSelection`, `navigateToPage`, `getPageContainer`, `sanitizePageName`, `validateCompiledCode`, `executeCompiledCode` (~240 Z.) → re-exported aus `component-navigation.ts`.
- **D-060c** CSS Security: `isAllowedCSSProperty`, `sanitizeCSSValue`, `ALLOWED_CSS_PROPERTIES` (~265 Z.) → komplett gelöscht (waren nur von der ebenfalls gelöschten `wrap`-Funktion benutzt; canonical existiert in `security.ts`).
- **D-060d** Icons + Icon Security: `registerIcon`, `loadIcon`, `preloadIcons`, `buildSvgFromPath`, `sanitizeIconName`, `sanitizeSVG`, `fetchIcon` plus iconCache/Maps/Constants (~245 Z.) → re-exported aus `icons.ts` (mit oben dokumentiertem `iw`-Bug-Fix).
- **D-060e** Toast: `toast`, `dismissToast` plus Position/Style-Maps (~140 Z.) → re-exported aus `toast.ts`.
- **D-060f** Input Control: `focus`, `blur`, `clear`, `selectText`, `setError`, `clearError` (~115 Z.) → re-exported aus `input-control.ts` (mit oben dokumentiertem state-machine-Bug-Fix).
- **D-060g** Browser Navigation: `back`, `forward`, `openUrl` plus URL-Validation (~50 Z.) → re-exported aus `navigation.ts`.
- **D-060h** Selection + Highlighting + Activation + SelectionBinding: `select`, `deselect`, `selectHighlighted`, `highlight`, `unhighlight`, `highlightNext`, `highlightPrev`, `highlightFirst`, `highlightLast`, `getHighlightableItems`, `activate`, `deactivate`, `updateSelectionBinding`, `updateBoundElements` (~205 Z.) → re-exported aus `selection.ts` (mit oben dokumentierten Bonus-Features Loop-Focus + TriggerText).

**Datei-Bilanz:** dom-runtime.ts 4269 → 2534 Z., **1735 Z. weg in Sweep 2** (zusätzlich zu Sweep 1). Total D-058+D-059+D-060: 5037 → 2534 Z., **-2503 Z. (-50%)**.

**Tests:** 338 deterministische Tests grün (runtime+integration+e2e). Pre-existing failures (validation-sweep, edit-prompts snapshot, states-coverage `isDevicePreset` Parser-Bug) sind nicht durch diese Änderungen verursacht — Baseline-Verifikation per `git stash` zeigt dieselben Failures.

**Bedeutung:** dom-runtime.ts ist jetzt mehrheitlich ein Re-Export-Hub für die canonical TS-Module unter compiler/runtime/. Die noch in dom-runtime.ts verbliebenen ~85 Funktionen (state-machine, data, animations, charts, scroll, overlays, get/set/increment, refreshEachLoops, etc.) haben großteils auch canonical-Module-Pendants — können in weiteren Sweeps konsolidiert werden. Alle real-behavioral bugs aus Divergenzen wurden FIRST gefixt, BEFORE consolidation, um keine Regressions einzuführen.

---

## 2026-05-01 — D-061 → D-064: dom-runtime.ts Sweep 3 — Animations / Charts / State-Machine

**Scope:** Direkter Anschluss an D-060. Nimmt die mittelgroßen bis grossen Blöcke an (Animations 188 Z., Charts 303 Z., State-Machine 526 Z.) plus dead-code (`destroy()` 20 Z.). Datei-Bilanz: dom-runtime.ts 2534 → 1497 Z. (-1037 Z., -41%) plus chart-runtime.ts (320 Z. orphan) komplett gelöscht.

**Real behavioral bugs gefunden + gefixt:**

- **animations.ts** `playStateAnimation` mit unknown-preset hat synchrones `applyStylesImmediate` + `resolve` gemacht, dom-runtime.ts version hat zu CSS-Transition fall-through gemacht (graceful degradation). **Fix:** `playPresetAnimation` → `tryPlayPresetAnimation` mit boolean return; `playStateAnimation` ruft nur dann fall-through wenn return-false. animations.ts gewinnt graceful-degradation.

**Konsolidierungen (alle als `import { ... } from './canonical'` + separate `export { ... }` wegen TS-Scope-Regeln, nicht Single-Statement Re-Export):**

- **D-061** Dead Code: `destroy()` (20 Z.) — 0 Konsumenten, 1-of-4-listener-Bug bekannt (cleanup.ts MutationObserver macht Auto-Cleanup), gelöscht. Plus stale JSDoc in `compiler/backends/framework.ts` aktualisiert (`destroy()` aus emitter-comment entfernt).
- **D-062** Animations: `StateAnimation`-Type, `playStateAnimation`, `setupEnterExitObserver` (188 Z.) → re-exported aus `animations.ts`. ANIMATION_PRESETS-Konstante (10 Presets) war identisch in beiden — dedupliziert. Plus oben dokumentierter graceful-fallback-Fix in canonical.
- **D-063** Charts: `ChartConfig`-Type, `ChartSlotConfig`-Type, `createChart`, `updateChart`, `parseChartData` (303 Z.) → re-exported aus `charts.ts`. ChartJSConstructor/ChartJSInstance-Type-Declarations + Window.Chart-Augmentation aus dom-runtime.ts entfernt (charts.ts deckt sie). Plus `chart-runtime.ts` (320 Z., 0 Importeure, älterer Shadow von charts.ts) komplett gelöscht.
- **D-064** State-Machine + State-Management: `applyState`, `removeState`, `setState`, `toggleState`, `stateMachineToggle`, `transitionTo`, `exclusiveTransition`, `watchStates`, `updateVisibility` (526 Z. über zwei Blöcke) → re-exported aus `state-machine.ts`. state-machine.ts war orphan (0 Importeure aussen) und ist saubere Refactor mit privaten Helfern (`storeBaseStyles`, `applyTransition`, `findSiblings`, `findLoopItem`, `evaluateToken`, `buildStateContext`, `evaluateChildVisibility`, `hasLogicalOperators`, etc.) — same behavior, lesbarer.

**Wichtige Erkenntnis aus D-064:** Alte Comments in dom-runtime.ts haben gewarnt "MUST NOT re-export `transitionTo`, `exclusiveTransition`, `watchStates`, `updateVisibility` from state-machine.ts because of duplicate-export errors during ssr-transform". Diese Sorge ist nach Vollkonsolidierung NICHT MEHR ZUTREFFEND — `npx tsc --noEmit` läuft sauber, alle 338 deterministischen Tests grün. Aber die TS-Scope-Regel war zu beachten: `export { x } from './y'` macht `x` NICHT im aktuellen Modul-Scope verfügbar — wenn lokale Refs via shorthand-property-syntax bestehen (z.B. `initTestAPI({ transitionTo, ... })`), MUSS man `import { transitionTo }` + separater `export { transitionTo }` schreiben. Dieses Pattern wurde überall durchgezogen.

**Datei-Bilanz Total D-058 → D-064:** dom-runtime.ts 5037 → 1497 Z., **-3540 Z. (-70%)**. Plus chart-runtime.ts (320 Z.) ganz weg.

**Tests:** 338 deterministische Tests grün (runtime+integration+e2e). 0 TS-Errors. Pre-existing test-failures (validation-sweep, edit-prompts snapshot, states-coverage `isDevicePreset` Parser-Bug) sind unverändert.

**Bedeutung:** dom-runtime.ts ist jetzt zu ~70% Re-Export-Hub. Verbleibende Hauptblöcke: OVERLAYS (~430 Z.), CRUD (~395 Z.), VALUE FUNCTIONS Counter/Tokens (~130 Z.), SCROLL (~75 Z.), CLIPBOARD (~60 Z.), VISIBILITY & TOGGLE (~50 Z.), TYPES (~100 Z. MirrorElement-Interface). OVERLAYS hat overlay.ts als Pendant; CRUD hat data.ts. SCROLL/CLIPBOARD haben aktuell keine canonical-Module (wurden in earlier sweep gelöscht) — könnten extrahiert oder in dom-runtime.ts belassen werden.

---

## 2026-05-01 — D-065 → D-066: dom-runtime.ts Sweep 4 — CRUD + Overlays

**Scope:** Schließt die zwei größten verbliebenen Subsysteme: VALUE FUNCTIONS + CRUD (528 Z.) und OVERLAYS + OVERLAY HANDLERS (481 Z.). Datei-Bilanz: dom-runtime.ts 1497 → 553 Z. (-944 Z., -63%).

**Real behavioral bugs gefunden + gefixt:**

- **data.ts** `increment` checked nur `max`, `decrement` checked nur `min`. dom-runtime.ts `adjustCounter` checkt **beide** bounds für beide Operationen (Bound-Invariant: `min <= value <= max` immer enforciert, egal ob hochgezählt oder runtergezählt wird). Real Bug-Szenario: `state[counter]=0; increment(counter, {min:5})` → dom-runtime.ts: `5` (clamped to min), data.ts: `1` (Invariant verletzt). **Fix:** `adjustCounter` in data.ts eingeführt mit beiden Bound-Checks; `increment`/`decrement` rufen `adjustCounter(name, +1)`/`adjustCounter(name, -1)`.
- **overlay.ts** `getElementRect` restored `display='none'` zu aggressiv. dom-runtime.ts hatte zwei verschiedene Verhaltensweisen: (a) `calculateOverlayPosition` measure-then-restore-fully (display zurück), (b) `showAt 'center'` und `showModal` measure-and-stay-visible (display='' bleibt sync gesetzt). Im overlay.ts-Refactor wurde alles zu (a) vereinheitlicht — broke synchrone Tests die `display !== 'none'` direkt nach `showModal()` erwarten (weil `show()` via `batchInFrame` deferred). **Fix:** zweiter Helper `getElementRectAndShow(el)` der `display=''` und `hidden=false` BEHÄLT nach Messung; `positionAsCenter` und `showModal` verwenden den jetzt. `calculateOverlayPosition` bleibt bei `getElementRect` (correct semantics für trigger-relative).

**Konsolidierungen:**

- **D-065** Value Functions + CRUD: `CounterOptions`-Type, `get`, `set`, `increment`, `decrement`, `reset`, `add`, `remove`, `create`, `save`, `deleteItem`, `revert`, `updateField`, `setupEditable`, `refreshEachLoops`, `refreshAllEachLoops` (528 Z. über zwei Blöcke) → re-exported aus `data.ts`. Plus interne Helfer (`getMirrorData`, `getMirrorState`, `adjustCounter`, `updateBoundTokenElements`, `generateEntryId`, `findCollectionByKey`, `setNestedField`) komplett deletet — alle sind in data.ts. Plus die `declare global { interface Window { _mirrorState; __mirrorData } }` aus dom-runtime.ts entfernt — data.ts hat eigene declaration die merged.
- **D-066** Overlays + Overlay Handlers: `OverlayPosition`-Type, `PositionOptions`-Type, `showAt`, `showBelow`, `showAbove`, `showLeft`, `showRight`, `showModal`, `dismiss` (481 Z. über zwei Blöcke) → re-exported aus `overlay.ts`. overlay.ts hat saubere Refactor mit privaten Helfern (`getElementRect`, `getViewport`, `positionBelow/Above/Left/Right/Center`, `clampToViewport`, `setupClickOutsideHandler`, `cleanupClickOutside`/`cleanupFocusTrap`/`cleanupEscapeHandler`/`restorePreviousFocus`, `getOrCreateBackdrop`, `setupFocusTrap`, `setupFallbackEscapeHandler`, `findInitialFocus`). Plus oben dokumentierter `getElementRectAndShow`-Helper als Behavior-Fix.

**Datei-Bilanz Total D-058 → D-066:** dom-runtime.ts 5037 → 553 Z., **-4484 Z. (-89%)**. Plus chart-runtime.ts (320 Z.) ganz weg.

**Tests:** 338 deterministische Tests grün (runtime+integration+e2e). 0 TS-Errors. Pre-existing test-failures (validation-sweep, edit-prompts snapshot, states-coverage `isDevicePreset` Parser-Bug) sind unverändert.

**Verbleibend in dom-runtime.ts (~553 Z.):** TYPES (`MirrorElement`-Interface, `PROP_MAP`, ~100 Z.), VISIBILITY & TOGGLE (`toggle`/`close` lokal — kein direktes canonical-Pendant, ~50 Z.), ELEMENT RESOLUTION (`resolveElementByName` ~20 Z., wird noch von SCROLL block genutzt), SCROLL FUNCTIONS (`scrollTo`/`scrollBy`/`scrollToTop`/`scrollToBottom` ~75 Z., scroll.ts wurde in earlier sweep gelöscht), CLIPBOARD (`copy` ~60 Z., clipboard.ts gelöscht), TEST API initializer (`initTestAPI`-Wrapper ~40 Z.), plus alle ~15 Re-Export-Blöcke (~150 Z. inkl. headers).

**Bedeutung:** dom-runtime.ts ist nahezu vollständig dekonsolidiert. Die verbleibenden Blöcke (SCROLL, CLIPBOARD, VISIBILITY & TOGGLE) haben keine canonical-Module (wurden in earlier sweeps gelöscht). Strategische Optionen: (a) als-ist belassen — diese Blöcke sind klein und isoliert, kein Duplikat-Risiko mehr; (b) extrahieren zu neuen TS-Modulen `scroll-runtime.ts`/`clipboard-runtime.ts`/`visibility-toggle.ts` falls wir die "alle runtime in TS-Module" Architektur strikt durchziehen wollen. Per `feedback_iterative_micro_steps.md` und Pragmatismus: Variante (a) ist solide.
