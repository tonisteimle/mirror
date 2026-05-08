# Plan — Mirror → React+TS+Tailwind

## Components to create (one .tsx per `.com` definition)

### Layout-Wrapper

- `Container.tsx` — w-full max-w-[1280px] mx-auto
- `Section.tsx` — px-6 py-24 w-full
- `SectionWide.tsx` — px-6 py-28 w-full
- `SectionTight.tsx` — pt-8 px-6 pb-6 w-full
- `TwoColumn.tsx` — flex flex-row gap-16 items-start
- `ProseColumn.tsx` — w-[280px]
- `ProseBody.tsx` — flex-grow max-w-[768px] gap-[18px] + `prose` class
- `YellowBand.tsx` — bg-yellow w-full padded
- `HeroVessel.tsx` — bg-yellow w-hug max-w-[820px]
- `SoftBox.tsx` — bg-soft padded

### Typografie

- `H1.tsx` (text-[96px] font-bold tracking-[-0.025em] leading-[0.95])
- `H2.tsx` (text-[44px] font-bold tracking-[-0.02em] leading-[1.05])
- `H3.tsx` (text-[28px] font-bold tracking-[-0.015em] leading-[1.2])
- `H4.tsx` (text-[19px] font-bold)
- `Eyebrow.tsx`, `HeroSub.tsx`, `BodyTxt.tsx`, `BodyTxtCompact.tsx`, `BodyTxtMuted.tsx`
- `Quote.tsx`, `MetaLabel.tsx`, `MetaValue.tsx`
- `LogoTextSmall.tsx`, `LogoTextBold.tsx`, `Domain.tsx`
- `PersonaName.tsx`, `PersonaNumeral.tsx`
- `TocNum.tsx`, `TocName.tsx`, `TocTag.tsx`
- `OffeneNum.tsx`
- `FooterHeading.tsx`, `FooterText.tsx`, `FooterBase.tsx`

### Logo

- `LogoBar.tsx`, `LogoBarLight.tsx`
- `LogoMarkN.tsx`, `LogoMarkW.tsx`
- `LogoMarkNLight.tsx`, `LogoMarkWLight.tsx`
- `Logo.tsx`, `LogoLight.tsx` (composed)

### Listen

- `DashList.tsx`, `DashMarker.tsx`, `DashItem.tsx`
- `DotMarker.tsx`, `DotItem.tsx`
- `NestedList.tsx`
- `DashGroup.tsx`, `DashGroupBody.tsx`
- `OffeneList.tsx`, `OffenePunkt.tsx`

### Hero / Topbar / TOC

- `Topbar.tsx` (pad 32 24 24 24, hor, ver-center, w full)
- `Hero.tsx` (pad 96 24, w full, gap 80)
- `HeroBar.tsx` (w 1140, h 14, bg yellow)
- `MetaList.tsx`, `MetaPair.tsx`
- `TocList.tsx`, `TocRow.tsx`

### Persona-Block

- `PersonaBlock.tsx`
- `PersonaHeaderBand.tsx`, `PersonaHeaderRow.tsx`, `PersonaTitleStack.tsx`
- `PersonaSteckbrief.tsx`
- `PersonaBody.tsx`, `WarumBlock.tsx`
- `DimGrid.tsx` (grid 4), `DimGridTwo.tsx` (grid 2), `Dim.tsx`
- `InnereStimmeRow.tsx`, `InnereStimmeMeta.tsx`, `InnereStimmeQuotes.tsx`
- `ImplikationenBlock.tsx`

### Footer

- `FooterFrame.tsx`
- `FooterGrid.tsx`, `FooterColMain.tsx`, `FooterColMeta.tsx`
- `FooterStatusList.tsx`, `FooterBaseRow.tsx`

## Page structure: `Personas.tsx`

```
<div className="min-h-screen">
  <Topbar><Logo/></Topbar>
  <Hero>
    <Eyebrow text="Internes Arbeitsdokument" />
    <HeroVessel>
      <H1 text="Personas" />
      <HeroSub text="..." />
      <MetaList>
        <MetaPair>...</MetaPair> x4
      </MetaList>
      <Domain text="..." />
    </HeroVessel>
    <HeroBar />
  </Hero>

  <Section><Container><H2/><TocList>...5 rows</TocList></Container></Section>

  <SectionWide><Container><TwoColumn>
    <ProseColumn><H2 text="Übergreifende Beobachtungen"/></ProseColumn>
    <ProseBody>
      <ul>... 4 items, with nested ul on first ...</ul>
    </ProseBody>
  </TwoColumn></Container></SectionWide>

  <SectionWide><Container><TwoColumn>
    <ProseColumn><H2/></ProseColumn>
    <ProseBody><p/><ul/><p/></ProseBody>
  </TwoColumn></Container></SectionWide>

  // Persona blocks x5 (Lukas, Sara, Marco, Nadia, Tim)
  <PersonaBlock id="lukas">
    <PersonaHeaderBand>
      <Container><PersonaHeaderRow>
        <PersonaNumeral text="01" />
        <PersonaTitleStack><PersonaName text="..."/></PersonaTitleStack>
      </PersonaHeaderRow></Container>
      <Container><PersonaSteckbrief text="..."/></Container>
    </PersonaHeaderBand>
    <Container><PersonaBody>
      <WarumBlock><H3 text="Warum diese Persona?"/><p>...</p></WarumBlock>
      <DimGrid>
        <Dim><H4 text="Situation"/><BodyTxt/></Dim>
        ... x4
      </DimGrid>
      <SoftBox><Container><InnereStimmeRow>
        <InnereStimmeMeta><H3/><BodyTxt/></InnereStimmeMeta>
        <InnereStimmeQuotes><BodyTxtMuted text="(O-Ton…)"/></InnereStimmeQuotes>
      </InnereStimmeRow></Container></SoftBox>
      <ImplikationenBlock><H3/><DimGridTwo>
        <Dim><H4/>BodyTxtMuted</Dim> x2
      </DimGridTwo></ImplikationenBlock>
    </PersonaBody></Container>
  </PersonaBlock>

  <SectionWide><Container><TwoColumn>
    <ProseColumn><H2 text="Offene Punkte / nächste Schritte"/></ProseColumn>
    <OffeneList>
      <ol> ... 6 items </ol>
    </OffeneList>
  </TwoColumn></Container></SectionWide>

  <FooterFrame><Container>
    <LogoLight/>
    <FooterGrid>
      <FooterColMain><FooterHeading/><FooterText/></FooterColMain>
      <FooterColMeta><FooterHeading/><FooterStatusList>...</FooterStatusList></FooterColMeta>
    </FooterGrid>
    <FooterBaseRow><FooterBase x2/></FooterBaseRow>
  </Container></FooterFrame>
</div>
```

## Tailwind config additions

```ts
theme.extend = {
  colors: {
    ink: '#000',
    yellow: '#FDE70E',
    soft: '#F4F4F4',
    muted: '#888',
  },
  borderColor: {
    hairline: '#e5e5e5',
  },
  maxWidth: {
    content: '1280px',
  },
  fontFamily: {
    sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
    serif: ['Spectral', 'serif'],
  },
}
```

Plus `@tailwindcss/typography` plugin for `prose` class.

## Special handling

- **Inline markdown** (`**bold**`, `*italic*`): `inlineMd()` helper produces escaped HTML, used in `dangerouslySetInnerHTML`.
- **List blocks** in `app.mir`: `- text` lines under `ProseBody` → real `<ul><li>` JSX with `prose` styling. Nested `-` lines → nested `<ul>`.
- **Numbered list** in `OffeneList`: `1. ... 2. ...` → `<ol>` JSX with custom counter styling.
- **Paragraph runs** in `WarumBlock`: heading then plain prose text, render as `<h3>` then `<p>`.
- **Logo**: composed component with bar between `n` and `w` marks (bar is CSS, not text).
- **Italic in titles**: `*der überzeugte Tüftler*` → inline-md to `<em>`. Visual reference shows em is rendered as font-weight 300 not italic, so we need a global `prose em` / `h2 em` style override (in index.css or in component).
- **canvas desktop**: implies viewport baseline; we use Tailwind base + `font-light` body default.
- Each Mirror text component: prefer `text` prop. If used as container in app.mir (e.g., `H3` with both text and nested children for body slot), accept both `text` and `children`.

## Component generation strategy

For each `Foo as Text` definition: a thin functional component that renders `<span>`(or block element) with the baked classes; takes `text?: string | undefined`, `children?: ReactNode`, optional `className`/`style` for one-off overrides — but per rules **no inline styles**.

For each `Foo as Frame` definition: a `<div>` with classes; takes `children`.

For multi-slot definitions like `Logo:` / `DashItem:` / `OffenePunkt:` / `Topbar:` / `Hero:` / `FooterFrame:` (no `as`): render the indented body verbatim, plus `children` for the additional content placed under it in `app.mir`.

## Gates

- Step 2: `npx tsc --noEmit` passes.
- Step 4: every component has at least one usage in Personas.tsx; tsc passes.
- Step 5: `npm run build` exit 0.
- Step 6: `DISCREPANCIES.md` written.
