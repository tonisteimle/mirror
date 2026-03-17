# Mirror AI Agent Integration

## Übersicht

Integration des Claude Agent SDK für einen leistungsfähigen AI-Assistenten direkt in Mirror Studio. Der Agent versteht Mirror DSL, kann Code manipulieren, lernt aus Interaktionen und bietet proaktive Hilfe.

## Status

| Phase | Status | Beschreibung |
|-------|--------|--------------|
| Phase 1: Foundation | ✅ Done | SDK Setup, Basic Tools |
| Phase 2: Core Agent | ✅ Done | Full Tools, Chat UI |
| Phase 3: Visual | ✅ Done | Preview Integration |
| Phase 4: Intelligence | ✅ Done | Memory, Learning |
| Phase 5: Polish | ⬜ Offen | UX, Performance |

## Warum Agent SDK statt API?

| Aspekt | Direkte API | Agent SDK |
|--------|-------------|-----------|
| Reasoning | Single-Shot | Multi-Step Loop |
| Fehlerkorrektur | Manual | Automatisch |
| Tool-Orchestrierung | Manual | Agent entscheidet |
| Kontext-Management | Manual | Built-in |
| Code-Qualität | Variabel | Selbst-validierend |

## Kern-Features

### 1. Natürliche Sprache → Code
```
User: "Mach ein Dashboard mit Sidebar und Header"

Agent:
1. Versteht Layout-Anforderung
2. Plant Komponenten-Struktur
3. Generiert Code schrittweise
4. Validiert nach jedem Schritt
```

### 2. Intelligente Edits
```
User: "Der Button soll wie die anderen aussehen"

Agent:
1. Analysiert "andere Buttons"
2. Extrahiert gemeinsame Properties
3. Wendet auf Ziel-Button an
```

### 3. Visual Understanding
```
User: "Das Spacing sieht komisch aus"

Agent:
1. Macht Screenshot
2. Analysiert Abstände
3. Schlägt Korrektur vor
```

### 4. Proaktive Hilfe
```
Agent bemerkt:
- Hardcoded Colors → "Tokens extrahieren?"
- Inkonsistentes Spacing → "Standardisieren?"
- Fehlende Labels → "Accessibility verbessern?"
```

## Nicht-Ziele

- Kein Ersatz für manuelles Coding
- Kein vollautomatischer App-Generator
- Keine komplexen Multi-File Refactorings (vorerst)

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.52.x"
}
```

**Note:** Using the Anthropic SDK directly with tool use for browser compatibility.
The Claude Agent SDK requires a WebSocket backend and is better suited for Node.js.

## API Key

Benötigt: `ANTHROPIC_API_KEY` (oder via OpenRouter: `OPENROUTER_API_KEY` mit `baseUrl`)

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| vision.md | Ziele und Differenzierung |
| architecture.md | Komponenten, Tools, System |
| implementation.md | 5-Phasen Plan mit Code |

## Aufwand

| Phase | Aufwand |
|-------|---------|
| Foundation | ~2 Tage |
| Core Agent | ~3 Tage |
| Visual | ~2 Tage |
| Intelligence | ~2 Tage |
| Polish | ~1 Tag |
| **Gesamt** | **~10 Tage** |

## Vergleich zu MCP-Ansatz

| Aspekt | MCP Server | Agent SDK |
|--------|------------|-----------|
| Integration | Extern (Claude Code) | Direkt in Studio |
| UI | Claude Code Terminal | Eigenes Chat Panel |
| Kontext | Muss übergeben werden | Direkter Zugriff |
| UX | Wechsel zwischen Apps | Nahtlos |
| Kontrolle | Weniger | Volle Kontrolle |

**Fazit:** Agent SDK ist der bessere Ansatz für eine integrierte Lösung.
