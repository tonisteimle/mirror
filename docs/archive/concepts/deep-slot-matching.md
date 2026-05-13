# Deep Slot Matching

**Stand 2026-05-07 · umgesetzt, validiert mit `examples/personas-informatik/`**

## Vision in einem Satz

Eine Component-Definition deklariert eine beliebig tief verschachtelte
Struktur mit benannten Positionen; am Use-Site werden Filler **flach**
geschrieben und vom Compiler per Name an die richtige Stelle in der Definition
geroutet — unabhängig davon, wie tief die Position liegt.

## Designprinzip — die Faustregel

> **Reine Struktur weg, Semantik bleibt.**
>
> Wrapper, die nur Layout/Hintergrund/Max-Width tragen, gehören in die
> Component-Definition. Wrapper, die einen Namen für _was_ etwas ist tragen
> (eine Liste, eine Spalte, eine Reihe), bleiben am Use-Site sichtbar.

Diese Regel ist schärfer als „flach ist besser". Sie unterscheidet zwischen
zwei Arten von Verschachtelung, die im Use-Site visuell identisch aussehen,
aber semantisch unterschiedlich sind:

| Wrapper                                                                                          | Klassifikation    | Wo gehört er hin? |
| ------------------------------------------------------------------------------------------------ | ----------------- | ----------------- |
| `FooterFrame`, `Container`, `FooterGrid`, `SectionWide`, `TwoColumn`, `ProseColumn`              | strukturell       | in die Definition |
| `FooterColMain`, `FooterStatusList`, `FooterBaseRow`, `TocList`, `InnereStimmeQuotes`, `DimGrid` | semantisch        | am Use-Site       |
| `PersonaHeaderBand`, `PersonaHeaderRow`, `PersonaTitleStack`                                     | strukturell       | in die Definition |
| `PersonaNumeral`, `PersonaName`, `PersonaTag`, `PersonaSteckbrief`                               | semantisch (Leaf) | am Use-Site       |

Konkretes Beispiel — Footer in `examples/personas-informatik/app.mir`:

```mirror
// Strukturelle Wrapper (FooterFrame, Container, FooterGrid) sind weg —
// die kapselt FooterSection in seiner Definition.
// Semantische Wrapper (FooterColMain, FooterColMeta, FooterStatusList,
// FooterBaseRow) bleiben sichtbar — sie tragen die Bedeutung der Sektionen.
FooterSection
  LogoLight
  FooterColMain
    FooterHeading "Über dieses Dokument"
    FooterText "Internes Arbeitsdokument..."
  FooterColMeta
    FooterHeading "Status"
    FooterStatusList
      FooterText "Stand: 6. Mai 2026"
      FooterText "Version: v1"
      FooterText "Scope: Studiengang Informatik"
  FooterBaseRow
    FooterBase "..."
    FooterBase "..."
```

Die Test-Frage beim Refactor: _Wenn ich diesen Wrapper entferne, verliere
ich Information über das **was**, oder nur über das **wie**?_ Wenn nur das
Wie verloren geht — Wrapper raus, in die Definition. Wenn das Was verloren
geht — Wrapper bleibt.

## Problem

Mirror-Components mit visueller Tiefe zwingen am Use-Site eine
Treppen-Verschachtelung auf, die dem User strukturelle Wrapper aufbürdet,
obwohl er konzeptuell nur **Parameter** übergibt.

Beispiel aus `examples/personas-informatik/app.mir`:

```mirror
PersonaBlock
  PersonaHeaderBand
    Container
      PersonaHeaderRow
        PersonaNumeral "03"
        PersonaTitleStack
          PersonaName "Marco,"
          PersonaTag "der pragmatische EFZ-Absolvent"
```

Sieben Ebenen für drei Inhalte: Nummer, Name, Tag. Jede der inneren Frames
trägt eine echte visuelle Verantwortung (Hintergrundband, Max-Width-Container,
horizontale Zeile, Wrap-Stack), aber **das interessiert den Use-Site nicht**.
Der Use-Site will nur die drei Strings setzen.

Ziel:

```mirror
PersonaHeader
  Number "03"
  Name "Marco,"
  Tag "der pragmatische EFZ-Absolvent"
```

Vier Zeilen. Strukturelle Treppe lebt einmal in der Definition,
nicht an jeder Use-Site.

## Status quo

Mirror hat **flat slot matching** (`compiler/ir/ops/children-resolver.ts:60–69`):

```mirror
Card: bg #1a1a1a, pad 16, gap 8
  Title: col white, fs 16
  Desc: col #888

Card
  Title "Hello"
  Desc "World"
```

Funktioniert — solange die Slot-Definitionen **direkte Kinder** der
Component-Definition sind. Der Resolver baut `slotDefsByName` aus
`componentChildren` (eine Ebene), matched Use-Site-Children gegen diese Map.

**Limite:** Sobald ein Slot tiefer im Definition-Tree liegt
(`PersonaTitleStack > PersonaName`), erreicht ihn das flache Matching nicht
mehr. Der User muss die Verschachtelung manuell durchgehen.

## Zielzustand

### Algorithmus

1. **Slot-Sammlung — rekursiv.** Beim Auflösen einer Component-Instance den
   gesamten Definition-Tree durchwandern und alle benannten Positionen mit
   ihrem Pfad sammeln:

   ```ts
   type SlotEntry = { node: Instance | ComponentDefinition | Slot; path: number[] }
   type SlotMap = Map<string /* component-name */, SlotEntry[]>

   function collectSlotsRecursive(
     children: AstNode[],
     path: number[] = [],
     map: SlotMap = new Map()
   ): SlotMap {
     children.forEach((child, i) => {
       if (isInstance(child) || isComponent(child) || isSlot(child)) {
         const name = getName(child)
         const list = map.get(name) ?? []
         list.push({ node: child, path: [...path, i] })
         map.set(name, list)
         collectSlotsRecursive(getChildren(child), [...path, i], map)
       }
     })
     return map
   }
   ```

2. **Matching.** Jeder Use-Site-Child wird per Name in der `SlotMap`
   nachgeschlagen. Bei einem eindeutigen Treffer: der Filler ersetzt die Slot-
   Position an `path`. Bei mehreren Treffern: siehe „Pitfall 1".

3. **Property-Merge.** Unverändert via `mergeSlotPropertiesIntoFiller`
   (`compiler/ir/transformers/slot-utils.ts`). Slot-Properties bleiben
   Defaults, Filler-Properties überschreiben.

4. **Default-Inhalt.** Ein Slot ohne Filler rendert mit seinen Default-
   Properties und seinem Default-Body. Diese Semantik gibt es heute schon
   und bleibt.

### Pitfall 1 — Name-Kollisionen

Eine Component-Definition kann denselben Slot-Namen mehrfach im Tree haben:

```mirror
ProductCard:
  Header
    Title: fs 18, weight bold
  Body
    Title: fs 14, col #888
```

Strategie: **auto-fan-out + Path-Override**.

- **Ohne Pfad** (`Title "Foo"`) füllt **alle** Matches mit demselben Filler.
  Das ist konsistent, predictable, und im 90%-Fall (eindeutige Namen pro
  Component) trivial korrekt.
- **Mit Pfad** (`Header.Title "Top"`) gezielt eine spezifische Position.
  Pfad-Tokens sind die Component-Namen entlang des Definition-Trees.
- **Mehrfaches Filling derselben Position** (zwei `Header.Title`) ist
  ein Compile-Error.

```mirror
ProductCard
  Header.Title "Produkt X"
  Body.Title "29,99 €"
```

**Verworfene Alternativen:**

- _First-match-wins:_ Reihenfolge-fragil, stille Bugs.
- _Strikter Compile-Error bei Doppelnamen in Definition:_ zu restriktiv;
  `Title` ist legitim mehrfach.

### Pitfall 2 — Multi-Filler-Slots (Listen)

Bestehender Mechanismus bleibt unverändert (siehe
`children-resolver.ts:121–142`, „Process ALL instances for this slot"):

```mirror
TocList:
  Container
    TocRow:
      TocNum: ...
      TocName: ...

TocList
  TocRow
    TocNum "01"
    TocName "Lukas"
  TocRow
    TocNum "02"
    TocName "Sara"
```

Mehrere Filler mit demselben Slot-Namen werden in der Reihenfolge des
Use-Sites eingesetzt. Funktioniert flach wie tief, ohne Sonderbehandlung.

### Pitfall 3 — Globaler Component-Namespace

Wenn `Name as Text:` global definiert ist und `PersonaHeader` einen tiefen
Slot `Name` hat: wer gewinnt?

**Regel:** Innerhalb eines Component-Use-Sites gewinnt der **lokale Slot-
Namespace** des aufgerufenen Components. Ausserhalb ist `Name` wieder das
globale Component.

```mirror
// Hier ist Name der Slot von PersonaHeader
PersonaHeader
  Name "Marco,"

// Hier ist Name das globale Component
Frame
  Name "Standalone"
```

Diese Regel ist die einzige, die nicht überrascht — sonst kannst du nie
sicher sein, ob `Name "Foo"` ein Slot oder ein Component-Aufruf ist.

### Pitfall 4 — Slot vs. Default-Content vs. Inline-Children

Heute kennt der Resolver drei Arten von Use-Site-Children:

| Kategorie                                | Verhalten heute        |
| ---------------------------------------- | ---------------------- |
| Match auf direkten Slot                  | Wird Slot-Filler       |
| Kein Match (Component nicht in Slot-Map) | Bleibt regulärer Child |
| Text/Bare-Content                        | Bleibt regulärer Child |

Mit Deep Matching erweitert sich nur der erste Bucket — die Slot-Map ist
tiefer. Bucket 2 und 3 bleiben semantisch identisch. **Wichtig:** ein Use-
Site-Child, das im Tree der Definition als Slot existiert, wird zum Filler.
Das ist die einzige Verhaltensänderung gegenüber heute.

Risiko: ein Component, der heute als regulärer Child funktioniert (weil er
nicht direkter Slot ist), wird mit Deep Matching unerwartet zum Filler.
Mitigation: siehe Migration unten.

## Was wir aufgeben

**Strukturelle Lesbarkeit am Use-Site — aber nur für rein strukturelle
Wrapper.** Bei `PersonaHeader → PersonaHeaderBand → Container → ... →
PersonaName "Marco"` zeigte das alte Format explizit, _wo_ `PersonaName`
positioniert ist. Mit Deep Slots steht am Use-Site nur `PersonaName "Marco"`
— die Position lebt in der Definition.

Dieser Tradeoff ist _nur_ akzeptabel, weil das Designprinzip ihn auf
strukturelle Wrapper beschränkt. Die _semantische_ Verschachtelung
(`FooterColMain`, `FooterStatusList`, `TocRow`) bleibt sichtbar — und damit
bleibt die wichtige Information am Use-Site lesbar: was eine Sektion _ist_,
nicht wie sie gerendert wird.

## Forward-Kompatibilität

Deep Slot Matching ist **strikt additiv**: existierende Mirror-Files
funktionieren unverändert (flat matching ist ein Spezialfall von deep
matching mit Tiefe = 1). Die gesamte `tests/compiler/`-Suite (6798 Tests)
hat ohne Anpassung weiter bestanden.

## Implementierungsstand

Umgesetzt in zwei Files:

| File                                        | Änderung                                                                                                                  | Tatsächlich |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `compiler/ir/transformers/slot-utils.ts`    | `collectAllSlotNames` + `applyDeepSubstitutions`                                                                          | ~110 Zeilen |
| `compiler/ir/ops/children-resolver.ts`      | Pre-Pass vor Pass 1: deep substitutions identifizieren, componentChildren rewriten, Filler aus instanceChildren entfernen | ~30 Zeilen  |
| `tests/compiler/deep-slot-matching.test.ts` | 16 Tests (Unit + Integration)                                                                                             | ~360 Zeilen |

Validiert mit `examples/personas-informatik/` (507 → 454 Zeilen, 11 %
gespart, IR-Diff zeigt vollständige semantische Equivalenz).

## Test-Strategie

Vier Schichten, alle in `tests/`:

### 1. Unit — Slot-Sammlung

- Flat: `Card { Title:, Desc: }` → SlotMap mit 2 Einträgen, beide Tiefe 1
- Deep: `PersonaHeader { Band { Container { Row { Numeral:, Stack { Name:, Tag: } } } } }`
  → SlotMap mit 5 Einträgen, korrekte Pfade
- Kollision: `Card { Header { Title: }, Body { Title: } }` → SlotMap hat
  `Title` mit zwei Einträgen, unterschiedliche Pfade

### 2. Unit — Matching

- Eindeutiger Match: Filler landet an einzigem Pfad
- Auto-Fan-Out: Ein `Title "Foo"` füllt beide Header- und Body-Title
- Path-Override: `Header.Title "Top"` füllt nur Header-Title
- Doppelte Path-Override: Compile-Error
- Slot-Namespace: lokaler Slot überschreibt globalen Component-Namen

### 3. Differential — heute = morgen für Tiefe 1

Jede flache Component aus `examples/` und `tests/fixtures/` muss mit Deep
Matching dasselbe IR/DOM produzieren wie mit flat matching. Differential-
Test pro Fixture, automatisiert.

### 4. End-to-End — Personas refactor

`examples/personas-informatik/app.mir` mit Deep Slots geschrieben muss
visuell pixel-identisch zur heutigen Version rendern. Snapshot via
`npm run snapshot`, Diff via `npm run verify`.

## Was bewusst NICHT umgesetzt wurde — und warum

Während des Refactorings haben sich zwei mögliche Sprach-Erweiterungen
abgezeichnet, die aber durch das Designprinzip **überflüssig** geworden sind:

### Multi-Filler an Deep Slots

Idee: mehrere `Quote "..."` als Filler an einer einzigen `Quote:`-Slot-
Position, die positional aufgeklappt werden. Triebkraft war: am Use-Site
direkt mehrere Quotes ohne `InnereStimmeQuotes`-Wrapper schreiben können.

**Verworfen,** weil `InnereStimmeQuotes` ein **semantischer** Wrapper ist
(„das ist die Liste der Quotes"), nicht nur Struktur. Nach der Faustregel
bleibt er am Use-Site sichtbar. Mehrere `Quote`-Children inside ein
`InnereStimmeQuotes`-Instance funktionieren in v1 ohne Sonderbehandlung
— sie sind reguläre Kinder dieser Instance, keine Slot-Filler.

Genauso für `TocList { TocRow × 5 }` und `FooterStatusList { FooterText × 3 }`.

### Path-Syntax für Disambiguierung (`Header.Title "Foo"`)

Idee: bei Namens-Kollisionen am Use-Site explizit den Pfad angeben, um
gezielt eine bestimmte Slot-Position zu adressieren.

**Verworfen,** weil die Faustregel die Triebkraft eliminiert. Wenn dieselbe
Component zweimal in einer Definition vorkommt (z. B. `FooterHeading` in
beiden Footer-Spalten), bedeutet das: die zwei Vorkommen haben **unterschied-
liche semantische Rollen**. Diese Rollen verdienen **semantische Wrapper**
(`FooterColMain`, `FooterColMeta`), nicht Path-Syntax.

Beispiel — _nicht_ der Weg:

```mirror
// Path-Syntax wäre Workaround für eine schlechte Component-Struktur
FooterSection
  Main.FooterHeading "Über dieses Dokument"
  Meta.FooterHeading "Status"
```

Stattdessen — semantische Wrapper:

```mirror
FooterSection
  FooterColMain
    FooterHeading "Über dieses Dokument"
  FooterColMeta
    FooterHeading "Status"
```

Lesbarer, ohne Sprach-Erweiterung, und die Spalten-Struktur ist explizit
benannt statt versteckt in einem Punkt-Pfad.

### Was übrig bleibt für später

Wenn ein konkreter Use-Case auftaucht, in dem die Faustregel unzureichend
ist — also ein Wrapper sowohl strukturell als auch mit mehreren Of-Same-
Type-Children ist und keinen guten semantischen Namen findet — sollte man
diesen Fall analysieren. Bis dahin ist v1 das ganze Feature.

## Erkenntnisse aus dem Personas-Refactor

Drei Patterns haben sich bewährt:

1. **PersonaSection** — der klassische Fall: Treppe von 7 strukturellen
   Wrappern (`PersonaBlock > PersonaHeaderBand > Container >
PersonaHeaderRow > PersonaTitleStack > ...`) kollabiert auf vier
   Leaf-Slot-Filler (`PersonaNumeral`, `PersonaName`, `PersonaTag`,
   `PersonaSteckbrief`) plus `PersonaBody:` als Body-Slot. Der Use-Site
   liest sich wie ein Datenformular.

2. **InnereStimmeBlock** — vier-Level-Wrap (`SoftBox > Container >
InnereStimmeRow > InnereStimmeMeta`) verschwindet in der Definition.
   `H3:` und `BodyTxt:` sind Leaf-Slots; `InnereStimmeQuotes` bleibt am
   Use-Site sichtbar als semantische Liste.

3. **ProseSection** — `SectionWide > Container > TwoColumn > ProseColumn`
   wird zu einer flat `ProseSection` mit `H2:` und `ProseBody:` als Slots.

Ein Anti-Pattern, das beim Footer auftrat und dann korrigiert wurde:

- **Alias-Components als Slot-Disambiguatoren**: anfänglich entstanden
  `FooterMainHeading`, `FooterMetaHeading`, `FooterBaseLeft`, etc. als
  Aliase von `FooterHeading`/`FooterBase`, um auto-fan-out zu vermeiden.
  Korrigiert: stattdessen `FooterColMain`/`FooterColMeta`/`FooterBaseRow`
  als semantische Wrapper am Use-Site behalten, dann gibt es keine
  Kollision und die Aliase werden überflüssig.

**Faustregel-Test pro Wrapper:** _Wenn ich diesen Wrapper entferne, verliere
ich Information über das **was**, oder nur über das **wie**?_
