#!/bin/bash

#######################################
# Deploy Script für Mirror Studio
# Hostpoint.ch (Static only - localStorage)
#
# Usage:
#   ./deploy.sh           - Deployed Studio
#######################################

# Konfiguration
FTP_HOST="sl44.web.hostpoint.ch"
FTP_USER="ftp@ux-strategy.ch"
FTP_PASS="In2meinftp!!"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
STUDIO_DIR="$PROJECT_DIR/studio"
DIST_DIR="$PROJECT_DIR/dist"

#######################################
# Funktionen
#######################################

push_to_github() {
    echo ""
    echo "📦 Pushing to GitHub..."

    cd "$PROJECT_DIR"

    # Check for uncommitted changes - warn but don't auto-commit
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "⚠️  Uncommitted changes detected. Please commit manually before deploying."
        exit 1
    fi

    # Push to origin
    git push origin main
    if [ $? -ne 0 ]; then
        echo "❌ Git push failed!"
        read -p "Continue with deploy anyway? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo "✅ Pushed to GitHub"
    fi
}

check_lftp() {
    if ! command -v lftp &> /dev/null; then
        echo "❌ lftp ist nicht installiert."
        echo "Installation: brew install lftp"
        exit 1
    fi
}

build_compiler() {
    echo "🔨 Building Mirror Compiler..."
    cd "$PROJECT_DIR"
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build fehlgeschlagen!"
        exit 1
    fi
    echo "✅ Compiler gebaut"
}

deploy_studio() {
    echo ""
    echo "🚀 Deploying Studio..."

    # Build first
    build_compiler

    lftp <<EOF
set ftp:ssl-allow no
set ftp:passive-mode false
set net:timeout 10
set net:max-retries 2
open -u $FTP_USER,$FTP_PASS $FTP_HOST
mkdir -f mirror
mkdir -f mirror/dist
mkdir -f mirror/dist/browser

# Upload studio files to /mirror/
cd mirror
lcd $STUDIO_DIR
put index.html
put app.js
put styles.css
put logo.png
put tauri-bridge.js
put desktop-files.js

# Upload studio/dist (new architecture modules)
mkdir -f dist
cd dist
lcd $STUDIO_DIR/dist
put index.js
put mirror-defaults.css

# Upload compiled JS (the compiler) to /mirror/dist/browser/
cd /mirror/dist
mkdir -f browser
cd browser
lcd $DIST_DIR/browser
put index.global.js

quit
EOF

    echo "✅ Studio deployed!"
}

#######################################
# Script Start
#######################################

echo ""
echo "╔═══════════════════════════════════╗"
echo "║     Mirror Studio Deployment      ║"
echo "╚═══════════════════════════════════╝"
echo ""

# Push to GitHub first
push_to_github

check_lftp

deploy_studio

echo ""
echo "═══════════════════════════════════"
echo "🌐 Mirror Studio: http://ux-strategy.ch/mirror/"
echo "═══════════════════════════════════"
echo ""
