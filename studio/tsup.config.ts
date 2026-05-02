import { defineConfig } from 'tsup'

export default defineConfig({
  // dialog.ts and tauri-bridge.ts are separate entries — loaded directly
  // via <script type="module"> from index.html (so the artifacts must live
  // at studio/dist/dialog.js and studio/dist/tauri-bridge.js with stable
  // names) and imported by the .js sibling modules (app.js, desktop-files.js)
  // that aren't part of the main bundle.
  entry: ['studio/index.ts', 'studio/dialog.ts', 'studio/tauri-bridge.ts'],
  format: ['esm'],
  outDir: 'studio/dist',
  splitting: true, // Enable code splitting for lazy-loaded modules
  // Replace process.env.NODE_ENV for browser compatibility
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Bundle everything EXCEPT these packages (loaded via importmap)
  external: [
    'tom-select',
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/language',
    '@codemirror/commands',
    '@codemirror/autocomplete',
  ],
  // Force bundling of ALL @zag-js, @atlaskit, and @anthropic-ai packages (not external)
  noExternal: [/^@zag-js\/.*/, /^@atlaskit\/.*/, /^@anthropic-ai\/.*/],

  // FUTURE: Separate Compiler Bundle (~1.3MB savings)
  // To make the compiler external:
  // 1. Publish compiler to npm or host via esm.sh
  // 2. Add to index.html importmap:
  //    "mirror-lang": "https://esm.sh/mirror-lang@X.X.X"
  // 3. Add to external array: 'mirror-lang'
  // 4. Update all compiler imports to use 'mirror-lang' instead of relative paths
  // Current: Studio bundles compiler (~1.3MB) + studio code (~400KB) = ~1.7MB
  // Goal: Studio (~400KB) loads compiler separately, enabling caching
})
