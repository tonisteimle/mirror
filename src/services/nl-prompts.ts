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

## TOKEN SYSTEM (Context-Aware)

Tokens im Format $name.property - Property-Kontext erlaubt Kurzform:
- gap $md → resolves to $md.gap (Suffix aus Kontext)
- pad $lg → resolves to $lg.pad
- bg $primary → resolves to $primary.bg
- rad $sm → resolves to $sm.rad

WICHTIG: Nutze die KURZFORM wenn Property redundant ist!
FALSCH: gap $md.gap, pad $lg.pad  (Suffix redundant)
RICHTIG: gap $md, pad $lg  (sauber, Property gibt Kontext)

IMMER die verfügbaren Tokens aus dem Kontext nutzen!

## DRY-PRINZIP

Bei 2+ gleichen Strukturen: IMMER erst definieren, dann wiederverwenden!
\`\`\`
Field:
  Label:
  Input: w-max, pad $md, bg $input

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
Box hor, gap $md
  Field w 100      // PLZ: feste Breite
    Label "PLZ"
  Field grow       // Ort: füllt Rest
    Label "Ort"
\`\`\`

## BEISPIELE

>>> adressformular
Form: ver, gap $md, pad $lg, bg $surface, rad $lg
  Field:
    Label: Text size $sm.font.size, col $muted
    Input: w-max, pad $md, rad $md, bg $input

Form
  Text size $lg.font.size, weight 600, "Adresse"
  Field
    Label "Name"
  Field
    Label "Straße"
  Box hor, gap $md
    Field w 100
      Label "PLZ"
    Field grow
      Label "Ort"
  Button w-max, bg $primary, pad $md, rad $md, "Speichern"

>>> login formular
LoginForm: ver, gap $md, pad $lg, bg $surface, rad $lg
  Field:
    Label: Text size $sm.font.size, col $muted
    Input: w-max, pad $md, rad $md, bg $input

LoginForm
  Text size $lg.font.size, weight 600, "Anmelden"
  Field
    Label "E-Mail"
  Field
    Label "Passwort"
    Input type password
  Button w-max, bg $primary, pad $md, rad $md, "Anmelden"`

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

## TOKEN SYSTEM (Context-Aware)

Zwei-Stufen-System:
1. Basis-Palette: Rohe Werte ($grey-800, $blue-500)
2. Semantische Tokens: Mit Bedeutung ($primary.bg, $muted.col)

Format: $name.property - Property-Kontext erlaubt Kurzform:
- gap $md → resolves to $md.gap
- pad $lg → resolves to $lg.pad
- bg $primary → resolves to $primary.bg
- rad $sm → resolves to $sm.rad

WICHTIG: Nutze die KURZFORM wenn Property redundant ist!
FALSCH: gap $md.gap, pad $lg.pad  (Suffix redundant)
RICHTIG: gap $md, pad $lg  (sauber, Property gibt Kontext)

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
  Label: Text size $sm.font.size, col $muted
  Input: w-max, pad $md, rad $md, bg $input

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
Box hor, gap $md
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
LoginForm: ver, gap $lg, pad $xl, bg $surface, rad $lg, w 400
  Title: Text size $heading.font.size, weight 600
  Subtitle: Text col $muted
  Field:
    Label: Text size $sm.font.size, col $muted
    Input: w-max, pad $md, rad $md, bg $input
  SubmitBtn: Button w-max, pad $md, rad $md, bg $primary, hover-bg $primary.hover
  LinkRow: Box hor, cen, gap $sm
    LinkText: Text size $sm.font.size, col $muted
    Link: Text size $sm.font.size, col $primary

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
Form: ver, gap $md, pad $lg, bg $surface, rad $lg, w 400
  Title: Text size $lg.font.size, weight 600
  Field:
    Label: Text size $sm.font.size, col $muted
    Input: w-max, pad $md, rad $md, bg $input
  Actions: Box hor, gap $md
    SecondaryBtn: Button bg $surface, hover-bg $hover, pad $md, rad $md, grow
    PrimaryBtn: Button bg $primary, hover-bg $primary.hover, pad $md, rad $md, grow

Form
  Title "Adressformular"
  Field
    Label "Name"
  Field
    Label "Straße & Hausnummer"
  Box hor, gap $md
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
List: vertical, gap $sm
  Item: Box horizontal, gap $md, padding $md, background $surface, radius $md, ver-cen
    ItemIcon: Box width 32, height 32, radius 16, background $primary, center
      Icon: Icon size 16, color $on-primary
    ItemText: Text col $default

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
    background $surface
  state on
    background $primary
  Knob: width 24, height 24, radius 12, background white
    state off
      margin l 2
    state on
      margin l 26

>>> master-detail liste (klick auf item zeigt details)
$selectedItem: null

App: hor, gap $lg, pad $lg
  Master: ver, gap $sm, w 250
  Detail: w-max

App
  Master
    List data Items
      - Item pad $md, bg $surface, rad $md, cursor pointer
        onclick assign $selectedItem to $item
        hover
          bg $hover
        Text $item.title
  Detail
    if $selectedItem
      Card pad $lg, bg $surface, rad $lg
        Text size $heading.font.size, weight 600, $selectedItem.title
        Text col $muted, $selectedItem.description
    else
      Box cen, h 200
        Text col $muted, "Wähle ein Element aus"`

// =============================================================================
// Quick Reference for Context
// =============================================================================

export const QUICK_REFERENCE = generateQuickReference()
