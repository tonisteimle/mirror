# Tutorial: Daten und Content in Mirror

Dieses Kapitel zeigt, wie du strukturierte Daten und Content für Websites in Mirror definierst und verwendest.

## Was wir bauen

Eine Team-Website mit:
- Schema-Definition für Personen
- Daten-Instanzen mit mehrzeiligem Content
- UI-Komponenten mit Data-Binding
- Routing für Detail-Ansichten

## Grundkonzept: Schema → Data → UI

Mirror trennt drei Ebenen:

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

## Schema definieren

Ein Schema beschreibt die Struktur deiner Daten:

```mirror
Person
  name: text
  role: text
  avatar: text
```

**Syntax:**
- Typname als Überschrift (PascalCase)
- Felder eingerückt mit `feldname: typ`

**Verfügbare Typen:**

| Typ | Beschreibung | Beispiel |
|-----|--------------|----------|
| `text` | String | "Anna Schmidt" |
| `number` | Zahl | 42 |
| `boolean` | true/false | true |
| `content` | Mehrzeiliger Markdown | "# Titel\n\nText..." |
| `TypeName` | Relation zu anderem Typ | Person |
| `TypeName[]` | Liste von Relationen | Person[] |

## Daten-Instanzen erstellen

### Block-Syntax

```mirror
Person
  name "Anna Schmidt"
  role "UX Design Lead"
  avatar "/team/anna.jpg"

Person
  name "Ben Weber"
  role "Senior Engineer"
  avatar "/team/ben.jpg"
```

**Parser-Unterscheidung:**
- Schema: `name: text` (Doppelpunkt + Typ)
- Data: `name "Anna"` (Feld + Wert)

### Inline-Syntax (kompakt)

Für einfache Daten ohne Content:

```mirror
Person "Anna", "Designer", "anna.jpg"
Person "Ben", "Developer", "ben.jpg"
Person "Clara", "PM", "clara.jpg"
```

**Regeln:**
- Werte in Schema-Reihenfolge, durch Komma getrennt
- **Alle Felder müssen angegeben werden** - Felder überspringen ist nicht erlaubt
- Nur für einfache Typen (text, number, boolean)
- Nicht für content oder Relationen (diese brauchen Block-Syntax)

## Content-Felder

Für Websites brauchst du oft längeren Text. Dafür gibt es den `content` Typ:

### Schema mit Content

```mirror
Person
  name: text
  role: text
  avatar: text
  bio: content        // ← Mehrzeiliger Markdown
```

### Content schreiben

Content beginnt und endet mit `"`, darf mehrzeilig und eingerückt sein:

```mirror
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
```

**Regeln:**
- Beginnt mit `"`
- **Einzeilig:** `bio "Kurzer Text"` - Wert direkt nach `"`
- **Mehrzeilig:** `bio "` am Zeilenende, Content auf nächster Zeile, `"` auf eigener Zeile
- Markdown wird zu HTML kompiliert
- Basis-Einrückung wird automatisch entfernt

### Markdown in Content

Volle Markdown-Unterstützung:

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

## Data-Binding in UI

### Mit `data` Property

Die `data` Property verbindet UI-Komponenten mit Daten:

```mirror
TeamSection data Person, gap 16
  Card pad 16, bg #1a1a23, rad 8
    Image avatar, w 64, h 64, rad 32
    Text name, weight 600
    Text role, col #888
```

**Was passiert:**
1. `data Person` iteriert über alle Person-Instanzen
2. Für jede Person wird eine Card erstellt
3. Innerhalb der Card sind Felder direkt verfügbar (`name`, `role`, `avatar`)

### Impliziter Kontext

Innerhalb eines `data`-Containers sind Felder direkt verfügbar:

```mirror
// Mit data-Binding
PersonCard data Person
  Text name           // ← Direkt, nicht Person.name
  Text role

// Ohne data-Binding (JavaScript-Variable nötig)
PersonCard
  Text person.name    // ← Expliziter Pfad
  Text person.role
```

### Filter mit `where`

```mirror
// Nur aktive Personen
TeamList data Person where active == true
  Text name

// Kombinierte Bedingungen
SeniorTeam data Person where role == "Lead" && years > 5
  Text name
```

## Die `Content`-Komponente

`Content` rendert Markdown zu HTML:

```mirror
// Einfach
Content bio

// Mit Styling
Content bio, col #888, line 1.6

// Mit Container-Styles
Content bio, pad 24, bg #1a1a23, rad 8
```

**Generiertes HTML:**

```html
<div class="content">
  <p>Anna leitet unser Design-Team seit 2019.</p>
  <p>Mit über 10 Jahren Erfahrung in <strong>User Experience</strong>...</p>
</div>
```

## Relationen

### Schema mit Relationen

```mirror
Project
  name: text
  lead: Person        // ← Relation zu Person
  members: Person[]   // ← Liste von Personen

Person
  name: text
  role: text
```

### Daten mit Relationen

```mirror
Person
  name "Anna"
  role "Designer"

Person
  name "Ben"
  role "Developer"

Project
  name "Mirror v2"
  lead Person[Anna]              // ← Referenz auf Anna
  members Person[Anna], Person[Ben]
```

### UI mit Relationen

Relationen werden automatisch aufgelöst:

```mirror
ProjectCard data Project
  Text name, weight 600
  Text lead.name                 // → "Anna"

  MemberList data members
    Text name                    // → "Anna", "Ben"
```

## Content-Referenzierung für Websites

### Direkte Referenz

Zugriff auf spezifische Daten:

```mirror
// Data
Page
  title "Über uns"
  slug "about"
  body "..."

// UI - direkte Referenz mit Type[id].field
AboutPage
  H1 Page[about].title
  Content Page[about].body
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

// UI - $route enthält aktuellen Slug
PageView data Page where slug == $route
  H1 title
  Content body
```

## Blog-Beispiel: Liste + Detail

### Schema

```mirror
Post
  title: text
  slug: text
  date: text
  excerpt: text
  body: content
```

### Daten

```mirror
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
```

### UI - Blog-Liste

```mirror
BlogList ver gap 16
  H1 "Blog"

  Posts data Post, ver, gap 12
    PostCard pad 16, bg #1a1a23, rad 8, cursor pointer
      onclick page post/$slug
      Text title, weight 600
      Text excerpt, col #888
      Text date, col #666, font-size 12
```

### UI - Blog-Detail

```mirror
BlogPost data Post where slug == $slug
  Article pad 48, maxw 720
    Text date, col #666, font-size 12
    H1 title
    Content body, line 1.7
```

## CRUD-Operationen

### Hinzufügen

```mirror
// Neuen Eintrag mit Standardwerten
Button onclick add Person
  "Neue Person"

// Mit initialen Werten
Button onclick add Person name "Neu" role "Unbekannt"
  "Person hinzufügen"
```

### Löschen

```mirror
PersonCard data Person
  Text name
  DeleteBtn onclick remove
    Icon "trash"
```

`remove` ohne Parameter entfernt das aktuelle Item im Daten-Kontext.

### Bearbeiten

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

## Zusammenfassung

| Element | Syntax | Beispiel |
|---------|--------|----------|
| Schema | `field: type` | `name: text` |
| Data | `field "value"` | `name "Anna"` |
| Inline Data | `Type "v1", "v2"` | `Person "Anna", "Dev"` |
| Content | `"...\n..."` | `bio "# Titel\n\nText"` |
| Data-Binding | `data Type` | `data Person` |
| Filter | `where condition` | `where active == true` |
| Relation | `Type[id]` | `Person[Anna]` |
| Content-Render | `Content field` | `Content bio` |
| Direkte Ref | `Type[id].field` | `Page[about].title` |
| Route | `$route` | `where slug == $route` |
