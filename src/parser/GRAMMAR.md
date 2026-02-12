# Mirror DSL Grammar Specification

This document provides a formal grammar specification for the Mirror DSL in Extended Backus-Naur Form (EBNF).

## Notation

- `|` = alternation (or)
- `[ ]` = optional
- `{ }` = zero or more repetitions
- `( )` = grouping
- `"..."` = terminal string
- `/.../` = regular expression

## Lexical Elements

```ebnf
(* Basic tokens *)
COMPONENT_NAME  = /[A-Z][a-zA-Z0-9_]*/
PROPERTY        = /[a-z][a-z0-9_]*/
MODIFIER        = "-" /[a-z][a-zA-Z0-9]*/
NUMBER          = /[0-9]+/
STRING          = '"' /[^"]*/ '"'
COLOR           = "#" /[0-9a-fA-F]{3,8}/
TOKEN_REF       = "$" /[a-zA-Z][a-zA-Z0-9_.\-]*/
TOKEN_VAR_DEF   = "$" /[a-zA-Z][a-zA-Z0-9_\-]*/ ":"
COMPONENT_DEF   = COMPONENT_NAME ":"
SELECTOR        = ":" /[a-zA-Z_][a-zA-Z0-9_]*/

(* Control keywords *)
IF              = "if"
ELSE            = "else"
EACH            = "each"
IN              = "in"
NOT             = "not"
AND             = "and"
OR              = "or"

(* State keywords *)
STATE           = "state"
EVENTS          = "events"

(* Action keywords *)
OPEN            = "open"
CLOSE           = "close"
TOGGLE          = "toggle"
CHANGE          = "change"
TO              = "to"
PAGE            = "page"
SHOW            = "show"
HIDE            = "hide"

(* Event keywords *)
EVENT           = "on" /[a-z]+/   (* onclick, onhover, onchange, etc. *)

(* Operators *)
ASSIGNMENT      = "="
OPERATOR        = "==" | "!=" | ">" | "<" | ">=" | "<="
ARITHMETIC      = "+" | "-" | "*" | "/"

(* Whitespace *)
NEWLINE         = "\n"
INDENT          = /[ \t]+/    (* at start of line *)
COMMENT         = "//" /[^\n]*/

(* Special *)
PAREN_OPEN      = "("
PAREN_CLOSE     = ")"
COMMA           = ","
LIST_ITEM       = "-"
```

## Grammar Rules

### Top Level

```ebnf
Program         = { Statement } EOF

Statement       = TokenDefinition
                | ComponentDefinition
                | ComponentInstance
                | SelectionCommand
                | EventsBlock
                | NEWLINE
                | Comment

Comment         = "//" { any character except newline }
```

### Token Definitions

```ebnf
TokenDefinition = TOKEN_VAR_DEF Value NEWLINE

Value           = NUMBER
                | STRING
                | COLOR
                | TOKEN_REF
                | TokenSequence

TokenSequence   = Value { Value }
```

### Component Definitions

```ebnf
ComponentDefinition = COMPONENT_DEF [ InheritClause ] Properties NEWLINE
                      [ Children ]

InheritClause   = "from" COMPONENT_NAME

Properties      = { Property | Modifier | StyleGroup | StyleRef }

Property        = PROPERTY [ PropertyValue ]

PropertyValue   = NUMBER
                | STRING
                | COLOR
                | TOKEN_REF
                | DirectionValue
                | Expression

DirectionValue  = Direction [ Direction ]

Direction       = "l" | "r" | "u" | "d"
                | "l-r" | "u-d" | "l-r-u-d" | ...

Modifier        = MODIFIER

StyleGroup      = PAREN_OPEN Properties PAREN_CLOSE [ ":" IDENTIFIER ]

StyleRef        = IDENTIFIER   (* reference to defined style *)
```

### Component Instances

```ebnf
ComponentInstance = [ LIST_ITEM ] COMPONENT_NAME [ InstanceName ]
                    Properties [ InlineString ] NEWLINE
                    [ Children ]

InstanceName    = COMPONENT_NAME   (* for named instances like Input Email *)

InlineString    = STRING

Children        = INDENT { ComponentInstance | Conditional | Iterator } DEDENT
```

### Conditionals

```ebnf
Conditional     = "if" ConditionExpr NEWLINE Children
                  [ "else" NEWLINE Children ]

ConditionExpr   = [ "not" ] Variable
                | ConditionExpr ( "and" | "or" ) ConditionExpr
                | Comparison

Comparison      = Expression OPERATOR Expression

Variable        = TOKEN_REF
                | IDENTIFIER
```

### Iterators

```ebnf
Iterator        = "each" TOKEN_REF "in" TOKEN_REF NEWLINE Children
```

### States and Events

```ebnf
StateDefinition = "state" IDENTIFIER NEWLINE
                  INDENT Properties [ Children ] DEDENT

EventHandler    = EVENT NEWLINE
                  INDENT { ActionStatement | Conditional } DEDENT

ActionStatement = OpenAction
                | CloseAction
                | ToggleAction
                | ChangeAction
                | PageAction
                | ShowAction
                | HideAction
                | Assignment

OpenAction      = "open" IDENTIFIER [ AnimationOptions ]
CloseAction     = "close" IDENTIFIER [ AnimationOptions ]
ToggleAction    = "toggle" IDENTIFIER
ChangeAction    = "change" IDENTIFIER "to" IDENTIFIER
PageAction      = "page" IDENTIFIER
ShowAction      = "show" IDENTIFIER
HideAction      = "hide" IDENTIFIER

AnimationOptions = [ Animation ] [ Position ] [ Duration ]

Animation       = "slide-up" | "slide-down" | "slide-left" | "slide-right"
                | "fade" | "scale" | "none"

Position        = "below" | "above" | "left" | "right" | "center"

Duration        = NUMBER

Assignment      = IDENTIFIER "=" Expression
                | IDENTIFIER "." IDENTIFIER "=" Expression
```

### Centralized Events Block

```ebnf
EventsBlock     = "events" NEWLINE
                  INDENT { InstanceEvent } DEDENT

InstanceEvent   = IDENTIFIER EVENT NEWLINE
                  INDENT { ActionStatement | Conditional } DEDENT
```

### Expressions

```ebnf
Expression      = Literal
                | Variable
                | PropertyAccess
                | BinaryExpression

Literal         = NUMBER | STRING | "true" | "false"

Variable        = TOKEN_REF
                | IDENTIFIER

PropertyAccess  = TOKEN_REF "." IDENTIFIER
                | IDENTIFIER "." IDENTIFIER

BinaryExpression = Expression ARITHMETIC Expression
```

### Selection Commands

```ebnf
SelectionCommand = SELECTOR Property PropertyValue NEWLINE
                 | SELECTOR "after" COMPONENT_NAME [ Properties ] NEWLINE
                 | SELECTOR "before" COMPONENT_NAME [ Properties ] NEWLINE
```

## Property Reference

### Layout Properties
```
hor     - Horizontal layout
ver     - Vertical layout (default)
gap     - Gap between children
wrap    - Flex wrap
grow    - Flex grow
```

### Alignment Properties
```
hor-l, hor-cen, hor-r   - Horizontal alignment
ver-t, ver-cen, ver-b   - Vertical alignment
cen                      - Center both axes
between                  - Space between
```

### Spacing Properties
```
pad     - Padding (all sides or with direction: l-r, u-d)
mar     - Margin (all sides or with direction)
```

### Size Properties
```
w       - Width
h       - Height
min-w   - Minimum width
max-w   - Maximum width
min-h   - Minimum height
max-h   - Maximum height
```

### Color Properties
```
col     - Text color (always)
bg      - Background color (always)
boc     - Border color
```

### Border Properties
```
bor     - Border width
rad     - Border radius
```

### Text Properties
```
size    - Font size
weight  - Font weight (light, normal, medium, semibold, bold)
```

### Position Properties
```
z       - Z-index
```

## Examples

### Basic Component
```mirror
Box pad 16 gap 8 col #1F2937
  Text "Hello" size 18 weight bold
  Button "Click me" pad 8 rad 4
```

### Token Definitions
```mirror
$primary: #3B82F6
$spacing: 16
$card-pad: 24

Card pad $card-pad col $primary
```

### Component Definition with Inheritance
```mirror
Button: hor cen pad 8 rad 4 col #3B82F6

PrimaryButton: from Button
  col #10B981

Box
  Button "Default"
  PrimaryButton "Success"
```

### Conditional Rendering
```mirror
Box
  if $isLoggedIn
    Text "Welcome back!"
  else
    Button "Log in"
```

### Iteration
```mirror
$items: [{ name: "Apple" }, { name: "Banana" }]

Box
  each $item in $items
    Text $item.name
```

### Event Handling
```mirror
Input Email:

events
  Email onchange
    email = Email.value
```

## Version History

- v1.0: Initial grammar specification
- v1.1: Added comment support, improved error recovery
