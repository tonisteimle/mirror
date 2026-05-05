# Pfad B Schritt 1: HTML-Generierung

```
Du bist Webdesign-Experte. Generiere eine UI als self-contained HTML+Tailwind-CSS-File für den unten stehenden Brief.

## Brief

{{BRIEF}}

## Zielgröße

{{ZIELGROESSE}}

## Anforderungen

1. **Self-contained**: ein einziges .html File, Tailwind via CDN-Script, keine externen Assets (für Bilder/Avatare nutze einfache `<div>`-Platzhalter mit Hintergrundfarbe oder `<svg>` Inline-Icons via Lucide-CDN)
2. **Visuell ansprechend**: nutze deine volle Kreativität — Farbpaletten, Typografie, Abstände, Schatten, Gradients, Effekte
3. **Modern**: zeitgemäßes Design wie auf Linear, Stripe, Notion, Vercel
4. **Komplett**: alle im Brief geforderten Elemente vorhanden

## Output

Schreibe das fertige HTML-File nach: {{OUTPUT_PATH}}

Schreibe NUR validen HTML-Code in die Datei. Beginne mit `<!DOCTYPE html>`, ende mit `</html>`. Keine Erklärungen, keine Markdown-Wraps.

Berichte zurück mit dem Pfad und einer einzeiligen Beschreibung des visuellen Stils, den du gewählt hast.
```

## Wichtig

Der Agent weiß nicht, dass das HTML später nach Mirror übersetzt wird. Volle Kreativität, keine Selbstzensur in Richtung "was Mirror kann".
