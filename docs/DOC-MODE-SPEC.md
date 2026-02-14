# Doc-Mode Spezifikation

> Erweiterung der Mirror-Syntax für Dokumentations-Generierung

## Übersicht

Doc-Mode ermöglicht das Erstellen von Dokumentationen (wie mirror-docu.html) direkt in Mirror-Syntax. Die Erweiterung ist minimal und baut auf dem bestehenden Token-System auf.

## Syntax-Erweiterungen

### 1. Mehrzeilige Text-Strings `'...'`

**Neu:** Single-Quote Strings für mehrzeiligen Text mit Formatierung.

```
text
  'Dies ist ein mehrzeiliger Text.
   Er kann über beliebig viele Zeilen gehen.

   Leerzeilen sind erlaubt.'
```

**Regeln:**
- Beginnt mit `'` und endet mit `'`
- Kann Zeilenumbrüche enthalten
- Führende Whitespace-Einrückung wird normalisiert (Common Indent entfernt)
- Escaping: `\'` für literales Single-Quote

**Abgrenzung zu `"..."`:**
| Feature | `"..."` | `'...'` |
|---------|---------|---------|
| Mehrzeilig | Nein | Ja |
| Token-Formatierung | Nein | Ja |
| Verwendung | Komponenten-Text | Doc-Mode Text-Blöcke |

### 2. Token-Anwendung in Text

Innerhalb von `'...'` Strings können Tokens auf Text angewendet werden.

#### Block-Level: `$token Text`

Token wird auf den Rest der Zeile angewendet (bis Zeilenende oder nächster Token).

```
'$h2 Eine Überschrift

$p Dies ist ein Paragraph. Er geht bis zum Zeilenende.

$p Ein weiterer Paragraph.'
```

**Parsing-Regel:**
- `$token` am Zeilenanfang (nach optionalem Whitespace)
- Erfasst Text bis: Zeilenende ODER nächster `$token` am Zeilenanfang

#### Inline-Level: `$token[phrase]`

Token wird auf geklammerten Text angewendet.

```
'$p Dies ist ein Text mit $b[fettem] Wort und $i[kursivem] Wort.

$p Auch $code[inline code] und $link[Links](https://example.com) sind möglich.'
```

**Parsing-Regel:**
- `$token[` öffnet Inline-Span
- `]` schließt Inline-Span
- Escaping: `\[` und `\]` für literale Klammern

#### Link-Syntax: `$link[text](url)`

Spezialfall für Links mit URL.

```
'$p Mehr Info unter $link[Mirror Docs](https://mirror.dev).'
```

### 3. Vordefinierte Doc-Tokens

Diese Tokens sind für Doc-Mode vordefiniert (können überschrieben werden):

```
// Überschriften
$h1: size 48 weight 400 col #eee mar 0 0 8
$h2: size 28 weight 500 col #fff mar 48 0 16
$h3: size 18 weight 500 col #fff mar 32 0 12
$h4: size 15 weight 500 col #aaa mar 24 0 8

// Text
$p: size 14 col #777 mar 0 0 12 maxw 480 line 1.7
$lead: size 14 col #777 mar 0 0 20 maxw 480

// Inline-Styles
$b: weight 600
$i: italic
$u: underline
$code: font "monospace" bg #252525 pad 2 6 rad 3 size 12
$link: col #5ba8f5 underline cursor pointer
```

### 4. Block-Komponenten

#### `text` Block

Container für formatierten Text.

```
text
  '$h2 Überschrift

   $p Paragraph mit $b[fett] und $i[kursiv].'
```

**Rendering:** Erzeugt verschachtelte Text-Elemente mit entsprechenden Styles.

#### `playground` Block

Zeigt Mirror-Code als Code-Ansicht UND als gerenderte Preview.

```
playground
  'Button bg #2271c1 pad 12 24 rad 8 "Click me"'
```

**Rendering:**
```
┌─────────────────────────────────────┐
│ [Code-Ansicht mit Syntax-Highlight] │
├─────────────────────────────────────┤
│ [Live Preview - gerenderter Button] │
└─────────────────────────────────────┘
```

**Properties:**
- `layout hor` - Code und Preview nebeneinander (default: übereinander)
- `code-only` - Nur Code zeigen
- `preview-only` - Nur Preview zeigen

#### `navigation` / `TableOfContents`

Automatisch generiertes Inhaltsverzeichnis.

```
doc
  navigation    // Sammelt alle $h2 und erzeugt Link-Liste

  text '$h2 Erste Section ...'
  text '$h2 Zweite Section ...'
```

**Rendering:** Erzeugt eine vertikale Liste mit Links zu allen `$h2` Überschriften.

### 5. Doc-Container

```
doc
  navigation

  text '...'
  playground '...'
  text '...'
```

Der `doc` Container:
- Setzt Doc-Mode Defaults (Hintergrund, Schrift, Layout)
- Ermöglicht flache Struktur (keine strikte Einrückung für Kinder)

## Parsing-Änderungen

### Lexer

Neuer Token-Typ: `MULTILINE_STRING`

```typescript
// Erkennung
if (char === "'" && !insideString) {
  // Sammle alles bis schließendes '
  // Handle escaping \'
}
```

### Parser

#### Block-basiertes Parsing für Doc-Mode

Wenn Parser auf `text` oder `playground` trifft:
1. Erwarte `MULTILINE_STRING` als nächstes Token (ignoriere Einrückung)
2. Parse den String-Inhalt mit Token-Formatierung

```typescript
// Pseudo-Code
if (componentName === 'text' || componentName === 'playground') {
  const content = expectMultilineString()
  if (componentName === 'text') {
    return parseFormattedText(content)
  } else {
    return createPlayground(content)
  }
}
```

#### Token-in-Text Parsing

```typescript
function parseFormattedText(content: string): ASTNode[] {
  const nodes: ASTNode[] = []
  let pos = 0

  while (pos < content.length) {
    // Block-level: $token am Zeilenanfang
    if (isLineStart && content[pos] === '$') {
      const { token, text, endPos } = parseBlockToken(content, pos)
      nodes.push(createTextNode(text, token))
      pos = endPos
      continue
    }

    // Inline: $token[...]
    if (content[pos] === '$' && content.includes('[', pos)) {
      const { token, text, endPos } = parseInlineToken(content, pos)
      nodes.push(createSpanNode(text, token))
      pos = endPos
      continue
    }

    // Plain text
    nodes.push(createTextNode(collectPlainText(content, pos)))
  }

  return nodes
}
```

## Migration

### Alte Syntax (wird entfernt)

```
"Text mit *bold*:bold und *italic*:italic"
```

### Neue Syntax

```
text
  '$p Text mit $b[bold] und $i[italic]'
```

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `lexer.ts` | `MULTILINE_STRING` Token hinzufügen |
| `string-handler.ts` | `parseInlineSpans()` durch neue Logik ersetzen |
| `parser.ts` | Block-basiertes Parsing für `text`/`playground` |
| Neu: `doc-tokens.ts` | Vordefinierte Doc-Tokens |
| Neu: `playground.tsx` | Playground-Komponente |
| Neu: `doc-text-parser.ts` | Token-in-Text Parser |

## Beispiel: Vollständiges Dokument

```
doc

navigation

text
'$h1 Mirror Documentation

$lead One syntax for structure, styling, and interactions.'

text
'$h2 Getting Started

$p Mirror is a description language for $b[user interfaces].
Write components with properties inline:

$p See the $link[full documentation](https://mirror.dev/docs) for more.'

playground
'Button bg #2271c1 pad 12 24 rad 8 "Click me"
Button bg #333 pad 12 24 rad 8 "Secondary"'

text
'$h2 Properties

$p Properties style a component. Colors can be written directly:

$code[Button #2271c1 "Short"] is equivalent to $code[Button bg #2271c1 "Long"]'

playground
'Row gap 12
  Button #2271c1 pad 12 24 rad 8 "Short form"
  Button bg #2271c1 pad 12 24 rad 8 "Long form"'
```

## Design-Entscheidungen

1. **Keine verschachtelten Tokens.** Statt `$b[$i[text]]` definiert man kombinierte Tokens:
   ```
   $highlight: italic weight 600
   $code-bold: font "monospace" weight 700
   ```

2. **Keine Listen/Tabellen-Syntax.** Diese sind in allen Text-Systemen (inkl. Markdown) problematisch. Für komplexe Strukturen verwendet man Mirror's native Komponenten.

---

## Implementierungs-Reihenfolge

### Phase 1: Lexer
- [ ] `MULTILINE_STRING` Token (`'...'`)
- [ ] Tests für mehrzeilige Strings

### Phase 2: Text-Parser
- [ ] Block-Level Token Parsing (`$token Text`)
- [ ] Inline Token Parsing (`$token[phrase]`)
- [ ] Link-Syntax (`$link[text](url)`)
- [ ] Tests

### Phase 3: Doc-Tokens
- [ ] Vordefinierte Tokens ($h1-$h4, $p, $b, $i, etc.)
- [ ] Token-Registry für Doc-Mode

### Phase 4: Komponenten
- [ ] `text` Block-Komponente
- [ ] `playground` Komponente (Code + Preview)
- [ ] `navigation` / TableOfContents

### Phase 5: Integration
- [ ] `doc` Container mit flacher Struktur
- [ ] Alte `*text*:style` Syntax entfernen
- [ ] Migration-Guide

### Phase 6: Styling
- [ ] CSS für Doc-Output (ähnlich mirror-docu.html)
- [ ] Syntax-Highlighting für playground
