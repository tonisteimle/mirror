# Property Panel Specification

> Figma-inspiriertes Property Panel für Mirror Studio
> Validiert gegen Figma Screenshots vom 14.02.2026

## Design Principles

1. **Kompaktheit** - Maximale Information auf minimalem Raum
2. **Visuelle Kontrollen** - Icons statt Text wo möglich
3. **Gruppierung** - Zusammengehöriges visuell verbunden
4. **Konsistenz** - Gleiche Patterns für gleiche Funktionen

---

## Design Tokens

```
COLORS:
  bg-panel:       #1E1E1E    // Panel Hintergrund
  bg-input:       #2C2C2C    // Input Hintergrund
  bg-segment:     #2C2C2C    // Segmented Control Container (gleich wie input)
  bg-active:      #3B82F6    // Aktiver Button (blau)
  bg-button-active: #4A4A4A  // Aktiver Button in Segment (heller grau)
  bg-hover:       #383838    // Hover State

  text-primary:   #FFFFFF    // Section Headers, aktive Werte
  text-secondary: #888888    // Labels, inaktive Icons
  text-value:     #CCCCCC    // Werte in Inputs
  text-token:     #F59E0B    // Token-Referenzen ($name)

  border:         #3A3A3A    // Subtle borders (kaum sichtbar)
  accent:         #3B82F6    // Accent color (blau)

SPACING:
  panel-pad:      16px       // Panel außen
  section-gap:    16px       // Zwischen Sections (mit Divider)
  row-gap:        12px       // Zwischen Rows in Section
  input-gap:      8px        // Zwischen Inputs in Row
  inner-gap:      4px        // Innerhalb Segmented Control

SIZING:
  input-height:   32px       // Standard Input Höhe
  button-size:    32px       // Icon Button in Segment
  icon-size:      16px       // Icon Größe
  swatch-size:    24px       // Color Swatch
  grid-size:      54px       // Alignment Grid (3x3)
  dot-size:       6px        // Dot im Grid

  radius-sm:      4px        // Buttons, kleine Elemente
  radius-md:      6px        // Inputs
  radius-lg:      8px        // Containers, Segments

TYPOGRAPHY:
  section-header: 14px / 600 / normal-case  // "Auto layout"
  label:          11px / 400 / normal-case  // "Alignment", "Gap"
  input-value:    12px / 400                // Werte
  input-label:    11px / 400 / gray         // "W", "X" im Input
```

---

## Exakte UI-Elemente aus Figma

### POSITION SECTION

```
Position                              ← 14px semibold white

Alignment                             ← 11px gray label
┌─────────────────┐  ┌─┐ ┌─┐ ┌─┐
│ [⫢] [⫠] [⫣] │  │⊥│ │⊤│ │⫡│     ← Gruppe 1 MIT Container
└─────────────────┘  └─┘ └─┘ └─┘       Gruppe 2 OHNE Container

Position                              ← 11px gray label
┌─────────────┐ ┌─────────────┐
│ X   -734    │ │ Y   -1228   │       ← Label + Value im Input
└─────────────┘ └─────────────┘

Rotation                              ← 11px gray label
┌─────────────┐ ┌─┐ ┌─┐ ┌─┐
│ ↻   0°      │ │◇│ │⫘│ │⫙│          ← Input + 3 standalone Icons
└─────────────┘ └─┘ └─┘ └─┘
```

### AUTO LAYOUT SECTION

```
Auto layout                    [≡°]   ← Header + Toggle (blau wenn aktiv)

Flow                                  ← 11px gray label
┌─────────────────────────────────┐
│ [⊞] [↓↓] [→→] [⊞⊞]            │   ← 4 Buttons in EINEM Container
└─────────────────────────────────┘     Aktiver hat helleren bg

Resizing                              ← 11px gray label
┌──────────────┐ ┌────────────────┐ ┌─┐
│ W  726     ▼ │ │ H  591   Hug  │ │⊡│ ← "Hug" = Constraint text
└──────────────┘ └────────────────┘ └─┘

Alignment           Gap               ← Zwei Labels nebeneinander
┌─────────┐  ┌─────────────────┐ ┌─┐
│ ●  ·  · │  │ ≡   10        ▼ │ │⫿│  ← Grid + Gap-Input + Icon
│ ·  ·  · │  └─────────────────┘ └─┘
│ ·  ·  · │
└─────────┘

Padding                               ← 11px gray label
┌─────────────┐ ┌─────────────┐ ┌─┐
│ ⫢   10      │ │ ≡   10      │ │⊡│   ← H-pad + V-pad + Toggle
└─────────────┘ └─────────────┘ └─┘

☐ Clip content                        ← Rounded Checkbox + Label
```

### APPEARANCE SECTION

```
Appearance                   [◉] [◐]  ← Header + 2 Icon-Buttons

Opacity              Corner radius    ← Zwei Labels
┌─────────────┐ ┌─────────────┐ ┌─┐
│ ⊞   100%    │ │ ⌐   0       │ │⊡│   ← Icon + Value + Toggle
└─────────────┘ └─────────────┘ └─┘
```

### FILL SECTION

```
Fill                          [⊞] [+] ← Header + Grid + Add

┌──┐ ┌────────────┐ ┌────┬──┐ ┌─┐┌─┐
│██│ │  FFFFFF    │ │100 │ %│ │◉││−│  ← Swatch + Hex + Opacity + Eye + Remove
└──┘ └────────────┘ └────┴──┘ └─┘└─┘
       ↑ KEIN #!      ↑ Getrennt!
```

### STROKE SECTION

```
Stroke                        [⊞] [+]

┌──┐ ┌────────────┐ ┌────┬──┐ ┌─┐┌─┐
│██│ │  000000    │ │100 │ %│ │◉││−│
└──┘ └────────────┘ └────┴──┘ └─┘└─┘

Position           Weight             ← Zwei Labels
┌──────────────┐ ┌─────────────┐ ┌─┐┌─┐
│ Inside     ▼ │ │ ≡   1       │ │⫿││⊡│
└──────────────┘ └─────────────┘ └─┘└─┘
```

---

## Component Spezifikationen

### 1. SectionHeader

```tsx
interface SectionHeaderProps {
  title: string              // "Auto layout" (normal case!)
  actions?: ReactNode        // Icon buttons rechts
}
```

**Styling:**
- Font: 14px, semibold, white
- Padding: 0 (sitzt direkt im Section-Container)
- Actions: flex, gap 8px, align right

---

### 2. SegmentedControl

```tsx
interface SegmentedControlProps {
  options: {
    icon: ReactNode
    value: string
    title: string
  }[]
  value: string
  onChange: (value: string) => void
}
```

**Styling:**
- Container: bg-segment (#2C2C2C), radius-lg (8px), padding 3px
- Buttons: 32x28px, radius-sm (4px), gap 2px
- Active Button: bg #4A4A4A (heller), icon white
- Inactive Button: bg transparent, icon gray

---

### 3. IconInput

```tsx
interface IconInputProps {
  icon?: ReactNode           // Icon links im Input
  label?: string             // "W", "X", "Y" (statt Icon)
  value: string
  onChange: (value: string) => void
  suffix?: string            // "%", "°"
  suffixText?: string        // "Hug" (für Constraints)
  dropdown?: boolean         // Chevron anzeigen
  width?: number | 'auto'
}
```

**Styling:**
- Height: 32px
- Background: #2C2C2C
- Radius: 6px
- Padding: 8px 10px
- Icon/Label: gray (#888), 11px
- Value: white/light, 12px
- Suffix: gray, 11px
- Gap zwischen Icon und Value: 6px

---

### 4. AlignmentGrid

```tsx
interface AlignmentGridProps {
  value: { h: 'l' | 'cen' | 'r', v: 't' | 'cen' | 'b' } | 'cen'
  onChange: (value) => void
}
```

**Styling:**
- Container: 54x54px, bg #2C2C2C, radius 6px, padding 9px
- Grid: 3x3, gap 6px
- Dots: 6x6px, radius 1px
- Inactive dot: #555
- Active dot: white, 8x8px

**Mirror Mapping:**
```
[0,0] = hor-l + ver-t    [1,0] = hor-cen + ver-t    [2,0] = hor-r + ver-t
[0,1] = hor-l + ver-cen  [1,1] = cen                [2,1] = hor-r + ver-cen
[0,2] = hor-l + ver-b    [1,2] = hor-cen + ver-b    [2,2] = hor-r + ver-b
```

---

### 5. ColorSwatch (Fill/Stroke Row)

```tsx
interface ColorSwatchProps {
  color: string              // Hex ohne # oder $token
  opacity?: number           // 0-100
  onChange: (color: string) => void
  onOpacityChange?: (opacity: number) => void
  tokens?: { name: string, value: string }[]
  onToggleVisibility?: () => void
  onRemove?: () => void
}
```

**Layout:**
```
[Swatch 24x24] [Hex Input flex-1] [Opacity 48px][%] [Eye 24x24] [Minus 24x24]
```

**Styling:**
- Swatch: 24x24, radius 4px, border 1px solid #3A3A3A
- Hex Input: bg #2C2C2C, NO # prefix shown
- Opacity: separate "100" input + "%" text
- Icons: 24x24, gray, hover white

---

### 6. DualInput (für Padding, Position, Size)

```tsx
interface DualInputProps {
  label1?: string            // "X", "W"
  icon1?: ReactNode          // oder Icon
  value1: string
  onChange1: (value: string) => void

  label2?: string            // "Y", "H"
  icon2?: ReactNode
  value2: string
  onChange2: (value: string) => void

  suffixText2?: string       // "Hug" für Constraints

  actionButton?: ReactNode   // Icon rechts
}
```

**Layout:**
```
┌─────────────┐ ┌─────────────┐ ┌─┐
│ L1  value1  │ │ L2  value2  │ │⊡│
└─────────────┘ └─────────────┘ └─┘
```

---

### 7. StandaloneIconButton

```tsx
interface StandaloneIconButtonProps {
  icon: ReactNode
  onClick: () => void
  title: string
  active?: boolean
}
```

**Styling:**
- Size: 32x32px (click area), Icon 16px
- Background: transparent (KEIN Container!)
- Icon color: gray (#888)
- Hover: icon white
- Active: icon white oder accent

---

### 8. GroupedIconButtons (für Alignment vertical)

```tsx
// Mehrere StandaloneIconButtons ohne Container
<div style={{ display: 'flex', gap: '2px' }}>
  <StandaloneIconButton ... />
  <StandaloneIconButton ... />
  <StandaloneIconButton ... />
</div>
```

---

### 9. Checkbox

```tsx
interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}
```

**Styling:**
- Box: 18x18px, radius 4px (rounded, nicht rund!)
- Unchecked: bg #2C2C2C, border #3A3A3A
- Checked: bg accent, white checkmark
- Label: 12px, white, margin-left 8px

---

## Panel Structure für Mirror

```
┌─────────────────────────────────────────┐
│ [□] ComponentName              Line 42  │ ← Header
├─────────────────────────────────────────┤
│                                         │
│ LAYOUT                                  │ ← Section (optional header)
│                                         │
│ ┌─────────┐         gap                 │
│ │[↓] [→] │         ┌────────┐          │ ← Direction + Gap
│ └─────────┘         │   16   │          │
│                     └────────┘          │
│ ┌─────────┐                             │
│ │ ●  ·  · │  [Wrap] [Between] [Stack]   │ ← Alignment + Chips
│ │ ·  ·  · │                             │
│ │ ·  ·  · │                             │
│ └─────────┘                             │
│                                         │
├─────────────────────────────────────────┤
│ SIZE                                    │
│                                         │
│ ┌───────────┐ ┌───────────┐             │
│ │ W   auto  │ │ H   auto  │  [Full]     │ ← W/H + Chips
│ └───────────┘ └───────────┘  [Grow]     │
│                              [Fill]     │
├─────────────────────────────────────────┤
│ SPACING                                 │
│                                         │
│ pad                                     │
│ ┌───────────┐ ┌───────────┐             │
│ │ ⫢    0    │ │ ≡    0    │  [⊡]       │ ← H-pad + V-pad
│ └───────────┘ └───────────┘             │
│                                         │
│ mar                                     │
│ ┌───────────┐ ┌───────────┐             │
│ │ ⫢    0    │ │ ≡    0    │  [⊡]       │
│ └───────────┘ └───────────┘             │
│                                         │
├─────────────────────────────────────────┤
│ FILL                                    │
│                                         │
│ ┌──┐ ┌──────────┐ ┌────┬──┐             │
│ │██│ │ FFFFFF   │ │100 │% │             │ ← bg color
│ └──┘ └──────────┘ └────┴──┘             │
│                                         │
├─────────────────────────────────────────┤
│ BORDER                                  │
│                                         │
│ ┌───────────┐ ┌───────────┐             │
│ │ ⌐    8    │ │ bor  1    │             │ ← radius + border
│ └───────────┘ └───────────┘             │
│                                         │
│ ┌──┐ ┌──────────┐ ┌────┬──┐             │
│ │██│ │ 333333   │ │100 │% │             │ ← boc color
│ └──┘ └──────────┘ └────┴──┘             │
│                                         │
├─────────────────────────────────────────┤
│ TYPOGRAPHY                              │
│                                         │
│ ┌──┐ ┌──────────┐                       │
│ │██│ │ FFFFFF   │                       │ ← col color
│ └──┘ └──────────┘                       │
│                                         │
│ ┌───────────┐ ┌───────────┐             │
│ │ size  14  │ │ wt  500 ▼ │             │
│ └───────────┘ └───────────┘             │
│                                         │
│ ┌───┐┌───┐┌───┐┌───┐                    │
│ │ I ││ U ││AA ││...│                    │ ← Style buttons
│ └───┘└───┘└───┘└───┘                    │
│                                         │
├─────────────────────────────────────────┤
│ EFFECTS                                 │
│                                         │
│ ┌───────────┐ ┌───────────┐             │
│ │ opa  1.0  │ │ shadow  ▼ │             │
│ └───────────┘ └───────────┘             │
│                                         │
│ ☐ hidden  ☐ clip  ☐ scroll              │
│                                         │
└─────────────────────────────────────────┘
```

---

## Wichtige Details

### Unterschiede zu meinem ersten Entwurf:

| Aspekt | Falsch | Richtig |
|--------|--------|---------|
| Section Header | UPPERCASE | Normal case |
| Labels | Unsicher | Normal case, gray |
| Alignment Gruppe 1 | Beide mit Container | MIT Container |
| Alignment Gruppe 2 | Beide mit Container | OHNE Container |
| Rotation Buttons | In Container | Standalone |
| Flow Optionen | 2 (hor/ver) | 4 (wrap/ver/hor/grid) |
| Hex im Color | Mit # | OHNE # |
| Opacity | "100%" zusammen | "100" + "%" getrennt |

### Icon-Größen:
- In Inputs: 14-16px
- Standalone Buttons: 16px
- In Segmented Control: 16px

### Abstände genau:
- Section zu Section: 16px + 1px Divider
- Label zu Control: 6px
- Input zu Input (horizontal): 8px
- Segmented Button zu Button: 2px

---

## Implementation Priority

### Phase 1: Basis-Komponenten
1. `IconInput` - Wird überall gebraucht
2. `SegmentedControl` - Für Direction, Flow
3. `AlignmentGrid` - Zentrales Element

### Phase 2: Farb-Komponenten
4. `ColorSwatch` - Für Fill, Border, Typography

### Phase 3: Zusammengesetzte
5. `DualInput` - Kombiniert 2 IconInputs
6. Layout Section zusammenbauen
7. Size Section

### Phase 4: Rest
8. Spacing Section
9. Fill Section
10. Border Section
11. Typography Section
12. Effects Section
