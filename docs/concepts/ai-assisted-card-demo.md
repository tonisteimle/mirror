# AI-Assisted Card Demo

Zeigt, wie ein User mit Mirror's `--`-Marker direkt aus dem Editor heraus die
AI um eine UI bitten kann — Prompt rein, generierter Code raus, dann manuelles
Tweaking via Property-Panel.

Skript: `tools/test-runner/demo/scripts/ai-assisted-card.ts`
Fixtures: `tools/test-runner/demo/fixtures/ai-assisted-card.json`
Spec: dieses Dokument · Infrastruktur: B2 in `demo-infrastructure.md`

## Auftrag

Die `--`-Funktion ist eine zentrale Mirror-Capability — User schreibt Prompt
zwischen `--`-Markern, drückt Cmd+Enter, AI ersetzt den Block durch Code.
Diese Demo zeigt einen vollständigen Workflow von Prompt zu fertig getunter UI.

## Was die Demo demonstriert

1. **AI-Prompt eingeben**: User tippt einen `--`-Block, AI generiert
   Mirror-Code in den Editor.
2. **Generierter Code anschauen**: Validiert per Regex (AI-Output ist nicht
   strict matchbar).
3. **Manuelles Tweaking**: User selektiert ein generiertes Element im Preview
   und justiert via Property-Panel (z.B. background ändern).
4. **Inline-Edit**: Title-Text via Doppelklick anpassen.

## Ablauf

| #   | Schritt                                | Action                   | Was es zeigt                    |
| --- | -------------------------------------- | ------------------------ | ------------------------------- |
| 1   | Reset auf leeren Canvas                | `resetCanvas()` Fragment | Setup                           |
| 2   | AI-Prompt: „card mit titel und button" | `aiPrompt`               | Mock liefert vorgenerierte Card |
| 3   | Verifiziere Card-Struktur              | `expectCodeMatches`      | AI-Output kontrollierbar        |
| 4   | H1-Element selektieren                 | `selectInPreview`        | Cross-Panel-Übergang            |
| 5   | Title-Color anpassen                   | `pickColor`              | UI-getriebenes Tweaking         |
| 6   | Title-Text per Inline-Edit             | `inlineEdit`             | Persönliche Note                |
| 7   | Final-Check                            | `expectCodeMatches`      | Regex sieht alles               |

## Mock-Fixture

Die Demo läuft offline via `--ai-mock=...`. Das Fixture mappt den
normalisierten Prompt auf vordefinierten Code. Bei Änderungen am Prompt-Text
muss das Fixture entsprechend angepasst werden.

```json
{
  "card mit titel und button": "Frame bg #27272a, pad 16, gap 12, rad 8, w 280\n  H1 \"Willkommen\", col white\n  Button \"Loslegen\", bg #5BA8F5, col white, pad 8 16, rad 6"
}
```

## Validierungsstrategie

Wegen non-determinismus der AI-Antworten:

- **`expectCodeMatches`** mit Regex statt strict `expectCode`. Pattern testet
  semantisch (gibt es einen H1? gibt es einen Button?), nicht zeichengenau.
- Property-Tweaks danach werden mit klassischen `expectCode` gelockt — die
  Property-Änderung selbst ist deterministisch.

## Lauf

```bash
# Mock-Lauf (offline, deterministisch — Fixture-Match notwendig)
npx tsx tools/test.ts \
  --demo=tools/test-runner/demo/scripts/ai-assisted-card.ts \
  --ai-mock=tools/test-runner/demo/fixtures/ai-assisted-card.json \
  --pacing=video --headed

# Echter LLM-Lauf (online — keine Strict-Vergleiche, nur expectCodeMatches)
# Ohne --ai-mock greift der echte Mirror-LLM-Pfad.
```
