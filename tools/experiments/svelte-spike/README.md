# Svelte Spike — LLM design-quality test

Testet, ob **constrained Svelte** als LLM-Output-Format genug Design-Qualität behält, um Mirrors Generation-Problem zu lösen — d.h. ob ein striktes, deterministisch-parsbares Svelte-Subset näher an freiem Svelte liegt als an Mirror.

## Setup

3 Prompts × 3 Modi = 9 Generations.

**Modi:**

- `a-free-svelte` — idiomatisches Svelte, keine Constraints (LLM-Bestcase)
- `b-contained-svelte` — Svelte unter strikten kanonischen Regeln (parsbar zu Mirror)
- `c-mirror` — Mirror DSL (Status quo)

**Prompts:**

- `p1` — Login-Form (pure Styling/Layout, hover states)
- `p2` — Pricing-Tiers (Wiederholung + Hierarchie + visuelle Hervorhebung)
- `p3` — Settings-Panel mit Tabs (Interaktion + Struktur + Toggles/Radios)

## Vergleichs-Logik

- **A vs B** — wie viel Design-Qualität kostet das Constraining? (Constraint-Cost)
- **B vs C** — ist der LLM-Fluency-Dividende den Pivot wert? (Pivot-Value)
- **A vs C** — Sanity-Check: repliziert sich das ursprüngliche HTML-vs-Mirror-Ergebnis?

## Rendern & Beurteilen

- A/B: in einem Svelte-Playground / SvelteKit-Page / svelte.dev/repl rendern
- C: im Studio (`npm run studio`) öffnen
- Side-by-side, idealerweise blind und randomisiert
- Beurteilen: visuelle Polish (Spacing, Hierarchie, Palette), Instruction-Following, Production-Readiness-Gefühl

## Modell

Generiert mit Claude Sonnet (general-purpose Agents). Selbes Modell über alle 9 Zellen, identische User-Prompt-Formulierung pro Prompt.
