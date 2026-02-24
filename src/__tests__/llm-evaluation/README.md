# LLM Evaluation Test System

A fixture-based testing system for evaluating LLM-generated Mirror DSL code.

## Overview

This system uses a **hybrid approach**:
1. **Recording**: Capture real LLM responses as fixtures
2. **Review**: Manually verify fixture quality
3. **Evaluation**: Run deterministic tests against fixtures

## Directory Structure

```
llm-evaluation/
├── schema/              # TypeScript type definitions
│   ├── case.ts          # TestCase interface
│   ├── response.ts      # ResponseFixture interface
│   └── evaluation.ts    # EvaluationResult interface
├── fixtures/            # Test data
│   ├── nl-translation/
│   │   ├── cases.json   # Test case definitions
│   │   └── responses/   # Recorded LLM responses
│   ├── generation/
│   │   ├── cases.json
│   │   └── responses/
│   ├── syntax-correction/
│   │   ├── cases.json   # Typo/syntax error correction tests
│   │   └── responses/
│   └── js-builder/
├── utils/               # Core utilities
│   ├── evaluator.ts     # Output evaluation
│   ├── recorder.ts      # Response recording
│   └── mock-provider.ts # API mocking
├── runner/              # Test runners
│   └── fixture-test-runner.ts
└── suites/              # Vitest test files
    ├── nl-translation.test.ts
    ├── generation.test.ts
    └── syntax-correction.test.ts
```

## Usage

### 1. Record Fixtures

Record LLM responses for test cases:

```bash
# Record all cases for a pipeline
npm run llm:record -- --pipeline=nl-translation

# Record a specific case
npm run llm:record -- --pipeline=nl-translation --case=button-simple

# Overwrite existing fixtures
npm run llm:record -- --pipeline=nl-translation --overwrite

# Dry run (see what would be recorded)
npm run llm:record -- --pipeline=nl-translation --dry-run
```

**Prerequisites:**
- Set `OPENROUTER_API_KEY` environment variable

### 2. Run Evaluation Tests

```bash
# Run all evaluation tests
npm run llm:eval

# Watch mode
npm run llm:eval:watch
```

### 3. Review Fixtures

After recording, review fixtures manually:

1. Open `fixtures/<pipeline>/responses/<case-id>.json`
2. Check `response.processed` for quality
3. Set `review.reviewed: true` after verification
4. Optionally set `review.isGolden: true` for exemplary responses

## Test Case Definition

```json
{
  "id": "button-simple",
  "description": "Ein blauer Button",
  "pipeline": "nl-translation",
  "severity": "critical",
  "input": {
    "prompt": "Ein blauer Button",
    "context": {
      "tokens": "$primary: #3B82F6"
    }
  },
  "expect": {
    "parses": true,
    "validates": true,
    "contains": {
      "components": ["Button"],
      "properties": ["bg"]
    },
    "notContains": ["undefined", "error"]
  },
  "tags": ["button", "color"]
}
```

## Severity Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `critical` | Must always pass | Core functionality |
| `important` | Should pass | Common use cases |
| `normal` | Expected to pass | Standard cases |
| `edge-case` | May have issues | Edge cases, complex prompts |

## Evaluation Criteria

| Criterion | Description |
|-----------|-------------|
| `parses` | Code parses without errors |
| `validates` | Code validates without errors |
| `renders` | Code renders without React errors |
| `contains.components` | Required component types |
| `contains.properties` | Required properties |
| `contains.tokens` | Required token references |
| `contains.text` | Required text content |
| `notContains` | Forbidden strings (error indicators) |
| `structure.minDepth` | Minimum nesting depth |
| `structure.rootLayout` | Expected root layout direction |

## Adding New Test Cases

1. Edit `fixtures/<pipeline>/cases.json`
2. Add new case following the schema
3. Run `npm run llm:record -- --pipeline=<name> --case=<id>`
4. Review the recorded fixture
5. Run tests to verify

## Best Practices

1. **Start with critical cases**: Cover core functionality first
2. **Use realistic prompts**: Test with prompts users actually write
3. **Include context**: Test with and without token context
4. **Review fixtures**: Don't blindly trust LLM outputs
5. **Tag cases**: Use tags for filtering and organization
6. **Document edge cases**: Add skipReason when skipping

## Fixture Format

```json
{
  "caseId": "button-simple",
  "fixtureVersion": "1.0",
  "metadata": {
    "recordedAt": "2024-01-15T10:30:00Z",
    "model": "anthropic/claude-3.5-haiku",
    "latencyMs": 1234,
    "streaming": false
  },
  "response": {
    "raw": "```mirror\nButton bg #3B82F6, \"Click\"\n```",
    "processed": "Button bg #3B82F6, \"Click\"",
    "wasProcessed": true
  },
  "validation": {
    "parses": true,
    "validates": true,
    "componentsFound": ["Button"],
    "propertiesFound": ["bg"]
  },
  "review": {
    "reviewed": true,
    "reviewedBy": "developer",
    "reviewedAt": "2024-01-15T11:00:00Z",
    "isGolden": true,
    "notes": "Good example of simple button generation"
  }
}
```

## Extending the System

### Add New Pipeline

1. Create `fixtures/<pipeline>/cases.json`
2. Create test suite in `suites/<pipeline>.test.ts`
3. Add recording script support in `llm-record.ts`

### Add Custom Checks

Extend `utils/evaluator.ts`:

```typescript
function checkMyCustomCriterion(code: string, params: unknown): CheckResult {
  // Custom validation logic
  return passCheck('my-check') // or failCheck('my-check', 'reason')
}
```

## Troubleshooting

**"No fixtures recorded"**
→ Run `npm run llm:record -- --pipeline=<name>`

**"Missing fixture for case X"**
→ Run `npm run llm:record -- --pipeline=<name> --case=X`

**"API error 401"**
→ Check OPENROUTER_API_KEY is set correctly

**Tests skip but fixtures exist**
→ Check fixture file names match case IDs
