/**
 * AI Features Test Suite Index
 *
 * Browser-tests für den LLM-Edit-Flow.
 *
 * - `allAITests` — Tests die ohne externe Infrastruktur laufen (heute leer;
 *   die Vitest-Suite deckt die Logik-Schicht ab). In `--all`-Runs enthalten.
 * - `realLlmEditFlowTests` — Browser-E2E gegen ECHTE `claude` CLI via
 *   `npm run ai-bridge`. **NICHT** in `allAITests` — explizit über
 *   Kategorie `ai.realLlm` aufrufen, weil die Tests langsam (5-15 s pro
 *   Scenario) sind und externe Infra (Bridge-Server, claude CLI) brauchen.
 */

import type { TestCase } from '../../types'

export { realLlmEditFlowTests } from './edit-flow-real-llm.test'

export const allAITests: TestCase[] = []
