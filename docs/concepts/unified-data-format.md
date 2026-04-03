# Unified Data Format

## Konzept

Ein einheitliches Datenformat für alles: Tokens, strukturierte Daten und Content mit Markdown. Alles wird über `$` referenziert.

## Prinzip: Saubere Trennung

| Datei | Inhalt | Wer |
|-------|--------|-----|
| `.data` | Struktur, Metadaten, Referenzen | Entwickler |
| `.md` | Reines Markdown, nichts anderes | Content-Autoren |
| `.mir` | Layout, Komponenten | Designer |

**Markdown bleibt Markdown.** Kein Frontmatter, keine Marker, keine Mirror-Syntax. Einfach Text.

```markdown
// content/willkommen.md

# Willkommen

Das ist **reines** Markdown.

Kann mit jedem Editor bearbeitet werden.
Kann woanders wiederverwendet werden.
Keine Lernkurve für Content-Autoren.
```

Die Verbindung zwischen Struktur und Content passiert in `.data` – dort wo Struktur hingehört.

## Das .data Format

```
// data/posts.data

erster-post:
title: Erster Post
author: Max
date: 2024-01-15
featured: true

@intro
Eine **kurze** Einleitung.

@body
# Der Hauptteil

Langer Text mit allem was Markdown kann.

- Listen
- **Formatierung**
- [Links](url)

zweiter-post:
title: Zweiter Post
author: Anna
date: 2024-01-20

@intro
Andere Einleitung.

@body
Anderer Text...
```

## Syntax-Regeln

| Syntax | Bedeutung |
|--------|-----------|
| `name:` | Neuer benannter Eintrag (auf eigener Zeile) |
| `key: value` | Einfaches Attribut (String, Zahl, Boolean) |
| `@block` | Markdown-Block (läuft bis zum nächsten `@` oder Eintrag) |

**Reihenfolge innerhalb eines Eintrags:**
1. Erst alle `key: value` Attribute
2. Dann alle `@block` Markdown-Blöcke

## Referenzierung in Mirror

Alles über `$`:

| Syntax | Ergebnis |
|--------|----------|
| `$posts` | Array aller Einträge in posts.data |
| `$posts.erster-post` | Einzelner Eintrag |
| `$posts.erster-post.title` | `"Erster Post"` (String) |
| `$posts.erster-post.featured` | `true` (Boolean) |
| `$posts.erster-post.intro` | Markdown → automatisch Prose |
| `$posts.erster-post.body` | Markdown → automatisch Prose |

## Beispiel: Blog

**Daten:**
```
# data/posts.data

mirror-intro:
title: Einführung in Mirror
author: Max
date: 2024-01-15
tags: [tutorial, basics]

@intro
Lerne die **Grundlagen** von Mirror in 10 Minuten.

@body
# Was ist Mirror?

Mirror ist eine DSL für rapid UI prototyping...

## Installation

npm install mirror-lang

advanced-layouts:
title: Fortgeschrittene Layouts
author: Anna
date: 2024-01-20
tags: [tutorial, layout]

@intro
Grid, Flex und Stacked – alle Layout-Systeme erklärt.

@body
# Layout-Systeme

Mirror bietet drei Layout-Systeme...
```

**Mirror:**
```mirror
// Komponenten
BlogCard: Frame bg #1a1a1a, pad 20, rad 12, gap 12
  CardTitle: H2 fs 18, weight 600, col white
  CardMeta: Text fs 12, col #888
  CardIntro: Frame col #aaa, fs 14

// Blog-Übersicht
Frame gap 24
  H1 "Blog"

  each post in $posts
    BlogCard
      CardTitle post.title
      CardMeta post.author + " · " + post.date
      CardIntro
        post.intro

// Einzelner Post
Article maxw 680, pad 40
  H1 $posts.mirror-intro.title
  Text $posts.mirror-intro.author, col #888
  $posts.mirror-intro.body
```

## Beispiel: Design Tokens

**Daten:**
```
// data/tokens.data

colors:
primary-bg: #2563eb
primary-col: white
secondary-bg: #10b981
danger-bg: #ef4444
surface-bg: #1a1a1a
muted-col: #888888

spacing:
sm-pad: 8
md-pad: 16
lg-pad: 24
xl-pad: 32

radii:
sm-rad: 4
md-rad: 8
lg-rad: 12
full-rad: 9999
```

**Mirror:**
```mirror
// Tokens verwenden
Button bg $tokens.colors.primary-bg, col $tokens.colors.primary-col
Card bg $tokens.colors.surface-bg, rad $tokens.radii.md-rad, pad $tokens.spacing.lg-pad
```

## Beispiel: Webseite mit Content

**Daten:**
```
// data/pages.data

home:
title: Willkommen
description: Die beste App für alles

@hero
# Baue UIs in Minuten

Mirror ist eine DSL für **rapid prototyping**.
Schreibe was du siehst, erhalte was du meinst.

@features
## Schnell
Kompiliert sofort – keine Build-Schritte.

## Einfach
Lesbar wie Prosa, mächtig wie Code.

@cta
Kostenlos starten →

about:
title: Über uns

@content
# Wer wir sind

Ein kleines Team mit großen Ideen...
```

**Mirror:**
```mirror
// Landing Page
Frame gap 60
  HeroSection center, pad 80
    $pages.home.hero

  FeaturesGrid grid 3, gap 20
    $pages.home.features

  Frame center
    Button bg #2563eb, col white, pad 16 32, rad 8
      $pages.home.cta

// About Page
Article maxw 680
  $pages.about.content
```

## Dateistruktur

```
data/
  tokens.data       → $tokens
  posts.data        → $posts
  pages.data        → $pages
  users.data        → $users
```

Dateiname (ohne .data) = Variablenname.

## Werttypen

**Einfache Attribute:**
```
title: Mein Titel              // String
count: 42                      // Zahl
featured: true                 // Boolean
tags: [a, b, c]                // Array
```

**Markdown – zwei Wege:**

| Ansatz | Syntax | Wann |
|--------|--------|------|
| Inline | `@block` | Kurze Texte, alles zusammen |
| Extern | `field: @dateiname` | Lange Texte, separate Pflege |

**Inline Markdown:**
```
erster-post:
title: Erster Post

@intro
Kurzer **Text** direkt hier.

@body
# Hauptteil

Auch direkt in der Datei.
```

**Externe Markdown-Referenz:**
```
erster-post:
title: Erster Post
intro: @erster-post-intro
body: @erster-post-body
```

```
// content/erster-post-intro.md

Kurzer **Text** in separater Datei.
```

```
// content/erster-post-body.md

# Hauptteil

Langer Markdown-Text, separat gepflegt.
```

**In Mirror identisch:**
```mirror
// Egal ob inline oder extern – gleiche Syntax
$posts.erster-post.intro
$posts.erster-post.body
```

## Markdown-Styling

Markdown-Marker als Style-Definitionen – wie Komponenten:

```mirror
// Global definieren
#: fs 32, weight 900, col white
##: fs 24, weight 700, col white
###: fs 18, weight 600, col #ccc
**: weight bold
*: italic
-: margin 0 0 4 0
>: pad 12, bor 0 0 0 3, boc #2563eb, col #aaa, italic
a: col #2563eb
code: font mono, bg #1a1a1a, pad 2 6, rad 4
```

**Überschreiben in Komponenten:**

```mirror
// Kleine Artikel-Variante
SmallArticle: Frame pad 20
  #: fs 20, weight 600
  ##: fs 16, weight 500

SmallArticle
  $posts.erster-post.body
```

**Lokal überschreiben:**

```mirror
Frame pad 40
  #: fs 48, col #2563eb
  $pages.home.hero
```

**Regeln:**
- Vererbung wie bei Komponenten
- Überschreibung im lokalen Scope
- Kein neues Konzept – gleiche Syntax

## Automatisches Rendering

Mirror erkennt automatisch den Typ:

- `key: value` → String/Zahl/Boolean → für `Text`, Attribute
- `@block` → Markdown → automatisch als Prose gerendert

```mirror
// String → Text-Inhalt
H1 $posts.erster-post.title

// Markdown → Prose (automatisch)
$posts.erster-post.body
```

## Inline Markdown in Strings

In Mirror-Dateien: Markdown innerhalb von `"..."` erlaubt.

```mirror
Text "Das ist **wichtig** und *betont*."
Text "Lies die [Dokumentation](docs)."
```

## Implementierungs-Status

- [ ] **Parser**: .data Format parsen
- [ ] **Parser**: `name:` als Eintragstrenner
- [ ] **Parser**: `key: value` Attribute
- [ ] **Parser**: `@block` Markdown-Blöcke
- [ ] **Loader**: .data Dateien aus `data/` laden
- [ ] **Compiler**: `$file.entry.attr` Referenzen auflösen
- [ ] **Compiler**: Markdown-Blöcke als Prose rendern
- [ ] **Compiler**: Inline-Markdown in Strings
- [ ] **Runtime**: `$get()` für unified data access
