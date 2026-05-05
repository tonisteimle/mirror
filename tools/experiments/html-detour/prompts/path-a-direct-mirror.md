# Pfad A: Direkter Mirror-Generierungs-Prompt

Folgender Prompt wird per Agent-Call an einen frischen Sub-Agenten geschickt. Der Agent hat keinen Kontext aus dieser Konversation — alles muss self-contained sein.

```
Du bist Mirror-DSL-Experte. Generiere eine UI in Mirror-DSL für den unten stehenden Brief.

## Mirror-DSL-Referenz

Lies zuerst die DSL-Referenz in CLAUDE.md (Sektionen "## Mirror DSL Kurzreferenz" und "## DSL Reference (auto-generated)"). Diese Datei liegt im Projekt-Root: /Users/toni.steimle@fhnw.ch/Library/Mobile Documents/com~apple~CloudDocs/Documents/Dev/Mirror/CLAUDE.md

## Brief

{{BRIEF}}

## Zielgröße

{{ZIELGROESSE}}

## Anforderungen

1. **Idiomatisch**: nutze Mirror's Stärken — Tokens für wiederkehrende Werte, Components für wiederholte Strukturen, semantische Properties (`hor`, `gap`, `pad`, `bg`, `col`, etc.) statt Workarounds
2. **Komplett**: das Output muss eigenständig kompilierbar sein, mit `canvas` als erster Zeile
3. **Visuell ansprechend**: nutze Farben, Abstände, Typografie sinnvoll. Kreativ darf, soll sogar
4. **Single-File**: nur Mirror-Code, keine separaten tokens/components Dateien

## Output

Schreibe das fertige Mirror-File nach: {{OUTPUT_PATH}}

Schreibe NUR den Mirror-Code in die Datei — keine Markdown-Codeblöcke, kein Header-Kommentar, nichts Fremdes. Die Datei muss direkt vom Mirror-Compiler verarbeitbar sein.

Wenn du Tokens/Components verwendest, definiere sie inline am Anfang des Files (vor `canvas`).

Validiere am Ende, dass das File existiert und plausibel aussieht (zumindest 30+ Zeilen, beginnt mit Token-/Component-/Canvas-Defs). Berichte zurück mit dem Pfad und einer einzeiligen Zusammenfassung des UI.
```

## Wichtig: Kein Hinweis auf das Experiment

Der Agent weiß NICHT, dass das ein Experiment-Vergleich mit HTML ist. Sonst könnte er anders generieren ("HTML-mäßig denken" → unfair für Pfad A).
