import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '../config/database';
import { TransactionType } from '@prisma/client';

// Map old category IDs to new category names
const categoryMap: Record<number, string> = {
  1: 'Fattura Cliente', // income - generic income
  2: 'Consulenza',
  3: 'Progetto',
  4: 'Servizio Ricorrente',
  5: 'Altro Ricavo',

  // Expenses
  6: 'Affitto Ufficio',
  7: 'Utenze',
  8: 'Stipendi',
  9: 'Software/Abbonamenti',
  10: 'Marketing',
  11: 'Formazione',
  12: 'Hardware',
  13: 'Consulenze Esterne',
  14: 'Spese Bancarie',
  15: 'Tasse',
  16: 'Altro Costo',

  // Additional categories found in data
  18: 'Software/Abbonamenti', // Map to existing category
  24: 'Marketing', // Map to existing category
  25: 'Altro Costo', // Map to existing category
};

// Map old payment method IDs to new ones
const paymentMethodMap: Record<number, string> = {
  1: 'Bonifico Bancario',
  2: 'Carta di Credito',
  3: 'PayPal',
  4: 'Stripe',
  5: 'Contanti',
  6: 'Assegno',
  7: 'RiBa',
  8: 'SDD (Addebito Diretto SEPA)',
};

interface TransactionRow {
  id: number;
  type: 'income' | 'expense';
  category_id: number;
  amount: string;
  date: string;
  description: string;
  source: string | null;
  payment_method_id: number | null;
  invoice_id: number | null;
  is_recurring: number;
  recurring_interval: string | null;
  attachment_path: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

function parseSqlInsertValues(sqlContent: string): TransactionRow[] {
  const rows: TransactionRow[] = [];

  // Find the INSERT statement
  const insertMatch = sqlContent.match(/INSERT INTO `finance_transactions`[^(]*\(([\s\S]*?)\) VALUES\s*([\s\S]*?);/i);

  if (!insertMatch) {
    console.error('No INSERT statement found');
    return rows;
  }

  const columns = insertMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
  const valuesString = insertMatch[2];

  // Parse each row
  const rowRegex = /\(([^)]+(?:\([^)]*\)[^)]*)*)\)/g;
  let match;

  while ((match = rowRegex.exec(valuesString)) !== null) {
    const valueString = match[1];
    const values: any[] = [];

    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < valueString.length; i++) {
      const char = valueString[i];
      const prevChar = i > 0 ? valueString[i - 1] : '';

      if ((char === "'" || char === '"') && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          current += char;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      values.push(current.trim());
    }

    // Create object from columns and values
    const row: any = {};
    columns.forEach((col, index) => {
      let value = values[index];

      // Remove quotes
      if (value && value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }

      // Handle NULL
      if (value === 'NULL' || value === '') {
        value = null;
      }

      // Convert numeric fields
      if (value !== null && ['id', 'category_id', 'payment_method_id', 'invoice_id', 'is_recurring', 'created_by'].includes(col)) {
        value = parseInt(value, 10);
      }

      row[col] = value;
    });

    rows.push(row as TransactionRow);
  }

  return rows;
}

async function importFinanceTransactions() {
  console.log('📊 Importing finance transactions...');

  try {
    // Read SQL file
    const sqlPath = join(__dirname, '../../../finance_transactions.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);

    const sqlContent = readFileSync(sqlPath, 'utf-8');

    // Parse SQL file
    console.log('Parsing SQL content...');
    const transactions = parseSqlInsertValues(sqlContent);
    console.log(`Found ${transactions.length} transactions to import`);

    if (transactions.length === 0) {
      console.log('No transactions found in SQL file');
      return;
    }

    // Get all categories and payment methods
    const [categories, paymentMethods] = await Promise.all([
      prisma.transactionCategory.findMany(),
      prisma.paymentMethod.findMany(),
    ]);

    let imported = 0;
    let skipped = 0;

    for (const row of transactions) {
      try {
        // Map category
        const categoryName = categoryMap[row.category_id];
        const category = categories.find(c => c.name === categoryName);

        if (!category) {
          console.warn(`⚠️  Skipping transaction ${row.id}: Category not found for ID ${row.category_id}`);
          skipped++;
          continue;
        }

        // Map payment method
        let paymentMethod = null;
        if (row.payment_method_id) {
          const paymentMethodName = paymentMethodMap[row.payment_method_id];
          paymentMethod = paymentMethods.find(pm => pm.name === paymentMethodName);
        }

        // Map user ID (assuming admin user ID 2 exists)
        let createdBy = row.created_by || 2; // Default to admin if NULL
        if (createdBy) {
          const user = await prisma.user.findUnique({ where: { id: createdBy } });
          if (!user) {
            createdBy = 2; // Default to admin user
          }
        } else {
          createdBy = 2; // Default to admin user
        }

        // Try to find contact by name (source field)
        let contactId = null;
        if (row.source) {
          const contact = await prisma.contact.findFirst({
            where: {
              name: {
                contains: row.source,
              },
            },
          });
          if (contact) {
            contactId = contact.id;
          }
        }

        // Check if transaction already exists
        const existingTransaction = await prisma.transaction.findUnique({
          where: { id: row.id },
        });

        if (existingTransaction) {
          console.log(`ℹ️  Transaction ${row.id} already exists, skipping...`);
          skipped++;
          continue;
        }

        // Convert type
        const type = row.type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;

        // Handle dates - use current date as fallback if invalid
        const now = new Date();
        const createdAt = row.created_at ? new Date(row.created_at) : now;
        const updatedAt = row.updated_at ? new Date(row.updated_at) : now;

        // Create transaction
        await prisma.transaction.create({
          data: {
            id: row.id,
            type,
            amount: parseFloat(row.amount),
            date: new Date(row.date),
            categoryId: category.id,
            paymentMethodId: paymentMethod?.id || null,
            contactId,
            description: row.description || null,
            invoiceId: null, // Invoice model doesn't exist yet
            createdBy,
            createdAt: isNaN(createdAt.getTime()) ? now : createdAt,
            updatedAt: isNaN(updatedAt.getTime()) ? now : updatedAt,
          },
        });

        imported++;
        if (imported % 10 === 0) {
          console.log(`✅ Imported ${imported} transactions...`);
        }
      } catch (error: any) {
        console.error(`❌ Error importing transaction ${row.id}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n✅ Import completed!`);
    console.log(`   - Imported: ${imported} transactions`);
    console.log(`   - Skipped: ${skipped} transactions`);

  } catch (error) {
    console.error('❌ Error importing finance transactions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importFinanceTransactions()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
