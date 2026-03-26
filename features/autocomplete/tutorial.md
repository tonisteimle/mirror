# Tutorial: Autocomplete im Mirror Studio

Das Autocomplete-System hilft dir beim Schreiben von Mirror-Code. Es zeigt kontextsensitive Vorschläge basierend auf der Cursor-Position.

## Property-Autocomplete

### Wann erscheint es?

Property-Vorschläge erscheinen in diesen Situationen:

**1. Nach Component-Name:**
```mirror
Box |              ← Space nach Component
    ↓
[pad, bg, col, ...]
```

**2. Nach Komma:**
```mirror
Box pad 12, |      ← Nach Komma
            ↓
[bg, col, rad, ...]
```

**3. Nach Colon (Definition):**
```mirror
Button: |          ← Nach Definition
        ↓
[pad, bg, col, ...]
```

**4. Am Zeilenanfang (eingerückt):**
```mirror
Card:
  |                ← Eingerückte Zeile
  ↓
[pad, bg, onclick, ...]
```

### Keyboard-Navigation

| Taste | Aktion |
|-------|--------|
| `↑` `↓` | Durch Liste navigieren |
| `Enter` / `Tab` | Auswählen |
| `Escape` | Schließen |
| Tippen | Filtern |

---

## Value-Autocomplete

Für Properties mit festen Werten erscheint automatisch eine Auswahl:

```mirror
Box width |        ← Space nach width
          ↓
[hug, full]

Box cursor |       ← Space nach cursor
           ↓
[pointer, default, text, move, not-allowed]
```

### Properties mit Value-Autocomplete

| Property | Werte |
|----------|-------|
| `width`, `height`, `size` | hug, full |
| `text-align` | left, center, right |
| `align` | top, bottom, left, right, center |
| `shadow` | sm, md, lg |
| `cursor` | pointer, default, text, move, not-allowed |
| `weight` | 400, 500, 600, 700, bold |
| `font` | monospace, sans-serif, serif |
| `bor`, `border` | solid, dashed, dotted |

---

## Color Picker

### Öffnen mit `#`

Der Color Picker öffnet automatisch wenn du `#` nach einer Farb-Property tippst:

```mirror
Box bg #|          ← # getippt
       ↓
┌─────────────────────────────────┐
│  [Farbpalette 13×10]            │
│  ● Ausgewählte Farbe            │
│  #3B82F6                        │
└─────────────────────────────────┘
```

### Wo funktioniert `#`?

| Kontext | Beispiel |
|---------|----------|
| Nach Color-Property | `bg #`, `col #`, `color #` |
| Nach hover-Property | `hover-bg #`, `hover-col #` |
| In Token-Definition | `$primary: #` |
| Token mit Color-Suffix | `$button.bg: #` |

### Keyboard-Navigation

```
┌─────────────────────────────────┐
│  ← → ↑ ↓  Navigation            │
│  Enter    Farbe einfügen        │
│  Escape   Abbrechen (# löschen) │
└─────────────────────────────────┘
```

| Taste | Aktion |
|-------|--------|
| `←` `→` | Farbe wechseln (13 Farben) |
| `↑` `↓` | Helligkeit ändern (10 Stufen) |
| `Enter` | Farbe einfügen, Picker schließen |
| `Escape` | `#` entfernen, Picker schließen |

### Auto-Close

Der Picker schließt automatisch wenn du:
- Ein Space tippst
- Einen Buchstaben außer a-f tippst
- Das `#` mit Backspace löschst

Das ermöglicht nahtloses Arbeiten:

```mirror
Box bg #abc|       ← Hex-Zeichen tippen ist OK
Box bg #test|      ← "t" schließt Picker (kein Hex)
```

---

## Beispiel-Workflow

### Komponente mit Properties

```mirror
Card|              ← Tippe "Card"
Card |             ← Space → Property-Autocomplete
Card pad|          ← Tippe "pad", gefiltert
Card pad 16, |     ← Komma → Property-Autocomplete
Card pad 16, bg |  ← Kein Autocomplete (Farbe erwartet)
Card pad 16, bg #| ← Hash → Color Picker
                   ← Pfeiltasten, Enter
Card pad 16, bg #3B82F6
```

### Token definieren

```mirror
$primary: #|       ← Color Picker
           ← Enter
$primary: #3B82F6

$button.bg: #|     ← Color Picker (Suffix erkannt)
             ← Enter
$button.bg: #2563EB
```

---

## Tastenkürzel Übersicht

| Kontext | Taste | Aktion |
|---------|-------|--------|
| Property-Liste | `↑` `↓` | Navigieren |
| Property-Liste | `Enter` / `Tab` | Auswählen |
| Property-Liste | `Escape` | Schließen |
| Property-Liste | Tippen | Filtern |
| Color Picker | `←` `→` | Farbe wechseln |
| Color Picker | `↑` `↓` | Helligkeit |
| Color Picker | `Enter` | Farbe einfügen |
| Color Picker | `Escape` | Abbrechen |

---

## Token-Referenzen mit `$`

Tippe `$` nach einer Property um definierte Tokens einzufügen:

```mirror
// Tokens definieren
$accent.bg: #3B82F6
$s.pad: 8

// Tokens verwenden
Box bg $|          ← $ getippt
        ↓
┌─────────────────────────────────┐
│ TOKENS                          │
│  $accent.bg      #3B82F6    ●  │
└─────────────────────────────────┘
```

**Funktioniert bei:**
- `bg $` → zeigt `.bg` Tokens
- `pad $` → zeigt `.pad` Tokens
- `$name: $` → zeigt alle Tokens

---

## State-Autocomplete

Nach `state ` erscheinen die verfügbaren State-Namen:

```mirror
Button:
  state |          ← Space nach state
        ↓
[hover, focus, highlighted, selected, ...]
```

**Verfügbare States:**
- System: `hover`, `focus`, `active`, `disabled`, `filled`
- Behavior: `highlighted`, `selected`, `expanded`, `collapsed`
- Toggle: `on`, `off`
- Validation: `valid`, `invalid`
- Andere: `default`, `inactive`

---

## Slot-Autocomplete

Wenn du einen Slot einer Komponente verwenden willst:

```mirror
// Component mit Slots definieren
Card:
  Title:
  Description:

// Bei Verwendung
Card
  Ti|              ← Großbuchstabe tippen
    ↓
[Title (Slot of Card)]
```

**Voraussetzung:**
- Eingerückte Zeile unter einer Component-Instanz
- Beginnt mit Großbuchstabe
- Parent-Component hat definierte Slots

---

## Tipps

1. **Schnelles Filtern:** Tippe direkt nach dem Space um Properties zu filtern
2. **Tab statt Enter:** Tab wählt aus und fügt Space ein
3. **Hex tippen:** Du kannst nach `#` auch direkt Hex-Werte tippen
4. **Abbrechen:** Escape beim Color Picker entfernt das `#` komplett
5. **Token mit $:** Tippe `$` für Token-Referenzen statt Hex-Werte
6. **State-Namen:** Nach `state ` erscheinen alle verfügbaren States
