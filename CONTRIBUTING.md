# Contributing to Mirror

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Mirror

# Install dependencies
npm install

# Copy environment file and add your API key
cp .env.example .env.local
# Edit .env.local and add your OpenRouter API key
```

### Development Commands

```bash
# Start development server
npm run dev

# Run unit tests (watch mode)
npm test

# Run unit tests (single run)
npm run test:run

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run all tests
npm run test:all

# Lint code
npm run lint

# Build for production
npm run build

# Analyze bundle size
npm run build:analyze
```

## Project Structure

```
src/
├── components/     # React UI components
├── containers/     # Layout containers
├── editor/         # CodeMirror integration
├── generator/      # AST → React rendering
├── hooks/          # React custom hooks
├── lib/            # External service integrations (AI)
├── library/        # Pre-built component library
├── parser/         # DSL → AST parser
├── services/       # Application services (logging, errors)
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── validation/     # DSL validation & correction
```

## Code Style Guidelines

### TypeScript

- Use strict TypeScript (`strict: true`)
- Avoid `any` types - use `unknown` and type guards instead
- Prefer interfaces over type aliases for object shapes
- Export types separately from implementations

### React

- Use functional components with hooks
- Wrap components with `React.memo` when they receive stable props
- Use `useMemo` and `useCallback` for expensive computations and callbacks
- Avoid inline functions in render for frequently re-rendered components

### Naming Conventions

- Components: PascalCase (`ColorPicker.tsx`)
- Hooks: camelCase with `use` prefix (`useHistory.ts`)
- Utils: camelCase (`fuzzy-search.ts`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_HISTORY_SIZE`)

### File Organization

- One component per file
- Co-locate tests with source files (`__tests__/`)
- Keep files under 400 lines when possible
- Extract large components into smaller sub-components

## Testing

### Unit Tests

- Test parsing logic thoroughly
- Test utility functions with edge cases
- Use `@testing-library/react` for component tests

### E2E Tests

- Cover critical user workflows
- Use Playwright for browser automation
- Test on multiple viewport sizes

## Commit Messages

Follow conventional commits:

```
feat: add color picker component
fix: resolve memory leak in overlay registry
refactor: extract style composition logic
docs: update README with new features
test: add parser edge case tests
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with tests
3. Run `npm run lint` and `npm run test:all`
4. Submit PR with clear description
5. Address review feedback
6. Squash and merge when approved

## Architecture Decisions

### Parser

The DSL parser uses a multi-phase approach:
1. Lexer tokenizes input
2. Parser builds AST
3. Validator checks semantics
4. Corrector fixes common issues

### Generator

The generator transforms AST to React:
1. Behavior handlers for library components
2. Style composition from properties
3. Event binding for interactivity
4. Conditional/iterator rendering

### State Management

- React hooks for local state
- Context for shared state (registries)
- localStorage for persistence
- History stack for undo/redo

## Getting Help

- Check existing issues for similar problems
- Include reproduction steps in bug reports
- Provide minimal code examples when possible
