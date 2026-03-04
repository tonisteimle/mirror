# Mirror DSL

A design-focused UI language for rapid prototyping.

## Quick Start

```bash
cd packages/mirror-lang
npm install
npm test        # Run 1320+ tests
```

Open `packages/mirror-lang/playground.html` in a browser to try the live editor.

## Project Structure

```
Mirror/
├── packages/mirror-lang/     # Core compiler
│   ├── src/
│   │   ├── parser/          # Lexer & Parser
│   │   ├── ir/              # Intermediate Representation
│   │   └── backends/        # Code generators (DOM, React)
│   └── playground.html      # Live editor
├── docs/
│   └── tutorial.md          # DSL documentation
└── CLAUDE.md                # Language reference
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete language reference
- **[docs/tutorial.md](./docs/tutorial.md)** - Tutorial with examples
