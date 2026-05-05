# Phase-0-Report: bleibt das LLM unter Strict-Spec kreativ?

**TL;DR**: Ja, deutlich. Die kreative Substanz bleibt erhalten; verloren geht nur das, was Mirror sowieso nicht ausdrücken kann.

## Setup

- 3 Briefs (Pricing, Mobile-Login, Activity-Feed), gleiche wie das frühere Free-HTML-Experiment
- 2 Samples pro Brief (= 6 Generierungen)
- Constraint-Prompt aus `SPEC-v0.md`: Tailwind-Utility-only, kein `<style>`, kein `style=""`, kein JS, nur Tag-Whitelist
- Spec-Compliance: 6/6 (alle vermeintlichen Violations sind nur `<script>lucide.createIcons()</script>` Boilerplate)

## Beobachtungen pro Brief

### Brief 1: Pricing-Page

**Strict s1**: Dunkles Linear-Style, indigo→fuchsia Gradient auf Pro-Karte, Sparkle/Zap-Icons, SOC2-Compliance-Footer. Sehr sauber und professionell.
**Strict s2**: Kompakter, gradient-Hero "Move faster, together", purple Pro-Karte mit Glow-Shadow, "Most Popular" als Floating-Badge.

**Kreativitäts-Vergleich zur Free-Variante**:

- Free hatte: lime-on-black + Instrument-Serif-Italic + Conic-Glow-Ring (sehr extreme Wahl)
- Strict hat: tastefulleres dark Linear-Vibe, weniger "wow", aber differenziert
- Within-path Diversität: gut — beide Samples nutzen unterschiedliche Hero-Strukturen, unterschiedliche Icon-Sets, unterschiedliche Most-Popular-Markup-Tricks (gradient-border-wrapper vs floating-badge)

### Brief 2: Mobile Login „Calm Forest"

**Strict s1**: Sanfter Sage-Gradient Hintergrund, Calm Forest mit Mantra "ATME. PAUSE. SEI.", Serif-Heading "Willkommen zurück.", glassmorphic Input-Fields.
**Strict s2**: Hellerer Wald-Gradient mit Status-Bar oben, Trees-Icon im gradient-Square, Mantra "ATME. SEI. WERDE STILL.", gradient Anmelden-Button mit Pfeil-Icon, Eye-Icon im Passwort-Feld.

**Kreativitäts-Vergleich**:

- Free hatte: foggy Wald-Horizont mit Glühwürmchen + Tree-Silhouetten + Fraunces-Serif (sehr atmosphärisch)
- Strict hat: subtilerer Gradient-Hintergrund (statt Particle-Effects), aber **Stimmung erhalten** — beide fühlen sich calm/meditativ an
- Tree-Silhouetten + Fireflies fehlen (brauchen Pseudo-Elements oder dekorative Layer — beides kein Tailwind)
- Custom-Serif-Fonts fehlen (kein `font-[Fraunces]` möglich)
- **Aber**: das LLM hat die Stimmung über Tailwind-Mittel rekonstruiert (blur-orbs, bg-white/70 + backdrop-blur, sage gradient stops)

### Brief 3: Activity Feed

**Strict s1**: Type-coded Color-Dots links, Gradient-Avatare, Quote-Block für Comment, Orange-Task-Card mit Annehmen-Button, FIG-Filetile mit magenta-gradient Avatar, violet Mention-Highlight, "Heute"-Section-Label.
**Strict s2**: Pill-Tab-Navigation mit Counts (Erwähnungen 3), unterschiedliche Avatar-Gradients pro User, blue Checkbox für Task, fuchsia-Tint für Mention mit Tag-Pill, scrollbare Liste.

**Kreativitäts-Vergleich**:

- Free hatte: Timeline-Rail, Status-Pipelines mit Step-Progress, Today/Earlier-Gruppierung
- Strict hat: type-coded Badges, gradient-Avatare, Section-Labels, distinct visual styles per Notification-Typ
- Timeline-Rail (vertikale 1px-Linie hinter Avataren) fehlt — brauchte `::before` oder absolute-positioning Trick
- **Aber**: die Kernidee "verschiedene Notification-Typen visuell unterscheidbar" ist voll umgesetzt, mit Tailwind-Mitteln (Border-Left Akzent, Background-Tints, Icon-Badges)

## Was erhalten bleibt

| Kreatives Mittel                            | Free | Strict |
| ------------------------------------------- | :--: | :----: |
| Layout-Vielfalt (Hierarchie, Spacing)       |  ✓   |   ✓    |
| Farbpaletten (auch ungewöhnliche)           |  ✓   |   ✓    |
| Tailwind Gradient-Tricks                    |  ✓   |   ✓    |
| Glassmorphism (`bg-white/70 backdrop-blur`) |  ✓   |   ✓    |
| Type-Differenzierung in Listen              |  ✓   |   ✓    |
| Sektionierung, Hero-Eyebrows, Pills         |  ✓   |   ✓    |
| Brand-korrekte Social-Buttons               |  ✓   |   ✓    |
| Sophisticated Use von Lucide-Icons          |  ✓   |   ✓    |
| Tab-Navigation mit Counts/States            |  ✓   |   ✓    |
| Within-Sample-Diversität (S1 ≠ S2)          |  ✓   |   ✓    |

## Was verloren geht

| Kreatives Mittel                          |  Verlust  | Mirror kann's eh nicht? |
| ----------------------------------------- | :-------: | :---------------------: |
| Custom Serif-Fonts (Fraunces, Instrument) | komplett  |           ja            |
| Firefly-Particles, Tree-Silhouettes       | komplett  |  ja (Pseudo-Elements)   |
| Conic-Gradient Glow-Rings                 | komplett  |           ja            |
| Custom @keyframes Animations              | komplett  |    ja (nur Presets)     |
| Multi-Layer radial-gradient Backgrounds   |   meist   |           ja            |
| Multi-Layer Box-Shadows (inset+drop)      | teilweise |        teilweise        |

**Kernbefund**: jeder Verlust ist auch ein Schema-Gap in Mirror. Das Strict-Format produziert keine Output-Features, die Mirror nicht aufnehmen könnte. Die Pipeline ist also **lossless für Mirror** — nichts geht beim Übersetzen verloren, weil das LLM gar nichts erst produziert hat, das verloren gehen könnte.

## Verdikt zur Architektur-Hypothese

> **Bleibt das LLM unter Strict-Spec kreativ?**
> **Ja**, deutlich genug für die Architektur. Verlust gegenüber freiem HTML existiert, ist aber bounded auf Bereiche, die Mirror eh nicht abbildet.

**Die Architektur ist tragfähig**:

- LLM macht HTML in seinem Kerngebiet (Tailwind-Style)
- Compiler kann deterministisch übersetzen (keine LLM-Translation-Variance)
- Schema-Gaps bei Mirror sind klar identifizierte Backlog-Items, kein Workaround-Bedarf

## Empfehlung für Phase 1

Die LLM-Kreativität ist nicht das Risiko. Weiterer Plan kann anlaufen:

1. **Spec auf v1 finalisieren** (kleine Anpassung: `<script>lucide.createIcons()</script>` als erlaubte Boilerplate definieren; sonst wie SPEC-v0)
2. **Compiler v1 bauen**: Schicht 1 (flat translation) — HTML-Parser + Tailwind-Class → Mirror-Property Lookup-Table + Tag → Primitive Mapping
3. **End-to-End-Test**: dieselben 6 Strict-HTMLs durch den Compiler jagen, gegen heute existierende Pfad-B-Mirror-Outputs vergleichen
4. **Schicht 2 + 3** (Token-Detection + Component-Extraction) iterativ danach

## Files

- `tools/experiments/html-spec/SPEC-v0.md` — die Spec
- `tools/experiments/html-spec/outputs/brief-{1,2,3}/strict-sample-{1,2}.html` — 6 Strict-Samples
- `tools/experiments/html-spec/screenshots/` — gerenderte Screenshots
- `tools/experiments/html-spec/render/compare-creativity.html` — Live-Vergleichs-Page (Free vs Strict)
- `tools/experiments/html-spec/PHASE-0-REPORT.md` — dieser Report
