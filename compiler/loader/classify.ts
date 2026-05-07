/**
 * Classify Top-Level Definitions
 *
 * Multi-File-Roadmap (siehe docs/multifile-roadmap.md): Mirror-Files haben
 * keine Datei-Endung mehr, die ihren Inhalt vorgibt. Stattdessen schaut der
 * Loader in den Inhalt jedes Files und ordnet jede Top-Level-Definition
 * einzeln einem von vier Buckets zu — Hybrid-Files (z.B. Token + Component +
 * Layout in einer Datei) sind explizit erlaubt und werden korrekt aufgeteilt.
 *
 * Der Mirror-Parser klassifiziert Top-Level-Knoten bereits beim Parsen in
 * separate AST-Felder (`tokens[]`, `components[]`, `instances[]`, …). Diese
 * Funktion ist daher kein zweiter Klassifikator — sie ist eine reine
 * Re-Bucketing-Projektion in das von der Roadmap erwartete 4er-Schema:
 *
 *     data        — Daten-Objekte (lowercase + indented sub-keys), $schema,
 *                   $icons. "Setup-Daten", die vor Tokens/Components da
 *                   sein müssen.
 *     tokens      — klassische Tokens (`name.bg: #...`) + Property-Sets
 *                   (`cardstyle: bg #..., pad 16`).
 *     components  — Component-Definitionen + Animation-Definitionen
 *                   (verhalten sich wie Komponenten, gleiche Phase).
 *     layouts     — `canvas`, Element-Instanzen, `each`/`if`-Blocks auf
 *                   Top-Level, Tabellen, Zag-Components.
 *
 * Reihenfolge im Output matcht das heutige `DIRECTORY_ORDER` aus
 * `compiler/preprocessor.ts`: `data → tokens → components → layouts`.
 */

import type {
  AST,
  CanvasDefinition,
  ComponentDefinition,
  AnimationDefinition,
  TokenDefinition,
  Instance,
  Slot,
  Each,
  ConditionalNode,
  ZagNode,
  TableNode,
  IconDefinition,
  SchemaDefinition,
} from '../parser/ast'

/**
 * Ein Daten-Objekt im Mirror-AST hat entweder `attributes` (key-value pairs)
 * oder `blocks` (markdown-content) — niemals einen skalaren `value`.
 *
 *     user:
 *       name: "Max"
 *       email: "max@example.com"
 *
 * Wird vom Parser als TokenDefinition mit attributes/blocks repräsentiert.
 */
export function isDataObject(token: TokenDefinition): boolean {
  return token.attributes !== undefined || token.blocks !== undefined
}

/**
 * Ein Property-Set bündelt mehrere Properties unter einem lowercase-Namen
 * ohne Suffix:
 *
 *     cardstyle: bg #1a1a1a, pad 16, rad 8
 *
 * Wird vom Parser als TokenDefinition mit `properties` repräsentiert.
 * Property-Sets werden in der gleichen Phase wie klassische Tokens geladen
 * (sie sind Mixins, die in Component- und Layout-Properties expandiert
 * werden), bleiben also im `tokens`-Bucket.
 */
export function isPropertySet(token: TokenDefinition): boolean {
  return token.properties !== undefined && token.value === undefined
}

/**
 * Eine klassische Token-Definition mit skalarem Wert:
 *
 *     primary.bg: #2271C1
 *     space.gap: 12
 *
 * Hat ein `value`-Feld (string | number | boolean) und KEINE attributes/
 * blocks/properties — letzteres würde es zu einem Data-Object (attributes/
 * blocks) oder Property-Set (properties) machen, die der Parser ebenfalls
 * als TokenDefinition repräsentiert.
 */
export function isPlainToken(token: TokenDefinition): boolean {
  return (
    token.value !== undefined &&
    token.attributes === undefined &&
    token.blocks === undefined &&
    token.properties === undefined
  )
}

// ============================================================================
// Output shape
// ============================================================================

/**
 * Layout-Bucket-Knoten — alles was in der Layout-Phase rendert. `Slot` ist
 * dabei: ein Slot kann auf Top-Level erscheinen (innerhalb einer
 * Component-Definition), aber wenn er in `instances[]` landet, ist es ein
 * Top-Level-Slot, der wie eine Layout-Instanz behandelt wird.
 */
export type LayoutNode = Instance | Slot | Each | ConditionalNode | ZagNode | TableNode

export interface ClassifiedDefinitions {
  /** Daten-Objekte, $schema, $icons — Setup-Daten, Phase 1. */
  data: (TokenDefinition | SchemaDefinition | IconDefinition)[]
  /** Klassische Tokens + Property-Sets — Phase 2. */
  tokens: TokenDefinition[]
  /** Component- + Animation-Definitionen — Phase 3. */
  components: (ComponentDefinition | AnimationDefinition)[]
  /** canvas + Element-Instanzen — Phase 4. */
  layouts: (CanvasDefinition | LayoutNode)[]
}

// ============================================================================
// classify
// ============================================================================

/**
 * Klassifiziert die Top-Level-Definitionen eines Mirror-Programs in die vier
 * Multi-File-Buckets. Pure Funktion — keine Seiteneffekte, keine Allokation
 * neuer AST-Knoten (Buckets enthalten Referenzen auf die Original-Knoten,
 * line/column-Positionen bleiben erhalten).
 *
 * @param ast Geparstes Mirror-Program (Output von `parse()` aus
 *            `compiler/parser/index.ts`).
 * @returns Vier Listen von Top-Level-Knoten, sortiert nach Lade-Phase.
 */
export function classify(ast: AST): ClassifiedDefinitions {
  const data: ClassifiedDefinitions['data'] = []
  const tokens: ClassifiedDefinitions['tokens'] = []
  const components: ClassifiedDefinitions['components'] = []
  const layouts: ClassifiedDefinitions['layouts'] = []

  // tokens[] vom Parser ist heute ein Mix aus drei Sub-Typen — wir
  // disambiguieren via die Predicates oben.
  for (const token of ast.tokens) {
    if (isDataObject(token)) {
      data.push(token)
    } else {
      // Klassische Tokens + Property-Sets bleiben im tokens-Bucket.
      tokens.push(token)
    }
  }

  // $schema und $icons sind eigene AST-Felder, gehören semantisch in data
  // (sie sind Setup, das vor Tokens/Components/Layouts vorhanden sein muss).
  if (ast.schema) data.push(ast.schema)
  for (const icon of ast.icons) data.push(icon)

  // Components + Animations laden in derselben Phase. Reihenfolge:
  // erst Components (häufiger), dann Animations.
  for (const component of ast.components) components.push(component)
  for (const animation of ast.animations) components.push(animation)

  // Layout-Phase: canvas zuerst (muss für Element-Instanzen verfügbar sein),
  // dann alle Top-Level-Instances.
  if (ast.canvas) layouts.push(ast.canvas)
  for (const instance of ast.instances) layouts.push(instance)

  return { data, tokens, components, layouts }
}
