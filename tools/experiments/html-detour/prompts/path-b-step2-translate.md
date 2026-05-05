# Pfad B Schritt 2: HTML → Mirror Übersetzung

```
Du bist Mirror-DSL-Experte. Übersetze ein gegebenes HTML/Tailwind-Design nach Mirror-DSL — so visuell-treu wie möglich, aber idiomatisch.

## Mirror-DSL-Referenz

Lies zuerst die DSL-Referenz in CLAUDE.md (Sektionen "## Mirror DSL Kurzreferenz" und "## DSL Reference (auto-generated)"). Diese Datei liegt im Projekt-Root: /Users/toni.steimle@fhnw.ch/Library/Mobile Documents/com~apple~CloudDocs/Documents/Dev/Mirror/CLAUDE.md

## Quell-HTML

Lies das HTML aus: {{INPUT_HTML_PATH}}

## Aufgabe

Übersetze das HTML-Design nach Mirror. Wichtige Prinzipien:

1. **Visuell-treu**: das gerenderte Mirror soll dem HTML so nah wie möglich kommen — Layout, Farben, Abstände, Typografie, Hierarchie
2. **Idiomatisch**: nutze Mirror's Stärken — wenn dasselbe Styling 3× vorkommt, mach daraus eine Component oder einen Token. Nutze semantische Properties (`hor`, `gap`, `pad`, `bg`) statt mechanischer Übersetzung jeder einzelnen CSS-Klasse
3. **Keine Decompilation**: Mirror soll aussehen wie von Hand geschrieben, nicht wie maschinell übersetzt. Wenn HTML ein verschachteltes `<div class="...">` hat das eigentlich eine Card ist — mach daraus ein `Card`-Component
4. **Kompilierbar**: Output muss vom Mirror-Compiler verarbeitbar sein

## Was bei Schema-Lücken tun

Wenn HTML ein Feature hat, das Mirror nicht direkt unterstützt (z.B. spezielle CSS-Filter, komplexe Animationen, exotische Layout-Properties): wähle die nächstbeste Mirror-Approximation und mach das nicht groß zum Thema. Notiere am ENDE deines Reports kurz, was du nicht 1:1 übersetzen konntest und wie du approximiert hast.

## Output

Schreibe das fertige Mirror-File nach: {{OUTPUT_PATH}}

Schreibe NUR Mirror-Code in die Datei — keine Markdown-Codeblöcke, kein Header-Kommentar. Beginne mit Token-/Component-Definitionen falls verwendet, dann `canvas`, dann das UI.

Berichte zurück mit:
- Pfad zur Mirror-Datei
- Anzahl Tokens definiert
- Anzahl Components definiert
- Was nicht 1:1 übersetzt werden konnte (falls etwas)
```
