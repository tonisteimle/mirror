/**
 * Prompt-Builder für die zweistufige Generation-Pipeline (HTML → Mirror).
 *
 * Zwei reine Funktionen:
 *   - `buildHtmlGenerationPrompt` — Stufe 1: User-Prompt (oder Sketch) → HTML
 *   - `buildTranslationPrompt`    — Stufe 2: HTML → idiomatisches Mirror
 *
 * Die Prompt-Texte sind die in den Spike-Experimenten validierten Versionen
 * (siehe `docs/ai-generation-pipeline.md` Anhang und `tools/experiments/
 * svelte-spike/`). Hard Constraints + Translation-Hints + Design-Quality-Bar
 * sind Mirror-spezifisch — Anpassungen hier wirken auf jede Generierung.
 *
 * Keine Side-Effects. Keine Bridge-Calls. Keine Editor-Abhängigkeit.
 */

import type { ValidationError } from '../../compiler/validator'

// ============================================================================
// Stufe 1 — HTML-Generation
// ============================================================================

export interface HtmlGenerationPromptInput {
  /**
   * Freeform User-Prompt ("Eine Stat-Card mit Monthly Revenue …"). Entweder
   * `userPrompt` ODER `sketch` muss gesetzt sein. Wenn beides gesetzt ist,
   * wird der Sketch primär behandelt und der Prompt als zusätzlicher Hint.
   */
  userPrompt?: string
  /**
   * Roher Mirror-Sketch — bewusst unterspecified, vom Designer geschrieben.
   * Pipeline interpretiert grosszügig und idiomatisch.
   */
  sketch?: string
}

const HTML_HARD_CONSTRAINTS = `## Hard constraints (the HTML must stay within Mirror's possibility space)

- Flexbox only — no \`display: grid\`, no \`float\`, no \`inline-block\`
- Pixel values as integers only — no \`%\`, \`rem\`, \`em\`, \`vh\`, \`vw\`, \`calc()\`, \`clamp()\`
- No \`@media\` queries — produce a single fixed-width widget
- Flat CSS class selectors only. State pseudo-classes allowed: \`:hover\`, \`:focus\`, \`:focus-visible\`, \`:active\`, \`:disabled\`. No compound selectors (\`.parent .child\`), no descendant combinators
- No \`@keyframes\`, no \`transition\`, no \`animation\`
- Lucide-icons inline as \`<svg>\` with a class hint: \`<svg class="icon icon-heart" ...>\`. The class name encodes the Lucide icon name so the translator can map it to \`Icon "heart"\`.
- No external assets. Avatars as SVG initials or geometric shapes — no \`<img src>\` to remote URLs.`

const HTML_TRANSLATION_HINTS = `## Translation-friendly conventions (make the translator's job trivial)

- Use semantic class names that hint component structure: \`.profile-card\`, \`.btn-primary\`, \`.stat-pill\`. The translator turns these into Mirror Component definitions.
- Base+modifier pattern for repeated components: \`<button class="btn btn-primary">\`. The translator turns this into \`Btn:\` + \`PrimaryBtn as Btn:\`.
- Toggleable state via class-modifier: \`<button class="btn-favorite is-on">\`. The translator turns this into \`toggle()\` + \`on:\` state block.
- Define design tokens as \`:root\` custom properties with descriptive names: \`--accent\`, \`--surface\`, \`--space-md\`, \`--radius-sm\`. The translator maps these to Mirror tokens (\`accent.bg: …\`, \`space.gap: …\`).
- HTML comments at structural boundaries: \`<!-- card: profile -->\`, \`<!-- primary action -->\`. They guide the translator's component decomposition.
- JS handlers with semantic names: \`toggleFollow()\`, \`dismissToast()\` — not \`handleClick()\`. Names map cleanly to Mirror actions.`

const HTML_QUALITY_BAR = `## Design quality bar

- Restraint over decoration. Avoid clichés: gradient buttons, glassmorphism, generic hover lifts, shadows on every element.
- Type-led hierarchy via size and weight contrast — not via color noise or boxes.
- Single accent color. Other UI elements stay neutral (slate / zinc / gray).
- Intentional spacing — consistent multiples of a base unit (4 or 8 px).
- One distinctive design decision per output. Match the quality bar of Linear / Vercel / modern editorial UI, not generic SaaS templates.`

const HTML_OUTPUT_RULES = `## Output rules

- Output ONE complete, self-contained HTML file (\`<!doctype html><html>…</html>\`).
- Output the HTML directly — no markdown code fences, no prose before or after, no explanations.
- Inline all CSS in a single \`<style>\` block in the \`<head>\`.
- Inline all JS in a single \`<script>\` at the end of \`<body>\`.`

export function buildHtmlGenerationPrompt(input: HtmlGenerationPromptInput): string {
  const { userPrompt, sketch } = input
  if (!userPrompt && !sketch) {
    throw new Error('buildHtmlGenerationPrompt: either userPrompt or sketch is required')
  }

  const parts: string[] = []

  if (sketch) {
    parts.push(
      `You are a UI designer's interpreter. A designer has written a rough, sketch-like Mirror DSL snippet describing a UI widget. The sketch is intentionally underspecified — it conveys structure and design intent but leaves many decisions (exact colors, sizing, typography, spacing, polish) up to you. Interpret generously and idiomatically.`
    )
    parts.push(`## Designer's sketch\n\n\`\`\`\n${sketch}\n\`\`\``)
    if (userPrompt) {
      parts.push(`## Additional notes from the designer\n\n${userPrompt}`)
    }
    parts.push(
      `## Things you should infer\n\n- Loose style hints ("small", "muted", "huge", "bold", "uppercase", named colors) → concrete values consistent with editorial restraint\n- Token names → real \`:root\` custom properties in the HTML\n- Implied widget type → fill in design context coherently`
    )
  } else {
    parts.push(
      `You are a UI designer working in HTML/CSS/JS. The user has described a UI widget they want. Produce a complete, self-contained HTML file that realizes the design with high craft.`
    )
    parts.push(`## User request\n\n${userPrompt}`)
  }

  parts.push(
    `Your output will subsequently be translated to the Mirror DSL by a separate agent — follow the constraints and translation-friendly conventions below so the translation can stay clean and idiomatic.`
  )

  parts.push(HTML_HARD_CONSTRAINTS)
  parts.push(HTML_TRANSLATION_HINTS)
  parts.push(HTML_QUALITY_BAR)
  parts.push(HTML_OUTPUT_RULES)

  return parts.join('\n\n')
}

// ============================================================================
// Stufe 2 — HTML → Mirror Translation
// ============================================================================

export interface TranslationContext {
  /** "Stat card", "Profile card", "Toast notification", … */
  type?: string
  /** "Identifies a user in a directory; primary actions are Follow and Message." */
  purpose?: string
  /**
   * "Restrained, modern editorial — type-led hierarchy, single accent, no
   *  decorative shadows or gradients. Match Linear / Vercel quality."
   */
  designIntent?: string
}

export interface TranslationPromptInput {
  /** The HTML from stage 1, inline. */
  html: string
  /** Optional structured context for the translator. */
  context?: TranslationContext
  /**
   * Project context — all sibling files already in the project. Multi-File-
   * Roadmap: extension-agnostic; the translator reads each sibling and
   * picks up tokens / components / data / layouts from its content. Map:
   * filename → content. The translator should reuse existing definitions
   * rather than inventing parallel ones.
   */
  siblings?: Record<string, string>
  /**
   * On retry: validator errors from the previous attempt + the previous
   * Mirror output, so the translator can repair instead of starting from
   * scratch.
   */
  retryContext?: {
    validationErrors: ValidationError[]
    previousMirror: string
  }
}

const TRANSLATION_GUIDELINES = `## Translation guidelines

- Map HTML tags to Mirror primitives: \`div→Frame\`, \`span→Text\`, \`button→Button\`, \`a→Link\`, \`img→Image\`, \`h1-h6→H1-H6\`, \`input→Input\`, \`textarea→Textarea\`.
- Translate flexbox CSS to Mirror layout:
  - \`display: flex\` → \`Frame\` (the default layout)
  - \`flex-direction: row\` → \`hor\`
  - \`gap: Npx\` → \`gap N\`
  - \`justify-content: space-between\` → \`spread\`
  - \`align-items: center\` → \`ver-center\` (in horizontal frames) or \`hor-center\` (in vertical)
  - \`padding: Npx\` → \`pad N\`; multi-value padding → \`pad t r b l\`
  - \`border-radius: Npx\` → \`rad N\`
- Convert \`:root\` CSS custom properties to Mirror tokens. Suffix the token name by intended use:
  - background color → \`name.bg: #hex\`
  - foreground / text → \`name.col: #hex\`
  - border color → \`name.boc: #hex\`
  - icon color → \`name.ic: #hex\`
  - spacing (padding/gap) → \`name.pad: N\` or \`name.gap: N\`
  - radius → \`name.rad: N\`
- Base+modifier classes → Mirror base component + variants via \`as\`:
  - \`<button class="btn btn-primary">\` → \`Btn: …\` + \`PrimaryBtn as Btn: bg $primary, col white\`, then \`PrimaryBtn "Save"\`
- State-modifier classes (\`is-on\`, \`is-active\`, \`is-selected\`) → Mirror \`toggle()\` (or \`exclusive()\`) + \`on:\` (or \`selected:\`) state block.
- \`:hover\`, \`:focus\`, \`:active\`, \`:disabled\` → corresponding Mirror state blocks.
- **State blocks must NOT be nested.** Each element gets at most ONE level of state blocks. Do not place \`hover:\` inside an \`on:\` block (or vice versa) — that's a parser-incompatible pattern. If a hover effect should differ in the on-state, encode it via additional logic outside the state nesting (e.g. a separate child element, or accept that hover-in-on uses the base hover style). Listing multiple state blocks at the same indent level under the element IS fine — what's forbidden is nesting one inside another.
- Lucide-class-hinted SVGs (\`<svg class="icon icon-heart">\`) → \`Icon "heart"\` (use the Lucide name from the class). Don't inline SVG paths unless the icon is custom — for custom icons use the \`$icons:\` registry.
- Avatar SVGs (initials, geometric placeholders) → keep as Mirror Frame with Text or Icon, do not inline raw \`<svg>\` elements.
- Use idiomatic Mirror — consolidate repeated structures into Components, extract repeated values into Tokens.
- Reading order: prefer Tokens → Components → top-level UI tree.
- **Do NOT emit a top-level \`canvas\` declaration.** The \`canvas\` keyword is parser-restricted to the very first non-comment line; using it after tokens/components produces parse errors. Instead, wrap the UI tree in a top-level \`Frame\` with the same body-level properties (\`bg\`, \`col\`, \`font\`, \`fs\`, \`pad\`, etc.) — that's the idiomatic equivalent and works in any position.
- Honor restraint: don't add decorative shadows, gradients, or animations that the source HTML doesn't have.`

const TRANSLATION_OUTPUT_RULES = `## Output rules

- Output ONLY the Mirror DSL.
- No markdown code fences (no \`\`\`mirror), no prose before or after, no explanations.
- The first line of your output must be the first line of the Mirror code.`

function formatProjectFilesForTranslator(
  siblings: Record<string, string> | undefined
): string | null {
  if (!siblings) return null
  const entries = Object.entries(siblings).filter(([, v]) => v.trim())
  if (entries.length === 0) return null
  // Multi-File-Roadmap: flat sibling-list, no semantic split. The translator
  // identifies tokens vs components vs data vs layouts from the file
  // content, the same way a human code-reviewer would.
  const parts = [
    `## Project context — sibling files (reuse existing tokens / components / data instead of redefining)`,
  ]
  for (const [name, content] of entries) {
    parts.push(`\n**${name}**\n\n\`\`\`\n${content.trim()}\n\`\`\``)
  }
  return parts.join('\n')
}

function formatContextBlock(context: TranslationContext | undefined): string | null {
  if (!context) return null
  const lines: string[] = []
  if (context.type) lines.push(`Type:           ${context.type}`)
  if (context.purpose) lines.push(`Purpose:        ${context.purpose}`)
  if (context.designIntent) lines.push(`Design intent:  ${context.designIntent}`)
  if (lines.length === 0) return null
  return `## Context\n\n${lines.join('\n')}`
}

function formatRetryContext(retry: TranslationPromptInput['retryContext']): string | null {
  if (!retry) return null
  const errorLines = retry.validationErrors.map(
    err =>
      `- [${err.code}] line ${err.line}, col ${err.column}: ${err.message}` +
      (err.suggestion ? ` — hint: ${err.suggestion}` : '')
  )
  return `## Previous attempt — validator failed

The Mirror code you produced last time did not pass the validator. Repair it; do not start from scratch.

### Your previous output

\`\`\`mirror
${retry.previousMirror}
\`\`\`

### Validator errors to fix

${errorLines.join('\n')}

Produce a corrected Mirror file. Address each error above. Keep everything that was already correct.`
}

export function buildTranslationPrompt(input: TranslationPromptInput): string {
  const { html, context, siblings, retryContext } = input

  const parts: string[] = []

  parts.push(`You are translating an HTML/CSS/JS UI into Mirror DSL.`)

  parts.push(`## Mirror reference

Read \`CLAUDE.md\` in the project root fully — the Mirror DSL syntax, primitives, properties, components, tokens, states, and idioms are documented there. Use it as your authoritative reference.`)

  const ctxBlock = formatContextBlock(context)
  if (ctxBlock) parts.push(ctxBlock)

  const projectBlock = formatProjectFilesForTranslator(siblings)
  if (projectBlock) parts.push(projectBlock)

  parts.push(`## Source HTML

\`\`\`html
${html}
\`\`\``)

  parts.push(TRANSLATION_GUIDELINES)

  const retryBlock = formatRetryContext(retryContext)
  if (retryBlock) parts.push(retryBlock)

  parts.push(TRANSLATION_OUTPUT_RULES)

  return parts.join('\n\n')
}
