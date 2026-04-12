import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['studio/index.ts'],
  format: ['esm'],
  outDir: 'studio/dist',
  splitting: true,  // Enable code splitting for lazy-loaded modules
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
  // Force bundling of ALL @zag-js and @atlaskit packages (not external)
  noExternal: [/^@zag-js\/.*/, /^@atlaskit\/.*/],

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
