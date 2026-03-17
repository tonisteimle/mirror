# Mirror AI Agent - Vision

## Das Ziel

Ein AI-Agent, der Mirror DSL so gut versteht wie ein erfahrener Mirror-Entwickler - und dabei die volle Power eines reasoning-fähigen Agenten hat.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   "Bau mir ein Dashboard mit Sidebar, Header und einem          │
│    Grid von Cards. Die Cards sollen klickbar sein und           │
│    ein Detail-Panel öffnen."                                     │
│                                                                  │
│                           ↓                                      │
│                                                                  │
│   Agent:                                                         │
│   1. Versteht die Anforderung                                   │
│   2. Plant die Komponenten-Struktur                             │
│   3. Generiert Code schrittweise                                │
│   4. Fügt Interaktionen hinzu                                   │
│   5. Testet im Preview                                          │
│   6. Korrigiert Probleme                                        │
│   7. Optimiert Layout                                           │
│                                                                  │
│                           ↓                                      │
│                                                                  │
│   Fertiges, funktionierendes UI - in Sekunden                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Was macht diese Lösung "extrem leistungsfähig"?

### 1. Deep DSL Understanding
Der Agent versteht nicht nur Syntax, sondern Semantik:
- Weiß, dass `hor gap 16` ein Flex-Layout mit Spacing ist
- Versteht Komponenten-Hierarchien
- Kennt Best Practices und Anti-Patterns
- Kann Code "lesen" und erklären

### 2. Multi-Step Reasoning
Wie Claude Code, aber für UI:
- Plant komplexe Änderungen
- Zerlegt in Teilschritte
- Validiert nach jedem Schritt
- Korrigiert sich selbst

### 3. Visual Awareness
Der Agent "sieht" das Ergebnis:
- Kann Screenshots des Previews analysieren
- Erkennt Layout-Probleme
- Versteht Spacing und Alignment
- Gibt visuelles Feedback

### 4. Contextual Intelligence
Versteht den Projekt-Kontext:
- Kennt alle definierten Tokens
- Versteht bestehende Komponenten
- Respektiert Design-System
- Nutzt existierende Patterns

### 5. Interactive Collaboration
Arbeitet mit dem User:
- Fragt bei Unklarheiten nach
- Bietet Alternativen an
- Erklärt Entscheidungen
- Lernt Präferenzen

## Kern-Differenzierung

| Feature | Lovable/v0/Bolt | Mirror Agent |
|---------|-----------------|--------------|
| Output | React/HTML | Mirror DSL (kompakter) |
| Kontext | Generisch | Deep DSL Understanding |
| Editing | Neu generieren | Surgical edits |
| Preview | Extern | Integriert, live |
| Learning | Keins | Projekt-spezifisch |
