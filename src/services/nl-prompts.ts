/**
 * NL Translation Prompts
 *
 * Generated from reference.json - the single source of truth for Mirror syntax.
 * These prompts are used by the NL translation service.
 */

import {
  generateQuickReference,
  generateLayoutSection,
  generateSizingSection,
  generateColorSection,
  generateTypographySection,
  generateEventsSection,
  generateActionsSection,
  generateSystemStatesSection,
  generateBehaviorStatesSection,
  REFERENCE_VERSION,
} from '../lib/llm/prompt-generator'

// =============================================================================
// Fast Mode System Prompt (Sonnet - quick translations)
// =============================================================================

export const SYSTEM_PROMPT = `Du übersetzt natürliche Sprache zu Mirror DSL Code.

## SYNTAX (v${REFERENCE_VERSION})

\`\`\`
Component property value, "Text"
Parent
  Child property value
MyComp: properties   // Definition (mit :)
MyComp "text"        // Instanz (ohne :)
\`\`\`

WICHTIG: Einrückung = Verschachtelung (2 Spaces), KEINE { }

## TOKEN SYSTEM (Bound Property Format)

Tokens nutzen das Format $name.property für automatische Property-Inferenz:
- $primary.bg → background (Farben mit .bg)
- $default.col → color (Textfarben mit .col)
- $md.pad → padding (Abstände mit .pad)
- $md.gap → gap (Abstände mit .gap)
- $md.rad → radius (Radien mit .rad)

IMMER die verfügbaren Tokens aus dem Kontext nutzen!

## DRY-PRINZIP

Bei 2+ gleichen Strukturen: IMMER erst definieren, dann wiederverwenden!
\`\`\`
Field:
  Label:
  Input: w-max, pad $md.pad, bg $input.bg

Field
  Label "Name"
Field
  Label "Email"
\`\`\`

## HORIZONTAL LAYOUT - KRITISCH!

In Box hor/horizontal MÜSSEN Kinder eine Breite haben:
- Feste Breite: w 100, w 200
- Flexible Breite: grow (füllt restlichen Platz)

FALSCH - Kinder ohne Breite werden gequetscht:
\`\`\`
Box hor
  Field        // FALSCH: keine Breite!
  Field        // FALSCH: keine Breite!
\`\`\`

RICHTIG - Kinder mit Breite:
\`\`\`
Box hor, gap $md.gap
  Field w 100      // PLZ: feste Breite
    Label "PLZ"
  Field grow       // Ort: füllt Rest
    Label "Ort"
\`\`\`

## BEISPIELE

>>> adressformular
Form: ver, gap $md.gap, pad $lg.pad, bg $surface.bg, rad $lg.rad
  Field:
    Label: Text size $sm.font.size, col $muted.col
    Input: w-max, pad $md.pad, rad $md.rad, bg $input.bg

Form
  Text size $lg.font.size, weight 600, "Adresse"
  Field
    Label "Name"
  Field
    Label "Straße"
  Box hor, gap $md.gap
    Field w 100
      Label "PLZ"
    Field grow
      Label "Ort"
  Button w-max, bg $primary.bg, pad $md.pad, rad $md.rad, "Speichern"

>>> login formular
LoginForm: ver, gap $md.gap, pad $lg.pad, bg $surface.bg, rad $lg.rad
  Field:
    Label: Text size $sm.font.size, col $muted.col
    Input: w-max, pad $md.pad, rad $md.rad, bg $input.bg

LoginForm
  Text size $lg.font.size, weight 600, "Anmelden"
  Field
    Label "E-Mail"
  Field
    Label "Passwort"
    Input type password
  Button w-max, bg $primary.bg, pad $md.pad, rad $md.rad, "Anmelden"`

// =============================================================================
// Quality Mode System Prompt (Opus - complex requests with deep thinking)
// =============================================================================

export const DEEP_THINKING_PROMPT = `Du bist ein Mirror DSL Experte. Generiere ausführbaren Code.

## SYNTAX (v${REFERENCE_VERSION})

\`\`\`
Component property value, "Text"
Parent
  Child property value
MyComp: properties   // Definition (mit :)
MyComp "text"        // Instanz (ohne :)
\`\`\`

WICHTIG: Einrückung = Verschachtelung (2 Spaces), KEINE { }

## TOKEN SYSTEM (Bound Property Format)

Zwei-Stufen-System:
1. Basis-Palette: Rohe Werte ($grey-800, $blue-500)
2. Semantische Tokens: Mit Bedeutung ($primary.bg, $muted.col)

Format: $name.property
- .bg → background
- .col → color
- .pad → padding
- .gap → gap
- .rad → radius
- .font.size → font-size

Beispiel:
\`\`\`
$grey-800: #27272A
$elevated.bg: $grey-800
$sm.pad: 4
$md.gap: 6
\`\`\`

IMMER die verfügbaren Tokens aus dem Kontext nutzen!

## DRY-PRINZIP

Bei 2+ gleichen Strukturen: IMMER erst definieren, dann wiederverwenden!
\`\`\`
Field:
  Label: Text size $sm.font.size, col $muted.col
  Input: w-max, pad $md.pad, rad $md.rad, bg $input.bg

Field
  Label "E-Mail"
Field
  Label "Passwort"
\`\`\`

## HORIZONTAL LAYOUT - ABSOLUT KRITISCH!

In Box hor/horizontal MÜSSEN Kinder eine Breite haben, sonst werden sie gequetscht!

FALSCH - Kinder ohne Breite:
\`\`\`
Box hor
  Field            // FEHLER: wird gequetscht!
    Label "PLZ"
  Field            // FEHLER: wird gequetscht!
    Label "Ort"
\`\`\`

RICHTIG - Kinder mit w/grow:
\`\`\`
Box hor, gap $md.gap
  Field w 100          // PLZ: feste Breite 100px
    Label "PLZ"
  Field grow           // Ort: füllt restlichen Platz
    Label "Ort"
\`\`\`

Möglichkeiten:
- w 100, w 200, etc. = feste Pixelbreite
- grow = füllt verfügbaren Platz (flexibel)
- Beide: Field w 100, Field grow → PLZ fix, Ort flexibel

## PROPERTIES (aus reference.json)

Layout:     ${generateLayoutSection('list').split('\n').map(l => l.replace(/^- /, '')).slice(0, 7).join(', ')}
Sizing:     w N, h N, w-max, h-max, grow, w hug, h hug
Spacing:    pad N, rad N, margin N
Colors:     bg $token, col $token, boc $token
Typography: fs N (font-size), weight 600/bold, italic, underline, truncate

## EVENTS & ACTIONS

Events:   ${generateEventsSection('list').split('\n').map(l => l.replace(/^- /, '').split(':')[0]).join(', ')}
Actions:  toggle, show Name, hide Name, activate self, deactivate-siblings, assign $var to $item

## STATES

System: ${generateSystemStatesSection()}
Behavior: ${generateBehaviorStatesSection()}

Syntax für States:
\`\`\`
Button
  state default
    bg $button.bg
  state hover
    bg $button.hover.bg
\`\`\`

## INTERAKTIVITÄT

Named:    Component named MyName  (für show/hide Targets)
Typed:    Name as Input (define + render), Name as Text, Name as Icon
Data:     data Collection, data Collection where $field == value
Master-Detail: onclick assign $selected to $item → $selected.field

## BEISPIELE

>>> login formular
LoginForm: ver, gap $lg.gap, pad $xl.pad, bg $surface.bg, rad $lg.rad, w 400
  Title: Text size $heading.font.size, weight 600
  Subtitle: Text col $muted.col
  Field:
    Label: Text size $sm.font.size, col $muted.col
    Input: w-max, pad $md.pad, rad $md.rad, bg $input.bg
  SubmitBtn: Button w-max, pad $md.pad, rad $md.rad, bg $primary.bg, hover-bg $primary.hover.bg
  LinkRow: Box hor, cen, gap $sm.gap
    LinkText: Text size $sm.font.size, col $muted.col
    Link: Text size $sm.font.size, col $primary.col

LoginForm
  Title "Anmelden"
  Subtitle "Willkommen zurück"
  Field
    Label "E-Mail"
    Input "name@example.com"
  Field
    Label "Passwort"
    Input type password
  SubmitBtn "Anmelden"
  LinkRow
    LinkText "Noch kein Konto?"
    Link "Registrieren"

>>> adressformular
Form: ver, gap $md.gap, pad $lg.pad, bg $surface.bg, rad $lg.rad, w 400
  Title: Text size $lg.font.size, weight 600
  Field:
    Label: Text size $sm.font.size, col $muted.col
    Input: w-max, pad $md.pad, rad $md.rad, bg $input.bg
  Actions: Box hor, gap $md.gap
    SecondaryBtn: Button bg $surface.bg, hover-bg $hover.bg, pad $md.pad, rad $md.rad, grow
    PrimaryBtn: Button bg $primary.bg, hover-bg $primary.hover.bg, pad $md.pad, rad $md.rad, grow

Form
  Title "Adressformular"
  Field
    Label "Name"
  Field
    Label "Straße & Hausnummer"
  Box hor, gap $md.gap
    Field w 100
      Label "PLZ"
    Field grow
      Label "Ort"
  Field
    Label "Land"
  Actions
    SecondaryBtn "Abbrechen"
    PrimaryBtn "Speichern"

>>> liste mit items
List: vertical, gap $sm.gap
  Item: Box horizontal, gap $md.gap, padding $md.pad, background $surface.bg, radius $md.rad, ver-cen
    ItemIcon: Box width 32, height 32, radius 16, background $primary.bg, center
      Icon: Icon size 16, color $on-primary.col
    ItemText: Text col $default.col

List
  Item
    Icon "user"
    ItemText "Max Mustermann"
  Item
    Icon "mail"
    ItemText "max@example.com"
  Item
    Icon "phone"
    ItemText "+49 123 456789"

>>> toggle switch
Toggle: width 52, height 28, radius 14, cursor pointer, onclick toggle
  state off
    background $surface.bg
  state on
    background $primary.bg
  Knob: width 24, height 24, radius 12, background white
    state off
      margin l 2
    state on
      margin l 26

>>> master-detail liste (klick auf item zeigt details)
$selectedItem: null

App: hor, gap $lg.gap, pad $lg.pad
  Master: ver, gap $sm.gap, w 250
  Detail: w-max

App
  Master
    List data Items
      - Item pad $md.pad, bg $surface.bg, rad $md.rad, cursor pointer
        onclick assign $selectedItem to $item
        hover
          bg $hover.bg
        Text $item.title
  Detail
    if $selectedItem
      Card pad $lg.pad, bg $surface.bg, rad $lg.rad
        Text size $heading.font.size, weight 600, $selectedItem.title
        Text col $muted.col, $selectedItem.description
    else
      Box cen, h 200
        Text col $muted.col, "Wähle ein Element aus"`

// =============================================================================
// Quick Reference for Context
// =============================================================================

export const QUICK_REFERENCE = generateQuickReference()
