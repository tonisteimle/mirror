# Runtime-Konsolidierung — D-051 Detailplan

**Status:** Inventur abgeschlossen 2026-05-01. **Schritt A erledigt** (4 tote Module gelöscht, D-057). **Schritt B erledigt** (4 lebende Module zur Single-Source-of-Truth konsolidiert, D-058). Schritt C (dom-runtime-string.ts via Build) als separater Sprint später.
**Eigentümer:** Toni (Auftraggeber), Claude (Ausführung)
**Ausgewählte Variante:** **(a) Single-Source-of-Truth — TS-Module sind Wahrheit**
**Begründung:** nachhaltig, kein Drift-Risiko, jeder Bug nur einmal zu fixen.

---

## Ausgangslage

`compiler/runtime/` hat heute **drei parallele Implementierungs-Universen** für teilweise denselben Code:

1. **dom-runtime.ts** (5037 Z., 144 KB) — TypeScript-Monolith mit 115 Exports. Wird im Studio-Preview-iframe geladen (`studio/preview/*`) und in Tests direkt importiert.
2. **dom-runtime-string.ts** (2261 Z., 77 KB) — Template-Literal mit `_runtime`-Objekt. Wird in **kompilierte DOM-Bundles** eingebettet (Production-Output für Endkunden).
3. **Extrahierte TS-Module** (scroll.ts, timer.ts, batching.ts, cleanup.ts, data-binding.ts, form-navigation.ts, visibility.ts, clipboard.ts) — sollten Refactoring-Schritt 1 sein, wurde aber nie zu Ende geführt.

Erkenntnis aus der Inventur: Universe 3 ist **größtenteils tot**.

---

## Inventur-Ergebnisse (2026-05-01)

### Importeure-Map der extrahierten Module

| Modul              | Zeilen | Importeure | Status                                      |
| ------------------ | ------ | ---------- | ------------------------------------------- |
| scroll.ts          | 81     | **0**      | tot — komplett unverwendet                  |
| timer.ts           | 45     | **0**      | tot — komplett unverwendet                  |
| form-navigation.ts | 132    | **0**      | tot — komplett unverwendet                  |
| clipboard.ts       | 88     | **0**      | tot — komplett unverwendet                  |
| batching.ts        | 32     | 2          | aktiv — `state-machine.ts`, `visibility.ts` |
| cleanup.ts         | 95     | 1          | aktiv — `overlay.ts`                        |
| data-binding.ts    | 169    | 1          | aktiv — `state-machine.ts`                  |
| visibility.ts      | 21     | 2          | aktiv — `overlay.ts`, `test-api/index.ts`   |

`compiler/runtime/index.ts` re-exportiert NUR `mirror-runtime` und `markdown` — keine der oben genannten Module. D.h. die Module sind nicht via Barrel exposed; ihre einzigen Konsumenten sind die direkt aufgelisteten Files.

### Duplikate dom-runtime.ts ↔ extrahierte Module

In dom-runtime.ts ist jede einzelne Funktion der oben gelisteten 8 Module **dupliziert vorhanden** (insgesamt 28 Funktionen):

| Modul              | Funktionen                                                           | Position in dom-runtime.ts |
| ------------------ | -------------------------------------------------------------------- | -------------------------- |
| scroll.ts          | scrollTo, scrollBy, scrollToTop, scrollToBottom                      | Z. 1216–1273               |
| timer.ts           | delay, cancelDelay, debounce                                         | Z. 2208–2240               |
| batching.ts        | isInsideFrame, setFrameState, batchInFrame                           | (eingebettet)              |
| cleanup.ts         | registerForCleanup, cleanupElement, initCleanupObserver              | Z. 142–230                 |
| data-binding.ts    | bindValue, bindText, bindVisibility, unbindValue, notifyDataChange   | Z. 4410–4607               |
| form-navigation.ts | focusNextInput, focusPrevInput, setupFormNavigation, setupAutoSelect | Z. 1033–1185               |
| visibility.ts      | show, hide                                                           | Z. 525–545                 |
| clipboard.ts       | copy                                                                 | Z. 2005                    |

**Drift-Check** (Stichprobe 2026-05-01): scrollTo/scrollBy/scrollToTop/scrollToBottom + delay/cancelDelay/debounce sind funktional **identisch** zwischen Modul und dom-runtime.ts — nur kleine kosmetische Unterschiede (private Helper-Naming, JSDoc-Detail).

**Risiko bisher unentdeckt:** sobald ein Bug-Fix nur auf einer Seite landet, divergieren die Implementierungen — und der lebende Konsument (z.B. overlay.ts → cleanup.ts) und der Window-Global-Konsument (generated DOM → dom-runtime.ts) verhalten sich unterschiedlich.

---

## Strategie: Variante (a) in 4 Schritten

### Schritt A — Tote Schatten-Module löschen ✅ erledigt 2026-05-01

**Sicher und sofort.** Die 4 nicht-konsumierten Module sind reine Verwirrungsquelle.

- [x] `compiler/runtime/scroll.ts` gelöscht (81 Z.) — 0 Konsumenten, identisch zu dom-runtime.ts
- [x] `compiler/runtime/timer.ts` gelöscht (45 Z.) — 0 Konsumenten, identisch zu dom-runtime.ts
- [x] `compiler/runtime/form-navigation.ts` gelöscht (132 Z.) — 0 Konsumenten, log-equivalent zu dom-runtime.ts (Modul nutzt Helper-Funktionen, dom-runtime.ts inlined)
- [x] `compiler/runtime/clipboard.ts` gelöscht (88 Z.) — 0 Konsumenten, log-equivalent zu dom-runtime.ts (Modul nutzt Helper-Funktionen, dom-runtime.ts inlined)
- [x] Tests grün (10958 passed)
- [x] Build grün
- [x] Plan + Review-Log Update (D-057)

**Tatsächlicher Umfang:** 346 Zeilen weg, 0 Verhaltens-Risiko.

### Schritt B — Lebende Module zur Single-Source machen

Die 4 **lebenden** Module (batching, cleanup, data-binding, visibility) haben echte Konsumenten und enthalten Funktionen, die ALSO in dom-runtime.ts dupliziert vorliegen. Hier ist die echte Drift-Gefahr.

**Pro Modul iterativ:**

1. In dom-runtime.ts die duplizierten Funktionen ersetzen durch `export { … } from './<modul>'` (Re-Export).
2. Window-Globals + Generated-DOM-Code-Pfade laufen weiter über dom-runtime.ts — aber dom-runtime.ts ist jetzt nur noch dünne Brücke zum Modul.
3. Tests grün + Studio-Preview-Check (manuell).
4. Wenn stabil: nächstes Modul.

**Reihenfolge:** batching zuerst (Fundament für visibility), dann visibility, cleanup, data-binding.

- [x] **batching** (3 Funktionen, fundament) — 2026-05-01: dom-runtime.ts hatte eigene `_insideFrameCallback` Module-Variable + eigene `batchInFrame`-Funktion. **Echter Verhaltens-Bug konsolidiert** (state-machine/visibility/dom-runtime tracken jetzt denselben Frame-State). 10958 Tests grün, Build grün.
- [x] **visibility** (2 Funktionen) — 2026-05-01: dom-runtime.ts importiert nun `show`/`hide` aus `visibility.ts` und re-exportiert sie. Lokale Definitionen entfernt. 10958 Tests grün, Build grün.
- [x] **cleanup** (3 Funktionen) — 2026-05-01: dom-runtime.ts hatte eigene `_elementsWithDocListeners` WeakSet + eigenen `_cleanupObserver`. **Zweiter echter Verhaltens-Bug konsolidiert** (cleanup-Observer ist jetzt einer geteilter, statt zweier konkurrierender). 6298 runtime+compiler Tests grün, Build grün.
- [x] **data-binding** (5 Funktionen) — 2026-05-01: vor Migration wichtig: `_evaluateVisibilityCondition` in dom-runtime.ts war sophisticated-er (reserved words + bare identifier handling), in data-binding.ts nur `$variable`. Sophisticated Version zuerst nach data-binding.ts portiert, **dann** Re-Export aktiviert. Verhindert visibility-condition-Regress. Tests grün.

Nach Schritt B sind alle 4 lebenden Module die Single-Source-of-Truth. **Drei echte Verhaltens-Bugs konsolidiert** (separate Frame-State, separate Cleanup-WeakSet, sophistication-Drift in visibility-eval).

**Alternative wenn Re-Export problematisch:** dom-runtime.ts entfernt die Funktion komplett, und alle externen Konsumenten (Studio-Preview, Tests) werden direkt auf das Modul umgestellt. Höheres Refactor-Risiko, aber sauberer.

### Schritt C — dom-runtime-string.ts (separat, größerer Sprint)

**Inventur 2026-05-01:** dom-runtime-string.ts exportiert ein `_runtime`-Objekt mit **117 Methoden/Properties**. Vergleich mit den TS-Modulen (visibility, batching, cleanup, data-binding plus dom-runtime.ts):

| Kategorie                          | Anzahl | Bedeutung                                                                                                                                                                                                     |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Common (in beiden Welten)          | 81     | Echte Duplikate, Drift-Risiko                                                                                                                                                                                 |
| Nur in String-Runtime (öffentlich) | 8      | exclusive, registerToken, watchToken, setupKeyboardNav, tableNext/Prev/Sort, updateTriggerText                                                                                                                |
| Nur in TS-Welt (öffentlich)        | ~40    | Großteil sind private Helper im String (`_alignToCSS` für `alignToCSS` etc.) oder TS-only Build-Time-Utilities (markdown, YAML, charts) oder externe-Libs-Features (`motionAnimate` braucht `motion`-Library) |

**Konsumption:** `compiler/backends/dom*.ts` Files emittieren `_runtime.X(...)` Calls direkt im generierten Bundle (40+ Aufrufstellen in `compiler/backends/dom/event-emitter.ts` allein).

**Architektonische Hürden:**

- dom-runtime.ts importiert externe Libs (`motion`, `focus-trap`); das String-Runtime macht das nicht (kompilierte Bundles haben diese Libs nicht).
- Ein simpler `esbuild → IIFE` würde die externen Deps mit-bundeln und Bundle-Größe explodieren lassen.
- Architektur müsste trennen: **dependency-free Core-Utilities** (sharable zwischen beiden Welten) vs. **richer Studio-Preview-Features** (mit Libs).

**Optionen:**

- **(C1) Build-Step:** TS-Core-Module → IIFE-String. Erfordert: (1) esbuild-Konfig + neuer Entry-File mit Adapter-Schicht (`_runtime.show = show` etc.); (2) Trennung von dependency-free Core und richer Studio-Preview-Features in der TS-Welt; (3) Sicherstellung dass alle 81 common methods durch Build erzeugt werden; (4) Vollständiger Round-Trip-Test (kompilieren → ausführen → vergleichen mit aktuellem String). **Realistisch: 1-2 Tage konzentrierte Arbeit.**
- **(C2) Drift-Detector:** Test-Tool, das pro common-method-Paar grob Implementation-Likeness misst (z.B. AST-Diff oder einfacher Token-Diff). Heilt nicht das Problem, aber alarmiert vor Drift. ~2-3 Stunden.
- **(C3) Pragmatisch akzeptieren:** Status quo, Schritt B reduziert Drift-Risiko innerhalb der TS-Welt deutlich, String-Runtime bleibt eigenständig. **Drift zur String-Welt bleibt, ist aber in Schritt-B-Doku festgehalten.**

**Empfehlung:** C1 ist der nachhaltigste Weg, aber zu groß für End-of-Session-Iteration. Diesen Sprint dediziert + mit Toni-Alignment angehen.

### Schritt D — Restliche dom-runtime.ts (87 nicht-modulare Funktionen)

Nach Schritt B ist dom-runtime.ts immer noch ~4500 Z. mit ~87 nicht-modularen Funktionen. Diese sind **kein Duplikat** zu Modulen — sie leben nur in dom-runtime.ts. Hier kein Drift-Risiko, kein dringender Handlungsbedarf. Falls man modularer will: optionaler Refactor in eigenen Sprints.

---

## Erfolgs-Kriterien für Variante (a)

- Single-Source-of-Truth pro Funktion: **Bug-Fix nur einmal nötig**.
- Kein Schatten-Code ohne Konsumenten.
- Test-Suite weiterhin grün (10958 passed).
- Studio-Preview funktioniert unverändert (manuelle Verifikation).
- Compile-Output (DOM-Bundles) weiterhin lauffähig.

---

## Risiken & Mitigationen

| Risiko                                                                                                 | Mitigation                                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Re-Export bricht Window-Global-Pfad (compiler/backends/dom\*.ts emittiert `_runtime.scrollTo(…)` o.ä.) | Vor Schritt B: prüfen ob backend-emittierter Code dom-runtime.ts via Window-Global oder via Import konsumiert                  |
| Studio-Preview lädt dom-runtime.ts via iframe-Script-Tag                                               | Build-Output prüfen: enthält iframe-Bundle die Modul-Funktionen nach Re-Export? Falls nicht → bundling-Konfig anpassen         |
| Tote Module hatten doch noch Bug-Fix-Drift                                                             | Stichprobe-Diff vor Löschung gemacht (timer.ts, scroll.ts identisch) — sollte ergänzt werden für form-navigation und clipboard |

---

## Status-Tracking

- [x] Inventur (2026-05-01) — Importeure-Map + Duplikate dokumentiert
- [x] **Schritt A (2026-05-01)** — 4 tote Module gelöscht: scroll.ts, timer.ts, form-navigation.ts, clipboard.ts. -346 Zeilen. 10958 Tests grün, Build grün. D-057 dokumentiert.
- [x] **Schritt B (2026-05-01)** — 4 lebende Module konsolidiert (batching, visibility, cleanup, data-binding). dom-runtime.ts importiert + re-exportiert die Modul-Versionen statt eigener Duplikate. **3 echte Verhaltens-Bugs konsolidiert** (separate `_insideFrameCallback`, separate `_elementsWithDocListeners`, sophisticated visibility-eval-Drift). ~340 Zeilen Duplikat in dom-runtime.ts entfernt. D-058 dokumentiert. Tests + Build grün.
- [ ] Schritt C — dom-runtime-string.ts via Build (separater Sprint)
- [ ] Schritt D — optional, bleibt offen
