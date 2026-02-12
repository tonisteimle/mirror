#!/bin/bash

#######################################
# Deploy Script für Mirror App
# Hostpoint.ch Static Site
#######################################

# Konfiguration
FTP_HOST="sl44.web.hostpoint.ch"
FTP_USER="ftp@ux-strategy.ch"
FTP_PASS="In2meinftp!!"
REMOTE_DIR="mirror/app"

# Lokaler Ordner
PROJECT_DIR="$(dirname "$0")"
DIST_DIR="$PROJECT_DIR/dist"

#######################################
# Script Start
#######################################

echo "🔨 Building Mirror App..."
echo ""

cd "$PROJECT_DIR"

# Build ausführen
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build fehlgeschlagen!"
    exit 1
fi

echo ""
echo "🚀 Deploying Mirror App zu Hostpoint..."
echo ""

# Prüfen ob lftp installiert ist
if ! command -v lftp &> /dev/null; then
    echo "❌ lftp ist nicht installiert."
    echo "Installation: brew install lftp"
    exit 1
fi

# Prüfen ob dist Ordner existiert
if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Dist Ordner nicht gefunden: $DIST_DIR"
    exit 1
fi

# Anzahl Dateien zählen
FILE_COUNT=$(find "$DIST_DIR" -type f | wc -l)
echo "📁 Uploading $FILE_COUNT Dateien..."
echo ""

# LFTP Upload
lftp <<EOF
set ftp:ssl-allow no
set ftp:passive-mode false
set net:timeout 10
set net:max-retries 2
open -u $FTP_USER,$FTP_PASS $FTP_HOST
mkdir -f $REMOTE_DIR
cd $REMOTE_DIR
lcd $DIST_DIR
mirror --reverse --verbose --delete --parallel=5
quit
EOF

echo ""
echo "✅ Deploy abgeschlossen!"
echo ""
echo "🌐 App:  http://ux-strategy.ch/mirror/app/"
echo "📄 Docs: http://ux-strategy.ch/mirror/mirror-docu.html"
