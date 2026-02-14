/**
 * Token type definitions and constants for the Mirror DSL lexer.
 */

/**
 * Reserved words that should never be flagged as unknown tokens.
 * Includes boolean literals, CSS keywords, state names, and property values.
 */
export const RESERVED_WORDS = new Set([
  // Literals
  'true', 'false', 'null', 'undefined', 'none',
  // DSL keywords
  'self', 'to', 'from', 'as', 'named',
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
  | 'NEWLINE'
  | 'INDENT'
  | 'ERROR'           // Lexer error (e.g., unterminated string)
  | 'EOF'
  // New token types for actions/states
  | 'EVENT'           // onclick, onhover, etc.
  | 'STATE'           // state keyword
  | 'EVENTS'          // events keyword (for centralized event block)
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
