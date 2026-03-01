/**
 * @module dsl/schema/core-components-schema
 * @description Core component schema definitions (Nav, Field, PrimaryButton, etc.)
 */

import type { CoreComponentDefinition, CoreComponentCategory } from './types'

// =============================================================================
// NAVIGATION COMPONENTS
// =============================================================================

export const NAVIGATION_COMPONENTS: Record<string, CoreComponentDefinition> = {
  Nav: {
    name: 'Nav',
    category: 'navigation' as CoreComponentCategory,
    description: 'Navigation Container. Enthält NavItems und kann collapsed/expanded werden.',
    properties: {
      width: 240,
      _layout: 'vertical',
      gap: 4,
      padding: 8,
      background: '$nav.bg',
    },
    slots: [],
    states: [
      { name: 'expanded', description: 'Volle Breite', properties: { width: 240 } },
      { name: 'collapsed', description: 'Minimierte Breite', properties: { width: 64 } },
    ],
    tokens: ['$nav.bg'],
    usage: [
      'Nav als Container für Navigation verwenden',
      'Mit expanded/collapsed States für collapsible Sidebar',
    ],
    examples: [
      'Nav\n  NavItem Icon "home"; Label "Dashboard"\n  NavItem Icon "settings"; Label "Settings"',
      'Nav expanded\n  NavItem Icon "home"; Label "Home"',
      'myNav as Nav, width 280',
    ],
  },

  NavItem: {
    name: 'NavItem',
    category: 'navigation' as CoreComponentCategory,
    description: 'Navigations-Element mit Icon und Label. Unterstützt hover und active States.',
    properties: {
      _layout: 'horizontal',
      _align: 'ver-center',
      gap: 12,
      'padding-vertical': 8,
      'padding-horizontal': 16,
      radius: 4,
      cursor: 'pointer',
    },
    slots: [
      { name: 'Icon', description: 'Navigations-Icon', type: 'Icon', defaultProperties: { color: '$nav.muted', 'icon-size': 20 } },
      { name: 'Label', description: 'Navigations-Text', type: 'Text', defaultProperties: { color: '$nav.text', truncate: true } },
    ],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { background: '$nav.hover' } },
      { name: 'active', description: 'Aktives Element', properties: { background: '$nav.active' } },
    ],
    tokens: ['$nav.muted', '$nav.text', '$nav.hover', '$nav.active'],
    usage: [
      'NavItem Icon "name"; Label "Text" für Standard-Navigation',
      'NavItem active, ... für aktives Element',
    ],
    examples: [
      'NavItem Icon "home"; Label "Dashboard"',
      'NavItem active, Icon "settings"; Label "Settings"',
      'NavItem Icon "user"; Label "Profile"',
    ],
  },

  NavItemBadge: {
    name: 'NavItemBadge',
    category: 'navigation' as CoreComponentCategory,
    description: 'Navigations-Element mit Icon, Label und Badge-Counter.',
    properties: {
      _layout: 'horizontal',
      _align: 'ver-center',
      gap: 12,
      'padding-vertical': 8,
      'padding-horizontal': 16,
      radius: 4,
      cursor: 'pointer',
    },
    slots: [
      { name: 'Icon', description: 'Navigations-Icon', type: 'Icon', defaultProperties: { color: '$nav.muted', 'icon-size': 20 } },
      { name: 'Label', description: 'Navigations-Text', type: 'Text', defaultProperties: { color: '$nav.text', width: 'full', truncate: true } },
      { name: 'Badge', description: 'Counter-Badge', type: 'Text', defaultProperties: { background: '$nav.badge', color: '$nav.text', 'font-size': 11, radius: 999, 'min-width': 20, height: 18 } },
    ],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { background: '$nav.hover' } },
      { name: 'active', description: 'Aktives Element', properties: { background: '$nav.active' } },
    ],
    tokens: ['$nav.muted', '$nav.text', '$nav.hover', '$nav.active', '$nav.badge'],
    usage: [
      'NavItemBadge für Items mit Notification-Counter',
    ],
    examples: [
      'NavItemBadge Icon "inbox"; Label "Messages"; Badge "12"',
      'NavItemBadge Icon "bell"; Label "Notifications"; Badge "3"',
    ],
  },

  NavSection: {
    name: 'NavSection',
    category: 'navigation' as CoreComponentCategory,
    description: 'Gruppen-Header für Navigation-Sections.',
    properties: {},
    slots: [
      { name: 'Label', description: 'Section-Titel', type: 'Text', defaultProperties: { color: '$nav.muted', 'font-size': 11, uppercase: true, 'padding-vertical': 8, 'padding-horizontal': 16 } },
    ],
    states: [],
    tokens: ['$nav.muted'],
    usage: [
      'NavSection Label "Admin" für Gruppen-Header',
    ],
    examples: [
      'NavSection Label "Admin"',
      'NavSection Label "Settings"',
    ],
  },

  ToggleNav: {
    name: 'ToggleNav',
    category: 'navigation' as CoreComponentCategory,
    description: 'Collapse/Expand Toggle-Button für Navigation.',
    properties: {
      _layout: 'horizontal',
      _align: 'right',
      width: 'full',
      'padding-vertical': 8,
      'padding-horizontal': 16,
      cursor: 'pointer',
    },
    slots: [
      { name: 'Arrow', description: 'Pfeil-Icon', type: 'Icon', defaultProperties: { content: 'chevron-left', color: '$nav.muted', 'icon-size': 18 } },
    ],
    states: [
      { name: 'expanded', description: 'Navigation offen', childOverrides: [{ slot: 'Arrow', properties: { content: 'chevron-left' } }] },
      { name: 'collapsed', description: 'Navigation zu', childOverrides: [{ slot: 'Arrow', properties: { content: 'chevron-right' } }] },
    ],
    events: [
      { event: 'onclick', actions: ['toggle-state self'] },
    ],
    tokens: ['$nav.muted'],
    usage: [
      'ToggleNav am Ende der Nav für Collapse-Funktion',
    ],
    examples: [
      'ToggleNav expanded',
      'ToggleNav collapsed',
    ],
  },

  TreeItem: {
    name: 'TreeItem',
    category: 'navigation' as CoreComponentCategory,
    description: 'Expandierbares Tree-Navigation-Element mit Chevron, Icon und Label.',
    properties: {
      _layout: 'vertical',
    },
    slots: [
      { name: 'TreeHeader', description: 'Klickbarer Header', type: 'Box', defaultProperties: { _layout: 'horizontal', _align: 'ver-center', gap: 8, 'padding-vertical': 8, 'padding-horizontal': 16, radius: 4, cursor: 'pointer' } },
      { name: 'Chevron', description: 'Expand-Icon', type: 'Icon', defaultProperties: { content: 'chevron-right', 'icon-size': 14, color: '$nav.muted' } },
      { name: 'Icon', description: 'Item-Icon', type: 'Icon', defaultProperties: { color: '$nav.muted', 'icon-size': 20 } },
      { name: 'Label', description: 'Item-Text', type: 'Text', defaultProperties: { color: '$nav.text' } },
      { name: 'TreeChildren', description: 'Nested Items', type: 'Box', defaultProperties: { _layout: 'vertical', 'padding-left': 16, hidden: true } },
    ],
    states: [
      { name: 'expanded', description: 'Kinder sichtbar', childOverrides: [{ slot: 'Chevron', properties: { rotate: 90 } }, { slot: 'TreeChildren', properties: { hidden: false, visible: true } }] },
      { name: 'active', description: 'Aktives Element', childOverrides: [{ slot: 'TreeHeader', properties: { background: '$nav.active' } }] },
    ],
    events: [
      { event: 'onclick', actions: ['toggle-state self'] },
    ],
    tokens: ['$nav.muted', '$nav.text', '$nav.active'],
    usage: [
      'TreeItem für hierarchische Navigation',
    ],
    examples: [
      'TreeItem Icon "folder"; Label "Documents"\n  TreeChildren\n    TreeLeaf Icon "file"; Label "Report.pdf"',
    ],
  },

  TreeLeaf: {
    name: 'TreeLeaf',
    category: 'navigation' as CoreComponentCategory,
    description: 'Nicht-expandierbares Tree-Element (Blatt).',
    properties: {
      _layout: 'horizontal',
      _align: 'ver-center',
      gap: 8,
      'padding-vertical': 8,
      'padding-horizontal': 16,
      'padding-left': 30,
      radius: 4,
      cursor: 'pointer',
    },
    slots: [
      { name: 'Icon', description: 'Item-Icon', type: 'Icon', defaultProperties: { color: '$nav.muted', 'icon-size': 20 } },
      { name: 'Label', description: 'Item-Text', type: 'Text', defaultProperties: { color: '$nav.text' } },
    ],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { background: '$nav.hover' } },
      { name: 'active', description: 'Aktives Element', properties: { background: '$nav.active' } },
    ],
    tokens: ['$nav.muted', '$nav.text', '$nav.hover', '$nav.active'],
    usage: [
      'TreeLeaf als Blatt-Element in TreeItem',
    ],
    examples: [
      'TreeLeaf Icon "file"; Label "Document.pdf"',
      'TreeLeaf active, Icon "image"; Label "Photo.jpg"',
    ],
  },

  DrawerNav: {
    name: 'DrawerNav',
    category: 'navigation' as CoreComponentCategory,
    description: 'Mobile Drawer-Navigation (von links einfahrend).',
    properties: {
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 240,
      background: '$nav.bg',
      shadow: 'lg',
      z: 101,
      hidden: true,
    },
    slots: [],
    states: [],
    showAnimation: 'slide-right 200',
    hideAnimation: 'slide-left 150',
    tokens: ['$nav.bg'],
    usage: [
      'DrawerNav für mobile Navigation',
      'Mit MenuButton kombinieren',
    ],
    examples: [
      'DrawerNav\n  NavItem Icon "home"; Label "Home"',
    ],
  },

  DrawerBackdrop: {
    name: 'DrawerBackdrop',
    category: 'navigation' as CoreComponentCategory,
    description: 'Overlay-Backdrop für Drawer (abdunkelt Hintergrund).',
    properties: {
      position: 'fixed',
      inset: 0,
      background: '#00000080',
      z: 100,
      hidden: true,
    },
    slots: [],
    states: [],
    events: [
      { event: 'onclick', actions: ['hide DrawerNav', 'hide self'] },
    ],
    showAnimation: 'fade 150',
    hideAnimation: 'fade 100',
    tokens: [],
    usage: [
      'DrawerBackdrop hinter DrawerNav für Klick-zum-Schließen',
    ],
    examples: [
      'DrawerBackdrop',
    ],
  },

  MenuButton: {
    name: 'MenuButton',
    category: 'navigation' as CoreComponentCategory,
    description: 'Hamburger-Menu-Button zum Öffnen des Drawers.',
    properties: {},
    slots: [
      { name: 'Icon', description: 'Menu-Icon', type: 'Icon', defaultProperties: { content: 'menu', padding: 8, color: '$nav.text', cursor: 'pointer' } },
    ],
    states: [],
    events: [
      { event: 'onclick', actions: ['show DrawerNav', 'show DrawerBackdrop'] },
    ],
    tokens: ['$nav.text'],
    usage: [
      'MenuButton in Header für mobile Navigation',
    ],
    examples: [
      'MenuButton',
    ],
  },
}

// =============================================================================
// FORM COMPONENTS
// =============================================================================

export const FORM_COMPONENTS: Record<string, CoreComponentDefinition> = {
  Field: {
    name: 'Field',
    category: 'form' as CoreComponentCategory,
    description: 'Form-Feld Container mit Label, Input, Helper und Error Slots.',
    properties: {
      _layout: 'vertical',
      gap: 4,
    },
    slots: [
      { name: 'Label', description: 'Feld-Label', type: 'Text', defaultProperties: { color: '$form.label', 'font-size': 13 } },
      { name: 'Input', description: 'Eingabefeld', type: 'Input', defaultProperties: { height: 36, 'padding-horizontal': 12, background: '$form.input', 'border-width': 1, 'border-color': '$form.border', radius: 4, color: '$form.text', width: 'full' } },
      { name: 'Helper', description: 'Hilfe-Text (optional)', type: 'Text', defaultProperties: { color: '$form.muted', 'font-size': 12, hidden: true } },
      { name: 'Error', description: 'Fehler-Meldung', type: 'Text', defaultProperties: { color: '$form.error', 'font-size': 12, hidden: true } },
    ],
    states: [
      { name: 'focused', description: 'Input hat Fokus', childOverrides: [{ slot: 'Input', properties: { 'border-color': '$form.focus' } }] },
      { name: 'invalid', description: 'Validierung fehlgeschlagen', childOverrides: [{ slot: 'Input', properties: { 'border-color': '$form.error' } }, { slot: 'Error', properties: { hidden: false, visible: true } }] },
      { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, 'pointer-events': 'none' } },
    ],
    tokens: ['$form.label', '$form.input', '$form.border', '$form.text', '$form.muted', '$form.error', '$form.focus'],
    usage: [
      'Field Label "E-Mail"; Input placeholder "name@example.com"',
      'Field invalid, ... für Validierungsfehler',
    ],
    examples: [
      'Field Label "E-Mail"; Input placeholder "name@example.com"',
      'Field Label "Passwort"; Input type password; Helper "Min. 8 Zeichen"',
      'Field invalid, Label "Name"; Error "Pflichtfeld"',
    ],
  },

  TextInput: {
    name: 'TextInput',
    category: 'form' as CoreComponentCategory,
    description: 'Einfaches Text-Eingabefeld mit Hover und Focus States.',
    properties: {
      _primitiveType: 'Input',
      height: 36,
      'padding-horizontal': 12,
      background: '$form.input',
      'border-width': 1,
      'border-color': '$form.border',
      radius: 4,
      color: '$form.text',
    },
    slots: [],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
      { name: 'focus', description: 'Hat Fokus', properties: { 'border-color': '$form.focus' } },
    ],
    tokens: ['$form.input', '$form.border', '$form.text', '$form.muted', '$form.focus'],
    usage: [
      'TextInput placeholder "Text eingeben..."',
    ],
    examples: [
      'TextInput placeholder "Enter text..."',
      'TextInput "Default value"',
    ],
  },

  IconInput: {
    name: 'IconInput',
    category: 'form' as CoreComponentCategory,
    description: 'Text-Eingabefeld mit führendem Icon.',
    properties: {
      _layout: 'horizontal',
      _align: 'ver-center',
      height: 36,
      'padding-horizontal': 12,
      gap: 8,
      background: '$form.input',
      'border-width': 1,
      'border-color': '$form.border',
      radius: 4,
    },
    slots: [
      { name: 'Icon', description: 'Führendes Icon', type: 'Icon', defaultProperties: { color: '$form.muted', 'icon-size': 18 } },
      { name: 'Input', description: 'Eingabefeld', type: 'Input', defaultProperties: { background: 'transparent', border: 'none', color: '$form.text', width: 'full' } },
    ],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
      { name: 'focus', description: 'Hat Fokus', properties: { 'border-color': '$form.focus' } },
    ],
    tokens: ['$form.input', '$form.border', '$form.muted', '$form.text', '$form.focus'],
    usage: [
      'IconInput Icon "search"; Input placeholder "Suchen..."',
    ],
    examples: [
      'IconInput Icon "search"; Input placeholder "Search..."',
      'IconInput Icon "mail"; Input placeholder "Email"',
    ],
  },

  PasswordInput: {
    name: 'PasswordInput',
    category: 'form' as CoreComponentCategory,
    description: 'Passwort-Eingabefeld mit Sichtbarkeits-Toggle.',
    properties: {
      _layout: 'horizontal',
      _align: 'ver-center',
      height: 36,
      'padding-horizontal': 12,
      gap: 8,
      background: '$form.input',
      'border-width': 1,
      'border-color': '$form.border',
      radius: 4,
    },
    slots: [
      { name: 'Input', description: 'Passwort-Feld', type: 'Input', defaultProperties: { inputType: 'password', background: 'transparent', border: 'none', color: '$form.text', width: 'full' } },
      { name: 'Toggle', description: 'Sichtbarkeits-Toggle', type: 'Icon', defaultProperties: { content: 'eye-off', color: '$form.muted', 'icon-size': 18, cursor: 'pointer' } },
    ],
    states: [
      { name: 'visible', description: 'Passwort sichtbar', childOverrides: [{ slot: 'Input', properties: { inputType: 'text' } }, { slot: 'Toggle', properties: { content: 'eye' } }] },
      { name: 'hidden', description: 'Passwort versteckt', childOverrides: [{ slot: 'Input', properties: { inputType: 'password' } }, { slot: 'Toggle', properties: { content: 'eye-off' } }] },
      { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
      { name: 'focus', description: 'Hat Fokus', properties: { 'border-color': '$form.focus' } },
    ],
    events: [
      { event: 'onclick', target: 'Toggle', actions: ['toggle-state self'] },
    ],
    tokens: ['$form.input', '$form.border', '$form.muted', '$form.text', '$form.focus'],
    usage: [
      'PasswordInput placeholder "Passwort..."',
      'Klick auf Auge-Icon wechselt Sichtbarkeit',
    ],
    examples: [
      'PasswordInput placeholder "Enter password..."',
    ],
  },

  TextareaInput: {
    name: 'TextareaInput',
    category: 'form' as CoreComponentCategory,
    description: 'Mehrzeiliges Text-Eingabefeld.',
    properties: {
      _primitiveType: 'Textarea',
      'min-height': 80,
      padding: 12,
      background: '$form.input',
      'border-width': 1,
      'border-color': '$form.border',
      radius: 4,
      color: '$form.text',
    },
    slots: [],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
      { name: 'focus', description: 'Hat Fokus', properties: { 'border-color': '$form.focus' } },
    ],
    tokens: ['$form.input', '$form.border', '$form.text', '$form.muted', '$form.focus'],
    usage: [
      'TextareaInput placeholder "Beschreibung..."',
    ],
    examples: [
      'TextareaInput placeholder "Enter description..."',
      'TextareaInput rows 5, placeholder "Message"',
    ],
  },

  SelectInput: {
    name: 'SelectInput',
    category: 'form' as CoreComponentCategory,
    description: 'Dropdown-Auswahl-Feld.',
    properties: {
      _layout: 'horizontal',
      _align: 'ver-center',
      _justify: 'space-between',
      height: 36,
      'padding-horizontal': 12,
      background: '$form.input',
      'border-width': 1,
      'border-color': '$form.border',
      radius: 4,
      cursor: 'pointer',
    },
    slots: [
      { name: 'Value', description: 'Aktueller Wert', type: 'Text', defaultProperties: { color: '$form.text' } },
      { name: 'Chevron', description: 'Dropdown-Indikator', type: 'Icon', defaultProperties: { content: 'chevron-down', color: '$form.muted', 'icon-size': 18 } },
    ],
    states: [
      { name: 'expanded', description: 'Dropdown offen', childOverrides: [{ slot: 'Chevron', properties: { rotate: 180 } }] },
      { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
    ],
    events: [
      { event: 'onclick', actions: ['toggle-state self'] },
    ],
    tokens: ['$form.input', '$form.border', '$form.text', '$form.muted'],
    usage: [
      'SelectInput Value "Option wählen..."',
    ],
    examples: [
      'SelectInput Value "Select option..."',
    ],
  },

  CheckboxInput: {
    name: 'CheckboxInput',
    category: 'form' as CoreComponentCategory,
    description: 'Checkbox-Eingabefeld mit checked/unchecked State.',
    properties: {
      _layout: 'horizontal',
      _align: 'center',
      width: 18,
      height: 18,
      radius: 4,
      background: '$form.input',
      'border-width': 1,
      'border-color': '$form.border',
      cursor: 'pointer',
    },
    slots: [
      { name: 'Checkmark', description: 'Haken-Icon', type: 'Icon', defaultProperties: { content: 'check', color: 'white', 'icon-size': 14, hidden: true } },
    ],
    states: [
      { name: 'checked', description: 'Ausgewählt', properties: { background: '$primary.bg', 'border-color': '$primary.bg' }, childOverrides: [{ slot: 'Checkmark', properties: { hidden: false, visible: true } }] },
      { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
      { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed' } },
    ],
    events: [
      { event: 'onclick', actions: ['toggle-state self'] },
    ],
    tokens: ['$form.input', '$form.border', '$form.muted', '$primary.bg'],
    usage: [
      'CheckboxInput für einzelne An/Aus-Auswahl',
    ],
    examples: [
      'CheckboxInput',
      'CheckboxInput checked',
    ],
  },

  RadioInput: {
    name: 'RadioInput',
    category: 'form' as CoreComponentCategory,
    description: 'Radio-Button für Einfachauswahl in Gruppen.',
    properties: {
      _layout: 'horizontal',
      _align: 'center',
      width: 18,
      height: 18,
      radius: 9,
      background: '$form.input',
      'border-width': 1,
      'border-color': '$form.border',
      cursor: 'pointer',
    },
    slots: [
      { name: 'Dot', description: 'Auswahl-Punkt', type: 'Box', defaultProperties: { width: 8, height: 8, radius: 4, background: 'white', hidden: true } },
    ],
    states: [
      { name: 'checked', description: 'Ausgewählt', properties: { background: '$primary.bg', 'border-color': '$primary.bg' }, childOverrides: [{ slot: 'Dot', properties: { hidden: false, visible: true } }] },
      { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
      { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed' } },
    ],
    events: [
      { event: 'onclick', actions: ['activate self', 'deactivate-siblings'] },
    ],
    tokens: ['$form.input', '$form.border', '$form.muted', '$primary.bg'],
    usage: [
      'RadioInput in Gruppen für Einfachauswahl',
    ],
    examples: [
      'RadioInput',
      'RadioInput checked',
    ],
  },

  SwitchInput: {
    name: 'SwitchInput',
    category: 'form' as CoreComponentCategory,
    description: 'Toggle-Switch für An/Aus-Einstellungen.',
    properties: {
      _layout: 'horizontal',
      _align: 'center',
      width: 40,
      height: 22,
      radius: 11,
      background: '$form.border',
      cursor: 'pointer',
      padding: 2,
    },
    slots: [
      { name: 'Thumb', description: 'Schieberegler', type: 'Box', defaultProperties: { width: 18, height: 18, radius: 9, background: 'white' } },
    ],
    states: [
      { name: 'on', description: 'Eingeschaltet', properties: { background: '$primary.bg' }, childOverrides: [{ slot: 'Thumb', properties: { 'margin-left': 18 } }] },
      { name: 'off', description: 'Ausgeschaltet', properties: { background: '$form.border' }, childOverrides: [{ slot: 'Thumb', properties: { 'margin-left': 0 } }] },
      { name: 'hover', description: 'Mouse-Over', properties: { opacity: 0.9 } },
      { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed' } },
    ],
    events: [
      { event: 'onclick', actions: ['toggle-state self'] },
    ],
    tokens: ['$form.border', '$primary.bg'],
    usage: [
      'SwitchInput für Einstellungs-Toggles',
    ],
    examples: [
      'SwitchInput',
      'SwitchInput on',
    ],
  },
}

// =============================================================================
// BUTTON COMPONENTS
// =============================================================================

export const BUTTON_COMPONENTS: Record<string, CoreComponentDefinition> = {
  PrimaryButton: {
    name: 'PrimaryButton',
    category: 'button' as CoreComponentCategory,
    description: 'Haupt-Aktions-Button.',
    properties: {
      _layout: 'horizontal',
      _align: 'center',
      gap: 8,
      height: 36,
      'padding-horizontal': 16,
      radius: 4,
      background: '$primary.bg',
      color: '$primary.text',
      cursor: 'pointer',
    },
    slots: [],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { background: '$primary.hover' } },
      { name: 'active', description: 'Gedrückt', properties: { transform: 'scale(0.98)' } },
      { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed', 'pointer-events': 'none' } },
    ],
    tokens: ['$primary.bg', '$primary.text', '$primary.hover'],
    usage: [
      'PrimaryButton "Speichern" für Haupt-Aktionen',
    ],
    examples: [
      'PrimaryButton "Save"',
      'PrimaryButton Icon "save"; "Save Changes"',
    ],
  },

  SecondaryButton: {
    name: 'SecondaryButton',
    category: 'button' as CoreComponentCategory,
    description: 'Sekundärer Aktions-Button.',
    properties: {
      _layout: 'horizontal',
      _align: 'center',
      gap: 8,
      height: 36,
      'padding-horizontal': 16,
      radius: 4,
      background: '$secondary.bg',
      color: '$form.text',
      cursor: 'pointer',
    },
    slots: [],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { background: '$secondary.hover' } },
      { name: 'active', description: 'Gedrückt', properties: { transform: 'scale(0.98)' } },
      { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed', 'pointer-events': 'none' } },
    ],
    tokens: ['$secondary.bg', '$secondary.hover', '$form.text'],
    usage: [
      'SecondaryButton "Abbrechen" für sekundäre Aktionen',
    ],
    examples: [
      'SecondaryButton "Cancel"',
    ],
  },

  GhostButton: {
    name: 'GhostButton',
    category: 'button' as CoreComponentCategory,
    description: 'Transparenter Button mit Rahmen.',
    properties: {
      _layout: 'horizontal',
      _align: 'center',
      gap: 8,
      height: 36,
      'padding-horizontal': 16,
      radius: 4,
      background: 'transparent',
      'border-width': 1,
      'border-color': '$form.border',
      color: '$form.text',
      cursor: 'pointer',
    },
    slots: [],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { background: '$form.input' } },
      { name: 'active', description: 'Gedrückt', properties: { transform: 'scale(0.98)' } },
      { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed', 'pointer-events': 'none' } },
    ],
    tokens: ['$form.border', '$form.text', '$form.input'],
    usage: [
      'GhostButton "Mehr erfahren" für dezente Aktionen',
    ],
    examples: [
      'GhostButton "Learn More"',
    ],
  },

  DangerButton: {
    name: 'DangerButton',
    category: 'button' as CoreComponentCategory,
    description: 'Button für destruktive Aktionen.',
    properties: {
      _layout: 'horizontal',
      _align: 'center',
      gap: 8,
      height: 36,
      'padding-horizontal': 16,
      radius: 4,
      background: '$danger.bg',
      color: '#FFFFFF',
      cursor: 'pointer',
    },
    slots: [],
    states: [
      { name: 'hover', description: 'Mouse-Over', properties: { background: '$danger.hover' } },
      { name: 'active', description: 'Gedrückt', properties: { transform: 'scale(0.98)' } },
      { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed', 'pointer-events': 'none' } },
    ],
    tokens: ['$danger.bg', '$danger.hover'],
    usage: [
      'DangerButton "Löschen" für destruktive Aktionen',
    ],
    examples: [
      'DangerButton "Delete"',
    ],
  },
}

// =============================================================================
// COMBINED EXPORT
// =============================================================================

export const CORE_COMPONENTS: Record<string, CoreComponentDefinition> = {
  ...NAVIGATION_COMPONENTS,
  ...FORM_COMPONENTS,
  ...BUTTON_COMPONENTS,
}
