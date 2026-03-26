#!/bin/bash

#######################################
# Deploy Script für Mirror Studio
# Hostpoint.ch (PHP + Static)
#
# Usage:
#   ./deploy.sh           - Deployed alles
#   ./deploy.sh studio    - Deployed nur Studio
#   ./deploy.sh api       - Deployed nur API
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

deploy_api() {
    echo ""
    echo "🚀 Deploying API..."

    lftp <<EOF
set ftp:ssl-allow no
set ftp:passive-mode false
set net:timeout 10
set net:max-retries 2
open -u $FTP_USER,$FTP_PASS $FTP_HOST

# Create directories
mkdir -f mirror/api
mkdir -f mirror/data
mkdir -f mirror/data/projects

# Upload API files
cd mirror/api
lcd $PROJECT_DIR/api
put index.php
put auth.php
put projects.php
put files.php
put .htaccess

# Upload data directory structure (not user data)
cd ../data
lcd $PROJECT_DIR/data
put .htaccess

# Initialize empty users.json if not exists
put -c users.json

quit
EOF

    echo "✅ API deployed!"
}

create_htaccess() {
    echo ""
    echo "📝 Creating .htaccess for routing..."

    # Create main .htaccess for the mirror directory
    cat > /tmp/mirror-htaccess <<'HTACCESS'
# Mirror Studio - Apache Configuration
DirectoryIndex index.html

# Rewrite API calls
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/index.php [QSA,L]
HTACCESS

    lftp <<EOF
set ftp:ssl-allow no
set ftp:passive-mode false
open -u $FTP_USER,$FTP_PASS $FTP_HOST
cd mirror
lcd /tmp
put mirror-htaccess -o .htaccess
quit
EOF

    rm /tmp/mirror-htaccess
    echo "✅ .htaccess erstellt!"
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

case "${1:-all}" in
    studio)
        deploy_studio
        ;;
    api)
        deploy_api
        create_htaccess
        ;;
    all|"")
        deploy_studio
        deploy_api
        create_htaccess
        ;;
    *)
        echo "Usage: ./deploy.sh [studio|api|all]"
        exit 1
        ;;
esac

echo ""
echo "═══════════════════════════════════"
echo "🌐 Mirror Studio: http://ux-strategy.ch/mirror/"
echo "═══════════════════════════════════"
echo ""
