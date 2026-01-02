#!/bin/bash
# Script per risolvere il conflitto in schema.prisma sul server
# Mantiene MySQL per la produzione

cd /var/www/crm-dashboard/backend/prisma

# Risolvi il conflitto mantenendo MySQL
cat schema.prisma | \
  sed '/^<<<<<<< /d' | \
  sed '/^=======/d' | \
  sed '/^>>>>>>> /d' | \
  sed 's/provider = "sqlite"/provider = "mysql"/g' > schema.prisma.tmp

mv schema.prisma.tmp schema.prisma

# Verifica che sia corretto
echo "✅ Verifico configurazione..."
grep -A 2 "datasource db" schema.prisma

# Mark conflict as resolved
cd /var/www/crm-dashboard
git add backend/prisma/schema.prisma

echo ""
echo "✅ Conflitto risolto! Provider impostato a MySQL"
echo ""
echo "Prossimi passi:"
echo "1. git commit -m 'Fix: resolve schema.prisma conflict for MySQL'"
echo "2. Continua con la migrazione"
