# Audit-Rubrik: Deep Modules in Mirror

Diese Rubrik definiert, wie wir die 8 Aspekte des Deep-Modules-Audits **operational** messen. Jeder Aspekt enthält:

- **Definition** — was misst es konzeptionell
- **Messung** — wie wird der Score ermittelt (mechanisch wo möglich, qualitativ sonst)
- **Skala 1–5** — von "deep/sauber" bis "pathologisch"
- **Hotspot-Trigger** — ab wann ist das Modul Ziel für Drill-Down
- **Auto-Detektion** — was kann `audit-depth.ts` mechanisch erkennen
- **Beispiele** — gut und schlecht, wenn möglich aus Mirror-Code
- **Limitierungen** — was misst die Metrik _nicht_

## Meta-Konvention

**Skala ist richtungs-konsistent:** bei jedem Aspekt bedeutet **hoher Score = schlechterer Zustand**. Das macht die Heatmap aggregierbar (Mittelwert über Aspekte = Hotspot-Indikator).

**Ausnahme: Aspekt 2 (Hidden Complexity)** ist _diagnostisch_, nicht direkt pathologisch — er fließt nicht in den Hotspot-Mittelwert ein, sondern bildet zusammen mit Aspekt 1 die zentrale **Depth Ratio**.

---

## Aspekt 1: Interface Complexity

### Definition

Wieviel kognitive Last entsteht für den Caller, das Modul _korrekt_ zu benutzen — nicht nur Symbol-Anzahl, sondern: was muss man wissen, in welcher Reihenfolge, mit welchen Vorbedingungen, mit welchem Verhalten bei Fehlern.

### Messung (Score-Punkte pro Public-Symbol, addiert)

- `+1` pro Parameter über 2 hinaus
- `+2` pro Generic-Parameter
- `+1` pro Optional-Parameter mit nicht-trivialer Default-Logik
- `+2` pro Side-Effect-Kategorie (mutiert State, emittiert Event, schreibt I/O, throws)
- `+2` wenn nicht-triviales Error-Handling erwartet (Caller muss try/catch oder Result-Discriminator)
- `+3` wenn temporale Vorbedingung (muss nach `init()` aufgerufen werden, nur in Phase X gültig)
- `+1` wenn Return-Typ ein Discriminated Union ist (Caller muss verzweigen)
- `+2` wenn Return-Wert "lebendig" ist (Subscription, Disposable, Stream — Cleanup-Pflicht)

**Modul-Score = Mittelwert über alle Public Symbols** (nicht Summe — Größe wird in Aspekt 2 erfasst).

### Skala

| Score | Interface-Score-Mittelwert | Charakterisierung                         |
| ----- | -------------------------- | ----------------------------------------- |
| 1     | ≤ 2                        | Symbole klar, niedrige kognitive Last     |
| 2     | 2–4                        | leichte Komplexität, gut handhabbar       |
| 3     | 4–7                        | moderate Last, dokumentationsbedürftig    |
| 4     | 7–12                       | schwer korrekt zu benutzen ohne Anleitung |
| 5     | > 12                       | gefährlich — fehleranfällig in Benutzung  |

### Hotspot-Trigger

Score ≥ 4 **und** ≥ 5 Public Symbols (kleine Module dürfen komplex sein).

### Auto-Detektion

- ts-morph: alle exportierten Symbole + Signaturen
- Side-Effect-Approximation: Funktion ruft `state.set`, `events.emit`, `console.*`, `fetch`, `localStorage.*`, `throw`?
- Generics & Optional-Params direkt aus AST

### Beispiele

**Gut:** `compiler/ir/` — Hauptexport `toIR(ast: AST): IR`. Ein Parameter, ein Return, kein Side-Effect, keine temporale Vorbedingung. Score ≈ 1.

**Verdacht (zu prüfen):** `studio/test-api/step-runner/runner.ts` — wenn `runStep()` mehrere Phasen mit Vorbedingungen hat.

### Limitierungen

Misst nicht semantische Komplexität (welche Werte sind erlaubt?), nicht Doku-Qualität, nicht Intuitivität — nur kognitive Last _unter Annahme dass die API verstanden ist_.

---

## Aspekt 2: Hidden Complexity

### Definition

Wieviel Komplexität versteckt das Modul _hinter_ seiner Schnittstelle. Hohe versteckte Komplexität bei niedriger Interface-Komplexität = **deep**. Wenig versteckte Komplexität = potentiell shallow (außer bei legitimen Trivial-Modulen wie reinen Type-Definitionen).

### Messung

- LOC der Implementierung (ohne Tests, ohne Types-only)
- Zyklomatische Komplexität (Summe über alle Funktionen)
- Anzahl interner (nicht-exportierter) Symbole
- Anzahl externer Imports (Abhängigkeiten)
- Anzahl mutierbarer interner States (Modul-Level `let`/`var`, Klassen-Felder)

**Roh-Score = log10(LOC × Cyclomatic × InternalSymbols)**, normiert auf 1–5 anhand der Verteilung über alle Module.

### Skala (richtungsumgekehrt!)

| Score | Versteckte Komplexität | Charakterisierung                    |
| ----- | ---------------------- | ------------------------------------ |
| 1     | viel                   | Modul leistet viel (potentiell deep) |
| 5     | wenig                  | Modul ist dünn (potentiell shallow)  |

### Verwendung

**Aspekt 2 ist diagnostisch.** Pathologie entsteht erst im Verhältnis zu Aspekt 1:

> **Depth Ratio = HiddenComplexity / InterfaceComplexity**

| Depth Ratio | Charakterisierung |
| ----------- | ----------------- |
| > 5         | **Deep Module** ✓ |
| 2–5         | moderat           |
| ≤ 2         | **Shallow** ⚠     |

### Auto-Detektion

ts-morph + ESLint-style cyclomatic complexity. Implementierung in `audit-depth.ts`.

### Limitierung

Misst Quantität, nicht Qualität der versteckten Komplexität. Ein Modul mit 2000 LOC kann zufällig komplex sein (= schlecht versteckt) oder essenziell komplex (= gut versteckt). Phase 3 muss qualitativ prüfen.

---

## Aspekt 3: Pass-Through-Methoden

### Definition

Methoden die nur an ein anderes Objekt delegieren, ohne eigenen Wert beizutragen. Klassisches Symptom für Wrapper-Klassen, "Manager"-Klassen, Dependency-Container.

### Messung

Eine Methode ist Pass-Through wenn alle gelten:

- Body ≤ 3 nicht-leere Zeilen
- Genau ein Methoden-Call auf ein anderes Objekt
- Argumente werden 1:1 weitergereicht (oder mit ≤ 1 trivialer Transformation)
- Kein Side-Effect außerhalb der Delegation

**Modul-Score = % Pass-Through-Methoden** von allen Public-Methoden.

### Skala

| Score | % Pass-Through | Charakterisierung                                 |
| ----- | -------------- | ------------------------------------------------- |
| 1     | 0%             | sauber                                            |
| 2     | 1–15%          | ok, gelegentliche Helper                          |
| 3     | 15–30%         | zu viel Delegation                                |
| 4     | 30–60%         | das Modul _ist_ überwiegend Wrapper               |
| 5     | > 60%          | reiner Pass-Through-Layer — Eliminations-Kandidat |

### Hotspot-Trigger

Score ≥ 4. Bei 5 fast immer Inline-und-Delete.

### Auto-Detektion

ts-morph: Methoden-Body-Pattern erkennen. Whitelist für legitime Adapter (Anti-Corruption-Layer zwischen Subsystemen) erst in Phase 3 manuell vergeben.

### Beispiele

**Schlecht:**

```ts
class UserService {
  getUser(id) {
    return this.repo.getUser(id)
  }
  saveUser(u) {
    return this.repo.saveUser(u)
  }
  deleteUser(id) {
    return this.repo.deleteUser(id)
  }
}
```

Score 5 — wozu existiert diese Klasse?

**Legitim:**
Adapter mit Typ-Konvertierung, Logging, Error-Mapping → Body wäre länger, fällt nicht unter Pass-Through.

**Mirror-Verdacht:** `studio/core/context.ts` (aus erstem Surface-Audit) — vermutlich Score 4–5.

---

## Aspekt 4: Conjoined Methods (Temporale Kopplung)

### Definition

Methoden, die in der Praxis immer in einer festen Reihenfolge aufgerufen werden müssen — `init()` vor `use()`, `begin()` vor `commit()`, `setX()` vor `getResult()`. Die Reihenfolge ist Wissen, das Caller halten müssen → Information Leakage in Form von Protokoll.

### Messung

- **Statisch:** ts-morph findet Aufruf-Sequenzen pro Caller-File. Wenn Methoden A,B,C aus Modul M in >70% der Caller in fester Reihenfolge auftauchen → Conjoined.
- **Hart:** Code-Kommentare oder `throw new Error('must call init first')` sind direkte Indizien.
- **Konstruktor-Indiz:** Klassen mit Konstruktor + Pflicht-Setup-Methode (`new X(); x.init()`) sind immer Conjoined.

**Modul-Score = Anzahl identifizierter Conjoined-Sequenzen** (ggf. gewichtet nach Sequenzlänge).

### Skala

| Score | Conjoined-Sequenzen    | Charakterisierung                         |
| ----- | ---------------------- | ----------------------------------------- |
| 1     | 0                      | keine temporale Kopplung                  |
| 2     | 1, dokumentiert        | tolerable, sichtbare Kopplung             |
| 3     | 1–2, undokumentiert    | Refactoring-Hinweis                       |
| 4     | 3–4                    | wiederholtes Protokoll-Wissen bei Callern |
| 5     | > 4 oder verschachtelt | Modul exportiert Phasen statt Funktionen  |

### Hotspot-Trigger

Score ≥ 3 — fast immer Refactoring-Hinweis: Sequenz sollte _eine_ Methode werden, oder Builder, oder Konstruktor-Argument.

### Auto-Detektion

Sequenz-Mining auf Call-Sites: betrachte aufeinanderfolgende Aufrufe innerhalb gleichem Block, prüfe Reihenfolge-Konsistenz über Caller. ≥ 70% gleiche Reihenfolge in ≥ 3 unabhängigen Callern → Sequenz-Kandidat.

### Limitierung

Schwer von "guter Workflow-API" (z.B. RxJS-Operator-Chains) zu unterscheiden. Phase 3 qualifiziert manuell.

---

## Aspekt 5: Information Leakage

### Definition

Wissen, das in _mehreren_ Modulen unabhängig kodiert ist und sich gemeinsam ändern muss. Klassiker: gleicher Regex, gleiches Datums-Format, gleiche Validierungs-Regel, gleiche Magic-Number, gleicher Property-Pfad.

### Messung (mehrere Sub-Detektoren)

- **String-/Regex-/Konstanten-Duplikate** über Modulgrenzen (Substring-Matching, Mindestlänge 12 Zeichen)
- **Type-Guards** die in mehreren Modulen die gleiche Struktur prüfen
- **Switch/If-Ketten** über die _gleichen_ Discriminator-Werte in mehreren Modulen
- **Property-Pfade** (`obj.foo.bar.baz`) mit Tiefe ≥ 3, identisch in mehreren Modulen — Indikator für leaking interne Struktur des Zielobjekts
- **Magic Numbers** mit identischem Wert in mehreren Modulen (außer 0/1/-1/100/etc.)

**Modul-Score = Anzahl Leakage-Instanzen × log(durchschnittliche Kopie-Anzahl)**

### Skala

| Score | Leakage-Bild                                                       |
| ----- | ------------------------------------------------------------------ |
| 1     | keine signifikanten Leaks                                          |
| 2     | 1–3 kleine Duplikate, lokal begrenzt                               |
| 3     | 5–10 Duplikate **oder** 1 großes über Subsystem-Grenzen            |
| 4     | viele kleine + einige große, mehrere Subsysteme                    |
| 5     | zentrale Konzepte multipel kodiert (z.B. ein Format in 5+ Modulen) |

### Hotspot-Trigger

Score ≥ 3 **und** Duplikate kreuzen Subsystem-Grenzen (`compiler/` ↔ `studio/` etc.). Innerhalb eines Subsystems ist Leakage weniger schädlich — über Grenzen hinweg ist sie strukturell.

### Auto-Detektion

- jscpd oder eigener String-Matcher für Konstanten/Strings/Regex
- ts-morph: PropertyAccessExpression-Chain-Analyse für Pfad-Duplikate

### Verdachts-Hypothesen für Mirror (zu validieren in Phase 1)

- Hex-Color-Validierung in Color-Picker, Token-Parser, Validator, Property-Panel
- Property-Alias-Mapping (`bg` → `background`) an mehreren Stellen
- DSL-Token-Listen (Property-Namen) zwischen Schema, Autocomplete, Validator

---

## Aspekt 6: Caller Survey

### Definition

Wie wird das Modul _tatsächlich_ verwendet? Lecken Internals durch? Reichen Caller über die Public-API hinaus? Greifen Caller auf zu viele Symbole gleichzeitig zu (Feature Envy)?

### Messung (vier Sub-Metriken)

| Sub-Metrik                    | Definition                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| **Internal-Reach-Rate**       | % der Caller-Files die _direkt_ auf interne Files zugreifen, nicht über `index.ts`               |
| **Symbol-Breadth pro Caller** | Mittelwert: wie viele verschiedene Public-Symbole zieht ein typischer Caller aus dem Modul       |
| **Wrapper-Count**             | Wie oft wird die Modul-API in Caller-eigene Helpers gewrappt? (Hinweis auf falsche Granularität) |
| **Reach-Around**              | Caller importiert Modul X _und_ Y, wobei X eigentlich Y kapseln sollte → Y leakt durch X         |

**Modul-Score = gewichtetes Aggregat** (Gewichte in Phase 0 vor erstem Sweep festzulegen, default: 0.4 / 0.3 / 0.2 / 0.1).

### Skala

| Score | Bild                                                                  |
| ----- | --------------------------------------------------------------------- |
| 1     | alle Caller über Public-API, niedriger Symbol-Breadth, keine Wrapper  |
| 3     | gelegentlicher Internal-Reach, einige Caller mit hohem Symbol-Breadth |
| 5     | viele Caller bypass Public-API, hoher Symbol-Breadth, viele Wrapper   |

### Hotspot-Trigger

Internal-Reach-Rate > 30% → starkes Encapsulation-Failure.

### Auto-Detektion

- ts-morph: Import-Pfade analysieren (`from 'studio/foo'` vs `from 'studio/foo/internal/bar'`)
- Wrapper-Erkennung: Funktionen in Caller-Files die mehrere Modul-X-Symbole kombinieren und neuen Namen geben

---

## Aspekt 7: Churn & Co-Change History

### Definition

Module, die sich oft ändern oder oft _gemeinsam_ mit anderen Modulen ändern, signalisieren falsche Modulgrenzen. Hoher Co-Change zwischen X und Y bedeutet: das eigentliche Konzept ist über X+Y verteilt.

### Messung

| Sub-Metrik           | Definition                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| **Churn-Rate**       | Anzahl Commits, die ein Modul in den letzten 6 Monaten berührt haben           |
| **Interface-Churn**  | Anzahl Commits, die _Exports_ dieses Moduls geändert haben (Subset von Churn)  |
| **Co-Change-Matrix** | Pro Paar (X,Y): in wieviel % der Commits, die X berühren, wird auch Y berührt? |

**Modul-Score = Kombination:** hoher Churn + hoher Interface-Churn + ≥ 1 Co-Change-Spitze > 70%.

### Skala

| Score | Bild                                                |
| ----- | --------------------------------------------------- |
| 1     | stabil, niedriger Co-Change                         |
| 3     | mäßiger Churn oder einzelne Co-Change-Hotspots      |
| 5     | hoher Churn **und** mehrere Co-Change-Partner > 70% |

### Hotspot-Trigger

- Interface-Churn > 10 in 6 Monaten → Schnittstelle ist falsch
- Co-Change zwischen X und Y > 70% (in beiden Richtungen) → fehlende Abstraktion

### Auto-Detektion

- `git log --name-only --since="6 months ago"` → Co-Change-Matrix bauen
- `git log -p` filtert auf `^export` / `^[+-]export` Zeilen → Interface-Churn

### Limitierung

Refactoring-Commits können Co-Change vortäuschen. Filter auf Feature-Commits in Phase 3 manuell. Frische Module haben künstlich niedrigen Churn — Score relativieren auf "Churn pro Lebensmonat".

---

## Aspekt 8: Domain Concept Mapping

### Definition

Welche Konzepte der Mirror-Domäne (DSL, Compiler, Studio) verdienen ein eigenes tiefes Modul — und wie gut wird das heute realisiert? **Qualitativster Aspekt**, nicht voll mechanisierbar.

### Messung (manuell, aber strukturiert)

**Schritt 1:** Liste der echten Domänen-Konzepte erstellen, z.B.:

- _DSL:_ AST, IR, SourceMap, Token, Component, Layout, State, Action, Validator
- _Studio:_ Selection, Command, EditorBuffer, PreviewSync, FileTree, ValidationResult, UndoStack
- _Compiler:_ Lexer, Parser, IR-Transform, Backend, Code-Gen

**Schritt 2:** Pro Konzept fragen:

| Score | Bild                                              |
| ----- | ------------------------------------------------- |
| 1     | dediziertes Modul, klare Verantwortung            |
| 3     | über mehrere Module verteilt, aber erkennbar      |
| 5     | nur implizit (Code-Patterns ohne benanntes Modul) |

**Schritt 3 (umgekehrt):** gibt es Module ohne klares Domain-Konzept ("Helper", "Util", "Manager", "Coordinator")? Solche Module sind Verlegenheits-Konstrukte und Refactoring-Kandidaten.

### Hotspot-Trigger

- Konzept-Score ≥ 3 → Refactoring-Kandidat für Phase 4 Soll-Architektur
- Modul ohne Domain-Konzept-Heimat → Eliminations- oder Konsolidierungs-Kandidat

### Auto-Detektion

Keine. Wird in Phase 3/4 manuell erarbeitet, gestützt auf Findings aus Aspekt 1–7.

---

## Aggregations-Regel für die Heatmap

Pro **(Subsystem × Aspekt)**-Zelle:

- Aspekt-Score = Mittelwert der Modul-Scores im Subsystem für diesen Aspekt

**Subsystem-Hotspot-Score** = Mittelwert über Aspekte 1, 3, 4, 5, 6, 7 (Aspekt 2 fließt nur via Depth Ratio in Aspekt 1 ein; Aspekt 8 ist qualitativ und separat).

**Subsystem ist Hotspot wenn:**

- Hotspot-Score ≥ 3.5, **oder**
- ≥ 2 Aspekte mit Score ≥ 4

## Was diese Rubrik bewusst NICHT misst

- Code-Style, Naming-Konventionen, Doku-Qualität
- Test-Coverage (separates Audit)
- Performance, Bundle-Size
- Security, Bug-Density
- Subjektive "Eleganz" oder "Schönheit"

Falls in Phase 1–3 sich eines dieser Themen als unausweichlich für die Tiefe-Bewertung herausstellt, wird die Rubrik in einem zweiten Pass _kontrolliert_ erweitert — nicht ad-hoc unterwegs.

## Versionierung

| Version | Datum      | Änderung                         |
| ------- | ---------- | -------------------------------- |
| 0.1     | 2026-04-28 | Initialer Wurf, vor erstem Sweep |
