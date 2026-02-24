#!/bin/bash

#######################################
# Deploy Script für Mirror
# Hostpoint.ch Static Site
#
# Usage:
#   ./deploy.sh        - Deployed alles (App + Docs)
#   ./deploy.sh app    - Deployed nur die App
#   ./deploy.sh docs   - Deployed nur die Dokumentation
#######################################

# Konfiguration
FTP_HOST="sl44.web.hostpoint.ch"
FTP_USER="ftp@ux-strategy.ch"
FTP_PASS="In2meinftp!!"

PROJECT_DIR="$(dirname "$0")"
DIST_DIR="$PROJECT_DIR/dist"
DOCS_DIR="$PROJECT_DIR/docs"

#######################################
# Funktionen
#######################################

check_lftp() {
    if ! command -v lftp &> /dev/null; then
        echo "❌ lftp ist nicht installiert."
        echo "Installation: brew install lftp"
        exit 1
    fi
}

deploy_app() {
    echo "🔨 Building Mirror App..."
    echo ""

    cd "$PROJECT_DIR"
    npm run build

    if [ $? -ne 0 ]; then
        echo "❌ Build fehlgeschlagen!"
        exit 1
    fi

    if [ ! -d "$DIST_DIR" ]; then
        echo "❌ Dist Ordner nicht gefunden: $DIST_DIR"
        exit 1
    fi

    FILE_COUNT=$(find "$DIST_DIR" -type f | wc -l)
    echo ""
    echo "🚀 Deploying App ($FILE_COUNT Dateien)..."
    echo ""

    lftp <<EOF
set ftp:ssl-allow no
set ftp:passive-mode false
set net:timeout 10
set net:max-retries 2
open -u $FTP_USER,$FTP_PASS $FTP_HOST
mkdir -f mirror/app
cd mirror/app
lcd $DIST_DIR
mirror --reverse --verbose --delete --parallel=5
quit
EOF

    echo "✅ App deployed!"
}

deploy_docs() {
    echo "🔨 Building Embed Bundle..."
    npm run build:embed
    cp "$DIST_DIR/embed/mirror-editor.js" "$DOCS_DIR/mirror-editor.js"
    echo "✅ Embed Bundle aktualisiert"
    echo ""

    FILE_COUNT=$(find "$DOCS_DIR" -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" \) | wc -l)
    echo "🚀 Deploying Dokumentation ($FILE_COUNT Dateien)..."
    echo ""

    lftp <<EOF
set ftp:ssl-allow no
set ftp:passive-mode false
set net:timeout 10
set net:max-retries 2
open -u $FTP_USER,$FTP_PASS $FTP_HOST
mkdir -f mirror
cd mirror
lcd $DOCS_DIR
mirror --reverse --verbose --only-newer --parallel=3 \
    -x "\.sh$" \
    -x "\.md$" \
    -x "\.zip$" \
    -x "Archiv/"
quit
EOF

    echo "✅ Dokumentation deployed!"
}

#######################################
# Script Start
#######################################

check_lftp

case "${1:-all}" in
    app)
        deploy_app
        ;;
    docs)
        deploy_docs
        ;;
    all|"")
        deploy_app
        echo ""
        deploy_docs
        ;;
    *)
        echo "Usage: ./deploy.sh [app|docs|all]"
        exit 1
        ;;
esac

echo ""
echo "🌐 App:  http://ux-strategy.ch/mirror/app/"
echo "📄 Docs: http://ux-strategy.ch/mirror/tutorial.html"
echo ""
