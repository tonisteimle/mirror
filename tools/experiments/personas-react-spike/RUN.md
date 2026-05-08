# Personas → React+Tailwind Spike

Standalone test of the Mirror → real-code pipeline. Bundle is in
`./bundle/`. Output goes to `./bundle/generated/`.

## Run

```bash
cd tools/experiments/personas-react-spike/bundle

claude --print "$(cat <<'EOF'
You are an expert React+TypeScript+Tailwind engineer.

Read INSTRUCTIONS.md, MIRROR-BRIEF.md, target.json, source/*, and
visual-reference.html in this directory. Then execute the 6-step pipeline
from INSTRUCTIONS.md. Use the Edit/Write tools to create files. Use the
Bash tool to install deps, run tsc, and run the build. Stop only when
all gates from INSTRUCTIONS.md are green or you genuinely cannot proceed
without human input.

Working directory is the bundle root. Output goes to ./generated/.
EOF
)"
```

The `claude` CLI runs the agent locally with full filesystem + bash access
in this folder. Login uses your existing Claude Code auth — no API key.

## Verify

```bash
cd bundle/generated
npm install
npm run dev          # localhost preview
npm run build        # production build
npx tsc --noEmit     # type-check
```

Open `http://localhost:5173` next to `bundle/visual-reference.html` and
compare.

## Iterate

If output is bad: the question is _which file_ in the bundle was insufficient.

- LLM hallucinated Mirror semantics → enrich `MIRROR-BRIEF.md`
- LLM picked weird file structure → tighten step-1 plan in `INSTRUCTIONS.md`
- LLM ignored visual reference → add captured render-snapshot
- LLM ran into framework idiom problem → add target-specific notes to `target.json`

The bundle is the contract. Fix the bundle, rerun.
