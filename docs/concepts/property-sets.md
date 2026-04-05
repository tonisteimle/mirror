# Property Sets (Mixins)

> **Status:** Konzept / Future Feature

## Idee

Property Sets ermöglichen die Definition von wiederverwendbaren Style-Kombinationen – ähnlich wie CSS-Klassen oder Tailwind's `@apply`.

## Syntax

```mirror
// Definition: Property Set
standardtext: fs 14, col #888, weight 500
cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8
danger: bg #ef4444, col white

// Verwendung: Properties werden "gespreizt"
Text "Hello", $standardtext
Frame $cardstyle
  Text "Content", $standardtext
  Button "Delete", $danger, pad 10 20
```

## Unterscheidung

| Definition | Erkennung | Beispiel |
|------------|-----------|----------|
| Token | Hat Suffix mit `.` | `primary.bg: #2563eb` |
| Data Object | Hat INDENT mit key:value | `user:` + eingerückte Kinder |
| Property-Set | Hat Properties (prop value) | `standardtext: fs 14, col #888` |

## Vorteile

1. **Leichter als Komponenten** – Keine neue Komponente für Styling-Patterns
2. **Kombinierbar** – `Text "Hello", $standardtext, $danger` kombiniert beide
3. **CSS-ähnlich** – Vertrautes Mental Model

## Implementation

### Parser

1. Neues Pattern: `name:` gefolgt von Properties (nicht INDENT, nicht einzelner Wert)
2. Property-Parsing wie bei Elementen
3. Speicherung als `PropertySetToken`

### IR

1. Bei `$name` in Property-Liste: Auflösen der referenzierten Properties
2. Spreaden der Properties auf das Element
3. Später definierte Properties überschreiben frühere

### Beispiel-Auflösung

```mirror
standardtext: fs 14, col #888
Text "Hello", $standardtext, col white
```

Wird zu:

```mirror
Text "Hello", fs 14, col #888, col white
```

Nach Property-Merging:

```mirror
Text "Hello", fs 14, col white
```

## Abgrenzung zu Komponenten

| Feature | Property-Set | Komponente |
|---------|--------------|------------|
| Definiert | Style-Properties | Ganzes Element |
| Verwendung | Als Property: `$name` | Als Element: `Name` |
| Verschachtelung | Nein | Ja (Slots) |
| States | Nein | Ja (`hover:`, `on:`) |
| Kinder | Nein | Ja |

Property-Sets sind für "ich will diese 5 Properties oft verwenden" – nicht für "ich will ein komplettes Element wiederverwenden".

## Offene Fragen

1. **Können Property-Sets andere Property-Sets referenzieren?**
   ```mirror
   basestyle: fs 14, col #888
   emphstyle: $basestyle, weight bold
   ```

2. **Naming Convention** – Wie unterscheidet man auf einen Blick?
   - Lowercase für Sets?
   - Suffix wie `standardtext.set:`?
   - Präfix wie `~standardtext:`?

3. **Scope** – Global oder lokal zu einem Context?
