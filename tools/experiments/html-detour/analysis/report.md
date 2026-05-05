# Experiment-Report: HTML-Umweg vs. Direkter Mirror-Pfad

**Datum:** 2026-05-03
**LLM:** Claude Opus 4.7 (alle Generierungen via isolierte Sub-Agents)
**N:** 3 Briefs × 2 Samples × 2 Pfade = 12 Mirror-Outputs (+ 6 HTML-Zwischenstufen)

> **Wichtig:** Pilot-Skala. N=2 pro Zelle. Liefert _Richtungssignal_, keine statistische Signifikanz. Aber das Signal ist deutlich genug, um daraus Hypothesen für eine größere Studie und eine konkrete DSL-Roadmap abzuleiten.

---

## 1. Setup-Recap

```
Brief
  ├─ Pfad A: Brief ──────────────► Mirror     (1 LLM-Call)
  └─ Pfad B: Brief ──► HTML ────► Mirror      (2 LLM-Calls)
```

Pfad A und Pfad B Schritt 2 bekamen _identische_ Mirror-DSL-Referenz (CLAUDE.md). Pfad B Schritt 1 (HTML-Generierung) lief ohne Mirror-Wissen — volle Kreativität.

Briefs:

1. **Pricing-Page** "Stride" (Desktop, 3 Tarife horizontal)
2. **Mobile Login** "Calm Forest" (375×812, naturinspiriert)
3. **Activity Feed** (480×720, 5 Notification-Typen)

Briefs bewusst aus Bereichen mit **viel HTML-Trainingsdaten** — der härteste Test für Mirror.

---

## 2. Hauptergebnisse

### 2.1 Compile-Rate: 100% beide Pfade

Alle 12 Mirror-Files kompilieren beim ersten Versuch. **Mirror-Generation durch LLMs ist reliable** — sowohl direkt als auch über Übersetzung. Kein Pfad-Vorteil hier.

### 2.2 Code-Größe: Pfad B ist 70% größer

| Metrik (Mittelwert)       | Pfad A | Pfad B | Differenz |
| ------------------------- | -----: | -----: | --------- |
| LOC (non-blank)           |    113 |    192 | +70%      |
| Tokens definiert          |     17 |     18 | gleich    |
| Components definiert      |    4.3 |   13.7 | **+218%** |
| `$token`-Referenzen       |     50 |     44 | gleich    |
| Property-Repetition / LOC |   0.99 |   0.81 | -18%      |

Pfad B braucht mehr Code, weil das HTML-Original mehr visuellen Reichtum hatte (Pricing-Toggles, Trust-Sections, gestufte Hierarchien, Hero-Eyebrows). Bei Übersetzung wandert das in Mirror — was Pfad A wegließ.

### 2.3 Creativity Gap: HTML deutlich kreativer (qualitativ)

Klarer Unterschied beim Lesen der Samples. Beispiele:

**Brief 1 (Pricing):**

- Pfad A: dunkles Indigo + violette Akzente, 3 Cards. Beide Samples sehr ähnlich.
- Pfad B HTML: Sample 1 = lime-grün auf schwarz + Conic-Glow-Ring + Serif-Italic-H1; Sample 2 = Fraunces-Display-Serif + JetBrains-Mono + ambient glow + Dot-Grid. **Bedeutend mutiger.**

**Brief 2 (Login):**

- Pfad A: Forest-Green + Sage + Cream. Konservative Mobile-Card.
- Pfad B HTML: Sample 1 = nebliger Wald-Horizont mit Sonnenaufgang + Glühwürmchen + geschichtete Baumsilhouetten + Glas-Card; Sample 2 = Phone-Mockup mit floating leaves + frosted-glass + Fraunces-Headline. **Atmosphäre, nicht nur Layout.**

**Brief 3 (Activity Feed):**

- Pfad A: dunkle Sidebar, type-codierte Avatar-Farben, einfache `FeedItem`-Component.
- Pfad B HTML: Color-coded Type-Rail links, Avatar-Badge-Overlays, Today/Earlier-Gruppen, Status-Pipeline-Visualisierung mit Step-Progress.

**Beobachtung:** Pfad B HTML produziert reichere visuelle Sprache (Typography-Mix, Layering, atmosphärische Backgrounds). Übersetzung nach Mirror **erhält** das größtenteils — nicht 1:1 (siehe Schema-Gaps unten), aber die Grund-Stimmung schon.

### 2.4 Within-Path Diversity: Pfad A konvergiert zu "Default Mirror"

Auffällig: die zwei Samples in Pfad A pro Brief sind **sehr ähnlich** zueinander. Beide Pricing-Samples = dark+indigo. Beide Login-Samples = forest+sage+cream. Beide Activity-Samples = dark+type-accent-colors.

Pfad B Samples variieren mehr (lime-on-black vs. fraunces-on-dot-grid; foggy-forest-fireflies vs. phone-mockup-frosted-glass).

**Hypothese:** Das LLM hat einen "Default Mirror Style" gelernt — vermutlich aus den wenigen Mirror-Examples in Trainingsdaten (oder DSL-Reference) — und konvergiert dorthin. HTML hat dagegen einen viel breiteren Trainings-Stilraum, der durch die Übersetzung in Mirror einsickert.

### 2.5 Idiomatik-Tradeoff: Pfad A kompakter, Pfad B reicher

Pfad A: 4–6 Components pro File. Mirror sieht aus wie hand-geschrieben.

Pfad B: bis zu 24 Components in einem File (brief-1 sample 1). _Nicht_ Decompilation — die Components haben sinnvolle Namen (`Eyebrow`, `Chip`, `Dot`, `CheckPill`, `NavLink`). Aber sehr viel mehr Abstraktionen, weil das HTML mehr atomare Bausteine hatte.

Frage für Designer-Editability: ist mehr Granularität gut (klar getrennte Concerns) oder schlecht (mehr zu lesen)? **Das müsste eine Folge-Studie mit echten Designern klären.**

**Negativbefund:** Pfad-A-Samples nutzen Tokens nicht immer konsistent. `brief-1/path-a-sample-1.mir` definiert 13 Tokens, referenziert _keinen einzigen_ — alles inline-Hex. Pfad-B-Übersetzung war hier disziplinierter (vermutlich weil die Übersetzungs-Anleitung explizit "use tokens" sagte).

---

## 3. Schema-Gaps: was HTML→Mirror nicht 1:1 übersetzen konnte

**Das ist der wertvollste Output dieses Experiments** — eine konkrete, durch reales LLM-Verhalten priorisierte Liste von DSL-Lücken:

### Gradients & Backgrounds

- ❌ `radial-gradient` (mehrfach erwähnt — Glow-Effekte)
- ❌ `conic-gradient` (Pro-Card Glow-Ring)
- ❌ Multi-Layer Backgrounds (Vignette + Dot-Grid + Card-Glow gestapelt)
- ❌ `backdrop-filter: saturate()` (nur `backdrop-blur` vorhanden)
- ❌ Pseudo-Elements `::before/::after` (CSS-Dekoration ohne Markup-Bloat)

### Shadows & Effects

- ❌ Multi-Layer Box-Shadows (`inset` + `drop`-Shadow kombiniert) — nur `shadow sm/md/lg` Presets
- ❌ Inset-Highlights (`inset 0 1px 0 rgba(255,255,255,0.25)`) — typischer "polished button" Effekt
- ❌ Ambient Glow (large soft-shadow für hero-elements)

### Typography

- ❌ Custom Font Families (Fraunces Serif, JetBrains Mono) — nur `sans/serif/mono`
- ❌ `letter-spacing` / `tracking-[0.22em]` — nur `uppercase`
- ❌ `font-feature-settings` (ss01, tnum, etc.)
- ❌ `line-through` (nur `underline`)
- ❌ `line-clamp-2` / Multi-Line-Truncate (nur Single-Line `truncate`)
- ❌ Inline-Span-Styling (z.B. `@mention`-Highlight innerhalb eines Text-Blocks)

### Layout & Positioning

- ❌ `sticky` Positioning (sticky-Group-Headers)
- ❌ `group-hover` Reactions (Nested-Hover, z.B. "More-Button erscheint nur bei Card-Hover")

### Animations & Transforms

- ❌ Custom `@keyframes` (nur fixe Presets: pulse/bounce/shake/spin/etc.)
- ❌ `transform: scale(-1, 1)` (Icon-Spiegelung)
- ❌ Per-State Transition-Tuning (komplexe Easing pro Property)

### Misc

- ❌ Tailwind `ring` mit Offset (nur `bor` als Approximation, ohne Offset)

---

## 4. Bewertung: stützt das Experiment die Hypothese?

**Hypothese:** "LLM-generierte HTML-UIs sind kreativer und besser als LLM-generierte Mirror-UIs."

**Befund:** Ja, qualitativ klar — bei diesen 3 Briefs, mit dieser Brief-Auswahl (alle aus HTML-trainingsdaten-reichen Domains).

**Wichtige Caveats:**

1. Brief-Auswahl bias: bewusst Web-Standard-UIs gewählt, wo HTML maximalen Vorteil hat. Bei weniger HTML-typischen UIs (z.B. interne Tools, Domain-spezifische Layouts) wäre der Gap kleiner.
2. "Kreativ" ≠ "besser für den Use-Case". Eine Pricing-Page mit Conic-Glow-Ring ist beeindruckend, aber ein Designer mag das simple Card-Grid schneller iterieren können.
3. N=2 — keine Statistik. Was wir _gesehen_ haben ist konsistent, aber wir haben nur wenige Stichproben.
4. Keine echte Designer-Editability gemessen.

**Folgerung:** Pfad-B (HTML-Umweg) ist als _Mirror-Generierungs-Strategie_ **viable und vermutlich überlegen** für Mirror-Files, die "designed look" haben sollen. Die Translation ist robust (100% Compile, sinnvolle Components, dokumentierte Schema-Gaps).

---

## 5. Was wir NICHT validiert haben (für eine größere Studie)

- **Designer-Editability**: kann ein menschlicher Designer den Pfad-B-Output schneller anpassen als den Pfad-A-Output? (Pfad B hat mehr Components — könnte Vorteil ODER Nachteil sein)
- **AI-Roundtrip**: gib LLM den eigenen Output zurück, bitte um 3 Änderungen — bricht Pfad-B-Code eher? Behält Konsistenz?
- **Visuelle Treue**: wie nah kommt der Mirror-Render dem Original-HTML-Render? (Wäre via Browser-Rendering messbar)
- **Brief-Type-Spezifizität**: ist der Gap bei Mobile-UI größer als bei Desktop? Bei Daten-Heavy UIs vs. Marketing-UIs?
- **Cost-Benefit**: Pfad B kostet 2× LLM-Calls + längerer Code. Lohnt sich das immer?

---

## 6. Konkrete Konsequenzen für Mirror

### A. DSL-Roadmap (priorisiert nach Auftretenshäufigkeit in den Translation-Reports)

**Hoher Impact, oft erwähnt:**

1. **Multi-Layer-Gradients** (radial + linear stacked) — fast jedes Sample-2-Output erwähnte das
2. **Multi-Layer-Box-Shadows** (inset + drop) — kommt in fast jedem polished-Button-Design vor
3. **Custom Font-Families** (über `font sans/serif/mono` hinaus) — moderne Designs nutzen Display-Fonts
4. **`line-clamp` / Multi-Line-Truncate** — kommt in jeder Card-mit-Description-Liste vor

**Mittlerer Impact:** 5. **Letter-spacing** (für Eyebrows, Caps, Tags) 6. **Inline-Span-Styling** (für Mentions, Highlights innerhalb von Text) 7. **Sticky-Positioning** (Group-Headers in Listen) 8. **Custom Animation Keyframes** (über die 18 Presets hinaus)

**Niedriger Impact, aber leicht zu fixen:** 9. **`line-through`** (Text-Decoration) — wahrscheinlich 10 Zeilen Code im DOM-Backend 10. **`backdrop-filter: saturate`** (zusätzlich zu `backdrop-blur`) 11. **Transform-Scale für Icons** (Spiegelung)

**Architektur-Diskussion:** 12. **Pseudo-Elements / dekorative Layer** — fundamentaler. Stacked-Frames sind die Mirror-Antwort, aber HTML-Designs nutzen `::before/::after` häufig. Worth thinking about.

### B. Prompt-Engineering für direkte Mirror-Generierung

Pfad A konvergiert zu "Default Mirror Style" mit niedrig-creativer Vielfalt. Mit besseren System-Prompts (mehr Examples, expliziter Style-Diversity-Aufforderung) ließe sich der Gap zu Pfad B vermutlich verkleinern. Wert eines A/B-Tests.

### C. HTML-Detour als first-class Generierungspfad

Studio könnte eine "Generate via HTML"-Mode anbieten: User-Prompt → HTML in Hintergrund → Mirror. Vorteil: Mirror-Output mit HTML-Design-Qualität. Nachteil: 2× Latenz und Cost. Sinnvoll für initiales Mockup, weniger für inkrementelle Edits.

---

## 7. Files

```
tools/experiments/html-detour/
├── README.md                          # Setup-Beschreibung
├── briefs.md                          # Die 3 Briefs
├── prompts/                           # Agent-Prompt-Templates
├── outputs/
│   ├── brief-1/
│   │   ├── path-a-sample-1.mir        # 117 LOC, dark+indigo
│   │   ├── path-a-sample-2.mir        # 128 LOC, dark+indigo (sehr ähnlich)
│   │   ├── path-b-html-sample-1.html  # lime-on-black + serif-italic
│   │   ├── path-b-html-sample-2.html  # Fraunces + JetBrains-Mono
│   │   ├── path-b-mirror-sample-1.mir # 310 LOC, 24 Components
│   │   └── path-b-mirror-sample-2.mir # 262 LOC, 16 Components
│   ├── brief-2/  (gleiche Struktur)
│   └── brief-3/  (gleiche Struktur)
├── analyze.ts                         # Metrik-Skript
└── analysis/
    ├── metrics.json                   # Roh-Metriken
    └── report.md                      # Dieses Dokument
```

Alle 12 Mirror-Files kompilieren. Alle 6 HTML-Files im Browser darstellbar.

---

## 8. Empfehlung für nächsten Schritt

Drei Optionen, in steigender Investition:

1. **Visual-Render-Vergleich (1 Tag)**: HTML und Mirror beide rendern, Side-by-Side-Screenshots, qualitative Bewertung der visuellen Treue der Translation.

2. **Designer-Editability-Pilot (1 Woche)**: 3 Designer × 6 Files (1 pro Brief × Pfad) × 3 vorgegebene Änderungen. Misst Edit-Time und Success-Rate. Klärt die "ist mehr Component-Granularität gut?"-Frage.

3. **DSL-Schema-Roadmap (laufend)**: die Top-5-Schema-Gaps aus Sektion 6.A umsetzen, dann Experiment wiederholen — schließt sich der Creativity-Gap?

**Meine Empfehlung:** Option 3 zuerst. Die Schema-Gaps sind real und blockieren auch Designer beim Hand-Coden, nicht nur LLMs bei der Übersetzung. Multi-Layer-Gradients und Multi-Shadow allein würden 80% der "atmosphärischen" HTML-Features abdecken.
