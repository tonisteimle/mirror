#!/usr/bin/env bash
# Installiert das Mirror-Syntax-Bundle in CotEditors Sandbox-Container.
# CotEditor (sandboxed) kann nicht aus ~/Library/Application Support lesen,
# nur aus seinem eigenen Container — daher dieser Pfad.

set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE_NAME="Mirror.cotsyntax"
BUNDLE_SRC="$SOURCE_DIR/$BUNDLE_NAME"
TARGET_DIR="$HOME/Library/Containers/com.coteditor.CotEditor/Data/Library/Application Support/CotEditor/Syntaxes"

if [[ ! -d "$BUNDLE_SRC" ]]; then
  echo "Error: $BUNDLE_SRC fehlt" >&2
  exit 1
fi

if [[ ! -d "$HOME/Library/Containers/com.coteditor.CotEditor" ]]; then
  echo "Error: CotEditor scheint nicht installiert oder noch nie gestartet zu sein." >&2
  echo "Bitte CotEditor einmal öffnen, dann erneut ausführen." >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
rm -rf "$TARGET_DIR/$BUNDLE_NAME"
cp -R "$BUNDLE_SRC" "$TARGET_DIR/"

echo "✓ Installiert: $TARGET_DIR/$BUNDLE_NAME"

if pgrep -x CotEditor > /dev/null; then
  echo "→ CotEditor wird neu gestartet (cacht Syntaxes beim Launch)"
  pkill -x CotEditor || true
  sleep 1
  open -a CotEditor
else
  echo "→ Starte CotEditor neu, um die Syntax zu aktivieren"
fi
