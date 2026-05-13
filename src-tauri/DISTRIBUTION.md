# Mirror Studio — Distribution Setup

How to turn the dev-only Tauri shell into a shippable `.dmg` / `.app` /
`.msi` / AppImage. Currently the bundle pipeline is **disabled by default**
(`tauri.conf.json:bundle.active = false`) — dev builds work, distribution
builds fail loudly. This doc lists the steps to enable a real release.

## Status

- ✅ Tauri-CLI in devDependencies (`@tauri-apps/cli@^2`)
- ✅ Scripts wired: `npm run tauri:dev`, `npm run tauri:build`
- ✅ FS sandbox + CSP hardened
- ✅ Native menu + dialogs
- ⚠️ `bundle.active = false` — switch on when icons + signing ready
- ⚠️ Icons in `icons/` are 32×32 placeholders — regenerate from a real source
- ⚠️ No code-signing setup — Mac Gatekeeper will block unsigned `.app`

## Step 1 — Real icons

Tauri's bundler expects multiple sizes per OS:

| File                   | Used by                              |
| ---------------------- | ------------------------------------ |
| `icons/32x32.png`      | All platforms (also dev-window icon) |
| `icons/128x128.png`    | macOS Retina-display fallback        |
| `icons/128x128@2x.png` | macOS Retina-display                 |
| `icons/icon.icns`      | macOS `.app` bundle                  |
| `icons/icon.ico`       | Windows `.msi` / `.exe` bundle       |

**Easiest path** — let `tauri icon` generate them all from one square source:

```bash
# Need a 1024×1024 (or larger) square PNG as source. Place it anywhere.
npx tauri icon path/to/source-icon.png
```

This drops the full set into `src-tauri/icons/`. After running it, also
populate `tauri.conf.json:bundle.icon` (currently `[]`) with the
generated paths — Tauri reads this array at compile time, so adding
non-existent paths there will fail the build with
`failed to open icon … No such file or directory`:

```json
"icon": [
  "icons/32x32.png",
  "icons/128x128.png",
  "icons/128x128@2x.png",
  "icons/icon.icns",
  "icons/icon.ico"
]
```

## Step 2 — Switch the bundle on

In `tauri.conf.json`:

```diff
   "bundle": {
-    "active": false,
+    "active": true,
     "targets": ["dmg", "app"],
```

Test locally:

```bash
npm run tauri:build
# Output in src-tauri/target/release/bundle/
```

## Step 3 — Code-signing (macOS)

Without signing, Gatekeeper rejects the bundle with "cannot be opened
because the developer cannot be verified". For internal/test distribution
users can right-click → Open once, but a real public release needs:

1. Apple Developer account ($99/year)
2. Developer ID Application certificate in Keychain
3. Add to `tauri.conf.json:bundle.macOS`:
   ```json
   "macOS": {
     "minimumSystemVersion": "11.0",
     "signingIdentity": "Developer ID Application: Your Name (TEAMID)",
     "providerShortName": "TEAMID",
     "entitlements": "entitlements.plist"
   }
   ```
4. Optional but recommended: **notarization** — Apple-server-side malware
   scan, required for unattended distribution. Tauri docs:
   <https://tauri.app/distribute/sign/macos/>

## Step 4 — Code-signing (Windows)

Code-signing cert from a CA (DigiCert, Sectigo, etc., ~$200/year) +
`tauri.conf.json:bundle.windows`:

```json
"windows": {
  "certificateThumbprint": "...",
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.digicert.com"
}
```

## Step 5 — Offline-first hardening (optional)

Currently `studio/tauri-bridge.ts` imports `@tauri-apps/api` from
`esm.sh/@tauri-apps/api@2/...` at runtime. That means:

1. First launch needs internet.
2. CSP must whitelist `https://esm.sh` (it does).

To harden: install `@tauri-apps/api` as a real dependency, change
`studio/tauri-bridge.ts` to `import { invoke } from '@tauri-apps/api/core'`,
and drop `esm.sh` from CSP `script-src`/`style-src`/`font-src`. That
removes one external trust anchor and lets the app launch offline.

```bash
npm install --save @tauri-apps/api@^2
```

Then update the dynamic imports in `studio/tauri-bridge.ts` to static
imports. Make sure `tsup` bundles the studio output with these resolved.

## Step 6 — Auto-update

For a long-running release, Tauri 2 has `tauri-plugin-updater` with
signed-manifest auto-update. Not wired yet. See
<https://tauri.app/plugin/updater/> when needed.

---

## Checklist before first public build

- [ ] Real `icons/source.png` 1024×1024 commissioned + checked in
- [ ] `npx tauri icon icons/source.png` run, full icon set committed
- [ ] `bundle.active = true`
- [ ] macOS signing identity in `tauri.conf.json:bundle.macOS.signingIdentity`
- [ ] Local `npm run tauri:build` succeeds + produces signed `.dmg`
- [ ] Local install: drag-to-Applications + open without Gatekeeper warning
- [ ] Smoke-test: open Folder, edit file, AI edit (Claude CLI) all work
- [ ] (Optional) `@tauri-apps/api` bundled locally + CSP tightened
- [ ] (Optional) Notarization configured
- [ ] (Optional) Updater wired
