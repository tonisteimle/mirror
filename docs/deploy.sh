#!/bin/bash

#######################################
# Deploy Script für Mirror Documentation
# Hostpoint.ch Static Site
#######################################

# Konfiguration
FTP_HOST="sl44.web.hostpoint.ch"
FTP_USER="ftp@ux-strategy.ch"
FTP_PASS="In2meinftp!!"
REMOTE_DIR="mirror"

# Lokaler Ordner (docs im Projekt)
LOCAL_DIR="$(dirname "$0")"

#######################################
# Script Start
#######################################

echo "🚀 Deploying Mirror Documentation zu Hostpoint..."
echo ""

# Prüfen ob lftp installiert ist
if ! command -v lftp &> /dev/null; then
    echo "❌ lftp ist nicht installiert."
    echo "Installation: brew install lftp"
    exit 1
fi

# Anzahl Dateien zählen
FILE_COUNT=$(find "$LOCAL_DIR" -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" \) | wc -l)
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
lcd $LOCAL_DIR
mirror --reverse --verbose --only-newer --parallel=3 \
    -x "\.sh$" \
    -x "\.md$" \
    -x "\.zip$" \
    -x "Archiv/"
quit
EOF

echo ""
echo "✅ Deploy abgeschlossen!"
echo "🌐 Live: http://ux-strategy.ch/mirror/"
echo ""
echo "Dokumentation: http://ux-strategy.ch/mirror/mirror-docu.html"
