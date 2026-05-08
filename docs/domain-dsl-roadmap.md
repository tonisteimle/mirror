# Mirror als Domain-DSL — Diskussionsgrundlage

> **Status:** Diskussionsdokument, keine Entscheidung.
> **Zweck:** Festhalten, wie Mirror schrittweise von einer UI-DSL zu einer
> vollständigen Domain-DSL ausgebaut werden kann (Schemas, Defaults,
> Feldtypen, Validierung) — ohne dass die heutige Einfachheit dafür
> bezahlen muss.

## Vision

Mirror soll langfristig nicht nur UI beschreiben, sondern auch die Domäne
dahinter: typisierte Felder, Default-Werte, Validierung, Cross-Reference
zwischen Datenobjekten. Heute halten wir es bewusst minimal („AI generiert,
Mensch tweakt, Frame und Daten leben friedlich nebeneinander"), aber jede
syntaktische Entscheidung muss kompatibel zur späteren Schema-Schicht sein.

Der Plan in einem Satz: **die heutige Form ist ein strikter Subset der
Schema-tragenden Form von morgen — additive Extension, kein Bruch.**

## Heutige Position (was gerade live ist)

Daten lassen sich seit Commit `<HEAD>` in zwei Formen schreiben:

```mirror
// Form A — keyed (vorhandene Form, gut wenn der Key Bedeutung trägt):
features:
  home:
    icon: "home"
    title: "Willkommen"
    desc: "Demo-Projekt."

// Form B — kompakt (neu, gut wenn der Key reine Synthetik wäre):
features:
  icon "home",   title "Willkommen",  desc "Demo-Projekt."
  icon "layers", title "Komponenten", desc "Bausteine."
```

Form B nutzt dieselbe `name value, name value`-Grammatik wie Element-
Properties (`bg #2271C1, col white`). Der Compiler vergibt für anonyme
Reihen positionale Auto-Keys (`_0`/`_1`/`_2`), die im IR auftauchen aber
am Use-Site unsichtbar sind. `each feature in $features` und
`feature.icon` funktionieren in beiden Formen unverändert.

## Migrationspfad zum Schema (Phase 2 → 3)

```mirror
// PHASE 1 — heute, untyped, Datenform direkt
features:
  icon "home", title "Willkommen", desc "Demo-Projekt."

// PHASE 2 — Schema-Deklaration kommt dazu (additive)
Feature:
  icon:  string
  title: string
  desc:  string = ""              // Default-Wert
  badge?: string                  // Optional

// Alte untyped-Form bleibt für Quick-Drafts gültig
features:
  icon "home", title "Willkommen", desc "Demo-Projekt."

// Neue typisierte Form
typedFeatures as Feature:
  icon "home", title "Willkommen"               // labeled bleibt erlaubt
  "layers", "Komponenten", "Bausteine"          // ODER positional, sobald Schema da ist

// PHASE 3 — Validator/Autocomplete/Refactor-Ops kommen on top
//   - „desc fehlt in Reihe 2" → Validator-Error
//   - feature.<TAB> → Liste der Schema-Felder im Editor
//   - rename desc → alle Reihen + alle feature.desc-Verwendungen
//   - „add field to all features" wird Operation auf der Shape statt Search&Replace
```

Wichtig: alle drei Phasen koexistieren. Phase 1 ist die Default-AI-
Schreibweise, Phase 2 der bewusste Schritt zur Strenge, Phase 3 zahlt
sich an Refactoring/IDE-Support aus.

## Konventionen, die schon stimmen

Mirror hat heute eine sehr saubere syntaktische Trennung:

| Was             | Syntax          | Beispiel                                |
| --------------- | --------------- | --------------------------------------- |
| **Deklaration** | mit `:`         | `primary.bg: #2271C1`, `Btn:`, `hover:` |
| **Anwendung**   | mit Leerzeichen | `bg #2271C1`, `Btn "Save"`, `pad 12`    |

Schema-Felder `icon: string = "home"` fallen in die Deklarations-Kategorie
und tragen damit dieselbe `:`-Konvention. Daten-Rows `icon "home"` fallen
in die Anwendungs-Kategorie und bleiben Leerzeichen-getrennt. **Das ist
forward-compatible und bereits konsistent** — keine Anpassung nötig.

## Offene Fragen für die Schema-Phase

Diese Punkte zwingen heute keine Entscheidung, müssen aber **vor** dem
ersten Schema-Commit beantwortet sein.

### 1. `as` ist überladen

Heute:

```mirror
PrimaryBtn as Button: bg #2271C1, col white   // Btn erbt von Button
```

Morgen:

```mirror
typedFeatures as Feature: ...                  // features ist typisiert mit Feature
```

Beide Lesarten sind kontextuell disambiguierbar (Großbuchstabe = Komponente
erbt; Kleinbuchstabe = Daten typisieren), aber das ist eine Falle für die
Doku und für Linter-Fehlermeldungen. Optionen:

- **Beide Lesarten unter `as` behalten** und in der Doku trennen
- **Eigenes Keyword für Typ-Binding** (`features: Feature[]` oder
  `features of Feature` oder `features is Feature`)

### 2. Reserved Type-Namen

`string`, `number`, `boolean`, `enum`, `date`, `id` werden Built-in-Typen.
Heute sind das normale Identifier — jemand könnte einen Token oder eine
Komponente so benennen.

**Action vor Phase 2:** Audit auf `examples/`, `docs/tutorial/`, alle
`.mir`-Dateien im Repo. Falls Konflikte: rename, oder Type-Namen mit
Prefix wählen (`@string`, `:string`, `Str`).

### 3. Generic-/Array-Notation

Du wirst `Feature[]` oder `Map<Feature>` brauchen wollen, sobald Schemas
da sind. Heute hat Mirror **keine** eckigen oder spitzen Klammern in der
DSL. Die Frage ist nicht „kommen sie", sondern „in welcher Form".

Optionen:

- **TypeScript-Style:** `Feature[]`, `Map<string, Feature>`
- **Wort-Style:** `list of Feature`, `map from string to Feature`
- **Suffix-Style:** `features.list: Feature`, `users.map: User`

Entscheidung fällt zusammen mit dem Type-System-Design.

### 4. Schema-Composition / Inheritance

`Feature extends Entity`? Oder `Feature is Entity { ... }`? Oder
`Entity > Feature: ...`?

Komponenten-Inheritance belegt schon die `as`-Form (`PrimaryBtn as Button`).
Schemas brauchen ein eigenes Pattern oder eine bewusste Wiederverwendung.

### 5. Cross-Reference und Identity

Sobald Daten Schemas tragen, will man:

- Stabile IDs (nicht nur positionale `_0`/`_1`)
- Cross-File-Referenzen (`task.assignee → users.alice`)
- Foreign-Key-Validierung („dieses Feld zeigt auf eine User-Reihe, die
  es nicht gibt")

Das ist der Übergang von „Daten als JSON" zu „Daten als kleines
Datenmodell". Architektonisch der größte Schritt.

### 6. TypeScript-Interop

Mirror compiliert zu JS. Will man Mirror-Schemas direkt als TS-Typen
exportieren (`Feature` wird `interface Feature`)? Das öffnet die Tür zum
Backend-Sharing — Mirror als Single-Source-of-Truth für Domain-Typen
zwischen Frontend und Backend. Sehr mächtig, aber auch sehr ehrgeizig.

## Wann ist „Phase 2" reif?

Schema-Komplexität jetzt einzuführen, wäre verfrüht. Konkrete Signale,
auf die ich warten würde:

1. **AI produziert dieselbe Datenstruktur dreimal mit subtil verschiedenen
   Feldern** — z.B. mal heißt es `desc`, mal `description`, mal `text`.
   Das ist der Moment wo Schemas Kohärenz erzwingen würden.

2. **„Add field to all rows" wird ein gefragtes Refactor** — sobald jemand
   im Studio fragt „kann ich allen Features ein `badge`-Feld geben?", ist
   das eine Schema-Operation, nicht eine Text-Operation.

3. **Datenmenge wächst über ~10 Reihen × ~5 Felder** — labels-pro-Reihe
   wird zur Belastung; Header-zentrierte Form (oder positional gegen
   Schema) gewinnt deutlich.

4. **Cross-Datei-Referenzen werden benötigt** — Tasks referenzieren Users,
   Posts referenzieren Authors. Validator muss dann wissen, was
   referenzierbar ist.

5. **IDE-Autocomplete wird vermisst** — Designer tippt `feature.` und
   erwartet Vorschläge. Heute geht das nicht; sobald es vermisst wird,
   ist es Zeit.

Vor diesen Signalen: kompakte Form reicht.

## Was wir NICHT entscheiden müssen, um zu starten

- Ob Schema-Definition mit `Schema X:` oder `X:` (Großbuchstabe als
  Disambiguierung) stattfindet
- Ob Type-Namen reserviert sind oder per Convention erkannt werden
- Ob Validierung zur Compile- oder Runtime stattfindet (oder beides)
- Wie Mirror-Schemas mit TS-Typen interagieren

All das kommt erst, wenn ein konkreter Use-Case das Pflichtenheft schreibt.

---

## Parallel-Diskussion: Prosa-Mode

Schemas adressieren **typisierte Daten**. Eine zweite, davon unabhängige
Achse ist **textlastige Inhalte**: Briefings, Strategiepapiere, Personas,
Tutorials, Landingpages mit echten Texten. Hier zerbricht die heutige Form
nicht an fehlender Typisierung, sondern an **Wrapper-Dichte um Prosa**.

### Symptom

Beispiel `examples/personas-informatik/index.mir`. Eine Bullet-Liste mit
Intro kostet 13 Zeilen Markup für 6 Zeilen Inhalt; eine numerierte Liste
4 Zeilen Wrapper pro Inhaltszeile. Der eigentliche Text wird vom
Komponentennamen + Quotes auf jeder Zeile zugedeckt.

Das Problem ist nicht die Grammatik (sie ist sauber), sondern dass jede
Prosa-Einheit eine eigene Zeile mit Komponentenname + Stringliteral
verlangt. In einer UI ist das richtig — Struktur _ist_ Bedeutung. In
einem Persona-Dokument ist die Struktur sekundär; der Text ist Bedeutung.

### Idee

`prose` als Frame-Property (analog zu `hor`, `gap`, `wrap`). Frames mit
diesem Marker erlauben in ihrem direkten Body eine **Markdown-Untermenge**,
die der Parser auf normale Mirror-Knoten abbildet.

```mirror
// Mapping einmal pro Datei oder Projekt
prose-style:
  paragraph:    BodyTxt
  paragraph-li: BodyTxtCompact
  bullet:       DashItem
  bullet-mark:  "—"
  numbered:     OffenePunkt
  numbered-num: OffeneNum
  heading-1:    H2
  heading-2:    H3
  heading-3:    H4

// Komponenten-Definition kann prose direkt mitbringen
Article as Frame: gap 18, prose

// Use-Site
Article
  ## Überblick

  Wir haben uns bewusst für **fünf Personas** entschieden — genug, um
  den Entscheidungsraum breit aufzuspannen, wenig genug, um sie im
  Alltag wirklich zu nutzen.

  - **Lukas und Nadia** stehen für die Gymi-Welt.
  - **Sara und Marco** stehen für die Berufslehre-Welt.
  - **Tim** vertritt eine eigene Logik.

  Zusammen decken sie vier Achsen ab.
```

Das compiliert zu **demselben AST** wie wenn man die Komponenten heute
manuell tippt. Kein Schatten-Renderer, kein zweiter Pfad, kein neues IR.

### Drei Hierarchie-Regeln

Mirror und Markdown haben unterschiedliche Hierarchie-Modelle. Damit
das nicht wirr wird, gilt:

**Regel 1: Prosa ist flach.** Innerhalb eines `prose`-Frames sind
Überschriften, Absätze und Bullets _Geschwister_, nicht Eltern/Kinder.
`## A ... ## B` produziert keine impliziten Sections — nur zwei H3-Knoten
mit Absätzen dazwischen. Das ist genau, wie jeder Markdown-AST arbeitet,
und vermeidet Edge Cases bei wechselnden Heading-Levels.

**Regel 2: Bullets nesten via Einrückung** (Standard-Markdown):

```mirror
Article
  - Top-Level
    - Sub-Bullet
    - Anderer Sub
  - Wieder Top-Level
```

Der einzige Ort, wo _innerhalb_ von Prosa-Modus Einrückung Hierarchie
bedeutet.

**Regel 3: Echte DOM-Container = normale Mirror-Zeile.** Wenn ein
Container mit eigenem `bg`, `pad`, ID, Sichtbarkeit gewünscht ist,
schreibt man eine reguläre Mirror-Zeile mitten im Prosa-Block:

```mirror
Article
  ## Einleitung
  Erster Absatz.

  SoftBox
    ## Hervorgehobene Box
    Diese Absätze sitzen in einem Frame mit bg $soft.

  ## Schluss
  Wieder normaler Prosa-Fluss.
```

Soll auch `SoftBox` Prosa erlauben, wird sie mit `prose` definiert
(`SoftBox as Frame: bg $soft, ..., prose`). Modus ist immer **pro Frame**
entschieden, nie global, nie vererbt.

### Absatz-Konvention

Eine Konvention, die bewusst von heutigem Mirror abweicht: **Leerzeile
trennt Absätze, einfacher Zeilenumbruch tut es nicht.** Standard-Markdown.

```mirror
Article
  Erster Absatz, der über
  zwei Zeilen umgebrochen ist.

  Zweiter Absatz.
```

→ zwei `BodyTxt`-Knoten. Heute (ohne `prose`) wäre jede Zeile ein eigener
Knoten. Die Konvention gilt nur in Prose-Mode.

### Komposition mit bestehenden Features

- **Variablen-Interpolation**: `$persona.warum` funktioniert in
  bare-string-Absätzen wie überall sonst.
- **`each` und `if`**: bleiben Mirror-Syntax, keine Markdown-Entsprechung.
  Innerhalb eines prose-Frames sind sie weiterhin als reguläre Zeilen
  schreibbar.
- **Inline-Markdown** (`**bold**`, `*italic*`): existiert bereits seit
  Commit `4ef36412`, prose-mode ist die natürliche Fortsetzung.
- **Bidirectional Editing**: Editor kennt zwei Repräsentationen für
  „ein Absatz" (`BodyTxt "..."` und Markdown-Zeile) und kann zwischen
  ihnen umformatieren. SourceMap zeigt auf die Markdown-Zeile.

### Was Prose-Mode NICHT ist

- **Kein separater File-Typ.** Eine `.mir`-Datei bleibt eine `.mir`-Datei.
- **Kein zweites IR.** Markdown wird beim Parsen in dieselben AST-Knoten
  übersetzt, die heute schon existieren.
- **Keine globale Umschaltung.** Per Frame, opt-in, niemals geerbt.
- **Kein Ersatz für UI-Mirror.** Dashboards, App-Screens, Forms bleiben in
  heutiger Form besser geschrieben — dort _ist_ Struktur primär.

Faustregel: **wenn der Text länger ist als die Komponente, prose an.
Wenn die Komponente länger ist als der Text, prose aus.**

### Stufen

1. **Minimal** — `, prose` als Frame-Property; bare strings → Default-Text;
   `-` → Bullet; `**bold**`/`*italic*` (existiert). Keine Headings, keine
   Numbered-List, keine Style-Mapping (Hardcoded auf `BodyTxt`/`DashItem`).
2. **Mittel** — wie oben gezeigt: `prose-style:`-Mapping, `#` / `##` / `###`
   Headings, `1.` numbered list, Indent-Nesting für Bullets.
3. **Voll** — Markdown-Links `[txt](url)`, evtl. Tabellen, Footnotes.

**Empfehlung:** Stufe 2 als Ziel. Sie löst `examples/personas-informatik/`
komplett und bleibt klein genug, dass Editor + Validator sauber unterstützen.
Stufe 1 ist als Spike zwischendurch sinnvoll, um Parser-Hooks zu validieren.

### Offene Fragen

**P1. Marker-Syntax.** `, prose` als Property, oder dedizierter Block-Marker
wie `>>>` / `:::`? Property-Form ist konsistent mit `hor`, `gap`, `wrap`
und vererbt sich über `as Frame: ..., prose`. Block-Marker wäre lokaler,
aber bricht die Property-Konvention. **Tendenz: Property.**

**P2. Style-Mapping-Scope.** Globales `prose-style:` (eine Mapping pro
Datei/Projekt) oder pro `prose`-Property (`prose dense`, `prose compact`)
oder beides? Wenn beides: Vererbungsregeln definieren.

**P3. Zeilenumbruch in Markdown vs Mirror.** In Mirror trennt heute jede
Zeile einen Knoten. In Markdown trennt erst die Leerzeile einen Absatz.
Wechsel der Regel ist nicht-trivial für Bidirectional Editing — der
Editor muss wissen, in welchem Modus eine Zeile gelesen wird, um
Edits korrekt zurückzuformatieren.

**P4. Variablen vs Markdown-Konflikte.** `$persona.warum` mitten in
einer Bullet-Liste — was ist, wenn die Variable selbst Markdown enthält?
Wird Inline-Markdown rekursiv expandiert oder als Literal eingesetzt?
Naheliegend: rekursiv (Persona-Texte enthalten heute schon `**bold**`),
aber das muss explizit gesagt werden.

**P5. Umgang mit `each` / `if` innerhalb prose.** Naheliegend: bleiben
Mirror-Syntax, werden als reguläre Zeile erkannt. Aber: was, wenn der
Body von `each` selbst Prosa ist? Erbt er den Modus? **Tendenz: nein —
jeder Frame entscheidet selbst.**

**P6. Validator-Verhalten.** Schema-Validierung in Stufe 1 trivial (alles
strings). Sobald `prose-style:` als Mapping existiert, muss Validator
prüfen: alle referenzierten Komponenten existieren, sind text-akzeptierend.

### Validation: das Personas-File als Akzeptanztest

`examples/personas-informatik/index.mir` ist der erste konkrete Anwendungsfall.
Akzeptanzkriterium: nach Migration auf Prose-Mode

- gleiches DOM (Pixel-identisch im Preview)
- gleiche SourceMap (Klick im Preview springt zur Markdown-Zeile)
- ~30 % weniger Zeilen, ~80 % weniger Wrapper-Rauschen pro Inhaltszeile
- Inline-Edit funktioniert weiterhin

---

## Zusammenfassung

- ✅ **Heutige Syntax ist forward-compatible** — kompakte Daten-Form ist
  Subset der zukünftigen Schema-tragenden Form
- ✅ **Colon-vs-Space-Konvention** trägt schon (Deklaration vs Anwendung)
- ⚠️ **5 offene Fragen Schema-seitig** sind benannt, aber alle additiv lösbar
- ⏸ **Phase 2 (Schema) nicht vorziehen** — konkrete Signale abwarten
- 🆕 **Prosa-Mode** als parallele, schema-unabhängige Erweiterung —
  6 offene Fragen, klarer erster Use-Case (Personas-File)

Der nächste konkrete Schritt ist nicht ein Schema-Commit, sondern
Beobachtung: wo zerfällt die heutige Form unter Realbedingungen, und
welcher der 5 (Schema) bzw. 6 (Prosa) offenen Punkte wird dabei zuerst
load-bearing.
