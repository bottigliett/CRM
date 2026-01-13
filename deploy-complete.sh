#!/bin/bash
# Complete deployment script for bug fixes
# Fixes: client-auth URLs, itemName field, taxRate default to 0%

set -e  # Exit on error

echo "=========================================="
echo "Complete Deployment - Bug Fixes"
echo "=========================================="
echo ""
echo "This will:"
echo "  1. Pull latest code from GitHub"
echo "  2. Clean rebuild backend"
echo "  3. Clean rebuild frontend"
echo "  4. Restart services"
echo "  5. Verify deployment"
echo ""

# Navigate to project root
cd /var/www/crm-dashboard

# Step 1: Pull latest code
echo "Step 1/8: Pulling latest code from GitHub..."
git fetch origin
git pull origin main
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "✓ Current commit: $CURRENT_COMMIT"
echo ""

# Step 2: Backend - Clean install
echo "Step 2/8: Backend - Cleaning old build..."
cd backend
rm -rf node_modules dist
echo "✓ Backend cleaned"
echo ""

# Step 3: Backend - Install dependencies
echo "Step 3/8: Backend - Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 4: Backend - Prisma and compile
echo "Step 4/8: Backend - Generating Prisma client and compiling..."
npx prisma generate
npx tsc
echo "✓ Backend compiled"
echo ""

# Step 5: Frontend - Clean install
echo "Step 5/8: Frontend - Cleaning old build..."
cd ../vite-version
rm -rf node_modules dist node_modules/.vite
echo "✓ Frontend cleaned"
echo ""

# Step 6: Frontend - Install and build
echo "Step 6/8: Frontend - Installing dependencies and building..."
npm install
npm run build
echo "✓ Frontend built"
echo ""

# Step 7: Restart services
echo "Step 7/8: Restarting backend service..."
pm2 restart crm-backend
sleep 2
pm2 status crm-backend
echo "✓ Backend restarted"
echo ""

# Step 8: Verification
echo "Step 8/8: Verifying deployment..."
echo ""
echo "Backend verification:"
grep -n "taxRate = 0" ../backend/src/controllers/quote.controller.ts || echo "❌ taxRate fix not found"
echo ""
echo "Frontend verification:"
grep -n "client-auth/verify-username" src/lib/client-auth-api.ts || echo "❌ client-auth URL fix not found"
grep -n "itemName: string" src/lib/quotes-api.ts || echo "❌ itemName fix not found"
echo ""
echo "Build verification:"
NEW_INDEX=$(ls -t dist/assets/index-*.js | head -1 | xargs basename)
echo "New index file: $NEW_INDEX"
echo ""

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
echo "IMPORTANT: Clear browser cache to see changes"
echo "  - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "  - Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo "  - Safari: Cmd+Option+R (Mac)"
echo ""
echo "Or use DevTools:"
echo "  - Open DevTools (F12)"
echo "  - Right-click on refresh button"
echo "  - Select 'Empty Cache and Hard Reload'"
echo ""
echo "Current commit: $CURRENT_COMMIT"
echo "Index file: $NEW_INDEX"
echo ""
