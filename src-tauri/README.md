# Mirror Studio Desktop (Tauri 2)

Native Desktop-Shell für das Mirror Studio. Erlaubt das direkte Öffnen
von Mirror-Projektordnern (`.mir/.tok/.com/.data`) statt Browser-Import
über localStorage.

## Voraussetzungen

- **Rust** ≥ 1.77 (`rustup default stable`)
- **Node** ≥ 20 (für `npm run dev:studio:watch`)
- macOS / Linux / Windows (entwickelt + getestet auf macOS)

## Erststart

```bash
# Im Repo-Root:
npm install                 # zieht @tauri-apps/cli + concurrently
npm run tauri:dev           # baut Studio im Watch-Mode + startet Tauri-Fenster
```

Erstkompilierung der Tauri-Crates dauert 5–10 min. Danach inkrementell
(Studio: <1 s, Rust: 2–10 s je nach Edit).

## Smoke-Test

1. Im Tauri-Fenster: **File → Open Folder** (⌘O)
2. `examples/personas-informatik/` wählen
3. Erwartet:
   - File-Tree zeigt 4 Files: `app.mir`, `components.com`, `data.data`, `tokens.tok`
   - `personas.js` und `preview.html` sind gefiltert (Build-Artefakte)
   - Editor öffnet `app.mir`, Preview rendert die 5 Personas + TOC
   - Edit in `tokens.tok` → Preview-Update <500 ms
   - ⌘S oder Auto-Save schreibt zurück (`git status` zeigt geänderte Datei)

## Architektur

```
src-tauri/
├── Cargo.toml              ← tauri 2 + plugin-dialog + plugin-opener + tokio
├── tauri.conf.json         ← devUrl http://localhost:5173/studio/
├── capabilities/default.json ← core/dialog/opener Permissions
├── icons/icon.png          ← Placeholder (TODO: ersetzen vor Release)
└── src/
    ├── main.rs             ← Builder, Native-Menu, on_menu_event → emit('menu')
    ├── state.rs            ← AppState (basePath, recents, guard_path Sandbox)
    └── commands/
        ├── fs.rs           ← read/write/list/create/delete/rename/exists/info
        ├── project.rs      ← open_project, create_project, get_recent_projects
        ├── shell.rs        ← open_folder_in_explorer, open_in_browser
        └── window.rs       ← set_window_title
```

## Frontend-Vertrag

Die Bridge (`studio/tauri-bridge.ts`) ruft folgende Rust-Commands. Wenn
du die Bridge erweiterst, hier den Handler in `src/main.rs:invoke_handler!`
registrieren.

| Command                   | Args                | Return                                  |
| ------------------------- | ------------------- | --------------------------------------- |
| `read_file`               | `{ path }`          | `String`                                |
| `write_file`              | `{ path, content }` | `()`                                    |
| `list_directory`          | `{ path }`          | `{ path, files: [{name, is_dir}] }`     |
| `create_directory`        | `{ path }`          | `()`                                    |
| `delete_path`             | `{ path }`          | `()` (handled für Datei + Ordner)       |
| `rename_path`             | `{ from, to }`      | `()`                                    |
| `path_exists`             | `{ path }`          | `bool`                                  |
| `open_project`            | `{ path }`          | `()` — setzt basePath, schreibt Recents |
| `create_project`          | `{ name, path }`    | `String` (neuer Projekt-Pfad)           |
| `get_recent_projects`     | —                   | `Vec<String>`                           |
| `open_folder_in_explorer` | `{ path }`          | `()`                                    |
| `open_in_browser`         | `{ url }`           | `()`                                    |
| `set_window_title`        | `{ title }`         | `()`                                    |

Plugin-Dialog-Calls (`plugin:dialog|open` etc.) gehen direkt an
`tauri-plugin-dialog` — kein Custom-Wrapper.

## Native-Menü

Die Menu-IDs in `src/main.rs` müssen 1:1 mit dem Dispatch in
`studio/ui/desktop-menu.ts` übereinstimmen:

| ID                                                     | Frontend-Aktion                                     |
| ------------------------------------------------------ | --------------------------------------------------- |
| `open_folder`                                          | `desktopFiles.openFolder()` (⌘O)                    |
| `new_file`                                             | `desktopFiles.createFile('new.mirror')`             |
| `new_folder`                                           | `desktopFiles.createFolder('new-folder')`           |
| `save`                                                 | `desktopFiles.saveFile(currentFile, editorContent)` |
| `save_all`                                             | für alle Files in `desktopFiles.getFiles()`         |
| `toggle_prompt/files/code/components/preview/property` | Panel-Toggle                                        |

Beim Hinzufügen/Ändern eines Menu-Items: ID in **beiden** Stellen pflegen.

## Sandbox / Sicherheit

### FS-Sandbox

`AppState::guard_path` lehnt jeden FS-Call ab, dessen kanonisierter Pfad
nicht unter dem aktuell offenen Projekt-Ordner liegt. Damit kann die
WebView-JS nicht via `window.TauriBridge.fs.readFile('/etc/passwd')`
ausbrechen.

Symlink-Tricks werden durch beidseitiges `canonicalize()` aufgelöst.
Pinning-Tests in `src-tauri/src/state.rs` (`#[cfg(test)] mod tests`):
inside/outside/dotdot/symlink/non-existent — alle abgedeckt.

### File-Size-Limit

`commands::fs::MAX_FILE_BYTES` (16 MiB) gilt für `read_file` und
`write_file`. Verhindert, dass eine bösartige oder kaputte WebView den
Tokio-Worker mit einem Multi-GB-Read/Write blockiert
(`tokio::fs::read_to_string` würde die ganze Datei in einen einzigen
String allokieren). Mirror-Sources sind KB-skaliert; das Limit liegt
~3 Größenordnungen über realer Nutzung. Wenn ein legitimer Use-Case
mehr braucht: Limit erhöhen UND
`state::tests::max_file_bytes_constant_is_documented_value` updaten.

### Content-Security-Policy

Die WebView-CSP ist in `tauri.conf.json` → `app.security.csp` gesetzt
und schützt vor XSS in user-supplied Mirror-Code. Single Source of
Truth ist die Config; das Pinning-Testset
`tests/tauri-config/csp-policy.test.ts` validiert:

- `default-src 'self'` (keine Default-Permissivität)
- Whitelist der **tatsächlich genutzten** externen Hosts (esm.sh,
  cdnjs.cloudflare.com, unpkg.com, api.iconify.design, api.imgbb.com)
- `'unsafe-eval'` ist **bewusst** erlaubt — der Mirror-Compiler nutzt
  `new Function()` (siehe `compiler/runtime/data-binding.ts`,
  `compiler/backends/dom/runtime-template/index.ts`,
  `studio/compile/component-renderer.ts`)
- Hardening: `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri 'self'`, `form-action 'self'`

**Wenn du eine neue externe Dependency hinzufügst:** CSP in
`tauri.conf.json` erweitern UND den Host in
`tests/tauri-config/csp-policy.test.ts` zur entsprechenden
`REQUIRED_*_HOSTS`-Liste hinzufügen. Die Tests scheitern sonst.

### Agent-Commands

`commands::agent::{check_claude_cli, run_agent, cancel_agent}`
spiegeln den HTTP-Vertrag aus `scripts/ai-bridge-server.ts` direkt im
Rust-Backend. Browser-Modus nutzt weiter den HTTP-Shim
(`scripts/ai-bridge-server.ts` + `studio/test-api/cli-bridge-shim.ts`).

## TODO vor Distribution

- [ ] `bundle.active = true` in `tauri.conf.json` + echte Icons in `icons/`
      generieren (`cargo tauri icon path/to/source.png`)
- [ ] Code-Signing macOS: `tauri.conf.json:bundle.macOS.signingIdentity`
- [ ] Offline-fähigkeit: `@tauri-apps/api` lokal bündeln statt via
      `import('https://esm.sh/...')` (würde CSP weiter härten — esm.sh
      könnte aus `script-src` raus)

## Troubleshooting

**`failed to open icon … No such file or directory`** — Tauri-Macro will
zur Compile-Zeit eine Window-Icon-PNG. Liegt unter `src-tauri/icons/icon.png`.
Beim Klonen mitchecken.

**Studio-Bundle veraltet im Tauri-Fenster** — `dev:studio:watch` startet
drei Watcher (compiler iife / studio-tsup / serve). Bei Refresh-Problemen:
`npm run build:studio` einmal manuell + Tauri-Fenster neu laden (⌘R).

**`recents.json` korrupt** — Liegt in `~/Library/Application Support/ch.fhnw.mirror.studio/`
(macOS) bzw. `%APPDATA%/ch.fhnw.mirror.studio/` (Windows). Datei löschen,
Recents starten leer.
