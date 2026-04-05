# Contributing to Mirror

Thank you for your interest in contributing to Mirror! This guide will help you get started.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/mirror.git
   cd mirror
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build          # Build compiler
   npm run build:studio   # Build studio runtime
   ```

4. **Run tests**
   ```bash
   npm test               # Run all tests
   npm run typecheck      # Run TypeScript type checking
   ```

5. **Start the development server**
   ```bash
   npm run studio         # Start visual editor at localhost:5173
   ```

## Project Structure

```
compiler/               # Core Compiler (TypeScript)
├── parser/            # Lexer & Parser → AST
├── ir/                # AST → IR Transformation
├── backends/          # IR → DOM/React Code
├── runtime/           # DOM Runtime (Events, States)
├── validator/         # Schema-based Code Validator
├── schema/            # DSL Schema (Single Source of Truth)
└── studio/            # Property Panel, Code Modifier, SourceMap

studio/                # Studio Runtime (TypeScript)
├── core/              # State, Events, Commands, Executor
├── modules/           # Feature-Module
├── pickers/           # UI Pickers (Color, Token, Icon, Animation)
├── panels/            # UI Panels (Property, Tree, Files)
├── preview/           # Preview Controller & Renderer
├── editor/            # CodeMirror Controller
└── ...

tests/                 # Test Suite
├── compiler/          # IR & Backend Tests
├── studio/            # Studio Component Tests
└── e2e/               # Playwright E2E Tests
```

## How to Contribute

### Reporting Issues

- Search existing issues before creating a new one
- Use issue templates when available
- Include reproduction steps for bugs
- Provide Mirror code examples when relevant

### Pull Requests

1. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation if needed

3. **Run checks before committing**
   ```bash
   npm run typecheck
   npm test
   ```

4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add support for XYZ"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `test:` - Test additions/changes
   - `refactor:` - Code refactoring

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Prefer explicit types over `any`
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing

- Add unit tests in `tests/compiler/` for compiler changes
- Add unit tests in `tests/studio/` for studio changes
- Add E2E tests in `tests/e2e/` for user-facing features
- Tests should be independent and repeatable

### Documentation

- Update `CLAUDE.md` for language/syntax changes
- Add JSDoc comments for public APIs
- Include code examples in documentation

## Areas for Contribution

- **Compiler**: Parser improvements, new backends, optimizations
- **Studio**: UI components, editor features, visual tools
- **Testing**: Test coverage, E2E tests, edge cases
- **Documentation**: Tutorials, examples, API docs
- **DSL Schema**: New properties, primitives, Zag components

## Getting Help

- Check `CLAUDE.md` for complete language reference
- Review `tests/compiler/regeln.md` for documented rules
- Open an issue for questions

## Code of Conduct

Be respectful and constructive. We welcome contributors of all experience levels.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
