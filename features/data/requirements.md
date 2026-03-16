# Data

## Übersicht

Mirror unterstützt ein natives Datenformat für strukturierte Daten und Content. Schemas definieren die Struktur, Instanzen enthalten die Werte. Besonders für Websites ermöglicht das Content-Feld mehrzeiligen Markdown-Text direkt in Mirror.

## Dokumentations-Status

| Dokument | Status |
|----------|--------|
| `requirements.md` | ✅ Vollständig |
| `tutorial.md` | ✅ Vollständig |
| `solution.md` | ✅ Vollständig |
| Testfälle | ✅ Dokumentiert |

## Feature-Status (Implementierung)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Schema-Definition | ❌ Noch nicht | Typen mit `name: type` Syntax |
| Data-Instanzen (Block) | ❌ Noch nicht | Werte mit Mirror-Syntax |
| Data-Instanzen (Inline) | ❌ Noch nicht | Kompakte Syntax `Person "Anna", "Dev"` |
| `content` Feldtyp | ❌ Noch nicht | Mehrzeiliger Markdown-Text |
| `data` Binding | ⚠️ Teilweise | Existiert, aber nur mit JS-Arrays |
| `each` Loop | ✅ Funktioniert | Iteration über Collections |
| `where` Filter | ✅ Funktioniert | Filter-Bedingungen |
| Relationen | ❌ Noch nicht | Verknüpfungen zwischen Typen |
| `add` Action | ❌ Noch nicht | Neuen Eintrag hinzufügen |
| `remove` Action | ❌ Noch nicht | Eintrag löschen |
| `bind` / `update` | ❌ Noch nicht | Zwei-Wege-Binding für Formulare |
| `Content`-Komponente | ❌ Noch nicht | Markdown zu HTML rendern |
| Direkte Referenz | ❌ Noch nicht | `Type[id].field` Syntax |
| Route-Binding | ❌ Noch nicht | `$route` für URL-Parameter |

## DSL Syntax

### Schema-Definition

```mirror
Person
  name: text
  role: text
  avatar: text
  bio: content
```

**Feldtypen:**

| Typ | Beschreibung |
|-----|--------------|
| `text` | String |
| `number` | Zahl |
| `boolean` | true/false |
| `content` | Mehrzeiliger Markdown-Text |
| `TypeName` | Relation zu anderem Typ |
| `TypeName[]` | Liste von Relationen |

**ID-Konvention:**
- Das erste `text`-Feld wird automatisch zur ID
- Wird für Relationen (`Person[Anna]`) und direkte Referenzen (`Person[anna].name`) verwendet
- IDs müssen innerhalb eines Typs eindeutig sein

```mirror
Person
  name: text      // ← Erstes text-Feld = ID
  role: text
  avatar: text
```

**Reihenfolge:**
- Schemas müssen vor ihren Data-Instanzen definiert werden
- Der Parser benötigt das Schema, um Data-Blöcke zu erkennen

### Data-Instanzen

```mirror
Person
  name "Anna"
  role "Designer"
  avatar "anna.jpg"
  bio "
    Anna ist seit 10 Jahren **UX Designerin**.

    Sie hat bei Google und Meta gearbeitet.
  "

Person
  name "Ben"
  role "Developer"
  avatar "ben.jpg"
  bio "
    Ben baut Compiler und liebt **funktionale Sprachen**.
  "

Person
  name "Clara"
  role "PM"
  avatar "clara.jpg"
  bio "
    Clara bringt Teams zusammen und sorgt dafür,
    dass Projekte _rechtzeitig_ fertig werden.
  "
```

### Content-Syntax

Content-Felder verwenden `"` für mehrzeiligen Text:

```mirror
Article
  title "Warum Mirror"
  date 2024-03-05
  body "
    Mirror ist eine DSL für **schnelles Prototyping**.

    ## Vorteile

    - Kompakt
    - Lesbar
    - Keine Konfiguration

    ## Fazit

    Probier es aus!
  "
```

**Regeln:**
- Content beginnt mit `"` und endet mit `"`
- **Einzeiliger Content:** `bio "Kurzer Text"` - Wert direkt nach `"`
- **Mehrzeiliger Content:** `bio "` gefolgt von Zeilenumbruch - Inhalt beginnt auf nächster Zeile
- Einrückung innerhalb wird normalisiert (Basis-Einrückung entfernt)
- Das schließende `"` muss auf eigener Zeile stehen (bei mehrzeilig)
- Markdown wird zu HTML kompiliert (`**bold**` → `<strong>bold</strong>`)
- Content-Felder sollten zuletzt stehen (Konvention)

**Unterscheidung einzeilig vs. mehrzeilig:**
```mirror
// Einzeilig - Wert direkt nach "
name "Anna Schmidt"
tagline "Design mit Leidenschaft"

// Mehrzeilig - " am Zeilenende, Content auf nächster Zeile
bio "
  Hier beginnt der Content.

  Zweiter Absatz.
"
```

### Markdown in Content

Content-Felder unterstützen volles Markdown:

```mirror
Article
  body "
    # Überschrift

    Ein Absatz mit **fett** und _kursiv_.

    - Listenpunkt 1
    - Listenpunkt 2

    > Ein Zitat

    [Ein Link](https://example.com)

    ```js
    const code = 'auch möglich';
    ```
  "
```

Wird kompiliert zu:

```html
<h1>Überschrift</h1>
<p>Ein Absatz mit <strong>fett</strong> und <em>kursiv</em>.</p>
<ul>
  <li>Listenpunkt 1</li>
  <li>Listenpunkt 2</li>
</ul>
<blockquote>Ein Zitat</blockquote>
<p><a href="https://example.com">Ein Link</a></p>
<pre><code class="language-js">const code = 'auch möglich';</code></pre>
```

### Data-Binding in UI

```mirror
// Schema
Person
  name: text
  role: text
  avatar: text

// Data
Person
  name "Anna"
  role "Designer"
  avatar "anna.jpg"

Person
  name "Ben"
  role "Developer"
  avatar "ben.jpg"

// UI
TeamSection data Person gap 16
  Card pad 16, bg #1a1a23, rad 8
    Image avatar, w 64, h 64, rad 32
    Text name, weight 600
    Text role, col #888
```

### Relationen

```mirror
// Schema
Project
  name: text
  lead: Person
  members: Person[]

Person
  name: text
  role: text

// Data
Person
  name "Anna"
  role "Designer"

Person
  name "Ben"
  role "Developer"

Project
  name "Mirror v2"
  lead Person[Anna]
  members Person[Anna], Person[Ben]

// UI - Relationen werden automatisch aufgelöst
ProjectCard data Project
  Text name, weight 600
  Text lead.name            // -> "Anna"
  MemberList data members
    Text name               // -> "Anna", "Ben"
```

### Filter

```mirror
// Alle aktiven Personen
TeamList data Person where active == true
  Text name

// Kombinierte Bedingungen
SeniorTeam data Person where role == "Lead" && years > 5
  Text name
```

### Inline-Syntax (kompakt)

Für einfache Daten ohne Content:

```mirror
// Schema
Person
  name: text
  role: text
  avatar: text

// Kompakte Instanzen (Reihenfolge wie im Schema)
Person "Anna", "Designer", "anna.jpg"
Person "Ben", "Developer", "ben.jpg"
Person "Clara", "PM", "clara.jpg"
```

Äquivalent zu:

```mirror
Person
  name "Anna"
  role "Designer"
  avatar "anna.jpg"
```

**Regeln:**
- Werte in Schema-Reihenfolge
- **Alle Felder müssen angegeben werden** - Felder überspringen ist nicht erlaubt
- Nur für einfache Typen (`text`, `number`, `boolean`)
- Nicht für `content` oder Relationen (diese brauchen Block-Syntax)

**Warum kein Überspringen?**
```mirror
// Schema
Person
  name: text
  role: text
  avatar: text

// Falsch - welches Feld fehlt?
Person "Anna", "anna.jpg"  // ❌ Unklar: role oder avatar?

// Richtig - alle Felder
Person "Anna", "Designer", "anna.jpg"  // ✅
```

### CRUD-Operationen

**Hinzufügen:**

```mirror
// Neuen Eintrag mit Standardwerten
Button onclick add Person
  "Neue Person"

// Mit initialen Werten
Button onclick add Person name "Neu" role "Unbekannt"
  "Person hinzufügen"
```

**Parsing-Regeln für `add`:**
- `add TypeName` - Neuer Eintrag ohne initiale Werte
- `add TypeName field "value" field2 "value2"` - Mit initialen Werten
- Felder nach dem TypeName werden als `name value`-Paare geparst
- Parser erkennt am bekannten Schema, welche Felder gültig sind

**Löschen:**

```mirror
PersonCard data Person
  Text name
  DeleteBtn onclick remove
    Icon "trash"
```

`remove` ohne Parameter entfernt das aktuelle Item im Daten-Kontext.

**Bearbeiten:**

```mirror
PersonCard data Person
  Input value name onchange update name
  Input value role onchange update role
```

Oder mit explizitem Binding:

```mirror
EditForm data Person[selected]
  Input bind name
  Input bind role
  Button onclick save
    "Speichern"
```

## Konzepte

### Schema vs. Data vs. UI

```
┌─────────────────────────────────────────────────┐
│  SCHEMA         DATA            UI              │
│  ───────        ────            ──              │
│  Person         Person          Card data Person│
│    name: text     name "Anna"     Text name     │
│    role: text     role "Dev"      Text role     │
│                                                 │
│  Struktur  →    Werte      →    Darstellung    │
└─────────────────────────────────────────────────┘
```

### Parser-Unterscheidung

Wie erkennt der Parser, ob ein Block Schema, Data oder UI ist?

**Schema** - Felder mit Doppelpunkt und Typ:
```mirror
Person
  name: text        // <- ":" + Typ = Schema
  role: text
```

**Data** - Felder mit Werten (Strings, Zahlen):
```mirror
Person
  name "Anna"       // <- Feld + Wert = Data
  role "Designer"
```

**UI** - Properties, Events, oder `as`/`:` Definition:
```mirror
Card pad 16, bg #333              // <- Properties = UI
PersonCard as Card:               // <- Definition = UI
  Text name                       // <- Komponente = UI
```

**Entscheidungsbaum:**

```
Block mit eingerückten Zeilen
│
├─ Zeilen haben ": typ" → SCHEMA
│
├─ Zeilen haben "feld wert" (ohne :) → DATA
│
└─ Zeilen haben Properties/Events/Komponenten → UI
```

**Beispiel - alles zusammen:**

```mirror
// Parser erkennt: Schema (wegen ": text")
Person
  name: text
  role: text

// Parser erkennt: Data (wegen Feldname + String-Wert)
Person
  name "Anna"
  role "Designer"

// Parser erkennt: UI (wegen Properties und Komponenten)
TeamPage pad 24
  TeamGrid data Person
    Text name
```

### Content-Normalisierung

Die Basis-Einrückung wird automatisch entfernt:

```mirror
Article
  body "
      Erster Absatz.

      Zweiter Absatz.
      "
```

Wird zu:

```
Erster Absatz.

Zweiter Absatz.
```

### Impliziter Kontext

Innerhalb eines `data`-Containers sind Felder direkt verfügbar:

```mirror
PersonCard data Person
  Text name           // nicht: Person.name
  Text role           // nicht: Person.role
```

Der Kontext ist durch `data Person` klar.

## Abgrenzung zu JavaScript

| Aspekt | Mirror Data | JavaScript |
|--------|-------------|------------|
| Syntax | Mirror-nativ | JS-Arrays/Objects |
| Schema | Explizit definiert | Implizit |
| Content | Mehrzeilig mit `"` | Template Literals |
| Relationen | Automatisch aufgelöst | Manuell |
| Verwendung | Prototyping, Websites | Komplexe Logik |

**JavaScript bleibt verfügbar** für komplexe Fälle:

```mirror
// Mirror Data für statischen Content
Person
  name "Anna"
  bio "..."

// JavaScript für dynamische Daten
let apiUsers = await fetch('/api/users').then(r => r.json())
```

## Content-Referenzierung für Websites

### Direkte Referenz

Zugriff auf spezifische Daten via `Type[id].field`:

```mirror
// Data
Page
  title "Über uns"
  slug "about"
  body "
    # Wer wir sind

    Wir bauen Tools für Designer.
  "

// UI - direkte Referenz
AboutPage
  H1 Page[about].title
  Content Page[about].body
```

### Via Data-Binding

Content innerhalb eines `data`-Containers:

```mirror
// Schema
Feature
  title: text
  icon: text
  description: content

// Data
Feature
  title "Schnell"
  icon "zap"
  description "
    Kompiliert in **unter 10ms**.

    Kein Warten, kein Build-Prozess.
  "

Feature
  title "Einfach"
  icon "smile"
  description "
    Eine Syntax für alles.
  "

// UI - Content via data-Binding
FeaturesSection data Feature, grid 2, gap 24
  FeatureCard pad 24, bg #1a1a23, rad 12
    Icon icon, size 32, col #3B82F6
    H3 title
    Content description, col #888
```

### Dynamisch via Route

Seiten basierend auf URL-Parameter:

```mirror
// Data
Page
  title "Home"
  slug "home"
  body "..."

Page
  title "Über uns"
  slug "about"
  body "..."

Page
  title "Kontakt"
  slug "contact"
  body "..."

// UI - $route enthält aktuellen Slug
PageView data Page where slug == $route
  H1 title
  Content body
```

### Blog: Liste + Detail

```mirror
// Schema
Post
  title: text
  slug: text
  date: text
  excerpt: text
  body: content

// Data
Post
  title "Warum Mirror"
  slug "warum-mirror"
  date "2024-03-05"
  excerpt "Eine neue Art zu prototypen"
  body "
    # Warum Mirror

    Mirror ist eine DSL für **schnelles Prototyping**.

    ## Das Problem

    Bestehende Tools sind zu langsam...
  "

Post
  title "Release v2"
  slug "release-v2"
  date "2024-03-10"
  excerpt "Die neue Version ist da"
  body "
    # Mirror v2

    Heute releasen wir **Version 2**...
  "

// UI - Blog-Liste
BlogList ver gap 16
  H1 "Blog"
  Posts data Post, ver, gap 12
    PostCard pad 16, bg #1a1a23, rad 8, cursor pointer
      onclick page post/$slug
      Text title, weight 600
      Text excerpt, col #888
      Text date, col #666, font-size 12

// UI - Blog-Detail (eigene Seite)
BlogPost data Post where slug == $slug
  Article pad 48, maxw 720
    Text date, col #666, font-size 12
    H1 title
    Content body, line 1.7
```

**Route-Interpolation:**
- `$feldname` in `page`-Actions wird durch den Wert des aktuellen Items ersetzt
- `onclick page post/$slug` mit `slug: "warum-mirror"` → navigiert zu `/post/warum-mirror`
- Die `$`-Syntax markiert Feld-Referenzen im Data-Kontext

### Die `Content`-Komponente

`Content` ist eine spezielle UI-Komponente für Markdown:

```mirror
// Rendert Markdown zu HTML
Content body

// Mit Styling
Content body, col #888, line 1.6

// Mit Wrapper-Styles
Content body, pad 24, bg #1a1a23, rad 8
```

**Generiertes HTML:**

```mirror
Content "
  # Titel

  Text mit **fett** und [Link](url).
"
```

Wird zu:

```html
<div class="content">
  <h1>Titel</h1>
  <p>Text mit <strong>fett</strong> und <a href="url">Link</a>.</p>
</div>
```

### Mehrere Content-Bereiche

Eine Seite kann mehrere Content-Felder haben:

```mirror
// Schema
LandingPage
  hero: content
  features: content
  cta: content

// Data
LandingPage
  slug "home"
  hero "
    # Prototyping neu gedacht

    Von der Idee zum Prototyp in Minuten.
  "
  features "
    ## Warum Mirror

    - **Schnell** - Keine Build-Zeit
    - **Einfach** - Eine Syntax
    - **Mächtig** - Echte Interaktionen
  "
  cta "
    ## Bereit?

    Starte jetzt kostenlos.
  "

// UI
HomePage data LandingPage where slug == "home"
  HeroSection pad 64, center
    Content hero

  FeaturesSection pad 48, bg #1a1a23
    Content features

  CTASection pad 64, center
    Content cta
    Button "Loslegen"
```

## Vollständiges Beispiel: Team-Website

```mirror
// === SCHEMA ===

Person
  name: text
  role: text
  avatar: text
  bio: content

// === DATA ===

Person
  name "Anna Schmidt"
  role "UX Design Lead"
  avatar "/team/anna.jpg"
  bio "
    Anna leitet unser Design-Team seit 2019.

    Mit über 10 Jahren Erfahrung in **User Experience**
    hat sie Produkte für Millionen Nutzer gestaltet.

    Vorher: Google, Meta, Spotify
  "

Person
  name "Ben Weber"
  role "Senior Engineer"
  avatar "/team/ben.jpg"
  bio "
    Ben ist unser Compiler-Experte.

    Er liebt **funktionale Programmierung** und hat
    an Rust und TypeScript mitgearbeitet.
  "

Person
  name "Clara Müller"
  role "Product Manager"
  avatar "/team/clara.jpg"
  bio "
    Clara sorgt dafür, dass wir die _richtigen_
    Dinge bauen - und sie rechtzeitig fertig werden.
  "

// === UI ===

TeamPage ver gap 48, pad 64
  Header
    H1 "Unser Team"
    Text "Die Menschen hinter Mirror" col #888

  TeamGrid data Person, grid 3, gap 24
    PersonCard ver gap 16, pad 24, bg #1a1a23, rad 12
      Image avatar, w 120, h 120, rad 60
      Text name, weight 600, font-size 18
      Text role, col #3B82F6
      Content bio, col #aaa, line 1.6
```

## Testfälle / Akzeptanz-Kriterien

### Schema-Definition

| Test | Input | Erwartung |
|------|-------|-----------|
| Einfaches Schema | `Person`<br>`  name: text` | Schema mit 1 Feld erkannt |
| Alle Feldtypen | `text`, `number`, `boolean`, `content` | Korrekte Typerkennung |
| Relation | `lead: Person` | `isRelation: true` |
| Array-Relation | `members: Person[]` | `isArray: true` |
| ID-Feld | Erstes `text`-Feld | Wird automatisch zur ID |

### Data-Instanzen

| Test | Input | Erwartung |
|------|-------|-----------|
| Block-Syntax | `Person`<br>`  name "Anna"` | DataInstance mit Feld |
| Inline-Syntax | `Person "Anna", "Dev"` | Felder in Schema-Reihenfolge |
| Inline unvollständig | `Person "Anna"` (3 Felder im Schema) | Fehler: Alle Felder erforderlich |
| Zahlenwerte | `count 42` | `value: 42` (number) |
| Boolean | `done true` | `value: true` (boolean) |

### Content-Parsing

| Test | Input | Erwartung |
|------|-------|-----------|
| Einzeilig | `bio "Kurzer Text"` | `"Kurzer Text"` |
| Mehrzeilig | `bio "`<br>`  Zeile 1`<br>`"` | Normalisierter String |
| Einrückung | 4 Spaces Basis | Basis-Einrückung entfernt |
| Relative Einrückung | Zusätzliche Spaces | Relative Einrückung erhalten |
| Markdown | `**bold**` | Unverändert im AST, HTML im Output |

### Block-Erkennung

| Test | Input | Typ |
|------|-------|-----|
| Schema | `name: text` | Schema |
| Data | `name "Anna"` | DataInstance |
| UI | `pad 16, bg #333` | UI-Komponente |
| Gemischt | Schema + Data + UI | Korrekte Trennung |

### Data-Binding

| Test | Input | Erwartung |
|------|-------|-----------|
| Einfaches Binding | `List data Person` | forEach über Collection |
| Mit Filter | `data Task where done == false` | filter() + forEach() |
| Verschachtelt | `data Project` → `data members` | Nested forEach |
| Feld-Zugriff | `Text name` (in data-Kontext) | `item.name` |

### Content-Komponente

| Test | Input | Erwartung |
|------|-------|-----------|
| Basis | `Content body` | `innerHTML = _mirrorMarkdown(...)` |
| Bold | `**text**` | `<strong>text</strong>` |
| Italic | `_text_` | `<em>text</em>` |
| Link | `[text](url)` | `<a href="url">text</a>` |
| Heading | `# Title` | `<h1>Title</h1>` |
| Liste | `- Item` | `<ul><li>Item</li></ul>` |

### Relationen

| Test | Input | Erwartung |
|------|-------|-----------|
| Referenz parsen | `lead Person[Anna]` | `{ type: 'relation', targetId: 'Anna' }` |
| Relation auflösen | `lead.name` | Lookup in Person-Collection |
| Array-Relation | `members Person[A], Person[B]` | Array von Referenzen |

### CRUD-Actions

| Test | Input | Erwartung |
|------|-------|-----------|
| Add einfach | `onclick add Person` | push() mit leeren Werten |
| Add mit Werten | `add Person name "Neu"` | push() mit initialen Werten |
| Remove | `onclick remove` | splice() im Kontext |
| Update | `onchange update name` | Direktes Property-Update |

### Route-Binding

| Test | Input | Erwartung |
|------|-------|-----------|
| $route Variable | `where slug == $route` | `window._mirrorRoute` |
| Route-Interpolation | `page post/$slug` | Hash-Navigation mit Wert |
| Hash-Change | URL ändert sich | Re-Render mit neuem $route |

### E2E-Szenarien

| Szenario | Beschreibung |
|----------|--------------|
| Team-Website | Schema + 3 Personen + Grid-Rendering |
| Blog-Liste | Posts filtern, Klick navigiert |
| Blog-Detail | Route-Binding, Content rendern |
| CRUD-App | Add/Remove/Update funktionieren |

## Was noch fehlt

### Parser-Erweiterungen

- Schema-Blöcke erkennen (`TypeName` + eingerückte Felder mit `:`)
- Data-Instanzen erkennen (`TypeName` + eingerückte Felder ohne `:`)
- Mehrzeilige Strings mit `"` parsen
- Content-Normalisierung implementieren

### IR-Erweiterungen

- Schema-Informationen im IR speichern
- Data-Instanzen als Collections verfügbar machen
- Relationen auflösen

### Runtime

- Collections aus Mirror-Data generieren
- `data` Property mit Mirror-Collections verbinden
- Content als Markdown rendern
