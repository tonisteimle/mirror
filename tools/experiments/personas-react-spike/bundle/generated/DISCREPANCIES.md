# Discrepancies vs. visual-reference.html

Comparison was eyeballed by reading `visual-reference.html` (1109 lines)
and code-reviewing the generated React tree. No manual browser-window
diff at desktop width was performed.

## Likely visual gaps (acceptable, not blockers)

1. **Hero `min-h-60vh` + bottom-pinned bar**
   The reference uses `position: absolute` on the hero bar with a `0.9375 *
inner-width` width and pins it via `::after`. The generated `Hero`
   component places `<HeroBar />` as a normal grid row (`auto 1fr auto`) and
   `HeroBar` width is `1140px` capped at `93.75%`. The bar will sit at the
   right edge of the hero on wide viewports but is not `position: absolute`
   over the inner padding region, so its left offset and width may shift by
   ±24 px depending on viewport. Visually similar at desktop, not pixel-
   identical.

2. **Hero typography responsive clamp**
   Reference uses `clamp(38px, 7vw, 96px)` for the `h1`. The generated H1
   uses fixed `text-[96px]`. At narrow viewports the generated heading will
   not shrink. App.mir specifies `fs 96` (no clamp), so we honour the source
   — but the visual reference is more responsive. Acceptable for a desktop
   reading.

3. **Persona-header column gap & alignment**
   Reference uses a CSS grid template with `grid-template-areas` to put
   `number` and `title` side-by-side on the header row with a third
   `steckbrief` row spanning both columns underneath. Generated layout uses
   `flex flex-col md:flex-row items-end` for the header row, then the
   steckbrief sits below in its own `Container`. Result is similar but
   the steckbrief gets a 28-px top margin instead of the reference's grid
   row-gap (~44 px on wide viewports).

4. **TwoColumn / ProseColumn**
   `ProseColumn as Frame: w 280` is a fixed 280 px column. The reference
   collapses both columns to single-column < 980 px. Generated grid switches
   from 1col to 2col at Tailwind's `lg` (1024 px) breakpoint instead of
   980 px. Off by 44 px breakpoint window.

5. **DimGrid breakpoints**
   Reference: 1col → 2col at 720 px → 4col at 1180 px. Generated: 1col →
   2col at md (768 px) → 4col at xl (1280 px). Slightly different breakpoint
   anchors, same shape.

6. **Footer grid**
   Reference uses 2fr/1fr two-col on `min-width: 720px`. Generated mirrors
   that. Should match.

7. **`prose` class from `ProseBody`**
   `@tailwindcss/typography`'s `prose` adds its own paragraph spacing,
   bullet markers, and font sizes. We override the dash-list bullet style
   via custom CSS (`.dash-list`), but the surrounding `prose` may apply
   default `<p>` margin and font-size 16 px to the unstructured paragraphs
   inside `WarumBlock` etc. Not a regression vs. the reference, just a
   styling layer that may need tuning.

8. **Persona-header full-bleed**
   Reference uses negative `margin-left/right: var(--pad-x)` which is
   responsive (`max(24px, 50vw - 640px)`). Generated uses fixed `-mx-6`
   (24 px). At wide viewports, the band will not extend to the viewport
   edges; it stops at 24 px from the screen edge instead of stretching.

9. **`em` rendering**
   In the visual reference, `<em>` inside h1/h2/h3 renders as Inter,
   font-weight 300, non-italic — different from default `<em>`. We replicate
   this via the `.em-light em { … }` rule in `index.css`. Other `<em>` in
   ordinary prose (e.g., the `Innere Stimme — *was wirklich im Kopf sitzt*`
   heading) inherits this same rule because we apply `em-light` to all
   H1–H3.

10. **PersonaSteckbrief vertical position inside header band**
    Reference grid-area places the steckbrief below the number+title with
    a `~44 px` row gap. We use `mt-7` (28 px) on the steckbrief paragraph.
    Close, not exact.

## Things I deliberately left as-is

- The four Dim cells in each Persona section (Situation/Ziel/Herausforderung/
  Needs) match `app.mir` literally, including the placeholder text
  `(siehe Detailbericht)` for Herausforderung and Needs. The visual
  reference has fully-fleshed-out content for all four. **The Mirror
  source is authoritative per the gate ("preserve text content
  verbatim")**, so the generated page intentionally diverges from the
  reference here — it shows the same skeleton the Mirror author wrote.

- `OffeneList` numbering uses CSS `counter()` to render `01`, `02`, … in
  Inter 14 px light, matching the reference. The Mirror source uses
  `1.` etc. as Markdown-style ordered list items inside an `OffeneList`
  block; we render them as `<li>` and let CSS counters provide the visible
  number, so the list reorders on item add/remove.

## What I was unsure about (Mirror-construct ambiguity)

- **`HeroBar as Frame: w 1140`** — fixed 1140 px is wider than the content
  max 1280 minus side padding 48, but **also** wider than common mobile
  viewports. The visual reference uses `0.9375 * (100vw - 2*pad-x)` so the
  bar is responsive. I picked `w-[1140px] max-w-[93.75%]` as a compromise
  that approximates the wide-viewport look without overflow on narrow.

- **`PersonaHeaderBand as Frame: …, mar 0 0 80 0`** — `mar 0 0 80 0` reads
  like CSS: top, right, bottom, left. So `mar-bottom: 80`. Implemented as
  `mb-20`.

- **Top-level instances without `as Frame`** like `Topbar:`, `Hero:`,
  `Logo:`, `FooterFrame:` — the brief says "Top-level (`Logo:`) becomes a
  component whose default body is the indented children." For `Topbar`,
  `Hero` and `FooterFrame` the indented body is empty in the `.com` (just
  defaults), and the body comes from `app.mir`. For `Logo` and `LogoLight`
  the body is fixed (the n|w mark and the label). I generated them
  accordingly.

## Things to fix in a second pass (if needed)

- Tighten persona-header to a true CSS grid with the `grid-template-areas`
  pattern from the reference (cleaner three-line layout).
- Replace `-mx-6` on `PersonaHeaderBand` with a proper full-bleed pattern
  (e.g., `mx-[calc(50%-50vw)] px-[calc(50vw-50%+24px)]` or use `[mask]`-
  free approach).
- Move `prose` overrides out of `ProseBody` and into a wrapper class
  to avoid `@tailwindcss/typography` clobbering custom `dash-list`
  styles in nested lists.
- Consider serving the Inter & Spectral fonts locally via `@fontsource`
  instead of Google Fonts CDN (the reference uses Google Fonts).
