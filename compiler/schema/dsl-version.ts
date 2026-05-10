/**
 * Mirror DSL Version
 *
 * Mirror's product pitch — "AI generates code, designers tweak it" —
 * only works long-term if the DSL is **syntactically stable**. Code an
 * AI generates against today's spec must still parse + render in 6
 * months. Without an explicit version, every parser-slice quietly risks
 * breaking the assumed contract.
 *
 * `DSL_VERSION` is the contract handle. Every spec-bundle written by
 * `tools/export.ts` embeds it in the manifest, every documentation
 * surface that AI ingests can cite it, and a future change-detector
 * test can flag PRs that touch parser/AST/keyword-set without bumping
 * the version (Slice 4 of this work — out of scope for now, but the
 * version field is the prerequisite).
 *
 * Versioning rule (SemVer applied to a DSL):
 *
 *   MAJOR — break: removing a keyword/primitive, changing what valid
 *           syntax means, narrowing accepted forms. Old code stops
 *           parsing or renders differently.
 *   MINOR — additive: new property/keyword/primitive/state. Old code
 *           keeps working unchanged.
 *   PATCH — fix: validator-warning corrections, schema-coherence
 *           improvements, wording. Identical accepted-grammar.
 *
 * Bumping policy: any PR that changes parser tokens, AST node shapes,
 * `compiler/schema/dsl.ts`, or `compiler/schema/property-schema.ts`
 * must declare its impact in the commit message and bump accordingly.
 * Routine refactors that don't change the external contract leave
 * the version alone.
 *
 * The version intentionally lives in its own file (not buried inside
 * `dsl.ts`) so a `git log compiler/schema/dsl-version.ts` reveals the
 * full DSL evolution history at a glance.
 */

/** SemVer string. Bump rules above. */
export const DSL_VERSION = '1.0.0' as const

/** Parsed major version — useful for bundle consumers that want to
 *  refuse spec-bundles from a future major they can't handle. */
export const DSL_MAJOR = parseInt(DSL_VERSION.split('.')[0], 10)
