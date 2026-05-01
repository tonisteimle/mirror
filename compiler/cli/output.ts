/**
 * CLI Output — ANSI colors, help, version.
 */

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

export function c(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

export function printVersion(): void {
  console.log('mirror-compile v2.0.0')
}

export function printHelp(): void {
  console.log(`
${c('Mirror Compiler', 'bold')} ${c('v2.0.0', 'dim')}

${c('USAGE:', 'yellow')}
  mirror-compile <files...> [options]
  mirror-compile --project <dir> [options]

${c('ARGUMENTS:', 'yellow')}
  <files...>             Input file(s) to compile

${c('FILE TYPES:', 'yellow')}
  Layout/App:   .mir, .mirror     UI layouts and app structure
  Tokens:       .tok, .tokens     Design tokens (colors, spacing)
  Components:   .com, .components Reusable component definitions
  Data:         .yaml, .yml       Structured data sources

${c('OPTIONS:', 'yellow')}
  -o, --output <file>    Output file (default: stdout)
  -p, --project <dir>    Compile project directory
  -r, --react            Generate React components
  -d, --dom              Generate DOM JavaScript (default)
  -w, --watch            Watch for changes and recompile
  -v, --verbose          Verbose output
  -m, --minify           Minify output (coming soon)
  -s, --source-map       Generate source map (coming soon)
  -h, --help             Show this help
  -V, --version          Show version

${c('EXAMPLES:', 'yellow')}
  ${c('# Compile single file to stdout', 'dim')}
  mirror-compile app.mir

  ${c('# Compile to output file', 'dim')}
  mirror-compile app.mir -o dist/app.js

  ${c('# Compile multiple files (order matters!)', 'dim')}
  mirror-compile tokens.tok components.com app.mir -o dist/bundle.js

  ${c('# Compile project directory', 'dim')}
  mirror-compile --project examples/task-app -o dist/task-app.js

  ${c('# Generate React components', 'dim')}
  mirror-compile app.mir --react -o App.tsx

  ${c('# Watch mode', 'dim')}
  mirror-compile app.mir -o dist/app.js --watch

${c('PROJECT STRUCTURE:', 'yellow')}
  When using --project, files are processed in dependency order:
    1. data/       → Data sources (.yaml, .yml)
    2. tokens/     → Design tokens (.tok, .tokens)
    3. components/ → Components (.com, .components)
    4. layouts/    → Layouts (.mir, .mirror)
    5. screens/    → Screen layouts (.mir, .mirror)
    6. Root files  → App entry points

${c('OUTPUT:', 'yellow')}
  DOM backend generates vanilla JavaScript that can be:
    - Included via <script> tag
    - Imported as ES module
    - Used with any bundler

  React backend generates TypeScript/JSX components.
`)
}
