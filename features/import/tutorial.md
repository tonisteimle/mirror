# Import - Tutorial

## Grundlagen

Mit `import` kannst du Mirror-Code auf mehrere Dateien aufteilen. Das macht große Projekte übersichtlicher.

### Einfacher Import

```mirror
// index.mirror
import header

App
  Header
  Content "Hello World"
```

```mirror
// header.mirror
Header: hor, spread, pad 16
  Logo "Mirror"
  Nav
    NavItem "Home"
    NavItem "About"
```

Der Inhalt von `header.mirror` wird vor dem Parsen eingefügt.

## Syntax-Varianten

### Einzelner Import

```mirror
import header
```

Lädt `header.mirror`.

### Mehrere Imports

```mirror
import tokens, components, data
```

Lädt alle drei Dateien in dieser Reihenfolge.

### Pfad-Import

```mirror
import components/button
import layouts/sidebar
```

Lädt aus Unterordnern.

### Mit Dateiendung

```mirror
import header.mirror
```

Die `.mirror` Endung ist optional - wird automatisch ergänzt.

### Mit ./ Prefix

```mirror
import ./header
```

Der `./` Prefix ist optional und wird ignoriert.

## Praktische Beispiele

### Design Tokens auslagern

```mirror
// tokens.mirror
primary: #3B82F6
surface: #1a1a23
text: #e4e4e7

sm-pad: 8
md-pad: 16
lg-pad: 24
```

```mirror
// index.mirror
import tokens

Button bg primary, pad md-pad
  "Click me"
```

### Komponenten-Bibliothek

```mirror
// components.mirror
Button: pad 12, bg primary, rad 6
  hover bg #2563eb

Card: pad 16, bg surface, rad 8

Input: pad 10, bg #27272a, rad 4
```

```mirror
// index.mirror
import tokens
import components

App
  Card
    Input "Email"
    Button "Login"
```

### Eingerückte Imports

Imports können auch eingerückt sein. Der importierte Inhalt übernimmt die Einrückung:

```mirror
// nav-items.mirror
NavItem "Home"
NavItem "About"
NavItem "Contact"
```

```mirror
// index.mirror
Nav
  import nav-items
```

Wird zu:

```mirror
Nav
  NavItem "Home"
  NavItem "About"
  NavItem "Contact"
```

## Verarbeitungsreihenfolge

Imports werden **vor** dem Parsen aufgelöst:

1. Import-Statement wird erkannt
2. Referenzierte Datei wird geladen
3. Inhalt wird an der Stelle eingefügt
4. Verschachtelte Imports werden rekursiv aufgelöst
5. Erst dann wird der gesamte Code geparst

## Zirkuläre Imports

Mirror erkennt und verhindert zirkuläre Imports:

```mirror
// a.mirror
import b
ComponentA

// b.mirror
import a    // ← Wird ignoriert, a wird bereits geladen
ComponentB
```

## Fehlerbehandlung

Wenn eine Datei nicht gefunden wird, erscheint ein Kommentar:

```mirror
import nicht-vorhanden
```

Wird zu:

```mirror
// Import not found: nicht-vorhanden.mirror
```

## Im Playground

Der Playground hat ein virtuelles Dateisystem. Du siehst alle Dateien in der Sidebar und kannst zwischen ihnen wechseln.

1. Öffne eine Datei (z.B. `index.mirror`)
2. Füge `import components` hinzu
3. Der Import wird automatisch aus `components.mirror` aufgelöst

## Best Practices

| Empfehlung | Beschreibung |
|------------|--------------|
| Tokens first | Importiere Design-Tokens am Anfang |
| Logische Gruppierung | Trenne Tokens, Components, Data |
| Kurze Namen | `header` statt `the-main-header-component` |
| Flache Struktur | Vermeide tiefe Verschachtelung |
