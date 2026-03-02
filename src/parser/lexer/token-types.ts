/**
 * @module token-types
 * @description Token-Typ-Definitionen für den Mirror DSL Lexer
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Definiert alle Token-Typen und reservierte Wörter
 *
 * Der Lexer erzeugt Tokens eines der hier definierten Typen.
 * Jeder Token hat: type, value, line, column
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN-KATEGORIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @category Identifier
 *   COMPONENT_NAME   Button, Card, Header
 *   COMPONENT_DEF    Button: (Definition am Zeilenanfang)
 *   MULTIPLE_DEF     Item*: (Wiederholbares Element)
 *   LIST_ITEM        - (Neue Instanz mit Strich)
 *
 * @category Values
 *   NUMBER           48, 200, 0.5, 50%
 *   STRING           "Label"
 *   MULTILINE_STRING 'Multi-line...'
 *   COLOR            #3B82F6, #F50, #3B82F680
 *   JSON_VALUE       [1, 2, 3] oder {key: value}
 *
 * @category Tokens/Variables
 *   TOKEN_REF        $primary, $user.name
 *   TOKEN_DEF        :name (inline Definition)
 *   TOKEN_VAR_DEF    $primary: (Token-Definition am Zeilenanfang)
 *
 * @category Properties
 *   PROPERTY         pad, gap, w, h, bg, col
 *   DIRECTION        l, r, u, d, l-r, u-d
 *   BORDER_STYLE     solid, dashed, dotted
 *
 * @category Structure
 *   PAREN_OPEN/CLOSE    ( )
 *   BRACKET_OPEN/CLOSE  [ ]
 *   BRACE_OPEN/CLOSE    { }
 *   COLON               :
 *   COMMA               ,
 *   NEWLINE             \n
 *   INDENT              Einrückung
 *   EOF                 Ende
 *
 * @category Behavior
 *   EVENT            onclick, onhover, onchange
 *   STATE            state (Keyword)
 *   EVENTS           events (Keyword für zentralen Block)
 *   CONTROL          if, not, and, or, else, each, in
 *   ANIMATION        slide-up, fade, scale, spin
 *   ANIMATION_ACTION show, hide, animate
 *
 * @category Operators
 *   OPERATOR         ==, !=, >, <, >=, <=
 *   ARITHMETIC       +, -, *, /
 *   ASSIGNMENT       =
 *
 * @category Errors
 *   ERROR            Lexer-Fehler
 *   UNKNOWN_EVENT    onclck (Tippfehler)
 *   UNKNOWN_PROPERTY paddin (Tippfehler)
 *   UNKNOWN_ANIMATION slideup (Tippfehler)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RESERVED WORDS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @purpose Verhindert false-positive Unknown-Token Meldungen
 *
 * @group Literals: true, false, null, undefined, none
 * @group DSL: self, to, from, as, named
 * @group CSS: auto, inherit, normal, bold, left, right
 * @group States: on, off, active, open, closed, selected
 * @group Values: cover, contain, pointer, solid, dashed
 * @group Keys: escape, enter, tab, space, backspace
 * @group Targets: next, prev, highlighted
 * @group Sizes: sm, md, lg, xl, xs
 */

/**
 * Reserved words that should never be flagged as unknown tokens.
 * Includes boolean literals, CSS keywords, state names, and property values.
 */
export const RESERVED_WORDS = new Set([
  // Literals
  'true', 'false', 'null', 'undefined', 'none',
  // DSL keywords
  'self', 'to', 'from', 'as', 'named', 'theme', 'use',
  // Doc-mode components (prevent 'doc' being seen as typo of 'col', etc.)
  'doc', 'text', 'playground',
  // CSS keywords
  'auto', 'inherit', 'initial', 'unset', 'revert',
  'normal', 'bold', 'medium', 'small', 'large',
  'left', 'right', 'top', 'bottom',
  // Common state names
  'on', 'off', 'active', 'inactive', 'open', 'closed', 'selected', 'unselected',
  'expanded', 'collapsed', 'checked', 'unchecked', 'enabled', 'hidden', 'visible',
  // Property values
  'cover', 'contain', 'fill', 'fit', 'stretch', 'center', 'repeat',
  'pointer', 'default', 'text', 'move', 'grab', 'grabbing',
  'solid', 'dashed', 'dotted', 'double',
  // Key modifiers (to prevent 'escape' being flagged as typo of 'scale')
  'escape', 'enter', 'tab', 'space', 'backspace', 'delete', 'home', 'end',
  // Behavior targets
  'next', 'prev', 'highlighted',
  // Shadow/size values
  'sm', 'md', 'lg', 'xl', 'xs', '2xl', '3xl'
])

export type TokenType =
  | 'COMPONENT_NAME'  // button, card, header
  | 'COMPONENT_DEF'   // Button: at start of line (component/style definition)
  | 'MULTIPLE_DEF'    // Item*: in definition (repeatable element)
  | 'LIST_ITEM'       // - at start of line (new instance)
  | 'PROPERTY'        // h, w, pad, gap, hor, ver, col
  | 'DIRECTION'       // l, r, u, d or combos like l-r, u-d
  | 'NUMBER'          // 48, 200
  | 'STRING'          // "Label"
  | 'MULTILINE_STRING' // 'Multi-line text with $token[formatting]'
  | 'COLOR'           // #3B82F6
  | 'TOKEN_REF'       // $primary, $dark, $user.avatar (token/variable reference)
  | 'TOKEN_DEF'       // :name (inline token definition)
  | 'TOKEN_VAR_DEF'   // $primary: at start of line (token variable definition)
  | 'SELECTOR'        // :id at start of line (element selector)
  | 'KEYWORD'         // after, before, from (insertion keywords)
  | 'BORDER_STYLE'    // solid, dashed, dotted (for compound border)
  | 'PAREN_OPEN'      // (
  | 'PAREN_CLOSE'     // )
  | 'BRACKET_OPEN'    // [
  | 'BRACKET_CLOSE'   // ]
  | 'BRACE_OPEN'      // {
  | 'BRACE_CLOSE'     // }
  | 'COLON'           // : (in object literals)
  | 'COMMA'           // , (optional separator between properties)
  | 'SEMICOLON'       // ; (statement separator for inline child overrides)
  | 'NEWLINE'
  | 'INDENT'
  | 'ERROR'           // Lexer error (e.g., unterminated string)
  | 'EOF'
  // New token types for actions/states
  | 'EVENT'           // onclick, onhover, etc.
  | 'STATE'           // state keyword
  | 'EVENTS'          // events keyword (for centralized event block)
  | 'KEYS'            // keys keyword (for grouped keyboard event handlers)
  | 'THEME'           // theme keyword (for theme block definition)
  | 'CONTROL'         // if, not, and, or, else, each, in
  | 'ANIMATION'       // slide-up, slide-down, fade, scale, spin, pulse, bounce
  | 'ANIMATION_ACTION' // show, hide, animate
  | 'ASSIGNMENT'      // =
  // V7: Heuristic token types for error-tolerant parsing
  | 'UNKNOWN_EVENT'     // onclck, onhovr (looks like event but invalid)
  | 'UNKNOWN_PROPERTY'  // paddin, colr (looks like property but invalid)
  | 'UNKNOWN_ANIMATION' // slideup, fde (looks like animation but invalid)
  | 'OPERATOR'        // ==, !=, >, <, >=, <=
  | 'ARITHMETIC'      // +, -, *, /
  | 'JSON_VALUE'      // Complete JSON array/object value for data tokens

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}
