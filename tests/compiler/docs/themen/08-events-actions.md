# Thema 8: Events & Actions

**Status:** Iteration 1 abgeschlossen (2026-04-25).

**Ergebnis:** 25 Tests, **0 Bugs gefunden** (Pipeline robust), event-emitter
von 43.5% → **55.33% Lines (+11.8 pp)**. Ziel ≥80% wurde nicht erreicht —
verbleibende Lücken sind in `emitRuntimeAction` (Show-Varianten showAt/
Below/Above/Left/Right, animate, position, scroll-by, sämtliche CRUD-
Actions: add/remove/create/save/delete/revert). Diese werden in einer
Folge-Iteration angegangen, falls Bedarf.

## 1. Scope

**Im Scope:**

- **18 Events** (laut CLAUDE.md): `onclick`, `onhover`, `onfocus`, `onblur`,
  `onchange`, `oninput`, `onkeydown`, `onkeyup`, `onclick-outside`, `onload`,
  `onviewenter`, `onviewexit`, plus key-shortcuts `onenter`, `onkeyenter`,
  `onkeyescape`, `onkeyspace`, `onescape`, `onspace`.
- **38 Actions**: `show`, `hide`, `toggle`, `open`, `close`, `select`,
  `highlight`, `activate`, `deactivate`, `page`, `call`, `assign`, `focus`,
  `blur`, `submit`, `reset`, `navigate`, `showAt`/`showBelow`/`showAbove`/
  `showLeft`/`showRight`, `showModal`, `dismiss`, `scrollTo`, `scrollBy`,
  `scrollToTop`, `scrollToBottom`, `get`, `set`, `increment`, `decrement`,
  `copy`, `add`, `remove`, `create`, `save`, `revert`, `delete`, `toast`.
- **Pipeline:** Parser (`parser-events.test.ts`-Pfade) → IR
  (`event-transformer.ts`, 100% bereits) → DOM-Backend (`event-emitter.ts`,
  43.5% — Hauptlücke).

**Nicht im Scope:**

- Runtime-Verhalten der Actions (Browser-DOM-Manipulation)
- Custom `assign(...)` Logik (komplexer Pfad)

## 2. Ist-Aufnahme

| Datei                           | Tests | Bereich                                        |
| ------------------------------- | ----- | ---------------------------------------------- |
| `parser-events.test.ts`         | viele | Parsing-Seite (Event-Token, Action-Args)       |
| `crud-operations.test.ts`       | ~20   | `add`/`remove`/`create`/`save` für Collections |
| `crud-aggressive.test.ts`       | ~15   | Pathologische CRUD-Eingaben                    |
| `bind-feature.test.ts`          | ~15   | `bind` mit Events                              |
| `state-reference.test.ts`       | ~15   | Cross-Element States via Events                |
| `parser-state-triggers.test.ts` | ~25   | onclick → toggle / exclusive                   |

**Coverage Pre-Thema-8:**

| Modul                            | Lines | Branches | Funcs |
| -------------------------------- | ----- | -------- | ----- |
| `event-transformer.ts` (IR)      | 100%  | 100%     | 100%  |
| `event-emitter.ts` (DOM Backend) | 43.5% | …        | …     |

## 3. Provokations-Liste — fokussiert auf event-emitter-Lücken

### 3.1 Lifecycle Events (komplett uncovered)

| #   | Input                             | Erwartet                              |
| --- | --------------------------------- | ------------------------------------- |
| E1  | `Frame onviewenter toast("seen")` | IntersectionObserver `_enterCallback` |
| E2  | `Frame onviewexit hide(X)`        | IntersectionObserver `_exitCallback`  |
| E3  | `Frame onload set(loaded, true)`  | onload-Handler im Output              |

### 3.2 Boolean-Actions auf currentVar (uncovered without args)

| #   | Input                             | Erwartet                                  |
| --- | --------------------------------- | ----------------------------------------- |
| E4  | `Btn onclick show()`              | `_runtime.show(currentVar)`               |
| E5  | `Btn onclick hide()`              | `_runtime.hide(currentVar)`               |
| E6  | `Btn onclick toggle()`            | `_runtime.stateMachineToggle(currentVar)` |
| E7  | `Btn onclick toggle("on", "off")` | toggle mit explicit states liste          |

### 3.3 Counter-Actions

| #   | Input                             | Erwartet                         |
| --- | --------------------------------- | -------------------------------- |
| E8  | `Btn onclick increment(count)`    | `_runtime.increment('count', 1)` |
| E9  | `Btn onclick increment(count, 5)` | `_runtime.increment('count', 5)` |
| E10 | `Btn onclick decrement(count)`    | `_runtime.decrement('count', 1)` |
| E11 | `Btn onclick set(count, 10)`      | set with explicit value          |
| E12 | `Btn onclick reset(count)`        | reset to 0                       |

### 3.4 Feedback-Actions

| #   | Input                               | Erwartet               |
| --- | ----------------------------------- | ---------------------- |
| E13 | `Btn onclick toast("Hello")`        | toast call mit message |
| E14 | `Btn onclick toast("Err", "error")` | toast mit type-arg     |
| E15 | `Btn onclick copy("text")`          | clipboard copy call    |

### 3.5 Navigation

| #   | Input                                  | Erwartet                                |
| --- | -------------------------------------- | --------------------------------------- |
| E16 | `Btn onclick navigate(HomeView)`       | `_runtime.navigate('HomeView')`         |
| E17 | `Btn onclick back()`                   | `_runtime.back()` oder `history.back()` |
| E18 | `Btn onclick openUrl("https://x.com")` | `_runtime.openUrl('https://x.com')`     |

### 3.6 Scroll-Actions

| #   | Input                           | Erwartet                 |
| --- | ------------------------------- | ------------------------ |
| E19 | `Btn onclick scrollToTop()`     | scroll-action für top    |
| E20 | `Btn onclick scrollTo(Section)` | scroll-action mit Target |

### 3.7 Input-Actions

| #   | Input                            | Erwartet        |
| --- | -------------------------------- | --------------- |
| E21 | `Btn onclick focus(EmailField)`  | focus call      |
| E22 | `Btn onclick clear(EmailField)`  | clear call      |
| E23 | `Btn onclick setError(F, "msg")` | setError call   |
| E24 | `Btn onclick clearError(F)`      | clearError call |

### 3.8 Highlight-Actions (List-Navigation)

| #   | Input                                          | Erwartet       |
| --- | ---------------------------------------------- | -------------- |
| E25 | `Frame onkeydown(arrow-down) highlightNext(L)` | highlight next |
| E26 | `Frame onkeydown(arrow-up) highlightPrev(L)`   | highlight prev |

### 3.9 Multi-Action + Chains

| #   | Input                                                  | Erwartet                 |
| --- | ------------------------------------------------------ | ------------------------ |
| E27 | `Btn onclick toggle(), increment(count), toast("Yay")` | alle 3 Aufrufe im Output |

### 3.10 onclick-outside

| #   | Input                              | Erwartet                           |
| --- | ---------------------------------- | ---------------------------------- |
| E28 | `Frame onclick-outside hide(self)` | click-outside-Listener registriert |

## 4. Test-Plan

`tests/compiler/events-actions.test.ts` mit ~28 Tests (10 Bereiche oben).

## 5. Coverage-Ziel

`event-emitter.ts`: 43.5% → **≥ 80%**.

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme
- [x] Schritt 3: Provokations-Liste
- [x] Schritt 4: 25 Tests in 10 Bereichen (lifecycle, show/hide/toggle,
      counter, feedback, navigation, scroll, input, click-outside, multi-
      action chains, keyboard variants), 0 Bugs entdeckt
- [x] Schritt 5: Coverage-Audit

## Coverage nach Iteration 1

| Modul                                    | Vorher                  | Nachher                            |
| ---------------------------------------- | ----------------------- | ---------------------------------- |
| `compiler/backends/dom/event-emitter.ts` | 43.5% L / 32% B / 41% F | **55.33% L / 43.03% B / 57.14% F** |

Globaler Effekt: 66.07% → **66.63% Lines (+0.56 pp)**.

## Was nicht abgedeckt ist (verbleibend bei 55%)

- **Show-Varianten**: `showAt(target)`, `showBelow(target)`, `showAbove(target)`,
  `showLeft(target)`, `showRight(target)`, `showModal()` — alle in
  `emitPositionAction` (Zeile 475+ in event-emitter)
- **Animate**: `animate(elem, "shake")` — `emitAnimateAction` (Zeile 450+)
- **Scroll mit Args**: `scrollTo(target)`, `scrollBy(100)` — variante Pfade
  in `emitScrollAction` (Zeile 497+)
- **CRUD-Actions in Detail**: `add(items, {...})`, `remove(item)`,
  `create({...})`, `save()`, `delete()`, `revert()` — werden in
  `crud-operations.test.ts` separat getestet (keine Doppelarbeit hier)
- **Value-Actions**: `assign(target, value)`, `get(target)` — in
  `emitValueAction` (Zeile 538+)
- **Input-Actions** (detail): `setError(F, "msg")`, `clearError(F)`,
  `submit(form)` — in `emitInputAction` (Zeile 595+)
- **State-Actions**: `select`, `activate`, `deactivate`, `dismiss`, `open`,
  `close`, `page`, `call`, `blur`, `highlight(first/last)` — diverse
  ungetestete Varianten in `emitRuntimeAction` (Zeile 214+)

Eine zweite Iteration mit fokussierten Tests für diese könnte event-emitter
auf 80%+ heben — derzeit nicht priorisiert, da kein Bug-Hunt-Ergebnis
und alle gängigen Patterns abgedeckt sind.
