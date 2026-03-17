# MCP Integration - Tutorial

## Was ist MCP?

Das **Model Context Protocol** (MCP) ist ein Standard von Anthropic, der es AI-Modellen ermöglicht, mit externen Tools zu interagieren. Claude Code nutzt MCP, um:

- Dateien zu lesen/schreiben
- Terminal-Befehle auszuführen
- Mit externen Services zu kommunizieren

Mit dem Mirror MCP Server wird Claude Code zum intelligenten DSL-Agenten.

---

## Installation

### 1. Server bauen

```bash
cd /path/to/Mirror
npm run build:mcp
```

### 2. Bei Claude Code registrieren

Die `.mcp.json` im Projekt-Root registriert den Server automatisch:

```json
{
  "mcpServers": {
    "mirror-studio": {
      "command": "node",
      "args": ["./dist/mcp/server.js"]
    }
  }
}
```

### 3. Verifizieren

```bash
# Im Mirror-Projekt
claude

# In Claude Code
> /mcp
# Sollte "mirror-studio" listen
```

---

## Verwendung

### Einfache Property-Änderungen

```
User: Mach den Button rot

Claude: [Ruft set_property auf]
        Done! Background auf #ff0000 gesetzt.
```

```
User: Erhöhe das Padding auf allen Buttons auf 16

Claude: [Findet alle Buttons]
        [Ruft set_property für jeden auf]
        Done! 3 Buttons aktualisiert.
```

### Elemente hinzufügen

```
User: Füg einen "Abbrechen" Button neben dem Submit-Button hinzu

Claude: [Ruft get_context auf - versteht Struktur]
        [Ruft add_child auf]
        Done! Button "Abbrechen" hinzugefügt.
```

### Komplexe Generierung

```
User: Erstell eine Card-Komponente mit Bild links und Titel/Description rechts

Claude: [Liest mirror://schema - kennt Properties]
        [Ruft add_child mehrfach auf]

        Fertig! Hier ist die generierte Struktur:

        Box hor gap 16 pad 16 bg #fff rad 8
          Image w 120 h 120 rad 4
          Box ver gap 4
            Text "Titel" fs 18 weight bold
            Text "Description" col #666
```

### Layout-Änderungen

```
User: Mach das Layout horizontal statt vertikal

Claude: [Ruft set_property auf: hor statt ver]
        Done! Layout ist jetzt horizontal.
```

```
User: Wrap die beiden Buttons in eine horizontale Box mit gap 8

Claude: [Ruft wrap_with auf]
        Done! Buttons sind jetzt in "Box hor gap 8".
```

### Validierung

```
User: Ist dieser Code korrekt? Box ver gapp 16

Claude: [Ruft validate auf]
        Fehler auf Zeile 1: "gapp" ist keine gültige Property.
        Meintest du "gap"?
```

---

## Verfügbare Tools

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `get_context` | Aktueller Editor-Zustand | "Was ist gerade selektiert?" |
| `get_element` | Details zu einem Element | "Zeig mir die Properties vom Header" |
| `set_property` | Property ändern | "Mach bg rot" |
| `set_properties` | Mehrere Properties | "Setze pad 16 und gap 8" |
| `add_child` | Element hinzufügen | "Füg einen Button hinzu" |
| `delete_element` | Element löschen | "Lösch den Footer" |
| `wrap_with` | Element wrappen | "Wrap in Box hor" |
| `move_element` | Element verschieben | "Verschieb den Button in den Header" |
| `validate` | Code prüfen | "Ist das valide?" |

---

## Verfügbare Resources

| Resource | Inhalt |
|----------|--------|
| `mirror://schema` | Komplettes DSL-Schema |
| `mirror://tokens` | Projekt-Tokens |
| `mirror://current-code` | Aktueller Code |
| `mirror://examples` | Best-Practice Beispiele |

Claude liest diese automatisch, wenn nötig.

---

## Selektoren

Tools akzeptieren verschiedene Selector-Formate:

| Format | Beispiel | Beschreibung |
|--------|----------|--------------|
| `@line` | `@5` | Element auf Zeile 5 |
| `#id` | `#login-btn` | Element mit ID |
| `Type` | `Button` | Erstes Element vom Typ |

---

## Tipps

### Kontext nutzen

Claude versteht Kontext. Statt:
```
"Setze die bg Property auf dem Element auf Zeile 12 auf #ff0000"
```

Einfach:
```
"Mach das rot"
```
(wenn das Element selektiert ist)

### Mehrere Änderungen

```
"Mach alle Buttons blau mit weißem Text und abgerundeten Ecken"
```

Claude macht das in einem Durchgang.

### Fragen stellen

```
"Welche Layout-Properties gibt es?"
"Wie mache ich ein Grid?"
"Was ist der Unterschied zwischen pad und margin?"
```

Claude liest das Schema und antwortet.

---

## Troubleshooting

### Server nicht gefunden

```bash
# Prüfen ob .mcp.json existiert
cat .mcp.json

# Server manuell testen
node dist/mcp/server.js
# Sollte "Mirror MCP Server started" ausgeben
```

### Tools funktionieren nicht

```bash
# MCP Inspector starten
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

Öffnet Web-UI zum Debuggen.

### Änderungen erscheinen nicht

- Prüfen ob Studio läuft (für WebSocket-Bridge)
- Oder: File-Bridge nutzt `main.mirror` - richtige Datei?

---

## Beispiel-Session

```
$ claude

You: Öffne main.mirror und zeig mir die Struktur

Claude: [Liest mirror://current-code]

        Die Datei hat folgende Struktur:
        - Root: Frame mit Header und Main
        - Header: Box hor mit Logo und Nav
        - Main: Box ver mit Content
        - 12 Elemente insgesamt

You: Der Header soll einen Shadow haben

Claude: [Ruft set_property("#header", "shadow", "md") auf]

        Done! Header hat jetzt shadow md.

You: Füg einen Footer hinzu mit Copyright-Text

Claude: [Ruft add_child auf]

        Footer hinzugefügt:
        Footer pad 16 bg #1a1a1f
          Text "© 2024 Mirror" col #666 fs 12

You: Mach den Footer horizontal zentriert

Claude: [Ruft set_property auf]

        Done! Footer hat jetzt center.
```

---

## Weiterführend

- [MCP Dokumentation](https://modelcontextprotocol.io/)
- [Claude Code MCP Guide](https://docs.anthropic.com/claude-code/mcp)
- Architecture: `features/mcp-integration/architecture.md`
- Implementation: `features/mcp-integration/implementation.md`
