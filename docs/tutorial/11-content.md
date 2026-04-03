---
title: Content Management
subtitle: Markdown-Inhalte und redaktionelle Texte
prev: 10-variablen
next: 12-abfragen
---

Für redaktionelle Inhalte wie Artikel, Blog-Posts oder Dokumentation bietet Mirror Markdown-Unterstützung. Die Syntax ist überall gleich: inline in `.mir`-Dateien, in `.data`-Dateien oder als externe `.md`-Dateien.

## Inline Markdown-Blöcke

Mit `@blockname` und Einrückung definierst du Markdown-Inhalte direkt im Mirror-Code:

```mirror
$article:
  title: "Willkommen"
  author: "Max"
  @intro
    Eine **kurze** Einleitung zum Artikel.
  @body
    # Der Hauptteil

    Hier kommt der Text mit *Formatierung* und [Links](https://mirror.dev).

Frame bg #1a1a1a, pad 20, rad 12, gap 12
  H1 $article.title, col white
  Text "Von " + $article.author, col #888, fs 12
  $article.intro
```

**Regeln:**
- Erst alle `key: value` Attribute
- Dann `@block` Markdown-Blöcke
- Inhalt einrücken (wie bei Komponenten)

## Markdown-Blöcke in .data

Dieselbe Syntax funktioniert in externen `.data`-Dateien:

```
// data/articles.data

welcome:
title: Willkommen
author: Max

@intro
Eine **kurze** Einleitung zum Artikel.

@body
# Der Hauptteil

Hier kommt der eigentliche Text mit **Formatierung**:

- Erster Punkt
- Zweiter Punkt
- Dritter Punkt

## Ein Unterabschnitt

Weiterer Text mit *Hervorhebungen* und [Links](https://example.com).
```

**Regeln:**
- Erst alle `key: value` Attribute
- Dann `@block` Markdown-Blöcke
- Ein Block läuft bis zum nächsten `@` oder Eintrag

## Markdown verwenden

In Mirror greifst du auf Markdown-Blöcke wie auf normale Attribute zu:

```mirror-static
Article pad 20
  H1 $articles.welcome.title
  Text "Von " + $articles.welcome.author, col #888, fs 12
  $articles.welcome.intro
  $articles.welcome.body
```

Markdown wird automatisch gerendert – Überschriften, Listen, Links, alles funktioniert.

## Externe Markdown-Dateien

Für sehr lange Texte: Markdown in separate `.md`-Dateien auslagern:

```
// data/articles.data

welcome:
title: Willkommen bei Mirror
body: @welcome-body
```

```markdown
// content/welcome-body.md

# Erste Schritte

Mirror ist eine DSL für rapid UI prototyping.

## Installation

npm install mirror-lang


## Grundlagen

Schreibe einfach los:

Frame pad 20
  Text "Hello World"

```

**Vorteil:** Content-Autoren arbeiten in reinem Markdown – keine Mirror-Syntax nötig. In Mirror bleibt der Zugriff gleich: `$articles.welcome.body`

## Markdown stylen

Wie sehen `#`, `##`, `**`, `*` aus? Du definierst es wie Komponenten:

```mirror
// Global definieren
#: fs 32, weight 900, col white, margin 0 0 16 0
##: fs 24, weight 700, col white, margin 24 0 12 0
###: fs 18, weight 600, col white, margin 16 0 8 0
**: weight bold
*: italic
```

## Komponenten-spezifisches Styling

In einer Komponente kannst du Markdown-Styles überschreiben:

```mirror
// Kompaktes Styling für Sidebars
CompactArticle: Frame pad 16
  #: fs 16, weight 600, margin 0 0 8 0
  ##: fs 14, weight 500, margin 12 0 6 0

// Großes Styling für Hero-Sections
HeroArticle: Frame pad 40
  #: fs 48, weight 900, margin 0 0 24 0
  ##: fs 28, weight 600
```

Vererbung funktioniert wie bei normalen Komponenten.

## Praktisch: Blog-Layout

```
// data/posts.data

first-post:
title: Mein erster Artikel
author: Max
date: 2024-01-15

@excerpt
Eine kurze Zusammenfassung des Artikels.

@content
# Der vollständige Artikel

Hier steht der gesamte Inhalt...
```

```mirror-static
// Markdown-Styles
#: fs 28, weight 700, col white, margin 0 0 16 0
##: fs 20, weight 600, col white, margin 24 0 8 0
**: weight bold
*: italic

// Blog-Post Komponente
BlogPost: Frame bg #1a1a1a, pad 24, rad 12, gap 16
  Meta: Frame hor, gap 8
    Author: col #888, fs 12
    Date: col #666, fs 12

// Verwendung
each post in $posts
  BlogPost
    H1 post.title
    Meta
      Author post.author
      Date post.date
    post.content
```

## Das Prinzip

| Datei | Inhalt | Wer |
|-------|--------|-----|
| `.mir` | Layout, Komponenten, inline Daten | Designer/Entwickler |
| `.data` | Strukturierte Daten + Markdown | Entwickler |
| `.md` | Reines Markdown | Content-Autoren |

**Eine Syntax, flexible Aufteilung.** Ob du Daten inline definierst oder in Dateien auslagerst – die Syntax bleibt gleich. Mirror verbindet alles.

---

## Zusammenfassung

| Konzept | Syntax |
|---------|--------|
| Inline Markdown-Block | `@blockname` + Einrückung |
| Markdown-Block in .data | `@blockname` (ohne Einrückung) |
| Externe Datei | `field: @dateiname` |
| Zugriff | `$objekt.block` oder `$datei.eintrag.block` |
| Heading stylen | `#:`, `##:`, `###:` |
| Bold/Italic stylen | `**:`, `*:` |

**Eine Syntax, zwei Orte:** Die Syntax für Datenobjekte und Markdown-Blöcke ist identisch – ob inline in `.mir` oder ausgelagert in `.data`.
