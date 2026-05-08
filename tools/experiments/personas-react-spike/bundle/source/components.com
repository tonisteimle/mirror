// Personas-Dokument — Komponenten
// Layout-Wrapper, Typografie, Logo, Listen, Persona-Block, Footer

// ============================================
// Layout-Wrapper
// ============================================

Container as Frame: w full, maxw 1280, mar 0 auto

Section as Frame: pad 96 24 96 24, w full
SectionWide as Frame: pad 112 24 112 24, w full
SectionTight as Frame: pad 32 24 24 24, w full

TwoColumn as Frame: hor, gap 64, align top
ProseColumn as Frame: w 280
ProseBody as Frame: grow, maxw 768, gap 18, prose

YellowBand as Frame: bg $yellow, pad 72 24 64 24, w full
HeroVessel as Frame: bg $yellow, pad 56 56 40 56, w hug, maxw 820
SoftBox as Frame: bg $soft, pad 22 24, w full

// ============================================
// Typografie
// ============================================

H1 as Text: fs 96, weight bold, ls -0.025, line 0.95
H2 as Text: fs 44, weight bold, ls -0.02, line 1.05
H3 as Text: fs 28, weight bold, ls -0.015, line 1.2
H4 as Text: fs 19, weight bold

Eyebrow as Text: fs 13, weight 400
HeroSub as Text: fs 22, weight 300, line 1.45, maxw 60ch
BodyTxt as Text: fs 17, weight 300, line 1.65
BodyTxtCompact as Text: fs 17, weight 300, line 1.6
BodyTxtMuted as Text: fs 17, weight 300, line 1.6, italic, col $muted

Quote as Text: fs 22, italic, line 1.45, maxw 60ch

MetaLabel as Text: fs 12, weight bold
MetaValue as Text: fs 13, weight 400
LogoTextSmall as Text: fs 11, weight 400
LogoTextBold as Text: fs 11, weight bold
Domain as Text: fs 12, weight bold

PersonaName as Text: fs 44, weight bold, ls -0.02, line 1.05
PersonaNumeral as Text: fs 200, weight bold, ls -0.04, line 0.82

TocNum as Text: fs 22, weight 300
TocName as Text: fs 34, weight bold, ls -0.01
TocTag as Text: fs 17, weight 300, line 1.35

OffeneNum as Text: fs 14, weight 300, w 32

FooterHeading as Text: fs 14, weight bold, col $white
FooterText as Text: fs 14, weight 300, line 1.55, col $white
FooterBase as Text: fs 12, col $white

// ============================================
// Logo (n|w-Mark)
// ============================================

LogoBar as Frame: w 2, h 24, bg $ink, mar 0 4 0 4
LogoBarLight as Frame: w 2, h 24, bg $white, mar 0 4 0 4

LogoMarkN as Text: fs 28, weight bold, line 1
LogoMarkW as Text: fs 30, weight bold, italic, font serif, line 1

LogoMarkNLight as Text: fs 28, weight bold, line 1, col $white
LogoMarkWLight as Text: fs 30, weight bold, italic, font serif, line 1, col $white

Logo: hor, gap 14, ver-center
  Frame hor, ver-center
    LogoMarkN "n"
    LogoBar
    LogoMarkW "w"
  Frame gap 2
    LogoTextSmall "Fachhochschule Nordwestschweiz"
    LogoTextBold "Hochschule für Informatik"

LogoLight: hor, gap 14, ver-center
  Frame hor, ver-center
    LogoMarkNLight "n"
    LogoBarLight
    LogoMarkWLight "w"
  Frame gap 2
    LogoTextSmall "Fachhochschule Nordwestschweiz", col $white
    LogoTextBold "Hochschule für Informatik", col $white

// ============================================
// Listen (Bullets / Marker)
// ============================================

DashList as Frame: gap 8

DashMarker as Text: w 12, weight 400
DashItem: hor, gap 24
  DashMarker "—"

DotMarker as Text: w 12, fs 22, line 1
DotItem: hor, gap 16
  DotMarker "·"

NestedList as Frame: mar-l 24, gap 8

DashGroup as Frame: hor, gap 24
DashGroupBody as Frame: grow, gap 8

OffeneList as Frame: gap 22, prose
OffenePunkt as Frame: hor, gap 24

// ============================================
// Hero / Topbar / TOC
// ============================================

Topbar: pad 32 24 24 24, hor, ver-center, w full

Hero: pad 96 24 96 24, w full, gap 80
HeroBar as Frame: w 1140, h 14, bg $yellow

MetaList as Frame: hor, wrap, gap 10 32, mar-t 14
MetaPair as Frame: gap 2

TocList as Frame: gap 0
TocRow as Frame: hor, ver-center, gap 56, pad 16 8

// ============================================
// Persona-Block
// ============================================

PersonaBlock as Frame: w full, pad 0 24 80 24

PersonaHeaderBand as Frame: bg $yellow, pad 72 24 64 24, w full, mar 0 0 80 0
PersonaHeaderRow as Frame: hor, gap 56, align bottom
PersonaTitleStack as Frame: grow, gap 6
PersonaSteckbrief as Text: fs 17, weight 300, line 1.6, maxw 80ch

PersonaBody as Frame: gap 64
WarumBlock as Frame: maxw 920, gap 16, prose

DimGrid as Frame: grid 4, gap 32 64
DimGridTwo as Frame: grid 2, gap 32 64
Dim as Frame: gap 16

InnereStimmeRow as Frame: hor, gap 64, align top
InnereStimmeMeta as Frame: w 280, gap 12
InnereStimmeQuotes as Frame: grow, gap 14

ImplikationenBlock as Frame: gap 32, mar-t 40

// ============================================
// Footer
// ============================================

FooterFrame: bg $ink, pad 88 24 40 24, w full

FooterGrid as Frame: grid 3, gap 32
FooterColMain as Frame: gap 14, w 6
FooterColMeta as Frame: gap 14, w 3
FooterStatusList as Frame: gap 6
FooterBaseRow as Frame: hor, wrap, gap 12 24, mar-t 40
