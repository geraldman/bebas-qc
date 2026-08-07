#!/bin/sh
CERT_DIR="/etc/letsencrypt/live/bebasqc.geraldmanurung.site"

if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "========================================================="
    echo "SSL Certificate not found at $CERT_DIR/fullchain.pem"
    echo "Creating dummy self-signed SSL certificates for local dev..."
    echo "========================================================="
    mkdir -p "$CERT_DIR"
    
    if ! command -v openssl >/dev/null 2>&1; then
        apk add --no-cache openssl
    fi
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=bebasqc.geraldmanurung.site"
else
    echo "========================================================="
    echo "SSL Certificate found at $CERT_DIR/fullchain.pem"
    echo "Skipping dummy certificate generation."
    echo "========================================================="
fi
