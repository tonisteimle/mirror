// Personas-Dokument — Komponenten
// Layout-Wrapper, Typografie, Logo, Listen, Persona-Block, Footer

// ============================================
// Layout-Wrapper
// ============================================

Container as Frame: w full, maxw $content, mar 0 auto

Section as Frame: pad 96 24 96 24, w full
SectionWide as Frame: pad 112 24 112 24, w full
SectionTight as Frame: pad 32 24 24 24, w full

TwoColumn as Frame: hor, gap $gap-3xl, align top
ProseColumn as Frame: w 280
ProseBody as Frame: grow, maxw 768, gap 18, prose

YellowBand as Frame: bg $yellow, pad 72 24 64 24, w full
HeroVessel as Frame: bg $yellow, pad 56 56 40 56, w hug, maxw 820
SoftBox as Frame: bg $soft, pad 22 24, w full

// ============================================
// Typografie  — alle Werte aus tokens.tok
// ============================================

H1 as Text: fs $display, weight $weight-bold, ls $tracking-tighter, line $solid
H2 as Text: fs $display-sm, weight $weight-bold, ls $tracking-tight, line $snug
H3 as Text: fs $title-sm, weight $weight-bold, ls $tracking, line $heading
H4 as Text: fs $body-lg, weight $weight-bold

Eyebrow as Text: fs $caption, weight $weight-regular
HeroSub as Text: fs $lead, weight $weight-light, line $quote, maxw 60ch
BodyTxt as Text: fs $body, weight $weight-light, line $relaxed
BodyTxtCompact as Text: fs $body, weight $weight-light, line $body
BodyTxtMuted as Text: fs $body, weight $weight-light, line $body, italic, col $muted

Quote as Text: fs $lead, italic, line $quote, maxw 60ch

MetaLabel as Text: fs $caption-sm, weight $weight-bold
MetaValue as Text: fs $caption, weight $weight-regular
LogoTextSmall as Text: fs $caption-xs, weight $weight-regular
LogoTextBold as Text: fs $caption-xs, weight $weight-bold
Domain as Text: fs $caption-sm, weight $weight-bold

PersonaName as Text: fs $display-sm, weight $weight-bold, ls $tracking-tight, line $snug
PersonaTag as Text: fs $display-sm, weight $weight-light, ls $tracking-tight, line $snug
PersonaNumeral as Text: fs $display-xl, weight $weight-bold, ls $tracking-tightest, line $flush

TocNum as Text: fs $lead, weight $weight-light, w 80
TocName as Text: fs $title-lg, weight $weight-bold, ls $tracking-loose, grow
TocTag as Text: fs $body, weight $weight-light, line 1.35, w 320

OffeneNum as Text: fs $small, weight $weight-light, w 32

FooterHeading as Text: fs $small, weight $weight-bold, col $white
FooterText as Text: fs $small, weight $weight-light, line 1.55, col $white
FooterBase as Text: fs $caption-sm, col $white

// ============================================
// Logo (n|w-Mark)
// ============================================

LogoBar as Frame: w 2, h 24, bg $ink, mar 0 4 0 4
LogoBarLight as Frame: w 2, h 24, bg $white, mar 0 4 0 4

LogoMarkN as Text: fs $title-sm, weight $weight-bold, line $tight
LogoMarkW as Text: fs 30, weight $weight-bold, italic, font serif, line $tight

LogoMarkNLight as Text: fs $title-sm, weight $weight-bold, line $tight, col $white
LogoMarkWLight as Text: fs 30, weight $weight-bold, italic, font serif, line $tight, col $white

LogoMarkRow as Frame: hor, ver-center
LogoTextStack as Frame: gap 2

Logo: hor, gap $gap-sm, ver-center
  LogoMarkRow
    LogoMarkN "n"
    LogoBar
    LogoMarkW "w"
  LogoTextStack
    LogoTextSmall "Fachhochschule Nordwestschweiz"
    LogoTextBold "Hochschule für Informatik"

LogoLight: hor, gap $gap-sm, ver-center
  LogoMarkRow
    LogoMarkNLight "n"
    LogoBarLight
    LogoMarkWLight "w"
  LogoTextStack
    LogoTextSmall "Fachhochschule Nordwestschweiz", col $white
    LogoTextBold "Hochschule für Informatik", col $white

// ============================================
// Listen (Bullets / Marker)
// ============================================

DashList as Frame: gap $gap-xs

DashMarker as Text: w 12, weight $weight-regular
DashItem: hor, gap $gap-lg
  DashMarker "—"

DotMarker as Text: w 12, fs $lead, line $tight
DotItem: hor, gap $gap-md
  DotMarker "·"

NestedList as Frame: mar-l 24, gap $gap-xs

DashGroup as Frame: hor, gap $gap-lg
DashGroupBody as Frame: grow, gap $gap-xs

OffeneList as Frame: gap 22, prose
OffenePunkt as Frame: hor, gap $gap-lg

// ============================================
// Hero / Topbar / TOC
// ============================================

Topbar: pad 32 24 24 24, hor, ver-center, w full

Hero: pad 96 24 96 24, w full, gap 80
HeroBar as Frame: w 1140, h 14, bg $yellow

MetaList as Frame: hor, wrap, gap 10 32, mar-t 14
MetaPair as Frame: gap 2

TocList as Frame: gap 0
TocRow as Frame: hor, ver-center, gap $gap-2xl, pad 16 8

// ============================================
// Persona-Block
// ============================================

PersonaBlock as Frame: w full, pad 0 24 80 24

PersonaHeaderBand as Frame: bg $yellow, pad 72 24 64 24, w full, mar 0 0 80 0
PersonaHeaderRow as Frame: hor, gap $gap-2xl, align bottom
PersonaTitleStack as Frame: grow, hor, ver-baseline, gap 12, wrap
PersonaSteckbrief as Text: fs $body, weight $weight-light, line $body, maxw 80ch

PersonaBody as Frame: gap $gap-3xl
WarumBlock as Frame: maxw 920, gap $gap-md, prose

DimGrid as Frame: grid 4, gap 32 64
DimGridTwo as Frame: grid 2, gap 32 64
Dim as Frame: gap $gap-md, prose

InnereStimmeRow as Frame: hor, gap $gap-3xl, align top
InnereStimmeMeta as Frame: w 280, gap 12
InnereStimmeQuotes as Frame: grow, gap $gap-sm

ImplikationenBlock as Frame: gap $gap-xl, mar-t 40
ImplikationenTitle as Text: fs $title, weight $weight-bold, mar-b 12

// ============================================
// Footer
// ============================================

FooterFrame: bg $ink, pad 88 24 40 24, w full

FooterGrid as Frame: grid 3, gap $gap-xl
FooterColMain as Frame: gap $gap-sm, w 6
FooterColMeta as Frame: gap $gap-sm, w 3
FooterStatusList as Frame: gap 6
FooterBaseRow as Frame: hor, wrap, gap 12 24, mar-t 40
