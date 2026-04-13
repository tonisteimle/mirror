import { defineConfig } from 'tsup'

export default defineConfig([
  // ESM build for Node.js
  {
    entry: ['compiler/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
  },
  // CLI build
  {
    entry: ['compiler/cli.ts'],
    format: ['esm'],
    banner: {
      js: '#!/usr/bin/env node',
    },
    clean: false,
  },
  // IIFE build for browsers
  {
    entry: ['compiler/index.ts'],
    format: ['iife'],
    globalName: 'MirrorLang',
    outDir: 'dist/browser',
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.BABEL_TYPES_8_BREAKING': 'false',
      'process.env.DEBUG': '""',
      'process.env.FORCE_COLOR': '"false"',
      process: 'undefined',
    },
    // Inject a minimal process shim
    banner: {
      js: 'var process = { env: { NODE_ENV: "production", BABEL_TYPES_8_BREAKING: false, DEBUG: "", FORCE_COLOR: "false" } };',
    },
  },
])
