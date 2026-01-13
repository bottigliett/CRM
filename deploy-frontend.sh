#!/bin/bash
# Script di deploy frontend con fix cache nginx

set -e

echo "=========================================="
echo "Deploy Frontend con Fix Cache"
echo "=========================================="
echo ""

# Step 1: Modifica configurazione nginx
echo "Step 1/3: Aggiornamento configurazione nginx..."
cat > /tmp/studiomismo-nginx.conf << 'NGINX_EOF'
server {
    server_name studiomismo.com www.studiomismo.com;

    # Frontend
    location / {
        root /var/www/crm-dashboard/vite-version/dist;
        try_files $uri $uri/ /index.html;

        # NO cache for index.html to ensure new deployments are immediately visible
        location = /index.html {
            add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
            expires off;
        }

        # Cache control for assets (files with hash in name)
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/studiomismo.com-access.log;
    error_log /var/log/nginx/studiomismo.com-error.log;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/studiomismo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/studiomismo.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.studiomismo.com) {
        return 301 https://$host$request_uri;
    }

    if ($host = studiomismo.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name studiomismo.com www.studiomismo.com;
    return 404;
}
NGINX_EOF

sudo cp /tmp/studiomismo-nginx.conf /etc/nginx/sites-enabled/studiomismo.com
echo "✓ Nginx config aggiornata"
echo ""

# Step 2: Test e reload nginx
echo "Step 2/3: Test e reload nginx..."
sudo nginx -t
sudo systemctl reload nginx
echo "✓ Nginx ricaricato"
echo ""

# Step 3: Timestamp per verificare il deploy
echo "Step 3/3: Creazione timestamp..."
date > /var/www/crm-dashboard/vite-version/dist/deploy-timestamp.txt
echo "✓ Deploy timestamp: $(cat /var/www/crm-dashboard/vite-version/dist/deploy-timestamp.txt)"
echo ""

echo "=========================================="
echo "✅ Deploy completato!"
echo "=========================================="
echo ""
echo "IMPORTANTE: Fai un hard refresh nel browser:"
echo "  - Windows/Linux: Ctrl + Shift + R"
echo "  - Mac: Cmd + Shift + R"
echo ""
echo "Oppure apri DevTools (F12) > Network > Empty Cache and Hard Reload"
echo ""
