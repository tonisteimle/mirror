/**
 * @module dsl/schema/keywords
 * @description Keyword definitions for Mirror DSL
 */

import type { KeywordDefinition } from './types'

// =============================================================================
// KEYWORDS
// =============================================================================

export const KEYWORDS: Record<string, KeywordDefinition> = {
  // Control Flow
  if: { name: 'if', category: 'control', description: 'Bedingung' },
  then: { name: 'then', category: 'control', description: 'Dann-Zweig' },
  else: { name: 'else', category: 'control', description: 'Sonst-Zweig' },
  not: { name: 'not', category: 'control', description: 'Negation' },
  and: { name: 'and', category: 'control', description: 'Logisches UND' },
  or: { name: 'or', category: 'control', description: 'Logisches ODER' },
  each: { name: 'each', category: 'control', description: 'Iterator' },
  in: { name: 'in', category: 'control', description: 'In Collection' },
  where: { name: 'where', category: 'control', description: 'Filter-Bedingung' },

  // Timing
  debounce: { name: 'debounce', category: 'timing', description: 'Verzögert bis N ms nach letztem Event' },
  delay: { name: 'delay', category: 'timing', description: 'Verzögert um N ms' },

  // Targets
  self: { name: 'self', category: 'target', description: 'Das aktuelle Element' },
  next: { name: 'next', category: 'target', description: 'Nächstes Element' },
  prev: { name: 'prev', category: 'target', description: 'Vorheriges Element' },
  first: { name: 'first', category: 'target', description: 'Erstes Element' },
  last: { name: 'last', category: 'target', description: 'Letztes Element' },
  'first-empty': { name: 'first-empty', category: 'target', description: 'Erstes leeres Element' },
  highlighted: { name: 'highlighted', category: 'target', description: 'Hervorgehobenes Element' },
  selected: { name: 'selected', category: 'target', description: 'Ausgewähltes Element' },
  'self-and-before': { name: 'self-and-before', category: 'target', description: 'Selbst und alle davor' },
  all: { name: 'all', category: 'target', description: 'Alle Elemente' },
  'none': { name: 'none', category: 'target', description: 'Kein Element' },

  // Positions (Trigger-relative with -of suffix)
  'below-of': { name: 'below-of', category: 'position', description: 'Unterhalb des Referenz-Elements (open Dropdown below-of self)' },
  'above-of': { name: 'above-of', category: 'position', description: 'Oberhalb des Referenz-Elements (open Tooltip above-of Input)' },
  'left-of': { name: 'left-of', category: 'position', description: 'Links vom Referenz-Element (open Submenu left-of MenuItem)' },
  'right-of': { name: 'right-of', category: 'position', description: 'Rechts vom Referenz-Element (open Submenu right-of MenuItem)' },
  center: { name: 'center', category: 'position', description: 'Zentriert im Viewport (Modal-Style)' },
  // Legacy forms (deprecated, use -of suffix instead)
  below: { name: 'below', category: 'position', description: '[Deprecated: use below-of] Unterhalb des Triggers' },
  above: { name: 'above', category: 'position', description: '[Deprecated: use above-of] Oberhalb des Triggers' },
  left: { name: 'left', category: 'position', description: '[Deprecated: use left-of] Links vom Trigger' },
  right: { name: 'right', category: 'position', description: '[Deprecated: use right-of] Rechts vom Trigger' },
  cen: { name: 'cen', category: 'position', description: 'Zentriert (Kurzform für center)' },

  // Syntax
  from: { name: 'from', category: 'syntax', description: 'Vererbung' },
  as: { name: 'as', category: 'syntax', description: 'Inline Define + Render' },
  named: { name: 'named', category: 'syntax', description: 'Benannte Instanz' },
  state: { name: 'state', category: 'syntax', description: 'State-Block' },
  events: { name: 'events', category: 'syntax', description: 'Events-Block' },
  to: { name: 'to', category: 'syntax', description: 'Zuweisungsziel' },
}
