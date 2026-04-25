# Thema 21: React-Backend

**Status:** abgeschlossen (2026-04-25, in einem Pass).

**Ergebnis:** 22 erste Tests in `backend-react.test.ts`. React-Backend war
zuvor bei 0% Coverage.

## Scope

`compiler/backends/react.ts` (440 LOC) — alternativer Backend zu `dom.ts`
für **statisches React/JSX-Export**. Use-Cases laut Code-Kommentar:

1. Mirror-Designs zu React-Projekten exportieren
2. LLM-Context für Code-Generation

**Wichtig:** Dieses Backend ist **nicht** der Studio-Runtime. Es erzeugt
React-Code als String, nicht ein laufendes Mirror-Programm. Es deckt
die Mirror-DSL nur teilweise ab (kein Each, keine Conditionals, keine
States — nur statische Layouts).

## Coverage-Stand

**Vorher:** 0% (komplett ungetestet).

**Nachher:** 22 Tests in `backend-react.test.ts` decken:

| Bereich                                                              | Tests |
| -------------------------------------------------------------------- | ----- |
| Header & Boilerplate (`import React`, `export default function App`) | 2     |
| Primitive → HTML-Tag-Mapping (Frame/Text/Button/Input/Image/Link)    | 6     |
| Style-Object-Emission (numerisch, color, leer)                       | 3     |
| Verschachtelung (1- und 3-stufig)                                    | 2     |
| Tokens (Object-Export + opt-out)                                     | 2     |
| Component-Definitionen (Default-Props, `as Button`)                  | 2     |
| Heuristik-Tag-Resolver (Header, Sidebar, Title)                      | 3     |
| Skipping (Slot, Table)                                               | 2     |

## Bekannte Limitationen (im React-Backend)

- **`Image` primitive:** Wird nicht als `<img>` erkannt, weil keine
  Schema-Component-Definition den `primitive: 'image'` Marker setzt.
  Heuristik-Name-Match enthält "image" auch nicht. Falls auf `<img>`
  gemappt werden soll: entweder Schema-Erkennung oder Name-Heuristik
  ergänzen.
- **`Title` Komponente:** Wird über Heuristik zu `<h2>` (nicht `<span>`),
  weil `name.includes('title')` vor `name.includes('text')` matcht.
  Das ist das gewünschte Verhalten für Heading-Komponenten.
- **Ausgespart:** Each-Loops, Conditionals, States, Datenbindung,
  Animationen — der React-Backend ist statisch.

## Status

- [x] Schritt 1-3: Audit
- [x] Schritt 4: 22 Verhaltens-Tests
- [x] Schritt 5: Coverage von 0% → ~60% (geschätzt)
- [x] Schritt 6: 2 Limitationen dokumentiert
