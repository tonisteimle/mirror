# MCP Integration

## Übersicht

Integration von Claude Code via Model Context Protocol (MCP) für intelligente DSL-Manipulation. Claude Code wird zum "Super-Agenten" für Mirror, mit domain-spezifischen Tools.

```
┌─────────────────┐     stdio      ┌─────────────────┐
│   Claude Code   │◄──────────────►│  Mirror MCP     │
│   (Agent)       │                │  Server         │
└─────────────────┘                └────────┬────────┘
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                         ┌────────────┐            ┌────────────┐
                         │  Tools     │            │  Resources │
                         │  (Actions) │            │  (Data)    │
                         └────────────┘            └────────────┘
```

## Feature-Status

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| MCP Server Setup | ⬜ Offen | Basis-Server mit SDK |
| Context Tools | ⬜ Offen | get_context, get_element, get_tree |
| Mutation Tools | ⬜ Offen | set_property, add_child, delete, wrap |
| Validation Tools | ⬜ Offen | validate, validate_value |
| Schema Resource | ⬜ Offen | DSL-Schema als Resource |
| Token Resource | ⬜ Offen | Projekt-Tokens als Resource |
| Studio Bridge | ⬜ Offen | Kommunikation MCP ↔ Studio |
| Claude Code Registration | ⬜ Offen | .mcp.json Setup |

## Ziele

### Primär
1. **Natürliche Sprache → Code**: "Mach den Button rot" → `set_property("#btn", "bg", "#ff0000")`
2. **Komplexe Generierung**: "Bau ein Login-Formular" → Generiert komplette Komponente
3. **Intelligente Hilfe**: Claude versteht DSL-Kontext und schlägt passende Änderungen vor

### Sekundär
- Ersetzt/ergänzt den bisherigen LLM-Agenten
- Standardisiertes Protokoll (MCP) statt proprietärer Lösung
- Nutzbar auch außerhalb von Studio (CLI)

## Vergleich: Eigener Agent vs. MCP

| Aspekt | Eigener Agent | MCP + Claude Code |
|--------|---------------|-------------------|
| Sprachverständnis | Muss selbst prompten | Claude Code macht das |
| Tool-Orchestrierung | Muss selbst implementieren | Claude Code macht das |
| Multi-Step Reasoning | Muss selbst implementieren | Claude Code macht das |
| Domain-Wissen | Im Prompt | In Tools + Resources |
| Wartung | Hoch | Niedrig (nur Tools) |
| Geschwindigkeit | Schneller für Simple | Gleich schnell bei guten Tools |

## Nicht-Ziele

- Kein Ersatz für direkte Code-Manipulation im Editor
- Kein Real-Time Pair Programming (zu langsam)
- Keine komplette App-Generierung (Scope zu groß)

## Dependencies

- `@modelcontextprotocol/sdk` - MCP TypeScript SDK
- `zod` - Schema-Validierung
- Bestehende Komponenten:
  - `src/studio/code-modifier.ts` - Code-Manipulation
  - `src/ir/index.ts` - Parser, SourceMap
  - `src/schema/properties.ts` - DSL-Schema

## Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Claude Code nicht installiert | Mittel | Hoch | Fallback auf eigenen Agent |
| MCP-Protokoll ändert sich | Niedrig | Mittel | SDK-Updates verfolgen |
| Latenz zu hoch | Niedrig | Mittel | Tools optimieren |
| Studio-Bridge komplex | Mittel | Mittel | File-basierte Bridge als Start |
