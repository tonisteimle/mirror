# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Compiler validator with prelude (`KNOWN_NON_SCHEMA_PROPERTIES`, `KNOWN_NON_SCHEMA_ACTIONS`) consolidating non-CSS prop/action handling
- Property-set tokens (`primary.bg`, `cardstyle: bg #1a1a1a, …`) replace the older `$primary: #hex` token form
- Pure-Mirror component templates (Checkbox, Switch, Dialog, Select, Tabs, …) — only DatePicker remains a Zag component
- Browser test framework (CDP-based, ~225 tests in <30s) replacing Playwright for studio E2E
- Open-source community files (LICENSE, CODE_OF_CONDUCT, SECURITY)
- TypeScript strict-mode compliance across compiler & studio

### Changed

- Parser refactored into focused sub-parsers (TokenParser, StateDetector, TernaryExpressionParser, DataObjectParser, PropertyParser, InlinePropertyParser) — Phase 5 in progress
- Runtime split into `dom-runtime.ts` (ES-module) and `dom-runtime-string.ts` (string-embed) for distinct compile-output channels
- Schema is the single source of truth: property-extractor (Studio), validator and code-generators all read from `compiler/schema/dsl.ts`
- Documentation reduced to active product docs only — historical project docs archived under `docs/archive/`

### Fixed

- `eval()` replaced with pre-compiled filter functions (security)
- Table row/cell styling in IR transformation
- LLM integration uses AST-based React-to-Mirror converter
- `navigate` import scope bug in `dom-runtime.ts` (re-export-from didn't bind locally)

### Removed

- Unused static backend (was an incomplete stub — DOM and React are the supported targets)

## [2.0.0-alpha.1] - 2025

### Added

- Complete DSL redesign for AI-assisted UI design
- Zag component integration for accessibility
- Mirror Studio with live preview
- Bidirectional editing (code ↔ preview)
- Property panel with pickers (color, token, icon, animation)
- SourceMap for accurate code-preview synchronization

### Changed

- New parser architecture (Lexer → Parser → AST → IR)
- Backend system (DOM, React, Framework)
- Schema-based validation

## [1.0.0] - 2024

### Added

- Initial release
- Basic DSL parser
- DOM code generation
- Simple runtime
