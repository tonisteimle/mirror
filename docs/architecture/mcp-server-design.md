# Mirror MCP Server Design

> **Detaillierte Dokumentation:** Siehe `features/mcp-integration/`

## Quick Summary

Integration von Claude Code via Model Context Protocol (MCP) für intelligente DSL-Manipulation.

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
                         └────────────┘            └────────────┘
```

## Tools (Auszug)

| Tool | Beschreibung |
|------|--------------|
| `get_context` | Aktueller Editor-Zustand |
| `set_property` | Property ändern |
| `add_child` | Element hinzufügen |
| `wrap_with` | Element in Container wrappen |
| `validate` | Code validieren |

## Resources

| Resource | Inhalt |
|----------|--------|
| `mirror://schema` | DSL Schema |
| `mirror://tokens` | Projekt-Tokens |
| `mirror://current-code` | Aktueller Code |

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| `features/mcp-integration/requirements.md` | Anforderungen, Status, Ziele |
| `features/mcp-integration/architecture.md` | Technische Architektur |
| `features/mcp-integration/implementation.md` | Detaillierter Implementierungsplan |
| `features/mcp-integration/tutorial.md` | Benutzer-Tutorial |

## Quick Start

```bash
# 1. Bauen
npm run build:mcp

# 2. In Claude Code nutzen (im Mirror-Projekt)
claude
> Mach den Button rot
```
