# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Open source community files (LICENSE, CODE_OF_CONDUCT, SECURITY)
- TypeScript strict mode compliance

### Fixed
- Replaced eval() with pre-compiled filter functions for security
- Table row/cell styling in IR transformation
- LLM integration uses proper AST-based React-to-Mirror converter

### Removed
- Unused static backend (was incomplete stub)

## [2.0.0-alpha.1] - 2024

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

## [1.0.0] - 2023

### Added
- Initial release
- Basic DSL parser
- DOM code generation
- Simple runtime
