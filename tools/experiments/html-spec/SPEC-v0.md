# HTML-Spec v0 — strikter HTML-Subset für deterministische Mirror-Übersetzung

**Status:** Erster Entwurf, zur Bewertung. Noch nicht implementiert.

## Zweck

Definiert ein präzise eingeschränktes HTML-Format, das

1. **vom LLM produzierbar** ist (Trainingsdaten-nahe, keine exotischen Konventionen)
2. **deterministisch nach Mirror übersetzbar** ist (kein zweiter LLM-Schritt nötig)
3. **so wenig Constraints wie möglich** auferlegt — jede Einschränkung ist ein potentielles Kreativitätsleck.

## Designprinzipien

### Was beschränkt wird, und _warum_

| Beschränkung                                   | Grund                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| Nur Tailwind-Utility-Klassen (kein custom CSS) | Custom CSS ist nicht parse-bar in eine fixe Mapping-Tabelle.                      |
| Kein `<style>`-Block, kein `style="…"`         | Selbe Regel anders ausgedrückt — alle Stylings über Klassen.                      |
| Eingeschränktes Tag-Set                        | Compiler braucht für jedes Tag eine Mirror-Primitive-Mapping.                     |
| Lucide-Icons via festem Pattern                | Ein-eindeutige Icon-Erkennung statt SVG-Path-Parsing.                             |
| Kein `<script>`, kein `onclick=`               | HTML-Behavior maps nicht eindeutig auf Mirror-DSL-Funktionen — Trennlinie sauber. |

### Was _nicht_ beschränkt wird (bewusst frei gelassen)

- **Vollständiger Tailwind-Wortschatz**: alle Utility-Klassen erlaubt. Auch arbitrary values (`bg-[#abc123]`, `gap-[42px]`, `text-[Fraunces]`). Wenn Mirror eine Klasse noch nicht abbilden kann → Mirror-Backlog, nicht Spec-Verbot.
- **Beliebige Tag-Verschachtelung**: keine Strukturvorgaben, das LLM komponiert frei.
- **Tailwind-Variants**: `hover:`, `focus:`, `md:`, `data-[…]:`, `aria-…:` — alles verwendbar.
- **Keine Komponentisierungs-Pflicht**: LLM emittiert flach. Compiler extrahiert Components+Tokens automatisch.

## Spezifikation

### 1. Erlaubte Tags

```
Layout/Container:    div, section, article, header, footer, main, nav, aside
Text:                span, p, h1, h2, h3, h4, h5, h6, strong, em, label, small, blockquote
Lists:               ul, ol, li
Interactive:         button, a, input, textarea, select, option
Media:               img, svg
Mirror-Markers:      i (für Lucide-Icons, siehe Sektion 4)
Implicit:            html, head, body, title (Boilerplate)
```

Ausgeschlossen: `iframe`, `video`, `audio`, `canvas`, `dialog` (für v1; Mirror hat eigene Pendants), `form` (kein Submit-Behavior in v1), `template`, alle deprecated Tags.

### 2. Styling-Regel

```html
<!-- ✅ ERLAUBT -->
<div class="bg-zinc-900 p-4 rounded-lg flex gap-4">…</div>
<button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">OK</button>
<div class="bg-[#1a3329] grid grid-cols-3 gap-[14px]">…</div>

<!-- ❌ VERBOTEN -->
<div style="background: #1a3329; padding: 16px;">…</div>
<!-- inline style -->
<style>
  .card {
    background: #1a3329;
  }
</style>
<!-- style-Block -->
<link rel="stylesheet" href="custom.css" />
<!-- externes CSS -->
```

**Eine Ausnahme**: Tailwind-CDN-Script im `<head>` ist erlaubt (für Browser-Render). Wird vom Compiler ignoriert.

### 3. State-Expression

System-States via Tailwind-Variants (1:1 zu Mirror):

| HTML / Tailwind       | Mirror                  |
| --------------------- | ----------------------- |
| `hover:bg-blue-600`   | `hover: bg #2271C1`     |
| `focus:ring-2`        | `focus: bor 2`          |
| `active:scale-95`     | `active: scale 0.95`    |
| `disabled:opacity-50` | `disabled: opacity 0.5` |

Custom States via `data-state` + Tailwind-Variant:

```html
<button class="bg-zinc-700 data-[state=on]:bg-blue-500" data-state="off">Like</button>
```

→ Mirror:

```mirror
LikeBtn: bg #404040, toggle()
  on:
    bg #2271C1
```

Selection-States (Tabs etc.) via `aria-selected` oder `data-state=active`:

```html
<button
  class="text-zinc-400 data-[state=active]:text-white data-[state=active]:border-b-2"
  data-state="active"
>
  Home
</button>
```

### 4. Icons

Lucide-Icons via:

```html
<i data-lucide="check" class="w-4 h-4 text-green-500"></i>
```

Nur Icons aus dem Lucide-Set sind erlaubt. Kein inline-SVG mit eigenen Paths (Mirror hat aber `$icons:` Custom-Icon-Registry — falls nötig, Erweiterung später).

### 5. Bilder & Media

Bilder via `<img src="…">` mit Tailwind-Klassen. Für Avatare/Platzhalter ohne echte Bilder:

```html
<!-- Avatar als gefärbtes Rondel mit Initialen -->
<div
  class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
            flex items-center justify-center text-white font-medium"
>
  MS
</div>
```

(Das war auch der Pattern in Pfad-B-HTML, hat funktioniert.)

### 6. Form-Inputs

```html
<input
  type="email"
  placeholder="name@example.com"
  class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
/>
<textarea placeholder="…" class="…"></textarea>
<button class="bg-blue-500 px-4 py-2 rounded">Submit</button>
```

In v1 keine `name=`-Bindings, kein `form`-Submit. Reines visuelles Markup.

### 7. Canvas-Dimensionen

Das äußerste sichtbare Element gibt die Design-Größe vor:

```html
<body class="w-[1200px] h-[800px] bg-zinc-950 text-zinc-100">
  <!-- content -->
</body>
```

Compiler nimmt die Dimensionen vom `<body>` (oder vom ersten Direct-Child mit explicit `w-[…px] h-[…px]`) und macht daraus `canvas w 1200, h 800, bg #09090b, col #f4f4f5, font sans`.

Mobile/Tablet/Desktop-Presets werden NICHT im HTML markiert — der Compiler erkennt anhand der Dimensionen (375×812 → `canvas mobile`, etc.).

### 8. Was explizit _nicht_ in v1 ist

- **Behavior**: keine `onclick=`, keine `data-mirror-action="toggle"`-Marker, keine JS-Logik. Visuelles HTML in, visuelles Mirror raus. Behavior wird vom Designer im Mirror-Code hinzugefügt.
- **Animations beyond Tailwind**: wenn Tailwind eine Animation hat (`animate-spin`, `animate-pulse`), wird sie übersetzt. Custom `@keyframes` sind verboten.
- **Bindings/Daten**: keine `{{$user.name}}`-Slots im HTML. Statisches Markup. Daten-Bindings kommen im Mirror-Layer.
- **Component-Marker**: LLM markiert Components NICHT explizit. Compiler extrahiert.
- **Token-Marker**: LLM definiert Tokens NICHT explizit. Compiler erkennt wiederholte Werte und extrahiert.

## LLM-Prompt-Vorlage (Phase 0 Test)

```
Generiere die UI als HTML-File für den unten stehenden Brief.

REGELN:
- Verwende AUSSCHLIEßLICH Tailwind-Utility-Klassen für Styling
  (klassisch ODER arbitrary values wie bg-[#abc123])
- KEIN <style>-Block, KEIN style="..." Attribut, KEIN externes CSS
- KEIN <script>, KEIN onclick= oder andere event-Handler
- Tag-Whitelist: div, section, article, header, footer, main, nav, aside,
  span, p, h1-h6, strong, em, label, small, ul, ol, li,
  button, a, input, textarea, select, option, img, svg, i
- Icons: <i data-lucide="name" class="w-N h-N text-X"></i> (Lucide-Set)
- Bilder/Avatare: <img> ODER <div> mit Hintergrund + Initialen
- States: Tailwind-Variants (hover:, focus:, active:, disabled:,
  data-[state=…]:, aria-…:)
- Container-Größe via class="w-[Npx] h-[Npx]" auf <body> oder Outer-Div

WAS DU NICHT TUN MUSST:
- Du musst KEINE Components oder Tokens extrahieren — Compiler macht das.
- Schreib ganz natürlich flaches HTML, auch wenn sich Strukturen wiederholen.
- Sei kreativ mit Layout, Farben, Hierarchie, Typografie. Tailwind hat einen
  riesigen Wortschatz — nutze ihn.

Brief: {{BRIEF}}
Zielgröße: {{SIZE}}

Output: nur HTML-Code, beginne mit <!DOCTYPE html>, ende mit </html>.
```

## Offene Fragen für Bewertung

### F1: Ist `<i data-lucide="…">` der richtige Icon-Pattern?

Alternative: `<svg data-lucide="…">` (manche Tailwind-Pages benutzen das). Oder Inline-SVG mit Lucide-Path-Set. **Mein Vorschlag**: `<i>`-Pattern weil das ist was die Lucide-CDN-Doku zeigt und der LLM verwendet das natürlich.

### F2: Sollten arbitrary values verboten werden?

Pro Verbot: kleinerer Class-Set, einfacher zu parsen.
Contra: schränkt Farb-/Größenkreativität massiv ein. Das LLM nutzt arbitrary values häufig für genau-passende Designs.
**Mein Vorschlag**: erlaubt. Compiler parst trivial (`bg-[#abc]` → `bg #abc`).

### F3: Was passiert mit Tailwind-Klassen die Mirror noch nicht kann?

Optionen:

- **Reject**: Compiler wirft Fehler, LLM muss neu generieren.
- **Warn + Best-Effort**: Compiler approximiert oder ignoriert mit Warnung.
- **Backlog**: Compiler dokumentiert die Lücke, emittiert Mirror-TODO-Kommentar.

**Mein Vorschlag**: Backlog-Modus. Eine fehlende Tailwind-Mapping ist ein Mirror-Schema-Backlog-Item, kein Generierungs-Failure. Compiler dokumentiert "couldn't translate `backdrop-saturate-150` — fallback to no-op", User sieht die Liste und priorisiert.

### F4: State-Inferenz oder explizite Annotation?

Beispiel: ein Tab-Row mit drei Buttons, einer hat `data-state="active"`. Soll der Compiler:

- **Statisch**: einfach den active-Look auf den einen Button anwenden, fertig.
- **Pattern-Inferenz**: erkennen "Tab-Group → exclusive() Action".

**Mein Vorschlag v1**: statisch. Pattern-Inferenz später (oder gar nicht — Behavior ist eh Mirror-seitig).

### F5: Wie weit darf das LLM beim Brief abweichen?

Beispiel: Brief sagt "Login-Screen", LLM generiert auch noch ein Trust-Badge, eine Footer-Section, ein Decoration-Element. Spec ist neutral dazu. **Mein Vorschlag**: keine Beschränkung, das LLM darf bereichern. Kreativitäts-Test profitiert davon.

### F6: Soll `<head>` oder `<body>`-Klassen Konfiguration tragen?

Beispiel: dunkles Theme-Default via `<html class="dark">`? Schriftart-Default via `<body class="font-sans">`?

**Mein Vorschlag**: Klassen auf `<body>` werden als Canvas-Properties interpretiert (font, default text-color, bg). Klassen auf `<html>` ignoriert.

## Phase-0-Experiment (sobald die Spec abgenommen ist)

1. Selbe 3 Briefs wie Pfad-B-Schritt-1 (Pricing, Login, Activity).
2. 2 Samples pro Brief mit dem neuen Constraint-Prompt.
3. Vergleich gegen die alten freien-HTML-Samples:
   - Subjektiv: ist es noch kreativ? Genauso interessant?
   - Objektiv: welche Tailwind-Klassen tauchen auf? Wie groß ist der "creative shrinkage"?
4. Bewertung: kreativ-genug → Architektur tragfähig → weitermachen mit Compiler-Bau.

Total: ~3-4 Stunden.

---

**Reviewfrage an dich:**

- Sind die Designprinzipien (oben) deine?
- Sind die offenen Fragen F1-F6 sinnvoll entschieden, oder willst du es anders?
- Fehlt was Wichtiges in der Spec?
