# AI-gestützte UI-Generation für Mirror

> Architektur-Konzept für die Anbindung von LLMs an Mirror, um aus User-Prompts oder Sketches production-tauglichen Mirror-Code zu erzeugen.
>
> **Status:** Validiert durch Experimente (Mai 2026, siehe `tools/experiments/svelte-spike/`). Implementierung steht aus.

## Vision

Mirror ist als DSL für AI-unterstütztes UI-Design konzipiert: AI erzeugt Code, Designer verfeinern ihn ohne Framework-Wissen. Damit das funktioniert, muss eine AI Mirror "beherrschen" — entweder direkt oder über einen Vermittlungs-Mechanismus.

Dieses Dokument beschreibt den Vermittlungs-Mechanismus: eine zweistufige Pipeline, die LLM-Stärken im freien Code-Generieren und in der Code-Übersetzung kombiniert, um Mirror-Output von Production-Qualität zu liefern — ohne Mirror als designer-readable DSL aufzugeben.

## Das Kernproblem

Frontier-LLMs (Sonnet, Opus, GPT-4-Klasse) sind beim **freien Generieren** von Mirror-Code substantiell schwächer als beim Generieren von HTML, Svelte, React, Vue oder anderen Mainstream-Frontend-Sprachen. Empirische Beobachtung — bestätigt durch eigene Tests:

- Direkt aus Prompt generiertes Mirror enthält oft Spec-Drift (zusätzliche Komponenten, weggelassene Features), schwächere Designentscheidungen, weniger idiomatische Nutzung von Mirror-Konstrukten (wenig `toggle()`, wenig `as`-Inheritance, wenig Token-Disziplin).
- Dieselben Prompts in HTML oder Svelte produzieren visuell und strukturell stärkere Outputs.

Das ist erwartbar: Mirror als eigene DSL ist im LLM-Trainings-Korpus kaum vertreten. Die Lücke ist nicht modellspezifisch und durch System-Prompt-Engineering allein nicht zu schliessen.

## Verworfene Ansätze

Drei Alternativen wurden untersucht und durch Argument oder Experiment ausgeschlossen.

### 1. Constrained HTML mit Bijektion zu Mirror

**Idee:** Definiere ein striktes HTML-Subset, das deterministisch zu Mirror und zurück konvertierbar ist. LLM generiert HTML im Subset, Parser übersetzt zu Mirror.

**Verworfen:** Funktioniert für reines Layout/Styling (flexbox, CSS-Variablen, Hover-States). Bricht bei Mirror-spezifischen Konzepten (Components mit Slots, `toggle()`/`exclusive()`, Cross-Element-States, Iteration mit `each`). Diese erfordern künstliche `data-mirror-*`-Konventionen im HTML, was die LLM-Fluency-Dividende auffrisst — der LLM generiert effektiv "Mirror in HTML-Verkleidung", nicht echtes HTML.

### 2. Framework-Pivot zu Svelte / Vue / React als User-facing Format

**Idee:** Mirror durch Svelte/Vue/React ersetzen. LLM ist in diesen Frameworks fluent.

**Verworfen:** Identitätsverlust für Mirror als designer-readable DSL. JSX/SFC-Syntax ist deutlich weniger zugänglich für nicht-Entwickler als Mirror's `bg #2563eb, pad 12 24, rad 6`. Hoher Migrations-Aufwand für die existierende Studio-Infrastruktur. Verliert das eigenständige Mental-Model, das das Produkt definiert.

### 3. Constrained Svelte als LLM-Generations-Ziel mit deterministischem Parser zu Mirror

**Idee:** Ähnlich (1), aber mit Svelte. Strict Subset definieren, LLM generiert in Subset, Parser zu Mirror.

**Verworfen — empirisch:** In den Experimenten generierte das LLM bei steigender Design-Komplexität (z.B. 3-spaltige Pricing-Karten) systematisch in Mirror-fremde Mechanismen aus: `display: grid`, `@media`-Queries, `clamp()`, compound selectors `.parent .child`. Diese Verstösse sind **strukturell**, nicht kosmetisch — ein Validator/Canonicalizer kann sie _detektieren_, aber nicht _normalisieren_. `display: grid` zu `display: flex` umzuschreiben ist keine Normalisierung, das wäre ein Re-Design.

**Tieferes Insight:** Wenn der LLM bei Komplexität in Konstrukte ausweicht, die das Subset nicht erlaubt, ist das Subset effektiv Mirror's Subset — nur in anderer Syntax. Die LLM-Fluency-Dividende verdunstet, weil der LLM in unserem Subset _weniger_ trainiert wurde als in vollem Svelte.

## Die empfohlene Architektur

Reframing: weg von **Generieren-unter-Constraints**, hin zu **Frei-Generieren plus Übersetzen**.

```
User-Input (Prompt, Sketch, oder bestehender Mirror-Code)
    ↓
[1] HTML-Generation
        LLM frei generieren in HTML/CSS/JS
        System-Prompt enthält Mirror-friendly Constraints
        und Translation-Hints
    ↓
    *.html (Zwischen-Artefakt)
    ↓
[2] LLM-Übersetzung
        Frischer LLM-Call
        Liest CLAUDE.md + strukturierten Context-Block
        Liest die HTML
        Schreibt idiomatisches Mirror
    ↓
    *.mir (Roh-Output)
    ↓
[3] Validator
        Mirror-Syntax-Check
        Token- / State- / Component-Referenz-Check
    ↓
    Wenn Fail: Translator-Agent erneut aufrufen
               mit Fehlerliste + Original-HTML + bisheriger Mirror
               Max 2-3 Retries
    ↓
[4] Production-Mirror → Studio
```

### Schritt 1: HTML-Generation

Der LLM bekommt den User-Wunsch frei in HTML/CSS/JS umzusetzen — _aber_ mit Constraints im System-Prompt, die die spätere Übersetzung erleichtern.

**Hard Constraints** (HTML muss in Mirror's Möglichkeitsraum bleiben):

- Flexbox only (kein Grid, kein Float, kein inline-block)
- Pixel-Werte als Integer (keine %, rem, em, vh/vw, calc(), clamp())
- Keine `@media`-Queries, fixed-width Widget
- Flat CSS-Klassen-Selectors, nur State-Pseudoklassen (`:hover`, `:focus`, `:focus-visible`, `:active`, `:disabled`)
- Keine `@keyframes`, keine Transitions, keine Animations
- Lucide-Icons via inline `<svg>` mit Class-Hint (`<svg class="icon icon-heart">`)
- Keine externen Assets (Avatare als SVG-Initials oder geometrische Form)

**Translation-Hints** (machen den Translator-Job trivial):

- Semantische Klassennamen, die Component-Struktur andeuten (`.profile-card`, `.btn-primary`)
- Base+Modifier-Pattern für wiederholte Komponenten (`<button class="btn btn-primary">`)
- Toggleable State via Class-Modifier (`<button class="btn-favorite is-on">`)
- `:root` Custom Properties für Tokens, beschreibend benannt (`--accent`, `--surface`, `--space-md`, `--radius-sm`)
- HTML-Kommentare an strukturellen Boundaries (`<!-- card: profile -->`, `<!-- primary action -->`)
- JS-Handler mit semantischen Namen (`toggleFollow()`, `dismissToast()` statt `handleClick()`)

Plus eine Design-Quality-Bar (Restraint-orientiert, Anti-Cliché, mind. eine distinctive Designentscheidung pro Output).

### Schritt 2: LLM-Übersetzung

Frischer LLM-Call. Bekommt:

1. **Volle Mirror-Reference** via `CLAUDE.md` (Prompt: "Read CLAUDE.md fully")
2. **Strukturierter Context-Block:**

   ```
   Type: [User profile card]
   Purpose: [Identifies a user in a directory; primary actions are
             Follow (toggleable) and Message]
   Design intent: [Restrained, modern editorial — type-led hierarchy,
                   single accent, no decorative shadows or gradients]
   ```

   In Production: User-Prompt liefert Type implizit, Purpose via Prompt-Text, Design intent aus Brand-Setup pro Projekt.

3. **Übersetzungs-Guidelines:**
   - HTML-Tags zu Mirror-Primitives (`div→Frame`, `span→Text`, `button→Button`, `a→Link`, `img→Image`, `h1-h6→H1-H6`)
   - Flexbox-CSS zu Mirror-Layout (`display: flex` → `Frame`; `flex-direction: row` → `hor`; `gap: Npx` → `gap N`; `justify-content: space-between` → `spread`)
   - `:root` Custom Properties zu Mirror-Tokens (`--accent: #x` → `accent.bg: #x` oder `accent.col: #x` — Suffix entsprechend Verwendung)
   - Base+Modifier-Klassen zu `Btn:` + `PrimaryBtn as Btn:` Pattern
   - State-Modifier-Klassen (`is-on`) zu `toggle()` + `on:` State-Block
   - `:hover`/`:focus`/`:active` zu Mirror-State-Blöcken
   - Lucide-Icon-Class-Hints zu `Icon "name"`

### Schritt 3: Validator

Statisches Tool, prüft:

- **Syntax:** korrekte Kommas zwischen Properties, korrekte Einrückung, gültige Property-Namen und -Werte
- **Token-Referenzen:** jedes `$x` muss eine Definition `x.suffix: ...` haben
- **State-Referenzen:** jedes `Element.state:` braucht ein `Element` mit `toggle()/exclusive()` und entsprechendem deklarierten State-Namen
- **Component-Referenzen:** jeder verwendete Komponentenname muss definiert oder Built-in sein

Bestehende Hooks: `compiler/validator/` enthält bereits einen Validator-Stub, kann erweitert werden.

### Retry-Loop

```
mirror = translate(html, context)
for attempt in 1..3:
    errors = validate(mirror)
    if errors.empty: return mirror
    mirror = translate(html, context, errors=errors, prev_attempt=mirror)
return mirror_with_warning(errors)
```

Bei Erschöpfung: Output mit Warnung an den User — "diese Mirror-Datei hat ungelöste Issues, manuell prüfen."

## Empirische Validierung

Alle Outputs in `tools/experiments/svelte-spike/`. Modellwahl in allen Experimenten: Claude Sonnet (general-purpose Agents).

### v1: 3 Prompts × 3 Modi (archiviert in `v1/`)

**Modi:** Free Svelte (a), Constrained Svelte (b), Direct Mirror (c).
**Prompts:** Login form (P1), Pricing tiers (P2), Settings panel mit Tabs (P3).

**Befund:**

- Constrained Svelte (b) hielt sich bei P1/P3 grossteils an Constraints, brach aber bei P2 fundamentale Regeln (`display: grid`, `@media`, `clamp()`, compound selectors).
- Direct Mirror (c) zeigte Spec-Drift (5 Controls statt 3, ungefragte Volume-Slider).
- → Bestätigte: Constraint-Druck auf Generation funktioniert nicht für komplexere Designs.

### v2: Music-Player-Widget × 4 Modi

**Modi:** Free Svelte (a), Raw HTML (a2), Contained Svelte (b), Direct Mirror (c).

**Befund:** Bei Mirror-feasible Prompt (Single-Widget, flex-only) hielt sich b an Constraints und produzierte Design-Qualität auf Augenhöhe mit a. Bestätigte: das Constraint-Problem aus v1 war prompt-getrieben, nicht reflex-getrieben.

### d-Pipeline: erstes HTML→LLM-Translation→Mirror

**Setup:** Bossa-nova-Music-Player. Schritt 1 frei HTML (das LLM erfand "Saudade do Nordeste — Maria Bethânia · 1978" mit Playfair-Display-italic-Typo + warm Amber Akzent + generative Canvas-Album-Art). Schritt 2 LLM übersetzt zu Mirror.

**Befund:** Translation produzierte sauberes idiomatisches Mirror — Tokens extrahiert, Components mit `as`-Inheritance, `toggle()` + `on:` für Play/Pause, Custom Icons via `$icons`-Registry, ehrliche Compromise-Notation für nicht-übersetzbare Canvas-Art ("Generative artwork placeholder"). Keine Spec-Drift. **Erste Validierung der Pipeline.**

### e-Pipeline: 3 Beispiele mit verfeinerten Hints + Context-Block

**Beispiele:** Profile-Card, Notification-Toast, Empty-State.
**Setup:** HTML-Generation mit Translation-Hints (semantische Klassennamen, `:root` Tokens, `is-on`-Modifier, JS-Handler-Namen). Translation mit strukturiertem Context-Block.

**Befund:**

- 2/3 sauber und idiomatisch (Profile-Card, Empty-State)
- 1/3 mit zwei kleinen Bugs (Toast: fehlendes Komma + erfundener `Toast.hidden:`-State-Reaktor — `hidden` ist Property, nicht reaktiver State)
- Bug-Klasse: bei komplexer State-Choreographie _erfindet_ der Translator gelegentlich plausible aber falsche Mirror-Idiome
- **Validator-fangbar.**

### Sketch-Pipeline: roher Mirror-Sketch → HTML → cleanes Mirror

**Input:** 7 Zeilen loser Sketch-Mirror (StatCard, "small muted", "huge bold", nackte Zahlen, fehlende Property-Namen).
**Output:** 13 Zeilen production-Mirror mit definierten Tokens, `StatCard:` Component, idiomatischer Struktur — und einem **vom HTML-Expander hinzugefügten Polish-Detail** (positive-pill mit hellgrünem Hintergrund hinter Icon+Pct).

→ **Schreib-Workflow validiert.** Designer kann sketchy Mirror schreiben; Pipeline produziert Production-Mirror, oft besser als der Sketch.

## Warum das funktioniert: das LLM-Realitäts-Insight

**Generieren in Mirror = Erfindungs-Task:** Designentscheidungen _plus_ Mirror-Idiome _plus_ Mirror-Syntax gleichzeitig erfinden. Bei einer schwach trainierten Sprache → schwacher Output. Mehr System-Prompt-Coaching hilft kaum, weil die Generierung schöpferisch ist.

**Übersetzen aus HTML zu Mirror = Mapping-Task:** Designentscheidungen sind schon getroffen, der LLM muss nur Konstrukte umschreiben. Die HTML ist Referenz und Anker — der LLM kann nicht "vom Pfad abkommen", weil die Source-of-Truth physisch vorliegt.

**Übersetzungs-Tasks sind eine LLM-Stärke unabhängig vom Trainingsumfang der Zielsprache.** LLMs haben unzählige Code-Translation-Beispiele gesehen (Python ↔ JS, React ↔ Vue, etc.), und das Mapping-Skill transferiert auf Mirror.

Die Pipeline trennt also bewusst:

- **Schöpferischer Schritt** (HTML-Generation) — in der LLM-stärksten Sprache
- **Mechanischer Schritt** (Übersetzung) — nutzt LLM-allgemeine Mapping-Stärke

Statt das LLM zu zwingen, beides gleichzeitig in Mirror zu lösen.

## Implikationen für Mirror

### 1. Mirror bleibt das Produkt

User sieht nie HTML. HTML ist ein **internes Implementations-Detail** der AI-Pipeline. Mirror ist weiterhin die designer-lesbare DSL, die das Produkt definiert.

### 2. Sketch-Authoring wird möglich

Designer können in **rohem, syntaktisch fehlerhaftem Mirror** schreiben — der Sketch geht durch dieselbe Pipeline (Sketch → HTML → cleanes Mirror) und kommt poliert zurück. Validiert durch den StatCard-Sketch-Test.

### 3. Edit-Cycle symmetrisch

Wenn der User existierenden Mirror-Code editieren will und das LLM erneut bemüht, geht der gleiche Mechanismus: aktueller Mirror-Code → HTML → modifiziertes HTML → cleanes Mirror. **Die Pipeline ist ein Cycle, nicht eine Einbahnstrasse.**

### 4. Validator als Production-Sicherheit

Der Validator-Schritt macht den nicht-deterministischen Translation-Schritt **production-tauglich**. Schlechte Outputs werden gefangen und über Retry korrigiert. Der User sieht nur den finalen, validierten Mirror.

### 5. Mirror-Subset-Erweiterungen werden empirisch entscheidbar

Wenn der HTML-Expander wiederholt Konstrukte erzeugt, die der Translator nicht in Mirror abbilden kann (z.B. `display: grid` für Karten-Reihen), ist das ein Signal: Mirror sollte möglicherweise dieses Konstrukt nativ bekommen. Die Pipeline gibt empirisches Feedback, was Mirror's Subset fehlt.

## Implementierungs-Bauteile

### 1. HTML-Generation-Prompt (`prompts/html-generation.md`)

System-Prompt mit:

- Hard Constraints (siehe Schritt 1)
- Translation-Hints (siehe Schritt 1)
- Design Quality Bar (Restraint, type-led hierarchy, single accent, anti-cliché)
- Slot für User-Task

Volltext der aktuellen Version: in `tools/experiments/svelte-spike/` Agent-Calls.

### 2. Translation-Prompt (`prompts/translation.md`)

System-Prompt mit:

- Verweis auf `CLAUDE.md` als vollständige Mirror-Reference
- Strukturierter Context-Block (Type / Purpose / Design intent)
- Translation-Guidelines (Tag/CSS/Token/State/Icon-Mapping)

### 3. Validator (`compiler/validator/` erweitern)

Mirror-Parser, der:

- Syntax-Errors fängt
- Token-Referenzen prüft
- State-Referenzen prüft
- Component-Referenzen prüft

Output: Liste strukturierter Errors mit Zeilennummer, Code-Pointer, Fehlerklasse.

### 4. Retry-Loop (`studio/agent/` erweitern)

Pseudocode siehe Schritt 3. Max 2-3 Retries, bei Erschöpfung Warning-Output.

### 5. Studio-Integration

Editor-Hooks:

- "Generate from prompt" → User-Prompt-Input → Pipeline → Mirror in aktive `.mir`-Datei
- "Edit selection with AI" → Selektierter Mirror-Code als Input → Pipeline → Replace
- "Cleanup file" → Aktuellen Mirror-Code als Sketch → Pipeline → Replace

Bestehende Hooks: `studio/agent/` (LLM-Edit-Flow), `--`-Prompt im Editor.

## Offene Fragen

### Validator-Detail

- Welche Bug-Klassen sind statisch fangbar? (Syntax, Token-Refs, State-Refs — ja. Semantische Plausibilität — nein.)
- Wie eng sollte der Validator sein? Strict gegen alle Mirror-Idiome, oder tolerant gegen "ungewöhnliches aber gültiges" Mirror?

### Edit-Flow auf existierendem Mirror

- Ist Mirror → HTML → Mirror tatsächlich verlustfrei genug für iteratives Editing?
- Wie behandeln wir Designer-Edits, die explizit das HTML-Round-Trip nicht überleben sollen (handgeschriebene Custom-Components, kommentierter Code)?

### Design-Intent-Quelle in Production

- Wo kommt der "Design intent"-String im Context-Block her? Brand-Setup pro Projekt? User-Prompt? Standard-Default?
- Konsistenz über Sessions: wenn der User im Mai eine Card im Stil X generiert und im Juni eine zweite, soll das System die erste als Referenz mitgeben?

### Härtere Beispiele

- Pricing-Tiers (3-spaltig, war v1's Stolperstein) und Dashboards (Multi-Widget): kommt der HTML-Expander mit `display: grid` rechtmässig nicht klar, weil Mirror's Grid-Subset eingeschränkt ist? Falls der Translator hier scheitert, ist das ein Signal für Mirror-Erweiterung.

### Visuelles Rendering vs. Code-Read

- Bisherige Beurteilung der Outputs ist nur über Code-Lesen erfolgt. Echte visuelle Verifikation steht aus. Wahrscheinlich werden ein paar Bugs visuell sichtbar, die im Code unauffällig bleiben (falsche Padding-Werte, falsche Spacings).

### Performance / Kosten

- Zwei LLM-Calls pro Generierung + ggf. Retries. Sonnet-Pricing ist überschaubar, aber für interaktives Studio-Editing (jeder kleine Edit löst Pipeline aus) muss Caching/Batching nachgedacht werden.

## Nächste Schritte

1. **Validator-Prototyp** — minimaler Mirror-Validator, der die in den Spike-Outputs gesehenen Bug-Klassen fängt (fehlende Kommas, undefinierte Token-/State-Referenzen). Reusing/Erweitern von `compiler/validator/`.
2. **Visuelle Verifikation** der Spike-Outputs — alle Files in einem SvelteKit-Setup oder im Studio rendern, Side-by-Side vergleichen, Abweichungen dokumentieren.
3. **Härtere Beispiele** — Pricing-Tiers, Dashboard-Layout, Form mit Multi-Step, Editor-UI. Empirisch klären, wo Mirror-Subset Erweiterung braucht.
4. **Studio-Integration-Spike** — minimaler Editor-Hook, der die Pipeline für eine "Generate from prompt"-Action aufruft und das Resultat in eine `.mir`-Datei einfügt. Validiert den UX-Flow.
5. **Edit-Cycle-Test** — bestehenden Mirror durch die Pipeline schicken (als Sketch), Output mit Original vergleichen. Verlustfreiheits-Check.

---

## Anhang: Volltext der validierten Prompts

### HTML-Generation-System-Prompt (Sketch-Variante, getestet StatCard)

```
You are a UI designer's interpreter. A designer has written a rough,
sketch-like Mirror DSL snippet describing a UI widget. The sketch is
intentionally underspecified — it conveys structure and design intent
but leaves many decisions (exact colors, sizing, typography, spacing,
polish) up to you. Interpret generously and idiomatically.

[Designer's sketch goes here]

Things you should infer:
- Loose style hints ("small", "muted", "huge", "bold", "uppercase",
  named colors) → concrete values consistent with editorial restraint
- Token names → real :root custom properties in the HTML
- Implied widget type → fill in design context

Your output: A single, complete, self-contained HTML file. The HTML
will subsequently be translated to Mirror — follow the constraints
and translation-friendly conventions below.

[Hard constraints + Translation-friendly conventions + Quality bar]
```

### Translation-System-Prompt

```
You are translating an HTML/CSS/JS UI into Mirror DSL.

## Mirror reference

Read /path/to/CLAUDE.md fully — the Mirror DSL syntax, primitives,
properties, components, tokens, states, and idioms are documented
there. Use it as your authoritative reference.

## Context

Type:           [e.g. "User profile card"]
Purpose:        [e.g. "Identifies a user in a directory; primary
                 actions are Follow (toggleable) and Message"]
Design intent:  [e.g. "Restrained, modern editorial — type-led
                 hierarchy, single accent, no decorative shadows
                 or gradients. Match Linear / Vercel quality."]

## Task

1. Read the source HTML at [path]
2. Produce idiomatic, clean Mirror DSL
3. Save the Mirror code to [path]

## Translation guidelines

- Map HTML tags to Mirror primitives (div→Frame, etc.)
- Translate flexbox CSS to Mirror layout (gap→gap, padding→pad, etc.)
- Convert :root CSS custom properties to Mirror tokens
- Base+modifier classes → Mirror base component + variants via `as`
- State-modifier classes (is-on) → toggle() + on: state block
- Lucide-class-hinted SVGs → Icon "name"
- Use idiomatic Mirror — consolidate via components and tokens

Output ONLY the Mirror DSL — no markdown fences, no explanations.
```
