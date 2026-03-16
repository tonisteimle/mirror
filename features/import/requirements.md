# Import

## Übersicht

Mirror unterstützt das Aufteilen von Code auf mehrere Dateien. Mit `import` wird der Inhalt einer anderen Datei an der aktuellen Stelle eingefügt.

## Syntax

```mirror
// Einzelne Datei
import header                    // → lädt header.mirror

// Mehrere Dateien
import data, tokens, components  // → lädt alle drei .mirror Dateien

// Unterordner
import components/nav            // → lädt components/nav.mirror
import components/buttons, components/inputs
```

## Verhalten

- `import name` lädt `name.mirror` (Extension wird automatisch ergänzt)
- `./` Prefix ist optional
- Import ist überall erlaubt (nicht nur am Anfang)
- Der Inhalt wird an der Stelle eingefügt (wie Include/Copy-Paste)
- Mehrere Imports mit Komma getrennt

## Beispiel

**main.mirror:**
```mirror
import tokens
import components

App
  import header
  Content
    import sidebar
    Main "Hello World"
```

**tokens.mirror:**
```mirror
primary: #3B82F6
secondary: #6B7280
```

**components.mirror:**
```mirror
Button:
  pad 12, bg primary, rad 6

Card:
  pad 16, bg white, rad 8
```

**header.mirror:**
```mirror
Header hor, spread, pad 16
  Logo "Mirror"
  Nav
    NavItem "Home"
    NavItem "About"
```

## Verarbeitungsreihenfolge

1. Parser erkennt `import` Statement
2. Datei wird geladen (aus Dateisystem oder Fake-FS im Browser)
3. Inhalt wird geparst
4. AST-Nodes werden an der Import-Stelle eingefügt
5. Rekursiv für verschachtelte Imports

## Zirkuläre Imports

Zirkuläre Imports werden erkannt und verhindern eine Endlosschleife:
```mirror
// a.mirror
import b    // OK

// b.mirror
import a    // Wird ignoriert (a wird bereits geladen)
```

## Dateisystem

- **Node.js**: Echtes Dateisystem (fs.readFileSync)
- **Browser/Playground**: Gefaktes Dateisystem mit virtuellen Dateien
