#!/bin/bash

#######################################
# Deploy Script für Mirror Studio + Tutorial
# Hostpoint.ch (Static only - localStorage)
#
# Usage:
#   ./deploy.sh           - Deployed Studio + Tutorial
#######################################

# Konfiguration
FTP_HOST="sl44.web.hostpoint.ch"
FTP_USER="ftp@ux-strategy.ch"
FTP_PASS="In2meinftp!!"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
STUDIO_DIR="$PROJECT_DIR/studio"
DIST_DIR="$PROJECT_DIR/dist"
TUTORIAL_DIR="$PROJECT_DIR/docs/tutorial"
ASSETS_DIR="$PROJECT_DIR/assets"
TEMP_DIR="$PROJECT_DIR/.deploy-temp"

#######################################
# Funktionen
#######################################

prepare_tutorial() {
    echo ""
    echo "📝 Preparing tutorial files..."

    # Clean and create temp directory
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR/tutorial"

    # Copy tutorial files
    cp "$TUTORIAL_DIR"/*.html "$TEMP_DIR/tutorial/"
    cp "$TUTORIAL_DIR"/*.css "$TEMP_DIR/tutorial/"
    cp "$TUTORIAL_DIR"/*.js "$TEMP_DIR/tutorial/"
    cp "$TUTORIAL_DIR"/*.png "$TEMP_DIR/tutorial/" 2>/dev/null || true

    # Transform paths in HTML files:
    # ../../assets/ -> ../assets/
    # ../../dist/ -> ../dist/
    # ../../studio/ -> ../
    for file in "$TEMP_DIR/tutorial"/*.html; do
        sed -i '' 's|../../assets/|../assets/|g' "$file"
        sed -i '' 's|../../dist/|../dist/|g' "$file"
        sed -i '' 's|../../studio/|../|g' "$file"
    done

    # Transform paths in JS files (tutorial.js uses ../../studio/ and ../../assets/)
    for file in "$TEMP_DIR/tutorial"/*.js; do
        sed -i '' 's|../../studio/|../|g' "$file"
        sed -i '' 's|../../assets/|../assets/|g' "$file"
    done

    echo "✅ Tutorial files prepared"
}

cleanup_temp() {
    rm -rf "$TEMP_DIR"
}

push_to_github() {
    echo ""
    echo "📦 Pushing to GitHub..."

    cd "$PROJECT_DIR"

    # Check for uncommitted changes - warn but don't auto-commit
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "⚠️  Uncommitted changes detected. Please commit manually before deploying."
        exit 1
    fi

    # Push to origin (current branch)
    git push origin HEAD
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
    echo "🚀 Deploying Studio + Tutorial..."

    # Build first
    build_compiler

    # Prepare tutorial files with transformed paths
    prepare_tutorial

    lftp <<EOF
set ftp:ssl-allow no
set ftp:passive-mode false
set net:timeout 10
set net:max-retries 2
open -u $FTP_USER,$FTP_PASS $FTP_HOST
mkdir -f mirror
mkdir -f mirror/dist
mkdir -f mirror/dist/browser
mkdir -f mirror/tutorial
mkdir -f mirror/assets

# Upload studio files to /mirror/
cd mirror
lcd $STUDIO_DIR
put index.html
put app.js
put styles.css
put logo.png
put tauri-bridge.js
put desktop-files.js
put dialog.js
put cleanup.js

# Upload studio/dist (new architecture modules + chunks)
mkdir -f dist
cd dist
lcd $STUDIO_DIR/dist
mput *.js
put mirror-defaults.css

# Upload compiled JS (the compiler) to /mirror/dist/browser/
cd /mirror/dist
mkdir -f browser
cd browser
lcd $DIST_DIR/browser
put index.global.js

# Upload assets (CSS defaults)
cd /mirror
mkdir -f assets
cd assets
lcd $ASSETS_DIR
put mirror-defaults.css

# Upload tutorial files (from temp with transformed paths)
# First clean old tutorial files to remove stale content
cd /mirror
rm -rf tutorial
mkdir -f tutorial
cd tutorial
lcd $TEMP_DIR/tutorial
mput *.html
mput *.css
mput *.js
mput *.png

quit
EOF

    # Cleanup temp files
    cleanup_temp

    echo "✅ Studio + Tutorial deployed!"
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
echo "🌐 Mirror Studio:   http://ux-strategy.ch/mirror/"
echo "📚 Mirror Tutorial: http://ux-strategy.ch/mirror/tutorial/"
echo "═══════════════════════════════════"
echo ""
