// =====================================================
// HELIX CRM · COMPONENTS
// Atomic-up Aufbau:
//   1) Atoms: Pill, Avatar, Btn, IconBtn, Chip, Kbd, Bar, FileExt, Dot, Lbl, Hlp
//   2) Molecules: Card (+ Head/Body), PropRow, NavItem, TabItem, Seg, Stat
// =====================================================

use tokens

// =====================================================
//  A T O M S
// =====================================================

// -----------------------------------------------------
// PILL — Status-Badge (rund, klein, farbig)
// -----------------------------------------------------
Pill: hor, gap 4, ver-center, h 20, pad 0 8, fs 11, weight 500, rad 999, bor 1, boc $line, bg $gray-soft, col $gray-ink

PillBlue   as Pill: bg $brand-soft,  col $brand-soft-ink, boc $brand-ring
PillGreen  as Pill: bg $ok-soft,     col $ok-ink,         boc $ok-ring
PillAmber  as Pill: bg $warn-soft,   col $warn-ink,       boc $warn-ring
PillRed    as Pill: bg $bad-soft,    col $bad-ink,        boc $bad-ring
PillViolet as Pill: bg $violet-soft, col $violet-ink,     boc $violet-ring
PillTeal   as Pill: bg $teal-soft,   col $teal-ink,       boc $teal-ring
PillGray   as Pill: bg $gray-soft,   col $gray-ink,       boc $gray-ring

// -----------------------------------------------------
// AVATAR — runder farbiger Kreis mit Initialen
// -----------------------------------------------------
Avatar:   rad 999, center, col white, weight 600, bg $brand
AvatarXs as Avatar: w 18, h 18, fs 9
AvatarSm as Avatar: w 22, h 22, fs 10
AvatarMd as Avatar: w 28, h 28, fs 11
AvatarLg as Avatar: w 56, h 56, fs 18, rad 12

// -----------------------------------------------------
// BUTTONS
// -----------------------------------------------------
Btn: hor, gap 6, ver-center, h 32, pad 0 12, rad 6, fs 13, weight 500, bor 1, boc transparent, cursor pointer

BtnPrimary as Btn: bg $brand, col white
  hover 0.12s:
    bg $brand-deep

BtnSecondary as Btn: bg white, col $ink, boc $line
  hover 0.12s:
    bg $hover

BtnGhost as Btn: bg transparent, col $ink-soft
  hover 0.12s:
    bg $muted
    col $ink

BtnDangerGhost as Btn: bg transparent, col $bad
  hover 0.12s:
    bg $bad-soft

// Small variant — Höhe + Padding + Font reduziert
BtnSm  as Btn: h 26, pad 0 8, fs 12

// -----------------------------------------------------
// ICON BUTTON — quadratisch, nur Icon
// -----------------------------------------------------
IconBtn: w 32, h 32, center, rad 6, col $ink-soft, cursor pointer
  hover 0.12s:
    bg $muted
    col $ink

IconBtnSm as IconBtn: w 26, h 26

// -----------------------------------------------------
// CHIP — interaktiver Tag
// -----------------------------------------------------
Chip: hor, gap 4, ver-center, h 22, pad 0 8, fs 11, bg $gray-soft, col $gray-ink, bor 1, boc $gray-ring, rad 6, cursor pointer

ChipBlue   as Chip: bg $brand-soft,  col $brand-soft-ink, boc $brand-ring
ChipTeal   as Chip: bg $teal-soft,   col $teal-ink,       boc $teal-ring
ChipAmber  as Chip: bg $warn-soft,   col $warn-ink,       boc $warn-ring
ChipViolet as Chip: bg $violet-soft, col $violet-ink,     boc $violet-ring

// -----------------------------------------------------
// KBD — Keyboard-Hint (⌘ K)
// -----------------------------------------------------
Kbd: hor, ver-center, fs 10, pad 1 5, bor 1, boc $line, rad 4, bg white, col $ink-soft, font mono

// -----------------------------------------------------
// FILE EXTENSION BADGE — farbiges Quadrat (PDF/XLS/DOC)
// -----------------------------------------------------
FileExt: w 28, h 28, center, rad 4, fs 9, weight 700, col white, uppercase

// -----------------------------------------------------
// PROGRESS BAR — Track + Fill
// -----------------------------------------------------
Bar: h 6, bg $muted, rad 999, clip
  Fill: h 6, bg $brand, rad 999

// -----------------------------------------------------
// DOT — Status-Punkt 6×6
// -----------------------------------------------------
Dot: w 6, h 6, rad 999, bg $ink-faint

// -----------------------------------------------------
// INPUTS — gestylte Variante für Text + Textarea
// -----------------------------------------------------
Inp as Input: w full, h 32, pad 0 10, fs 13, bg white, bor 1, boc $line, rad 6, col $ink
  focus:
    boc $brand

Txa as Textarea: w full, pad 8 10, fs 13, bg white, bor 1, boc $line, rad 6, col $ink, line 1.5
  focus:
    boc $brand

// FAKE-SELECT — Frame mit Chevron, Inputs als Text rendern
FakeSelect: hor, ver-center, w full, h 32, bor 1, boc $line, rad 6, bg white, pad 0 0 0 10, gap 0

// -----------------------------------------------------
// FIELD-LABEL — kleine Beschriftung über Inputs
// -----------------------------------------------------
Lbl: hor, gap 6, ver-center, fs 11, weight 500, col $ink-muted, mar 0 0 6 0

// -----------------------------------------------------
// HELP-TEXT — Erklärung unter Inputs
// -----------------------------------------------------
Hlp: fs 11, col $ink-muted, mar 4 0 0 0

// -----------------------------------------------------
// REQUIRED-INDICATOR
// -----------------------------------------------------
Req: col $bad

// -----------------------------------------------------
// SECTION-DIVIDER
// -----------------------------------------------------
SoftDivider: w full, h 1, bg $line-soft

// =====================================================
//  M O L E C U L E S
// =====================================================

// -----------------------------------------------------
// CARD — weiße Box mit Header- und Body-Slot
// -----------------------------------------------------
Card: ver, bg white, bor 1, boc $line, rad 10
  Head: hor, gap 10, ver-center, h 44, pad 0 14, bor 0 0 1 0, boc $line-soft
  Body: pad 16, ver, gap 12

// CardTitle — h3 styling für die Card-Heads
CardTitle: fs 13, weight 600, col $ink

// -----------------------------------------------------
// PROP ROW — Property-Zeile (Label 180px | Value flex)
// -----------------------------------------------------
PropRow: hor, gap 12, ver-center, pad 4 0
  PropLbl: hor, gap 8, ver-center, w 180, fs 12, weight 500, col $ink-muted
  PropVal: fs 13, col $ink, grow

// -----------------------------------------------------
// NAV ITEM — Sidebar-Eintrag
// -----------------------------------------------------
NavItem: hor, gap 10, ver-center, h 30, pad 0 10, mar 0 6, rad 6, col $ink-soft, fs 13, cursor pointer
  hover 0.12s:
    bg $muted

NavItemActive as NavItem: bg $brand-soft, col $brand-soft-ink, weight 500

NavGroupTitle: pad 10 12 4 12, fs 11, weight 600, col $ink-faint, uppercase

// -----------------------------------------------------
// TAB ITEM — Tab mit Underline
// -----------------------------------------------------
TabItem: hor, gap 6, ver-center, h 36, pad 0 4, mar 0 12 0 0, bor 0 0 2 0, boc transparent, col $ink-muted, fs 13, weight 500, cursor pointer

TabItemActive as TabItem: col $ink, boc $brand

TabCount: pad 1 6, fs 11, weight 500, col $ink-muted, bg $muted, rad 999

TabCountActive as TabCount: col $brand-soft-ink, bg $brand-ring

// -----------------------------------------------------
// SEGMENT CONTROL
// -----------------------------------------------------
Seg: hor, bg $muted, rad 6, pad 2

SegBtn: h 24, pad 0 10, fs 12, col $ink-soft, rad 4, weight 500, ver-center, hor, cursor pointer

SegBtnActive as SegBtn: bg white, col $ink, shadow sm

// -----------------------------------------------------
// STAT BOX — Mini-Kennzahl-Kasten
// -----------------------------------------------------
StatBox: ver, gap 2, bor 1, boc $line, rad 8, pad 12

// -----------------------------------------------------
// COMPLIANCE BOX — wie StatBox, mit Status-Icon oben
// -----------------------------------------------------
ComplianceBox: ver, gap 2, bor 1, boc $line, rad 8, pad 12

// -----------------------------------------------------
// FILE ROW — Zeile in der Files-Liste (rechte Rail)
// -----------------------------------------------------
FileRow: hor, gap 10, ver-center, pad 6 8, rad 6, cursor pointer
  hover 0.12s:
    bg $hover

// -----------------------------------------------------
// TIMELINE ITEM — Aktivitäts-Eintrag
// -----------------------------------------------------
TimelineItem: hor, gap 10, pad 0 0 12 0
  TLIcon: w 26, h 26, rad 999, center, bg white, bor 1, boc $line, col $ink-soft

// -----------------------------------------------------
// DEAL CARD — kleine Pipeline-Karte
// -----------------------------------------------------
DealCard: ver, gap 6, bor 1, boc $line, rad 6, pad 12
  hover 0.12s:
    boc $line-strong

// -----------------------------------------------------
// AI SUGGESTION CARD
// -----------------------------------------------------
AICard: ver, gap 4, bor 1, boc $line, rad 6, pad 12
  hover 0.12s:
    boc $line-strong
