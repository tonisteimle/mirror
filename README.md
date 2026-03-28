# Mirror DSL

A design-focused UI language for rapid prototyping. Compiles to pure JavaScript, React, or static HTML.

## Quick Start

```bash
npm install
npm test        # Run tests
npm run build   # Build compiler
npm run studio  # Start visual editor at localhost:5173
```

## Usage

```javascript
import { compile, parse, generateDOM, generateReact } from 'mirror-lang'

// Simple compilation
const jsCode = compile(`
$primary: #3B82F6

Button: pad 12, bg $primary, rad 8
    state hover bg #2563EB

Button "Click me"
`)

// Or step by step
const ast = parse(source)
const domCode = generateDOM(ast)
const reactCode = generateReact(ast)
```

## Project Structure

```
Mirror/
├── src/           # Core Compiler
│   ├── parser/    # Lexer & Parser
│   ├── ir/        # Intermediate Representation
│   ├── backends/  # Code generators (DOM, React, Static)
│   └── schema/    # DSL Schema
├── studio/        # Visual Editor
├── tests/         # Test Suite
├── packages/      # NPM Packages
│   └── mirror-lang/
└── CLAUDE.md      # Complete Language Reference
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete language reference and DSL syntax

## Syntax Example

```mirror
// Tokens (design variables)
$primary: #3B82F6
$surface: #1a1a23

// Component definition
Card: pad 16, bg $surface, rad 8
    state hover bg #333

// Inheritance
DangerButton as Button: bg #EF4444

// Instance with children
Card
    Text "Hello World"
    Button "Click me"
```

## License

MIT
