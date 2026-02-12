/**
 * Vite Config for Editor Embed Bundle
 *
 * Builds a standalone JavaScript bundle that can be included in HTML docs.
 * Uses the full CodeMirror editor with syntax highlighting.
 *
 * Build: npm run build:embed
 * Output: dist/embed/mirror-editor.js
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist/embed',
    lib: {
      entry: resolve(__dirname, 'src/embed/editor.tsx'),
      name: 'MirrorEditor',
      fileName: () => 'mirror-editor.js',
      formats: ['iife'],
    },
    rollupOptions: {
      // Bundle everything including React
      external: [],
      output: {
        // Ensure single file output
        inlineDynamicImports: true,
        // Global names for externals (none in this case)
        globals: {},
      },
    },
    minify: 'esbuild',
  },
})
