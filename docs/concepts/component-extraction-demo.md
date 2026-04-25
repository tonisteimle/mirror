# Component Extraction Demo

Zeigt Mirror's Component-Definition-Pattern: wiederverwendbare UI-Bausteine
in `components.com`, die im Layout via `Name "..."` referenziert werden —
Single-Source für Style + Struktur.

Skript: `tools/test-runner/demo/scripts/component-extraction.ts`

## Auftrag

Ohne Komponenten dupliziert sich Card-Code 3 Mal im Layout. Mit
`components.com` definiert man die Card einmal, das Layout wird kürzer
und konsistenter. Ändert man die Card-Definition, ändern sich alle
Verwendungen.

Die Demo zeigt das **fertige** Pattern (Component-Datei plus Verwendung) —
nicht das interaktive „Extract"-UI, das im Studio noch nicht existiert.
Der Showcase ist also „so sieht ein Mirror-Projekt mit Komponenten aus".

## Was die Demo demonstriert

1. **`components.com` als zweite Datei** im Projekt (multi-file).
2. **Component-Definition** mit `Card:` (Properties + Slots).
3. **Verwendung im Layout** via `Card "Title"` — kompakt, ohne Duplikate.
4. **Computed-Style verifiziert**: alle drei Card-Instanzen rendern
   identisch.

## Ablauf

| #   | Schritt                                            | Action                    | Was es zeigt            |
| --- | -------------------------------------------------- | ------------------------- | ----------------------- |
| 1   | Multi-file reset                                   | `resetMultiFileProject()` | Setup                   |
| 2   | `components.com` erstellen                         | `createFile`              | Component-Datei         |
| 3   | Inhalt verifizieren                                | `expectCode`              | Card-Definition korrekt |
| 4   | Zurück zu `index.mir`                              | `switchFile`              | File-Wechsel            |
| 5   | Layout mit 3× Card-Verwendung schreiben            | `setTestCode`             | Component-Refs          |
| 6   | Code verifizieren                                  | `expectCode`              | Layout-Refs korrekt     |
| 7   | Test-mode verlassen → Components werden compiliert | `execute`                 | Multi-file compile      |
| 8   | Computed-Style: alle 3 Cards identisch             | `expectDom`               | Component-Wirkung       |

## Component-Datei

```mirror
// components.com
Card: bg #27272a, pad 16, gap 8, rad 8, w 240
  Title: fs 18, weight bold, col white
  Body: col #a1a1aa
```

## Layout

```mirror
// index.mir
Frame bg #0f0f0f, pad 24, gap 16, w full, h full
  Card
    Title "Pro"
    Body "Für kleine Teams"
  Card
    Title "Team"
    Body "Für mittlere Firmen"
  Card
    Title "Enterprise"
    Body "Für Konzerne"
```

## Validierungsstrategie

- `expectCode` für jede Datei separat (multi-file).
- `expectDom` mit `width: 240`, `background: '#27272a'`, `paddingTop: 16` —
  alle 3 Cards müssen identisch sein, was beweist, dass die
  Component-Definition wirklich von allen Instanzen geteilt wird.
