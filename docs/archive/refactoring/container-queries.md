# Container-Queries auf eigenem Element — Lane Doc

**Status:** abgeschlossen 2026-05-13.

**Stand 2026-05-13:** Lane A vollständig wired in allen 3 Backends
(DOM, React, Framework) plus Position-Forwarding. Alle 6 Differential-
Pins grün. Commits: `9ebafdf2` (DOM), `d5937788` (React), `b93f4ff3`
(Framework), `eb062940` (un-skip), `f81b590d` (Position-Forwarding).
Findings-Eintrag in `docs/findings.md` 2026-05-13.

Diese Doc dokumentiert die ursprüngliche Architektur-Analyse und die
Empfehlung Pfad A. Sie bleibt als Reference erhalten — die Trade-offs
und das Inkrement-Mapping können für künftige Container-Query-
Erweiterungen (z.B. `@container style()` für non-size queries) als
Grundlage dienen.

## Ausgangslage

Mirror lässt Designer schreiben:

```mirror
Frame w full
  compact: bg #ef4444
  wide:    bg #10b981
```

Erwartetes Verhalten: Frame zeigt rot bei <400px Breite, grün bei

> 800px — eine selbst-responsive Komponente.

Heutige Emit-Pipeline:

1. **IR**
   (`compiler/ir/transformers/state-styles-transformer.ts:67-75`):
   Size-State-Styles bekommen `sizeState: 'compact' | 'regular' | 'wide'`
   und der IR-Node `needsContainer: true`.
2. **DOM-Node-Emit**
   (`compiler/backends/dom/node-emitter.ts:327 emitContainerType`):
   `node.style.containerType = 'inline-size'` _auf demselben Frame_.
3. **DOM-CSS-Emit**
   (`compiler/backends/dom/style-emitter.ts:232 emitNodeSizeStateCSS`):
   ```css
   @container (max-width: 400px) {
     [data-mirror-id^='node-1'] {
       background: #ef4444 !important;
     }
   }
   ```
   Selector zielt auf _denselben_ Frame, der den Container deklariert.

## Problem

CSS Container-Queries-Spec
([CSS Containment Module Level 3 §4.2](https://drafts.csswg.org/css-contain-3/#container-queries)):
`@container` matcht gegen den **nächsten Container-Ancestor**,
**nicht** gegen das eigene Element. Ein Element kann seine eigene
inline-size also nicht abfragen.

Beobachtbare Folge: das Frame reagiert nicht auf seine eigene Breite.
Bestätigt durch `tools/probes/container-queries.ts` (real Chrome via
Puppeteer, computed-style-Read).

**Reproduktion-Pfad (jsdom-kompatibel):**

```mirror
Frame w 800, h 200, bg #333
  compact: bg #ef4444
  regular: bg #f59e0b
  wide:    bg #10b981
```

Emit enthält `containerType: 'inline-size'` UND `@container ... [data-mirror-id^="node-1"]`
auf demselben Selektor — strukturelles Pattern verifiziert.

**Workaround heute:** Size-States auf ein Inner-Child legen:

```mirror
Frame w full
  Inner
    compact: bg #ef4444
    wide:    bg #10b981
```

`Inner` reagiert auf `Frame` (Container-Ancestor) — funktioniert
gemäß Spec. Diese Variante ist auch in `studio/test-api/suites/
responsive/{basic,layout}.test.ts:73-77,88-92` als Workaround-
Kommentar dokumentiert; die Direct-on-self-Tests bleiben
`testWithSetupSkip` bis ein Fix da ist.

## Sekundär-Problem: Backend-Drift

React- und Framework-Backend droppen `sizeState`-Styles und
`needsContainer` **komplett silent** — kein `container-type`-Emit,
kein `@container`-Rule. Eine `Frame compact: bg red` rendert in React
identisch wie in DOM (visuell — weil weder DOM noch React es heute
korrekt umsetzen), aber strukturell fehlt die CSS-Regel ganz.
Differential-Test-Lücke.

## Fix-Pfade

### Pfad A — Synthetischer Outer-Wrapper als Container

Emit struktur: `<outer-container><frame>...</frame></outer-container>`.
Der Outer trägt `container-type: inline-size`, der Frame trägt die
Size-State-Styles. Selector wird:

```css
@container (max-width: 400px) {
  [data-mirror-id^='node-1'] {
    background: #ef4444 !important;
  }
}
```

…und matcht jetzt: der Frame ist Descendant des Outer-Containers,
also greift die Query.

**Vorteile:**

- Frame behält semantische Identität (gleicher `data-mirror-id`,
  gleiches DOM-Element für Code-Modifier/Inline-Edit/Selection-
  Tracking).
- Size-States bleiben optisch dem Frame zugeschrieben — Designer-
  Mental-Modell unverändert.
- Studio-Picker / Property-Panel arbeiten weiterhin auf dem Frame-
  Element.

**Nachteile:**

- Extra DOM-Node pro Container-Frame — Schwergewicht für tiefe Trees.
- Flex-/Grid-Parent über dem Frame muss neu denken: der direkte
  Child ist jetzt der Outer-Container, der ein `display: contents`
  oder `display: block` haben muss, damit der Frame seine eigene
  Flex-Identität behält. `display: contents` umgeht Layout-Box,
  aber bricht Accessibility-Tree-Annahmen in einigen Browsern
  ([WebKit Bug 187226](https://bugs.webkit.org/show_bug.cgi?id=187226),
  inzwischen großenteils gefixt).
- `position: absolute`-Frames brauchen Spezialbehandlung, weil der
  Outer-Container die neue offset-Parent-Quelle würde.

### Pfad B — Synthetischer Inner-Wrapper-Child

Emit struktur: `<frame><inner-size-target>...</inner-size-target></frame>`.
Der Frame trägt `container-type: inline-size` und Layout, der Inner
trägt die Size-State-Styles. Selector wird:

```css
@container (max-width: 400px) {
  [data-mirror-id-inner='node-1'] {
    background: #ef4444 !important;
  }
}
```

…und matcht: der Inner-Element ist Descendant des Frame-Containers,
Query greift.

**Vorteile:**

- Frame behält Layout-Eigenschaften (Flex/Grid/Position) — Parent-
  Beziehung unverändert.
- Identifier-Stable: der Frame ist weiterhin das Top-Level-Element.

**Nachteile:**

- Inner-Element muss alle visuellen Frame-Properties spiegeln, die
  size-state-überschrieben werden — also `background`, `border`,
  `color`, … Die Style-Aufteilung „was kommt aufs Frame, was kommt
  auf den Inner" wird komplex. Inner braucht zudem `width: 100%`,
  `height: 100%` und neutrales Layout (`display: contents` oder
  ein konfliktfreies `display: block`), damit Frame-Kinder
  zugänglich bleiben.
- Kollidiert mit Frames die _selbst_ Layout-Kinder rendern: ein
  `Frame hor, gap 8` mit `compact: gap 4` müsste den `gap` auf den
  Inner verschieben, aber das Inner muss dann das Layout führen —
  Frame und Inner teilen Layout-Verantwortung.
- DOM-Tiefe-Inflation in jeder Frame-mit-Size-States.

### Pfad C — Hybrid: Outer-Wrapper nur on-demand

Wie A, aber Wrapper wird nur emittiert wenn Frame _wirklich_ Size-
States hat (das ist heute schon der Fall via `needsContainer`-Flag).
Frames ohne Size-States bleiben unverändert. Minimiert DOM-
Inflation, aber löst die A-Nachteile (Flex/Grid/Position) nicht.

## Empfehlung

**Pfad A (Outer-Wrapper, on-demand via `needsContainer`).** Begründung:

1. **Frame behält Identität.** Studio-State, Code-Modifier, Inline-
   Edit, Selection-Tracking arbeiten alle gegen `data-mirror-id`.
   Pfad A lässt das unverändert; Pfad B verschiebt visuelle
   Properties auf einen Inner und verkompliziert das Mental-Modell.
2. **Style-Aufteilung trivial.** Outer trägt nur `container-type`
   (eine einzige Property), Frame trägt alles andere. Pfad B
   müsste pro Property entscheiden, ob sie size-state-überschrieben
   wird — Wartungslast.
3. **Flex/Grid-Parent-Problem hat eine Lösung.** Outer mit
   `display: contents` umgeht den Layout-Eintrag (Browser-Support
   ist heute stabil außer für sehr alte iOS-Versionen — vgl.
   [caniuse](https://caniuse.com/css-display-contents) > 96%).
   `position: absolute`-Frames werden über eine kleine
   Position-Forwarding-Heuristik gelöst: wenn Frame `position:
absolute|fixed`, dann übernimmt der Outer-Wrapper diese
   Position und das Frame wird `position: static`.
4. **Inkrementeller Roll-out möglich.** Da der Wrapper nur bei
   `needsContainer` emittiert wird, sind alle Frames ohne Size-
   States unangetastet — kein Risiko für die 99 % der Code-Base
   ohne Size-States.

## Inkrement-Plan (post-Sign-off)

1. **Pre-Refactor-Pin.** Pixel-Diff-Test mit
   `tools/probes/container-queries.ts` als Driver: pre-Fix-Snapshot
   (kein Size-State-Switch bei Resize) gegen post-Fix-Snapshot
   (Switch bei Threshold) festhalten. Plus Differential-Pin in
   `tests/differential/states.test.ts` für die Emit-Struktur
   (Outer-Wrapper-Anwesenheit + Selector-Form).
2. **IR-Felder erweitern.** `needsContainer: boolean` bleibt,
   neues Feld `containerWrapperPosition?: 'static' | 'absolute' | 'fixed'`
   (wird beim Frame-Property-Scan gesetzt, falls Frame
   `position`-Property hat).
3. **DOM-Node-Emit (`node-emitter.ts:emitContainerType`).** Statt
   `node.style.containerType = '...'` aufs Frame, emittiere einen
   neuen DOM-Node (Wrapper-Div) als Parent, der `containerType`
   trägt und ggf. Position-Forwarding macht. Frame selbst kriegt
   keinen `containerType`-Style.
4. **DOM-CSS-Emit (`style-emitter.ts:emitNodeSizeStateCSS`).**
   Selector bleibt `[data-mirror-id^="${node.id}"]` — keine
   Änderung, weil Frame jetzt Descendant des Wrappers ist und
   Query greift.
5. **React-Backend.** Neuer Slice: `react/ops/container-query.ts`,
   emittiert Outer-`<div>` mit `containerType`-Style + `<style>`-
   Block mit `@container`-Regeln. Pre-Scan-Flag `hasSizeStates`
   parallel zu existierendem `hasAnimation`.
6. **Framework-Backend.** Analoger Slice für M-Prop-Bag — `m()`-
   Call-Wrap mit `container-type`-Style auf Outer-Container-Node.
7. **Test-Suite un-skippen.**
   `studio/test-api/suites/responsive/{basic,layout}.test.ts`:
   `testWithSetupSkip` → `testWithSetup`, Skip-Kommentare entfernen,
   plus neue Pins für Wrapper-Anwesenheit + Position-Forwarding.
8. **Studio-Selection/Code-Modifier-Audit.** Verifizieren dass
   Click auf den Wrapper im Preview den Frame selektiert (nicht
   den Wrapper). Vermutlich „outer wrapper hat
   `data-mirror-wrapper="true"`-Attribut, Click-Handler propagiert
   zum Frame-Child". Niedriges Risiko, weil Wrapper-Elemente keine
   eigene `data-mirror-id` haben.

## Offene Fragen

- **Wrapper-Identifier.** Soll der Outer-Wrapper eine eigene `id`
  bekommen (für DevTools-Diagnose) oder bleibt er anonym? Default
  vorgeschlagen: `data-mirror-wrapper="<frame-id>"`, kein Mirror-
  ID-Eintrag.
- **Nested Containers.** Frame innerhalb Frame, beide mit Size-
  States: heute hat das Inner-Frame zwei Container-Ancestors. Per
  Spec greift der nächstere. Sollte „just work" — aber Smoke-Test
  pflichtig.
- **Stacked-Frames.** Frames mit `stacked`-Property haben
  `position: relative` auf sich; Position-Forwarding muss damit
  klarkommen.
- **Bundle-Size-Impact.** Outer-Wrapper kostet ~30 Bytes JS-Emit
  pro Frame-mit-Size-States. Akzeptabel.

## Verweise

- Findings-Eintrag in `docs/findings.md` (Container-Queries-Section).
- Probe: `tools/probes/container-queries.ts`.
- Skipped Tests: `studio/test-api/suites/responsive/{basic,layout}.test.ts:73,88`.
- CSS-Spec: <https://drafts.csswg.org/css-contain-3/#container-queries>.
