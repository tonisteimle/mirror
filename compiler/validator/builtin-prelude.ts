/**
 * Built-in Prelude
 *
 * Components and tokens that ship with Mirror and are always available
 * without any explicit definition. The validator seeds these into the
 * prelude so user code can reference them without false-positive
 * "Component not defined" errors.
 *
 * Sources:
 * - COMPONENT_TEMPLATES (Tabs, Dialog, Accordion, Select, …) and the
 *   sub-components used inside their template code (TabList, DialogTrigger, …)
 * - CHART_PRIMITIVES (Line, Bar, Pie, Donut, Area, Scatter, Radar) and
 *   CHART_SLOTS (XAxis, YAxis, Grid, Point, Legend, Title, Tooltip, …)
 * - ZAG_PRIMITIVES (DatePicker) and its SLOT_MAPPINGS slots
 * - Curated set of bare slot aliases accepted across Zag/template
 *   components (Trigger, Content, Backdrop, Body, Desc, …)
 */

import { COMPONENT_TEMPLATES } from '../schema/component-templates'
import { CHART_PRIMITIVES, CHART_SLOTS } from '../schema/chart-primitives'
import { ZAG_PRIMITIVES, SLOT_MAPPINGS } from '../schema/zag-primitives'
import { DSL } from '../schema/dsl'

/**
 * Bare slot aliases used inside Zag/template-driven components. Pure-Mirror
 * fixtures and tutorials reference these without redefining them
 * (`Dialog\n  Trigger: Button "Open"\n  Content: …`).
 */
const SLOT_ALIASES = [
  'Trigger',
  'Content',
  'Backdrop',
  'Title',
  'Body',
  'Desc',
  'Description',
  'Footer',
  'Header',
  'CloseTrigger',
  'Tab',
  'TabList',
  'TabPanel',
  'Item',
  'ItemTrigger',
  'ItemContent',
  'Indicator',
  'Label',
  'Control',
  'Input',
  'Positioner',
  'Root',
  'Row',
  // Pure-Mirror form components
  'Checkbox',
  'Switch',
  'RadioItem',
  'RadioGroup',
  'Option',
  'Value',
  'Field',
  // Pure-Mirror navigation
  'NavItem',
  'NavGroup',
  'SideNav',
  'TopNav',
  'AppShell',
  'Sidebar',
  'Main',
  // Pure-Mirror surfaces
  'Card',
  'Avatar',
  'Badge',
] as const

/**
 * Extract leading PascalCase identifiers from each line of a template code
 * block. These are the sub-component names referenced inside (e.g. parsing
 * `Tabs\n  TabList\n    TabTrigger "..."` yields TabList, TabTrigger).
 */
function extractTemplateSubcomponents(code: string): string[] {
  const names = new Set<string>()
  for (const rawLine of code.split('\n')) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue
    const match = /^([A-Z][A-Za-z0-9]*)\b/.exec(trimmed)
    if (match) names.add(match[1])
  }
  return [...names]
}

let cached: Set<string> | null = null

/**
 * Return the set of component names that are always available in any
 * Mirror source file. Memoised — composition of COMPONENT_TEMPLATES,
 * CHART_PRIMITIVES, CHART_SLOTS, ZAG_PRIMITIVES, SLOT_MAPPINGS, and the
 * curated SLOT_ALIASES list.
 */
export function getBuiltinComponents(): Set<string> {
  if (cached) return cached

  // Names that are real DSL primitives (Link, Button, Frame, Header, …) must
  // NOT be added to the prelude — the validator has primitive-specific
  // rules (REQUIRED_PROPERTIES on Link/Image, etc.) that use the
  // "in definedComponents" check to detect user-shadowing. Treating a
  // primitive as a prelude component would defeat that.
  const primitiveNames = new Set<string>()
  for (const [name, def] of Object.entries(DSL.primitives)) {
    primitiveNames.add(name)
    if ((def as { aliases?: string[] }).aliases) {
      for (const alias of (def as { aliases?: string[] }).aliases ?? []) {
        primitiveNames.add(alias)
      }
    }
  }

  const components = new Set<string>()
  const add = (name: string): void => {
    if (!primitiveNames.has(name)) components.add(name)
  }

  // Component templates (Tabs, Dialog, …) plus their sub-components.
  for (const [name, def] of Object.entries(COMPONENT_TEMPLATES)) {
    add(name)
    for (const sub of extractTemplateSubcomponents(def.code)) add(sub)
  }

  // Chart primitives (Line, Bar, Pie, …) and chart slots (XAxis, Legend, …).
  for (const name of Object.keys(CHART_PRIMITIVES)) add(name)
  for (const name of Object.keys(CHART_SLOTS)) add(name)

  // Zag primitives (DatePicker) and their slots.
  for (const name of Object.keys(ZAG_PRIMITIVES)) add(name)
  for (const slots of Object.values(SLOT_MAPPINGS)) {
    for (const slotName of Object.keys(slots)) add(slotName)
  }

  // Bare slot aliases used in pure-Mirror fixtures.
  for (const alias of SLOT_ALIASES) add(alias)

  cached = components
  return components
}

/**
 * Tokens always available without an explicit definition. None today —
 * placeholder for future built-in design tokens.
 */
export function getBuiltinTokens(): Set<string> {
  return new Set()
}

/**
 * Test-only: clear the memoisation cache so callers that mutate the
 * underlying registries between tests see fresh results.
 */
export function _resetBuiltinPreludeCache(): void {
  cached = null
}
