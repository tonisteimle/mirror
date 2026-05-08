# Mirror Syntax Highlighting für CotEditor

Syntax-Definition für die Mirror-DSL in [CotEditor](https://coteditor.com)
ab Version 5 / 7.x (`.cotsyntax`-Bundle-Format).

## Installation

CotEditor ist gesandboxed und liest Syntaxes **nur aus seinem Container**,
nicht aus `~/Library/Application Support/CotEditor`. Daher muss das Bundle
in den Sandbox-Pfad kopiert werden:

```bash
./tools/coteditor/install.sh
```

oder manuell:

```bash
TARGET="$HOME/Library/Containers/com.coteditor.CotEditor/Data/Library/Application Support/CotEditor/Syntaxes"
mkdir -p "$TARGET"
cp -R tools/coteditor/Mirror.cotsyntax "$TARGET/"
pkill -x CotEditor   # CotEditor cacht beim Start — komplett beenden
open -a CotEditor
```

> Symlinks funktionieren wegen der Sandbox **nicht**.
> Nach Repo-Updates `install.sh` erneut ausführen.

## Auto-Erkennung

Über `Info.json → fileMap.extensions` öffnet CotEditor automatisch mit
Mirror-Highlighting bei diesen Endungen:

```
.mir   .mirror
.tok   .tokens
.com   .components
```

Falls eine Datei trotzdem als "None" erkannt wird:
**Format → Syntax → Mirror** im Menü erzwingt den Modus.

## Was ist hervorgehoben

| Kategorie      | Inhalt                                                  |
| -------------- | ------------------------------------------------------- |
| **keywords**   | `as`, `each`, `in`, `if`, `else`, `canvas`, `name`, …   |
| **commands**   | `toggle()`, `navigate()`, `show()`, `toast()`, …        |
| **types**      | `Frame`, `Text`, `Button`, `Table`, User-Components     |
| **attributes** | `pad`, `bg`, `col`, `gap`, `rad`, `fs`, `ls`, …         |
| **variables**  | `$primary`, `$user.name`                                |
| **values**     | States, Events, Keys, Weights, Animations, named colors |
| **numbers**    | `12`, `0.5em`, `#2271C1`, `rgba(0,0,0,0.5)`             |
| **strings**    | `"Speichern"`, `'OK'`                                   |
| **comments**   | `// Kommentar`                                          |

Komponenten- und Token-Definitionen erscheinen im Outline-Menü
(Toolbar, Lupensymbol).

## Bundle-Aufbau

```
Mirror.cotsyntax/
├── Info.json              # Metadaten + Datei-Endungen
├── Edit.json              # Comment- & String-Delimiter
└── Regex/
    ├── Highlights.json    # Highlighting-Regeln (Categories + Regex)
    └── Outlines.json      # Outline-Menü-Patterns
```

## Aktualisieren

Wenn neue DSL-Properties/Keywords kommen:

1. `Mirror.cotsyntax/Regex/Highlights.json` editieren
2. `./tools/coteditor/install.sh` neu ausführen
3. CotEditor wird automatisch neu gestartet
