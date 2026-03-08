# Mirror DSL

A design-focused UI language for rapid prototyping. Compiles to pure JavaScript, React, or static HTML.

## Quick Start

```bash
npm install
npm test        # Run 1000+ tests
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
├── src/
│   ├── parser/           # Lexer & Parser
│   ├── ir/               # Intermediate Representation
│   ├── backends/         # Code generators (DOM, React, Static)
│   └── studio/           # Visual editor components
├── docs/
│   └── tutorial.md       # DSL tutorial
├── features/             # Feature specifications
├── examples/             # Example Mirror projects
├── studio/               # Visual editor HTML
└── CLAUDE.md             # Complete language reference
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete language reference
- **[docs/tutorial.md](./docs/tutorial.md)** - Tutorial with examples
- **[docs/vision.md](./docs/vision.md)** - v2 architecture and vision

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
