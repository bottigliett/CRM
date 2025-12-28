import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as fs from 'fs';
import * as path from 'path';

// Create libSQL adapter with configuration
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function importCSV() {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '../../finance_export_2025.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header

    console.log(`Found ${lines.length} lines in CSV`);

    // Get or create user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'admin@mismostudio.com',
          password: 'hashed', // placeholder
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
        },
      });
    }

    // Get or create categories and payment methods
    const categoryMap = new Map<string, number>();
    const paymentMethodMap = new Map<string, number>();

    let imported = 0;
    let skipped = 0;

    for (const line of lines) {
      if (!line.trim() || line.includes('TOTALI')) continue;

      const parts = line.split(';');
      if (parts.length < 7) continue;

      const [dateStr, typeStr, categoryName, description, supplier, paymentMethod, amountStr] = parts;

      // Parse date (format: YYYY-MM-DD)
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      // Parse type
      const type = typeStr === 'Entrata' ? 'INCOME' : 'EXPENSE';

      // Parse amount (replace comma with dot)
      const amount = parseFloat(amountStr.replace(',', '.'));
      if (isNaN(amount)) continue;

      // Get or create category
      let categoryId: number | null = null;
      if (categoryName) {
        if (!categoryMap.has(categoryName)) {
          let category = await prisma.transactionCategory.findFirst({
            where: { name: categoryName },
          });
          if (!category) {
            category = await prisma.transactionCategory.create({
              data: {
                name: categoryName,
                type,
                icon: 'circle',
                color: type === 'INCOME' ? '#10b981' : '#ef4444',
              },
            });
          }
          categoryMap.set(categoryName, category.id);
        }
        categoryId = categoryMap.get(categoryName)!;
      }

      // Get or create payment method
      let paymentMethodId: number | null = null;
      if (paymentMethod && paymentMethod !== 'Altro') {
        if (!paymentMethodMap.has(paymentMethod)) {
          let method = await prisma.paymentMethod.findFirst({
            where: { name: paymentMethod },
          });
          if (!method) {
            method = await prisma.paymentMethod.create({
              data: {
                name: paymentMethod,
              },
            });
          }
          paymentMethodMap.set(paymentMethod, method.id);
        }
        paymentMethodId = paymentMethodMap.get(paymentMethod)!;
      }

      // Create transaction
      try {
        await prisma.transaction.create({
          data: {
            type,
            amount,
            date,
            categoryId,
            paymentMethodId,
            description: description || undefined,
            createdBy: user.id,
          },
        });
        imported++;
        if (imported % 10 === 0) {
          console.log(`Imported ${imported} transactions...`);
        }
      } catch (error) {
        console.error(`Error importing transaction: ${description}`, error);
        skipped++;
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);

    // Verify totals
    const transactions = await prisma.transaction.findMany();
    const income = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    console.log('\n=== Database Totals ===');
    console.log(`Entrate: € ${income.toFixed(2)}`);
    console.log(`Uscite: € ${expenses.toFixed(2)}`);
    console.log(`Saldo: € ${(income - expenses).toFixed(2)}`);
    console.log(
      `Transazioni: ${transactions.filter((t) => t.type === 'INCOME').length} entrate | ${transactions.filter((t) => t.type === 'EXPENSE').length} uscite`
    );
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importCSV();
